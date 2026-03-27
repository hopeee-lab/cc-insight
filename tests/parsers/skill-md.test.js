import { parseSkillMd } from '../../src/parsers/skill-md.js'
import fs from 'fs'
import os from 'os'
import path from 'path'

function writeTmp(content) {
  const f = path.join(os.tmpdir(), `skill-${Date.now()}.md`)
  fs.writeFileSync(f, content)
  return f
}

test('parses name and description from frontmatter', () => {
  const f = writeTmp(`---
name: skill-vetter
description: Security-first skill vetting for AI agents
---

Some content here.`)
  const result = parseSkillMd(f)
  expect(result.name).toBe('skill-vetter')
  expect(result.description).toBe('Security-first skill vetting for AI agents')
})

test('falls back to directory name if no frontmatter', () => {
  const f = writeTmp('# My Skill\nDoes something useful.')
  const result = parseSkillMd(f, 'my-skill')
  expect(result.name).toBe('my-skill')
  expect(result.description).toBe('')
})

test('returns null for missing file', () => {
  expect(parseSkillMd('/does/not/exist.md')).toBeNull()
})
