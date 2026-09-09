import { TeamLogo } from './MatchCard'
import { useNavigate } from 'react-router-dom'

// Swiss (3-win advance / 3-loss out) bracket board in esports scoreboard style:
// - columns are rounds (match days)
// - matches grouped by entering W-L record; each group is a subtle tinted panel
//   (NOT individual raised cards)
// - each fixture = two slim rows (home/away) with a fine divider between fixtures,
//   right-aligned tabular scores; whole row is clickable -> team page
// - terminal columns inserted after the round where 3 wins / 3 losses were reached
// Self-contained dark board, shared by the real progress page and the simulator.

const WIN_TARGET = 3

function teamId(m) {
  return m.home_team?.id ?? m.home
}

function awayId(m) {
  return m.away_team?.id ?? m.away
}

function matchWinner(m) {
  if (m.status !== 'finished') return null
  if (m.home_score == null || m.away_score == null || m.home_score === m.away_score) return null
  return m.home_score > m.away_score ? 'home' : 'away'
}

const ROUND_GROUP_ORDER = {
  1: ['0-0'],
  2: ['1-0', '0-1'],
  3: ['2-0', '1-1', '0-2'],
  4: ['2-1', '1-2'],
  5: ['2-2'],
}

// one fixture = two slim team rows; no outer card
function TeamRow({ team, score, won, decided, onOpen, isLast }) {
  const dim = decided && !won
  return (
    <div
      className={`swiss-row ${dim ? 'is-dim' : ''}`}
      style={{ borderBottom: isLast ? 'none' : '1px solid var(--swiss-line)' }}
      onClick={() => onOpen(team?.id)}
    >
      <span className="swiss-row-flag">
        <span className={`swiss-row-mark ${won ? 'win' : ''}`} />
      </span>
      <TeamLogo logo={team?.logo} name={team?.name} size={18} />
      <span className="swiss-row-name">
        {team?.name || '?'}
      </span>
      <span className={`swiss-row-score ${won ? 'win' : ''}`}>
        {decided ? score : '—'}
      </span>
    </div>
  )
}

function MatchRows({ match, onOpen }) {
  const finished = match.status === 'finished'
  const hasScore = finished && match.home_score != null && match.away_score != null && match.home_score !== match.away_score
  const winner = hasScore ? matchWinner(match) : null
  const decided = !!winner

  // For finished fixtures show the final score prominently in a divider bar.
  if (decided) {
    return (
      <div className="swiss-fixture">
        <TeamRow team={match.home_team} score={match.home_score} won={winner === 'home'} decided onOpen={onOpen} />
        <TeamRow team={match.away_team} score={match.away_score} won={winner === 'away'} decided onOpen={onOpen} isLast />
      </div>
    )
  }

  // scheduled / pending: two rows + a subtle hint
  return (
    <div className="swiss-fixture">
      <TeamRow team={match.home_team} score={null} won={false} decided={false} onOpen={onOpen} />
      <TeamRow team={match.away_team} score={null} won={false} decided={false} onOpen={onOpen} isLast />
      <div className="swiss-fixture-hint">{finished ? '待结算' : '? 对阵 ?'}</div>
    </div>
  )
}

function GroupPanel({ record, matches, onOpen }) {
  return (
    <div className="swiss-group-panel">
      <div className="swiss-group-head">{record}</div>
      <div className="swiss-group-body">
        {matches.map((m, idx) => (
          <div key={m.id} className="swiss-fixture">
            <MatchRows match={m} onOpen={onOpen} />
            {idx < matches.length - 1 && <div className="swiss-fixture-sep" />}
          </div>
        ))}
      </div>
    </div>
  )
}

