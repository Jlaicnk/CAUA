import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Skeleton, Modal, Button } from 'antd'
import { PlayCircleFilled, RightOutlined } from '@ant-design/icons'
import BannerCarousel from '../components/BannerCarousel'
import { MatchCard, TeamLogo } from '../components/MatchCard'
import { getHome } from '../api/home'
import { getMatches } from '../api/tournaments'
import { mediaUrl } from '../utils/mediaUrl'
import { getTeams } from '../api/teams'
import { formatDate } from '../utils/format'

function FocusMatch({ match }) {
  const navigate = useNavigate()
  const { home_team: home, away_team: away, home_score: hs, away_score: as, match_date: date, status } = match
  const live = status === 'ongoing'
  const hasScore = hs != null && as != null
  const openTeam = (e, id) => {
    e.stopPropagation()
    navigate(`/teams/${id}`)
  }
  return (
    <div className="focus-match">
      <div className="focus-match-top">
        <span>{formatDate(date)}</span>
        {live ? (
          <span className="tag-pill tag-pill-ongoing" style={{ gap: 6 }}>
            <span className="dot-live" /> 进行中
          </span>
        ) : (
          <span className="tag-pill tag-pill-scheduled">即将开始</span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div className="focus-team" onClick={(e) => openTeam(e, home.id)} style={{ justifyContent: 'flex-start' }}>
          <TeamLogo logo={home.logo} name={home.name} size={30} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{home.name}</span>
        </div>
        <div className="focus-team-center" style={{ flexShrink: 0, minWidth: 66 }}>
          {hasScore ? (
            <span className="focus-score">
              {hs} : {as}
            </span>
          ) : (
            <span className="focus-vs">VS</span>
          )}
        </div>
        <div className="focus-team" onClick={(e) => openTeam(e, away.id)} style={{ justifyContent: 'flex-end' }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{away.name}</span>
          <TeamLogo logo={away.logo} name={away.name} size={30} />
        </div>
      </div>
    </div>
  )
}

function HomeRight({ matches, loading }) {
  const navigate = useNavigate()
  return (
    <div className="focus-card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div
        style={{
          padding: '16px 16px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span style={{ fontWeight: 800, fontSize: 15 }}>🔥 今日焦点</span>
        <span
          className="section-link"
          onClick={() => navigate('/schedule')}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}
        >
          全部赛程 <RightOutlined style={{ fontSize: 10 }} />
        </span>
      </div>
      <div style={{ flex: 1 }}>
        {loading ? (
          <div style={{ padding: '0 16px 16px' }}>
            <Skeleton active paragraph={{ rows: 2 }} title={false} />
            <Skeleton active paragraph={{ rows: 2 }} title={false} />
          </div>
        ) : matches.length === 0 ? (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-2nd)', fontSize: 13 }}>
            近期暂无赛事安排
          </div>
        ) : (
          matches.slice(0, 3).map((m) => <FocusMatch key={m.id} match={m} />)
        )}
      </div>
    </div>
  )
}

function TeamMini({ team }) {
  const navigate = useNavigate()
  return (
    <div className="mini-rank-row" onClick={() => navigate(`/teams/${team.id}`)}>
      <span className={`mini-rank-no ${team.rank <= 3 ? `top${team.rank}` : ''}`}>{team.rank}</span>
      <TeamLogo logo={team.logo} name={team.name} size={28} />
      <span className="mini-rank-name">{team.name}</span>
      <RightOutlined style={{ color: 'var(--text-3rd)', fontSize: 11 }} />
    </div>
  )
}

function SidePanel({ title, children, extra }) {
  return (
    <div className="mini-rank">
      <div className="mini-rank-head">
        {title}
        {extra && <span style={{ marginLeft: 'auto' }}>{extra}</span>}
      </div>
      {children}
    </div>
  )
}

export default function Home() {
  const [home, setHome] = useState(null)
  const [matches, setMatches] = useState([])
  const [topTeams, setTopTeams] = useState([])
  const [loading, setLoading] = useState(true)
  const [playing, setPlaying] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    let alive = true
    Promise.all([getHome(), getMatches(), getTeams()])
      .then(([homeRes, matchRes, teamRes]) => {
        if (!alive) return
        setHome(homeRes.data)
        const list = matchRes.data
        const focus = [...list].filter((m) => m.status === 'ongoing')
          .concat([...list].filter((m) => m.status === 'scheduled'))
          .concat([...list].filter((m) => m.status === 'finished'))
        setMatches(focus)
        setTopTeams(teamRes.data.slice(0, 5))
      })
      .catch((e) => console.error('home load error', e))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  const openVideo = (feed) => {
    if (!feed.video) return
    setPlaying({ title: feed.title, video: feed.video })
  }

  if (loading) {
    return (
      <div className="page">
        <Skeleton active paragraph={{ rows: 6 }} />
      </div>
    )
  }

  const ongoingCount = matches.filter((m) => m.status === 'ongoing').length
  const recent = matches.length ? matches : []
  const feeds = home?.feeds || []

  return (
    <div className="page">
      {/* Hero: banner + focus */}
      <div className="home-hero">
        <BannerCarousel banners={home?.banners || []} />
        <HomeRight matches={recent} loading={false} />
      </div>

      {/* Recent matches */}
      {recent.length > 0 && (
        <>
          <div className="section-head">
            <h2 className="section-title">{ongoingCount > 0 ? '正在进行' : '近期赛事'}</h2>
            <span className="section-link" onClick={() => navigate('/schedule')}>
              全部赛程 <RightOutlined style={{ fontSize: 10 }} />
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
            {recent.slice(0, 4).map((m) => (
              <MatchCard key={m.id} match={m} showTournament={false} />
            ))}
          </div>
        </>
      )}

      {/* videos + top teams */}
      <div className="home-two-col" style={{ marginTop: 8 }}>
        <div>
          <div className="section-head">
            <h2 className="section-title">精彩视频</h2>
          </div>
          {feeds.length === 0 ? (
            <div className="page-empty" style={{ border: '1px solid var(--border)', borderRadius: 16 }}>
              暂无视频内容
            </div>
          ) : (
            <div className="video-grid">
              {feeds.map((feed) => (
                <div key={feed.id} className="video-card" onClick={() => openVideo(feed)}>
                  <div className="video-cover">
                    <img src={mediaUrl(feed.cover)} alt={feed.title} loading="lazy" />
                    <div className="video-play-badge">
                      <span>
                        <PlayCircleFilled />
                      </span>
                    </div>
                  </div>
                  <div className="video-title">{feed.title}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="section-head">
            <h2 className="section-title">队伍 Top 5</h2>
          </div>
          <SidePanel>
            {topTeams.map((t) => (
              <TeamMini key={t.id} team={t} />
            ))}
          </SidePanel>
          <Button
            block
            style={{ marginTop: 10, borderRadius: 10 }}
            onClick={() => navigate('/teams')}
          >
            查看完整排行
          </Button>
        </div>
      </div>

      <Modal
        open={!!playing}
        title={playing?.title}
        footer={null}
        width={860}
        onCancel={() => setPlaying(null)}
      >
        {playing && <video src={playing.video} controls autoPlay className="video-modal-player" />}
      </Modal>
    </div>
  )
}
