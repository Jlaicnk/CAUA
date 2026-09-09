export function formatDate(datetime) {
  if (!datetime) return ''
  return datetime.replace('T', ' ').slice(0, 16)
}

export function formatDateRange(start, end) {
  return `${start} ~ ${end}`
}

export const STATUS_ORDER = { ongoing: 0, scheduled: 1, finished: 2 }

const FORMAT_LABEL = {
  swiss: '晋级瑞士轮',
  knockout: '淘汰赛',
  league: '循环赛',
  double_elim: '双败淘汰',
}
export function formatLabel(fmt) {
  return FORMAT_LABEL[fmt] || fmt || ''
}

export function roundDate(startDate, round, intervalDays = 3) {
  if (!startDate) return ''
  const d = new Date(startDate + 'T00:00:00')
  d.setDate(d.getDate() + (round - 1) * intervalDays)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
