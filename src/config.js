// src/config.js
import path from 'path'
import os from 'os'
import fs from 'fs'

export function getClaudeDir() {
  return process.env.CLAUDE_DIR ?? path.join(os.homedir(), '.claude')
}

export function getAppDir() {
  return path.join(os.homedir(), '.cc-insight')
}

export function getDbPath() {
  return path.join(getAppDir(), 'data.db')
}

export function getConfigPath() {
  return path.join(getAppDir(), 'config.json')
}

// 额外的 session 目录（如 macOS 桌面 App），自动检测，不存在则返回空数组
export function getExtraSessionDirs() {
  const candidates = [
    path.join(os.homedir(), 'Library', 'Application Support', 'Claude', 'claude-code-sessions'),
  ]
  return candidates.filter(p => fs.existsSync(p))
}
