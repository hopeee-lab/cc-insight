# CC Insight

🌐 English | [中文](README.zh.md)

> 🔍 Do you really know how you use Claude Code?

CC Insight turns your local Claude Code usage into a visual dashboard:
sessions, habits, tools, and unused skills — all in one place.

🔒 **100% local. Your data never leaves your machine.**

---

## ⚡ What you get in 5 seconds

* 📊 When do you use Claude Code the most?
* 🔥 Which tasks take the most time and effort?
* 🧠 Are you a “daytime user” or a “night owl”?
* 🧹 Which skills are unused and can be cleaned up?

---

## 🖼️ Preview

Get an instant view of your AI usage patterns 👇

### Overview Dashboard

* Sessions / Duration / Peak usage time
* GitHub-style activity heatmap
* 24-hour usage distribution
* Tool usage breakdown

![overview](https://github.com/user-attachments/assets/cdca4f24-8a4b-40f2-b004-0474422412f7)

---

## 🧰 Requirements

Before using CC Insight, make sure you have:

* Node.js ≥ 20 (LTS recommended: 20 / 22 / 24)
* Claude Code installed and used (`~/.claude/` directory exists)

> On macOS, if installation fails:
>
> ```bash
> xcode-select --install
> ```

---

## 🤔 Why not `/insights`?

|                  | `/insights`     | CC Insight                  |
| ---------------- | --------------- | --------------------------- |
| Output           | Static HTML     | Interactive dashboard       |
| Scope            | Current session | Full history + time filters |
| Trend analysis   | ❌               | ✅                           |
| Skill management | ❌               | ✅                           |
| Privacy          | Local           | Local                       |

---

## 🧠 Why not cloud tools?

* ❌ Require uploading your data
* ❌ Potential privacy risks

👉 CC Insight:

* ✅ Fully local
* ✅ Your data stays on your machine
* ✅ No signup required

---

## ⚡ Quick Start

```bash id="7vkm08"
npm install -g cc-insight
cc-insight
```

Open:

http://127.0.0.1:3847

That’s it.

---

## ✨ Features

### 📊 Overview

* Sessions, duration, peak usage time
* GitHub-style heatmap
* Smart usage insights

### 📈 Insights

* Most time-consuming tasks
* Tool usage density
* High-turn sessions
* Project distribution

### 🧰 Skill & Agent Management

* Usage stats (with time filters)
* Detect unused skills
* One-click cleanup
* Security scan for risky commands

### 🔌 MCP Server

* Auto-detect configuration
* Display connected tools

### 🖼️ Shareable Poster

* Generate your AI usage profile
* Export as an image

---

## 🔒 Privacy

CC Insight only reads local data:

* `~/.claude/projects/`
* `~/.claude/skills/`
* `~/.claude/settings.json`

Data is stored locally at:

```id="7hbubc"
~/.cc-insight/data.db
```

👉 **No data is ever uploaded**

---

## 🧑‍💻 Who is this for?

* Heavy Claude Code users
* Indie hackers & AI builders
* Anyone who wants to understand and optimize their AI workflow

---

## ⭐ Support

If you find this useful, consider giving it a star ⭐
It really helps!

---

## 💬 Contact

If you have any ideas or feedback, feel free to reach out:

* Twitter: [https://x.com/hopeee_lab](https://x.com/hopeee_lab)
* Or open an Issue / PR

Building more AI tools — follow along 🚀

---

## 📄 License

MIT
