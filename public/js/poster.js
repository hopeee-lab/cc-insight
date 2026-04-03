// public/js/poster.js — 海报弹窗

// ── 样式（只注入一次）──────────────────────────────────────────
const POSTER_CSS = `
.poster-overlay {
  position: fixed; inset: 0; z-index: 300;
  background: rgba(0,0,0,0.75);
  display: flex; align-items: center; justify-content: center;
  padding: 20px;
  animation: poster-fade-in 0.15s ease;
}
@keyframes poster-fade-in { from { opacity: 0 } to { opacity: 1 } }

.poster-dialog {
  display: flex; gap: 0;
  background: var(--bg2); border: 1px solid var(--border);
  border-radius: 10px; overflow: hidden;
  width: min(920px, 100%); max-height: calc(100vh - 40px);
  box-shadow: 0 24px 64px rgba(0,0,0,0.6);
}

/* ── 左侧：海报预览 ── */
.poster-preview-panel {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  background: var(--bg); border-right: 1px solid var(--border);
  padding: 24px; flex-shrink: 0; width: 340px;
}
.poster-preview-label {
  font-size: 11px; color: var(--muted); letter-spacing: 1px;
  text-transform: uppercase; margin-bottom: 14px; align-self: flex-start;
}
/* 海报容器：宽度固定，高度由内容决定 */
.poster-canvas-wrap {
  width: 292px; height: auto;
  border-radius: 8px; overflow: hidden;
  position: relative;
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
}
/* 数据说明 */
.poster-range-note {
  margin-top: 12px; font-size: 11px; color: var(--muted);
  text-align: center; line-height: 1.6;
}

/* ── 右侧：编辑面板 ── */
.poster-edit-panel {
  flex: 1; display: flex; flex-direction: column;
  min-width: 0; max-height: calc(100vh - 40px); overflow: hidden;
}
.poster-edit-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 20px 14px; border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}
.poster-edit-title {
  font-size: 14px; font-weight: 600; color: var(--text);
}
.poster-close-btn {
  width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
  border: none; background: transparent; cursor: pointer;
  color: var(--muted); border-radius: 4px; transition: all 0.15s;
}
.poster-close-btn:hover { background: var(--bg3); color: var(--text); }

.poster-edit-body {
  flex: 1; overflow-y: auto; padding: 20px;
  display: flex; flex-direction: column; gap: 20px;
}

/* ── 编辑区域各 section ── */
.poster-section { display: flex; flex-direction: column; gap: 8px; }
.poster-section-header {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
}
.poster-section-title {
  font-size: 11px; color: var(--muted);
  letter-spacing: 1px; text-transform: uppercase; flex-shrink: 0;
}
.poster-section-hint { font-size: 11px; color: var(--muted); text-align: right; }
.poster-input {
  background: var(--bg); border: 1px solid var(--border);
  border-radius: var(--radius); padding: 8px 10px;
  color: var(--text); font-size: 14px; font-family: var(--font);
  width: 100%; outline: none; transition: border-color 0.15s;
}
.poster-input:focus { border-color: var(--green); }
.poster-input-hint { font-size: 12px; color: var(--muted); }

/* ── 底部操作按钮 ── */
.poster-edit-footer {
  display: flex; gap: 10px; padding: 14px 20px;
  border-top: 1px solid var(--border); flex-shrink: 0;
}
.poster-action-btn {
  flex: 1; padding: 8px 0; border-radius: var(--radius);
  font-size: 14px; font-family: var(--font);
  cursor: pointer; border: 1px solid var(--border);
  background: transparent; color: var(--muted); transition: all 0.15s;
}
.poster-action-btn:hover {
  color: var(--text); border-color: var(--text);
}
.poster-action-btn.primary {
  background: color-mix(in srgb, var(--green) 15%, transparent);
  border-color: var(--green); color: var(--green);
}
.poster-action-btn.primary:hover {
  background: color-mix(in srgb, var(--green) 25%, transparent);
}
.poster-action-btn:disabled {
  opacity: 0.4; cursor: not-allowed;
}

/* ── loading ── */
.poster-loading {
  display: flex; flex-direction: column;
  align-items: center; justify-content: center;
  height: 100%; gap: 12px; color: var(--muted); font-size: 13px;
}
.poster-spinner {
  width: 20px; height: 20px; border: 2px solid var(--border);
  border-top-color: var(--green); border-radius: 50%;
  animation: poster-spin 0.7s linear infinite;
}
@keyframes poster-spin { to { transform: rotate(360deg) } }
`

