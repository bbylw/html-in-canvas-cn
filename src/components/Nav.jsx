import { useEffect, useState } from 'react'

const links = [
  { href: '#motivation', label: '动机' },
  { href: '#proposal', label: '提案方案' },
  { href: '#pipeline', label: '渲染管线' },
  { href: '#demo', label: '3D 立方体' },
  { href: '#examples', label: '示例' },
  { href: '#demos', label: '演示' },
  { href: '#security', label: '安全' },
  { href: '#alt', label: '设计取舍' },
  { href: '#authors', label: '作者' },
]

export default function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [active, setActive] = useState('')

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id)
        })
      },
      { rootMargin: '-45% 0px -50% 0px' }
    )
    links.forEach((l) => {
      const el = document.getElementById(l.href.slice(1))
      if (el) obs.observe(el)
    })
    return () => obs.disconnect()
  }, [])

  return (
    <nav className={`nav ${scrolled ? 'scrolled' : ''}`}>
      <div className="brand">
        <span className="logo">&lt;/&gt;</span>
        <span>
          <b>HTML</b>-in-Canvas
        </span>
      </div>
      <div className="links">
        {links.map((l) => (
          <a key={l.href} href={l.href} className={active === l.href.slice(1) ? 'active' : ''}>
            {l.label}
          </a>
        ))}
      </div>
      <a className="flag" href="https://chromium.googlesource.com" target="_blank" rel="noreferrer">
        chrome://flags
      </a>
    </nav>
  )
}
