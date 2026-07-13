from django.contrib import admin
from django.utils.html import format_html
from .models import Tournament, TournamentTeam, Match


class TournamentTeamInline(admin.TabularInline):
    model = TournamentTeam
    extra = 0
    autocomplete_fields = ["team"]
    fields = ["team", "rank"]
    ordering = ["rank"]


class MatchInline(admin.TabularInline):
    model = Match
    extra = 0
    autocomplete_fields = ["home_team", "away_team"]
    fields = ["home_team", "away_team", "home_score", "away_score", "match_date", "status"]


@admin.register(Tournament)
class TournamentAdmin(admin.ModelAdmin):
    list_display = ["name", "icon_preview", "start_date", "end_date", "team_count"]
    search_fields = ["name"]
    inlines = [TournamentTeamInline, MatchInline]

    @admin.display(description="图标")
    def icon_preview(self, obj):
        if obj.icon:
            return format_html('<img src="{}" style="height:40px">', obj.icon.url)
        return ""

    @admin.display(description="参赛队伍数")
    def team_count(self, obj):
        return obj.teams.count()


@admin.register(Match)
class MatchAdmin(admin.ModelAdmin):
    list_display = ["id", "tournament", "home_team", "away_team", "home_score", "away_score", "match_date", "status"]
    list_filter = ["tournament", "status"]
    autocomplete_fields = ["home_team", "away_team", "tournament"]
    search_fields = ["home_team__name", "away_team__name"]
