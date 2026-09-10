import { TeamLogo } from './MatchCard'
import { useNavigate } from 'react-router-dom'
import { TrophyOutlined } from '@ant-design/icons'

// 单败淘汰赛「路径图」：按实际晋级人数（8 强 / 16 强 / 32 强）动态排布。
const COL_W = 244
const COL_GAP = 58
const UNIT_H = 46
const CONTENT_W = (n) => n * COL_W + (n - 1) * COL_GAP

function totalRoundsOf(rounds) {
  const first = rounds?.[0]?.matches?.length || 0
  const size = first * 2
  return size >= 2 ? Math.round(Math.log2(size)) : 0
}

function finalFrac(matchIdx, totalH) {
  if (matchIdx === 0) return 0.5
  // 决赛 / 季军赛两张卡要保证不重叠，同时整体高度别被撑得过大
  return 0.5 + Math.min(0.3, Math.max(0.13, 96 / totalH))
}

function centerFrac(total, stage, matchIdx, totalH) {
  if (stage === total - 1) return finalFrac(matchIdx, totalH)
  const denom = Math.pow(2, total - stage)
  return (2 * matchIdx + 1) / denom
}

function xOf(roundIdx) {
  return roundIdx * (COL_W + COL_GAP)
}

function matchStatus(m) {
  const finished = m?.status === 'finished'
  const decided =
    finished &&
    m.home_score != null &&
    m.away_score != null &&
    m.home_score !== m.away_score
  const winner = decided ? (m.home_score > m.away_score ? 'home' : 'away') : null
  return { finished, decided, winner }
}

function TeamLine({ team, score, won, decided, last }) {
  return (
    <div className={`kb-teamline ${decided && !won ? 'is-dim' : ''} ${won ? 'is-win' : ''} ${last ? 'is-last' : ''}`}>
      <span className="kb-teamline-mark" />
      <TeamLogo logo={team?.logo} name={team?.name} size={22} />
      <span className="kb-teamline-name">{team?.name || '?'}</span>
      {decided ? <b className={won ? 'is-win' : ''}>{score}</b> : <span className="kb-teamline-dash">—</span>}
    </div>
  )
}

function MatchNode({ match, meta, onOpen }) {
  const { finished, decided, winner } = matchStatus(match)
  return (
    <div
      className={`kb-match ${finished ? 'is-finished' : 'is-pending'} ${meta === 'third' ? 'is-third' : ''}`}
      onClick={() => match?.match_id != null && onOpen?.(match.match_id)}
      title="查看比赛详情"
    >
      {meta && (
        <div className={`kb-match-meta ${meta === 'third' ? 'third' : 'final'}`}>
          {meta === 'final' ? <TrophyOutlined /> : <span className="kb-bronze-dot" />}
          {meta === 'final' ? '决赛' : '季军赛'}
        </div>
      )}
      <TeamLine team={match?.home_team} score={match?.home_score} won={winner === 'home'} decided={decided} />
      <TeamLine team={match?.away_team} score={match?.away_score} won={winner === 'away'} decided={decided} last />
      {finished && !decided && <div className="kb-pending-tip">待结算</div>}
    </div>
  )
}

function buildPaths(rounds, total) {
  if (!rounds || rounds.length < 2 || total < 2) return []
  const paths = []
  const units = Math.max(Math.pow(2, total), 8)
  const totalH = units * UNIT_H

  for (let ci = 0; ci < rounds.length - 1; ci++) {
    const next = rounds[ci + 1]
    const isSemi = ci === total - 2
    rounds[ci].matches.forEach((_, mi) => {
      const sx = xOf(ci) + COL_W
      const sy = centerFrac(total, ci, mi, totalH) * totalH
      if (isSemi && next?.matches?.length > 0) {
        // 半决赛：胜者 → 决赛，负者 → 季军赛
        const tx = xOf(ci + 1)
        const midX = (sx + tx) / 2
        const finalY = centerFrac(total, total - 1, 0, totalH) * totalH
        paths.push({
          d: `M ${sx} ${sy} L ${midX} ${sy} L ${midX} ${finalY} L ${tx} ${finalY}`,
          cls: 'kb-line',
        })
        if (next.matches.length > 1) {
          const thirdY = centerFrac(total, total - 1, 1, totalH) * totalH
          paths.push({
            d: `M ${sx} ${sy} L ${midX} ${sy} L ${midX} ${thirdY} L ${tx} ${thirdY}`,
            cls: 'kb-line kb-line-third',
          })
        }
        return
      }
      const target = Math.floor(mi / 2)
      if (!next?.matches?.[target]) return
      const tx = xOf(ci + 1)
      const ty = centerFrac(total, ci + 1, target, totalH) * totalH
      const midX = (sx + tx) / 2
      paths.push({
        d: `M ${sx} ${sy} L ${midX} ${sy} L ${midX} ${ty} L ${tx} ${ty}`,
        cls: 'kb-line',
      })
    })
  }
  return paths
}

export default function KnockoutBracket({ rounds = [], phase }) {
  const navigate = useNavigate()
  const total = totalRoundsOf(rounds)
  const units = Math.max(Math.pow(2, total || 3), 8)
  const totalH = units * UNIT_H
  const paths = buildPaths(rounds, total)

  if (!rounds || rounds.length === 0) {
    return (
      <div className="page-empty" style={{ padding: '28px 0' }}>
        {phase === 'knockout' ? '淘汰赛对局尚未生成' : '当前赛事未进入淘汰赛阶段'}
      </div>
    )
  }

  return (
    <div className="kb-scroll">
      <div className="kb-bracket" style={{ width: CONTENT_W(rounds.length) }}>
        <div
          className="kb-head-row"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${rounds.length}, ${COL_W}px)`,
            gap: `0 ${COL_GAP}px`,
          }}
        >
          {rounds.map((col) => (
            <div className="kb-head" key={col.round}>
              <span>{col.name}</span>
              {col.matches.every((m) => m.status === 'finished') && <em>已完赛</em>}
            </div>
          ))}
        </div>

        <div className="kb-body" style={{ width: CONTENT_W(rounds.length), height: totalH }}>
          <svg className="kb-lines" width={CONTENT_W(rounds.length)} height={totalH} fill="none">
            {paths.map((p, i) => (
              <path key={i} className={p.cls} d={p.d} />
            ))}
          </svg>

          {rounds.map((col, ci) => (
            <div className="kb-col" key={col.round} style={{ left: xOf(ci), width: COL_W }}>
              {col.matches.map((m, mi) => (
                <div
                  className="kb-match-slot"
                  key={m.match_id}
                  style={{ top: `${(centerFrac(total, ci, mi, totalH) * 100).toFixed(3)}%` }}
                >
                  <MatchNode
                    match={m}
                    meta={ci === total - 1 ? (mi === 0 ? 'final' : 'third') : null}
                    onOpen={(id) => navigate(`/matches/${id}`)}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
