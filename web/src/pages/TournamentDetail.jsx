import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Skeleton, Button } from 'antd'
import {
  ArrowLeftOutlined,
  TrophyOutlined,
  CalendarOutlined,
  InfoCircleOutlined,
  ThunderboltOutlined,
  CrownFilled,
  RiseOutlined,
  FallOutlined,
  TeamOutlined,
  RightOutlined,
} from '@ant-design/icons'
import { getTournament, getMatches, getStandings, getTournamentBracket } from '../api/tournaments'
import BracketView from '../components/BracketView'
import KnockoutBracket from '../components/KnockoutBracket'
import DoubleElimBracket from '../components/DoubleElimBracket'
import LeagueSchedule from '../components/LeagueSchedule'
import LeagueDayPanel from '../components/LeagueDayPanel'
import { TeamLogo } from '../components/MatchCard'
import { roundDate, formatLabel } from '../utils/format'
import { mediaUrl } from '../utils/mediaUrl'
import SimulatorModal from '../components/SimulatorModal'
import { SkullIcon } from '../components/BrandIcons'

const STAGE_META = {
  not_started: { text: '未开始', cls: 'tag-pill tag-pill-scheduled' },
  ongoing: { text: '进行中', cls: 'tag-pill tag-pill-ongoing' },
  finished: { text: '已结束', cls: 'tag-pill tag-pill-finished' },
}

const MEDAL_COLOR = { 1: '#e8a000', 2: '#9aa7b3', 3: '#cd7f4c', 4: '#8a97a3' }
const MEDAL_LABEL = { 1: '冠军', 2: '亚军', 3: '季军', 4: '殿军' }

function toneOf(t, hasKnockout) {
  if (t?.format === 'league') return 'league'
  if (t?.format === 'double_elim') return 'cup'
  if (hasKnockout || t?.format === 'knockout') return 'cup'
  return 'swiss'
}

function formatStage(t, hasKnockout, isLeague) {
  if (t.format === 'double_elim') return '双败淘汰'
  if (hasKnockout) return '瑞士轮 · 单败淘汰赛'
  return formatLabel(t.format)
}

