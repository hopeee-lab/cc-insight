// tests/skills/topTools.test.js
import { jest } from '@jest/globals'

jest.unstable_mockModule('../../public/js/app.js', () => ({
  setRange: jest.fn(),
  currentRange: '7d',
}))

const { buildTopToolsHtml, buildUnusedToolsHtml } = await import('../../public/js/skills.js')

const tools = [
  { name: 'skill-vetter',    type: 'skill', useCount: 42, allTimeUseCount: 42, lastUsedAt: '2026-03-24T10:00:00Z', installedAt: '2026-01-10T00:00:00Z' },
  { name: 'data-assistant',  type: 'agent', useCount: 31, allTimeUseCount: 31, lastUsedAt: '2026-03-25T09:00:00Z', installedAt: '2026-01-15T00:00:00Z' },
  { name: 'multi-search',    type: 'skill', useCount: 18, allTimeUseCount: 18, lastUsedAt: '2026-03-20T08:00:00Z', installedAt: '2026-02-01T00:00:00Z' },
  { name: 'keybindings-help',type: 'skill', useCount: 0,  allTimeUseCount: 0,  lastUsedAt: null, installedAt: '2025-12-01T00:00:00Z' },
  { name: 'unused-agent',    type: 'agent', useCount: 0,  allTimeUseCount: 0,  lastUsedAt: null, installedAt: '2026-01-05T00:00:00Z' },
]

test('buildTopToolsHtml returns top 5 sorted by useCount', () => {
  const html = buildTopToolsHtml(tools, '30d')
  expect(html).toContain('skill-vetter')
  expect(html).toContain('42')
  expect(html).toContain('data-assistant')
  expect(html).toContain('31')
  expect(html).not.toContain('keybindings-help')
})

test('buildTopToolsHtml returns empty message when no tools used', () => {
  const html = buildTopToolsHtml([], '7d')
  expect(html).toContain('暂无使用记录')
})

test('buildUnusedToolsHtml lists never-used tools with install days', () => {
  const html = buildUnusedToolsHtml(tools)
  expect(html).toContain('keybindings-help')
  expect(html).toContain('unused-agent')
  expect(html).not.toContain('skill-vetter')
})

test('buildUnusedToolsHtml returns null when all tools are used', () => {
  const used = tools.filter(t => t.useCount > 0)
  const html = buildUnusedToolsHtml(used)
  expect(html).toBeNull()
})
