import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Skeleton, Empty, Tag, Button } from 'antd'
import { ArrowLeftOutlined, PlayCircleFilled, PauseCircleFilled, RiseOutlined, FallOutlined } from '@ant-design/icons'
import { getTeam, getTeamHistory } from '../api/teams'
import { TeamLogo } from '../components/MatchCard'
import PointsLineChart from '../components/PointsLineChart'

export default function TeamDetail() {
  const { id } = useParams()
  const [team, setTeam] = useState(null)
  const [history, setHistory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    setLoading(true)
    Promise.all([getTeam(id), getTeamHistory(id)])
      .then(([teamRes, hisRes]) => {
        setTeam(teamRes.data)
        setHistory(hisRes.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  const togglePlay = () => {
    const audio = audioRef.current
    if (!audio) return
    if (playing) {
      audio.pause()
    } else {
      audio.play().catch(() => {})
    }
  }

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return undefined
    const onEnd = () => setPlaying(false)
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    audio.addEventListener('ended', onEnd)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    return () => {
      audio.removeEventListener('ended', onEnd)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
    }
  }, [team])

  if (loading) {
    return (
      <div className="page">
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    )
  }
  if (!team) {
    return <div className="page page-empty">队伍不存在或加载失败</div>
  }

  return (
    <div className="page" style={{ maxWidth: 860 }}>
      <span
        onClick={() => navigate(-1)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-2nd)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
      >
        <ArrowLeftOutlined /> 返回
      </span>

      <div className="panel" style={{ marginTop: 14, padding: 0, overflow: 'hidden' }}>
        {/* top color strip */}
        <div
          style={{
            height: 6,
            background: 'linear-gradient(90deg, var(--primary), #ffb3c6 40%, #dfe9f2 100%)',
          }}
        />
        <div style={{ padding: 28, display: 'flex', alignItems: 'center', gap: 22, flexWrap: 'wrap' }}>
          <div style={{ border: '1px solid var(--border)', borderRadius: '50%', padding: 4, flexShrink: 0 }}>
            <TeamLogo logo={team.logo} name={team.name} size={92} />
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{team.name}</div>
            <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Tag style={{ borderRadius: 6, marginInlineEnd: 0 }}>排名 {team.leaderboard_rank ?? team.rank}</Tag>
              <Tag color="magenta" style={{ borderRadius: 6, marginInlineEnd: 0, fontWeight: 700 }}>
                积分 {team.points ?? 1000}
              </Tag>
              {team.song && (
                <Button
                  size="small"
                  icon={playing ? <PauseCircleFilled /> : <PlayCircleFilled />}
                  onClick={togglePlay}
                  style={{ borderRadius: 6 }}
                >
                  {playing ? '暂停队歌' : '播放队歌'}
                </Button>
              )}
            </div>
            {team.song && <audio ref={audioRef} src={team.song} preload="metadata" />}
            {team.description && (
              <div className="text-2nd" style={{ marginTop: 14, lineHeight: 1.8, fontSize: 14 }}>
                {team.description}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 近期战绩 */}
      <RecentResults teamId={Number(id)} history={history} />

      <div className="section-head">
        <h2 className="section-title">队员列表</h2>
        <span className="text-2nd" style={{ fontSize: 13 }}>{team.players?.length || 0} 名队员</span>
      </div>
      {team.players?.length ? (
        <div className="player-grid">
          {team.players.map((p) => (
            <div key={p.id} className="player-card" onClick={() => navigate(`/players/${p.id}`)}>
              <div style={{ width: 64, height: 64, margin: '0 auto 12px', position: 'relative' }}>
                <div className="logo-bubble" style={{ width: 64, height: 64, overflow: 'hidden' }}>
                  {p.avatar ? (
                    <img src={p.avatar} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div className="init-badge">{p.name?.charAt(0)}</div>
                  )}
                </div>
                <span
                  style={{
                    position: 'absolute',
                    bottom: -2,
                    right: -6,
                    background: 'var(--primary)',
                    color: '#fff',
                    borderRadius: 6,
                    padding: '0 6px',
                    fontSize: 11,
                    fontWeight: 800,
                  }}
                >
                  #{p.number}
                </span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {p.name}
              </div>
              <div className="text-2nd" style={{ fontSize: 12, marginTop: 4 }}>{p.position}</div>
              {p.overall != null && (
                <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--primary-deep)', marginTop: 2 }}>OVR {p.overall}</div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <Empty description="暂无队员" />
      )}
    </div>
  )
}

function RecentResults({ teamId, history }) {
  const navigate = useNavigate()
  const matches = history?.matches || []
  const chartPoints = history?.chart?.points || []
  const hasData = matches.length > 0

  if (!history) return null // still loading with main team data

  return (
    <>
      <div className="section-head" style={{ marginTop: 26 }}>
        <h2 className="section-title">近期战绩 · 积分走势</h2>
        <span className="text-2nd" style={{ fontSize: 13 }}>
          {hasData ? `最近 ${matches.length} 场 · 当前积分 ${history.points}` : '暂无比赛记录'}
        </span>
      </div>

      <div className="panel" style={{ padding: 24 }}>
        {/* 折线图 */}
        <div style={{ overflowX: 'auto' }}>
          <PointsLineChart
            points={chartPoints}
            labels={chartPoints.map((_, i) => (i === 0 ? '初始' : `${i}场`))}
          />
        </div>

        {/* 比赛列表 */}
        {hasData ? (
          <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {matches.map((m) => {
              const win = m.result === 'W'
              const pc = m.points_change
              return (
                <div
                  key={m.match_id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '8px 12px', borderRadius: 10,
                    background: 'var(--surface-2)', fontSize: 13,
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ width: 34, fontWeight: 800, fontSize: 12 }}>{win ? <RiseOutlined style={{ color: 'var(--success)' }} /> : <FallOutlined style={{ color: 'var(--primary)' }} />}</span>
                  <span className="text-2nd" style={{ fontSize: 12, minWidth: 96 }}>
                    {String(m.match_date).replace('T', ' ').slice(0, 16)}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    {m.opponent_logo ? (
                      <img src={m.opponent_logo} alt="" style={{ width: 16, height: 16, borderRadius: '50%', marginRight: 4, verticalAlign: 'middle', objectFit: 'contain' }} />
                    ) : null}
                    <span
                      onClick={() => navigate(`/teams/${m.opponent_id}`)}
                      style={{ cursor: 'pointer', fontWeight: 600 }}
                    >
                      vs {m.opponent_name}
                    </span>
                  </span>
                  <span style={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                    {win ? (
                      <span style={{ color: 'var(--success)' }}>胜 {m.team_score}-{m.opponent_score}</span>
                    ) : (
                      <span style={{ color: 'var(--primary)' }}>负 {m.team_score}-{m.opponent_score}</span>
                    )}
                  </span>
                  <span style={{ fontWeight: 700, width: 76, textAlign: 'right' }}>
                    {pc != null && (
                      <span style={{ color: pc >= 0 ? 'var(--success)' : 'var(--primary)' }}>
                        {pc >= 0 ? `+${pc}` : pc}
                      </span>
                    )}
                    {m.points_after != null && (
                      <span className="text-2nd" style={{ fontSize: 11, marginLeft: 4 }}>→{m.points_after}</span>
                    )}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="page-empty" style={{ padding: '24px 0' }}>该队伍还没有已完成的比赛</div>
        )}
      </div>
    </>
  )
}
