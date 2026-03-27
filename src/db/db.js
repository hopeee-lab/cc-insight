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
