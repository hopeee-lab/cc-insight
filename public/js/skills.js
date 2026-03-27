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

// ── 工具完整列表（右侧面板）──

const TYPE_BADGE = {
  skill:  { label: 'S', color: 'var(--green)'  },
  agent:  { label: 'A', color: 'var(--cyan)'   },
  plugin: { label: 'P', color: 'var(--purple)' },
}

const SECURITY_BADGE = {
  safe:      { text: '✓ 安全',  color: 'var(--green)' },
  warning:   { text: '⚠ 警告', color: 'var(--amber)' },
  unscanned: { text: '未审查',  color: 'var(--muted)' },
}

const SOURCE_LABEL = { downloaded: '下载', self: '自建' }

function fmtDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function isDust(t) {
  const limit = 30 * 86400_000
  if (t.lastUsedAt) return Date.now() - new Date(t.lastUsedAt).getTime() > limit
  if (t.installedAt) return Date.now() - new Date(t.installedAt).getTime() > limit
  return false
}

function toolCard(t) {
  const badge    = TYPE_BADGE[t.type]    ?? { label: '?', color: 'var(--muted)' }
  const secBadge = SECURITY_BADGE[t.securityScanResult] ?? SECURITY_BADGE.unscanned
  const dust     = isDust(t)
  const sourceLabel = SOURCE_LABEL[t.sourceType] ?? t.sourceType ?? '—'

  const borderStyle = dust
    ? 'border-left:3px solid var(--red);padding-left:9px;opacity:0.6;'
    : 'border-left:3px solid transparent;padding-left:9px;'

  const sourceLink = t.sourceUrl
    ? `<a href="${t.sourceUrl}" target="_blank" rel="noopener"
        style="color:var(--muted);font-size:11px;margin-left:4px;text-decoration:underline;">链接</a>`
    : ''

  return `
    <div class="tool-card" data-name="${t.name}" data-type="${t.type}" data-dust="${dust}"
      style="${borderStyle}margin-bottom:8px;padding-top:8px;padding-bottom:8px;
        border-bottom:1px solid var(--border);">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">
        <span style="width:18px;height:18px;border-radius:3px;background:${badge.color}22;
          color:${badge.color};font-size:11px;font-weight:bold;flex-shrink:0;
          display:flex;align-items:center;justify-content:center;">${badge.label}</span>
        <span style="flex:1;font-size:14px;font-weight:500;overflow:hidden;
          text-overflow:ellipsis;white-space:nowrap;" title="${t.name}">${t.name}</span>
        <span style="font-size:12px;color:${secBadge.color};flex-shrink:0;">${secBadge.text}</span>
        <span style="font-size:14px;color:${(t.useCount??0)===0?'var(--red)':'var(--muted)'};
          flex-shrink:0;min-width:32px;text-align:right;">${t.useCount ?? 0}次</span>
        <button class="del-btn" data-name="${t.name}" data-type="${t.type}"
          style="background:transparent;border:1px solid var(--red);color:var(--red);
            border-radius:3px;padding:2px 7px;font-size:12px;cursor:pointer;
            flex-shrink:0;font-family:var(--font);">删除</button>
      </div>
      ${t.description ? `
      <div style="font-size:14px;color:var(--muted);margin-bottom:4px;
        overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"
        title="${t.description}">${t.description}</div>` : ''}
      <div style="font-size:12px;color:var(--muted);display:flex;gap:12px;flex-wrap:wrap;">
        <span>来源: ${sourceLabel}${sourceLink}</span>
        <span>安装: ${fmtDate(t.installedAt)}</span>
        <span>更新: ${fmtDate(t.updatedAt)}</span>
        <span>上次: ${fmtDate(t.lastUsedAt)}</span>
        ${dust ? `<span style="color:var(--red);">吃灰</span>` : ''}
      </div>
    </div>`
}

export function buildToolsListHtml(tools) {
  if (tools.length === 0) {
    return `<div style="color:var(--muted);font-size:14px;padding:20px 0;text-align:center;">暂无工具数据</div>`
  }

  const dustCount = tools.filter(isDust).length
  const tabs = [
    { key: 'all',    label: `全部 (${tools.length})` },
    { key: 'skill',  label: `Skill (${tools.filter(t=>t.type==='skill').length})` },
    { key: 'agent',  label: `Agent (${tools.filter(t=>t.type==='agent').length})` },
    { key: 'plugin', label: `Plugin (${tools.filter(t=>t.type==='plugin').length})` },
    { key: 'dust',   label: `吃灰 (${dustCount})` },
  ]

  const tabHtml = tabs.map((tab, i) => `
    <button class="filter-tab ${i===0?'active':''}" data-filter="${tab.key}"
      style="background:${i===0?'var(--bg3)':'transparent'};border:none;cursor:pointer;
        padding:4px 10px;font-size:14px;border-radius:3px;font-family:var(--font);
        color:${i===0?'var(--text)':'var(--muted)'};">${tab.label}</button>`).join('')

  return `
    <div class="card" style="height:100%;display:flex;flex-direction:column;">
      <div class="section-title" style="margin-bottom:8px;">全部工具</div>
      <div style="display:flex;gap:4px;margin-bottom:10px;flex-wrap:wrap;">${tabHtml}</div>
      <div id="tools-card-list" style="overflow-y:auto;flex:1;">
        ${tools.map(toolCard).join('')}
      </div>
    </div>`
}

export function bindFilterTabs(container) {
  container.querySelectorAll('.filter-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.filter-tab').forEach(b => {
        b.style.color = 'var(--muted)'
        b.style.background = 'transparent'
      })
      btn.style.color = 'var(--text)'
      btn.style.background = 'var(--bg3)'

      const filter = btn.dataset.filter
      container.querySelectorAll('.tool-card').forEach(card => {
        const match =
          filter === 'all'  ? true :
          filter === 'dust' ? card.dataset.dust === 'true' :
          card.dataset.type === filter
        card.style.display = match ? '' : 'none'
      })
    })
  })
}

export function bindDeleteButtons(container, onDeleted) {
  container.querySelectorAll('.del-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const { name, type } = btn.dataset
      if (!confirm(`确认删除「${name}」？此操作不可撤销。`)) return

      btn.disabled = true
      btn.textContent = '删除中…'

      try {
        const res = await fetch(`/api/tools/${encodeURIComponent(name)}?type=${type}`, {
          method: 'DELETE',
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? '删除失败')
        btn.closest('.tool-card')?.remove()
        if (typeof onDeleted === 'function') onDeleted(name, type)
      } catch (err) {
        alert(`删除失败：${err.message}`)
        btn.disabled = false
        btn.textContent = '删除'
      }
    })
  })
}

function renderToolsList(el, tools, range, onDeleted) {
  el.innerHTML = buildToolsListHtml(tools)
  bindFilterTabs(el)
  bindDeleteButtons(el, onDeleted)
}

// ── 占位，后续 Task 实现 ──
function renderRecommendations(el, tools, container, range) { el.innerHTML = '' }
