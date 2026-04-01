import { describe, it, expect } from '@jest/globals'
import Database from 'better-sqlite3'
import { CREATE_TABLES } from '../../src/db/schema.js'

function makeDb() {
  const db = new Database(':memory:')
  db.exec(CREATE_TABLES)
  return db
}

function seedSessions(db, rows) {
  const stmt = db.prepare(`
    INSERT INTO sessions (id, source, start_time, topic, topic_keywords)
    VALUES (?, 'claude-code', ?, ?, ?)
  `)
  for (const r of rows) {
    stmt.run(r.id, r.startTime, r.topic ?? null, r.keywords ? JSON.stringify(r.keywords) : null)
  }
}

const NOW = Date.now()
const DAY = 86400 * 1000

describe('getTopicsOverview SQL', () => {
  it('返回各大类 count，按 count 降序', () => {
    const db = makeDb()
    seedSessions(db, [
      { id: 's1', startTime: NOW - DAY, topic: '调试修复' },
      { id: 's2', startTime: NOW - DAY, topic: '调试修复' },
      { id: 's3', startTime: NOW - DAY, topic: '新功能开发' },
    ])
    const rows = db.prepare(`
      SELECT topic, COUNT(*) as count,
             ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) as pct
      FROM sessions
      WHERE start_time >= ? AND topic IS NOT NULL
      GROUP BY topic
      ORDER BY count DESC
    `).all(0)
    expect(rows[0].topic).toBe('调试修复')
    expect(rows[0].count).toBe(2)
    expect(rows[1].topic).toBe('新功能开发')
    expect(rows[0].pct + rows[1].pct).toBeCloseTo(100, 0)
  })

  it('after 过滤生效', () => {
    const db = makeDb()
    seedSessions(db, [
      { id: 's1', startTime: NOW - 10 * DAY, topic: '调试修复' },
      { id: 's2', startTime: NOW - DAY,      topic: '新功能开发' },
    ])
    const rows = db.prepare(`
      SELECT topic, COUNT(*) as count FROM sessions
      WHERE start_time >= ? AND topic IS NOT NULL
      GROUP BY topic ORDER BY count DESC
    `).all(NOW - 7 * DAY)
    expect(rows.length).toBe(1)
    expect(rows[0].topic).toBe('新功能开发')
  })
})

describe('getTopicKeywords SQL', () => {
  it('合并所有 session 的关键词，nvm 出现 3 次排第一', () => {
    const db = makeDb()
    seedSessions(db, [
      { id: 's1', startTime: NOW - DAY, topic: '调试修复',  keywords: ['nvm', 'node', 'error'] },
      { id: 's2', startTime: NOW - DAY, topic: '调试修复',  keywords: ['nvm', 'sqlite'] },
      { id: 's3', startTime: NOW - DAY, topic: '新功能开发', keywords: ['poster', 'nvm'] },
    ])
    const rows = db.prepare(`
      SELECT topic, topic_keywords FROM sessions
      WHERE start_time >= ? AND topic_keywords IS NOT NULL
    `).all(0)
    const freq = {}
    const topicMap = {}
    for (const r of rows) {
      for (const w of JSON.parse(r.topic_keywords)) {
        freq[w] = (freq[w] ?? 0) + 1
        if (!topicMap[w]) topicMap[w] = r.topic
      }
    }
    const sorted = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .map(([word, count]) => ({ word, count, topic: topicMap[word] }))
    expect(sorted[0].word).toBe('nvm')
    expect(sorted[0].count).toBe(3)
  })
})
