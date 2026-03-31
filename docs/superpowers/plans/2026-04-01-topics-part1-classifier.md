# Topics Part 1: 分类器 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 `src/classifiers/topic-rules.js`，提供话题分类和关键词提取能力。

**Architecture:** 纯 JS 实现，无外部依赖。`classifyTopic` 用关键词规则匹配第一条用户消息归入 8 大类；`extractKeywords` 扫描全量用户文本，过滤停用词后返回按频率降序的词列表（最多 20 个）。

**Tech Stack:** Node.js ESM，Vitest（现有测试框架）

---

## File Structure

- Create: `src/classifiers/topic-rules.js`
- Create: `tests/classifiers/topic-rules.test.js`

---

### Task 1: 创建测试文件，验证 classifyTopic 8 大类

**Files:**
- Create: `tests/classifiers/topic-rules.test.js`

- [ ] **Step 1: 创建测试目录和文件**

```bash
mkdir -p /Users/huangxiaoxuan/Claude/cc-insight/tests/classifiers
```

- [ ] **Step 2: 写失败测试**

创建 `tests/classifiers/topic-rules.test.js`：

```js
import { describe, it, expect } from 'vitest'
import { classifyTopic, extractKeywords } from '../../src/classifiers/topic-rules.js'

describe('classifyTopic', () => {
  it('匹配 调试修复', () => {
    expect(classifyTopic('这个 error 怎么 fix')).toBe('调试修复')
  })
  it('匹配 新功能开发', () => {
    expect(classifyTopic('帮我实现一个新增用户的 feature')).toBe('新功能开发')
  })
  it('匹配 架构设计', () => {
    expect(classifyTopic('帮我设计一下数据库 schema')).toBe('架构设计')
  })
  it('匹配 代码重构', () => {
    expect(classifyTopic('这段代码需要 refactor 一下')).toBe('代码重构')
  })
  it('匹配 学习探索', () => {
    expect(classifyTopic('what is WebSocket 原理')).toBe('学习探索')
  })
  it('匹配 配置运维', () => {
    expect(classifyTopic('帮我 install nvm 配置 node 环境')).toBe('配置运维')
  })
  it('匹配 数据分析', () => {
    expect(classifyTopic('写一个 SQL query 统计用户数据')).toBe('数据分析')
  })
  it('无命中时返回 其他', () => {
    expect(classifyTopic('你好')).toBe('其他')
  })
  it('空字符串返回 其他', () => {
    expect(classifyTopic('')).toBe('其他')
  })
  it('大小写不敏感', () => {
    expect(classifyTopic('Fix this BUG please')).toBe('调试修复')
  })
})
```

- [ ] **Step 3: 运行测试，确认失败**

```bash
cd /Users/huangxiaoxuan/Claude/cc-insight && npx vitest run tests/classifiers/topic-rules.test.js 2>&1 | head -20
```

期望：`Cannot find module` 或 `FAIL`

---

### Task 2: 实现 classifyTopic

**Files:**
- Create: `src/classifiers/topic-rules.js`

- [ ] **Step 1: 创建分类器文件**

