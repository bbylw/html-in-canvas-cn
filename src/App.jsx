import { useEffect, useRef } from 'react'
import Nav from './components/Nav'
import Rail from './components/Rail'
import HeroCanvas from './components/HeroCanvas'
import SectionHeader from './components/SectionHeader'
import HTMLTextureStudio from './components/HTMLTextureStudio'
import HTMLCube from './components/HTMLCube'
import CanvasDrawDemo from './components/CanvasDrawDemo'
import HTMLPointCloud from './components/HTMLPointCloud'
import HTMLRelief from './components/HTMLRelief'
import RotatedTextDemo from './components/RotatedTextDemo'
import PieChartDemo from './components/PieChartDemo'
import CodeBlock from './components/CodeBlock'
import { Reveal } from './lib/useReveal'
import * as D from './data/content'

function Hero() {
  return (
    <header className="hero wrap" id="top">
      <div className="hero-grid">
        <div className="hero-text">
          <div className="hero-badge">
            <span className="dot" />
            WICG 提案 · Living Explainer · Chromium 实验特性
          </div>
          <h1>
            用 <span className="g">Canvas</span> 重新
            <br />
            定义 <span className="g">HTML</span> 的渲染
          </h1>
          <p className="sub">
            HTML-in-Canvas 是一套把复杂的富 HTML 内容排版后、绘制进 2D 与 3D 画布的原语。
            它在可访问性、国际化、性能与渲染质量上打开新的可能 —— 而渲染，由你掌控。
          </p>
          <div className="hero-actions">
            <a className="btn primary" href="#pipeline">
              ▶ 查看渲染管线
            </a>
            <a className="btn ghost" href="#proposal">
              了解提案方案
            </a>
          </div>
          <div className="hero-stats">
            <div className="stat">
              <div className="n accent">4</div>
              <div className="l">核心原语</div>
            </div>
            <div className="stat">
              <div className="n">2D / 3D</div>
              <div className="l">统一渲染路径</div>
            </div>
          <div className="stat">
            <div className="n">6</div>
            <div className="l">几何体类型</div>
          </div>
        </div>
        </div>
        <div className="hero-stage">
          <HeroCanvas />
          <div className="reticle">
            <span className="label">VIEWPORT · drawElementImage</span>
          </div>
        </div>
      </div>
      <div className="scroll-hint">
        <span>SCROLL</span>
        <span className="line" />
      </div>
    </header>
  )
}

