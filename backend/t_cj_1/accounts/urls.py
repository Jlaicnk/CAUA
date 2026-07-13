from django.urls import path
from . import views

urlpatterns = [
    path("register/", views.RegisterView.as_view(), name="register"),
    path("profile/", views.ProfileView.as_view(), name="profile"),
    path("profile/favorite-team/", views.FavoriteTeamView.as_view(), name="favorite-team"),
]
