// tests/indexer.test.js
import { runFullIndex, indexJsonlFile } from '../src/indexer.js'
import { closeDb } from '../src/db/db.js'
import { getSessionCount } from '../src/db/queries.js'
import fs from 'fs'
import os from 'os'
import path from 'path'

process.env.HOME = os.tmpdir()
process.env.CLAUDE_DIR = path.join(os.tmpdir(), `claude-test-${Date.now()}`)

beforeAll(() => {
  fs.mkdirSync(path.join(process.env.CLAUDE_DIR, 'projects/proj1'), { recursive: true })
  const line1 = JSON.stringify({ type: 'user', sessionId: 'test-s1',
    timestamp: '2026-01-01T10:00:00.000Z', cwd: '/proj' })
  const line2 = JSON.stringify({ type: 'user', sessionId: 'test-s1',
    timestamp: '2026-01-01T10:30:00.000Z', cwd: '/proj' })
  fs.writeFileSync(
    path.join(process.env.CLAUDE_DIR, 'projects/proj1/session.jsonl'),
    [line1, line2].join('\n')
  )
})

afterAll(() => { closeDb() })

test('runFullIndex indexes all JSONL files and reports progress', async () => {
  const progress = []
  await runFullIndex((pct) => progress.push(pct))
  expect(progress[progress.length - 1]).toBe(100)
  expect(getSessionCount({ after: 0 })).toBeGreaterThanOrEqual(1)
})
