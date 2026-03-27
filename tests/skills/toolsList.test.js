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
    securityScanResult: 'safe',
  },
  {
    name: 'agent-browser', type: 'agent', useCount: 0,
    lastUsedAt: null, installedAt: daysAgo(60),
    updatedAt: daysAgo(60), description: '浏览器自动化 agent',
    sourceType: 'downloaded', sourceUrl: null,
    securityScanResult: 'unscanned',
  },
  {
    name: 'figma-mcp', type: 'plugin', useCount: 5,
    lastUsedAt: daysAgo(2), installedAt: daysAgo(20),
    updatedAt: daysAgo(10), description: '',
    sourceType: 'self', sourceUrl: null,
    securityScanResult: 'warning',
  },
  {
    name: 'old-unused', type: 'skill', useCount: 1,
    lastUsedAt: daysAgo(45), installedAt: daysAgo(100),
    updatedAt: daysAgo(100), description: '很久没用了',
    sourceType: 'downloaded', sourceUrl: null,
    securityScanResult: 'safe',
  },
]

test('renders one card per tool', () => {
  const html = buildToolsListHtml(TOOLS)
  expect(html).toContain('multi-search')
  expect(html).toContain('agent-browser')
  expect(html).toContain('figma-mcp')
  expect(html).toContain('old-unused')
})

test('shows description', () => {
  const html = buildToolsListHtml(TOOLS)
  expect(html).toContain('多渠道并行搜索工具')
  expect(html).toContain('浏览器自动化 agent')
})

test('shows security scan badge', () => {
  const html = buildToolsListHtml(TOOLS)
  expect(html).toContain('✓ 安全')
  expect(html).toContain('未审查')
  expect(html).toContain('⚠ 警告')
})

test('marks dust tools (30+ days unused) with data-dust="true"', () => {
  const html = buildToolsListHtml(TOOLS)
  expect(html).toMatch(/data-name="agent-browser"[^>]*data-dust="true"/)
  expect(html).toMatch(/data-name="old-unused"[^>]*data-dust="true"/)
  expect(html).not.toMatch(/data-name="multi-search"[^>]*data-dust="true"/)
})

test('shows source type label', () => {
  const html = buildToolsListHtml(TOOLS)
  expect(html).toContain('下载')
  expect(html).toContain('自建')
})

test('renders filter tabs', () => {
  const html = buildToolsListHtml(TOOLS)
  expect(html).toContain('data-filter="all"')
  expect(html).toContain('data-filter="skill"')
  expect(html).toContain('data-filter="agent"')
  expect(html).toContain('data-filter="plugin"')
  expect(html).toContain('data-filter="dust"')
})

test('each card has delete button with data-name and data-type', () => {
  const html = buildToolsListHtml(TOOLS)
  expect(html).toContain('data-name="multi-search"')
  expect(html).toContain('data-type="skill"')
})

test('empty list renders empty-state message', () => {
  const html = buildToolsListHtml([])
  expect(html).toContain('暂无')
})
