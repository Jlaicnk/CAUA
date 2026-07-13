from django.db import models
from django.contrib.auth.models import User


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    favorite_team = models.ForeignKey(
        "teams.Team", on_delete=models.SET_NULL, null=True, blank=True, related_name="fans"
    )
    avatar = models.ImageField(upload_to="avatars/", blank=True, default="")

    def __str__(self):
        return self.user.username
