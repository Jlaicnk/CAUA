from rest_framework import serializers
from .models import Banner, FeedItem


class BannerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Banner
        fields = ["id", "title", "image", "link"]


class FeedItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = FeedItem
        fields = ["id", "title", "cover", "video"]


class HomeSerializer(serializers.Serializer):
    banners = BannerSerializer(many=True, read_only=True)
    feeds = FeedItemSerializer(many=True, read_only=True)
