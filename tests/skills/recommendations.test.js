// tests/skills/recommendations.test.js
import { jest } from '@jest/globals'

jest.unstable_mockModule('../../public/js/app.js', () => ({
  setRange: jest.fn(),
  currentRange: '7d',
}))

const { buildRecommendationsHtml } = await import('../../public/js/skills.js')

const NOW = Date.now()
const daysAgo = (n) => new Date(NOW - n * 86400_000).toISOString()

const TOOLS_WITH_DUST = [
  { name: 'multi-search',  type: 'skill',  useCount: 42, lastUsedAt: daysAgo(2),  installedAt: daysAgo(90) },
  { name: 'agent-browser', type: 'agent',  useCount: 0,  lastUsedAt: null,        installedAt: daysAgo(60) },
  { name: 'old-skill',     type: 'skill',  useCount: 3,  lastUsedAt: daysAgo(45), installedAt: daysAgo(120) },
  { name: 'fresh-plugin',  type: 'plugin', useCount: 1,  lastUsedAt: daysAgo(5),  installedAt: daysAgo(10) },
]

const TOOLS_ALL_ACTIVE = [
  { name: 'multi-search', type: 'skill', useCount: 10, lastUsedAt: daysAgo(1), installedAt: daysAgo(30) },
]

test('shows dust tool count in message', () => {
  const html = buildRecommendationsHtml(TOOLS_WITH_DUST)
  expect(html).toContain('2')
})

test('renders 一键清理 button when dust tools exist', () => {
  const html = buildRecommendationsHtml(TOOLS_WITH_DUST)
  expect(html).toContain('bulk-clean-btn')
  expect(html).toContain('一键清理')
})

test('returns null when no dust tools', () => {
  const result = buildRecommendationsHtml(TOOLS_ALL_ACTIVE)
  expect(result).toBeNull()
})

test('lists dust tool names', () => {
  const html = buildRecommendationsHtml(TOOLS_WITH_DUST)
  expect(html).toContain('agent-browser')
  expect(html).toContain('old-skill')
  expect(html).not.toContain('multi-search')
})
