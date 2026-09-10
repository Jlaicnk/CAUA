from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.generics import RetrieveAPIView
import math
from django.db.models import Q
from django.db.models import Sum
from .models import Tournament, Match
from .serializers import (
    TournamentListSerializer,
    TournamentDetailSerializer,
    MatchListSerializer,
    MatchDetailSerializer,
    StandingsSerializer,
)
from teams.serializers import TeamListSerializer
from teams.models import PointsChange
from . import swiss


class TournamentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Tournament.objects.prefetch_related("teams").all()

    def get_serializer_class(self):
        if self.action == "list":
            return TournamentListSerializer
        return TournamentDetailSerializer


def build_standings_rows(tournament):
    """Ordered 32-team full list with status/record for the qualifier format.

    Ordering: advanced first (3-0,3-1,3-2 by record; tie via fewer rounds to advance then
    buchholz/name), then alive, then eliminated (0-3,1-3,2-3).
    """
    tts = list(tournament.tournament_teams.select_related("team"))
    stats = {tt.team_id: {"wins": 0} for tt in tts}
    # buchholz: sum of wins of opponents beaten/lost to (all played opponents' final wins)
    # We'll compute from opponent teams' current wins for a stable partial ordering.
    opp_wins = {tt.team_id: 0 for tt in tts}
    matches = list(tournament.matches.filter(status="finished"))
    played = {tt.team_id: [] for tt in tts}
    from django.core.exceptions import ValidationError
    for m in matches:
        if m.home_score == m.away_score:
            continue
        w = "home" if m.home_score > m.away_score else "away"
        if w == "home":
            win_id, lose_id = m.home_team_id, m.away_team_id
        else:
            win_id, lose_id = m.away_team_id, m.home_team_id
        played[win_id].append(m)
        played[lose_id].append(m)

    # record & status authoritative from stored participant fields
    for tt in tts:
        tt._opponents = played[tt.team_id]

    def order_key(tt):
        record = tt.wins * 10 + tt.losses  # wins primary
        status_rank = {"advanced": 0, "alive": 1, "eliminated": 2}[tt.status]
        return (status_rank, -record, -tt.wins, -tt.losses, tt.team.name)

    rows = sorted(tts, key=order_key)

    def buchholz(tt):
        total = 0
        for m in tt._opponents:
            opp_id = m.away_team_id if m.home_team_id == tt.team_id else m.home_team_id
            for other in tts:
                if other.team_id == opp_id:
                    total += other.wins
                    break
        return total

    ranked = []
    for idx, tt in enumerate(rows, start=1):
        ranked.append({
            "rank": idx,
            "team": tt.team,
            "played": tt.wins + tt.losses,
            "wins": tt.wins,
            "losses": tt.losses,
            "points": tt.wins,
            "buchholz": buchholz(tt),
            "goal_diff": 0,  # not tracked; kept 0 for schema compat
            "status": tt.status,
            "record": f"{tt.wins}-{tt.losses}",
        })
    return ranked


class StandingsView(RetrieveAPIView):
    queryset = Tournament.objects.all()

    def retrieve(self, request, *args, **kwargs):
        tournament = self.get_object()
        if tournament.stage_status == "finished":
            # final 1..32 ranking (rank stored on TournamentTeam.rank)
            ranked = self._final_rankings(tournament, request)
        else:
            ranked = build_standings_rows(tournament)
        data = {
            "tournament_id": tournament.id,
            "tournament_name": tournament.name,
            "format": tournament.format,
            "rounds": tournament.rounds,
            "current_round": tournament.current_round,
            "stage_status": tournament.stage_status,
            "phase": tournament.phase,
            "standings": ranked,
        }
        serializer = StandingsSerializer(data, context={"request": request})
        return Response(serializer.data)

    def _final_rankings(self, tournament, request):
        tts = list(tournament.tournament_teams.select_related("team"))
        agg = (
            PointsChange.objects.filter(
                match__tournament=tournament,
                team__in=[tt.team for tt in tts],
                reason="match",
            )
            .values("team_id")
            .annotate(total=Sum("amount"))
        )
        net_map = {row["team_id"]: row["total"] or 0 for row in agg}
        tts.sort(key=lambda tt: (tt.rank if tt.rank is not None else 999))
        rows = []
        for idx, tt in enumerate(tts, start=1):
            rows.append({
                "rank": tt.rank or idx,
                "team": tt.team,
                "played": tt.wins + tt.losses,
                "wins": tt.wins,
                "losses": tt.losses,
                "points": tt.wins,
                "buchholz": 0,
                "goal_diff": 0,
                "status": "finished",
                "record": f"{tt.wins}-{tt.losses}",
                "net_points": net_map.get(tt.team_id, 0),
            })
        return rows


class MatchViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Match.objects.select_related("home_team", "away_team", "tournament").all()

    def get_queryset(self):
        qs = super().get_queryset()
        tournament_id = self.request.query_params.get("tournament")
        if tournament_id:
            qs = qs.filter(tournament_id=tournament_id)
        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return MatchListSerializer
        return MatchDetailSerializer


class MatchHistoryView(RetrieveAPIView):
    """两队近期交手记录(不含本场, 最近5场) + 本场积分变动。"""
    queryset = Match.objects.all()

    def retrieve(self, request, *args, **kwargs):
        match = self.get_object()
        a, b = match.home_team, match.away_team

        h2h_qs = (
            Match.objects
            .filter(
                Q(home_team=a, away_team=b) | Q(home_team=b, away_team=a),
                status="finished",
            )
            .exclude(pk=match.pk)
            .select_related("home_team", "away_team", "tournament")
            .order_by("-match_date", "-id")[:5]
        )

        rows = []
        for m in h2h_qs:
            rows.append({
                "match_id": m.id,
                "match_date": m.match_date.isoformat(),
                "tournament_name": m.tournament.name,
                "round": m.round,
                "status": m.status,
                "home_team": TeamListSerializer(m.home_team, context={"request": request}).data,
                "away_team": TeamListSerializer(m.away_team, context={"request": request}).data,
                "home_score": m.home_score,
                "away_score": m.away_score,
            })

        def team_change(team):
            pc = PointsChange.objects.filter(team=team, match=match).order_by("-id").first()
            return pc.amount if pc else None

        data = {
            "match_id": match.id,
            "home_points_change": team_change(match.home_team),
            "away_points_change": team_change(match.away_team),
            "head_to_head": rows,
        }
        return Response(data)


