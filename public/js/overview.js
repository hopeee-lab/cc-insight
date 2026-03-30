// public/js/overview.js
import { setRange } from './app.js'

function fmtDuration(sec) {
  if (!sec) return '0m'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function rangeFilter(current) {
  const ranges = [
    { value: '7d',  label: '7 天' },
    { value: '30d', label: '30 天' },
    { value: '90d', label: '90 天' },
    { value: 'all', label: '全部' },
  ]
  return `
    <div class="range-filter">
      <span>时间范围：</span>
      ${ranges.map(r => `
        <button class="range-btn ${r.value === current ? 'active' : ''}"
          data-range="${r.value}">${r.label}</button>
      `).join('')}
    </div>`
}

function statsCards(data) {
  return `
    <div class="grid-4" style="margin-bottom:14px;">
      <div class="card">
        <div class="card-label">Sessions</div>
        <div class="card-value green">${data.sessions ?? 0}</div>
        <div class="card-sub">次对话</div>
      </div>
      <div class="card">
        <div class="card-label">Duration</div>
        <div class="card-value cyan">${fmtDuration(data.totalDurationSec)}</div>
        <div class="card-sub">累计时长</div>
      </div>
      <div class="card">
        <div class="card-label">Peak Period</div>
        <div class="card-value amber">${data.peakPeriod ?? '—'}</div>
        <div class="card-sub">活跃时段</div>
      </div>
      <div class="card">
        <div class="card-label">Avg / Day</div>
        <div class="card-value purple">${fmtDuration(data.avgDailyDurationSec)}</div>
        <div class="card-sub">日均时长</div>
      </div>
    </div>`
}

export async function renderOverview(container, range) {
  const [overview, heatmap, dist, insights, toolDist] = await Promise.all([
    fetch(`/api/overview?range=${range}`).then(r => r.json()),
    fetch(`/api/heatmap?range=${range}`).then(r => r.json()),
    fetch(`/api/distribution?range=${range}`).then(r => r.json()),
    fetch(`/api/insights?range=${range}`).then(r => r.json()),
    fetch(`/api/tool-distribution?range=${range}`).then(r => r.json()),
  ])

  container.innerHTML = `
    ${rangeFilter(range)}
    ${statsCards(overview)}
    <div class="split">
      <div class="split-left">
        <div id="insights-panel"></div>
      </div>
      <div class="split-right">
        <div class="card" style="margin-bottom:10px;">
          <div class="section-header">
            <span class="section-title">Activity Heatmap</span>
          </div>
          <div id="heatmap-canvas"></div>
        </div>
        <div class="card" style="margin-bottom:10px;">
          <div class="section-header">
            <span class="section-title">24H 时间分布</span>
            <span id="dist-peak-label" class="muted" style="font-size:12px;"></span>
          </div>
          <div id="dist-canvas"></div>
        </div>
        <div class="card">
          <div class="section-header">
            <span class="section-title">工具调用分布</span>
          </div>
          <div id="tool-dist-canvas"></div>
        </div>
      </div>
    </div>`

  container.querySelectorAll('.range-btn').forEach(btn => {
    btn.addEventListener('click', () => setRange(btn.dataset.range))
  })

  renderInsights(document.getElementById('insights-panel'), insights)
  renderHeatmap(document.getElementById('heatmap-canvas'), heatmap)
  renderDist(document.getElementById('dist-canvas'), dist)
  renderToolDist(document.getElementById('tool-dist-canvas'), toolDist)
}

// ── Heatmap ──
function renderHeatmap(el, data) {
  const map = Object.fromEntries(data.map(r => [r.day, r.count]))
  const max = Math.max(...Object.values(map), 1)

  const CELL = 12
  const GAP  = 3
  const LABEL_W = 28

  function intensity(count) {
    if (count === 0) return 'var(--bg3)'
    const pct = count / max
    if (pct < 0.25) return '#0e4429'
    if (pct < 0.5)  return '#006d32'
    if (pct < 0.75) return '#26a641'
    return '#39d353'
  }

  const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', '']

  // 计算容器能放多少周（页容量）
  function calcPageSize(containerW) {
    const usable = containerW - LABEL_W - GAP
    return Math.max(4, Math.floor((usable + GAP) / (CELL + GAP)))
  }

  // 始终生成 pageSize 列，通过 pageOffset 向历史平移
  function buildGrid(pageSize, pageOffset) {
    const today = new Date()
    // 当前页的末尾锚点：pageOffset=0 为今天，每页向前推 pageSize 周
    const endAnchor = new Date(today)
    endAnchor.setDate(endAnchor.getDate() - pageOffset * pageSize * 7)

    // 起始锚点：末尾往前 pageSize 周，对齐到周一
    const startAnchor = new Date(endAnchor)
    startAnchor.setDate(endAnchor.getDate() - pageSize * 7)
    startAnchor.setDate(startAnchor.getDate() - ((startAnchor.getDay() + 6) % 7))

    const weeks = []
    let cur = new Date(startAnchor)
    while (cur <= endAnchor) {
      const week = []
      for (let d = 0; d < 7; d++) {
        const key = cur.toISOString().slice(0, 10)
        week.push({ day: key, count: map[key] ?? 0 })
        cur.setDate(cur.getDate() + 1)
      }
      weeks.push(week)
    }

    // 是否有更早的数据
    const viewStart = startAnchor.toISOString().slice(0, 10)
    const canPrev = data.some(r => r.day < viewStart)
    const canNext = pageOffset > 0

    const pageBtnStyle = (enabled) =>
      `background:transparent;border:none;cursor:${enabled ? 'pointer' : 'default'};
       color:var(--muted);font-size:14px;padding:0 4px;font-family:var(--font);
       opacity:${enabled ? 1 : 0.3};`

    const paginationHtml = (canPrev || canNext) ? `
      <div style="display:flex;align-items:center;gap:2px;">
        <button class="heatmap-prev" style="${pageBtnStyle(canPrev)}">&lt;</button>
        <button class="heatmap-next" style="${pageBtnStyle(canNext)}">&gt;</button>
      </div>` : ''

    return { html: `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <span style="font-size:11px;color:var(--muted);">${weeks[0]?.[0]?.day ?? ''}</span>
        ${paginationHtml}
      </div>
      <div style="display:flex;gap:${GAP}px;">
        <div style="display:flex;flex-direction:column;gap:${GAP}px;width:${LABEL_W}px;flex-shrink:0;padding-top:2px;">
          ${dayLabels.map(l => `<div style="height:${CELL}px;font-size:10px;color:var(--muted);line-height:${CELL}px;">${l}</div>`).join('')}
        </div>
        <div style="display:flex;gap:${GAP}px;">
          ${weeks.map(week => `
            <div style="display:flex;flex-direction:column;gap:${GAP}px;">
              ${week.map(cell => `
                <div title="${cell.day}: ${cell.count} sessions"
                  style="width:${CELL}px;height:${CELL}px;border-radius:2px;
                    background:${intensity(cell.count)};cursor:default;flex-shrink:0;">
                </div>`).join('')}
            </div>`).join('')}
        </div>
      </div>
      <div style="display:flex;gap:4px;align-items:center;margin-top:8px;">
        <span style="font-size:11px;color:var(--muted);">少</span>
        ${['var(--bg3)','#0e4429','#006d32','#26a641','#39d353'].map(c =>
          `<div style="width:10px;height:10px;background:${c};border-radius:2px;"></div>`).join('')}
        <span style="font-size:11px;color:var(--muted);">多</span>
      </div>`, canPrev, canNext }
  }

  let pageSize = 16
  let pageOffset = 0   // 0 = 最新一页

  function render() {
    const { html, canPrev, canNext } = buildGrid(pageSize, pageOffset)
    el.innerHTML = html
    el.querySelector('.heatmap-prev')?.addEventListener('click', () => {
      if (canPrev) { pageOffset++; render() }
    })
    el.querySelector('.heatmap-next')?.addEventListener('click', () => {
      if (canNext) { pageOffset--; render() }
    })
  }

  render()

  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(entries => {
      const w = entries[0].contentRect.width
      if (w < 10) return
      const newSize = calcPageSize(w)
      if (el._lastPageSize !== newSize) {
        el._lastPageSize = newSize
        pageSize = newSize
        pageOffset = 0
        render()
      }
    })
    ro.observe(el)
  }
}

