import './mute-auto.mjs'
import { MUTE_LAUNCH, muteContext } from './mute.mjs'
// 公開URLの確認。node live.mjs（ログインしていないブラウザで見る）。SKIPGH=1 で GitHub ページの確認を省く
// grandma-refill __gr を置き換え、「遊びの通し」をゲームに合わせて書く
import { chromium, webkit } from 'playwright'
import { execSync } from 'node:child_process'
// 個人のアカウント名は公開リポジトリに書かない。実行時に gh から取る（2026-11-02 live.mjs に名前が文字で入ったまま5本公開していた）
const OWNER = (() => { try { return execSync('gh api user -q .login', { encoding: 'utf8' }).trim().toLowerCase() } catch { return '' } })()
const URL0 = 'https://tom3games.github.io/grandma-refill/'
const out = []
for (const [name, bt, opts] of [['chromium', chromium, {}], ['webkit', webkit, { isMobile: true, hasTouch: true, deviceScaleFactor: 2 }]]) {
  const b = await bt.launch(bt === chromium ? MUTE_LAUNCH : {}), ctx = await b.newContext({ locale: 'ja-JP', viewport: { width: 390, height: 844 }, ...opts })
  await muteContext(ctx)
  const p = await ctx.newPage()
  // github.io は横丁（tom3games.com）へ転送される。GitHub Pages に上げた版そのものを見るため、転送の1行だけ外して開く
  await p.route(/tom3games\.github\.io\/grandma-refill\/(\?.*)?$/, async r => { const res = await r.fetch(); const body = (await res.text()).replace(/<script id="ghMove">[^<]*<\/script>/, ''); await r.fulfill({ response: res, body }) })
  const errs = []
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
  p.on('requestfailed', r => errs.push('fail ' + r.url()))
  await p.goto(URL0 + '?t=' + Date.now(), { waitUntil: 'networkidle' })
  await p.waitForFunction(() => window.__grReady, null, { timeout: 15000 })
  // 遊びの通し: 始める（本物の指）→ 初めての1回（本番の中で教える）→ 一口 → 早回しで結果まで
  const tapAt = async sel => { const r = await p.evaluate(s => { const e = document.querySelector(s).getBoundingClientRect(); return { x: e.left + e.width / 2, y: e.top + e.height / 2 } }, sel); if (name === 'webkit') await p.touchscreen.tap(r.x, r.y); else await p.mouse.click(r.x, r.y) }
  await tapAt('#bStart'); await p.waitForTimeout(400)
  out.push(`${name}: learn=${await p.evaluate(() => !!gr.state.learn)}`)
  await p.evaluate(() => { gr.dbg.pause(true); gr.dbg.gSet('watch', 99) })
  const bw = await p.evaluate(() => gr.bowlXY()); if (name === 'webkit') await p.touchscreen.tap(bw.x, bw.y); else await p.mouse.click(bw.x, bw.y)
  const ate = await p.evaluate(() => gr.state.stomach)
  await p.evaluate(() => { gr.dbg.pause(false); gr.dbg.speed(10) })
  await p.waitForFunction(() => !document.querySelector('#vResult').hidden, null, { timeout: 30000 })
  const muteOk = await p.evaluate(() => window.__muteOk())
  out.push(`${name}: url=${p.url()} ver=${await p.evaluate(() => document.querySelector('script[src^="js/game.js"]').getAttribute('src'))}`)
  out.push(`${name}: ate=${ate} result=${JSON.stringify(await p.evaluate(() => window.__lastResult && window.__lastResult.title))} muteOk=${muteOk}`)
  await p.screenshot({ path: `shots/live-${name}.png` })
  const og = await p.evaluate(async () => { const r = await fetch(document.querySelector('meta[property="og:image"]').content); return r.status + ' ' + r.headers.get('content-type') })
  out.push(`${name}: og=${og} errors=${errs.length ? errs.join(' | ') : 'none'}`)
  await b.close()
}
if (process.env.SKIPGH) { console.log(out.join('\n')); process.exit(0) }
// ログアウト状態でリポジトリ・更新履歴に個人のIDが出ていないか
const b = await chromium.launch(MUTE_LAUNCH), p = await b.newPage()
for (const u of ['https://github.com/tom3games/grandma-refill', 'https://github.com/tom3games/grandma-refill/commits/main']) {
  const res = await p.goto(u, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(2500)
  out.push(`${u} status=${res.status()} owner=${OWNER && (await p.content()).toLowerCase().includes(OWNER) ? 'FOUND' : 'none'}`)
}
await b.close()
console.log(out.join('\n'))
