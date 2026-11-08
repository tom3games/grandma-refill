import './mute-auto.mjs'
// bot ごとの分布。node sim.mjs [回数=12]
import { chromium } from 'playwright'
import { MUTE_LAUNCH, muteContext } from './mute.mjs'
import { spawn } from 'node:child_process'
const PORT = 5633, N = +(process.argv[2] || 12)
const server = spawn(process.execPath, ['server.mjs'], { cwd: import.meta.dirname, env: { ...process.env, PORT: String(PORT) } })
await new Promise(r => setTimeout(r, 400))
const b = await chromium.launch(MUTE_LAUNCH), ctx = await b.newContext({ locale: 'ja-JP', viewport: { width: 390, height: 844 } })
await muteContext(ctx)
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message))
await p.goto(`http://localhost:${PORT}/?notut`); await p.waitForFunction(() => window.__grReady, null, { timeout: 15000 })
const out = await p.evaluate(N => {
  const res = {}
  for (const [bot, name, o] of [['reader', 'reader', {}], ['reader', 'reader-slow', { react: 0.7, carry: 1.0, wait: 2.3 }], ['hide', 'hide'], ['eat', 'eat'], ['random', 'random'], ['idle', 'idle']]) {
    const rs = []; for (let s = 1; s <= N; s++) rs.push(window.gr.sim(bot, s * 101, o))
    const avg2 = k => Math.round(rs.reduce((a, r) => a + r.given[k], 0) / rs.length * 10) / 10
    const avg = k => Math.round(rs.reduce((a, r) => a + r[k], 0) / rs.length * 10) / 10
    res[name] = { points: avg('points'), kg: avg('kg'), caught: avg('caught'), survive: rs.filter(r => !r.ko).length + '/' + N, sec: avg('sec'), min: Math.min(...rs.map(r => r.points)), forced: avg('forced'), dog: avg2('dog'), kid: avg2('kid'), uncle: avg2('uncle'), altar: avg2('altar'), vase: avg2('vase') }
  }
  return res
}, N)
console.table(out); if (errs.length) console.log(errs)
await b.close(); server.kill()
