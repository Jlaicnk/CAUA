package com.example.t.data.model

import com.google.gson.annotations.SerializedName

data class Match(
    val id: Int,
    val tournament: Int,
    @SerializedName("tournament_name")
    val tournamentName: String? = null,
    @SerializedName("home_team")
    val homeTeam: Team,
    @SerializedName("away_team")
    val awayTeam: Team,
    @SerializedName("home_score")
    val homeScore: Int? = null,
    @SerializedName("away_score")
    val awayScore: Int? = null,
    @SerializedName("match_date")
    val matchDate: String,
    val status: String
)
