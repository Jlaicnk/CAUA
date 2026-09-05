import { useEffect, useState } from 'react'
import { Modal, Button, InputNumber, message, Empty, Space, Tag, Typography } from 'antd'
import { SwapOutlined, UndoOutlined, ThunderboltFilled } from '@ant-design/icons'
import { getTournament } from '../api/tournaments'
import { roundDate } from '../utils/format'
import BracketView from './BracketView'
import {
  ALIVE, ADVANCED, statusOf, randomScores, pairRound, addForbidden,
} from '../utils/qualifier'

// Local-only simulator for the qualifier format. Never touches the backend DB.
export default function SimulatorModal({ open, tournament, onClose }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [teamPool, setTeamPool] = useState([]) // participant list [{team_id,wins,losses,status, team}]
  const [rounds, setRounds] = useState([]) // [{round, matches:[{home,away,home_score,away_score,status}]}]
  const [over, setOver] = useState(false)

  useEffect(() => {
    if (!open) return
    setError('')
    setLoading(true)
    getTournament(tournament.id)
      .then((tr) => {
        const pool = tr.data.teams
          .filter((x) => x.team)
          .map((x) => ({ team_id: x.team.id, wins: 0, losses: 0, status: ALIVE, team: x.team }))
        setTeamPool(pool)
        setRounds([])
        setOver(false)
      })
      .catch(() => setError('加载赛事数据失败'))
      .finally(() => setLoading(false))
  }, [open, tournament.id])

  const begin = () => {
    if (teamPool.length < 2) return
    const pool = teamPool.map((x) => ({ ...x }))
    const pairs = pairRound(pool, new Set())
    const matches = pairs.map(([h, a]) => ({ home: h, away: a, home_score: null, away_score: null, status: 'scheduled', id: Math.random() }))
    setTeamPool(pool)
    setRounds([{ round: 1, dateStr: roundDate(tournament.start_date, 1, tournament.round_interval_days || 3), matches }])
    setOver(false)
  }

  // settle the current (last scheduled) round, apply results, then generate next round
  const settle = () => {
    const lastIdx = rounds.length - 1
    const last = rounds[lastIdx]
    if (!last) return
    for (const m of last.matches) {
      if (m.home_score == null || m.away_score == null) {
        message.warning('请先为所有比赛填写比分')
        return
      }
      if (m.home_score === m.away_score) {
        message.warning('比分不能相同（无平局）')
        return
      }
    }

    // deep copy rounds & mark last round finished with its scores
    const newRounds = rounds.map((r) => ({ ...r, matches: r.matches.map((m) => ({ ...m })) }))
    const settledMatches = newRounds[lastIdx].matches
    for (const m of settledMatches) m.status = 'finished'

    // apply results to a copied pool
    const pool = teamPool.map((x) => ({ ...x }))
    for (const m of settledMatches) {
      const h = pool.find((x) => x.team_id === m.home)
      const a = pool.find((x) => x.team_id === m.away)
      if (m.home_score > m.away_score) {
        h.wins += 1
        a.losses += 1
      } else {
        a.wins += 1
        h.losses += 1
      }
      h.status = statusOf(h.wins, h.losses)
      a.status = statusOf(a.wins, a.losses)
    }
    setTeamPool(pool)

    const adv = pool.filter((x) => x.status === ADVANCED).length
    if (adv * 2 >= pool.length) {
      setRounds(newRounds)
      setOver(true)
      message.success('模拟完成！已决出晋级队伍')
      return
    }

    // build forbidden set from all finished matches so far
    const forbidden = new Set()
    for (const r of newRounds) {
      for (const m of r.matches) addForbidden(forbidden, m.home, m.away)
    }
    let pairs
    try {
      pairs = pairRound(pool.filter((x) => x.status === ALIVE), forbidden)
    } catch (e) {
      message.error('配对失败：' + e.message)
      setRounds(newRounds)
      return
    }
    const nextNo = last.round + 1
    const next = {
      round: nextNo,
      dateStr: roundDate(tournament.start_date, nextNo, tournament.round_interval_days || 3),
      matches: pairs.map(([h, a]) => ({ id: Math.random(), home: h, away: a, home_score: null, away_score: null, status: 'scheduled' })),
    }
    setRounds([...newRounds, next])
  }

  const setScore = (mIdx, which, value) => {
    const lastIdx = rounds.length - 1
    if (lastIdx < 0) return
    setRounds((prev) => {
      const copy = prev.map((r) => ({ ...r, matches: r.matches.map((m) => ({ ...m })) }))
      copy[lastIdx].matches[mIdx][which] = value
      return copy
    })
  }

  const teamName = (id) => teamPool.find((x) => x.team_id === id)?.team?.name || `#${id}`

  const currentRound = rounds.length ? rounds[rounds.length - 1] : null

  return (
    <Modal
      title={<span><ThunderboltFilled style={{ color: 'var(--primary)' }} /> 本地模拟推演 · {tournament.name}</span>}
      open={open}
      onCancel={onClose}
      footer={null}
      width={960}
      styles={{ body: { maxHeight: '70vh', overflowY: 'auto', paddingTop: 8 } }}
    >
      <Typography.Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 12 }}>
        这是本地模拟，不会改动真实赛事数据。规则：先到 3 胜晋级、3 负出局；同战绩优先配对、不重复交手。刷新或关闭即重置。
      </Typography.Paragraph>

      <Space style={{ marginBottom: 14 }}>
        {rounds.length === 0 ? (
          <Button type="primary" icon={<SwapOutlined />} onClick={begin} disabled={teamPool.length < 2 || loading}>
            生成第 1 轮对阵
          </Button>
        ) : (
          <>
            {!over && (
              <Button type="primary" onClick={settle} disabled={!currentRound}>
                结算本轮，生成下一轮
              </Button>
            )}
            <Button icon={<UndoOutlined />} onClick={() => { setRounds([]); setTeamPool(teamPool.map((x) => ({ ...x, wins: 0, losses: 0, status: ALIVE }))); setOver(false) }}>
              重新开始
            </Button>
          </>
        )}
        {over && (
          <Tag color="success" style={{ borderRadius: 6 }}>赛事结束 · 已决出 16 强</Tag>
        )}
      </Space>

      {error && <div className="page-empty">{error}</div>}
      {loading && <div className="page-empty">加载中…</div>}

      {!loading && rounds.length === 0 && !error && (
        <Empty description="点击上方按钮生成第 1 轮对阵开始模拟" />
      )}

      {!loading && currentRound && (
        <>
          <div style={{ fontWeight: 800, marginBottom: 10 }}>
            第 {currentRound.round} 轮 <span className="text-2nd" style={{ fontWeight: 500 }}>{currentRound.dateStr}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 10 }}>
            {currentRound.matches.map((m, i) => {
              const finished = m.status === 'finished'
              return (
                <div key={m.id} style={{ border: '1px solid var(--border)', borderRadius: 12, padding: 10 }}>
                  <ScoreRow name={teamName(m.home)} score={m.home_score} finished={finished} onChange={(v) => setScore(i, 'home_score', v)} />
                  <div style={{ textAlign: 'center', color: 'var(--text-3rd)', fontSize: 11, margin: '4px 0' }}>VS</div>
                  <ScoreRow name={teamName(m.away)} score={m.away_score} finished={finished} onChange={(v) => setScore(i, 'away_score', v)} />
                  {!finished && (
                    <Button size="small" block style={{ marginTop: 6 }} onClick={() => {
                      const [hs, as_] = randomScores()
                      setScore(i, 'home_score', hs)
                      setScore(i, 'away_score', as_)
                    }}>
                      随机比分
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </>
      )}

      {!loading && rounds.length > 0 && (
        <>
          <div className="section-head" style={{ margin: '18px 0 10px' }}>
            <h2 className="section-title">模拟对阵图</h2>
          </div>
          <BracketView
            rounds={rounds.map((r) => ({
              round: r.round,
              dateStr: r.dateStr,
              matches: r.matches.map((m) => ({
                id: m.id,
                status: m.status,
                home_score: m.home_score,
                away_score: m.away_score,
                home_team: teamPool.find((x) => x.team_id === m.home)?.team,
                away_team: teamPool.find((x) => x.team_id === m.away)?.team,
              })),
            }))}
            startDate={tournament.start_date}
            interval={tournament.round_interval_days || 3}
          />
        </>
      )}
    </Modal>
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
