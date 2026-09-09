import { useState } from 'react'
import { TrophyOutlined } from '@ant-design/icons'
import { mediaUrl } from '../utils/mediaUrl'

const TIER_META = {
  legend: { label: '殿堂级', cls: 'honor-legend' },
  gold: { label: '金', cls: 'honor-gold' },
  silver: { label: '银', cls: 'honor-silver' },
  bronze: { label: '铜', cls: 'honor-bronze' },
}

function HonorCard({ honor }) {
  const [broken, setBroken] = useState(false)
  const meta = TIER_META[honor.tier] || TIER_META.gold
  const showImage = honor.tier === 'legend' && honor.image && !broken

  return (
    <div className={`honor-card ${meta.cls}`} title={honor.note || undefined}>
      <div className="honor-visual">
        {showImage ? (
          <>
            <img src={mediaUrl(honor.image)} alt={honor.name} onError={() => setBroken(true)} />
            <span className="honor-visual-tag">殿堂级</span>
          </>
        ) : (
          <>
            <span className="honor-medal-icon">
              <TrophyOutlined />
            </span>
            <span className="honor-tier-label">{meta.label}</span>
          </>
        )}
      </div>
      <div className="honor-body">
        <b className="honor-name">{honor.name}</b>
        <span className="honor-tournament">{honor.tournament_name}</span>
        {honor.note && <p className="honor-note">{honor.note}</p>}
      </div>
    </div>
  )
}

export default function HonorWall({ honors = [] }) {
  if (!honors || honors.length === 0) return null
  return (
    <div className="honor-grid">
      {honors.map((h) => (
        <HonorCard key={h.id} honor={h} />
      ))}
    </div>
  )
}
