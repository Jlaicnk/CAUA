import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Skeleton, Tag } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { getPlayer } from '../api/teams'
import { mediaUrl } from '../utils/mediaUrl'
import RadarChart from '../components/RadarChart'
import { PLAYER_STAT_GROUPS } from '../utils/playerStats'

export default function PlayerDetail() {
  const { id } = useParams()
  const [player, setPlayer] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    setLoading(true)
    getPlayer(id)
      .then(({ data }) => setPlayer(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="page">
        <Skeleton active paragraph={{ rows: 10 }} />
      </div>
    )
  }
  if (!player) {
    return <div className="page page-empty">队员不存在或加载失败</div>
  }

  const radarValues = {
    stat_shooting: player.stat_shooting ?? 0,
    stat_passing: player.stat_passing ?? 0,
    stat_dribble: player.stat_dribble ?? 0,
    stat_speed: player.stat_speed ?? 0,
    stat_power: player.stat_power ?? 0,
    stat_defense: player.stat_defense ?? 0,
  }

  return (
    <div className="page" style={{ maxWidth: 820 }}>
      <span
        onClick={() => navigate(-1)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-2nd)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
      >
        <ArrowLeftOutlined /> 返回
      </span>

      <div className="panel" style={{ marginTop: 14, padding: 0, overflow: 'hidden' }}>
        <div style={{ height: 90, background: 'linear-gradient(180deg, #fff0f5, #ffffff)' }} />
        <div style={{ padding: '0 32px 32px', textAlign: 'center', marginTop: -56 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
            <div
              style={{
                width: 112,
                height: 112,
                borderRadius: '50%',
                background: '#fff',
                border: '4px solid #fff',
                boxShadow: '0 4px 16px rgba(20,22,34,0.1)',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              {player.avatar ? (
                <img src={mediaUrl(player.avatar)} alt={player.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', fontSize: 30, fontWeight: 800, color: 'var(--primary-deep)' }}>
                  {player.name?.charAt(0)}
                </div>
              )}
            </div>
            {/* OVR 徽标 */}
            <div
              style={{
                width: 84,
                height: 84,
                borderRadius: 18,
                background: 'linear-gradient(135deg, var(--primary), #ff9eb8)',
                color: '#fff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 6px 18px rgba(244,91,141,0.35)',
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.9 }}>综合评分</span>
              <span style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.1 }}>{player.overall ?? 0}</span>
            </div>
          </div>

          <div style={{ fontSize: 26, fontWeight: 800, marginTop: 16 }}>{player.name}</div>
          {player.team_name && (
            <span
              onClick={() => navigate(`/teams/${player.team}`)}
              style={{ display: 'inline-block', marginTop: 6, color: 'var(--text-2nd)', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}
            >
              {player.team_name} →
            </span>
          )}

          <div style={{ margin: '14px 0 10px', display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Tag style={{ borderRadius: 6, marginInlineEnd: 0 }}>号码 {player.number}</Tag>
            <Tag color="magenta" style={{ borderRadius: 6, marginInlineEnd: 0 }}>位置 {player.position}</Tag>
          </div>

          {player.bio && (
            <div
              style={{
                marginTop: 8,
                textAlign: 'left',
                background: 'var(--surface-2)',
                borderRadius: 14,
                padding: 16,
                fontSize: 14,
                lineHeight: 1.8,
                color: 'var(--text)',
              }}
            >
              {player.bio}
            </div>
          )}
        </div>
      </div>

      {/* 能力区：雷达图 + 小项明细 */}
      <div className="section-head" style={{ marginTop: 24 }}>
        <h2 className="section-title">能力数值</h2>
      </div>
      <div className="panel" style={{ padding: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 28, alignItems: 'start' }}>
          <div style={{ textAlign: 'center' }}>
            <RadarChart values={radarValues} size={300} />
            <div className="text-2nd" style={{ fontSize: 12, marginTop: 4 }}>六维能力 · 六边形</div>
          </div>
          <div>
            {PLAYER_STAT_GROUPS.map((group) => (
              <div key={group.name} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--primary-deep)', marginBottom: 6 }}>{group.name}</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '4px 12px' }}>
                  {group.items.map((it) => (
                    <div key={it.key} style={{ display: 'flex', alignItems: 'center', fontSize: 13, padding: '3px 0' }}>
                      <span className="text-2nd" style={{ flex: 1 }}>{it.label}</span>
                      <span
                        style={{
                          fontWeight: 700,
                          color: group.name.includes('0-5')
                            ? 'var(--secondary)'
                            : player[it.key] >= 80 ? 'var(--primary-deep)' : player[it.key] >= 60 ? 'var(--text)' : 'var(--text-2nd)',
                        }}
                      >
                        {player[it.key] ?? 0}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
