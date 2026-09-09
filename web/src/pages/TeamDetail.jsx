import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Skeleton, Empty } from 'antd'
import {
  ArrowLeftOutlined,
  PlayCircleFilled,
  PauseCircleFilled,
  TrophyOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { getTeam, getTeamHistory } from '../api/teams'
import { TeamLogo } from '../components/MatchCard'
import PointsLineChart from '../components/PointsLineChart'
import HonorWall from '../components/HonorWall'
import { mediaUrl } from '../utils/mediaUrl'

const MEDAL_STYLE = {
  1: { label: '第一', cls: 'gold' },
  2: { label: '第二', cls: 'silver' },
  3: { label: '第三', cls: 'bronze' },
}

function buildRecord(matches) {
  return matches.reduce(
    (acc, m) => {
      if (m.result === 'W') acc.wins += 1
      else if (m.result === 'L') acc.losses += 1
      return acc
    },
    { wins: 0, losses: 0 }
  )
}

function formatShortDate(datetime) {
  if (!datetime) return ''
  return String(datetime).replace('T', ' ').slice(0, 16)
}

function TeamHero({ team, history, playing, onToggleSong }) {
  const matches = history?.matches || []
  const record = buildRecord(matches)
  const hasData = matches.length > 0
  const rank = team.leaderboard_rank ?? team.rank
  const medal = MEDAL_STYLE[rank]

  return (
    <div className="team-hero">
      <div className="team-hero-inner">
        <div className="team-hero-left">
          <div className="team-crest-row">
            <div className="team-crest-frame">
              <TeamLogo logo={team.logo} name={team.name} size={100} />
            </div>
            <div className="team-title-block">
              <div className="team-kicker">
                <TrophyOutlined />
                队伍档案
                {medal && <span className={`team-medal ${medal.cls}`}>{medal.label}</span>}
              </div>
              <h1 className="team-name">{team.name}</h1>
              <div className="team-chips">
                <span className="hero-chip">
                  <TeamOutlined /> {team.players?.length || 0} 名队员
                </span>
                {team.song && (
                  <button
                    type="button"
                    className={`hero-chip hero-chip-action ${playing ? 'active' : ''}`}
                    onClick={onToggleSong}
                  >
                    {playing ? <PauseCircleFilled /> : <PlayCircleFilled />}
                    {playing ? '暂停队歌' : '播放队歌'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {team.description && <p className="team-desc">{team.description}</p>}
        </div>

        <div className="team-stats">
          <div className="team-stat">
            <span className="team-stat-label">综合排名</span>
            <span className="team-stat-value">
              #{rank}
              {medal && <em>{medal.label}</em>}
            </span>
          </div>
          <div className="team-stat">
            <span className="team-stat-label">当前积分</span>
            <span className="team-stat-value">
              {team.points ?? 1000}
              <em>PTS</em>
            </span>
          </div>
          <div className="team-stat">
            <span className="team-stat-label">近期战绩</span>
            <span className="team-stat-value">
              {hasData ? `${record.wins} 胜 ${record.losses} 负` : '—'}
              <em>{hasData ? `最近 ${matches.length} 场` : '暂无比赛'}</em>
            </span>
          </div>
          <div className="team-stat">
            <span className="team-stat-label">胜率</span>
            <span className="team-stat-value">
              {hasData ? `${Math.round((record.wins / matches.length) * 100)}%` : '—'}
              <em>{hasData ? '以最近记录为准' : '等待首场比赛'}</em>
            </span>
          </div>
        </div>
      </div>

      {hasData && (
        <div className="team-form-line">
          <span className="team-form-label">近期走势</span>
          {matches.slice(-10).map((m, i) => (
            <span
              key={`${m.match_id}-${i}`}
              className={`team-form-dot ${m.result === 'W' ? 'win' : 'loss'}`}
              title={`${m.result === 'W' ? '胜' : '负'} ${m.opponent_name}`}
            />
          ))}
          <span className="team-form-text">
            最近 {matches.length} 场：{record.wins} 胜 {record.losses} 负
          </span>
        </div>
      )}
    </div>
  )
}

function RecentResults({ history }) {
  const navigate = useNavigate()
  const matches = history?.matches || []
  const chartPoints = history?.chart?.points || []
  const hasData = matches.length > 0
  const record = buildRecord(matches)

  return (
    <>
      <div className="section-head">
        <h2 className="section-title">近期战绩 · 积分走势</h2>
        <span className="text-2nd" style={{ fontSize: 13 }}>
          {hasData ? `最近 ${matches.length} 场 · 当前积分 ${history?.points ?? 1000}` : '暂无比赛记录'}
        </span>
      </div>

      <div className="trend-panel">
        <div className="trend-layout">
          <div className="trend-chart">
            <div className="trend-chart-title">积分曲线</div>
            <div className="trend-chart-body">
              <PointsLineChart
                points={chartPoints}
                labels={chartPoints.map((_, i) => (i === 0 ? '初始' : `${i} 场后`))}
              />
            </div>
          </div>
          <div className="trend-summary">
            <div className="trend-summary-title">数据速览</div>
            <div className="trend-summary-grid">
              <div className="trend-summary-item">
                <b className={record.wins >= record.losses ? 'up' : 'down'}>{record.wins}</b>
                <span>胜场</span>
              </div>
              <div className="trend-summary-item">
                <b className={record.wins < record.losses ? 'down' : 'up'}>{record.losses}</b>
                <span>负场</span>
              </div>
              <div className="trend-summary-item">
                <b className="up">{Math.round((record.wins / Math.max(matches.length, 1)) * 100)}%</b>
                <span>胜率</span>
              </div>
              <div className="trend-summary-item">
                <b>{history?.points ?? 1000}</b>
                <span>现积分</span>
              </div>
            </div>
          </div>
        </div>

        <div className="result-list-title">
          比赛明细
          <span>点击队伍名可查看队伍档案</span>
        </div>
        {hasData ? (
          <div className="result-list">
            {matches.map((m) => {
              const win = m.result === 'W'
              const pc = m.points_change
              return (
                <div className="result-row" key={m.match_id}>
                  <span className={`result-mark ${win ? 'win' : 'loss'}`}>{win ? '胜' : '负'}</span>
                  <span className="result-date">{formatShortDate(m.match_date)}</span>
                  {m.tournament_name && (
                    <span className="result-tournament" title={m.tournament_name}>
                      {m.tournament_name}
                    </span>
                  )}
                  <button
                    type="button"
                    className="result-opp"
                    onClick={() => navigate(`/teams/${m.opponent_id}`)}
                  >
                    <span className="result-vs">vs</span>
                    {m.opponent_logo ? (
                      <img src={mediaUrl(m.opponent_logo)} alt={m.opponent_name} />
                    ) : (
                      <span className="result-opp-init">{m.opponent_name?.charAt(0) || '?'}</span>
                    )}
                    <b>{m.opponent_name}</b>
                  </button>
                  <span className={`result-score ${win ? 'win' : 'loss'}`}>
                    {m.team_score} : {m.opponent_score}
                  </span>
                  <span className="result-pts">
                    {pc != null && <b className={pc >= 0 ? 'up' : 'down'}>{pc >= 0 ? `+${pc}` : pc}</b>}
                    {m.points_after != null && <em>→ {m.points_after}</em>}
                  </span>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="page-empty">该队伍还没有已完成的比赛</div>
        )}
      </div>
    </>
  )
}

function Squad({ team }) {
  const navigate = useNavigate()
  return (
    <>
      <div className="section-head">
        <h2 className="section-title">队员阵容</h2>
        <span className="text-2nd" style={{ fontSize: 13 }}>
          {team.players?.length || 0} 名队员 · 点击查看角色档案
        </span>
      </div>
      {team.players?.length ? (
        <div className="squad-grid">
          {team.players.map((p) => (
            <div key={p.id} className="squad-card" onClick={() => navigate(`/players/${p.id}`)}>
              <SquadAvatar player={p} />
              <div className="squad-player-name">{p.name}</div>
              <div className="squad-player-pos">{p.position}</div>
              {p.overall != null && (
                <div className="squad-ovr">
                  <span>OVR</span>
                  <b>{p.overall}</b>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <Empty description="暂无队员" style={{ padding: '30px 0' }} />
      )}
    </>
  )
}

function SquadAvatar({ player }) {
  const [broken, setBroken] = useState(false)
  const showInit = !player.avatar || broken
  return (
    <div className="squad-avatar-wrap">
      <div className="squad-avatar">
        {!showInit ? (
          <img src={mediaUrl(player.avatar)} alt={player.name} loading="lazy" onError={() => setBroken(true)} />
        ) : (
          <span className="squad-avatar-init">{player.name?.charAt(0) || '?'}</span>
        )}
      </div>
      <span className="squad-no">#{player.number}</span>
    </div>
  )
}

export default function TeamDetail() {
  const { id } = useParams()
  const [team, setTeam] = useState(null)
  const [history, setHistory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef(null)

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

  return (
    <div className="page detail-page" style={{ maxWidth: 1080 }}>
      <div className="detail-nav">
        <Link to="/teams" className="back-link">
          <ArrowLeftOutlined /> 队伍排行榜
        </Link>
        <span className="detail-nav-note">CAUA · 队伍档案</span>
      </div>

      {loading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : !team ? (
        <div className="page-empty">队伍不存在或加载失败</div>
      ) : (
        <>
          {team.song && <audio ref={audioRef} src={mediaUrl(team.song)} preload="metadata" />}
          <TeamHero team={team} history={history} playing={playing} onToggleSong={togglePlay} />
          {team.honors?.length > 0 && (
            <>
              <div className="section-head">
                <h2 className="section-title">荣誉墙</h2>
                <span className="text-2nd" style={{ fontSize: 13 }}>
                  {team.honors.length} 项赛事荣誉
                </span>
              </div>
              <HonorWall honors={team.honors} />
            </>
          )}
          {history && <RecentResults history={history} />}
          <Squad team={team} />
        </>
      )}
    </div>
  )
}
