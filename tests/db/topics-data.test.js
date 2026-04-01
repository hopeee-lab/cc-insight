import { describe, it, expect } from '@jest/globals'
import Database from 'better-sqlite3'
import { CREATE_TABLES } from '../../src/db/schema.js'

function makeDb() {
  const db = new Database(':memory:')
  db.exec(CREATE_TABLES)
  return db
}

describe('upsertSession with topic fields', () => {
  it('写入 topic 和 topic_keywords', () => {
    const db = makeDb()
    db.prepare(`
      INSERT OR REPLACE INTO sessions
        (id, source, start_time, topic, topic_keywords)
      VALUES (?, ?, ?, ?, ?)
    `).run('sess-1', 'claude-code', Date.now(), '调试修复', JSON.stringify(['nvm', 'node']))

    const row = db.prepare('SELECT topic, topic_keywords FROM sessions WHERE id = ?').get('sess-1')
    expect(row.topic).toBe('调试修复')
    expect(JSON.parse(row.topic_keywords)).toEqual(['nvm', 'node'])
  })

  it('topic 为 null 时不报错', () => {
    const db = makeDb()
    expect(() => {
      db.prepare(`INSERT OR REPLACE INTO sessions (id, source, start_time) VALUES (?, ?, ?)`)
        .run('sess-2', 'claude-code', Date.now())
    }).not.toThrow()
  })
})
