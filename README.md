# HTML-in-Canvas

这是一个关于使用 2D 和 3D `<canvas>` 来自定义 HTML 内容渲染方式的提案。

## 状态

这是一个持续更新的解释性文档（living explainer），会随着我们收到的反馈不断更新。

这里描述的 API 已在 Chromium 中以实验特性（flag）的形式实现，可通过 `chrome://flags/#canvas-draw-element` 开启。

## 动机

目前没有 Web API 能够轻松地将复杂的文本及其它内容排版后渲染进 `<canvas>`。因此，基于 `<canvas>` 的内容在可访问性、国际化、性能以及渲染质量上都存在不足。

### 使用场景

* **Canvas 中带样式的排版内容。** 在 Canvas 中更好地支持带样式文本的需求非常强烈。例如图表组件（图例、坐标轴等）、创意工具中的富内容框，以及游戏内菜单。
* **可访问性改进。** 目前无法保证用于 `<canvas>` 可访问性的 canvas 回退内容始终与渲染出的内容一致，而且这类回退内容往往很难生成。借助本 API，绘制到 canvas 中的元素将与其对应的 canvas 回退内容保持一致。
* **为 HTML 元素叠加特效。** 目前已经支持有限的 CSS 效果，例如 filters、backdrop-filter 和 mix-blend-mode，但我们还希望将通用的 WebGL 着色器用于 HTML。
* **在 3D 上下文中渲染 HTML。** 网站和游戏的 3D 部分需要在 3D 场景中的表面上渲染丰富的 2D 内容。
* **媒体导出。** 需要将 HTML 内容导出为图片或视频。

## 提案方案

该方案引入了三个主要原语：一个用于选择加入（opt-in）canvas 元素的属性、将子元素绘制进 canvas 的方法，以及一个用于处理更新的事件。

### 1. `layoutsubtree` 属性

`<canvas>` 元素上的 `layoutsubtree` 属性，使 canvas 的后代元素参与布局并介入命中测试（hit testing）。它会使 `<canvas>` 的直接子元素拥有层叠上下文（stacking context），成为所有后代元素的包含块（containing block），并具备绘制包含性（paint containment）。Canvas 的子元素表现得如同可见一般，但在通过调用 `drawElementImage()`（见下文）显式绘制进 canvas 之前，用户并不会看到它们的渲染结果。

### 2. `drawElementImage`（以及 WebGL/WebGPU 的等效方法）

`drawElementImage()` 方法将一个 canvas 子元素绘制进 canvas，并返回一个可应用于 `element.style.transform` 的变换，用于将元素的 DOM 位置与其绘制位置对齐。在 `paint` 事件之前，会记录 canvas 所有子元素渲染结果的快照。在 `paint` 事件期间调用时，`drawElementImage()` 会按当前帧中该子元素应有的样子进行绘制；在 `paint` 事件之外调用时，则使用上一帧的快照。如果在记录初始快照之前就对某个子元素调用 `drawElementImage()`，将抛出异常。

**要求与约束：**

* 在最近一次的渲染更新中，必须在 `<canvas>` 上指定 `layoutsubtree`。
* 在最近一次的渲染更新中，`element` 必须是 `<canvas>` 的直接子元素。
* 在最近一次的渲染更新中，`element` 必须生成了盒子（即不能是 `display: none`）。
* **变换：** 绘制进 canvas 时会应用 canvas 当前的变换矩阵。源 `element` 上的 CSS 变换在绘制时会被**忽略**（但仍会影响命中测试/可访问性，见下文）。
* **裁剪：** 溢出内容（包括布局溢出和墨迹溢出）会被裁剪到元素的边框盒（border box）。
* **尺寸：** 可选的 `width`/`height` 参数指定了 canvas 坐标系中的目标矩形。如果省略，则 `width`/`height` 参数默认将元素缩放为：在 canvas 坐标系中的屏幕大小与比例，与其在 canvas 之外时一致。

