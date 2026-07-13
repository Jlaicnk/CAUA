from rest_framework import generics
from rest_framework.response import Response
from .models import Banner, FeedItem
from .serializers import BannerSerializer, FeedItemSerializer


class HomeView(generics.GenericAPIView):
    def get(self, request):
        banners = Banner.objects.filter(is_active=True).order_by("order")
        feeds = FeedItem.objects.filter(is_active=True).order_by("order")
        return Response({
            "banners": BannerSerializer(banners, many=True, context={"request": request}).data,
            "feeds": FeedItemSerializer(feeds, many=True, context={"request": request}).data,
        })
