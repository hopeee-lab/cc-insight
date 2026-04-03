// public/js/insights.js
import { setRange } from './app.js'

const TOPIC_COLORS = {
  '调试修复':   'var(--green)',
  '新功能开发': 'var(--cyan)',
  '架构设计':   'var(--amber)',
  '代码重构':   'var(--purple)',
  '学习探索':   'var(--red)',
  '配置运维':   '#06b6d4',
  '数据分析':   '#f97316',
  '其他':       'var(--muted)',
}

// 热力图用 rgba，支持按强度调节透明度
const TOPIC_HEX = {
  '调试修复':   '74,222,128',
  '新功能开发': '34,211,238',
  '架构设计':   '245,158,11',
  '代码重构':   '167,139,250',
  '学习探索':   '248,113,113',
  '配置运维':   '6,182,212',
  '数据分析':   '249,115,22',
  '其他':       '107,114,128',
}

function topicColor(topic) {
  return TOPIC_COLORS[topic] ?? 'var(--muted)'
}

function topicCellColor(topic, count, maxCount) {
  if (!count) return 'var(--bg3)'
  const rgb = TOPIC_HEX[topic] ?? '107,114,128'
  const p = count / maxCount
  const alpha = p < 0.25 ? 0.25 : p < 0.5 ? 0.5 : p < 0.75 ? 0.75 : 1.0
  return `rgba(${rgb},${alpha})`
}

const CARD_HEIGHT = 300

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

function projectName(p) {
  if (!p || p === '未知') return '未知'
  const parts = p.split('/')
  const home = '/Users/' + (parts[2] ?? '')
  if (p === home) return '~'
  if (p.startsWith(home + '/')) return '~' + p.slice(home.length)
  return parts.filter(Boolean).pop() ?? p
}

function summaryCards(data) {
  const { roundsByTopic, durationByTopic, densityByTopic, projectDist, outlierSessions } = data
  const topDensity  = densityByTopic[0]
  const topProject  = (projectDist ?? []).find(r => projectName(r.project) !== '~')
  const topOutlier  = outlierSessions[0]

  const inefficient = roundsByTopic[0]
  const durationMap = Object.fromEntries((durationByTopic ?? []).map(r => [r.topic, r.pct]))
  const ineffPct    = inefficient ? (durationMap[inefficient.topic] ?? null) : null
  const ineffSub    = inefficient
    ? `平均 ${inefficient.avgRounds} 轮${ineffPct !== null ? ` · 时长占 ${ineffPct}%` : ''}`
    : '暂无数据'

  const outlierSub = topOutlier
    ? (topOutlier.firstUserMsg
        ? topOutlier.firstUserMsg.slice(0, 28) + (topOutlier.firstUserMsg.length > 28 ? '…' : '')
        : topOutlier.topic ?? '—')
    : '暂无数据'

  function card(label, value, sub, color) {
    return `
      <div class="card">
        <div class="card-label">${label}</div>
        <div class="card-value" style="color:${color};font-size:20px;word-break:break-all;">
          ${value}
        </div>
        <div class="card-sub" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${sub}</div>
      </div>`
  }

  return `
    <div class="grid-4" style="margin-bottom:14px;">
      ${card('耗时话题',
        inefficient ? inefficient.topic : '—',
        ineffSub,
        'var(--red)')}
      ${card('Session 轮次最多',
        topOutlier ? `${topOutlier.messageCount} 轮` : '—',
        outlierSub,
        'var(--amber)')}
      ${card('工具密度高',
        topDensity ? topDensity.topic : '—',
        topDensity ? `${topDensity.avgTurns} 轮 · ${topDensity.avgTools} 调用` : '暂无数据',
        'var(--cyan)')}
      ${card('最活跃项目',
        topProject ? (topProject.project.split('/').filter(Boolean).pop() ?? projectName(topProject.project)) : '—',
        topProject ? `占 ${topProject.pct}%` : '暂无数据',
        'var(--green)')}
    </div>`
}

// ── 容器内滚动渲染器（替代翻页）──
function renderScrollable(el, rows, renderItem, emptyMsg = '暂无数据') {
  if (!rows || rows.length === 0) {
    el.innerHTML = `<div style="color:var(--muted);font-size:14px;padding:12px 0;">${emptyMsg}</div>`
    return
  }
  el.style.overflowY = 'auto'
  el.innerHTML = rows.map(renderItem).join('')
}

