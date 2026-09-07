import { useEffect, useState } from 'react'
import { Card, Skeleton, Tag } from 'antd'
import { RightOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { getTournaments } from '../api/tournaments'
import { mediaUrl } from '../utils/mediaUrl'

function calcStatus(start, end) {
  const today = new Date()
  const s = new Date(start)
  const e = new Date(end)
  if (today < s) return { text: '未开始', cls: 'tag-pill tag-pill-scheduled' }
  if (today > e) return { text: '已结束', cls: 'tag-pill tag-pill-finished' }
  return { text: '进行中', cls: 'tag-pill tag-pill-ongoing', dot: true }
}

export default function TournamentList() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    getTournaments()
      .then(({ data }) => setItems(data))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="page">
      <div className="section-head" style={{ marginTop: 4 }}>
        <h2 className="section-title">赛事列表</h2>
        <span className="text-2nd" style={{ fontSize: 13 }}>共 {items.length} 项赛事</span>
      </div>
      {loading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : items.length === 0 ? (
        <div className="page-empty">暂无赛事</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {items.map((t) => {
            const st = calcStatus(t.start_date, t.end_date)
            return (
              <Card
                key={t.id}
                hoverable
                className="hoverable-card"
                onClick={() => navigate(`/tournaments/${t.id}`)}
                style={{ borderRadius: 16 }}
                styles={{ body: { padding: 20 } }}
              >
                <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                  <div
                    style={{
                      width: 60,
                      height: 60,
                      borderRadius: 14,
                      background: 'var(--surface-2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      flexShrink: 0,
                      border: '1px solid var(--border)',
                    }}
                  >
                    {t.icon ? (
                      <img src={mediaUrl(t.icon)} alt={t.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <span style={{ fontSize: 24 }}>🏆</span>
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 800, fontSize: 16, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.name}
                      </span>
                    </div>
                    <div className="text-2nd" style={{ fontSize: 13, marginTop: 6 }}>
                      {t.start_date} ~ {t.end_date}
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <span className={st.cls}>
                        {st.dot && <span className="dot-live" />}
                        {st.text}
                      </span>
                    </div>
                  </div>
                  <RightOutlined style={{ color: 'var(--text-3rd)', fontSize: 12 }} />
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
