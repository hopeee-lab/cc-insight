# CC Insight

> A local analytics dashboard for [Claude Code](https://claude.ai/code) — understand how you actually use AI.

[中文说明](README.zh.md)

---

## Why

Claude Code's built-in `/insights` command gives you a quick text summary. But it can't answer questions like:

- Which topics take the most back-and-forth before they're resolved?
- What time of day am I most productive?
- Which skills did I install and never use?
- How has my usage changed over the past month?

CC Insight indexes your local session history and presents it as an interactive dashboard — no cloud, no account, no data leaving your machine.

---

## vs `/insights`

| | `/insights` | CC Insight |
|---|---|---|
| Output | Text in terminal | Visual dashboard in browser |
| History | Current session only | All-time + time range filter |
| Skills | — | Usage stats, idle detection, bulk cleanup |
| MCP Servers | — | Configured servers + tool list |
| Shareable | — | Export as PNG poster |

---

## Features

**Overview** — Session count, duration, peak hours, GitHub-style activity heatmap, 24H distribution, and smart habit insights.

**Efficiency** — Time-consuming topics, tool call density, high-round sessions, project distribution, and a time-of-day × topic heatmap.

**Skills** — Installed Skill / Agent / Plugin list with usage stats, idle detection, one-click bulk cleanup, and security scan.

**MCP Servers** — Configured servers and their tools, parsed from `settings.json` and `claude_desktop_config.json`.

---

## Requirements

- Node.js ≥ 20
- Claude Code installed (`~/.claude/` directory must exist)

---

## Installation

**npm (recommended)**

```bash
npm install -g cc-insight
cc-insight
```

**From source**

```bash
git clone https://github.com/huangxiaoxuan/cc-insight.git
cd cc-insight
npm install
npm start
```

The dashboard opens automatically at `http://127.0.0.1:3847`.

> macOS: if installation fails, install Xcode Command Line Tools first:
> `xcode-select --install`

---

## Usage

| Action | How |
|--------|-----|
| Switch time range | 7d / 30d / 90d / All — top of each view |
| Re-scan skills | Restart CC Insight (auto on every launch) |
| Re-index sessions | "重新检测" on the empty state screen |
| Bulk clean unused tools | "一键清理" in the Skills → Unused list |
| Generate poster | "生成海报" button in the top bar |

---

## Data & Privacy

CC Insight reads only from `~/.claude/` and builds a local index at `~/.cc-insight/data.db`.
It runs a local web server at `127.0.0.1:3847` — accessible from your machine only.
**No data is ever sent anywhere.**

| Data | Source |
|------|--------|
| Session history | `~/.claude/projects/**/*.jsonl` |
| Skills & Agents | `~/.claude/skills/*/SKILL.md` |
| Plugins | `~/.claude/plugins/cache/` |
| MCP Servers | `~/.claude/settings.json`, `~/Library/Application Support/Claude/claude_desktop_config.json` |

---

## License

MIT
