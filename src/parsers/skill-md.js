import fs from 'fs'

export function parseSkillMd(filePath, fallbackName = '') {
  if (!fs.existsSync(filePath)) return null
  const raw = fs.readFileSync(filePath, 'utf8')

  let name = fallbackName
  let description = ''
  let type = 'skill'
  let source = null

  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/)
  if (fmMatch) {
    const fm = fmMatch[1]
    const nameMatch   = fm.match(/^name:\s*(.+)$/m)
    const typeMatch   = fm.match(/^type:\s*(.+)$/m)
    const sourceMatch = fm.match(/^source:\s*(.+)$/m)
    if (nameMatch)   name   = nameMatch[1].trim()
    if (typeMatch)   type   = typeMatch[1].trim()
    if (sourceMatch) source = sourceMatch[1].trim()

    // 支持 YAML block scalar（description: > 或 description: |）
    const descInline = fm.match(/^description:\s*([^>|].+)$/m)
    const descBlock  = fm.match(/^description:\s*[>|]\n((?:[ \t]+.+\n?)+)/m)
    if (descInline) {
      description = descInline[1].trim()
    } else if (descBlock) {
      description = descBlock[1]
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean)
        .join(' ')
        .trim()
    }
  }

  return { name, description, type, source }
}
