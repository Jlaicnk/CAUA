import { useNavigate } from 'react-router-dom'
import { TeamLogo } from './MatchCard'

// 单循环联赛对阵板：按轮（列）展示，每轮 4 场，胜负高亮。复用 swiss 轻量行样式。
function matchWinner(m) {
  if (m.status !== 'finished') return null
  if (m.home_score == null || m.away_score == null || m.home_score === m.away_score) return null
  return m.home_score > m.away_score ? 'home' : 'away'
}

function Row({ team, score, won, decided, onOpen, isLast }) {
  return (
    <div
      className={`swiss-row ${decided && !won ? 'is-dim' : ''}`}
      style={{ borderBottom: isLast ? 'none' : '1px solid var(--swiss-line)' }}
      onClick={() => team?.id != null && onOpen(team.id)}
    >
      <span className="swiss-row-flag">
        <span className={`swiss-row-mark ${won ? 'win' : ''}`} />
      </span>
      <TeamLogo logo={team?.logo} name={team?.name} size={18} />
      <span className="swiss-row-name">{team?.name || '?'}</span>
      <span className={`swiss-row-score ${won ? 'win' : ''}`}>{decided ? score : '—'}</span>
    </div>
  )
}

function Fixture({ match, onOpen }) {
  const winner = matchWinner(match)
  const decided = !!winner

  if (decided) {
    return (
      <div className="swiss-fixture">
        <Row team={match.home_team} score={match.home_score} won={winner === 'home'} decided onOpen={onOpen} />
        <Row team={match.away_team} score={match.away_score} won={winner === 'away'} decided onOpen={onOpen} isLast />
      </div>
    )
  }

  return (
    <div className="swiss-fixture">
      <Row team={match.home_team} score={null} won={false} decided={false} onOpen={onOpen} />
      <Row team={match.away_team} score={null} won={false} decided={false} onOpen={onOpen} isLast />
      {match.status === 'finished' && <div className="swiss-fixture-hint">待结算</div>}
    </div>
  )
}

export default function LeagueSchedule({ rounds }) {
  const navigate = useNavigate()
  const onOpen = (id) => navigate(`/teams/${id}`)

  if (!rounds || rounds.length === 0) {
    return <div className="swiss-board-empty">赛事尚未开始，暂无对阵</div>
  }

  const sorted = [...rounds].sort((a, b) => a.round - b.round)

  return (
    <div className="swiss-board league-board">
      <div className="swiss-board-row league-board-row">
        {sorted.map((r) => (
          <div key={r.round} className="swiss-col">
            <div className="swiss-col-head">
              <span>第 {r.round} 轮</span>
              {r.dateStr && <span className="swiss-col-date">{r.dateStr}</span>}
            </div>
            <div className="swiss-groups">
              {r.matches.map((m) => (
                <div key={m.id} className="swiss-group-panel" style={{ padding: '1px 0' }}>
                  <Fixture match={m} onOpen={onOpen} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
