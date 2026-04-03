# CC Insight

> A local analytics dashboard for [Claude Code](https://claude.ai/code) — understand how you actually use AI.

[中文说明](README.zh.md)

---

## Why

You've been using Claude Code for months. But do you actually know how?

**No visibility into your usage.** You can't see which tasks eat the most time, when you're most productive, or whether your AI habits are changing.

**Skills pile up, unmanaged.** Installed tools accumulate with no way to know which ones you actually use, which have been idle for weeks, or which carry security risks.

**`/insights` is a text report, not data.** It's the LLM's subjective take on your sessions — not quantified, not filterable, not comparable over time.

**MCP Servers scattered across config files.** No single view of what's configured and what tools are actually available.

CC Insight indexes your local session history and presents it as an interactive dashboard — no cloud, no account, no data leaving your machine.

> "You think you're exploring. The data says 60% of your time is debugging."

---

## vs `/insights`

| | `/insights` | CC Insight |
|---|---|---|
| Output | Static HTML file | Interactive dashboard |
| History | Current session only | All-time + time range filter |
| Trends | — | Time patterns, topic trends, efficiency metrics |
| Skills | — | Usage stats, idle detection, bulk cleanup |
| MCP Servers | — | Configured servers + tool list |

---

## Features

**Overview** — Session count, duration, peak hours, GitHub-style activity heatmap, 24H distribution, and smart habit insights.

**Efficiency** — Time-consuming topics, tool call density, high-round sessions, project distribution, and a time-of-day × topic heatmap.

**Skills** — Installed Skill / Agent / Plugin list with usage stats, idle detection, one-click bulk cleanup, and security scan.

**MCP Servers** — Configured servers and their tools, parsed from `settings.json` and `claude_desktop_config.json`.

<img width="2874" height="1548" alt="image" src="https://github.com/user-attachments/assets/b6a34467-13a3-4c5a-957a-263ec4d1dbe2" />

---

## Requirements

- Node.js ≥ 20 (LTS recommended: 20, 22, or 24)
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
git clone https://github.com/hopeee-lab/cc-insight.git
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
