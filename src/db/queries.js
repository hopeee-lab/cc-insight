// src/db/queries.js
import { getDb } from './db.js'

export function upsertSession({ id, source, startTime, endTime, durationSec,
                                 projectPath, messageCount, toolUseCount, jsonlFile }) {
  getDb().prepare(`
    INSERT OR REPLACE INTO sessions
      (id, source, start_time, end_time, duration_sec, project_path, message_count, tool_use_count, jsonl_file)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, source, startTime, endTime, durationSec, projectPath, messageCount, toolUseCount, jsonlFile)
}

export function upsertTool({ id, name, type, subtype, description, sourceType, sourceUrl,
                              installedAt, updatedAt, securityScanResult }) {
  getDb().prepare(`
    INSERT OR REPLACE INTO tools
      (id, name, type, subtype, description, source_type, source_url, installed_at, updated_at, security_scan_result)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, type, subtype ?? null, description, sourceType, sourceUrl, installedAt, updatedAt, securityScanResult)
}

export function insertInvocations(invocations) {
  const stmt = getDb().prepare(
    'INSERT OR IGNORE INTO tool_invocations (session_id, tool_name, invoked_at) VALUES (?, ?, ?)'
  )
  const insert = getDb().transaction((rows) => {
    for (const r of rows) stmt.run(r.sessionId, r.toolName, r.invokedAt)
  })
  insert(invocations)
}

export function getSessionCount({ after }) {
  return getDb().prepare(
    'SELECT COUNT(*) as n FROM sessions WHERE start_time >= ?'
  ).get(after).n
}

export function getTotalDurationSec({ after }) {
  return getDb().prepare(
    'SELECT COALESCE(SUM(duration_sec), 0) as total FROM sessions WHERE start_time >= ?'
  ).get(after).total
}

export function getAvgDailyDurationSec({ after }) {
  const db = getDb()
  const total = getTotalDurationSec({ after })
  const days = db.prepare(
    "SELECT COUNT(DISTINCT date(start_time / 1000, 'unixepoch')) as n FROM sessions WHERE start_time >= ?"
  ).get(after).n
  return days > 0 ? Math.round(total / days) : 0
}

export function getPeakPeriod({ after }) {
  const rows = getDb().prepare(`
    SELECT strftime('%H', start_time / 1000, 'unixepoch') as hour, COUNT(*) as n
    FROM sessions WHERE start_time >= ?
    GROUP BY hour ORDER BY n DESC LIMIT 1
  `).get(after)
  if (!rows) return null
  const h = parseInt(rows.hour)
  return `${String(h).padStart(2,'0')}:00–${String(h+2 > 23 ? 23 : h+2).padStart(2,'0')}:59`
}

export function getSilentDays({ after }) {
  const db = getDb()
  const activeDays = new Set(
    db.prepare("SELECT DISTINCT date(start_time / 1000, 'unixepoch') as d FROM sessions WHERE start_time >= ?")
      .all(after).map(r => r.d)
  )
  const afterDate = new Date(after)
  const today = new Date()
  let silent = 0
  for (let d = new Date(afterDate); d <= today; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10)
    if (!activeDays.has(key)) silent++
  }
  return silent
}

export function getHeatmapData({ after }) {
  return getDb().prepare(`
    SELECT date(start_time / 1000, 'unixepoch') as day, COUNT(*) as count
    FROM sessions WHERE start_time >= ?
    GROUP BY day ORDER BY day
  `).all(after)
}

export function get24hDistribution({ after }) {
  return getDb().prepare(`
    SELECT strftime('%H', start_time / 1000, 'unixepoch') as hour, COUNT(*) as count
    FROM sessions WHERE start_time >= ?
    GROUP BY hour ORDER BY hour
  `).all(after)
}

export function getInvocationsByTool({ after }) {
  return getDb().prepare(`
    SELECT tool_name as toolName, COUNT(*) as count
    FROM tool_invocations WHERE invoked_at >= ?
    GROUP BY tool_name ORDER BY count DESC
  `).all(after)
}

export function getAllTools() {
  return getDb().prepare('SELECT * FROM tools ORDER BY installed_at DESC').all()
}

export function getToolUsageStats({ after }) {
  return getDb().prepare(`
    SELECT tool_name as toolName,
           COUNT(*) as useCount,
           MAX(invoked_at) as lastUsedAt
    FROM tool_invocations WHERE invoked_at >= ?
    GROUP BY tool_name
  `).all(after)
}

export function getDustToolNames({ after }) {
  const used = new Set(
    getDb().prepare(`
      SELECT DISTINCT tool_name FROM tool_invocations WHERE invoked_at >= ?
    `).all(after).map(r => r.tool_name)
  )
  return getDb().prepare('SELECT name FROM tools').all()
    .map(r => r.name)
    .filter(name => !used.has(name))
}

export function deleteTool(name) {
  getDb().prepare('DELETE FROM tools WHERE name = ?').run(name)
}

export function getIndexedFiles() {
  return new Set(
    getDb().prepare('SELECT jsonl_file FROM sessions WHERE jsonl_file IS NOT NULL').all()
      .map(r => r.jsonl_file)
  )
}
