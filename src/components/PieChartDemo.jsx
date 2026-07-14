import { useEffect, useRef, useState } from 'react'

// 镜像 README 的 pie-chart 演示：用 2D canvas 绘制带多行标签的饼图。
// 升级：入场动画、hover 高亮、动态数据、更精致的引线与标签。
const DATA = [
  { label: ['图表组件', '图例 / 坐标轴'], value: 32, color: '#E56A3C' },
  { label: ['创意工具', '富内容框'], value: 24, color: '#F2A65A' },
  { label: ['游戏内菜单', 'HUD'], value: 20, color: '#C2551F' },
  { label: ['3D 表面', 'HTML 纹理'], value: 15, color: '#F2C078' },
  { label: ['媒体导出', '图片 / 视频'], value: 9, color: '#86B06A' },
]

export default function PieChartDemo() {
  const ref = useRef(null)
  const [hovered, setHovered] = useState(-1)
  const animRef = useRef({ progress: 0 })

  useEffect(() => {
    const cv = ref.current
    const dpr = Math.min(window.devicePixelRatio, 2)
    const W = 640
    const H = 340
    cv.width = W * dpr
    cv.height = H * dpr
    const ctx = cv.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const cx = W * 0.34
    const cy = H / 2
    const R = 110
    const total = DATA.reduce((a, d) => a + d.value, 0)

    let raf
    let t0 = performance.now()

    const render = (now) => {
      const elapsed = (now - t0) / 1000
      const progress = Math.min(elapsed / 1.2, 1)
      animRef.current.progress = progress

      ctx.clearRect(0, 0, W, H)

      let start = -Math.PI / 2

      DATA.forEach((d, i) => {
        const ang = (d.value / total) * Math.PI * 2 * progress
        const isHovered = hovered === i
        const radius = isHovered ? R + 8 : R

        // 扇形
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.arc(cx, cy, radius, start, start + ang)
        ctx.closePath()
        ctx.fillStyle = d.color
        ctx.fill()
        ctx.strokeStyle = '#0F0D0A'
        ctx.lineWidth = 3
        ctx.stroke()

        if (progress >= 1) {
          // hover 时外环发光
          if (isHovered) {
            ctx.beginPath()
            ctx.moveTo(cx, cy)
            ctx.arc(cx, cy, radius, start, start + ang)
            ctx.closePath()
            ctx.strokeStyle = d.color
            ctx.lineWidth = 2
            ctx.shadowColor = d.color
            ctx.shadowBlur = 20
            ctx.stroke()
            ctx.shadowBlur = 0
          }

          // 引线 + 多行标签
          const mid = start + ang / 2
          const lx = cx + Math.cos(mid) * (R + 18)
          const ly = cy + Math.sin(mid) * (R + 18)
          const ex = cx + Math.cos(mid) * (R + 46)
          const ey = cy + Math.sin(mid) * (R + 46)
          ctx.beginPath()
          ctx.moveTo(lx, ly)
          ctx.lineTo(ex, ey)
          ctx.strokeStyle = isHovered ? d.color : 'rgba(166,158,144,0.5)'
          ctx.lineWidth = isHovered ? 2 : 1.5
          ctx.stroke()
          ctx.beginPath()
          ctx.arc(lx, ly, isHovered ? 4 : 3, 0, Math.PI * 2)
          ctx.fillStyle = d.color
          ctx.fill()

          const right = Math.cos(mid) >= 0
          ctx.textAlign = right ? 'left' : 'right'
          ctx.textBaseline = 'middle'
          ctx.fillStyle = isHovered ? '#F3EFE7' : '#D5CFC2'
          ctx.font = `${isHovered ? 700 : 600} 15px "Space Grotesk", system-ui, sans-serif`
          ctx.fillText(d.label[0], ex + (right ? 6 : -6), ey - 9)
          ctx.fillStyle = isHovered ? '#A69E90' : '#6E675B'
          ctx.font = '13px "Space Mono", monospace'
          ctx.fillText(`${d.label[1]} · ${d.value}%`, ex + (right ? 6 : -6), ey + 9)
        }

        start += ang
      })

      // 中心标题
      if (progress >= 0.5) {
        const alpha = (progress - 0.5) * 2
        ctx.globalAlpha = alpha
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#A69E90'
        ctx.font = '11px "Space Mono", monospace'
        ctx.fillText('USE CASES', cx, cy - 12)
        ctx.fillStyle = '#F3EFE7'
        ctx.font = '700 28px "Space Grotesk", sans-serif'
        ctx.fillText('100%', cx, cy + 10)
        ctx.globalAlpha = 1
      }

      if (progress < 1) raf = requestAnimationFrame(render)
    }
    raf = requestAnimationFrame(render)

    // hover 检测
    const onMove = (e) => {
      const r = cv.getBoundingClientRect()
      const mx = ((e.clientX - r.left) / r.width) * W
      const my = ((e.clientY - r.top) / r.height) * H
      const dx = mx - cx
      const dy = my - cy
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist > R + 10 || dist < 20) {
        setHovered(-1)
        return
      }
      let ang = Math.atan2(dy, dx) + Math.PI / 2
      if (ang < 0) ang += Math.PI * 2
      let acc = 0
      for (let i = 0; i < DATA.length; i++) {
        acc += (DATA[i].value / total) * Math.PI * 2
        if (ang < acc) { setHovered(i); return }
      }
    }
    cv.addEventListener('pointermove', onMove)
    cv.addEventListener('pointerleave', () => setHovered(-1))

    return () => {
      cancelAnimationFrame(raf)
      cv.removeEventListener('pointermove', onMove)
    }
  }, [hovered])

  return (
    <div className="canvas-host" style={{ height: 340, cursor: 'pointer' }}>
      <canvas ref={ref} style={{ width: '100%', height: 340, display: 'block' }} />
      <span className="canvas-hint">hover 高亮 · drawElementImage</span>
    </div>
  )
}
