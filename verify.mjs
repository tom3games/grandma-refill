import './mute-auto.mjs'
// おばあちゃん家のおかわり地獄の検証。node verify.mjs
// 押す操作は全部、画面座標を出して page.mouse / touchscreen で本物の指として押す（内部の関数を直接呼ばない）
import { MUTE_LAUNCH, muteContext } from './mute.mjs'
import { chromium, webkit } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
const ROOT = import.meta.dirname
mkdirSync(ROOT + '/shots', { recursive: true })
const PORT = 5633
const server = spawn(process.execPath, ['server.mjs'], { cwd: ROOT, env: { ...process.env, PORT: String(PORT) } })
await new Promise(r => setTimeout(r, 400))
const URL0 = `http://localhost:${PORT}/`
let pass = 0, fail = 0
const results = []
async function t(name, fn) {
  try { const r = await fn(); if (r === false) throw new Error('false'); pass++; results.push(`ok   ${name}${r && r !== true ? '  ' + JSON.stringify(r) : ''}`) }
  catch (e) { fail++; results.push(`FAIL ${name}  ${e.message.split('\n')[0]}`) }
}
const expect = (c, msg) => { if (!c) throw new Error(msg) }
async function open(browser, opts = {}, q = '') {
  const ctx = await browser.newContext({ locale: 'ja-JP', viewport: { width: 390, height: 844 }, ...opts })
  await muteContext(ctx)
  await ctx.addInitScript(() => { try { localStorage.clear() } catch (e) {} })
  const p = await ctx.newPage(); p.errs = []
  p.on('pageerror', e => p.errs.push('pageerror ' + e.message))
  p.on('console', m => { if (m.type() === 'error') p.errs.push('console ' + m.text()) })
  p.on('requestfailed', r => { if (!/fonts\.(googleapis|gstatic)/.test(r.url())) p.errs.push('reqfail ' + r.url()) })
  await p.goto(URL0 + q); await p.waitForFunction(() => window.__grReady, null, { timeout: 15000 })
  return p
}
const overflow = p => p.evaluate(() => {
  const W = document.documentElement.clientWidth, bad = []
  for (const el of document.querySelectorAll('main:not([hidden]) *')) {
    if (el.closest('[hidden]') || (el.checkVisibility && !el.checkVisibility({ visibilityProperty: true }))) continue
    if (el.closest('#rings') || el.closest('#drag')) continue
    const r = el.getBoundingClientRect(); if (r.width && (r.right > W + 1 || r.left < -1)) bad.push((el.id || el.className || el.tagName) + ':' + Math.round(r.left) + '-' + Math.round(r.right))
  }
  return { sw: document.documentElement.scrollWidth, W, bad: bad.slice(0, 5) }
})
const fit = q => q.evaluate(() => {
  const H = innerHeight, de = document.documentElement, over = []
  if (de.scrollHeight > H + 1) over.push('page:' + de.scrollHeight)
  for (const el of document.querySelectorAll('main:not([hidden]) button,main:not([hidden]) a,main:not([hidden]) canvas,#bowlArea')) { if (!el.offsetParent && el.id !== 'bowlArea') continue; if (el.closest('[hidden]')) continue; const r = el.getBoundingClientRect(); if (!r.width) continue; if (r.bottom > H + 1 || r.top < -1) over.push((el.id || el.className) + ':' + Math.round(r.top) + '-' + Math.round(r.bottom)) }
  return { H, over: over.slice(0, 6) }
})
// 本物の指でお茶碗からドラッグして離す
async function dragTo(p, to, steps = 8) {
  const from = await p.evaluate(() => gr.bowlXY())
  await p.mouse.move(from.x, from.y); await p.mouse.down()
  for (let i = 1; i <= steps; i++) await p.mouse.move(from.x + (to.x - from.x) * i / steps, from.y + (to.y - from.y) * i / steps)
  await p.mouse.up()
}
const spot = (p, s) => p.evaluate(s => gr.spotXY(s), s)
const st = p => p.evaluate(() => gr.state)
// 台本: 一時停止して遊びを始め、ばあちゃんの状態を決める
const setup = (p, o = {}) => p.evaluate(o => {
  const d = gr.dbg; d.startPlay(); d.pause(true); d.step(2)
  if (o.g) d.gSet(o.g, o.dur || 99)
  if (o.bowl) d.G.bowl = o.bowl.slice()
  if (o.uncle) Object.assign(d.G.spot.uncle, o.uncle)
  if (o.kid) Object.assign(d.G.spot.kid, o.kid)
  if (o.aunt) Object.assign(d.G.aunt, o.aunt)
  if (o.dog) Object.assign(d.G.spot.dog, o.dog)
  d.G.aunt.next = o.aunt ? d.G.aunt.next : 999
  d.render()
}, o)

