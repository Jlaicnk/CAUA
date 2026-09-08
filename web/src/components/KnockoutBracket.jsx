import { TeamLogo } from './MatchCard'
import { useNavigate } from 'react-router-dom'

// 单败淘汰赛 bracket（16强→8强→半决赛→决赛+季军赛）
// rounds: [{round, name, matches:[{match_id,status,home_team,away_team,home_score,away_score}]}]
export default function KnockoutBracket({ rounds = [], phase }) {
  const navigate = useNavigate()

  if (!rounds || rounds.length === 0) {
    return (
      <div className="page-empty" style={{ padding: '28px 0' }}>
        {phase === 'knockout' ? '淘汰赛对局尚未生成' : '当前赛事未进入淘汰赛阶段'}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 8 }}>
      {rounds.map((col) => (
        <div key={col.round} style={{ minWidth: 250, flexShrink: 0 }}>
          <div
            style={{
              textAlign: 'center', padding: '5px 8px', marginBottom: 8,
              background: 'var(--primary-soft)', color: 'var(--primary-deep)',
              fontWeight: 800, borderRadius: 8, fontSize: 13,
            }}
          >
            {col.name}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {col.matches.map((m) => {
              const finished = m.status === 'finished'
              const hs = m.home_score
              const as = m.away_score
              const decided = finished && hs != null && as != null && hs !== as
              const homeWon = decided && hs > as
              const awayWon = decided && as > hs
              return (
                <div
                  key={m.match_id}
                  onClick={() => navigate(`/matches/${m.match_id}`)}
                  style={{
                    border: '1px solid var(--border)', borderRadius: 12, background: '#fff',
                    padding: '6px 10px', cursor: 'pointer', transition: 'box-shadow 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-card)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'none' }}
                >
                  <TeamRow team={m.home_team} score={hs} won={homeWon} decided={decided} />
                  <TeamRow team={m.away_team} score={as} won={awayWon} decided={decided} last />
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

function TeamRow({ team, score, won, decided, last }) {
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0',
        borderBottom: last ? 'none' : '1px solid rgba(236,238,242,0.6)',
        opacity: decided && !won ? 0.45 : 1,
      }}
    >
      <TeamLogo logo={team?.logo} name={team?.name} size={20} />
      <span style={{ flex: 1, fontWeight: won ? 800 : 500, color: won ? 'var(--success)' : 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {team?.name || '?'}
      </span>
      {decided ? (
        <span style={{ fontWeight: 800, color: won ? 'var(--success)' : 'var(--text-2nd)' }}>{score}</span>
      ) : (
        <span style={{ color: 'var(--text-3rd)' }}>—</span>
      )}
    </div>
  )
}