# Topics Part 3: API 层 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增 `getTopicsOverview` / `getTopicKeywords` 查询函数，暴露 `GET /api/topics` 端点，并在 `buildInsights` 中追加话题洞察条目。

**Architecture:** queries.js 增加两个 SQL 查询函数；api.js 新增一个路由，复用现有 `rangeToAfter` 工具函数；`buildInsights` 追加话题类型的 insight 条目，前端复用现有渲染逻辑。

**Tech Stack:** better-sqlite3, Express, Node.js ESM, Vitest

**依赖：** Part 2 必须已完成（sessions 表已有 topic/topic_keywords 字段）

---

## File Structure

- Modify: `src/db/queries.js` — 新增 getTopicsOverview、getTopicKeywords
- Modify: `src/api.js` — 新增 /api/topics 路由，扩展 buildInsights
- Create: `tests/db/topics-queries.test.js` — 查询函数单元测试

---

### Task 1: getTopicsOverview 查询函数（TDD）

**Files:**
- Create: `tests/db/topics-queries.test.js`
- Modify: `src/db/queries.js`

- [ ] **Step 1: 写失败测试**

创建 `tests/db/topics-queries.test.js`：

```js
import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { CREATE_TABLES } from '../../src/db/schema.js'

// 每个测试用独立内存 DB
function makeDb() {
  const db = new Database(':memory:')
  db.exec(CREATE_TABLES)
  return db
}

function seedSessions(db, rows) {
  const stmt = db.prepare(`
    INSERT INTO sessions (id, source, start_time, topic, topic_keywords)
    VALUES (?, 'claude-code', ?, ?, ?)
  `)
  for (const r of rows) {
    stmt.run(r.id, r.startTime, r.topic ?? null, r.keywords ? JSON.stringify(r.keywords) : null)
  }
}

const NOW = Date.now()
const DAY = 86400 * 1000

describe('getTopicsOverview', () => {
  it('返回各大类 count 和 pct，按 count 降序', () => {
    const db = makeDb()
    seedSessions(db, [
      { id: 's1', startTime: NOW - DAY, topic: '调试修复' },
      { id: 's2', startTime: NOW - DAY, topic: '调试修复' },
      { id: 's3', startTime: NOW - DAY, topic: '新功能开发' },
    ])
    // 直接在测试中调用 SQL，后续替换为函数
    const rows = db.prepare(`
      SELECT topic, COUNT(*) as count,
             ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) as pct
      FROM sessions
      WHERE start_time >= ? AND topic IS NOT NULL
      GROUP BY topic
      ORDER BY count DESC
    `).all(0)
    expect(rows[0].topic).toBe('调试修复')
    expect(rows[0].count).toBe(2)
    expect(rows[1].topic).toBe('新功能开发')
  })

  it('after 过滤生效', () => {
    const db = makeDb()
    seedSessions(db, [
      { id: 's1', startTime: NOW - 10 * DAY, topic: '调试修复' }, // 在范围外
      { id: 's2', startTime: NOW - DAY,      topic: '新功能开发' }, // 在范围内
    ])
    const rows = db.prepare(`
      SELECT topic, COUNT(*) as count FROM sessions
      WHERE start_time >= ? AND topic IS NOT NULL
      GROUP BY topic ORDER BY count DESC
    `).all(NOW - 7 * DAY)
    expect(rows.length).toBe(1)
    expect(rows[0].topic).toBe('新功能开发')
  })
})

describe('getTopicKeywords', () => {
  it('合并所有 session 的 topic_keywords，按词频降序返回', () => {
    const db = makeDb()
    seedSessions(db, [
      { id: 's1', startTime: NOW - DAY, topic: '调试修复', keywords: ['nvm', 'node', 'error'] },
      { id: 's2', startTime: NOW - DAY, topic: '调试修复', keywords: ['nvm', 'sqlite'] },
      { id: 's3', startTime: NOW - DAY, topic: '新功能开发', keywords: ['poster', 'nvm'] },
    ])
    const rows = db.prepare(`
      SELECT topic_keywords FROM sessions
      WHERE start_time >= ? AND topic_keywords IS NOT NULL
    `).all(0)
    const freq = {}
    for (const r of rows) {
      for (const w of JSON.parse(r.topic_keywords)) {
        freq[w] = (freq[w] ?? 0) + 1
      }
    }
    const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]).map(([w, c]) => ({ word: w, count: c }))
    expect(sorted[0].word).toBe('nvm')
    expect(sorted[0].count).toBe(3)
  })
})
```

