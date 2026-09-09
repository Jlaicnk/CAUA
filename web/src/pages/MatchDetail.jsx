import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Skeleton, Tag, Empty, Button } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { getMatch, getMatchHistory } from '../api/tournaments'
import { TeamLogo } from '../components/MatchCard'
import { formatDate } from '../utils/format'
import StatusTag from '../components/StatusTag'

export default function MatchDetail() {
  const { id } = useParams()
  const [match, setMatch] = useState(null)
  const [history, setHistory] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    setLoading(true)
    Promise.all([getMatch(id), getMatchHistory(id)])
      .then(([m, h]) => {
        setMatch(m.data)
        setHistory(h.data)
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
  if (!match) {
    return (
      <div className="page">
        <div className="page-empty">比赛不存在或加载失败</div>
      </div>
    )
  }

  const home = match.home_team
  const away = match.away_team
  const hasScore = match.home_score != null && match.away_score != null
  const h2h = history?.head_to_head || []
  const homePc = history?.home_points_change
  const awayPc = history?.away_points_change

  return (
    <div className="page" style={{ maxWidth: 820 }}>
      <span
        onClick={() => navigate(-1)}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-2nd)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
      >
        <ArrowLeftOutlined /> 返回
      </span>

      {/* 头部大卡 */}
      <div className="panel" style={{ marginTop: 14, padding: 0, overflow: 'hidden', textAlign: 'center' }}>
        <div style={{ height: 90, background: 'linear-gradient(180deg, var(--primary-soft), #ffffff)' }} />
        <div style={{ padding: '0 28px 28px', marginTop: -30 }}>
          <div className="text-2nd" style={{ fontSize: 13 }}>
            {match.tournament_name}
            {match.round ? ` · 第 ${match.round} 轮` : ''}
            <span style={{ margin: '0 6px' }}>·</span>
            {formatDate(match.match_date)}
          </div>
          <div style={{ marginTop: 8 }}>
            <StatusTag status={match.status} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 24 }}>
            {/* home */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <TeamLogo logo={home.logo} name={home.name} size={72} />
              <div style={{ fontWeight: 800, fontSize: 17 }}>{home.name}</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <Tag style={{ borderRadius: 6, marginInlineEnd: 0 }}>积分 {home.points ?? 1000}</Tag>
                {homePc != null && (
                  <span style={{ fontWeight: 800, color: homePc >= 0 ? 'var(--success)' : 'var(--primary)' }}>
                    {homePc >= 0 ? `+${homePc}` : homePc}
                  </span>
                )}
              </div>
            </div>

            {/* score */}
            <div style={{ flexShrink: 0, minWidth: 120 }}>
              {hasScore ? (
                <div style={{ fontSize: 44, fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: 2 }}>
                  {match.home_score}<span style={{ color: 'var(--text-3rd)', margin: '0 6px', fontWeight: 700 }}>:</span>{match.away_score}
                </div>
              ) : (
                <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--text-3rd)' }}>VS</div>
              )}
              <div className="text-2nd" style={{ fontSize: 12, marginTop: 4 }}>{hasScore ? '完场' : '待开始'}</div>
            </div>

            {/* away */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <TeamLogo logo={away.logo} name={away.name} size={72} />
              <div style={{ fontWeight: 800, fontSize: 17 }}>{away.name}</div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <Tag style={{ borderRadius: 6, marginInlineEnd: 0 }}>积分 {away.points ?? 1000}</Tag>
                {awayPc != null && (
                  <span style={{ fontWeight: 800, color: awayPc >= 0 ? 'var(--success)' : 'var(--primary)' }}>
                    {awayPc >= 0 ? `+${awayPc}` : awayPc}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 交手记录 */}
      <div className="section-head" style={{ marginTop: 26 }}>
        <h2 className="section-title">两队交手记录</h2>
        <span className="text-2nd" style={{ fontSize: 13 }}>
          {home.name} vs {away.name}
        </span>
      </div>

      {h2h.length === 0 ? (
        <Empty description="暂无交手记录" style={{ padding: '24px 0' }} />
      ) : (
        <div className="panel" style={{ padding: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {h2h.map((m) => {
              const hs = m.home_score
              const as = m.away_score
              const homeWin = hs != null && as != null && hs > as
              const awayWin = hs != null && as != null && as > hs
              return (
                <div
                  key={m.match_id}
                  onClick={() => navigate(`/matches/${m.match_id}`)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                    borderRadius: 10, cursor: 'pointer', background: 'var(--surface-2)',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(244,91,141,0.08)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface-2)' }}
                >
                  <div className="text-2nd" style={{ fontSize: 12, width: 92, flexShrink: 0 }}>
                    {formatDate(m.match_date)}
                  </div>
                  <TeamLogo logo={m.home_team.logo} name={m.home_team.name} size={22} />
                  <span style={{ flex: 1, fontWeight: homeWin ? 800 : 500, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.home_team.name}
                  </span>
                  <span style={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums', minWidth: 40, textAlign: 'center' }}>
                    {hs} - {as}
                  </span>
                  <span style={{ flex: 1, fontWeight: awayWin ? 800 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {m.away_team.name}
                  </span>
                  <TeamLogo logo={m.away_team.logo} name={m.away_team.name} size={22} />
                  <span className="text-2nd" style={{ fontSize: 11, width: 40, textAlign: 'right' }}>
                    {m.tournament_name}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
