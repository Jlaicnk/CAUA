const META = {
  ongoing: { cls: 'tag-pill tag-pill-ongoing', text: '进行中', dot: true },
  finished: { cls: 'tag-pill tag-pill-finished', text: '完场', dot: false },
  scheduled: { cls: 'tag-pill tag-pill-scheduled', text: '未开始', dot: false },
}

export default function StatusTag({ status }) {
  const meta = META[status] || META.scheduled
  return (
    <span className={meta.cls}>
      {meta.dot && <span className="dot-live" />}
      {meta.text}
    </span>
  )
}
