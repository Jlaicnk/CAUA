import { DIMENSIONS } from '../utils/playerStats'

const AXES = DIMENSIONS

function polar(cx, cy, radius, angleDeg) {
  const a = ((angleDeg - 90) * Math.PI) / 180
  return [cx + radius * Math.cos(a), cy + radius * Math.sin(a)]
}

function polygonPoints(cx, cy, radius, count, values, max = 100) {
  return AXES.map((ax, i) => {
    const v = values ? (values[ax.key] ?? 0) : 0
    return polar(cx, cy, (radius * v) / max, (360 / count) * i).join(',')
  }).join(' ')
}

export default function CompareRadar({ valuesA = {}, valuesB = {}, nameA = 'A', nameB = 'B', size = 340, max = 100 }) {
  const cx = size / 2
  const cy = size / 2
  const radius = size / 2 - 42
  const count = AXES.length
  const rings = [0.25, 0.5, 0.75, 1]

  const renderSeries = (values, stroke, fill) => (
    <>
      <polygon
        points={polygonPoints(cx, cy, radius, count, values, max)}
        fill={fill}
        stroke={stroke}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {AXES.map((ax, i) => {
        const [px, py] = polar(cx, cy, (radius * (values[ax.key] ?? 0)) / max, (360 / count) * i)
        return <circle key={ax.key} cx={px} cy={py} r={3} fill={stroke} />
      })}
    </>
  )

  return (
    <div className="pc-radar-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {rings.map((r) => (
          <polygon
            key={r}
            points={polygonPoints(cx, cy, radius * r, count, null)}
            fill="none"
            stroke="#ece3ef"
            strokeWidth={1}
          />
        ))}
        {AXES.map((_, i) => {
          const [x, y] = polar(cx, cy, radius, (360 / count) * i)
          return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#ece3ef" strokeWidth={1} />
        })}
        {renderSeries(valuesB, '#369ed8', 'rgba(54,158,216,0.18)')}
        {renderSeries(valuesA, '#f45b8d', 'rgba(244,91,141,0.2)')}
        {AXES.map((ax, i) => {
          const [lx, ly] = polar(cx, cy, radius + 24, (360 / count) * i)
          const anchor = lx > cx + 4 ? 'start' : lx < cx - 4 ? 'end' : 'middle'
          const textY = ly > cy ? ly + 12 : ly - 4
          return (
            <text key={ax.key} x={lx} y={textY} textAnchor={anchor} fontSize={12} fontWeight={700} fill="#6f6879">
              {ax.label}
            </text>
          )
        })}
      </svg>
      <div className="pc-radar-legend">
        <span className="pc-legend-a">{nameA}</span>
        <span className="pc-legend-b">{nameB}</span>
      </div>
    </div>
  )
}
