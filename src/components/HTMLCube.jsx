import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { renderToTexture } from '../lib/htmlToCanvas'
import { createHtmlMaterial } from '../lib/htmlShader'
import { useThree } from '../lib/useThree'
import { drawCubeFace } from '../lib/render'

const FACES = [
  { tag: 'PRIMITIVE 01', title: 'layoutsubtree', desc: '让 Canvas 后代元素参与布局、介入命中测试，成为所有后代的包含块。', seed: 0.2 },
  { tag: 'PRIMITIVE 02', title: 'drawElementImage', desc: '把一个 canvas 子元素绘制进 canvas，并返回可同步位置的 CSS 变换。', seed: 1.1 },
  { tag: 'PRIMITIVE 03', title: 'paint 事件', desc: '任意子元素渲染变化时触发；requestPaint() 可让每帧都刷新。', seed: 2.0 },
  { tag: 'PRIMITIVE 04', title: 'captureElementImage', desc: '将元素快照捕获为 ElementImage，可传输到 Worker 绘制到 OffscreenCanvas。', seed: 2.9 },
  { tag: 'SYNC', title: '位置同步', desc: '更新 element.style.transform，使 DOM 位置与绘制位置一致，保障可访问性。', seed: 3.7 },
  { tag: 'USE CASE', title: '3D 上下文', desc: '在 3D 场景表面渲染丰富的 2D HTML 内容，例如游戏内 HUD。', seed: 4.6 },
]

const FACE_NORMALS = [
  new THREE.Vector3(1, 0, 0), new THREE.Vector3(-1, 0, 0),
  new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, -1, 0),
  new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, -1),
]

function setupCube({ THREE, renderer, scene, camera, el, onFocus }) {
  let disposed = false
  camera.position.z = 5.0
  const geo = new THREE.BoxGeometry(2.5, 2.5, 2.5)
  const mats = FACES.map(() => createHtmlMaterial(null, { glow: 0.55 }))
  const cube = new THREE.Mesh(geo, mats)
  scene.add(cube)

  const edges = new THREE.EdgesGeometry(geo)
  const lineMat = new THREE.LineBasicMaterial({ color: 0xE56A3C, transparent: true, opacity: 0.35 })
  const wireframe = new THREE.LineSegments(edges, lineMat)
  cube.add(wireframe)

  FACES.forEach((f, i) => {
    renderToTexture((ctx, w, h) => drawCubeFace(ctx, w, h, f), { width: 512, height: 512, scale: 1 }, THREE).then((tex) => {
      if (disposed) return
      const old = mats[i].userData.uniforms.uMap.value
      mats[i].userData.uniforms.uMap.value = tex
      old?.dispose()
    })
  })

  const focusedRef = { current: false }
  const targetQuat = { current: null }
  const dragging = { current: false }
  const last = { x: 0, y: 0 }
  const rotVel = { x: 0, y: 0 }
  let moved = 0
  const speed = { value: 0.5 }
  const auto = { value: true }

  const ndc = (e) => {
    const r = el.getBoundingClientRect()
    return new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
  }
  const onDown = (e) => { dragging.current = true; focusedRef.current = false; targetQuat.current = null; moved = 0; last.x = e.clientX; last.y = e.clientY; rotVel.x = 0; rotVel.y = 0 }
  const onMove = (e) => {
    if (!dragging.current) return
    const dx = e.clientX - last.x; const dy = e.clientY - last.y
    moved += Math.abs(dx) + Math.abs(dy)
    rotVel.y = dx * 0.006; rotVel.x = dy * 0.006
    cube.rotateOnWorldAxis(new THREE.Vector3(0, 1, 0), rotVel.y)
    cube.rotateOnWorldAxis(new THREE.Vector3(1, 0, 0), rotVel.x)
    last.x = e.clientX; last.y = e.clientY
  }
  const onUp = (e) => {
    if (disposed || !el) return
    dragging.current = false
    if (moved < 6) {
      const ray = new THREE.Raycaster()
      ray.setFromCamera(ndc(e), camera)
      const hits = ray.intersectObject(cube)
      if (hits.length) {
        const n = hits[0].face.normal.clone()
        let idx = 5
        if (n.x > 0.5) idx = 0; else if (n.x < -0.5) idx = 1; else if (n.y > 0.5) idx = 2; else if (n.y < -0.5) idx = 3; else if (n.z > 0.5) idx = 4
        targetQuat.current = new THREE.Quaternion().setFromUnitVectors(FACE_NORMALS[idx], new THREE.Vector3(0, 0, 1))
        focusedRef.current = true
        onFocus?.(idx)
      }
    }
  }
  renderer.domElement.addEventListener('pointerdown', onDown)
  window.addEventListener('pointermove', onMove)
  window.addEventListener('pointerup', onUp)

  return {
    setSpeed: (v) => { speed.value = v },
    setAuto: (v) => { auto.value = v },
    clearFocus: () => { focusedRef.current = false; targetQuat.current = null },
    update() {
      const now = performance.now() / 1000
      mats.forEach((m) => (m.userData.uniforms.uTime.value = now))
      lineMat.opacity = 0.25 + 0.15 * Math.sin(now * 1.5)
      if (focusedRef.current && targetQuat.current) {
        cube.quaternion.slerp(targetQuat.current, 0.08)
      } else if (auto.value && !dragging.current) {
        cube.rotateY(speed.value * 0.01)
        cube.rotateX(rotVel.x * 0.5); cube.rotateY(rotVel.y * 0.5)
        rotVel.x *= 0.94; rotVel.y *= 0.94
      }
    },
    dispose() {
      disposed = true
      renderer.domElement.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      geo.dispose(); edges.dispose(); lineMat.dispose()
      mats.forEach((m) => { m.userData.uniforms.uMap.value?.dispose(); m.dispose() })
    },
  }
}

export default function HTMLCube() {
  const onFocusRef = useRef(() => {})
  const [speed, setSpeed] = useState(0.5)
  const [auto, setAuto] = useState(true)
  const [focus, setFocus] = useState(null)
  onFocusRef.current = (idx) => setFocus(idx)
  const { ref, apiRef } = useThree((ctx) => setupCube({ ...ctx, onFocus: onFocusRef.current }), [])
  useEffect(() => { apiRef.current?.setSpeed(speed) }, [speed, apiRef])
  useEffect(() => { apiRef.current?.setAuto(auto) }, [auto, apiRef])
  const reset = () => { apiRef.current?.clearFocus(); setFocus(null) }

  return (
    <div>
      <div className="canvas-host" ref={ref} style={{ height: 440, cursor: 'grab' }}>
        <span className="canvas-hint">拖动旋转 · 点击聚焦</span>
        {focus !== null && (
          <div className="caption show">
            <div className="t">{FACES[focus].title}</div>
            <div className="d">{FACES[focus].desc}</div>
            <button className="back" onClick={reset}>← 返回自动旋转</button>
          </div>
        )}
      </div>
      <div className="controls">
        <label>旋转速度
          <input type="range" min="0" max="2" step="0.05" value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))} />
          <span className="val">{speed.toFixed(2)}×</span>
        </label>
        <label style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <input type="checkbox" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
          自动旋转
        </label>
      </div>
    </div>
  )
}