let _cssInjected = false
function injectCSS() {
  if (_cssInjected) return
  const style = document.createElement('style')
  style.textContent = POSTER_CSS
  document.head.appendChild(style)
  _cssInjected = true
}

// ── 弹窗状态 ──────────────────────────────────────────────────
let _overlay = null   // 当前弹窗 DOM
let _data    = null   // 当前海报数据缓存

// ── 公开入口 ─────────────────────────────────────────────────

/**
 * 打开海报弹窗。
 * @param {string} range - 当前时间范围
 */
export async function openPosterModal(range) {
  if (_overlay) return  // 已打开，防重复
  injectCSS()

  _overlay = buildSkeleton(range)
  document.body.appendChild(_overlay)

  // 点击遮罩关闭
  _overlay.addEventListener('click', e => {
    if (e.target === _overlay) closePosterModal()
  })

  // 导出按钮
  document.getElementById('poster-copy-btn')?.addEventListener('click', () => exportPoster('copy'))
  document.getElementById('poster-download-btn')?.addEventListener('click', () => exportPoster('download'))

  // 加载数据
  await loadPosterData(range)
}

function closePosterModal() {
  _overlay?.remove()
  _overlay = null
  _data    = null
}

// ── 构建弹窗骨架 DOM ──────────────────────────────────────────

function buildSkeleton(range) {
  const overlay = document.createElement('div')
  overlay.className = 'poster-overlay'
  overlay.innerHTML = `
    <div class="poster-dialog">

      <!-- 左侧：海报预览 -->
      <div class="poster-preview-panel">
        <div class="poster-preview-label">海报预览</div>
        <div class="poster-canvas-wrap" id="poster-canvas-wrap">
          <div class="poster-loading" id="poster-preview-loading">
            <div class="poster-spinner"></div>
            <span>正在生成…</span>
          </div>
        </div>
      </div>

      <!-- 右侧：编辑面板 -->
      <div class="poster-edit-panel">
        <div class="poster-edit-header">
          <span class="poster-edit-title">自定义海报</span>
          <button class="poster-close-btn" id="poster-close-btn" title="关闭">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
              stroke="currentColor" stroke-width="1.8" stroke-linecap="round">
              <path d="M2 2l10 10M12 2L2 12"/>
            </svg>
          </button>
        </div>

        <div class="poster-edit-body" id="poster-edit-body">
          <div class="poster-loading">
            <div class="poster-spinner"></div>
            <span>加载数据中…</span>
          </div>
        </div>

        <div class="poster-edit-footer">
          <button class="poster-action-btn" id="poster-copy-btn" disabled>复制图片</button>
          <button class="poster-action-btn primary" id="poster-download-btn" disabled>下载保存</button>
        </div>
      </div>

    </div>
  `

  overlay.querySelector('#poster-close-btn').addEventListener('click', closePosterModal)

  return overlay
}

// ── 加载数据并渲染 ────────────────────────────────────────────

async function loadPosterData(range) {
  let data
  try {
    const res = await fetch(`/api/poster/data?range=${range}`)
    data = await res.json()
  } catch (e) {
    console.error('[poster] fetch error', e)
    document.getElementById('poster-edit-body').innerHTML =
      `<div style="color:var(--red);font-size:13px;padding:20px;">数据加载失败：${e.message}</div>`
    return
  }

  _data = data

  try {
    renderPosterContent(data)
  } catch (e) {
    console.error('[poster] render error', e)
    document.getElementById('poster-edit-body').innerHTML =
      `<div style="color:var(--red);font-size:13px;padding:20px;">
        渲染失败：${e.message}<br>
        <pre style="font-size:11px;margin-top:8px;color:var(--muted);white-space:pre-wrap;">${e.stack?.split('\n').slice(0,4).join('\n')}</pre>
      </div>`
  }
}

// ── 渲染内容 ──────────────────────────────────────────────────

function renderPosterContent(data) {
  // P6：渲染海报视觉
  const wrap = document.getElementById('poster-canvas-wrap')
  if (wrap) {
    wrap.innerHTML = ''
    wrap.appendChild(buildPosterCard(data))
  }

  // P7：渲染编辑表单
  renderEditPanel(data)

  // 激活操作按钮
  document.getElementById('poster-copy-btn')?.removeAttribute('disabled')
  document.getElementById('poster-download-btn')?.removeAttribute('disabled')
}

// ── P6：海报视觉 ──────────────────────────────────────────────

// 海报虚拟尺寸（导出用，预览通过 scale 缩放）
const POSTER_W = 540
const POSTER_H = 720
const PREVIEW_W = 292  // 必须与 CSS .poster-canvas-wrap 宽度一致

