# CC Insight Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local CLI tool that reads `~/.claude/` data, indexes it into SQLite, and serves a real-time browser dashboard showing Claude Code usage stats and skill management.

**Architecture:** Node.js CLI → SQLite index (better-sqlite3) → Express HTTP server + WebSocket → Vanilla JS browser dashboard. First run does full scan with progress bar; subsequent runs are instant via incremental updates. `chokidar` watches for file changes and pushes updates via WebSocket.

**Tech Stack:** Node.js 20+, better-sqlite3, express, ws, chokidar, open

---

## Part 1: Project Initialization

### Task 1.1: Create directory structure

**Files:**
- Create: `package.json`
- Create: `bin/cc-insight.js`
- Create: `src/config.js`
- Create: `src/db/schema.js`
- Create: `src/db/db.js`
- Create: `src/db/queries.js`
- Create: `src/parsers/jsonl.js`
- Create: `src/parsers/skill-md.js`
- Create: `src/parsers/security.js`
- Create: `src/indexer.js`
- Create: `src/watcher.js`
- Create: `src/server.js`
- Create: `src/api.js`
- Create: `public/index.html`
- Create: `public/js/app.js`
- Create: `public/js/theme.js`
- Create: `public/js/overview.js`
- Create: `public/js/skills.js`
- Create: `public/js/heatmap.js`
- Create: `public/js/charts.js`
- Create: `public/js/insights.js`
- Create: `tests/parsers/jsonl.test.js`
- Create: `tests/parsers/skill-md.test.js`
- Create: `tests/parsers/security.test.js`
- Create: `tests/db/queries.test.js`

- [ ] **Step 1: Create all directories**

```bash
cd /Users/huangxiaoxuan/Claude/cc-insight
mkdir -p bin src/db src/parsers public/js tests/parsers tests/db
```

Expected: no output, directories created.

- [ ] **Step 2: Create placeholder files so the tree is visible**

```bash
touch bin/cc-insight.js \
  src/config.js src/indexer.js src/watcher.js src/server.js src/api.js \
  src/db/schema.js src/db/db.js src/db/queries.js \
  src/parsers/jsonl.js src/parsers/skill-md.js src/parsers/security.js \
  public/index.html \
  public/js/app.js public/js/theme.js public/js/overview.js \
  public/js/skills.js public/js/heatmap.js public/js/charts.js public/js/insights.js \
  tests/parsers/jsonl.test.js tests/parsers/skill-md.test.js \
  tests/parsers/security.test.js tests/db/queries.test.js
```

- [ ] **Step 3: Verify tree**

```bash
find /Users/huangxiaoxuan/Claude/cc-insight -not -path "*/docs/*" -not -path "*/.superpowers/*" | sort
```

Expected output includes all files listed above.

---

### Task 1.2: Write package.json

**Files:**
- Write: `package.json`

- [ ] **Step 1: Write package.json**

```json
{
  "name": "cc-insight",
  "version": "0.1.0",
  "description": "Local Claude Code usage dashboard",
  "type": "module",
  "bin": {
    "cc-insight": "./bin/cc-insight.js"
  },
  "scripts": {
    "start": "node bin/cc-insight.js",
    "test": "node --experimental-vm-modules node_modules/.bin/jest --testPathPattern=tests/"
  },
  "dependencies": {
    "better-sqlite3": "^9.6.0",
    "chokidar": "^3.6.0",
    "express": "^4.19.0",
    "open": "^10.1.0",
    "ws": "^8.17.0"
  },
  "devDependencies": {
    "jest": "^29.7.0"
  },
  "jest": {
    "transform": {},
    "extensionsToTreatAsEsm": [".js"]
  },
  "engines": {
    "node": ">=20.0.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

```bash
cd /Users/huangxiaoxuan/Claude/cc-insight && npm install
```

Expected: `node_modules/` created, no errors. `better-sqlite3` will compile a native addon — expect 10–20 seconds.

- [ ] **Step 3: Verify install**

```bash
node -e "import('better-sqlite3').then(m => console.log('sqlite ok')); import('express').then(m => console.log('express ok'))"
```

Expected:
```
sqlite ok
express ok
```

- [ ] **Step 4: Commit**

```bash
cd /Users/huangxiaoxuan/Claude/cc-insight
echo "node_modules/" > .gitignore
echo ".cc-insight/" >> .gitignore
git init
git add .gitignore package.json package-lock.json
git commit -m "chore: init project, add dependencies"
```

---

### Task 1.3: Write src/config.js

**Files:**
- Write: `src/config.js`
- Test: `tests/config.test.js`

- [ ] **Step 1: Write failing test**

```js
// tests/config.test.js
import { getClaudeDir, getAppDir } from '../src/config.js'
import path from 'path'
import os from 'os'

test('getClaudeDir returns default ~/.claude when env not set', () => {
  delete process.env.CLAUDE_DIR
  const dir = getClaudeDir()
  expect(dir).toBe(path.join(os.homedir(), '.claude'))
})

test('getClaudeDir respects CLAUDE_DIR env var', () => {
  process.env.CLAUDE_DIR = '/custom/path'
  const dir = getClaudeDir()
  expect(dir).toBe('/custom/path')
  delete process.env.CLAUDE_DIR
})

