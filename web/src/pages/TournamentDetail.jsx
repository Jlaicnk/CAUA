import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Skeleton, Tag, List } from 'antd'
import { ArrowLeftOutlined, CrownFilled, TrophyOutlined, CalendarOutlined, InfoCircleOutlined } from '@ant-design/icons'
import { useNavigate, Link } from 'react-router-dom'
import { getTournament, getMatches } from '../api/tournaments'
import { MatchCard } from '../components/MatchCard'

const RANK_COLOR = { 1: '#b8860b', 2: '#9aa7b3', 3: '#cd7f4c' }

function TeamRow({ td, idx }) {
  const navigate = useNavigate()
  const rank = td.rank ?? td.global_rank ?? idx + 1
  return (
    <div className="rank-row" onClick={() => navigate(`/teams/${td.team.id}`)}>
      <span className="rank-no" style={{ color: RANK_COLOR[rank] || 'var(--text-2nd)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        {rank === 1 && <CrownFilled style={{ color: '#f5b301', fontSize: 16 }} />}
        {rank}
      </span>
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          overflow: 'hidden',
          background: 'var(--surface-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid var(--border)',
          flexShrink: 0,
        }}
      >
        {td.team.logo ? (
          <img src={td.team.logo} alt={td.team.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        ) : (
          <span style={{ fontWeight: 700, color: 'var(--primary-deep)' }}>{td.team.name.charAt(0)}</span>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <span style={{ fontWeight: 700 }}>{td.team.name}</span>
        {td.global_rank && (
          <span className="text-2nd" style={{ fontWeight: 400, marginLeft: 8, fontSize: 13 }}>
            总榜 #{td.global_rank}
          </span>
        )}
      </div>
    </div>
  )
}

export default function TournamentDetail() {
  const { id } = useParams()
  const [t, setT] = useState(null)
  const [matches, setMatches] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    setLoading(true)
    Promise.all([getTournament(id), getMatches(Number(id))])
      .then(([tr, mr]) => {
        setT(tr.data)
        setMatches(mr.data)
      })
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

  if (!t) {
    return (
      <div className="page">
        <div className="page-empty">赛事不存在或加载失败</div>
      </div>
    )
  }

  const teams = t.teams || []

  return (
    <div className="page" style={{ maxWidth: 860 }}>
      <Link to="/tournaments" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-2nd)', fontSize: 13, fontWeight: 600 }}>
        <ArrowLeftOutlined /> 返回赛事列表
      </Link>

      <div className="panel" style={{ marginTop: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 16,
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {t.icon ? (
              <img src={t.icon} alt={t.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <TrophyOutlined style={{ fontSize: 30, color: 'var(--primary)' }} />
            )}
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 24, fontWeight: 800 }}>{t.name}</div>
            <div className="text-2nd" style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              <CalendarOutlined /> {t.start_date} ~ {t.end_date}
            </div>
          </div>
        </div>

        {t.description && (
          <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontWeight: 800, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <InfoCircleOutlined style={{ color: 'var(--primary)' }} /> 赛事简介
            </div>
            <div className="text-2nd" style={{ lineHeight: 1.8 }}>{t.description}</div>
          </div>
        )}
        {t.rules && (
          <div style={{ marginTop: 16, padding: '14px 16px', background: 'var(--surface-2)', borderRadius: 12 }}>
            <div style={{ fontWeight: 800, marginBottom: 6, fontSize: 14 }}>赛事规则</div>
            <div style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.8 }}>{t.rules}</div>
          </div>
        )}
      </div>

      <div className="section-head">
        <h2 className="section-title">参赛队伍</h2>
        <span className="text-2nd" style={{ fontSize: 13 }}>{teams.length} 支</span>
      </div>
      {teams.length === 0 ? (
        <div className="page-empty">暂无参赛队伍</div>
      ) : (
        <div>
          {teams.map((td, idx) => (
            <TeamRow key={td.id} td={td} idx={idx} />
          ))}
        </div>
      )}

      {matches && matches.length > 0 && (
        <>
          <div className="section-head">
            <h2 className="section-title">相关赛程</h2>
            <span className="text-2nd" style={{ fontSize: 13 }}>{matches.length} 场</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
            {matches.map((m) => (
              <MatchCard key={m.id} match={m} showTournament={false} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
