package com.example.t.data.model

import com.google.gson.annotations.SerializedName

data class LoginRequest(
    val username: String,
    val password: String
)

data class RegisterRequest(
    val username: String,
    val password: String
)

data class TokenResponse(
    val access: String,
    val refresh: String
)

data class RegisterResponse(
    val user: UserInfo,
    val access: String,
    val refresh: String
)

data class UserInfo(
    val id: Int,
    val username: String
)

data class UserProfile(
    val id: Int,
    val username: String,
    val avatar: String? = null,
    @SerializedName("favorite_team")
    val favoriteTeam: Team? = null
)

data class FavoriteTeamRequest(
    @SerializedName("team_id")
    val teamId: Int
)