export default function App() {
  const progressRef = useRef(null)
  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement
      const max = h.scrollHeight - h.clientHeight
      const p = max > 0 ? (h.scrollTop / max) * 100 : 0
      if (progressRef.current) progressRef.current.style.width = p + '%'
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <>
      <div className="ambient" />
      <div className="ambient-grid" />
      <div className="grain" />
      <div className="scroll-progress" ref={progressRef} />
      <Nav />
      <Rail />
      <Hero />

      {/* 状态 */}
      <Reveal as="section" className="wrap" id="status">
        <div className="card" style={{ borderColor: 'var(--border-strong)' }}>
          <span className="eyebrow">状态</span>
          <p style={{ color: 'var(--text-dim)', fontSize: 15 }}>{D.meta.status}</p>
          <div className="pill-row">
            <span className="pill">
              <b>flag:</b> #canvas-draw-element
            </span>
            <span className="pill">
              <b>实现:</b> Chromium 实验特性
            </span>
            <span className="pill">
              <b>类型:</b> 持续更新文档
            </span>
          </div>
        </div>
      </Reveal>

      {/* 动机 */}
      <section className="wrap" id="motivation">
        <SectionHeader
          index="01"
          eyebrow="动机"
          title="为什么需要它？"
          lead={D.motivationIntro}
        />
        <div className="grid grid-3" style={{ marginTop: 28 }}>
          {D.useCases.map((u) => (
            <div className="card use-case" key={u.h}>
              <div className="ic">{u.ic}</div>
              <div>
                <h4>{u.h}</h4>
                <p>{u.p}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 提案方案 */}
      <section className="wrap" id="proposal">
        <SectionHeader
          index="02"
          eyebrow="提案方案"
          title="四个主要原语"
          lead="方案引入了四个主要原语：一个用于选择加入（opt-in）canvas 元素的属性、将子元素绘制进 canvas 的方法、一个用于处理更新的事件，以及一个用于 Worker 支持的快照捕获方法。"
        />
        <div className="card" style={{ marginTop: 24, padding: '6px 26px' }}>
          {D.primitives.map((p) => (
            <div className="primitive" key={p.idx}>
              <div className="idx">{p.idx}</div>
              <div>
                <h3 dangerouslySetInnerHTML={{ __html: p.title }} />
                <p dangerouslySetInnerHTML={{ __html: p.body }} />
                {p.list && (
                  <ul>
                    {p.list.map((li, i) => (
                      <li key={i} dangerouslySetInnerHTML={{ __html: li }} />
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="callout">
          <span className="ic">🔗</span>
          <p>
            <b>同步：</b>命中测试、交集观察器与可访问性都依赖元素的 DOM 位置。为保障这些特性，应当更新元素的{' '}
            <code className="inline-code">transform</code>，使其 DOM 位置与绘制位置相匹配。
            <code className="inline-code">drawElementImage()</code> 会返回可应用的 CSS 变换；3D 上下文则提供
            <code className="inline-code">getElementTransform(element, drawTransform)</code> 辅助方法。
          </p>
        </div>
      </section>

      {/* 实时渲染管线 */}
      <section className="wrap" id="pipeline">
        <SectionHeader
          index="03"
          eyebrow="核心演示"
          title="实时 HTML → WebGL 渲染管线"
          lead="这正是「HTML-in-Canvas」的精髓：左侧为一段排版后的富 HTML（即 canvas 的子元素），右侧在 WebGL 中被光栅化并贴到 3D 表面。5 种 HTML 源 × 6 种几何体，全部运行时可切换。可拖动旋转。"
        />
        <HTMLTextureStudio />
      </section>

      {/* 3D 立方体 */}
      <section className="wrap" id="demo">
        <SectionHeader
          index="04"
          eyebrow="3D 上下文"
          title="把 HTML 绘到 3D 立方体"
          lead="等价于 README 中「使用 WebGL 的 texElementImage2D 把 HTML 绘制到一个 3D 立方体上」的演示。立方体的每个面都是一段真实排版后的富 HTML（经光栅化后作为纹理），叠加边缘辉光着色器与线框。拖动旋转（含惯性），点击任意面将其聚焦到正前方。"
        />
        <div className="demo">
          <div className="head">
            <span className="tag">three.js · CanvasTexture + 着色器 + EdgesGeometry</span>
            <h4>HTML-on-Cube</h4>
            <p>等价于 texElementImage2D / copyElementImageToTexture</p>
          </div>
          <div className="body">
            <HTMLCube />
          </div>
        </div>

        <h2 className="title" style={{ fontSize: 24, marginTop: 56 }}>
          HTML 像素 → 3D 几何
        </h2>
        <p className="lead">
          栅格化后的 HTML 不只可作彩色纹理：逐像素采样可重建为发光点云（支持预设间平滑变形与鼠标交互），其亮度也可作为位移高度场（配合法线贴图与可调光照），由真实光照雕刻出浮雕。
        </p>
        <div className="split" style={{ marginTop: 24, alignItems: 'start' }}>
          <div className="demo">
            <div className="head">
              <span className="tag">THREE.Points · 像素采样 · 变形动画</span>
              <h4>HTML 点云</h4>
              <p>字形 → 发光粒子 · 平滑变形</p>
            </div>
            <div className="body">
              <HTMLPointCloud />
            </div>
          </div>
          <div className="demo">
            <div className="head">
              <span className="tag">displacementMap + normalMap · 光照</span>
              <h4>HTML 浮雕</h4>
              <p>亮度驱动高度场 · 鼠标控光</p>
            </div>
            <div className="body">
              <HTMLRelief />
            </div>
          </div>
        </div>

        <h2 className="title" style={{ fontSize: 24, marginTop: 56 }}>
          2D 路径：模拟 drawElementImage
        </h2>
        <p className="lead">
          在 2D 上下文中，把一个 canvas 子元素绘制进画布，并施加变换（旋转 / 缩放 / 倾斜 / 透视）、回写 transform 以同步位置。左侧编辑 HTML 内容，右侧实时栅格化并绘制。
        </p>
        <div className="demo">
          <div className="head">
            <span className="tag">Canvas2D · foreignObject · 实时编辑</span>
            <h4>drawElementImage 模拟器</h4>
            <p>旋转 / 缩放 / 倾斜 / 透视</p>
          </div>
          <div className="body">
            <CanvasDrawDemo />
          </div>
        </div>
      </section>

      {/* 示例 */}
      <section className="wrap" id="examples">
        <SectionHeader index="05" eyebrow="示例" title="基础示例" lead="在 canvas 上声明 layoutsubtree，并在 paint 事件中用 drawElementImage 把一个 form 绘制进去。" />
        <CodeBlock code={D.basicExample} lang="html" name="basic-example.html" />

        <h2 className="title" style={{ fontSize: 24, marginTop: 48 }}>
          OffscreenCanvas 示例
        </h2>
        <p className="lead">
          在 Worker 中使用 OffscreenCanvas：canvas 子元素在 paint 事件中被捕获为 ElementImage 并传输到
          Worker 绘制，位置变换再回传主线程。
        </p>
        <CodeBlock code={D.offscreenExample} lang="html" name="offscreen-example.html" />

        <h2 className="title" style={{ fontSize: 24, marginTop: 48 }}>
          IDL 变更
        </h2>
        <p className="lead">提案对 canvas 与 OffscreenCanvas 接口、绘制混入以及 WebGL/WebGPU 的扩展。</p>
        <CodeBlock code={D.idlExample} lang="js" name="idl.diff" />
      </section>

      {/* 演示画廊 */}
      <section className="wrap" id="demos">
        <SectionHeader index="06" eyebrow="演示" title="官方演示（在线）" lead="以下为 README 中列出的在线演示；下方两个为可直接交互的本地复刻。" />
        <div className="grid grid-3" style={{ marginTop: 24 }}>
          {D.demos.map((d) => (
            <div className="card" key={d.h}>
              <span className="pill" style={{ marginBottom: 10 }}>
                <b>{d.tag}</b>
              </span>
              <h4 style={{ fontSize: 16 }}>{d.h}</h4>
              <p style={{ color: 'var(--text-dim)', fontSize: 13.5, marginTop: 5 }}>{d.p}</p>
            </div>
          ))}
        </div>

        <div className="split" style={{ marginTop: 40 }}>
          <div className="demo">
            <div className="head">
              <span className="tag">drawElementImage · 鼠标交互</span>
              <h4>旋转的复杂文本</h4>
            </div>
            <div className="body">
              <RotatedTextDemo />
            </div>
          </div>
          <div className="demo">
            <div className="head">
              <span className="tag">drawElementImage · hover 高亮</span>
              <h4>带多行标签的饼图</h4>
            </div>
            <div className="body">
              <PieChartDemo />
            </div>
          </div>
        </div>
      </section>

      {/* 安全 */}
      <section className="wrap" id="security">
        <SectionHeader index="07" eyebrow="允许回读的渲染" title="安全与隐私" lead="drawElementImage 及 paint 事件都不得泄露任何在作者脚本中原本无法获取的敏感信息。这一概念称为「允许回读的渲染」（read-back-allowed rendering），因为它使得像素回读成为可能。" />
        <div className="sec-list">
          <div className="sec-item">
            <h5>
              <span className="badge no">排除</span>绘制与失效时剔除的敏感信息
            </h5>
            <ul>
              {D.sensitiveExcluded.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
          <div className="sec-item">
            <h5>
              <span className="badge ok">允许</span>不视为敏感的新信息
            </h5>
            <ul>
              {D.sensitiveAllowed.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 开发者试用 */}
      <Reveal as="section" className="wrap">
        <div className="callout" style={{ alignItems: 'flex-start' }}>
          <span className="ic">🧪</span>
          <p dangerouslySetInnerHTML={{ __html: D.devTrial }} />
        </div>
        <div className="pill-row">
          <span className="pill">
            <b>开启:</b> Chrome Canary
          </span>
          <span className="pill">
            <b>flag:</b> #canvas-draw-element
          </span>
          <span className="pill">
            <b>反馈:</b> GitHub Issues
          </span>
        </div>
      </Reveal>

      {/* 设计取舍 */}
      <section className="wrap" id="alt">
        <SectionHeader index="08" eyebrow="曾考虑的替代方案" title="paint 事件触发时机" lead="需要新增 paint 事件，以便开发者有机会针对绘制变化更新 canvas 渲染。它应被集成进 update-the-rendering，使 canvas 更新与 DOM 保持同步。最终采用方案 C。" />
        {D.alternatives.map((a) => (
          <div className="alt" key={a.id}>
            <span className={`pick ${a.chosen ? 'chosen' : 'other'}`}>
              {a.chosen ? '✓ 已采用' : `方案 ${a.id}`}
            </span>
            <h4>{a.title}</h4>
            <p>{a.body}</p>
          </div>
        ))}
        <div className="card" style={{ marginTop: 24 }}>
          <span className="eyebrow" style={{ marginBottom: 10 }}>
            未来考虑
          </span>
          <p style={{ color: 'var(--text-dim)' }} dangerouslySetInnerHTML={{ __html: D.future }} />
        </div>
      </section>

      {/* 作者 */}
      <section className="wrap" id="authors">
        <SectionHeader index="09" eyebrow="作者" title="提案作者" />
        <div className="authors">
          {D.authors.map((a) => (
            <div className="author" key={a.em}>
              <div className="av">{a.nm.charAt(0)}</div>
              <div>
                <div className="nm">{a.nm}</div>
                <div className="em">{a.em}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer>
        <div className="wrap">
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text)' }}>HTML-in-Canvas · 中文可视化</div>
            <div style={{ marginTop: 5 }}>
              基于 WICG 提案 README 构建 · React + Three.js · 演示采用 SVG foreignObject 模拟 drawElementImage
            </div>
          </div>
          <div className="links">
            <a href="https://github.com/WICG/html-in-canvas" target="_blank" rel="noreferrer">
              WICG 仓库
            </a>
            <a href="#pipeline">回到演示</a>
            <a href="#top">顶部 ↑</a>
          </div>
        </div>
      </footer>
    </>
  )
}