// 颜色常量（硬编码确保导出时颜色稳定）
const C = {
  bg:     '#0d1117',
  bg2:    '#111827',
  bg3:    '#1f2937',
  border: '#1f2937',
  text:   '#e5e7eb',
  muted:  '#6b7280',
  green:  '#4ade80',
  cyan:   '#22d3ee',
  amber:  '#f59e0b',
  purple: '#a78bfa',
  font:   "'JetBrains Mono','Fira Code','Cascadia Code',monospace",
}

function buildPosterCard(data) {
  const scale = PREVIEW_W / POSTER_W
  const m = data.metrics ?? {}
  const rangeLabel = { '7d':'近 7 天','30d':'近 30 天','90d':'近 90 天','all':'全部' }

  // 预先计算有无内容，用于条件渲染分隔线
  const ALL_METRIC_DEFS_TEMP = ['sessions','avgDailyDuration','peak','topSkill','totalDuration','silentDays']
  const selectedKeys0 = m._selectedKeys ?? ['sessions','avgDailyDuration','peak','topSkill']
  const hasMetrics = selectedKeys0.some(k => ALL_METRIC_DEFS_TEMP.includes(k))
  const hasCharts  = (data.heatmap ?? []).length > 0 || (data.distribution ?? []).length > 0

  // 外层容器：宽度固定，高度跟随内容
  const wrap = el('div', {
    style: ss({ width: PREVIEW_W+'px', overflow: 'hidden',
                borderRadius: '6px', position: 'relative' }),
  })

  // 海报卡片：实际 540×720，缩放显示
  const card = el('div', {
    id: 'poster-card',
    style: ss({
      width: POSTER_W+'px',
      transformOrigin: 'top left',
      transform: `scale(${scale})`,
      background: C.bg,
      fontFamily: C.font,
      position: 'relative',
      boxSizing: 'border-box',
      padding: '32px',
      display: 'flex', flexDirection: 'column',
    }),
  })

  // 顶部光晕装饰
  card.appendChild(el('div', { style: ss({
    position: 'absolute', top: '-80px', left: '50%',
    transform: 'translateX(-50%)',
    width: '340px', height: '200px',
    background: 'radial-gradient(ellipse at center, rgba(74,222,128,0.12) 0%, transparent 70%)',
    pointerEvents: 'none',
  }) }))

  // ── Header ──
  const header = el('div', { style: ss({
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: '28px', flexShrink: '0',
  }) })
  header.appendChild(el('span', {
    style: ss({ fontSize:'24px', fontWeight:'700', color: C.green,
                letterSpacing: '0.5px' }),
    text: 'CC Insight',
  }))
  header.appendChild(el('span', {
    style: ss({
      fontSize: '13px', color: C.muted, border: `1px solid ${C.border}`,
      borderRadius: '4px', padding: '3px 8px', letterSpacing: '0.5px',
    }),
    text: rangeLabel[data.range] ?? data.range,
  }))
  card.appendChild(header)

  // ── 称呼 ──
  if (data.nickname) {
    card.appendChild(el('div', {
      style: ss({ fontSize:'19px', color: C.green, letterSpacing:'2px',
                  textTransform:'uppercase', marginBottom:'8px', flexShrink:'0' }),
      text: data.nickname,
    }))
  }

  // ── 一句话总结（英雄元素）──
  const summary = el('div', {
    style: ss({
      fontSize: '32px', lineHeight: '1.45', color: C.text,
      fontWeight: '600', marginBottom: '16px', flexShrink: '0',
      wordBreak: 'break-word',
    }),
    text: data.summary ?? '',
  })
  card.appendChild(summary)

  // ── 人格标签 ──
  if (data.tags?.length) {
    const tagsRow = el('div', { style: ss({
      display: 'flex', flexWrap: 'wrap', gap: '8px',
      marginBottom: '24px', flexShrink: '0',
    }) })
    data.tags.forEach(tag => {
      tagsRow.appendChild(el('span', {
        style: ss({
          fontSize: '14px', color: C.green, whiteSpace: 'nowrap',
          border: `1px solid rgba(74,222,128,0.3)`,
          background: 'rgba(74,222,128,0.08)',
          borderRadius: '4px', padding: '5px 12px',
          letterSpacing: '0.3px',
        }),
        text: tag,
      }))
    })
    card.appendChild(tagsRow)
  }

  // ── 分隔线（有指标或有图表才显示）──
  if (hasMetrics || hasCharts) card.appendChild(divider())

  // ── 指标卡片 ──
  // 全量指标定义（与 METRIC_OPTIONS 对应）— 必须在 metricsGrid 之前声明
  const ALL_METRIC_DEFS = [
    { key: 'sessions',         value: String(m.sessions ?? 0),              label: 'Sessions',    color: C.green  },
    { key: 'avgDailyDuration', value: fmtDur(m.avgDailyDurationSec),        label: 'Daily Avg',   color: C.cyan   },
    { key: 'peak',             value: m.peakPeriod?.split('–')[0] ?? '—',   label: 'Peak',        color: C.amber  },
    { key: 'topSkill',         value: fmtSkill(m.topSkillName),             label: 'Top Skill',   color: C.purple },
    { key: 'totalDuration',    value: fmtDur(m.totalDurationSec),           label: 'Total Time',  color: C.cyan   },
    { key: 'silentDays',       value: String(m.silentDays ?? 0),            label: 'Silent Days', color: C.muted  },
  ]
  const selectedKeys = m._selectedKeys ?? ['sessions','avgDailyDuration','peak','topSkill']
  const metricItems = selectedKeys
    .map(k => ALL_METRIC_DEFS.find(d => d.key === k))
    .filter(Boolean)
    .slice(0, 4)

  const metricsGrid = el('div', { style: ss({
    display: 'grid', gridTemplateColumns: `repeat(${metricItems.length || 1},1fr)`,
    gap: '8px', margin: '18px 0', flexShrink: '0',
  }) })
  metricItems.forEach(({ value, label, color }) => {
    const card2 = el('div', { style: ss({
      background: C.bg2, border: `1px solid ${C.border}`,
      borderRadius: '6px', padding: '10px 8px', textAlign: 'center',
    }) })
    card2.appendChild(el('div', { style: ss({ fontSize:'26px', fontWeight:'700',
      color, marginBottom:'4px', overflow:'hidden', textOverflow:'ellipsis',
      whiteSpace:'nowrap' }), text: value }))
    card2.appendChild(el('div', { style: ss({ fontSize:'12px', color: C.muted,
      letterSpacing:'0.8px', textTransform:'uppercase' }), text: label }))
    metricsGrid.appendChild(card2)
  })
  if (metricItems.length > 0) card.appendChild(metricsGrid)

  // ── 分隔线（指标和图表都有时才显示）──
  if (metricItems.length > 0 && hasCharts) card.appendChild(divider())

  // ── 图表区 ──
  const chartsArea = el('div', { style: ss({
    flex: '1', minHeight: '0', marginTop: '16px',
    display: 'flex', flexDirection: 'column', gap: '14px',
  }) })

  // Heatmap（仅在有数据时渲染整个容器）
  if ((data.heatmap ?? []).length > 0) {
    const heatSection = el('div', {})
    heatSection.appendChild(sectionLabel('ACTIVITY'))
    heatSection.appendChild(buildHeatmapSVG(data.heatmap, data.range))
    chartsArea.appendChild(heatSection)
  }

  // 24H Distribution（仅在有数据时渲染整个容器）
  if ((data.distribution ?? []).length > 0) {
    const distSection = el('div', {})
    distSection.appendChild(sectionLabel('PEAK HOURS'))
    distSection.appendChild(buildDistributionSVG(data.distribution))
    chartsArea.appendChild(distSection)
  }

  card.appendChild(chartsArea)

  // ── 署名条 ──
  card.appendChild(el('div', {
    style: ss({
      marginTop: 'auto', paddingTop: '16px',
      borderTop: `1px solid ${C.border}`,
      fontSize: '13px', color: C.muted,
      textAlign: 'center', letterSpacing: '0.5px',
      flexShrink: '0',
    }),
    text: 'CC Insight @Halooo',
  }))

  wrap.appendChild(card)
  return wrap
}

