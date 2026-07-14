import { useEffect, useState } from 'react'

// 制版索引栏：固定在左侧的"图纸标题栏"，用细引线 + 编号标记阅读顺序（页面是一次提案导览）。
const items = [
  { href: 'status', n: '00' },
  { href: 'motivation', n: '01' },
  { href: 'proposal', n: '02' },
  { href: 'pipeline', n: '03' },
  { href: 'demo', n: '04' },
  { href: 'examples', n: '05' },
  { href: 'demos', n: '06' },
  { href: 'security', n: '07' },
  { href: 'alt', n: '08' },
  { href: 'authors', n: '09' },
]

export default function Rail() {
  const [active, setActive] = useState('')

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id)
        })
      },
      { rootMargin: '-45% 0px -50% 0px' }
    )
    items.forEach((l) => {
      const el = document.getElementById(l.href)
      if (el) obs.observe(el)
    })
    return () => obs.disconnect()
  }, [])

  return (
    <nav className="rail" aria-label="章节索引">
      {items.map((l) => (
        <a key={l.href} href={`#${l.href}`} className={active === l.href ? 'active' : ''}>
          <span className="tick" />
          <span className="num">{l.n}</span>
        </a>
      ))}
    </nav>
  )
}
