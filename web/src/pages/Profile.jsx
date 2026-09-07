import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Button, Upload, Skeleton, App as AntApp } from 'antd'
import { UserOutlined, LogoutOutlined, HeartOutlined, LoginOutlined, CameraOutlined, RightOutlined, TeamOutlined } from '@ant-design/icons'
import { useAuth } from '../context/AuthContext'
import { uploadAvatar } from '../api/auth'
import { TeamLogo } from '../components/MatchCard'
import { mediaUrl } from '../utils/mediaUrl'

export default function Profile() {
  const { user, loading, logout, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { message: msg } = AntApp.useApp()
  const [uploading, setUploading] = useState(false)

  const handleAvatar = async (file) => {
    setUploading(true)
    try {
      await uploadAvatar(file)
      msg.success('头像已更新')
      await refreshProfile()
    } catch (e) {
      msg.error('头像上传失败')
    } finally {
      setUploading(false)
    }
    return false
  }

  if (loading) {
    return (
      <div className="page">
        <Skeleton active avatar paragraph={{ rows: 4 }} />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="page" style={{ maxWidth: 480 }}>
        <div className="panel" style={{ textAlign: 'center', padding: 44, marginTop: 40 }}>
          <div style={{ fontSize: 54, marginBottom: 16 }}>⚽</div>
          <div style={{ fontSize: 20, fontWeight: 800 }}>还没登录</div>
          <div className="text-2nd" style={{ margin: '10px 0 26px', lineHeight: 1.8 }}>
            登录后可选择主队、上传头像
            <br />
            为你支持的队伍加油
          </div>
          <Button type="primary" size="large" icon={<LoginOutlined />} onClick={() => navigate('/login', { state: { from: location.pathname } })}>
            登录 / 注册
          </Button>
        </div>
      </div>
    )
  }

  const fav = user.favorite_team

  return (
    <div className="page" style={{ maxWidth: 680 }}>
      {/* 用户信息卡 */}
      <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ height: 84, background: 'linear-gradient(180deg, var(--primary-soft), #ffffff)' }} />
        <div style={{ padding: '0 28px 28px', textAlign: 'center', marginTop: -40 }}>
          <div style={{ position: 'relative', width: 84, height: 84, margin: '0 auto' }}>
            <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#fff', padding: 3, border: '1px solid var(--border)', overflow: 'hidden' }}>
              {user.avatar ? (
                <img src={mediaUrl(user.avatar)} alt="avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 800, color: 'var(--primary-deep)', background: 'var(--surface-2)' }}>
                  {user.username?.charAt(0)?.toUpperCase()}
                </div>
              )}
            </div>
            <Upload
              showUploadList={false}
              beforeUpload={handleAvatar}
              accept="image/*"
              disabled={uploading}
            >
              <span
                style={{
                  position: 'absolute',
                  right: -4,
                  bottom: -2,
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: 'var(--primary)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  border: '2px solid #fff',
                }}
              >
                {uploading ? <span style={{ fontSize: 12 }}>…</span> : <CameraOutlined style={{ fontSize: 13 }} />}
              </span>
            </Upload>
          </div>

          <div style={{ fontSize: 22, fontWeight: 800, marginTop: 12 }}>{user.username}</div>
          <div className="text-2nd" style={{ fontSize: 13, marginTop: 4 }}>CAUA 赛事平台会员</div>
        </div>
      </div>

      {/* 主队 */}
      <div className="section-head">
        <h2 className="section-title">我的主队</h2>
      </div>
      <div className="panel" style={{ padding: 18 }}>
        {fav ? (
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 16, cursor: 'pointer' }}
            onClick={() => navigate(`/teams/${fav.id}`)}
          >
            <TeamLogo logo={fav.logo} name={fav.name} size={64} style={{ border: '1px solid var(--border)' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 18 }}>{fav.name}</div>
              <div className="text-2nd" style={{ fontSize: 13, marginTop: 4 }}>综合排名 #{fav.rank}</div>
            </div>
            <RightOutlined className="text-2nd" />
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '14px 0' }}>
            <div className="text-2nd" style={{ marginBottom: 14 }}>
              <TeamOutlined style={{ fontSize: 26, color: 'var(--text-3rd)' }} />
              <div style={{ marginTop: 8 }}>你还没有选择主队</div>
            </div>
            <Button type="primary" icon={<HeartOutlined />} onClick={() => navigate('/favorite-team')}>
              选择主队
            </Button>
          </div>
        )}
        {fav && (
          <div style={{ borderTop: '1px solid var(--border)', marginTop: 16, paddingTop: 14 }}>
            <Button block onClick={() => navigate('/favorite-team')}>
              更换主队
            </Button>
          </div>
        )}
      </div>

      {/* 退出 */}
      <div className="panel" style={{ padding: 10, marginTop: 16 }}>
        <Button
          type="text"
          danger
          block
          icon={<LogoutOutlined />}
          onClick={() => {
            logout()
            msg.success('已退出登录')
            navigate('/')
          }}
        >
          退出登录
        </Button>
      </div>
    </div>
  )
}
