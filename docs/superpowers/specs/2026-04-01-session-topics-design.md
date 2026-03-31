# Session 话题分类与洞察 — Design Spec

**日期：** 2026-04-01  
**状态：** 待实现  
**范围：** 二期功能，整合进 Overview 页面

---

## 背景与目标

### 与 /insights 的差异化定位

| | /insights（内置） | CC Insight Topics |
|--|---|---|
| 输出形式 | 纯文本报告，一次性 | 可视化 + 可交互 + 持续更新 |
| 本质 | LLM 读对话写诊断报告 | 客观数据驱动的工作画像 |
| 局限 | 主观、不可比较、不更新 | — |

**核心价值：** "你以为在探索，其实 60% 的时间在调 bug" — 用数据照镜子，不是读报告。

### 功能目标

1. **内容洞察**：我最近在思考什么话题
2. **效率分析**：哪类任务占用了我最多时间

---

## 设计决策

| 决策项 | 结论 |
|--------|------|
| 话题分类数据来源 | 每个 session 第 1 条用户消息 |
| 关键词提取数据来源 | 全量用户消息（过滤工具调用，仅取人写文字） |
| 分类体系 | 单层 8 大类（任务类型） |
| 分类方式 | 规则匹配兜底，可选 API Key 增强（二期） |
| 页面位置 | 整合进 Overview，不新增独立页签 |
| 趋势对比 | 推迟到后续迭代 |

### 8 大话题类别

| 类别 | 代表关键词（示例） |
|------|----------------|
| 调试修复 | bug, error, fix, 报错, 修复, failed, crash |
| 新功能开发 | 新增, implement, feature, 功能, add, build |
| 架构设计 | 设计, architecture, 方案, schema, 结构 |
| 代码重构 | refactor, 重构, 优化, cleanup, 整理 |
| 学习探索 | 学习, 了解, how, what is, 原理, 为什么 |
| 配置运维 | 安装, 配置, setup, install, deploy, 环境 |
| 数据分析 | 数据, query, SQL, 分析, 统计, 报表 |
| 其他 | （无命中时兜底） |

---

## 数据模型

### sessions 表新增字段

```sql
ALTER TABLE sessions ADD COLUMN topic          TEXT;
ALTER TABLE sessions ADD COLUMN topic_keywords TEXT;  -- JSON 数组，如 ["better-sqlite3","nvm"]
```

### 分类规则文件

新增 `src/classifiers/topic-rules.js`：
- 导出 `TOPIC_RULES`：Map<category, string[]>（关键词列表）
- 导出 `classifyTopic(firstMessage: string): string`
- 导出 `extractKeywords(allMessages: string): string[]`（去停用词、去重、按频率排序，取前 20）

---

## 架构 & 数据流

```
索引阶段（indexer.js）
  ├── 取 session 第 1 条用户消息 → classifyTopic() → 写 sessions.topic
  └── 取全量用户消息拼接文本 → extractKeywords() → JSON.stringify → 写 sessions.topic_keywords

watcher（增量）
  └── 新 session 写入时，同步执行上述分类逻辑

查询层（queries.js）新增
  ├── getTopicsOverview(after)          → [{topic, count, pct}]（按 count 降序）
  └── getTopicKeywords(after)           → [{word, count}]（全类别合并，按词频降序，取前 20）

API（api.js）新增
  └── GET /api/topics?range=7d          → { categories: [...], keywords: [...] }

前端（overview.js）
  ├── renderTopicDist(el, categories)   → 横向条形图
  ├── renderKeywords(el, keywords)      → 词云（字号=词频，颜色=所属大类）
  └── renderInsights() 扩展            → 新增话题洞察条目（含 emoji）
```

---

## UI 设计

### Overview 布局变化

**左侧 Insights 面板** — 扩展，分两组：

```
── 🕐 使用习惯 ──
  ● 高峰时段 14:00–15:00，占当日 31%
  ● 本周比上周多 3 个 session

── 🧠 话题洞察 ──
  ● 调试修复占 38%，是学习探索的 2×
  ● 高频词 better-sqlite3 跨 6 个 session 出现
```

**右侧** — 工具调用分布下方新增两栏：

| 左栏：TOPIC DISTRIBUTION | 右栏：TOP KEYWORDS |
|---|---|
| 横向条形图，每类一行 | 词云，字号=词频，颜色=所属大类 |
| 显示类别名 + 百分比 | 取前 20 个高频词 |

### 无新增页签

导航栏不变：Overview / Skills / Poster

---

## 测试计划

### 单元测试（tests/db/topics.test.js）

- `classifyTopic()` 对 8 大类各输入 1 条典型消息，断言分类正确
- `classifyTopic()` 无命中时返回 "其他"
- `extractKeywords()` 返回数组，过滤停用词，长度 ≤ 20
- `getTopicsOverview()` 返回正确 count 和 pct（mock DB fixture）
- `getTopicKeywords()` 返回按频率降序的词列表

### 集成测试

- 全量索引后 sessions 表 topic 字段非空率 > 90%（排除空消息 session）
- `GET /api/topics?range=7d` 返回结构符合 schema

---

## 迭代 Backlog（本期推迟）

| 功能 | 说明 |
|------|------|
| 趋势对比 | 本周 vs 上周话题分布对比 |
| API Key 增强 | 用户输入 Claude/OpenAI Key，LLM 覆写规则分类结果 |
| 两层分类 | 任务类型下钻技术领域词云 |

---

## 已知约束

- `classifyTopic` / `extractKeywords` 纯 JS 实现，无外部依赖
- 停用词表内置（中英混合），不引入 NLP 库
- 关键词颜色映射：基于 topic 字段反查大类颜色，与图例一致
