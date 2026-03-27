# CC Insight 项目交接文档

**日期：** 2026-03-27
**用途：** 新会话上下文恢复，直接进入开发阶段

---

## 一、项目背景与目标

**CC Insight** 是一个本地 CLI 工具，读取 `~/.claude/` 目录数据，在浏览器中生成 Claude Code 个人使用画像。

**目标用户：** Claude Code 用户（开发者）
**发布路径：** 先自用 → 开源 GitHub → 视反响考虑商业化
**作者 GitHub：** hopeee1108-debug

### 核心功能
- **主题 1：使用概览** — 对话次数、累计时长、峰值时段、日均时长、活跃热力图、24H 时间分布、动态 Insights
- **主题 2：Skill & Agent & Plugin 管理** — 使用率统计、Top 5 标签云、从未使用列表、完整工具列表（含安全扫描/吃灰标记/来源/删除）、批量清理

### 技术架构
- **形态：** 本地 CLI，`npm install -g cc-insight`，运行 `cc-insight` 自动打开浏览器
- **Tech Stack：** Node.js 20+、better-sqlite3、express、ws、chokidar、open
- **数据层：** SQLite 索引（`~/.cc-insight/data.db`），首次全量扫描 + 增量更新
- **前端：** Vanilla JS，无框架，WebSocket 实时推送
- **数据源：** Claude Code CLI `~/.claude/`（主）+ Claude Desktop App `~/Library/Application Support/Claude/claude-code-sessions/`（自动检测）

---

## 二、文件路径

| 文件 | 路径 |
|------|------|
| 项目根目录 | `/Users/huangxiaoxuan/Claude/cc-insight/` |
| 原始 PRD | `/Users/huangxiaoxuan/Claude/cc-insight/docs/cc-insight-prd.md` |
| 设计文档（规格基准） | `/Users/huangxiaoxuan/Claude/cc-insight/docs/superpowers/specs/2026-03-26-cc-insight-design.md` |
| **实现计划（执行基准）** | `/Users/huangxiaoxuan/Claude/cc-insight/docs/superpowers/plans/2026-03-27-cc-insight-implementation.md` |
| 审查报告 | `/Users/huangxiaoxuan/Desktop/cc-insight-plan-review-2026-03-27.md` |
| 本交接文档 | `/Users/huangxiaoxuan/Desktop/cc-insight-handoff.md` |
| UI 原型（主题 1） | `/Users/huangxiaoxuan/Claude/cc-insight/.superpowers/brainstorm/30540-1774521595/content/theme1-overview.html` |
| UI 原型（主题 2 最终版） | `/Users/huangxiaoxuan/Claude/cc-insight/.superpowers/brainstorm/31268-1774530435/content/theme2-v3.html` |
| 审查报告 | `/Users/huangxiaoxuan/Claude/cc-insight/docs/cc-insight-plan-review-2026-03-27.md` |
| 本交接文档 | `/Users/huangxiaoxuan/Claude/cc-insight/docs/cc-insight-handoff.md` |

> **注意：** 项目目前只有文档，**源码文件一个都没有**，全部待开发。

---

## 三、实现计划任务列表（全部待执行）

