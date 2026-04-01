import { parseJsonlFile } from '../../src/parsers/jsonl.js'
import fs from 'fs'
import os from 'os'
import path from 'path'

function writeTmp(lines) {
  const f = path.join(os.tmpdir(), `test-${Date.now()}.jsonl`)
  fs.writeFileSync(f, lines.join('\n'))
  return f
}

test('extracts session id and timestamps from user messages', () => {
  const f = writeTmp([
    JSON.stringify({ type: 'user', sessionId: 'abc123', timestamp: '2026-01-01T10:00:00.000Z', cwd: '/proj' }),
    JSON.stringify({ type: 'user', sessionId: 'abc123', timestamp: '2026-01-01T10:05:00.000Z', cwd: '/proj' }),
  ])
  const result = parseJsonlFile(f)
  expect(result.sessionId).toBe('abc123')
  expect(result.startTime).toBe(new Date('2026-01-01T10:00:00.000Z').getTime())
  expect(result.endTime).toBe(new Date('2026-01-01T10:05:00.000Z').getTime())
  expect(result.durationSec).toBe(300)
  expect(result.projectPath).toBe('/proj')
})

test('counts tool_use entries', () => {
  const f = writeTmp([
    JSON.stringify({ type: 'user', sessionId: 's1', timestamp: '2026-01-01T10:00:00.000Z', cwd: '/' }),
    JSON.stringify({ type: 'assistant', sessionId: 's1', timestamp: '2026-01-01T10:01:00.000Z',
      message: { content: [{ type: 'tool_use', name: 'Bash' }, { type: 'tool_use', name: 'Read' }] } }),
  ])
  const result = parseJsonlFile(f)
  expect(result.toolUseCount).toBe(2)
  expect(result.invocations).toEqual([
    { toolName: 'Bash', invokedAt: new Date('2026-01-01T10:01:00.000Z').getTime() },
    { toolName: 'Read', invokedAt: new Date('2026-01-01T10:01:00.000Z').getTime() },
  ])
})

test('returns null for empty or invalid file', () => {
  const f = writeTmp(['{invalid json}', ''])
  expect(parseJsonlFile(f)).toBeNull()
})

test('extracts firstUserMessage from first user message text', () => {
  const f = writeTmp([
    JSON.stringify({ type: 'user', sessionId: 's1', timestamp: '2026-01-01T10:00:00.000Z',
      message: { content: [{ type: 'text', text: 'Fix this bug please' }] } }),
    JSON.stringify({ type: 'user', sessionId: 's1', timestamp: '2026-01-01T10:01:00.000Z',
      message: { content: [{ type: 'text', text: 'also refactor it' }] } }),
  ])
  const result = parseJsonlFile(f)
  expect(result.firstUserMessage).toBe('Fix this bug please')
})

test('extracts allUserText concatenating all user messages', () => {
  const f = writeTmp([
    JSON.stringify({ type: 'user', sessionId: 's1', timestamp: '2026-01-01T10:00:00.000Z',
      message: { content: [{ type: 'text', text: 'Fix this bug' }] } }),
    JSON.stringify({ type: 'user', sessionId: 's1', timestamp: '2026-01-01T10:01:00.000Z',
      message: { content: [{ type: 'text', text: 'and add feature' }] } }),
  ])
  const result = parseJsonlFile(f)
  expect(result.allUserText).toContain('Fix this bug')
  expect(result.allUserText).toContain('and add feature')
})

test('firstUserMessage falls back to empty string when no text content', () => {
  const f = writeTmp([
    JSON.stringify({ type: 'user', sessionId: 's1', timestamp: '2026-01-01T10:00:00.000Z' }),
  ])
  const result = parseJsonlFile(f)
  expect(result.firstUserMessage).toBe('')
})
