# Insights Tab Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增独立 Insights 页签，展示 6 个效率洞察图表；同步调整 Overview 页（删除 Topic Distribution、精简 Insights 面板）；重命名 Overview tab。

**Architecture:** 新增 `public/js/insights.js` 渲染页面，`src/db/queries.js` 新增 6 个查询函数，`src/api.js` 新增 `GET /api/efficiency` 接口一次性返回所有数据。前端遵循现有 vanilla JS 模式，与 overview.js / skills.js 风格一致。

**Tech Stack:** Node.js, better-sqlite3, Express, Vanilla JS, SQLite window functions

---

## Tab 结构

| 顺序 | Tab 标签 | data-view |
|------|----------|-----------|
| 1 | Overview | overview |
| 2 | Insights | insights |
| 3 | Skill & Agent | skills |
| 4 | MCP | mcp |

---

## Insights 页面布局

```
时间范围筛选（7d / 30d / 90d / 全部）

洞察概览（4 个 summary card，横排）
  最低效话题 | 时间投入最多 | 工具密度高 | 最活跃项目

─── 左右两列网格 ───────────────────────────────────
[1] Prompt 效率（平均对话轮数）  [2] 自动化程度（工具调用密度）
[3] 时间投入（话题时长占比）    [4] 时间规律（时段×话题热力图）
[5] 低效 Session 列表           [6] 项目分布
```

---

## API 设计

### `GET /api/efficiency?range=7d`

返回：
```json
{
  "roundsByTopic":    [{ "topic": "调试修复", "avgRounds": 22.1 }],
  "durationByTopic":  [{ "topic": "数据分析", "totalSec": 45000, "pct": 31.2 }],
  "densityByTopic":   [{ "topic": "新功能开发", "density": 4.2 }],
  "heatmap":          [{ "hour": 22, "topic": "调试修复", "count": 5 }],
  "outlierSessions":  [{ "topic": "调试修复", "messageCount": 48, "firstMsg": "解决 better-sqlite3...", "startTime": 1234567890 }],
  "projectDist":      [{ "project": "cc-insight", "count": 125, "pct": 38.1 }]
}
```

---

## DB 查询函数（src/db/queries.js 新增）

```js
// 各话题平均对话轮数，只含已分类 session
getAvgRoundsByTopic({ after })
// SELECT topic, ROUND(AVG(message_count),1) as avgRounds
// FROM sessions WHERE start_time >= ? AND topic IS NOT NULL
// GROUP BY topic ORDER BY avgRounds DESC

// 各话题累计时长及占比
getDurationByTopic({ after })
// SELECT topic, SUM(MIN(duration_sec,14400)) as totalSec,
//   ROUND(SUM(MIN(duration_sec,14400))*100.0/SUM(SUM(MIN(duration_sec,14400))) OVER(),1) as pct
// FROM sessions WHERE start_time >= ? AND topic IS NOT NULL
// GROUP BY topic ORDER BY totalSec DESC

// 各话题平均工具调用密度（tool_use / message，message=0 时跳过）
getToolDensityByTopic({ after })
// SELECT topic, ROUND(AVG(CAST(tool_use_count AS REAL)/NULLIF(message_count,0)),2) as density
// FROM sessions WHERE start_time >= ? AND topic IS NOT NULL AND message_count > 0
// GROUP BY topic ORDER BY density DESC

// 时段×话题热力图（小时 0-23 × 话题，session 数）
getTimeTopicHeatmap({ after })
// SELECT strftime('%H',...) as hour, topic, COUNT(*) as count
// FROM sessions WHERE start_time >= ? AND topic IS NOT NULL
// GROUP BY hour, topic ORDER BY hour

// 异常高轮数 session（超过均值 2 倍），最多返回 10 条
getOutlierSessions({ after })
// WITH avg AS (SELECT AVG(message_count) as v FROM sessions WHERE start_time >= ?)
// SELECT topic, message_count as messageCount,
//   substr(jsonl_file, ...) as firstMsg, start_time as startTime
// FROM sessions, avg
// WHERE start_time >= ? AND message_count > avg.v * 2 AND topic IS NOT NULL
// ORDER BY messageCount DESC LIMIT 10

// 各项目路径 session 分布
getProjectDist({ after })
// SELECT COALESCE(project_path,'未知') as project, COUNT(*) as count,
//   ROUND(COUNT(*)*100.0/SUM(COUNT(*)) OVER(),1) as pct
// FROM sessions WHERE start_time >= ?
// GROUP BY project ORDER BY count DESC LIMIT 8
```

---

## Summary Cards 数据来源

| Card | 取自 | 展示内容 |
|------|------|---------|
| 最低效话题 | roundsByTopic[0] | 话题名 + avgRounds 轮 |
| 时间投入最多 | durationByTopic[0] | 话题名 + pct% |
| 工具密度高 | densityByTopic[0] | 话题名 + density×/轮 |
| 最活跃项目 | projectDist[0] | 项目名（basename）+ pct% |

---

## Overview 页变更

1. 删除 Topic Distribution 图表（`#topic-dist-canvas` 及其渲染调用）
2. `/api/topics` 的 fetch 调用从 Promise.all 中移除
3. `buildInsights()` 中删除 `topic_dominant` 和 `topic_keyword` 两种 insight 类型
4. Overview 布局：原 2 列（工具调用分布 | Topic Distribution）→ 工具调用分布独占全宽

---

## 文件改动清单

| 文件 | 类型 | 说明 |
|------|------|------|
| `public/index.html` | 修改 | Tab 重命名 + 新增 Insights tab |
| `public/js/app.js` | 修改 | import renderInsightsPage，增加 insights 路由 |
| `public/js/insights.js` | 新建 | Insights 页完整渲染逻辑 |
| `public/js/overview.js` | 修改 | 删除 Topic Distribution，移除 topics fetch |
| `src/db/queries.js` | 修改 | 新增 6 个查询函数 |
| `src/api.js` | 修改 | 新增 GET /api/efficiency，删除 topic_dominant/topic_keyword insight |
| `tests/db/efficiency-queries.test.js` | 新建 | 6 个查询函数单元测试 |

---

## 测试要求

- 每个查询函数都有对应单元测试，使用 in-memory SQLite fixture
- 空数据（0 sessions）时返回空数组，不报错
- message_count=0 的 session 在 density 计算中被过滤（避免除以零）
- outlier 检测：均值为 0 时返回空数组