const browser = await chromium.launch(MUTE_LAUNCH)
const p = await open(browser)
await t('起動時にエラーが出ない', async () => { expect(p.errs.length === 0, p.errs.join('|')) })
await t('ブラウザの拡大が起きない（viewport・ピンチ・Ctrl+ホイール・Ctrl+プラス）', async () => {
  const r = await p.evaluate(() => {
    const vp = document.querySelector('meta[name=viewport]').content
    const g = new Event('gesturestart', { cancelable: true }); document.dispatchEvent(g)
    const w = new WheelEvent('wheel', { ctrlKey: true, deltaY: -10, bubbles: true, cancelable: true }); window.dispatchEvent(w)
    const k = new KeyboardEvent('keydown', { key: '+', ctrlKey: true, bubbles: true, cancelable: true }); window.dispatchEvent(k)
    return { vp, gesture: g.defaultPrevented, wheel: w.defaultPrevented, key: k.defaultPrevented, ta: getComputedStyle(document.documentElement).touchAction, us: getComputedStyle(document.body).userSelect }
  })
  expect(/user-scalable=no/.test(r.vp) && r.gesture && r.wheel && r.key && r.ta === 'manipulation' && r.us === 'none', JSON.stringify(r)); return r
})
await t('OGP 一式がある', async () => {
  const r = await p.evaluate(() => ['og:title', 'og:description', 'og:image', 'og:url', 'og:type'].map(k => !!document.querySelector(`meta[property="${k}"]`)).concat(!!document.querySelector('meta[name="twitter:card"]')))
  expect(r.every(Boolean), JSON.stringify(r))
})
await t('画面に「AI」「画像生成」の文字が無い（遊び方・クレジット含む）', async () => {
  await p.click('#bHow'); const tx = await p.evaluate(() => document.body.innerText); await p.click('#bHowClose')
  expect(!/AI|画像生成|generated/i.test(tx), tx.match(/.{0,10}(AI|画像生成|generated).{0,10}/i))
})

// ---- 初回: チュートリアル（本物の指で運ぶ → タップで一口 → 本番）
await t('初回のチュートリアル: 指で犬へ運ぶ→タップで一口→本番が始まる', async () => {
  const b = await p.evaluate(() => { const r = document.querySelector('#bStart').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } })
  await p.mouse.click(b.x, b.y)
  await p.waitForTimeout(300)
  const s1 = await st(p); expect(s1.mode === 'tut' && s1.tut === 1 && s1.g === 'away', 'tut1 ' + JSON.stringify([s1.mode, s1.tut, s1.g]))
  const fingerOn = await p.evaluate(() => !document.querySelector('#finger').hidden)
  await dragTo(p, await spot(p, 'dog'))
  await p.waitForTimeout(900)
  const s2 = await st(p); expect(s2.tut === 2 && s2.given.dog === 1, 'tut2 ' + JSON.stringify([s2.tut, s2.given]))
  const bw = await p.evaluate(() => gr.bowlXY()); await p.mouse.click(bw.x, bw.y)
  await p.waitForTimeout(200)
  const s3 = await st(p); expect(s3.tut === 3 && s3.stomach === 1, 'tut3 ' + JSON.stringify([s3.tut, s3.stomach]))
  await p.waitForTimeout(3700)
  const s4 = await st(p); expect(s4.mode === 'play' && s4.t > 0 && s4.stomach === 0, 'play ' + JSON.stringify([s4.mode, s4.t, s4.stomach]))
  const saved = await p.evaluate(() => localStorage.getItem('gr_tut1'))
  expect(saved === '1' && fingerOn, 'saved')
  return { fingerOn }
})
await t('音を鳴らす操作をしても実際には無音（Chromium）・鳴らす処理は呼ばれている', async () => {
  const r = await p.evaluate(() => ({ ok: window.__muteOk(), calls: window.__soundCalls, played: Object.keys(Snd.played || {}).length }))
  expect(r.ok && r.calls > 0, JSON.stringify(r)); return r
})