// ── SVG：Activity Heatmap（GitHub 贡献图风格，7行×N列）────────

function buildHeatmapSVG(heatmap, range) {
  const CELL = 9; const GAP = 2; const LABEL_W = 22
  const CHART_W = 476
  const maxWeeks = Math.floor((CHART_W - LABEL_W + GAP) / (CELL + GAP))
  const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', '']

  if (!heatmap || heatmap.length === 0) return document.createElement('div')

  const map = {}
  for (const d of heatmap) map[d.day] = d.count
  const maxCount = Math.max(...heatmap.map(d => d.count), 1)

  function intensity(count) {
    if (!count) return C.bg3
    const p = count / maxCount
    if (p < 0.25) return '#0e4429'
    if (p < 0.5)  return '#006d32'
    if (p < 0.75) return '#26a641'
    return '#39d353'
  }

  // 从最早数据对齐到周一，生成所有周
  const today = new Date()
  const firstDay = new Date(heatmap[0].day + 'T12:00:00Z')
  const start = new Date(firstDay)
  start.setDate(start.getDate() - ((start.getUTCDay() + 6) % 7))

  const weeks = []
  let cur = new Date(start)
  while (cur <= today) {
    const week = []
    for (let d = 0; d < 7; d++) {
      const key = cur.toISOString().slice(0, 10)
      week.push({ day: key, count: map[key] ?? 0 })
      cur.setDate(cur.getDate() + 1)
    }
    weeks.push(week)
  }

  // all 模式或超出 maxWeeks：只取最近一屏
  const displayWeeks = weeks.slice(-maxWeeks)
  const nWeeks = displayWeeks.length
  const svgW = LABEL_W + nWeeks * (CELL + GAP) - GAP
  const svgH = 7 * (CELL + GAP) - GAP

  let content = ''

  // Y 轴标签
  DAY_LABELS.forEach((label, i) => {
    if (!label) return
    const y = i * (CELL + GAP) + CELL - 1
    content += `<text x="${LABEL_W - 3}" y="${y}" text-anchor="end"
      font-size="7" fill="${C.muted}"
      font-family="JetBrains Mono,monospace">${label}</text>`
  })

  // 格子
  displayWeeks.forEach((week, wi) => {
    const x = LABEL_W + wi * (CELL + GAP)
    week.forEach((cell, di) => {
      const y = di * (CELL + GAP)
      content += `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}"
        rx="2" fill="${intensity(cell.count)}"/>`
    })
  })

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', svgW)
  svg.setAttribute('height', svgH)
  svg.setAttribute('viewBox', `0 0 ${svgW} ${svgH}`)
  svg.innerHTML = content
  return svg
}

