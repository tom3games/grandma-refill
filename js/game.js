// おばあちゃん家のおかわり地獄。本体
// 遊び: お盆の晩ごはん2分。おばあちゃんが後ろを向いた隙に、お茶碗のおかずを指で隠し場所へ。見られている間は一口食べる。
// ベルトが最後の穴まで来たら負け。仕様の正本は ~/Desktop/claudecode/ideas/grandma-refill.md。文言は data.js
import * as THREE from 'three'
import { setupLook, surfaceTex, addCornerAO, addBlobShadow, look, createFx } from './look.js?v=1'
window.__jsUp = true
const GR = window.GR
const $ = id => document.getElementById(id)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const lerp = (a, b, k) => a + (b - a) * k
const ease = k => k < 0 ? 0 : k > 1 ? 1 : k * k * (3 - 2 * k)
const store = { get(k) { try { return localStorage.getItem(k) } catch (e) { return null } }, set(k, v) { try { localStorage.setItem(k, v) } catch (e) {} } }
let lang = store.get('gr_lang') || ((navigator.language || 'ja').toLowerCase().startsWith('ja') ? 'ja' : 'en')
const L = p => p ? p[lang === 'en' ? 1 : 0] : ''
const T = k => L(GR.T[k])
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 } }
const params = new URLSearchParams(location.search)
let SIM = false

// ============================================================ 音（全部録音素材。CREDITS.md）
const S = n => 'snd/' + n + '.mp3'
Snd.def({
  chop: [S('chop1'), S('chop2'), S('chop3')], dish: [S('dish1'), S('dish2'), S('dish3')], step: [S('step1'), S('step2'), S('step3'), S('step4')],
  chew: [S('chew1'), S('chew2'), S('chew3')], pop: [S('pop1'), S('pop2'), S('pop3')], cloth: [S('cloth1'), S('cloth2'), S('cloth3')],
  burp: S('burp'), rin: S('rin'), belt: S('belt'), chime: S('chime'), snore: S('snore'),
  j_caught: S('j_caught'), j_end: S('j_end'), j_ko: S('j_ko'), j_rare: S('j_rare'), click: S('click'),
})
let muted = store.get('gr_mute') === '1'
Snd.setMute(muted)
function sfx(name, o) { if (!SIM) Snd.play(name, o) }

// ============================================================ 3D の部屋
const canvas = $('view')
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true })
renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1))
const scene = new THREE.Scene()
scene.background = new THREE.Color('#2a2016')
const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 30)
const lights = setupLook(renderer, scene, { exposure: 1.0, sun: 0.9, sunPos: [-2.5, 3, 1.5], target: [0, 0.4, -0.8], hemi: 0.75, fill: 0.3 })
const fx = createFx(scene, camera, renderer)
const R = { x0: -1.5, x1: 1.5, z0: -1.95, z1: 2.5, h: 2.3 }
const texLoader = new THREE.TextureLoader()
const TEX = {}
const PAPERS = []
function tex(name) {
  if (TEX[name]) return TEX[name]
  const t = texLoader.load('img/' + name + '.webp', tt => { tt.userData.ok = true; for (const m of PAPERS) if (m.userData.tex === name) fitPaper(m) })
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; TEX[name] = t; return t
}
// 切り絵（足元が原点。高さ h、縦横比は画像から）
function paper(name, h, o = {}) {
  const g = new THREE.PlaneGeometry(1, 1); g.translate(0, 0.5, 0)
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: tex(name), transparent: true, alphaTest: 0.4, side: THREE.DoubleSide, toneMapped: false }))
  m.userData = { tex: name, h, flip: false, face: o.face !== false }; PAPERS.push(m); fitPaper(m); scene.add(m); return m
}
function fitPaper(m) { const t = TEX[m.userData.tex], img = t && t.image; const a = img && img.width ? img.width / img.height : 0.7; m.scale.set(m.userData.h * a * (m.userData.flip ? -1 : 1), m.userData.h, 1) }
function setPaper(m, name, h) { if (h) m.userData.h = h; if (m.userData.tex !== name) { m.userData.tex = name; m.material.map = tex(name); m.material.needsUpdate = true } fitPaper(m) }
function plane(w, h, mat, pos, rot, parent = scene) { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); m.position.set(...pos); if (rot) m.rotation.set(...rot); parent.add(m); return m }
function box(w, h, d, mat, pos, parent = scene) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(...pos); parent.add(m); return m }
function cyl(rt, rb, h, mat, pos, seg = 28, parent = scene) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat); m.position.set(...pos); parent.add(m); return m }
const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: o.r ?? 0.85, metalness: o.m ?? 0, ...(o.e ? { emissive: o.e, emissiveIntensity: o.ei ?? 1 } : {}), ...(o.map ? { map: o.map } : {}) })

