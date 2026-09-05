from rest_framework import serializers
from .models import Team, Player

# 29 个能力小项字段名 (前25项0-100, 后4项0-5)
PLAYER_STAT_FIELDS = [
    "attacking_awareness", "ball_control", "dribbling", "tight_control",
    "low_pass", "lofted_pass", "shooting", "heading", "set_play", "curl",
    "speed", "acceleration", "kicking_power", "jumping", "physical_contact",
    "balance", "stamina", "defensive_awareness", "ball_winning", "aggression",
    "gk_awareness", "gk_catching", "gk_clearing", "gk_reflexes", "gk_reach",
    "weak_foot_usage", "weak_foot_accuracy", "condition", "injury_resistance",
]

# 六大维度只读计算
DIMENSION_FIELDS = [
    "stat_shooting", "stat_passing", "stat_dribble",
    "stat_speed", "stat_power", "stat_defense",
]


class PlayerSerializer(serializers.ModelSerializer):
    overall = serializers.IntegerField(read_only=True)

    class Meta:
        model = Player
        fields = ["id", "name", "avatar", "position", "number", "overall"]


class PlayerDetailSerializer(serializers.ModelSerializer):
    team_name = serializers.CharField(source="team.name", read_only=True)
    overall = serializers.IntegerField(read_only=True)

    class Meta:
        model = Player
        fields = [
            "id", "name", "avatar", "position", "number", "bio", "team", "team_name",
            "overall",
            *DIMENSION_FIELDS,
            *PLAYER_STAT_FIELDS,
        ]


class TeamListSerializer(serializers.ModelSerializer):
    class Meta:
        model = Team
        fields = ["id", "name", "logo", "rank", "song", "points"]


class TeamDetailSerializer(serializers.ModelSerializer):
    players = PlayerSerializer(many=True, read_only=True)

    class Meta:
        model = Team
        fields = ["id", "name", "logo", "rank", "description", "song", "points", "players"]
