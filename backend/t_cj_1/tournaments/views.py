from rest_framework import viewsets
from .models import Tournament, Match
from .serializers import (
    TournamentListSerializer,
    TournamentDetailSerializer,
    MatchListSerializer,
    MatchDetailSerializer,
)


class TournamentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Tournament.objects.prefetch_related("teams").all()

    def get_serializer_class(self):
        if self.action == "list":
            return TournamentListSerializer
        return TournamentDetailSerializer


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