// ── 24H Distribution ──
function renderDist(el, data) {
  const map = Object.fromEntries(data.map(r => [r.hour, r.count]))
  const hours = Array.from({ length: 24 }, (_, i) => ({
    hour: String(i).padStart(2, '0'),
    count: map[String(i).padStart(2, '0')] ?? 0,
  }))
  const max = Math.max(...hours.map(h => h.count), 1)
  const peak = hours.reduce((a, b) => b.count > a.count ? b : a)
  const silent = hours.filter(h => h.count === 0)

  const label = document.getElementById('dist-peak-label')
  if (label && peak.count > 0) {
    label.textContent = `峰值 ${peak.hour}:00 · 静默 ${silent.length}h`
  }

  el.innerHTML = `
    <div style="display:flex;gap:2px;align-items:flex-end;height:60px;">
      ${hours.map(h => {
        const pct = Math.max(h.count / max * 100, h.count > 0 ? 4 : 1)
        const isPeak = h.hour === peak.hour && peak.count > 0
        const color = isPeak ? 'var(--amber)' : (h.count > 0 ? 'var(--green)' : 'var(--bg3)')
        return `<div title="${h.hour}:00 — ${h.count} sessions"
          style="flex:1;background:${color};border-radius:2px 2px 0 0;height:${pct}%;min-height:2px;"></div>`
      }).join('')}
    </div>
    <div style="display:flex;justify-content:space-between;margin-top:4px;">
      ${['0h','6h','12h','18h','23h'].map(l =>
        `<span style="font-size:11px;color:var(--muted);">${l}</span>`).join('')}
    </div>`
}

