import * as THREE from 'three'

let _supported = null

// 真实探测 WebGL 是否可用：不仅尝试获取上下文，还验证一次基础参数读取。
// 某些环境（如受限的预览 WebView）能拿到上下文对象，但任何 GL 操作都会抛 DOMException，
// 这里用 try/catch 捕获，确保真正可用才返回 true。结果缓存，避免反复创建探测上下文占用槽位。
export function isWebGLAvailable() {
  if (_supported !== null) return _supported
  try {
    const canvas = document.createElement('canvas')
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl')
    if (!gl) {
      _supported = false
      return _supported
    }
    // 触发一次真实读取，若上下文失效会在此抛 DOMException
    const version = gl.getParameter(gl.VERSION)
    _supported = !!version
  } catch (e) {
    _supported = false
  }
  return _supported
}

// 创建 WebGLRenderer，并在不支持/创建失败时安全返回 null。
export function createRenderer(el) {
  const w = el.clientWidth || 320
  const h = el.clientHeight || 240
  let renderer
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  } catch (e) {
    return null
  }
  renderer.setSize(w, h)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  return renderer
}
