import { useEffect, useMemo, useState } from 'react'
import { Select, Spin, Empty } from 'antd'
import { CalendarOutlined } from '@ant-design/icons'
import { MatchCard } from '../components/MatchCard'
import { getMatches, getTournaments } from '../api/tournaments'

const STATUS_META = {
  ongoing: { title: '进行中', cls: 'tag-pill tag-pill-ongoing', dot: true },
  scheduled: { title: '即将开始', cls: 'tag-pill tag-pill-scheduled', dot: false },
  finished: { title: '已结束', cls: 'tag-pill tag-pill-finished', dot: false },
}

export default function Schedule() {
  const [tournaments, setTournaments] = useState([])
  const [filter, setFilter] = useState(null)
  const [matches, setMatches] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getTournaments().then(({ data }) => setTournaments(data)).catch(() => {})
  }, [])

  useEffect(() => {
    setLoading(true)
    getMatches(filter)
      .then(({ data }) => setMatches(data))
      .catch(() => setMatches([]))
      .finally(() => setLoading(false))
  }, [filter])

  const grouped = useMemo(() => {
    const order = { ongoing: 0, scheduled: 1, finished: 2 }
    const sorted = [...matches].sort((a, b) => {
      const d = order[a.status] - order[b.status]
      if (d !== 0) return d
      return a.match_date.localeCompare(b.match_date)
    })
    const groups = []
    for (const m of sorted) {
      let g = groups.find((x) => x.status === m.status)
      if (!g) {
        g = { status: m.status, items: [] }
        groups.push(g)
      }
      g.items.push(m)
    }
    return groups
  }, [matches])

  return (
    <div className="page">
      <div className="section-head" style={{ marginTop: 4 }}>
        <h2 className="section-title">赛程</h2>
        <span className="text-2nd" style={{ fontSize: 13 }}>{matches.length} 场比赛</span>
      </div>

      <div style={{ marginBottom: 20 }}>
        <Select
          allowClear
          placeholder="按赛事筛选"
          style={{ width: 260 }}
          value={filter}
          onChange={setFilter}
          prefix={<CalendarOutlined />}
          options={tournaments.map((t) => ({ label: t.name, value: t.id }))}
        />
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60 }}>
          <Spin size="large" />
        </div>
      ) : grouped.length === 0 ? (
        <Empty description="暂无赛程" />
      ) : (
        grouped.map((group) => {
          const meta = STATUS_META[group.status] || STATUS_META.scheduled
          return (
            <div key={group.status} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0 12px' }}>
                <span className={meta.cls}>
                  {meta.dot && <span className="dot-live" />}
                  {meta.title}
                </span>
                <span className="text-2nd" style={{ fontSize: 13 }}>{group.items.length} 场</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
                {group.items.map((m) => (
                  <MatchCard key={m.id} match={m} />
                ))}
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
