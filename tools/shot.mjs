import '../mute-auto.mjs'
// 撮影用。node tools/shot.mjs <名前> <幅> <高さ> [台本]  台本: title / play / away / caught / result / how / tut
import { chromium } from 'playwright'
import { MUTE_LAUNCH, muteContext } from '../mute.mjs'
import { spawn } from 'node:child_process'
const ROOT = new URL('..', import.meta.url).pathname
const PORT = 5635
const server = spawn(process.execPath, ['server.mjs'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) } })
await new Promise(r => setTimeout(r, 400))
const [name = 'x', w = 390, h = 844, ...scenes] = process.argv.slice(2)
const b = await chromium.launch(MUTE_LAUNCH), ctx = await b.newContext({ locale: 'ja-JP', viewport: { width: +w, height: +h }, deviceScaleFactor: 2 })
await muteContext(ctx)
const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
await p.goto(`http://localhost:${PORT}/?notut&seed=5`); await p.waitForFunction(() => window.__grReady); await p.waitForTimeout(600)
for (const sc of (scenes.length ? scenes : ['title'])) {
  if (sc === 'title') {}
  else if (sc === 'how') await p.click('#bHow')
  else {
    await p.evaluate(sc => {
      let show = 0; const d = gr.dbg; document.querySelector('#vHow').hidden = true; document.querySelector('#vTitle').hidden = true; document.querySelector('#vPlay').hidden = false
      if (sc === 'tut') { d.startTutorial(); show = 1 } else d.startPlay()
      d.pause(true)
      const G = d.G
      if (sc === 'tut') d.step(50)
      if (sc === 'play') { G.bowl.push('f_ebi', 'f_kabocha'); d.step(30) }
      if (sc === 'away') { d.step(10); d.gSet('away', 3); G.spot.dog.n = 3; G.spot.altar.total = 3; G.spot.altar.n = 3; G.spot.vase.n = 1; G.stomach = 20; d.step(2) }
      if (sc === 'caught') { d.step(10); G.held = { food: 'f_karaage', bit: false, t: 0 }; d.step(1); d.step(70) }
      if (sc === 'aunt') { d.step(10); d.gSet('away', 5); G.aunt.st = 'shadow'; G.aunt.t = 0.7; d.step(1) }
      if (sc === 'aunt2') { d.step(10); d.gSet('away', 5); G.aunt.st = 'pass'; G.aunt.t = 0.9; G.spot.kid.n = 5; G.spot.kid.cap = 5; d.step(1) }
      if (sc === 'kitchen') { d.step(10); d.gSet('walkout', 1.3); d.step(50) }
      if (sc === 'ghost') { d.step(10); G.ghostT = 2; G.spot.altar.total = 5; d.step(2) }
      if (sc === 'ko') { G.stomach = 35; d.step(5); window.gr.bite(); d.step(30) }
      if (sc === 'result') { G.stomach = 18; G.caught = 1; G.given = { dog: 4, kid: 9, uncle: 3, altar: 5, vase: 2 }; d.showResult() }
    }, sc)
    await p.waitForTimeout(sc === 'result' ? 1500 : 500)
  }
  await p.screenshot({ path: `${ROOT}shots/${name}-${sc}.png` })
}
if (errs.length) console.log(errs)
await b.close(); server.kill()
