from django.db import models


class Team(models.Model):
    name = models.CharField(max_length=100, unique=True)
    logo = models.ImageField(upload_to="logos/", blank=True, default="")
    rank = models.IntegerField(unique=True)
    description = models.TextField(blank=True, default="")
    song = models.FileField(upload_to="songs/", blank=True, default="")
    points = models.IntegerField(default=1000, verbose_name="积分")

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

    # ---- 能力小项 (0-100) ----
    attacking_awareness = models.PositiveIntegerField(default=0, verbose_name="进攻意识")
    ball_control = models.PositiveIntegerField(default=0, verbose_name="控球")
    dribbling = models.PositiveIntegerField(default=0, verbose_name="盘球")
    tight_control = models.PositiveIntegerField(default=0, verbose_name="紧密控球")
    low_pass = models.PositiveIntegerField(default=0, verbose_name="地面传球")
    lofted_pass = models.PositiveIntegerField(default=0, verbose_name="空中传球")
    shooting = models.PositiveIntegerField(default=0, verbose_name="射门")
    heading = models.PositiveIntegerField(default=0, verbose_name="头球")
    set_play = models.PositiveIntegerField(default=0, verbose_name="定位球")
    curl = models.PositiveIntegerField(default=0, verbose_name="弧线球")
    speed = models.PositiveIntegerField(default=0, verbose_name="速度")
    acceleration = models.PositiveIntegerField(default=0, verbose_name="加速")
    kicking_power = models.PositiveIntegerField(default=0, verbose_name="脚下力量")
    jumping = models.PositiveIntegerField(default=0, verbose_name="跳跃")
    physical_contact = models.PositiveIntegerField(default=0, verbose_name="身体接触")
    balance = models.PositiveIntegerField(default=0, verbose_name="平衡")
    stamina = models.PositiveIntegerField(default=0, verbose_name="体力")
    defensive_awareness = models.PositiveIntegerField(default=0, verbose_name="防守意识")
    ball_winning = models.PositiveIntegerField(default=0, verbose_name="抢球")
    aggression = models.PositiveIntegerField(default=0, verbose_name="积极性")
    gk_awareness = models.PositiveIntegerField(default=0, verbose_name="守门员意识")
    gk_catching = models.PositiveIntegerField(default=0, verbose_name="守门员接球能力")
    gk_clearing = models.PositiveIntegerField(default=0, verbose_name="守门员解围")
    gk_reflexes = models.PositiveIntegerField(default=0, verbose_name="守门员扑救反应")
    gk_reach = models.PositiveIntegerField(default=0, verbose_name="守门员臂展")
    # ---- 后4项 (0-5) ----
    weak_foot_usage = models.PositiveIntegerField(default=0, verbose_name="非惯用脚频率")
    weak_foot_accuracy = models.PositiveIntegerField(default=0, verbose_name="非惯用脚精准度")
    condition = models.PositiveIntegerField(default=0, verbose_name="状态持续性")
    injury_resistance = models.PositiveIntegerField(default=0, verbose_name="抗受伤程度")

    class Meta:
        ordering = ["number"]

    def __str__(self):
        return f"{self.name} ({self.team.name})"

    # ---- 六大维度 (加权平均, 权重和=100, 结果0-100) ----
    def _scaled(self, value):
        return value * 20

    @property
    def stat_shooting(self):
        total = (
            self.shooting * 35
            + self.kicking_power * 15
            + self.attacking_awareness * 15
            + self.heading * 10
            + self.set_play * 10
            + self.curl * 5
            + self._scaled(self.weak_foot_accuracy) * 10
        )
        return round(total / 100)

    @property
    def stat_passing(self):
        total = (
            self.low_pass * 30
            + self.lofted_pass * 20
            + self.attacking_awareness * 10
            + self.ball_control * 10
            + self.curl * 5
            + self._scaled(self.weak_foot_usage) * 15
            + self._scaled(self.weak_foot_accuracy) * 10
        )
        return round(total / 100)

    @property
    def stat_dribble(self):
        total = (
            self.ball_control * 30
            + self.dribbling * 25
            + self.tight_control * 20
            + self.balance * 15
            + self._scaled(self.weak_foot_accuracy) * 10
        )
        return round(total / 100)

    @property
    def stat_speed(self):
        total = self.speed * 60 + self.acceleration * 40
        return round(total / 100)

    @property
    def stat_power(self):
        total = (
            self.physical_contact * 25
            + self.stamina * 20
            + self.kicking_power * 15
            + self.jumping * 10
            + self.balance * 10
            + self._scaled(self.injury_resistance) * 10
            + self._scaled(self.condition) * 10
        )
        return round(total / 100)

    @property
    def stat_defense(self):
        total = (
            self.defensive_awareness * 20
            + self.ball_winning * 20
            + self.aggression * 5
            + self.physical_contact * 10
            + self.jumping * 5
            + self.gk_awareness * 10
            + self.gk_catching * 10
            + self.gk_clearing * 5
            + self.gk_reflexes * 10
            + self.gk_reach * 5
        )
        return round(total / 100)

    @property
    def overall(self):
        return round(
            (self.stat_shooting + self.stat_passing + self.stat_dribble
             + self.stat_speed + self.stat_power + self.stat_defense) / 6
        )


class PointsChange(models.Model):
    REASON_CHOICES = [
        ("match", "比赛"),
        ("manual", "手动调整"),
        ("reset", "重置"),
    ]
    team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name="points_changes")
    match = models.ForeignKey(
        "tournaments.Match", on_delete=models.SET_NULL, null=True, blank=True,
        related_name="points_changes",
    )
    amount = models.IntegerField(verbose_name="变动量")
    points_after = models.IntegerField(verbose_name="变动后积分")
    reason = models.CharField(max_length=10, choices=REASON_CHOICES, default="match", verbose_name="原因")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="时间")

    class Meta:
        ordering = ["-created_at", "-id"]
        indexes = [models.Index(fields=["team", "-created_at"])]

    def __str__(self):
        return f"{self.team.name} {self.amount:+d} -> {self.points_after}"
