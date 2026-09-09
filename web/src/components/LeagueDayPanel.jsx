import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TeamLogo } from './MatchCard'
import { getTournamentDayChanges } from '../api/tournaments'

// 「今日队伍积分变动」：只显示最新已完赛一轮的 4 场比赛 + 每队积分变动。
function Delta({ value }) {
  if (value == null) return null
  const v = Number(value)
  const cls = v > 0 ? 'day-delta day-delta-up' : v < 0 ? 'day-delta day-delta-down' : 'day-delta day-delta-zero'
  return <span className={cls}>{v > 0 ? `+${v}` : v}</span>
}

function TeamSide({ team, delta, alignRight, onOpen }) {
  return (
    <div
      className={`league-day-side ${alignRight ? 'right' : ''}`}
      onClick={() => team?.id != null && onOpen(team.id)}
      title={team?.name}
    >
      <TeamLogo logo={team?.logo} name={team?.name} size={26} />
      <span className="league-day-team">{team?.name || '?'}</span>
      <Delta value={delta} />
    </div>
  )
}

function MatchCard({ m, onOpen, onOpenMatch }) {
  const decided = m.home_score != null && m.away_score != null
  return (
    <div className="league-day-card">
      <TeamSide team={m.home_team} delta={m.home_points_change} onOpen={onOpen} />
      <div
        className="league-day-score"
        onClick={() => m.match_id != null && onOpenMatch(m.match_id)}
        title="查看比赛详情"
      >
        {decided ? (
          <>
            <b>{m.home_score}</b>
            <span>:</span>
            <b>{m.away_score}</b>
          </>
        ) : (
          'VS'
        )}
      </div>
      <TeamSide team={m.away_team} delta={m.away_points_change} alignRight onOpen={onOpen} />
    </div>
  )
}

export default function LeagueDayPanel({ tournament }) {
  const navigate = useNavigate()
  const onOpen = (id) => navigate(`/teams/${id}`)
  const onOpenMatch = (id) => navigate(`/matches/${id}`)
  const [data, setData] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    setData(null)
    setFailed(false)
    if (!tournament?.id) return
    getTournamentDayChanges(tournament.id)
      .then((r) => setData(r.data))
      .catch(() => setFailed(true))
  }, [tournament?.id])

  const matches = data?.matches || []

  return (
    <div className="league-day">
      <div className="league-day-head">
        <h2 className="section-title" style={{ margin: 0 }}>今日队伍积分变动</h2>
        {data?.round != null && (
          <span className="league-day-meta">
            第 {data.round} 轮 · {data.date}
            {tournament?.stage_status === 'finished' && ' · 单循环已全部打完'}
          </span>
        )}
      </div>

      {failed ? (
        <div className="page-empty">加载失败，请稍后重试</div>
      ) : !data ? (
        <div className="page-empty">加载中…</div>
      ) : matches.length ? (
        <div className="league-day-grid">
          {matches.map((m) => <MatchCard key={m.match_id} m={m} onOpen={onOpen} onOpenMatch={onOpenMatch} />)}
        </div>
      ) : (
        <div className="page-empty">本日暂无已完赛比赛，等待管理员录入比分后将在此展示每队积分变动。</div>
      )}
    </div>
  )
}
