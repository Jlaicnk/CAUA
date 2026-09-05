import { useEffect, useState } from 'react'
import { Skeleton, Button } from 'antd'
import { CrownFilled, PlayCircleFilled, RightOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { getTeams } from '../api/teams'
import { TeamLogo } from '../components/MatchCard'

const RANK_STYLE = {
  1: { name: '冠军', cls: 'first' },
  2: { name: '亚军', cls: 'second' },
  3: { name: '季军', cls: 'third' },
}

function PodiumCard({ team, pos }) {
  const navigate = useNavigate()
  // pos: 0 = 1st, 1 = 2nd, 2 = 3rd (by points)
  const rank = pos + 1
  const meta = RANK_STYLE[rank]
  return (
    <div
      className={`podium-item ${rank === 1 ? 'first' : ''}`}
      onClick={() => navigate(`/teams/${team.id}`)}
    >
      <div className={`podium-line ${meta.cls}`} />
      {rank === 1 && <span className="podium-crown"><CrownFilled style={{ color: '#f5b301' }} /></span>}
      <span className={`podium-rank ${meta.cls}`}>
        {rank === 1 ? '👑 ' : ''}
        {meta.name}
      </span>
      <div style={{ display: 'flex', justifyContent: 'center', margin: '10px 0 14px' }}>
        <TeamLogo logo={team.logo} name={team.name} size={rank === 1 ? 84 : 64} />
      </div>
      <div style={{ fontWeight: 800, fontSize: rank === 1 ? 19 : 16 }}>{team.name}</div>
      <div style={{ marginTop: 8 }}>
        <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ fontSize: 26, fontWeight: 800, color: 'var(--primary-deep)', fontVariantNumeric: 'tabular-nums' }}>
            {team.points ?? 1000}
          </span>
          <span className="text-2nd" style={{ fontSize: 12 }}>PTS</span>
        </span>
      </div>
      {team.song && (
        <span style={{ marginLeft: 8, color: 'var(--primary-deep)', fontSize: 12 }}>
          <PlayCircleFilled /> 有队歌
        </span>
      )}
    </div>
  )
}

function RankRow({ team, displayRank }) {
  const navigate = useNavigate()
  return (
    <div className="rank-row" onClick={() => navigate(`/teams/${team.id}`)}>
      <span className="rank-no">{displayRank}</span>
      <TeamLogo logo={team.logo} name={team.name} size={40} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {team.name}
        </div>
        {team.description && (
          <div className="text-2nd" style={{ fontSize: 12, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {team.description}
          </div>
        )}
      </div>
      {team.song && (
        <span className="text-2nd" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>
          <PlayCircleFilled style={{ color: 'var(--primary-deep)' }} /> 队歌
        </span>
      )}
      <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--primary-deep)', fontVariantNumeric: 'tabular-nums', minWidth: 52, textAlign: 'right' }}>
        {team.points ?? 1000}
      </span>
      <RightOutlined style={{ color: 'var(--text-3rd)', fontSize: 12 }} />
    </div>
  )
}

export default function Teams() {
  const [teams, setTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    getTeams()
      .then(({ data }) => setTeams(data))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false))
  }, [])

  const top3 = teams.slice(0, 3)

  return (
    <div className="page">
      <div className="section-head" style={{ marginTop: 4 }}>
        <h2 className="section-title">队伍排行榜</h2>
        <span className="text-2nd" style={{ fontSize: 13 }}>按积分排名 · 共 {teams.length} 支队伍</span>
      </div>

      {loading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : (
        <>
          {top3.length > 0 && (
            <div className="podium" style={{ marginBottom: 20 }}>
              {[top3[1], top3[0], top3[2]].filter(Boolean).map((t) => {
                const pos = t === top3[0] ? 0 : t === top3[1] ? 1 : 2
                return <PodiumCard key={t.id} team={t} pos={pos} />
              })}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '22px 0 12px' }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>完整排名</h3>
          </div>
          <div>
            {teams.map((t, i) => (
              <RankRow key={t.id} team={t} displayRank={i + 1} />
            ))}
          </div>
        </>
      )}

      <div style={{ textAlign: 'center', marginTop: 28 }}>
        <Button shape="round" onClick={() => navigate('/schedule')} style={{ borderRadius: 8 }}>
          去看看赛程
        </Button>
      </div>
    </div>
  )
}
