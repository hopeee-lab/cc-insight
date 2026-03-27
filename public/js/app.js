// public/js/app.js
import { initTheme } from './theme.js'
import { renderOverview } from './overview.js'
import { renderSkills } from './skills.js'

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
      renderView(currentView)
    }

    if (msg.type === 'ready') {
      document.getElementById('progress-screen').classList.add('hidden')
      document.getElementById('app').style.display = ''
      renderView(currentView)
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
}

// ── 时间筛选 ──
export function setRange(range) {
  currentRange = range
  renderView(currentView)
}

// ── 初始化 ──
document.addEventListener('DOMContentLoaded', async () => {
  await initTheme()
  connectWS()

  // 侧边栏导航
  document.querySelectorAll('#tab-group .tab-btn').forEach(btn => {
    btn.addEventListener('click', () => renderView(btn.dataset.view))
  })
})
