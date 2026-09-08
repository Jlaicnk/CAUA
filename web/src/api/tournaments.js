import client from './client'

export const getTournaments = () => client.get('tournaments/')

export const getTournament = (id) => client.get(`tournaments/${id}/`)

export const getMatches = (tournamentId) =>
  client.get('matches/', { params: tournamentId ? { tournament: tournamentId } : {} })

export const getMatch = (id) => client.get(`matches/${id}/`)

export const getMatchHistory = (id) => client.get(`matches/${id}/history/`)

export const getStandings = (id) => client.get(`tournaments/${id}/standings/`)

export const getTournamentBracket = (id) => client.get(`tournaments/${id}/bracket/`)