// ---- 遊びの核（全部本物の指で）
await t('背中を向けている間に、いとこへ運べる', async () => {
  await setup(p, { g: 'away', bowl: ['f_karaage', 'f_onigiri'], kid: { n: 0, cap: 4 } })
  await dragTo(p, await spot(p, 'kid')); await p.evaluate(() => gr.dbg.step(1))
  const s = await st(p); expect(s.given.kid === 1 && s.bowl === 1 && s.caught === 0, JSON.stringify([s.given, s.bowl, s.caught]))
})
await t('運んでいる途中で振り向かれたら見つかる→山盛りが倍→あーん', async () => {
  await setup(p, { g: 'away', dur: 0.05, bowl: ['f_karaage', 'f_onigiri', 'f_ebi'] })
  const from = await p.evaluate(() => gr.bowlXY()), to = await spot(p, 'uncle')
  await p.mouse.move(from.x, from.y); await p.mouse.down(); await p.mouse.move(from.x + 10, from.y - 30); await p.mouse.move(from.x + 20, from.y - 60)
  const held = (await st(p)).held
  await p.evaluate(() => gr.dbg.step(60))   // glance → watch
  await p.mouse.move(to.x, to.y); await p.mouse.up()
  const s = await st(p)
  expect(held && s.caught === 1 && ['caught', 'heap'].includes(s.g) && s.given.uncle === 0, JSON.stringify([held, s.caught, s.g, s.given.uncle]))
  await p.evaluate(() => gr.dbg.step(80))
  const s2 = await st(p); expect(s2.bowl >= 5 || s2.g === 'aaan' || s2.stomach > 0, 'heap ' + JSON.stringify([s2.bowl, s2.g, s2.stomach]))
  await p.evaluate(() => gr.dbg.step(140)); const s3 = await st(p)
  expect(s3.stomach >= 4, 'aaan ' + s3.stomach)
  return { bowlAfterHeap: s2.bowl, stomach: s3.stomach }
})
await t('見られている時にタップで一口→心配が消える', async () => {
  await setup(p, { g: 'watch', bowl: ['f_karaage', 'f_onigiri'] })
  await p.evaluate(() => { gr.dbg.G.g.since = 1.5 })
  const bw = await p.evaluate(() => gr.bowlXY()); await p.mouse.click(bw.x, bw.y)
  const s = await st(p); expect(s.stomach === 1 && s.since === 0 && s.bowl === 2, JSON.stringify([s.stomach, s.since, s.bowl]))
  await p.mouse.click(bw.x, bw.y); let s2 = await st(p); expect(s2.stomach === 1, 'クールダウン中の連打は食べない ' + s2.stomach)
  await p.evaluate(() => gr.dbg.step(30)); await p.mouse.click(bw.x, bw.y); s2 = await st(p)
  expect(s2.stomach === 2 && s2.bowl === 1, '2口で1切れ ' + JSON.stringify([s2.stomach, s2.bowl]))
})
await t('見ているのに食べないと「あーん」で大きく食べさせられる', async () => {
  await setup(p, { g: 'watch', bowl: ['f_karaage', 'f_onigiri'] })
  await p.evaluate(() => { gr.dbg.G.g.dur = 9 })
  await p.evaluate(() => gr.dbg.step(60 * 4.2)); const s = await st(p)
  expect(s.stomach >= 4, JSON.stringify([s.stomach, s.g]))
})
await t('おじさんは口が閉じている時に入れると起きて見つかる／開いている時は入る', async () => {
  await setup(p, { g: 'away', bowl: ['f_karaage', 'f_onigiri'], uncle: { ph: 'shut', t: 0, dur: 9 } })
  await dragTo(p, await spot(p, 'uncle')); await p.evaluate(() => gr.dbg.step(1)); let s = await st(p)
  expect(s.caught === 1 && s.spot.uncle.awake > 0, 'shut ' + JSON.stringify([s.caught, s.spot.uncle]))
  await setup(p, { g: 'away', bowl: ['f_karaage', 'f_onigiri'], uncle: { ph: 'open', t: 0, dur: 9 } })
  await dragTo(p, await spot(p, 'uncle')); s = await st(p)
  expect(s.caught === 0 && s.given.uncle === 1, 'open ' + JSON.stringify([s.caught, s.given]))
})
await t('いとこは満腹の顔の時にあげると告げ口される', async () => {
  await setup(p, { g: 'away', bowl: ['f_karaage', 'f_onigiri'], kid: { n: 4, cap: 4 } })
  await dragTo(p, await spot(p, 'kid')); const s = await st(p)
  expect(s.caught === 1 && s.given.kid === 0 && s.spot.kid.tattleT > 0, JSON.stringify([s.caught, s.given.kid]))
})
await t('おばちゃんが廊下を通っている時に仏壇へ置くと見つかる／いない時は写真がふくよかに', async () => {
  await setup(p, { g: 'away', bowl: ['f_karaage', 'f_onigiri', 'f_ebi'], aunt: { st: 'pass', t: 0.2, next: 999 } })
  await dragTo(p, await spot(p, 'altar')); let s = await st(p)
  expect(s.caught === 1 && s.given.altar === 0, 'aunt ' + JSON.stringify([s.caught, s.given.altar]))
  await setup(p, { g: 'away', bowl: ['f_karaage', 'f_onigiri', 'f_ebi'] })
  await dragTo(p, await spot(p, 'altar')); await dragTo(p, await spot(p, 'altar')); await p.evaluate(() => gr.dbg.render())
  s = await st(p); const tex = await p.evaluate(() => gr.dbg.scene.children.find(m => m.userData && /^p\d$/.test(m.userData.tex || ''))?.userData.tex)
  expect(s.given.altar === 2 && s.caught === 0 && tex === 'p1', 'photo ' + JSON.stringify([s.given.altar, tex]))
})
await t('ポチは3つ目でげっぷ。見られている時なら見つかる', async () => {
  await setup(p, { g: 'away', bowl: ['f_karaage', 'f_onigiri', 'f_ebi'], dog: { n: 2 } })
  await dragTo(p, await spot(p, 'dog'))
  await p.evaluate(() => { gr.dbg.gSet('watch', 9) }); await p.evaluate(() => gr.dbg.step(60 * 2)); const s = await st(p)
  expect(s.given.dog === 1 && s.caught === 1, JSON.stringify([s.given.dog, s.caught]))
})
await t('隠し場所の外で離すとお茶碗に戻る・花びんは2つまで', async () => {
  await setup(p, { g: 'away', bowl: ['f_karaage', 'f_onigiri', 'f_ebi'] })
  await dragTo(p, { x: 195, y: 330 }); let s = await st(p); expect(s.bowl === 3 && !s.held, 'back ' + s.bowl)
  for (let i = 0; i < 3; i++) await dragTo(p, await spot(p, 'vase'))
  s = await st(p); expect(s.given.vase === 2 && s.bowl === 1 && s.caught === 0, 'vase ' + JSON.stringify([s.given.vase, s.bowl]))
})
await t('運んでいる間は隠し場所に印が出て、離すと消える', async () => {
  await setup(p, { g: 'away', bowl: ['f_karaage'] })
  const from = await p.evaluate(() => gr.bowlXY())
  await p.mouse.move(from.x, from.y); await p.mouse.down(); await p.mouse.move(from.x, from.y - 40); await p.mouse.move(from.x, from.y - 80)
  await p.evaluate(() => gr.dbg.render()); const n = await p.evaluate(() => document.querySelectorAll('#rings i').length)
  await p.mouse.up(); await p.evaluate(() => gr.dbg.render()); const n2 = await p.evaluate(() => document.querySelectorAll('#rings i').length)
  expect(n === 5 && n2 === 0, JSON.stringify([n, n2]))
})
await t('隠し場所5つとお茶碗が画面内にあり、重ならない（390x844）', async () => {
  const r = await p.evaluate(() => { const o = {}; for (const s of gr.SPOTS) o[s] = gr.spotXY(s); o.bowl = gr.bowlXY(); return o })
  const W = 390, H = 844, keys = Object.keys(r)
  for (const k of keys) expect(r[k].x > 20 && r[k].x < W - 20 && r[k].y > 70 && r[k].y < H - 50, k + JSON.stringify(r[k]))
  for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) { const d = Math.hypot(r[keys[i]].x - r[keys[j]].x, r[keys[i]].y - r[keys[j]].y); expect(d > 70, keys[i] + '-' + keys[j] + ' ' + Math.round(d)) }
})

