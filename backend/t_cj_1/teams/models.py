from django.db import models


class Team(models.Model):
    name = models.CharField(max_length=100, unique=True)
    logo = models.ImageField(upload_to="logos/", blank=True, default="")
    rank = models.IntegerField(unique=True)
    description = models.TextField(blank=True, default="")
    song = models.FileField(upload_to="songs/", blank=True, default="")

    class Meta:
        ordering = ["rank"]

    def __str__(self):
        return self.name


class Player(models.Model):
    name = models.CharField(max_length=100)
    avatar = models.ImageField(upload_to="avatars/", blank=True, default="")
    position = models.CharField(max_length=50)
    number = models.IntegerField()
    bio = models.TextField(blank=True, default="")
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="players")

    class Meta:
        ordering = ["number"]

    def __str__(self):
        return f"{self.name} ({self.team.name})"
