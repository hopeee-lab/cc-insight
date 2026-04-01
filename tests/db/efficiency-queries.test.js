// tests/db/efficiency-queries.test.js
import {
  getAvgRoundsByTopic,
  getDurationByTopic,
  getToolDensityByTopic,
  getTimeTopicHeatmap,
  getOutlierSessions,
  getProjectDist,
} from '../../src/db/queries.js'
import { getDb, closeDb } from '../../src/db/db.js'
import { upsertSession } from '../../src/db/queries.js'
import os from 'os'
import { mkdtempSync, rmSync } from 'fs'
import { join } from 'path'

let tmpDir

beforeEach(() => {
  closeDb()
  tmpDir = mkdtempSync(join(os.tmpdir(), 'cc-insight-test-'))
  process.env.CC_INSIGHT_APP_DIR = tmpDir
})

afterEach(() => {
  closeDb()
  delete process.env.CC_INSIGHT_APP_DIR
  rmSync(tmpDir, { recursive: true, force: true })
})

// ── 空数据兜底 ──
test('getAvgRoundsByTopic returns [] when no sessions', () => {
  expect(getAvgRoundsByTopic({ after: 0 })).toEqual([])
})
test('getDurationByTopic returns [] when no sessions', () => {
  expect(getDurationByTopic({ after: 0 })).toEqual([])
})
test('getToolDensityByTopic returns [] when no sessions', () => {
  expect(getToolDensityByTopic({ after: 0 })).toEqual([])
})
test('getTimeTopicHeatmap returns [] when no sessions', () => {
  expect(getTimeTopicHeatmap({ after: 0 })).toEqual([])
})
test('getOutlierSessions returns [] when no sessions', () => {
  expect(getOutlierSessions({ after: 0 })).toEqual([])
})
test('getProjectDist returns [] when no sessions', () => {
  expect(getProjectDist({ after: 0 })).toEqual([])
})

// ── 有数据的正确性测试 ──

function seed() {
  // 3 个 session：2 个有 topic，1 个无 topic
  upsertSession({ id: 's1', source: 'claude-code', startTime: 1000000000000,
    endTime: 1000003600000, durationSec: 3600, projectPath: '/proj/alpha',
    messageCount: 20, toolUseCount: 8, jsonlFile: 'a.jsonl', topic: '调试修复' })
  upsertSession({ id: 's2', source: 'claude-code', startTime: 1000007200000,
    endTime: 1000010800000, durationSec: 3600, projectPath: '/proj/alpha',
    messageCount: 10, toolUseCount: 2, jsonlFile: 'b.jsonl', topic: '调试修复' })
  upsertSession({ id: 's3', source: 'claude-code', startTime: 1000014400000,
    endTime: 1000018000000, durationSec: 3600, projectPath: '/proj/beta',
    messageCount: 5, toolUseCount: 0, jsonlFile: 'c.jsonl', topic: '数据分析' })
  // 无 topic session（不应出现在任何话题查询中）
  upsertSession({ id: 's4', source: 'claude-code', startTime: 1000021600000,
    endTime: 1000025200000, durationSec: 3600, projectPath: '/proj/alpha',
    messageCount: 3, toolUseCount: 1, jsonlFile: 'd.jsonl', topic: null })
}

test('getAvgRoundsByTopic returns correct avg for seeded data', () => {
  seed()
  const rows = getAvgRoundsByTopic({ after: 0 })
  // 调试修复：AVG(20,10)=15；数据分析：5
  const debug = rows.find(r => r.topic === '调试修复')
  expect(debug).toBeDefined()
  expect(debug.avgRounds).toBe(15.0)
  // topic=null 的 session 不应出现
  expect(rows.every(r => r.topic !== null)).toBe(true)
})

test('getDurationByTopic pct sums to ~100', () => {
  seed()
  const rows = getDurationByTopic({ after: 0 })
  const total = rows.reduce((s, r) => s + r.pct, 0)
  expect(total).toBeCloseTo(100, 0)
})

test('getToolDensityByTopic skips message_count=0 sessions', () => {
  closeDb()
  upsertSession({ id: 'zero-msg', source: 'claude-code', startTime: 1000000000000,
    endTime: 1000003600000, durationSec: 60, projectPath: '/x',
    messageCount: 0, toolUseCount: 5, jsonlFile: 'x.jsonl', topic: '测试话题' })
  const rows = getToolDensityByTopic({ after: 0 })
  // message_count=0 的 session 被过滤，该话题不出现
  expect(rows.find(r => r.topic === '测试话题')).toBeUndefined()
})

test('getOutlierSessions returns sessions with messageCount > 2*avg', () => {
  seed()
  // 加一个超高轮数 session 确保超过均值 2 倍
  upsertSession({ id: 's-high', source: 'claude-code', startTime: 1000028800000,
    endTime: 1000032400000, durationSec: 3600, projectPath: '/proj/alpha',
    messageCount: 80, toolUseCount: 20, jsonlFile: 'e.jsonl', topic: '调试修复' })
  const rows = getOutlierSessions({ after: 0 })
  expect(rows.length).toBeGreaterThan(0)
  expect(rows[0].messageCount).toBeGreaterThanOrEqual(rows[rows.length - 1].messageCount)
  expect(rows.length).toBeLessThanOrEqual(10)
})

test('getOutlierSessions returns [] when avg is 0', () => {
  // 所有 session message_count=0
  upsertSession({ id: 'z1', source: 'claude-code', startTime: 1000000000000,
    endTime: 1000003600000, durationSec: 60, projectPath: '/x',
    messageCount: 0, toolUseCount: 0, jsonlFile: 'z.jsonl', topic: '其他' })
  const rows = getOutlierSessions({ after: 0 })
  expect(rows).toEqual([])
})

test('getProjectDist returns correct project counts', () => {
  seed()
  const rows = getProjectDist({ after: 0 })
  const alpha = rows.find(r => r.project === '/proj/alpha')
  expect(alpha).toBeDefined()
  expect(alpha.count).toBe(3) // s1, s2, s4
})