// ---- 通し（早回し）: 何もしない → お腹いっぱいで負け、結果カード
await t('何もしない通し: ベルトが切れて負け、最低の称号・結果カードが描ける', async () => {
  await p.evaluate(() => { const d = gr.dbg; d.startPlay(); d.G.aunt.next = 999; d.pause(false); d.speed(8) })
  await p.waitForFunction(() => document.querySelector('#vResult') && !document.querySelector('#vResult').hidden, null, { timeout: 30000 })
  await p.evaluate(() => gr.dbg.speed(1))
  await p.waitForTimeout(600)
  const r = await p.evaluate(() => window.__lastResult)
  const v = await p.evaluate(() => { const c = document.querySelector('#card'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let s = 0, s2 = 0, n = 0; for (let i = 0; i < d.length; i += 4 * 13) { const v = d[i] * .3 + d[i + 1] * .59 + d[i + 2] * .11; s += v; s2 += v * v; n++ } return Math.round(s2 / n - (s / n) ** 2) })
  expect(r.ko && r.title === 'ばあちゃんの愛に沈んだ孫' && v > 300, JSON.stringify([r.ko, r.title, v]))
  await p.screenshot({ path: ROOT + '/shots/v-result-ko.png' })
  return { sec: r.sec, kg: r.kg, variance: v }
})
await t('結果: Xでポストの URL・保存ボタン・もう一回で再開', async () => {
  const href = await p.getAttribute('#bPost', 'href')
  expect(/x\.com\/intent\/post/.test(href) && /grandma-refill/.test(decodeURIComponent(href)), href)
  const b = await p.evaluate(() => { const r = document.querySelector('#bAgain').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } })
  await p.mouse.click(b.x, b.y); await p.waitForTimeout(300)
  const s = await st(p); expect(s.mode === 'play' && s.stomach === 0 && s.t < 2, JSON.stringify([s.mode, s.stomach, s.t]))
})
await t('上手い bot で2分の通し: 生き残る・称号が出る・同時の文字は2つまで', async () => {
  const r = await p.evaluate(async () => {
    const d = gr.dbg; d.startPlay(); d.pause(true)
    let maxTexts = 0
    const st = { r: () => 0.5 }
    for (let i = 0; i < 60 * 125 && !d.G.over; i++) { window.__bot_reader(gr, st, 1 / 60); d.tick(1); if (i % 6) continue; d.render(); const n = [...document.querySelectorAll('#bubble,#sbubble,#hint')].filter(e => !e.hidden).length; if (n > maxTexts) maxTexts = n }
    return { over: d.G.over, maxTexts, res: gr.result() }
  })
  expect(r.over === 'time' && !r.res.ko && r.maxTexts <= 2 && r.res.title, JSON.stringify(r)); return { kg: r.res.kg, caught: r.res.caught, title: r.res.title, maxTexts: r.maxTexts }
})
await t('遊び方の分布（12回ずつ）: 読む bot が最高、何もしないが最低、安全策（全部隠す・全部食べる）は負ける', async () => {
  const out = await p.evaluate(() => {
    const res = {}
    for (const [bot, name, o] of [['reader', 'reader', {}], ['reader', 'slow', { react: 0.7, carry: 1.0, wait: 2.3 }], ['hide', 'hide', {}], ['eat', 'eat', {}], ['idle', 'idle', {}], ['random', 'random', {}]]) {
      const rs = []; for (let s = 1; s <= 12; s++) rs.push(gr.sim(bot, s * 101, o))
      res[name] = { pts: Math.round(rs.reduce((a, r) => a + r.points, 0) / 12), live: rs.filter(r => !r.ko).length, kg: Math.round(rs.reduce((a, r) => a + r.kg, 0) / 12 * 10) / 10 }
    }
    return res
  })
  const o = out
  expect(o.reader.pts > o.hide.pts && o.reader.pts > o.eat.pts && o.idle.pts < o.hide.pts && o.idle.pts < o.eat.pts && o.reader.live === 12 && o.slow.live >= 10 && o.hide.live === 0 && o.eat.live === 0 && o.idle.live === 0, JSON.stringify(o))
  return o
})
await t('同じ種なら同じ結果（再現性）', async () => {
  const r = await p.evaluate(() => [gr.sim('reader', 77), gr.sim('reader', 77)].map(x => x.points + ':' + x.kg + ':' + x.caught))
  expect(r[0] === r[1], r)
})
await t('まれな出来事: スイカ丸ごと・おじいちゃんの幽霊が出る（種で出し分け）', async () => {
  const r = await p.evaluate(() => { let melon = 0, ghost = 0; for (let s = 1; s <= 40; s++) { const x = gr.sim('reader', s * 31, { events: true }); if (x.events.some(e => e[1] === 'melon')) melon++; if (x.events.some(e => e[1] === 'ghost')) ghost++ } return { melon, ghost } })
  expect(r.melon >= 4 && r.melon <= 24 && r.ghost >= 3 && r.ghost <= 24, JSON.stringify(r)); return r
})
await t('英語に切り替わる（タイトル・遊び方）', async () => {
  await p.evaluate(() => { gr.dbg.G.mode = 'title'; document.querySelector('#vResult').hidden = true; document.querySelector('#vPlay').hidden = true; document.querySelector('#vTitle').hidden = false })
  await p.click('#bLang'); const r = await p.evaluate(() => [document.querySelector('#t2').textContent, document.querySelector('#bStart').textContent, document.querySelector('#howRules').innerText])
  await p.click('#bLang')
  expect(r[0] === 'Refill Hell' && /eat/i.test(r[1]) && /Drag food/.test(r[2]), JSON.stringify(r))
})
await t('ここまでエラーなし', async () => { expect(p.errs.length === 0, p.errs.join('|')) })
await p.close()

