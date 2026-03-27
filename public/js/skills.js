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

// ── 占位，后续 Task 实现 ──
function renderTopTools(el, tools, range) { el.innerHTML = '' }
function renderUnusedTools(el, tools) { el.innerHTML = '' }
function renderToolsList(el, tools, range, onDeleted) { el.innerHTML = '' }
function renderRecommendations(el, tools, container, range) { el.innerHTML = '' }
