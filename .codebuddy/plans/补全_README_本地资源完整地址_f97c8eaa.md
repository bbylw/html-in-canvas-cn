---
name: 补全 README 本地资源完整地址
overview: 将本地 README.md 中指向仓库内资源的 6 处相对链接补全为完整的 GitHub 仓库 URL（https://github.com/WICG/html-in-canvas/blob/main/...），与原 README 一致。
todos:
  - id: complete-relative-links
    content: 将 README.md 中 6 处相对链接补全为完整 GitHub 地址
    status: completed
---

## 用户需求

根据 https://github.com/WICG/html-in-canvas/blob/main/README.md，把本地 `c:/Users/bbylw/Desktop/net/README.md` 中指向仓库内本地资源的相对链接补全为完整 GitHub 地址，使链接在仓库外（如单独查看该 README 文件时）也能正常跳转。

## 核心内容

- 需修改的 6 处相对链接：
- 第 258 行：`[source](Examples/complex-text.html)` → `https://github.com/WICG/html-in-canvas/blob/main/Examples/complex-text.html`
- 第 262 行：`[source](Examples/pie-chart.html)` → `https://github.com/WICG/html-in-canvas/blob/main/Examples/pie-chart.html`
- 第 266 行：`[source](Examples/webgpu-jelly-slider)` → `https://github.com/WICG/html-in-canvas/blob/main/Examples/webgpu-jelly-slider`
- 第 270 行：`[source](Examples/webGL.html)` → `https://github.com/WICG/html-in-canvas/blob/main/Examples/webGL.html`
- 第 276 行：`[source](Examples/text-input.html)` → `https://github.com/WICG/html-in-canvas/blob/main/Examples/text-input.html`
- 第 369 行：`[Security and Privacy Questionnaire](./security-privacy-questionnaire.md)` → `https://github.com/WICG/html-in-canvas/blob/main/security-privacy-questionnaire.md`
- 其余形如 `https://wicg.github.io/html-in-canvas/Examples/...` 的链接已是完整绝对地址，保持不变。