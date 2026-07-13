package com.example.t.data.api

import com.example.t.data.model.*
import okhttp3.MultipartBody
import retrofit2.http.*

interface ApiService {

    // Auth
    @POST("api/auth/login/")
    suspend fun login(@Body request: LoginRequest): TokenResponse

    @POST("api/auth/register/")
    suspend fun register(@Body request: RegisterRequest): RegisterResponse

    @POST("api/auth/refresh/")
    suspend fun refreshToken(@Body body: Map<String, String>): TokenResponse

    // Profile
    @GET("api/auth/profile/")
    suspend fun getProfile(): UserProfile

    @PUT("api/auth/profile/")
    suspend fun updateProfile(@Body body: Map<String, String>): UserProfile

    @Multipart
    @PUT("api/auth/profile/")
    suspend fun uploadAvatar(@Part avatar: MultipartBody.Part): UserProfile

    @POST("api/auth/profile/favorite-team/")
    suspend fun setFavoriteTeam(@Body request: FavoriteTeamRequest): UserProfile

    // Teams
    @GET("api/teams/")
    suspend fun getTeams(): List<Team>

    @GET("api/teams/{id}/")
    suspend fun getTeam(@Path("id") id: Int): Team

    // Players
    @GET("api/players/{id}/")
    suspend fun getPlayer(@Path("id") id: Int): Player

    // Tournaments
    @GET("api/tournaments/")
    suspend fun getTournaments(): List<Tournament>

    @GET("api/tournaments/{id}/")
    suspend fun getTournament(@Path("id") id: Int): Tournament

    // Matches
    @GET("api/matches/")
    suspend fun getMatches(@Query("tournament") tournamentId: Int? = null): List<Match>

    @GET("api/matches/{id}/")
    suspend fun getMatch(@Path("id") id: Int): Match

    // Home
    @GET("api/home/")
    suspend fun getHome(): HomeResponse
}
