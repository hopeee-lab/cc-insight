# CC Insight — 项目开发指令

## 项目背景

CC Insight 是一个本地 CLI 工具，读取 `~/.claude/` 目录数据，在浏览器中生成 Claude Code 个人使用画像。

- **发布路径：** 先自用 → 开源 GitHub → 视反响考虑商业化
- **定位差异：** `/insights` 只输出文字；CC Insight 是实时可视化仪表盘 + 历史趋势 + Skill 管理

## 技术架构

```
Node.js CLI
  └── SQLite 索引（better-sqlite3，~/.cc-insight/data.db）
      └── Express HTTP + WebSocket 服务（127.0.0.1:3847）
          └── Vanilla JS 浏览器前端
```

**核心依赖：** Node.js 20+, better-sqlite3, express, ws, chokidar, open, dom-to-image-more（前端CDN）

**启动流程：**
1. `syncToolsOnly()` — 每次启动都执行，更新 skill/plugin 列表
2. 若未建索引 → `runFullIndex()` + 浏览器进度条
3. 若已建索引 → 秒开，chokidar 监听 JSONL 增量更新

## 文件结构

```
bin/cc-insight.js        CLI 入口
src/
  config.js              路径配置（CLAUDE_DIR 环境变量支持）
  indexer.js             全量索引 + syncToolsOnly（技能更新）
  watcher.js             chokidar JSONL 监听 → WS 推送
  server.js              Express + WebSocket 服务
  api.js                 所有 REST API + buildInsights()
  db/
    schema.js            建表 DDL
    db.js                数据库连接单例
    queries.js           所有 SQL 查询函数
  parsers/
    jsonl.js             JSONL 解析（对话记录）
    skill-md.js          SKILL.md 解析
    security.js          安全扫描规则
  poster.js              海报数据组装（buildAllSummaries）
public/
  index.html             单页应用入口
  js/
    app.js               全局状态（currentRange）、WS 连接
    overview.js          使用概览页
    skills.js            Skill & Agent 页
    mcp.js               MCP Server 页
    poster.js            分享海报弹窗
tests/
  parsers/               解析器单元测试
  db/                    queries 单元测试
  skills/                前端 skills.js 单元测试
  indexer.test.js        indexer 集成测试
  config.test.js         config 测试
```

## 已实现功能

### 使用概览（一期 + 二期）
- 4 个指标卡片：SESSIONS / DURATION / PEAK HOUR / SILENT DAYS
- INSIGHTS 洞察：时间习惯、趋势对比、最高产的一天、avg_daily 等（动态生成，有数据才展示）
- ACTIVITY HEATMAP：GitHub contribution graph 风格，仅在数据超出当前页范围时显示翻页箭头
- 24H 时间分布图：柱状图，标注 Top 3 活跃时段
- 工具调用分布：环形图 + 图例（Bash/Read/Edit 等内置工具占比）
- Topic Distribution：水平条形图（7 个话题大类）；索引时规则分类，XML 消息自动剥离，allUserText 兜底
- 全局时间筛选：7d / 30d / 90d / 全部

### Skill & Agent & Plugin 管理
- 3 个使用率概览卡片（含进度条）
- Top 5 最常用工具（标签云）
- 从未使用列表（全时段判断，基于 allTimeUseCount）
- 全部工具列表：类型/描述/安装时间/安全审查/使用次数/吃灰标记/删除
- 吃灰检测：30 天未用自动标记
- 安全扫描：检测 SKILL.md 中高风险指令
- AI 推荐：建议清理（批量删除）
- 列表筛选：全部 / Skill / Agent / Plugin / 吃灰（切换时保持滚动位置）
- 每次启动自动重新扫描 skill 目录（syncToolsOnly）

### MCP Server（独立页签）
- 读取 `~/.claude/settings.json` 和 `~/Library/Application Support/Claude/claude_desktop_config.json`
- 展示已配置 MCP Server 列表

### 分享海报
- 海报尺寸：540×720px，预览缩放 0.54
- 内容：签名文案 + 4 个指标卡片 + Heatmap + 24H 分布图
- 导出：dom-to-image-more，支持复制到剪贴板 / 下载 PNG
- 纯英文（中文版本已移除）

## 迭代 Backlog

### 二期（已规划）

| 功能 | 说明 |
|------|------|
| 数据清理命令 | `cc-insight clean --before YYYY-MM`，自动归档 90 天前数据 |
| 浅色主题 | 顶栏主题切换，状态持久化到 `~/.cc-insight/config.json` |
| npm 发布 | `npm install -g cc-insight` 支持 |
| **Topics 趋势对比** | 本周 vs 上周话题分布对比，差异化核心亮点 |
| **Topics API Key 增强** | 用户可选输入 Claude/OpenAI API Key，覆盖规则匹配提升分类准确度 |
| **Topics 两层分类** | 任务类型大类下钻技术领域词云（当前只做单层） |

### 三期（远期）

| 功能 | 说明 |
|------|------|
| 接入其他 AI CLI | Gemini CLI、Cursor、Codex 等，合并统计 |
| 基于话题推荐 Skill | 结合使用习惯和话题聚类推荐未安装工具 |

## 开发规范

### 测试要求
- 所有查询函数在 `tests/db/` 中有对应单元测试
- 所有前端 HTML 构建函数在 `tests/skills/` 中有对应测试
- 测试 fixture 必须包含 `allTimeUseCount` 字段（与 `useCount` 区分：前者全时段，后者当前时间范围）
- 新功能必须先写测试（TDD），修复 bug 时先补回归测试

### 关键约定
- `getSilentDays()` 不接受时间参数，永远查全量历史（连续静默天数从今天往前数）
- `buildInsights()` 中 `if (after > 0)` 保护趋势计算，避免 after=0 时 prevAfter 变为负数
- skill 删除：物理删除文件 + DB 记录，不做软删除
- 海报 export 高度：直接用 `card.scrollHeight`（card 本身是 540px 宽渲染，scrollHeight 已是真实高度，不能再除以 scale）
- 前端 `buildUnusedToolsHtml` 判断依据是 `allTimeUseCount`，不是 `useCount`

### Superpowers Skill 执行纪律
- **修 bug** → 必须先调用 `superpowers:systematic-debugging`
- **新功能** → 必须先调用 `superpowers:test-driven-development`
- **收到 code review 结果** → 必须调用 `superpowers:receiving-code-review` 走正式接收流程

---

