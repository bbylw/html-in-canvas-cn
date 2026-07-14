import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { renderToTexture } from '../lib/htmlToCanvas'
import { createHtmlMaterial } from '../lib/htmlShader'
import { useThree } from '../lib/useThree'
import { drawBarChart, drawTrend, drawForm, drawArticle, drawCode } from '../lib/render'

const ASPECT = 560 / 360

const SOURCES = [
  { key: 'card', label: '指标卡', draw: drawBarChart },
  { key: 'trend', label: '曲线', draw: drawTrend },
  { key: 'form', label: '表单', draw: drawForm },
  { key: 'article', label: '文章', draw: drawArticle },
  { key: 'code', label: '代码', draw: drawCode },
]

const GEOMS = [
  { key: 'plane', label: '平面' },
  { key: 'cylinder', label: '圆柱' },
  { key: 'sphere', label: '球面' },
  { key: 'torus', label: '环面' },
  { key: 'torusKnot', label: '环结' },
  { key: 'cone', label: '锥面' },
]

function makeGeometry(key) {
  switch (key) {
    case 'cylinder': return new THREE.CylinderGeometry(1.8, 1.8, 3.2, 72, 1, true)
    case 'sphere': return new THREE.SphereGeometry(2.2, 56, 36)
    case 'torus': return new THREE.TorusGeometry(1.75, 0.62, 28, 80)
    case 'torusKnot': return new THREE.TorusKnotGeometry(1.4, 0.45, 120, 18)
    case 'cone': return new THREE.ConeGeometry(2.0, 3.4, 56, 1, true)
    case 'plane': default: return new THREE.PlaneGeometry(4.4, 4.4 / ASPECT)
  }
}

function setupStudio({ THREE, scene, camera, el }) {
  let disposed = false
  camera.position.z = 5.4
  const mat = createHtmlMaterial(null, { glow: 0.22, effectMode: 0 })
  let mesh = new THREE.Mesh(makeGeometry('plane'), mat)
  scene.add(mesh)

  let sourceIdx = 0
  const loadSource = (i) => {
    sourceIdx = i
    renderToTexture(SOURCES[i].draw, { width: 560, height: 360, scale: 1 }, THREE).then((tex) => {
      if (disposed || sourceIdx !== i) return
      const old = mat.userData.uniforms.uMap.value
      mat.userData.uniforms.uMap.value = tex
      old?.dispose()
    })
  }
  loadSource(0)

  const dragging = { current: false }
  const last = { x: 0, y: 0 }
  const rotVel = { x: 0, y: 0 }
  const onDown = (e) => { dragging.current = true; last.x = e.clientX; last.y = e.clientY }
  const onMove = (e) => {
    if (!dragging.current) return
    const dx = e.clientX - last.x
    const dy = e.clientY - last.y
    rotVel.y = dx * 0.006; rotVel.x = dy * 0.006
    mesh.rotation.y += rotVel.y; mesh.rotation.x += rotVel.x
    last.x = e.clientX; last.y = e.clientY
  }
  const onUp = () => { dragging.current = false }
  el.addEventListener('pointerdown', onDown)
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)

  return {
    setSource: (i) => loadSource(i),
    setGeometry: (g) => {
      const ng = makeGeometry(g)
      const old = mesh.geometry
      mesh.geometry = ng
      old.dispose()
    },
    setUvRot: (v) => { mat.userData.uniforms.uUvRot.value = v },
    setSpin: (v) => { mesh.userData.spin = v },
    update(t) {
      mat.userData.uniforms.uTime.value = t
      const spin = mesh.userData.spin ?? 0.4
      if (!dragging.current) {
        mesh.rotation.y += spin * 0.01
        rotVel.y *= 0.92; rotVel.x *= 0.92
      }
    },
    dispose() {
      disposed = true
      el.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      mesh.geometry.dispose(); mat.userData.uniforms.uMap.value?.dispose(); mat.dispose()
    },
  }
}

export default function HTMLTextureStudio() {
  const { ref, apiRef } = useThree(setupStudio, [])
  const [source, setSource] = useState(0)
  const [geom, setGeom] = useState('plane')
  const [uvRot, setUvRot] = useState(0)
  const [spin, setSpin] = useState(0.4)

  useEffect(() => { apiRef.current?.setSource(source) }, [source, apiRef])
  useEffect(() => { apiRef.current?.setGeometry(geom) }, [geom, apiRef])
  useEffect(() => { apiRef.current?.setUvRot(uvRot) }, [uvRot, apiRef])
  useEffect(() => { apiRef.current?.setSpin(spin) }, [spin, apiRef])

  return (
    <div className="demo">
      <div className="head">
        <span className="tag">three.js · HTML → WebGL 纹理</span>
        <h4>HTML 纹理工作室</h4>
        <p>同一段内容 · 任意几何 · 边缘辉光</p>
      </div>
      <div className="body">
        <div className="canvas-host" ref={ref} style={{ height: 420, cursor: 'grab' }}>
          <span className="canvas-hint">拖动旋转 · drawElementImage</span>
        </div>
        <div className="studio-grid">
          <div className="seg-group">
            <span className="seg-label">源内容</span>
            <div className="seg">
              {SOURCES.map((s, i) => (
                <button key={s.key} className={source === i ? 'on' : ''} onClick={() => setSource(i)}>{s.label}</button>
              ))}
            </div>
          </div>
          <div className="seg-group">
            <span className="seg-label">几何体</span>
            <div className="seg">
              {GEOMS.map((g) => (
                <button key={g.key} className={geom === g.key ? 'on' : ''} onClick={() => setGeom(g.key)}>{g.label}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="controls">
          <label>UV 旋转
            <input type="range" min="0" max="6.283" step="0.01" value={uvRot} onChange={(e) => setUvRot(parseFloat(e.target.value))} />
            <span className="val">{((uvRot * 180) / Math.PI).toFixed(0)}°</span>
          </label>
          <label>自转
            <input type="range" min="0" max="2" step="0.05" value={spin} onChange={(e) => setSpin(parseFloat(e.target.value))} />
            <span className="val">{spin.toFixed(2)}×</span>
          </label>
        </div>
        <div className="callout" style={{ marginTop: 16 }}>
          <span className="ic">🧪</span>
          <p>
            在真实实现中，只需在 <code className="inline-code">paint</code> 事件里调用一次{' '}
            <code className="inline-code">texElementImage2D(target, ..., element)</code>，HTML 便成为可施加任意
            WebGL 着色器的纹理——这里用 <code className="inline-code">ShaderMaterial</code> 直接编写 GLSL，
            几何体运行时可切换。共 5 种内容源 × 6 种几何。
          </p>
        </div>
      </div>
    </div>
  )
}