export async function renderInsightsPage(container, range) {
  const scroller = container.querySelector('.insights-scroll')
  const savedScroll = scroller?.scrollTop ?? 0

  const data = await fetch(`/api/efficiency?range=${range}`).then(r => r.json())

  container.style.display = 'flex'
  container.style.flexDirection = 'column'

  const cardStyle    = `height:${CARD_HEIGHT}px;display:flex;flex-direction:column;`
  const contentStyle = `flex:1;min-height:0;overflow-y:auto;`

  container.innerHTML = `
    ${rangeFilter(range)}
    <div class="insights-scroll" style="flex:1;min-height:0;overflow-y:auto;padding-bottom:20px;">
      ${summaryCards(data)}
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:10px;">
        <div class="card" style="${cardStyle}">
          <div class="section-header"><span class="section-title">耗时话题 — 轮数 & 时长占比</span></div>
          <div id="ins-rounds" style="${contentStyle}"></div>
        </div>
        <div class="card" style="${cardStyle}">
          <div class="section-header"><span class="section-title">自动化程度 — 工具调用密度</span></div>
          <div id="ins-density" style="${contentStyle}"></div>
        </div>
        <div class="card" style="${cardStyle}">
          <div class="section-header"><span class="section-title">项目分布 — 活跃目录</span></div>
          <div id="ins-projects" style="${contentStyle}"></div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div class="card" style="${cardStyle}">
          <div class="section-header" style="padding-left:72px;"><span class="section-title">时间规律 — 时段 × 话题</span></div>
          <div id="ins-heatmap" style="flex:1;min-height:0;overflow:hidden;display:flex;flex-direction:column;"></div>
        </div>
        <div class="card" style="${cardStyle}">
          <div class="section-header"><span class="section-title">Session — 高轮次对话</span></div>
          <div id="ins-outliers" style="${contentStyle}"></div>
        </div>
      </div>
    </div>`

  container.querySelectorAll('.range-btn').forEach(btn => {
    btn.addEventListener('click', () => setRange(btn.dataset.range))
  })

  renderRounds(document.getElementById('ins-rounds'), data.roundsByTopic, data.durationByTopic)
  renderDensity(document.getElementById('ins-density'), data.densityByTopic)
  renderHeatmap(document.getElementById('ins-heatmap'), data.heatmap)
  renderOutliers(document.getElementById('ins-outliers'), data.outlierSessions)
  renderProjects(document.getElementById('ins-projects'), data.projectDist)

  if (savedScroll > 0) {
    const s = container.querySelector('.insights-scroll')
    if (s) s.scrollTop = savedScroll
  }
}

// ── 条形图 item ──
function barItem(topic, label, pct) {
  const color = topicColor(topic)
  return `
    <div style="margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;">
        <span style="color:var(--text);">${topic}</span>
        <span style="color:${color};">${label}</span>
      </div>
      <div style="background:var(--bg3);border-radius:3px;height:6px;">
        <div style="width:${pct}%;background:${color};height:6px;border-radius:3px;
                    transition:width 0.3s;min-width:4px;"></div>
      </div>
    </div>`
}

function renderRounds(el, rows, durationRows) {
  const max    = Math.max(...(rows ?? []).map(r => r.avgRounds), 1)
  const pctMap = Object.fromEntries((durationRows ?? []).map(r => [r.topic, r.pct]))
  renderScrollable(el, rows, r => {
    const pct   = pctMap[r.topic] ?? null
    const label = pct !== null ? `${r.avgRounds} 轮 · ${pct}%` : `${r.avgRounds} 轮`
    return barItem(r.topic, label, r.avgRounds / max * 100)
  })
}

function renderDensity(el, rows) {
  const max = Math.max(...(rows ?? []).map(r => r.density), 1)
  renderScrollable(el, rows,
    r => barItem(r.topic, `${r.avgTurns} 轮 · ${r.avgTools} 调用`, r.density / max * 100))
}