// ── SVG：24H 时间分布条形图 ──────────────────────────────────

function buildDistributionSVG(distribution) {
  const W = 476; const BAR_H = 44; const LABEL_H = 16
  const TOTAL_H = BAR_H + LABEL_H
  const barW = Math.floor(W / 24) - 1
  const maxCount = Math.max(...distribution.map(d => d.count), 1)
  const countMap = Object.fromEntries(distribution.map(d => [parseInt(d.hour), d.count]))

  // 前 3 活跃时间段，过滤相邻（间距 < 3h）避免标签重叠
  const top3 = new Set()
  for (const d of [...distribution].sort((a, b) => b.count - a.count)) {
    const h = parseInt(d.hour)
    if ([...top3].every(existing => Math.abs(existing - h) >= 3)) {
      top3.add(h)
      if (top3.size === 3) break
    }
  }

  const bars = Array.from({ length: 24 }, (_, h) => {
    const count = countMap[h] ?? 0
    const barH = count > 0 ? Math.max(3, Math.round((count / maxCount) * (BAR_H - 4))) : 2
    const x = h * (barW + 1)
    const y = BAR_H - barH
    const opacity = count > 0 ? (0.3 + (count / maxCount) * 0.7) : 0.15
    const bar = `<rect x="${x}" y="${y}" width="${barW}" height="${barH}"
      rx="2" fill="rgba(34,211,238,${opacity.toFixed(2)})"/>`
    const label = top3.has(h)
      ? `<text x="${x + barW / 2}" y="${TOTAL_H}" text-anchor="middle"
          font-size="9" fill="rgba(34,211,238,0.85)"
          font-family="JetBrains Mono,monospace">${String(h).padStart(2, '0')}:00</text>`
      : ''
    return bar + label
  }).join('')

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('width', W)
  svg.setAttribute('height', TOTAL_H)
  svg.setAttribute('viewBox', `0 0 ${W} ${TOTAL_H}`)
  svg.innerHTML = bars
  return svg
}

// ── 工具函数 ──────────────────────────────────────────────────

function el(tag, { style, text, id } = {}) {
  const node = document.createElement(tag)
  if (style) node.style.cssText = style
  if (text  !== undefined) node.textContent = text
  if (id) node.id = id
  return node
}

/** 对象样式转 cssText 字符串（camelCase key → kebab-case） */
function ss(obj) {
  return Object.entries(obj).map(([k, v]) =>
    k.replace(/[A-Z]/g, c => '-' + c.toLowerCase()) + ':' + v
  ).join(';')
}

