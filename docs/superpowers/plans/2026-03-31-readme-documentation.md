# README Documentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Write README.md (English) and README.zh.md (Chinese) for CC Insight, covering installation, usage, features, and screenshots placeholder.

**Architecture:** Two standalone Markdown files at the project root. English version is primary (for GitHub discoverability); Chinese version is the full-detail version for the target audience.

**Tech Stack:** Markdown only. No build step required.

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `README.md` | Create | English README — concise, GitHub-friendly |
| `README.zh.md` | Create | Chinese README — full detail for primary users |

---

### Task 1: Write README.md (English)

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write README.md**

```markdown
# CC Insight

A local dashboard for visualizing your Claude Code usage — sessions, skills, MCP servers, and a shareable poster.

> All data stays on your machine. No uploads, no accounts.

![CC Insight Screenshot](docs/screenshot.png)

## Features

- **Usage Overview** — session count, total duration, daily average, peak hours, activity heatmap
- **Skill & Agent Manager** — installed tools, usage stats, idle detection, security scan
- **MCP Server List** — configured servers and their status
- **Shareable Poster** — generate a personalized usage card and export as PNG

## Requirements

- Node.js ≥ 20
- Claude Code installed and used at least once (`~/.claude/` directory exists)

## Installation

```bash
# Clone
git clone https://github.com/your-username/cc-insight.git
cd cc-insight

# Install dependencies
npm install

# Run
npx cc-insight
# or
npm start
```

The dashboard opens automatically at `http://127.0.0.1:3847`.

## Usage

1. **First launch** — CC Insight indexes your `~/.claude/` directory. This takes a few seconds.
2. **Time range** — switch between 7d / 30d / 90d / all using the filter buttons.
3. **Poster** — click "生成海报" (Generate Poster) in the top bar to create a shareable usage card.
4. **New skills** — CC Insight re-scans your skills directory on every startup. No manual refresh needed.

## Data Sources

| Data | Path |
|------|------|
| Session history | `~/.claude/projects/**/*.jsonl` |
| Skills & Agents | `~/.claude/skills/*/SKILL.md` |
| Plugins | `~/.claude/plugins/cache/` |
| MCP Servers | `~/.claude/settings.json` |

## Privacy

CC Insight runs entirely locally. It reads from `~/.claude/` and serves a local web page. No data is sent anywhere.

## License

MIT
```

- [ ] **Step 2: Verify file exists**

```bash
ls -la README.md
head -5 README.md
```

Expected: file exists, first line is `# CC Insight`

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add English README"
```

---

### Task 2: Write README.zh.md (Chinese)

**Files:**
- Create: `README.zh.md`

- [ ] **Step 1: Write README.zh.md**

```markdown
# CC Insight

本地 Claude Code 使用数据可视化工具——查看你的对话记录、Skill 管理、MCP Server 状态，并生成专属分享海报。

> 所有数据留在你的机器上，零上传、零注册。

## 功能

### 使用概览
- 对话次数、累计时长、日均时长、活跃时段
- 活跃日历热力图、24 小时分布图、工具调用占比
- 智能 Insights：使用习惯分析（夜猫子 / 早鸟 / 上班族）、趋势对比

### Skill & Agent 管理
- 已安装 Skill / Agent / Plugin 列表
- 使用次数统计（全时段 + 指定范围）
- 吃灰检测：30 天未用自动标记，支持一键清理
- 安全扫描：检测 SKILL.md 中高风险指令

### MCP Server
- 读取 `settings.json` 和 `claude_desktop_config.json`
- 展示已配置 MCP 列表及连接状态

### 分享海报
- 一键生成个性化使用画像卡片
- 可自定义：签名文案、指标卡片、图表
- 支持复制到剪贴板或下载为 PNG

## 环境要求

- Node.js ≥ 20
- 已安装并使用过 Claude Code（`~/.claude/` 目录存在）

## 安装

```bash
# 克隆仓库
git clone https://github.com/your-username/cc-insight.git
cd cc-insight

# 安装依赖
npm install

# 启动
npm start
```

启动后浏览器自动打开 `http://127.0.0.1:3847`。

## 使用说明

1. **首次启动**：CC Insight 会自动扫描 `~/.claude/` 目录建立索引，通常几秒内完成。
2. **时间范围**：点击"7 天 / 30 天 / 90 天 / 全部"切换数据范围。
3. **Skill 检测**：每次启动自动重新扫描，新安装的 Skill 无需手动刷新即可显示。
4. **生成海报**：点击顶栏"生成海报"按钮，自定义后导出分享图。

## 数据源

| 数据类型 | 读取路径 |
|----------|----------|
| 对话记录 | `~/.claude/projects/**/*.jsonl` |
| Skill / Agent | `~/.claude/skills/*/SKILL.md` |
| Plugin | `~/.claude/plugins/cache/` |
| MCP Server | `~/.claude/settings.json` |

## 隐私说明

CC Insight 完全在本地运行，仅读取 `~/.claude/` 目录并在本机提供 Web 服务。所有数据不会上传到任何服务器。

## License

MIT
```

- [ ] **Step 2: Verify file exists**

```bash
ls -la README.zh.md
head -5 README.zh.md
```

Expected: file exists, first line is `# CC Insight`

- [ ] **Step 3: Commit**

```bash
git add README.zh.md
git commit -m "docs: add Chinese README"
```

---

## Self-Review

**Spec coverage:**
- ✅ English README with install, usage, features, data sources, privacy
- ✅ Chinese README with full detail for primary audience
- ✅ Both files at project root

**Placeholder scan:** No TBD/TODO in content. GitHub URL uses `your-username` as explicit placeholder — intentional, user should replace before publishing.

**Type consistency:** N/A — documentation only.
