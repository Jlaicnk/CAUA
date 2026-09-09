import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Skeleton, Tag, Button, Modal, App as AntApp } from 'antd'
import { ArrowLeftOutlined, TrophyOutlined, CalendarOutlined, InfoCircleOutlined, ThunderboltOutlined, RiseOutlined, FallOutlined, TeamOutlined } from '@ant-design/icons'
import { getTournament, getMatches, getStandings, getTournamentBracket } from '../api/tournaments'
import BracketView from '../components/BracketView'
import KnockoutBracket from '../components/KnockoutBracket'
import LeagueSchedule from '../components/LeagueSchedule'
import LeagueDayPanel from '../components/LeagueDayPanel'
import { roundDate, formatLabel } from '../utils/format'
import { mediaUrl } from '../utils/mediaUrl'
import SimulatorModal from '../components/SimulatorModal'

const STAGE_META = {
  not_started: { text: '未开始', cls: 'tag-pill tag-pill-scheduled' },
  ongoing: { text: '进行中', cls: 'tag-pill tag-pill-ongoing' },
  finished: { text: '已结束', cls: 'tag-pill tag-pill-finished' },
}

const STATUS_COLOR = { advanced: 'var(--success)', alive: 'var(--secondary)', eliminated: 'var(--text-3rd)', finished: 'var(--text-2nd)' }