// ---- 3サイズ × 全画面で一画面・はみ出しなし
for (const [w, h, name] of [[360, 640, 'small'], [390, 844, 'phone'], [430, 932, 'big']]) {
  const q = await open(browser, { viewport: { width: w, height: h } }, '?notut&seed=3')
  const views = {}
  views.title = await fit(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-title.png` })
  const ov = {}; ov.title = await overflow(q)
  await q.click('#bHow'); views.how = await fit(q); ov.how = await overflow(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-how.png` }); await q.click('#bHowClose')
  await q.click('#bStart'); await q.waitForTimeout(400); views.play = await fit(q); ov.play = await overflow(q)
  const spots = await q.evaluate(() => { const o = {}; for (const s of gr.SPOTS) o[s] = gr.spotXY(s); o.bowl = gr.bowlXY(); return o })
  await q.screenshot({ path: `${ROOT}/shots/fit-${name}-play.png` })
  await q.evaluate(() => { const d = gr.dbg; d.G.stomach = 14; d.G.caught = 2; d.G.given = { dog: 4, kid: 9, uncle: 3, altar: 5, vase: 2 }; d.finish('time'); d.G.endT = 3 })
  await q.waitForFunction(() => !document.querySelector('#vResult').hidden); await q.waitForTimeout(500)
  views.result = await fit(q); ov.result = await overflow(q); await q.screenshot({ path: `${ROOT}/shots/fit-${name}-result.png` })
  for (const [v, r] of Object.entries(views)) await t(`一画面に収まる ${name} ${w}x${h} ${v}`, async () => { expect(!r.over.length, JSON.stringify(r)) })
  for (const [v, o] of Object.entries(ov)) await t(`はみ出しなし ${name} ${v}`, async () => { expect(o.sw <= o.W && !o.bad.length, JSON.stringify(o)) })
  await t(`隠し場所が画面内・お茶碗とベルトに重ならない ${name}`, async () => {
    for (const s of ['dog', 'kid', 'uncle', 'altar', 'vase']) { const pt = spots[s]; expect(pt.x > 18 && pt.x < w - 18 && pt.y > 64 && pt.y < h - 60, s + JSON.stringify(pt)); expect(Math.hypot(pt.x - spots.bowl.x, pt.y - spots.bowl.y) > 80, s + ' near bowl') }
    return spots
  })
  await t(`${name}: エラーなし`, async () => { expect(!q.errs.length, q.errs.join('|')) })
  await q.close()
}
await browser.close()

