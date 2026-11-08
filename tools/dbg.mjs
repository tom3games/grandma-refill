import '../mute-auto.mjs'
import { chromium } from 'playwright'
import { MUTE_LAUNCH } from '../mute.mjs'
import { spawn } from 'node:child_process'
const PORT = 5634
const server = spawn(process.execPath, ['server.mjs'], { cwd: new URL('..', import.meta.url).pathname, env: { ...process.env, PORT: String(PORT) } })
await new Promise(r => setTimeout(r, 400))
const b = await chromium.launch(MUTE_LAUNCH), p = await b.newPage()
await p.goto(`http://localhost:${PORT}/?notut`); await p.waitForFunction(() => window.__grReady)
const bot = process.argv[2] || 'hide'
const r = await p.evaluate(bot => window.gr.sim(bot, 101, { events: true }), bot)
console.log(JSON.stringify(r.events.filter(e => !/^grab|bite$/.test(e[1])).slice(0, 80)))
await b.close(); server.kill()
