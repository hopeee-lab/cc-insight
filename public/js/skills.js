// public/js/skills.js
import { setRange } from './app.js'

// 跨 renderSkills 调用保持翻页位置（切换 tab 时由 app.js 重置）
const _state = { topPage: 0, unusedPage: 0, listPage: 0, listFilter: 'all' }
export function resetSkillsState() {
  _state.topPage = 0; _state.unusedPage = 0; _state.listPage = 0; _state.listFilter = 'all'
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
        ${total === 0
          ? `<span style="font-size:14px;color:var(--red);">未用 —</span>`
          : unused > 0
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
      const used = all.filter(t => (usageMap[t.name]?.allTimeUseCount ?? 0) > 0).length
      return usageCard(labels[type], colors[type], all.length, used)
    }).join('')}
  </div>`
}

export async function renderSkills(container, range, preserveScroll = true) {
  // 保存滚动位置，避免 WS refresh 导致跳回顶部（tab 切换时不恢复）
  const savedScroll = preserveScroll ? (container.querySelector('.split-right')?.scrollTop ?? 0) : 0

  const tools = await fetch(`/api/tools?range=${range}`).then(r => r.json())
  const usageMap = Object.fromEntries(tools.map(t => [t.name, t]))

  container.innerHTML = `
    ${rangeFilter(range)}
    ${buildOverviewCards(tools, usageMap)}
    <div class="split">
      <div class="split-left">
        <div id="top-tools-panel"></div>
        <div id="unused-tools-panel"></div>
      </div>
      <div class="split-right" id="tools-list-panel"></div>
    </div>
`

  container.querySelectorAll('.range-btn').forEach(btn => {
    btn.addEventListener('click', () => setRange(btn.dataset.range))
  })

  renderTopTools(document.getElementById('top-tools-panel'), tools, range)
  renderUnusedTools(document.getElementById('unused-tools-panel'), tools,
    () => renderSkills(container, range))
  renderToolsList(document.getElementById('tools-list-panel'), tools, range,
    () => renderSkills(container, range))

  // 恢复滚动位置
  if (savedScroll > 0) {
    const splitRight = container.querySelector('.split-right')
    if (splitRight) splitRight.scrollTop = savedScroll
  }
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

const LIST_PAGE_SIZE = 5

function pageBtns(page, totalPages, prevClass, nextClass) {
  return `
    <div style="display:flex;align-items:center;gap:2px;">
      <button class="${prevClass}" style="background:transparent;border:none;cursor:pointer;
        color:var(--muted);font-size:14px;padding:0 4px;font-family:var(--font);
        ${page === 0 ? 'opacity:0.3;pointer-events:none;' : ''}">&lt;</button>
      <span style="font-size:12px;color:var(--muted);min-width:28px;text-align:center;">${page + 1}/${totalPages}</span>
      <button class="${nextClass}" style="background:transparent;border:none;cursor:pointer;
        color:var(--muted);font-size:14px;padding:0 4px;font-family:var(--font);
        ${page >= totalPages - 1 ? 'opacity:0.3;pointer-events:none;' : ''}">&gt;</button>
    </div>`
}

// ── 最常用标签云 ──
export function buildTopToolsHtml(tools, range) {
  const rangeLabel = { '7d': '7 天', '30d': '30 天', '90d': '90 天', all: '全部时间' }
  const used = tools
    .filter(t => (t.useCount ?? 0) > 0)
    .sort((a, b) => b.useCount - a.useCount)

  if (used.length === 0) {
    return `
      <div class="card" style="margin-bottom:10px;">
        <div class="section-title" style="margin-bottom:8px;">近期最常用</div>
        <div style="color:var(--muted);font-size:14px;padding:8px 0;">暂无使用记录</div>
      </div>`
  }

  const rows = used.map(t => {
    const color = TYPE_COLOR[t.type] ?? 'var(--green)'
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;
        padding:5px 0;border-bottom:1px solid var(--border);">
        <span style="display:flex;align-items:center;gap:6px;min-width:0;">
          <span style="width:8px;height:8px;border-radius:50%;background:${color};
            flex-shrink:0;"></span>
          <span style="color:${color};font-size:14px;overflow:hidden;
            text-overflow:ellipsis;white-space:nowrap;">${t.name}</span>
        </span>
        <span style="color:var(--cyan);font-size:14px;white-space:nowrap;
          margin-left:8px;">${t.useCount}次</span>
      </div>`
  }).join('')

  return `
    <div class="card" style="margin-bottom:10px;">
      <div class="section-title" style="margin-bottom:8px;">${range === 'all' ? '全部时间' : `近 ${rangeLabel[range]}`} 最常用</div>
      <div style="overflow-y:auto;max-height:200px;">${rows}</div>
    </div>`
}

