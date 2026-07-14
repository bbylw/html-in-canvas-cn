import { useMemo, useState } from 'react'

function esc(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function highlight(raw, lang) {
  const isHtml = lang === 'html'
  const KW =
    'const|let|var|function|return|if|else|for|while|new|await|async|import|from|export|class|extends|void|true|false|null|this|self|of|in|undefined'
  const re = isHtml
    ? new RegExp(
        `(<!--[\\s\\S]*?-->)|(<\\/?[a-zA-Z][\\s\\S]*?>)|("(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*')|\\b(${KW})\\b|\\b(\\d+(?:\\.\\d+)?)\\b`,
        'g'
      )
    : new RegExp(
        `(\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)|("(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*'|\`(?:[^\`\\\\]|\\\\.)*\`)|\\b(${KW})\\b|\\b(\\d+(?:\\.\\d+)?)\\b`,
        'g'
      )

  let out = ''
  let last = 0
  let m
  while ((m = re.exec(raw))) {
    out += esc(raw.slice(last, m.index))
    if (m[1]) out += `<span class="tk-com">${esc(m[1])}</span>`
    else if (m[2]) out += `<span class="${isHtml ? 'tk-tag' : 'tk-str'}">${esc(m[2])}</span>`
    else if (m[3]) out += `<span class="tk-str">${esc(m[3])}</span>`
    else if (m[4]) out += `<span class="tk-kw">${esc(m[4])}</span>`
    else if (m[5]) out += `<span class="tk-num">${esc(m[5])}</span>`
    last = re.lastIndex
  }
  out += esc(raw.slice(last))
  return out
}

export default function CodeBlock({ code, lang = 'js', name = 'code.js' }) {
  const [copied, setCopied] = useState(false)
  const html = useMemo(() => highlight(code, lang), [code, lang])
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
    } catch {}
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div className="codeblock">
      <div className="bar">
        <div className="dots">
          <i />
          <i />
          <i />
        </div>
        <span className="name">{name}</span>
        <button className="copy" onClick={copy}>
          {copied ? '已复制 ✓' : '复制'}
        </button>
      </div>
      <pre>
        <code dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </div>
  )
}
