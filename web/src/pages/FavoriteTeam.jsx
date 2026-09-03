import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Input, Skeleton, Empty, App as AntApp } from 'antd'
import { ArrowLeftOutlined, CheckOutlined, SearchOutlined } from '@ant-design/icons'
import { getTeams } from '../api/teams'
import { setFavoriteTeam } from '../api/auth'
import { useAuth } from '../context/AuthContext'
import { TeamLogo } from '../components/MatchCard'

export default function FavoriteTeam() {
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [submittingId, setSubmittingId] = useState(null)
  const navigate = useNavigate()
  const { user, refreshProfile } = useAuth()
  const { message: msg } = AntApp.useApp()

  useEffect(() => {
    getTeams()
      .then(({ data }) => setTeams(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = teams.filter(
    (t) => !search || t.name.toLowerCase().includes(search.toLowerCase())
  )

  const choose = async (team) => {
    setSubmittingId(team.id)
    try {
      await setFavoriteTeam(team.id)
      await refreshProfile()
      msg.success(`已将 ${team.name} 设为主队`)
      navigate('/profile')
    } catch (e) {
      msg.error('设置失败，请重试')
    } finally {
      setSubmittingId(null)
    }
  }

  return (
    <div className="page" style={{ maxWidth: 720 }}>
      <span
        onClick={() => navigate(-1)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-2nd)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
      >
        <ArrowLeftOutlined /> 返回
      </span>
      <div className="section-head" style={{ marginTop: 6 }}>
        <h2 className="section-title">选择你的主队</h2>
        <span className="text-2nd" style={{ fontSize: 13 }}>点击队伍即可设为我的主队</span>
      </div>

      <Input
        size="large"
        prefix={<SearchOutlined style={{ color: 'var(--text-3rd)' }} />}
        placeholder="搜索队伍"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ marginBottom: 18 }}
      />

      {loading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : filtered.length === 0 ? (
        <Empty description="没有匹配的队伍" />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {filtered.map((t) => {
            const isFav = user?.favorite_team?.id === t.id
            return (
              <div
                key={t.id}
                className="rank-row"
                style={{ borderColor: isFav ? 'var(--primary)' : undefined, background: isFav ? 'var(--primary-soft)' : undefined }}
                onClick={() => choose(t)}
              >
                <span className="rank-no">{t.rank}</span>
                <TeamLogo logo={t.logo} name={t.name} size={40} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{t.name}</div>
                  <div className="text-2nd" style={{ fontSize: 12 }}>综合排名 #{t.rank}</div>
                </div>
                {isFav && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: 'var(--primary-deep)' }}>
                    <CheckOutlined /> 当前主队
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
