package com.example.t.data.repository

import com.example.t.data.api.RetrofitClient
import com.example.t.data.local.TokenManager
import com.example.t.data.model.*
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import java.io.File

class AuthRepository(private val tokenManager: TokenManager) {

    private val api = RetrofitClient.instance

    suspend fun login(username: String, password: String): Result<UserProfile> {
        return try {
            val tokenRes = api.login(LoginRequest(username, password))
            tokenManager.saveTokens(tokenRes.access, tokenRes.refresh)
            tokenManager.saveUsername(username)
            val profile = api.getProfile()
            Result.success(profile)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun register(username: String, password: String): Result<UserProfile> {
        return try {
            val res = api.register(RegisterRequest(username, password))
            tokenManager.saveTokens(res.access, res.refresh)
            tokenManager.saveUsername(username)
            val profile = api.getProfile()
            Result.success(profile)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getProfile(): Result<UserProfile> {
        return try {
            Result.success(api.getProfile())
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun setFavoriteTeam(teamId: Int): Result<UserProfile> {
        return try {
            Result.success(api.setFavoriteTeam(FavoriteTeamRequest(teamId)))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun uploadAvatar(file: File): Result<UserProfile> {
        return try {
            val requestBody = file.asRequestBody("image/*".toMediaTypeOrNull())
            val part = MultipartBody.Part.createFormData("avatar", file.name, requestBody)
            Result.success(api.uploadAvatar(part))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun logout() {
        tokenManager.clear()
    }
}
