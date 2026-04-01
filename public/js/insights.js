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
  return p.split('/').filter(Boolean).pop() ?? p
}

function summaryCards(data) {
  const { roundsByTopic, durationByTopic, densityByTopic, projectDist } = data
  const inefficient = roundsByTopic[0]
  const topDuration = durationByTopic[0]
  const topDensity  = densityByTopic[0]
  const topProject  = projectDist[0]

  function card(label, value, sub, color) {
    return `
      <div class="card">
        <div class="card-label">${label}</div>
        <div class="card-value" style="color:${color};font-size:20px;word-break:break-all;">
          ${value}
        </div>
        <div class="card-sub">${sub}</div>
      </div>`
  }

  return `
    <div class="grid-4" style="margin-bottom:14px;">
      ${card('最低效话题',
        inefficient ? inefficient.topic : '—',
        inefficient ? `平均 ${inefficient.avgRounds} 轮对话` : '暂无数据',
        'var(--red)')}
      ${card('时间投入最多',
        topDuration ? topDuration.topic : '—',
        topDuration ? `占总时长 ${topDuration.pct}%` : '暂无数据',
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

export async function renderInsightsPage(container, range) {
  const savedScroll = container.scrollTop

  const data = await fetch(`/api/efficiency?range=${range}`).then(r => r.json())

  container.innerHTML = `
    ${rangeFilter(range)}
    ${summaryCards(data)}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
      <div class="card">
        <div class="section-header"><span class="section-title">Prompt 效率 — 平均对话轮数</span></div>
        <div id="ins-rounds"></div>
      </div>
      <div class="card">
        <div class="section-header"><span class="section-title">自动化程度 — 工具调用密度</span></div>
        <div id="ins-density"></div>
      </div>
      <div class="card">
        <div class="section-header"><span class="section-title">时间投入 — 话题时长占比</span></div>
        <div id="ins-duration"></div>
      </div>
      <div class="card">
        <div class="section-header"><span class="section-title">时间规律 — 时段 × 话题</span></div>
        <div id="ins-heatmap"></div>
      </div>
      <div class="card">
        <div class="section-header"><span class="section-title">低效 Session 列表</span></div>
        <div id="ins-outliers"></div>
      </div>
      <div class="card">
        <div class="section-header"><span class="section-title">项目分布</span></div>
        <div id="ins-projects"></div>
      </div>
    </div>`

  container.querySelectorAll('.range-btn').forEach(btn => {
    btn.addEventListener('click', () => setRange(btn.dataset.range))
  })

  renderRounds(document.getElementById('ins-rounds'), data.roundsByTopic)
  renderDensity(document.getElementById('ins-density'), data.densityByTopic)
  renderDuration(document.getElementById('ins-duration'), data.durationByTopic)
  renderHeatmap(document.getElementById('ins-heatmap'), data.heatmap)
  renderOutliers(document.getElementById('ins-outliers'), data.outlierSessions)
  renderProjects(document.getElementById('ins-projects'), data.projectDist)

  if (savedScroll > 0) container.scrollTop = savedScroll
}

// ── 通用横向条形图 ──
function hBar(el, rows, valueKey, labelFn) {
  if (!rows || rows.length === 0) {
    el.innerHTML = `<div style="color:var(--muted);font-size:14px;padding:12px 0;">暂无数据</div>`
    return
  }
  const max = Math.max(...rows.map(r => r[valueKey]), 1)
  el.innerHTML = rows.map(r => {
    const color = topicColor(r.topic)
    const pct   = r[valueKey] / max * 100
    return `
      <div style="margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;">
          <span style="color:var(--text);">${r.topic}</span>
          <span style="color:${color};">${labelFn(r)}</span>
        </div>
        <div style="background:var(--bg3);border-radius:3px;height:6px;">
          <div style="width:${pct}%;background:${color};height:6px;border-radius:3px;
                      transition:width 0.3s;min-width:4px;"></div>
        </div>
      </div>`
  }).join('')
}

function renderRounds(el, rows) {
  hBar(el, rows, 'avgRounds', r => `${r.avgRounds} 轮`)
}

function renderDensity(el, rows) {
  hBar(el, rows, 'density', r => `${r.density} 次/轮`)
}

function renderDuration(el, rows) {
  if (!rows || rows.length === 0) {
    el.innerHTML = `<div style="color:var(--muted);font-size:14px;padding:12px 0;">暂无数据</div>`
    return
  }
  el.innerHTML = rows.map(r => {
    const color = topicColor(r.topic)
    return `
      <div style="margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;">
          <span style="color:var(--text);">${r.topic}</span>
          <span style="color:${color};">${r.pct}%</span>
        </div>
        <div style="background:var(--bg3);border-radius:3px;height:6px;">
          <div style="width:${r.pct}%;background:${color};height:6px;border-radius:3px;
                      transition:width 0.3s;min-width:4px;"></div>
        </div>
      </div>`
  }).join('')
}

// ── 时间规律热力图（时段 × 话题）──
function renderHeatmap(el, rows) {
  if (!rows || rows.length === 0) {
    el.innerHTML = `<div style="color:var(--muted);font-size:14px;padding:12px 0;">暂无数据</div>`
    return
  }

  const topics = [...new Set(rows.map(r => r.topic))].slice(0, 6)
  const hours  = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'))

  const lookup = {}
  for (const r of rows) {
    if (!lookup[r.hour]) lookup[r.hour] = {}
    lookup[r.hour][r.topic] = r.count
  }
  const maxCount = Math.max(...rows.map(r => r.count), 1)

  function cellColor(count) {
    if (!count) return 'var(--bg3)'
    const pct = count / maxCount
    if (pct < 0.25) return '#0e4429'
    if (pct < 0.5)  return '#006d32'
    if (pct < 0.75) return '#26a641'
    return '#39d353'
  }

  const CELL = 10

  const hourRows = hours.filter((_, i) => i % 2 === 0).map(h => {
    const cells = topics.map(t => {
      const cnt = lookup[h]?.[t] ?? 0
      return `<div title="${h}:00 · ${t} · ${cnt} sessions"
        style="width:${CELL}px;height:${CELL}px;border-radius:2px;
          background:${cellColor(cnt)};flex-shrink:0;"></div>`
    }).join('')
    return `
      <div style="display:flex;align-items:center;gap:2px;margin-bottom:2px;">
        <span style="font-size:9px;color:var(--muted);width:20px;text-align:right;
          margin-right:4px;">${h}</span>
        <div style="display:flex;gap:4px;">${cells}</div>
      </div>`
  }).join('')

  el.innerHTML = `
    <div style="display:flex;gap:4px;margin-bottom:4px;padding-left:26px;">
      ${topics.map(t =>
        `<div style="font-size:9px;color:${topicColor(t)};width:${CELL}px;
          text-align:center;overflow:hidden;">${t.slice(0, 2)}</div>`
      ).join('')}
    </div>
    ${hourRows}
    <div style="display:flex;gap:4px;align-items:center;margin-top:6px;">
      <span style="font-size:10px;color:var(--muted);">少</span>
      ${['var(--bg3)', '#0e4429', '#006d32', '#26a641', '#39d353'].map(c =>
        `<div style="width:8px;height:8px;background:${c};border-radius:2px;"></div>`).join('')}
      <span style="font-size:10px;color:var(--muted);">多</span>
    </div>`
}

// ── 低效 Session 列表 ──
function renderOutliers(el, rows) {
  if (!rows || rows.length === 0) {
    el.innerHTML = `<div style="color:var(--muted);font-size:14px;padding:12px 0;">
      暂无异常 Session（对话轮数均在正常范围内）</div>`
    return
  }

  function fileBase(p) {
    if (!p) return '—'
    return p.split('/').pop()?.replace('.jsonl', '') ?? p
  }

  function fmtDate(ms) {
    if (!ms) return '—'
    return new Date(ms).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
  }

  el.innerHTML = `
    <div style="display:flex;flex-direction:column;gap:6px;">
      ${rows.map(r => `
        <div style="background:var(--bg3);border-radius:4px;padding:8px 10px;
          border-left:3px solid ${topicColor(r.topic)};">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-size:12px;color:${topicColor(r.topic)};">${r.topic ?? '未分类'}</span>
            <span style="font-size:12px;color:var(--red);font-weight:bold;">${r.messageCount} 轮</span>
          </div>
          <div style="font-size:11px;color:var(--muted);margin-top:3px;
            overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
            ${fileBase(r.jsonlFile)} · ${fmtDate(r.startTime)}
          </div>
        </div>`).join('')}
    </div>`
}

// ── 项目分布 ──
function renderProjects(el, rows) {
  if (!rows || rows.length === 0) {
    el.innerHTML = `<div style="color:var(--muted);font-size:14px;padding:12px 0;">暂无数据</div>`
    return
  }

  const COLORS = [
    'var(--green)', 'var(--cyan)', 'var(--amber)', 'var(--purple)',
    'var(--red)', '#f97316', '#06b6d4', 'var(--muted)',
  ]

  el.innerHTML = rows.map((r, i) => {
    const color = COLORS[i] ?? 'var(--muted)'
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
  }).join('')
}