```js
// src/classifiers/topic-rules.js

export const TOPIC_RULES = [
  {
    topic: '调试修复',
    keywords: ['bug', 'error', 'fix', 'fixed', '报错', '修复', 'failed', 'fail', 'crash',
      'undefined', 'cannot', 'wrong', '问题', '不对', '失败', '异常', 'exception',
      'traceback', 'stacktrace', '调试', 'debug', 'broken', 'not working'],
  },
  {
    topic: '新功能开发',
    keywords: ['新增', 'implement', 'feature', '功能', ' add ', 'build', '做一个', '开发',
      '实现', '支持', '创建', 'create', '添加', '增加', 'develop', 'new feature'],
  },
  {
    topic: '架构设计',
    keywords: ['设计', 'architecture', '方案', 'schema', '结构', '怎么设计', '如何设计',
      '规划', 'design', '系统', '模块', '接口', 'interface', '数据模型'],
  },
  {
    topic: '代码重构',
    keywords: ['refactor', '重构', '优化', 'cleanup', '整理', '改造', '简化', 'simplify',
      'reorganize', '清理', 'restructure', '改进'],
  },
  {
    topic: '学习探索',
    keywords: ['学习', '了解', 'how ', 'what is', '原理', '为什么', '怎么', '是什么',
      '解释', 'explain', '介绍', 'introduce', '概念', 'concept', '区别', 'difference'],
  },
  {
    topic: '配置运维',
    keywords: ['安装', '配置', 'setup', 'install', 'deploy', '环境', '启动', '运行',
      'nvm', 'npm', 'node', 'config', '部署', '服务器', 'server', 'docker', '权限'],
  },
  {
    topic: '数据分析',
    keywords: ['数据', 'query', 'sql', '分析', '统计', '报表', 'select', 'database',
      'db', '查询', '聚合', 'aggregate', '图表', 'chart', '指标', 'metric'],
  },
]

/** 停用词：不作为关键词提取 */
const STOP_WORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
  'should', 'may', 'might', 'can', 'to', 'of', 'in', 'for', 'on', 'with',
  'at', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
  'and', 'or', 'but', 'if', 'then', 'that', 'this', 'it', 'its',
  'i', 'you', 'we', 'he', 'she', 'they', 'my', 'your', 'our',
  '的', '了', '是', '在', '我', '你', '他', '她', '它', '们',
  '这', '那', '有', '和', '与', '或', '不', '也', '都', '就',
  '一', '个', '来', '去', '说', '要', '会', '能', '把', '给',
  '帮', '我', '请', '看', '下', '吗', '呢', '啊', '吧',
])

/**
 * 根据第一条用户消息分类话题
 * @param {string} text
 * @returns {string} 话题大类
 */
export function classifyTopic(text) {
  if (!text || typeof text !== 'string') return '其他'
  const lower = text.toLowerCase()
  for (const { topic, keywords } of TOPIC_RULES) {
    if (keywords.some(kw => lower.includes(kw.toLowerCase()))) {
      return topic
    }
  }
  return '其他'
}

/**
 * 从全量用户文本中提取高频关键词
 * @param {string} text 所有用户消息拼接文本
 * @param {number} limit 最多返回词数，默认 20
 * @returns {string[]} 按频率降序的词列表
 */
export function extractKeywords(text, limit = 20) {
  if (!text || typeof text !== 'string') return []

  // 分词：取长度 ≥ 2 的英文单词和中文词（连续汉字）
  const tokens = [
    ...text.matchAll(/[a-zA-Z][a-zA-Z0-9_\-\.]{1,}/g),   // 英文（含 kebab-case）
    ...text.matchAll(/[\u4e00-\u9fa5]{2,}/g),               // 中文（2字以上）
  ].map(m => m[0].toLowerCase())

  // 过滤停用词
  const freq = {}
  for (const token of tokens) {
    if (STOP_WORDS.has(token)) continue
    freq[token] = (freq[token] ?? 0) + 1
  }

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word)
}
```

- [ ] **Step 2: 运行测试，确认通过**

```bash
cd /Users/huangxiaoxuan/Claude/cc-insight && npx vitest run tests/classifiers/topic-rules.test.js
```

期望：全部 PASS

---

### Task 3: 补充 extractKeywords 测试并验证

**Files:**
- Modify: `tests/classifiers/topic-rules.test.js`

- [ ] **Step 1: 追加 extractKeywords 测试**

在 `tests/classifiers/topic-rules.test.js` 末尾追加：

```js
describe('extractKeywords', () => {
  it('返回数组', () => {
    expect(Array.isArray(extractKeywords('hello world'))).toBe(true)
  })
  it('过滤停用词', () => {
    const result = extractKeywords('the a is in for and')
    expect(result).toEqual([])
  })
  it('按频率降序排列', () => {
    const result = extractKeywords('sqlite sqlite sqlite nvm nvm node')
    expect(result[0]).toBe('sqlite')
    expect(result[1]).toBe('nvm')
  })
  it('长度不超过 limit', () => {
    const text = Array.from({ length: 30 }, (_, i) => `word${i} word${i} word${i}`).join(' ')
    expect(extractKeywords(text).length).toBeLessThanOrEqual(20)
  })
  it('空字符串返回空数组', () => {
    expect(extractKeywords('')).toEqual([])
  })
  it('提取英文 kebab-case 词', () => {
    const result = extractKeywords('better-sqlite3 better-sqlite3')
    expect(result).toContain('better-sqlite3')
  })
})
```

- [ ] **Step 2: 运行全部测试**

```bash
cd /Users/huangxiaoxuan/Claude/cc-insight && npx vitest run tests/classifiers/topic-rules.test.js
```

期望：全部 PASS

- [ ] **Step 3: Commit**

```bash
cd /Users/huangxiaoxuan/Claude/cc-insight && git add src/classifiers/topic-rules.js tests/classifiers/topic-rules.test.js && git commit -m "feat(topics): add topic classifier and keyword extractor"
```
