import fs from 'fs'

export function parseSkillMd(filePath, fallbackName = '') {
  if (!fs.existsSync(filePath)) return null
  const raw = fs.readFileSync(filePath, 'utf8')

  let name = fallbackName
  let description = ''
  let type = 'skill'

  const fmMatch = raw.match(/^---\n([\s\S]*?)\n---/)
  if (fmMatch) {
    const fm = fmMatch[1]
    const nameMatch = fm.match(/^name:\s*(.+)$/m)
    const descMatch = fm.match(/^description:\s*(.+)$/m)
    const typeMatch = fm.match(/^type:\s*(.+)$/m)
    if (nameMatch) name = nameMatch[1].trim()
    if (descMatch) description = descMatch[1].trim()
    if (typeMatch) type = typeMatch[1].trim()
  }

  return { name, description, type }
}