// ---- WebKit（iPhone 相当）: タッチで一口、指で運ぶ
const wb = await webkit.launch(), wp = await open(wb, { isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, '?notut&seed=9')
await t('WebKit: 始めるをタップ→タップで一口食べられる', async () => {
  const b = await wp.evaluate(() => { const r = document.querySelector('#bStart').getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 } })
  await wp.touchscreen.tap(b.x, b.y); await wp.waitForTimeout(300)
  await wp.evaluate(() => { gr.dbg.pause(true); gr.dbg.gSet('watch', 99) })
  const bw = await wp.evaluate(() => gr.bowlXY()); await wp.touchscreen.tap(bw.x, bw.y)
  const s = await st(wp); expect(s.mode === 'play' && s.stomach === 1, JSON.stringify([s.mode, s.stomach]))
})
await t('WebKit: 指で運べる（ポインタの移動）', async () => {
  await wp.evaluate(() => { gr.dbg.gSet('away', 99); gr.dbg.G.bowl = ['f_karaage', 'f_onigiri'] })
  await dragTo(wp, await spot(wp, 'vase')); const s = await st(wp)
  expect(s.given.vase === 1, JSON.stringify(s.given))
})
await t('WebKit: 2本指の touchmove を止める', async () => {
  const r = await wp.evaluate(() => { const e = new Event('touchmove', { cancelable: true, bubbles: true }); Object.defineProperty(e, 'touches', { value: [{}, {}] }); document.body.dispatchEvent(e); return e.defaultPrevented })
  expect(r, r)
})
await t('WebKit: 音を鳴らす操作のあとも実際には無音', async () => {
  const r = await wp.evaluate(() => ({ ok: window.__muteOk(), calls: window.__soundCalls }))
  expect(r.ok && r.calls > 0, JSON.stringify(r)); return r
})
await wp.screenshot({ path: ROOT + '/shots/v-webkit.png' })
await t('WebKit: エラーなし', async () => { expect(wp.errs.length === 0, wp.errs.join('|')) })
await wb.close()
server.kill()
console.log(results.join('\n'))
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