export default function TournamentDetail() {
  const { id } = useParams()
  const [t, setT] = useState(null)
  const [matches, setMatches] = useState([])
  const [standings, setStandings] = useState([])
  const [bracket, setBracket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showSim, setShowSim] = useState(false)
  const navigate = useNavigate()

  const load = () => {
    setLoading(true)
    Promise.all([getTournament(id), getMatches(Number(id)), getStandings(id), getTournamentBracket(id)])
      .then(([tr, mr, sr, br]) => {
        setT(tr.data)
        setMatches(mr.data)
        setStandings(sr.data?.standings || [])
        setBracket(br.data)
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false))
  }

  useEffect(load, [id])

  const rounds = useMemo(() => {
    const byRound = {}
    for (const m of matches) {
      if (m.knockout) continue
      ;(byRound[m.round] = byRound[m.round] || []).push(m)
    }
    return Object.keys(byRound)
      .map((r) => Number(r))
      .sort((a, b) => a - b)
      .map((r) => ({
        round: r,
        dateStr: t ? roundDate(t.start_date, r, t.round_interval_days) : '',
        matches: byRound[r].sort((a, b) => a.id - b.id),
      }))
  }, [matches, t])

  const groups = useMemo(() => {
    if (t?.stage_status === 'finished') {
      return { adv: [], elim: [], alive: [], finished: standings }
    }
    const adv = standings.filter((s) => s.status === 'advanced')
    const elim = standings.filter((s) => s.status === 'eliminated')
    const alive = standings.filter((s) => s.status === 'alive')
    return { adv, elim, alive, finished: [] }
  }, [standings, t])

  if (loading) {
    return (
      <div className="page">
        <Skeleton active paragraph={{ rows: 10 }} />
      </div>
    )
  }
  if (!t) {
    return <div className="page"><div className="page-empty">赛事不存在或加载失败</div></div>
  }

  const stMeta = STAGE_META[t.stage_status] || STAGE_META.not_started
  const interval = t.round_interval_days || 3
  const isLeague = t.format === 'league'
  const hasKnockout = t.knockout_after_swiss
  const bracketRounds = bracket?.rounds || []

  return (
    <div className="page" style={{ maxWidth: 1080 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <Link to="/tournaments" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: 'var(--text-2nd)', fontSize: 13, fontWeight: 600 }}>
          <ArrowLeftOutlined /> 返回赛事列表
        </Link>
        {!isLeague && (
          <Button icon={<ThunderboltOutlined />} onClick={() => setShowSim(true)}>
            本地模拟推演
          </Button>
        )}
      </div>

      {/* header */}
      <div className="panel" style={{ marginTop: 14, padding: 0, overflow: 'hidden' }}>
        <div style={{ height: 90, background: 'linear-gradient(180deg, var(--primary-soft), #ffffff)' }} />
        <div style={{ padding: '0 28px 22px', marginTop: -34 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18, flexWrap: 'wrap' }}>
            <div
              style={{
                width: 76, height: 76, borderRadius: 18, background: '#fff', border: '1px solid var(--border)',
                boxShadow: '0 4px 14px rgba(20,22,34,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                overflow: 'hidden', flexShrink: 0,
              }}
            >
              {t.icon ? (
                <img src={mediaUrl(t.icon)} alt={t.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <TrophyOutlined style={{ fontSize: 32, color: 'var(--primary)' }} />
              )}
            </div>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 24, fontWeight: 800 }}>{t.name}</span>
                <Tag color="magenta" style={{ borderRadius: 6, marginInlineEnd: 0 }}>
                  {hasKnockout ? '瑞士轮 + 淘汰赛' : formatLabel(t.format)}
                </Tag>
                {t.phase && t.phase !== 'swiss' && t.stage_status !== 'finished' && (
                  <Tag color="cyan" style={{ borderRadius: 6, marginInlineEnd: 0 }}>
                    {t.phase === 'knockout' ? '淘汰赛阶段' : ''}
                  </Tag>
                )}
                <span className={stMeta.cls} style={{ gap: 6 }}>
                  {t.stage_status === 'ongoing' && <span className="dot-live" />}
                  {stMeta.text}
                </span>
              </div>
              <div className="text-2nd" style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><CalendarOutlined /> {t.start_date} ~ {t.end_date}</span>
                {!isLeague && t.stage_status !== 'finished' && (
                  <>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <RiseOutlined style={{ color: 'var(--success)' }} /> 晋级 {t.advanced_count || 0}/16
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <FallOutlined style={{ color: 'var(--text-3rd)' }} /> 出局 {t.eliminated_count || 0}
                    </span>
                  </>
                )}
                {t.stage_status !== 'not_started' && t.stage_status !== 'finished' && (
                  <span>当前第 {t.current_round} 轮</span>
                )}
              </div>
            </div>
          </div>

          {t.description && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
              <div style={{ fontWeight: 800, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6, fontSize: 14 }}>
                <InfoCircleOutlined style={{ color: 'var(--primary)' }} /> 赛事规则
              </div>
              <div className="text-2nd" style={{ lineHeight: 1.8, fontSize: 13 }}>{t.rules}</div>
            </div>
          )}
        </div>
      </div>

      {/* bracket area */}
      <div className="section-head" style={{ marginTop: 26 }}>
        <h2 className="section-title">{isLeague ? '单循环赛程' : '晋级对阵图'}</h2>
        {t.stage_status !== 'not_started' && rounds.length > 0 && (
          <span className="text-2nd" style={{ fontSize: 13 }}>
            {isLeague
              ? '每队与其他 7 队各赛一场 · 每轮 4 场 · 共 7 轮'
              : `每 ${interval} 天一轮 · 共已生成 ${rounds.length} 轮`}
          </span>
        )}
      </div>
      {t.stage_status === 'not_started' ? (
        <div className="page-empty">赛事尚未开始。管理员可在后台生成第 1 轮对阵。</div>
      ) : isLeague ? (
        <LeagueSchedule rounds={rounds} />
      ) : (
        <BracketView rounds={rounds} />
      )}

      {isLeague && t.stage_status !== 'not_started' ? (
        <div style={{ marginTop: 26 }}>
          <LeagueDayPanel tournament={t} />
        </div>
      ) : isLeague ? null : (
        <>
          {/* knockout bracket */}
          {hasKnockout && (
            <>
              <div className="section-head" style={{ marginTop: 26 }}>
                <h2 className="section-title">淘汰赛对阵图</h2>
                <span className="text-2nd" style={{ fontSize: 13 }}>
                  {bracketRounds.length ? `${bracketRounds.length} 轮` : '等待瑞士轮结束'}
                </span>
              </div>
              <KnockoutBracket rounds={bracketRounds} phase={t.phase} />
            </>
          )}

          {/* standings lists */}
          <div className="section-head" style={{ marginTop: 26 }}>
            <h2 className="section-title">{t.stage_status === 'finished' ? '最终排行榜' : '队伍状态'}</h2>
            <span className="text-2nd" style={{ fontSize: 13 }}>点队伍查看详情</span>
          </div>
          {t.stage_status === 'finished' ? (
            <FinalRankings rows={groups.finished} onClick={(teamId) => navigate(`/teams/${teamId}`)} />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
              <StatusList title={`🏆 已晋级 (${groups.adv.length})`} rows={groups.adv} tone="success" onClick={(teamId) => navigate(`/teams/${teamId}`)} />
              <StatusList title={`⚡ 存活中 (${groups.alive.length})`} rows={groups.alive} tone="info" onClick={(teamId) => navigate(`/teams/${teamId}`)} />
              <StatusList title={`💀 已出局 (${groups.elim.length})`} rows={groups.elim} tone="muted" onClick={(teamId) => navigate(`/teams/${teamId}`)} />
            </div>
          )}
        </>
      )}

      <SimulatorModal
        open={showSim}
        tournament={t}
        onClose={() => setShowSim(false)}
      />
    </div>
  )
}