// 畳
const tatami = surfaceTex({ w: 512, h: 512, base: '#c9bb83', repeat: [2.2, 2.6], grime: 0.07, noise: 0.05, draw(x, w, h, r) {
  for (let y = 0; y < h; y += 4) { x.fillStyle = `rgba(${110 + r() * 30},${100 + r() * 30},50,${0.18 + r() * 0.1})`; x.fillRect(0, y, w, 1.5) }
  x.fillStyle = '#3b3a2c'; x.fillRect(0, 0, 14, h); x.fillRect(w / 2, 0, 14, h); x.fillRect(0, h / 2, w / 2, 10)
} })
plane(3.0, 4.5, std('#ffffff', { map: tatami, r: 0.95 }), [0, 0, 0.3], [-Math.PI / 2, 0, 0])
// 壁（土壁）と柱
const wallTex = surfaceTex({ w: 256, h: 256, base: '#c9b48c', repeat: [3, 2], grime: 0.08, noise: 0.07 })
const matWall = std('#ffffff', { map: wallTex, r: 1 })
const post = std('#5a3b22', { r: 0.6 })
// 奥の壁は台所への入口（x 0.19〜0.73、高さ1.84）をあけて3枚
plane(1.69, R.h, matWall, [-0.655, R.h / 2, R.z0], null)
plane(0.77, R.h, matWall, [1.115, R.h / 2, R.z0], null)
plane(4.5, R.h, matWall, [R.x0, R.h / 2, 0.3], [0, Math.PI / 2, 0])
plane(4.5, R.h, matWall, [R.x1, R.h / 2, 0.3], [0, -Math.PI / 2, 0])
box(3.0, 0.08, 0.06, post, [0, 1.86, R.z0 + 0.03])   // 鴨居
for (const x of [-1.47, -0.48, 0.18, 0.74, 1.47]) box(0.09, R.h, 0.08, post, [x, R.h / 2, R.z0 + 0.04])
addCornerAO(scene, { minX: R.x0, maxX: R.x1, minZ: R.z0, maxZ: 2.4, strength: 0.4, sides: 'LRB' })
// 床の間と花びん（左奥）
box(0.95, 0.16, 0.5, std('#6e4a2c', { r: 0.55 }), [-0.98, 0.08, R.z0 + 0.25])
const scrollTex = (() => { const c = document.createElement('canvas'); c.width = 128; c.height = 320; const x = c.getContext('2d'); x.fillStyle = '#efe6cf'; x.fillRect(0, 0, 128, 320); x.fillStyle = '#5b4a33'; x.fillRect(0, 0, 128, 16); x.fillRect(0, 304, 128, 16); x.fillStyle = 'rgba(40,32,24,.18)'; x.beginPath(); x.arc(84, 90, 18, 0, 7); x.fill(); x.fillStyle = 'rgba(40,32,24,.75)'; x.beginPath(); x.moveTo(8, 270); x.lineTo(46, 170); x.lineTo(62, 200); x.lineTo(84, 150); x.lineTo(120, 270); x.fill(); x.fillStyle = 'rgba(40,32,24,.35)'; x.beginPath(); x.moveTo(8, 290); x.lineTo(60, 230); x.lineTo(120, 290); x.fill(); x.fillStyle = '#9a2b20'; x.fillRect(18, 34, 10, 12); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t })()
plane(0.3, 0.75, std('#ffffff', { map: scrollTex, r: 0.9 }), [-0.98, 1.05, R.z0 + 0.02])
const vase = paper('vase', 0.5); vase.position.set(-0.95, 0.16, R.z0 + 0.3)
// ふすま（真ん中）。おばちゃんの影が映る障子にする
const shojiC = document.createElement('canvas'); shojiC.width = 256; shojiC.height = 384
const shojiT = new THREE.CanvasTexture(shojiC); shojiT.colorSpace = THREE.SRGBColorSpace
const shoji = plane(0.64, 1.82, new THREE.MeshBasicMaterial({ map: shojiT, toneMapped: false }), [-0.15, 0.93, R.z0 + 0.02])
// 台所への入口（右奥）。のれんと、明るい廊下
const hallMat = std('#e9c48a', { e: '#c98f3f', ei: 0.4 })
plane(0.54, 1.84, hallMat, [0.46, 0.92, R.z0 - 0.55])
plane(0.54, 0.56, std('#7b5634'), [0.46, 0.001, R.z0 - 0.28], [-Math.PI / 2, 0, 0])
plane(0.56, 1.84, std('#d9b27a', { e: '#a8742f', ei: 0.25 }), [0.19, 0.92, R.z0 - 0.28], [0, Math.PI / 2, 0])
plane(0.56, 1.84, std('#d9b27a', { e: '#a8742f', ei: 0.25 }), [0.73, 0.92, R.z0 - 0.28], [0, -Math.PI / 2, 0])
// 入口の穴（壁を左右と上で囲う）
const holeCover = std('#ffffff', { map: wallTex, r: 1 })
plane(0.54, R.h - 1.84, holeCover, [0.46, 1.84 + (R.h - 1.84) / 2, R.z0 + 0.005])
const hallLight = new THREE.PointLight('#ffcf8a', 1.6, 3.5, 1.5); hallLight.position.set(0.46, 1.6, R.z0 - 0.4); scene.add(hallLight)
const norenTex = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d'); x.fillStyle = '#2f4a86'; x.fillRect(0, 0, 256, 128); x.strokeStyle = 'rgba(255,255,255,.8)'; x.lineWidth = 3; for (let r = 0; r < 4; r++) for (let c = -1; c < 9; c++) for (let k = 0; k < 3; k++) { x.beginPath(); x.arc(c * 32 + (r % 2) * 16, 40 + r * 26, 14 - k * 4.5, Math.PI, 0); x.stroke() } x.fillStyle = 'rgba(0,0,0,.25)'; x.fillRect(126, 0, 4, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t })()
const noren = plane(0.54, 0.42, std('#ffffff', { map: norenTex, r: 1 }), [0.46, 1.62, R.z0 + 0.03])
noren.material.side = THREE.DoubleSide
// 仏壇（右の壁ぎわ）と写真と盆提灯
const altar = new THREE.Group(); altar.position.set(1.05, 0, R.z0 + 0.32); scene.add(altar)
box(0.62, 0.42, 0.42, std('#4a2e1a', { r: 0.5 }), [0, 0.21, 0], altar)
const lacq = std('#1a1210', { r: 0.25, m: 0.2 }), gold = std('#c9a03a', { r: 0.35, m: 0.7, e: '#7a5810', ei: 0.35 })
box(0.52, 0.04, 0.3, lacq, [0, 0.44, -0.06], altar); box(0.56, 0.06, 0.32, lacq, [0, 1.15, -0.06], altar)
box(0.04, 0.72, 0.3, lacq, [-0.25, 0.79, -0.06], altar); box(0.04, 0.72, 0.3, lacq, [0.25, 0.79, -0.06], altar)
box(0.48, 0.7, 0.02, gold, [0, 0.79, -0.2], altar)
box(0.2, 0.03, 0.12, gold, [0, 0.62, -0.12], altar)
const doorL = box(0.25, 0.68, 0.02, lacq, [-0.37, 0.79, 0.04], altar); doorL.rotation.y = 0.9
const doorR = box(0.25, 0.68, 0.02, lacq, [0.37, 0.79, 0.04], altar); doorR.rotation.y = -0.9
for (const sx of [-0.12, 0.12]) { cyl(0.012, 0.012, 0.09, std('#f4f0e6', { e: '#fff1c8', ei: 0.4 }), [sx, 0.5, -0.1], 10, altar); const fl = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffb84a', toneMapped: false })); fl.scale.y = 1.8; fl.position.set(sx, 0.565, -0.1); altar.add(fl) }
const photo = paper('p0', 0.44, { face: false }); photo.position.set(1.05, 0.45, R.z0 + 0.36)
const plate = cyl(0.13, 0.1, 0.03, std('#f2ede2', { r: 0.4 }), [0, 0.435, 0.2], 24, altar)
const lantern = new THREE.Group(); lantern.position.set(0.66, 0, R.z0 + 0.45); scene.add(lantern)
for (const a of [0, 2.1, 4.2]) { const leg = cyl(0.008, 0.008, 0.62, std('#3a2614'), [Math.cos(a) * 0.06, 0.3, Math.sin(a) * 0.06], 6, lantern); leg.rotation.set(Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12) }
const lanternBody = new THREE.Mesh(new THREE.SphereGeometry(0.11, 20, 14), std('#f5e2b8', { e: '#ffb862', ei: 0.7 })); lanternBody.scale.y = 1.3; lanternBody.position.y = 0.76; lantern.add(lanternBody)
cyl(0.05, 0.06, 0.04, std('#3a2614'), [0, 0.9, 0], 12, lantern); cyl(0.06, 0.05, 0.03, std('#3a2614'), [0, 0.62, 0], 12, lantern)
const lanternLight = new THREE.PointLight('#ffb862', 0.5, 1.6, 2); lanternLight.position.set(0, 0.78, 0.1); lantern.add(lanternLight)
// ちゃぶ台と料理
const TABLE_Y = 0.34
const tableTop = cyl(0.44, 0.44, 0.05, std('#7a4b28', { r: 0.45 }), [0, TABLE_Y - 0.025, 0.05], 48)
for (const a of [0.6, 2.2, 3.8, 5.4]) cyl(0.03, 0.03, TABLE_Y - 0.05, std('#4e2e18'), [Math.cos(a) * 0.32, (TABLE_Y - 0.05) / 2, 0.05 + Math.sin(a) * 0.32], 10)
const dishes = new THREE.Group(); scene.add(dishes)
const plateMat = std('#f4efe4', { r: 0.4 })
function platter(x, z, r, food, n) { cyl(r, r * 0.8, 0.025, plateMat, [x, TABLE_Y + 0.012, z], 24, dishes); for (let i = 0; i < n; i++) { const p = paper(food, 0.11, { face: true }); p.position.set(x + (i - (n - 1) / 2) * 0.07, TABLE_Y + 0.02, z + (i % 2) * 0.02); p.userData.tilt = 0.5 } }
platter(-0.15, -0.12, 0.13, 'f_karaage', 3)
platter(0.18, -0.15, 0.11, 'f_ebi', 2)
platter(0.04, 0.14, 0.11, 'f_kabocha', 2)
for (const [gx, gz] of [[0.28, 0.14], [-0.3, 0.12]]) { const gl = new THREE.MeshStandardMaterial({ color: '#e8f2f6', roughness: 0.1, transparent: true, opacity: 0.45 }); cyl(0.04, 0.032, 0.1, gl, [gx, TABLE_Y + 0.05, gz], 16); cyl(0.036, 0.03, 0.07, std('#a8611f', { r: 0.2, e: '#5a2a08', ei: 0.2 }), [gx, TABLE_Y + 0.036, gz], 16) }   // 麦茶
const cooker = new THREE.Group(); cooker.position.set(-0.35, 0, -0.95); scene.add(cooker)
cyl(0.16, 0.18, 0.26, std('#efe9dc', { r: 0.4 }), [0, 0.13, 0], 28, cooker)
const cookerLid = cyl(0.16, 0.16, 0.05, std('#7a2a24', { r: 0.35 }), [0, 0.285, 0], 28, cooker)
box(0.07, 0.04, 0.02, std('#f2b23a', { e: '#c97a10', ei: 0.4 }), [0, 0.2, 0.175], cooker)
box(0.2, 0.02, 0.03, std('#3a2a20'), [0, 0.33, 0], cooker)
cyl(0.17, 0.17, 0.02, std('#d6cdb8'), [0, 0.06, 0], 28, cooker)
// 天井の照明（和風の傘）
const lampLight = new THREE.PointLight('#ffe2b0', 2.4, 6, 1.3); lampLight.position.set(0, 2.0, 0.2); scene.add(lampLight)

// ---- 人と物（切り絵）
const POS = {
  gma: [0.0, 0.0, -0.62],
  kid: [-0.5, 0.0, -0.14],
  uncle: [0.56, 0.0, -0.3],
  dog: [-0.42, 0.0, 0.2],
}
const gma = paper('g_watch', 0.9); gma.position.set(...POS.gma)
const kid = paper('k_hungry', 0.66); kid.position.set(...POS.kid)
const uncle = paper('u_open', 0.7); uncle.position.set(...POS.uncle)
const dog = paper('d_beg', 0.32); dog.position.set(...POS.dog)
const aunt = paper('a_walk', 1.42); aunt.visible = false
const ghost = paper('ghost', 0.62); ghost.visible = false; ghost.position.set(0.74, 0.75, R.z0 + 0.62)
for (const m of [gma, kid, uncle, dog]) addBlobShadow(m, 0.55, { opacity: 0.35 })
// 盛られたおかず（仏壇の皿・花びん）
const altarFood = [], vaseFood = []
for (let i = 0; i < 6; i++) { const p = paper('f_karaage', 0.07); p.visible = false; altarFood.push(p) }
for (let i = 0; i < 3; i++) { const p = paper('f_ebi', 0.11); p.visible = false; vaseFood.push(p) }

// 隠し場所の「おかずを入れる口」（画面座標を出すための点）
const ANCHOR = {
  dog: new THREE.Vector3(-0.42, 0.2, 0.22),
  kid: new THREE.Vector3(-0.5, 0.36, -0.12),
  uncle: new THREE.Vector3(0.52, 0.56, -0.28),
  altar: new THREE.Vector3(1.03, 0.5, R.z0 + 0.52),
  vase: new THREE.Vector3(-0.95, 0.55, R.z0 + 0.32),
}
const SPOTS = ['dog', 'kid', 'uncle', 'altar', 'vase']

// ---- カメラ（座っている自分の目。縦長ほど画角を広げる）
const CAM = { p: new THREE.Vector3(0.02, 1.38, 1.42), t: new THREE.Vector3(0.05, 0.52, -0.75) }
function resize() {
  const w = innerWidth, h = innerHeight, a = w / h
  renderer.setSize(w, h, false); camera.aspect = a
  const hf = 54 * Math.PI / 180
  camera.fov = clamp(2 * Math.atan(Math.tan(hf / 2) / a) * 180 / Math.PI, 46, 84)
  camera.updateProjectionMatrix()
}
addEventListener('resize', resize); resize()

// ============================================================ 遊びの状態（sim でも同じ処理を回す）
const DUR = 120, CAP = 36, BITE_CD = 0.42, WAIT = 2.8, WORRY = 1.8, AAAN_BITES = 4, MAXBOWL = 12
const CAPS = { dog: 5, uncle: 4, altar: 5, vase: 2 }
const DIGEST = { dog: 16, kid: 13 }
const TUT_KEY = 'gr_tut1'
const G = { mode: 'boot', t: 0, clock: 0, texts: { bubble: null, sbubble: null, hint: null }, paused: false, speed: 1, playNo: 0 }
let rng = mulberry(1)
const rnd = (a, b) => a + (b - a) * rng()

function newGame(seed) {
  G.seed = seed; rng = mulberry(seed)
  G.t = 0; G.mode = 'play'; G.over = null; G.endT = 0
  G.bowl = ['f_karaage', 'f_onigiri']; G.bit = false; G.held = null; G.biteCd = 0
  G.stomach = 0; G.caught = 0; G.bites = 0; G.watchedBites = 0; G.forced = 0; G.streak = 0
  G.spot = { dog: { n: 0, dt: 0, burpAt: 0, burpT: 0 }, kid: { n: 0, dt: 0, cap: 3 + Math.floor(rng() * 3), tattleT: 0 }, uncle: { n: 0, ph: 'open', t: 0, dur: rnd(2.0, 2.8), awake: 0 }, altar: { n: 0, total: 0 }, vase: { n: 0 } }
  G.given = { dog: 0, kid: 0, uncle: 0, altar: 0, vase: 0 }
  G.aunt = { st: 'none', t: 0, next: rnd(15, 22), notice: 0 }
  G.trips = [rnd(26, 32), rnd(58, 66), rnd(88, 96)]; G.trip = 0
  G.melon = params.has('melon') ? true : params.has('nomelon') ? false : rng() < 0.3
  G.ghostFlag = params.has('ghost') ? true : params.has('noghost') ? false : rng() < 0.35
  G.ghostAt = 0; G.ghostT = 0; G.ghostUsed = false; G.melonDone = false
  G.g = { st: 'watch', t: 0, dur: 3.6, since: 0, worried: false, fake: false, line: 0 }
  G.events = []
  G.tut = null
  enterWatch('start')
}
function progress() { return clamp(G.t / DUR, 0, 1) }
const watching = () => ['watch', 'aaan', 'caught', 'heap'].includes(G.g.st)
const looking = () => watching() || G.g.st === 'glance' || G.g.st === 'return'
function gSet(st, dur) { const g = G.g; g.st = st; g.t = 0; g.dur = dur; ev('g:' + st) }
function ev(e) { if (G.events.length < 400) G.events.push([Math.round(G.t * 10) / 10, e]) }
function addFood(n, kind) { for (let i = 0; i < n && G.bowl.length < MAXBOWL; i++) G.bowl.push(kind || GR.FOODS[Math.floor(rng() * GR.FOODS.length)]) }
function enterWatch(from) {
  const g = G.g, p = progress()
  gSet('watch', from === 'heap' ? 3.0 : rnd(lerp(3.4, 2.6, p), lerp(4.6, 3.6, p)))
  g.since = 0; g.worried = false
  let add = 0
  if (from === 'back') { add = G.melonNow ? 4 : 3; addFood(add, G.melonNow ? 'f_suika' : null) }
  else if (from !== 'heap' && from !== 'aaan') { const target = p < 0.22 ? 2 : p < 0.6 ? 3 : 4; add = Math.max(0, target - G.bowl.length); if (from === 'start') add = 0; addFood(add) }
  if (add) { sfx('dish', { vol: 0.6 }); bowlDom(true) }
  if (from === 'back' && G.melonNow) { say('bubble', L(GR.G.melon), 'loud', 2.4); sfx('j_rare', { vol: 0.6 }); G.melonNow = false; G.melonDone = true; ev('melon') }
  else if (from === 'back') say('bubble', pickLine(GR.G.back))
  else if (add) say('bubble', pickLine(GR.G.refill))
  else if (from !== 'heap' && from !== 'aaan') say('bubble', pickLine(GR.G.watch))
}
function pickLine(arr) { G.g.line = (G.g.line + 1 + Math.floor(rng() * 2)) % arr.length; return L(arr[G.g.line]) }
function advance() {
  const g = G.g, p = progress()
  switch (g.st) {
    case 'watch':
      if (G.trip < G.trips.length && G.t >= G.trips[G.trip]) { G.trip++; G.melonNow = G.trip === 3 && G.melon; say('bubble', pickLine(GR.G.kitchen)); gSet('walkout', 1.3); sfx('step', { vol: 0.5 }) }
      else { say('bubble', pickLine(GR.G.turn)); gSet('turn', 0.3); sfx('cloth', { vol: 0.5 }) }
      break
    case 'turn': gSet('away', rnd(lerp(2.7, 2.1, p), lerp(4.2, 3.2, p))); g.fake = false; break
    case 'away': gSet('glance', lerp(0.8, 0.6, p)); sfx('cloth', { vol: 0.45 }); break
    case 'glance':
      if (!g.fake && G.t > 40 && rng() < 0.35) { g.fake = true; gSet('away', rnd(1.2, 2.0)); ev('fake') }
      else enterWatch('cycle')
      break
    case 'walkout': gSet('kitchen', rnd(4.6, 6.4)); break
    case 'kitchen': gSet('return', 1.0); sfx('step', { vol: 0.6 }); break
    case 'return': enterWatch('back'); break
    case 'caught': gSet('heap', 1.1); addFood(clamp(G.bowl.length, 2, 4)); sfx('dish', { vol: 0.7 }); say('bubble', pickLine(GR.G.caught), 'loud', 1.8); bowlDom(true); break
    case 'heap': g.resume = 2.2; say('bubble', pickLine(GR.G.aaan)); gSet('aaan', 1.0); ev('aaan'); break
    case 'aaan':
      // ばあちゃんが一口食べさせる（1切れまるごと）
      // 続けて食べさせるほど一口が大きくなる（自分で食べるか、おかずを逃がすと戻る）
      if (G.bowl.length) G.bowl.pop(); G.bit = false
      G.forced++; eat(AAAN_BITES + 2 * Math.min(2, G.streak), true); G.streak++; bowlDom()
      gSet('watch', Math.max(1.2, g.resume || 1.5)); g.since = 0; g.worried = false
      break
  }
}
function eat(n, forced) {
  G.stomach = Math.min(CAP, G.stomach + n); G.bites += n
  if (!forced) sfx('chew', { vol: 0.7 }); else sfx('chew', { vol: 0.8, rate: 0.9 })
  if (G.stomach >= CAP && !G.over) finish('ko')
}
// お茶碗をタップ: 一口食べる
function bite() {
  if (!(G.mode === 'play' || G.mode === 'tut') || G.over) return false
  if (G.biteCd > 0 || !G.bowl.length || G.held) return false
  G.biteCd = BITE_CD
  if (G.bit) { G.bowl.pop(); G.bit = false } else G.bit = true
  G.streak = 0
  if (watching()) { G.g.since = 0; G.g.worried = false; G.watchedBites++; if (G.watchedBites % 5 === 0) say('bubble', pickLine(GR.G.good)) }
  ev('bite')
  sfx('chop', { vol: 0.5 })
  eat(1)
  if (!SIM) { const b = $('bowlArea'); b.classList.remove('chew'); void b.offsetWidth; b.classList.add('chew') }
  bowlDom()
  if (G.tut && G.tut.step === 2) tutNext()
  return true
}
// おかずを持ち上げる / 置く
function grab() {
  if (!(G.mode === 'play' || G.mode === 'tut') || G.over || G.held || !G.bowl.length) return false
  G.held = { food: G.bowl.pop(), bit: G.bit, t: 0 }; G.bit = false; ev('grab'); bowlDom()
  return true
}
function backToBowl() { if (!G.held) return; G.bowl.push(G.held.food); G.bit = G.held.bit; G.held = null; bowlDom() }
function drop(spot) {
  const h = G.held; if (!h) return null
  if (!spot || !SPOTS.includes(spot)) { backToBowl(); return 'back' }
  const s = G.spot[spot]
  const give = () => { G.held = null; G.streak = 0; s.n++; G.given[spot]++; ev('give:' + spot); sfx('pop', { vol: 0.6 }); bowlDom(); if (G.tut && G.tut.step === 1) tutNext() }
  const refuse = (line) => { backToBowl(); sayAt(spot, line); ev('full:' + spot); return 'full' }
  const tut = !!G.tut
  if (spot === 'dog') {
    if (s.n >= CAPS.dog) return refuse(L(GR.SPOT.dog.full))
    give(); sayAt('dog', L(GR.SPOT.dog.ok[0]))
    if (s.n >= 3 && !s.burpAt && !tut) s.burpAt = G.t + 1.8
    return 'ok'
  }
  if (spot === 'kid') {
    if (s.n >= s.cap && !tut) { backToBowl(); s.tattleT = 2.0; caughtBy('kid', L(GR.SPOT.kid.tell)); return 'caught' }
    give(); sayAt('kid', L(GR.SPOT.kid.ok[G.given.kid % 2])); return 'ok'
  }
  if (spot === 'uncle') {
    const u = s
    if ((u.ph !== 'open' || u.n >= CAPS.uncle || u.awake > 0) && !tut) { backToBowl(); u.awake = 2.2; caughtBy('uncle', L(GR.SPOT.uncle.tell)); sfx('cloth', { vol: 0.6 }); return 'caught' }
    give(); sayAt('uncle', L(GR.SPOT.uncle.ok[G.given.uncle % 2])); return 'ok'
  }
  if (spot === 'altar') {
    if (G.aunt.st === 'pass' && !tut) { backToBowl(); G.aunt.notice = 1.8; caughtBy('altar', L(GR.SPOT.altar.tell)); return 'caught' }
    if (s.n >= CAPS.altar) return refuse(L(GR.SPOT.altar.full))
    give(); s.total++; sfx('rin', { vol: 0.45 })
    if (s.n >= CAPS.altar && G.ghostFlag && !G.ghostUsed) { G.ghostUsed = true; G.ghostAt = G.t + 0.8 }
    return 'ok'
  }
  if (spot === 'vase') {
    if (s.n >= CAPS.vase) return refuse(L(GR.SPOT.vase.full))
    give(); sayAt('vase', L(GR.SPOT.vase.ok[0])); return 'ok'
  }
}
// 見つかった: 「若いんやから！」で山盛りが倍
function caughtBy(who, line) {
  const g = G.g
  if (G.held) backToBowl()
  if (g.st === 'caught' || g.st === 'heap') return
  G.caught++; ev('caught:' + who)
  if (line) { if (who === 'gma') say('bubble', line, 'loud', 1.6); else sayAt(who, line, 'loud', 1.8) }
  gSet('caught', 1.2)
  sfx('j_caught', { vol: 0.55 })
  if (!SIM) { fx.shake(0.05, 0.3); fx.zoom(0.06, 0.4); Snd.duck(0.4, 1.4) }
}

function stepGame(dt) {
  if (G.over) { G.endT += dt; return }
  G.t += dt
  const g = G.g; g.t += dt
  if (G.biteCd > 0) G.biteCd -= dt
  if (G.held) G.held.t += dt
  // 持っている所を見られたら見つかる
  if (G.held && g.st === 'watch') caughtBy('gma', null)
  else if (G.held && watching()) backToBowl()
  // 見ている間に食べないと、心配して「あーん」
  if (g.st === 'watch' && G.bowl.length) {
    g.since += dt
    if (!g.worried && g.since > WORRY - 0.5 * Math.min(2, G.streak)) { g.worried = true; say('bubble', pickLine(GR.G.worry)) }
    if (g.since > WAIT - 0.5 * Math.min(2, G.streak)) { g.resume = g.dur - g.t; say('bubble', pickLine(GR.G.aaan)); gSet('aaan', 1.2); ev('aaan') }
  }
  if (g.t >= g.dur) advance()
  // ポチ: 3つ目からげっぷ。見られていたら見つかる
  const d = G.spot.dog
  if (d.burpAt && G.t >= d.burpAt) { d.burpAt = 0; d.burpT = 1.2; sfx('burp', { vol: 0.8 }); ev('burp'); if (looking()) caughtBy('dog', L(GR.SPOT.dog.tell)) }
  if (d.burpT > 0) d.burpT -= dt
  // 消化
  for (const k of ['dog', 'kid']) { const s = G.spot[k]; if (s.n > 0) { s.dt += dt; if (s.dt >= DIGEST[k]) { s.dt = 0; s.n--; ev('digest:' + k) } } else s.dt = 0 }
  if (G.spot.kid.tattleT > 0) G.spot.kid.tattleT -= dt
  // おじさんの口: 開いている時だけ入る
  const u = G.spot.uncle
  if (u.awake > 0) u.awake -= dt
  u.t += dt; if (u.t >= u.dur) { u.t = 0; if (u.ph === 'open') { u.ph = 'shut'; u.dur = rnd(1.1, 1.7) } else { u.ph = 'open'; u.dur = rnd(2.0, 2.8) } }
  // おばちゃんが廊下を通る（障子に影 から 入口に姿）
  const a = G.aunt
  a.t += dt
  if (a.notice > 0) a.notice -= dt
  if (a.st === 'none' && G.t >= a.next) { a.st = 'shadow'; a.t = 0; ev('aunt') ; sfx('step', { vol: 0.35 }) }
  else if (a.st === 'shadow' && a.t >= 1.5) { a.st = 'pass'; a.t = 0; sfx('step', { vol: 0.45 }) }
  else if (a.st === 'pass' && a.t >= 1.8) { a.st = 'none'; a.t = 0; a.next = G.t + rnd(15, 22) }
  // おじいちゃんが写真から出てきて食べる（まれ）
  if (G.ghostAt && G.t >= G.ghostAt) { G.ghostAt = 0; G.ghostT = 2.8; G.spot.altar.n = 0; ev('ghost'); sfx('rin', { vol: 0.6 }); sfx('j_rare', { vol: 0.55 }); sayAt('altar', L(GR.GHOST), '', 2.4) }
  if (G.ghostT > 0) G.ghostT -= dt
  if (G.t >= DUR && !G.over) finish('time')
  // 環境の音（遊びには関係しない）: 風鈴、おじさんのいびき
  if (!SIM) {
    G.chimeAt = G.chimeAt || 4
    if (G.t >= G.chimeAt) { sfx('chime', { vol: 0.32 }); G.chimeAt = G.t + 11 + Math.random() * 10 }
    if (u.ph === 'open' && u.t < dt * 1.5 && Math.random() < 0.5) sfx('snore', { vol: 0.16 })
  }
}
function finish(kind) {
  G.over = kind; G.endT = 0; ev('end:' + kind)
  if (G.held) backToBowl()
  if (kind === 'ko') { say('bubble', L(GR.G.ko), 'loud', 2.4); sfx('belt', { vol: 0.9 }); sfx('j_ko', { vol: 0.6 }); if (!SIM) { fx.shake(0.07, 0.4); flash() } }
  else { say('bubble', L(GR.G.end), '', 2.4); sfx('j_end', { vol: 0.6 }) }
}
function kgOf() { return Math.round(G.stomach * 0.08 * 10) / 10 }
function result() {
  const kg = kgOf(), ko = G.over === 'ko'
  let title = ''
  for (const r of GR.TITLES) { if (r.ko) { if (ko) { title = L(r.t); break } continue } if (ko) continue; if ((r.kg == null || kg <= r.kg) && (r.caught == null || G.caught <= r.caught)) { title = L(r.t); break } }
  const points = ko ? Math.round(G.t / 3) : Math.round(100 - kg * 20 - G.caught * 5)
  return { kg, ko, caught: G.caught, forced: G.forced, title, points, sec: Math.round(G.t), given: { ...G.given }, stomach: G.stomach }
}

// ============================================================ チュートリアル（初回だけ。とばせる）
function startTutorial() {
  newGame(7); G.mode = 'tut'; G.bowl = ['f_karaage', 'f_onigiri', 'f_ebi']
  G.tut = { step: 1, t: 0 }
  gSet('away', 999); G.aunt.next = 999; unsay('bubble')
  say('hint', L(['背中を向けた！\nおかずを指でつまんでポチまで', 'Her back is turned!\nDrag food from the bowl to the dog']), '', 999)
  $('bSkip').hidden = false; bowlDom()
}
function tutNext() {
  const tu = G.tut; if (!tu) return
  if (tu.step === 1) { tu.step = 2; tu.t = 0; gSet('glance', 0.6); G.g.dur = 0.6; say('hint', L(['こっちを向いた！\nお茶碗をタップでひと口', 'She turned!\nTap the bowl to take a bite']), '', 999) }
  else if (tu.step === 2) { tu.step = 3; tu.t = 0; say('hint', L(['ベルトが最後の穴まで来たら負け\n見つかると山盛り倍', 'Belt at the last hole = game over\nCaught = double heap']), '', 3.2) }
}
function stepTutorial(dt) {
  const tu = G.tut; tu.t += dt
  const g = G.g; g.t += dt; if (G.biteCd > 0) G.biteCd -= dt
  if (tu.step === 2 && g.st === 'glance' && g.t >= g.dur) { gSet('watch', 999); say('bubble', L(GR.G.watch[0])) }
  if (tu.step === 3 && tu.t > 3.3) endTutorial()
}
function endTutorial() { store.set(TUT_KEY, '1'); $('bSkip').hidden = true; unsay('hint'); startPlay() }

// ============================================================ 文字（同時に2つまで）
function say(slot, text, cls = '', sec) { if (SIM) return; G.texts[slot] = { text, cls, until: G.clock + (sec || Math.max(1.4, 0.9 + text.length * 0.09)), born: G.clock, at: null } }
function sayAt(spot, text, cls = '', sec) { if (SIM) return; G.texts.sbubble = { text, cls, until: G.clock + (sec || Math.max(1.2, 0.8 + text.length * 0.09)), born: G.clock, at: spot } }
function unsay(slot) { G.texts[slot] = null }
function flash() { const f = $('flash'); f.style.transition = 'none'; f.style.opacity = '0.8'; requestAnimationFrame(() => { f.style.transition = 'opacity .5s'; f.style.opacity = '0' }) }

// ============================================================ 画面（DOM）
const VIEWS = ['vTitle', 'vHow', 'vPlay', 'vResult']
function show(id) { for (const v of VIEWS) $(v).hidden = v !== id; $('bMute').hidden = id === 'vResult' }
function bowlDom(added) {
  if (SIM) return
  const pile = $('pile'), want = G.bowl.length
  // 山盛り: 下から3列、上へ積む（多いほど高くなる）
  while (pile.children.length > want) pile.lastChild.remove()
  for (let i = 0; i < want; i++) {
    let im = pile.children[i]
    if (!im) { im = document.createElement('img'); im.alt = ''; im.draggable = false; pile.appendChild(im); if (added) im.classList.add('new') }
    const src = 'img/' + G.bowl[i] + '.webp'; if (!im.src.endsWith(src)) im.src = src
    const row = Math.floor(i / 3), col = i % 3, off = row % 2 ? 0.5 : 0
    const x = clamp((col + off) * 31 - (row % 2 ? 6 : 0), -4, 66), y = row * 22
    im.style.left = x + '%'; im.style.bottom = y + 'px'; im.style.zIndex = 10 + i
    im.style.transform = `rotate(${((i * 37) % 30) - 15}deg)`
    im.classList.toggle('bit', G.bit && i === want - 1)
  }
}
function beltDom() {
  const f = clamp(G.stomach / CAP, 0, 1), svg = $('beltSvg'), W = 400
  const holes = 7, hole = Math.min(holes - 1, Math.floor(f * holes))
  if (svg.dataset.k === hole + ':' + (G.over === 'ko')) return
  svg.dataset.k = hole + ':' + (G.over === 'ko')
  const hx = i => 230 + i * 22
  let s = `<path d="M0 0H${W}V60H0z" fill="#3a2a1c"/>`
  // お腹（シャツ）
  s += `<path d="M0 ${18 - f * 10}Q200 ${-6 - f * 26} ${W} ${18 - f * 10}V60H0z" fill="#e7e0cf"/>`
  s += `<rect x="0" y="22" width="${W}" height="24" fill="#6b4226"/><rect x="0" y="24" width="${W}" height="2" fill="rgba(255,255,255,.15)"/>`
  s += `<path d="M0 30H${W}M0 39H${W}" stroke="rgba(0,0,0,.25)" stroke-width="1" stroke-dasharray="6 5"/>`
  for (let i = 0; i < holes; i++) { const last = i === holes - 1; s += `<ellipse cx="${hx(i)}" cy="34" rx="${i < hole ? 4.5 : 3.2}" ry="3.6" fill="${last ? '#b8342a' : '#1f140b'}"/>` }
  // バックル（ピンが今の穴にかかる）
  const bx = hx(hole) - 46
  s += `<rect x="${bx}" y="17" width="40" height="34" rx="6" fill="none" stroke="#c9a24a" stroke-width="6"/><path d="M${bx + 20} 34H${hx(hole)}" stroke="#c9a24a" stroke-width="4" stroke-linecap="round"/>`
  if (G.over === 'ko') s += `<path d="M${bx + 44} 20l10-12M${bx + 50} 44l14 10M${bx + 40} 8l2-8" stroke="#fff" stroke-width="4" stroke-linecap="round"/>`
  svg.innerHTML = s
  $('belt').classList.toggle('strain', f >= 0.75 && !G.over)
}
function coilDom() {
  const k = clamp(G.t / DUR, 0, 1), g = $('coilG')
  const key = Math.round(k * 60); if (g.dataset.k == key) return; g.dataset.k = key
  // 渦巻き。燃えたところは灰色、先に火
  const pts = []; for (let a = 0; a <= 5.2 * Math.PI; a += 0.12) { const r = 6 + a * 1.95; pts.push([40 + Math.cos(a) * r, 40 + Math.sin(a) * r]) }
  const n = pts.length, cut = Math.floor((1 - k) * (n - 1))
  const path = arr => arr.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('')
  let s = `<path d="${path(pts)}" fill="none" stroke="#2c4a22" stroke-width="5.5" stroke-linecap="round" opacity=".2"/>`
  s += `<path d="${path(pts.slice(0, cut + 1))}" fill="none" stroke="#3f6a2a" stroke-width="5.5" stroke-linecap="round"/>`
  const e = pts[cut]; s += `<circle cx="${e[0]}" cy="${e[1]}" r="4.5" fill="#ff7a2a"/><circle cx="${e[0]}" cy="${e[1]}" r="2.2" fill="#ffe08a"/>`
  s += `<path d="M${e[0]} ${e[1] - 6}q-4 -8 1 -14t0 -14" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="2"/>`
  g.innerHTML = s
}
const v3 = new THREE.Vector3()
function toScreen(p) { v3.copy(p).project(camera); return { x: (v3.x + 1) / 2 * innerWidth, y: (1 - v3.y) / 2 * innerHeight } }
function spotXY(name) { return toScreen(ANCHOR[name]) }
function spotAt(x, y) { let best = null, bd = 1e9; const r = Math.max(52, innerWidth * 0.14); for (const s of SPOTS) { const p = spotXY(s), d = Math.hypot(p.x - x, p.y - y); if (d < r && d < bd) { bd = d; best = s } } return best }
function textsDom() {
  const now = G.clock
  for (const k in G.texts) { const v = G.texts[k]; if (v && now > v.until) G.texts[k] = null }
  const live = Object.entries(G.texts).filter(([, v]) => v).sort((a, b) => a[1].born - b[1].born)
  while (live.length > 2) { const [k] = live.shift(); G.texts[k] = null }
  for (const k of ['bubble', 'sbubble', 'hint']) {
    const v = G.texts[k], e = $(k)
    if (!v) { if (!e.hidden) e.hidden = true; continue }
    if (e.dataset.t !== v.text || e.hidden) { e.dataset.t = v.text; e.textContent = v.text; e.className = (k === 'hint' ? 'hint ' : 'bubble ' + (k === 'sbubble' ? 'spot ' : '')) + v.cls; e.hidden = false }
  }
  const place = (e, p) => {
    if (e.hidden) return
    const W = innerWidth, H = innerHeight, w = e.offsetWidth, h = e.offsetHeight
    const left = clamp(p.x - w / 2, 10, W - w - 10), top = clamp(p.y - h - 14, 70, H - h - 220)
    e.style.left = Math.round(left) + 'px'; e.style.top = Math.round(top) + 'px'
    e.style.setProperty('--tail', clamp(p.x - left, 16, w - 16) + 'px')
  }
  const gp = gma.position.clone(); gp.y += gma.userData.h * 1.02
  place($('bubble'), toScreen(gp))
  const sv = G.texts.sbubble; if (sv) { const a = ANCHOR[sv.at].clone(); a.y += sv.at === 'altar' ? 0.32 : 0.14; place($('sbubble'), toScreen(a)) }
}
function ringsDom() {
  const box = $('rings')
  const on = (!!G.held && (G.mode === 'play' || G.mode === 'tut')) || (G.mode === 'tut' && G.tut && G.tut.step === 1)
  if (!on) { if (box.childElementCount) box.innerHTML = ''; return }
  if (!box.childElementCount) for (const s of SPOTS) { const i = document.createElement('i'); i.dataset.s = s; box.appendChild(i) }
  for (const i of box.children) { const p = spotXY(i.dataset.s); i.style.left = p.x + 'px'; i.style.top = p.y + 'px'; i.classList.toggle('hot', drag.over === i.dataset.s) }
}

// ---- 指の操作: お茶碗を押して動かす＝運ぶ、動かさず離す＝一口
const drag = { id: null, x0: 0, y0: 0, moved: false, over: null }
const bowlArea = $('bowlArea'), dragEl = $('drag')
bowlArea.addEventListener('pointerdown', e => {
  if (!(G.mode === 'play' || G.mode === 'tut') || G.over) return
  e.preventDefault(); firstTouch()
  drag.id = e.pointerId; drag.x0 = e.clientX; drag.y0 = e.clientY; drag.moved = false; drag.over = null
  try { bowlArea.setPointerCapture(e.pointerId) } catch (er) {}
})
bowlArea.addEventListener('pointermove', e => {
  if (drag.id !== e.pointerId) return
  if (!drag.moved && Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 14) {
    if (!grab()) { drag.id = null; return }
    drag.moved = true; dragEl.hidden = false; dragEl.querySelector('img').src = 'img/' + G.held.food + '.webp'; sfx('chop', { vol: 0.35, rate: 1.2 })
  }
  if (drag.moved) {
    if (!G.held) { drag.id = null; dragEl.hidden = true; return }   // 見つかって戻された
    dragEl.style.transform = `translate(${e.clientX}px,${e.clientY}px)`
    drag.over = spotAt(e.clientX, e.clientY)
  }
})
function endDrag(e) {
  if (drag.id !== e.pointerId) return
  drag.id = null; dragEl.hidden = true
  if (!drag.moved) { bite(); return }
  if (G.held) drop(spotAt(e.clientX, e.clientY))
  drag.over = null
}
bowlArea.addEventListener('pointerup', endDrag)
bowlArea.addEventListener('pointercancel', e => { if (drag.id === e.pointerId) { drag.id = null; dragEl.hidden = true; backToBowl() } })

// ============================================================ 毎フレームの見た目
function gmaLook(dt) {
  const g = G.g || { st: 'watch', t: 0, dur: 1 }, st = G.mode === 'title' || G.mode === 'boot' ? 'watch' : g.st
  const seat = POS.gma, door = [0.46, 0, R.z0 - 0.15]
  gma.visible = true; gma.userData.flip = false
  let pose = 'g_watch', h = 0.86, pos = seat
  if (G.mode === 'title' || G.mode === 'boot') pose = 'g_watch'
  else if (G.over) pose = G.over === 'ko' ? 'g_heap' : 'g_watch'
  else if (st === 'turn' || st === 'away') pose = 'g_away'
  else if (st === 'glance') pose = 'g_glance'
  else if (st === 'caught') pose = 'g_caught'
  else if (st === 'heap') pose = 'g_heap'
  else if (st === 'aaan') pose = 'g_aaan'
  else if (st === 'walkout') { pose = 'g_walk'; h = 1.12; const k = ease(g.t / g.dur); pos = [lerp(seat[0] + 0.15, door[0], k), 0, lerp(seat[2], door[2], k)] }
  else if (st === 'kitchen') { gma.visible = false }
  else if (st === 'return') { pose = G.melonNow ? 'g_melon' : 'g_walk'; h = G.melonNow ? 1.25 : 1.12; gma.userData.flip = !G.melonNow; const k = ease(g.t / g.dur); pos = [lerp(door[0], seat[0] + 0.12, k), 0, lerp(door[2], seat[2], k)] }
  setPaper(gma, pose, h); gma.position.set(pos[0], pos[1], pos[2])
  // 見ている時は少し前のめり、振り向きは小さく揺れる
  const bob = st === 'watch' ? Math.sin(G.clock * 3) * 0.006 : st === 'glance' ? Math.sin(G.clock * 30) * 0.006 : st === 'caught' ? Math.abs(Math.sin(G.clock * 14)) * 0.03 : st === 'walkout' || st === 'return' ? Math.abs(Math.sin(G.clock * 10)) * 0.02 : 0
  gma.position.y += bob
}
function cast(dt) {
  if (G.mode === 'title' || G.mode === 'boot' || !G.spot) {
    setPaper(kid, 'k_hungry'); setPaper(uncle, 'u_open'); setPaper(dog, 'd_beg', 0.32); setPaper(photo, 'p0'); vase.rotation.z = 0
    aunt.visible = false; ghost.visible = false; for (const p of altarFood) p.visible = false; for (const p of vaseFood) p.visible = false
    return
  }
  const sp = G.spot
  // いとこ
  setPaper(kid, sp.kid.tattleT > 0 ? 'k_tattle' : sp.kid.n >= sp.kid.cap ? 'k_full' : 'k_hungry', sp.kid.n >= sp.kid.cap ? 0.7 : 0.66)
  // おじさん
  setPaper(uncle, sp.uncle.awake > 0 ? 'u_awake' : (sp.uncle.ph === 'open' && sp.uncle.n < CAPS.uncle) ? 'u_open' : 'u_shut')
  // ポチ: 食べるほど丸くなる
  const dn = sp.dog.n
  setPaper(dog, sp.dog.burpT > 0 ? 'd_burp' : dn >= 3 ? 'd_fat' : 'd_beg', 0.32 + dn * 0.022)
  if (sp.dog.burpAt) dog.position.x = POS.dog[0] + Math.sin(G.clock * 40) * 0.006; else dog.position.x = POS.dog[0]
  // ご先祖さまは、もらった数だけふくよかに（おじいちゃんが食べても戻らない）
  setPaper(photo, sp.altar.total >= 4 ? 'p2' : sp.altar.total >= 2 ? 'p1' : 'p0')
  for (let i = 0; i < altarFood.length; i++) { const p = altarFood[i]; p.visible = i < sp.altar.n; p.position.set(1.05 + ((i % 3) - 1) * 0.07, 0.45 + Math.floor(i / 3) * 0.04, R.z0 + 0.54) }
  for (let i = 0; i < vaseFood.length; i++) { const p = vaseFood[i]; p.visible = i < sp.vase.n; p.position.set(-0.95 + (i - 0.5) * 0.05, 0.52 + i * 0.02, R.z0 + 0.33); p.rotation.z = (i - 0.5) * 0.5 }
  vase.rotation.z = sp.vase.n >= CAPS.vase ? 0.08 : 0
  // おばちゃん
  const a = G.aunt
  aunt.visible = a.st === 'pass' || a.notice > 0
  if (a.notice > 0) { setPaper(aunt, 'a_notice', 1.38); aunt.position.set(0.46, 0, R.z0 - 0.1) }
  else if (a.st === 'pass') { setPaper(aunt, 'a_walk', 1.42); aunt.position.set(lerp(0.3, 0.62, a.t / 1.8), 0, R.z0 - 0.35) }
  // おじいちゃん
  ghost.visible = G.ghostT > 0; if (ghost.visible) ghost.position.y = 0.62 + Math.sin(G.clock * 3) * 0.03
}
function drawShoji() {
  const x = shojiC.getContext('2d'), W = 256, H = 384
  x.fillStyle = '#f3ead2'; x.fillRect(0, 0, W, H)
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, 'rgba(255,214,150,.35)'); g.addColorStop(1, 'rgba(255,214,150,0)'); x.fillStyle = g; x.fillRect(0, 0, W, H)
  // おばちゃんの影（右へ歩く）
  const a = G.aunt
  if (a && a.st === 'shadow') {
    const k = a.t / 1.5, cx = lerp(-40, W + 30, k)
    x.fillStyle = 'rgba(40,30,22,.55)'
    x.beginPath(); x.ellipse(cx, 88, 26, 30, 0, 0, 7); x.fill()          // 頭
    x.beginPath(); x.ellipse(cx - 24, 70, 14, 22, -0.5, 0, 7); x.fill()  // ポニーテール
    x.fillRect(cx - 30, 118, 60, 120)                                     // 体
    x.beginPath(); x.moveTo(cx - 36, 230); x.lineTo(cx + 36, 230); x.lineTo(cx + 46, 330); x.lineTo(cx - 46, 330); x.fill()   // スカート
    x.fillRect(cx + 20, 160, 54, 10)                                       // お盆
  }
  x.strokeStyle = '#6a4a2c'; x.lineWidth = 8; x.strokeRect(4, 4, W - 8, H - 8)
  x.lineWidth = 4; for (let i = 1; i < 3; i++) { x.beginPath(); x.moveTo(i * W / 3, 0); x.lineTo(i * W / 3, H); x.stroke() }
  for (let j = 1; j < 6; j++) { x.beginPath(); x.moveTo(0, j * H / 6); x.lineTo(W, j * H / 6); x.stroke() }
  shojiT.needsUpdate = true
}

