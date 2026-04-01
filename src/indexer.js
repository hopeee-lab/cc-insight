// src/indexer.js
import fs from 'fs'
import path from 'path'
import { getClaudeDir, getExtraSessionDirs } from './config.js'
import { parseJsonlFile } from './parsers/jsonl.js'
import { parseSkillMd } from './parsers/skill-md.js'
import { scanSkillSecurity } from './parsers/security.js'
import { upsertSession, upsertTool, insertInvocations, getIndexedFiles, getFilesNeedingTopics, syncToolIds } from './db/queries.js'
import { classifyTopic, extractKeywords } from './classifiers/topic-rules.js'
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
      try {
        const skillPath = path.join(skillsDir, name)
        const stat = fs.statSync(skillPath)
        if (!stat.isDirectory()) continue
        const skillMd = path.join(skillPath, 'SKILL.md')
        const meta = parseSkillMd(skillMd, name) ?? { name, description: '', type: 'skill', source: null }
        const security = scanSkillSecurity(skillMd)
        const toolType = ['skill', 'agent'].includes(meta.type) ? meta.type : 'skill'
        const sourceType = meta.source ? 'downloaded' : 'self'
        const sourceUrl  = meta.source ?? null
        tools.push({ id: `${toolType}:${name}`, name: meta.name, type: toolType,
          subtype: null, description: meta.description, sourceType, sourceUrl,
          installedAt: stat.birthtimeMs, updatedAt: stat.mtimeMs,
          securityScanResult: security })
      } catch {}
    }
  }
  // Plugins
  const pluginsDir = path.join(claudeDir, 'plugins', 'cache')
  if (fs.existsSync(pluginsDir)) {
    for (const marketplace of fs.readdirSync(pluginsDir)) {
      try {
        const mDir = path.join(pluginsDir, marketplace)
        if (!fs.statSync(mDir).isDirectory()) continue
        const children = fs.readdirSync(mDir).filter(n => {
          try { return fs.statSync(path.join(mDir, n)).isDirectory() } catch { return false }
        })
        if (children.length > 1) {
          // 多子 plugin（如 knowledge-work-plugins）→ 以 marketplace 为整体注册
          const stat = fs.statSync(mDir)
          tools.push({ id: `plugin:${marketplace}:${marketplace}`, name: marketplace,
            type: 'plugin', subtype: null, description: '', sourceType: 'downloaded',
            sourceUrl: null, installedAt: stat.birthtimeMs, updatedAt: stat.mtimeMs,
            securityScanResult: 'unscanned' })
        } else {
          // 单 plugin（如 claude-plugins-official/superpowers）→ 以 pluginName 注册
          for (const pluginName of children) {
            try {
              const stat = fs.statSync(path.join(mDir, pluginName))
              tools.push({ id: `plugin:${marketplace}:${pluginName}`, name: pluginName,
                type: 'plugin', subtype: null, description: '', sourceType: 'downloaded',
                sourceUrl: null, installedAt: stat.birthtimeMs, updatedAt: stat.mtimeMs,
                securityScanResult: 'unscanned' })
            } catch {}
          }
        }
      } catch {}
    }
  }
  return tools
}

// 返回所有正在扫描的目录列表（用于空视图展示检测路径）
export function getScanPaths() {
  const claudeDir = getClaudeDir()
  const dirs = [path.join(claudeDir, 'projects'), ...getExtraSessionDirs()]
  return dirs
}

export async function indexJsonlFile(filePath) {
  const result = parseJsonlFile(filePath)
  if (!result) return

  // 优先用第一条用户消息分类，匹配不到时用全量文本兜底
  let topic = classifyTopic(result.firstUserMessage)
  if (topic === '其他') topic = classifyTopic(result.allUserText)
  const topicKeywords = extractKeywords(result.allUserText)

  upsertSession({
    ...result,
    id: result.sessionId,
    source: 'claude-code',
    jsonlFile: filePath,
    topic,
    topicKeywords,
  })

  if (result.invocations.length > 0) {
    insertInvocations(result.invocations.map(inv => ({
      sessionId: result.sessionId, ...inv
    })))
  }
}

// 只同步工具（skills/plugins），不重新索引 JSONL，速度快，每次启动都调用
export function syncToolsOnly() {
  const claudeDir = getClaudeDir()
  const tools = findAllTools(claudeDir)
  for (const tool of tools) upsertTool(tool)
  syncToolIds(new Set(tools.map(t => t.id)))
}

export async function runFullIndex(onProgress) {
  const claudeDir = getClaudeDir()
  const files = findAllJsonlFiles(claudeDir)
  const tools = findAllTools(claudeDir)

  // Index tools first (fast)，并同步删除已不存在的工具记录
  for (const tool of tools) upsertTool(tool)
  syncToolIds(new Set(tools.map(t => t.id)))

  // Index JSONL files with progress
  // 同时处理：新文件 + 已索引但 topic 为 NULL 的文件（补分类）
  const indexed = getIndexedFiles()
  const needsTopics = getFilesNeedingTopics()
  const toIndex = files.filter(f => !indexed.has(f) || needsTopics.has(f))
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
