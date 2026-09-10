import client from './client'

export const getTeams = () => client.get('teams/')

export const getTeam = (id) => client.get(`teams/${id}/`)

export const getTeamHistory = (id) => client.get(`teams/${id}/history/`)

export const getPlayer = (id) => client.get(`players/${id}/`)

export const getPlayers = (params) => client.get('players/', { params })
