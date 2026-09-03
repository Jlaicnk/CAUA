import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Skeleton, Empty, Tag, Button, message } from 'antd'
import { ArrowLeftOutlined, PlayCircleFilled, PauseCircleFilled, RightOutlined } from '@ant-design/icons'
import { getTeam } from '../api/teams'
import { TeamLogo } from '../components/MatchCard'

export default function TeamDetail() {
  const { id } = useParams()
  const [team, setTeam] = useState(null)
  const [loading, setLoading] = useState(true)
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    setLoading(true)
    getTeam(id)
      .then(({ data }) => setTeam(data))
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
              <Tag style={{ borderRadius: 6, marginInlineEnd: 0 }}>综合排名 #{team.rank}</Tag>
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
            </div>
          ))}
        </div>
      ) : (
        <Empty description="暂无队员" />
      )}
    </div>
  )
}