test('getAppDir returns ~/.cc-insight', () => {
  const dir = getAppDir()
  expect(dir).toBe(path.join(os.homedir(), '.cc-insight'))
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd /Users/huangxiaoxuan/Claude/cc-insight && npm test -- tests/config.test.js
```

Expected: FAIL — "Cannot find module '../src/config.js'"

- [ ] **Step 3: Implement src/config.js**

```js
// src/config.js
import path from 'path'
import os from 'os'
import fs from 'fs'

export function getClaudeDir() {
  return process.env.CLAUDE_DIR ?? path.join(os.homedir(), '.claude')
}

export function getAppDir() {
  return path.join(os.homedir(), '.cc-insight')
}

export function getDbPath() {
  return path.join(getAppDir(), 'data.db')
}

export function getConfigPath() {
  return path.join(getAppDir(), 'config.json')
}

// 额外的 session 目录（如 macOS 桌面 App），自动检测，不存在则返回空数组
export function getExtraSessionDirs() {
  const candidates = [
    path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude-code-sessions'),
  ]
  return candidates.filter(p => fs.existsSync(p))
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npm test -- tests/config.test.js
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/config.js tests/config.test.js
git commit -m "feat: add config module with CLAUDE_DIR support"
```

---

Part 1 完成。

---

## Part 2: 数据层

### Task 2.1: DB Schema + 连接

**Files:**
- Write: `src/db/schema.js`
- Write: `src/db/db.js`

- [ ] **Step 1: Write src/db/schema.js**

```js
// src/db/schema.js
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
    jsonl_file    TEXT
  );

  CREATE TABLE IF NOT EXISTS tools (
    id                  TEXT PRIMARY KEY,
    name                TEXT NOT NULL,
    type                TEXT NOT NULL,
    subtype             TEXT,
    description         TEXT,
    source_type         TEXT DEFAULT 'downloaded',
    source_url          TEXT,
    installed_at        INTEGER,
    updated_at          INTEGER,
    security_scan_result TEXT DEFAULT 'unscanned'
  );

  CREATE TABLE IF NOT EXISTS tool_invocations (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    tool_name  TEXT NOT NULL,
    invoked_at INTEGER NOT NULL,
    FOREIGN KEY (session_id) REFERENCES sessions(id)
  );

  CREATE TABLE IF NOT EXISTS meta (
    key   TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_sessions_start ON sessions(start_time);
  CREATE INDEX IF NOT EXISTS idx_invocations_tool ON tool_invocations(tool_name);
  CREATE INDEX IF NOT EXISTS idx_invocations_session ON tool_invocations(session_id);
`
```

- [ ] **Step 2: Write src/db/db.js**

```js
// src/db/db.js
import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'
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
```

- [ ] **Step 3: Smoke-test DB creation**

```bash
cd /Users/huangxiaoxuan/Claude/cc-insight
node -e "
import('./src/db/db.js').then(({ getDb, closeDb }) => {
  const db = getDb()
  const tables = db.prepare(\"SELECT name FROM sqlite_master WHERE type='table'\").all()
  console.log(tables.map(t => t.name))
  closeDb()
})
"
```

Expected:
```
[ 'sessions', 'tools', 'tool_invocations', 'meta' ]
```

- [ ] **Step 4: Commit**

```bash
git add src/db/schema.js src/db/db.js
git commit -m "feat: add SQLite schema and db connection"
```

---

### Task 2.2: JSONL Parser

**Files:**
- Write: `src/parsers/jsonl.js`
- Test: `tests/parsers/jsonl.test.js`

- [ ] **Step 1: Write failing test**

```js
// tests/parsers/jsonl.test.js
import { parseJsonlFile } from '../../src/parsers/jsonl.js'
import fs from 'fs'
import os from 'os'
import path from 'path'

function writeTmp(lines) {
  const f = path.join(os.tmpdir(), `test-${Date.now()}.jsonl`)
  fs.writeFileSync(f, lines.join('\n'))
  return f
}

test('extracts session id and timestamps from user messages', () => {
  const f = writeTmp([
    JSON.stringify({ type: 'user', sessionId: 'abc123', timestamp: '2026-01-01T10:00:00.000Z', cwd: '/proj' }),
    JSON.stringify({ type: 'user', sessionId: 'abc123', timestamp: '2026-01-01T10:05:00.000Z', cwd: '/proj' }),
  ])
  const result = parseJsonlFile(f)
  expect(result.sessionId).toBe('abc123')
  expect(result.startTime).toBe(new Date('2026-01-01T10:00:00.000Z').getTime())
  expect(result.endTime).toBe(new Date('2026-01-01T10:05:00.000Z').getTime())
  expect(result.durationSec).toBe(300)
  expect(result.projectPath).toBe('/proj')
})

test('counts tool_use entries', () => {
  const f = writeTmp([
    JSON.stringify({ type: 'user', sessionId: 's1', timestamp: '2026-01-01T10:00:00.000Z', cwd: '/' }),
    JSON.stringify({ type: 'assistant', sessionId: 's1', timestamp: '2026-01-01T10:01:00.000Z',
      message: { content: [{ type: 'tool_use', name: 'Bash' }, { type: 'tool_use', name: 'Read' }] } }),
  ])
  const result = parseJsonlFile(f)
  expect(result.toolUseCount).toBe(2)
  expect(result.invocations).toEqual([
    { toolName: 'Bash', invokedAt: new Date('2026-01-01T10:01:00.000Z').getTime() },
    { toolName: 'Read', invokedAt: new Date('2026-01-01T10:01:00.000Z').getTime() },
  ])
})

test('returns null for empty or invalid file', () => {
  const f = writeTmp(['{invalid json}', ''])
  expect(parseJsonlFile(f)).toBeNull()
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm test -- tests/parsers/jsonl.test.js
```

Expected: FAIL

- [ ] **Step 3: Implement src/parsers/jsonl.js**

```js
// src/parsers/jsonl.js
import fs from 'fs'

export function parseJsonlFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8')
  const lines = raw.split('\n').filter(l => l.trim())

  const records = []
  for (const line of lines) {
    try { records.push(JSON.parse(line)) } catch { /* skip */ }
  }

  const userMsgs = records.filter(r => r.type === 'user' && r.sessionId && r.timestamp)
  if (userMsgs.length === 0) return null

  const sessionId = userMsgs[0].sessionId
  const timestamps = userMsgs.map(r => new Date(r.timestamp).getTime()).filter(Boolean).sort()
  const startTime = timestamps[0]
  const endTime = timestamps[timestamps.length - 1]
  const durationSec = Math.round((endTime - startTime) / 1000)
  const projectPath = userMsgs[0].cwd ?? null
  const messageCount = records.filter(r => r.type === 'user' || r.type === 'assistant').length

  const invocations = []
  for (const r of records) {
    if (r.type !== 'assistant') continue
    const content = r.message?.content ?? []
    for (const block of content) {
      if (block.type === 'tool_use' && block.name) {
        invocations.push({
          toolName: block.name,
          invokedAt: new Date(r.timestamp).getTime() || startTime,
        })
      }
    }
  }

  return {
    sessionId,
    startTime,
    endTime,
    durationSec,
    projectPath,
    messageCount,
    toolUseCount: invocations.length,
    invocations,
  }
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npm test -- tests/parsers/jsonl.test.js
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/parsers/jsonl.js tests/parsers/jsonl.test.js
git commit -m "feat: add JSONL parser"
```

---

### Task 2.3: SKILL.md Parser

**Files:**
- Write: `src/parsers/skill-md.js`
- Test: `tests/parsers/skill-md.test.js`

- [ ] **Step 1: Write failing test**

```js
// tests/parsers/skill-md.test.js
import { parseSkillMd } from '../../src/parsers/skill-md.js'
import fs from 'fs'
import os from 'os'
import path from 'path'

function writeTmp(content) {
  const f = path.join(os.tmpdir(), `skill-${Date.now()}.md`)
  fs.writeFileSync(f, content)
  return f
}

test('parses name and description from frontmatter', () => {
  const f = writeTmp(`---
name: skill-vetter
description: Security-first skill vetting for AI agents
---

Some content here.`)
  const result = parseSkillMd(f)
  expect(result.name).toBe('skill-vetter')
  expect(result.description).toBe('Security-first skill vetting for AI agents')
})

test('falls back to directory name if no frontmatter', () => {
  const f = writeTmp('# My Skill\nDoes something useful.')
  const result = parseSkillMd(f, 'my-skill')
  expect(result.name).toBe('my-skill')
  expect(result.description).toBe('')
})

test('returns null for missing file', () => {
  expect(parseSkillMd('/does/not/exist.md')).toBeNull()
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm test -- tests/parsers/skill-md.test.js
```

Expected: FAIL

- [ ] **Step 3: Implement src/parsers/skill-md.js**

```js
// src/parsers/skill-md.js
import fs from 'fs'

export function parseSkillMd(filePath, fallbackName = '') {
  if (!fs.existsSync(filePath)) return null
  const raw = fs.readFileSync(filePath, 'utf8')

  let name = fallbackName
  let description = ''
  let type = 'skill'   // 默认 skill，frontmatter 有 type: agent 时覆盖

  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/)
  if (fmMatch) {
    const fm = fmMatch[1]
    const nameMatch = fm.match(/^name:\s*(.+)$/m)
    const descMatch = fm.match(/^description:\s*(.+)$/m)
    const typeMatch = fm.match(/^type:\s*(.+)$/m)
    if (nameMatch) name = nameMatch[1].trim()
    if (descMatch) description = descMatch[1].trim()
    if (typeMatch) type = typeMatch[1].trim()
  }

  return { name, description, type }
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npm test -- tests/parsers/skill-md.test.js
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/parsers/skill-md.js tests/parsers/skill-md.test.js
git commit -m "feat: add SKILL.md parser"
```

---

### Task 2.4: Security Scanner

**Files:**
- Write: `src/parsers/security.js`
- Test: `tests/parsers/security.test.js`

- [ ] **Step 1: Write failing test**

```js
// tests/parsers/security.test.js
import { scanSkillSecurity } from '../../src/parsers/security.js'
import fs from 'fs'
import os from 'os'
import path from 'path'

function writeTmp(content) {
  const f = path.join(os.tmpdir(), `sec-${Date.now()}.md`)
  fs.writeFileSync(f, content)
  return f
}

test('returns safe for clean skill', () => {
  const f = writeTmp('# My Skill\nHelps you do things productively.')
  expect(scanSkillSecurity(f)).toBe('safe')
})

test('returns warning when curl to unknown URL is found', () => {
  const f = writeTmp('Run: curl https://external-server.com/data')
  expect(scanSkillSecurity(f)).toBe('warning')
})

test('returns warning for rm -rf pattern', () => {
  const f = writeTmp('Execute: rm -rf /')
  expect(scanSkillSecurity(f)).toBe('warning')
})

test('returns warning for base64 decode pattern', () => {
  const f = writeTmp('echo SGVsbG8= | base64 --decode')
  expect(scanSkillSecurity(f)).toBe('warning')
})

test('returns unscanned for missing file', () => {
  expect(scanSkillSecurity('/no/such/file.md')).toBe('unscanned')
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm test -- tests/parsers/security.test.js
```

Expected: FAIL

- [ ] **Step 3: Implement src/parsers/security.js**

```js
// src/parsers/security.js
import fs from 'fs'

const RED_FLAGS = [
  /curl\s+https?:\/\/(?!raw\.githubusercontent\.com|api\.github\.com)/,
  /wget\s+https?:\/\//,
  /rm\s+-rf/,
  /base64\s+--decode/,
  /base64\s+-d/,
  /eval\s*\(/,
  /exec\s*\(/,
  /\bsudo\b/,
  /\~\/\.ssh/,
  /\~\/\.aws/,
]

export function scanSkillSecurity(filePath) {
  if (!fs.existsSync(filePath)) return 'unscanned'
  const raw = fs.readFileSync(filePath, 'utf8')
  for (const pattern of RED_FLAGS) {
    if (pattern.test(raw)) return 'warning'
  }
  return 'safe'
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npm test -- tests/parsers/security.test.js
```

Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add src/parsers/security.js tests/parsers/security.test.js
git commit -m "feat: add security scanner for SKILL.md"
```

---

Part 2 完成。

---

## Part 3: 索引引擎

### Task 3.1: DB Query Functions

**Files:**
- Write: `src/db/queries.js`
- Test: `tests/db/queries.test.js`

- [ ] **Step 1: Write failing test**

```js
// tests/db/queries.test.js
import { upsertSession, upsertTool, insertInvocations, getSessionCount,
         getTotalDurationSec, getInvocationsByTool } from '../../src/db/queries.js'
import { getDb, closeDb } from '../../src/db/db.js'
import os from 'os'
import path from 'path'

// Use a temp DB for tests
process.env.HOME = os.tmpdir()

beforeEach(() => { closeDb() })
afterAll(() => { closeDb() })

test('upsertSession inserts and retrieves a session', () => {
  upsertSession({
    id: 'sess-1', source: 'claude-code',
    startTime: 1000000, endTime: 1003600, durationSec: 3600,
    projectPath: '/proj', messageCount: 10, toolUseCount: 5, jsonlFile: 'a.jsonl'
  })
  const count = getSessionCount({ after: 0 })
  expect(count).toBeGreaterThanOrEqual(1)
})

test('getTotalDurationSec sums duration within time range', () => {
  upsertSession({ id: 'sess-2', source: 'claude-code', startTime: 2000000,
    endTime: 2001800, durationSec: 1800, projectPath: '/', messageCount: 5,
    toolUseCount: 2, jsonlFile: 'b.jsonl' })
  const total = getTotalDurationSec({ after: 0 })
  expect(total).toBeGreaterThanOrEqual(1800)
})

test('insertInvocations and getInvocationsByTool', () => {
  insertInvocations([
    { sessionId: 'sess-1', toolName: 'Bash', invokedAt: 1000500 },
    { sessionId: 'sess-1', toolName: 'Bash', invokedAt: 1001000 },
    { sessionId: 'sess-1', toolName: 'Read', invokedAt: 1001500 },
  ])
  const counts = getInvocationsByTool({ after: 0 })
  const bash = counts.find(r => r.toolName === 'Bash')
  expect(bash.count).toBeGreaterThanOrEqual(2)
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm test -- tests/db/queries.test.js
```

Expected: FAIL

- [ ] **Step 3: Implement src/db/queries.js**

```js
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

export function deleteTool(name) {
  getDb().prepare('DELETE FROM tools WHERE name = ?').run(name)
}

export function getIndexedFiles() {
  return new Set(
    getDb().prepare('SELECT jsonl_file FROM sessions WHERE jsonl_file IS NOT NULL').all()
      .map(r => r.jsonl_file)
  )
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npm test -- tests/db/queries.test.js
```

Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add src/db/queries.js tests/db/queries.test.js
git commit -m "feat: add DB query functions"
```

---

### Task 3.2: Full Indexer (首次全量扫描)

**Files:**
- Write: `src/indexer.js`
- Test: `tests/indexer.test.js`

- [ ] **Step 1: Write failing test**

```js
// tests/indexer.test.js
import { runFullIndex, indexJsonlFile } from '../src/indexer.js'
import { closeDb } from '../src/db/db.js'
import { getSessionCount } from '../src/db/queries.js'
import fs from 'fs'
import os from 'os'
import path from 'path'

process.env.HOME = os.tmpdir()
process.env.CLAUDE_DIR = path.join(os.tmpdir(), `claude-test-${Date.now()}`)

beforeAll(() => {
  fs.mkdirSync(path.join(process.env.CLAUDE_DIR, 'projects/proj1'), { recursive: true })
  const line1 = JSON.stringify({ type: 'user', sessionId: 'test-s1',
    timestamp: '2026-01-01T10:00:00.000Z', cwd: '/proj' })
  const line2 = JSON.stringify({ type: 'user', sessionId: 'test-s1',
    timestamp: '2026-01-01T10:30:00.000Z', cwd: '/proj' })
  fs.writeFileSync(
    path.join(process.env.CLAUDE_DIR, 'projects/proj1/session.jsonl'),
    [line1, line2].join('\n')
  )
})

afterAll(() => { closeDb() })

test('runFullIndex indexes all JSONL files and reports progress', async () => {
  const progress = []
  await runFullIndex((pct) => progress.push(pct))
  expect(progress[progress.length - 1]).toBe(100)
  expect(getSessionCount({ after: 0 })).toBeGreaterThanOrEqual(1)
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm test -- tests/indexer.test.js
```

Expected: FAIL

- [ ] **Step 3: Implement src/indexer.js**

```js
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
      // type 从 SKILL.md frontmatter 读取（skill / agent），默认 skill
      const toolType = ['skill', 'agent'].includes(meta.type) ? meta.type : 'skill'
      tools.push({ id: `${toolType}:${name}`, name: meta.name, type: toolType,
        description: meta.description, sourceType: 'downloaded', sourceUrl: null,
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
          type: 'plugin', description: '', sourceType: 'downloaded',
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
  upsertSession({ ...result, source: 'claude-code', jsonlFile: filePath })
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
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npm test -- tests/indexer.test.js
```

Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add src/indexer.js tests/indexer.test.js
git commit -m "feat: add full + incremental indexer"
```

---

### Task 3.3: File Watcher

**Files:**
- Write: `src/watcher.js`

- [ ] **Step 1: Implement src/watcher.js**

```js
// src/watcher.js
import chokidar from 'chokidar'
import path from 'path'
import { getClaudeDir } from './config.js'
import { runIncrementalIndex } from './indexer.js'

export function startWatcher(onUpdate) {
  const claudeDir = getClaudeDir()
  const pattern = path.join(claudeDir, 'projects', '**', '*.jsonl')

  const watcher = chokidar.watch(pattern, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 1000, pollInterval: 200 },
  })

  watcher.on('add', async (filePath) => {
    await runIncrementalIndex(filePath)
    onUpdate?.()
  })

  watcher.on('change', async (filePath) => {
    await runIncrementalIndex(filePath)
    onUpdate?.()
  })

  return watcher
}
```

- [ ] **Step 2: Smoke test watcher starts without error**

```bash
node -e "
import('./src/watcher.js').then(({ startWatcher }) => {
  const w = startWatcher(() => console.log('update'))
  console.log('watcher started')
  setTimeout(() => { w.close(); console.log('watcher closed') }, 500)
})
"
```

Expected:
```
watcher started
watcher closed
```

- [ ] **Step 3: Commit**

```bash
git add src/watcher.js
git commit -m "feat: add chokidar file watcher"
```

---

Part 3 完成。

---

## Part 4: 服务端

### Task 4.1: API 路由

**Files:**
- Write: `src/api.js`

- [ ] **Step 1: Implement src/api.js**

```js
// src/api.js
import { Router } from 'express'
import {
  getSessionCount, getTotalDurationSec, getAvgDailyDurationSec,
  getPeakPeriod, getSilentDays, getHeatmapData, get24hDistribution,
  getInvocationsByTool, getAllTools, getToolUsageStats, deleteTool
} from './db/queries.js'

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
      sessions:        getSessionCount({ after }),
      totalDurationSec: getTotalDurationSec({ after }),
      avgDailyDurationSec: getAvgDailyDurationSec({ after }),
      peakPeriod:      getPeakPeriod({ after }),
      silentDays:      getSilentDays({ after }),
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
    const insights = buildInsights({ after })
    res.json(insights)
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
      sourceType:          t.source_type,
      sourceUrl:           t.source_url,
      installedAt:         t.installed_at,
      updatedAt:           t.updated_at,
      securityScanResult:  t.security_scan_result,
      // 使用统计（来自 tool_invocations 聚合）
      useCount:   statsMap[t.name]?.useCount   ?? 0,
      lastUsedAt: statsMap[t.name]?.lastUsedAt ?? null,
    }))
    res.json(result)
  })

  // DELETE /api/tools/:name — 完整实现见 Task 7.4（含路径校验 + 物理删除）

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
    const nightCount = dist.filter(r => parseInt(r.hour) >= 20)
      .reduce((s, r) => s + r.count, 0)
    const morningCount = dist.filter(r => parseInt(r.hour) >= 6 && parseInt(r.hour) < 10)
      .reduce((s, r) => s + r.count, 0)
    const workCount = dist.filter(r => parseInt(r.hour) >= 9 && parseInt(r.hour) < 18)
      .reduce((s, r) => s + r.count, 0)
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
```

- [ ] **Step 2: Smoke test router loads**

```bash
node -e "import('./src/api.js').then(m => console.log('api ok:', typeof m.createRouter))"
```

Expected: `api ok: function`

- [ ] **Step 3: Commit**

```bash
git add src/api.js
git commit -m "feat: add API routes for overview, heatmap, tools"
```

---

### Task 4.2: HTTP Server + WebSocket

**Files:**
- Write: `src/server.js`

- [ ] **Step 1: Implement src/server.js**

```js
// src/server.js
import express from 'express'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRouter } from './api.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export function createAppServer() {
  const app = express()
  const httpServer = createServer(app)
  const wss = new WebSocketServer({ server: httpServer })

  // JSON body 解析（POST /api/config 等需要）
  app.use(express.json())

  // 静态文件
  app.use(express.static(path.join(__dirname, '..', 'public')))

  // API 路由
  app.use(createRouter())

  // 首页（SPA fallback）
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'))
  })

  // 广播数据更新给所有客户端
  function broadcast(msg) {
    const payload = JSON.stringify(msg)
    for (const client of wss.clients) {
      if (client.readyState === 1) client.send(payload)
    }
  }

  // 进度推送（首次建库时使用）
  function sendProgress(pct) {
    broadcast({ type: 'progress', pct })
  }

  // 数据更新推送（watcher 触发时使用）
  function sendRefresh() {
    broadcast({ type: 'refresh' })
  }

  function listen(port = 3847) {
    return new Promise((resolve) => {
      httpServer.listen(port, '127.0.0.1', () => resolve(port))
    })
  }

  return { listen, sendProgress, sendRefresh }
}
```

- [ ] **Step 2: Smoke test server starts and responds**

```bash
node -e "
import('./src/server.js').then(async ({ createAppServer }) => {
  const srv = createAppServer()
  const port = await srv.listen(13847)
  const res = await fetch('http://127.0.0.1:' + port + '/api/overview?range=7d')
  const data = await res.json()
  console.log('status:', res.status)
  console.log('sessions key:', 'sessions' in data)
  process.exit(0)
})
" 2>/dev/null
```

Expected:
```
status: 200
sessions key: true
```

- [ ] **Step 3: Commit**

```bash
git add src/server.js
git commit -m "feat: add HTTP + WebSocket server"
```

---

Part 4 完成。

---

## Part 5: 前端 Dashboard Shell

### Task 5.1: HTML 主框架

**Files:**
- Write: `public/index.html`

- [ ] **Step 1: Write public/index.html**

```html
<!DOCTYPE html>
<html lang="zh" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>CC Insight</title>
  <style>
    /* ── Reset & Base ── */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:       #0d1117;
      --bg2:      #111827;
      --bg3:      #1f2937;
      --border:   #1f2937;
      --text:     #e5e7eb;
      --muted:    #6b7280;
      --green:    #4ade80;
      --cyan:     #22d3ee;
      --amber:    #f59e0b;
      --red:      #f87171;
      --purple:   #a78bfa;
      --font:     'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
      --radius:   6px;
      --sidebar:  200px;
    }

    [data-theme="light"] {
      --bg:     #ffffff;
      --bg2:    #f9fafb;
      --bg3:    #f3f4f6;
      --border: #e5e7eb;
      --text:   #111827;
      --muted:  #6b7280;
    }

    html, body { height: 100%; background: var(--bg); color: var(--text);
      font-family: var(--font); font-size: 14px; line-height: 1.5; }

    /* ── Layout ── */
    .layout { display: flex; flex-direction: column; height: 100vh; }

    .topbar {
      display: flex; align-items: center; gap: 12px;
      padding: 0 20px; height: 48px;
      background: var(--bg2); border-bottom: 1px solid var(--border);
      flex-shrink: 0;
    }
    .topbar-brand { color: var(--green); font-weight: bold; font-size: 15px; }
    .topbar-tool  { color: var(--muted); font-size: 13px; }
    .topbar-spacer { flex: 1; }

    /* Theme toggle */
    .theme-btn {
      background: var(--bg3); border: 1px solid var(--border);
      color: var(--muted); padding: 4px 10px; border-radius: var(--radius);
      cursor: pointer; font-size: 13px; font-family: var(--font);
    }
    .theme-btn:hover { color: var(--text); }

    .main { display: flex; flex: 1; overflow: hidden; }

    /* ── Sidebar ── */
    .sidebar {
      width: var(--sidebar); background: var(--bg2);
      border-right: 1px solid var(--border);
      display: flex; flex-direction: column; padding: 12px 0;
      flex-shrink: 0; overflow-y: auto;
    }
    .nav-item {
      padding: 8px 16px; cursor: pointer; font-size: 13px;
      color: var(--muted); border-left: 2px solid transparent;
      transition: all 0.15s;
    }
    .nav-item:hover { color: var(--text); background: var(--bg3); }
    .nav-item.active { color: var(--green); border-left-color: var(--green);
      background: color-mix(in srgb, var(--green) 8%, transparent); }
    .nav-divider { margin: 8px 16px; border-top: 1px solid var(--border); }
    .nav-label { padding: 8px 16px 4px; font-size: 11px;
      color: var(--muted); letter-spacing: 1px; text-transform: uppercase; }

    /* ── Content ── */
    .content { flex: 1; overflow-y: auto; padding: 20px; }

    /* ── Cards ── */
    .card {
      background: var(--bg2); border: 1px solid var(--border);
      border-radius: var(--radius); padding: 16px;
    }
    .card-label { font-size: 10px; color: var(--muted);
      letter-spacing: 1px; text-transform: uppercase; margin-bottom: 6px; }
    .card-value { font-size: 26px; font-weight: bold; }
    .card-sub   { font-size: 12px; color: var(--muted); margin-top: 2px; }

    .grid-4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 10px; }
    .grid-3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 10px; }

    /* ── Time range filter ── */
    .range-filter { display: flex; gap: 6px; align-items: center;
      margin-bottom: 16px; }
    .range-filter span { font-size: 12px; color: var(--muted); }
    .range-btn {
      padding: 3px 10px; border-radius: var(--radius); font-size: 12px;
      cursor: pointer; font-family: var(--font);
      border: 1px solid var(--border); background: transparent; color: var(--muted);
    }
    .range-btn.active {
      background: color-mix(in srgb, var(--green) 15%, transparent);
      border-color: var(--green); color: var(--green);
    }
    .range-btn:hover:not(.active) { color: var(--text); }

    /* ── Split layout ── */
    .split { display: grid; grid-template-columns: 280px 1fr; gap: 12px; }
    .split-left { display: flex; flex-direction: column; gap: 10px; }

    /* ── Section header ── */
    .section-header { display: flex; justify-content: space-between;
      align-items: center; margin-bottom: 10px; }
    .section-title { font-size: 11px; color: var(--muted);
      letter-spacing: 1px; text-transform: uppercase; }

    /* ── Progress screen ── */
    #progress-screen {
      position: fixed; inset: 0; background: var(--bg);
      display: flex; flex-direction: column;
      align-items: center; justify-content: center; gap: 20px; z-index: 100;
    }
    .progress-title { font-size: 16px; color: var(--green); }
    .progress-bar-wrap { width: 320px; background: var(--bg3);
      border-radius: 4px; height: 6px; }
    .progress-bar { height: 6px; background: var(--green);
      border-radius: 4px; width: 0%; transition: width 0.3s; }
    .progress-pct { font-size: 13px; color: var(--muted); }

    /* ── Scrollbar ── */
    ::-webkit-scrollbar { width: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: var(--bg3); border-radius: 3px; }

    /* ── Util ── */
    .green  { color: var(--green);  }
    .cyan   { color: var(--cyan);   }
    .amber  { color: var(--amber);  }
    .red    { color: var(--red);    }
    .purple { color: var(--purple); }
    .muted  { color: var(--muted);  }
    .hidden { display: none !important; }
  </style>
