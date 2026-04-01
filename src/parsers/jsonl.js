import fs from 'fs'

export function parseJsonlFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8')
  const lines = raw.split('\n').filter(l => l.trim())

  const records = []
  for (const line of lines) {
    try { records.push(JSON.parse(line)) } catch { /* skip */ }
  }

  const userMsgs = records.filter(r => r.type === 'user' && r.sessionId && r.timestamp)
  if (userMsgs.length === 0) return null

  const sessionId = userMsgs[0].sessionId
  const timestamps = userMsgs.map(r => new Date(r.timestamp).getTime()).filter(Boolean).sort((a, b) => a - b)
  const startTime = timestamps[0]
  const endTime = timestamps[timestamps.length - 1]
  const durationSec = Math.round((endTime - startTime) / 1000)
  const projectPath = userMsgs[0].cwd ?? null
  const messageCount = records.filter(r => r.type === 'user' || r.type === 'assistant').length

  const invocations = []
  for (const r of records) {
    if (r.type !== 'assistant') continue
    const content = r.message?.content ?? []
    for (const block of content) {
      if (block.type === 'tool_use' && block.name) {
        // Skill 调用：用 input.skill 作为 toolName，保留真实 skill 名称
        const toolName = block.name === 'Skill' && block.input?.skill
          ? block.input.skill
          : block.name
        invocations.push({
          toolName,
          invokedAt: new Date(r.timestamp).getTime() || startTime,
        })
      }
    }
  }

  // 提取用户消息文本（排除 tool_result 类型内容）
  function extractText(msg) {
    const content = msg.message?.content ?? msg.content ?? ''
    if (typeof content === 'string') return content
    if (Array.isArray(content)) {
      return content
        .filter(b => b.type === 'text')
        .map(b => b.text ?? '')
        .join(' ')
    }
    return ''
  }

  const userTextList = userMsgs.map(r => extractText(r)).filter(Boolean)
  const firstUserMessage = userTextList[0] ?? ''
  const allUserText = userTextList.join(' ')

  return {
    sessionId,
    startTime,
    endTime,
    durationSec,
    projectPath,
    messageCount,
    toolUseCount: invocations.length,
    invocations,
    firstUserMessage,
    allUserText,
  }
}