// ── Insights ──
const INSIGHT_CONFIG = {
  best_day: (d) => ({
    icon: '🔥', color: 'var(--green)', title: '最高产',
    body: `${d.day} 完成了 <span class="green">${d.count} 个 session</span>`
  }),
  silent_days: (d) => ({
    icon: '😴', color: 'var(--red)', title: '静默期',
    body: `当前时间段内有 <span class="red">${d.days} 天</span> 未使用 Claude Code`
  }),
  habit: (d) => ({
    icon: d.label === '夜猫子' ? '🌙' : d.label === '早鸟' ? '🌅' : '💼',
    color: 'var(--amber)', title: `你是${d.label}`,
    body: `<span class="amber">${d.pct}%</span> 的 session 发生在对应时段`
  }),
  trend: (d) => ({
    icon: d.change > 0 ? '📈' : '📉',
    color: d.change > 0 ? 'var(--cyan)' : 'var(--red)',
    title: '使用趋势',
    body: d.change > 0
      ? `比上个同期增长 <span class="cyan">+${d.change}%</span>`
      : `比上个同期下降 <span class="red">${d.change}%</span>`
  }),
}

function renderInsights(el, insights) {
  if (!el) return

  if (!insights || insights.length === 0) {
    el.innerHTML = `
      <div class="card">
        <div class="section-title" style="margin-bottom:8px;">Insights</div>
        <div class="muted" style="font-size:14px;">数据积累中，稍后会自动生成洞察</div>
      </div>`
    return
  }

  const cards = insights.map(item => {
    const cfg = INSIGHT_CONFIG[item.type]?.(item)
    if (!cfg) return ''
    return `
      <div style="background:var(--bg2);border:1px solid var(--border);
        border-left:3px solid ${cfg.color};border-radius:var(--radius);
        padding:10px 12px;display:flex;gap:10px;align-items:flex-start;">
        <span style="font-size:18px;line-height:1;">${cfg.icon}</span>
        <div>
          <div style="color:var(--text);font-size:14px;margin-bottom:3px;">${cfg.title}</div>
          <div style="color:var(--muted);font-size:14px;">${cfg.body}</div>
        </div>
      </div>`
  }).join('')

  el.innerHTML = `
    <div class="card">
      <div class="section-title" style="margin-bottom:10px;">Insights</div>
      <div style="display:flex;flex-direction:column;gap:8px;">${cards}</div>
    </div>`
}

