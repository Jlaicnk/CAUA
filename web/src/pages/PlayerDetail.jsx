import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Skeleton, Button } from 'antd'
import {
  ArrowLeftOutlined,
  TeamOutlined,
  RightOutlined,
  TrophyOutlined,
  ThunderboltOutlined,
  AimOutlined,
  SwapOutlined,
} from '@ant-design/icons'
import { getPlayer } from '../api/teams'
import { mediaUrl } from '../utils/mediaUrl'
import RadarChart from '../components/RadarChart'
import HonorWall from '../components/HonorWall'
import { DIMENSIONS, PLAYER_STAT_GROUPS } from '../utils/playerStats'

const PLAYER_TIERS = [
  { min: 85, color: '#e8a000', label: '顶级' },
  { min: 75, color: '#e23d7a', label: '优秀' },
  { min: 65, color: '#3f8fd6', label: '主力' },
  { min: 0, color: '#8f8b99', label: '潜力' },
]

const FIVE_SCALE_KEYS = ['weak_foot_usage', 'weak_foot_accuracy', 'condition', 'injury_resistance']

function tierOf(overall) {
  if (overall == null) return PLAYER_TIERS[PLAYER_TIERS.length - 1]
  return PLAYER_TIERS.find((t) => overall >= t.min) || PLAYER_TIERS[PLAYER_TIERS.length - 1]
}

function fillGradient(pct) {
  if (pct >= 70) return 'linear-gradient(90deg, #ff8fae, #f45b8d)'
  if (pct >= 45) return 'linear-gradient(90deg, #9bc4ef, #369ed8)'
  return 'linear-gradient(90deg, #d9d4df, #b8b2c4)'
}

