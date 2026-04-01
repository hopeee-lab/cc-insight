import { describe, it, expect } from '@jest/globals'
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
