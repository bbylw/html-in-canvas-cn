// README 内容的结构化中文数据

export const meta = {
  title: 'HTML-in-Canvas',
  subtitle: '在画布中渲染 HTML',
  status:
    '这是一个持续更新的解释性文档（living explainer），会随着我们收到的反馈不断更新。这里描述的 API 已在 Chromium 中以实验特性（flag）的形式实现，可通过 chrome://flags/#canvas-draw-element 开启。',
}

export const motivationIntro =
  '目前没有 Web API 能够轻松地将复杂的文本及其它内容排版后渲染进 <canvas>。因此，基于 <canvas> 的内容在可访问性、国际化、性能以及渲染质量上都存在不足。'

export const useCases = [
  { ic: '📝', h: 'Canvas 中带样式的排版内容', p: '需求非常强烈。例如图表组件（图例、坐标轴等）、创意工具中的富内容框，以及游戏内菜单。' },
  { ic: '♿', h: '可访问性改进', p: '目前无法保证用于 canvas 可访问性的回退内容始终与渲染结果一致。借助本 API，绘制到 canvas 中的元素将与其回退内容保持一致。' },
  { ic: '✨', h: '为 HTML 元素叠加特效', p: '目前已支持有限的 CSS 效果（filters、backdrop-filter、mix-blend-mode），还希望将通用的 WebGL 着色器用于 HTML。' },
  { ic: '🧊', h: '在 3D 上下文中渲染 HTML', p: '网站和游戏的 3D 部分需要在 3D 场景中的表面上渲染丰富的 2D 内容。' },
  { ic: '🎬', h: '媒体导出', p: '需要将 HTML 内容导出为图片或视频。' },
]

export const primitives = [
  {
    idx: 1,
    title: 'layoutsubtree 属性',
    code: 'layoutsubtree',
    body:
      '<code>layoutsubtree</code> 属性使 canvas 的后代元素参与布局并介入命中测试（hit testing）。它会使 canvas 的直接子元素拥有层叠上下文（stacking context），成为所有后代元素的包含块（containing block），并具备绘制包含性（paint containment）。Canvas 的子元素表现得如同可见一般，但在通过调用 <code>drawElementImage()</code> 显式绘制进 canvas 之前，用户并不会看到它们的渲染结果。',
  },
  {
    idx: 2,
    title: 'drawElementImage（及 WebGL/WebGPU 等效方法）',
    code: 'drawElementImage()',
    body:
      '<code>drawElementImage()</code> 方法将一个 canvas 子元素绘制进 canvas，并返回一个可应用于 <code>element.style.transform</code> 的变换，用于将元素的 DOM 位置与其绘制位置对齐。在 paint 事件之前，会记录 canvas 所有子元素渲染结果的快照。',
    list: [
      '要求：最近一次渲染更新中必须在 canvas 上指定 layoutsubtree，且 element 必须是 canvas 的直接子元素并已生成盒子（非 display:none）。',
      '变换：绘制进 canvas 时会应用 canvas 当前的变换矩阵；源元素上的 CSS 变换在绘制时被忽略（但仍影响命中测试 / 可访问性）。',
      '裁剪：溢出内容（布局溢出与墨迹溢出）会被裁剪到元素的边框盒（border box）。',
      '尺寸：可选 width/height 指定目标矩形；省略时按屏幕大小与比例绘制。',
      'WebGL/WebGPU 支持：新增 WebGLRenderingContext.texElementImage2D 与 copyElementImageToTexture。',
    ],
  },
  {
    idx: 3,
    title: 'paint 事件',
    code: 'paint',
    body:
      '为 canvas 新增 <code>paint</code> 事件，当任意 canvas 子元素的渲染发生变化时触发，在 update-the-rendering 期间的交集观察器步骤之后紧接着触发，并包含已发生变化的子元素列表。由于子元素上的 CSS 变换在渲染时被忽略，改变变换不会导致 paint 事件在下一帧触发。为支持每帧更新，新增 <code>requestPaint()</code>，类似 requestAnimationFrame()。',
  },
  {
    idx: 4,
    title: 'captureElementImage',
    code: 'captureElementImage',
    body:
      '为支持 Worker 中的 <code>OffscreenCanvas</code>，可使用 <code>canvas.captureElementImage(element)</code> 将某元素的快照捕获为 <code>ElementImage</code> 对象。这些对象可传输到 Worker 中并绘制到 OffscreenCanvas 上。命中测试、交集观察器与可访问性都依赖 DOM 位置，因此应当更新元素的 transform，使其 DOM 位置与绘制位置匹配。',
  },
]

