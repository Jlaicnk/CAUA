import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Form, Input, Button, App as AntApp, Typography } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useAuth } from '../context/AuthContext'
import { BallIcon } from '../components/BrandIcons'

export default function Login() {
  const { login } = useAuth()
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { message: msg } = AntApp.useApp()

  const onFinish = async (values) => {
    setLoading(true)
    try {
      await login(values.username, values.password)
      msg.success('登录成功')
      navigate('/profile')
    } catch (e) {
      const detail = e?.response?.data?.detail
      msg.error(detail ? `登录失败：${detail}` : '登录失败，请检查用户名和密码')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div className="panel" style={{ padding: 32 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div className="brand-ball-mark">
              <BallIcon size={28} />
            </div>
            <div style={{ fontSize: 21, fontWeight: 800 }}>欢迎回来</div>
            <Typography.Text type="secondary" style={{ fontSize: 14 }}>登录 CAUA 赛事平台</Typography.Text>
          </div>
          <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
            <Form.Item name="username" rules={[{ required: true, message: '请输入用户名' }]}>
              <Input size="large" prefix={<UserOutlined style={{ color: 'var(--text-3rd)' }} />} placeholder="用户名" />
            </Form.Item>
            <Form.Item name="password" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password size="large" prefix={<LockOutlined style={{ color: 'var(--text-3rd)' }} />} placeholder="密码" />
            </Form.Item>
            <Button type="primary" htmlType="submit" size="large" block loading={loading}>
              登录
            </Button>
          </Form>
          <div style={{ textAlign: 'center', marginTop: 20, color: 'var(--text-2nd)' }}>
            还没有账号？{' '}
            <Link to="/register" style={{ color: 'var(--primary-deep)', fontWeight: 600 }}>
              去注册
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
