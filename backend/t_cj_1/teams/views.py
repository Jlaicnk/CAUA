from rest_framework import viewsets, generics
from rest_framework.response import Response
from .models import Team, Player, PointsChange
from .serializers import TeamListSerializer, TeamDetailSerializer, PlayerDetailSerializer


class TeamViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Team.objects.all()

    def get_queryset(self):
        qs = Team.objects.all()
        if self.action == "list":
            return qs.order_by("-points", "rank")
        if self.action == "retrieve":
            return qs.prefetch_related("honors__tournament", "players")
        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return TeamListSerializer
        return TeamDetailSerializer


class TeamHistoryView(generics.RetrieveAPIView):
    """最近 10 场比赛结果 + 积分走势（折线数据）。"""
    queryset = Team.objects.all()

    def retrieve(self, request, *args, **kwargs):
        team = self.get_object()

        # finished matches involving this team, newest first (limit 10)
        from tournaments.models import Match
        from django.db.models import Q
        matches = list(
            Match.objects
            .filter(
                Q(home_team=team) | Q(away_team=team),
                status="finished",
                points_settled=True,
            )
            .select_related("home_team", "away_team", "tournament")
            .order_by("-match_date", "-id")[:10]
        )

        # map match -> PointsChange for this team
        changes = {
            pc.match_id: pc
            for pc in PointsChange.objects.filter(team=team, reason="match")
            .select_related("match")
        }

        match_rows = []
        for m in reversed(matches):  # chronological oldest->newest within window
            is_home = m.home_team_id == team.id
            opponent = m.away_team if is_home else m.home_team
            team_score = m.home_score if is_home else m.away_score
            opp_score = m.away_score if is_home else m.home_score
            result = "W" if team_score > opp_score else "L"
            pc = changes.get(m.id)
            match_rows.append({
                "match_id": m.id,
                "match_date": m.match_date.isoformat(),
                "tournament_name": m.tournament.name,
                "opponent_id": opponent.id,
                "opponent_name": opponent.name,
                "opponent_logo": opponent.logo.url if opponent.logo else "",
                "team_score": team_score,
                "opponent_score": opp_score,
                "result": result,
                "points_change": pc.amount if pc else None,
                "points_after": pc.points_after if pc else None,
            })

        # chart: chronological points over the same <=10 match window
        # points[0] = points BEFORE the first match in window = points_after of
        # previous change, or 1000 if none. Reconstruct via team.points and the rows.
        # Walk forwards from an anchor.
        chart = self._build_chart(team, match_rows, changes, matches)

        return Response({
            "team_id": team.id,
            "points": team.points,
            "matches": match_rows,   # chronological (1..N, 1 = earliest in window)
            "chart": chart,
        })

    def _build_chart(self, team, match_rows, changes, matches):
        """points list: [window_start_points, after_match1, after_match2, ...]

        The 10-match window. window_start_points = the team's logged points just
        before the earliest match of the window (any reason: match/manual/reset),
        falling back to 1000. This keeps manual adjustments/resets visible in the
        curve even though the match list only shows pure matches.
        """
        from .models import PointsChange as PC
        n = len(matches)
        if n == 0:
            return {"points": [team.points]}

        window_ids = {m.id for m in matches}
        # team's logged changes, oldest -> newest (by id)
        all_changes = list(PC.objects.filter(team=team).order_by("id"))
        window_changes = [pc for pc in all_changes if pc.match_id in window_ids]
        # anchor: the change immediately preceding the earliest window change
        start_pts = 1000
        if window_changes:
            first_window_pc = window_changes[0]
            earlier = [pc for pc in all_changes if pc.id < first_window_pc.id]
            if earlier:
                start_pts = earlier[-1].points_after
        else:
            if all_changes:
                start_pts = all_changes[-1].points_after

        points = [start_pts]
        for pc in window_changes:
            points.append(pc.points_after)
        # fill in case window matches without a logged change
        while len(points) - 1 < n:
            points.append(points[-1])
        return {"points": points}


class PlayerDetailView(generics.RetrieveAPIView):
    queryset = Player.objects.prefetch_related("honors__tournament")
    serializer_class = PlayerDetailSerializer
