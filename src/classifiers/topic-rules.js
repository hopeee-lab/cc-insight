// src/classifiers/topic-rules.js

export const TOPIC_RULES = [
  {
    topic: '调试修复',
    keywords: ['bug', 'error', 'fix', 'fixed', '报错', '修复', 'failed', 'fail', 'crash',
      'undefined', 'cannot', 'wrong', '问题', '不对', '失败', '异常', 'exception',
      'traceback', 'stacktrace', '调试', 'debug', 'broken', 'not working'],
  },
  {
    topic: '功能开发',
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
  // 剥离 XML 标签（如 <local-command-caveat>...</local-command-caveat>）
  const cleaned = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const lower = cleaned.toLowerCase()
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

  // 分词：取长度 ≥ 2 的英文单词（含 kebab-case）和中文词（连续汉字）
  const tokens = [
    ...text.matchAll(/[a-zA-Z][a-zA-Z0-9_\-\.]{1,}/g),
    ...text.matchAll(/[\u4e00-\u9fa5]{2,}/g),
  ].map(m => m[0].toLowerCase())

  // 过滤停用词，统计频率
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
