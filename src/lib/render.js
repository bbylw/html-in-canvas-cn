// 直接使用 Canvas 2D API 渲染"富 HTML"内容到 canvas。
// 替代 SVG foreignObject 方案——后者会导致 canvas 被"污染"（tainted），
// WebGL 拒绝将其作为纹理。本模块通过原生 canvas 绘制避免此问题。

export function createCanvas(width, height, scale = 1) {
  const w = Math.round(width * scale)
  const h = Math.round(height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.scale(scale, scale)
  ctx.textBaseline = 'top'
  return { canvas, ctx, width, height }
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

export function gradientBg(ctx, w, h, c1, c2, angle = 150) {
  const rad = (angle * Math.PI) / 180
  const x = Math.cos(rad) * w
  const y = Math.sin(rad) * h
  const grad = ctx.createLinearGradient(0, 0, x, y)
  grad.addColorStop(0, c1)
  grad.addColorStop(1, c2)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, w, h)
}

export function drawText(ctx, text, x, y, { font = '14px sans-serif', color = '#1b1d27', weight = '400', align = 'left', baseline = 'top' } = {}) {
  ctx.font = `${weight} ${font}`
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.textBaseline = baseline
  ctx.fillText(text, x, y)
}

// ─── HTMLTextureStudio 源 ───

export function drawBarChart(ctx, w, h) {
  gradientBg(ctx, w, h, '#EFE9DB', '#E0D8C6')
  roundRect(ctx, 0, 0, w, h, 22)
  ctx.save()
  ctx.clip()

  drawText(ctx, 'LIVE METRIC', 34, 30, { font: '13px monospace', color: '#C2551F' })
  drawText(ctx, '信号吞吐', 34, 50, { font: '32px sans-serif', color: '#16110C', weight: '700' })
  drawText(ctx, '+128%', w - 34, 38, { font: '38px sans-serif', color: '#E56A3C', weight: '700', align: 'right' })

  // 柱状图
  const bars = 13
  const barW = (w - 68 - (bars - 1) * 9) / bars
  const baseY = 120 + 150
  for (let k = 0; k < bars; k++) {
    const bh = 18 + Math.abs(Math.sin(k * 0.7)) * 70 + (k % 3) * 8
    const col = k % 4 === 0 ? '#16110C' : '#E56A3C'
    ctx.fillStyle = col
    roundRect(ctx, 34 + k * (barW + 9), baseY - bh * 1.5, barW, bh * 1.5, 3)
    ctx.fill()
  }

  drawText(ctx, 'drawElementImage() → WebGL · 实时刷新', 34, h - 40, { font: '13px monospace', color: '#6b6453' })
  ctx.restore()
}

export function drawTrend(ctx, w, h) {
  gradientBg(ctx, w, h, '#EFE9DB', '#E0D8C6')
  roundRect(ctx, 0, 0, w, h, 22)
  ctx.save()
  ctx.clip()

  drawText(ctx, 'TREND', 30, 28, { font: '13px monospace', color: '#C2551F' })
  drawText(ctx, '渲染性能曲线', 30, 48, { font: '30px sans-serif', color: '#16110C', weight: '700' })

  // 曲线
  const pts = []
  const px = 30, py = 90, pw = w - 60, ph = 200
  for (let i = 0; i < 12; i++) {
    const x = px + (i / 11) * pw
    const y = py + ph - (Math.sin(i * 0.9) * 0.5 + 0.5) * (ph - 30) - i * 3
    pts.push({ x, y })
  }

  // 填充区域
  const areaGrad = ctx.createLinearGradient(0, py, 0, py + ph)
  areaGrad.addColorStop(0, 'rgba(229,106,60,0.35)')
  areaGrad.addColorStop(1, 'rgba(229,106,60,0)')
  ctx.fillStyle = areaGrad
  ctx.beginPath()
  ctx.moveTo(pts[0].x, py + ph)
  pts.forEach(p => ctx.lineTo(p.x, p.y))
  ctx.lineTo(pts[pts.length - 1].x, py + ph)
  ctx.closePath()
  ctx.fill()

  // 线条
  ctx.strokeStyle = '#E56A3C'
  ctx.lineWidth = 4
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y))
  ctx.stroke()

  drawText(ctx, 'SVG 富内容 · 与文字一并栅格化', 30, h - 40, { font: '13px monospace', color: '#6b6453' })
  ctx.restore()
}

