from django.urls import path
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("teams", views.TeamViewSet, basename="team")

urlpatterns = [
    path("players/", views.PlayerListView.as_view(), name="player-list"),
    path("players/<int:pk>/", views.PlayerDetailView.as_view(), name="player-detail"),
    path("teams/<int:pk>/history/", views.TeamHistoryView.as_view(), name="team-history"),
]

urlpatterns += router.urls
