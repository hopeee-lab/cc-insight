# CC Insight

本地 [Claude Code](https://claude.ai/code) 使用数据可视化工具——查看你的对话记录、Skill 管理、MCP Server 状态，并生成专属分享海报。

> 所有数据留在你的机器上，零上传、零注册。

[English](README.md)

---

## 功能

### 使用概览
- 对话次数、累计时长、日均时长、活跃时段
- 活跃日历热力图 + 24 小时分布图 + 工具调用占比
- 智能 Insights：使用习惯分析（夜猫子 / 早鸟 / 上班族）、趋势对比

### Skill & Agent 管理
- 已安装 Skill / Agent / Plugin 完整列表
- 使用次数统计（全时段 + 指定时间范围）
- 吃灰检测：30 天未使用自动标记，支持一键批量清理
- 安全扫描：检测 SKILL.md 中的高风险指令

### MCP Server
- 自动读取 `settings.json` 和 `claude_desktop_config.json`
- 展示已配置的 MCP Server 列表及使用历史

### 分享海报
- 一键生成个性化使用画像卡片（签名文案 + 指标卡片 + 图表）
- 支持复制到剪贴板或下载为 PNG

---

## 环境要求

- Node.js ≥ 20
- 已安装并使用过 Claude Code（`~/.claude/` 目录存在）

## 安装

```bash
git clone https://github.com/your-username/cc-insight.git
cd cc-insight
npm install
npm start
```

启动后浏览器自动打开 `http://127.0.0.1:3847`。

---

## 使用说明

| 操作 | 方式 |
|------|------|
| 切换时间范围 | 各视图顶部的 7 天 / 30 天 / 90 天 / 全部按钮 |
| 生成分享海报 | 点击顶栏"生成海报" |
| 导出海报图片 | 弹窗内"复制图片"或"下载保存" |
| 检测新安装的 Skill | 重启 CC Insight，每次启动自动重新扫描 |
| 重建会话索引 | 在空状态页点击"重新检测" |

---

## 数据源

| 数据类型 | 读取路径 |
|----------|----------|
| 对话记录 | `~/.claude/projects/**/*.jsonl` |
| Skill / Agent | `~/.claude/skills/*/SKILL.md` |
| Plugin | `~/.claude/plugins/cache/` |
| MCP Server | `~/.claude/settings.json`、`~/Library/Application Support/Claude/claude_desktop_config.json` |

---

## 隐私说明

CC Insight 完全在本地运行，仅读取 `~/.claude/` 目录，并在本机 `127.0.0.1:3847` 提供 Web 服务。所有数据不会上传到任何服务器。

---

## License

MIT