function divider() {
  return el('div', { style: ss({
    height: '1px', background: C.border, flexShrink: '0',
  }) })
}

function sectionLabel(text) {
  const d = el('div', { style: ss({
    fontSize: '12px', color: C.muted,
    letterSpacing: '1.5px', textTransform: 'uppercase',
    marginBottom: '8px',
  }) })
  d.textContent = text
  return d
}

function fmtDur(sec) {
  if (!sec) return '0m'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return h > 0 ? `${h}h${m}m` : `${m}m`
}

function fmtSkill(name) {
  if (!name) return '—'
  // 截断并首字母大写
  const s = name.length > 8 ? name.slice(0, 7) + '…' : name
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function esc(str = '') {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// ── P7：编辑面板 ──────────────────────────────────────────────

// 可选指标列表
const METRIC_OPTIONS = [
  { key: 'sessions',           label: 'Sessions',    fmt: d => String(d.metrics?.sessions ?? 0) },
  { key: 'avgDailyDuration',   label: 'Daily Avg',   fmt: d => fmtDur(d.metrics?.avgDailyDurationSec) },
  { key: 'peak',               label: 'Peak Hour',   fmt: d => d.metrics?.peakPeriod?.split('–')[0] ?? '—' },
  { key: 'topSkill',           label: 'Top Skill',   fmt: d => fmtSkill(d.metrics?.topSkillName) },
  { key: 'totalDuration',      label: 'Total Time',  fmt: d => fmtDur(d.metrics?.totalDurationSec) },
  { key: 'silentDays',         label: 'Silent Days', fmt: d => String(d.metrics?.silentDays ?? 0) },
]

// 可选图表列表
const CHART_OPTIONS = [
  { key: 'heatmap',      label: 'Activity Heatmap' },
  { key: 'distribution', label: '24H Distribution' },
]

// 当前编辑状态（每次弹窗重置）
let _edit = null

function initEditState(data) {
  _edit = {
    nickname:        data.nickname ?? '',
    summary:         data.summary  ?? '',
    tags:            [...(data.tags ?? [])],
    selectedMetrics: ['sessions', 'avgDailyDuration', 'peak', 'topSkill'],
    selectedCharts:  ['heatmap', 'distribution'],
    summaryIdx:      0,
  }
}

function renderEditPanel(data) {
  initEditState(data)
  const body = document.getElementById('poster-edit-body')
  if (!body) return

  body.innerHTML = ''

  // ── 称呼 ──
  body.appendChild(buildField({
    label: '称呼',
    hint:  '最多 10 个字符，显示在海报上',
    input: buildInput('text', _edit.nickname, 10, val => {
      _edit.nickname = val
      refreshPoster(data)
      // 持久化
      fetch('/api/config', { method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posterNickname: val }) })
    }),
  }))

  // ── // OUTPUT ──
  body.appendChild(buildSummaryField(data))

  // ── AI 人格标签 ──
  body.appendChild(buildTagsDisplay(data.tags ?? []))

  // ── 数据卡片选择：指标 ──
  body.appendChild(buildCheckGroup({
    label:    '指标卡片（最多 4 个）',
    options:  METRIC_OPTIONS,
    selected: _edit.selectedMetrics,
    max:      4,
    onChange: keys => { _edit.selectedMetrics = keys; refreshPoster(data) },
  }))

  // ── 数据卡片选择：图表 ──
  body.appendChild(buildCheckGroup({
    label:    '图表（最多 2 个）',
    options:  CHART_OPTIONS,
    selected: _edit.selectedCharts,
    max:      2,
    onChange: keys => { _edit.selectedCharts = keys; refreshPoster(data) },
  }))
}

// ── 字段容器 ────────────────────────────────────────────────

function buildField({ label, hint, input }) {
  const sec = document.createElement('div')
  sec.className = 'poster-section'

  const header = document.createElement('div')
  header.className = 'poster-section-header'

  const lbl = document.createElement('div')
  lbl.className = 'poster-section-title'
  lbl.textContent = label
  header.appendChild(lbl)

  if (hint) {
    const h = document.createElement('div')
    h.className = 'poster-section-hint'
    h.textContent = hint
    header.appendChild(h)
  }
  sec.appendChild(header)
  sec.appendChild(input)
  return sec
}

function buildInput(type, value, maxLen, onChange) {
  const inp = document.createElement('input')
  inp.type = type
  inp.className = 'poster-input'
  inp.value = value
  inp.maxLength = maxLen
  inp.addEventListener('input', () => onChange(inp.value))
  return inp
}

