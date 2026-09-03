import client from './client'

export const getTeams = () => client.get('teams/')

export const getTeam = (id) => client.get(`teams/${id}/`)

export const getPlayer = (id) => client.get(`players/${id}/`)