function TournamentHero({ t, isLeague, hasKnockout, champion, championMode, teamsCount, generatedRounds = 0 }) {
  const tone = toneOf(t, hasKnockout)
  const stMeta = STAGE_META[t.stage_status] || STAGE_META.not_started
  const qualifiers = hasKnockout ? 16 : 16
  const groupSlogan = isLeague ? '8 队单循环' : `${teamsCount} 强集结`

  const tiles = []
  if (t.stage_status === 'finished') {
    if (championMode && champion) {
      tiles.push({
        label: '最终冠军',
        value: champion.name,
        sub: '捧起冠军奖杯',
        accent: 'gold',
        icon: <CrownFilled />,
      })
    } else {
      tiles.push(
        isLeague
          ? {
              label: '联赛收官',
              value: '7 轮打完',
              sub: `${teamsCount} 队 · 单循环全部完成`,
              accent: 'blue',
              icon: <CalendarOutlined />,
            }
          : {
              label: '瑞士轮收官',
              value: `${t.advanced_count || 0} 支晋级`,
              sub: '决出 16 强 · 不设单败淘汰',
              accent: 'green',
              icon: <RiseOutlined />,
            }
      )
      tiles.push({
        label: '参赛队伍',
        value: teamsCount,
        sub: groupSlogan,
        accent: 'blue',
        icon: <TeamOutlined />,
      })
    }
  } else {
    if (t.stage_status === 'ongoing' && !isLeague && t.phase === 'swiss') {
      tiles.push(
        {
          label: '已晋级',
          value: `${t.advanced_count || 0} / ${qualifiers}`,
          sub: '进入淘汰赛席位',
          accent: 'green',
          icon: <RiseOutlined />,
        },
        {
          label: '已出局',
          value: t.eliminated_count || 0,
          sub: '无缘后续轮次',
          accent: 'gray',
          icon: <FallOutlined />,
        },
        {
          label: '存活中',
          value: t.alive_count || 0,
          sub: '仍有机会晋级',
          accent: 'blue',
          icon: <ThunderboltOutlined />,
        }
      )
    } else if (t.stage_status === 'ongoing' && t.format === 'double_elim') {
      tiles.push({
        label: '赛程进度',
        value: `第 ${t.current_round || 0} / 8 日`,
        sub: '胜者组 + 败者组并行',
        accent: 'pink',
        icon: <CalendarOutlined />,
      })
      tiles.push({
        label: '仍存活',
        value: t.alive_count || 0,
        sub: '输一场掉入败者组',
        accent: 'gold',
        icon: <ThunderboltOutlined />,
      })
    } else if (t.stage_status === 'ongoing' && !isLeague && t.phase === 'knockout') {
      tiles.push({
        label: '淘汰赛轮次',
        value: `${t.current_round || 0} / 4`,
        sub: '冠军之路进行中',
        accent: 'pink',
        icon: <CrownFilled />,
      })
      tiles.push({
        label: '仍存活',
        value: t.alive_count || 0,
        sub: '冲击冠军',
        accent: 'gold',
        icon: <ThunderboltOutlined />,
      })
    } else if (t.stage_status === 'ongoing' && isLeague) {
      tiles.push({
        label: '当前轮次',
        value: t.current_round || 0,
        sub: '共 7 轮单循环',
        accent: 'blue',
        icon: <CalendarOutlined />,
      })
    }
    if (t.stage_status === 'not_started') {
      tiles.push({
        label: '赛事状态',
        value: '待开赛',
        sub: '首轮对阵待生成',
        accent: 'blue',
        icon: <CalendarOutlined />,
      })
    }
    tiles.push({
      label: '参赛队伍',
      value: teamsCount,
      sub: groupSlogan,
      accent: tone === 'cup' ? 'pink' : 'blue',
      icon: <TeamOutlined />,
    })
  }

  return (
    <div className={`tournament-hero tournament-hero-${tone}`}>
      <div className="tournament-hero-inner">
        <div className="tournament-icon-wrap">
          <div className="tournament-icon">
            {t.icon ? (
              <img src={mediaUrl(t.icon)} alt={t.name} />
            ) : (
              <TrophyOutlined />
            )}
          </div>
        </div>

        <div className="tournament-hero-main">
          <div className="tournament-kicker">
            <span className={`tournament-format-chip tournament-chip-${tone}`}>
              <TrophyOutlined /> {formatStage(t, hasKnockout, isLeague)}
            </span>
            <span className={stMeta.cls}>
              {t.stage_status === 'ongoing' && <span className="dot-live" />}
              {stMeta.text}
            </span>
          </div>
          <h1 className="tournament-hero-name">{t.name}</h1>
          <div className="tournament-hero-date">
            <CalendarOutlined /> {t.start_date} ~ {t.end_date}
            {t.stage_status !== 'not_started' && t.stage_status !== 'finished' && (
              <span className="tournament-round-chip">当前 第 {t.current_round} 轮</span>
            )}
          </div>
        </div>

        <div className="tournament-hero-side">
          {tiles.map((tile) => (
            <div className={`tournament-hero-tile tile-${tile.accent}`} key={tile.label}>
              <span className="tournament-hero-tile-icon">{tile.icon}</span>
              <span className="tournament-hero-tile-value" title={tile.value}>
                {tile.value}
              </span>
              <span className="tournament-hero-tile-label">
                {tile.label} · <em>{tile.sub}</em>
              </span>
            </div>
          ))}
        </div>
      </div>

      {t.stage_status === 'ongoing' && (
        <StageRail
          phase={t.phase}
          isLeague={isLeague}
          isDoubleElim={t.format === 'double_elim'}
          currentRound={t.current_round}
          generatedRounds={generatedRounds}
        />
      )}
    </div>
  )
}

