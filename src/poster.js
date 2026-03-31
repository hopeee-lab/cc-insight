// src/poster.js — 海报相关业务逻辑

import fs from 'fs'
import path from 'path'
import os from 'os'
import { getClaudeDir, getConfigPath } from './config.js'

// ── P1：称呼提取 ──────────────────────────────────────────────

/**
 * 从本地 md 文件中提取用户称呼。
 * 优先级：config.json > CLAUDE.md > memory/*.md > 空字符串
 */
export function extractNickname() {
  // 1. 优先读持久化配置
  const saved = readSavedNickname()
  if (saved) return saved

  // 2. 扫描 CLAUDE.md
  const claudeMd = path.join(getClaudeDir(), 'CLAUDE.md')
  const fromClaude = extractFromFile(claudeMd)
  if (fromClaude) return fromClaude

  // 3. 扫描 memory 目录下所有 .md 文件
  const memoryDirs = findMemoryDirs()
  for (const dir of memoryDirs) {
    try {
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.md'))
      for (const file of files) {
        const found = extractFromFile(path.join(dir, file))
        if (found) return found
      }
    } catch {}
  }

  return ''
}

/** 从 config.json 读取已保存的 posterNickname */
function readSavedNickname() {
  try {
    const cfg = JSON.parse(fs.readFileSync(getConfigPath(), 'utf8'))
    return cfg.posterNickname ?? ''
  } catch {
    return ''
  }
}

/** 在单个 md 文件中用正则提取称呼 */
function extractFromFile(filePath) {
  let text
  try {
    text = fs.readFileSync(filePath, 'utf8')
  } catch {
    return ''
  }

  // 按优先级逐条匹配，取第一个命中
  const patterns = [
    // 中文：叫我 Halo、称呼我为 Halo、称呼我 Halo
    /(?:叫我|称呼我为?)\s*[：:]?\s*([A-Za-z\u4e00-\u9fa5]{1,10})/,
    // 中文：称呼：Halo、昵称：Halo
    /(?:称呼|昵称)\s*[：:]\s*([A-Za-z\u4e00-\u9fa5]{1,10})/,
    // 英文：call me Halo、nickname: Halo
    /(?:call me|nickname)\s*[：:\s]\s*([A-Za-z]{1,10})/i,
    // 通用格式：posterNickname: Halo（手动写在 md 里）
    /posterNickname\s*[：:]\s*([A-Za-z\u4e00-\u9fa5]{1,10})/i,
  ]

  for (const re of patterns) {
    const m = text.match(re)
    if (m?.[1]?.trim()) return m[1].trim()
  }
  return ''
}

/** 查找 ~/.claude/projects/ 下所有 memory 子目录 */
function findMemoryDirs() {
  const projectsDir = path.join(getClaudeDir(), 'projects')
  const dirs = []
  try {
    for (const proj of fs.readdirSync(projectsDir)) {
      const memDir = path.join(projectsDir, proj, 'memory')
      if (fs.existsSync(memDir)) dirs.push(memDir)
    }
  } catch {}
  return dirs
}

// ── P2：文案规则生成 ──────────────────────────────────────────

/**
 * 根据使用数据生成海报文案。
 * @param {object} data
 *   sessions          - 对话次数
 *   totalDurationSec  - 累计时长（秒）
 *   avgDailyDurationSec - 日均时长（秒）
 *   peakPeriod        - 活跃时段，如 "22:00–23:59"
 *   silentDays        - 静默天数
 *   habit             - 'night'|'morning'|'work'|null
 *   topSkill          - 最常用 skill 名称，如 "superpowers" / null
 *   trendChange       - 与上期相比变化百分比，如 +30 / -20 / null
 *   nickname          - 用户称呼，可空
 * @returns {{ summary: string, tags: string[] }}
 */
export function generatePosterText({
  sessions = 0,
  totalDurationSec = 0,
  avgDailyDurationSec = 0,
  peakPeriod = null,
  silentDays = 0,
  habit = null,
  topSkill = null,
  trendChange = null,
  nickname = '',
  seed = 0,   // 用于切换 summary 变体，0 = 默认
}) {
  const totalHours = Math.round(totalDurationSec / 3600)
  const avgMin     = Math.round(avgDailyDurationSec / 60)
  const name       = nickname || ''

  const summaries = buildAllSummaries({ sessions, totalHours, avgMin, habit, silentDays, trendChange, topSkill, name })
  const summary   = summaries[seed % summaries.length] ?? summaries[0]
  const tags      = buildTags({ habit, sessions, avgMin, topSkill, trendChange })

  return { summary, tags, summaryCount: summaries.length }
}

// ── 一句话总结 ────────────────────────────────────────────────

