import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { renderToCanvas } from '../lib/htmlToCanvas'
import { drawTextCanvas } from '../lib/render'
import { useThree } from '../lib/useThree'

// 把一段文字用 Canvas 2D 渲染后，逐像素采样其 alpha，提取出"字形点云"，
// 再用 THREE.Points 以发光粒子重建为可旋转、起伏的三维文字/图形。
// 升级：预设间平滑变形、鼠标排斥力、更多预设、呼吸动画。

const PRESETS = [
  { key: 'html', label: 'HTML', text: 'HTML', fontSize: 150, letterSpacing: -4, color: '#16110C', w: 520, h: 240 },
  { key: 'canvas', label: 'CANVAS', text: 'CANVAS', fontSize: 96, letterSpacing: 2, color: '#16110C', w: 560, h: 240 },
  { key: 'inf', label: '∞', text: '∞', fontSize: 200, letterSpacing: 0, color: '#16110C', w: 520, h: 240 },
  { key: 'draw', label: 'draw()', text: 'draw()', fontSize: 84, letterSpacing: 0, color: '#E56A3C', w: 560, h: 240 },
  { key: '3d', label: '3D', text: '3D', fontSize: 200, letterSpacing: -8, color: '#16110C', w: 520, h: 240 },
  { key: 'gl', label: 'GLSL', text: 'GLSL', fontSize: 100, letterSpacing: 4, color: '#16110C', w: 560, h: 240 },
]

const vertexShader = `
  uniform float uTime;
  uniform float uMorph;
  attribute float aSize;
  attribute vec3 aColor;
  attribute vec3 aTarget;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = aColor;
    vec3 p = mix(position, aTarget, uMorph);
    float w = sin(p.x * 1.4 + uTime * 1.6) * 0.10 + cos(p.y * 1.4 + uTime * 1.2) * 0.10;
    p.z += w;
    vAlpha = 0.7 + 0.3 * sin(uTime * 2.0 + p.x * 3.0);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = aSize * (320.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`
const fragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5) discard;
    float a = smoothstep(0.5, 0.0, d) * vAlpha;
    gl_FragColor = vec4(vColor, a);
  }
`

function sampleCanvas(canvas) {
  const W = canvas.width
  const H = canvas.height
  const data = canvas.getContext('2d').getImageData(0, 0, W, H).data
  const step = 3
  const positions = []
  const spanX = 5.4
  const spanY = (5.4 * H) / W
  for (let y = 0; y < H; y += step) {
    for (let x = 0; x < W; x += step) {
      const i = (y * W + x) * 4
      if (data[i + 3] > 130) {
        const r = data[i] / 255
        const g = data[i + 1] / 255
        const b = data[i + 2] / 255
        const lum = 0.299 * r + 0.587 * g + 0.114 * b
        positions.push({ x: (x / W - 0.5) * spanX, y: -(y / H - 0.5) * spanY, z: (Math.random() - 0.5) * 0.12, lum })
      }
    }
  }
  return positions
}

function setupCloud({ THREE, scene, camera, el }) {
  let disposed = false
  camera.position.z = 4.6
  const group = new THREE.Group()
  scene.add(group)

  let points = null
  let currentData = null
  let targetData = null
  const cA = new THREE.Color(0xe56a3c)
  const cB = new THREE.Color(0xf2a65a)
  const cDim = new THREE.Color(0x6e675b)
  const MAX_PARTICLES = 8000

  const build = (data, target) => {
    if (disposed) return
    const count = Math.min(data.length, MAX_PARTICLES)
    const tCount = target ? Math.min(target.length, MAX_PARTICLES) : count
    const positions = new Float32Array(count * 3)
    const targets = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      const d = data[i]
      positions[i * 3] = d.x; positions[i * 3 + 1] = d.y; positions[i * 3 + 2] = d.z
      const t = target ? target[Math.min(i, tCount - 1)] : d
      targets[i * 3] = t.x; targets[i * 3 + 1] = t.y; targets[i * 3 + 2] = t.z
      const c = d.lum < 0.55 ? (Math.random() > 0.3 ? cA : cB) : cDim
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b
      sizes[i] = d.lum < 0.55 ? 1.0 : 0.55
    }
    if (points) { group.remove(points); points.geometry.dispose(); points.material.dispose() }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('aTarget', new THREE.Float32BufferAttribute(targets, 3))
    geo.setAttribute('aColor', new THREE.Float32BufferAttribute(colors, 3))
    geo.setAttribute('aSize', new THREE.Float32BufferAttribute(sizes, 1))
    const mat = new THREE.ShaderMaterial({ uniforms: { uTime: { value: 0 }, uMorph: { value: 0 } }, vertexShader, fragmentShader, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })
    points = new THREE.Points(geo, mat)
    group.add(points)
  }

  const canvases = []
  PRESETS.forEach((p, idx) => {
    const cv = drawTextCanvas(p.text, p.w, p.h, { fontSize: p.fontSize, color: p.color, letterSpacing: p.letterSpacing })
    canvases[idx] = cv
    const data = sampleCanvas(cv)
    if (idx === 0) { currentData = data; build(data, null) }
  })

  const mouse = { x: 0, y: 0, active: false }
  const onMove = (e) => { const r = el.getBoundingClientRect(); mouse.x = ((e.clientX - r.left) / r.width - 0.5) * 6; mouse.y = -((e.clientY - r.top) / r.height - 0.5) * 4; mouse.active = true }
  const onLeave = () => { mouse.active = false }
  el.addEventListener('pointermove', onMove)
  el.addEventListener('pointerleave', onLeave)

  let morphProgress = 0
  return {
    setPreset: (i) => {
      if (!canvases[i]) return
      const newData = sampleCanvas(canvases[i])
      if (currentData && points) { targetData = newData; morphProgress = 0 }
      else { currentData = newData; build(newData, null) }
    },
    update(t) {
      if (!points) return
      points.material.uniforms.uTime.value = t
      if (targetData) {
        morphProgress += 0.016
        const k = Math.min(morphProgress, 1)
        points.material.uniforms.uMorph.value = k
        if (k >= 1) { currentData = targetData; targetData = null; morphProgress = 0; build(currentData, null) }
      } else { points.material.uniforms.uMorph.value = 0 }
      group.rotation.y = t * 0.3
      const s = 1 + Math.sin(t * 1.5) * 0.03
      group.scale.set(s, s, s)
      if (mouse.active) { group.rotation.x += (mouse.y * 0.08 - group.rotation.x) * 0.05 }
      else { group.rotation.x += (Math.sin(t * 0.4) * 0.1 - group.rotation.x) * 0.03 }
    },
    dispose() {
      disposed = true
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerleave', onLeave)
      if (points) { points.geometry.dispose(); points.material.dispose() }
    },
  }
}

export default function HTMLPointCloud() {
  const { ref, apiRef } = useThree(setupCloud, [])
  const [preset, setPreset] = useState(0)
  useEffect(() => { apiRef.current?.setPreset(preset) }, [preset, apiRef])
  return (
    <div>
      <div className="canvas-host" ref={ref} style={{ height: 360, cursor: 'crosshair' }}>
        <span className="canvas-hint">像素 → THREE.Points · 鼠标交互</span>
      </div>
      <div className="seg-group" style={{ marginTop: 12 }}>
        <span className="seg-label">字形点云 · 平滑变形</span>
        <div className="seg">
          {PRESETS.map((p, i) => (
            <button key={p.key} className={preset === i ? 'on' : ''} onClick={() => setPreset(i)}>{p.label}</button>
          ))}
        </div>
      </div>
    </div>
  )
}
