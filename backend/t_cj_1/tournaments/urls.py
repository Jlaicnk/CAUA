from django.urls import path
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("tournaments", views.TournamentViewSet, basename="tournament")
router.register("matches", views.MatchViewSet, basename="match")

urlpatterns = [
    path("tournaments/<int:pk>/standings/", views.StandingsView.as_view(), name="tournament-standings"),
    path("tournaments/<int:pk>/bracket/", views.TournamentBracketView.as_view(), name="tournament-bracket"),
    path("tournaments/<int:pk>/day-changes/", views.TournamentDayChangesView.as_view(), name="tournament-day-changes"),
    path("matches/<int:pk>/history/", views.MatchHistoryView.as_view(), name="match-history"),
]

urlpatterns += router.urls
