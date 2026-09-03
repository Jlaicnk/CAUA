import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Form, Input, Button, App as AntApp, Typography } from 'antd'
import { UserOutlined, LockOutlined } from '@ant-design/icons'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { register } = useAuth()
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { message: msg } = AntApp.useApp()

  const onFinish = async (values) => {
    setLoading(true)
    try {
      await register(values.username, values.password)
      msg.success('注册成功，已自动登录')
      navigate('/profile')
    } catch (e) {
      const detail = e?.response?.data?.username?.[0] || e?.response?.data?.detail
      msg.error(detail ? `注册失败：${detail}` : '注册失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        <div className="panel" style={{ padding: 32 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ width: 52, height: 52, margin: '0 auto 12px', borderRadius: 16, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>⚽</div>
            <div style={{ fontSize: 21, fontWeight: 800 }}>创建账号</div>
            <Typography.Text type="secondary" style={{ fontSize: 14 }}>加入 CAUA 赛事平台</Typography.Text>
          </div>
          <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
            <Form.Item
              name="username"
              rules={[
                { required: true, message: '请输入用户名' },
                { min: 3, message: '用户名至少 3 个字符' },
              ]}
            >
              <Input size="large" prefix={<UserOutlined style={{ color: 'var(--text-3rd)' }} />} placeholder="用户名" />
            </Form.Item>
            <Form.Item
              name="password"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码至少 6 位' },
              ]}
            >
              <Input.Password size="large" prefix={<LockOutlined style={{ color: 'var(--text-3rd)' }} />} placeholder="密码（至少 6 位）" />
            </Form.Item>
            <Form.Item
              name="confirm"
              dependencies={['password']}
              rules={[
                { required: true, message: '请再次输入密码' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) return Promise.resolve()
                    return Promise.reject(new Error('两次输入的密码不一致'))
                  },
                }),
              ]}
            >
              <Input.Password size="large" prefix={<LockOutlined style={{ color: 'var(--text-3rd)' }} />} placeholder="确认密码" />
            </Form.Item>
            <Button type="primary" htmlType="submit" size="large" block loading={loading}>
              注册
            </Button>
          </Form>
          <div style={{ textAlign: 'center', marginTop: 20, color: 'var(--text-2nd)' }}>
            已有账号？{' '}
            <Link to="/login" style={{ color: 'var(--primary-deep)', fontWeight: 600 }}>
              去登录
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