export function drawForm(ctx, w, h) {
  gradientBg(ctx, w, h, '#EFE9DB', '#E0D8C6')
  roundRect(ctx, 0, 0, w, h, 22)
  ctx.save()
  ctx.clip()

  drawText(ctx, 'FORM', 38, 40, { font: '13px monospace', color: '#C2551F' })
  drawText(ctx, '订阅信号简报', 38, 60, { font: '30px sans-serif', color: '#16110C', weight: '700' })

  // 输入框 mock
  ctx.fillStyle = 'rgba(27,29,39,0.06)'
  ctx.strokeStyle = 'rgba(27,29,39,0.25)'
  ctx.lineWidth = 1.5
  roundRect(ctx, 38, 120, 300, 44, 8)
  ctx.fill()
  ctx.stroke()
  drawText(ctx, 'you@signal.dev', 53, 133, { font: '15px sans-serif', color: '#6b6453' })

  // 按钮 mock
  ctx.fillStyle = '#E56A3C'
  roundRect(ctx, 348, 120, 80, 44, 8)
  ctx.fill()
  drawText(ctx, '订阅', 368, 133, { font: '15px sans-serif', color: '#16110C', weight: '700' })

  // 复选框 mock
  ctx.strokeStyle = '#E56A3C'
  ctx.fillStyle = 'rgba(229,106,60,0.15)'
  ctx.lineWidth = 2
  roundRect(ctx, 38, 185, 19, 19, 5)
  ctx.fill()
  ctx.stroke()
  drawText(ctx, '每周一封 · 含源码与可交互演示', 65, 186, { font: '14px sans-serif', color: '#4a4f63' })

  ctx.restore()
}

export function drawArticle(ctx, w, h) {
  gradientBg(ctx, w, h, '#EFE9DB', '#E0D8C6')
  roundRect(ctx, 0, 0, w, h, 22)
  ctx.save()
  ctx.clip()

  drawText(ctx, 'ARTICLE', 40, 38, { font: '13px monospace', color: '#C2551F' })
  drawText(ctx, '当画布学会排版', 40, 58, { font: '30px sans-serif', color: '#16110C', weight: '700' })

  // 段落文字（手动换行）
  ctx.fillStyle = '#4a4f63'
  ctx.font = '16px sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  const lines = [
    'HTML-in-Canvas 让复杂的富文本在 canvas 上保持可访问',
    '与高质量，并能在 2D 与 3D 之间自由流转。',
  ]
  lines.forEach((l, i) => ctx.fillText(l, 40, 110 + i * 30))

  // 引用块
  ctx.strokeStyle = '#E56A3C'
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(40, 185)
  ctx.lineTo(40, 225)
  ctx.stroke()
  ctx.fillStyle = '#16110C'
  ctx.font = 'italic 17px sans-serif'
  ctx.fillText('"渲染，由你掌控。"', 54, 190)

  ctx.restore()
}

export function drawCode(ctx, w, h) {
  ctx.fillStyle = '#100D0A'
  roundRect(ctx, 0, 0, w, h, 22)
  ctx.save()
  ctx.clip()

  // 窗口圆点
  const dots = ['#E56A3C', '#F2A65A', '#86B06A']
  dots.forEach((c, i) => {
    ctx.fillStyle = c
    ctx.beginPath()
    ctx.arc(30 + i * 16, 28, 5, 0, Math.PI * 2)
    ctx.fill()
  })

  // 代码
  const codeLines = [
    { t: '// paint event', c: '#6E675B', x: 30 },
    { t: 'canvas.onpaint = (event) => {', c: '#F3EFE7', x: 30 },
    { t: 'const tex = ctx.drawElementImage(', c: '#F3EFE7', x: 50 },
    { t: 'form_element, 100, 0', c: '#F3EFE7', x: 70 },
    { t: ');', c: '#F3EFE7', x: 50 },
    { t: 'form_element.style.transform =', c: '#F3EFE7', x: 50 },
    { t: 'tex.toString();', c: '#F3EFE7', x: 70 },
    { t: '};', c: '#F3EFE7', x: 30 },
  ]
  ctx.font = '13px monospace'
  ctx.textBaseline = 'top'
  codeLines.forEach((l, i) => {
    ctx.fillStyle = l.c
    ctx.fillText(l.t, l.x, 60 + i * 24)
  })

  // 关键词高亮
  const kw = ['canvas', 'onpaint', 'drawElementImage', 'transform', 'toString']
  ctx.font = '13px monospace'
  codeLines.forEach((l, i) => {
    const y = 60 + i * 24
    // 简单关键词着色
    if (l.t.includes('const')) {
      ctx.fillStyle = '#E56A3C'
      ctx.fillText('const', l.x, y)
    }
    if (l.t.includes('canvas.')) {
      ctx.fillStyle = '#E56A3C'
      ctx.fillText('canvas', l.x, y)
    }
  })

  ctx.restore()
}

// ─── HTMLCube 面 ───