**WebGL/WebGPU 支持：**

为 3D 上下文添加了类似的方法：`WebGLRenderingContext.texElementImage2D` 和 `copyElementImageToTexture`。

### 3. `paint` 事件

为 `canvas` 元素新增了一个 `paint` 事件，当任意 canvas 子元素的渲染发生变化时触发。该事件在 [update-the-rendering](https://html.spec.whatwg.org/#update-the-rendering) 期间的交集观察器（intersection observer）步骤之后紧接着触发。该事件包含了一份已发生变化的 canvas 子元素列表。由于 canvas 子元素上的 CSS 变换在渲染时被忽略，改变变换并不会导致 `paint` 事件在下一帧触发。在 `paint` 事件中执行的 canvas 绘制命令会出现在当前帧中，但在 `paint` 事件中进行的 DOM 修改要到后续帧才会生效。如果存在嵌套的 `<canvas>` 元素，则 `paint` 事件会先在后代 `<canvas>` 元素上触发。

为支持每帧都更新的应用模式，新增了一个 `requestPaint()` 函数，即使没有子元素发生变化，它也会让 `paint` 事件触发一次（类似于 `requestAnimationFrame()`）。

### 4. `captureElementImage`

为了支持 Worker 中的 `OffscreenCanvas`，可以使用 `canvas.captureElementImage(element)` 将某个元素的快照捕获为 `ElementImage` 快照对象。这些对象可以传输到 Worker 中并绘制到 `OffscreenCanvas` 上。

### 同步

命中测试、交集观察器和可访问性等浏览器特性都依赖于元素的 DOM 位置。为确保这些特性正常工作，应当更新元素的 `transform` 属性，使其 DOM 位置与绘制位置相匹配。

<details>
<summary>计算与绘制位置匹配的 CSS 变换</summary>
  通用的 CSS 变换公式为：

  <div align="center">$$T_{\text{origin}}^{-1} \cdot S_{\text{css} \to \text{grid}}^{-1} \cdot T_{\text{draw}} \cdot S_{\text{css} \to \text{grid}} \cdot T_{\text{origin}} $$</div>

其中：

* $$T_{\text{draw}}$$：用于在 canvas 网格坐标系（grid coordinate system）中绘制元素的变换。
  对于 `drawElementImage`，该变换为 $$CTM \cdot T_{(\text{x}, \text{y})} \cdot S_{(\text{destScale})}$$，其中 $$CTM$$ 为当前变换矩阵（Current Transformation Matrix），$$T_{(\text{x}, \text{y})}$$ 是来自 x 和 y 参数的平移，$$S_{(\text{destScale})}$$ 是来自 width 和 height 参数的缩放。
* $$T_{\text{origin}}$$：元素计算出的 `transform-origin` 的平移矩阵。
* $$S_{\text{css} \to \text{grid}}$$：将 CSS 像素转换为 Canvas Grid 像素的缩放矩阵。
</details>

为辅助同步，`drawElementImage()` 会返回可应用于该元素的 CSS 变换，以保持其位置同步。对于 3D 上下文，提供了 `getElementTransform(element, drawTransform)` 辅助方法，在给定通用变换矩阵的情况下返回对应的 CSS 变换。

在 Worker 线程上用于绘制元素的变换需要同步回 DOM；如果位置是静态的，直接通过 `postMessage()` 传回主线程即可。如果位置是动态的，另一种做法是在主线程上计算位置，并在将 `ElementImage` 对象发送到 Worker 线程的同时更新 `element.style.transform`。

### 基础示例

<img width="250" height="38" alt="a screenshot showing a form element with a blinking cursor" src="https://github.com/user-attachments/assets/acbdd231-3259-4819-b57e-32e29c460fc9" />

```html
<canvas id="canvas" style="width: 400px; height: 200px;" layoutsubtree>
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
</script>
```

### OffscreenCanvas 示例

在此示例中，使用了 Worker 中的 `OffscreenCanvas`。canvas 的子 form 会在 `paint` 事件中被捕获为 `ElementImage` 对象，并传输到 Worker 中进行绘制。

```html
<!DOCTYPE html>
<canvas id="canvas" style="width: 400px; height: 200px;" layoutsubtree>
  <form id="form_element">
    <label for="name">name:</label>
    <input id="name">
  </form>
</canvas>
<script>
  const workerCode = `
    let ctx;
    self.onmessage = (e) => {
      if (e.data.canvas) {
        ctx = e.data.canvas.getContext('2d');
      }
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
  `;

  const worker = new Worker(URL.createObjectURL(new Blob([workerCode])));
  const offscreen = canvas.transferControlToOffscreen();

  worker.postMessage({ canvas: offscreen }, [offscreen]);

  canvas.onpaint = (event) => {
    const elementImage = canvas.captureElementImage(form_element)
    worker.postMessage({ elementImage: elementImage }, [elementImage]);
  };

  // Synchronize the element's CSS transform to match its drawn location.
  worker.onmessage = ({data}) => {
    form_element.style.transform = data.transform.toString();
  };

  // Size the canvas grid to match the device scale factor to prevent blurriness.
  const observer = new ResizeObserver(([entry]) => {
    worker.postMessage({
      width: entry.devicePixelContentBoxSize[0].inlineSize,
      height: entry.devicePixelContentBoxSize[0].blockSize
    });
    canvas.requestPaint();
  });
  observer.observe(canvas, { box: 'device-pixel-content-box' });
</script>
```

### IDL 变更

```idl
partial interface HTMLCanvasElement {
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

  DOMMatrix drawElementImage((Element or ElementImage) element,
                             unrestricted double sx, unrestricted double sy,
                             unrestricted double swidth, unrestricted double sheight,
                             unrestricted double dx, unrestricted double dy);

  DOMMatrix drawElementImage((Element or ElementImage) element,
                             unrestricted double sx, unrestricted double sy,
                             unrestricted double swidth, unrestricted double sheight,
                             unrestricted double dx, unrestricted double dy,
                             unrestricted double dwidth, unrestricted double dheight);
};

CanvasRenderingContext2D includes CanvasDrawElementImage;
OffscreenCanvasRenderingContext2D includes CanvasDrawElementImage;

dictionary WebGLCopyElementImageConfig {
  GLfloat sx;
  GLfloat sy;
  GLfloat swidth;
  GLfloat sheight;
  GLsizei width;
  GLsizei height;
};

partial interface WebGLRenderingContext {
  void texElementImage2D(GLenum target, GLenum internalformat,
                         (Element or ElementImage) element,
                         optional WebGLCopyElementImageConfig config = {});
};

dictionary GPUCopyElementImageDestination {
  required GPUImageCopyTextureTagged destination;
  GPUIntegerCoordinate width;
  GPUIntegerCoordinate height;
};

dictionary GPUCopyElementImageSource {
  required (Element or ElementImage) source;
  float sx;
  float sy;
  float swidth;
  float sheight;
};

partial interface GPUQueue {
  void copyElementImageToTexture(GPUCopyElementImageSource source,
                                 GPUCopyElementImageDestination destination);
}

[Exposed=Window]
interface PaintEvent : Event {
  constructor(DOMString type, optional PaintEventInit eventInitDict);

  readonly attribute FrozenArray<Element> changedElements;
};

dictionary PaintEventInit : EventInit {
  sequence<Element> changedElements = [];
};

[Exposed=(Window,Worker), Transferable]
interface ElementImage {
  readonly attribute double width;
  readonly attribute double height;
  undefined close();
};
```

## 演示

#### [在线演示](https://wicg.github.io/html-in-canvas/Examples/complex-text.html) ([源码](https://github.com/WICG/html-in-canvas/blob/main/Examples/complex-text.html))：使用 `drawElementImage` API 绘制旋转后的复杂文本。

<img width="640" height="320" alt="screenshot showing rotated, complex text drawn into canvas" src="https://github.com/user-attachments/assets/3ef73e0f-9119-49de-bf84-dfb3a4f5d77c" />

#### [在线演示](https://wicg.github.io/html-in-canvas/Examples/pie-chart.html) ([源码](https://github.com/WICG/html-in-canvas/blob/main/Examples/pie-chart.html))：使用 `drawElementImage` API 绘制带多行标签的饼图。

<img width="640" height="320" alt="screenshot showing a pie chart" src="https://github.com/user-attachments/assets/887eefa2-ffc0-49d6-914b-987b05ccb45d" />

#### [在线演示](https://wicg.github.io/html-in-canvas/Examples/webgpu-jelly-slider/) ([源码](https://github.com/WICG/html-in-canvas/blob/main/Examples/webgpu-jelly-slider))：使用 WebGPU 的 `copyElementImageToTexture` API 在果冻滑块下方绘制一个 div。

<img width="640" height="320" alt="screenshot showing a range slider with a jelly effect" src="https://github.com/user-attachments/assets/86ecb8b8-4d3b-49b0-8aa0-5f2df5674045" />

#### [在线演示](https://wicg.github.io/html-in-canvas/Examples/webGL.html) ([源码](https://github.com/WICG/html-in-canvas/blob/main/Examples/webGL.html))：使用 WebGL 的 `texElementImage2D` API 将 HTML 绘制到一个 3D 立方体上。

<img width="640" height="320" alt="screenshot showing html content on a 3D cube" src="https://github.com/user-attachments/assets/689fefe3-56d9-4ae9-b386-32a01ebb0117" />

使用 [three.js](https://threejs.org/) 实验性扩展实现的同一效果演示在[此处](https://raw.githack.com/mrdoob/three.js/htmltexture/examples/webgl_materials_texture_html.html)。更多说明与背景参见[此处](https://github.com/mrdoob/three.js/pull/31233)。

#### [在线演示](https://wicg.github.io/html-in-canvas/Examples/text-input.html) ([源码](https://github.com/WICG/html-in-canvas/blob/main/Examples/text-input.html))：canvas 中的交互式内容。

<img width="640" height="320" alt="screenshot showing a form drawn into canvas" src="https://github.com/user-attachments/assets/be2d098f-17ae-4982-a0f9-a069e3c2d1d5" />

## 允许回读的渲染

`drawElementImage()` 方法、任何其他绘制元素图像快照的方法，以及 paint 事件，都不得泄露任何在作者脚本中原本无法获取的、涉及安全或隐私的敏感信息。这一概念被称为"允许回读的渲染"（read-back-allowed rendering），因为它使得像素回读成为可能——而这在 WebGL 和 WebGPU 中始终是可行的。

无论是绘制（通过 canvas 像素回读或计时攻击）还是失效（通过 `onpaint`），都有可能泄露敏感信息，而这一点通过以下方式防止：在绘制和失效时排除敏感信息。

敏感信息包括：

* [嵌入内容](https://html.spec.whatwg.org/#embedded-content-category)（例如 `<iframe>`、`<img>`）中的跨源数据，[`<url>`](https://drafts.csswg.org/css-values-4/#url-value) 引用（例如 `background-image`、`clip-path`），被跨源数据污染的 `<canvas>` 元素，以及 [SVG](https://svgwg.org/svg2-draft/single-page.html#types-InterfaceSVGURIReference)（例如 `<use>`、`<pattern>`、`<feImage>`）。注意：同源的 iframe 仍会绘制，但其中的跨源内容不会。
* 系统颜色、主题或偏好设置。
* 拼写与语法标记。
* 已访问链接信息。
* JavaScript 原本无法获取的、待填写的表单自动填充信息。
* 亚像素文本抗锯齿。
* 用户对字幕（caption）和副标题（subtitle）选择及外观的偏好设置。
* IME 弹窗以及独特的 IME 文本格式。

以下新信息不被视为敏感信息：

* 搜索文本（在页面中查找）和文本片段（fragment url）标记。
* 滚动条和表单元素外观（这些在 Blink 和 WebKit 中已可通过 [foreignObject](https://jsfiddle.net/progers/qhawnyeu) 检测到）。
* 光标闪烁频率。
* forced-colors（该信息已可通过 `forced-colors` 媒体查询以及系统颜色供 javascript 获取）。

## 开发者试用（dev trial）信息

HTML-in-Canvas 特性可在 Chrome Canary 中通过 `chrome://flags/#canvas-draw-element` 开启。

我们对以下主题的反馈最感兴趣：

* 哪些内容可用，哪些会失败？哪些失败模式最亟待修复？
* 该特性如何与可访问性特性交互？如何改进对可访问性的支持？

请[在此处](https://github.com/WICG/html-in-canvas/issues/new)提交 bug 或设计问题。

## 曾考虑的替代方案：`paint` 事件触发时机

需要新增一个 `paint` 事件，以便开发者有机会针对绘制变化更新其 canvas 渲染。该事件被集成进 [update the rendering](https://html.spec.whatwg.org/#update-the-rendering)，从而使 canvas 更新能够与 DOM 保持同步。

在 [update the rendering](https://html.spec.whatwg.org/#update-the-rendering) 的各个步骤中，有多个位置可以触发 `paint` 事件：

  * 14\. 运行动画帧回调（animation frame callbacks）。

  * 16.2.1\. 重新计算样式并更新布局。

  * 16.2.6\. 投递 resize observers，必要时循环回到 16.2.1。

  * _方案 A：在 resize observer 的时机触发 `paint`，必要时循环回到 16.2.1。_

  * 19\. 运行更新交集观察（update intersection observations）步骤。

  * Paint 步骤，即计算元素绘制输出的步骤。这在 [update the rendering](https://html.spec.whatwg.org/#update-the-rendering) 中并非一个显式命名的步骤。

  * _方案 B：在 Paint 步骤之后立即触发 `paint`，必要时循环回到 16.2.1。_

  * _方案 C：在 Paint 步骤之后立即触发 `paint`。_

  * 提交 / 线程切换（Commit / thread handoff），即将绘制输出发送到另一个进程。这在 [update the rendering](https://html.spec.whatwg.org/#update-the-rendering) 中并非一个显式命名的步骤。

注意，`paint` 事件是本提案在 canvas 上新增的事件，而 Paint 步骤是浏览器在遵循 [paint order](https://drafts.csswg.org/css-position-4/#painting-order) 记录渲染树绘制输出时执行的既有操作。

#### 方案 A：在 resize observer 的时机触发 `paint`，必要时循环回到 16.2.1。

与 resize observer 类似，需要一种循环机制来处理 `paint` 事件执行了修改（包括对 canvas 之外元素的修改）的情况。目前没有机制能阻止任意 javascript 修改 DOM。相比于 ResizeObserver 所需的条件（例如背景样式变化），循环需要在更多条件下进行。循环的一个弊端是，用户的 canvas 代码可能需要在每帧中运行多次。

一种选择是执行同步的 Paint 步骤来快照 canvas 子元素的绘制输出。这种方式的弊端在于 Paint 步骤的运行可能代价高昂，且可能需要运行多次。由于架构上的限制，这种方式在 Gecko 中（可能还有其他引擎中）存在独特的实现挑战。

第二种选择是不同步运行 Paint 步骤，而是记录一个代表元素在下次渲染更新中如何呈现的占位符（参见[设计文档](https://docs.google.com/document/d/1YaHCxYqE4uQc4-UTWo4a5pHt2I2MutlwJtsnj5ljEkM/edit?usp=sharing)）。该模型在 2D canvas 中可通过将 canvas 命令缓冲到下一次 Paint 步骤来实现。当下一次 Paint 步骤发生时，占位符会被实际渲染结果替换。诸如 `getImageData` 之类的 canvas 操作需要同步刷新 canvas 命令缓冲区，占位符处将显示为空白或过期数据。遗憾的是，这种方式对于 WebGL 存在根本性缺陷，因为许多 API 都要求刷新（例如 `getError()`，参见 [WaitForCmd](https://source.chromium.org/chromium/chromium/src/+/main:gpu/command_buffer/client/implementation_base.h;drc=b3eab4fd06ddbeee84b37224f4cc9d78094fc2f7;l=102) 的调用点），而调用这些 API 中的任何一个都会导致死锁或渲染不一致。因此，我们必须在已经完整获得元素绘制显示列表（display list）的时刻触发 `paint` 事件。

#### 方案 B：在 Paint 步骤之后立即触发 `paint`，必要时循环回到 16.2.1。

关于在 `paint` 事件中发生修改时循环的原因及其弊端，请参见上文。

相较于方案 A，方案 B 的优点在于它不需要对 canvas 子元素进行部分绘制（partial Paint）。额外的弊端在于，循环的每次迭代都需要运行更多 [update the rendering](https://html.spec.whatwg.org/#update-the-rendering) 步骤。

#### 方案 C：在 Paint 步骤之后立即触发 `paint`。

这是该 API 所采用的设计方案。

这种方式每帧只运行一次 `paint`，与浏览器自身的 Paint 步骤类似。为了解决 javascript 能够进行任意修改的问题，关键在于确保：在 `paint` 运行之前，我们已锁定本次渲染更新的内容，除一个刻意的例外——canvas 的绘制内容。在 `paint` 事件中可能发生的 DOM 失效适用于后续帧，而非当前帧。

## 曾考虑的替代方案：用 Worker 线程支持多线程特效

为支持多线程特效，我们探讨过一种[设计](https://docs.google.com/document/d/1TWe6HP7HMn6y-XnNKppIhgf9FtuXJ6LPgenJJxZDjzg/edit?tab=t.0)：将 canvas 子元素的"快照"发送到 Worker 线程。在响应线程化滚动和动画时，Worker 线程便可将快照的最新渲染结果绘制到 OffscreenCanvas 中。该模型要求 javascript 能够在滚动和动画更新时被同步调用，这对于在受限进程中执行线程化滚动更新的架构而言较为困难。

## 未来考虑：用自动更新的 canvas 支持多线程特效

为支持滚动和动画等多线程特效，我们正在考虑未来提供"自动更新的 canvas"模式。

在该模型中，`drawElementImage` 会记录一个代表最新渲染结果的占位符。Canvas 保留一个命令缓冲区，可在每次滚动或动画更新后自动重放。这使得 canvas 能够用融合了线程化滚动与动画的更新占位符重新进行光栅化（re-rasterize），而无需阻塞脚本。这将实现与原生滚动或 canvas 内动画完美同步的视觉效果，且独立于主线程。该设计在 2D 上下文中是可行的，并且通过少量 API 补充也可能适用于 WebGPU。

## 其他文档

* [安全与隐私问卷](https://github.com/WICG/html-in-canvas/blob/main/security-privacy-questionnaire.md)

## 作者

* [Philip Rogers](mailto:pdr@chromium.org)
* [Stephen Chenney](mailto:schenney@igalia.com)
* [Chris Harrelson](mailto:chrishtr@chromium.org)
* [Philip Jägenstedt](mailto:foolip@chromium.org)
* [Khushal Sagar](mailto:khushalsagar@chromium.org)
* [Vladimir Levin](mailto:vmpstr@chromium.org)
* [Fernando Serboncini](mailto:fserb@chromium.org)