| Task | 内容 | 文件 |
|------|------|------|
| 1.1 | 创建目录结构 | 多个目录 |
| 1.2 | package.json | `package.json` |
| 1.3 | src/config.js | `src/config.js` |
| 2.1 | DB Schema + 连接 | `src/db/schema.js`, `src/db/db.js` |
| 2.2 | JSONL Parser | `src/parsers/jsonl.js` |
| 2.3 | SKILL.md Parser | `src/parsers/skill-md.js` |
| 2.4 | Security Scanner | `src/parsers/security.js` |
| 3.1 | DB Query Functions | `src/db/queries.js` |
| 3.2 | Full Indexer | `src/indexer.js` |
| 3.3 | File Watcher | `src/watcher.js` |
| 4.1 | API 路由 | `src/api.js` |
| 4.2 | HTTP Server + WebSocket | `src/server.js` |
| 5.1 | HTML 主框架 | `public/index.html` |
| 5.2 | Theme Switching | `public/js/theme.js` |
| 5.3 | App 主入口 + WebSocket + 路由 | `public/js/app.js` |
| 5.4 | 主题持久化到 config.json | `src/api.js`, `public/js/theme.js` |
| 6.1 | 指标卡片 + 时间筛选 | `public/js/overview.js` |
| 6.2 | Activity Heatmap | `public/js/heatmap.js` |
| 6.3 | 24H 时间分布图 | `public/js/charts.js` |
| 6.4 | 动态 Insights 面板 | `public/js/insights.js` |
| 7.1 | Skill 页 3 个概览卡骨架 | `public/js/skills.js` |
| 7.2 | 最常用 Top 5 + 从未使用列表 | `public/js/skills.js` |
| 7.3 | 工具完整列表（筛选 tab + 全字段卡片） | `public/js/skills.js` |
| 7.4 | 删除功能（前端 + API） | `src/api.js`, `public/js/skills.js` |
| 7.5 | RECOMMENDATIONS + 批量清理 | `src/api.js`, `src/db/queries.js`, `public/js/skills.js` |
| 8.1 | CLI 入口 | `bin/cc-insight.js` |
| 8.2 | 首次启动进度屏联调 | `public/js/app.js` |
| 9.1 | README.md（英文） | `README.md` |
| 9.2 | README.zh.md（中文） | `README.zh.md` |

---

## 四、已解决的问题 / 已修复的 Bug

本节记录计划审查阶段发现并修复的所有问题，**已全部写入实现计划文件**，开发时无需再处理。

### 4.1 设计文档 vs 实现计划的缺口（5 个）

| # | 缺口 | 修复方式 |
|---|------|---------|
| 缺口 1 | `tools` 表缺少 `subtype` 字段 | Task 2.1 schema 补 `subtype TEXT` 列 |
| 缺口 2 | 主题偏好用 localStorage，设计文档要求持久化到 `~/.cc-insight/config.json` | 新增 Task 5.4：`GET/POST /api/config` + theme.js 改为读写服务端 |
| 缺口 3+4 | 工具列表字段不全（缺描述/来源/安全扫描/吃灰标记等 8 个字段）+ 无筛选 tab | Task 7.3 完整重写：卡片式布局，13 个字段，5 个筛选 tab |
| 缺口 5 | 缺 RECOMMENDATIONS 面板和批量清理功能 | 新增 Task 7.5（「建议安装」本期不实现） |

### 4.2 代码级 Bug（11 个，均已修复）

| # | Bug | 位置 | 修复内容 |
|---|-----|------|---------|
| B1 | `tools` 表缺 `subtype`，`upsertTool` 没写入 | Task 2.1 / Task 3.1 | schema 加列，`upsertTool` 补参数和 SQL |
| B2 | `getDustToolNames` 查询 `tools.last_used_at`（该列不存在） | Task 7.5 | 改为 JOIN `tool_invocations` 聚合 |
| B3 | Task 4.1 简单 DELETE 路由与 Task 7.4 完整版路由冲突 | Task 4.1 | 简单版改为注释占位，完整版在 Task 7.4 |
| B4 | Task 7.4 DELETE handler 缺 `async`，内部用了 `await` | Task 7.4 | 改为 `async (req, res) =>` |
| B5 | `import { CLAUDE_DIR }` 但 config.js 只导出函数 `getClaudeDir()` | Task 7.4 | 改为 `import { getClaudeDir }` 并更新默认参数 |
| B6 | `deleteToolRecord` 用 `db.prepare()` 但 `db` 不在作用域 | Task 7.4 | 改为 `getDb().prepare()` |
| B7 | `renderSkills` 重复请求同一 API 两次，`rawStats` 从未使用 | Task 7.1 | 合并为单次 `await fetch(...)` |
| B8 | API 响应 spread DB 行（snake_case），前端用 camelCase 访问全部 undefined | Task 4.1 | `GET /api/tools` 响应补 camelCase 映射 |
| B9 | `DELETE /tools/bulk-dust` 注册在 `/:name` 之后，`bulk-dust` 被当成 `:name` 参数 | Task 7.5 | 加注释说明必须在 `/:name` 之前注册 |
| B10 | `DOMContentLoaded` 回调不是 `async`，`await initTheme()` 无效 | Task 5.3 | 回调改为 `async () =>` |
| B11 | 测试从 `db.js` import `getSessionCount`，该函数只在 `queries.js` | Task 3.2 测试 | 改为从 `queries.js` import，移除 `qCount` 别名 |
| B12 | server.js 缺 `app.use(express.json())`，POST body 永远 undefined | Task 4.2 | 补 `app.use(express.json())` |
| B13 | indexer 全部标为 `type: 'skill'`，无法区分 skill 和 agent | Task 2.3 / Task 3.2 | `parseSkillMd` 解析 frontmatter `type` 字段，indexer 用 `meta.type` |

