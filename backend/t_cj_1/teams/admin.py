from django.contrib import admin
from django.utils.html import format_html
from .models import Team, Player
from tournaments.models import TeamHonor, PlayerHonor


class TeamHonorInline(admin.TabularInline):
    model = TeamHonor
    extra = 1
    autocomplete_fields = ["tournament"]
    fields = ["tournament", "name", "tier", "image", "note", "order"]
    ordering = ["order", "id"]


class PlayerHonorInline(admin.TabularInline):
    model = PlayerHonor
    extra = 1
    autocomplete_fields = ["tournament"]
    fields = ["tournament", "name", "tier", "image", "note", "order"]
    ordering = ["order", "id"]


class PlayerInline(admin.TabularInline):
    model = Player
    extra = 0
    fields = ["number", "name", "position"]
    ordering = ["number"]


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ["points", "rank", "name", "logo_preview", "song_link", "player_count"]
    list_display_links = ["name"]
    search_fields = ["name"]
    ordering = ["-points", "rank"]
    inlines = [TeamHonorInline, PlayerInline]
    actions = ["reset_points_to_1000"]

    def save_model(self, request, obj, form, change):
        old = None
        if change:
            old = Team.objects.filter(pk=obj.pk).values_list("points", flat=True).first()
        super().save_model(request, obj, form, change)
        if change and old is not None and old != obj.points:
            from teams.rating import log_manual_change
            log_manual_change(obj, obj.points, old_points=old)

    @admin.action(description="重置所选队伍积分为 1000")
    def reset_points_to_1000(self, request, queryset):
        from teams.rating import log_reset
        count = 0
        for t in queryset:
            if t.points != 1000:
                log_reset(t)
                count += 1
        self.message_user(request, f"已将 {count} 支队伍积分重置为 1000")

    @admin.display(description="队标")
    def logo_preview(self, obj):
        if obj.logo:
            return format_html('<img src="{}" style="width:40px;height:40px;object-fit:contain">', obj.logo.url)
        return ""

    @admin.display(description="队歌")
    def song_link(self, obj):
        if obj.song:
            return format_html('<a href="{}" target="_blank">播放</a>', obj.song.url)
        return ""

    @admin.display(description="队员数")
    def player_count(self, obj):
        return obj.players.count()


@admin.register(Player)
class PlayerAdmin(admin.ModelAdmin):
    list_display = ["number", "name", "avatar_preview", "position", "team", "overall_display"]
    list_filter = ["team", "position"]
    search_fields = ["name", "team__name"]
    ordering = ["team", "number"]
    readonly_fields = ["overall_display"]
    inlines = [PlayerHonorInline]

    fieldsets = [
        ("基本信息", {"fields": ["team", "number", "name", "position", "avatar", "bio"]}),
        ("进攻意识与射门", {"fields": [
            "attacking_awareness", "shooting", "heading", "set_play", "curl", "kicking_power",
        ]}),
        ("传球", {"fields": ["low_pass", "lofted_pass"]}),
        ("盘带与控球", {"fields": [
            "ball_control", "dribbling", "tight_control", "balance",
        ]}),
        ("速度", {"fields": ["speed", "acceleration"]}),
        ("身体与力量", {"fields": [
            "physical_contact", "stamina", "jumping",
        ]}),
        ("防守", {"fields": [
            "defensive_awareness", "ball_winning", "aggression",
        ]}),
        ("守门员", {"fields": [
            "gk_awareness", "gk_catching", "gk_clearing", "gk_reflexes", "gk_reach",
        ]}),
        ("非惯用脚 / 状态 (0-5)", {"fields": [
            "weak_foot_usage", "weak_foot_accuracy", "condition", "injury_resistance",
        ]}),
        ("总评", {"fields": ["overall_display"]}),
    ]

    @admin.display(description="头像")
    def avatar_preview(self, obj):
        if obj.avatar:
            return format_html('<img src="{}" style="width:30px;height:30px;object-fit:contain;border-radius:50%">', obj.avatar.url)
        return ""

    @admin.display(description="OVR")
    def overall_display(self, obj):
        return f"{obj.overall}"
