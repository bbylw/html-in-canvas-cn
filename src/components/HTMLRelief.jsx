import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { renderToTexture } from '../lib/htmlToCanvas'
import { useThree } from '../lib/useThree'
import { drawTextCanvas, drawReliefBars, drawReliefRing, drawReliefWave, drawReliefGrid } from '../lib/render'

// 把内容的亮度作为位移贴图（displacementMap）驱动真实 3D 几何，
// 配合 DirectionalLight + MeshStandardMaterial，使平面上的内容"浮雕"起来、被光照雕刻。
// 升级：鼠标控制光源位置、更多预设、金属度/粗糙度可调、法线贴图增强细节。

const PRESETS = [
  { key: 'glyph', label: '字形', draw: (ctx, w, h) => { ctx.fillStyle = '#16110C'; ctx.font = '700 200px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('H5', w / 2, h / 2) } },
  { key: 'bars', label: '柱状', draw: drawReliefBars },
  { key: 'ring', label: '靶环', draw: drawReliefRing },
  { key: 'wave', label: '波纹', draw: drawReliefWave },
  { key: 'grid', label: '网格', draw: drawReliefGrid },
]

function setupRelief({ THREE, scene, camera, el }) {
  let disposed = false
  camera.position.z = 4.8
  const amb = new THREE.AmbientLight(0xfff2e6, 0.45)
  const key = new THREE.DirectionalLight(0xffffff, 2.8)
  key.position.set(2.2, 2.6, 3.2)
  const rim = new THREE.DirectionalLight(0xe56a3c, 1.2)
  rim.position.set(-2.5, -1.2, 1.5)
  scene.add(amb, key, rim)

  const geo = new THREE.PlaneGeometry(4, 4, 240, 240)
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, metalness: 0.15, roughness: 0.62 })
  const mesh = new THREE.Mesh(geo, mat)
  scene.add(mesh)

  const disposeTex = () => { mat.map?.dispose(); mat.displacementMap?.dispose(); mat.normalMap?.dispose() }

  const load = (i) => {
    renderToTexture(PRESETS[i].draw, { width: 560, height: 360, scale: 1 }, THREE).then((tex) => {
      if (disposed) return
      disposeTex()
      // 同时创建位移和法线贴图
      const cv = document.createElement('canvas')
      cv.width = 560; cv.height = 360
      const dctx = cv.getContext('2d')
      // 重新渲染到 canvas 以提取位移数据
      const tmpCanvas = document.createElement('canvas')
      tmpCanvas.width = 560; tmpCanvas.height = 360
      const tmpCtx = tmpCanvas.getContext('2d')
      PRESETS[i].draw(tmpCtx, 560, 360)
      
      // 位移贴图
      dctx.drawImage(tmpCanvas, 0, 0)
      const img = dctx.getImageData(0, 0, cv.width, cv.height)
      for (let k = 0; k < img.data.length; k += 4) {
        const lum = 0.299 * img.data[k] + 0.587 * img.data[k + 1] + 0.114 * img.data[k + 2]
        const v = 255 - lum
        img.data[k] = v; img.data[k + 1] = v; img.data[k + 2] = v
      }
      dctx.putImageData(img, 0, 0)
      const dispData = new Uint8Array(dctx.getImageData(0, 0, cv.width, cv.height).data.buffer)
      const dispTex = new THREE.DataTexture(dispData, cv.width, cv.height, THREE.RGBAFormat)
      dispTex.needsUpdate = true

      // 法线贴图
      const nc = document.createElement('canvas')
      nc.width = cv.width; nc.height = cv.height
      const nctx = nc.getContext('2d')
      const nImg = nctx.createImageData(cv.width, cv.height)
      const strength = 2.0
      for (let y = 1; y < cv.height - 1; y++) {
        for (let x = 1; x < cv.width - 1; x++) {
          const idx = (y * cv.width + x) * 4
          const l = (255 - img.data[(y * cv.width + x - 1) * 4]) / 255
          const r = (255 - img.data[(y * cv.width + x + 1) * 4]) / 255
          const u = (255 - img.data[((y - 1) * cv.width + x) * 4]) / 255
          const d = (255 - img.data[((y + 1) * cv.width + x) * 4]) / 255
          const nx = (l - r) * strength
          const ny = (u - d) * strength
          const nz = 1.0
          const len = Math.sqrt(nx * nx + ny * ny + nz * nz)
          nImg.data[idx] = ((nx / len) * 0.5 + 0.5) * 255
          nImg.data[idx + 1] = ((ny / len) * 0.5 + 0.5) * 255
          nImg.data[idx + 2] = ((nz / len) * 0.5 + 0.5) * 255
          nImg.data[idx + 3] = 255
        }
      }
      nctx.putImageData(nImg, 0, 0)
      const normData = new Uint8Array(nctx.getImageData(0, 0, cv.width, cv.height).data.buffer)
      const normTex = new THREE.DataTexture(normData, cv.width, cv.height, THREE.RGBAFormat)
      normTex.needsUpdate = true

      mat.map = tex
      mat.displacementMap = dispTex
      mat.displacementScale = 0.55
      mat.displacementBias = -0.27
      mat.normalMap = normTex
      mat.normalScale = new THREE.Vector2(0.8, 0.8)
      mat.needsUpdate = true
    })
  }
  load(0)

  const mouse = { x: 0, y: 0 }
  const onMove = (e) => { const r = el.getBoundingClientRect(); mouse.x = ((e.clientX - r.left) / r.width - 0.5) * 2; mouse.y = -((e.clientY - r.top) / r.height - 0.5) * 2 }
  el.addEventListener('pointermove', onMove)

  return {
    setPreset: (i) => load(i),
    setMetalness: (v) => { mat.metalness = v },
    setRoughness: (v) => { mat.roughness = v },
    setDisplacement: (v) => { mat.displacementScale = v },
    update(t) {
      mesh.rotation.y = Math.sin(t * 0.3) * 0.45
      mesh.rotation.x = Math.cos(t * 0.25) * 0.22
      key.position.x = mouse.x * 3.0 + Math.sin(t * 0.6) * 0.5
      key.position.y = mouse.y * 2.5 + Math.cos(t * 0.5) * 0.5
      key.position.z = 3.0 + Math.sin(t * 0.3) * 0.5
    },
    dispose() {
      disposed = true
      el.removeEventListener('pointermove', onMove)
      geo.dispose(); mat.dispose(); disposeTex()
    },
  }
}

