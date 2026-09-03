export function formatDate(datetime) {
  if (!datetime) return ''
  return datetime.replace('T', ' ').slice(0, 16)
}

export function formatDateRange(start, end) {
  return `${start} ~ ${end}`
}

export function statusText(status) {
  switch (status) {
    case 'ongoing':
      return '⚽ 进行中'
    case 'finished':
      return '完场'
    default:
      return '即将开始'
  }
}

export function statusPillClass(status) {
  switch (status) {
    case 'ongoing':
      return 'pill-ongoing'
    case 'finished':
      return 'pill-finished'
    default:
      return 'pill-scheduled'
  }
}

export const STATUS_ORDER = { ongoing: 0, scheduled: 1, finished: 2 }
