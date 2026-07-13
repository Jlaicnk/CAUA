from django.db import models


class Banner(models.Model):
    title = models.CharField(max_length=200)
    image = models.ImageField(upload_to="banners/")
    link = models.URLField(blank=True, default="")
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return self.title


class FeedItem(models.Model):
    title = models.CharField(max_length=200)
    cover = models.ImageField(upload_to="covers/")
    video = models.FileField(upload_to="videos/", blank=True, default="")
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["order"]

    def __str__(self):
        return self.title
