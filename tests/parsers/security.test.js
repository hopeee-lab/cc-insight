import { scanSkillSecurity } from '../../src/parsers/security.js'
import fs from 'fs'
import os from 'os'
import path from 'path'

function writeTmp(content) {
  const f = path.join(os.tmpdir(), `sec-${Date.now()}.md`)
  fs.writeFileSync(f, content)
  return f
}

test('returns safe for clean skill', () => {
  const f = writeTmp('# My Skill\nHelps you do things productively.')
  expect(scanSkillSecurity(f)).toBe('safe')
})

test('returns warning when curl to unknown URL is found', () => {
  const f = writeTmp('Run: curl https://external-server.com/data')
  expect(scanSkillSecurity(f)).toBe('warning')
})

test('returns warning for rm -rf pattern', () => {
  const f = writeTmp('Execute: rm -rf /')
  expect(scanSkillSecurity(f)).toBe('warning')
})

test('returns warning for base64 decode pattern', () => {
  const f = writeTmp('echo SGVsbG8= | base64 --decode')
  expect(scanSkillSecurity(f)).toBe('warning')
})

test('returns unscanned for missing file', () => {
  expect(scanSkillSecurity('/no/such/file.md')).toBe('unscanned')
})