</head>
<body>

<!-- 首次建库进度屏 -->
<div id="progress-screen" class="hidden">
  <div class="progress-title">CC Insight — 正在建立索引</div>
  <div class="progress-bar-wrap">
    <div class="progress-bar" id="progress-bar"></div>
  </div>
  <div class="progress-pct" id="progress-pct">0%</div>
</div>

<!-- 主布局 -->
<div class="layout" id="app" style="display:none">
  <header class="topbar">
    <span class="topbar-brand">CC Insight</span>
    <span class="topbar-tool muted">Claude Code</span>
    <div class="topbar-spacer"></div>
    <button class="theme-btn" id="theme-btn">深色</button>
  </header>

  <div class="main">
    <nav class="sidebar">
      <div class="nav-item active" data-view="overview">使用概览</div>
      <div class="nav-item" data-view="skills">Skill &amp; Agent</div>
      <div class="nav-divider"></div>
      <div class="nav-label muted">未来</div>
      <div class="nav-item muted" style="opacity:0.4;cursor:default;">Gemini CLI</div>
    </nav>
    <main class="content" id="content"></main>
  </div>
</div>

<script type="module" src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Verify HTML opens in browser without errors**

```bash
open /Users/huangxiaoxuan/Claude/cc-insight/public/index.html
```

Expected: blank page (no JS yet), no console errors.

- [ ] **Step 3: Commit**

```bash
git add public/index.html
git commit -m "feat: add dashboard HTML shell with layout and CSS variables"
```

---

### Task 5.2: Theme Switching

**Files:**
- Write: `public/js/theme.js`

- [ ] **Step 1: Write public/js/theme.js**

```js
// public/js/theme.js
const THEMES = ['dark', 'light', 'system']
const LABELS = { dark: '深色', light: '浅色', system: '跟随系统' }

export function initTheme() {
  let current = localStorage.getItem('cc-theme') ?? 'dark'

  function apply(theme) {
    current = theme
    localStorage.setItem('cc-theme', theme)
    const resolved = theme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme
    document.documentElement.setAttribute('data-theme', resolved)
    const btn = document.getElementById('theme-btn')
    if (btn) btn.textContent = LABELS[theme]
  }

  // 初始应用
  apply(current)

  // 系统主题变化时自动响应
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (current === 'system') apply('system')
  })

  // 点击按钮循环切换
  document.getElementById('theme-btn')?.addEventListener('click', () => {
    const idx = THEMES.indexOf(current)
    apply(THEMES[(idx + 1) % THEMES.length])
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add public/js/theme.js
git commit -m "feat: add theme switching (dark/light/system)"
```

---

### Task 5.3: App 主入口 + WebSocket + 路由

**Files:**
- Write: `public/js/app.js`

- [ ] **Step 1: Write public/js/app.js**

```js
// public/js/app.js
import { initTheme } from './theme.js'
import { renderOverview } from './overview.js'
import { renderSkills } from './skills.js'

// 当前时间范围，全局共享
export let currentRange = '7d'

// 当前视图
let currentView = 'overview'

// ── WebSocket ──
function connectWS() {
  const ws = new WebSocket(`ws://${location.host}`)

  ws.onmessage = (e) => {
    const msg = JSON.parse(e.data)

    if (msg.type === 'progress') {
      const pct = msg.pct
      document.getElementById('progress-bar').style.width = pct + '%'
      document.getElementById('progress-pct').textContent = pct + '%'
      if (pct >= 100) {
        setTimeout(() => {
          document.getElementById('progress-screen').classList.add('hidden')
          document.getElementById('app').style.display = ''
          renderView(currentView)
        }, 500)
      }
    }

    if (msg.type === 'refresh') {
      renderView(currentView)
    }

    if (msg.type === 'ready') {
      document.getElementById('progress-screen').classList.add('hidden')
      document.getElementById('app').style.display = ''
      renderView(currentView)
    }
  }

  ws.onclose = () => setTimeout(connectWS, 2000)
}

// ── 路由 ──
function renderView(view) {
  currentView = view
  const content = document.getElementById('content')

  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.view === view)
  })

  if (view === 'overview') renderOverview(content, currentRange)
  if (view === 'skills')   renderSkills(content, currentRange)
}

// ── 时间筛选 ──
export function setRange(range) {
  currentRange = range
  renderView(currentView)
}

