from rest_framework import serializers
from django.contrib.auth.models import User
from .models import UserProfile
from teams.serializers import TeamListSerializer


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ["username", "password"]

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        UserProfile.objects.create(user=user)
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    favorite_team = TeamListSerializer(read_only=True)

    class Meta:
        model = UserProfile
        fields = ["id", "username", "avatar", "favorite_team"]


class FavoriteTeamSerializer(serializers.Serializer):
    team_id = serializers.IntegerField()

    def validate_team_id(self, value):
        from teams.models import Team
        if not Team.objects.filter(id=value).exists():
            raise serializers.ValidationError("队伍不存在")
        return value
