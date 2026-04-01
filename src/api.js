// src/api.js
import fs from 'fs'
import os from 'os'
import path from 'path'
import { Router } from 'express'
import {
  getSessionCount, getTotalDurationSec, getAvgDailyDurationSec,
  getPeakPeriod, getSilentDays, getHeatmapData, get24hDistribution,
  getInvocationsByTool, getAllTools, getToolUsageStats, deleteTool, getDustToolNames,
  getToolDistribution, getPluginSubskillStats,
  getTopicsOverview, getTopicKeywords,
} from './db/queries.js'
import { getDb } from './db/db.js'
import { getConfigPath, getAppDir, getClaudeDir } from './config.js'
import { runFullIndex, getScanPaths } from './indexer.js'
import { extractNickname, generatePosterText } from './poster.js'

// ── 工具路径校验（导出供测试） ──
const TYPE_DIR = {
  skill:  'skills',
  agent:  'skills',
  plugin: 'plugins',
}

export function validateToolPath(name, type, claudeDir = getClaudeDir()) {
  if (!TYPE_DIR[type]) throw new Error(`未知工具类型: ${type}`)
  if (!name || name.includes('..') || name.includes('/') || name.includes('\\')) {
    throw new Error(`非法工具名称: ${name}`)
  }
  const base = path.join(claudeDir, TYPE_DIR[type])
  const target = path.resolve(base, name)
  if (!target.startsWith(base + path.sep) && target !== base) {
    throw new Error(`路径越界: ${target}`)
  }
  return target
}

