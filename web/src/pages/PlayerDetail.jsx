import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Skeleton, Tag } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { getPlayer } from '../api/teams'

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
        <Skeleton active paragraph={{ rows: 8 }} />
      </div>
    )
  }
  if (!player) {
    return <div className="page page-empty">队员不存在或加载失败</div>
  }

  return (
    <div className="page" style={{ maxWidth: 760 }}>
      <span
        onClick={() => navigate(-1)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-2nd)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
      >
        <ArrowLeftOutlined /> 返回
      </span>

      <div className="panel" style={{ marginTop: 14, padding: 0, overflow: 'hidden' }}>
        <div style={{ height: 90, background: 'linear-gradient(180deg, #fff0f5, #ffffff)' }} />
        <div style={{ padding: '0 32px 32px', textAlign: 'center', marginTop: -56 }}>
          <div
            style={{
              width: 112,
              height: 112,
              margin: '0 auto',
              borderRadius: '50%',
              background: '#fff',
              border: '4px solid #fff',
              boxShadow: '0 4px 16px rgba(20,22,34,0.1)',
              overflow: 'hidden',
            }}
          >
            {player.avatar ? (
              <img src={player.avatar} alt={player.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface-2)', fontSize: 30, fontWeight: 800, color: 'var(--primary-deep)' }}>
                {player.name?.charAt(0)}
              </div>
            )}
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

          <div style={{ margin: '18px 0 10px', display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Tag style={{ borderRadius: 6, marginInlineEnd: 0 }}>号码 {player.number}</Tag>
            <Tag color="magenta" style={{ borderRadius: 6, marginInlineEnd: 0 }}>位置 {player.position}</Tag>
          </div>

          <div
            style={{
              marginTop: 18,
              textAlign: 'left',
              background: 'var(--surface-2)',
              borderRadius: 14,
              padding: 18,
              fontSize: 14,
              lineHeight: 1.9,
              color: 'var(--text)',
            }}
          >
            {player.bio || '暂无简介'}
          </div>
        </div>
      </div>
    </div>
  )
}
