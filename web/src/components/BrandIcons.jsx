// 手绘线性图标：与 Ant Design 图标的圆头细线风格保持一致。
// 颜色跟随 currentColor，用 CSS 或 style.color 控制。

const BASE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

function Svg({ children, size = '1em', ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  )
}

export function BallIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8.6" {...BASE} />
      <polygon
        points="12,8.8 15.05,11 13.9,14.63 10.1,14.63 8.95,11"
        {...BASE}
      />
      <path
        d="M12 8.8V3.4M15.05 11l5.14-1.67M13.9 14.63l3.17 4.36M10.1 14.63l-3.17 4.36M8.95 11l-5.14-1.67"
        {...BASE}
      />
    </Svg>
  )
}

export function SkullIcon(props) {
  return (
    <Svg {...props}>
      <path
        d="M8.3 4.9a5.55 5.55 0 0 1 7.4 0c2.2 1.9 2.8 5.1 1.6 7.7-.7 1.3-1.2 2.2-1.2 3.4v2.2a2.1 2.1 0 0 1-2.1 2.1h-4a2.1 2.1 0 0 1-2.1-2.1v-2.2c0-1.2-.5-2.1-1.2-3.4-1.2-2.6-.6-5.8 1.6-7.7Z"
        {...BASE}
      />
      <circle cx="9.8" cy="11" r="1.05" fill="currentColor" stroke="none" />
      <circle cx="14.2" cy="11" r="1.05" fill="currentColor" stroke="none" />
      <path d="M12 13.8v2.7M9.5 17.4h5" {...BASE} />
    </Svg>
  )
}
