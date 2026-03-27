// public/js/theme.js
const THEMES = ['dark', 'light', 'system']
const LABELS = { dark: '深色', light: '浅色', system: '跟随系统' }

let _current = 'dark'

function applyTheme(theme) {
  _current = theme
  const resolved = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme
  document.documentElement.setAttribute('data-theme', resolved)
  const btn = document.getElementById('theme-btn')
  if (btn) btn.textContent = LABELS[theme]
}

async function saveTheme(theme) {
  applyTheme(theme)
  await fetch('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ theme }),
  }).catch(() => {})  // 写失败静默，不影响 UI
}

export async function initTheme() {
  // 优先读服务端配置，降级到 localStorage，再降级到 dark
  let theme = 'dark'
  try {
    const cfg = await fetch('/api/config').then(r => r.json())
    theme = cfg.theme ?? localStorage.getItem('cc-theme') ?? 'dark'
  } catch {
    theme = localStorage.getItem('cc-theme') ?? 'dark'
  }
  applyTheme(theme)

  // 系统主题变化时响应
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (_current === 'system') applyTheme('system')
  })

  // 点击循环切换
  document.getElementById('theme-btn')?.addEventListener('click', () => {
    const idx = THEMES.indexOf(_current)
    saveTheme(THEMES[(idx + 1) % THEMES.length])
  })
}
