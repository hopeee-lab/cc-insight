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

function topicColor(topic) {
  return TOPIC_COLORS[topic] ?? 'var(--muted)'
}

const CARD_HEIGHT = 300  // px，所有图表卡片统一高度
const PAGE_SIZE   = 5    // 条形图每页条目数
const PAGE_SIZE_OUTLIERS = 4

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
  if (p === home) return '主目录项目'
  if (p.startsWith(home + '/')) return '~' + p.slice(home.length)
  return parts.filter(Boolean).pop() ?? p
}

function parseKeywords(raw) {
  if (!raw) return []
  try { return JSON.parse(raw) } catch { return [] }
}

function summaryCards(data) {
  const { roundsByTopic, durationByTopic, densityByTopic, projectDist, outlierSessions } = data
  const topDensity  = densityByTopic[0]
  const topProject  = projectDist[0]
  const topOutlier  = outlierSessions[0]

  // 合并：最低效话题（轮数最多）+ 时间占比
  const inefficient = roundsByTopic[0]
  const durationMap = Object.fromEntries((durationByTopic ?? []).map(r => [r.topic, r.pct]))
  const ineffPct    = inefficient ? (durationMap[inefficient.topic] ?? null) : null
  const ineffSub    = inefficient
    ? `平均 ${inefficient.avgRounds} 轮${ineffPct !== null ? ` · 时长占 ${ineffPct}%` : ''}`
    : '暂无数据'

  // Session 轮次最多：关键词摘要
  const outlierKws  = topOutlier ? parseKeywords(topOutlier.topicKeywords).slice(0, 3).join(' · ') : ''
  const outlierSub  = topOutlier
    ? (outlierKws || topOutlier.topic || '—')
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
      ${card('最低效话题',
        inefficient ? inefficient.topic : '—',
        ineffSub,
        'var(--red)')}
      ${card('Session 轮次最多',
        topOutlier ? `${topOutlier.messageCount} 轮` : '—',
        outlierSub,
        'var(--amber)')}
      ${card('工具密度高',
        topDensity ? topDensity.topic : '—',
        topDensity ? `${topDensity.density} 次/轮` : '暂无数据',
        'var(--cyan)')}
      ${card('最活跃项目',
        topProject ? projectName(topProject.project) : '—',
        topProject ? `占 ${topProject.pct}%` : '暂无数据',
        'var(--green)')}
    </div>`
}

// ── 通用翻页渲染器 ──
function renderPaged(el, rows, pageSize, renderItem, emptyMsg = '暂无数据') {
  if (!rows || rows.length === 0) {
    el.innerHTML = `<div style="color:var(--muted);font-size:14px;padding:12px 0;">${emptyMsg}</div>`
    return
  }

  let page = 0
  const totalPages = Math.ceil(rows.length / pageSize)

  const btnStyle = `background:transparent;border:none;cursor:pointer;
    color:var(--muted);font-size:14px;padding:0 6px;font-family:var(--font);`

  function render() {
    const slice = rows.slice(page * pageSize, (page + 1) * pageSize)
    const pagination = totalPages > 1 ? `
      <div style="display:flex;align-items:center;justify-content:flex-end;
        gap:4px;margin-top:6px;padding-top:6px;border-top:1px solid var(--border);">
        ${page > 0
          ? `<button class="pg-prev" style="${btnStyle}">&#8249;</button>`
          : `<span style="color:var(--bg3);font-size:14px;padding:0 6px;">&#8249;</span>`}
        <span style="font-size:11px;color:var(--muted);">${page + 1} / ${totalPages}</span>
        ${page < totalPages - 1
          ? `<button class="pg-next" style="${btnStyle}">&#8250;</button>`
          : `<span style="color:var(--bg3);font-size:14px;padding:0 6px;">&#8250;</span>`}
      </div>` : ''

    el.innerHTML = `
      <div style="flex:1;min-height:0;">
        ${slice.map(renderItem).join('')}
      </div>
      ${pagination}`

    el.querySelector('.pg-prev')?.addEventListener('click', () => { page--; render() })
    el.querySelector('.pg-next')?.addEventListener('click', () => { page++; render() })
  }

  render()
}

export async function renderInsightsPage(container, range) {
  const scroller = container.querySelector('.insights-scroll')
  const savedScroll = scroller?.scrollTop ?? 0

  const data = await fetch(`/api/efficiency?range=${range}`).then(r => r.json())

  container.style.display = 'flex'
  container.style.flexDirection = 'column'

  const cardStyle = `height:${CARD_HEIGHT}px;display:flex;flex-direction:column;`
  const contentStyle = `flex:1;min-height:0;overflow:hidden;display:flex;flex-direction:column;`

  container.innerHTML = `
    ${rangeFilter(range)}
    <div class="insights-scroll" style="flex:1;min-height:0;overflow-y:auto;padding-bottom:20px;">
      ${summaryCards(data)}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        <div class="card" style="${cardStyle}">
          <div class="section-header"><span class="section-title">低效话题 — 轮数 & 时长占比</span></div>
          <div id="ins-rounds" style="${contentStyle}"></div>
        </div>
        <div class="card" style="${cardStyle}">
          <div class="section-header"><span class="section-title">自动化程度 — 工具调用密度</span></div>
          <div id="ins-density" style="${contentStyle}"></div>
        </div>
        <div class="card" style="${cardStyle}">
          <div class="section-header"><span class="section-title">时间规律 — 时段 × 话题</span></div>
          <div id="ins-heatmap" style="${contentStyle}"></div>
        </div>
        <div class="card" style="${cardStyle}">
          <div class="section-header"><span class="section-title">低效 Session 列表</span></div>
          <div id="ins-outliers" style="${contentStyle}"></div>
        </div>
        <div class="card" style="grid-column:1/-1;${cardStyle}">
          <div class="section-header"><span class="section-title">项目分布</span></div>
          <div id="ins-projects" style="${contentStyle}"></div>
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

// ── 条形图 item 渲染器 ──
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
  const max = Math.max(...(rows ?? []).map(r => r.avgRounds), 1)
  const pctMap = Object.fromEntries((durationRows ?? []).map(r => [r.topic, r.pct]))
  renderPaged(el, rows, PAGE_SIZE, r => {
    const pct = pctMap[r.topic] ?? null
    const label = pct !== null ? `${r.avgRounds} 轮 · ${pct}%` : `${r.avgRounds} 轮`
    return barItem(r.topic, label, r.avgRounds / max * 100)
  })
}

