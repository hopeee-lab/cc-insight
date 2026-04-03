// public/js/mcp.js

const SOURCE_LABEL = {
  config:    { text: 'Config',    color: 'var(--cyan)'   },
  history:   { text: 'History',  color: 'var(--amber)'  },
  'claude.ai': { text: 'Claude.ai', color: 'var(--purple)' },
}

const STATUS_LABEL = {
  configured: { text: '已配置', color: 'var(--green)'  },
  used:       { text: '历史使用', color: 'var(--amber)' },
  hosted:     { text: '托管',   color: 'var(--cyan)'   },
}

function badge(text, color) {
  return `<span style="font-size:12px;padding:2px 7px;border-radius:3px;
    background:color-mix(in srgb,${color} 15%,transparent);
    border:1px solid color-mix(in srgb,${color} 40%,transparent);
    color:${color};white-space:nowrap;">${text}</span>`
}

function serverCard(s) {
  const src = SOURCE_LABEL[s.source] ?? { text: s.source, color: 'var(--muted)' }
  const sta = STATUS_LABEL[s.status] ?? { text: s.status, color: 'var(--muted)' }

  // 工具列表：最多展示 6 个，超出折叠
  const toolChips = (s.tools ?? []).map(t =>
    `<span style="font-size:12px;color:var(--muted);background:var(--bg3);
      padding:1px 6px;border-radius:3px;">${t}</span>`
  )
  const showTools = toolChips.slice(0, 6).join(' ')
  const moreCount = toolChips.length - 6
  const toolsRow = toolChips.length > 0
    ? `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:8px;">
        ${showTools}
        ${moreCount > 0 ? `<span style="font-size:12px;color:var(--muted);">+${moreCount} 更多</span>` : ''}
      </div>`
    : ''

  // 命令 / URL
  const cmdRow = s.command
    ? `<div style="margin-top:6px;font-size:13px;color:var(--muted);
        font-family:var(--font);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"
        title="${s.command}">${s.command}</div>`
    : s.url
    ? `<div style="margin-top:6px;font-size:13px;color:var(--muted);
        overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"
        title="${s.url}">${s.url}</div>`
    : ''

  return `
    <div style="background:var(--bg2);border:1px solid var(--border);
      border-radius:var(--radius);padding:14px 16px;margin-bottom:8px;">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <span style="font-size:15px;font-weight:bold;color:var(--text);flex:1;min-width:0;
          overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${s.name}</span>
        ${badge(src.text, src.color)}
        ${badge(sta.text, sta.color)}
        ${s.tools?.length > 0
          ? `<span style="font-size:13px;color:var(--muted);">${s.tools.length} 个工具</span>`
          : ''}
      </div>
      ${cmdRow}
      ${toolsRow}
    </div>`
}

function summaryCards(servers) {
  const total      = servers.length
  const configured = servers.filter(s => s.source === 'config').length
  const history    = servers.filter(s => s.source === 'history').length
  const hosted     = servers.filter(s => s.source === 'claude.ai').length

  const item = (label, val, color) => `
    <div class="card">
      <div class="card-label">${label}</div>
      <div class="card-value" style="color:${color};">${val}</div>
    </div>`

  return `
    <div class="grid-4" style="margin-bottom:14px;">
      ${item('Total Servers', total,      'var(--text)')}
      ${item('Configured',   configured,  'var(--green)')}
      ${item('History',      history,     'var(--amber)')}
      ${item('Claude.ai',    hosted,      'var(--purple)')}
    </div>`
}

export async function renderMcp(container) {
  container.style.display = 'flex'
  container.style.flexDirection = 'column'
  container.innerHTML = `<div style="color:var(--muted);font-size:14px;padding:20px;">加载中…</div>`

  let servers
  try {
    servers = await fetch('/api/mcp-servers').then(r => r.json())
  } catch {
    container.innerHTML = `<div style="color:var(--red);font-size:14px;padding:20px;">加载失败</div>`
    return
  }

  if (!servers || servers.length === 0) {
    container.innerHTML = `
      <div class="card" style="margin-top:20px;">
        <div class="section-title" style="margin-bottom:8px;">MCP Servers</div>
        <div class="muted" style="font-size:14px;">未检测到任何 MCP Server</div>
      </div>`
    return
  }

  // 按来源分组：config > claude.ai > history
  const order = ['config', 'claude.ai', 'history']
  const grouped = {}
  for (const src of order) grouped[src] = []
  for (const s of servers) {
    const key = order.includes(s.source) ? s.source : 'history'
    grouped[key].push(s)
  }

  const groupTitle = (label, color, count) => count === 0 ? '' : `
    <div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;
      color:${color};margin:16px 0 8px;">${label} · ${count}</div>`

  const listHtml = [
    grouped['config'].length    > 0 ? groupTitle('Config 配置', 'var(--green)',  grouped['config'].length)    + grouped['config'].map(serverCard).join('')    : '',
    grouped['claude.ai'].length > 0 ? groupTitle('Claude.ai 托管', 'var(--purple)', grouped['claude.ai'].length) + grouped['claude.ai'].map(serverCard).join('') : '',
    grouped['history'].length   > 0 ? groupTitle('历史使用', 'var(--amber)', grouped['history'].length)   + grouped['history'].map(serverCard).join('')   : '',
  ].join('')

  container.innerHTML = `
    <div style="flex:1;min-height:0;overflow-y:auto;margin:-20px;padding:20px;">
      <div style="max-width:860px;">
        <div style="margin-bottom:16px;">
          <div style="font-size:15px;font-weight:bold;color:var(--text);">MCP Servers</div>
          <div style="font-size:13px;color:var(--muted);margin-top:2px;">
            来源：配置文件 / 历史调用记录 / Claude.ai 托管
          </div>
        </div>
        ${summaryCards(servers)}
        <div>${listHtml}</div>
      </div>
    </div>`
}
