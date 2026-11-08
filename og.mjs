// SNS用サムネ og.png（1200x630）。node og.mjs
// 横長の画面で部屋を見せる: ばあちゃんが山盛りを掲げて「若いんやから！」、丸いポチ、ふくよかなご先祖さま。右にタイトル
import './mute-auto.mjs'
import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { MUTE_LAUNCH, muteContext } from './mute.mjs'
const ROOT = import.meta.dirname
const server = spawn(process.execPath, ['server.mjs'], { cwd: ROOT, env: { ...process.env, PORT: '5636' } })
await new Promise(r => setTimeout(r, 400))
const b = await chromium.launch(MUTE_LAUNCH), ctx = await b.newContext({ viewport: { width: 1200, height: 630 }, locale: 'ja-JP' }); await muteContext(ctx)
const p = await ctx.newPage()
await p.goto('http://localhost:5636/?notut&seed=4'); await p.waitForFunction(() => window.__grReady)
await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(800)
await p.evaluate(() => {
  const d = gr.dbg, G = d.G
  d.startPlay(); d.pause(true); d.step(2)
  d.CAM.p.set(0.62, 1.22, 1.5); d.CAM.t.set(0.62, 0.55, -0.9)
  G.spot.dog.n = 4; G.spot.altar.total = 5; G.spot.altar.n = 3; G.spot.kid.n = 5; G.spot.kid.cap = 5; G.spot.vase.n = 2; G.spot.uncle.ph = 'open'; G.aunt.next = 999
  G.bowl = ['f_karaage', 'f_onigiri', 'f_ebi', 'f_karaage', 'f_kabocha', 'f_onigiri', 'f_karaage']
  d.gSet('heap', 99); d.step(1)
  d.say('bubble', '若いんやから！', 'loud', 99)
  d.render()
})
await p.addStyleTag({ content: `#coil,#belt,#bMute,#bowlArea,#bSkip{display:none!important}
  #bubble{font-size:46px!important;padding:12px 24px!important}` })
await p.evaluate(() => {
  gr.dbg.render()
  const d = document.createElement('div')
  d.style.cssText = 'position:fixed;right:34px;top:50%;transform:translateY(-50%) rotate(2deg);width:400px;z-index:30;background:#fffdf8;padding:30px 26px 24px;box-shadow:0 14px 34px rgba(0,0,0,.45);font-family:"Zen Kurenaido",sans-serif;color:#1c1712'
  d.innerHTML = `<i style="position:absolute;left:50%;top:-18px;width:38px;height:38px;margin-left:-19px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#ff8d7a,#c8382c 60%,#8a2018);box-shadow:0 3px 5px rgba(0,0,0,.4)"></i>
  <div style="font-size:36px;line-height:1.1">おばあちゃん家の</div>
  <div style="font-size:62px;line-height:1.05;color:#b8342a;margin-left:-4px;white-space:nowrap">おかわり地獄</div>
  <div style="font-size:27px;line-height:1.45;margin-top:12px">食べ終わる前に<br>おかわりが来る。<br>見てない隙に、唐揚げを<br>犬とご先祖さまへ。</div>`
  document.body.appendChild(d)
})
await p.waitForTimeout(500)
await p.evaluate(() => { const e = document.querySelector('#bubble'); const r = e.getBoundingClientRect(); e.style.top = Math.max(16, r.top - 10) + 'px' })
await p.screenshot({ path: ROOT + '/og.png' })
await b.close(); server.kill()