export const basicExample = `<canvas id="canvas" style="width: 400px; height: 200px;" layoutsubtree>
  <form id="form_element">
    <label for="name">name:</label>
    <input id="name">
  </form>
</canvas>

<script>
  const ctx = document.getElementById('canvas').getContext('2d');

  canvas.onpaint = () => {
    ctx.reset();
    const transform = ctx.drawElementImage(form_element, 100, 0);
    form_element.style.transform = transform.toString();
  };

  // Size the canvas grid to match the device scale factor to prevent blurriness.
  const observer = new ResizeObserver(([entry]) => {
    canvas.width = entry.devicePixelContentBoxSize[0].inlineSize;
    canvas.height = entry.devicePixelContentBoxSize[0].blockSize;
  });
  observer.observe(canvas, {box: 'device-pixel-content-box'});
</script>`

export const offscreenExample = `<canvas id="canvas" style="width: 400px; height: 200px;" layoutsubtree>
  <form id="form_element">
    <label for="name">name:</label>
    <input id="name">
  </form>
</canvas>
<script>
  const workerCode = \`
    let ctx;
    self.onmessage = (e) => {
      if (e.data.canvas) ctx = e.data.canvas.getContext('2d');
      if (e.data.width && e.data.height) {
        ctx.canvas.width = e.data.width;
        ctx.canvas.height = e.data.height;
      }
      if (e.data.elementImage) {
        ctx.reset();
        const transform = ctx.drawElementImage(e.data.elementImage, 100, 0);
        self.postMessage({transform: transform});
      }
    };
  \`;

  const worker = new Worker(URL.createObjectURL(new Blob([workerCode])));
  const offscreen = canvas.transferControlToOffscreen();
  worker.postMessage({ canvas: offscreen }, [offscreen]);

  canvas.onpaint = (event) => {
    const elementImage = canvas.captureElementImage(form_element)
    worker.postMessage({ elementImage: elementImage }, [elementImage]);
  };

  worker.onmessage = ({data}) => {
    form_element.style.transform = data.transform.toString();
  };

  const observer = new ResizeObserver(([entry]) => {
    worker.postMessage({
      width: entry.devicePixelContentBoxSize[0].inlineSize,
      height: entry.devicePixelContentBoxSize[0].blockSize
    });
    canvas.requestPaint();
  });
  observer.observe(canvas, { box: 'device-pixel-content-box' });
</script>`

export const idlExample = `partial interface HTMLCanvasElement {
  [CEReactions, Reflect] attribute boolean layoutSubtree;
  attribute EventHandler onpaint;
  void requestPaint();
  ElementImage captureElementImage(Element element);
  DOMMatrix getElementTransform((Element or ElementImage) element, DOMMatrix drawTransform);
};

partial interface OffscreenCanvas {
  DOMMatrix getElementTransform((Element or ElementImage) element, DOMMatrix drawTransform);
};

interface mixin CanvasDrawElementImage {
  DOMMatrix drawElementImage((Element or ElementImage) element,
                             unrestricted double dx, unrestricted double dy);
  DOMMatrix drawElementImage((Element or ElementImage) element,
                             unrestricted double dx, unrestricted double dy,
                             unrestricted double dwidth, unrestricted double dheight);
};

CanvasRenderingContext2D includes CanvasDrawElementImage;
OffscreenCanvasRenderingContext2D includes CanvasDrawElementImage;

partial interface WebGLRenderingContext {
  void texElementImage2D(GLenum target, GLenum internalformat,
                         (Element or ElementImage) element,
                         optional WebGLCopyElementImageConfig config = {});
};`

