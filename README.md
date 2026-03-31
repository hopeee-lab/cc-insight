# CC Insight

A local dashboard for visualizing your [Claude Code](https://claude.ai/code) usage — sessions, skills, MCP servers, and a shareable poster.

> All data stays on your machine. No uploads, no accounts.

## Features

- **Usage Overview** — session count, total duration, daily average, peak hours, activity heatmap, 24h distribution, smart insights
- **Skill & Agent Manager** — installed tools with usage stats, idle detection ("吃灰"), and security scan
- **MCP Server List** — configured servers parsed from `settings.json` and `claude_desktop_config.json`
- **Shareable Poster** — generate a personalized usage card and export as PNG (copy or download)

## Requirements

- Node.js ≥ 20
- Claude Code installed and used at least once (`~/.claude/` directory must exist)

## Installation

```bash
git clone https://github.com/your-username/cc-insight.git
cd cc-insight
npm install
npm start
```

The dashboard opens automatically at `http://127.0.0.1:3847`.

## Usage

| Action | How |
|--------|-----|
| Switch time range | 7d / 30d / 90d / All buttons in each view |
| Generate poster | Click "生成海报" in the top bar |
| Export poster | Copy to clipboard or download PNG |
| Detect new skills | Restart CC Insight — skills are re-scanned on every launch |
| Re-index sessions | Click "重新检测" on the empty state screen |

## Data Sources

| Data | Path |
|------|------|
| Session history | `~/.claude/projects/**/*.jsonl` |
| Skills & Agents | `~/.claude/skills/*/SKILL.md` |
| Plugins | `~/.claude/plugins/cache/` |
| MCP Servers | `~/.claude/settings.json`, `~/Library/Application Support/Claude/claude_desktop_config.json` |

## Privacy

CC Insight runs entirely locally. It reads from `~/.claude/` and serves a web page at `127.0.0.1:3847`. No data is sent anywhere.

## License

MIT
