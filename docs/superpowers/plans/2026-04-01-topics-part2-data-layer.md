# Topics Part 2: 数据层 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** DB 迁移新增 topic/topic_keywords 字段；parseJsonlFile 返回用户文本；indexer 在写入 session 时调用分类器。

**Architecture:** schema.js 增加新列定义；db.js 在初始化时执行 ALTER TABLE 迁移兼容旧 DB；jsonl.js 新增提取用户文本逻辑；upsertSession 接收 topic/topic_keywords；indexJsonlFile 调用分类器并传入新字段。

**Tech Stack:** better-sqlite3, Node.js ESM, Vitest

**依赖：** Part 1 必须已完成（src/classifiers/topic-rules.js 存在）

---

## File Structure

- Modify: `src/db/schema.js` — sessions 表新增两列
- Modify: `src/db/db.js` — 初始化后执行 ALTER TABLE 迁移
- Modify: `src/parsers/jsonl.js` — 新增 firstUserMessage、allUserText 返回字段
- Modify: `src/db/queries.js` — upsertSession 接收 topic、topic_keywords
- Modify: `src/indexer.js` — indexJsonlFile 调用分类器
- Modify: `tests/parsers/` — 更新 jsonl 解析器测试
- Create: `tests/db/topics-data.test.js` — upsertSession 新字段测试

---

### Task 1: schema.js 新增字段

**Files:**
- Modify: `src/db/schema.js`

- [ ] **Step 1: 在 sessions 表定义中新增两列**

在 `src/db/schema.js` 的 sessions 表 `jsonl_file TEXT` 行之后加入：

```js
export const CREATE_TABLES = `
  CREATE TABLE IF NOT EXISTS sessions (
    id            TEXT PRIMARY KEY,
    source        TEXT NOT NULL DEFAULT 'claude-code',
    start_time    INTEGER NOT NULL,
    end_time      INTEGER,
    duration_sec  INTEGER,
    project_path  TEXT,
    message_count INTEGER DEFAULT 0,
    tool_use_count INTEGER DEFAULT 0,
    jsonl_file    TEXT,
    topic         TEXT,
    topic_keywords TEXT
  );
  ...（其余不变）
```

> 注意：只改 CREATE TABLE 定义，用于全新安装。旧 DB 迁移在下一个 Task 处理。

---

### Task 2: db.js 执行 ALTER TABLE 迁移

**Files:**
- Modify: `src/db/db.js`

- [ ] **Step 1: 在 getDb() 末尾追加迁移逻辑**

在 `src/db/db.js` 中，找到 `getDb()` 函数中 `_db.exec(CREATE_TABLES)` 这一行之后，追加：

```js
// 迁移：兼容旧 DB，按需新增列
const existingCols = db.prepare('PRAGMA table_info(sessions)').all().map(c => c.name)
if (!existingCols.includes('topic')) {
  db.exec('ALTER TABLE sessions ADD COLUMN topic TEXT')
}
if (!existingCols.includes('topic_keywords')) {
  db.exec('ALTER TABLE sessions ADD COLUMN topic_keywords TEXT')
}
```

- [ ] **Step 3: 验证迁移（手动）**

```bash
cd /Users/huangxiaoxuan/Claude/cc-insight && node -e "
import('./src/db/db.js').then(m => {
  const db = m.getDb()
  const cols = db.prepare('PRAGMA table_info(sessions)').all().map(c => c.name)
  console.log('columns:', cols)
})
"
```

期望输出包含 `topic` 和 `topic_keywords`。

---

### Task 3: parseJsonlFile 新增用户文本提取

**Files:**
- Modify: `src/parsers/jsonl.js`

- [ ] **Step 1: 写失败测试**

在现有解析器测试文件中（`tests/parsers/`，先用 `ls` 确认文件名），追加：

```js
describe('parseJsonlFile - user text fields', () => {
  it('firstUserMessage 返回第一条用户消息文本', () => {
    // 复用现有 fixture 或构造最小 fixture
    const result = parseJsonlFile('tests/parsers/fixtures/sample.jsonl')
    expect(typeof result.firstUserMessage).toBe('string')
  })
  it('allUserText 返回所有用户消息拼接文本', () => {
    const result = parseJsonlFile('tests/parsers/fixtures/sample.jsonl')
    expect(typeof result.allUserText).toBe('string')
    expect(result.allUserText.length).toBeGreaterThanOrEqual(result.firstUserMessage.length)
  })
})
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
cd /Users/huangxiaoxuan/Claude/cc-insight && npx vitest run tests/parsers/ 2>&1 | tail -10
```

- [ ] **Step 3: 修改 parseJsonlFile 提取用户文本**

在 `src/parsers/jsonl.js` 中，找到 `userMsgs` 已有的处理逻辑，在 return 之前新增：

```js
// 提取用户消息文本（排除 tool_result 类型内容）
function extractText(msg) {
  const content = msg.message?.content ?? msg.content ?? ''
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .filter(b => b.type === 'text')
      .map(b => b.text ?? '')
      .join(' ')
  }
  return ''
}