function TerminalBox({ title, teams, kind, onOpen }) {
  if (!teams.length) return null
  return (
    <div className={`swiss-terminal ${kind}`}>
      <div className="swiss-terminal-title">{title}</div>
      <div className="swiss-terminal-teams">
        {teams.map((team) => (
          <div key={team?.id} className="swiss-terminal-team" onClick={() => onOpen(team?.id)} title={team?.name}>
            <TeamLogo logo={team?.logo} name={team?.name} size={22} />
            <span>{team?.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function BracketView({ rounds, currentRound = null, showLegend = false }) {
  const navigate = useNavigate()
  const onOpen = (id) => { if (id != null) navigate(`/teams/${id}`) }
  if (!rounds || rounds.length === 0) {
    return <div className="swiss-board-empty">赛事尚未开始，暂无对阵</div>
  }

  const sortedRounds = [...rounds].sort((a, b) => a.round - b.round)

  // ---- 1) entering records per match + final record per team ----
  const rec = new Map()
  const getRec = (id) => rec.get(id) || { w: 0, l: 0 }

  for (const r of sortedRounds) {
    for (const m of r.matches) {
      m.entering = {
        home: { ...getRec(teamId(m)) },
        away: { ...getRec(awayId(m)) },
      }
    }
    for (const m of r.matches) {
      const w = matchWinner(m)
      if (!w) continue
      const h = rec.get(teamId(m)) || { w: 0, l: 0 }
      const a = rec.get(awayId(m)) || { w: 0, l: 0 }
      if (w === 'home') { h.w += 1; a.l += 1 } else { a.w += 1; h.l += 1 }
      rec.set(teamId(m), h)
      rec.set(awayId(m), a)
    }
  }

  // ---- 2) terminal groups ----
  const teamObj = {}
  for (const r of sortedRounds) {
    for (const m of r.matches) {
      if (m.home_team) teamObj[teamId(m)] = m.home_team
      if (m.away_team) teamObj[awayId(m)] = m.away_team
    }
  }
  const adv = { '3-0': [], '3-1': [], '3-2': [] }
  const elim = { '0-3': [], '1-3': [], '2-3': [] }
  for (const [idStr, team] of Object.entries(teamObj)) {
    const r = rec.get(Number(idStr))
    if (!r) continue
    if (r.w >= WIN_TARGET) adv[`3-${r.l}`]?.push(team)
    else if (r.l >= WIN_TARGET) elim[`${r.w}-3`]?.push(team)
  }

  // ---- 3) group matches per round ----
  const columns = sortedRounds.map((r) => {
    const groups = {}
    for (const m of r.matches) {
      const key = `${m.entering.home.w}-${m.entering.home.l}`
      ;(groups[key] = groups[key] || []).push(m)
    }
    const order = (ROUND_GROUP_ORDER[r.round] || [])
      .filter((k) => groups[k]?.length)
      .concat(Object.keys(groups).filter((k) => !(ROUND_GROUP_ORDER[r.round] || []).includes(k)))
    return { round: r.round, dateStr: r.dateStr, groups, order }
  })

  // ---- 4) always render the full 6-column frame so early rounds only occupy the
  //        left part; unreached columns show a placeholder shell ----
  const roundCol = (r) => columns.find((c) => c.round === r) || null
  const hasBox = (teams) => teams && teams.length > 0

  const Placeholder = () => (
    <div className="swiss-col-placeholder">
      <div className="swiss-col-placeholder-dash">
        <span>等待后续轮次</span>
      </div>
    </div>
  )

  const renderRoundGroups = (col) => (
    <div className="swiss-groups">
      {col.order.map((key) => (
        <GroupPanel key={key} record={key} matches={col.groups[key]} onOpen={onOpen} />
      ))}
    </div>
  )

  const renderColHead = (roundNo, dateStr) => (
    <div className="swiss-col-head">
      <span>第 {roundNo} 轮</span>
      {dateStr && <span className="swiss-col-date">{dateStr}</span>}
    </div>
  )

  const renderTopBox = (box) => (hasBox(box?.teams) ? (
    <div className="swiss-box-top">
      <TerminalBox title={`${box.key} · 晋级`} teams={box.teams} kind="adv" onOpen={onOpen} />
    </div>
  ) : null)

  const renderBottomBox = (box) => (hasBox(box?.teams) ? (
    <div className="swiss-box-bottom">
      <TerminalBox title={`${box.key} · 淘汰`} teams={box.teams} kind="elim" onOpen={onOpen} />
    </div>
  ) : null)

  // slot spec for the fixed 6-frame layout
  const slotSpecs = []

  for (const r of [1, 2, 3]) {
    slotSpecs.push({ kind: 'round', round: r })
  }
  slotSpecs.push({ kind: 'merged', round: 4, advKey: '3-0', elimKey: '0-3' })
  slotSpecs.push({ kind: 'merged', round: 5, advKey: '3-1', elimKey: '1-3' })
  slotSpecs.push({ kind: 'result', advKey: '3-2', elimKey: '2-3' })

  const slots = slotSpecs.map((spec, i) => {
    const isResult = spec.kind === 'result'
    const box = (teams) => teams && teams.length > 0
    if (spec.kind === 'round') {
      const col = roundCol(spec.round)
      return { ...spec, col, isResult, hasContent: !!col }
    }
    if (spec.kind === 'merged') {
      const col = roundCol(spec.round)
      const advBox = { key: spec.advKey, teams: adv[spec.advKey] }
      const elimBox = { key: spec.elimKey, teams: elim[spec.elimKey] }
      const hasContent = !!col || box(adv[spec.advKey]) || box(elim[spec.elimKey])
      return { ...spec, col, advBox, elimBox, isResult, hasContent }
    }
    // result
    const advBox = { key: spec.advKey, teams: adv[spec.advKey] }
    const elimBox = { key: spec.elimKey, teams: elim[spec.elimKey] }
    return { ...spec, advBox, elimBox, isResult, hasContent: box(adv[spec.advKey]) || box(elim[spec.elimKey]) }
  })

  return (
    <div className="swiss-board">
      {showLegend && (
        <div className="swiss-legend">
          <div className="swiss-legend-items">
            <span className="swiss-legend-item">
              <i className="legend-dot legend-win" /> 胜方
            </span>
            <span className="swiss-legend-item">
              <i className="legend-dot legend-dim" /> 负方 / 出局
            </span>
            <span className="swiss-legend-item legend-record">「1-0」= 带着 1 胜 0 负进入本轮</span>
          </div>
          <span className="swiss-legend-rule">3 胜晋级 · 3 负出局 · 同战绩优先配对</span>
        </div>
      )}
      <div className="swiss-board-row">
        {slots.map((slot, i) => {
          const roundNo = slot.round
          const roundComplete = slot.col?.matches?.every((m) => m.status === 'finished')
          const stateCls =
            currentRound != null && slot.col
              ? roundNo < currentRound
                ? ' is-past'
                : roundNo === currentRound
                  ? ' is-current'
                  : ''
              : roundComplete
                ? ' is-past'
                : ''
          if (slot.kind === 'round') {
            const inner = slot.hasContent ? (
              <>
                {renderColHead(slot.round, slot.col.dateStr)}
                {renderRoundGroups(slot.col)}
              </>
            ) : (
              <>
                {renderColHead(slot.round, '')}
                <Placeholder />
              </>
            )
            return (
              <div key={`r-${slot.round}`} className={`swiss-col${stateCls}`}>
                {inner}
              </div>
            )
          }

          if (slot.kind === 'merged') {
            const inner = (
              <>
                {slot.hasContent ? (
                  <>
                    {renderTopBox(slot.advBox)}
                    {renderColHead(slot.round, slot.col?.dateStr)}
                    {slot.col && renderRoundGroups(slot.col)}
                    {renderBottomBox(slot.elimBox)}
                  </>
                ) : (
                  <>
                    {renderColHead(slot.round, '')}
                    <Placeholder />
                  </>
                )}
              </>
            )
            return (
              <div key={`m-${slot.round}`} className={`swiss-col${stateCls}`}>
                {inner}
              </div>
            )
          }

          // result column
          const inner = slot.hasContent ? (
            <div className="swiss-result">
              {renderTopBox(slot.advBox)}
              {renderBottomBox(slot.elimBox)}
            </div>
          ) : (
            <Placeholder />
          )
          return (
            <div key="result" className="swiss-col swiss-col-result">
              {inner}
            </div>
          )
        })}
      </div>
    </div>
  )
}
