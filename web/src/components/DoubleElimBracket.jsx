import { useNavigate } from 'react-router-dom'
import { TeamLogo } from './MatchCard'
import { TrophyOutlined, CrownFilled } from '@ant-design/icons'

function TrackColumn({ col, prefix, onOpen }) {
  return (
    <div className="de-col">
      <div className="de-col-head">{col.name}</div>
      <div className="de-col-body">
        {col.matches.map((m) => (
          <DeMatch key={m.match_id} id={`${prefix}${m.match_id}`} m={m} onOpen={onOpen} />
        ))}
      </div>
    </div>
  )
}

function DeTeamRow({ team, score, won, decided, last }) {
  return (
    <div className={`kb-teamline ${decided && !won ? 'is-dim' : ''} ${won ? 'is-win' : ''} ${last ? 'is-last' : ''}`}>
      <span className="kb-teamline-mark" />
      <TeamLogo logo={team?.logo} name={team?.name} size={20} />
      <span className="kb-teamline-name">{team?.name || '待定'}</span>
      {decided ? (
        <b className={won ? 'is-win' : ''}>{score}</b>
      ) : (
        <span className="kb-teamline-dash">—</span>
      )}
    </div>
  )
}

function DeMatch({ id, m, onOpen }) {
  const finished = m.status === 'finished'
  const decided = finished && m.home_score != null && m.away_score != null && m.home_score !== m.away_score
  const winner = decided ? (m.home_score > m.away_score ? 'home' : 'away') : null
  return (
    <div
      id={id}
      className={`de-match ${finished ? 'is-finished' : 'is-pending'}`}
      onClick={() => onOpen && m.match_id != null && onOpen(m.match_id)}
      title={onOpen ? '查看比赛详情' : undefined}
    >
      <DeTeamRow team={m.home_team} score={m.home_score} won={winner === 'home'} decided={decided} />
      <DeTeamRow team={m.away_team} score={m.away_score} won={winner === 'away'} decided={decided} last />
      {finished && !decided && <div className="kb-pending-tip">待结算</div>}
    </div>
  )
}

export default function DoubleElimBracket({ data, interactive = true }) {
  const navigate = useNavigate()

  const onOpen = interactive ? (id) => navigate(`/matches/${id}`) : null

  if (!data || (!data.winners?.length && !data.losers?.length)) {
    return <div className="swiss-board-empty">双败对阵尚未生成</div>
  }

  const finalCol = data.final || null

  return (
    <div className="de-scroll">
      <div className="de-bracket">
        <div className="de-track-head winners">
          <span className="de-track-icon">
            <CrownFilled />
          </span>
          胜者组
          <em>输一场 → 掉入败者组</em>
        </div>
        <div className="de-track">
          {(data.winners || []).map((col) => (
            <TrackColumn key={`w-${col.round}`} col={col} prefix="dew-" onOpen={onOpen} />
          ))}
        </div>

        <div className="de-track-head losers">
          <span className="de-track-icon">
            <TrophyOutlined />
          </span>
          败者组
          <em>再输一场 → 淘汰出局</em>
        </div>
        <div className="de-track">
          {(data.losers || []).map((col) => (
            <TrackColumn key={`l-${col.round}`} col={col} prefix="del-" onOpen={onOpen} />
          ))}
        </div>

        {finalCol && (
          <>
            <div className="de-track-head final-head">
              <span className="de-track-icon">
                <TrophyOutlined />
              </span>
              总决赛
            </div>
            <div className="de-final-area">
              {finalCol.matches.map((m) => (
                <DeMatch key={m.match_id} id={`def-${m.match_id}`} m={m} onOpen={onOpen} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
