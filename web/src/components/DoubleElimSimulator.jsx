import { useEffect, useState } from 'react'
import { Modal, Button, InputNumber, message, Empty, Space, Tag, Typography } from 'antd'
import { SwapOutlined, UndoOutlined, ThunderboltFilled, CrownFilled } from '@ant-design/icons'
import { getTournament } from '../api/tournaments'
import { randomScores } from '../utils/qualifier'
import DoubleElimBracket from './DoubleElimBracket'

// 16-team local double-elimination simulator. Never touches the backend.
const LOSER_BAND = { 2: 'lb1', 3: 'lb2', 4: 'lb3', 5: 'lb4', 6: 'lb5', 7: 'lb6' }
const WINNER_LABELS = { 1: '胜者组 16 强', 2: '胜者组 8 强', 4: '胜者组 半决赛', 6: '胜者组 决赛' }
const LOSER_LABELS = { 2: '败者组 R1', 3: '败者组 R2', 4: '败者组 R3', 5: '败者组 R4', 6: '败者组 R5', 7: '败者组决赛' }

function toOverviewData(days, pool) {
  const teamById = Object.fromEntries(pool.map((t) => [t.team_id, t.team]))
  const mapMatches = (ms) =>
    ms.map((m) => ({
      match_id: m.id,
      round: m.round ?? 0,
      status: m.status,
      bracket_kind: m.kind,
      home_team: teamById[m.home],
      away_team: teamById[m.away],
      home_score: m.home_score,
      away_score: m.away_score,
    }))

  const winners = []
  const losers = []
  let finalCol = null
  for (const day of days) {
    if (day.winners?.length) {
      winners.push({
        round: day.round,
        name: WINNER_LABELS[day.round] || `胜者组 第 ${day.round} 日`,
        matches: mapMatches(day.winners),
      })
    }
    if (day.losers?.length) {
      losers.push({
        round: day.round,
        name: LOSER_LABELS[day.round] || `败者组 第 ${day.round} 日`,
        matches: mapMatches(day.losers),
      })
    }
    if (day.final?.length) {
      finalCol = { round: 8, name: '总决赛', matches: mapMatches(day.final) }
    }
  }
  return { winners, losers, final: finalCol }
}

function newMatch(home, away, kind) {
  return {
    id: Math.random(),
    home,
    away,
    home_score: null,
    away_score: null,
    status: 'scheduled',
    kind,
  }
}

function pairConsecutive(ids) {
  const out = []
  for (let i = 0; i + 1 < ids.length; i += 2) out.push([ids[i], ids[i + 1]])
  return out
}

function winnersOf(ms) {
  return ms.map((m) => (m.home_score > m.away_score ? m.home : m.away))
}

function losersOf(ms) {
  return ms.map((m) => (m.home_score > m.away_score ? m.away : m.home))
}

function cloneDay(day) {
  const clone = (ms) => ms.map((m) => ({ ...m }))
  return {
    round: day.round,
    winners: clone(day.winners || []),
    losers: clone(day.losers || []),
    final: clone(day.final || []),
  }
}

function currentMatches(day) {
  return [
    ...(day.winners || []),
    ...(day.losers || []),
    ...(day.final || []),
  ]
}

