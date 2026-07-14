import { useEffect, useRef, useState } from 'react'
import { renderToCanvas } from '../lib/htmlToCanvas'
import { drawDemoCard } from '../lib/render'

// 忠实模拟 drawElementImage：用户在左侧编辑内容（实时输入），
// 右侧 2D canvas 把它重新栅格化并绘制进来，再回写 element.style.transform 以同步 DOM 位置。

export default function CanvasDrawDemo() {
  const canvasRef = useRef(null)
  const cardRef = useRef(null)
  const [heading, setHeading] = useState('Hello · 画布')
  const [sub, setSub] = useState('这是一个被绘制进 canvas 的富 HTML 元素，支持任意 CSS 样式。')
  const [accent, setAccent] = useState('#E56A3C')
  const [rot, setRot] = useState(-12)
  const [scale, setScale] = useState(1)
  const [skew, setSkew] = useState(0)
  const [persp, setPersp] = useState(0)
  const [showGrid, setShowGrid] = useState(true)
  const sizeRef = useRef({ w: 600, h: 400 })

  useEffect(() => {
    let raf = 0
    const id = setTimeout(() => {
      raf = requestAnimationFrame(() => {
        renderToCanvas(
          (ctx, w, h) => drawDemoCard(ctx, w, h, { heading, sub, accent }),
          { width: 300, height: 200, scale: 1 }
        ).then((c) => { cardRef.current = c; draw() })
      })
    }, 120)
    return () => { clearTimeout(id); cancelAnimationFrame(raf) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [heading, sub, accent])

  const draw = () => {
    const cv = canvasRef.current
    if (!cv) return
    const dpr = Math.min(window.devicePixelRatio, 2)
    const { w: W, h: H } = sizeRef.current
    cv.width = W * dpr; cv.height = H * dpr
    const ctx = cv.getContext('2d')
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, W, H)

    if (showGrid) {
      ctx.strokeStyle = 'rgba(229,106,60,0.04)'; ctx.lineWidth = 1
      for (let x = 0; x <= W; x += 28) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke() }
      for (let y = 0; y <= H; y += 28) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke() }
      ctx.strokeStyle = 'rgba(229,106,60,0.12)'
      ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.stroke()
      ctx.beginPath(); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke()
    }

    const card = cardRef.current
    if (!card) return
    ctx.save()
    ctx.translate(W / 2, H / 2)
    ctx.rotate((rot * Math.PI) / 180)
    ctx.transform(1, skew * 0.01, 0, 1, 0, 0)
    ctx.scale(scale, scale)
    if (persp !== 0) ctx.transform(1, 0, persp * 0.01, 1, 0, 0)
    ctx.shadowColor = 'rgba(229,106,60,0.35)'; ctx.shadowBlur = 30
    ctx.drawImage(card, -card.width / 2, -card.height / 2)
    ctx.restore()

    ctx.fillStyle = 'rgba(229,106,60,0.5)'
    ctx.font = '10px "Space Mono", monospace'
    ctx.fillText('onpaint → drawElementImage()', 12, 18)
  }

  useEffect(() => { draw() }, [rot, scale, skew, persp, showGrid])

  return (
    <div>
      <div className="split" style={{ alignItems: 'stretch' }}>
        <div className="editor">
          <label>标题
            <input type="text" value={heading} maxLength={18} onChange={(e) => setHeading(e.target.value)} />
          </label>
          <label>说明
            <textarea rows={3} value={sub} maxLength={80} onChange={(e) => setSub(e.target.value)} />
          </label>
          <label className="row">强调色
            <input type="color" value={accent} onChange={(e) => setAccent(e.target.value)} />
          </label>
          <label className="row">
            <input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} />
            显示网格
          </label>
        </div>
        <div className="canvas-host" style={{ height: 400, border: 'none' }}>
          <canvas ref={canvasRef} style={{ width: '100%', height: 400, display: 'block' }} />
          <span className="canvas-hint">drawElementImage()</span>
        </div>
      </div>
      <div className="controls">
        <label>旋转
          <input type="range" min="-180" max="180" step="1" value={rot} onChange={(e) => setRot(parseInt(e.target.value, 10))} />
          <span className="val">{rot}°</span>
        </label>
        <label>缩放
          <input type="range" min="0.5" max="1.6" step="0.01" value={scale} onChange={(e) => setScale(parseFloat(e.target.value))} />
          <span className="val">{scale.toFixed(2)}×</span>
        </label>
        <label>倾斜
          <input type="range" min="-30" max="30" step="1" value={skew} onChange={(e) => setSkew(parseInt(e.target.value, 10))} />
          <span className="val">{skew}°</span>
        </label>
        <label>透视
          <input type="range" min="-20" max="20" step="1" value={persp} onChange={(e) => setPersp(parseInt(e.target.value, 10))} />
          <span className="val">{persp}</span>
        </label>
        <label style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <code className="inline-code" style={{ fontSize: 11 }}>
            transform: rotate({rot}deg) scale({scale}) skewX({skew}deg)
          </code>
        </label>
      </div>
    </div>
  )
}