// ============================================================ 遊びの開始・終わり
function firstTouch() {
  Snd.init()
  if (!Snd.loops.amb && !SIM) { Snd.loop('amb', S('amb_cicada'), 0.28); Snd.loop('tv', S('tv_laugh'), 0.06) }
}
function startPlay() {
  const seed = params.has('seed') ? +params.get('seed') : (Date.now() % 100000) + G.playNo * 7
  newGame(seed); G.mode = 'play'; G.texts = { bubble: null, sbubble: null, hint: null }
  if (window.TM) TM.start()
  bowlDom(); show('vPlay')
}
function begin() {
  firstTouch(); sfx('click', { vol: 0.6 }); G.playNo++
  show('vPlay')
  if (!store.get(TUT_KEY) && !params.has('notut')) startTutorial(); else { $('bSkip').hidden = true; startPlay() }
}
let resultShown = false
function stepEnd() {
  if (G.over && G.mode === 'play' && G.endT > 2.4 && !resultShown) { resultShown = true; showResult() }
}
async function showResult() {
  const r = result()
  G.mode = 'result'; show('vResult')
  if (window.TM) TM.end(r.points, !r.ko)
  await drawCard(r)
  fitCard()
  const text = (lang === 'en' ? `Grandma's house: +${r.kg}kg. "${r.title}" #GrandmaRefill` : `おばあちゃん家で +${r.kg}kg。「${r.title}」 #おかわり地獄`)
  $('bPost').href = 'https://x.com/intent/post?text=' + encodeURIComponent(text) + '&url=' + encodeURIComponent('https://tom3games.github.io/grandma-refill/')
  window.__lastResult = r
}
function fitCard() {
  const box = $('cardBox'), c = $('card'), bw = box.clientWidth, bh = box.clientHeight
  const s = Math.min(bw / 720, bh / 1000); c.style.width = Math.floor(720 * s) + 'px'; c.style.height = Math.floor(1000 * s) + 'px'
}
addEventListener('resize', () => { if (!$('vResult').hidden) fitCard() })
function loadImg(src) { return new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src }) }
// 結果: 体重計のカード（針が +kg を指す）と、ばあちゃんの書き置き
async function drawCard(r) {
  const c = $('card'), x = c.getContext('2d'), W = 720, H = 1000
  try { await document.fonts.load('40px "Zen Kurenaido"') } catch (e) {}
  const hand = '"Zen Kurenaido", "Hiragino Maru Gothic ProN", sans-serif', ui = '"Kosugi Maru", "Hiragino Maru Gothic ProN", sans-serif'
  // 脱衣所の床（クッションフロア）
  x.fillStyle = '#d8cdb6'; x.fillRect(0, 0, W, H)
  for (let i = 0; i < 12; i++) for (let j = 0; j < 16; j++) { x.fillStyle = (i + j) % 2 ? 'rgba(120,100,70,.08)' : 'rgba(255,255,255,.08)'; x.fillRect(i * 60, j * 60 + 20, 60, 60) }
  // 体重計
  const sx = 360, sy = 330
  x.save(); x.translate(sx, sy); x.rotate(-0.02)
  x.fillStyle = 'rgba(0,0,0,.18)'; x.beginPath(); x.roundRect(-262, -232, 540, 500, 70); x.fill()
  x.fillStyle = '#f4f1ea'; x.beginPath(); x.roundRect(-270, -246, 540, 500, 70); x.fill()
  x.strokeStyle = '#2a2118'; x.lineWidth = 6; x.stroke()
  // 足の滑り止め
  x.fillStyle = '#d9d3c6'; for (const fxp of [-130, 130]) { x.beginPath(); x.roundRect(fxp - 70, 70, 140, 160, 60); x.fill() }
  // 目盛り
  const R0 = 150, cy = -60
  x.fillStyle = '#fffdf8'; x.beginPath(); x.arc(0, cy, R0 + 18, Math.PI, 0); x.lineTo(R0 + 18, cy + 30); x.lineTo(-R0 - 18, cy + 30); x.closePath(); x.fill(); x.stroke()
  const MAXKG = 3.0, ang = kg => Math.PI + (clamp(kg, 0, MAXKG) / MAXKG) * Math.PI
  for (let k = 0; k <= 32; k++) { const a = ang(k / 10), big = k % 5 === 0; x.strokeStyle = k / 10 >= 2.4 ? '#b8342a' : '#2a2118'; x.lineWidth = big ? 4 : 2; x.beginPath(); x.moveTo(Math.cos(a) * (R0 - (big ? 22 : 12)), cy + Math.sin(a) * (R0 - (big ? 22 : 12))); x.lineTo(Math.cos(a) * R0, cy + Math.sin(a) * R0); x.stroke() }
  x.fillStyle = '#2a2118'; x.font = `28px ${ui}`; x.textAlign = 'center'; x.textBaseline = 'middle'
  for (const k of [0, 1, 2, 3]) { const a = ang(k); x.fillText('+' + k, Math.cos(a) * (R0 - 48), cy + Math.sin(a) * (R0 - 48)) }
  // 針
  const a = ang(r.kg); x.strokeStyle = '#b8342a'; x.lineWidth = 6; x.lineCap = 'round'; x.beginPath(); x.moveTo(0, cy); x.lineTo(Math.cos(a) * (R0 - 8), cy + Math.sin(a) * (R0 - 8)); x.stroke()
  x.fillStyle = '#2a2118'; x.beginPath(); x.arc(0, cy, 12, 0, 7); x.fill()
  // 窓の下の数字
  x.fillStyle = r.ko ? '#b8342a' : '#2a2118'; x.font = `86px ${hand}`; x.fillText('+' + r.kg.toFixed(1) + 'kg', 0, cy + 92)
  x.restore()
  // 称号
  x.fillStyle = '#2a2118'; x.font = `50px ${hand}`; x.textAlign = 'center'
  let fs = 50; while (x.measureText(r.title).width > 640 && fs > 30) { fs -= 2; x.font = `${fs}px ${hand}` }
  x.fillText(r.title, W / 2, 640)
  // 誰がどれだけ食べてくれたか（1行）
  const g = r.given
  const line = lang === 'en' ? `Dog ${g.dog} · Cousin ${g.kid} · Uncle ${g.uncle} · Ancestor ${g.altar} · Vase ${g.vase} · Caught ${r.caught}` : `ポチ${g.dog} いとこ${g.kid} おじさん${g.uncle} ご先祖${g.altar} 花びん${g.vase} / 見つかった${r.caught}回`
  x.font = `24px ${ui}`; x.fillStyle = '#5a4c3a'; let ls = 24; while (x.measureText(line).width > 660 && ls > 16) { ls--; x.font = `${ls}px ${ui}` } x.fillText(line, W / 2, 690)
  // ばあちゃんの書き置き（チラシの裏）
  x.save(); x.translate(250, 840); x.rotate(-0.05)
  x.fillStyle = 'rgba(0,0,0,.2)'; x.fillRect(-196, -96, 400, 200)
  x.fillStyle = '#fffdf8'; x.fillRect(-200, -104, 400, 200)
  x.fillStyle = '#2a2118'; x.font = `38px ${hand}`; x.textAlign = 'center'
  L(GR.NOTE).split('\n').forEach((s, i) => x.fillText(s, 0, -36 + i * 56))
  x.font = `24px ${hand}`; x.textAlign = 'right'; x.fillText(lang === 'en' ? '- Grandma' : 'ばあちゃんより', 180, 76)
  x.restore()
  const bye = await loadImg('img/g_bye.webp'), ph = await loadImg('img/' + (r.given.altar >= 4 ? 'p2' : r.given.altar >= 2 ? 'p1' : 'p0') + '.webp')
  if (bye) { const h = 270, w = bye.width / bye.height * h; x.drawImage(bye, 690 - w, 990 - h, w, h) }
  if (ph) { const h = 120, w = ph.width / ph.height * h; x.save(); x.translate(610, 92); x.rotate(0.06); x.drawImage(ph, -w / 2, -h / 2, w, h); x.restore() }
  x.font = `20px ${ui}`; x.fillStyle = 'rgba(60,50,40,.55)'; x.textAlign = 'left'; x.fillText(lang === 'en' ? "Grandma's House: Refill Hell" : 'おばあちゃん家のおかわり地獄', 24, 40)
}

