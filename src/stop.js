// src/stop.js
import { execSync } from 'child_process'

/**
 * 返回正在监听指定端口的进程 PID，没有则返回 null
 */
export function getPortPid(port) {
  try {
    const out = execSync(`lsof -ti :${port} -sTCP:LISTEN`, { encoding: 'utf8' }).trim()
    if (!out) return null
    return parseInt(out.split('\n')[0], 10)
  } catch {
    return null
  }
}

/**
 * 向该端口的进程发送 SIGTERM，成功返回 true，未运行返回 false
 */
export function stopServer(port) {
  const pid = getPortPid(port)
  if (!pid) {
    console.log('CC Insight is not running.')
    return false
  }
  process.kill(pid, 'SIGTERM')
  console.log(`CC Insight stopped (PID ${pid}).`)
  return true
}