export function createRouter({ sendProgress = () => {}, sendRefresh = () => {} } = {}) {
  const router = Router()

  // 将时间范围字符串转换为 timestamp（毫秒）
  function rangeToAfter(range) {
    const now = Date.now()
    if (range === '7d')  return now - 7  * 86400 * 1000
    if (range === '30d') return now - 30 * 86400 * 1000
    if (range === '90d') return now - 90 * 86400 * 1000
    return 0 // 'all'
  }

  // --- 状态检测 & 重新索引 ---
  router.get('/api/status', (req, res) => {
    const scanPaths = getScanPaths()
    const claudeDir = getClaudeDir()
    const hasClaude = fs.existsSync(claudeDir)
    const hasData   = getSessionCount({ after: 0 }) > 0
    res.json({ hasClaude, hasData, scanPaths })
  })

  let _reindexing = false
  router.post('/api/reindex', async (req, res) => {
    if (_reindexing) return res.json({ ok: false, reason: 'already running' })
    _reindexing = true
    res.json({ ok: true })
    try {
      await runFullIndex(pct => sendProgress(pct))
    } finally {
      _reindexing = false
      sendRefresh()
    }
  })

  // --- 主题 1：使用概览 ---
  router.get('/api/overview', (req, res) => {
    const after = rangeToAfter(req.query.range ?? '7d')
    res.json({
      sessions:            getSessionCount({ after }),
      totalDurationSec:    getTotalDurationSec({ after }),
      avgDailyDurationSec: getAvgDailyDurationSec({ after }),
      peakPeriod:          getPeakPeriod({ after }),
      silentDays:          getSilentDays(),
    })
  })

  router.get('/api/heatmap', (req, res) => {
    const after = rangeToAfter(req.query.range ?? '7d')
    res.json(getHeatmapData({ after }))
  })

  router.get('/api/distribution', (req, res) => {
    const after = rangeToAfter(req.query.range ?? '7d')
    res.json(get24hDistribution({ after }))
  })

  router.get('/api/tool-distribution', (req, res) => {
    const after = rangeToAfter(req.query.range ?? '7d')
    res.json(getToolDistribution({ after }))
  })

  router.get('/api/insights', (req, res) => {
    const after = rangeToAfter(req.query.range ?? '7d')
    res.json(buildInsights({ after }))
  })

  router.get('/api/topics', (req, res) => {
    const after = rangeToAfter(req.query.range ?? '7d')
    res.json({
      categories: getTopicsOverview({ after }),
      keywords:   getTopicKeywords({ after }),
    })
  })

  // --- 主题 2：Skill & Agent & Plugin ---
  router.get('/api/tools', (req, res) => {
    const after = rangeToAfter(req.query.range ?? '7d')
    const tools = getAllTools()
    const usageStats = getToolUsageStats({ after })
    const allTimeStats = getToolUsageStats({ after: 0 })
    const statsMap = Object.fromEntries(usageStats.map(s => [s.toolName, s]))
    const allTimeMap = Object.fromEntries(allTimeStats.map(s => [s.toolName, s]))
    const claudeDir = getClaudeDir()
    const result = tools.map(t => {
      // 推算本地路径
      let localPath = null
      if (t.type === 'skill' || t.type === 'agent') {
        localPath = path.join(claudeDir, 'skills', t.name)
      } else if (t.type === 'plugin') {
        // id 格式: plugin:{marketplace}:{pluginName}
        const parts = t.id.split(':')
        if (parts.length >= 3) {
          localPath = path.join(claudeDir, 'plugins', 'cache', parts[1], parts[2])
        }
      }
      return {
        ...t,
        // camelCase 别名（DB 返回 snake_case，前端统一用 camelCase）
        sourceType:         t.source_type,
        sourceUrl:          t.source_url,
        installedAt:        t.installed_at,
        updatedAt:          t.updated_at,
        securityScanResult: t.security_scan_result,
        localPath,
        // 使用统计（来自 tool_invocations 聚合）
        useCount:         statsMap[t.name]?.useCount   ?? 0,
        lastUsedAt:       statsMap[t.name]?.lastUsedAt ?? null,
        allTimeUseCount:  allTimeMap[t.name]?.useCount  ?? 0,
      }
    })
    res.json(result)
  })

  // --- MCP Server 列表 ---
  router.get('/api/mcp-servers', (req, res) => {
    const claudeDir = getClaudeDir()
    const configPaths = [
      path.join(claudeDir, 'settings.json'),
      path.join(claudeDir, 'settings.local.json'),
      path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
    ]

    // 1. 从配置文件读已声明的 MCP
    const declared = {}
    for (const p of configPaths) {
      try {
        const cfg = JSON.parse(fs.readFileSync(p, 'utf8'))
        for (const [name, info] of Object.entries(cfg.mcpServers ?? {})) {
          declared[name] = { name, source: 'config', command: info.command ?? null,
            url: info.url ?? null, status: 'configured' }
        }
      } catch {}
    }

    // 2. 从 tool_invocations 推断历史使用过的 MCP（mcp__{server}__{tool} 格式）
    const db = getDb()
    const mcpRows = db.prepare(`
      SELECT DISTINCT tool_name FROM tool_invocations WHERE tool_name GLOB 'mcp__*'
    `).all()
    const usedServers = {}
    for (const { tool_name } of mcpRows) {
      const parts = tool_name.split('__')
      if (parts.length >= 3) {
        const serverName = parts[1]
        if (!usedServers[serverName]) usedServers[serverName] = []
        usedServers[serverName].push(parts.slice(2).join('__'))
      }
    }

    // 3. 从 auth cache 读 claude.ai 托管 MCP
    const authCachePath = path.join(claudeDir, 'mcp-needs-auth-cache.json')
    const authMcp = {}
    try {
      const cache = JSON.parse(fs.readFileSync(authCachePath, 'utf8'))
      for (const name of Object.keys(cache)) {
        authMcp[name] = { name, source: 'claude.ai', status: 'hosted' }
      }
    } catch {}

    // 合并：配置 > 使用记录 > auth cache
    const result = []
    const seen = new Set()

    for (const [name, info] of Object.entries(declared)) {
      seen.add(name)
      result.push({ ...info, tools: usedServers[name] ?? [], invocations: (usedServers[name] ?? []).length })
    }
    for (const [serverName, tools] of Object.entries(usedServers)) {
      if (seen.has(serverName)) continue
      seen.add(serverName)
      result.push({ name: serverName, source: 'history', command: null, url: null,
        status: 'used', tools, invocations: tools.length })
    }
    for (const [name, info] of Object.entries(authMcp)) {
      if (seen.has(name)) continue
      seen.add(name)
      result.push({ ...info, tools: [], invocations: 0 })
    }

    res.json(result)
  })

  // --- 配置（主题持久化）---
  // GET /api/config — 注意：必须在 DELETE /api/tools/:name 之前注册，避免路由冲突
  router.get('/api/config', (req, res) => {
    const configPath = getConfigPath()
    if (!fs.existsSync(configPath)) return res.json({})
    try {
      res.json(JSON.parse(fs.readFileSync(configPath, 'utf8')))
    } catch {
      res.json({})
    }
  })

  router.post('/api/config', (req, res) => {
    const configPath = getConfigPath()
    const appDir = getAppDir()
    if (!fs.existsSync(appDir)) fs.mkdirSync(appDir, { recursive: true })
    let current = {}
    if (fs.existsSync(configPath)) {
      try { current = JSON.parse(fs.readFileSync(configPath, 'utf8')) } catch {}
    }
    const updated = { ...current, ...req.body }
    fs.writeFileSync(configPath, JSON.stringify(updated, null, 2))
    res.json({ ok: true })
  })

  // --- P1：海报称呼提取 ---
  router.get('/api/poster/nickname', (req, res) => {
    res.json({ nickname: extractNickname() })
  })

  // --- P2：海报文案规则生成 ---
  router.get('/api/poster/generate-text', (req, res) => {
    const after    = rangeToAfter(req.query.range ?? '7d')
    const nickname = extractNickname()

    // 收集文案生成所需的基础数据
    const overview = {
      sessions:            getSessionCount({ after }),
      totalDurationSec:    getTotalDurationSec({ after }),
      avgDailyDurationSec: getAvgDailyDurationSec({ after }),
      peakPeriod:          getPeakPeriod({ after }),
      silentDays:          getSilentDays(),
    }

    // 提取 habit 类型（复用 buildInsights 同款逻辑）
    const dist = get24hDistribution({ after })
    let habit = null
    if (dist.length > 0) {
      const total       = dist.reduce((s, r) => s + r.count, 0)
      const nightCount  = dist.filter(r => parseInt(r.hour) >= 20).reduce((s, r) => s + r.count, 0)
      const morningCount= dist.filter(r => parseInt(r.hour) >= 6 && parseInt(r.hour) < 10).reduce((s, r) => s + r.count, 0)
      const workCount   = dist.filter(r => parseInt(r.hour) >= 9 && parseInt(r.hour) < 18).reduce((s, r) => s + r.count, 0)
      if (total > 0) {
        if      (nightCount   / total > 0.5) habit = 'night'
        else if (morningCount / total > 0.3) habit = 'morning'
        else if (workCount    / total > 0.5) habit = 'work'
      }
    }

    // 最常用 skill 名称
    const usageStats = getToolUsageStats({ after })
    const topSkill   = usageStats[0]?.toolName ?? null

    // 与上期对比趋势
    const periodMs  = Date.now() - after
    const prevAfter = after > 0 ? after - periodMs : null
    let trendChange = null
    if (prevAfter !== null) {
      const curr = getSessionCount({ after })
      const prev = getSessionCount({ after: prevAfter })
      if (prev > 0) trendChange = Math.round((curr - prev) / prev * 100)
    }

    const seed = parseInt(req.query.seed ?? '0', 10) || 0
    res.json(generatePosterText({
      ...overview,
      habit,
      topSkill,
      trendChange,
      nickname,
      seed,
    }))
  })

  // --- P3：海报数据聚合（一次请求返回海报所需全部数据）---
  router.get('/api/poster/data', (req, res) => {
    const range = req.query.range ?? '7d'
    const after = rangeToAfter(range)

    // 基础指标
    const sessions            = getSessionCount({ after })
    const totalDurationSec    = getTotalDurationSec({ after })
    const avgDailyDurationSec = getAvgDailyDurationSec({ after })
    const peakPeriod          = getPeakPeriod({ after })
    const silentDays          = getSilentDays()

    // 图表数据
    const heatmap      = getHeatmapData({ after })
    const distribution = get24hDistribution({ after })

    // habit 类型
    let habit = null
    const total        = distribution.reduce((s, r) => s + r.count, 0)
    const nightCount   = distribution.filter(r => parseInt(r.hour) >= 20).reduce((s, r) => s + r.count, 0)
    const morningCount = distribution.filter(r => parseInt(r.hour) >= 6 && parseInt(r.hour) < 10).reduce((s, r) => s + r.count, 0)
    const workCount    = distribution.filter(r => parseInt(r.hour) >= 9 && parseInt(r.hour) < 18).reduce((s, r) => s + r.count, 0)
    if (total > 0) {
      if      (nightCount   / total > 0.5) habit = 'night'
      else if (morningCount / total > 0.3) habit = 'morning'
      else if (workCount    / total > 0.5) habit = 'work'
    }

    // top skill 名称
    const usageStats = getToolUsageStats({ after })
    const topSkillName = usageStats[0]?.toolName ?? null

    // 使用趋势
    const periodMs  = Date.now() - after
    const prevAfter = after > 0 ? after - periodMs : null
    let trendChange = null
    if (prevAfter !== null) {
      const prev = getSessionCount({ after: prevAfter })
      if (prev > 0) trendChange = Math.round((sessions - prev) / prev * 100)
    }

    // 称呼 & 生成文案
    const nickname = extractNickname()
    const seed = parseInt(req.query.seed ?? '0', 10) || 0
    const { summary, tags, summaryCount } = generatePosterText({
      sessions, totalDurationSec, avgDailyDurationSec,
      peakPeriod, silentDays, habit,
      topSkill: topSkillName, trendChange, nickname, seed,
    })

    res.json({
      range,
      nickname,
      summary,
      summaryCount,
      tags,
      metrics: {
        sessions,
        totalDurationSec,
        avgDailyDurationSec,
        peakPeriod,
        silentDays,
        topSkillName,
      },
      heatmap,
      distribution,
    })
  })

  // --- 批量清理吃灰工具（必须在 /:name 之前注册）---
  router.delete('/api/tools/bulk-dust', async (req, res) => {
    const after = rangeToAfter(req.query.range ?? '7d')
    const dustNames = getDustToolNames({ after })
    const deleted = []
    for (const name of dustNames) {
      // 尝试物理删除（skill 和 agent 都在 skills/ 目录）
      for (const subdir of ['skills', 'plugins']) {
        const target = path.join(getClaudeDir(), subdir, name)
        if (fs.existsSync(target)) {
          try { fs.rmSync(target, { recursive: true, force: true }) } catch {}
        }
      }
      deleteTool(name)
      deleted.push(name)
    }
    res.json({ deleted: deleted.length, names: deleted })
  })

  // --- Plugin 子技能调用明细 ---
  router.get('/api/tools/:name/subskills', (req, res) => {
    const after = rangeToAfter(req.query.range ?? '7d')
    res.json(getPluginSubskillStats({ name: req.params.name, after }))
  })

  // --- 单条删除（必须在 bulk-dust 之后注册）---
  router.delete('/api/tools/:name', async (req, res) => {
    const { name } = req.params
    const { type } = req.query

    let targetPath
    try {
      targetPath = validateToolPath(name, type)
    } catch (err) {
      return res.status(400).json({ error: err.message })
    }

    if (fs.existsSync(targetPath)) {
      try {
        fs.rmSync(targetPath, { recursive: true, force: true })
      } catch (err) {
        return res.status(500).json({ error: `删除文件失败: ${err.message}` })
      }
    }

    deleteTool(name)
    res.json({ ok: true, deleted: targetPath })
  })

  return router
}