export function drawCubeFace(ctx, w, h, face) {
  gradientBg(ctx, w, h, '#EFE9DB', '#E0D8C6', 145)
  roundRect(ctx, 0, 0, w, h, 30)
  ctx.save()
  ctx.clip()

  const pad = 44
  drawText(ctx, face.tag, pad, pad, { font: '15px monospace', color: '#C2551F' })
  drawText(ctx, face.title, pad, pad + 24, { font: '38px monospace', color: '#16110C', weight: '800' })

  // 分隔线
  const gradLine = ctx.createLinearGradient(pad, pad + 80, pad + 64, pad + 80)
  gradLine.addColorStop(0, '#E56A3C')
  gradLine.addColorStop(1, '#F2A65A')
  ctx.fillStyle = gradLine
  roundRect(ctx, pad, pad + 80, 64, 5, 3)
  ctx.fill()

  // 描述
  ctx.fillStyle = '#4a4f63'
  ctx.font = '18px sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  const words = face.desc.split('')
  let line = ''
  let lineY = pad + 110
  const maxW = w - pad * 2
  for (let i = 0; i < words.length; i++) {
    const test = line + words[i]
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, pad, lineY)
      line = words[i]
      lineY += 30
    } else {
      line = test
    }
  }
  if (line) ctx.fillText(line, pad, lineY)

  // 柱状图
  const bars = 11
  const barAreaY = h - pad - 120
  const barAreaH = 100
  const barW = (w - pad * 2 - (bars - 1) * 8) / bars
  for (let k = 0; k < bars; k++) {
    const bh = 22 + Math.abs(Math.sin(k * 0.7 + face.seed)) * 78 + (k % 3) * 9
    const col = k % 3 === 0 ? '#16110C' : '#E56A3C'
    ctx.fillStyle = col
    const bh2 = (bh / 100) * barAreaH
    roundRect(ctx, pad + k * (barW + 8), barAreaY + barAreaH - bh2, barW, bh2, 3)
    ctx.fill()
  }

  // 虚线
  ctx.strokeStyle = 'rgba(27,29,39,0.2)'
  ctx.lineWidth = 1
  ctx.setLineDash([4, 4])
  ctx.beginPath()
  ctx.moveTo(pad, barAreaY - 7)
  ctx.lineTo(w - pad, barAreaY - 7)
  ctx.stroke()
  ctx.setLineDash([])

  ctx.restore()
}

// ─── 点云 / 浮雕 文字渲染 ───

