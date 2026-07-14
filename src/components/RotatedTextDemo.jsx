import { useEffect, useRef } from 'react'

// 镜像 README 的 complex-text 演示：把旋转后的富文本绘制进 canvas（2D API 直接绘制）。
// 升级：更多文本行、3D 透视感、鼠标交互、彩色渐变流动。
export default function RotatedTextDemo() {
  const ref = useRef(null)

  useEffect(() => {
    const cv = ref.current
    const dpr = Math.min(window.devicePixelRatio, 2)
    const W = 640
    const H = 320
    cv.width = W * dpr
    cv.height = H * dpr
    const ctx = cv.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const lines = [
      { t: 'HTML-in-Canvas', s: 38, c: ['#E56A3C', '#F2A65A'], weight: 700 },
      { t: '在画布中渲染 HTML', s: 30, c: ['#F2A65A', '#E56A3C'], weight: 600 },
      { t: 'drawElementImage()', s: 26, c: ['#F8C489', '#E56A3C'], weight: 700 },
      { t: '富文本 · 旋转 · 高质量', s: 22, c: ['#E56A3C', '#F2A65A'], weight: 500 },
      { t: '2D / 3D · 可访问 · 高性能', s: 18, c: ['#F2A65A', '#F8C489'], weight: 400 },
    ]

    const mouse = { x: W / 2, y: H / 2 }
    const onMove = (e) => {
      const r = cv.getBoundingClientRect()
      mouse.x = ((e.clientX - r.left) / r.width) * W
      mouse.y = ((e.clientY - r.top) / r.height) * H
    }
    cv.addEventListener('pointermove', onMove)

    let raf
    let t0 = performance.now()
    const render = (now) => {
      const time = (now - t0) / 1000
      ctx.clearRect(0, 0, W, H)

      // 流动网格背景
      ctx.strokeStyle = 'rgba(229,106,60,0.04)'
      for (let y = 0; y <= H; y += 24) {
        const off = Math.sin(time * 0.5 + y * 0.02) * 3
        ctx.beginPath()
        ctx.moveTo(0, y + off)
        ctx.lineTo(W, y + off)
        ctx.stroke()
      }

      const cx = W / 2
      const cy = H / 2
      // 鼠标偏移影响整体倾斜
      const tiltX = (mouse.x - cx) / cx * 0.08
      const tiltY = (mouse.y - cy) / cy * 0.04

      lines.forEach((l, i) => {
        const base = (i - (lines.length - 1) / 2) * 50
        const ang = Math.sin(time * 0.6 + i) * 0.10 + (i - 2) * 0.03 + tiltX
        const yOffset = Math.sin(time * 0.8 + i * 0.5) * 4
        const scale = 1 + Math.sin(time * 1.2 + i) * 0.02

        ctx.save()
        ctx.translate(cx + tiltX * 20, cy + base + yOffset)
        ctx.rotate(ang)
        ctx.scale(scale, scale)

        ctx.font = `${l.weight} ${l.s}px "Space Grotesk", "Noto Sans SC", system-ui, sans-serif`
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        // 流动渐变
        const grad = ctx.createLinearGradient(-180, 0, 180, 0)
        const shift = (time * 0.1 + i * 0.15) % 1
        grad.addColorStop(Math.max(0, Math.min(1, shift - 0.5)), l.c[0])
        grad.addColorStop(Math.max(0, Math.min(1, shift)), l.c[1])
        grad.addColorStop(Math.max(0, Math.min(1, shift + 0.5)), l.c[0])
        ctx.fillStyle = grad
        ctx.shadowColor = 'rgba(229,106,60,0.25)'
        ctx.shadowBlur = 18
        ctx.fillText(l.t, 0, 0)
        ctx.restore()
      })

      raf = requestAnimationFrame(render)
    }
    raf = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(raf)
      cv.removeEventListener('pointermove', onMove)
    }
  }, [])

  return (
    <div className="canvas-host" style={{ height: 320, cursor: 'crosshair' }}>
      <canvas ref={ref} style={{ width: '100%', height: 320, display: 'block' }} />
      <span className="canvas-hint">鼠标交互 · drawElementImage</span>
    </div>
  )
}