export default function DoubleElimSimulator({ open, tournament, onClose }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pool, setPool] = useState([])
  const [days, setDays] = useState([])
  const [over, setOver] = useState(false)

  useEffect(() => {
    if (!open) return
    setError('')
    setLoading(true)
    getTournament(tournament.id)
      .then((tr) => {
        const seeded = tr.data.teams
          .filter((x) => x.team)
          .map((x) => ({
            team_id: x.team.id,
            team: x.team,
            wins: 0,
            losses: 0,
            status: 'alive',
            elim_band: '',
          }))
        seeded.sort((a, b) => b.team.points - a.team.points || a.team.id - b.team.id)
        seeded.forEach((t, i) => { t.seed = i + 1 })
        setPool(seeded)
        setDays([])
        setOver(false)
      })
      .catch(() => setError('加载赛事数据失败'))
      .finally(() => setLoading(false))
  }, [open, tournament.id])

  const teamName = (id) => pool.find((t) => t.team_id === id)?.team?.name || `#${id}`

  const begin = () => {
    if (pool.length < 16) {
      message.warning('双败本地推演需要 16 支队伍')
      return
    }
    const ids = pool.map((t) => t.team_id)
    const pairs = pairConsecutive(ids)
    setDays([{
      round: 1,
      winners: pairs.map(([h, a]) => newMatch(h, a, 'winners')),
      losers: [],
      final: [],
    }])
    setOver(false)
  }

  const setScore = (group, idx, field, value) => {
    const lastIdx = days.length - 1
    if (lastIdx < 0) return
    setDays((prev) => {
      const copy = prev.map(cloneDay)
      copy[lastIdx][group][idx][field] = value
      return copy
    })
  }

  const applyScores = (poolCopy, day) => {
    const apply = (ms, kind) => {
      for (const m of ms) {
        const h = poolCopy.find((t) => t.team_id === m.home)
        const a = poolCopy.find((t) => t.team_id === m.away)
        if (m.home_score > m.away_score) {
          h.wins += 1
          a.losses += 1
        } else {
          a.wins += 1
          h.losses += 1
        }
        if (kind === 'losers') {
          const loser = m.home_score > m.away_score ? a : h
          loser.status = 'out'
          loser.elim_band = LOSER_BAND[day.round] || 'lb1'
        } else if (kind === 'final') {
          const loser = m.home_score > m.away_score ? a : h
          loser.status = 'out'
          loser.elim_band = 'final_loser'
        } else {
          const loser = m.home_score > m.away_score ? a : h
          loser.status = 'alive'
          loser.elim_band = ''
        }
      }
    }
    apply(day.winners || [], 'winners')
    apply(day.losers || [], 'losers')
    apply(day.final || [], 'final')
  }

  const createNextDay = (settledDay, poolCopy) => {
    const r = settledDay.round
    const next = {
      round: r + 1,
      winners: [],
      losers: [],
      final: [],
    }
    if (r === 1) {
      const wb1 = settledDay.winners
      next.winners = pairConsecutive(winnersOf(wb1)).map(([h, a]) => newMatch(h, a, 'winners'))
      next.losers = pairConsecutive(losersOf(wb1)).map(([h, a]) => newMatch(h, a, 'losers'))
    } else if (r === 2) {
      const lb1 = settledDay.losers
      const wb2 = settledDay.winners
      const lbW = winnersOf(lb1)
      const wbL = losersOf(wb2)
      next.losers = lbW.map((h, i) => newMatch(h, wbL[i], 'losers'))
    } else if (r === 3) {
      // 胜者组 R3 与败者组 R3 都在第 4 日
      const wb2 = days.find((d) => d.round === 2)?.winners || []
      const lb2 = settledDay.losers
      next.winners = pairConsecutive(winnersOf(wb2)).map(([h, a]) => newMatch(h, a, 'winners'))
      next.losers = pairConsecutive(winnersOf(lb2)).map(([h, a]) => newMatch(h, a, 'losers'))
    } else if (r === 4) {
      const lb3 = settledDay.losers
      const wb3 = settledDay.winners
      const pairs = winnersOf(lb3).map((h, i) => [h, losersOf(wb3)[i]])
      next.losers = pairs.map(([h, a]) => newMatch(h, a, 'losers'))
    } else if (r === 5) {
      const lb4 = settledDay.losers
      const wb3 = days.find((d) => d.round === 4)?.winners || []
      next.losers = pairConsecutive(winnersOf(lb4)).map(([h, a]) => newMatch(h, a, 'losers'))
      next.winners = pairConsecutive(winnersOf(wb3)).map(([h, a]) => newMatch(h, a, 'winners'))
    } else if (r === 6) {
      const lb5 = settledDay.losers
      const wbf = settledDay.winners
      next.losers = [newMatch(winnersOf(lb5)[0], losersOf(wbf)[0], 'losers')]
    } else if (r === 7) {
      const wbf = days.find((d) => d.round === 6)?.winners || []
      const lb6 = settledDay.losers
      next.final = [newMatch(winnersOf(wbf)[0], winnersOf(lb6)[0], 'final')]
    }
    return next
  }

  const settle = () => {
    const last = days[days.length - 1]
    if (!last) return
    const all = currentMatches(last)
    if (all.length === 0) return
    for (const m of all) {
      if (m.home_score == null || m.away_score == null) {
        message.warning('请先为所有比赛填写比分')
        return
      }
      if (m.home_score === m.away_score) {
        message.warning('比分不能相同（无平局）')
        return
      }
    }

    const settledDays = days.map(cloneDay)
    const settled = settledDays[settledDays.length - 1]
    const poolCopy = pool.map((t) => ({ ...t }))

    currentMatches(settled).forEach((m) => { m.status = 'finished' })
    applyScores(poolCopy, settled)

    if (last.round >= 8) {
      setPool(poolCopy)
      setDays(settledDays)
      setOver(true)
      const gf = settled.final[0]
      const champ = gf.home_score > gf.away_score ? gf.home : gf.away
      message.success(`模拟完成！冠军：${teamName(champ)}`)
      return
    }

    const next = createNextDay(settled, poolCopy)
    setPool(poolCopy)
    setDays([...settledDays, next])
  }

  const reset = () => {
    setDays([])
    setOver(false)
    setPool((prev) => prev.map((t) => ({ ...t, wins: 0, losses: 0, status: 'alive', elim_band: '' })))
  }

  const currentDay = days.length ? days[days.length - 1] : null
  const overviewData = days.length ? toOverviewData(days, pool) : null
  const isDouble = tournament?.format === 'double_elim'

  return (
    <Modal
      title={<span><ThunderboltFilled style={{ color: 'var(--primary)' }} /> 双败本地模拟 · {tournament?.name}</span>}
      open={open}
      onCancel={onClose}
      footer={null}
      width={960}
      styles={{ body: { maxHeight: '70vh', overflowY: 'auto', paddingTop: 8 } }}
    >
      <Typography.Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 12 }}>
        纯本地模拟，不会改动真实数据。规则：16 队双败淘汰，输一场掉入败者组、再输一场出局；
        胜者组与败者组按 D1~D8 推进，每场必须分胜负。关闭即重置。
      </Typography.Paragraph>

      <Space style={{ marginBottom: 14 }}>
        {!currentDay ? (
          <Button type="primary" icon={<SwapOutlined />} onClick={begin} disabled={loading}>
            生成第 1 日对阵
          </Button>
        ) : (
          <>
            {!over && (
              <Button type="primary" onClick={settle} disabled={!currentDay}>
                结算第 {currentDay.round} 日，生成次日
              </Button>
            )}
            <Button icon={<UndoOutlined />} onClick={reset}>
              重新开始
            </Button>
          </>
        )}
        {over && <Tag color="success" style={{ borderRadius: 6 }}>双败赛完成 · 已产生冠军</Tag>}
      </Space>

      {error && <div className="page-empty">{error}</div>}
      {loading && <div className="page-empty">加载中…</div>}
      {!loading && !currentDay && !error && (
        <Empty description="点击上方按钮生成第 1 日对阵开始双败模拟" />
      )}

      {currentDay && (
        <>
          <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 8 }}>
            第 {currentDay.round} 日
            <span className="text-2nd" style={{ fontWeight: 500, fontSize: 12, marginLeft: 8 }}>
              {isDouble ? '胜者组 / 败者组并行推进' : ''}
            </span>
          </div>
          {['winners', 'losers', 'final'].map((group) => {
            const ms = currentDay[group] || []
            if (!ms.length) return null
            const label = group === 'winners' ? '胜者组' : group === 'losers' ? '败者组' : '总决赛'
            return (
              <div key={group} style={{ margin: '12px 0 4px' }}>
                <div className="text-2nd" style={{ fontWeight: 800, fontSize: 12, marginBottom: 8 }}>
                  {label} · {ms.length} 场
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
                  {ms.map((m, i) => (
                    <ScoreCard
                      key={m.id}
                      homeName={teamName(m.home)}
                      awayName={teamName(m.away)}
                      homeScore={m.home_score}
                      awayScore={m.away_score}
                      finished={m.status === 'finished'}
                      onHome={(v) => setScore(group, i, 'home_score', v)}
                      onAway={(v) => setScore(group, i, 'away_score', v)}
                      onRandom={() => {
                        const [hs, as_] = randomScores()
                        setDays((prev) => {
                          const copy = prev.map(cloneDay)
                          const target = copy[copy.length - 1][group][i]
                          target.home_score = hs
                          target.away_score = as_
                          return copy
                        })
                      }}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </>
      )}

      {!loading && overviewData && (
        <>
          <div className="section-head" style={{ margin: '18px 0 10px' }}>
            <h2 className="section-title">双败对阵走势</h2>
            <span className="text-2nd" style={{ fontSize: 12 }}>
              本地推演进度 · 纯展示不可点击
            </span>
          </div>
          <DoubleElimBracket data={overviewData} interactive={false} />
        </>
      )}

      {over && <FinalOrder pool={pool} teamName={teamName} />}
    </Modal>
  )
}

function ScoreCard({ homeName, awayName, homeScore, awayScore, finished, onHome, onAway, onRandom }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 10 }}>
      <ScoreRow name={homeName} score={homeScore} finished={finished} onChange={onHome} />
      <div style={{ textAlign: 'center', color: 'var(--text-3rd)', fontSize: 11, margin: '4px 0' }}>VS</div>
      <ScoreRow name={awayName} score={awayScore} finished={finished} onChange={onAway} />
      {!finished && (
        <Button size="small" block style={{ marginTop: 6 }} onClick={onRandom}>
          随机比分
        </Button>
      )}
    </div>
  )
}