const TONE_STYLE = {
  success: { bg: 'var(--success-soft)', color: '#3d8b54', label: '晋级' },
  info: { bg: 'var(--scheduled-soft)', color: '#2374ad', label: '存活' },
  muted: { bg: 'var(--surface-2)', color: 'var(--text-2nd)', label: '出局' },
}

function StatusList({ title, rows, tone, onClick }) {
  const toneStyle = TONE_STYLE[tone]
  return (
    <div className="panel" style={{ padding: 0, overflow: 'hidden', alignSelf: 'start' }}>
      <div style={{ padding: '12px 16px', fontWeight: 800, fontSize: 14, borderBottom: '1px solid var(--border)', background: toneStyle.bg }}>
        {title}
      </div>
      <div style={{ maxHeight: 420, overflowY: 'auto' }}>
        {rows.length === 0 ? (
          <div className="text-2nd" style={{ padding: 20, textAlign: 'center', fontSize: 13 }}>暂无</div>
        ) : (
          rows.map((row) => (
            <div
              key={row.team.id}
              onClick={() => onClick(row.team.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px',
                borderBottom: '1px solid rgba(236,238,242,0.5)', cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-2)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              <div
                style={{
                  width: 26, height: 26, borderRadius: '50%', overflow: 'hidden', background: 'var(--surface-2)',
                  border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}
              >
                {row.team.logo ? (
                  <img src={mediaUrl(row.team.logo)} alt={row.team.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                ) : (
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary-deep)' }}>{row.team.name?.charAt(0)}</span>
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.team.name}</div>
                <div className="text-2nd" style={{ fontSize: 11 }}>{row.played} 场</div>
              </div>
              <span style={{ fontWeight: 800, fontSize: 14, color: STATUS_COLOR[row.status] }}>
                {row.wins}<span className="text-2nd" style={{ fontWeight: 500 }}>-{row.losses}</span>
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

const MEDAL_COLOR = { 1: '#e8a000', 2: '#9aa7b3', 3: '#cd7f4c', 4: '#8a97a3' }
const MEDAL_LABEL = { 1: '冠军', 2: '亚军', 3: '季军', 4: '殿军' }

function FinalRankings({ rows, onClick }) {
  if (!rows || rows.length === 0) {
    return <div className="page-empty">暂无排名数据</div>
  }
  const sorted = [...rows].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
  return (
    <div className="panel" style={{ padding: 8 }}>
      {sorted.map((row) => {
        const r = row.rank
        const medal = r <= 3
        return (
          <div
            key={row.team.id}
            onClick={() => onClick(row.team.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, padding: '9px 14px',
              borderRadius: 10, cursor: 'pointer', transition: 'background 0.15s',
              background: r === 1 ? 'var(--accent-soft)' : r <= 3 ? 'var(--primary-soft)' : 'transparent',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-2)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = r === 1 ? 'var(--accent-soft)' : r <= 3 ? 'var(--primary-soft)' : 'transparent' }}
          >
            <span style={{ width: 40, fontWeight: 800, fontSize: 15, color: MEDAL_COLOR[r] || 'var(--text-2nd)', flexShrink: 0 }}>
              {r}
            </span>
            <div
              style={{
                width: 28, height: 28, borderRadius: '50%', overflow: 'hidden', background: 'var(--surface-2)',
                border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}
            >
              {row.team.logo ? (
                <img src={mediaUrl(row.team.logo)} alt={row.team.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary-deep)' }}>{row.team.name?.charAt(0)}</span>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {row.team.name}
              </div>
              <div className="text-2nd" style={{ fontSize: 11 }}>
                战绩 {row.record} · {row.played} 场
              </div>
            </div>
            {medal && (
              <span style={{ fontWeight: 800, fontSize: 13, color: MEDAL_COLOR[r] }}>{MEDAL_LABEL[r]}</span>
            )}
          </div>
        )
      })}
    </div>
  )
}
