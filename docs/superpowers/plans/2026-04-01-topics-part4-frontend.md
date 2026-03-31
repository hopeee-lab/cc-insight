# Topics Part 4: 前端 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overview 页面新增 Topic Distribution（横向条形图）+ Top Keywords（词云），Insights 追加话题类型条目（含 emoji）；MCP 从独立页签合并进 Skills 页底部。

**Architecture:** overview.js 新增 `renderTopicDist` / `renderKeywords` 函数，扩展 `INSIGHT_CONFIG`，在 `renderOverview` 中并行 fetch `/api/topics`，在右侧 split-right 末尾渲染两栏布局。MCP 页签从 index.html 移除，`app.js` 删除对应路由，`skills.js` 末尾追加 MCP section。

**Tech Stack:** Vanilla JS, HTML/CSS, 现有 CSS 变量体系

**依赖：** Part 3 必须已完成（/api/topics 可用，buildInsights 含 topic 类型）

---

## File Structure

- Modify: `public/js/overview.js` — 新增 renderTopicDist、renderKeywords，扩展 INSIGHT_CONFIG 和 renderOverview HTML
- Modify: `public/index.html` — 移除 MCP tab button
- Modify: `public/js/app.js` — 移除 MCP 路由分支
- Modify: `public/js/skills.js` — 末尾追加 MCP section 渲染

---

### Task 1: 扩展 INSIGHT_CONFIG，新增话题洞察类型

**Files:**
- Modify: `public/js/overview.js`

- [ ] **Step 1: 在 INSIGHT_CONFIG 对象末尾追加两个类型**

找到 `public/js/overview.js` 中 `INSIGHT_CONFIG` 的最后一个条目 `trend: ...`，在其后追加：

```js
  topic_dominant: (d) => ({
    icon: '🧠',
    color: 'var(--purple)',
    title: '话题占比',
    body: d.ratio
      ? `<span class="purple">${d.topic}</span> 占 ${d.pct}%，是第二名的 ${d.ratio}×`
      : `<span class="purple">${d.topic}</span> 占 ${d.pct}%`
  }),
  topic_keyword: (d) => ({
    icon: '🔑',
    color: 'var(--cyan)',
    title: '高频词',
    body: `<span class="cyan">${d.word}</span> 在 ${d.count} 个 session 中出现`
  }),
```

- [ ] **Step 2: 在浏览器验证 Insights 卡片正常渲染（启动服务手动确认）**

```bash
cd /Users/huangxiaoxuan/Claude/cc-insight && node bin/cc-insight.js
```

打开 http://localhost:3847，Overview 左侧 Insights 应出现话题相关条目。

---

### Task 2: 实现 renderTopicDist（横向条形图）

**Files:**
- Modify: `public/js/overview.js`

- [ ] **Step 1: 在 renderToolDist 函数之后追加 renderTopicDist 函数**

```js
// 话题颜色映射
const TOPIC_COLORS = {
  '调试修复':   'var(--green)',
  '新功能开发': 'var(--cyan)',
  '架构设计':   'var(--amber)',
  '代码重构':   'var(--purple)',
  '学习探索':   'var(--red)',
  '配置运维':   '#06b6d4',
  '数据分析':   '#f97316',
  '其他':       'var(--muted)',
}

function renderTopicDist(el, categories) {
  if (!el) return
  if (!categories || categories.length === 0) {
    el.innerHTML = `<div style="color:var(--muted);font-size:14px;padding:12px 0;">暂无数据</div>`
    return
  }
  el.innerHTML = categories.map(r => {
    const color = TOPIC_COLORS[r.topic] ?? 'var(--muted)'
    return `
      <div style="margin-bottom:8px;">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px;">
          <span style="color:var(--text);">${r.topic}</span>
          <span style="color:${color};">${r.pct}%</span>
        </div>
        <div style="background:var(--bg3);border-radius:3px;height:6px;">
          <div style="width:${r.pct}%;background:${color};height:6px;border-radius:3px;
                      transition:width 0.3s;"></div>
        </div>
      </div>`
  }).join('')
}
```

---

### Task 3: 实现 renderKeywords（词云）

**Files:**
- Modify: `public/js/overview.js`

- [ ] **Step 1: 在 renderTopicDist 之后追加 renderKeywords 函数**

```js
function renderKeywords(el, keywords) {
  if (!el) return
  if (!keywords || keywords.length === 0) {
    el.innerHTML = `<div style="color:var(--muted);font-size:14px;padding:12px 0;">暂无数据</div>`
    return
  }
  const maxCount = keywords[0]?.count ?? 1
  el.innerHTML = `
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:baseline;line-height:2.2;">
      ${keywords.map(k => {
        const color = TOPIC_COLORS[k.topic] ?? 'var(--muted)'
        // 字号：最高频 1.1em，最低 0.72em，线性插值
        const ratio = k.count / maxCount
        const size = (0.72 + ratio * 0.38).toFixed(2)
        return `<span style="color:${color};font-size:${size}em;">${k.word}</span>`
      }).join('')}
    </div>
    <div style="margin-top:8px;padding-top:8px;border-top:1px solid var(--border);
                font-size:11px;color:var(--muted);">
      字号 = 词频 · 颜色 = 所属大类
    </div>`
}
```

