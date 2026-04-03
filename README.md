# CC Insight

A local dashboard for visualizing your [Claude Code](https://claude.ai/code) usage — sessions, skills, efficiency analysis, MCP servers, and a shareable poster.

> All data stays on your machine. No uploads, no accounts.

[中文说明](README.zh.md)

---

## Features

### Overview
- Session count, total duration, daily average, peak hours
- GitHub-style Activity Heatmap with placeholder fill
- 24H session distribution chart with hover tooltips
- Tool call distribution (donut chart)
- Smart Insights: habit analysis (night owl / early bird / 9-to-5), trend comparison, best day

### Efficiency (Insights)
- Summary cards: most time-consuming topic, highest-round session, tool density, most active project
- Time pattern heatmap: topic × hour grid
- High-round session list (top 10, content-rich only)
- Tool call density chart by topic
- Project activity distribution

### Skill & Agent Manager
- Installed Skill / Agent / Plugin list with usage stats
- Range-aware filtering: see what's installed in the last 7d / 30d / 90d / all time
- Unused detection: one-click bulk cleanup
- Security scan: flags high-risk instructions in SKILL.md
- AI suggestion box for idle tools

### MCP Server
- Auto-reads `settings.json` and `claude_desktop_config.json`
- Shows configured servers, tools, and usage history

### Shareable Poster
- Personalized usage card with summary text, metric chips, multi-row heatmap, and 24H chart
- Export as PNG (copy to clipboard or download)

---

## Requirements

- Node.js ≥ 20
- Claude Code installed and used at least once (`~/.claude/` directory must exist)

## Installation

### npm (recommended)

```bash
npm install -g cc-insight
cc-insight
```

### From source

```bash
git clone https://github.com/huangxiaoxuan/cc-insight.git
cd cc-insight
npm install
npm start
```

The dashboard opens automatically at `http://127.0.0.1:3847`.

> **Note:** `better-sqlite3` requires native compilation. On macOS, install Xcode Command Line Tools first:
> ```bash
> xcode-select --install
> ```

---

## Usage

| Action | How |
|--------|-----|
| Switch time range | 7d / 30d / 90d / All buttons in each view |
| Generate poster | Click "生成海报" in the top bar |
| Export poster | Copy to clipboard or download PNG |
| Detect new skills | Restart CC Insight — skills are re-scanned on every launch |
| Re-index sessions | Click "重新检测" on the empty state screen |
| Bulk clean unused tools | "一键清理" button in the Unused list |

---

## Data Sources

| Data | Path |
|------|------|
| Session history | `~/.claude/projects/**/*.jsonl` |
| Skills & Agents | `~/.claude/skills/*/SKILL.md` |
| Plugins | `~/.claude/plugins/cache/` |
| MCP Servers | `~/.claude/settings.json`, `~/Library/Application Support/Claude/claude_desktop_config.json` |

Database is stored at `~/.cc-insight/data.db`.

---

## Privacy

CC Insight runs entirely locally. It reads from `~/.claude/` and serves a web page at `127.0.0.1:3847`. No data is sent anywhere.

---

## Roadmap

- [ ] Light theme toggle
- [ ] `cc-insight clean --before YYYY-MM` command to archive old data
- [ ] Topic trend comparison (this week vs last week)
- [ ] Optional Claude/OpenAI API key for AI-powered topic classification
- [ ] Token usage analytics (input/output/cache per topic)

---

## License

MIT
