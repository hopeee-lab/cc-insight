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

  // JSON body 解析（POST /api/config 等需要）
  app.use(express.json())

  // 静态文件
  app.use(express.static(path.join(__dirname, '..', 'public')))

  // API 路由
  app.use(createRouter())

  // 首页（SPA fallback）
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'))
  })

  // 广播数据更新给所有客户端
  function broadcast(msg) {
    const payload = JSON.stringify(msg)
    for (const client of wss.clients) {
      if (client.readyState === 1) client.send(payload)
    }
  }

  // 进度推送（首次建库时使用）
  function sendProgress(pct) {
    broadcast({ type: 'progress', pct })
  }

  // 数据更新推送（watcher 触发时使用）
  function sendRefresh() {
    broadcast({ type: 'refresh' })
  }

  function listen(port = 3847) {
    return new Promise((resolve) => {
      httpServer.listen(port, '127.0.0.1', () => resolve(port))
    })
  }

  return { listen, sendProgress, sendRefresh }
}
