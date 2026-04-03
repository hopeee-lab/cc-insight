# CC Insight — 项目开发指令

## 项目背景

CC Insight 是一个本地 CLI 工具，读取 `~/.claude/` 目录数据，在浏览器中生成 Claude Code 个人使用画像。

- **发布路径：** 先自用 → 开源 GitHub → npm 发布 → 视反响考虑商业化
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
    insights.js          效率分析页
    skills.js            Skill & Agent 页
    mcp.js               MCP Server 页
    poster.js            分享海报弹窗
    theme.js             主题切换
tests/
  parsers/               解析器单元测试
  db/                    queries 单元测试
  skills/                前端 skills.js 单元测试
  indexer.test.js        indexer 集成测试
  config.test.js         config 测试
```

## 已实现功能

### 使用概览
- 4 个指标卡片：SESSIONS / DURATION / PEAK PERIOD / AVG PER DAY
- INSIGHTS 洞察：时间习惯、趋势对比、最高产的一天、avg_daily 等（动态生成，有数据才展示）
- ACTIVITY HEATMAP：GitHub contribution graph 风格；数据列右对齐，左侧补暗色占位格填满容器；ResizeObserver 自适应宽度
- 24H 时间分布图：柱状图，多峰值同时高亮（琥珀色），悬停整列触发 tooltip 跟随鼠标
- 工具调用分布：环形图 + 图例（Bash/Read/Edit 等内置工具占比）
- Topic Distribution：水平条形图（7 个话题大类）
- 全局时间筛选：7d / 30d / 90d / 全部

### 效率分析（Insights）
- 摘要卡片 × 4：耗时话题 / 最高轮次 Session / 工具密度高 / 最活跃项目
- 耗时话题图：各话题平均轮数 + 时长占比条形图
- 自动化程度图：各话题 avgTurns 轮 · avgTools 次调用（density 排序）
- 项目分布图：活跃目录条形图，过滤 `~`，pct 基于过滤后重算
- 时间规律热力图：话题（Y轴）× 小时（X轴），格子按强度着色，aspect-ratio:1
- Session 明细：高轮次对话列表，SQL LIMIT 50 + 前端过滤有内容的取前 10

### Skill & Agent & Plugin 管理
- 3 个使用率概览卡片（含进度条）
- 最常用工具列表（当前时间范围，可上下滚动）
- 从未使用列表：按闲置天数降序；一键清理按钮（确认后批量删除）
- 全部工具列表：跟随时间范围（近 7/30/90 天安装 / 全部时间）；tab 筛选：全部 / Skill / Agent / Plugin / 闲置
- 闲置判断：当前时间范围内 useCount === 0（不再用全局 30 天逻辑）
- 安全扫描：检测 SKILL.md 中高风险指令
- AI 建议框：针对长期未用工具的清理建议
- 每次启动自动重新扫描 skill 目录（syncToolsOnly）

### MCP Server（独立页签）
- 读取 `~/.claude/settings.json` 和 `~/Library/Application Support/Claude/claude_desktop_config.json`
- 展示已配置 MCP Server 列表，按来源分组（Config / Claude.ai / History）
- 数据来自配置文件，不实时变化（正常）

### 分享海报
- 海报尺寸：540px 宽，高度跟随内容；预览缩放到 292px
- 内容：签名文案 + AI 人格标签 + 4 个指标卡片 + Activity Heatmap（GitHub 风格多行）+ 24H 分布图
- Heatmap：左侧补暗色占位格填满宽度，数据在右侧
- 导出：dom-to-image-more，支持复制到剪贴板 / 下载 PNG
- 纯英文

## 待修复 / 已知问题

| 问题 | 状态 |
|------|------|
| 时间规律热力图大屏下可能溢出（aspect-ratio 导致格子过大） | 待优化 |
| MCP 页无法手动刷新（需重启才能更新配置） | 已知，暂不处理 |

## 迭代 Backlog

### 近期（发布后优先）

| 功能 | 说明 |
|------|------|
| 浅色主题 | 顶栏主题切换，状态持久化到 `~/.cc-insight/config.json` |
| 数据清理命令 | `cc-insight clean --before YYYY-MM`，自动归档历史数据 |
| Topics 趋势对比 | 本周 vs 上周话题分布对比 |

### 中期（需新增采集）

| 功能 | 说明 |
|------|------|
| Topics API Key 增强 | 用户可选输入 Claude/OpenAI API Key，覆盖规则匹配提升分类准确度 |
| Token 消耗分析 | 解析 JSONL assistant.usage，入库 input/output_tokens，按话题聚合 |
| Cache 命中率趋势 | cache_read_input_tokens / total_input，按话题 + 时间维度展示 |

### 远期

| 功能 | 说明 |
|------|------|
| 接入其他 AI CLI | Gemini CLI、Cursor、Codex 等，合并统计 |
| 基于话题推荐 Skill | 结合使用习惯和话题聚类推荐未安装工具 |
| Topics 两层分类 | 任务类型大类下钻技术领域词云 |

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
- `buildUnusedToolsHtml`：从未使用判断用 `useCount === 0`（当前时间范围），闲置 tab 同理
- `isDust(t)`：`useCount === 0`，与时间范围联动，不再使用全局 30 天判断

### Superpowers Skill 执行纪律
- **修 bug** → 必须先调用 `superpowers:systematic-debugging`
- **新功能** → 必须先调用 `superpowers:test-driven-development`
- **收到 code review 结果** → 必须调用 `superpowers:receiving-code-review` 走正式接收流程
