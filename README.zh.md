# CC Insight

> 本地 [Claude Code](https://claude.ai/code) 使用数据可视化工具 — 真正了解你在用 AI 做什么。

[English](README.md)

---

## 为什么做这个

Claude Code 内置的 `/insights` 指令可以在终端输出一段文字总结，但它回答不了这些问题：

- 哪类任务最耗时、需要最多轮对话才能解决？
- 我在一天中哪个时段最高效？
- 装了哪些 Skill 从来没用过？
- 这个月比上个月用得多了还是少了？

CC Insight 把你本地的对话历史建立索引，以交互式仪表盘的形式呈现——无需云端、无需注册、数据不离本机。

---

## 与 `/insights` 的区别

| | `/insights` | CC Insight |
|---|---|---|
| 输出形式 | 终端文字 | 浏览器可视化仪表盘 |
| 历史范围 | 当前 session | 全量历史 + 时间范围筛选 |
| Skill 管理 | — | 使用统计、闲置检测、一键清理 |
| MCP Server | — | 已配置服务器 + 工具列表 |
| 分享 | — | 导出个性化海报 PNG |

---

## 功能

### 使用概览
- 4 个指标卡片：对话次数、累计时长、日均时长、活跃时段
- Activity Heatmap：GitHub contribution graph 风格，自动填满容器
- 24H 时间分布图：悬停整列触发 tooltip，多峰值同时高亮
- 工具调用占比：环形图（Bash / Read / Edit 等内置工具）
- 智能 Insights：使用习惯分析（夜猫子 / 早鸟 / 上班族）、趋势对比、最高产的一天

### 效率分析
- 摘要卡片：耗时话题、最高轮次 Session、工具密度、最活跃项目
- 耗时话题：各话题平均轮数 + 时长占比
- 自动化程度：各话题工具调用密度（次调用 / 轮次）
- 时间规律热力图：话题 × 小时，查看什么时间段处理什么类型任务
- 高轮次 Session 列表：找出最耗时的对话，快速定位问题模式
- 项目分布：活跃目录占比

### Skill & Agent 管理
- 已安装 Skill / Agent / Plugin 完整列表，跟随时间范围筛选
- 从未使用列表：按闲置天数排序，支持一键批量清理
- 闲置检测：当前时间范围内未使用自动标记
- 安全扫描：检测 SKILL.md 中的高风险指令
- AI 建议框：针对长期未用的工具给出清理建议

### MCP Server
- 自动读取 `settings.json` 和 `claude_desktop_config.json`
- 展示已配置的 MCP Server、工具列表及使用历史，按来源分组

### 分享海报
- 一键生成个性化使用画像：签名文案 + AI 人格标签 + 指标卡片 + 多行热力图 + 24H 分布图
- 支持复制到剪贴板或下载为 PNG

---

## 环境要求

- Node.js ≥ 20
- 已安装并使用过 Claude Code（`~/.claude/` 目录存在）

---

## 安装

**npm 安装（推荐）**

```bash
npm install -g cc-insight
cc-insight
```

**从源码运行**

```bash
git clone https://github.com/huangxiaoxuan/cc-insight.git
cd cc-insight
npm install
npm start
```

启动后浏览器自动打开 `http://127.0.0.1:3847`。

> macOS 如果安装失败，先安装 Xcode 命令行工具：
> `xcode-select --install`

---

## 使用说明

| 操作 | 方式 |
|------|------|
| 切换时间范围 | 各视图顶部 7 天 / 30 天 / 90 天 / 全部按钮 |
| 重新扫描 Skill | 重启 CC Insight（每次启动自动执行） |
| 重建对话索引 | 空状态页点击「重新检测」 |
| 一键清理闲置工具 | Skill 页「从未使用」列表 → 「一键清理」 |
| 生成分享海报 | 顶栏「生成海报」按钮 |
| 导出海报 | 弹窗内「复制图片」或「下载保存」 |

---

## 数据与隐私

CC Insight 只读取 `~/.claude/` 目录，在本地建立索引文件 `~/.cc-insight/data.db`。
Web 服务仅监听 `127.0.0.1:3847`，只有本机可访问。
**所有数据不会上传到任何服务器。**

| 数据类型 | 来源路径 |
|----------|----------|
| 对话记录 | `~/.claude/projects/**/*.jsonl` |
| Skill / Agent | `~/.claude/skills/*/SKILL.md` |
| Plugin | `~/.claude/plugins/cache/` |
| MCP Server | `~/.claude/settings.json`、`~/Library/Application Support/Claude/claude_desktop_config.json` |

---

## 迭代计划

- [ ] 浅色主题切换
- [ ] `cc-insight clean --before YYYY-MM` 归档历史数据
- [ ] 话题趋势对比（本周 vs 上周）
- [ ] 可选接入 Claude/OpenAI API Key，提升话题分类准确度
- [ ] Token 消耗分析（各话题 input/output/cache 用量）

---

## License

MIT
