import * as THREE from 'three'
import { useThree } from '../lib/useThree'
import { renderToTexture } from '../lib/htmlToCanvas'
import { createHtmlMaterial } from '../lib/htmlShader'
import { drawHeroMain, drawHeroChip, drawHeroMini } from '../lib/render'

// Hero 背景：在 3D 空间中排布一组"画布面板"——面板内容用 Canvas 2D API 直接绘制
// （避免 SVG foreignObject 导致的 canvas tainted 问题），以 uGlow 着色器产生边缘辉光。

function bokehTexture(THREE) {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.4, 'rgba(255,255,255,0.5)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, 64, 64)
  const data = new Uint8Array(g.getImageData(0, 0, 64, 64).data.buffer)
  const tex = new THREE.DataTexture(data, 64, 64, THREE.RGBAFormat)
  tex.needsUpdate = true
  return tex
}

function setupHero({ THREE, scene, camera, el }) {
  let disposed = false
  camera.position.z = 6.8

  const group = new THREE.Group()
  scene.add(group)

  // 地面网格
  const gridHelper = new THREE.GridHelper(30, 30, 0x3a3328, 0x1e1a14)
  gridHelper.position.y = -3.5
  gridHelper.material.transparent = true
  gridHelper.material.opacity = 0.3
  scene.add(gridHelper)

  // 流动粒子场
  const N = 420
  const geo = new THREE.BufferGeometry()
  const pos = new Float32Array(N * 3)
  const col = new Float32Array(N * 3)
  const vel = new Float32Array(N * 3)
  const cA = new THREE.Color(0xe56a3c)
  const cB = new THREE.Color(0xf2a65a)
  const cC = new THREE.Color(0xf8c489)
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 30
    pos[i * 3 + 1] = (Math.random() - 0.5) * 18
    pos[i * 3 + 2] = (Math.random() - 0.5) * 14 - 3
    vel[i * 3] = (Math.random() - 0.5) * 0.01
    vel[i * 3 + 1] = (Math.random() - 0.3) * 0.008
    vel[i * 3 + 2] = (Math.random() - 0.5) * 0.005
    const c = Math.random() > 0.6 ? cA : Math.random() > 0.5 ? cB : cC
    col[i * 3] = c.r
    col[i * 3 + 1] = c.g
    col[i * 3 + 2] = c.b
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
  const sprite = bokehTexture(THREE)
  const pmat = new THREE.PointsMaterial({
    size: 0.45, map: sprite, vertexColors: true, transparent: true,
    opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending,
  })
  const points = new THREE.Points(geo, pmat)
  group.add(points)

  // HTML 面板组
  const panels = []
  const specs = [
    { draw: drawHeroMain, pos: [0, 0, 0], scale: 3.4, rot: 0, glow: 0.6, w: 560, h: 360 },
    { draw: (ctx, w, h) => drawHeroChip(ctx, w, h, '+128%', 'THROUGHPUT', 'RATE'), pos: [3.2, 1.6, -1.6], scale: 1.5, rot: 0.18, glow: 0.5, w: 300, h: 190 },
    { draw: (ctx, w, h) => drawHeroChip(ctx, w, h, '60fps', 'RENDER', 'WEBGL'), pos: [-3.4, -1.8, -2.4], scale: 1.35, rot: -0.22, glow: 0.5, w: 300, h: 190 },
    { draw: (ctx, w, h) => drawHeroMini(ctx, w, h, 'PAINT', 'event'), pos: [2.8, -2.0, 0.8], scale: 1.1, rot: 0.12, glow: 0.4, w: 200, h: 120 },
    { draw: (ctx, w, h) => drawHeroMini(ctx, w, h, '2D / 3D', 'unified'), pos: [-3.0, 1.8, 0.4], scale: 1.0, rot: -0.14, glow: 0.4, w: 200, h: 120 },
  ]
  specs.forEach((s) => {
    const mat = createHtmlMaterial(null, { glow: s.glow })
    const aspect = s.w / s.h
    const geo2 = new THREE.PlaneGeometry(s.scale * aspect, s.scale)
    const mesh = new THREE.Mesh(geo2, mat)
    mesh.position.set(...s.pos)
    mesh.rotation.z = s.rot
    mesh.userData.baseY = s.pos[1]
    mesh.userData.floatOffset = Math.random() * Math.PI * 2
    group.add(mesh)
    const item = { mesh, mat, geo: geo2 }
    panels.push(item)
    renderToTexture(s.draw, { width: s.w, height: s.h, scale: 1 }, THREE).then((tex) => {
      if (disposed) return
      const old = mat.userData.uniforms.uMap.value
      mat.userData.uniforms.uMap.value = tex
      old?.dispose()
    })
  })

  const mouse = { x: 0, y: 0, tx: 0, ty: 0 }
  const onMove = (e) => {
    mouse.tx = e.clientX / window.innerWidth - 0.5
    mouse.ty = e.clientY / window.innerHeight - 0.5
  }
  window.addEventListener('mousemove', onMove)

  return {
    update(t) {
      const arr = geo.attributes.position.array
      for (let i = 0; i < N; i++) {
        arr[i * 3] += vel[i * 3]
        arr[i * 3 + 1] += vel[i * 3 + 1]
        arr[i * 3 + 2] += vel[i * 3 + 2]
        if (arr[i * 3 + 1] < -9) arr[i * 3 + 1] = 9
        if (arr[i * 3] > 15) arr[i * 3] = -15
        if (arr[i * 3] < -15) arr[i * 3] = 15
      }
      geo.attributes.position.needsUpdate = true
      points.rotation.y = t * 0.02
      group.rotation.y = Math.sin(t * 0.12) * 0.10
      panels.forEach((p) => {
        p.mat.userData.uniforms.uTime.value = t
        p.mesh.position.y = p.mesh.userData.baseY + Math.sin(t * 0.5 + p.mesh.userData.floatOffset) * 0.12
      })
      mouse.x += (mouse.tx - mouse.x) * 0.04
      mouse.y += (mouse.ty - mouse.y) * 0.04
      camera.position.x = mouse.x * 1.6
      camera.position.y = -mouse.y * 1.0
      camera.lookAt(0, 0, 0)
    },
    dispose() {
      disposed = true
      window.removeEventListener('mousemove', onMove)
      geo.dispose(); pmat.dispose(); sprite.dispose()
      gridHelper.geometry.dispose(); gridHelper.material.dispose()
      panels.forEach((p) => { p.geo.dispose(); p.mat.userData.uniforms.uMap.value?.dispose(); p.mat.dispose() })
    },
  }
}

export default function HeroCanvas() {
  const { ref } = useThree(setupHero, [])
  return <div className="hero-canvas" ref={ref} />
}
