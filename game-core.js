'use strict';
/* ================= 工具 ================= */
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
};
function comboMult(c) { return c >= 20 ? 3 : c >= 12 ? 2.5 : c >= 7 ? 2 : c >= 3 ? 1.5 : 1; }

/* ================= 养成 ================= */
const UPGRADES = [
  { id: 'lives', name: '生命上限', desc: '每局开局生命', inc: 1, base: 150, max: 4, fmt: v => '+' + v + ' 命' },
  { id: 'size', name: '初始体型', desc: '开局鲸鱼更大', inc: 4, base: 100, max: 5, fmt: v => '+' + v },
  { id: 'grow', name: '成长速度', desc: '吃鱼体型增幅', inc: 12, base: 100, fmt: v => '+' + v + '%' },
  { id: 'speed', name: '移动速度', desc: '游动速度', inc: 8, base: 100, max: 10, fmt: v => '+' + v + '%' },
  { id: 'combo', name: '连击窗口', desc: '断连倒计时', inc: 0.4, base: 80, max: 10, fmt: v => '+' + (Math.round(v * 10) / 10) + 's' },
  { id: 'power', name: '道具时长', desc: '星星/磁铁持续', inc: 1, base: 100, max: 10, fmt: v => '+' + v + 's' },
  { id: 'magnetRange', name: '磁吸范围', desc: '磁铁吸附半径', inc: 40, base: 100, max: 5, fmt: v => '+' + v },
  { id: 'magnetSpeed', name: '磁吸速度', desc: '磁铁吸附速度', inc: 20, base: 80, max: 5, fmt: v => '+' + v },
  { id: 'score', name: '得分加成', desc: '全局分数', inc: 10, base: 150, fmt: v => '+' + v + '%' },
];
function loadUpg() { try { return JSON.parse(store.get('twlj_upg', '{}')) || {}; } catch (e) { return {}; } }
let gold = parseInt(store.get('twlj_gold', '0'), 10) || 0;
let upg = loadUpg();
function upgEffect(id) { const u = UPGRADES.find(x => x.id === id); const lv = Math.min(upg[id] || 0, u.max || Infinity); return u.inc * lv; }
function upgPrice(id) { const u = UPGRADES.find(x => x.id === id); const lv = upg[id] || 0; if (u.max && lv >= u.max) return null; return Math.round(u.base * Math.pow(1.6, lv)); }
function saveUpg() { store.set('twlj_upg', JSON.stringify(upg)); store.set('twlj_gold', String(gold)); }

/* ================= 画布 ================= */
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let W = 0, H = 0;
let dpr = 1, zoom = 1, viewW = 0, viewH = 0, vx = 0, vy = 0;
let bgGrad = null, sandGrad = null, vigGrad = null, dangerGrad = null;
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  initDecor();
  buildGrads();
  updateCamera();
}
function updateCamera(dt) {
  const target = whale.r <= 90 ? 1 : 90 / whale.r;
  if (dt === undefined || dt === null) zoom = target;
  else zoom = lerp(zoom, target, Math.min(1, dt * 4));
  if (Math.abs(zoom - target) < 0.0005) zoom = target;
  viewW = W / zoom; viewH = H / zoom;
  vx = whale.x - viewW / 2; vy = whale.y - viewH / 2;
}
function buildGrads() {
  bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, '#04265e'); bgGrad.addColorStop(0.5, '#0a4f9e'); bgGrad.addColorStop(0.85, '#0e86c4'); bgGrad.addColorStop(1, '#1499cc');
  sandGrad = ctx.createLinearGradient(0, H - 46, 0, H);
  sandGrad.addColorStop(0, 'rgba(216,179,106,0)'); sandGrad.addColorStop(0.5, 'rgba(216,179,106,0.85)'); sandGrad.addColorStop(1, '#c99b4e');
  vigGrad = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.75);
  vigGrad.addColorStop(0, 'rgba(0,0,0,0)'); vigGrad.addColorStop(1, 'rgba(0,10,40,0.35)');
  dangerGrad = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.75);
  dangerGrad.addColorStop(0, 'rgba(255,0,0,0)'); dangerGrad.addColorStop(1, 'rgba(255,30,30,0.6)');
}
window.addEventListener('resize', resize);

/* ================= 状态 ================= */
const state = { screen: 'menu', score: 0, high: parseInt(store.get('twlj_high', '0'), 10), lives: 3, time: 0 };
const keys = {};
const mouse = { x: 0, y: 0, lastMove: -1e9 };

const whale = { x: 0, y: 0, vx: 0, vy: 0, r: 26, facing: 1, wobble: 0, eatT: 0, inv: 0, powerT: 0, magnetT: 0 };
let quote = null, quoteT = 6, trailT = 0;
let fish = [], parts = [], bubbles = [], seaweeds = [], rays = [], sandDots = [];
let shake = 0, spawnT = 0.8, goldT = 12, gemT = 8, starCd = 20, magnetCd = 18, rushCd = 30, rushActive = 0, rushSpawnT = 0;
let combo = 0, comboT = 0, maxCombo = 0;
let danger = 0;
let hook = null, hookCd = 20;
let banner = null;

/* ================= 音效 ================= */
let AC = null;
let muted = store.get('twlj_muted', '0') === '1';
function initAudio() {
  if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { } }
  if (AC && AC.state === 'suspended') AC.resume();
}
function tone(f0, f1, dur, type, vol) {
  if (!AC || muted) return;
  try {
    const t = AC.currentTime;
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(AC.destination);
    o.start(t); o.stop(t + dur + 0.02);
  } catch (e) { }
}
const sfx = {
  eat: () => tone(420, 760, 0.12, 'sine', 0.16),
  gold: () => { tone(660, 880, 0.1, 'triangle', 0.16); setTimeout(() => tone(990, 1320, 0.14, 'triangle', 0.14), 90); },
  hurt: () => tone(220, 70, 0.35, 'sawtooth', 0.2),
  heal: () => { tone(523, 784, 0.12, 'sine', 0.16); setTimeout(() => tone(784, 1046, 0.16, 'triangle', 0.15), 100); },
  die: () => { tone(320, 60, 0.9, 'sawtooth', 0.22); setTimeout(() => tone(180, 50, 0.7, 'sawtooth', 0.18), 250); },
  start: () => { tone(520, 780, 0.12, 'triangle', 0.15); setTimeout(() => tone(780, 1040, 0.14, 'triangle', 0.13), 110); },
  power: () => { tone(300, 900, 0.3, 'sine', 0.18); setTimeout(() => tone(600, 1200, 0.25, 'triangle', 0.14), 120); },
  rush: () => { tone(440, 880, 0.18, 'triangle', 0.18); setTimeout(() => tone(880, 1320, 0.2, 'triangle', 0.16), 150); },
  hook: () => { tone(180, 420, 0.28, 'square', 0.12); setTimeout(() => tone(180, 420, 0.28, 'square', 0.12), 350); }
};