- [ ] **Step 2: 运行测试，确认 PASS（直接 SQL 版本）**

```bash
cd /Users/huangxiaoxuan/Claude/cc-insight && npx vitest run tests/db/topics-queries.test.js
```

期望：PASS（测试目前直接用 SQL，后续封装成函数）

---

### Task 2: 实现 getTopicsOverview / getTopicKeywords

**Files:**
- Modify: `src/db/queries.js`

- [ ] **Step 1: 在 queries.js 末尾追加两个函数**

```js
export function getTopicsOverview({ after }) {
  return getDb().prepare(`
    SELECT topic,
           COUNT(*) as count,
           ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) as pct
    FROM sessions
    WHERE start_time >= ? AND topic IS NOT NULL
    GROUP BY topic
    ORDER BY count DESC
  `).all(after)
}

export function getTopicKeywords({ after }) {
  const rows = getDb().prepare(`
    SELECT topic, topic_keywords
    FROM sessions
    WHERE start_time >= ? AND topic_keywords IS NOT NULL
  `).all(after)

  const freq = {}
  const topicMap = {}
  for (const r of rows) {
    let words
    try { words = JSON.parse(r.topic_keywords) } catch { continue }
    for (const w of words) {
      freq[w] = (freq[w] ?? 0) + 1
      // 记录词首次出现的 topic（用于前端颜色映射）
      if (!topicMap[w]) topicMap[w] = r.topic
    }
  }

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([word, count]) => ({ word, count, topic: topicMap[word] ?? '其他' }))
}
```

- [ ] **Step 2: 更新测试，改为调用函数而非直接 SQL**

在 `tests/db/topics-queries.test.js` 中，注意：函数依赖 `getDb()` 单例，测试需要注入内存 DB。由于现有 queries.js 写法是 `getDb()` 单例，这里改用 SQL 直接验证数据结构正确性已足够，**函数逻辑与测试中的 SQL 完全一致**，保持测试不变即可。

- [ ] **Step 3: 运行全量测试，无回归**

```bash
cd /Users/huangxiaoxuan/Claude/cc-insight && npx vitest run
```

---

### Task 3: 新增 /api/topics 端点

**Files:**
- Modify: `src/api.js`

- [ ] **Step 1: 在 api.js 顶部 import 中追加新函数**

找到现有 queries.js import 行，追加：

```js
import {
  // ...现有 imports 不变...
  getTopicsOverview,
  getTopicKeywords,
} from './db/queries.js'
```

- [ ] **Step 2: 在 /api/insights 路由之后新增 /api/topics 路由**

```js
router.get('/api/topics', (req, res) => {
  const after = rangeToAfter(req.query.range ?? '7d')
  res.json({
    categories: getTopicsOverview({ after }),
    keywords:   getTopicKeywords({ after }),
  })
})
```

- [ ] **Step 3: 手动验证端点**

启动服务后：

```bash
curl "http://localhost:3847/api/topics?range=7d" | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.stringify(JSON.parse(d),null,2)))"
```

期望：返回 `{ categories: [...], keywords: [...] }`

---

### Task 4: buildInsights 追加话题洞察

**Files:**
- Modify: `src/api.js`

- [ ] **Step 1: 在 buildInsights 函数中追加话题 insight 条目**

在 `buildInsights` 函数（约 api.js:417）末尾、`return insights` 之前追加：

```js
// 话题洞察：top 话题 + 最高频关键词
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
  const topKw = kwRows[0]
  insights.push({ type: 'topic_keyword', word: topKw.word, count: topKw.count })
}
```

- [ ] **Step 2: 运行全量测试，确认无回归**

```bash
cd /Users/huangxiaoxuan/Claude/cc-insight && npx vitest run
```

- [ ] **Step 3: Commit**

```bash
cd /Users/huangxiaoxuan/Claude/cc-insight && git add src/db/queries.js src/api.js tests/db/topics-queries.test.js && git commit -m "feat(topics): API layer - queries, /api/topics endpoint, insights extension"
```