export default function HTMLRelief() {
  const { ref, apiRef } = useThree(setupRelief, [])
  const [preset, setPreset] = useState(0)
  const [metalness, setMetalness] = useState(0.15)
  const [roughness, setRoughness] = useState(0.62)
  const [displacement, setDisplacement] = useState(0.55)

  useEffect(() => { apiRef.current?.setPreset(preset) }, [preset, apiRef])
  useEffect(() => { apiRef.current?.setMetalness(metalness) }, [metalness, apiRef])
  useEffect(() => { apiRef.current?.setRoughness(roughness) }, [roughness, apiRef])
  useEffect(() => { apiRef.current?.setDisplacement(displacement) }, [displacement, apiRef])

  return (
    <div>
      <div className="canvas-host" ref={ref} style={{ height: 360, cursor: 'crosshair' }}>
        <span className="canvas-hint">displacementMap + normalMap · 移动鼠标控制光源</span>
      </div>
      <div className="seg-group" style={{ marginTop: 12 }}>
        <span className="seg-label">浮雕内容</span>
        <div className="seg">
          {PRESETS.map((p, i) => (
            <button key={p.key} className={preset === i ? 'on' : ''} onClick={() => setPreset(i)}>{p.label}</button>
          ))}
        </div>
      </div>
      <div className="controls">
        <label>金属度
          <input type="range" min="0" max="1" step="0.01" value={metalness} onChange={(e) => setMetalness(parseFloat(e.target.value))} />
          <span className="val">{metalness.toFixed(2)}</span>
        </label>
        <label>粗糙度
          <input type="range" min="0" max="1" step="0.01" value={roughness} onChange={(e) => setRoughness(parseFloat(e.target.value))} />
          <span className="val">{roughness.toFixed(2)}</span>
        </label>
        <label>位移强度
          <input type="range" min="0" max="1.5" step="0.01" value={displacement} onChange={(e) => setDisplacement(parseFloat(e.target.value))} />
          <span className="val">{displacement.toFixed(2)}</span>
        </label>
      </div>
    </div>
  )
}
