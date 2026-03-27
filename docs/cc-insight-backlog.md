# CC Insight 迭代 Backlog

**更新日期：** 2026-03-27

---

## 已知问题（需修复）

| # | 问题 | 说明 |
|---|------|------|
| B1 | `silent_days` 范围选"全部"时返回异常大值 | `after=0` 从 1970 年算起，需加合理下界 |
| B2 | Skills 页工具 useCount 全为 0 | Skill 调用统一记为 `"Skill"` tool，需解析参数拆分各 skill 用量 |
| B3 | 内容区下方留白（不自适应高度） | `.split { flex:1 }` 已加，仍有空白，待排查 |
| B4 | 交接文档未更新 | `/docs/cc-insight-handoff.md` 状态描述过期 |

---

## 待完成任务（一期剩余）

| Task | 内容 |
|------|------|
| 9.1 | README.md（英文） |
| 9.2 | README.zh.md（中文） |

---

## 迭代计划（二期 / 三期）

| 优先级 | 期次 | 功能 | 说明 |
|--------|------|------|------|
| 高 | 二期 | Skill 精细使用统计 | 解析 `"Skill"` tool 调用参数，拆分各 skill 实际调用次数，填充 useCount |
| 高 | 二期 | RECOMMENDATIONS 建议安装 | 根据用户背景推荐未安装工具，一期只做了「建议清理」 |
| 中 | 二期 | 工具调用分布饼图 | Bash / Read / Write / Edit 等内置工具使用占比可视化 |
| 中 | 二期 | 分享海报 | 一键生成可分享图片；含指标、昵称（默认+自定义）、头像（默认+可上传）；底部固定署名条 `CC Insight @Halooo` |
| 中 | 二期 | MCP Server 列表 | 展示已配置 MCP Server 及连接状态 |
| 低 | 二期 | Session 话题聚类 | 分析最近 session 主要在讨论什么 |
| 低 | 二期 | 数据清理命令 | 自动归档 90 天前历史数据；支持 `cc-insight clean --before YYYY-MM` |
| 低 | 三期 | 多 CLI 支持 | 接入 Gemini CLI、Cursor、Codex 等，统一展示 |
| 低 | 三期 | Skill 推荐引擎 | 基于使用习惯和话题推荐未安装的 Skill / Agent |
