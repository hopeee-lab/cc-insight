# CC Insight — Claude Code 本地数据可视化工具 PRD

## 项目背景

Claude Code 用户在本地积累了大量 skill、agent、使用记录，但目前没有任何可视化方式查看"自己的 Claude Code 使用画像"。本工具以单个 HTML 文件的形式，读取本地 `~/.claude/` 目录数据，生成一份可交互的个人使用报告。

目标：开源发布到 GitHub，用户下载后直接在浏览器打开即可使用，零依赖、零服务器、零数据上传。

---

## 技术约束

- **单文件 HTML**：所有 JS/CSS 内联，无需构建工具
- **纯本地运行**：不请求任何外部接口，数据不离开本机
- **数据读取方式**：由于浏览器安全限制无法直接读取文件系统，采用以下方案：
  - 用户通过「选择目录」按钮（File System Access API）授权读取 `~/.claude/`
  - 或提供一个配套的 shell 脚本 `export.sh`，将数据导出为 JSON，再拖入 HTML 加载
- **兼容性**：优先支持 Chrome/Edge（File System Access API），Safari 降级到文件上传模式

---

## 数据源

| 数据 | 路径 | 说明 |
|------|------|------|
| Skill 列表 | `~/.claude/skills/*/SKILL.md` | 每个 skill 的名称、描述、来源 |
| 项目历史 | `~/.claude/projects/**/*.jsonl` | 每条对话记录，含 tool 调用、时间戳 |
| 全局配置 | `~/.claude/settings.json` | MCP server 列表、全局配置 |
| 插件列表 | `~/.claude/plugins/` | 已安装插件目录 |

---

## 核心功能模块

### 1. 概览面板（Overview）
- 总 skill 数 / 总 agent 数 / 已安装插件数
- 累计对话次数、累计 prompt 数
- 最近活跃时间
- 最常用的 3 个 skill

### 2. Skill 管理列表
- 卡片展示每个 skill：名称、描述、来源（本地/插件/GitHub）
- 标签：最近使用时间、使用次数（从 jsonl 中匹配 skill 调用记录）
- 标记「从未使用」的 skill（吃灰检测）
- 简单安全扫描：检测 SKILL.md 中是否包含高风险指令（如 `curl`、`rm -rf`、外部 URL 请求等），标记警告

### 3. 使用热力图
- 按日期展示活跃度（类似 GitHub contribution graph）
- 数据来源：projects jsonl 文件的时间戳

### 4. 工具使用分布
- 饼图/柱图：Bash / Read / Write / Edit / WebSearch 等工具的调用占比
- 数据来源：jsonl 中的 tool_use 记录

### 5. MCP Server 列表
- 展示 settings.json 中配置的 MCP server
- 显示名称、类型、连接状态（能否 ping 通）

---

## 配套 Shell 脚本（export.sh）

```bash
#!/bin/bash
# CC Insight 数据导出脚本
# 用法：bash export.sh > cc_data.json

CLAUDE_DIR="$HOME/.claude"

echo "{"

# Skills
echo '"skills": ['
for skill_dir in "$CLAUDE_DIR"/skills/*/; do
  skill_md="$skill_dir/SKILL.md"
  if [ -f "$skill_md" ]; then
    name=$(basename "$skill_dir")
    desc=$(grep -m1 "^description:" "$skill_md" | sed 's/description: //')
    echo "  {\"name\": \"$name\", \"description\": \"$desc\", \"path\": \"$skill_dir\"},"
  fi
done
echo '],'

# Settings
if [ -f "$CLAUDE_DIR/settings.json" ]; then
  echo '"settings":'
  cat "$CLAUDE_DIR/settings.json"
  echo ','
fi

# JSONL stats (last 1000 lines for performance)
echo '"recent_events": ['
find "$CLAUDE_DIR/projects" -name "*.jsonl" 2>/dev/null | while read f; do
  tail -100 "$f"
done | head -1000 | sed 's/$/,/'
echo ']'

echo "}"
```

---

## UI 风格要求

- 深色主题，终端/开发者美学（不要企业 SaaS 风格）
- 字体：monospace 为主，数据展示清晰优先
- 配色参考：暗底 + 绿色/青色 accent（类似终端输出）
- 动画：数字滚动加载、卡片渐入，轻量不花哨

---

## 交付物

1. `cc-insight.html` — 主文件，浏览器直接打开
2. `export.sh` — 数据导出脚本（File System Access API 不可用时的备选方案）
3. `README.md` — 使用说明

---

## 执行指令

请按以下步骤执行：

1. 先运行 `ls -la ~/.claude/` 和 `find ~/.claude/projects -name "*.jsonl" | head -5` 了解实际目录结构
2. 读取 1-2 个 jsonl 文件的前几行，理解数据格式
3. 根据实际数据结构调整解析逻辑
4. 生成 `cc-insight.html`，确保在 Chrome 中直接打开可用
5. 生成 `export.sh`
6. 生成 `README.md`

**优先保证核心功能可用，UI 美观其次。先跑通数据读取，再打磨界面。**
