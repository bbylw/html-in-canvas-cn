// 将一段绘制函数渲染到离屏 2D canvas 上，然后提取像素数据创建 DataTexture。
// 这是"HTML-in-Canvas"提案的核心思想：把排版后的富内容作为位图绘制出来。
// 注意：在 Electron 环境中，CanvasTexture 可能被 WebGL 视为"污染"（tainted），
// 即使 getImageData 可以正常工作。使用 DataTexture（原始像素数据）可完全避免此问题。

export function renderToCanvas(drawFn, { width, height, scale = 1 } = {}) {
  const w = Math.round(width * scale)
  const h = Math.round(height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.scale(scale, scale)
  ctx.textBaseline = 'top'
  drawFn(ctx, width, height)
  return Promise.resolve(canvas)
}

// 渲染绘制函数并返回 DataTexture（避免 CanvasTexture 的 tainted 问题）
export function renderToTexture(drawFn, { width, height, scale = 1 }, THREE) {
  const w = Math.round(width * scale)
  const h = Math.round(height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.scale(scale, scale)
  ctx.textBaseline = 'top'
  drawFn(ctx, width, height)

  // 提取像素数据，创建 DataTexture
  const imageData = ctx.getImageData(0, 0, w, h)
  const data = new Uint8Array(imageData.data.buffer)
  const texture = new THREE.DataTexture(data, w, h, THREE.RGBAFormat)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  texture.needsUpdate = true
  return Promise.resolve(texture)
}

// 清除缓存（兼容旧接口）
export function clearHtmlCache() {}
