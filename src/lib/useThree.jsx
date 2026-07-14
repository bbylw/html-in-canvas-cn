import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { createRenderer, isWebGLAvailable } from './webgl'

// 统一的 Three.js 生命周期管理：
//  - 当宿主元素进入视口时创建 WebGL 上下文；离开视口时暂停渲染（不销毁），再次进入时恢复。
//  - 渲染循环包裹 try/catch；监听 webglcontextlost，出错时优雅停止。
//  - 通过 apiRef 把 factory 暴露的方法回传给 React 组件。
//
// factory(ctx) 接收 { THREE, renderer, scene, camera, el, width, height }，
// 返回 { update?(t), resize?(w,h), dispose?(), ...custom } 的子集。
export function useThree(factory, deps = []) {
  const ref = useRef(null)
  const apiRef = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!isWebGLAvailable()) {
      el.dataset.webgl = 'unsupported'
      el.classList.add('webgl-unsupported')
      return
    }

    let renderer = null
    let scene = null
    let camera = null
    let handle = null
    let raf = 0
    let timer = null
    let disposed = false
    let initialized = false
    let visible = false

    const onLost = (e) => {
      e.preventDefault()
      cancelAnimationFrame(raf)
      el.classList.add('webgl-unsupported')
    }

    const animate = () => {
      if (disposed || !renderer || !handle || !visible) return
      timer.update()
      const t = timer.getElapsed()
      try {
        handle.update?.(t)
        renderer.render(scene, camera)
      } catch (err) {
        cancelAnimationFrame(raf)
        el.classList.add('webgl-unsupported')
        return
      }
      raf = requestAnimationFrame(animate)
    }

    // 初始化：创建 renderer、scene、camera，调用 factory — 只执行一次
    const init = () => {
      if (initialized || disposed) return
      const w = el.clientWidth || 320
      const h = el.clientHeight || 240
      renderer = createRenderer(el)
      if (!renderer) {
        el.classList.add('webgl-unsupported')
        return
      }
      el.appendChild(renderer.domElement)
      renderer.domElement.addEventListener('webglcontextlost', onLost)
      scene = new THREE.Scene()
      camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 1000)
      try {
        handle = factory({ THREE, renderer, scene, camera, el, width: w, height: h })
      } catch (err) {
        el.classList.add('webgl-unsupported')
        return
      }
      apiRef.current = handle
      timer = new THREE.Timer()
      initialized = true
    }

    // 视口可见性变化：启动/暂停渲染循环（不销毁 WebGL 上下文）
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          if (en.isIntersecting) {
            if (!initialized) init()
            if (initialized && !visible) {
              visible = true
              animate()
            }
          } else {
            visible = false
            cancelAnimationFrame(raf)
          }
        }
      },
      { threshold: 0.01 }
    )
    io.observe(el)

    const ro = new ResizeObserver(() => {
      if (!renderer || !handle) return
      const w = el.clientWidth || 320
      const h = el.clientHeight || 240
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      renderer.setSize(w, h)
      handle.resize?.(w, h)
    })
    ro.observe(el)

    return () => {
      disposed = true
      io.disconnect()
      ro.disconnect()
      cancelAnimationFrame(raf)
      if (renderer) {
        renderer.domElement?.removeEventListener('webglcontextlost', onLost)
        try { handle?.dispose?.() } catch (_) {}
        try { renderer.dispose() } catch (_) {}
        if (renderer.domElement?.parentNode === el) el.removeChild(renderer.domElement)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { ref, apiRef }
}