function renderDensity(el, rows) {
  const max = Math.max(...(rows ?? []).map(r => r.density), 1)
  renderPaged(el, rows, PAGE_SIZE,
    r => barItem(r.topic, `${r.density} 次/轮`, r.density / max * 100))
}

// ── 时间规律热力图（flex 自适应宽度）──
function renderHeatmap(el, rows) {
  if (!rows || rows.length === 0) {
    el.innerHTML = `<div style="color:var(--muted);font-size:14px;padding:12px 0;">暂无数据</div>`
    return
  }

  const topics = [...new Set(rows.map(r => r.topic))].slice(0, 8)
  const hours  = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))

  const lookup = {}
  for (const r of rows) {
    if (!lookup[r.hour]) lookup[r.hour] = {}
    lookup[r.hour][r.topic] = r.count
  }
  const maxCount = Math.max(...rows.map(r => r.count), 1)

  function cellColor(count) {
    if (!count) return 'var(--bg3)'
    const p = count / maxCount
    if (p < 0.25) return '#0e4429'
    if (p < 0.5)  return '#006d32'
    if (p < 0.75) return '#26a641'
    return '#39d353'
  }

  const LABEL_W = '24px'
  const GAP = '3px'

  const headerCells = topics.map(t =>
    `<div style="flex:1;font-size:9px;color:${topicColor(t)};
      text-align:center;overflow:hidden;white-space:nowrap;">${t.slice(0, 2)}</div>`
  ).join('')

  const hourRows = hours.filter((_, i) => i % 2 === 0).map(h => {
    const cells = topics.map(t => {
      const cnt = lookup[h]?.[t] ?? 0
      return `<div title="${h}:00 · ${t} · ${cnt}"
        style="flex:1;height:10px;border-radius:2px;background:${cellColor(cnt)};"></div>`
    }).join('')
    return `
      <div style="display:flex;align-items:center;gap:${GAP};margin-bottom:2px;">
        <span style="font-size:9px;color:var(--muted);width:${LABEL_W};
          text-align:right;flex-shrink:0;">${h}</span>
        <div style="display:flex;flex:1;gap:${GAP};">${cells}</div>
      </div>`
  }).join('')

  el.innerHTML = `
    <div style="display:flex;flex-direction:column;height:100%;">
      <div style="display:flex;align-items:center;gap:${GAP};margin-bottom:4px;">
        <span style="width:${LABEL_W};flex-shrink:0;"></span>
        <div style="display:flex;flex:1;gap:${GAP};">${headerCells}</div>
      </div>
      <div style="flex:1;overflow:hidden;">${hourRows}</div>
      <div style="display:flex;gap:4px;align-items:center;margin-top:6px;flex-shrink:0;">
        <span style="font-size:10px;color:var(--muted);">少</span>
        ${['var(--bg3)', '#0e4429', '#006d32', '#26a641', '#39d353'].map(c =>
          `<div style="width:8px;height:8px;background:${c};border-radius:2px;"></div>`).join('')}
        <span style="font-size:10px;color:var(--muted);">多</span>
      </div>
    </div>`
}

// ── 低效 Session 列表 ──
function renderOutliers(el, rows) {
  function fmtDate(ms) {
    if (!ms) return '—'
    return new Date(ms).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
  }

  function keywords(raw) {
    if (!raw) return '—'
    try {
      const kws = JSON.parse(raw)
      return kws.slice(0, 4).join(' · ') || '—'
    } catch { return '—' }
  }

  renderPaged(el, rows, PAGE_SIZE_OUTLIERS, r => `
    <div style="background:var(--bg3);border-radius:4px;padding:8px 10px;
      margin-bottom:6px;border-left:3px solid ${topicColor(r.topic)};">
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <span style="font-size:12px;color:${topicColor(r.topic)};">${r.topic ?? '未分类'}</span>
        <span style="font-size:12px;color:var(--red);font-weight:bold;">${r.messageCount} 轮</span>
      </div>
      <div style="font-size:11px;color:var(--muted);margin-top:3px;
        overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
        ${keywords(r.topicKeywords)} · ${fmtDate(r.startTime)}
      </div>
    </div>`,
    '暂无异常 Session（对话轮数均在正常范围内）')
}

// ── 项目分布 ──
function renderProjects(el, rows) {
  const COLORS = [
    'var(--green)', 'var(--cyan)', 'var(--amber)', 'var(--purple)',
    'var(--red)', '#f97316', '#06b6d4', 'var(--muted)',
  ]
  renderPaged(el, rows, PAGE_SIZE, (r, i) => {
    const color = COLORS[rows.indexOf(r)] ?? 'var(--muted)'
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
