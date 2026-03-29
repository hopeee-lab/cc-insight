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

// 每个 session 最多计 4 小时（14400s），避免长时间挂起的对话文件虚增时长
const SESSION_DUR_CAP = 14400

export function getTotalDurationSec({ after }) {
  return getDb().prepare(
    'SELECT COALESCE(SUM(MIN(duration_sec, ?)), 0) as total FROM sessions WHERE start_time >= ?'
  ).get(SESSION_DUR_CAP, after).total
}

export function getAvgDailyDurationSec({ after }) {
  const db = getDb()
  const total = getTotalDurationSec({ after })
  const days = db.prepare(
    "SELECT COUNT(DISTINCT date(start_time / 1000, 'unixepoch', '+8 hours')) as n FROM sessions WHERE start_time >= ?"
  ).get(after).n
  return days > 0 ? Math.round(total / days) : 0
}

export function getPeakPeriod({ after }) {
  const rows = getDb().prepare(`
    SELECT strftime('%H', start_time / 1000, 'unixepoch', '+8 hours') as hour, COUNT(*) as n
    FROM sessions WHERE start_time >= ?
    GROUP BY hour ORDER BY n DESC LIMIT 1
  `).get(after)
  if (!rows) return null
  const h = parseInt(rows.hour)
  return `${String(h).padStart(2,'0')}:00–${String(h+2 > 23 ? 23 : h+2).padStart(2,'0')}:59`
}

// 2020-01-01 毫秒时间戳，用于过滤明显异常的历史时间戳
const MIN_VALID_TS = 1577836800000

export function getSilentDays({ after }) {
  const db = getDb()
  // 当 after=0（全部范围）时，以最早有效 session 时间为起点，避免从 1970 年算起
  let startMs = after
  if (!startMs) {
    const earliest = db.prepare('SELECT MIN(start_time) as t FROM sessions WHERE start_time >= ?').get(MIN_VALID_TS)
    startMs = earliest?.t ?? Date.now()
  }
  const activeDays = new Set(
    db.prepare("SELECT DISTINCT date(start_time / 1000, 'unixepoch', '+8 hours') as d FROM sessions WHERE start_time >= ?")
      .all(startMs).map(r => r.d)
  )
  // 用 CST(+8) 日期迭代，与 activeDays 保持一致
  function toCstDate(ms) {
    const cst = new Date(ms + 8 * 3600_000)
    return cst.toISOString().slice(0, 10)
  }
  const startDay = new Date(startMs + 8 * 3600_000)
  startDay.setUTCHours(0, 0, 0, 0)
  const todayDay = new Date(Date.now() + 8 * 3600_000)
  todayDay.setUTCHours(0, 0, 0, 0)
  let silent = 0
  for (let d = new Date(startDay); d <= todayDay; d.setUTCDate(d.getUTCDate() + 1)) {
    if (!activeDays.has(d.toISOString().slice(0, 10))) silent++
  }
  return silent
}

export function getHeatmapData({ after }) {
  return getDb().prepare(`
    SELECT date(start_time / 1000, 'unixepoch', '+8 hours') as day, COUNT(*) as count
    FROM sessions WHERE start_time >= ?
    GROUP BY day ORDER BY day
  `).all(after)
}

export function get24hDistribution({ after }) {
  return getDb().prepare(`
    SELECT strftime('%H', start_time / 1000, 'unixepoch', '+8 hours') as hour, COUNT(*) as count
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
  // plugin 的子 skill 调用格式为 "pluginName:subSkill"，按冒号前缀归组
  // 这样 superpowers:brainstorming 等会归到 "superpowers"
  return getDb().prepare(`
    SELECT
      CASE
        WHEN tool_name GLOB '*:*'
          THEN substr(tool_name, 1, instr(tool_name, ':') - 1)
        ELSE tool_name
      END as toolName,
      COUNT(*) as useCount,
      MAX(invoked_at) as lastUsedAt
    FROM tool_invocations WHERE invoked_at >= ?
    GROUP BY toolName
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

// 全量同步：删除不在 foundIds 集合中的工具（用于重建索引时清理旧记录）
export function syncToolIds(foundIds) {
  const all = getDb().prepare('SELECT id FROM tools').all().map(r => r.id)
  const toDelete = all.filter(id => !foundIds.has(id))
  const del = getDb().prepare('DELETE FROM tools WHERE id = ?')
  const run = getDb().transaction(ids => { for (const id of ids) del.run(id) })
  run(toDelete)
}

// plugin 子技能调用明细（tool_name 格式：pluginName:subSkill）
export function getPluginSubskillStats({ name, after }) {
  return getDb().prepare(`
    SELECT tool_name as toolName, COUNT(*) as count
    FROM tool_invocations
    WHERE tool_name GLOB ? AND invoked_at >= ?
    GROUP BY tool_name ORDER BY count DESC
  `).all(name + ':*', after)
}

export function getToolDistribution({ after }) {
  // 只取内置工具：首字母大写、不含 : 或 __ (GLOB 里 _ 不是通配符)
  return getDb().prepare(`
    SELECT tool_name as toolName, COUNT(*) as count
    FROM tool_invocations
    WHERE invoked_at >= ?
      AND tool_name GLOB '[A-Z]*'
      AND tool_name NOT GLOB '*:*'
      AND tool_name NOT GLOB '*__*'
    GROUP BY tool_name ORDER BY count DESC
  `).all(after)
}

export function getIndexedFiles() {
  return new Set(
    getDb().prepare('SELECT jsonl_file FROM sessions WHERE jsonl_file IS NOT NULL').all()
      .map(r => r.jsonl_file)
  )
}
