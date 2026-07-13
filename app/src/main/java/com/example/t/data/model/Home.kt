package com.example.t.data.model

import com.google.gson.annotations.SerializedName

data class Banner(
    val id: Int,
    val title: String,
    val image: String,
    val link: String = ""
)

data class FeedItem(
    val id: Int,
    val title: String,
    val cover: String,
    val video: String? = null
)

data class HomeResponse(
    val banners: List<Banner>,
    val feeds: List<FeedItem>
)
