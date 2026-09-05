from django.urls import path
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("tournaments", views.TournamentViewSet, basename="tournament")
router.register("matches", views.MatchViewSet, basename="match")

urlpatterns = [
    path("tournaments/<int:pk>/standings/", views.StandingsView.as_view(), name="tournament-standings"),
]

urlpatterns += router.urls