// ============================================================ ボタン
function applyLang() {
  document.documentElement.lang = lang
  $('t1').textContent = T('title1'); $('t2').textContent = T('title2'); $('tSub').textContent = T('sub')
  $('bStart').querySelector('span').textContent = T('start'); $('bHow').textContent = T('how'); $('bLang').textContent = T('lang')
  $('howH').textContent = T('how'); $('howWarn').textContent = L(GR.HOWTO.warn); $('bHowClose').querySelector('span').textContent = T('close'); $('lPrivacy').textContent = T('privacy')
  $('howCredit').textContent = 'Sounds: lonemonk (CC BY 3.0), Kenney, rubberduck and others (CC0)'
  const ruleImg = ['img/g_away.webp', 'img/g_watch.webp', null]
  $('howRules').innerHTML = ''
  GR.HOWTO.rules.forEach(([a, b], i) => {
    const li = document.createElement('li')
    const pic = ruleImg[i] ? Object.assign(document.createElement('img'), { src: ruleImg[i], alt: '' }) : (() => { const d = document.createElement('div'); d.innerHTML = '<svg viewBox="0 0 54 54"><rect x="0" y="18" width="54" height="18" fill="#6b4226"/><rect x="4" y="13" width="18" height="28" rx="4" fill="none" stroke="#c9a24a" stroke-width="4"/><circle cx="34" cy="27" r="3" fill="#1f140b"/><circle cx="42" cy="27" r="3" fill="#1f140b"/><circle cx="50" cy="27" r="3.4" fill="#b8342a"/></svg>'; return d.firstChild })()
    const t = document.createElement('div'); t.innerHTML = '<b></b><span></span>'; t.querySelector('b').textContent = L(a); t.querySelector('span').textContent = L(b)
    li.append(pic, t); $('howRules').append(li)
  })
  const spotImg = { dog: 'd_beg', kid: 'k_hungry', uncle: 'u_open', altar: 'p1', vase: 'vase' }
  $('howSpots').innerHTML = ''
  for (const [k, n, d] of GR.HOWTO.spots) {
    const li = document.createElement('li'); const im = Object.assign(document.createElement('img'), { src: 'img/' + spotImg[k] + '.webp', alt: '' })
    const t = document.createElement('div'); t.innerHTML = '<b></b><span></span>'; t.querySelector('b').textContent = L(n); t.querySelector('span').textContent = L(d)
    li.append(im, t); $('howSpots').append(li)
  }
  $('bSkip').textContent = T('skip'); $('bAgain').querySelector('span').textContent = T('again'); $('bSave').textContent = T('save'); $('bPost').textContent = T('post'); $('lMore').textContent = T('more')
}
$('bStart').onclick = begin
$('bAgain').onclick = () => { resultShown = false; begin() }
$('bHow').onclick = () => { firstTouch(); show('vHow') }
$('bHowClose').onclick = () => show('vTitle')
$('bLang').onclick = () => { lang = lang === 'ja' ? 'en' : 'ja'; store.set('gr_lang', lang); applyLang() }
$('bSkip').onclick = () => { if (G.mode === 'tut') endTutorial() }
$('bMute').onclick = () => { muted = !muted; store.set('gr_mute', muted ? '1' : '0'); Snd.setMute(muted); $('bMute').classList.toggle('off', muted) }
$('bMute').classList.toggle('off', muted)
$('bSave').onclick = () => { if (window.TM) TM.share('save'); $('card').toBlob(b => { if (!b) return; const u = URL.createObjectURL(b), a = document.createElement('a'); a.href = u; a.download = 'grandma-refill.png'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000) }) }
$('bPost').onclick = () => { if (window.TM) TM.share('x') }

