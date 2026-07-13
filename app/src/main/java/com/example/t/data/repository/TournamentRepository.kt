package com.example.t.data.repository

import com.example.t.data.api.RetrofitClient
import com.example.t.data.model.Match
import com.example.t.data.model.Tournament

class TournamentRepository {

    private val api = RetrofitClient.instance

    suspend fun getTournaments(): Result<List<Tournament>> {
        return try {
            Result.success(api.getTournaments())
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getTournament(id: Int): Result<Tournament> {
        return try {
            Result.success(api.getTournament(id))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getMatches(tournamentId: Int? = null): Result<List<Match>> {
        return try {
            Result.success(api.getMatches(tournamentId))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    suspend fun getMatch(id: Int): Result<Match> {
        return try {
            Result.success(api.getMatch(id))
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
