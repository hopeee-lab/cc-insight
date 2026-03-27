# CC Insight 实现计划审查报告

**审查日期：** 2026-03-27
**审查对象：** `docs/superpowers/plans/2026-03-27-cc-insight-implementation.md`
**对照文档：** `docs/superpowers/specs/2026-03-26-cc-insight-design.md`

---

## A. 函数/变量命名一致性问题

**问题1：DB 查询函数命名冲突**
- **位置**：Task 3.1（第709行）vs Task 3.2（第919行）
- **问题**：`tests/indexer.test.js` 第919-920行同时从 `db.js` 和 `queries.js` import `getSessionCount`，但该函数只在 `queries.js` 中定义，从 `db.js` import 会 crash
- **严重程度**：crash（测试运行失败）

**问题2：API 路由命名不一致**
- **位置**：Task 7.4（第2826行）vs Task 4.1（第1223行）
- **问题**：Task 4.1 中的 DELETE 路由已改为注释占位，完整实现在 Task 7.4，顺序正确
- **严重程度**：⚠️ 误判，设计意图正确

---

## B. API 接口一致性问题

**问题3：config API 缺少 body 解析中间件**
- **位置**：Task 5.4（第1799行）vs Task 4.2 server.js
- **问题**：Task 5.4 的 `POST /api/config` 需要解析 JSON body，但 Task 4.2 的 server.js 没有声明 `app.use(express.json())`，导致 `req.body` 永远是 `undefined`
- **严重程度**：crash（POST 请求无法正常工作）

**问题4：API 路由路径 /config vs /api/config**
- **位置**：Task 5.4（第1794行）
- **问题**：路由挂载在 `/api`，`router.get('/config')` 自动映射为 `/api/config`，前端调用 `/api/config` 正确
- **严重程度**：⚠️ 误判，路由正确

---

## C. 数据流一致性问题

**问题5：DB snake_case vs 前端 camelCase 映射**
- **位置**：Task 2.1 schema vs Task 4.1 api.js（第1215行）
- **问题**：已在本轮审查中修复，API 响应补充了 `sourceType`、`sourceUrl`、`installedAt`、`updatedAt`、`securityScanResult` 的 camelCase 映射
- **严重程度**：✅ 已修复

**问题6：Tool 使用统计字段**
- **位置**：Task 4.1（第1217-1218行）vs Task 7.1（第2294行）
- **问题**：`useCount` 和 `lastUsedAt` 已在 API 响应中正确追加
- **严重程度**：✅ 已修复

**问题7：Agent 类型未被 indexer 处理**
- **位置**：Task 3.2 `findAllTools()`（第989-1023行）
- **问题**：indexer 扫描 `skills/` 目录时全部标记为 `type: 'skill'`，没有根据 SKILL.md 内容区分 skill 和 agent，但 Task 7.1 的 `buildOverviewCards` 期望存在 `type === 'agent'` 的记录，导致 Agent 卡片永远显示 0
- **严重程度**：功能缺失（Agent 管理功能无效）

---

## D. 依赖顺序问题

**问题8：Task 7.1 骨架调用后续 Task 才定义的函数**
- **位置**：Task 7.1（第2313-2315行）
- **问题**：骨架末尾调用 `renderTopTools()`、`renderUnusedTools()`、`renderToolsList()`，这些函数在 Task 7.2、7.3 才追加定义。开发按顺序执行时不影响，骨架注释已说明「后续 Task 实现」
- **严重程度**：⚠️ 误判，开发顺序正确

**问题9：Task 5.4 import 声明位置**
- **位置**：Task 5.4（第1778行）
- **问题**：Task 5.4 追加 `import fs` 和 `import path`，需要放到 api.js 顶部而非末尾，计划文字表达有歧义
- **严重程度**：代码质量（开发者需注意）

---

## E. 设计文档要求遗漏

**问题10：Desktop App 路径跨平台适配**
- **位置**：设计文档 §3.1（第79行）vs Task 1.3 config.js（第216行）
- **问题**：`getExtraSessionDirs()` 只列出了 macOS 路径，设计文档仅要求 macOS 支持，一期范围内正确
- **严重程度**：⚠️ 误判，一期只需支持 macOS

**问题11：Security Scanner 缓存更新逻辑**
- **位置**：Task 2.4 vs Task 3.2
- **问题**：文件修改后是否重新扫描没有明确说明，当前行为是 `INSERT OR REPLACE` 覆盖，等同于每次 indexer 运行都重新扫描，逻辑上可接受
- **严重程度**：代码质量（可接受）

