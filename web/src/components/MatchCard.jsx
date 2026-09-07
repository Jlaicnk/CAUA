import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatDate } from '../utils/format'
import { mediaUrl } from '../utils/mediaUrl'

export function TeamLogo({ logo, name, size = 56, style }) {
  const [broken, setBroken] = useState(false)
  const showInit = !logo || broken
  return (
    <div className="logo-bubble" style={{ width: size, height: size, overflow: 'hidden', ...style }}>
      {!showInit ? (
        <img
          src={mediaUrl(logo)}
          alt={name}
          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          onError={() => setBroken(true)}
        />
      ) : (
        <div className="init-badge" style={{ fontSize: size * 0.38 }}>
          {name?.charAt(0) || '?'}
        </div>
      )}
    </div>
  )
}

function statusMeta(status) {
  switch (status) {
    case 'ongoing':
      return { cls: 'tag-pill tag-pill-ongoing', text: '进行中', live: true }
    case 'finished':
      return { cls: 'tag-pill tag-pill-finished', text: '完场', live: false }
    default:
      return { cls: 'tag-pill tag-pill-scheduled', text: '未开始', live: false }
  }
}

export function MatchCard({ match, showTournament = true }) {
  const navigate = useNavigate()
  const {
    id: matchId,
    home_team: homeTeam,
    away_team: awayTeam,
    home_score: homeScore,
    away_score: awayScore,
    match_date: matchDate,
    status,
    tournament_name: tournamentName,
  } = match
  const meta = statusMeta(status)
  const hasScore = homeScore != null && awayScore != null

  const openTeam = (e, id) => {
    e.stopPropagation()
    navigate(`/teams/${id}`)
  }

  const openMatch = (e) => {
    e.stopPropagation()
    if (matchId != null) navigate(`/matches/${matchId}`)
  }

  return (
    <div className="match-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          {showTournament && tournamentName && (
            <span className="text-2nd" style={{ fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {tournamentName}
            </span>
          )}
          <span style={{ color: 'var(--text-3rd)', fontSize: 12 }}>·</span>
          <span className="text-2nd" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
            {formatDate(matchDate)}
          </span>
        </div>
        <span className={meta.cls}>
          {meta.live && <span className="dot-live" />}
          {meta.text}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', minWidth: 0 }}
          onClick={(e) => openTeam(e, homeTeam.id)}
        >
          <TeamLogo logo={homeTeam.logo} name={homeTeam.name} size={42} />
          <span style={{ fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {homeTeam.name}
          </span>
        </div>

        <div
          onClick={openMatch}
          title="查看比赛详情"
          style={{
            flexShrink: 0, textAlign: 'center', minWidth: 90, padding: '6px 4px', cursor: 'pointer',
            borderRadius: 10, transition: 'background 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(244,91,141,0.08)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        >
          {hasScore ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span style={{ fontSize: 28, fontWeight: 800, fontVariantNumeric: 'tabular-nums', fontFamily: "'Bahnschrift','DIN Alternate','Segoe UI',sans-serif" }}>
                {homeScore}
              </span>
              <span style={{ color: 'var(--text-3rd)', fontWeight: 700 }}>:</span>
              <span style={{ fontSize: 28, fontWeight: 800, fontVariantNumeric: 'tabular-nums', fontFamily: "'Bahnschrift','DIN Alternate','Segoe UI',sans-serif" }}>
                {awayScore}
              </span>
            </div>
          ) : (
            <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-3rd)', letterSpacing: 1 }}>VS</span>
          )}
        </div>

        <div
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, cursor: 'pointer', minWidth: 0 }}
          onClick={(e) => openTeam(e, awayTeam.id)}
        >
          <span style={{ fontWeight: 700, fontSize: 15, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {awayTeam.name}
          </span>
          <TeamLogo logo={awayTeam.logo} name={awayTeam.name} size={42} />
        </div>
      </div>
    </div>
  )
}
