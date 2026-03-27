// src/indexer.js
import fs from 'fs'
import path from 'path'
import { getClaudeDir, getExtraSessionDirs } from './config.js'
import { parseJsonlFile } from './parsers/jsonl.js'
import { parseSkillMd } from './parsers/skill-md.js'
import { scanSkillSecurity } from './parsers/security.js'
import { upsertSession, upsertTool, insertInvocations, getIndexedFiles } from './db/queries.js'
import { getMeta, setMeta } from './db/db.js'

function findAllJsonlFiles(claudeDir) {
  const results = []
  function walk(dir) {
    if (!fs.existsSync(dir)) return
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (entry.name.endsWith('.jsonl')) results.push(full)
    }
  }
  // CLI 数据目录
  walk(path.join(claudeDir, 'projects'))
  // 桌面 App 额外目录（macOS），自动检测
  for (const extraDir of getExtraSessionDirs()) {
    walk(extraDir)
  }
  return results
}

function findAllTools(claudeDir) {
  const tools = []
  // Skills
  const skillsDir = path.join(claudeDir, 'skills')
  if (fs.existsSync(skillsDir)) {
    for (const name of fs.readdirSync(skillsDir)) {
      const skillMd = path.join(skillsDir, name, 'SKILL.md')
      const stat = fs.statSync(path.join(skillsDir, name))
      if (!stat.isDirectory()) continue
      const meta = parseSkillMd(skillMd, name) ?? { name, description: '', type: 'skill' }
      const security = scanSkillSecurity(skillMd)
      const toolType = ['skill', 'agent'].includes(meta.type) ? meta.type : 'skill'
      tools.push({ id: `${toolType}:${name}`, name: meta.name, type: toolType,
        subtype: null, description: meta.description, sourceType: 'downloaded', sourceUrl: null,
        installedAt: stat.birthtimeMs, updatedAt: stat.mtimeMs,
        securityScanResult: security })
    }
  }
  // Plugins
  const pluginsDir = path.join(claudeDir, 'plugins', 'cache')
  if (fs.existsSync(pluginsDir)) {
    for (const marketplace of fs.readdirSync(pluginsDir)) {
      const mDir = path.join(pluginsDir, marketplace)
      if (!fs.statSync(mDir).isDirectory()) continue
      for (const pluginName of fs.readdirSync(mDir)) {
        const stat = fs.statSync(path.join(mDir, pluginName))
        if (!stat.isDirectory()) continue
        tools.push({ id: `plugin:${marketplace}:${pluginName}`, name: pluginName,
          type: 'plugin', subtype: null, description: '', sourceType: 'downloaded',
          sourceUrl: null, installedAt: stat.birthtimeMs, updatedAt: stat.mtimeMs,
          securityScanResult: 'unscanned' })
      }
    }
  }
  return tools
}

export async function indexJsonlFile(filePath) {
  const result = parseJsonlFile(filePath)
  if (!result) return
  upsertSession({ ...result, id: result.sessionId, source: 'claude-code', jsonlFile: filePath })
  if (result.invocations.length > 0) {
    insertInvocations(result.invocations.map(inv => ({
      sessionId: result.sessionId, ...inv
    })))
  }
}

export async function runFullIndex(onProgress) {
  const claudeDir = getClaudeDir()
  const files = findAllJsonlFiles(claudeDir)
  const tools = findAllTools(claudeDir)

  // Index tools first (fast)
  for (const tool of tools) upsertTool(tool)

  // Index JSONL files with progress
  const indexed = getIndexedFiles()
  const toIndex = files.filter(f => !indexed.has(f))
  const total = toIndex.length

  for (let i = 0; i < toIndex.length; i++) {
    await indexJsonlFile(toIndex[i])
    const pct = Math.round(((i + 1) / Math.max(total, 1)) * 100)
    onProgress?.(pct)
  }

  if (total === 0) onProgress?.(100)
  setMeta('last_full_index', Date.now().toString())
}

export async function runIncrementalIndex(filePath) {
  await indexJsonlFile(filePath)
}
