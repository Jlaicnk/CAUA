import client from './client'

export const login = (username, password) =>
  client.post('auth/login/', { username, password })

export const register = (username, password) =>
  client.post('auth/register/', { username, password })

export const getProfile = () => client.get('auth/profile/')

export const uploadAvatar = (file) => {
  const form = new FormData()
  form.append('avatar', file)
  return client.put('auth/profile/', form)
}

export const setFavoriteTeam = (teamId) =>
  client.post('auth/profile/favorite-team/', { team_id: teamId })