// ── 初始化 ──
document.addEventListener('DOMContentLoaded', async () => {
  await initTheme()   // Task 5.4 改为 async，需 await 才能确保主题在渲染前就位
  connectWS()

  // 侧边栏导航
  document.querySelectorAll('.nav-item[data-view]').forEach(el => {
    el.addEventListener('click', () => {
      if (el.style.cursor === 'default') return
      renderView(el.dataset.view)
    })
  })
})
```

- [ ] **Step 2: Commit**

```bash
git add public/js/app.js
git commit -m "feat: add app entry, WebSocket client, view routing"
```

---

### Task 5.4: 主题偏好持久化到 config.json

**Files:**
- Modify: `src/api.js`（追加 GET/POST `/api/config` 路由）
- Modify: `public/js/theme.js`（改为读写服务端 config.json）

设计文档要求主题状态持久化到 `~/.cc-insight/config.json`（交付物之一）。Task 5.2 使用的 `localStorage` 仅存浏览器端，换浏览器或机器后丢失。此 Task 将持久化改为服务端文件，浏览器启动时先从 API 读取偏好，切换后写回。

- [ ] **Step 1: Add GET/POST /api/config to src/api.js**

在 `src/api.js` 中追加：

```js
import { getConfigPath } from './config.js'

function readConfig() {
  try {
    return JSON.parse(fs.readFileSync(getConfigPath(), 'utf8'))
  } catch {
    return {}
  }
}

function writeConfig(data) {
  fs.mkdirSync(path.dirname(getConfigPath()), { recursive: true })
  fs.writeFileSync(getConfigPath(), JSON.stringify(data, null, 2))
}

// GET /api/config → 返回当前配置
router.get('/config', (_req, res) => {
  res.json(readConfig())
})

// POST /api/config → 合并更新配置
router.post('/config', (req, res) => {
  const current = readConfig()
  const updated = { ...current, ...req.body }
  writeConfig(updated)
  res.json(updated)
})
```

- [ ] **Step 2: Update public/js/theme.js to use /api/config**

将 Task 5.2 写的 `theme.js` 改为：

```js
// public/js/theme.js
const THEMES = ['dark', 'light', 'system']
const LABELS = { dark: '深色', light: '浅色', system: '跟随系统' }

let _current = 'dark'

function applyTheme(theme) {
  _current = theme
  const resolved = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme
  document.documentElement.setAttribute('data-theme', resolved)
  const btn = document.getElementById('theme-btn')
  if (btn) btn.textContent = LABELS[theme]
}

async function saveTheme(theme) {
  applyTheme(theme)
  await fetch('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ theme }),
  }).catch(() => {})  // 写失败静默，不影响 UI
}

export async function initTheme() {
  // 优先读服务端配置，降级到 localStorage，再降级到 dark
  let theme = 'dark'
  try {
    const cfg = await fetch('/api/config').then(r => r.json())
    theme = cfg.theme ?? localStorage.getItem('cc-theme') ?? 'dark'
  } catch {
    theme = localStorage.getItem('cc-theme') ?? 'dark'
  }
  applyTheme(theme)

  // 系统主题变化时响应
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (_current === 'system') applyTheme('system')
  })

  // 点击循环切换
  document.getElementById('theme-btn')?.addEventListener('click', () => {
    const idx = THEMES.indexOf(_current)
    saveTheme(THEMES[(idx + 1) % THEMES.length])
  })
}
```

注意：`initTheme` 变为 `async`，`app.js` 中调用处需加 `await`：

```js
// public/js/app.js DOMContentLoaded 回调中
await initTheme()
```

- [ ] **Step 3: 手动验证**

```bash
node bin/cc-insight.js
```

1. 打开浏览器，切换主题到「浅色」
2. 关闭浏览器标签，重新打开 `http://127.0.0.1:3847`
3. 确认仍然是浅色主题（来自 `~/.cc-insight/config.json`，不是 localStorage）
4. 检查文件：`cat ~/.cc-insight/config.json` → 应输出 `{"theme":"light"}`

- [ ] **Step 4: Commit**

```bash
git add src/api.js public/js/theme.js public/js/app.js
git commit -m "feat: persist theme preference to ~/.cc-insight/config.json"
```

---

Part 5 完成。

---

## Part 6: 主题 1 — 使用概览

### Task 6.1: 指标卡片 + 时间筛选

**Files:**
- Write: `public/js/overview.js`（骨架，后续追加）

- [ ] **Step 1: Write overview.js skeleton with stats cards**

```js
// public/js/overview.js
import { setRange } from './app.js'

function fmtDuration(sec) {
  if (!sec) return '0m'
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function rangeFilter(current) {
  const ranges = [
    { value: '7d',  label: '7 天' },
    { value: '30d', label: '30 天' },
    { value: '90d', label: '90 天' },
    { value: 'all', label: '全部' },
  ]
  return `
    <div class="range-filter">
      <span>时间范围：</span>
      ${ranges.map(r => `
        <button class="range-btn ${r.value === current ? 'active' : ''}"
          data-range="${r.value}">${r.label}</button>
      `).join('')}
    </div>`
}

function statsCards(data) {
  return `
    <div class="grid-4" style="margin-bottom:14px;">
      <div class="card">
        <div class="card-label">Sessions</div>
        <div class="card-value green">${data.sessions ?? 0}</div>
        <div class="card-sub">次对话</div>
      </div>
      <div class="card">
        <div class="card-label">Duration</div>
        <div class="card-value cyan">${fmtDuration(data.totalDurationSec)}</div>
        <div class="card-sub">累计时长</div>
      </div>
      <div class="card">
        <div class="card-label">Peak Period</div>
        <div class="card-value amber">${data.peakPeriod ?? '—'}</div>
        <div class="card-sub">最活跃时段</div>
      </div>
      <div class="card">
        <div class="card-label">Avg / Day</div>
        <div class="card-value purple">${fmtDuration(data.avgDailyDurationSec)}</div>
        <div class="card-sub">日均时长</div>
      </div>
    </div>`
}

export async function renderOverview(container, range) {
  // 并行请求所有数据
  const [overview, heatmap, dist, insights] = await Promise.all([
    fetch(`/api/overview?range=${range}`).then(r => r.json()),
    fetch(`/api/heatmap?range=${range}`).then(r => r.json()),
    fetch(`/api/distribution?range=${range}`).then(r => r.json()),
    fetch(`/api/insights?range=${range}`).then(r => r.json()),
  ])

  container.innerHTML = `
    ${rangeFilter(range)}
    ${statsCards(overview)}
    <div class="split">
      <div class="split-left">
        <div id="insights-panel"></div>
      </div>
      <div>
        <div class="card" style="margin-bottom:10px;">
          <div class="section-header">
            <span class="section-title">Activity Heatmap</span>
          </div>
          <div id="heatmap-canvas"></div>
        </div>
        <div class="card">
          <div class="section-header">
            <span class="section-title">24H 时间分布</span>
            <span id="dist-peak-label" class="muted" style="font-size:11px;"></span>
          </div>
          <div id="dist-canvas"></div>
        </div>
      </div>
    </div>`

  // 绑定时间筛选
  container.querySelectorAll('.range-btn').forEach(btn => {
    btn.addEventListener('click', () => setRange(btn.dataset.range))
  })

  // 渲染子模块（后续 Task 实现）
  renderInsights(document.getElementById('insights-panel'), insights)
  renderHeatmap(document.getElementById('heatmap-canvas'), heatmap)
  renderDist(document.getElementById('dist-canvas'), dist)
}
```

- [ ] **Step 2: Commit skeleton**

```bash
git add public/js/overview.js
git commit -m "feat: add overview stats cards and layout skeleton"
```

---

### Task 6.2: Activity Heatmap

**Files:**
- Append: `public/js/overview.js`（追加 renderHeatmap 函数）

- [ ] **Step 1: Append renderHeatmap to overview.js**

```js
// 追加到 public/js/overview.js 末尾

function renderHeatmap(el, data) {
  // data: [{ day: '2026-01-01', count: 5 }, ...]
  const map = Object.fromEntries(data.map(r => [r.day, r.count]))
  const max = Math.max(...Object.values(map), 1)

  // 生成过去 16 周的日期
  const today = new Date()
  const start = new Date(today)
  start.setDate(today.getDate() - 7 * 16)
  // 对齐到周一
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))

  const weeks = []
  let cur = new Date(start)
  while (cur <= today) {
    const week = []
    for (let d = 0; d < 7; d++) {
      const key = cur.toISOString().slice(0, 10)
      week.push({ day: key, count: map[key] ?? 0 })
      cur.setDate(cur.getDate() + 1)
    }
    weeks.push(week)
  }

  function intensity(count) {
    if (count === 0) return 'var(--bg3)'
    const pct = count / max
    if (pct < 0.25) return '#0e4429'
    if (pct < 0.5)  return '#006d32'
    if (pct < 0.75) return '#26a641'
    return '#39d353'
  }

  const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', '']

  el.innerHTML = `
    <div style="display:flex;gap:3px;overflow-x:auto;padding-bottom:4px;">
      <div style="display:flex;flex-direction:column;gap:3px;margin-right:4px;padding-top:2px;">
        ${dayLabels.map(l => `<div style="height:12px;font-size:9px;color:var(--muted);line-height:12px;">${l}</div>`).join('')}
      </div>
      ${weeks.map(week => `
        <div style="display:flex;flex-direction:column;gap:3px;">
          ${week.map(cell => `
            <div title="${cell.day}: ${cell.count} sessions"
              style="width:12px;height:12px;border-radius:2px;background:${intensity(cell.count)};cursor:default;flex-shrink:0;">
            </div>`).join('')}
        </div>`).join('')}
    </div>
    <div style="display:flex;gap:4px;align-items:center;margin-top:8px;">
      <span style="font-size:10px;color:var(--muted);">少</span>
      ${['var(--bg3)','#0e4429','#006d32','#26a641','#39d353'].map(c =>
        `<div style="width:10px;height:10px;background:${c};border-radius:2px;"></div>`).join('')}
      <span style="font-size:10px;color:var(--muted);">多</span>
    </div>`
}
```

- [ ] **Step 2: Commit**

```bash
git add public/js/overview.js
git commit -m "feat: add activity heatmap renderer"
```

---

### Task 6.3: 24H 时间分布图

**Files:**
- Append: `public/js/overview.js`（追加 renderDist 函数）

- [ ] **Step 1: Append renderDist to overview.js**

```js
// 追加到 public/js/overview.js 末尾

function renderDist(el, data) {
  // data: [{ hour: '09', count: 12 }, ...]
  // 补全 24 小时
  const map = Object.fromEntries(data.map(r => [r.hour, r.count]))
  const hours = Array.from({ length: 24 }, (_, i) => ({
    hour: String(i).padStart(2, '0'),
    count: map[String(i).padStart(2, '0')] ?? 0,
  }))
  const max = Math.max(...hours.map(h => h.count), 1)

  // 找峰值和静默段
  const peak = hours.reduce((a, b) => b.count > a.count ? b : a)
  const silent = hours.filter(h => h.count === 0)

  // 更新峰值标签
  const label = document.getElementById('dist-peak-label')
  if (label && peak.count > 0) {
    label.textContent = `峰值 ${peak.hour}:00 · 静默 ${silent.length}h`
  }

  el.innerHTML = `
    <div style="display:flex;gap:2px;align-items:flex-end;height:60px;">
      ${hours.map(h => {
        const pct = Math.max(h.count / max * 100, h.count > 0 ? 4 : 1)
        const isPeak = h.hour === peak.hour && peak.count > 0
        const color = isPeak ? 'var(--amber)' : (h.count > 0 ? 'var(--green)' : 'var(--bg3)')
        return `<div title="${h.hour}:00 — ${h.count} sessions"
          style="flex:1;background:${color};border-radius:2px 2px 0 0;height:${pct}%;min-height:2px;"></div>`
      }).join('')}
    </div>
    <div style="display:flex;justify-content:space-between;margin-top:4px;">
      ${['0h','6h','12h','18h','23h'].map((l, i) =>
        `<span style="font-size:10px;color:var(--muted);">${l}</span>`).join('')}
    </div>`
}
```

- [ ] **Step 2: Commit**

```bash
git add public/js/overview.js
git commit -m "feat: add 24H distribution chart renderer"
```

---

### Task 6.4: 动态 Insights 面板

**Files:**
- Append: `public/js/overview.js`（追加 renderInsights 函数）

- [ ] **Step 1: Append renderInsights to overview.js**

