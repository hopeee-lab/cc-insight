# CC Insight

> 🔍 你真的了解自己是如何使用 Claude Code 吗？

CC Insight 将你本地的 Claude Code 使用数据，转化为一个可视化仪表盘：
对话、习惯、工具使用、闲置 Skill —— 一目了然。

🔒 **100% 本地运行，数据不会离开你的电脑**

---

## ⚡ 5 秒你能获得什么？

* 📊 我一天什么时段最常用 Claude Code？
* 🔥 哪类任务最耗时、最复杂？
* 🧠 我的使用习惯是“上班型”还是“夜猫型”？
* 🧹 哪些 Skill 从来没用过，可以一键清理？

---

## 🖼️ 效果预览

### Overview 使用概览

* 对话次数 / 使用时长 / 活跃时段
* GitHub 风格使用热力图
* 24 小时使用分布
* 工具调用占比

![overview](https://github.com/user-attachments/assets/cdca4f24-8a4b-40f2-b004-0474422412f7)

---

## 🧰 环境要求

在使用 CC Insight 之前，请确保：

* Node.js ≥ 20（推荐 LTS 版本：20 / 22 / 24）
* 已安装并使用过 Claude Code（本地存在 `~/.claude/` 目录）

> macOS 如果安装失败，可先执行：
>
> ```bash
> xcode-select --install
> ```

---

## 🤔 为什么不用 `/insights`？

|          | `/insights` | CC Insight  |
| -------- | ----------- | ----------- |
| 输出形式     | 静态 HTML     | 实时交互仪表盘     |
| 数据范围     | 当前 session  | 全量历史 + 时间筛选 |
| 趋势分析     | ❌           | ✅           |
| Skill 管理 | ❌           | ✅           |
| 数据隐私     | 本地          | 本地          |

---

## 🧠 为什么不用云端工具？

* ❌ 需要上传数据
* ❌ 存在隐私风险

👉 CC Insight：

* ✅ 本地运行
* ✅ 数据完全可控
* ✅ 无需注册 / 无需登录

---

## ⚡ 快速开始（10 秒上手）

```bash
npm install -g cc-insight
cc-insight
```

打开浏览器访问：

```
http://127.0.0.1:3847
```

就这么简单。

---

## ✨ 核心功能

### 📊 使用概览

* 对话次数、总时长、活跃时间段
* GitHub 风格热力图
* 使用习惯智能洞察

### 📈 效率分析

* 最耗时任务分析
* 工具调用密度分析
* 高轮次对话识别
* 项目分布统计

### 🧰 Skill & Agent 管理

* 使用统计（支持时间范围筛选）
* 闲置检测（吃灰工具识别）
* 一键批量清理
* 安全扫描（危险指令提示）

### 🔌 MCP Server

* 自动读取配置
* 展示已接入 MCP 工具

### 🖼️ 分享海报

* 一键生成你的 AI 使用画像
* 支持导出图片分享

---

## 🔒 数据与隐私

CC Insight 只读取本地目录：

* `~/.claude/projects/`
* `~/.claude/skills/`
* `~/.claude/settings.json`

数据仅存储在：

```
~/.cc-insight/data.db
```

👉 **不会上传到任何服务器**

---

## 🧑‍💻 适合谁？

* 重度 Claude Code 用户
* AI 工具探索者 / 独立开发者（Indie Hacker）
* 想优化自己 AI 使用效率的人

---

## ⭐ 支持项目

如果你觉得这个工具对你有帮助，欢迎点个 Star ⭐
这会帮助更多人发现 CC Insight 🙌

---

## 💬 联系我

如果你有任何建议或想法，欢迎交流反馈：

- Twitter: [https://x.com/hopeee_lab](https://x.com/hopeee_lab)
- 或提交 Issue / PR

在持续做更多 AI 工具，欢迎关注后续更新 🚀

---

## 📄 License

MIT
