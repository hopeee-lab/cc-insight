// public/js/skills.js
import { setRange } from './app.js'

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

function usageCard(label, color, total, used) {
  const pct = total > 0 ? Math.round(used / total * 100) : 0
  const unused = total - used
  return `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span class="card-label" style="color:${color};">${label}</span>
        <span style="font-size:22px;font-weight:bold;color:${color};">${total}</span>
      </div>
      <div style="background:var(--bg3);border-radius:3px;height:4px;margin-bottom:8px;">
        <div style="background:${color};height:4px;border-radius:3px;width:${pct}%;
          transition:width 0.4s ease;"></div>
      </div>
      <div style="display:flex;justify-content:space-between;">
        <span style="font-size:14px;color:var(--muted);">
          使用率 <span style="color:${color};">${used}/${total}</span>
        </span>
        ${unused > 0
          ? `<span style="font-size:14px;color:var(--red);">未用 ${unused}</span>`
          : `<span style="font-size:14px;color:var(--green);">全部使用</span>`}
      </div>
    </div>`
}

function buildOverviewCards(tools, usageMap) {
  const types = ['skill', 'agent', 'plugin']
  const labels = { skill: 'SKILL', agent: 'AGENT', plugin: 'PLUGIN' }
  const colors = { skill: 'var(--green)', agent: 'var(--cyan)', plugin: 'var(--purple)' }

  return `<div class="grid-3" style="margin-bottom:14px;">
    ${types.map(type => {
      const all = tools.filter(t => t.type === type)
      const used = all.filter(t => (usageMap[t.name]?.useCount ?? 0) > 0).length
      return usageCard(labels[type], colors[type], all.length, used)
    }).join('')}
  </div>`
}

export async function renderSkills(container, range) {
  const tools = await fetch(`/api/tools?range=${range}`).then(r => r.json())
  const usageMap = Object.fromEntries(tools.map(t => [t.name, t]))

  container.innerHTML = `
    ${rangeFilter(range)}
    ${buildOverviewCards(tools, usageMap)}
    <div class="split" style="flex:1;">
      <div class="split-left">
        <div id="top-tools-panel"></div>
        <div id="unused-tools-panel"></div>
        <div id="recommendations-panel"></div>
      </div>
      <div id="tools-list-panel"></div>
    </div>`

  container.querySelectorAll('.range-btn').forEach(btn => {
    btn.addEventListener('click', () => setRange(btn.dataset.range))
  })

  renderTopTools(document.getElementById('top-tools-panel'), tools, range)
  renderUnusedTools(document.getElementById('unused-tools-panel'), tools)
  renderToolsList(document.getElementById('tools-list-panel'), tools, range,
    () => renderSkills(container, range))
  renderRecommendations(document.getElementById('recommendations-panel'), tools, container, range)
}

// ── 颜色映射 ──
const TYPE_COLOR = {
  skill:  'var(--green)',
  agent:  'var(--cyan)',
  plugin: 'var(--purple)',
}

function daysSince(isoStr) {
  if (!isoStr) return 0
  return Math.floor((Date.now() - new Date(isoStr).getTime()) / 86400000)
}

// ── Top 5 标签云 ──
export function buildTopToolsHtml(tools, range) {
  const rangeLabel = { '7d': '7 天', '30d': '30 天', '90d': '90 天', all: '全部时间' }
  const used = tools
    .filter(t => (t.useCount ?? 0) > 0)
    .sort((a, b) => b.useCount - a.useCount)
    .slice(0, 5)

  if (used.length === 0) {
    return `
      <div class="card" style="margin-bottom:10px;">
        <div class="section-title" style="margin-bottom:8px;">近期最常用</div>
        <div style="color:var(--muted);font-size:14px;padding:8px 0;">暂无使用记录</div>
      </div>`
  }

  const tags = used.map(t => {
    const color = TYPE_COLOR[t.type] ?? 'var(--green)'
    return `
      <div style="display:flex;align-items:center;gap:4px;
        background:${color}18;border:1px solid ${color}40;
        border-radius:3px;padding:4px 10px;">
        <span style="color:${color};font-size:14px;">${t.name}</span>
        <span style="color:var(--muted);font-size:14px;">${t.useCount}次</span>
      </div>`
  }).join('')

  return `
    <div class="card" style="margin-bottom:10px;">
      <div class="section-title" style="margin-bottom:8px;">近 ${rangeLabel[range] ?? range} 最常用</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;">${tags}</div>
    </div>`
}

// ── 从未使用列表 ──
export function buildUnusedToolsHtml(tools) {
  const unused = tools.filter(t => (t.useCount ?? 0) === 0)
  if (unused.length === 0) return null

  const rows = unused.map(t => {
    const days = daysSince(t.installedAt)
    const color = TYPE_COLOR[t.type] ?? 'var(--green)'
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;
        padding:5px 0;border-bottom:1px solid var(--border);">
        <span style="color:var(--muted);font-size:14px;">
          <span style="color:${color};font-size:11px;margin-right:4px;">${t.type[0].toUpperCase()}</span>${t.name}
        </span>
        <span style="color:var(--red);font-size:14px;">闲置 ${days} 天</span>
      </div>`
  }).join('')

  return `
    <div class="card" style="margin-bottom:10px;">
      <div class="section-title" style="color:var(--red);margin-bottom:8px;">从未使用（${unused.length}）</div>
      <div>${rows}</div>
    </div>`
}

function renderTopTools(el, tools, range) {
  el.innerHTML = buildTopToolsHtml(tools, range)
}

function renderUnusedTools(el, tools) {
  const html = buildUnusedToolsHtml(tools)
  el.innerHTML = html ?? ''
  el.style.display = html ? '' : 'none'
}

// ── 占位，后续 Task 实现 ──
function renderToolsList(el, tools, range, onDeleted) { el.innerHTML = '' }
function renderRecommendations(el, tools, container, range) { el.innerHTML = '' }
