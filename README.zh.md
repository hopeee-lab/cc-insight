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

**使用概览** — 对话次数、时长、活跃时段、GitHub 风格热力图、24H 分布图，以及使用习惯智能洞察。

**效率分析** — 耗时话题排名、工具调用密度、高轮次 Session 列表、项目分布、时段 × 话题热力图。

**Skill & Agent 管理** — 已安装工具列表（含使用统计）、闲置检测、一键批量清理、SKILL.md 安全扫描。

**MCP Server** — 自动读取配置文件，展示已配置的 MCP Server 及工具列表。

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

## License

MIT
