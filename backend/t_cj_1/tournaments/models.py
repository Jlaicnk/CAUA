from django.db import models


class Tournament(models.Model):
    FORMAT_CHOICES = [
        ("swiss", "晋级瑞士轮"),
        ("knockout", "淘汰赛"),
        ("league", "循环赛"),
        ("double_elim", "双败淘汰"),
    ]
    STAGE_CHOICES = [
        ("not_started", "未开始"),
        ("ongoing", "进行中"),
        ("finished", "已结束"),
    ]
    PHASE_CHOICES = [
        ("swiss", "瑞士轮"),
        ("knockout", "淘汰赛"),
        ("finished", "已结束"),
    ]
    name = models.CharField(max_length=200)
    icon = models.ImageField(upload_to="tournament_icons/", blank=True, default="")
    description = models.TextField(blank=True, default="")
    rules = models.TextField(blank=True, default="")
    format = models.CharField(max_length=20, choices=FORMAT_CHOICES, default="swiss", verbose_name="赛制")
    knockout_after_swiss = models.BooleanField(default=False, verbose_name="瑞士轮后接单败淘汰赛")
    phase = models.CharField(max_length=20, choices=PHASE_CHOICES, default="swiss", verbose_name="当前阶段")
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
    elim_band = models.CharField(
        max_length=16, blank=True, default="", verbose_name="双败淘汰名次段"
    )

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
    knockout = models.BooleanField(default=False, verbose_name="淘汰赛阶段")
    BRACKET_CHOICES = [
        ("", "普通/瑞士"),
        ("winners", "胜者组"),
        ("losers", "败者组"),
        ("final", "总决赛"),
    ]
    bracket_kind = models.CharField(
        max_length=10,
        choices=BRACKET_CHOICES,
        blank=True,
        default="",
        verbose_name="双败轨道",
    )
    stats_settled = models.BooleanField(default=False, verbose_name="战绩已结算")
    points_settled = models.BooleanField(default=False, verbose_name="积分已结算")

    class Meta:
        ordering = ["round", "match_date", "id"]

    def __str__(self):
        return f"{self.home_team} vs {self.away_team}"


class AbstractHonor(models.Model):
    TIER_CHOICES = [
        ("legend", "殿堂级"),
        ("gold", "金"),
        ("silver", "银"),
        ("bronze", "铜"),
    ]
    tournament = models.ForeignKey(
        Tournament, on_delete=models.CASCADE, verbose_name="关联赛事"
    )
    name = models.CharField(max_length=100, verbose_name="荣誉名称")
    tier = models.CharField(max_length=10, choices=TIER_CHOICES, default="gold", verbose_name="荣誉等级")
    image = models.ImageField(upload_to="honors/", blank=True, default="", verbose_name="专属图片")
    note = models.TextField(blank=True, default="", verbose_name="备注")
    order = models.PositiveIntegerField(default=0, verbose_name="排序")

    class Meta:
        abstract = True
        ordering = ["order", "id"]

    def __str__(self):
        return f"{self.name}（{self.tournament.name}）"


class TeamHonor(AbstractHonor):
    team = models.ForeignKey(
        "teams.Team", on_delete=models.CASCADE, related_name="honors"
    )

    class Meta(AbstractHonor.Meta):
        abstract = False
        verbose_name = "队伍荣誉"
        verbose_name_plural = "队伍荣誉"


class PlayerHonor(AbstractHonor):
    player = models.ForeignKey(
        "teams.Player", on_delete=models.CASCADE, related_name="honors"
    )

    class Meta(AbstractHonor.Meta):
        abstract = False
        verbose_name = "队员荣誉"
        verbose_name_plural = "队员荣誉"
