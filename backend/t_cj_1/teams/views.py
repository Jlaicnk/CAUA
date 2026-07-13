from rest_framework import viewsets, generics
from .models import Team, Player
from .serializers import TeamListSerializer, TeamDetailSerializer, PlayerDetailSerializer


class TeamViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Team.objects.all()

    def get_serializer_class(self):
        if self.action == "list":
            return TeamListSerializer
        return TeamDetailSerializer


class PlayerDetailView(generics.RetrieveAPIView):
    queryset = Player.objects.all()
    serializer_class = PlayerDetailSerializer
