// public/js/app.js
import { initTheme } from './theme.js'
import { renderOverview } from './overview.js'
import { renderSkills } from './skills.js'
import { renderMcp } from './mcp.js'
import { openPosterModal } from './poster.js'

// 当前时间范围，全局共享
export let currentRange = '7d'

// 当前视图
let currentView = 'overview'

// ── WebSocket ──
function connectWS() {
  const ws = new WebSocket(`ws://${location.host}`)

  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data)

    if (msg.type === 'progress') {
      const pct = msg.pct
      document.getElementById('progress-bar').style.width = pct + '%'
      document.getElementById('progress-pct').textContent = pct + '%'
      if (pct >= 100) {
        setTimeout(() => {
          document.getElementById('progress-screen').classList.add('hidden')
          document.getElementById('app').style.display = ''
          renderView(currentView)
        }, 500)
      }
    }

    if (msg.type === 'refresh') {
      document.getElementById('progress-screen').classList.add('hidden')
      // 重新检测按钮状态重置
      const btn = document.getElementById('empty-reindex-btn')
      if (btn) { btn.textContent = '重新检测'; btn.disabled = false }
      checkStatusAndRender()
    }

    if (msg.type === 'ready') {
      document.getElementById('progress-screen').classList.add('hidden')
      checkStatusAndRender()
    }
  }

  ws.onclose = () => setTimeout(connectWS, 2000)
}

// ── 路由 ──
function renderView(view) {
  currentView = view
  const content = document.getElementById('content')

  document.querySelectorAll('#tab-group .tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view)
  })

  if (view === 'overview') renderOverview(content, currentRange)
  if (view === 'skills')   renderSkills(content, currentRange)
  if (view === 'mcp')      renderMcp(content)
}

// ── 时间筛选 ──
export function setRange(range) {
  currentRange = range
  renderView(currentView)
}

// ── 状态检测 & 空视图 ──
async function checkStatusAndRender() {
  const res = await fetch('/api/status')
  const { hasClaude, hasData, scanPaths } = await res.json()

  const elNoClaude = document.getElementById('empty-no-claude')
  const elNoData   = document.getElementById('empty-no-data')
  const elApp      = document.getElementById('app')

  // 重置所有视图
  elNoClaude.style.display = 'none'
  elNoData.style.display   = 'none'
  elApp.style.display      = 'none'

  if (!hasClaude) {
    elNoClaude.style.display = 'flex'
    return
  }

  if (!hasData) {
    document.getElementById('empty-scan-paths').textContent =
      '检测路径：' + scanPaths.join('、')
    elNoData.style.display = 'flex'
    return
  }

  elApp.style.display = ''
  renderView(currentView)
}

// ── 初始化 ──
document.addEventListener('DOMContentLoaded', async () => {
  await initTheme()
  connectWS()

  // 重新检测按钮
  document.getElementById('empty-reindex-btn')?.addEventListener('click', async (e) => {
    const btn = e.currentTarget
    btn.textContent = '检测中…'
    btn.disabled = true
    await fetch('/api/reindex', { method: 'POST' })
    // 结果通过 WS refresh 事件触发，不需要在这里轮询
  })

  // tab 导航
  document.querySelectorAll('#tab-group .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => renderView(btn.dataset.view))
  })

  // 海报按钮
  document.getElementById('poster-btn')?.addEventListener('click', () => {
    openPosterModal(currentRange)
  })
})