// ── 从未使用列表 ──
export function buildUnusedToolsHtml(tools) {
  // 当前时间范围内未使用的工具
  const unused = tools
    .filter(t => (t.useCount ?? 0) === 0)
    .sort((a, b) => daysSince(b.installedAt) - daysSince(a.installedAt))
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
        <span style="color:var(--red);font-size:14px;white-space:nowrap;">闲置 ${days} 天</span>
      </div>`
  }).join('')

  return `
    <div class="card" style="margin-bottom:10px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <div class="section-title" style="color:var(--red);">从未使用（${unused.length}）</div>
        <button class="unused-clean-btn"
          style="background:transparent;border:1px solid var(--red);color:var(--red);
            border-radius:3px;padding:2px 8px;font-size:12px;cursor:pointer;
            font-family:var(--font);">一键清理</button>
      </div>
      <div style="overflow-y:auto;max-height:200px;">${rows}</div>
    </div>`
}

function renderTopTools(el, tools, range) {
  el.innerHTML = buildTopToolsHtml(tools, range)
}

function renderUnusedTools(el, tools, onDeleted) {
  const html = buildUnusedToolsHtml(tools)
  el.innerHTML = html ?? ''
  el.style.display = html ? '' : 'none'

  el.querySelector('.unused-clean-btn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget
    const unused = tools.filter(t => (t.useCount ?? 0) === 0)
    const confirmed = await showConfirm(`确认删除全部 ${unused.length} 个从未使用的工具？此操作不可撤销。`)
    if (!confirmed) return
    btn.textContent = '清理中…'
    btn.disabled = true
    for (const t of unused) {
      await fetch(`/api/tools/${encodeURIComponent(t.name)}?type=${t.type}`, { method: 'DELETE' })
    }
    if (typeof onDeleted === 'function') onDeleted()
  })
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
  const cst = new Date(new Date(iso).getTime() + 8 * 3600_000)
  return `${cst.getUTCFullYear()}-${String(cst.getUTCMonth()+1).padStart(2,'0')}-${String(cst.getUTCDate()).padStart(2,'0')}`
}

function toMs(v) { return v ? (typeof v === 'number' ? v : new Date(v).getTime()) : null }

function isDust(t) {
  return (t.useCount ?? 0) === 0
}

function relativeTime(ts) {
  if (!ts) return null
  const ms = typeof ts === 'number' ? ts : new Date(ts).getTime()
  const days = Math.floor((Date.now() - ms) / 86400_000)
  if (days === 0) return '今天'
  if (days === 1) return '1天前'
  return `${days}天前`
}

function toolCard(t, range = '7d') {
  const badge    = TYPE_BADGE[t.type]    ?? { label: '?', color: 'var(--muted)' }
  const secBadge = SECURITY_BADGE[t.securityScanResult] ?? SECURITY_BADGE.unscanned
  const dust     = isDust(t)

  const borderColor = dust ? 'var(--red)' : badge.color
  const opacity = dust ? 'opacity:0.65;' : ''

  // 顶部标签行
  // typeTag 移到开头，去掉 S/A/P 字母徽章
  const typeTag = `<span style="font-size:11px;font-weight:600;padding:2px 7px 2px 0;border-radius:3px;
    background:${badge.color}22;color:${badge.color};border:1px solid ${badge.color}50;
    border-left:none;letter-spacing:0.04em;flex-shrink:0;">${(t.type ?? '').toUpperCase()}</span>`

  const isDownloaded = t.sourceType === 'downloaded'
  const sourceTag = `<span style="font-size:11px;padding:2px 6px;border-radius:3px;
    background:${isDownloaded ? 'var(--cyan)' : 'var(--muted)'}15;
    color:${isDownloaded ? 'var(--cyan)' : 'var(--muted)'};
    border:1px solid ${isDownloaded ? 'var(--cyan)' : 'var(--muted)'}35;flex-shrink:0;">
    ${isDownloaded ? '下载' : '本地'}</span>`

  const secTag = `<span style="font-size:11px;color:${secBadge.color};flex-shrink:0;">${secBadge.text}</span>`

  // registry 元数据标签
  const versionTag = t.version
    ? `<span style="font-size:11px;color:var(--muted);padding:2px 6px;border-radius:3px;
        border:1px solid var(--border);flex-shrink:0;">${t.version}</span>`
    : ''

  const starsTag = t.stars > 0
    ? (() => {
        const n = t.stars >= 1000 ? (t.stars / 1000).toFixed(1).replace(/\.0$/, '') + 'k' : String(t.stars)
        return `<span style="font-size:11px;color:var(--amber);flex-shrink:0;">★ ${n}</span>`
      })()
    : ''

  const activityTag = t.activity && t.activity !== 'active'
    ? `<span style="font-size:11px;padding:2px 6px;border-radius:3px;
        background:var(--red)18;color:var(--red);border:1px solid var(--red)40;flex-shrink:0;">${t.activity}</span>`
    : ''

  // 描述（只显示含中文字符的描述）
  const hasChinese = s => /[\u4e00-\u9fff]/.test(s)
  const descText = t.description && hasChinese(t.description) ? t.description : null
  const descRow = descText
    ? `<div style="margin-top:5px;font-size:14px;color:var(--muted);line-height:1.5;
        word-break:break-word;max-width:66%;">${descText}</div>`
    : ''

  // 备注（notes）
  const notesRow = t.notes
    ? `<div style="margin-top:4px;font-size:13px;color:var(--muted);opacity:0.75;
        word-break:break-word;">${t.notes}</div>`
    : ''

  // 来源链接（仅 downloaded 且有 URL 时显示）
  const sourceLink = isDownloaded && t.sourceUrl
    ? `<div style="margin-top:4px;display:flex;align-items:baseline;gap:6px;">
        <span style="font-size:12px;padding:1px 5px 1px 0;border-radius:3px;flex-shrink:0;
          background:var(--cyan)12;color:var(--cyan);border:1px solid var(--cyan)30;
          border-left:none;">链接</span>
        <a href="${t.sourceUrl}" target="_blank" rel="noopener"
          style="font-size:13px;color:var(--cyan);text-decoration:none;word-break:break-all;opacity:0.8;"
          title="${t.sourceUrl}">${t.sourceUrl.replace(/^https?:\/\//, '')}</a>
       </div>`
    : ''

  // AI 建议框（只在有实际风险时显示，正向情况不提示）
  const aiSuggestion = (() => {
    const count = t.useCount ?? 0
    const lastMs = toMs(t.lastUsedAt)
    const instMs = toMs(t.installedAt)
    const lastDays = lastMs !== null ? Math.floor((Date.now() - lastMs) / 86400_000) : null
    const instDays = instMs !== null ? Math.floor((Date.now() - instMs) / 86400_000) : null
    // 曾使用但停用超 30 天
    if (count > 0 && lastDays !== null && lastDays > 30) return `已 ${lastDays} 天未使用，建议评估是否仍有需求`
    // 从未使用且安装超 30 天
    if (count === 0 && instDays !== null && instDays > 30) return `安装 ${instDays} 天从未使用，建议评估是否需要`
    return null
  })()
  const aiBox = aiSuggestion
    ? `<div style="margin-top:6px;padding:6px 10px;
        background:color-mix(in srgb,var(--green) 8%,transparent);
        border:1px solid color-mix(in srgb,var(--green) 30%,transparent);
        border-radius:4px;display:flex;align-items:flex-start;gap:6px;">
        <span style="font-size:12px;color:var(--green);font-weight:600;white-space:nowrap;padding-top:1px;">AI建议</span>
        <span style="font-size:14px;color:var(--text);">${aiSuggestion}</span>
       </div>`
    : ''

  // 底部统计行
  const usedStr  = t.useCount > 0 ? `<span style="color:var(--cyan);">${t.useCount}次</span>` : `<span style="color:var(--red);">未使用</span>`
  const lastStr  = t.lastUsedAt ? `<span>${relativeTime(t.lastUsedAt)}使用</span>` : ''
  const installStr = t.installedAt ? `<span>安装 ${fmtDate(t.installedAt)}</span>` : ''
  const updateStr  = t.updatedAt  ? `<span>更新 ${fmtDate(t.updatedAt)}</span>`  : ''
  const pathStr  = t.localPath
    ? `<span style="color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"
        title="${t.localPath}">${t.localPath.replace(/^.*\.claude\//, '~/.claude/')}</span>`
    : ''
  const dustTag  = dust ? `<span style="color:var(--red);">· 闲置</span>` : ''

  const statsRow = [usedStr, lastStr, installStr, updateStr, dustTag].filter(Boolean).join(
    `<span style="color:var(--border);margin:0 4px;">·</span>`)

  return `
    <div class="tool-card" data-name="${t.name}" data-type="${t.type}" data-dust="${dust}"
      style="border-left:3px solid ${borderColor};padding:12px 10px;${opacity}
        margin-bottom:6px;border-radius:0 4px 4px 0;
        background:var(--bg2);border-bottom:1px solid var(--border);">

      <!-- 第一行：类型 + 名称 + 元数据标签 + 操作按钮 -->
      <div style="display:flex;align-items:center;gap:6px;min-width:0;flex-wrap:wrap;">
        ${typeTag}
        <span style="font-size:14px;font-weight:700;color:var(--text);" title="${t.name}">${t.name}</span>
        ${sourceTag}${secTag}${versionTag}${starsTag}${activityTag}
        <div style="flex:1;min-width:8px;"></div>
        ${t.type === 'plugin' ? `
        <button class="detail-btn" data-name="${t.name}" data-range="${range}"
          style="background:transparent;border:1px solid var(--cyan);color:var(--cyan);
            border-radius:3px;padding:1px 8px;font-size:12px;cursor:pointer;
            flex-shrink:0;font-family:var(--font);">技能</button>` : ''}
        <button class="del-btn" data-name="${t.name}" data-type="${t.type}"
          style="background:transparent;border:1px solid var(--border);color:var(--muted);
            border-radius:3px;padding:1px 8px;font-size:12px;cursor:pointer;
            flex-shrink:0;font-family:var(--font);">删除</button>
      </div>

      <!-- 描述 + 备注（合并层级，减少视觉割裂） -->
      ${descRow || notesRow ? `
      <div style="margin-top:6px;display:flex;flex-direction:column;gap:2px;">
        ${descRow}${notesRow}
      </div>` : ''}

      <!-- 来源链接 -->
      ${sourceLink}

      <!-- AI 建议框 -->
      ${aiBox}

      <!-- 底部统计 + 本地路径 -->
      <div style="margin-top:7px;display:flex;justify-content:space-between;
        align-items:center;gap:8px;min-width:0;">
        <div style="font-size:13px;color:var(--muted);display:flex;align-items:center;
          gap:2px;flex-wrap:wrap;">${statsRow}</div>
        <div style="font-size:11px;color:var(--muted);opacity:0.6;overflow:hidden;
          text-overflow:ellipsis;white-space:nowrap;min-width:0;text-align:right;">${pathStr}</div>
      </div>

      <!-- 技能展开区（plugin 专用） -->
      ${t.type === 'plugin' ? `<div class="subskill-panel" style="display:none;"></div>` : ''}
    </div>`
}

const PAGE_SIZE = 10

const RANGE_TITLE = { '7d': '近 7 天安装', '30d': '近 30 天安装', '90d': '近 90 天安装', all: '全部时间' }

// allTools 用于 tab 计数，displayTools 用于当前页显示
export function buildToolsListHtml(allTools, displayTools, currentFilter, page = 0, range = '7d') {
  const dustCount = allTools.filter(isDust).length
  const tabs = [
    { key: 'all',    label: `全部 (${allTools.length})` },
    { key: 'skill',  label: `Skill (${allTools.filter(t=>t.type==='skill').length})` },
    { key: 'agent',  label: `Agent (${allTools.filter(t=>t.type==='agent').length})` },
    { key: 'plugin', label: `Plugin (${allTools.filter(t=>t.type==='plugin').length})` },
    { key: 'dust',   label: `闲置 (${dustCount})` },
  ]

  const tabHtml = tabs.map(tab => {
    const active = tab.key === currentFilter
    return `
    <button class="filter-tab" data-filter="${tab.key}"
      style="background:${active?'var(--bg3)':'transparent'};border:none;cursor:pointer;
        padding:4px 10px;font-size:14px;border-radius:3px;font-family:var(--font);
        color:${active?'var(--text)':'var(--muted)'};">${tab.label}</button>`
  }).join('')

  const totalPages = Math.ceil(displayTools.length / PAGE_SIZE)
  const paged = displayTools.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const bodyHtml = displayTools.length === 0
    ? `<div style="color:var(--muted);font-size:14px;padding:20px 0;text-align:center;">该分类暂无工具</div>`
    : paged.map(t => toolCard(t, range)).join('')

  const paginationHtml = totalPages > 1 ? `
    <div style="display:flex;justify-content:space-between;align-items:center;
      padding-top:10px;border-top:1px solid var(--border);">
      <button class="page-btn" data-dir="-1"
        style="background:transparent;border:1px solid var(--border);color:var(--muted);
          border-radius:3px;padding:3px 10px;font-size:14px;cursor:pointer;font-family:var(--font);
          ${page === 0 ? 'opacity:0.3;pointer-events:none;' : ''}">上一页</button>
      <span style="font-size:14px;color:var(--muted);">${page + 1} / ${totalPages}</span>
      <button class="page-btn" data-dir="1"
        style="background:transparent;border:1px solid var(--border);color:var(--muted);
          border-radius:3px;padding:3px 10px;font-size:14px;cursor:pointer;font-family:var(--font);
          ${page >= totalPages - 1 ? 'opacity:0.3;pointer-events:none;' : ''}">下一页</button>
    </div>` : ''

  return `
    <div class="card" style="min-height:0;display:flex;flex-direction:column;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:4px;">
        <div class="section-title">${RANGE_TITLE[range] ?? '全部时间'}</div>
        <div style="display:flex;gap:4px;flex-wrap:wrap;">${tabHtml}</div>
      </div>
      <div id="tools-card-list">${bodyHtml}</div>
      ${paginationHtml}
    </div>`
}