/** 收集所有匹配当前数据的 summary 变体，返回数组（至少 1 条） */
function buildAllSummaries({ sessions, totalHours, avgMin, habit, silentDays, trendChange, topSkill, name }) {
  const h    = totalHours
  const s    = sessions
  const n    = () => name || 'You'
  const poss = () => name ? `${name}'s` : 'Your'
  const v    = (third, second = null) => name ? third : (second ?? third)

  const variants = []

  // 极高强度
  if (h >= 100 && habit === 'night') {
    variants.push(`${h}h of late-night conversations — ${n()} and Claude don't sleep.`)
  }
  if (h >= 100) {
    variants.push(`${h} hours in. ${poss()} workflow has been permanently upgraded.`)
  }

  // 夜猫子
  if (habit === 'night' && s >= 20) {
    variants.push(`The best ideas happen after midnight. ${n()} ${v('has','have')} ${s} sessions to prove it.`)
    variants.push(`${s} sessions — most of them after the rest of the world logged off.`)
  }
  if (habit === 'night') {
    variants.push(`Night mode: on. ${poss()} best thinking happens after dark.`)
    variants.push(`While everyone else sleeps, ${n()} ${v('ships','ship')}.`)
  }

  // 早鸟
  if (habit === 'morning' && s >= 20) {
    variants.push(`${n()} ${v('starts','start')} every morning with coffee, code, and Claude.`)
    variants.push(`${s} sessions, most of them before 10am. ${n()} ${v("doesn't","don't")} waste mornings.`)
  }
  if (habit === 'morning') {
    variants.push(`Early bird gets the context window. ${n()} ${v('is','are')} up before the sun.`)
    variants.push(`Morning person. ${poss()} AI workflow starts before the inbox does.`)
  }

  // 上涨趋势
  if (trendChange !== null && trendChange >= 50) {
    variants.push(`Usage up ${trendChange}% this period. ${n()} just discovered what Claude can really do.`)
    variants.push(`+${trendChange}% and climbing. ${poss()} AI usage is compounding.`)
  }
  if (trendChange !== null && trendChange >= 20) {
    variants.push(`${poss()} Claude usage is trending up ${trendChange}%. Momentum is real.`)
    variants.push(`${trendChange}% more sessions than last period. The habit is forming.`)
  }

  // 高日均
  if (avgMin >= 60) {
    variants.push(`${avgMin} min/day, every day. For ${n()}, AI isn't a tool — it's a habit.`)
    variants.push(`${avgMin} minutes a day with Claude. That's not a tool, that's a routine.`)
  }
  if (avgMin >= 30) {
    variants.push(`${n()} ${v('spends','spend')} ${avgMin} min/day with Claude. That's ${Math.round(avgMin * 30 / 60)}h a month of compound intelligence.`)
    variants.push(`${avgMin} min/day. ${poss()} AI time is an investment, not a cost.`)
  }

  // 高频使用
  if (s >= 100) {
    variants.push(`${s} conversations and counting. ${n()} and Claude are practically colleagues.`)
    variants.push(`${s} sessions. At this point, Claude ${v('knows','know')} ${n()} better than most.`)
  }
  if (s >= 50) {
    variants.push(`${s} sessions in. ${n()} ${v('has','have')} found their AI workflow.`)
    variants.push(`${s} conversations deep. ${n()} ${v("doesn't","don't")} remember how they worked before.`)
  }

  // 静默后回来
  if (silentDays >= 7 && s >= 5) {
    variants.push(`Back after ${silentDays} days away. ${n()} missed this.`)
    variants.push(`${silentDays} days offline, then ${s} sessions in one burst. The pull is real.`)
  }

  // top skill
  if (topSkill) {
    variants.push(`${poss()} most-used skill: ${topSkill}. The automation era is personal.`)
    variants.push(`${topSkill} on repeat. ${n()} ${v('knows','know')} what works.`)
  }

  // 兜底（总是加入）
  if (s > 0) {
    variants.push(`${s} sessions, ${h > 0 ? h + 'h' : 'counting'}. ${poss()} AI journey has begun.`)
  }
  variants.push(`${n()} ${v('is','are')} just getting started. The best sessions are ahead.`)

  return variants
}

// ── AI 人格标签 ───────────────────────────────────────────────

function buildTags({ habit, sessions, avgMin, topSkill, trendChange }) {
  const tags = []

  // 标签1：时间习惯
  if (habit === 'night')       tags.push('🌙 Night Coder')
  else if (habit === 'morning') tags.push('🌅 Early Bird Builder')
  else                          tags.push('⏰ 9-to-5 Hacker')

  // 标签2：使用强度
  if (sessions >= 100 || avgMin >= 60)      tags.push('🚀 Power User')
  else if (sessions >= 30 || avgMin >= 30)  tags.push('⚡ Daily Driver')
  else                                       tags.push('🌱 Growing Fast')

  // 标签3：技能偏好 / 趋势
  if (trendChange !== null && trendChange >= 30) {
    tags.push('📈 On The Rise')
  } else if (topSkill) {
    const skillTag = skillToTag(topSkill)
    if (skillTag) tags.push(skillTag)
    else          tags.push('🔧 Tool Builder')
  } else {
    tags.push('🤖 AI Native')
  }

  return tags.slice(0, 3)
}

/** 将 skill 名称映射为人格标签 */
function skillToTag(skillName) {
  const name = skillName.toLowerCase()
  if (name.includes('data') || name.includes('sql') || name.includes('analyst'))
    return '📊 Data Whisperer'
  if (name.includes('agent') || name.includes('browser') || name.includes('auto'))
    return '⚡ Automation Hacker'
  if (name.includes('frontend') || name.includes('design') || name.includes('ui'))
    return '🎨 Frontend Crafter'
  if (name.includes('superpowers') || name.includes('brainstorm') || name.includes('plan'))
    return '🧠 Strategic Thinker'
  if (name.includes('marketing') || name.includes('content') || name.includes('xhs'))
    return '✍️ Content Creator'
  if (name.includes('productivity') || name.includes('task') || name.includes('daily'))
    return '🎯 Deep Focus'
  return null
}
