// tests/skills/toolsList.test.js
import { jest } from '@jest/globals'

jest.unstable_mockModule('../../public/js/app.js', () => ({
  setRange: jest.fn(),
  currentRange: '7d',
}))

const { buildToolsListHtml } = await import('../../public/js/skills.js')

const NOW = Date.now()
const daysAgo = (n) => new Date(NOW - n * 86400_000).toISOString()

const TOOLS = [
  {
    name: 'multi-search', type: 'skill', useCount: 42,
    lastUsedAt: daysAgo(3), installedAt: daysAgo(90),
    updatedAt: daysAgo(30), description: '多渠道并行搜索工具',
    sourceType: 'downloaded', sourceUrl: 'https://example.com/multi-search',
    securityScanResult: 'safe', localPath: '/Users/test/.claude/skills/multi-search',
  },
  {
    // 从未使用，安装 60 天 → AI建议应显示
    name: 'agent-browser', type: 'agent', useCount: 0,
    lastUsedAt: null, installedAt: daysAgo(60),
    updatedAt: daysAgo(60), description: '浏览器自动化 agent',
    sourceType: 'downloaded', sourceUrl: null,
    securityScanResult: 'unscanned', localPath: '/Users/test/.claude/skills/agent-browser',
  },
  {
    name: 'figma-mcp', type: 'plugin', useCount: 5,
    lastUsedAt: daysAgo(2), installedAt: daysAgo(20),
    updatedAt: daysAgo(10), description: '',
    sourceType: 'self', sourceUrl: null,
    securityScanResult: 'warning', localPath: '/Users/test/.claude/plugins/cache/mkt/figma-mcp',
  },
  {
    // 使用过但停用 45 天 → AI建议应显示
    name: 'old-unused', type: 'skill', useCount: 1,
    lastUsedAt: daysAgo(45), installedAt: daysAgo(100),
    updatedAt: daysAgo(100), description: '很久没用了',
    sourceType: 'downloaded', sourceUrl: null,
    securityScanResult: 'safe', localPath: '/Users/test/.claude/skills/old-unused',
  },
]

// 新签名：buildToolsListHtml(allTools, displayTools, currentFilter, page)
test('renders one card per tool', () => {
  const html = buildToolsListHtml(TOOLS, TOOLS, 'all', 0)
  expect(html).toContain('multi-search')
  expect(html).toContain('agent-browser')
  expect(html).toContain('figma-mcp')
  expect(html).toContain('old-unused')
})

test('shows Chinese description, hides English-only description', () => {
  const html = buildToolsListHtml(TOOLS, TOOLS, 'all', 0)
  // 含中文的描述应显示
  expect(html).toContain('多渠道并行搜索工具')
  expect(html).toContain('浏览器自动化 agent')
  expect(html).toContain('很久没用了')
  // figma-mcp description 为空，不显示
  expect(html).not.toContain('undefined')
})

test('shows security scan badge', () => {
  const html = buildToolsListHtml(TOOLS, TOOLS, 'all', 0)
  expect(html).toContain('✓ 安全')
  expect(html).toContain('未审查')
  expect(html).toContain('⚠ 警告')
})

test('marks dust tools (30+ days unused) with data-dust="true"', () => {
  const html = buildToolsListHtml(TOOLS, TOOLS, 'all', 0)
  expect(html).toMatch(/data-name="agent-browser"[^>]*data-dust="true"/)
  expect(html).toMatch(/data-name="old-unused"[^>]*data-dust="true"/)
  expect(html).not.toMatch(/data-name="multi-search"[^>]*data-dust="true"/)
})

test('shows source type label', () => {
  const html = buildToolsListHtml(TOOLS, TOOLS, 'all', 0)
  expect(html).toContain('下载')
  expect(html).toContain('自建')
})

test('renders filter tabs with correct counts from allTools', () => {
  // 即使 displayTools 只含 skill，tab 计数仍从 allTools 算
  const skillOnly = TOOLS.filter(t => t.type === 'skill')
  const html = buildToolsListHtml(TOOLS, skillOnly, 'skill', 0)
  expect(html).toContain('data-filter="all"')
  expect(html).toContain('data-filter="skill"')
  expect(html).toContain('data-filter="agent"')
  expect(html).toContain('data-filter="plugin"')
  expect(html).toContain('data-filter="dust"')
  // 全部 tab 计数应该是全量 4 个工具
  expect(html).toContain(`全部 (${TOOLS.length})`)
  // skill tab 计数也应显示全量 skill 数量
  expect(html).toContain(`Skill (${TOOLS.filter(t=>t.type==='skill').length})`)
})

test('each card has delete button with data-name and data-type', () => {
  const html = buildToolsListHtml(TOOLS, TOOLS, 'all', 0)
  expect(html).toContain('data-name="multi-search"')
  expect(html).toContain('data-type="skill"')
})

test('shows local path when provided', () => {
  const html = buildToolsListHtml(TOOLS, TOOLS, 'all', 0)
  expect(html).toContain('.claude/skills/multi-search')
})

test('empty displayTools shows empty-state but keeps tabs', () => {
  const html = buildToolsListHtml(TOOLS, [], 'agent', 0)
  expect(html).toContain('该分类暂无工具')
  // tabs 仍然存在
  expect(html).toContain('data-filter="all"')
  expect(html).toContain('data-filter="agent"')
})

test('no AI suggestion for active tools', () => {
  const html = buildToolsListHtml(TOOLS, TOOLS, 'all', 0)
  // multi-search useCount=42, lastUsed=3天前 → 不应有 AI建议
  // 只验证没有针对 multi-search 的警告文字
  expect(html).not.toContain('高频核心工具')
  expect(html).not.toContain('保持活跃')
})

test('AI suggestion shown for long-unused (never used, 60 days)', () => {
  const html = buildToolsListHtml(TOOLS, TOOLS, 'all', 0)
  // agent-browser: useCount=0, installed 60天 → 应提示
  expect(html).toContain('60')
  expect(html).toContain('从未使用')
})

test('AI suggestion shown for abandoned tool (used once, idle 45 days)', () => {
  const html = buildToolsListHtml(TOOLS, TOOLS, 'all', 0)
  // old-unused: useCount=1, lastUsed=45天前 → 应提示停用
  expect(html).toContain('45')
  expect(html).toContain('未使用')
})