function buildTextarea(value, onChange) {
  const ta = document.createElement('textarea')
  ta.className = 'poster-input'
  ta.value = value
  ta.rows = 3
  ta.style.resize = 'vertical'
  ta.addEventListener('input', () => onChange(ta.value))
  return ta
}

// ── 标签展示（只读，自动生成）──────────────────────────────

function buildTagsDisplay(tags) {
  const sec = document.createElement('div')
  sec.className = 'poster-section'

  const header = document.createElement('div')
  header.className = 'poster-section-header'

  const lbl = document.createElement('div')
  lbl.className = 'poster-section-title'
  lbl.textContent = 'AI 人格标签'
  header.appendChild(lbl)

  const hint = document.createElement('div')
  hint.className = 'poster-section-hint'
  hint.textContent = '根据使用数据自动生成'
  header.appendChild(hint)

  sec.appendChild(header)

  const row = document.createElement('div')
  row.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;'
  tags.forEach(tag => {
    const chip = document.createElement('span')
    chip.style.cssText = `font-size:13px;color:var(--green);white-space:nowrap;
      border:1px solid rgba(74,222,128,0.3);background:rgba(74,222,128,0.08);
      border-radius:4px;padding:4px 10px;font-family:var(--font);`
    chip.textContent = tag
    row.appendChild(chip)
  })
  sec.appendChild(row)

  return sec
}

// ── 复选框组 ────────────────────────────────────────────────

function buildCheckGroup({ label, options, selected, max, onChange }) {
  const sec = document.createElement('div')
  sec.className = 'poster-section'

  const lbl = document.createElement('div')
  lbl.className = 'poster-section-title'
  lbl.textContent = label
  sec.appendChild(lbl)

  const grid = document.createElement('div')
  grid.style.cssText = 'display:flex;flex-direction:column;gap:6px;'

  const checkboxes = []
  options.forEach(opt => {
    const row = document.createElement('label')
    row.style.cssText = `display:flex;align-items:center;gap:8px;
      cursor:pointer;font-size:13px;color:var(--text);padding:4px 0;`

    const cb = document.createElement('input')
    cb.type = 'checkbox'
    cb.checked = selected.includes(opt.key)
    cb.style.cssText = 'accent-color:var(--green);width:14px;height:14px;cursor:pointer;'
    checkboxes.push({ key: opt.key, cb })

    cb.addEventListener('change', () => {
      const now = checkboxes.filter(c => c.cb.checked).map(c => c.key)
      // 超过上限时撤销本次勾选
      if (cb.checked && now.length > max) {
        cb.checked = false
        return
      }
      onChange(checkboxes.filter(c => c.cb.checked).map(c => c.key))
    })

    const txt = document.createElement('span')
    txt.textContent = opt.label
    row.appendChild(cb)
    row.appendChild(txt)
    grid.appendChild(row)
  })

  sec.appendChild(grid)
  return sec
}

// ── 实时刷新海报预览 ─────────────────────────────────────────

function refreshPoster(data) {
  const wrap = document.getElementById('poster-canvas-wrap')
  if (!wrap || !_edit) return

  // 用编辑状态覆盖原始数据
  const merged = {
    ...data,
    nickname: _edit.nickname,
    summary:  _edit.summary,
    tags:     _edit.tags,
    metrics:  buildFilteredMetrics(data, _edit.selectedMetrics),
    heatmap:  _edit.selectedCharts.includes('heatmap') ? data.heatmap : [],
    distribution: _edit.selectedCharts.includes('distribution') ? data.distribution : [],
  }

  wrap.innerHTML = ''
  wrap.appendChild(buildPosterCard(merged))
}

// ── Summary 只读区块 + 刷新按钮 ─────────────────────────────

