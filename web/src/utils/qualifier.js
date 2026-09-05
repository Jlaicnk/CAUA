// Mirror of backend qualifier-swiss pairing logic for the front-end simulator.
export const WIN_TARGET = 3
export const LOSS_TARGET = 3
export const ALIVE = 'alive'
export const ADVANCED = 'advanced'
export const ELIMINATED = 'eliminated'

const BAND = {
  '0-0': 0,
  '1-0': 1, '0-1': 2,
  '2-0': 3, '1-1': 4, '0-2': 5,
  '2-1': 6, '1-2': 7,
  '2-2': 8,
}

export function statusOf(w, l) {
  if (w >= WIN_TARGET) return ADVANCED
  if (l >= LOSS_TARGET) return ELIMINATED
  return ALIVE
}

function randInt(max) {
  return Math.floor(Math.random() * (max + 1))
}

export function randomScores() {
  for (;;) {
    const hs = randInt(5)
    const as = randInt(5)
    if (hs !== as) return [hs, as]
  }
}

// forbidden: Set of "a|b" sorted-pair keys
function pairPool(ids, forbidden) {
  if (ids.length === 0) return []
  if (ids.length % 2) throw new Error('odd pool')
  const first = ids[0]
  const rest = ids.slice(1)
  for (let k = 0; k < rest.length; k++) {
    const other = rest[k]
    const key = first < other ? `${first}|${other}` : `${other}|${first}`
    if (forbidden.has(key)) continue
    const remaining = rest.slice(0, k).concat(rest.slice(k + 1))
    const sub = pairPool(remaining, forbidden)
    if (sub) return [[first, other]].concat(sub)
  }
  return null
}

// aliveTeams: array of {team_id, wins, losses}. forbidden: Set.
// returns array of [homeId, awayId]
export function pairRound(aliveTeams, forbidden) {
  const ordered = aliveTeams
    .slice()
    .sort((a, b) => {
      const ba = BAND[`${a.wins}-${a.losses}`] ?? 9
      const bb = BAND[`${b.wins}-${b.losses}`] ?? 9
      if (ba !== bb) return ba - bb
      return Math.random() - 0.5
    })
  const ids = ordered.map((t) => t.team_id)
  if (ids.length % 2) throw new Error('存活队伍数为奇数，无法配对')
  if (ids.length === 0) return []
  const pairs = pairPool(ids, forbidden)
  if (!pairs) throw new Error('无法生成不重复的配对')
  return pairs
}

export function addForbidden(forbidden, homeId, awayId) {
  forbidden.add(homeId < awayId ? `${homeId}|${awayId}` : `${awayId}|${homeId}`)
}
