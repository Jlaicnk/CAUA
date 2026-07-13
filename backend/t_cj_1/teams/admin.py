from django.contrib import admin
from django.utils.html import format_html
from .models import Team, Player


class PlayerInline(admin.TabularInline):
    model = Player
    extra = 0
    fields = ["number", "name", "position"]
    ordering = ["number"]


@admin.register(Team)
class TeamAdmin(admin.ModelAdmin):
    list_display = ["rank", "name", "logo_preview", "song_link", "player_count"]
    list_display_links = ["name"]
    search_fields = ["name"]
    ordering = ["rank"]
    inlines = [PlayerInline]

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
    list_display = ["number", "name", "avatar_preview", "position", "team"]
    list_filter = ["team", "position"]
    search_fields = ["name", "team__name"]
    ordering = ["team", "number"]

    @admin.display(description="头像")
    def avatar_preview(self, obj):
        if obj.avatar:
            return format_html('<img src="{}" style="width:30px;height:30px;object-fit:contain;border-radius:50%">', obj.avatar.url)
        return ""