```js
// 追加到 public/js/overview.js 末尾

const INSIGHT_CONFIG = {
  best_day: (d) => ({
    icon: '🔥', color: 'var(--green)', title: '最高产的一天',
    body: `${d.day} 完成了 <span class="green">${d.count} 个 session</span>`
  }),
  silent_days: (d) => ({
    icon: '😴', color: 'var(--red)', title: '静默期',
    body: `当前时间段内有 <span class="red">${d.days} 天</span> 未使用 Claude Code`
  }),
  habit: (d) => ({
    icon: d.label === '夜猫子' ? '🌙' : d.label === '早鸟' ? '🌅' : '💼',
    color: 'var(--amber)', title: `你是${d.label}`,
    body: `<span class="amber">${d.pct}%</span> 的 session 发生在对应时段`
  }),
  trend: (d) => ({
    icon: d.change > 0 ? '📈' : '📉',
    color: d.change > 0 ? 'var(--cyan)' : 'var(--red)',
    title: '使用趋势',
    body: d.change > 0
      ? `比上个同期增长 <span class="cyan">+${d.change}%</span>`
      : `比上个同期下降 <span class="red">${d.change}%</span>`
  }),
}

function renderInsights(el, insights) {
  if (!el) return

  if (!insights || insights.length === 0) {
    el.innerHTML = `
      <div class="card">
        <div class="section-title" style="margin-bottom:8px;">Insights</div>
        <div class="muted" style="font-size:13px;">数据积累中，稍后会自动生成洞察</div>
      </div>`
    return
  }

  const cards = insights.map(item => {
    const cfg = INSIGHT_CONFIG[item.type]?.(item)
    if (!cfg) return ''
    return `
      <div style="background:var(--bg2);border:1px solid var(--border);
        border-left:3px solid ${cfg.color};border-radius:var(--radius);
        padding:10px 12px;display:flex;gap:10px;align-items:flex-start;">
        <span style="font-size:18px;line-height:1;">${cfg.icon}</span>
        <div>
          <div style="color:var(--text);font-size:13px;margin-bottom:3px;">${cfg.title}</div>
          <div style="color:var(--muted);font-size:12px;">${cfg.body}</div>
        </div>
      </div>`
  }).join('')

  el.innerHTML = `
    <div class="card">
      <div class="section-title" style="margin-bottom:10px;">Insights</div>
      <div style="display:flex;flex-direction:column;gap:8px;">${cards}</div>
    </div>`
}
```

- [ ] **Step 2: Commit**

```bash
git add public/js/overview.js
git commit -m "feat: add dynamic insights panel renderer"
```

---

Part 6 完成。

---

## Part 7: 主题 2 — Skill & Agent & Plugin

### Task 7.1: 3 个概览卡片（使用率进度条）

**Files:**
- Write: `public/js/skills.js`（骨架）

- [ ] **Step 1: Write skills.js skeleton with overview cards**

```js
// public/js/skills.js
import { setRange } from './app.js'

function rangeFilter(current) {
  const ranges = [
    { value: '7d',  label: '7 天' },
    { value: '30d', label: '30 天' },
    { value: '90d', label: '90 天' },
    { value: 'all', label: '全部' },
  ]
  return `
    <div class="range-filter">
      <span>时间范围：</span>
      ${ranges.map(r => `
        <button class="range-btn ${r.value === current ? 'active' : ''}"
          data-range="${r.value}">${r.label}</button>
      `).join('')}
    </div>`
}

function usageCard(label, color, total, used) {
  const pct = total > 0 ? Math.round(used / total * 100) : 0
  const unused = total - used
  return `
    <div class="card">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <span class="card-label" style="color:${color};">${label}</span>
        <span style="font-size:22px;font-weight:bold;color:${color};">${total}</span>
      </div>
      <div style="background:var(--bg3);border-radius:3px;height:4px;margin-bottom:8px;">
        <div style="background:${color};height:4px;border-radius:3px;width:${pct}%;
          transition:width 0.4s ease;"></div>
      </div>
      <div style="display:flex;justify-content:space-between;">
        <span style="font-size:12px;color:var(--muted);">
          使用率 <span style="color:${color};">${used}/${total}</span>
        </span>
        ${unused > 0
          ? `<span style="font-size:12px;color:var(--red);">未用 ${unused}</span>`
          : `<span style="font-size:12px;color:var(--green);">全部使用</span>`}
      </div>
    </div>`
}

function buildOverviewCards(tools, usageMap) {
  const types = ['skill', 'agent', 'plugin']
  const labels = { skill: 'SKILL', agent: 'AGENT', plugin: 'PLUGIN' }
  const colors = { skill: 'var(--green)', agent: 'var(--cyan)', plugin: 'var(--purple)' }

  return `<div class="grid-3" style="margin-bottom:14px;">
    ${types.map(type => {
      const all = tools.filter(t => t.type === type)
      const used = all.filter(t => (usageMap[t.name]?.useCount ?? 0) > 0).length
      return usageCard(labels[type], colors[type], all.length, used)
    }).join('')}
  </div>`
}

export async function renderSkills(container, range) {
  const tools = await fetch(`/api/tools?range=${range}`).then(r => r.json())

  // usageMap: name → { useCount, lastUsedAt }
  const usageMap = Object.fromEntries(tools.map(t => [t.name, t]))

  container.innerHTML = `
    ${rangeFilter(range)}
    ${buildOverviewCards(tools, usageMap)}
    <div class="split">
      <div class="split-left">
        <div id="top-tools-panel"></div>
        <div id="unused-tools-panel"></div>
      </div>
      <div id="tools-list-panel"></div>
    </div>`

  // 绑定时间筛选
  container.querySelectorAll('.range-btn').forEach(btn => {
    btn.addEventListener('click', () => setRange(btn.dataset.range))
  })

  // 子模块（后续 Task 实现）
  renderTopTools(document.getElementById('top-tools-panel'), tools, range)
  renderUnusedTools(document.getElementById('unused-tools-panel'), tools)
  renderToolsList(document.getElementById('tools-list-panel'), tools, range)
}
```

- [ ] **Step 2: Commit skeleton**

```bash
git add public/js/skills.js
git commit -m "feat: add skills overview cards skeleton"
```

---

### Task 7.2: 最常用 Top 5 + 从未使用列表

**Files:**
- Modify: `public/js/skills.js`（追加 `renderTopTools` 和 `renderUnusedTools`）

- [ ] **Step 1: Write failing tests**

```js
// tests/skills/topTools.test.js
import { buildTopToolsHtml, buildUnusedToolsHtml } from '../../public/js/skills.js'

const tools = [
  { name: 'skill-vetter', type: 'skill', useCount: 42, lastUsedAt: '2026-03-24T10:00:00Z', installedAt: '2026-01-10T00:00:00Z' },
  { name: 'data-assistant', type: 'agent', useCount: 31, lastUsedAt: '2026-03-25T09:00:00Z', installedAt: '2026-01-15T00:00:00Z' },
  { name: 'multi-search', type: 'skill', useCount: 18, lastUsedAt: '2026-03-20T08:00:00Z', installedAt: '2026-02-01T00:00:00Z' },
  { name: 'keybindings-help', type: 'skill', useCount: 0, lastUsedAt: null, installedAt: '2025-12-01T00:00:00Z' },
  { name: 'unused-agent', type: 'agent', useCount: 0, lastUsedAt: null, installedAt: '2026-01-05T00:00:00Z' },
]

test('buildTopToolsHtml returns top 5 sorted by useCount', () => {
  const html = buildTopToolsHtml(tools, '30d')
  expect(html).toContain('skill-vetter')
  expect(html).toContain('42')
  expect(html).toContain('data-assistant')
  expect(html).toContain('31')
  // zero-use tools should not appear
  expect(html).not.toContain('keybindings-help')
})

test('buildTopToolsHtml returns empty message when no tools used', () => {
  const html = buildTopToolsHtml([], '7d')
  expect(html).toContain('暂无使用记录')
})

test('buildUnusedToolsHtml lists never-used tools with install days', () => {
  const html = buildUnusedToolsHtml(tools)
  expect(html).toContain('keybindings-help')
  expect(html).toContain('unused-agent')
  // used tools should not appear
  expect(html).not.toContain('skill-vetter')
})

test('buildUnusedToolsHtml returns null when all tools are used', () => {
  const used = tools.filter(t => t.useCount > 0)
  const html = buildUnusedToolsHtml(used)
  expect(html).toBeNull()
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/huangxiaoxuan/Claude/cc-insight
node --experimental-vm-modules node_modules/.bin/jest tests/skills/topTools.test.js
```

Expected: FAIL — `buildTopToolsHtml` / `buildUnusedToolsHtml` not exported

- [ ] **Step 3: Append renderTopTools and renderUnusedTools to skills.js**

在 `public/js/skills.js` 末尾追加（`renderSkills` 函数之前插入这两个函数，并在文件顶部 import 后追加 export）：

```js
// ─── 颜色映射（与 usageCard 保持一致） ─────────────────────
const TYPE_COLOR = {
  skill:  'var(--green)',
  agent:  'var(--cyan)',
  plugin: 'var(--purple)',
}

// ─── 辅助：安装至今天数 ────────────────────────────────────
function daysSince(isoStr) {
  if (!isoStr) return 0
  return Math.floor((Date.now() - new Date(isoStr).getTime()) / 86400000)
}

// ─── Top 5 标签云 ──────────────────────────────────────────
export function buildTopToolsHtml(tools, range) {
  const rangeLabel = { '7d': '7 天', '30d': '30 天', '90d': '90 天', all: '全部时间' }
  const used = tools
    .filter(t => (t.useCount ?? 0) > 0)
    .sort((a, b) => b.useCount - a.useCount)
    .slice(0, 5)

  if (used.length === 0) {
    return `
      <div class="panel" style="margin-bottom:10px;">
        <div class="panel-label">近期最常用</div>
        <div style="color:var(--muted);font-size:14px;padding:8px 0;">暂无使用记录</div>
      </div>`
  }

  const tags = used.map(t => {
    const color = TYPE_COLOR[t.type] ?? 'var(--green)'
    return `
      <div style="display:flex;align-items:center;gap:4px;
        background:${color}10;border:1px solid ${color}40;
        border-radius:3px;padding:4px 10px;">
        <span style="color:${color};font-size:14px;">${t.name}</span>
        <span style="color:var(--muted);font-size:12px;">${t.useCount}次</span>
      </div>`
  }).join('')

  return `
    <div class="panel" style="margin-bottom:10px;">
      <div class="panel-label">近 ${rangeLabel[range] ?? range} 最常用</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">${tags}</div>
    </div>`
}

// ─── 从未使用列表（有则显示，无则 null） ──────────────────
export function buildUnusedToolsHtml(tools) {
  const unused = tools.filter(t => (t.useCount ?? 0) === 0)
  if (unused.length === 0) return null

  const rows = unused.map(t => {
    const days = daysSince(t.installedAt)
    const color = TYPE_COLOR[t.type] ?? 'var(--green)'
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;
        padding:5px 0;border-bottom:1px solid var(--border);">
        <span style="color:var(--muted);font-size:14px;">
          <span style="color:${color};font-size:11px;margin-right:4px;">
            ${t.type.toUpperCase()[0]}
          </span>${t.name}
        </span>
        <span style="color:var(--red);font-size:12px;">闲置 ${days} 天</span>
      </div>`
  }).join('')

  return `
    <div class="panel" style="margin-bottom:10px;">
      <div class="panel-label" style="color:var(--red);">从未使用（${unused.length}）</div>
      <div style="margin-top:6px;">${rows}</div>
    </div>`
}

export function renderTopTools(container, tools, range) {
  container.innerHTML = buildTopToolsHtml(tools, range)
}

