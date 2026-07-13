package com.example.t.data.model

import com.google.gson.annotations.SerializedName

data class Tournament(
    val id: Int,
    val name: String,
    val icon: String? = null,
    val description: String = "",
    val rules: String = "",
    @SerializedName("start_date")
    val startDate: String,
    @SerializedName("end_date")
    val endDate: String,
    val teams: List<TournamentTeamData>? = null
)

data class TournamentTeamData(
    val id: Int,
    val team: Team,
    val rank: Int? = null,
    @SerializedName("global_rank")
    val globalRank: Int? = null
)