export const demos = [
  { h: '旋转的复杂文本', p: '使用 drawElementImage API 绘制旋转后的复杂文本。', tag: 'drawElementImage' },
  { h: '带多行标签的饼图', p: '使用 drawElementImage API 绘制带多行标签的饼图。', tag: 'drawElementImage' },
  { h: 'WebGPU 果冻滑块', p: '使用 copyElementImageToTexture 在果冻滑块下方绘制 div。', tag: 'WebGPU' },
  { h: 'HTML 贴到 3D 立方体', p: '使用 texElementImage2D 将 HTML 绘制到一个 3D 立方体上。', tag: 'WebGL' },
  { h: 'canvas 中的交互内容', p: 'canvas 中的交互式表单内容。', tag: '交互' },
]

export const sensitiveExcluded = [
  '嵌入内容（<iframe>、<img>）中的跨源数据，<url> 引用（background-image、clip-path），被跨源数据污染的 <canvas>，以及 SVG（<use>、<pattern>、<feImage>）。',
  '系统颜色、主题或偏好设置。',
  '拼写与语法标记。',
  '已访问链接信息。',
  'JavaScript 原本无法获取的、待填写的表单自动填充信息。',
  '亚像素文本抗锯齿。',
  '用户对字幕（caption）和副标题（subtitle）选择及外观的偏好设置。',
  'IME 弹窗以及独特的 IME 文本格式。',
]

export const sensitiveAllowed = [
  '搜索文本（在页面中查找）和文本片段（fragment url）标记。',
  '滚动条和表单元素外观（在 Blink 和 WebKit 中已可通过 foreignObject 检测到）。',
  '光标闪烁频率。',
  'forced-colors（已可通过 forced-colors 媒体查询以及系统颜色供 javascript 获取）。',
]

export const devTrial =
  'HTML-in-Canvas 特性可在 Chrome Canary 中通过 chrome://flags/#canvas-draw-element 开启。我们对以下主题的反馈最感兴趣：哪些内容可用、哪些会失败？哪些失败模式最亟待修复？该特性如何与可访问性特性交互、如何改进对可访问性的支持？'

export const alternatives = [
  {
    id: 'A',
    title: '方案 A：在 resize observer 的时机触发 paint',
    chosen: false,
    body:
      '与 resize observer 类似，需要循环机制来处理 paint 事件执行了 DOM 修改的情况。循环的一个弊端是用户的 canvas 代码可能需要在每帧中运行多次。采用占位符模型在 WebGL 中存在根本性缺陷，会导致死锁或渲染不一致，因此必须在已完整获得元素绘制显示列表的时刻触发 paint 事件。',
  },
  {
    id: 'B',
    title: '方案 B：在 Paint 步骤之后立即触发 paint',
    chosen: false,
    body:
      '相较于方案 A，优点是不需要对 canvas 子元素进行部分绘制（partial Paint）。额外的弊端在于，循环的每次迭代都需要运行更多的 update the rendering 步骤。',
  },
  {
    id: 'C',
    title: '方案 C：在 Paint 步骤之后立即触发 paint（采用）',
    chosen: true,
    body:
      '这是该 API 所采用的设计方案。它每帧只运行一次 paint，与浏览器自身的 Paint 步骤类似。关键保障是：在 paint 运行之前已锁定本次渲染更新的内容，除一个刻意的例外——canvas 的绘制内容。在 paint 事件中发生的 DOM 失效适用于后续帧，而非当前帧。',
  },
]

export const future =
  '为支持滚动和动画等多线程特效，我们考虑未来提供“自动更新的 canvas”模式。drawElementImage 会记录一个代表最新渲染结果的占位符，canvas 保留一个命令缓冲区，可在每次滚动或动画更新后自动重放，从而用融合线程化滚动与动画的更新占位符重新光栅化，而无须阻塞脚本。'

export const authors = [
  { nm: 'Philip Rogers', em: 'pdr@chromium.org' },
  { nm: 'Stephen Chenney', em: 'schenney@igalia.com' },
  { nm: 'Chris Harrelson', em: 'chrishtr@chromium.org' },
  { nm: 'Philip Jägenstedt', em: 'foolip@chromium.org' },
  { nm: 'Khushal Sagar', em: 'khushalsagar@chromium.org' },
  { nm: 'Vladimir Levin', em: 'vmpstr@chromium.org' },
  { nm: 'Fernando Serboncini', em: 'fserb@chromium.org' },
]
