from rest_framework import serializers
from .models import Tournament, TournamentTeam, Match
from teams.serializers import TeamListSerializer


class TournamentTeamSerializer(serializers.ModelSerializer):
    team = TeamListSerializer(read_only=True)
    global_rank = serializers.IntegerField(source="team.rank", read_only=True)
    record = serializers.SerializerMethodField()

    class Meta:
        model = TournamentTeam
        fields = ["id", "team", "wins", "losses", "status", "record", "rank", "global_rank"]

    def get_record(self, obj):
        return f"{obj.wins}-{obj.losses}"


class TournamentListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tournament
        fields = ["id", "name", "icon", "format", "rounds", "stage_status", "current_round", "start_date", "end_date"]


class TournamentDetailSerializer(serializers.ModelSerializer):
    teams = TournamentTeamSerializer(source="tournament_teams", many=True, read_only=True)
    advanced_count = serializers.SerializerMethodField()
    eliminated_count = serializers.SerializerMethodField()
    alive_count = serializers.SerializerMethodField()

    class Meta:
        model = Tournament
        fields = [
            "id", "name", "icon", "description", "rules", "format", "rounds",
            "stage_status", "current_round", "round_interval_days",
            "start_date", "end_date", "teams",
            "advanced_count", "eliminated_count", "alive_count",
        ]

    def get_advanced_count(self, obj):
        return obj.tournament_teams.filter(status="advanced").count()

    def get_eliminated_count(self, obj):
        return obj.tournament_teams.filter(status="eliminated").count()

    def get_alive_count(self, obj):
        return obj.tournament_teams.filter(status="alive").count()


class StandingsRowSerializer(serializers.Serializer):
    rank = serializers.IntegerField()
    team = TeamListSerializer()
    played = serializers.IntegerField()
    wins = serializers.IntegerField()
    losses = serializers.IntegerField()
    points = serializers.IntegerField()
    buchholz = serializers.IntegerField()
    goal_diff = serializers.IntegerField()
    status = serializers.CharField()
    record = serializers.CharField()


class StandingsSerializer(serializers.Serializer):
    tournament_id = serializers.IntegerField()
    tournament_name = serializers.CharField()
    format = serializers.CharField()
    rounds = serializers.IntegerField()
    current_round = serializers.IntegerField()
    stage_status = serializers.CharField()
    standings = StandingsRowSerializer(many=True)


class MatchListSerializer(serializers.ModelSerializer):
    home_team = TeamListSerializer(read_only=True)
    away_team = TeamListSerializer(read_only=True)
    tournament_name = serializers.CharField(source="tournament.name", read_only=True)

    class Meta:
        model = Match
        fields = [
            "id", "round", "tournament", "tournament_name",
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
            "id", "round", "tournament", "tournament_name",
            "home_team", "away_team",
            "home_score", "away_score", "match_date", "status",
        ]