---

## 五、下一步待完成任务

**当前状态：源码文件一个都没有，从 Task 1.1 开始按顺序执行。**

### 执行方式

新会话中调用 `superpowers:executing-plans` skill，执行路径：

```
/Users/huangxiaoxuan/Claude/cc-insight/docs/superpowers/plans/2026-03-27-cc-insight-implementation.md
```

每个 Task commit 后调用 `superpowers:requesting-code-review`，按审查结果修复后再进入下一个 Task。

### 任务顺序（全部待执行）

| 阶段 | Tasks | 说明 |
|------|-------|------|
| 阶段 1：基础设施 | 1.1 → 1.2 → 1.3 | 目录结构、package.json、config.js |
| 阶段 2：数据层 | 2.1 → 2.2 → 2.3 → 2.4 | DB Schema、JSONL Parser、SKILL.md Parser、安全扫描 |
| 阶段 3：索引层 | 3.1 → 3.2 → 3.3 | DB 查询函数、全量索引器、文件监听 |
| 阶段 4：服务层 | 4.1 → 4.2 | API 路由、HTTP + WebSocket 服务 |
| 阶段 5：前端框架 | 5.1 → 5.2 → 5.3 → 5.4 | HTML 主框架、主题切换、App 主入口、主题持久化 |
| 阶段 6：使用概览 | 6.1 → 6.2 → 6.3 → 6.4 | 指标卡片、热力图、24H 分布图、Insights 面板 |
| 阶段 7：Skill 管理 | 7.1 → 7.2 → 7.3 → 7.4 → 7.5 | 概览卡、Top 5 + 从未使用、完整列表、删除、批量清理 |
| 阶段 8：CLI | 8.1 → 8.2 | CLI 入口、首次启动进度屏 |
| 阶段 9：文档 | 9.1 → 9.2 | 英文 README、中文 README |

### 开发前准备

1. `cd /Users/huangxiaoxuan/Claude/cc-insight && git init`（项目目录尚未初始化 git）
2. 确认 Node.js 20+ 已安装：`node --version`
3. 调用 `superpowers:executing-plans` 加载执行规范

---

## 六、遗留问题（开发阶段需注意）

以下问题**不需要修改实现计划**，但开发时必须人工注意：

### 6.1 字号强制要求（重要）

设计文档要求全页面 **最小字号 14px**，但实现计划中部分 CSS 片段写了 `11px`、`12px`、`10px`。

**开发时规则：所有字号 ≥ 14px，遇到计划中的小字号一律改为 14px。**

### 6.2 路由注册顺序（必须）

Task 7.5 的 `DELETE /api/tools/bulk-dust` 必须在 Task 7.4 的 `DELETE /api/tools/:name` **之前**注册，否则 `bulk-dust` 会被当成 `:name` 参数匹配。

实现计划已加注释说明，执行时确保顺序正确。

### 6.3 Task 5.4 的 import 位置

Task 5.4 在 `api.js` 顶部添加 `import fs from 'fs'` 和 `import path from 'path'`，必须写在**文件顶部**，不能追加到文件末尾。

### 6.4 本期不实现的功能

RECOMMENDATIONS 面板中的「**建议安装**」（根据用户背景推荐未安装工具）本期不实现，二期再做。Task 7.5 只实现「建议清理」（吃灰工具批量清理）。

### 6.5 数据源路径说明

- Claude Code CLI 数据：`~/.claude/`（主要来源）
- Claude Desktop App 数据：`~/Library/Application Support/Claude/claude-code-sessions/`（自动检测，存在则合并扫描）
- 两个路径的数据格式相同（JSONL），合并统计，不区分来源
