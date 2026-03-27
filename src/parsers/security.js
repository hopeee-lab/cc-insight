import fs from 'fs'

const RED_FLAGS = [
  /curl\s+https?:\/\/(?!raw\.githubusercontent\.com|api\.github\.com)/,
  /wget\s+https?:\/\//,
  /rm\s+-rf/,
  /base64\s+--decode/,
  /base64\s+-d/,
  /eval\s*\(/,
  /exec\s*\(/,
  /\bsudo\b/,
  /\~\/\.ssh/,
  /\~\/\.aws/,
]

export function scanSkillSecurity(filePath) {
  if (!fs.existsSync(filePath)) return 'unscanned'
  const raw = fs.readFileSync(filePath, 'utf8')
  for (const pattern of RED_FLAGS) {
    if (pattern.test(raw)) return 'warning'
  }
  return 'safe'
}
