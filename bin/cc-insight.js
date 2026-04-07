#!/usr/bin/env node
// bin/cc-insight.js
import { createAppServer } from '../src/server.js'
import { runFullIndex, syncToolsOnly } from '../src/indexer.js'
import { startWatcher } from '../src/watcher.js'
import { getMeta } from '../src/db/db.js'
import open from 'open'

const PORT = parseInt(process.env.CC_PORT ?? '3847')
const [,, cmd] = process.argv

if (cmd === 'stop') {
  const { stopServer } = await import('../src/stop.js')
  stopServer(PORT)
  process.exit(0)
}

async function main() {
  const srv = createAppServer()
  const port = await srv.listen(PORT)
  const url = `http://127.0.0.1:${port}`

  console.log(`\nCC Insight running → ${url}\n`)

  const alreadyIndexed = getMeta('last_full_index')

  // 每次启动都同步工具（检测新安装/删除的 skill & plugin）
  syncToolsOnly()

  // 先打开浏览器，等待 WS 连接建立后再推送进度
  await open(url)
  if (!alreadyIndexed) await new Promise(r => setTimeout(r, 1500))

  if (!alreadyIndexed) {
    console.log('首次启动，建立索引中...')
    await runFullIndex((pct) => {
      process.stdout.write(`\r  索引进度: ${pct}%`)
      srv.sendProgress(pct)
    })
    console.log('\n索引完成。')
    srv.sendProgress(100)
    setTimeout(() => srv.sendRefresh(), 600)
  } else {
    srv.sendRefresh()
  }

  startWatcher(() => srv.sendRefresh())

  process.on('SIGINT', () => {
    console.log('\nCC Insight stopped.')
    process.exit(0)
  })
}

main().catch(err => {
  console.error('启动失败:', err.message)
  process.exit(1)
})