// チュートリアルの指（おかずを運ぶ / お茶碗をタップ）
function fingerDom() {
  let f = $('finger')
  const tu = G.mode === 'tut' && G.tut
  if (!tu || tu.step > 2 || G.held) { if (f) f.hidden = true; return }
  if (!f) { f = document.createElement('div'); f.id = 'finger'; f.className = 'finger'; f.innerHTML = '<svg viewBox="0 0 44 44"><path d="M16 4c2 0 4 2 4 4v12l2-1c2-1 4 0 5 1l6 3c2 1 3 3 3 5l-2 10H14L8 28c-1-2 0-4 2-4s3 1 4 2V8c0-2 0-4 2-4z" fill="#fff" stroke="#222" stroke-width="2.5"/></svg>'; document.body.append(f) }
  f.hidden = false
  const b = bowlArea.getBoundingClientRect(), from = { x: b.left + b.width / 2, y: b.top + b.height * 0.35 }
  let p = from
  if (tu.step === 1) { const to = spotXY('dog'), k = ease((G.clock % 1.6) / 1.2); p = { x: lerp(from.x, to.x, k), y: lerp(from.y, to.y, k) } }
  else { const k = (G.clock % 0.9) / 0.9; p = { x: from.x, y: from.y + (k < 0.5 ? k * 16 : (1 - k) * 16) } }
  f.style.left = p.x + 'px'; f.style.top = p.y + 'px'
}