function showConfirm(message) {
  return new Promise(resolve => {
    const modal   = document.getElementById('confirm-modal')
    const okBtn   = document.getElementById('confirm-ok')
    const cancelBtn = document.getElementById('confirm-cancel')
    document.getElementById('confirm-msg').textContent = message
    modal.style.display = 'flex'

    const onOk     = () => { modal.style.display = 'none'; resolve(true) }
    const onCancel = () => { modal.style.display = 'none'; resolve(false) }
    okBtn.addEventListener('click', onOk, { once: true })
    cancelBtn.addEventListener('click', onCancel, { once: true })
  })
}

export function bindDeleteButtons(container, onDeleted) {
  container.querySelectorAll('.del-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const { name, type } = btn.dataset
      const confirmed = await showConfirm(`确认删除「${name}」？此操作不可撤销。`)
      if (!confirmed) return

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

function bindDetailButtons(container) {
  container.querySelectorAll('.detail-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const { name, range } = btn.dataset
      const card = btn.closest('.tool-card')
      const panel = card?.querySelector('.subskill-panel')
      if (!panel) return

      // 切换展开/收起
      if (panel.style.display !== 'none') {
        panel.style.display = 'none'
        btn.textContent = '技能'
        btn.style.color = 'var(--cyan)'
        btn.style.borderColor = 'var(--cyan)'
        return
      }

      btn.textContent = '加载中…'
      btn.disabled = true

      try {
        const rows = await fetch(`/api/tools/${encodeURIComponent(name)}/subskills?range=${range}`)
          .then(r => r.json())

        if (!rows || rows.length === 0) {
          panel.innerHTML = `<div style="font-size:13px;color:var(--muted);padding:8px 0;">
            当前时间段内无调用记录</div>`
        } else {
          const total = rows.reduce((s, r) => s + r.count, 0)
          const rowsHtml = rows.map(r => {
            const pct = Math.round(r.count / total * 100)
            const subName = r.toolName.replace(name + ':', '')
            return `
              <div style="display:flex;align-items:center;gap:10px;
                padding:5px 8px;border-bottom:1px solid var(--border);">
                <span style="flex:1;font-size:13px;font-family:var(--font);
                  color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"
                  title="${r.toolName}">${subName}</span>
                <span style="font-size:13px;color:var(--muted);white-space:nowrap;min-width:36px;text-align:right;">${pct}%</span>
                <span style="font-size:13px;color:var(--cyan);white-space:nowrap;min-width:48px;text-align:right;">${r.count.toLocaleString()}次</span>
              </div>`
          }).join('')

          panel.innerHTML = `
            <div style="margin-top:8px;background:var(--bg3);border-radius:4px;
              border:1px solid var(--border);overflow:hidden;">
              <div style="display:flex;align-items:center;gap:10px;
                padding:5px 8px;border-bottom:1px solid var(--border);">
                <span style="flex:1;font-size:11px;letter-spacing:1px;
                  color:var(--muted);text-transform:uppercase;">子技能</span>
                <span style="font-size:11px;color:var(--muted);min-width:36px;text-align:right;">占比</span>
                <span style="font-size:11px;color:var(--muted);min-width:48px;text-align:right;">次数</span>
              </div>
              ${rowsHtml}
            </div>`
        }

        panel.style.display = ''
        btn.textContent = '收起'
        btn.style.color = 'var(--cyan)'
        btn.style.borderColor = 'var(--cyan)'
      } catch {
        panel.innerHTML = `<div style="font-size:13px;color:var(--red);padding:8px 0;">加载失败</div>`
        panel.style.display = ''
      } finally {
        btn.disabled = false
      }
    })
  })
}

