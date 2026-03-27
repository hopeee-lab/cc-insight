// tests/config.test.js
import { getClaudeDir, getAppDir } from '../src/config.js'
import path from 'path'
import os from 'os'

test('getClaudeDir returns default ~/.claude when env not set', () => {
  delete process.env.CLAUDE_DIR
  const dir = getClaudeDir()
  expect(dir).toBe(path.join(os.homedir(), '.claude'))
})

test('getClaudeDir respects CLAUDE_DIR env var', () => {
  process.env.CLAUDE_DIR = '/custom/path'
  const dir = getClaudeDir()
  expect(dir).toBe('/custom/path')
  delete process.env.CLAUDE_DIR
})

test('getAppDir returns ~/.cc-insight', () => {
  const dir = getAppDir()
  expect(dir).toBe(path.join(os.homedir(), '.cc-insight'))
})
