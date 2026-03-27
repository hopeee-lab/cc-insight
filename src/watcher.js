// src/watcher.js
import chokidar from 'chokidar'
import path from 'path'
import { getClaudeDir } from './config.js'
import { runIncrementalIndex } from './indexer.js'

export function startWatcher(onUpdate) {
  const claudeDir = getClaudeDir()
  const pattern = path.join(claudeDir, 'projects', '**', '*.jsonl')

  const watcher = chokidar.watch(pattern, {
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 1000, pollInterval: 200 },
  })

  watcher.on('add', async (filePath) => {
    await runIncrementalIndex(filePath)
    onUpdate?.()
  })

  watcher.on('change', async (filePath) => {
    await runIncrementalIndex(filePath)
    onUpdate?.()
  })

  return watcher
}
