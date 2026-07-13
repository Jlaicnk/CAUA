from django.urls import path
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("teams", views.TeamViewSet, basename="team")

urlpatterns = [
    path("players/<int:pk>/", views.PlayerDetailView.as_view(), name="player-detail"),
]

urlpatterns += router.urls
