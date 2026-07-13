from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register("tournaments", views.TournamentViewSet, basename="tournament")
router.register("matches", views.MatchViewSet, basename="match")

urlpatterns = router.urls
