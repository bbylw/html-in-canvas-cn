import * as THREE from 'three'

// 用 ShaderMaterial 直接编写完整着色器，不依赖 onBeforeCompile。
// 11 种特效模式 + 边缘辉光 + UV 变换，全部在一个 fragment shader 中用 if 分支实现。
// 纹理通过 DataTexture 传入（从 Canvas 2D getImageData 提取像素），避免 Electron tainted canvas 问题。

const vertexShader = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = vec2(uv.x, 1.0 - uv.y);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

const fragmentShader = /* glsl */`
  precision highp float;
  uniform sampler2D uMap;
  uniform float uTime;
  uniform float uEffect;
  uniform int uEffectMode;
  uniform float uGlow;
  uniform float uUvRot;
  uniform vec2 uUvOffset;
  varying vec2 vUv;

  void main() {
    // UV 旋转
    vec2 baseUv = vUv - 0.5;
    float ca = uUvRot;
    baseUv = mat2(cos(ca), sin(ca), -sin(ca), cos(ca)) * baseUv;
    baseUv += 0.5;
    baseUv += uUvOffset;

    vec2 suv = baseUv;

    // Mode 3: Ripple
    if (uEffectMode == 3) {
      float rr = length(vUv - 0.5);
      suv += (vUv - 0.5) * sin(rr * 22.0 - uTime * 3.0) * 0.035 * uEffect;
    }

    // Mode 9: Wave
    if (uEffectMode == 9) {
      suv.x += sin(suv.y * 18.0 + uTime * 2.5) * 0.015 * uEffect;
      suv.y += cos(suv.x * 14.0 + uTime * 1.8) * 0.012 * uEffect;
    }

    // Mode 6: Glitch
    if (uEffectMode == 6) {
      float slice = floor(suv.y * 24.0);
      float noise = fract(sin(slice * 12.9898 + uTime * 4.0) * 43758.5453);
      float shift = step(0.65, noise) * (noise - 0.65) * 0.8;
      suv.x += shift * uEffect;
    }

    // Mode 8: Pixelate
    if (uEffectMode == 8) {
      float pix = mix(256.0, 12.0, uEffect);
      suv = floor(suv * pix) / pix;
    }

    // 采样纹理
    vec2 clampedUv = clamp(suv, 0.0, 1.0);
    vec4 tex;
    if (uEffectMode == 4) {
      // Mode 4: Chromatic aberration
      float off = 0.006 * uEffect * (0.6 + 0.4 * sin(uTime + baseUv.y * 6.0));
      tex.r = texture2D(uMap, clamp(suv + vec2(off, 0.0), 0.0, 1.0)).r;
      tex.g = texture2D(uMap, clampedUv).g;
      tex.b = texture2D(uMap, clamp(suv - vec2(off, 0.0), 0.0, 1.0)).b;
      tex.a = texture2D(uMap, clampedUv).a;
    } else {
      tex = texture2D(uMap, clampedUv);
    }

    vec3 diffuseColor = tex.rgb;
    float alpha = tex.a;

    // Mode 1: Holographic
    if (uEffectMode == 1) {
      float band = 0.5 + 0.5 * sin(vUv.y * 32.0 - uTime * 2.0);
      vec3 holo = mix(vec3(0.90, 0.42, 0.24), vec3(0.96, 0.66, 0.36), band);
      diffuseColor = mix(diffuseColor, diffuseColor * holo * 1.7, uEffect * 0.85);
      diffuseColor += uEffect * 0.05 * band;
    }

    // Mode 2: CRT scanlines
    if (uEffectMode == 2) {
      float scan = 0.5 + 0.5 * sin(vUv.y * 900.0 + uTime * 4.0);
      diffuseColor *= 1.0 - uEffect * 0.4 * scan;
      float bar = smoothstep(0.0, 0.06, abs(fract(vUv.y - uTime * 0.08) - 0.5) - 0.45);
      diffuseColor += uEffect * 0.05 * bar;
      diffuseColor *= 1.0 - uEffect * 0.28 * length(vUv - 0.5);
    }

    // Mode 5: Emboss
    if (uEffectMode == 5) {
      float e = 0.0025;
      float L = dot(texture2D(uMap, clamp(suv + vec2(-e, 0.0), 0.0, 1.0)).rgb, vec3(0.299, 0.587, 0.114));
      float R = dot(texture2D(uMap, clamp(suv + vec2(e, 0.0), 0.0, 1.0)).rgb, vec3(0.299, 0.587, 0.114));
      float U = dot(texture2D(uMap, clamp(suv + vec2(0.0, -e), 0.0, 1.0)).rgb, vec3(0.299, 0.587, 0.114));
      float D = dot(texture2D(uMap, clamp(suv + vec2(0.0, e), 0.0, 1.0)).rgb, vec3(0.299, 0.587, 0.114));
      vec3 N = normalize(vec3((L - R) * uEffect, (U - D) * uEffect, 1.0));
      vec3 Ldir = normalize(vec3(0.5, 0.6, 0.85));
      float diff = clamp(dot(N, Ldir), 0.0, 1.0);
      float sp = pow(clamp(dot(reflect(-Ldir, N), vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 22.0);
      vec3 tint = vec3(0.90, 0.42, 0.24);
      diffuseColor = diffuseColor * (0.45 + diff * 0.8) + sp * uEffect * tint;
    }

    // Mode 7: Thermal
    if (uEffectMode == 7) {
      float lum = dot(diffuseColor, vec3(0.299, 0.587, 0.114));
      vec3 therm;
      if (lum < 0.25) therm = mix(vec3(0.02, 0.0, 0.1), vec3(0.3, 0.0, 0.5), lum / 0.25);
      else if (lum < 0.5) therm = mix(vec3(0.3, 0.0, 0.5), vec3(0.8, 0.15, 0.1), (lum - 0.25) / 0.25);
      else if (lum < 0.75) therm = mix(vec3(0.8, 0.15, 0.1), vec3(1.0, 0.7, 0.0), (lum - 0.5) / 0.25);
      else therm = mix(vec3(1.0, 0.7, 0.0), vec3(1.0, 1.0, 0.9), (lum - 0.75) / 0.25);
      diffuseColor = mix(diffuseColor, therm, uEffect);
    }

    // Mode 10: Fresnel glow
    if (uEffectMode == 10) {
      float ex2 = min(min(vUv.x, 1.0 - vUv.x), min(vUv.y, 1.0 - vUv.y));
      float fres = smoothstep(0.12, 0.0, ex2);
      vec3 irid = mix(vec3(0.90, 0.42, 0.24), vec3(0.96, 0.66, 0.36), 0.5 + 0.5 * sin(vUv.x * 8.0 + uTime));
      diffuseColor = mix(diffuseColor, irid, fres * uEffect * 0.8);
      diffuseColor += fres * uEffect * 0.15;
    }

    // Edge glow (all modes)
    float ex = min(min(suv.x, 1.0 - suv.x), min(suv.y, 1.0 - suv.y));
    float eg = smoothstep(0.055, 0.0, ex) * uGlow;
    diffuseColor += eg * vec3(0.90, 0.42, 0.24);

    gl_FragColor = vec4(diffuseColor, alpha);
  }
`

export function createHtmlMaterial(
  texture,
  { glow = 0, effect = 0, effectMode = 0, uvRot = 0, uvOffset = [0, 0] } = {}
) {
  // 如果没有提供纹理或纹理无图像数据，创建 1x1 白色 DataTexture
  if (!texture || !texture.isTexture || !texture.image) {
    const data = new Uint8Array([255, 255, 255, 255])
    texture = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat)
    texture.needsUpdate = true
  }

  const uniforms = {
    uMap: { value: texture },
    uTime: { value: 0 },
    uEffect: { value: effect },
    uEffectMode: { value: effectMode },
    uGlow: { value: glow },
    uUvRot: { value: uvRot },
    uUvOffset: { value: new THREE.Vector2(uvOffset[0], uvOffset[1]) },
  }

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
  })

  // 确保material.uniforms存在且userData.uniforms指向它
  // 在某些情况下Three.js可能需要时间来初始化uniforms
  material.userData.uniforms = material.uniforms || uniforms
  
  // 如果material.uniforms不存在，我们手动设置它
  if (!material.uniforms) {
    material.uniforms = uniforms
  }
  
  return material
}
