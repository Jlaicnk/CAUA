import { useEffect, useRef, useState } from 'react'
import { Carousel } from 'antd'

export default function BannerCarousel({ banners }) {
  const ref = useRef(null)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!banners || banners.length <= 1) return undefined
    const timer = setInterval(() => {
      ref.current?.next()
    }, 4000)
    return () => clearInterval(timer)
  }, [banners])

  if (!banners || banners.length === 0) return null

  return (
    <div className="banner-wrap">
      <Carousel
        ref={ref}
        autoplay={banners.length > 1}
        autoplaySpeed={4000}
        beforeChange={(_, next) => setIndex(next)}
      >
        {banners.map((b) => (
          <div key={b.id} className="banner-slide">
            <img src={b.image} alt={b.title} />
            {b.title && (
              <>
                <div className="banner-slide-mask" />
                <div className="banner-slide-title">{b.title}</div>
              </>
            )}
          </div>
        ))}
      </Carousel>
      {banners.length > 1 && (
        <div
          style={{
            position: 'absolute',
            bottom: 14,
            right: 20,
            display: 'flex',
            gap: 6,
            zIndex: 2,
          }}
        >
          {banners.map((b, i) => (
            <span
              key={b.id}
              style={{
                width: 8,
                height: 8,
                borderRadius: 99,
                background: i === index ? '#fff' : 'rgba(255,255,255,0.5)',
                display: 'inline-block',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