function PlayerHero({ player }) {
  const navigate = useNavigate()
  const tier = tierOf(player.overall)
  const [avatarBroken, setAvatarBroken] = useState(false)
  const showAvatar = player.avatar && !avatarBroken

  return (
    <div className="player-hero">
      {player.number != null && <span className="player-watermark">#{player.number}</span>}
      <div className="player-hero-inner">
        <div className="portrait-zone">
          <div
            className="portrait-ring"
            style={{ background: `linear-gradient(145deg, ${tier.color}, #ffd8e6 52%, ${tier.color})` }}
          >
            <div className="portrait-inner">
              {showAvatar ? (
                <img src={mediaUrl(player.avatar)} alt={player.name} onError={() => setAvatarBroken(true)} />
              ) : (
                <span className="portrait-init">{player.name?.charAt(0) || '?'}</span>
              )}
            </div>
          </div>
          <span className="tier-badge" style={{ background: tier.color }}>
            {tier.label}球员
          </span>
        </div>

        <div className="player-identity">
          <div className="player-kicker" style={{ color: tier.color }}>
            <span className="player-kicker-dot" style={{ background: tier.color }} />
            角色档案
          </div>
          <h1 className="player-name">{player.name}</h1>

          <div className="player-meta">
            {player.number != null && <span className="player-chip player-chip-number">号码 #{player.number}</span>}
            <span className="player-chip player-chip-pos">{player.position}</span>
            {player.team && (
              <button type="button" className="player-chip player-chip-team" onClick={() => navigate(`/teams/${player.team}`)}>
                <TeamOutlined /> {player.team_name} <RightOutlined style={{ fontSize: 10 }} />
              </button>
            )}
          </div>

          {player.bio && <p className="player-bio">{player.bio}</p>}
        </div>

        <div className="ovr-zone">
          <div
            className="ovr-medal"
            style={{ background: `linear-gradient(150deg, ${tier.color}, #ff8fae)`, boxShadow: `0 12px 28px ${tier.color}44` }}
          >
            <span>OVR</span>
            <b>{player.overall ?? '—'}</b>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatRow({ player, item }) {
  const key = item.key
  const raw = player[key] ?? 0
  const isFive = FIVE_SCALE_KEYS.includes(key)
  const max = isFive ? 5 : 100
  const pct = Math.max(0, Math.min(100, (raw / max) * 100))

  return (
    <div className="stat-row">
      <span className="stat-label" title={item.label}>
        {item.label}
      </span>
      <span className="stat-track">
        <span className="stat-fill" style={{ width: `${pct}%`, background: fillGradient(pct) }} />
      </span>
      <b className={`stat-value ${pct >= 70 ? 'high' : pct >= 45 ? 'mid' : ''}`}>
        {raw}
        {isFive ? '/5' : ''}
      </b>
    </div>
  )
}

function AbilitySummary({ player }) {
  const dims = DIMENSIONS.map((d) => ({ ...d, value: player[d.key] ?? 0 }))
  const best = dims.reduce((a, b) => (b.value > a.value ? b : a), dims[0])

  return (
    <div className="panel radar-panel">
      <div className="ability-section-title">
        <span className="ability-section-icon">
          <ThunderboltOutlined />
        </span>
        六维总览
      </div>
      <div className="radar-holder">
        <RadarChart values={dims.reduce((acc, d) => ({ ...acc, [d.key]: d.value }), {})} size={300} />
      </div>
      <div className="hex-list">
        {dims.map((d) => (
          <div className="hex-row" key={d.key}>
            <span className="hex-label">{d.label}</span>
            <span className="hex-track">
              <span
                className="hex-fill"
                style={{ width: `${d.value}%`, background: fillGradient(d.value) }}
              />
            </span>
            <b className={`hex-value ${d.value >= 70 ? 'high' : ''}`}>{d.value}</b>
          </div>
        ))}
      </div>
      <div className="ability-best">
        <TrophyOutlined /> 最强维度：{best.label}
        <b>{best.value}</b>
      </div>
    </div>
  )
}

function AbilityDetail({ player }) {
  return (
    <div className="ability-cards">
      {PLAYER_STAT_GROUPS.map((group) => (
        <div className="ability-card" key={group.name}>
          <div className="ability-card-head">
            <span className="ability-card-icon">
              <AimOutlined />
            </span>
            <span>{group.name}</span>
            <em>{group.items.length} 项</em>
          </div>
          <div className="stat-list">
            {group.items.map((item) => (
              <StatRow key={item.key} player={player} item={item} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function PlayerDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [player, setPlayer] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getPlayer(id)
      .then(({ data }) => setPlayer(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="page detail-page" style={{ maxWidth: 1080 }}>
        <Skeleton active paragraph={{ rows: 10 }} />
      </div>
    )
  }
  if (!player) {
    return <div className="page page-empty">队员不存在或加载失败</div>
  }

  const backTo = player.team ? `/teams/${player.team}` : '/teams'

  return (
    <div className="page detail-page" style={{ maxWidth: 1080 }}>
      <div className="detail-nav">
        <Link to={backTo} className="back-link">
          <ArrowLeftOutlined /> 返回队伍档案
        </Link>
        <div className="pc-nav-actions">
          <span className="detail-nav-note">CAUA · 角色档案</span>
          <Button icon={<SwapOutlined />} onClick={() => navigate(`/players/compare?a=${player.id}`)}>
            加入对比
          </Button>
        </div>
      </div>

      <PlayerHero player={player} />

      {player.honors?.length > 0 && (
        <>
          <div className="section-head">
            <h2 className="section-title">荣誉墙</h2>
            <span className="text-2nd" style={{ fontSize: 13 }}>
              {player.honors.length} 项赛事荣誉
            </span>
          </div>
          <HonorWall honors={player.honors} />
        </>
      )}

      <div className="section-head">
        <h2 className="section-title">能力数值</h2>
        <span className="text-2nd" style={{ fontSize: 13 }}>
          综合 OVR {player.overall} · 六维由细分能力加权合成
        </span>
      </div>

      <div className="ability-layout">
        <AbilitySummary player={player} />
        <AbilityDetail player={player} />
      </div>
    </div>
  )
}