function ScoreRow({ name, score, finished, onChange }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ flex: 1, fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
      {finished ? (
        <span style={{ fontWeight: 800 }}>{score}</span>
      ) : (
        <InputNumber size="small" min={0} max={20} value={score} placeholder="分" style={{ width: 64 }} onChange={onChange} />
      )}
    </div>
  )
}

function FinalOrder({ pool, teamName }) {
  const champ = pool.find((t) => t.status === 'alive')
  const byBand = {
    champion: [champ],
    final_loser: pool.filter((t) => t.elim_band === 'final_loser'),
    lb6: pool.filter((t) => t.elim_band === 'lb6'),
    lb5: pool.filter((t) => t.elim_band === 'lb5'),
    lb4: pool.filter((t) => t.elim_band === 'lb4'),
    lb3: pool.filter((t) => t.elim_band === 'lb3'),
    lb2: pool.filter((t) => t.elim_band === 'lb2'),
    lb1: pool.filter((t) => t.elim_band === 'lb1'),
  }
  const order = [
    ['champion', 1],
    ['final_loser', 2],
    ['lb6', 3],
    ['lb5', 4],
    ['lb4', 5],
    ['lb3', 7],
    ['lb2', 9],
    ['lb1', 13],
  ]
  const rows = []
  for (const [band, first] of order) {
    const list = (byBand[band] || []).slice().sort((a, b) => b.wins - a.wins || a.seed - b.seed)
    list.forEach((t, i) => rows.push({ rank: first + i, name: teamName(t.team_id), record: `${t.wins}-${t.losses}` }))
  }
  return (
    <div className="panel" style={{ marginTop: 16, padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 900, marginBottom: 10 }}>
        <CrownFilled style={{ color: '#e8a000' }} /> 模拟最终名次
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px' }}>
        {rows.map((r) => (
          <div key={`${r.rank}-${r.name}`} style={{ display: 'flex', gap: 8, fontSize: 13 }}>
            <b style={{ width: 28, color: r.rank <= 3 ? 'var(--primary-deep)' : 'var(--text-2nd)' }}>#{r.rank}</b>
            <span style={{ flex: 1, fontWeight: 700 }}>{r.name}</span>
            <span className="text-2nd">{r.record}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
