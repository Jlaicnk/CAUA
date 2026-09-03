import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/'

const TOKEN_KEY = 'caua_access'
const REFRESH_KEY = 'caua_refresh'

export const tokenStore = {
  getAccess: () => localStorage.getItem(TOKEN_KEY),
  getRefresh: () => localStorage.getItem(REFRESH_KEY),
  setTokens(access, refresh) {
    localStorage.setItem(TOKEN_KEY, access)
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh)
  },
  clear() {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 20000,
})

client.interceptors.request.use((config) => {
  const token = tokenStore.getAccess()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

let refreshing = null

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { response, config } = error
    if (response && response.status === 401 && !config._retry && tokenStore.getRefresh()) {
      config._retry = true
      try {
        refreshing = refreshing || axios
          .post(`${BASE_URL}auth/refresh/`, { refresh: tokenStore.getRefresh() })
          .then((r) => {
            tokenStore.setTokens(r.data.access, r.data.refresh || tokenStore.getRefresh())
            return r.data.access
          })
          .finally(() => { refreshing = null })
        const token = await refreshing
        config.headers.Authorization = `Bearer ${token}`
        return client(config)
      } catch (e) {
        tokenStore.clear()
      }
    }
    return Promise.reject(error)
  }
)

export default client
