package com.example.t.data.repository

import com.example.t.data.api.RetrofitClient
import com.example.t.data.model.HomeResponse

class HomeRepository {

    private val api = RetrofitClient.instance

    suspend fun getHomeData(): Result<HomeResponse> {
        return try {
            Result.success(api.getHome())
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
