from rest_framework import serializers
from .models import Tournament, TournamentTeam, Match
from teams.serializers import TeamListSerializer


class TournamentTeamSerializer(serializers.ModelSerializer):
    team = TeamListSerializer(read_only=True)
    global_rank = serializers.IntegerField(source="team.rank", read_only=True)

    class Meta:
        model = TournamentTeam
        fields = ["id", "team", "rank", "global_rank"]


class TournamentListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tournament
        fields = ["id", "name", "icon", "start_date", "end_date"]


class TournamentDetailSerializer(serializers.ModelSerializer):
    teams = TournamentTeamSerializer(source="tournament_teams", many=True, read_only=True)

    class Meta:
        model = Tournament
        fields = ["id", "name", "icon", "description", "rules", "start_date", "end_date", "teams"]


class MatchListSerializer(serializers.ModelSerializer):
    home_team = TeamListSerializer(read_only=True)
    away_team = TeamListSerializer(read_only=True)
    tournament_name = serializers.CharField(source="tournament.name", read_only=True)

    class Meta:
        model = Match
        fields = [
            "id", "tournament", "tournament_name",
            "home_team", "away_team",
            "home_score", "away_score", "match_date", "status",
        ]


class MatchDetailSerializer(serializers.ModelSerializer):
    home_team = TeamListSerializer(read_only=True)
    away_team = TeamListSerializer(read_only=True)
    tournament_name = serializers.CharField(source="tournament.name", read_only=True)

    class Meta:
        model = Match
        fields = [
            "id", "tournament", "tournament_name",
            "home_team", "away_team",
            "home_score", "away_score", "match_date", "status",
        ]
