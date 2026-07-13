package com.example.t.data.repository

import com.example.t.data.api.RetrofitClient
import com.example.t.data.model.Player
import com.example.t.data.model.Team

class TeamRepository {

    private val api = RetrofitClient.instance

    suspend fun getTeams(): Result<List<Team>> {
        return try {
            Result.success(api.getTeams())
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getTeam(id: Int): Result<Team> {
        return try {
            Result.success(api.getTeam(id))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getPlayer(id: Int): Result<Player> {
        return try {
            Result.success(api.getPlayer(id))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
