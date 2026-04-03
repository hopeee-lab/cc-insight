# CC Insight

本地 [Claude Code](https://claude.ai/code) 使用数据可视化工具——查看你的对话记录、效率分析、Skill 管理、MCP Server 状态，并生成专属分享海报。

> 所有数据留在你的机器上，零上传、零注册。

[English](README.md)

---

## 功能

### 使用概览
- 对话次数、累计时长、日均时长、活跃时段
- GitHub 风格活跃热力图（自动填满容器，空格占位）
- 24 小时分布图（悬停显示数据）
- 工具调用占比（环形图）
- 智能 Insights：使用习惯分析（夜猫子 / 早鸟 / 上班族）、趋势对比、最高产的一天

### 效率分析
- 摘要卡片：耗时话题、最高轮次 Session、工具调用密度、最活跃项目
- 时间规律热力图：话题 × 小时二维网格
- 高轮次 Session 列表（最多展示 10 条，有内容摘要优先）
- 各话题工具调用密度图
- 项目活跃度分布

### Skill & Agent 管理
- 已安装 Skill / Agent / Plugin 完整列表
- 跟随时间范围筛选（近 7 天 / 30 天 / 90 天 / 全部时间安装）
- 闲置检测：从未使用列表支持一键批量清理
- 安全扫描：检测 SKILL.md 中的高风险指令
- AI 建议框（针对长期未用的工具）

### MCP Server
- 自动读取 `settings.json` 和 `claude_desktop_config.json`
- 展示已配置的 MCP Server、工具列表及使用历史

### 分享海报
- 一键生成个性化使用画像卡片（签名文案 + 指标卡片 + 多行热力图 + 24H 分布图）
- 支持复制到剪贴板或下载为 PNG

---

## 环境要求

- Node.js ≥ 20
- 已安装并使用过 Claude Code（`~/.claude/` 目录存在）

## 安装

### npm 安装（推荐）

```bash
npm install -g cc-insight
cc-insight
```

### 从源码运行

```bash
git clone https://github.com/huangxiaoxuan/cc-insight.git
cd cc-insight
npm install
npm start
```

启动后浏览器自动打开 `http://127.0.0.1:3847`。

> **注意：** `better-sqlite3` 需要原生编译环境。macOS 用户请先安装 Xcode 命令行工具：
> ```bash
> xcode-select --install
> ```

---

## 使用说明

| 操作 | 方式 |
|------|------|
| 切换时间范围 | 各视图顶部的 7 天 / 30 天 / 90 天 / 全部按钮 |
| 生成分享海报 | 点击顶栏「生成海报」 |
| 导出海报图片 | 弹窗内「复制图片」或「下载保存」 |
| 检测新安装的 Skill | 重启 CC Insight，每次启动自动重新扫描 |
| 重建会话索引 | 在空状态页点击「重新检测」 |
| 批量清理闲置工具 | Skill 页「从未使用」列表中点击「一键清理」 |

---

## 数据源

| 数据类型 | 读取路径 |
|----------|----------|
| 对话记录 | `~/.claude/projects/**/*.jsonl` |
| Skill / Agent | `~/.claude/skills/*/SKILL.md` |
| Plugin | `~/.claude/plugins/cache/` |
| MCP Server | `~/.claude/settings.json`、`~/Library/Application Support/Claude/claude_desktop_config.json` |

索引数据库存储于 `~/.cc-insight/data.db`。

---

## 隐私说明

CC Insight 完全在本地运行，仅读取 `~/.claude/` 目录，并在本机 `127.0.0.1:3847` 提供 Web 服务。所有数据不会上传到任何服务器。

---

## 迭代计划

- [ ] 浅色主题切换
- [ ] `cc-insight clean --before YYYY-MM` 归档历史数据命令
- [ ] 话题趋势对比（本周 vs 上周）
- [ ] 可选接入 Claude/OpenAI API Key 提升话题分类准确度
- [ ] Token 消耗分析（各话题 input/output/cache 用量）

---

## License

MIT
