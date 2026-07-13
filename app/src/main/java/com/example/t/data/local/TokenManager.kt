package com.example.t.data.local

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.runBlocking

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "auth_prefs")

class TokenManager(private val context: Context) {

    companion object {
        private val ACCESS_KEY = stringPreferencesKey("access_token")
        private val REFRESH_KEY = stringPreferencesKey("refresh_token")
        private val USERNAME_KEY = stringPreferencesKey("username")

        @Volatile
        private var instance: TokenManager? = null

        fun getInstance(context: Context): TokenManager {
            return instance ?: synchronized(this) {
                instance ?: TokenManager(context.applicationContext).also { instance = it }
            }
        }
    }

    val accessToken: Flow<String?> = context.dataStore.data.map { it[ACCESS_KEY] }
    val refreshToken: Flow<String?> = context.dataStore.data.map { it[REFRESH_KEY] }
    val username: Flow<String?> = context.dataStore.data.map { it[USERNAME_KEY] }

    suspend fun saveTokens(access: String, refresh: String) {
        context.dataStore.edit {
            it[ACCESS_KEY] = access
            it[REFRESH_KEY] = refresh
        }
    }

    suspend fun saveUsername(name: String) {
        context.dataStore.edit { it[USERNAME_KEY] = name }
    }

    suspend fun getAccessToken(): String? {
        return context.dataStore.data.first()[ACCESS_KEY]
    }

    suspend fun clear() {
        context.dataStore.edit {
            it.clear()
        }
    }

    fun isLoggedIn(): Boolean {
        return runBlocking { context.dataStore.data.first()[ACCESS_KEY] != null }
    }
}