export function renderUnusedTools(container, tools) {
  const html = buildUnusedToolsHtml(tools)
  container.innerHTML = html ?? ''
  container.style.display = html ? '' : 'none'
}
```

同时将 `skills.js` 顶部的 stub 占位删除（`renderTopTools` / `renderUnusedTools` 原来只有声明），替换为对上方函数的直接调用（Task 7.1 已写好调用，此处不需修改调用方，只需确认函数名一致）。

- [ ] **Step 4: Run tests to verify they pass**

```bash
node --experimental-vm-modules node_modules/.bin/jest tests/skills/topTools.test.js
```

Expected: PASS (4 tests)

- [ ] **Step 5: Add `.panel` and `.panel-label` CSS to index.html**

在 `public/index.html` 的 `<style>` 里已有 `.card` 定义，在其下方追加：

```css
.panel { background: var(--surface); border: 1px solid var(--border); border-radius: 5px; padding: 10px 12px; }
.panel-label { font-size: 11px; letter-spacing: 1px; color: var(--muted); text-transform: uppercase; }
```

- [ ] **Step 6: Commit**

```bash
git add public/js/skills.js public/index.html tests/skills/topTools.test.js
git commit -m "feat: add top tools tag cloud and unused tools list"
```

---

### Task 7.3: 工具完整列表（右侧面板）

**Files:**
- Modify: `public/js/skills.js`（追加 `buildToolsListHtml` / `renderToolsList` / `bindFilterTabs`）
- Create: `tests/skills/toolsList.test.js`

Task 7.1 骨架已调用 `renderToolsList(document.getElementById('tools-list-panel'), tools, range)`，此 Task 实现该函数。

右侧面板布局：
- 顶部：筛选 tab（全部 / Skill / Agent / Plugin / 吃灰），客户端过滤，无需重新请求
- 列表：每条工具以卡片形式展示全部字段（见设计文档 §5.2）
- 吃灰规则：`lastUsedAt` 距今 > 30 天，或从未使用且安装 > 30 天 → 卡片左边框红色 + 整体 opacity 0.5

`/api/tools` 已 spread DB 全字段（`description`、`source_type`、`source_url`、`installed_at`、`updated_at`、`security_scan_result`），API 无需改动。

- [ ] **Step 1: Write tests/skills/toolsList.test.js**

```js
// tests/skills/toolsList.test.js
import { buildToolsListHtml } from '../../public/js/skills.js'

const NOW = Date.now()
const daysAgo = (n) => new Date(NOW - n * 86400_000).toISOString()

const TOOLS = [
  {
    name: 'multi-search', type: 'skill', useCount: 42,
    lastUsedAt: daysAgo(3), installedAt: daysAgo(90),
    updatedAt: daysAgo(30), description: '多渠道并行搜索工具',
    sourceType: 'downloaded', sourceUrl: 'https://example.com/multi-search',
    securityScanResult: 'safe',
  },
  {
    name: 'agent-browser', type: 'agent', useCount: 0,
    lastUsedAt: null, installedAt: daysAgo(60),
    updatedAt: daysAgo(60), description: '浏览器自动化 agent',
    sourceType: 'downloaded', sourceUrl: null,
    securityScanResult: 'unscanned',
  },
  {
    name: 'figma-mcp', type: 'plugin', useCount: 5,
    lastUsedAt: daysAgo(2), installedAt: daysAgo(20),
    updatedAt: daysAgo(10), description: '',
    sourceType: 'self', sourceUrl: null,
    securityScanResult: 'warning',
  },
  {
    name: 'old-unused', type: 'skill', useCount: 1,
    lastUsedAt: daysAgo(45), installedAt: daysAgo(100),
    updatedAt: daysAgo(100), description: '很久没用了',
    sourceType: 'downloaded', sourceUrl: null,
    securityScanResult: 'safe',
  },
]

test('renders one card per tool', () => {
  const html = buildToolsListHtml(TOOLS)
  expect(html).toContain('multi-search')
  expect(html).toContain('agent-browser')
  expect(html).toContain('figma-mcp')
  expect(html).toContain('old-unused')
})

test('shows description', () => {
  const html = buildToolsListHtml(TOOLS)
  expect(html).toContain('多渠道并行搜索工具')
  expect(html).toContain('浏览器自动化 agent')
})

test('shows security scan badge', () => {
  const html = buildToolsListHtml(TOOLS)
  expect(html).toContain('✓ 安全')     // multi-search: safe
  expect(html).toContain('未审查')      // agent-browser: unscanned
  expect(html).toContain('⚠ 警告')    // figma-mcp: warning
})

test('marks dust tools (30+ days unused) with data-dust="true"', () => {
  const html = buildToolsListHtml(TOOLS)
  // agent-browser: never used, installed 60 days ago → dust
  expect(html).toMatch(/data-name="agent-browser"[^>]*data-dust="true"/)
  // old-unused: last used 45 days ago → dust
  expect(html).toMatch(/data-name="old-unused"[^>]*data-dust="true"/)
  // multi-search: last used 3 days ago → not dust
  expect(html).not.toMatch(/data-name="multi-search"[^>]*data-dust="true"/)
})

test('shows source type label', () => {
  const html = buildToolsListHtml(TOOLS)
  expect(html).toContain('下载')   // sourceType: downloaded
  expect(html).toContain('自建')   // sourceType: self
})

test('renders filter tabs', () => {
  const html = buildToolsListHtml(TOOLS)
  expect(html).toContain('data-filter="all"')
  expect(html).toContain('data-filter="skill"')
  expect(html).toContain('data-filter="agent"')
  expect(html).toContain('data-filter="plugin"')
  expect(html).toContain('data-filter="dust"')
})

test('each card has delete button with data-name and data-type', () => {
  const html = buildToolsListHtml(TOOLS)
  expect(html).toContain('data-name="multi-search"')
  expect(html).toContain('data-type="skill"')
})

test('empty list renders empty-state message', () => {
  const html = buildToolsListHtml([])
  expect(html).toContain('暂无')
})
```

- [ ] **Step 2: Run tests (expect FAIL — function not yet written)**

```bash
node --experimental-vm-modules node_modules/.bin/jest tests/skills/toolsList.test.js
```

- [ ] **Step 3: Append buildToolsListHtml + bindFilterTabs + renderToolsList to public/js/skills.js**

在 `skills.js` 末尾追加（`renderUnusedTools` 之后）：

```js
// ─── 工具完整列表（右侧面板） ──────────────────────────

const TYPE_BADGE = {
  skill:  { label: 'S', color: 'var(--green)'  },
  agent:  { label: 'A', color: 'var(--cyan)'   },
  plugin: { label: 'P', color: 'var(--purple)' },
}

const SECURITY_BADGE = {
  safe:     { text: '✓ 安全',  color: 'var(--green)' },
  warning:  { text: '⚠ 警告', color: 'var(--amber)' },
  unscanned:{ text: '未审查',  color: 'var(--muted)' },
}

const SOURCE_LABEL = { downloaded: '下载', self: '自建' }

function fmtDate(isoOrMs) {
  if (!isoOrMs) return '—'
  const d = new Date(isoOrMs)
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

function isDust(t) {
  const DUST_DAYS = 30
  const msLimit = DUST_DAYS * 86400_000
  if (t.lastUsedAt) {
    return Date.now() - new Date(t.lastUsedAt).getTime() > msLimit
  }
  // 从未使用：以安装时间判断
  if (t.installedAt) {
    return Date.now() - new Date(t.installedAt).getTime() > msLimit
  }
  return false
}

function toolCard(t) {
  const badge    = TYPE_BADGE[t.type]    ?? { label: '?', color: 'var(--muted)' }
  const secBadge = SECURITY_BADGE[t.securityScanResult] ?? SECURITY_BADGE.unscanned
  const dust     = isDust(t)
  const sourceLabel = SOURCE_LABEL[t.sourceType] ?? t.sourceType ?? '—'

  const dustStyle = dust
    ? 'opacity:0.5;border-left:3px solid var(--red);padding-left:9px;'
    : 'border-left:3px solid transparent;padding-left:9px;'

  const sourceLink = t.sourceUrl
    ? `<a href="${t.sourceUrl}" target="_blank" rel="noopener"
        style="color:var(--muted);font-size:11px;margin-left:4px;
          text-decoration:underline;text-underline-offset:2px;"
        title="${t.sourceUrl}">链接</a>`
    : ''

  return `
    <div class="tool-card" data-name="${t.name}" data-type="${t.type}"
      data-dust="${dust}"
      style="${dustStyle}margin-bottom:8px;padding-top:8px;padding-bottom:8px;
        border-bottom:1px solid var(--border);">

      <!-- 第一行：徽章 + 名称 + 安全 + 次数 + 删除 -->
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:5px;">
        <span style="width:18px;height:18px;border-radius:3px;
          background:${badge.color}22;color:${badge.color};
          font-size:11px;font-weight:bold;flex-shrink:0;
          display:flex;align-items:center;justify-content:center;">
          ${badge.label}
        </span>
        <span style="flex:1;font-size:14px;font-weight:500;
          overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"
          title="${t.name}">
          ${t.name}
        </span>
        <span style="font-size:11px;color:${secBadge.color};flex-shrink:0;">
          ${secBadge.text}
        </span>
        <span style="font-size:13px;color:${(t.useCount??0)===0?'var(--red)':'var(--fg)'};
          flex-shrink:0;min-width:28px;text-align:right;">
          ${t.useCount ?? 0}次
        </span>
        <button class="del-btn" data-name="${t.name}" data-type="${t.type}"
          style="background:transparent;border:1px solid var(--red);
            color:var(--red);border-radius:3px;padding:2px 7px;
            font-size:11px;cursor:pointer;flex-shrink:0;opacity:0.7;">
          删除
        </button>
      </div>

      <!-- 第二行：描述 -->
      ${t.description ? `
      <div style="font-size:12px;color:var(--muted);margin-bottom:4px;
        overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"
        title="${t.description}">
        ${t.description}
      </div>` : ''}

      <!-- 第三行：元数据 -->
      <div style="font-size:11px;color:var(--muted);display:flex;
        gap:12px;flex-wrap:wrap;align-items:center;">
        <span>来源: ${sourceLabel}${sourceLink}</span>
        <span>安装: ${fmtDate(t.installedAt)}</span>
        <span>更新: ${fmtDate(t.updatedAt)}</span>
        <span>上次: ${fmtDate(t.lastUsedAt)}</span>
        ${dust ? `<span style="color:var(--red);">吃灰</span>` : ''}
      </div>
    </div>`
}

export function buildToolsListHtml(tools) {
  if (tools.length === 0) {
    return `<div style="color:var(--muted);font-size:13px;
      padding:20px 0;text-align:center;">暂无工具数据</div>`
  }

  const dustCount = tools.filter(isDust).length
  const tabs = [
    { key: 'all',    label: `全部 (${tools.length})` },
    { key: 'skill',  label: `Skill (${tools.filter(t=>t.type==='skill').length})` },
    { key: 'agent',  label: `Agent (${tools.filter(t=>t.type==='agent').length})` },
    { key: 'plugin', label: `Plugin (${tools.filter(t=>t.type==='plugin').length})` },
    { key: 'dust',   label: `吃灰 (${dustCount})` },
  ]

  const tabHtml = tabs.map((tab, i) => `
    <button class="filter-tab ${i===0?'active':''}"
      data-filter="${tab.key}"
      style="background:transparent;border:none;cursor:pointer;
        padding:4px 10px;font-size:12px;border-radius:3px;
        color:${i===0?'var(--fg)':'var(--muted)'};
        background:${i===0?'var(--surface2)':'transparent'};">
      ${tab.label}
    </button>`).join('')

  const cardsHtml = tools.map(toolCard).join('')

  return `
    <div class="panel" style="height:100%;display:flex;flex-direction:column;">
      <div class="panel-label" style="margin-bottom:8px;">全部工具</div>
      <!-- 筛选 tab -->
      <div style="display:flex;gap:4px;margin-bottom:10px;flex-wrap:wrap;">
        ${tabHtml}
      </div>
      <!-- 卡片列表 -->
      <div id="tools-card-list" style="overflow-y:auto;flex:1;">
        ${cardsHtml}
      </div>
    </div>`
}

// ─── 筛选 tab 事件绑定 ───────────────────────────────
export function bindFilterTabs(container) {
  container.querySelectorAll('.filter-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      // 更新 tab 样式
      container.querySelectorAll('.filter-tab').forEach(b => {
        b.style.color = 'var(--muted)'
        b.style.background = 'transparent'
      })
      btn.style.color = 'var(--fg)'
      btn.style.background = 'var(--surface2)'

      const filter = btn.dataset.filter
      container.querySelectorAll('.tool-card').forEach(card => {
        const match =
          filter === 'all'  ? true :
          filter === 'dust' ? card.dataset.dust === 'true' :
          card.dataset.type === filter
        card.style.display = match ? '' : 'none'
      })
    })
  })
}

