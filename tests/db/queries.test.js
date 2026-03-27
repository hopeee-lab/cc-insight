// tests/db/queries.test.js
import { upsertSession, upsertTool, insertInvocations, getSessionCount,
         getTotalDurationSec, getInvocationsByTool } from '../../src/db/queries.js'
import { getDb, closeDb } from '../../src/db/db.js'
import os from 'os'

// Use a temp DB for tests
process.env.HOME = os.tmpdir()

beforeEach(() => { closeDb() })
afterAll(() => { closeDb() })

test('upsertSession inserts and retrieves a session', () => {
  upsertSession({
    id: 'sess-1', source: 'claude-code',
    startTime: 1000000, endTime: 1003600, durationSec: 3600,
    projectPath: '/proj', messageCount: 10, toolUseCount: 5, jsonlFile: 'a.jsonl'
  })
  const count = getSessionCount({ after: 0 })
  expect(count).toBeGreaterThanOrEqual(1)
})

test('getTotalDurationSec sums duration within time range', () => {
  upsertSession({ id: 'sess-2', source: 'claude-code', startTime: 2000000,
    endTime: 2001800, durationSec: 1800, projectPath: '/', messageCount: 5,
    toolUseCount: 2, jsonlFile: 'b.jsonl' })
  const total = getTotalDurationSec({ after: 0 })
  expect(total).toBeGreaterThanOrEqual(1800)
})

test('insertInvocations and getInvocationsByTool', () => {
  insertInvocations([
    { sessionId: 'sess-1', toolName: 'Bash', invokedAt: 1000500 },
    { sessionId: 'sess-1', toolName: 'Bash', invokedAt: 1001000 },
    { sessionId: 'sess-1', toolName: 'Read', invokedAt: 1001500 },
  ])
  const counts = getInvocationsByTool({ after: 0 })
  const bash = counts.find(r => r.toolName === 'Bash')
  expect(bash.count).toBeGreaterThanOrEqual(2)
})