function StageRail({ phase, isLeague, isDoubleElim, currentRound, generatedRounds }) {
  if (generatedRounds == null) return null
  const isKnockout = phase === 'knockout'
  const steps = isDoubleElim
    ? Array.from({ length: 8 }, (_, i) => `第 ${i + 1} 日`)
    : isLeague
    ? Array.from({ length: 7 }, (_, i) => `第 ${i + 1} 轮`)
    : isKnockout
      ? ['1/8 决赛', '1/4 决赛', '半决赛', '决赛']
      : Array.from({ length: Math.max(currentRound || 1, generatedRounds || 1, 5) }, (_, i) => `第 ${i + 1} 轮`)
  return (
    <div className="stage-rail">
      <span className="stage-rail-label">
        {isDoubleElim ? '双败赛程' : isLeague ? '单循环进程' : isKnockout ? '淘汰赛进程' : '瑞士轮进程'}
      </span>
      <div className="stage-rail-steps">
        {steps.map((name, i) => {
          const n = i + 1
          const cls = n < currentRound ? 'done' : n === currentRound ? 'current' : 'todo'
          return (
            <span className={`stage-step ${cls}`} key={name}>
              <i />
              {name}
            </span>
          )
        })}
      </div>
    </div>
  )
}

function TournamentNotes({ t }) {
  const hasDesc = !!t.description
  const hasRules = !!t.rules
  if (!hasDesc && !hasRules) return null
  return (
    <div className={`tournament-notes ${hasDesc && hasRules ? 'has-two' : ''}`}>
      {hasDesc && (
        <div className="tournament-note">
          <div className="tournament-note-title">
            <InfoCircleOutlined /> 赛事简介
          </div>
          <p>{t.description}</p>
        </div>
      )}
      {hasRules && (
        <div className="tournament-note">
          <div className="tournament-note-title">
            <TrophyOutlined /> 赛制规则
          </div>
          <p>{t.rules}</p>
        </div>
      )}
    </div>
  )
}

function StandingsBoard({ rows, isFinished, championMode = false, resultRows = [], onClick }) {
  const [filter, setFilter] = useState('all')
  const list = rows || []
  const counts = {
    all: list.length,
    advanced: list.filter((r) => r.status === 'advanced').length,
    alive: list.filter((r) => r.status === 'alive').length,
    eliminated: list.filter((r) => r.status === 'eliminated').length,
  }

  if (isFinished && !championMode) {
    return <SwissOutcome rows={resultRows} onClick={onClick} />
  }

  if (isFinished) {
    const sorted = [...list].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
    const top4 = sorted.slice(0, 4)
    const rest = sorted.slice(4)
    return (
      <div className="honor-board">
        <div className="final-rank-grid">
          {top4.map((row) => {
            const r = row.rank
            return (
              <div
                className={`final-rank-card medal-${r}`}
                key={row.team.id}
                onClick={() => onClick(row.team.id)}
              >
                <span className="final-rank-no" style={{ color: MEDAL_COLOR[r] }}>
                  #{r}
                </span>
                <span className="final-rank-label" style={{ color: MEDAL_COLOR[r] }}>
                  {MEDAL_LABEL[r]}
                </span>
                <TeamLogo logo={row.team.logo} name={row.team.name} size={62} />
                <b className="final-rank-name">{row.team.name}</b>
                <span className="final-rank-meta">
                  {row.record} · {row.played} 场
                  {row.net_points != null && (
                    <>
                      {' '}· 净分{' '}
                      <b className={row.net_points >= 0 ? 'up' : 'down'}>
                        {row.net_points >= 0 ? '+' : ''}{row.net_points}
                      </b>
                    </>
                  )}
                </span>
              </div>
            )
          })}
        </div>
        {rest.length > 0 && (
          <div className="honor-list final-others">
            {rest.map((row) => (
              <HonorRow key={row.team.id} row={row} rank={row.rank} onClick={onClick} compact showNet />
            ))}
          </div>
        )}
      </div>
    )
  }

  const visible = filter === 'all' ? list : list.filter((r) => r.status === filter)
  return (
    <div className="honor-board">
      <div className="honor-toolbar">
        <div className="honor-filters">
          {[
            ['all', '全部', 'ALL'],
            ['advanced', '已晋级', 'ADV'],
            ['alive', '存活中', 'LIVE'],
            ['eliminated', '已出局', 'OUT'],
          ].map(([key, label]) => (
            <button
              type="button"
              className={`honor-filter ${filter === key ? 'active' : ''}`}
              key={key}
              onClick={() => setFilter(key)}
            >
              {label} <em>{counts[key]}</em>
            </button>
          ))}
        </div>
        <span className="honor-hint">按晋级状态与当前战绩排序</span>
      </div>
      <div className="honor-list">
        {visible.length === 0 ? (
          <div className="page-empty">该状态下暂无队伍</div>
        ) : (
          visible.map((row) => (
            <HonorRow key={row.team.id} row={row} rank={row.rank} onClick={onClick} />
          ))
        )}
      </div>
    </div>
  )
}