export function drawTextCanvas(text, width, height, { fontSize = 150, color = '#16110C', weight = '700', letterSpacing = 0, fontFamily = 'sans-serif' } = {}) {
  const { canvas, ctx } = createCanvas(width, height, 1)
  ctx.fillStyle = color
  ctx.font = `${weight} ${fontSize}px ${fontFamily}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  if (letterSpacing !== 0) {
    // 手动处理字间距
    const chars = text.split('')
    let totalW = 0
    chars.forEach(c => { totalW += ctx.measureText(c).width + letterSpacing })
    totalW -= letterSpacing
    let x = (width - totalW) / 2
    chars.forEach(c => {
      ctx.fillText(c, x + ctx.measureText(c).width / 2, height / 2)
      x += ctx.measureText(c).width + letterSpacing
    })
  } else {
    ctx.fillText(text, width / 2, height / 2)
  }
  return canvas
}

// ─── 浮雕预设 ───

export function drawReliefBars(ctx, w, h) {
  ctx.fillStyle = '#E0D8C6'
  ctx.fillRect(0, 0, w, h)
  const bars = [40, 70, 55, 90, 62, 78, 48]
  const barW = 46
  const gap = 18
  const totalW = bars.length * barW + (bars.length - 1) * gap
  const startX = (w - totalW) / 2
  bars.forEach((bh, i) => {
    const bh2 = (bh / 100) * (h - 80)
    ctx.fillStyle = '#16110C'
    roundRect(ctx, startX + i * (barW + gap), h - 40 - bh2, barW, bh2, 6)
    ctx.fill()
  })
}

export function drawReliefRing(ctx, w, h) {
  ctx.fillStyle = '#E0D8C6'
  ctx.fillRect(0, 0, w, h)
  const cx = w / 2
  const cy = h / 2
  const rings = [75, 55, 35, 17]
  rings.forEach((r, i) => {
    ctx.strokeStyle = '#16110C'
    ctx.lineWidth = 18
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.stroke()
    if (i % 2 === 1) {
      ctx.fillStyle = '#16110C'
      ctx.beginPath()
      ctx.arc(cx, cy, r - 9, 0, Math.PI * 2)
      ctx.fill()
    }
  })
  ctx.fillStyle = '#E56A3C'
  ctx.beginPath()
  ctx.arc(cx, cy, 9, 0, Math.PI * 2)
  ctx.fill()
}

export function drawReliefWave(ctx, w, h) {
  ctx.fillStyle = '#E0D8C6'
  ctx.fillRect(0, 0, w, h)
  for (let i = 0; i < 12; i++) {
    ctx.strokeStyle = `rgba(22,17,12,${0.4 + i * 0.05})`
    ctx.lineWidth = Math.max(1, 8 - i * 0.5)
    ctx.beginPath()
    const baseY = h / 2 + Math.sin(i * 0.5) * 30
    for (let x = 0; x <= w; x += 4) {
      const y = baseY + Math.sin(x * 0.01 + i * 0.3) * 20 + Math.cos(x * 0.015) * 10
      if (x === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
}

export function drawReliefGrid(ctx, w, h) {
  ctx.fillStyle = '#E0D8C6'
  ctx.fillRect(0, 0, w, h)
  const cols = 8, rows = 5
  const gap = 8
  const padX = 30, padY = 30
  const cellW = (w - padX * 2 - (cols - 1) * gap) / cols
  const cellH = (h - padY * 2 - (rows - 1) * gap) / rows
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const dark = Math.random() > 0.4
      ctx.fillStyle = dark ? '#16110C' : '#E0D8C6'
      ctx.globalAlpha = 0.3 + Math.random() * 0.7
      roundRect(ctx, padX + c * (cellW + gap), padY + r * (cellH + gap), cellW, cellH, 4)
      ctx.fill()
    }
  }
  ctx.globalAlpha = 1
}

// ─── HeroCanvas 面板 ───

export function drawHeroMain(ctx, w, h) {
  gradientBg(ctx, w, h, '#EFE9DB', '#DCD5C4')
  roundRect(ctx, 0, 0, w, h, 20)
  ctx.save()
  ctx.clip()
  const pad = 38
  drawText(ctx, '// HTML-in-Canvas', pad, pad, { font: '14px monospace', color: '#C2551F' })
  drawText(ctx, '在画布中渲染 HTML', pad, pad + 24, { font: '40px sans-serif', color: '#16110C', weight: '800' })

  // 标签
  ctx.fillStyle = 'rgba(229,106,60,0.12)'
  ctx.strokeStyle = 'rgba(229,106,60,0.35)'
  ctx.lineWidth = 1
  roundRect(ctx, pad, pad + 80, 200, 32, 6)
  ctx.fill()
  ctx.stroke()
  drawText(ctx, 'drawElementImage()', pad + 14, pad + 88, { font: '14px monospace', color: '#B8461C' })

  drawText(ctx, '2D / 3D · 可访问 · 高性能', pad, h - pad - 14, { font: '12px monospace', color: '#4a4f63' })
  ctx.restore()
}

export function drawHeroChip(ctx, w, h, title, tag, value) {
  gradientBg(ctx, w, h, '#16110C', '#221D17')
  roundRect(ctx, 0, 0, w, h, 14)
  ctx.save()
  ctx.clip()
  const pad = 22
  drawText(ctx, tag, pad, pad, { font: '11px monospace', color: '#E56A3C' })
  drawText(ctx, title, pad, pad + 18, { font: '30px sans-serif', color: '#F3EFE7', weight: '800' })
  drawText(ctx, value, pad, h - pad - 22, { font: '22px monospace', color: '#F2A65A' })
  ctx.restore()
}

export function drawHeroMini(ctx, w, h, label, value) {
  gradientBg(ctx, w, h, '#EFE9DB', '#E0D8C6')
  roundRect(ctx, 0, 0, w, h, 10)
  ctx.save()
  ctx.clip()
  const pad = 16
  drawText(ctx, label, pad, pad, { font: '10px monospace', color: '#C2551F' })
  drawText(ctx, value, pad, pad + 18, { font: '22px sans-serif', color: '#16110C', weight: '700' })
  ctx.restore()
}

// ─── CanvasDrawDemo 卡片 ───

export function drawDemoCard(ctx, w, h, { heading, sub, accent }) {
  gradientBg(ctx, w, h, '#EFE9DB', '#E0D8C6')
  roundRect(ctx, 0, 0, w, h, 20)
  ctx.save()
  ctx.clip()
  const pad = 24
  drawText(ctx, 'CANVAS CHILD', pad, pad, { font: '12px monospace', color: accent })
  drawText(ctx, heading, pad, pad + 20, { font: '26px sans-serif', color: '#16110C', weight: '800' })

  // 描述（手动换行）
  ctx.fillStyle = '#4a4f63'
  ctx.font = '14px sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  const words = sub.split('')
  let line = ''
  let lineY = pad + 60
  const maxW = w - pad * 2
  for (let i = 0; i < words.length; i++) {
    const test = line + words[i]
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, pad, lineY)
      line = words[i]
      lineY += 22
    } else {
      line = test
    }
  }
  if (line) ctx.fillText(line, pad, lineY)

  ctx.restore()
}
