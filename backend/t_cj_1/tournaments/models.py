from django.db import models


class Tournament(models.Model):
    FORMAT_CHOICES = [
        ("swiss", "晋级瑞士轮"),
        ("knockout", "淘汰赛"),
        ("league", "循环赛"),
    ]
    STAGE_CHOICES = [
        ("not_started", "未开始"),
        ("ongoing", "进行中"),
        ("finished", "已结束"),
    ]
    name = models.CharField(max_length=200)
    icon = models.ImageField(upload_to="tournament_icons/", blank=True, default="")
    description = models.TextField(blank=True, default="")
    rules = models.TextField(blank=True, default="")
    format = models.CharField(max_length=20, choices=FORMAT_CHOICES, default="swiss", verbose_name="赛制")
    rounds = models.PositiveIntegerField(null=True, blank=True, verbose_name="总轮数上限")
    stage_status = models.CharField(max_length=20, choices=STAGE_CHOICES, default="not_started", verbose_name="赛事状态")
    current_round = models.PositiveIntegerField(default=0, verbose_name="当前轮次")
    round_interval_days = models.PositiveIntegerField(default=3, verbose_name="每轮间隔天数")
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
    STATUS_CHOICES = [
        ("alive", "存活"),
        ("advanced", "已晋级"),
        ("eliminated", "已淘汰"),
    ]
    tournament = models.ForeignKey(Tournament, on_delete=models.CASCADE, related_name="tournament_teams")
    team = models.ForeignKey("teams.Team", on_delete=models.CASCADE)
    wins = models.PositiveIntegerField(default=0, verbose_name="胜")
    losses = models.PositiveIntegerField(default=0, verbose_name="负")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="alive", verbose_name="状态")
    rank = models.IntegerField(null=True, blank=True, verbose_name="最终名次")

    class Meta:
        unique_together = ("tournament", "team")

    def __str__(self):
        return f"{self.team.name} in {self.tournament.name} ({self.wins}-{self.losses})"


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
    round = models.PositiveIntegerField(default=1, verbose_name="轮次")
    points_settled = models.BooleanField(default=False, verbose_name="积分已结算")

    class Meta:
        ordering = ["round", "match_date", "id"]

    def __str__(self):
        return f"{self.home_team} vs {self.away_team}"
