from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.generics import RetrieveAPIView
from .models import Tournament, Match
from .serializers import (
    TournamentListSerializer,
    TournamentDetailSerializer,
    MatchListSerializer,
    MatchDetailSerializer,
    StandingsSerializer,
)
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
        ranked = build_standings_rows(tournament)
        data = {
            "tournament_id": tournament.id,
            "tournament_name": tournament.name,
            "format": tournament.format,
            "rounds": tournament.rounds,
            "current_round": tournament.current_round,
            "stage_status": tournament.stage_status,
            "standings": ranked,
        }
        serializer = StandingsSerializer(data, context={"request": request})
        return Response(serializer.data)


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
