// src/server.js
import express from 'express'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRouter } from './api.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export function createAppServer() {
  const app = express()
  const httpServer = createServer(app)
  const wss = new WebSocketServer({ server: httpServer })

  // JSON body 解析
  app.use(express.json())

  // 静态文件
  app.use(express.static(path.join(__dirname, '..', 'public')))

  // 当前进度状态
  let _lastProgress = null

  // 广播
  function broadcast(msg) {
    const payload = JSON.stringify(msg)
    for (const client of wss.clients) {
      if (client.readyState === 1) client.send(payload)
    }
  }

  function sendProgress(pct) {
    _lastProgress = pct
    broadcast({ type: 'progress', pct })
    if (pct >= 100) _lastProgress = null
  }

  function sendRefresh() {
    _lastProgress = null
    broadcast({ type: 'refresh' })
  }

  // API 路由（先于 SPA fallback 注册）
  app.use(createRouter({ sendProgress, sendRefresh }))

  // SPA fallback
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'))
  })

  wss.on('connection', (ws) => {
    if (_lastProgress !== null && _lastProgress < 100) {
      ws.send(JSON.stringify({ type: 'progress', pct: _lastProgress }))
    } else {
      ws.send(JSON.stringify({ type: 'ready' }))
    }
  })

  function listen(port = 3847) {
    return new Promise((resolve) => {
      httpServer.listen(port, '127.0.0.1', () => resolve(port))
    })
  }

  return { listen, sendProgress, sendRefresh }
}