export function renderToolsList(container, tools, _range, onDeleted) {
  container.innerHTML = buildToolsListHtml(tools)
  bindFilterTabs(container)
  // 删除按钮事件由 Task 7.4 的 bindDeleteButtons() 注册
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
node --experimental-vm-modules node_modules/.bin/jest tests/skills/toolsList.test.js
```

Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add public/js/skills.js tests/skills/toolsList.test.js
git commit -m "feat: add full tools list with filter tabs, dust marker, security badge, all spec fields"
```

---

### Task 7.4: 删除功能（前端 + API）

**Files:**
- Modify: `src/api.js`（追加 DELETE `/api/tools/:name` 路由）
- Modify: `public/js/skills.js`（追加 `bindDeleteButtons`，接线删除按钮）
- Create: `tests/skills/deleteFlow.test.js`

点击「删除」按钮后：弹出确认对话框 → 调用 `DELETE /api/tools/:name?type=xxx` → 后端物理删除 skill/agent/plugin 目录下对应文件夹 → 前端刷新工具列表。

**安全边界：** 仅允许删除 `~/.claude/skills/`、`~/.claude/plugins/` 下的目录，路径严格校验，禁止 `..` 穿越。

- [ ] **Step 1: Write tests/skills/deleteFlow.test.js**

```js
// tests/skills/deleteFlow.test.js
// 测试后端删除路由的路径校验逻辑（不真实删文件）
import { validateToolPath } from '../../src/api.js'
import path from 'path'

const CLAUDE_DIR = '/Users/test/.claude'

test('accepts valid skill path', () => {
  expect(() => validateToolPath('multi-search', 'skill', CLAUDE_DIR)).not.toThrow()
})

test('accepts valid plugin path', () => {
  expect(() => validateToolPath('figma-mcp', 'plugin', CLAUDE_DIR)).not.toThrow()
})

test('rejects path traversal in name', () => {
  expect(() => validateToolPath('../../../etc/passwd', 'skill', CLAUDE_DIR)).toThrow()
})

test('rejects unknown type', () => {
  expect(() => validateToolPath('foo', 'unknown-type', CLAUDE_DIR)).toThrow()
})

test('returns absolute path within claude dir', () => {
  const p = validateToolPath('multi-search', 'skill', CLAUDE_DIR)
  expect(p.startsWith(CLAUDE_DIR)).toBe(true)
  expect(path.isAbsolute(p)).toBe(true)
})
```

- [ ] **Step 2: Run tests (expect FAIL)**

```bash
node --experimental-vm-modules node_modules/.bin/jest tests/skills/deleteFlow.test.js
```

- [ ] **Step 3: Add validateToolPath + DELETE route to src/api.js**

在 `src/api.js` 中，找到已有路由注册部分，追加：

```js
import fs from 'fs'
import path from 'path'
import { getClaudeDir } from './config.js'

// ─── 工具路径校验（导出供测试使用） ───────────────────────
const TYPE_DIR = {
  skill:  'skills',
  agent:  'skills',   // agent skill 也在 skills/ 目录
  plugin: 'plugins',
}

export function validateToolPath(name, type, claudeDir = getClaudeDir()) {
  if (!TYPE_DIR[type]) throw new Error(`未知工具类型: ${type}`)
  if (!name || name.includes('..') || name.includes('/') || name.includes('\\')) {
    throw new Error(`非法工具名称: ${name}`)
  }
  const base = path.join(claudeDir, TYPE_DIR[type])
  const target = path.resolve(base, name)
  // 确保 target 在 base 目录内
  if (!target.startsWith(base + path.sep) && target !== base) {
    throw new Error(`路径越界: ${target}`)
  }
  return target
}

// ─── DELETE /api/tools/:name ─────────────────────────────
// Query param: type=skill|agent|plugin
router.delete('/tools/:name', async (req, res) => {
  const { name } = req.params
  const { type }  = req.query

  let targetPath
  try {
    targetPath = validateToolPath(name, type)
  } catch (err) {
    return res.status(400).json({ error: err.message })
  }

  if (!fs.existsSync(targetPath)) {
    return res.status(404).json({ error: `工具目录不存在: ${targetPath}` })
  }

  try {
    fs.rmSync(targetPath, { recursive: true, force: true })
    // 同步删除 DB 中的记录
    const { deleteToolRecord } = await import('./db/queries.js')
    deleteToolRecord(name)
    res.json({ ok: true, deleted: targetPath })
  } catch (err) {
    res.status(500).json({ error: `删除失败: ${err.message}` })
  }
})
```

> 注意：`deleteToolRecord` 需要在 `src/db/queries.js` 中新增（Step 4）。

- [ ] **Step 4: Add deleteToolRecord to src/db/queries.js**

在 `src/db/queries.js` 末尾追加：

```js
export function deleteToolRecord(name) {
  return getDb().prepare(`DELETE FROM tools WHERE name = ?`).run(name)
}
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
node --experimental-vm-modules node_modules/.bin/jest tests/skills/deleteFlow.test.js
```

Expected: PASS (5 tests)

- [ ] **Step 6: Add bindDeleteButtons to public/js/skills.js**

在 `renderToolsList` 函数之后追加，并修改 `renderToolsList` 以调用它：

```js
// ─── 删除按钮事件绑定 ────────────────────────────────────
export function bindDeleteButtons(container, onDeleted) {
  container.querySelectorAll('.del-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const { name, type } = btn.dataset
      if (!confirm(`确认删除「${name}」？此操作不可撤销。`)) return

      btn.disabled = true
      btn.textContent = '删除中…'

      try {
        const res = await fetch(`/api/tools/${encodeURIComponent(name)}?type=${type}`, {
          method: 'DELETE',
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error ?? '删除失败')
        // 成功：移除该行，并回调刷新上层面板
        btn.closest('.tool-row')?.remove()
        if (typeof onDeleted === 'function') onDeleted(name, type)
      } catch (err) {
        alert(`删除失败：${err.message}`)
        btn.disabled = false
        btn.textContent = '删除'
      }
    })
  })
}
```

同时将 `renderToolsList` 修改为：

```js
export function renderToolsList(container, tools, _range, onDeleted) {
  container.innerHTML = buildToolsListHtml(tools)
  bindDeleteButtons(container, onDeleted)
}
```

并在 `skills.js` 的 `renderSkills` 函数中，将 `renderToolsList` 调用改为传入 `onDeleted` 回调：

```js
// 原来：
renderToolsList(document.getElementById('tools-list-panel'), tools, range)

// 改为：
renderToolsList(
  document.getElementById('tools-list-panel'),
  tools,
  range,
  (_name, _type) => renderSkills(container, range)  // 删除后整页刷新
)
```

- [ ] **Step 7: 端到端手动验证**

```bash
cd /Users/huangxiaoxuan/Claude/cc-insight && node bin/cc-insight.js
```

验证步骤：
1. 打开浏览器 → Skills 页
2. 在工具列表中找到一个测试用 skill（如果没有先手动创建一个假目录 `~/.claude/skills/test-delete-skill/`）
3. 点击「删除」→ 弹出确认对话框 → 确认
4. 该行从列表消失，概览卡片数量同步减少
5. 刷新页面，该工具不再出现

- [ ] **Step 8: Commit**

```bash
git add src/api.js src/db/queries.js public/js/skills.js tests/skills/deleteFlow.test.js
git commit -m "feat: add tool delete API and frontend delete button with confirmation"
```

---

### Task 7.5: RECOMMENDATIONS 面板 + 批量清理

**Files:**
- Modify: `public/js/skills.js`（追加 `buildRecommendationsHtml` / `renderRecommendations` / `bindBulkClean`）
- Modify: `src/api.js`（追加 `DELETE /api/tools/bulk-dust` 路由）
- Modify: `src/db/queries.js`（追加 `getDustToolNames`）
- Create: `tests/skills/recommendations.test.js`

设计文档 §5.2 + §6 要求左下角有 RECOMMENDATIONS 区块。本期只实现「建议清理」（吃灰工具一键批量清理），「建议安装」不在一期范围内。

RECOMMENDATIONS 挂载在 Task 7.1 骨架的 `split-left` 底部，需同步在 `renderSkills` 中追加 `<div id="recommendations-panel"></div>` 并调用 `renderRecommendations`。

吃灰判断规则与 Task 7.3 保持一致（同一 `isDust()` 函数）：`lastUsedAt` 距今 > 30 天，或从未使用且安装 > 30 天。

- [ ] **Step 1: Write tests/skills/recommendations.test.js**

```js
// tests/skills/recommendations.test.js
import { buildRecommendationsHtml } from '../../public/js/skills.js'

const NOW = Date.now()
const daysAgo = (n) => new Date(NOW - n * 86400_000).toISOString()

const TOOLS_WITH_DUST = [
  { name: 'multi-search',   type: 'skill',  useCount: 42, lastUsedAt: daysAgo(2),  installedAt: daysAgo(90) },
  { name: 'agent-browser',  type: 'agent',  useCount: 0,  lastUsedAt: null,        installedAt: daysAgo(60) },
  { name: 'old-skill',      type: 'skill',  useCount: 3,  lastUsedAt: daysAgo(45), installedAt: daysAgo(120) },
  { name: 'fresh-plugin',   type: 'plugin', useCount: 1,  lastUsedAt: daysAgo(5),  installedAt: daysAgo(10) },
]

const TOOLS_ALL_ACTIVE = [
  { name: 'multi-search', type: 'skill', useCount: 10, lastUsedAt: daysAgo(1), installedAt: daysAgo(30) },
]

test('shows dust tool count in message', () => {
  const html = buildRecommendationsHtml(TOOLS_WITH_DUST)
  // agent-browser + old-skill = 2 dust tools
  expect(html).toContain('2')
})

test('renders 一键清理 button when dust tools exist', () => {
  const html = buildRecommendationsHtml(TOOLS_WITH_DUST)
  expect(html).toContain('bulk-clean-btn')
  expect(html).toContain('一键清理')
})

test('returns null when no dust tools', () => {
  const result = buildRecommendationsHtml(TOOLS_ALL_ACTIVE)
  expect(result).toBeNull()
})

test('lists dust tool names', () => {
  const html = buildRecommendationsHtml(TOOLS_WITH_DUST)
  expect(html).toContain('agent-browser')
  expect(html).toContain('old-skill')
  expect(html).not.toContain('multi-search')
})
```

- [ ] **Step 2: Run tests (expect FAIL)**

```bash
node --experimental-vm-modules node_modules/.bin/jest tests/skills/recommendations.test.js
```

- [ ] **Step 3: Add getDustToolNames to src/db/queries.js**

在 `src/db/queries.js` 末尾追加：

```js
// 返回吃灰工具的 name + type 列表（30天未使用，或从未使用且安装>30天）
// tools 表无 last_used_at 列，需从 tool_invocations 聚合
export function getDustToolNames() {
  const DUST_MS = 30 * 86400 * 1000
  const cutoff  = Date.now() - DUST_MS

  // 有使用记录但最近一次 invoked_at 超过30天
  const byLastUsed = getDb().prepare(`
    SELECT t.name, t.type
    FROM tools t
    JOIN (
      SELECT tool_name, MAX(invoked_at) as last_used
      FROM tool_invocations
      GROUP BY tool_name
    ) inv ON inv.tool_name = t.name
    WHERE inv.last_used < ?
  `).all(cutoff)

  // 从未有任何调用记录，且安装超过30天
  const byNeverUsed = getDb().prepare(`
    SELECT t.name, t.type
    FROM tools t
    LEFT JOIN tool_invocations ti ON ti.tool_name = t.name
    WHERE ti.id IS NULL
      AND t.installed_at IS NOT NULL
      AND t.installed_at < ?
  `).all(cutoff)

  const seen = new Set()
  return [...byLastUsed, ...byNeverUsed].filter(r => {
    if (seen.has(r.name)) return false
    seen.add(r.name)
    return true
  })
}
```

- [ ] **Step 4: Add DELETE /api/tools/bulk-dust to src/api.js**

在 `src/api.js` 中，**在 Task 7.4 的 `router.delete('/tools/:name', ...)` 之前**插入（Express 按注册顺序匹配，`/tools/bulk-dust` 必须先于 `/:name`，否则 `bulk-dust` 会被当成 `:name` 参数）：

```js
// DELETE /api/tools/bulk-dust — 批量删除所有吃灰工具
// ⚠️ 必须注册在 /tools/:name 路由之前
router.delete('/tools/bulk-dust', async (req, res) => {
  const dustTools = getDustToolNames()
  const results = { deleted: [], failed: [] }

  for (const { name, type } of dustTools) {
    try {
      const targetPath = validateToolPath(name, type)
      if (fs.existsSync(targetPath)) {
        fs.rmSync(targetPath, { recursive: true, force: true })
      }
      deleteToolRecord(name)
      results.deleted.push(name)
    } catch (err) {
      results.failed.push({ name, error: err.message })
    }
  }

  res.json(results)
})
```

同时在 `src/api.js` 顶部 import 处补充 `getDustToolNames`：

```js
import {
  // ...已有的 imports...
  getDustToolNames,
} from './db/queries.js'
```

- [ ] **Step 5: Append buildRecommendationsHtml + bindBulkClean + renderRecommendations to public/js/skills.js**

在 `skills.js` 末尾（`renderToolsList` 之后）追加：

```js
// ─── RECOMMENDATIONS 面板 ────────────────────────────

export function buildRecommendationsHtml(tools) {
  const dustTools = tools.filter(isDust)
  if (dustTools.length === 0) return null

  const names = dustTools.map(t => `
    <span style="color:var(--muted);font-size:12px;
      background:var(--bg3);border-radius:3px;padding:2px 6px;">
      ${t.name}
    </span>`).join('')

  return `
    <div style="margin-top:12px;">
      <div style="font-size:11px;letter-spacing:1px;color:var(--muted);
        text-transform:uppercase;margin-bottom:8px;">
        Recommendations
      </div>

      <!-- 建议清理 -->
      <div style="background:color-mix(in srgb,var(--red) 8%,transparent);
        border:1px solid color-mix(in srgb,var(--red) 30%,transparent);
        border-radius:5px;padding:10px 12px;">
        <div style="display:flex;justify-content:space-between;
          align-items:flex-start;gap:10px;">
          <div>
            <div style="font-size:13px;color:var(--red);margin-bottom:6px;">
              建议清理：${dustTools.length} 个工具超 30 天未使用，
              清理可减少 session 上下文噪音。
            </div>
            <div style="display:flex;gap:5px;flex-wrap:wrap;">
              ${names}
            </div>
          </div>
          <button id="bulk-clean-btn"
            style="background:var(--red);color:#fff;border:none;
              border-radius:4px;padding:5px 14px;font-size:12px;
              cursor:pointer;white-space:nowrap;flex-shrink:0;
              font-family:var(--font);">
            一键清理 →
          </button>
        </div>
      </div>
    </div>`
}

export function bindBulkClean(container, onCleaned) {
  const btn = container.querySelector('#bulk-clean-btn')
  if (!btn) return

  btn.addEventListener('click', async () => {
    const count = container.querySelectorAll(
      '.tool-card[data-dust="true"]').length
    if (!confirm(`确认批量删除 ${count} 个吃灰工具？此操作不可撤销。`)) return

    btn.disabled = true
    btn.textContent = '清理中…'

    try {
      const res  = await fetch('/api/tools/bulk-dust', { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error('批量清理失败')

      const deleted = data.deleted ?? []
      const failed  = data.failed  ?? []

      if (failed.length > 0) {
        alert(`清理完成：成功 ${deleted.length} 个，失败 ${failed.length} 个。`)
      }
      if (typeof onCleaned === 'function') onCleaned(deleted)
    } catch (err) {
      alert(`清理失败：${err.message}`)
      btn.disabled = false
      btn.textContent = '一键清理 →'
    }
  })
}

export function renderRecommendations(container, tools, onCleaned) {
  const html = buildRecommendationsHtml(tools)
  if (!html) {
    container.innerHTML = ''
    container.style.display = 'none'
    return
  }
  container.style.display = ''
  container.innerHTML = html
  bindBulkClean(container, onCleaned)
}
```

- [ ] **Step 6: 在 Task 7.1 的 renderSkills 骨架中补充 recommendations-panel 挂载点**

在 `skills.js` 的 `renderSkills` 函数中，将 `split-left` 部分改为：

```js
// 原来：
<div class="split-left">
  <div id="top-tools-panel"></div>
  <div id="unused-tools-panel"></div>
</div>

// 改为：
<div class="split-left">
  <div id="top-tools-panel"></div>
  <div id="unused-tools-panel"></div>
  <div id="recommendations-panel"></div>
</div>
```

同时在 `renderSkills` 末尾追加调用：

```js
renderRecommendations(
  document.getElementById('recommendations-panel'),
  tools,
  (_deleted) => renderSkills(container, range)  // 清理后整页刷新
)
```

- [ ] **Step 7: Run tests to verify they pass**

```bash
node --experimental-vm-modules node_modules/.bin/jest tests/skills/recommendations.test.js
```

Expected: PASS (4 tests)

- [ ] **Step 8: 端到端手动验证**

```bash
node bin/cc-insight.js
```

验证步骤：
1. 打开 Skills 页，确认左下角出现 RECOMMENDATIONS 区块（需有吃灰工具才显示）
2. 点击「一键清理 →」→ 弹出确认对话框，含吃灰工具数量
3. 确认后工具卡片从列表消失，概览卡片数量同步减少
4. RECOMMENDATIONS 区块在无吃灰工具时自动隐藏
5. 若部分工具删除失败，弹出提示说明成功/失败数量

- [ ] **Step 9: Commit**

```bash
git add src/api.js src/db/queries.js public/js/skills.js \
        tests/skills/recommendations.test.js
git commit -m "feat: add recommendations panel with bulk dust-tool cleanup"
```

---

Part 7 完成。

---

## Part 8: CLI 入口

### Task 8.1: bin/cc-insight.js

**Files:**
- Write: `bin/cc-insight.js`

- [ ] **Step 1: Write bin/cc-insight.js**

```js
#!/usr/bin/env node
// bin/cc-insight.js
import { createAppServer } from '../src/server.js'
import { runFullIndex } from '../src/indexer.js'
import { startWatcher } from '../src/watcher.js'
import { getMeta } from '../src/db/db.js'
import open from 'open'

const PORT = parseInt(process.env.CC_PORT ?? '3847')

async function main() {
  const srv = createAppServer()
  const port = await srv.listen(PORT)
  const url = `http://127.0.0.1:${port}`

  console.log(`\nCC Insight running → ${url}\n`)

  const alreadyIndexed = getMeta('last_full_index')

  if (!alreadyIndexed) {
    // 首次启动：显示进度屏，建库完成后发 ready
    console.log('首次启动，建立索引中...')
    await runFullIndex((pct) => {
      process.stdout.write(`\r  索引进度: ${pct}%`)
      srv.sendProgress(pct)
    })
    console.log('\n索引完成。')
    srv.sendProgress(100)
    // 稍等前端收到 100% 后再发 ready
    setTimeout(() => srv.sendRefresh(), 600)
  } else {
    // 非首次：直接发 ready，前端立即显示 dashboard
    srv.sendRefresh()
  }

  // 启动文件监听
  startWatcher(() => srv.sendRefresh())

  // 自动打开浏览器
  await open(url)

  // 进程退出时清理
  process.on('SIGINT', () => {
    console.log('\nCC Insight stopped.')
    process.exit(0)
  })
}

