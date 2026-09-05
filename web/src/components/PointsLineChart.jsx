// 积分变动折线图（SVG 手写）—— 最近 N 场比赛的累计积分走势
export default function PointsLineChart({ points = [], labels = [], width = 640, height = 220 }) {
  if (!points || points.length < 2) {
    return <div className="text-2nd" style={{ padding: 30, textAlign: 'center', fontSize: 13 }}>暂无积分走势</div>
  }

  const pad = 30
  const innerW = width - pad * 2
  const innerH = height - 46
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const yTop = pad
  const yBottom = pad + innerH

  const x = (i) => pad + (innerW * i) / (points.length - 1)
  const y = (v) => yBottom - ((v - min) / range) * innerH

  // gridlines: ~4 horizontal
  const gridVals = []
  for (let g = 0; g <= 4; g++) gridVals.push(min + (range * g) / 4)

  const path = points.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', maxWidth: '100%' }}>
      {/* grid */}
      {gridVals.map((gv, i) => (
        <g key={i}>
          <line x1={pad} y1={y(gv)} x2={width - pad} y2={y(gv)} stroke="#f3dfe6" strokeWidth={1} />
          <text x={pad - 6} y={y(gv) + 3} textAnchor="end" fontSize={9} fill="#b6a3ad">{Math.round(gv)}</text>
        </g>
      ))}
      {/* x labels: 1..N */}
      {points.map((_, i) => (
        <text key={i} x={x(i)} y={height - 10} textAnchor="middle" fontSize={9} fill="#b6a3ad">
          {labels[i] || i}
        </text>
      ))}
      {/* line */}
      <polyline
        points={points.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')}
        fill="none"
        stroke="#f45b8d"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* dots + value labels */}
      {points.map((v, i) => (
        <g key={i}>
          <circle cx={x(i)} cy={y(v)} r={3.2} fill="#f45b8d" stroke="#fff" strokeWidth={1.5} />
          <text x={x(i)} y={y(v) - 8} textAnchor="middle" fontSize={9.5} fontWeight={700} fill="#3d3a50">
            {v}
          </text>
        </g>
      ))}
    </svg>
  )
}
