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

function PodiumCard({ team }) {
  const navigate = useNavigate()
  const rank = team.rank
  const meta = RANK_STYLE[rank]
  return (
    <div
      className={`podium-item ${meta.cls === 'first' ? 'first' : ''}`}
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
      <div className="text-2nd" style={{ marginTop: 6, fontSize: 13 }}>
        综合排名 #{team.rank}
        {team.song && (
          <span style={{ marginLeft: 8, color: 'var(--primary-deep)' }}>
            <PlayCircleFilled /> 有队歌
          </span>
        )}
      </div>
    </div>
  )
}

function RankRow({ team }) {
  const navigate = useNavigate()
  return (
    <div className="rank-row" onClick={() => navigate(`/teams/${team.id}`)}>
      <span className="rank-no">{team.rank}</span>
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
  const rest = teams.slice(3)

  return (
    <div className="page">
      <div className="section-head" style={{ marginTop: 4 }}>
        <h2 className="section-title">队伍排行榜</h2>
        <span className="text-2nd" style={{ fontSize: 13 }}>共 {teams.length} 支队伍</span>
      </div>

      {loading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : (
        <>
          {top3.length > 0 && (
            <div className="podium" style={{ marginBottom: 20 }}>
              {[top3[1], top3[0], top3[2]].filter(Boolean).map((t) => (
                <PodiumCard key={t.id} team={t} />
              ))}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '22px 0 12px' }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800 }}>完整排名</h3>
          </div>
          <div>
            {rest.map((t) => (
              <RankRow key={t.id} team={t} />
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
