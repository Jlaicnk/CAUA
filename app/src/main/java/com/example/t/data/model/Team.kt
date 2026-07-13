package com.example.t.data.model

import com.google.gson.annotations.SerializedName

data class Team(
    val id: Int,
    val name: String,
    val logo: String,
    val rank: Int,
    val description: String = "",
    val song: String? = null,
    val players: List<Player>? = null
)

data class Player(
    val id: Int,
    val name: String,
    val avatar: String? = null,
    val position: String,
    val number: Int,
    val bio: String = "",
    val team: Int? = null,
    @SerializedName("team_name")
    val teamName: String? = null
)