function SwissOutcome({ rows, onClick }) {
  const sortFn = (a, b) => b.wins - a.wins || a.losses - b.losses
  const adv = (rows || []).filter((r) => r.status === 'advanced').sort(sortFn)
  const elim = (rows || []).filter((r) => r.status === 'eliminated').sort(sortFn)

  return (
    <div className="honor-board swiss-outcome-board">
      <div className="outcome-summary">
        <span className="outcome-summary-icon">
          <RiseOutlined />
        </span>
        <b>瑞士轮收官</b>
        <em>{adv.length} 支队伍晋级 · {elim.length} 支出局 · 本赛制不设冠军</em>
      </div>
      <div className="outcome-grid">
        <div className="outcome-col">
          <div className="outcome-col-head adv">
            <TrophyOutlined /> 晋级 {adv.length}
          </div>
          <div className="outcome-team-list">
            {adv.map((row) => (
              <OutcomeTeam key={row.team.id} row={row} onClick={onClick} />
            ))}
          </div>
        </div>
        <div className="outcome-col">
          <div className="outcome-col-head out">
            <SkullIcon /> 出局 {elim.length}
          </div>
          <div className="outcome-team-list">
            {elim.map((row) => (
              <OutcomeTeam key={row.team.id} row={row} muted onClick={onClick} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function OutcomeTeam({ row, muted = false, onClick }) {
  return (
    <div
      className={`outcome-team ${muted ? 'is-out' : ''}`}
      onClick={() => row.team?.id != null && onClick?.(row.team.id)}
    >
      <TeamLogo logo={row.team?.logo} name={row.team?.name} size={30} />
      <span className="outcome-team-name">{row.team?.name}</span>
      <b className="outcome-team-record">
        {row.wins}-{row.losses}
      </b>
    </div>
  )
}

function HonorRow({ row, rank, onClick, compact = false, showNet = false }) {
  const statusMeta = {
    advanced: { label: '已晋级', cls: 'status-adv', icon: <TrophyOutlined /> },
    alive: { label: '存活', cls: 'status-alive', icon: <ThunderboltOutlined /> },
    eliminated: { label: '已出局', cls: 'status-out', icon: <SkullIcon /> },
    finished: { label: '完赛', cls: 'status-done', icon: null },
  }[row.status] || { label: row.status, cls: 'status-done', icon: null }

  return (
    <div className={`honor-row honor-${row.status}`} onClick={() => onClick(row.team.id)}>
      <span className="honor-index">#{rank}</span>
      <TeamLogo logo={row.team.logo} name={row.team.name} size={40} />
      <div className="honor-name-block">
        <b>{row.team.name}</b>
        <span>
          已赛 {row.played} 场
          {showNet && row.net_points != null && (
            <>
              {' '}· 净分{' '}
              <b className={row.net_points >= 0 ? 'up' : 'down'}>
                {row.net_points >= 0 ? '+' : ''}{row.net_points}
              </b>
            </>
          )}
        </span>
      </div>
      <div className="honor-record">
        <b>{row.wins}</b>
        <i>-</i>
        <b>{row.losses}</b>
      </div>
      {!compact && (
        <span className={`honor-status ${statusMeta.cls}`}>
          {statusMeta.icon}
          {statusMeta.label}
        </span>
      )}
      <RightOutlined className="honor-arrow" />
    </div>
  )
}

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

  if (loading) {
    return (
      <div className="page detail-page" style={{ maxWidth: 1080 }}>
        <Skeleton active paragraph={{ rows: 10 }} />
      </div>
    )
  }
  if (!t) {
    return <div className="page page-empty">赛事不存在或加载失败</div>
  }

  const isLeague = t.format === 'league'
  const isDoubleElim = t.format === 'double_elim'
  const hasKnockout = t.knockout_after_swiss
  const knockoutFormat = hasKnockout || t.format === 'knockout' || isDoubleElim
  const finished = t.stage_status === 'finished'
  const championMode = finished && knockoutFormat
  const bracketRounds = bracket?.rounds || []
  const teamsCount = t.teams?.length || (isLeague ? 8 : 32)
  const champion = championMode ? standings.find((s) => s.rank === 1)?.team || null : null
  const swissCurrent = t.phase === 'swiss' ? t.current_round : null
  const swissResultRows = finished && !championMode && !isLeague
    ? (t.teams || []).map((tt) => ({
        team: tt.team,
        wins: tt.wins,
        losses: tt.losses,
        played: tt.wins + tt.losses,
        record: tt.record,
        status: tt.status,
      }))
    : []

  return (
    <div className="page detail-page" style={{ maxWidth: 1080 }}>
      <div className="detail-nav">
        <Link to="/tournaments" className="back-link">
          <ArrowLeftOutlined /> 返回赛事列表
        </Link>
        {!isLeague && (
          <Button type="primary" icon={<ThunderboltOutlined />} onClick={() => setShowSim(true)}>
            本地模拟推演
          </Button>
        )}
      </div>

      <TournamentHero
        t={t}
        isLeague={isLeague}
        hasKnockout={hasKnockout}
        champion={champion}
        championMode={championMode}
        teamsCount={teamsCount}
        generatedRounds={rounds.length}
      />
      <TournamentNotes t={t} />

      <div className="section-head">
        <h2 className="section-title">{isLeague ? '单循环赛程' : '瑞士轮晋级对阵图'}</h2>
        {t.stage_status !== 'not_started' && rounds.length > 0 && (
          <span className="text-2nd" style={{ fontSize: 13 }}>
            {isLeague
              ? '每队与其他 7 队各赛一场 · 每轮 4 场 · 共 7 轮'
              : `每 ${t.round_interval_days || 3} 天一轮 · 已生成 ${rounds.length} 轮`}
          </span>
        )}
      </div>

      {t.stage_status === 'not_started' ? (
        <div className="board-empty-state">
          <TrophyOutlined />
          <b>赛事尚未开赛</b>
          <span>管理员在后台生成第 1 轮对阵后，这里会展开完整对阵图</span>
        </div>
      ) : isDoubleElim ? (
        <DoubleElimBracket data={bracket} />
      ) : isLeague ? (
        <LeagueSchedule rounds={rounds} />
      ) : (
        <BracketView rounds={rounds} currentRound={swissCurrent} showLegend />
      )}

      {isLeague && t.stage_status !== 'not_started' ? (
        <div style={{ marginTop: 26 }}>
          <LeagueDayPanel tournament={t} />
        </div>
      ) : isLeague ? null : (
        <>
          {hasKnockout && (
            <>
              <div className="section-head">
                <h2 className="section-title">单败淘汰赛 · 冠军之路</h2>
                <span className="text-2nd" style={{ fontSize: 13 }}>
                  {bracketRounds.length ? `${bracketRounds.length} 轮 · 点击卡片查看比赛` : '等待瑞士轮决出 16 强'}
                </span>
              </div>
              <KnockoutBracket rounds={bracketRounds} phase={t.phase} />
            </>
          )}

          {(!isDoubleElim || finished) && (
            <>
              <div className="section-head">
                <h2 className="section-title">
                  {finished ? (championMode ? '最终荣誉榜' : '瑞士轮晋级结果') : '队伍状态榜'}
                </h2>
                <span className="text-2nd" style={{ fontSize: 13 }}>
                  {finished && !championMode ? '晋级与出局名单 · 点击队伍查看档案' : '点击队伍查看档案'}
                </span>
              </div>
              <StandingsBoard
                rows={standings}
                isFinished={finished}
                championMode={championMode}
                resultRows={swissResultRows}
                onClick={(teamId) => navigate(`/teams/${teamId}`)}
              />
            </>
          )}
        </>
      )}

      <SimulatorModal open={showSim} tournament={t} onClose={() => setShowSim(false)} />
    </div>
  )
}