const userTextList = userMsgs.map(r => extractText(r)).filter(Boolean)
const firstUserMessage = userTextList[0] ?? ''
const allUserText = userTextList.join(' ')
```

在 return 对象中新增两个字段：

```js
return {
  sessionId,
  startTime,
  endTime,
  durationSec,
  projectPath,
  messageCount,
  toolUseCount: invocations.length,
  invocations,
  firstUserMessage,   // 新增
  allUserText,        // 新增
}
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
cd /Users/huangxiaoxuan/Claude/cc-insight && npx vitest run tests/parsers/
```

期望：全部 PASS

---

### Task 4: upsertSession 接收 topic / topic_keywords

**Files:**
- Modify: `src/db/queries.js`

- [ ] **Step 1: 写失败测试**

创建 `tests/db/topics-data.test.js`：

```js
import { describe, it, expect, beforeAll } from 'vitest'
import Database from 'better-sqlite3'
import { CREATE_TABLES } from '../../src/db/schema.js'

// 使用内存 DB 隔离测试
function makeDb() {
  const db = new Database(':memory:')
  db.exec(CREATE_TABLES)
  return db
}

describe('upsertSession with topic fields', () => {
  it('写入 topic 和 topic_keywords', () => {
    const db = makeDb()
    db.prepare(`
      INSERT OR REPLACE INTO sessions
        (id, source, start_time, topic, topic_keywords)
      VALUES (?, ?, ?, ?, ?)
    `).run('sess-1', 'claude-code', Date.now(), '调试修复', JSON.stringify(['nvm','node']))

    const row = db.prepare('SELECT topic, topic_keywords FROM sessions WHERE id = ?').get('sess-1')
    expect(row.topic).toBe('调试修复')
    expect(JSON.parse(row.topic_keywords)).toEqual(['nvm', 'node'])
  })

  it('topic 为 null 时不报错', () => {
    const db = makeDb()
    expect(() => {
      db.prepare(`INSERT OR REPLACE INTO sessions (id, source, start_time) VALUES (?, ?, ?)`)
        .run('sess-2', 'claude-code', Date.now())
    }).not.toThrow()
  })
})
```

- [ ] **Step 2: 运行测试，确认通过（schema 已支持，SQL 直接验证）**

```bash
cd /Users/huangxiaoxuan/Claude/cc-insight && npx vitest run tests/db/topics-data.test.js
```

- [ ] **Step 3: 修改 upsertSession 接收新字段**

在 `src/db/queries.js` 中，修改 `upsertSession`：

```js
export function upsertSession({ id, source, startTime, endTime, durationSec,
                                 projectPath, messageCount, toolUseCount, jsonlFile,
                                 topic = null, topicKeywords = null }) {
  getDb().prepare(`
    INSERT OR REPLACE INTO sessions
      (id, source, start_time, end_time, duration_sec, project_path,
       message_count, tool_use_count, jsonl_file, topic, topic_keywords)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, source, startTime, endTime, durationSec, projectPath,
         messageCount, toolUseCount, jsonlFile,
         topic, topicKeywords ? JSON.stringify(topicKeywords) : null)
}
```

---

### Task 5: indexer 调用分类器

**Files:**
- Modify: `src/indexer.js`

- [ ] **Step 1: 新增 import**

在 `src/indexer.js` 顶部 import 区域追加：

```js
import { classifyTopic, extractKeywords } from './classifiers/topic-rules.js'
```

- [ ] **Step 2: 修改 indexJsonlFile 调用分类器**

```js
export async function indexJsonlFile(filePath) {
  const result = parseJsonlFile(filePath)
  if (!result) return

  const topic = classifyTopic(result.firstUserMessage)
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
```

- [ ] **Step 3: 运行现有全量测试，确认无回归**

```bash
cd /Users/huangxiaoxuan/Claude/cc-insight && npx vitest run
```

期望：全部 PASS，无新增失败

- [ ] **Step 4: Commit**

```bash
cd /Users/huangxiaoxuan/Claude/cc-insight && git add src/db/schema.js src/db/db.js src/parsers/jsonl.js src/db/queries.js src/indexer.js tests/db/topics-data.test.js && git commit -m "feat(topics): data layer - schema migration, parser, indexer integration"
```