function buildSummaryField(data) {
  const sec = document.createElement('div')
  sec.className = 'poster-section'

  const header = document.createElement('div')
  header.className = 'poster-section-header'

  const lbl = document.createElement('div')
  lbl.className = 'poster-section-title'
  lbl.textContent = '签名'
  header.appendChild(lbl)

  const right = document.createElement('div')
  right.style.cssText = 'display:flex;align-items:center;gap:8px;'

  const counter = document.createElement('span')
  counter.style.cssText = 'font-size:11px;color:var(--muted);'
  counter.id = 'summary-counter'
  right.appendChild(counter)

  const refreshBtn = document.createElement('button')
  refreshBtn.style.cssText = `display:flex;align-items:center;gap:4px;padding:2px 8px;
    border:1px solid var(--border);border-radius:4px;background:transparent;
    color:var(--muted);font-size:11px;font-family:var(--font);cursor:pointer;transition:all 0.15s;`
  refreshBtn.innerHTML = `<svg width="11" height="11" viewBox="0 0 12 12" fill="none"
    stroke="currentColor" stroke-width="1.6" stroke-linecap="round">
    <path d="M10 6A4 4 0 1 1 8.5 2.5"/><path d="M8 1l1 2-2 .5"/>
  </svg> 换一句`
  refreshBtn.addEventListener('mouseover', () => {
    refreshBtn.style.borderColor = 'var(--green)'
    refreshBtn.style.color = 'var(--green)'
  })
  refreshBtn.addEventListener('mouseout', () => {
    refreshBtn.style.borderColor = 'var(--border)'
    refreshBtn.style.color = 'var(--muted)'
  })
  right.appendChild(refreshBtn)
  header.appendChild(right)
  sec.appendChild(header)

  const display = document.createElement('div')
  display.id = 'summary-display'
  display.style.cssText = `background:var(--bg);border:1px solid var(--border);
    border-radius:var(--radius);padding:10px;color:var(--text);
    font-size:13px;line-height:1.6;min-height:60px;`
  display.textContent = _edit.summary
  sec.appendChild(display)

  updateSummaryCounter(data.summaryCount ?? 1, 0)

  refreshBtn.addEventListener('click', async () => {
    refreshBtn.disabled = true
    refreshBtn.style.opacity = '0.5'
    _edit.summaryIdx = ((_edit.summaryIdx ?? 0) + 1)
    try {
      const r = await fetch(`/api/poster/generate-text?range=${data.range}&seed=${_edit.summaryIdx}`)
      const d = await r.json()
      _edit.summary = d.summary
      const disp = document.getElementById('summary-display')
      if (disp) disp.textContent = d.summary
      updateSummaryCounter(d.summaryCount ?? 1, _edit.summaryIdx)
      refreshPoster(data)
    } finally {
      refreshBtn.disabled = false
      refreshBtn.style.opacity = '1'
    }
  })

  return sec
}

function updateSummaryCounter(total, idx) {
  const counterEl = document.getElementById('summary-counter')
  if (counterEl && total > 1) counterEl.textContent = `${(idx % total) + 1} / ${total}`
}

// 根据选中的 key 重组指标顺序，未选中的不传入（卡片区留空）
function buildFilteredMetrics(data, keys) {
  const base = data.metrics ?? {}
  const colorMap = {
    sessions:         C.green,
    avgDailyDuration: C.cyan,
    peak:             C.amber,
    topSkill:         C.purple,
    totalDuration:    C.cyan,
    silentDays:       C.muted,
  }
  return {
    ...base,
    _selectedKeys: keys,   // 传给 buildPosterCard 使用
    _colorMap: colorMap,
  }
}

// ── P8：图片导出 ──────────────────────────────────────────────

function loadDomToImage() {
  if (window.domtoimage) return Promise.resolve(window.domtoimage)
  return new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = 'https://unpkg.com/dom-to-image-more@3.4.0/dist/dom-to-image-more.min.js'
    s.onload  = () => resolve(window.domtoimage)
    s.onerror = () => reject(new Error('无法加载图片导出库，请检查网络连接'))
    document.head.appendChild(s)
  })
}

async function exportPoster(action) {
  const card = document.getElementById('poster-card')
  if (!card) return

  const btnId  = action === 'copy' ? 'poster-copy-btn' : 'poster-download-btn'
  const btn    = document.getElementById(btnId)
  const origTx = btn.textContent
  btn.textContent = '生成中…'
  btn.disabled = true

  try {
    const domtoimage = await loadDomToImage()

    const scale = PREVIEW_W / POSTER_W
    const dataUrl = await domtoimage.toPng(card, {
      width:  POSTER_W,
      height: card.scrollHeight,
      style:  { transform: 'none', transformOrigin: 'top left' },
    })

    if (action === 'copy') {
      const blob = await (await fetch(dataUrl)).blob()
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
      btn.textContent = '已复制 ✓'
      setTimeout(() => { btn.textContent = origTx; btn.disabled = false }, 2000)
    } else {
      const a = document.createElement('a')
      a.href = dataUrl
      a.download = `cc-insight-poster-${Date.now()}.png`
      a.click()
      btn.textContent = origTx
      btn.disabled = false
    }
  } catch (e) {
    console.error('[poster export]', e)
    btn.textContent = '导出失败'
    setTimeout(() => { btn.textContent = origTx; btn.disabled = false }, 2500)
  }
}