function renderToolsList(el, tools, range, onDeleted) {
  function filtered() {
    if (_state.listFilter === 'all')  return tools
    if (_state.listFilter === 'dust') return tools.filter(isDust)
    return tools.filter(t => t.type === _state.listFilter)
  }

  function render(scrollToTop = false) {
    const savedScroll = scrollToTop ? 0 : (el.scrollTop ?? 0)
    el.innerHTML = buildToolsListHtml(tools, filtered(), _state.listFilter, _state.listPage, range)
    el.scrollTop = savedScroll
    // tab 点击 → 重置到第一页
    el.querySelectorAll('.filter-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        _state.listFilter = btn.dataset.filter
        _state.listPage = 0
        render(true)
      })
    })
    // 翻页 → 滚到顶部
    el.querySelectorAll('.page-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        _state.listPage += parseInt(btn.dataset.dir)
        render(true)
      })
    })
    bindDeleteButtons(el, onDeleted)
    bindDetailButtons(el)
  }

  // 恢复时 clamp 到有效页范围
  const total = Math.ceil(filtered().length / PAGE_SIZE)
  _state.listPage = Math.min(_state.listPage, Math.max(total - 1, 0))
  render()
}

// ── RECOMMENDATIONS 面板 ──
export function buildRecommendationsHtml(tools) {
  const dust = tools.filter(t => isDust(t))
  if (dust.length === 0) return null

  const rows = dust.map(t => {
    const color = TYPE_COLOR[t.type] ?? 'var(--green)'
    return `<div style="display:flex;justify-content:space-between;padding:3px 0;
        border-bottom:1px solid var(--border);">
        <span style="font-size:14px;color:var(--muted);">
          <span style="color:${color};font-size:11px;margin-right:4px;">${t.type[0].toUpperCase()}</span>${t.name}
        </span>
        <span style="font-size:12px;color:var(--red);">闲置</span>
      </div>`
  }).join('')

  return `
    <div class="card">
      <div class="section-title" style="margin-bottom:8px;">建议清理</div>
      <div style="font-size:14px;color:var(--muted);margin-bottom:8px;">
        发现 <span style="color:var(--red);">${dust.length}</span> 个闲置工具
      </div>
      <div style="margin-bottom:10px;">${rows}</div>
      <button id="bulk-clean-btn"
        style="width:100%;padding:6px;background:transparent;border:1px solid var(--red);
          color:var(--red);border-radius:var(--radius);cursor:pointer;font-size:14px;
          font-family:var(--font);">一键清理</button>
    </div>`
}

function renderRecommendations(el, tools, container, range) {
  const html = buildRecommendationsHtml(tools)
  el.innerHTML = html ?? ''
  if (!html) return

  el.querySelector('#bulk-clean-btn')?.addEventListener('click', async () => {
    const btn = el.querySelector('#bulk-clean-btn')
    if (!confirm(`确认批量删除 ${tools.filter(isDust).length} 个闲置工具？`)) return
    btn.disabled = true
    btn.textContent = '清理中…'
    try {
      const res = await fetch(`/api/tools/bulk-dust`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '清理失败')
      renderSkills(container, range)
    } catch (err) {
      alert(`清理失败：${err.message}`)
      btn.disabled = false
      btn.textContent = '一键清理'
    }
  })
}
