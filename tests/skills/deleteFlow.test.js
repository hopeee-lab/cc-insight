// tests/skills/deleteFlow.test.js
import { validateToolPath } from '../../src/api.js'
import path from 'path'

const CLAUDE_DIR = '/Users/test/.claude'

test('accepts valid skill path', () => {
  expect(() => validateToolPath('multi-search', 'skill', CLAUDE_DIR)).not.toThrow()
})

test('accepts valid plugin path', () => {
  expect(() => validateToolPath('figma-mcp', 'plugin', CLAUDE_DIR)).not.toThrow()
})

test('rejects path traversal in name', () => {
  expect(() => validateToolPath('../../../etc/passwd', 'skill', CLAUDE_DIR)).toThrow()
})

test('rejects unknown type', () => {
  expect(() => validateToolPath('foo', 'unknown-type', CLAUDE_DIR)).toThrow()
})

test('returns absolute path within claude dir', () => {
  const p = validateToolPath('multi-search', 'skill', CLAUDE_DIR)
  expect(p.startsWith(CLAUDE_DIR)).toBe(true)
  expect(path.isAbsolute(p)).toBe(true)
})
