import Database from 'better-sqlite3'
import fs from 'fs'
import { getDbPath, getAppDir } from '../config.js'
import { CREATE_TABLES } from './schema.js'

let _db = null

export function getDb() {
  if (_db) return _db
  const appDir = getAppDir()
  if (!fs.existsSync(appDir)) fs.mkdirSync(appDir, { recursive: true })
  _db = new Database(getDbPath())
  _db.pragma('journal_mode = WAL')
  _db.exec(CREATE_TABLES)
  // 迁移：兼容旧 DB，按需新增列
  const existingCols = _db.prepare('PRAGMA table_info(sessions)').all().map(c => c.name)
  if (!existingCols.includes('topic')) {
    _db.exec('ALTER TABLE sessions ADD COLUMN topic TEXT')
  }
  if (!existingCols.includes('topic_keywords')) {
    _db.exec('ALTER TABLE sessions ADD COLUMN topic_keywords TEXT')
  }
  if (!existingCols.includes('first_user_msg')) {
    _db.exec('ALTER TABLE sessions ADD COLUMN first_user_msg TEXT')
  }
  // 迁移：话题名重命名
  _db.exec(`UPDATE sessions SET topic = '功能开发' WHERE topic = '新功能开发'`)
  return _db
}

export function closeDb() {
  if (_db) { _db.close(); _db = null }
}

export function getMeta(key) {
  return getDb().prepare('SELECT value FROM meta WHERE key = ?').get(key)?.value
}

export function setMeta(key, value) {
  getDb().prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run(key, value)
}