**问题12：数据清理功能**
- **位置**：设计文档 Backlog（第272-273行）
- **问题**：`cc-insight clean` 命令、90天归档均为二期 backlog，不在一期实现计划中
- **严重程度**：⚠️ 误判，二期功能

**问题13：AI 推荐引擎（建议安装）**
- **位置**：设计文档 §5.2（第218行）
- **问题**：「建议安装」功能已明确排除本期，「建议清理」已在 Task 7.5 实现
- **严重程度**：⚠️ 误判，已排除

---

## F. 其他问题

**问题14：进度条初始样式**
- **位置**：Task 5.1 HTML vs Task 5.3 app.js
- **问题**：进度条初始 `width: 0%` 已在 CSS 中定义，WebSocket 收到 progress 消息后更新，逻辑正确
- **严重程度**：⚠️ 误判

**问题15：Task 7.2 辅助函数缺少 export**
- **位置**：Task 7.2（第2338-2389行）
- **问题**：`buildTopToolsHtml`、`buildUnusedToolsHtml` 供测试 import 使用，但代码块中没有 `export` 关键字，测试 import 会失败
- **严重程度**：crash（测试无法运行）

**问题16：writeConfig 缺少错误处理**
- **位置**：Task 5.4（第1788行）
- **问题**：`fs.mkdirSync` 和 `fs.writeFileSync` 没有 try-catch，文件系统权限异常会导致进程崩溃
- **严重程度**：代码质量（潜在 crash）

**问题17：WebSocket 无限重连**
- **位置**：Task 5.3（第1719行）
- **问题**：`ws.onclose = () => setTimeout(connectWS, 2000)` 无条件重连，MVP 阶段可接受
- **严重程度**：代码质量（MVP 可接受）

**问题18：Heatmap 日期对齐公式**
- **位置**：Task 6.2（第2029行）
- **问题**：`(start.getDay() + 6) % 7` 用于对齐到周一，JS `getDay()` 中 0=Sunday，该公式结果：Sun→6, Mon→0, Tue→1...，实际上是「到上一个周一的偏移」，逻辑正确
- **严重程度**：⚠️ 误判，公式正确

**问题19：buildInsights 函数 import**
- **位置**：Task 4.1（第1166行）
- **问题**：`getSilentDays`、`get24hDistribution` 已在 Task 4.1 顶部 import 中包含
- **严重程度**：⚠️ 误判

**问题20：API 响应字段与前端字段一致性**
- **位置**：Task 4.1 `/api/heatmap` vs Task 6.2
- **问题**：heatmap 返回 `{ day, count }`，前端使用 `{ day, count }`，字段名完全匹配
- **严重程度**：⚠️ 误判

---

## 汇总

| 类别 | 总问题数 | 真实 bug | 误判 |
|------|---------|---------|------|
| A. 命名一致性 | 2 | 1 | 1 |
| B. API 接口 | 2 | 1 | 1 |
| C. 数据流 | 3 | 1 | 2 |
| D. 依赖顺序 | 2 | 0 | 2 |
| E. 设计遗漏 | 4 | 1（问题7归入此） | 3 |
| F. 其他 | 7 | 2 | 5 |
| **合计** | **20** | **4** | **16** |

---

## 需要修复的 4 个真实 Bug

| # | 位置 | 问题 | 严重程度 |
|---|------|------|---------|
| Bug 1 | Task 3.2 测试 | `getSessionCount` 从 `db.js` 导入，应从 `queries.js` | crash |
| Bug 2 | Task 4.2 server.js | 缺少 `app.use(express.json())` 中间件 | crash |
| Bug 3 | Task 3.2 indexer | Agent 类型未区分，全部标为 skill | 功能缺失 |
| Bug 4 | Task 7.2 | `buildTopToolsHtml`/`buildUnusedToolsHtml` 缺少 `export` | crash |

---

## 已在本轮审查中修复的问题

| 问题 | 修复内容 |
|------|---------|
| schema 缺 subtype | Task 2.1 补 subtype 列 |
| upsertTool 漏 subtype | Task 3.1 补参数和 SQL |
| getDustToolNames 查不存在的列 | 改为 JOIN tool_invocations |
| Task 4.1 与 Task 7.4 路由冲突 | Task 4.1 改为注释占位 |
| DELETE handler 缺 async | 补 async 关键字 |
| import CLAUDE_DIR 常量（实为函数） | 改为 getClaudeDir() |
| deleteToolRecord 用 db.prepare | 改为 getDb().prepare() |
| renderSkills 重复 fetch | 合并为单次请求 |
| camelCase 映射缺失 | Task 4.1 API 响应补映射 |
| bulk-dust 路由顺序冲突 | 加注释说明必须在 /:name 之前 |
| DOMContentLoaded 非 async | 改为 async () => |
