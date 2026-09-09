from django.contrib import admin, messages
from django.utils.html import format_html
from django.core.exceptions import ValidationError
from .models import Tournament, TournamentTeam, Match
from . import swiss, round_robin


def _engine(tournament):
    """Pick the progression engine for a tournament by its format."""
    if tournament.format == "league":
        return round_robin
    return swiss


class TournamentTeamInline(admin.TabularInline):
    model = TournamentTeam
    extra = 0
    autocomplete_fields = ["team"]
    readonly_fields = ["wins", "losses", "status", "rank"]
    fields = ["team", "wins", "losses", "status", "rank"]
    can_delete = False


class MatchInline(admin.TabularInline):
    model = Match
    extra = 0
    autocomplete_fields = ["home_team", "away_team"]
    fields = ["knockout", "round", "home_team", "away_team", "home_score", "away_score", "match_date", "status"]
    readonly_fields = ["status"]
    ordering = ["knockout", "round", "match_date"]

    def save_model(self, request, obj, form, change):
        if obj.home_score is not None and obj.away_score is not None and obj.home_score == obj.away_score:
            raise ValidationError("比分不能相同，晋级赛制不允许平局")
        if obj.home_score is not None and obj.away_score is not None and obj.home_score != obj.away_score:
            obj.status = "finished"
        super().save_model(request, obj, form, change)
        from teams.rating import settle_if_ready
        try:
            settle_if_ready(obj)
        except Exception as e:
            raise ValidationError(f"积分结算失败：{e}")


@admin.register(Tournament)
class TournamentAdmin(admin.ModelAdmin):
    list_display = [
        "name", "format", "phase", "stage_status", "current_round", "adv_count", "start_date", "end_date", "team_count",
    ]
    list_filter = ["format", "stage_status", "phase", "knockout_after_swiss"]
    search_fields = ["name"]
    inlines = [TournamentTeamInline, MatchInline]
    actions = ["start_tournament", "advance_round", "generate_knockout", "reset_tournament"]
    readonly_fields = ["stage_status", "current_round", "rounds"]

    @admin.display(description="晋级/淘汰")
    def adv_count(self, obj):
        adv = obj.tournament_teams.filter(status="advanced").count()
        elim = obj.tournament_teams.filter(status="eliminated").count()
        return f"{adv} 晋级 / {elim} 出局"

    @admin.display(description="队伍数")
    def team_count(self, obj):
        return obj.teams.count()

    @admin.action(description="① 开始赛事：重置并生成第 1 轮")
    def start_tournament(self, request, queryset):
        for t in queryset:
            try:
                _engine(t).start_tournament(t)
                self.message_user(request, f"「{t.name}」已开始，已生成第 1 轮", messages.SUCCESS)
            except Exception as e:
                self.message_user(request, f"「{t.name}」失败：{e}", messages.ERROR)

    @admin.action(description="② 推进：结算当前轮比分并生成下一轮")
    def advance_round(self, request, queryset):
        for t in queryset:
            try:
                res = _engine(t).settle_and_advance(t)
                self.message_user(request, f"「{t.name}」{res['message']}", messages.SUCCESS)
            except ValidationError as e:
                self.message_user(request, f"「{t.name}」{e}", messages.ERROR)
            except Exception as e:
                self.message_user(request, f"「{t.name}」失败：{e}", messages.ERROR)

    @admin.action(description="Ⓚ 生成淘汰赛阶段（瑞士轮结束且勾选后接淘汰赛时）")
    def generate_knockout(self, request, queryset):
        for t in queryset:
            try:
                if t.format != "swiss":
                    self.message_user(request, f"「{t.name}」非瑞士轮赛制，跳过", messages.WARNING)
                    continue
                if not t.knockout_after_swiss:
                    self.message_user(request, f"「{t.name}」未勾选「瑞士轮后接淘汰赛」，跳过", messages.WARNING)
                    continue
                if t.stage_status != "ongoing" or t.phase != "swiss":
                    self.message_user(request, f"「{t.name}」当前不在瑞士轮进行中，跳过", messages.WARNING)
                    continue
                from . import knockout
                knockout.seed_knockout(t)
                self.message_user(request, f"「{t.name}」已生成淘汰赛 16 强", messages.SUCCESS)
            except Exception as e:
                self.message_user(request, f"「{t.name}」失败：{e}", messages.ERROR)

    @admin.action(description="③ 重置赛事（清空赛程与战绩）")
    def reset_tournament(self, request, queryset):
        for t in queryset:
            _engine(t).reset_tournament(t)
            self.message_user(request, f"「{t.name}」已重置", messages.WARNING)


@admin.register(Match)
class MatchAdmin(admin.ModelAdmin):
    list_display = ["id", "tournament", "round", "home_team", "away_team", "home_score", "away_score", "match_date", "status"]
    list_filter = ["tournament", "status", "round"]
    autocomplete_fields = ["home_team", "away_team", "tournament"]
    search_fields = ["home_team__name", "away_team__name"]

    def save_model(self, request, obj, form, change):
        # allow blank scores for scheduled; reject draw when both filled
        if obj.home_score is not None and obj.away_score is not None and obj.home_score == obj.away_score:
            raise ValidationError("比分不能相同，晋级赛制不允许平局")
        # mark finished once both scores present
        if obj.home_score is not None and obj.away_score is not None and obj.home_score != obj.away_score:
            obj.status = "finished"
        super().save_model(request, obj, form, change)
        # 逐场即时结算积分（幂等：points_settled 防重）
        from teams.rating import settle_if_ready
        try:
            settle_if_ready(obj)
        except Exception as e:
            raise ValidationError(f"积分结算失败：{e}")
