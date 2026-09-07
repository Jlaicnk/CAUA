// 把后端返回的相对媒体路径(/media/...)转成绝对 URL。
// 通过 VITE_API_BASE_URL(如 http://127.0.0.1:8000/api/) 推导出 origin(去掉尾部 /api/)。
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000/api/'
const ORIGIN = API_BASE.replace(/\/api\/?$/, '').replace(/\/$/, '')

export function mediaUrl(url) {
  if (!url) return ''
  if (/^(https?:)?\/\//.test(url)) return url // 已是绝对/协议相对
  if (url.startsWith('/')) return `${ORIGIN}${url}`
  return `${ORIGIN}/${url}`
}
