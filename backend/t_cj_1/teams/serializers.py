from rest_framework import serializers
from .models import Team, Player


class PlayerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Player
        fields = ["id", "name", "avatar", "position", "number"]


class PlayerDetailSerializer(serializers.ModelSerializer):
    team_name = serializers.CharField(source="team.name", read_only=True)

    class Meta:
        model = Player
        fields = ["id", "name", "avatar", "position", "number", "bio", "team", "team_name"]


class TeamListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = ["id", "name", "logo", "rank", "song"]


class TeamDetailSerializer(serializers.ModelSerializer):
    players = PlayerSerializer(many=True, read_only=True)

    class Meta:
        model = Team
        fields = ["id", "name", "logo", "rank", "description", "song", "players"]