// 动态生成 Insights，有数据才输出对应条目
function buildInsights({ after }) {
  const insights = []

  // 最高产的一天
  const heatmap = getHeatmapData({ after })
  if (heatmap.length > 0) {
    const best = heatmap.reduce((a, b) => b.count > a.count ? b : a)
    if (best.count >= 2) {
      insights.push({ type: 'best_day', day: best.day, count: best.count })
    }
  }

  // 当前静默期
  const silentDays = getSilentDays()
  if (silentDays >= 2) {
    insights.push({ type: 'silent_days', days: silentDays })
  }

  // 时间习惯：总是取占比最高的时段（无门槛保底）
  const dist = get24hDistribution({ after })
  if (dist.length > 0) {
    const total = dist.reduce((s, r) => s + r.count, 0)
    if (total > 0) {
      const nightCount   = dist.filter(r => parseInt(r.hour) >= 20).reduce((s, r) => s + r.count, 0)
      const morningCount = dist.filter(r => parseInt(r.hour) >= 6 && parseInt(r.hour) < 10).reduce((s, r) => s + r.count, 0)
      const workCount    = dist.filter(r => parseInt(r.hour) >= 9 && parseInt(r.hour) < 18).reduce((s, r) => s + r.count, 0)
      if (nightCount >= morningCount && nightCount >= workCount) {
        insights.push({ type: 'habit', label: '夜猫子', pct: Math.round(nightCount / total * 100) })
      } else if (morningCount >= workCount) {
        insights.push({ type: 'habit', label: '早鸟', pct: Math.round(morningCount / total * 100) })
      } else {
        insights.push({ type: 'habit', label: '上班族', pct: Math.round(workCount / total * 100) })
      }
    }
  }

  // 使用趋势（本期 vs 上期），all 范围无法比较，跳过
  if (after > 0) {
    const periodMs = Date.now() - after
    const prevAfter = after - periodMs
    const currCount = getSessionCount({ after })
    const prevCount = getSessionCount({ after: prevAfter })
    if (prevCount > 0) {
      const change = Math.round((currCount - prevCount) / prevCount * 100)
      if (Math.abs(change) >= 10) {
        insights.push({ type: 'trend', change })
      }
    }
  }

  // 话题洞察：top 话题占比 + 最高频关键词
  const topicRows = getTopicsOverview({ after })
  if (topicRows.length > 0) {
    const top = topicRows[0]
    const second = topicRows[1]
    if (second) {
      const ratio = Math.round(top.pct / second.pct * 10) / 10
      if (ratio >= 1.5) {
        insights.push({ type: 'topic_dominant', topic: top.topic, pct: top.pct, ratio })
      }
    } else {
      insights.push({ type: 'topic_dominant', topic: top.topic, pct: top.pct, ratio: null })
    }
  }

  const kwRows = getTopicKeywords({ after })
  if (kwRows.length > 0) {
    insights.push({ type: 'topic_keyword', word: kwRows[0].word, count: kwRows[0].count })
  }

  // 兜底：不足 3 条时补充日均时长
  if (insights.length < 3) {
    const avgSec = getAvgDailyDurationSec({ after })
    if (avgSec > 0) {
      insights.push({ type: 'avg_daily', avgSec })
    }
  }

  return insights
}