class TournamentBracketView(RetrieveAPIView):
    """淘汰赛阶段 bracket（按轮次返回对阵与结果）。"""

    queryset = Tournament.objects.all()

    def retrieve(self, request, *args, **kwargs):
        tournament = self.get_object()
        if tournament.format == "double_elim":
            return self._double_elim(tournament, request)
        ms = list(
            Match.objects.filter(tournament=tournament, knockout=True)
            .select_related("home_team", "away_team")
            .order_by("round", "id")
        )
        by_round = {}
        for m in ms:
            by_round.setdefault(m.round, []).append(m)

        first_round = min(by_round.keys()) if by_round else 0
        bracket_size = len(by_round.get(first_round, [])) * 2
        total_rounds = int(round(math.log2(bracket_size))) if bracket_size >= 2 else 0

        def round_name(round_no):
            # 只有真正打完整轮淘汰赛才会出现决赛；首轮即便还没生成下一轮，
            # 也按胜者人数给出正确名称（8 强赛事首轮 = 1/4 决赛）。
            if round_no == total_rounds:
                return "决赛 · 季军赛"
            count = len(by_round.get(round_no, []))
            return {8: "1/8 决赛", 4: "1/4 决赛", 2: "半决赛"}.get(count, f"第 {round_no} 轮")

        rounds = []
        for r in sorted(by_round.keys()):
            rows = []
            for m in by_round[r]:
                rows.append({
                    "match_id": m.id,
                    "round": m.round,
                    "status": m.status,
                    "home_team": TeamListSerializer(m.home_team, context={"request": request}).data,
                    "away_team": TeamListSerializer(m.away_team, context={"request": request}).data,
                    "home_score": m.home_score,
                    "away_score": m.away_score,
                })
            rounds.append({"round": r, "name": round_name(r), "matches": rows})

        return Response({"tournament_id": tournament.id, "phase": tournament.phase, "rounds": rounds})

    def _match_row(self, m, request):
        return {
            "match_id": m.id,
            "round": m.round,
            "status": m.status,
            "bracket_kind": m.bracket_kind,
            "home_team": TeamListSerializer(m.home_team, context={"request": request}).data,
            "away_team": TeamListSerializer(m.away_team, context={"request": request}).data,
            "home_score": m.home_score,
            "away_score": m.away_score,
        }

    def _double_elim(self, tournament, request):
        """Return dual-track bracket data for the double-elimination format."""
        ms = list(
            Match.objects.filter(tournament=tournament, knockout=True)
            .select_related("home_team", "away_team")
            .order_by("round", "id")
        )

        winners_by_round = {}
        losers_by_round = {}
        final_matches = []
        for m in ms:
            if m.bracket_kind == "winners":
                winners_by_round.setdefault(m.round, []).append(m)
            elif m.bracket_kind == "losers":
                losers_by_round.setdefault(m.round, []).append(m)
            elif m.bracket_kind == "final":
                final_matches.append(m)

        winner_labels = {
            1: "胜者组 16 强",
            2: "胜者组 8 强",
            4: "胜者组 半决赛",
            6: "胜者组 决赛",
        }
        loser_labels = {
            2: "败者组 R1",
            3: "败者组 R2",
            4: "败者组 R3",
            5: "败者组 R4",
            6: "败者组 R5",
            7: "败者组决赛",
        }

        def cols(grouped, labels):
            out = []
            for r in sorted(grouped):
                out.append({
                    "round": r,
                    "name": labels.get(r, f"第 {r} 轮"),
                    "matches": [self._match_row(m, request) for m in grouped[r]],
                })
            return out

        final_col = None
        if final_matches:
            final_col = {
                "round": 8,
                "name": "总决赛",
                "matches": [self._match_row(m, request) for m in final_matches],
            }

        return Response({
            "tournament_id": tournament.id,
            "format": tournament.format,
            "phase": tournament.phase,
            "current_round": tournament.current_round,
            "stage_status": tournament.stage_status,
            "winners": cols(winners_by_round, winner_labels),
            "losers": cols(losers_by_round, loser_labels),
            "final": final_col,
        })


class TournamentDayChangesView(RetrieveAPIView):
    """最新已完赛一轮的比赛结果 + 每队积分变动（联赛「今日队伍积分变动」模块数据源）。"""

    queryset = Tournament.objects.all()

    def retrieve(self, request, *args, **kwargs):
        tournament = self.get_object()
        finished = list(
            Match.objects.filter(tournament=tournament, status="finished")
            .select_related("home_team", "away_team")
            .order_by("round", "id")
        )
        if not finished:
            return Response({
                "tournament_id": tournament.id,
                "round": None,
                "date": None,
                "matches": [],
            })

        latest_round = finished[-1].round
        round_ms = [m for m in finished if m.round == latest_round]

        def change(team, match):
            pc = PointsChange.objects.filter(team=team, match=match).order_by("-id").first()
            return pc.amount if pc else 0

        rows = []
        for m in round_ms:
            rows.append({
                "match_id": m.id,
                "round": m.round,
                "match_date": m.match_date.isoformat(),
                "home_team": TeamListSerializer(m.home_team, context={"request": request}).data,
                "away_team": TeamListSerializer(m.away_team, context={"request": request}).data,
                "home_score": m.home_score,
                "away_score": m.away_score,
                "home_points_change": change(m.home_team, m),
                "away_points_change": change(m.away_team, m),
            })

        return Response({
            "tournament_id": tournament.id,
            "round": latest_round,
            "date": round_ms[0].match_date.date().isoformat(),
            "matches": rows,
        })