// ── 时间规律热力图（话题 Y 轴 × 小时 X 轴）──
function renderHeatmap(el, rows) {
  if (!rows || rows.length === 0) {
    el.innerHTML = `<div style="color:var(--muted);font-size:14px;padding:12px 0;">暂无数据</div>`
    return
  }

  const topics   = [...new Set(rows.map(r => r.topic))].slice(0, 8)
  const hours    = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))
  const lookup   = {}
  for (const r of rows) {
    if (!lookup[r.topic]) lookup[r.topic] = {}
    lookup[r.topic][r.hour] = r.count
  }
  const maxCount = Math.max(...rows.map(r => r.count), 1)

  const LABEL_W = '72px'
  const GAP     = '3px'

  // X 轴小时标签行（宽度与格子对齐）
  const hourHeader = `
    <div style="display:flex;align-items:center;gap:${GAP};margin-bottom:4px;">
      <span style="width:${LABEL_W};flex-shrink:0;"></span>
      <div style="display:flex;flex:1;gap:${GAP};">
        ${hours.map(h => `
          <div style="flex:1;text-align:center;font-size:9px;color:var(--muted);">${h}</div>
        `).join('')}
      </div>
    </div>`

  // 每个话题一行；格子 aspect-ratio:1 保证正方形，行高由格子宽度决定
  const topicRows = topics.map(t => {
    const cells = hours.map(h => {
      const cnt = lookup[t]?.[h] ?? 0
      return `<div title="${h}:00 · ${t} · ${cnt} sessions"
        style="flex:1;aspect-ratio:1;border-radius:2px;
          background:${topicCellColor(t, cnt, maxCount)};"></div>`
    }).join('')
    return `
      <div style="display:flex;align-items:center;gap:${GAP};margin-bottom:${GAP};">
        <span style="width:${LABEL_W};flex-shrink:0;font-size:10px;color:${topicColor(t)};
          overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right;
          padding-right:6px;">${t}</span>
        <div style="display:flex;flex:1;gap:${GAP};">${cells}</div>
      </div>`
  }).join('')

  el.innerHTML = `
    <div style="padding-top:4px;">
      ${hourHeader}
      ${topicRows}
    </div>`
}

// ── Session 明细 ──
function renderOutliers(el, rows) {
  function fmtDate(ms) {
    if (!ms) return ''
    return new Date(ms).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
  }

  const filtered = (rows ?? []).filter(r => r.firstUserMsg && r.firstUserMsg.trim())
  renderScrollable(el, filtered, r => {
    const msg     = r.firstUserMsg
    const preview = msg.length > 70 ? msg.slice(0, 70) + '…' : msg
    return `
      <div style="background:var(--bg3);border-radius:4px;padding:7px 10px;
        margin-bottom:5px;border-left:3px solid ${topicColor(r.topic)};">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span style="font-size:12px;color:${topicColor(r.topic)};">${r.topic ?? '未分类'}</span>
          <span style="font-size:11px;color:var(--muted);">${r.messageCount} 轮 · ${fmtDate(r.startTime)}</span>
        </div>
        <div title="${msg.replace(/"/g, '&quot;')}"
          style="font-size:11px;color:var(--muted);margin-top:3px;cursor:default;
            overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
          ${preview}
        </div>
      </div>`
  }, '暂无高轮次 Session')
}

// ── 项目分布 ──
function renderProjects(el, rows) {
  const COLORS = [
    'var(--green)', 'var(--cyan)', 'var(--amber)', 'var(--purple)',
    'var(--red)', '#f97316', '#06b6d4', 'var(--muted)',
  ]
  const filtered = (rows ?? []).filter(r => projectName(r.project) !== '~')
  renderScrollable(el, filtered, r => {
    const color = COLORS[filtered.indexOf(r)] ?? 'var(--muted)'
    return `
      <div style="margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;">
          <span style="color:var(--text);overflow:hidden;text-overflow:ellipsis;
            white-space:nowrap;max-width:60%;">${projectName(r.project)}</span>
          <span style="color:${color};white-space:nowrap;">${r.count} 次 · ${r.pct}%</span>
        </div>
        <div style="background:var(--bg3);border-radius:3px;height:6px;">
          <div style="width:${r.pct}%;background:${color};height:6px;border-radius:3px;
                      transition:width 0.3s;min-width:4px;"></div>
        </div>
      </div>`
  })
}