// ============================================================ ループ
const STEP = 1 / 60
let last = performance.now(), acc = 0
function logic(dt) {
  G.clock += dt
  if (G.mode === 'play') {
    if (G.bot && !SIM) G.bot(api, G.botSt || (G.botSt = { r: mulberry(5) }), dt)
    stepGame(dt); stepEnd()
  } else if (G.mode === 'tut') stepTutorial(dt)
}
function render(dtR) {
  const vdt = fx.update(dtR)
  gmaLook(vdt); cast(vdt)
  // 切り絵はカメラの方を向く（縦軸だけ）
  for (const m of PAPERS) { if (!m.visible || !m.userData.face) continue; m.rotation.y = Math.atan2(camera.position.x - m.position.x, camera.position.z - m.position.z) }
  camera.position.copy(CAM.p); camera.lookAt(CAM.t)
  lanternLight.intensity = 0.45 + Math.sin(G.clock * 1.3) * 0.05
  noren.rotation.x = Math.sin(G.clock * 1.1) * 0.03 + (G.g && (G.g.st === 'walkout' || G.g.st === 'return') ? 0.15 : 0)
  drawShoji()
  look.update(); fx.applyCamera()
  renderer.render(scene, camera)
  if (G.mode === 'play' || G.mode === 'tut') { textsDom(); beltDom(); coilDom(); ringsDom(); fingerDom() }
  else { for (const k of ['bubble', 'sbubble', 'hint']) $(k).hidden = true; fingerDom() }
}
function loop(now) {
  requestAnimationFrame(loop)
  let dt = (now - last) / 1000; last = now
  if (dt > 0.25) dt = 0.25
  if (!G.paused) { acc += dt * (G.speed || 1); let n = 0; while (acc >= STEP && n < 240) { logic(STEP); acc -= STEP; n++ } }
  render(G.paused ? 0 : dt)
}

