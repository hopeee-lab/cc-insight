// src/api.js
import fs from 'fs'
import path from 'path'
import { Router } from 'express'
import {
  getSessionCount, getTotalDurationSec, getAvgDailyDurationSec,
  getPeakPeriod, getSilentDays, getHeatmapData, get24hDistribution,
  getInvocationsByTool, getAllTools, getToolUsageStats, deleteTool, getDustToolNames
} from './db/queries.js'
import { getConfigPath, getAppDir, getClaudeDir } from './config.js'

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

export function createRouter() {
  const router = Router()

  // 将时间范围字符串转换为 timestamp（毫秒）
  function rangeToAfter(range) {
    const now = Date.now()
    if (range === '7d')  return now - 7  * 86400 * 1000
    if (range === '30d') return now - 30 * 86400 * 1000
    if (range === '90d') return now - 90 * 86400 * 1000
    return 0 // 'all'
  }

  // --- 主题 1：使用概览 ---
  router.get('/api/overview', (req, res) => {
    const after = rangeToAfter(req.query.range ?? '7d')
    res.json({
      sessions:            getSessionCount({ after }),
      totalDurationSec:    getTotalDurationSec({ after }),
      avgDailyDurationSec: getAvgDailyDurationSec({ after }),
      peakPeriod:          getPeakPeriod({ after }),
      silentDays:          getSilentDays({ after }),
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

  router.get('/api/insights', (req, res) => {
    const after = rangeToAfter(req.query.range ?? '7d')
    res.json(buildInsights({ after }))
  })

  // --- 主题 2：Skill & Agent & Plugin ---
  router.get('/api/tools', (req, res) => {
    const after = rangeToAfter(req.query.range ?? '7d')
    const tools = getAllTools()
    const usageStats = getToolUsageStats({ after })
    const statsMap = Object.fromEntries(usageStats.map(s => [s.toolName, s]))
    const result = tools.map(t => ({
      ...t,
      // camelCase 别名（DB 返回 snake_case，前端统一用 camelCase）
      sourceType:         t.source_type,
      sourceUrl:          t.source_url,
      installedAt:        t.installed_at,
      updatedAt:          t.updated_at,
      securityScanResult: t.security_scan_result,
      // 使用统计（来自 tool_invocations 聚合）
      useCount:   statsMap[t.name]?.useCount   ?? 0,
      lastUsedAt: statsMap[t.name]?.lastUsedAt ?? null,
    }))
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

  // --- 批量清理吃灰工具（必须在 /:name 之前注册）---
  router.delete('/api/tools/bulk-dust', async (req, res) => {
    const after = rangeToAfter(req.query.range ?? '7d')
    const dustNames = getDustToolNames({ after })
    for (const name of dustNames) {
      deleteTool(name)
    }
    res.json({ deleted: dustNames.length, names: dustNames })
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
    if (best.count >= 3) {
      insights.push({ type: 'best_day', day: best.day, count: best.count })
    }
  }

  // 最长静默期
  const silentDays = getSilentDays({ after })
  if (silentDays >= 2) {
    insights.push({ type: 'silent_days', days: silentDays })
  }

  // 时间习惯（夜猫子/早鸟/上班族）
  const dist = get24hDistribution({ after })
  if (dist.length > 0) {
    const total = dist.reduce((s, r) => s + r.count, 0)
    const nightCount   = dist.filter(r => parseInt(r.hour) >= 20).reduce((s, r) => s + r.count, 0)
    const morningCount = dist.filter(r => parseInt(r.hour) >= 6 && parseInt(r.hour) < 10).reduce((s, r) => s + r.count, 0)
    const workCount    = dist.filter(r => parseInt(r.hour) >= 9 && parseInt(r.hour) < 18).reduce((s, r) => s + r.count, 0)
    if (total > 0) {
      if (nightCount / total > 0.5)
        insights.push({ type: 'habit', label: '夜猫子', pct: Math.round(nightCount / total * 100) })
      else if (morningCount / total > 0.3)
        insights.push({ type: 'habit', label: '早鸟', pct: Math.round(morningCount / total * 100) })
      else if (workCount / total > 0.5)
        insights.push({ type: 'habit', label: '上班族', pct: Math.round(workCount / total * 100) })
    }
  }

  // 使用趋势（本期 vs 上期）
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

  return insights
}
