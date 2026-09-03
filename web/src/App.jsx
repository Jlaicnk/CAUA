import { Suspense, lazy, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { HomeOutlined, TrophyOutlined, TeamOutlined, UserOutlined, LoginOutlined, DownOutlined, FlagOutlined, CalendarOutlined } from '@ant-design/icons'
import { Avatar, Button, Dropdown, message, Spin } from 'antd'
import { useAuth } from './context/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'

const Home = lazy(() => import('./pages/Home'))
const Schedule = lazy(() => import('./pages/Schedule'))
const TournamentList = lazy(() => import('./pages/TournamentList'))
const TournamentDetail = lazy(() => import('./pages/TournamentDetail'))
const Teams = lazy(() => import('./pages/Teams'))
const TeamDetail = lazy(() => import('./pages/TeamDetail'))
const PlayerDetail = lazy(() => import('./pages/PlayerDetail'))
const Profile = lazy(() => import('./pages/Profile'))
const Login = lazy(() => import('./pages/Login'))
const Register = lazy(() => import('./pages/Register'))
const FavoriteTeam = lazy(() => import('./pages/FavoriteTeam'))

function LogoLink() {
  const navigate = useNavigate()
  return (
    <div className="logo" onClick={() => navigate('/')}>
      <span className="logo-badge">⚽</span>
      <span className="logo-name">
        CAUA <strong>赛事平台</strong>
      </span>
    </div>
  )
}

function NavLink({ path, label, onNavigate }) {
  const location = useLocation()
  const isActive = () => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }
  return (
    <span className={`nav-item ${isActive() ? 'active' : ''}`} onClick={() => onNavigate(path)}>
      {label}
    </span>
  )
}

function EventsDropdown({ onNavigate }) {
  const location = useLocation()
  const inEvents = location.pathname.startsWith('/schedule') || location.pathname.startsWith('/tournaments')
  const current = location.pathname.startsWith('/tournaments')
    ? '赛事列表'
    : location.pathname.startsWith('/schedule')
      ? '赛程'
      : ''
  const label = inEvents && current ? current : '赛事中心'

  const menu = {
    items: [
      { key: 'schedule', label: '赛程', icon: <CalendarOutlined /> },
      { key: 'tournaments', label: '赛事列表', icon: <FlagOutlined /> },
    ],
    onClick: ({ key }) => onNavigate(key === 'schedule' ? '/schedule' : '/tournaments'),
    selectable: false,
  }

  return (
    <Dropdown menu={menu} placement="bottom" trigger={['hover']}>
      <span className={`nav-item ${inEvents ? 'active' : ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <TrophyOutlined />
        {label}
        <DownOutlined style={{ fontSize: 10 }} />
      </span>
    </Dropdown>
  )
}

function TopNav() {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const userMenu = {
    items: [
      { key: 'profile', label: '我的主页', icon: <UserOutlined /> },
      { key: 'favorite', label: '更换主队' },
      { type: 'divider' },
      { key: 'logout', label: '退出登录', danger: true },
    ],
    onClick: ({ key }) => {
      if (key === 'profile') navigate('/profile')
      else if (key === 'favorite') navigate('/favorite-team')
      else if (key === 'logout') {
        logout()
        message.success('已退出登录')
        navigate('/')
      }
    },
  }

  return (
    <header className="top-nav">
      <div className="top-nav-inner">
        <LogoLink />
        <nav className="top-nav-links">
          <NavLink path="/" label="首页" onNavigate={navigate} />
          <EventsDropdown onNavigate={navigate} />
          <NavLink path="/teams" label="队伍排行" onNavigate={navigate} />
          <NavLink path="/profile" label="我的" onNavigate={navigate} />
        </nav>
        <div className="top-nav-user">
          {user ? (
            <Dropdown menu={userMenu} placement="bottomRight">
              <div className="nav-user-box">
                <Avatar
                  size={32}
                  src={user.avatar || undefined}
                  style={{ background: 'linear-gradient(135deg,#f45b8d,#ff8fae)', flexShrink: 0 }}
                >
                  {user.username?.charAt(0)?.toUpperCase()}
                </Avatar>
                <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{user.username}</span>
              </div>
            </Dropdown>
          ) : (
            <Button type="primary" icon={<LoginOutlined />} onClick={() => navigate('/login')}>
              登录 / 注册
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}

function BottomTab() {
  const navigate = useNavigate()
  const location = useLocation()
  const items = [
    { path: '/', label: '首页', icon: <HomeOutlined /> },
    { path: '/schedule', label: '赛事', icon: <TrophyOutlined /> },
    { path: '/teams', label: '队伍', icon: <TeamOutlined /> },
    { path: '/profile', label: '我的', icon: <UserOutlined /> },
  ]
  return (
    <nav className="bottom-tab">
      {items.map((item) => {
        const active =
          item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path)
        return (
          <div
            key={item.path}
            className={`bottom-tab-item ${active ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            {item.icon}
            <span>{item.label}</span>
            <span className="bottom-tab-dot" />
          </div>
        )
      })}
    </nav>
  )
}

function PageLoader() {
  return (
    <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Spin size="large" />
    </div>
  )
}

export default function App() {
  const location = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <div className="main-layout">
      <TopNav />
      <ErrorBoundary key={location.pathname}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/tournaments" element={<TournamentList />} />
            <Route path="/tournaments/:id" element={<TournamentDetail />} />
            <Route path="/teams" element={<Teams />} />
            <Route path="/teams/:id" element={<TeamDetail />} />
            <Route path="/players/:id" element={<PlayerDetail />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/favorite-team" element={<FavoriteTeam />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
      <BottomTab />
    </div>
  )
}