---

### Task 4: 更新 renderOverview —— fetch topics + 新增 HTML 布局

**Files:**
- Modify: `public/js/overview.js`

- [ ] **Step 1: 在 renderOverview 的 Promise.all 中追加 topics 请求**

找到现有的：
```js
const [overview, heatmap, dist, insights, toolDist] = await Promise.all([
  fetch(`/api/overview?range=${range}`).then(r => r.json()),
  fetch(`/api/heatmap?range=${range}`).then(r => r.json()),
  fetch(`/api/distribution?range=${range}`).then(r => r.json()),
  fetch(`/api/insights?range=${range}`).then(r => r.json()),
  fetch(`/api/tool-distribution?range=${range}`).then(r => r.json()),
])
```

替换为：
```js
const [overview, heatmap, dist, insights, toolDist, topics] = await Promise.all([
  fetch(`/api/overview?range=${range}`).then(r => r.json()),
  fetch(`/api/heatmap?range=${range}`).then(r => r.json()),
  fetch(`/api/distribution?range=${range}`).then(r => r.json()),
  fetch(`/api/insights?range=${range}`).then(r => r.json()),
  fetch(`/api/tool-distribution?range=${range}`).then(r => r.json()),
  fetch(`/api/topics?range=${range}`).then(r => r.json()),
])
```

- [ ] **Step 2: 在 HTML 模板中，工具调用分布 card 之后追加两栏布局**

找到现有的：
```js
        <div class="card">
          <div class="section-header">
            <span class="section-title">工具调用分布</span>
          </div>
          <div id="tool-dist-canvas"></div>
        </div>
      </div>
    </div>`
```

替换为：
```js
        <div class="card" style="margin-bottom:10px;">
          <div class="section-header">
            <span class="section-title">工具调用分布</span>
          </div>
          <div id="tool-dist-canvas"></div>
        </div>
        <div class="grid-3" style="margin-bottom:0;">
          <div class="card" style="grid-column:span 1;">
            <div class="section-header" style="margin-bottom:8px;">
              <span class="section-title">Topic Distribution</span>
            </div>
            <div id="topic-dist-canvas"></div>
          </div>
          <div class="card" style="grid-column:span 2;">
            <div class="section-header" style="margin-bottom:8px;">
              <span class="section-title">Top Keywords</span>
            </div>
            <div id="topic-keywords-canvas"></div>
          </div>
        </div>
      </div>
    </div>`
```

- [ ] **Step 3: 在 renderToolDist 调用之后追加渲染调用**

找到现有的：
```js
  renderToolDist(document.getElementById('tool-dist-canvas'), toolDist)
```

在其后追加：
```js
  renderTopicDist(document.getElementById('topic-dist-canvas'), topics?.categories ?? [])
  renderKeywords(document.getElementById('topic-keywords-canvas'), topics?.keywords ?? [])
```

- [ ] **Step 4: 启动服务验证**

```bash
cd /Users/huangxiaoxuan/Claude/cc-insight && node bin/cc-insight.js
```

打开 http://localhost:3847，Overview 右侧工具调用分布下方应出现 Topic Distribution + Top Keywords 两栏。

---

### Task 5: MCP 合并进 Skills —— 移除 MCP 页签

**Files:**
- Modify: `public/index.html`
- Modify: `public/js/app.js`
- Modify: `public/js/skills.js`

- [ ] **Step 1: 移除 index.html 中的 MCP tab button**

找到 `public/index.html` 中（约第 200 行）：
```html
      <button class="tab-btn" data-view="mcp">MCP</button>
```

删除这一行。

- [ ] **Step 2: 移除 app.js 中的 MCP 路由**

找到 `public/js/app.js` 中：
```js
import { renderMcp } from './mcp.js'
```
删除该行。

找到：
```js
  if (view === 'mcp')      renderMcp(content)
```
删除该行。

- [ ] **Step 3: 在 skills.js 顶部新增 import，并在渲染函数末尾调用**

在 `public/js/skills.js` 顶部 import 区域追加：

```js
import { renderMcp } from './mcp.js'
```

找到 `renderSkills` 函数末尾（各 render 函数调用之后），追加：

```js
  // MCP section（从原 MCP 页迁移）
  const mcpSection = document.createElement('div')
  mcpSection.style.cssText = 'margin-top:16px;'
  container.appendChild(mcpSection)
  renderMcp(mcpSection)
```

- [ ] **Step 4: 验证 Skills 页底部出现 MCP Servers 区块**

启动服务，切换到 Skills 页，滚动到底部应看到 MCP Servers 区块。

- [ ] **Step 5: Commit**

```bash
cd /Users/huangxiaoxuan/Claude/cc-insight && git add public/js/overview.js public/index.html public/js/app.js public/js/skills.js && git commit -m "feat(topics): frontend - topic dist chart, keywords cloud, insights emoji, MCP merged into Skills"
```
