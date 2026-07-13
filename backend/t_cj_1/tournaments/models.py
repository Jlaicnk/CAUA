from django.db import models


class Tournament(models.Model):
    name = models.CharField(max_length=200)
    icon = models.ImageField(upload_to="tournament_icons/", blank=True, default="")
    description = models.TextField(blank=True, default="")
    rules = models.TextField(blank=True, default="")
    start_date = models.DateField()
    end_date = models.DateField()
    teams = models.ManyToManyField(
        "teams.Team", through="TournamentTeam", related_name="tournaments"
    )

    class Meta:
        ordering = ["-start_date"]

    def __str__(self):
        return self.name


class TournamentTeam(models.Model):
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name="tournament_teams")
    team = models.ForeignKey("teams.Team", on_delete=models.CASCADE)
    rank = models.IntegerField(null=True, blank=True, verbose_name="赛事排名")

    class Meta:
        unique_together = ("tournament", "team")
        ordering = ["rank"]

    def __str__(self):
        return f"{self.team.name} in {self.tournament.name}"


class Match(models.Model):
    STATUS_CHOICES = [
        ("scheduled", "未开始"),
        ("ongoing", "进行中"),
        ("finished", "已结束"),
    ]
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name="matches")
    home_team = models.ForeignKey(
        "teams.Team", on_delete=models.CASCADE, related_name="home_matches"
    )
    away_team = models.ForeignKey(
        "teams.Team", on_delete=models.CASCADE, related_name="away_matches"
    )
    home_score = models.IntegerField(null=True, blank=True)
    away_score = models.IntegerField(null=True, blank=True)
    match_date = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="scheduled")

    class Meta:
        ordering = ["match_date"]

    def __str__(self):
        return f"{self.home_team} vs {self.away_team}"
