from django.contrib import admin
from django.utils.html import format_html
from .models import Banner, FeedItem


@admin.register(Banner)
class BannerAdmin(admin.ModelAdmin):
    list_display = ["order", "title", "image_preview", "is_active"]
    list_editable = ["is_active"]
    list_filter = ["is_active"]
    ordering = ["order"]

    @admin.display(description="预览")
    def image_preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="height:60px">', obj.image.url)
        return ""


@admin.register(FeedItem)
class FeedItemAdmin(admin.ModelAdmin):
    list_display = ["order", "title", "cover_preview", "video_link", "is_active"]
    list_editable = ["is_active"]
    list_filter = ["is_active"]
    ordering = ["order"]

    @admin.display(description="封面")
    def cover_preview(self, obj):
        if obj.cover:
            return format_html('<img src="{}" style="height:60px">', obj.cover.url)
        return ""

    @admin.display(description="视频")
    def video_link(self, obj):
        if obj.video:
            return format_html('<a href="{}" target="_blank">播放</a>', obj.video.url)
        return ""
