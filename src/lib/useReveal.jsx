import { useEffect, useRef, useState } from 'react'

// 进入视口时添加 .in 类以触发入场动画
export function useReveal(options = { threshold: 0.12 }) {
  const ref = useRef(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setShown(true)
            io.unobserve(e.target)
          }
        })
      },
      options
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return [ref, shown]
}

// 包裹组件，自动应用 reveal 动画
export function Reveal({ as: Tag = 'div', className = '', children, ...rest }) {
  const [ref, shown] = useReveal()
  return (
    <Tag ref={ref} className={`reveal ${shown ? 'in' : ''} ${className}`} {...rest}>
      {children}
    </Tag>
  )
}
