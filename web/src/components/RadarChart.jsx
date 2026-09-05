// 手写 SVG 六边形雷达图 —— 展示六维能力 (射门/传球/力量/防守/速度/盘带)
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

export default function RadarChart({ values = {}, size = 280, max = 100 }) {
  const cx = size / 2
  const cy = size / 2
  const radius = size / 2 - 34 // leave room for labels
  const count = AXES.length
  const rings = [0.25, 0.5, 0.75, 1]

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* 背景网格 */}
      {rings.map((r) => (
        <polygon
          key={r}
          points={polygonPoints(cx, cy, radius * r, count, null)}
          fill="none"
          stroke="#f0cfdb"
          strokeWidth={1}
        />
      ))}
      {/* 轴线 */}
      {AXES.map((_, i) => {
        const [x, y] = polar(cx, cy, radius, (360 / count) * i)
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#f0cfdb" strokeWidth={1} />
      })}
      {/* 数值区域 */}
      <polygon
        points={polygonPoints(cx, cy, radius, count, values, max)}
        fill="rgba(244,91,141,0.25)"
        stroke="#f45b8d"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {/* 顶点圆点 + 数值 */}
      {AXES.map((ax, i) => {
        const v = values[ax.key] ?? 0
        const [px, py] = polar(cx, cy, (radius * v) / max, (360 / count) * i)
        const [lx, ly] = polar(cx, cy, radius + 16, (360 / count) * i)
        const anchor = lx > cx + 4 ? 'start' : lx < cx - 4 ? 'end' : 'middle'
        const textY = ly > cy ? ly + 14 : ly - 6
        return (
          <g key={ax.key}>
            <circle cx={px} cy={py} r={3} fill="#f45b8d" />
            <text x={lx} y={textY} textAnchor={anchor} fontSize={11} fontWeight={700} fill="#dc4678">
              {ax.label}
            </text>
            <text x={lx} y={textY + 13} textAnchor={anchor} fontSize={12} fontWeight={800} fill="#3d3a50">
              {v}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