// ── 工具调用分布环形图 ──
function renderToolDist(el, data) {
  if (!data || data.length === 0) {
    el.innerHTML = `<div style="color:var(--muted);font-size:14px;padding:12px 0;">暂无数据</div>`
    return
  }

  const COLORS = [
    'var(--green)', 'var(--cyan)', 'var(--amber)', 'var(--purple)', 'var(--red)',
    '#f97316', '#06b6d4', '#a3e635', '#e879f9', '#38bdf8',
  ]
  const TOP_N = 8

  const total = data.reduce((s, r) => s + r.count, 0)
  const top = data.slice(0, TOP_N)
  const otherCount = data.slice(TOP_N).reduce((s, r) => s + r.count, 0)
  const items = otherCount > 0 ? [...top, { toolName: '其他', count: otherCount }] : top

  // SVG 环形图
  const R = 54, r = 32, cx = 70, cy = 70
  let angle = -Math.PI / 2
  const paths = items.map((item, i) => {
    const pct = item.count / total
    const sweep = pct * 2 * Math.PI
    const x1 = cx + R * Math.cos(angle), y1 = cy + R * Math.sin(angle)
    const x2 = cx + R * Math.cos(angle + sweep), y2 = cy + R * Math.sin(angle + sweep)
    const ix1 = cx + r * Math.cos(angle), iy1 = cy + r * Math.sin(angle)
    const ix2 = cx + r * Math.cos(angle + sweep), iy2 = cy + r * Math.sin(angle + sweep)
    const large = sweep > Math.PI ? 1 : 0
    const color = i < COLORS.length ? COLORS[i] : 'var(--muted)'
    const d = `M${x1},${y1} A${R},${R},0,${large},1,${x2},${y2} L${ix2},${iy2} A${r},${r},0,${large},0,${ix1},${iy1} Z`
    angle += sweep
    return `<path d="${d}" fill="${color}" opacity="0.9"/>`
  }).join('')

  const totalFmt = total >= 10000 ? (total / 10000).toFixed(1) + 'w次' : total.toLocaleString() + '次'

  function legendItem(item, i) {
    const color = i < COLORS.length ? COLORS[i] : 'var(--muted)'
    const pct = Math.round(item.count / total * 100)
    const countFmt = item.count >= 10000 ? (item.count / 10000).toFixed(1) + 'w次' : item.count.toLocaleString() + '次'
    return `
      <div style="display:flex;align-items:center;gap:6px;min-width:0;">
        <span style="width:10px;height:10px;border-radius:2px;background:${color};flex-shrink:0;"></span>
        <span style="font-size:13px;color:var(--text);min-width:70px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${item.toolName}</span>
        <span style="font-size:13px;color:var(--muted);white-space:nowrap;min-width:32px;text-align:right;">${pct}%</span>
        <span style="font-size:13px;color:var(--muted);white-space:nowrap;min-width:58px;text-align:right;">${countFmt}</span>
      </div>`
  }

  // 超过 5 个时拆成 2 列（每列最多 5 个）
  const useTwoCols = items.length > 5
  let legendHtml
  if (useTwoCols) {
    const col1 = items.slice(0, 5)
    const col2 = items.slice(5, 10)
    legendHtml = `
      <div style="display:flex;gap:16px;">
        <div style="display:flex;flex-direction:column;gap:6px;">${col1.map((item, i) => legendItem(item, i)).join('')}</div>
        <div style="display:flex;flex-direction:column;gap:6px;">${col2.map((item, i) => legendItem(item, i + 5)).join('')}</div>
      </div>`
  } else {
    legendHtml = `<div style="display:flex;flex-direction:column;gap:6px;">${items.map(legendItem).join('')}</div>`
  }

  el.innerHTML = `
    <div style="display:flex;gap:20px;align-items:center;justify-content:center;">
      <div style="flex-shrink:0;">
        <svg width="120" height="120" viewBox="0 0 140 140">
          ${paths}
          <text x="${cx}" y="${cy - 6}" text-anchor="middle"
            style="font-size:11px;fill:var(--muted);font-family:var(--font);">总计</text>
          <text x="${cx}" y="${cy + 10}" text-anchor="middle"
            style="font-size:13px;font-weight:bold;fill:var(--text);font-family:var(--font);">${totalFmt}</text>
        </svg>
      </div>
      ${legendHtml}
    </div>`
}
