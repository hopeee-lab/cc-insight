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
        <div class="card-sub">最活跃时段</div>
      </div>
      <div class="card">
        <div class="card-label">Avg / Day</div>
        <div class="card-value purple">${fmtDuration(data.avgDailyDurationSec)}</div>
        <div class="card-sub">日均时长</div>
      </div>
    </div>`
}

export async function renderOverview(container, range) {
  const [overview, heatmap, dist, insights] = await Promise.all([
    fetch(`/api/overview?range=${range}`).then(r => r.json()),
    fetch(`/api/heatmap?range=${range}`).then(r => r.json()),
    fetch(`/api/distribution?range=${range}`).then(r => r.json()),
    fetch(`/api/insights?range=${range}`).then(r => r.json()),
  ])

  container.innerHTML = `
    ${rangeFilter(range)}
    ${statsCards(overview)}
    <div class="split" style="flex:1;min-height:0;">
      <div class="split-left">
        <div id="insights-panel"></div>
      </div>
      <div>
        <div class="card" style="margin-bottom:10px;">
          <div class="section-header">
            <span class="section-title">Activity Heatmap</span>
          </div>
          <div id="heatmap-canvas"></div>
        </div>
        <div class="card">
          <div class="section-header">
            <span class="section-title">24H 时间分布</span>
            <span id="dist-peak-label" class="muted" style="font-size:12px;"></span>
          </div>
          <div id="dist-canvas"></div>
        </div>
      </div>
    </div>`

  container.querySelectorAll('.range-btn').forEach(btn => {
    btn.addEventListener('click', () => setRange(btn.dataset.range))
  })

  renderInsights(document.getElementById('insights-panel'), insights)
  renderHeatmap(document.getElementById('heatmap-canvas'), heatmap)
  renderDist(document.getElementById('dist-canvas'), dist)
}

// ── Heatmap ──
function renderHeatmap(el, data) {
  const map = Object.fromEntries(data.map(r => [r.day, r.count]))
  const max = Math.max(...Object.values(map), 1)

  const today = new Date()
  const start = new Date(today)
  start.setDate(today.getDate() - 7 * 16)
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))

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

  function intensity(count) {
    if (count === 0) return 'var(--bg3)'
    const pct = count / max
    if (pct < 0.25) return '#0e4429'
    if (pct < 0.5)  return '#006d32'
    if (pct < 0.75) return '#26a641'
    return '#39d353'
  }

  const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', '']

  el.innerHTML = `
    <div style="display:flex;gap:3px;overflow-x:auto;padding-bottom:4px;">
      <div style="display:flex;flex-direction:column;gap:3px;margin-right:4px;padding-top:2px;">
        ${dayLabels.map(l => `<div style="height:12px;font-size:10px;color:var(--muted);line-height:12px;">${l}</div>`).join('')}
      </div>
      ${weeks.map(week => `
        <div style="display:flex;flex-direction:column;gap:3px;">
          ${week.map(cell => `
            <div title="${cell.day}: ${cell.count} sessions"
              style="width:12px;height:12px;border-radius:2px;background:${intensity(cell.count)};cursor:default;flex-shrink:0;">
            </div>`).join('')}
        </div>`).join('')}
    </div>
    <div style="display:flex;gap:4px;align-items:center;margin-top:8px;">
      <span style="font-size:11px;color:var(--muted);">少</span>
      ${['var(--bg3)','#0e4429','#006d32','#26a641','#39d353'].map(c =>
        `<div style="width:10px;height:10px;background:${c};border-radius:2px;"></div>`).join('')}
      <span style="font-size:11px;color:var(--muted);">多</span>
    </div>`
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
    icon: '🔥', color: 'var(--green)', title: '最高产的一天',
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
