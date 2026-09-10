import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Skeleton, Modal, Input, Select, Button } from 'antd'
import { ArrowLeftOutlined, SwapOutlined, PlusOutlined, SearchOutlined, CloseOutlined } from '@ant-design/icons'
import { getPlayer, getPlayers } from '../api/teams'
import { mediaUrl } from '../utils/mediaUrl'
import CompareRadar from '../components/CompareRadar'
import { DIMENSIONS, PLAYER_STAT_GROUPS } from '../utils/playerStats'

const POSITIONS = ['前锋', '中锋', '后卫', '守门员']
const FIVE_SCALE_KEYS = ['weak_foot_usage', 'weak_foot_accuracy', 'condition', 'injury_resistance']
const TIER_LABEL = { legend: '殿堂级', gold: '金', silver: '银', bronze: '铜' }

function valuePct(value, key) {
  const max = FIVE_SCALE_KEYS.includes(key) ? 5 : 100
  return Math.max(0, Math.min(100, (Number(value || 0) / max) * 100))
}

function radarValues(p) {
  return DIMENSIONS.reduce((acc, d) => ({ ...acc, [d.key]: p?.[d.key] ?? 0 }), {})
}

function honorCounts(p) {
  const counts = { legend: 0, gold: 0, silver: 0, bronze: 0 }
  for (const h of p?.honors || []) counts[h.tier] = (counts[h.tier] || 0) + 1
  return counts
}

function PlayerSlot({ player, side, onPick, onClear }) {
  const navigate = useNavigate()
  if (!player) {
    return (
      <button type="button" className="pc-slot pc-slot-empty" onClick={onPick}>
        <PlusOutlined />
        <span>选择球员</span>
      </button>
    )
  }
  return (
    <div className={`pc-slot pc-slot-${side}`}>
      <button type="button" className="pc-slot-clear" onClick={onClear} title="移除">
        <CloseOutlined />
      </button>
      <div className="pc-slot-avatar">
        {player.avatar ? <img src={mediaUrl(player.avatar)} alt={player.name} /> : <span>{player.name?.charAt(0)}</span>}
      </div>
      <div className="pc-slot-name">{player.name}</div>
      <div className="pc-slot-sub">
        {player.team_name && (
          <span className="pc-slot-team" onClick={() => navigate(`/teams/${player.team}`)}>
            {player.team_name}
          </span>
        )}
        <span>{player.position} · #{player.number}</span>
      </div>
      <div className="pc-slot-ovr">
        <em>OVR</em>
        <b>{player.overall ?? '—'}</b>
      </div>
    </div>
  )
}

function StatRow({ item, a, b }) {
  const key = item.key
  const va = a?.[key] ?? 0
  const vb = b?.[key] ?? 0
  const pa = valuePct(va, key)
  const pb = valuePct(vb, key)
  const isFive = FIVE_SCALE_KEYS.includes(key)
  return (
    <div className="pc-stat-row">
      <span className={`pc-stat-val left ${va > vb ? 'win' : ''}`}>{va}{isFive ? '/5' : ''}</span>
      <span className="pc-stat-track left">
        <i style={{ width: `${pa}%` }} />
      </span>
      <span className="pc-stat-name">{item.label}</span>
      <span className="pc-stat-track right">
        <i style={{ width: `${pb}%` }} />
      </span>
      <span className={`pc-stat-val right ${vb > va ? 'win' : ''}`}>{vb}{isFive ? '/5' : ''}</span>
    </div>
  )
}

function PlayerPicker({ open, slot, players, loading, search, position, onSearch, onPosition, onPick, onCancel }) {
  return (
    <Modal open={open} title={`选择球员 ${slot === 'a' ? 'A' : 'B'}`} footer={null} onCancel={onCancel} width={620}>
      <div className="pc-picker-toolbar">
        <Input
          allowClear
          prefix={<SearchOutlined />}
          placeholder="搜索球员或队伍"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
        <Select
          allowClear
          placeholder="位置"
          style={{ width: 130 }}
          value={position || undefined}
          onChange={onPosition}
          options={POSITIONS.map((p) => ({ label: p, value: p }))}
        />
      </div>
      <div className="pc-picker-list">
        {loading ? (
          <div className="page-empty">搜索中…</div>
        ) : players.length === 0 ? (
          <div className="page-empty">没有找到球员</div>
        ) : (
          players.map((p) => (
            <button type="button" className="pc-picker-row" key={p.id} onClick={() => onPick(p)}>
              <span className="pc-picker-avatar">
                {p.avatar ? <img src={mediaUrl(p.avatar)} alt={p.name} /> : <span>{p.name?.charAt(0)}</span>}
              </span>
              <span className="pc-picker-name">{p.name}</span>
              <span className="pc-picker-team">{p.team_name}</span>
              <span className="pc-picker-pos">{p.position}</span>
              <b className="pc-picker-ovr">{p.overall}</b>
            </button>
          ))
        )}
      </div>
    </Modal>
  )
}

