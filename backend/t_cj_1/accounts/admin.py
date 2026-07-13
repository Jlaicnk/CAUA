from django.contrib import admin
from .models import UserProfile


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ["id", "user", "favorite_team"]
    list_select_related = ["user", "favorite_team"]
    search_fields = ["user__username"]