// ============================================================ 検証用の窓口と bot
const api = {
  get state() { const g = G.g || {}; return { mode: G.mode, t: G.t, g: g.st, gt: g.t, gdur: g.dur, since: g.since, bowl: G.bowl ? G.bowl.length : 0, held: !!G.held, heldT: G.held ? G.held.t : 0, stomach: G.stomach, cap: CAP, caught: G.caught, over: G.over, spot: G.spot && JSON.parse(JSON.stringify(G.spot)), aunt: G.aunt && G.aunt.st, given: G.given, tut: G.tut && G.tut.step, biteCd: G.biteCd, ghostT: G.ghostT, melon: G.melon } },
  bite, grab, drop, backToBowl, result, spotXY, SPOTS, CAPS,
  bowlXY() { const b = bowlArea.getBoundingClientRect(); return { x: b.left + b.width / 2, y: b.top + b.height * 0.4 } },
  texts: () => Object.values(G.texts).filter(Boolean).map(v => v.text),
  events: () => G.events.slice(),
  sim(botName, seed, o = {}) {
    SIM = true; const keepMode = G.mode
    newGame(seed); G.mode = 'play'
    const bot = BOTS[botName], st = { r: mulberry(seed * 13 + 3), ...o }
    let n = 0
    while (!G.over && n < 60 * 200) { bot(api, st, STEP); stepGame(STEP); n++ }
    const r = result(); r.events = o.events ? G.events.slice() : undefined
    SIM = false; G.mode = keepMode === 'play' ? 'title' : keepMode; G.over = null
    return r
  },
  dbg: {
    pause(v = true) { G.paused = v; if (!v) last = performance.now() },
    step(n = 1) { for (let i = 0; i < n; i++) logic(STEP); render(0) },
    tick(n = 1) { for (let i = 0; i < n; i++) logic(STEP) },
    speed(k) { G.speed = k },
    render() { render(0) },
    G, newGame, startPlay, startTutorial, showResult, enterWatch, gSet, caughtBy, finish,
    set(o) { Object.assign(G, o) },
    camera, scene, CAM, say,
  },
}
window.gr = api
setTimeout(() => { window.__bot_reader = BOTS.reader })
// bot: 人間の速さで動く（反応0.35秒・1回運ぶのに0.55秒・食べるのは見られて1.2秒たってから）
const BOTS = {
  idle() {},
  eat(api, st) { api.bite() },
  hide(api, st, dt) {
    const s = api.state
    if (s.held) { if (s.heldT >= 0.55) { const free = SPOTS.filter(k => k === 'kid' || k === 'uncle' || (s.spot[k].n < CAPS[k])); api.drop(free[Math.floor(st.r() * free.length)] || 'dog') } return }
    if (s.bowl && !['watch', 'caught', 'heap', 'aaan'].includes(s.g)) api.grab()
  },
  random(api, st, dt) {
    const s = api.state
    if (s.held) { if (s.heldT >= 0.55) api.drop(SPOTS[Math.floor(st.r() * 5)]); return }
    if (st.r() < 0.012) api.bite(); else if (st.r() < 0.01) api.grab()
  },
  reader(api, st, dt) {
    const s = api.state
    st.seen = st.seen || { g: '', t: 0 }
    if (st.seen.g !== s.g) { st.seen.g = s.g; st.seen.t = 0 } else st.seen.t += dt
    const react = st.seen.t >= (st.react ?? 0.35)
    if (s.held) {
      if (s.heldT >= (st.carry ?? 0.55)) api.drop(st.target)
      return
    }
    const safe = (s.g === 'away' || s.g === 'turn' || s.g === 'walkout' || s.g === 'kitchen') && react
    if (safe && s.bowl) {
      const sp = s.spot
      const ok = []
      if (sp.kid.n < sp.kid.cap) ok.push('kid')
      if (sp.uncle.ph === 'open' && sp.uncle.t < sp.uncle.dur - 0.7 && sp.uncle.n < CAPS.uncle && sp.uncle.awake <= 0) ok.push('uncle')
      if (s.aunt === 'none' && sp.altar.n < CAPS.altar) ok.push('altar')
      if (sp.vase.n < CAPS.vase) ok.push('vase')
      if (sp.dog.n < 2 || (sp.dog.n < CAPS.dog && s.g === 'kitchen' && s.gt < s.gdur - 2.5 && !sp.dog.burpAt)) ok.push('dog')
      // 残りが短い「よそ見」なら運ばない（人は残り時間を知らないので、待った長さで決める）
      const late = (s.g === 'away' && st.seen.t > 2.2)
      if (ok.length && !late) { st.target = ok[0]; api.grab() }
      return
    }
    if (s.g === 'watch' && s.since > (st.wait ?? 2.0)) api.bite()
  },
}

// ============================================================ 起動
applyLang()
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => applyLang())
const PRE = ['g_watch', 'g_away', 'g_glance', 'k_hungry', 'u_open', 'd_beg', 'p0', 'vase', 'f_karaage', 'f_onigiri']
const LATER = ['g_caught', 'g_heap', 'g_aaan', 'g_walk', 'g_melon', 'g_bye', 'k_full', 'k_tattle', 'u_shut', 'u_awake', 'd_fat', 'd_burp', 'p1', 'p2', 'a_walk', 'a_notice', 'ghost', 'f_ebi', 'f_kabocha', 'f_suika']
let readyDone = false
function ready() {
  if (readyDone) return; readyDone = true
  for (const n of LATER) tex(n)
  window.__bootDone = true; $('boot').classList.add('gone')
  G.mode = 'title'; show('vTitle')
  window.__grReady = true
}
let pending = PRE.length
for (const n of PRE) { const t = tex(n); const chk = () => { if (t.image && t.image.complete !== false && t.image.width) { if (window.__bootStep) __bootStep(); if (--pending <= 0) ready() } else setTimeout(chk, 50) }; chk() }
setTimeout(ready, 9000)
requestAnimationFrame(t => { last = t; loop(t) })