export default function PlayerCompare() {
  const [params, setParams] = useSearchParams()
  const aId = params.get('a')
  const bId = params.get('b')
  const [playerA, setPlayerA] = useState(null)
  const [playerB, setPlayerB] = useState(null)
  const [loading, setLoading] = useState(false)
  const [picker, setPicker] = useState(null)
  const [candidates, setCandidates] = useState([])
  const [candLoading, setCandLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [position, setPosition] = useState('')

  useEffect(() => {
    let alive = true
    if (!aId && !bId) {
      setPlayerA(null)
      setPlayerB(null)
      return undefined
    }
    setLoading(true)
    Promise.all([
      aId ? getPlayer(aId) : Promise.resolve({ data: null }),
      bId ? getPlayer(bId) : Promise.resolve({ data: null }),
    ])
      .then(([ra, rb]) => {
        if (!alive) return
        setPlayerA(ra.data || null)
        setPlayerB(rb.data || null)
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
  }, [aId, bId])

  useEffect(() => {
    if (!picker) return undefined
    let alive = true
    setCandLoading(true)
    const timer = setTimeout(() => {
      getPlayers({ search, position, limit: 80, ordering: '-overall' })
        .then(({ data }) => alive && setCandidates(data))
        .catch(() => alive && setCandidates([]))
        .finally(() => alive && setCandLoading(false))
    }, 250)
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [picker, search, position])

  const setSlot = (slot, player) => {
    const next = new URLSearchParams(params)
    next.set(slot, String(player.id))
    setParams(next)
    setPicker(null)
    setSearch('')
  }

  const clearSlot = (slot) => {
    const next = new URLSearchParams(params)
    next.delete(slot)
    setParams(next)
  }

  const swap = () => {
    if (!aId && !bId) return
    const next = new URLSearchParams()
    if (bId) next.set('a', bId)
    if (aId) next.set('b', aId)
    setParams(next)
  }

  const openPicker = (slot) => {
    setPosition(slot === 'b' && playerA ? playerA.position : '')
    setSearch('')
    setPicker(slot)
  }

  const bothReady = playerA && playerB

  const dimRows = DIMENSIONS.map((d) => ({
    ...d,
    a: playerA?.[d.key] ?? 0,
    b: playerB?.[d.key] ?? 0,
  }))

  const dimWinsA = dimRows.filter((d) => d.a > d.b).length
  const dimWinsB = dimRows.filter((d) => d.b > d.a).length
  const statDiffs = bothReady
    ? PLAYER_STAT_GROUPS.flatMap((g) => g.items).map((it) => (playerA[it.key] ?? 0) - (playerB[it.key] ?? 0))
    : []
  const statWinsA = statDiffs.filter((v) => v > 0).length
  const statWinsB = statDiffs.filter((v) => v < 0).length
  const ovrDiff = bothReady ? (playerA.overall ?? 0) - (playerB.overall ?? 0) : 0

  return (
    <div className="page detail-page pc-page" style={{ maxWidth: 1080 }}>
      <div className="detail-nav">
        <Link to="/teams" className="back-link">
          <ArrowLeftOutlined /> 队伍排行榜
        </Link>
        <span className="detail-nav-note">CAUA · 球员对比</span>
      </div>

      {loading ? (
        <Skeleton active paragraph={{ rows: 10 }} />
      ) : (
        <>
          <div className="pc-head">
            <PlayerSlot player={playerA} side="a" onPick={() => openPicker('a')} onClear={() => clearSlot('a')} />
            <div className="pc-vs">
              <button type="button" className="pc-swap" onClick={swap} title="交换左右">
                <SwapOutlined />
              </button>
              <span>VS</span>
            </div>
            <PlayerSlot player={playerB} side="b" onPick={() => openPicker('b')} onClear={() => clearSlot('b')} />
          </div>

          {!bothReady ? (
            <div className="board-empty-state">
              <PlusOutlined />
              <b>选择两名球员开始对比</b>
              <span>可以从搜索里按名字、队伍或位置挑选，对比结果会记录在网址里方便分享</span>
            </div>
          ) : (
            <>
              <div className="pc-verdict">
                <div className="pc-verdict-main">
                  <b>
                    {ovrDiff === 0
                      ? '两人综合 OVR 持平'
                      : `${ovrDiff > 0 ? playerA.name : playerB.name} 综合 OVR 领先 ${Math.abs(ovrDiff)}`}
                  </b>
                  <span>
                    六维：A 领先 {dimWinsA} 项 / B 领先 {dimWinsB} 项；细分能力：A 领先 {statWinsA} 项 / B 领先 {statWinsB} 项
                  </span>
                </div>
                {playerA.position !== playerB.position && (
                  <div className="pc-verdict-warn">两人位置不同（{playerA.position} vs {playerB.position}），能力对比仅供参考</div>
                )}
              </div>

              <div className="section-head">
                <h2 className="section-title">六维能力</h2>
              </div>
              <div className="pc-radar-panel">
                <CompareRadar
                  valuesA={radarValues(playerA)}
                  valuesB={radarValues(playerB)}
                  nameA={playerA.name}
                  nameB={playerB.name}
                />
                <div className="pc-dim-table">
                  {dimRows.map((d) => (
                    <div className="pc-dim-row" key={d.key}>
                      <b className={d.a > d.b ? 'win' : ''}>{d.a}</b>
                      <span className="pc-dim-name">{d.label}</span>
                      <b className={d.b > d.a ? 'win' : ''}>{d.b}</b>
                      <em className={d.a === d.b ? '' : d.a > d.b ? 'up' : 'down'}>
                        {d.a === d.b ? '=' : `${d.a > d.b ? '+' : ''}${d.a - d.b}`}
                      </em>
                    </div>
                  ))}
                </div>
              </div>

              <div className="section-head">
                <h2 className="section-title">细分能力对比</h2>
                <span className="text-2nd" style={{ fontSize: 12 }}>从中间向两侧延伸，越长该项越强</span>
              </div>
              <div className="pc-stat-groups">
                {PLAYER_STAT_GROUPS.map((group) => {
                  const rows = group.items.map((it) => ({
                    it,
                    diff: (playerA[it.key] ?? 0) - (playerB[it.key] ?? 0),
                  }))
                  const aw = rows.filter((r) => r.diff > 0).length
                  const bw = rows.filter((r) => r.diff < 0).length
                  return (
                    <div className="pc-stat-card" key={group.name}>
                      <div className="pc-stat-card-head">
                        <span>{group.name}</span>
                        <em>{aw > bw ? `${playerA.name} 领先` : bw > aw ? `${playerB.name} 领先` : '持平'}</em>
                      </div>
                      <div className="pc-stat-list">
                        {group.items.map((item) => (
                          <StatRow key={item.key} item={item} a={playerA} b={playerB} />
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="section-head">
                <h2 className="section-title">荣誉对比</h2>
              </div>
              <div className="pc-honor-compare">
                {[playerA, playerB].map((p, idx) => {
                  const counts = honorCounts(p)
                  return (
                    <div className={`pc-honor-col ${idx === 0 ? 'a' : 'b'}`} key={p.id}>
                      <b>{p.name}</b>
                      <div className="pc-honor-counts">
                        {Object.entries(TIER_LABEL).map(([tier, label]) => (
                          <span className={`pc-honor-chip tier-${tier}`} key={tier}>
                            {label} <em>{counts[tier] || 0}</em>
                          </span>
                        ))}
                      </div>
                      <div className="pc-honor-list">
                        {(p.honors || []).slice(0, 4).map((h) => (
                          <span key={h.id}>{h.name} · {h.tournament_name}</span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </>
      )}

      <PlayerPicker
        open={!!picker}
        slot={picker}
        players={candidates.filter((p) => String(p.id) !== (picker === 'a' ? bId : aId))}
        loading={candLoading}
        search={search}
        position={position}
        onSearch={setSearch}
        onPosition={setPosition}
        onPick={(p) => setSlot(picker, p)}
        onCancel={() => setPicker(null)}
      />
    </div>
  )
}