main().catch(err => {
  console.error('启动失败:', err.message)
  process.exit(1)
})
```

- [ ] **Step 2: Make executable**

```bash
chmod +x /Users/huangxiaoxuan/Claude/cc-insight/bin/cc-insight.js
```

- [ ] **Step 3: End-to-end smoke test**

```bash
cd /Users/huangxiaoxuan/Claude/cc-insight && node bin/cc-insight.js
```

Expected:
- 终端打印 `CC Insight running → http://127.0.0.1:3847`
- 如首次运行，打印索引进度
- 浏览器自动打开 Dashboard
- Ctrl+C 退出干净

- [ ] **Step 4: Commit**

```bash
git add bin/cc-insight.js
git commit -m "feat: add CLI entry point with first-run indexing and browser auto-open"
```

---

### Task 8.2: 首次启动进度屏联调

**Files:**
- Modify: `public/js/app.js`

确认 WebSocket `progress` 消息能正确驱动进度条，`ready`/`refresh` 消息能正确隐藏进度屏、显示 Dashboard。

- [ ] **Step 1: 验证首次启动流程**

```bash
# 删除已有 DB，模拟首次启动
rm -f ~/.cc-insight/data.db
cd /Users/huangxiaoxuan/Claude/cc-insight && node bin/cc-insight.js
```

Expected：
- 浏览器显示进度屏「CC Insight — 正在建立索引」
- 进度条从 0% 涨到 100%
- 自动切换到 Dashboard，显示使用概览数据

- [ ] **Step 2: 验证非首次启动**

```bash
# 不删 DB，再次启动
node bin/cc-insight.js
```

Expected：浏览器直接显示 Dashboard，无进度屏

- [ ] **Step 3: Commit（如有修复）**

```bash
git add -A && git commit -m "fix: first-run progress screen end-to-end"
```

---

Part 8 完成。

---

## Part 9: README

### Task 9.1: 写 README.md

**Files:**
- Write: `README.md`

- [ ] **Step 1: Write README.md**

```markdown
# CC Insight

A local CLI dashboard for your Claude Code usage. Reads `~/.claude/` data,
indexes it locally, and opens a real-time browser dashboard — no uploads,
no servers, no tracking.

![CC Insight Dashboard](docs/screenshot.png)

## Features

- **Usage Overview** — sessions, total time, peak hours, activity heatmap
- **Skill & Agent Manager** — usage stats, dust detection, one-click delete
- **Real-time** — auto-refreshes as you use Claude Code
- **Dark / Light / System theme**
- **Zero telemetry** — all data stays on your machine

## Requirements

- Node.js 20+
- Claude Code installed (data lives in `~/.claude/`)

## Install

```bash
npm install -g cc-insight
```

Or with Homebrew (coming soon):

```bash
brew install cc-insight
```

## Usage

```bash
cc-insight
```

That's it. A browser window opens automatically.

First run takes a few seconds to index your history. Subsequent runs are instant.

## Custom Claude directory

If your Claude data is not in `~/.claude/`, set the `CLAUDE_DIR` environment variable:

```bash
CLAUDE_DIR=/custom/path cc-insight
```

## Custom port

Default port is `3847`. Override with `CC_PORT`:

```bash
CC_PORT=8080 cc-insight
```

## Data & Privacy

CC Insight reads these paths:

| Path | Purpose |
|------|---------|
| `~/.claude/projects/**/*.jsonl` | Session history |
| `~/.claude/skills/` | Installed skills |
| `~/.claude/plugins/` | Installed plugins |
| `~/.claude/settings.json` | Configuration |

A local SQLite database is created at `~/.cc-insight/data.db`.
Nothing leaves your machine.

## Uninstall

```bash
npm uninstall -g cc-insight
rm -rf ~/.cc-insight   # remove local database
```

## License

MIT © [Halooo](https://github.com/hopeee1108-debug)
```

- [ ] **Step 2: Commit**

```bash
cd /Users/huangxiaoxuan/Claude/cc-insight
git add README.md
git commit -m "docs: add README"
```

---

### Task 9.2: 写 README.zh.md（中文版）

**Files:**
- Write: `README.zh.md`

- [ ] **Step 1: Write README.zh.md**

```markdown
# CC Insight

Claude Code 本地使用数据看板。读取 `~/.claude/` 目录数据，在浏览器中生成你的个人使用画像——零上传、零服务器、数据不离开本机。

![CC Insight Dashboard](docs/screenshot.png)

## 功能

- **使用概览** — 对话次数、累计时长、峰值时段、活跃热力图、动态数据洞察
- **Skill & Agent 管理** — 使用统计、吃灰检测、一键删除
- **实时刷新** — 使用 Claude Code 时看板自动更新
- **深色 / 浅色 / 跟随系统** 主题切换
- **完全本地** — 所有数据留在你的机器上

## 环境要求

- Node.js 20+
- 已安装 Claude Code（数据目录默认在 `~/.claude/`）

## 安装

```bash
npm install -g cc-insight
```

Homebrew（即将支持）：

```bash
brew install cc-insight
```

## 使用

```bash
cc-insight
```

运行后浏览器自动打开。首次启动会建立本地索引（通常几秒内完成），之后每次打开秒开。

## 自定义 Claude 目录

如果你的 Claude 数据不在默认的 `~/.claude/`，可以通过环境变量指定：

```bash
CLAUDE_DIR=/custom/path cc-insight
```

## 自定义端口

默认端口 `3847`，可通过 `CC_PORT` 修改：

```bash
CC_PORT=8080 cc-insight
```

## 数据与隐私

CC Insight 只读取以下本地路径：

| 路径 | 用途 |
|------|------|
| `~/.claude/projects/**/*.jsonl` | 会话历史 |
| `~/.claude/skills/` | 已安装 skill |
| `~/.claude/plugins/` | 已安装插件 |
| `~/.claude/settings.json` | 配置信息 |

本地 SQLite 数据库创建于 `~/.cc-insight/data.db`，不会向任何服务器发送数据。

## 卸载

```bash
npm uninstall -g cc-insight
rm -rf ~/.cc-insight   # 删除本地数据库
```

## 开源协议

MIT © [Halooo](https://github.com/hopeee1108-debug)
```

- [ ] **Step 2: 在英文 README 顶部加中文版链接**

在 `README.md` 第一行下方插入：

```markdown
[中文文档](README.zh.md)
```

- [ ] **Step 3: Commit**

```bash
git add README.zh.md README.md
git commit -m "docs: add Chinese README"
```

---

Part 9 完成。
