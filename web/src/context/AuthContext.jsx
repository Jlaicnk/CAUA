import { createContext, useContext, useCallback, useEffect, useState } from 'react'
import { getProfile, login as apiLogin, register as apiRegister } from '../api/auth'
import { tokenStore } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const refreshProfile = useCallback(async () => {
    if (!tokenStore.getAccess()) {
      setUser(null)
      return
    }
    try {
      const { data } = await getProfile()
      setUser(data)
    } catch (e) {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    refreshProfile().finally(() => setLoading(false))
  }, [refreshProfile])

  const login = useCallback(async (username, password) => {
    const { data } = await apiLogin(username, password)
    tokenStore.setTokens(data.access, data.refresh)
    await refreshProfile()
  }, [refreshProfile])

  const register = useCallback(async (username, password) => {
    const { data } = await apiRegister(username, password)
    tokenStore.setTokens(data.access, data.refresh)
    await refreshProfile()
  }, [refreshProfile])

  const logout = useCallback(() => {
    tokenStore.clear()
    setUser(null)
  }, [])

  const setUserFromProfile = useCallback((profile) => setUser(profile), [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshProfile, setUser: setUserFromProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
