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

/* ================= 场景装饰 ================= */
const QUOTES = ['是兄弟就来喂我！', '大渣好，我系渣渣鲸', '贪玩蓝鲸，一刀999', '好饿啊~', '喂我喂我！', '今天也要努力干饭！', '呜哇哇哇~~~'];
let prevW = 0, prevH = 0;
function genDecor() {
  bubbles = []; const bn = Math.min(46, W / 18);
  for (let i = 0; i < bn; i++) bubbles.push({ x: rand(0, W), y: rand(0, H), r: rand(2, 9), sp: rand(12, 42), ph: rand(0, 6.28) });
  seaweeds = []; const n = Math.max(6, Math.round(W / 80));
  for (let i = 0; i < n; i++) seaweeds.push({ x: rand(0, W), h: rand(60, 170), w: rand(7, 14), ph: rand(0, 6.28), sp: rand(0.7, 1.7) });
  rays = []; for (let i = 0; i < 6; i++) rays.push({ x: rand(0, W), w: rand(60, 160), sp: rand(6, 16) });
  sandDots = []; for (let i = 0; i < 90; i++) sandDots.push({ x: rand(0, W), y: rand(H - 52, H - 6), r: rand(0.8, 2.4), a: rand(0.08, 0.3) });
}
function initDecor() {
  if (prevW > 0 && (prevW !== W || prevH !== H)) {
    const sx = W / prevW, sy = H / prevH;
    for (const b of bubbles) { b.x *= sx; b.y *= sy; }
    for (const s of seaweeds) { s.x *= sx; }
    for (const r of rays) { r.x *= sx; }
    for (const d of sandDots) { d.x *= sx; d.y = H - (prevH - d.y); }
    const bn = Math.min(46, W / 18);
    while (bubbles.length < bn) bubbles.push({ x: rand(0, W), y: rand(0, H), r: rand(2, 9), sp: rand(12, 42), ph: rand(0, 6.28) });
    if (bubbles.length > bn) bubbles.length = bn;
    const n = Math.max(6, Math.round(W / 80));
    while (seaweeds.length < n) seaweeds.push({ x: rand(0, W), h: rand(60, 170), w: rand(7, 14), ph: rand(0, 6.28), sp: rand(0.7, 1.7) });
    if (seaweeds.length > n) seaweeds.length = n;
    while (rays.length < 6) rays.push({ x: rand(0, W), w: rand(60, 160), sp: rand(6, 16) });
    if (rays.length > 6) rays.length = 6;
    while (sandDots.length < 90) sandDots.push({ x: rand(0, W), y: rand(H - 52, H - 6), r: rand(0.8, 2.4), a: rand(0.08, 0.3) });
    if (sandDots.length > 90) sandDots.length = 90;
  } else if (prevW === 0) {
    genDecor();
  }
  prevW = W; prevH = H;
}

/* ================= 鱼类 ================= */
const PALETTE = [['#f0a35e', '#d97a2e'], ['#e86a5e', '#c23f3f'], ['#5ec4e8', '#2f8fc0'], ['#8f7ee8', '#6a54c9'], ['#7ed6a0', '#46a86e'], ['#e85ec4', '#bd3f9e']];
function spawnFish() {
  if (fish.length > Math.min(90, 45 + whale.r / 2)) return;
  const fromLeft = Math.random() < 0.5;
  const dir = fromLeft ? 1 : -1;
  let r = rand(8, Math.max(12, whale.r * 1.7));
  const dangerP = 0.22 + Math.min(0.4, whale.r / 140);
  if (r >= whale.r * 0.88 && Math.random() > dangerP) r = rand(8, Math.max(9, whale.r * 0.75));
  let pred = false;
  if (whale.r > 38 && Math.random() < 0.1 && r >= whale.r * 0.95) { r = whale.r * rand(1.15, 1.45); pred = true; }
  const c = PALETTE[randInt(0, PALETTE.length - 1)];
  fish.push({
    x: fromLeft ? vx - 60 : vx + viewW + 60, y: rand(vy + viewH * 0.12, vy + viewH * 0.88),
    vx: dir * rand(60, 140) * (1 + Math.min(1, state.time / 240) * 0.7) * (pred ? 0.55 : 1),
    vy: rand(-15, 15), r, dir, pred, c1: c[0], c2: c[1],
    wob: rand(0, 6.28), wobS: rand(4, 8), golden: false, harmless: false
  });
}
function spawnGolden() {
  const fromLeft = Math.random() < 0.5;
  const dir = fromLeft ? 1 : -1;
  fish.push({
    x: fromLeft ? vx - 40 : vx + viewW + 40, y: rand(vy + viewH * 0.15, vy + viewH * 0.85), vx: dir * rand(55, 95), vy: rand(-10, 10),
    r: rand(11, 15), dir, pred: false, c1: '#ffd166', c2: '#f59f1c', wob: 0, wobS: 6, golden: true, harmless: false
  });
}
function spawnGem() {
  const fromLeft = Math.random() < 0.5;
  const dir = fromLeft ? 1 : -1;
  fish.push({
    x: fromLeft ? vx - 40 : vx + viewW + 40, y: rand(vy + viewH * 0.15, vy + viewH * 0.85), vx: dir * rand(50, 90), vy: rand(-10, 10),
    r: rand(12, 16), dir, pred: false, c1: '#5fe37c', c2: '#1f9e4d', wob: 0, wobS: 5, golden: false, gem: true, harmless: false
  });
}
function spawnStar() {
  const fromLeft = Math.random() < 0.5;
  const dir = fromLeft ? 1 : -1;
  fish.push({
    x: fromLeft ? vx - 40 : vx + viewW + 40, y: rand(vy + viewH * 0.15, vy + viewH * 0.85), vx: dir * rand(50, 85), vy: rand(-10, 10),
    r: rand(13, 17), dir, pred: false, c1: '#ffe66d', c2: '#f5a623', wob: 0, wobS: 5, golden: false, gem: false, star: true, harmless: false
  });
}
function spawnMagnet() {
  const fromLeft = Math.random() < 0.5;
  const dir = fromLeft ? 1 : -1;
  fish.push({
    x: fromLeft ? vx - 40 : vx + viewW + 40, y: rand(vy + viewH * 0.15, vy + viewH * 0.85), vx: dir * rand(50, 85), vy: rand(-10, 10),
    r: rand(12, 16), dir, pred: false, c1: '#ff6b9d', c2: '#c2255c', wob: 0, wobS: 5, golden: false, gem: false, magnet: true, harmless: false
  });
}

/* ================= 粒子 ================= */
function addParts(x, y, color, n, spd, life) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, 6.283), s = rand(0.2, 1) * spd;
    parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rand(life * 0.5, life), max: life, r: rand(1.5, 4.5), color, bub: Math.random() < 0.3 });
  }
  if (parts.length > 260) parts.splice(0, parts.length - 260);
}
function addText(x, y, text, color, size) { parts.push({ x, y, vx: 0, vy: -46, life: 0.9, max: 0.9, r: 0, color, text, size: size || 15 }); }
function updateParticles(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]; p.life -= dt;
    if (p.life <= 0) { parts.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.bub) { p.vy -= 30 * dt; p.x += Math.sin(p.life * 6) * 14 * dt; }
  }
}
function drawParticles() {
  for (const p of parts) {
    const a = clamp(p.life / p.max, 0, 1);
    if (p.text) {
      ctx.globalAlpha = a; ctx.fillStyle = p.color;
      ctx.font = 'bold ' + (p.size || 15) + 'px "Microsoft YaHei",sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(p.text, p.x, p.y); ctx.globalAlpha = 1; continue;
    }
    if (p.bub) {
      ctx.globalAlpha = a * 0.6; ctx.strokeStyle = p.color; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.stroke();
    }
    else {
      ctx.globalAlpha = a; ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

/* ================= 更新 ================= */
function updateDecor(dt) {
  const t = performance.now() / 1000;
  for (const b of bubbles) { b.y -= b.sp * dt; b.x += Math.sin(t * 1.3 + b.ph) * 10 * dt; if (b.y < -14) { b.y = H + 14; b.x = rand(0, W); } }
  for (const r of rays) { r.x += r.sp * dt; if (r.x - r.w > W + 100) r.x = -120; }
}
function updateFish(dt) {
  for (let i = fish.length - 1; i >= 0; i--) {
    const f = fish[i];
    f.x += f.vx * dt; f.y += f.vy * dt; f.wob += dt * f.wobS;
    if (f.x < vx - 160 || f.x > vx + viewW + 160 || f.y < vy - 160 || f.y > vy + viewH + 160) { fish.splice(i, 1); continue; }
    if (state.screen === 'playing' && whale.magnetT > 0 && !f.pred && f.r < whale.r * 0.88) {
      const mx = whale.x - f.x, my = whale.y - f.y, md = Math.hypot(mx, my);
      const range = 320 + upgEffect('magnetRange'), spd = 220 + upgEffect('magnetSpeed');
      if (md < range && md > 1) { f.x += mx / md * spd * dt; f.y += my / md * spd * dt; }
    }
    if (state.screen === 'playing' && !f.harmless && whale.inv <= 0) {
      const dx = whale.x - f.x, dy = whale.y - f.y;
      const rr = whale.r * 0.75 + f.r * 0.85;
      if (dx * dx + dy * dy < rr * rr) {
        if (f.golden || f.gem || f.star || f.magnet || whale.powerT > 0 || f.r < whale.r * 0.88) eatFish(i); else hurtBy(i);
      }
    }
  }
}
function eatFish(i) {
  const f = fish[i];
  combo++; comboT = 2 + upgEffect('combo'); maxCombo = Math.max(maxCombo, combo);
  const mult = comboMult(combo);
  let pts = f.golden ? 200 : (f.gem ? 100 : (f.star || f.magnet ? 0 : Math.round(f.r) * 3));
  if (pts > 0) pts = Math.round(pts * mult * (1 + upgEffect('score') / 100));
  state.score += pts;
  if (f.star) { whale.powerT = 5 + upgEffect('power'); sfx.power(); }
  if (f.magnet) { whale.magnetT = 5 + upgEffect('power'); sfx.power(); }
  if (f.gem && state.lives < 3 + upgEffect('lives')) state.lives++;
  whale.r = whale.r + (f.golden || f.gem || f.star || f.magnet ? 3 : f.r * 0.10 * (1 + upgEffect('grow') / 100) * (1 / (1 + whale.r / 500)));
  whale.eatT = 0.3;
  if (f.golden) sfx.gold(); else if (f.gem) sfx.heal(); else if (!f.star && !f.magnet) sfx.eat();
  addParts(f.x, f.y, f.golden ? '#ffd166' : (f.gem ? '#6ee86a' : (f.star ? '#ffe66d' : (f.magnet ? '#ff6b9d' : f.c1))), f.golden ? 18 : (f.gem ? 16 : (f.star || f.magnet ? 20 : 8)), 150, 0.6);
  if (f.gem) addText(f.x, f.y - 10, '+1 ❤', '#6ee86a');
  else if (f.star) addText(f.x, f.y - 10, '无敌 ' + (5 + upgEffect('power')) + 's!', '#ffe66d');
  else if (f.magnet) addText(f.x, f.y - 10, '磁铁 ' + (5 + upgEffect('power')) + 's!', '#ff6b9d');
  else { const sz = combo >= 12 ? 22 : (combo >= 3 ? 19 : 15); addText(f.x, f.y - 10, '+' + pts, (combo >= 3 ? '#ff9d00' : '#ffe66d'), sz); }
  fish.splice(i, 1);
}
function hurtBy(i) {
  const f = fish[i];
  state.lives--; shake = 0.6; whale.inv = 2.2; sfx.hurt();
  addParts(f.x, f.y, '#ff5e5e', 14, 190, 0.5);
  f.harmless = true;
  const away = f.x > whale.x ? 1 : -1;
  f.vx = away * rand(150, 230); f.vy = -rand(90, 150);
  if (state.lives <= 0) gameOver();
}
function updateWhale(dt) {
  const t = performance.now() / 1000;
  if (state.screen === 'playing') {
    let ax = 0, ay = 0;
    if (keys['ArrowLeft'] || keys['a'] || keys['A']) ax -= 1;
    if (keys['ArrowRight'] || keys['d'] || keys['D']) ax += 1;
    if (keys['ArrowUp'] || keys['w'] || keys['W']) ay -= 1;
    if (keys['ArrowDown'] || keys['s'] || keys['S']) ay += 1;
    const useKeys = ax !== 0 || ay !== 0;
    const K = 430 * (1 + upgEffect('speed') / 100);
    if (useKeys) {
      const len = Math.hypot(ax, ay) || 1;
      whale.vx = lerp(whale.vx, ax / len * K, Math.min(1, dt * 6));
      whale.vy = lerp(whale.vy, ay / len * K, Math.min(1, dt * 6));
    } else if (performance.now() - mouse.lastMove < 4000) {
      const dx = mouse.x - W / 2, dy = mouse.y - H / 2, d = Math.hypot(dx, dy);
      if (d > 6) { whale.vx = lerp(whale.vx, dx / d * K, Math.min(1, dt * 5)); whale.vy = lerp(whale.vy, dy / d * K, Math.min(1, dt * 5)); }
      else { const fr = Math.pow(0.02, dt); whale.vx *= fr; whale.vy *= fr; }
    } else {
      const fr = Math.pow(0.0005, dt); whale.vx *= fr; whale.vy *= fr;
    }
    whale.x += whale.vx * dt; whale.y += whale.vy * dt;
  } else {
    whale.x = W * 0.5 + Math.sin(t * 0.4) * W * 0.13;
    whale.y = H * 0.56 + Math.sin(t * 0.7) * 44;
    whale.vx = Math.cos(t * 0.4) * W * 0.05; whale.vy = Math.cos(t * 0.7) * 30;
  }
  if (Math.abs(whale.vx) > 10) whale.facing = whale.vx > 0 ? 1 : -1;
  whale.wobble += dt * 4;
  whale.eatT = Math.max(0, whale.eatT - dt);
  if (whale.inv > 0) whale.inv -= dt;
  if (whale.powerT > 0) whale.powerT -= dt;
  if (whale.magnetT > 0) whale.magnetT -= dt;
  trailT -= dt;
  if (trailT <= 0) {
    trailT = 0.16;
    parts.push({
      x: whale.x - whale.facing * whale.r * 0.9, y: whale.y + rand(-4, 6),
      vx: -whale.facing * rand(6, 16), vy: rand(-26, -10), life: rand(0.5, 0.9), max: 0.9,
      r: rand(2, 4.5), color: 'rgba(255,255,255,0.7)', bub: true
    });
  }
  if (state.screen === 'playing') {
    quoteT -= dt;
    if (quoteT <= 0) { quote = { text: QUOTES[randInt(0, QUOTES.length - 1)], t: 4 }; quoteT = rand(16, 28); }
  }
  if (quote) { quote.t -= dt; if (quote.t <= 0) quote = null; }
}
function updatePlay(dt) {
  state.time += dt;
  if (combo > 0) { comboT -= dt; if (comboT <= 0) combo = 0; }
  spawnT -= dt;
  if (spawnT <= 0) {
    spawnFish(); if (Math.random() < 0.3) spawnFish();
    spawnT = rand(0.55, 1.25) * (1 - Math.min(1, state.time / 150) * 0.45);
  }
  goldT -= dt;
  if (goldT <= 0) { spawnGolden(); goldT = rand(14, 22); }
  gemT -= dt;
  if (gemT <= 0) { gemT = rand(15, 24); if (state.lives < 3) spawnGem(); }
  starCd -= dt;
  if (starCd <= 0) { starCd = rand(18, 25); if (whale.powerT <= 0) spawnStar(); }
  magnetCd -= dt;
  if (magnetCd <= 0) { magnetCd = rand(16, 24); if (whale.magnetT <= 0) spawnMagnet(); }
  rushCd -= dt;
  if (rushCd <= 0) { rushCd = rand(25, 40); rushActive = 3.0; rushSpawnT = 0; sfx.rush(); addText(whale.x, whale.y - viewH * 0.25, '金鱼潮来袭！', '#ffd166', 26); }
  if (rushActive > 0) {
    rushActive -= dt; rushSpawnT -= dt;
    if (rushSpawnT <= 0) { spawnGolden(); rushSpawnT = 0.35; }
  }
  hookCd -= dt;
  if (hookCd <= 0) { hookCd = rand(18, 28); if (whale.r >= 100 && !hook) spawnHook(); }
}
function spawnHook() {
  hook = {
    x: whale.x + rand(-0.3, 0.3) * viewW,
    y: vy,
    targetY: whale.y + rand(-0.1, 0.1) * viewH,
    phase: 'warn',
    t: 1.5
  };
  sfx.hook();
}
function updateHook(dt) {
  if (!hook) return;
  hook.t -= dt;
  if (hook.phase === 'warn') {
    if (hook.t <= 0) { hook.phase = 'drop'; hook.y = vy; }
  } else if (hook.phase === 'drop') {
    hook.y += viewH * 1.6 * dt;
    if (hook.y >= hook.targetY) { hook.y = hook.targetY; hook.phase = 'stay'; hook.t = 1.2; }
  } else if (hook.phase === 'stay') {
    hook.y = hook.targetY + Math.sin(performance.now() / 150) * 6;
    if (hook.t <= 0) { hook.phase = 'reel'; hook.t = 0.5; }
  } else if (hook.phase === 'reel') {
    hook.y = hook.targetY + Math.sin(performance.now() / 150) * 6;
    if (hook.t <= 0) hook.phase = 'pull';
  } else if (hook.phase === 'pull') {
    hook.y -= viewH * 2.8 * dt;
    if (hook.y <= vy) hook = null;
  }
  if (hook && hook.phase !== 'warn') {
    const dx = whale.x - hook.x, dy = whale.y - hook.y, d = Math.hypot(dx, dy);
    if (d < whale.r * 0.7 + 12) {
      state.lives--; shake = 0.6; whale.inv = 2.2; sfx.hurt();
      addParts(hook.x, hook.y, '#ff5e5e', 14, 190, 0.5);
      hook = null;
      if (state.lives <= 0) gameOver();
    }
  }
}

/* ================= 绘制 ================= */
function drawBg() {
  ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (const r of rays) {
    ctx.beginPath();
    ctx.moveTo(r.x - 8, 0); ctx.lineTo(r.x + r.w + 8, 0); ctx.lineTo(r.x + r.w + 34, H); ctx.lineTo(r.x - 34, H);
    ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = sandGrad; ctx.fillRect(0, H - 46, W, 46);
  ctx.fillStyle = '#a97f3d';
  for (const d of sandDots) { ctx.globalAlpha = d.a; ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, 6.283); ctx.fill(); }
  ctx.globalAlpha = 1;
}
function drawSeaweed() {
  const t = performance.now() / 1000;
  ctx.lineCap = 'round';
  for (const s of seaweeds) {
    const sway = Math.sin(t * s.sp + s.ph) * 14;
    ctx.strokeStyle = 'rgba(29,122,79,0.85)'; ctx.lineWidth = s.w;
    ctx.beginPath(); ctx.moveTo(s.x, H + 8);
    ctx.quadraticCurveTo(s.x + sway * 0.4, H - s.h * 0.5, s.x + sway, H - s.h);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(52,168,110,0.55)'; ctx.lineWidth = s.w * 0.5;
    ctx.beginPath(); ctx.moveTo(s.x + 4, H + 8);
    ctx.quadraticCurveTo(s.x + 6 - sway * 0.3, H - s.h * 0.62, s.x - sway * 0.7, H - s.h * 1.05);
    ctx.stroke();
  }
}
function drawBubbles() {
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  for (const b of bubbles) { ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 6.283); ctx.stroke(); }
  ctx.globalAlpha = 1;
}
function drawGemFish(f, r) {
  const ty = Math.sin(f.wob) * r * 0.3;
  ctx.shadowColor = '#7dff7d'; ctx.shadowBlur = 20;
  const g = ctx.createLinearGradient(-r, -r, r, r);
  g.addColorStop(0, '#c9ffc0'); g.addColorStop(0.45, '#5fe37c'); g.addColorStop(1, '#1f9e4d');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-r * 0.6, 0);
  ctx.lineTo(-r * 1.12, -r * 0.48 + ty);
  ctx.lineTo(-r * 0.92, 0);
  ctx.lineTo(-r * 1.12, r * 0.48 + ty);
  ctx.closePath(); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, -r * 1.02);
  ctx.lineTo(r * 0.92, 0);
  ctx.lineTo(0, r * 0.95);
  ctx.lineTo(-r * 0.92, 0);
  ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = Math.max(1, r * 0.07);
  ctx.beginPath(); ctx.moveTo(0, -r * 1.02); ctx.lineTo(0, r * 0.95); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-r * 0.92, 0); ctx.lineTo(r * 0.92, 0); ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(r * 0.34, -r * 0.14, r * 0.13, 0, 6.283); ctx.fill();
  ctx.fillStyle = '#0c5e2e';
  ctx.beginPath(); ctx.arc(r * 0.37, -r * 0.14, r * 0.065, 0, 6.283); ctx.fill();
}
function drawStarFish(f, r) {
  ctx.shadowColor = '#ffe66d'; ctx.shadowBlur = 22;
  ctx.fillStyle = '#ffd166';
  ctx.beginPath();
  for (let k = 0; k < 10; k++) {
    const ang = -Math.PI / 2 + k * Math.PI / 5;
    const rad = (k % 2 === 0) ? r * 1.1 : r * 0.5;
    const px = Math.cos(ang) * rad, py = Math.sin(ang) * rad;
    if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(r * 0.12, -r * 0.08, r * 0.22, 0, 6.283); ctx.fill();
  ctx.fillStyle = '#b8860b'; ctx.beginPath(); ctx.arc(r * 0.16, -r * 0.08, r * 0.11, 0, 6.283); ctx.fill();
}
function drawMagnetFish(f, r) {
  ctx.shadowColor = '#ff6b9d'; ctx.shadowBlur = 18;
  const g = ctx.createLinearGradient(-r, 0, r, 0);
  g.addColorStop(0, '#ff9ec2'); g.addColorStop(1, '#c2255c');
  ctx.fillStyle = g;
  const ty = Math.sin(f.wob) * r * 0.4;
  ctx.beginPath();
  ctx.moveTo(-r * 0.68, 0);
  ctx.quadraticCurveTo(-r * 1.12, -r * 0.32, -r * 1.32, -r * 0.72 + ty);
  ctx.lineTo(-r * 1.02, 0);
  ctx.lineTo(-r * 1.32, r * 0.72 + ty);
  ctx.quadraticCurveTo(-r * 1.12, r * 0.32, -r * 0.68, 0);
  ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.ellipse(r * 0.08, 0, r * 0.95, r * 0.58, 0, 0, 6.283); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff';
  ctx.fillRect(r * 0.28, -r * 0.5, r * 0.16, r * 0.32);
  ctx.fillRect(r * 0.28, r * 0.18, r * 0.16, r * 0.32);
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(r * 0.55, -r * 0.1, r * 0.16, 0, 6.283); ctx.fill();
  ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(r * 0.58, -r * 0.1, r * 0.08, 0, 6.283); ctx.fill();
}
function drawFishAll() {
  for (const f of fish) {
    ctx.save(); ctx.translate(f.x, f.y);
    const dir = f.vx >= 0 ? 1 : -1; ctx.scale(dir, 1);
    const r = f.r;
    ctx.rotate(Math.sin(f.wob) * 0.18);
    if (f.gem) { drawGemFish(f, r); ctx.restore(); continue; }
    if (f.star) { drawStarFish(f, r); ctx.restore(); continue; }
    if (f.magnet) { drawMagnetFish(f, r); ctx.restore(); continue; }
    if (f.golden) { ctx.shadowColor = '#ffd166'; ctx.shadowBlur = 20; }
    const g = ctx.createLinearGradient(-r, 0, r, 0);
    if (f.golden) { g.addColorStop(0, '#ffe08a'); g.addColorStop(1, '#f59f1c'); }
    else if (f.pred) { g.addColorStop(0, '#6b7280'); g.addColorStop(1, '#1f2937'); }
    else { g.addColorStop(0, f.c1); g.addColorStop(1, f.c2); }
    ctx.fillStyle = g;
    const ty = Math.sin(f.wob) * r * 0.4;
    ctx.beginPath();
    ctx.moveTo(-r * 0.68, 0);
    ctx.quadraticCurveTo(-r * 1.12, -r * 0.32, -r * 1.32, -r * 0.72 + ty);
    ctx.lineTo(-r * 1.02, 0);
    ctx.lineTo(-r * 1.32, r * 0.72 + ty);
    ctx.quadraticCurveTo(-r * 1.12, r * 0.32, -r * 0.68, 0);
    ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.ellipse(r * 0.08, 0, r * 0.95, r * 0.58, 0, 0, 6.283); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-r * 0.12, -r * 0.5);
    ctx.quadraticCurveTo(r * 0.12, -r * 0.95, r * 0.42, -r * 0.42);
    ctx.quadraticCurveTo(r * 0.06, -r * 0.6, -r * 0.12, -r * 0.5);
    ctx.fill();
    ctx.shadowBlur = 0;
    if (f.pred) {
      ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = Math.max(2, r * 0.09);
      for (let k = 0; k < 2; k++) { ctx.beginPath(); ctx.moveTo(r * 0.05 + k * r * 0.45, -r * 0.52); ctx.lineTo(r * 0.05 + k * r * 0.45, r * 0.52); ctx.stroke(); }
    }
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(r * 0.55, -r * 0.1, r * 0.16, 0, 6.283); ctx.fill();
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(r * 0.58, -r * 0.1, r * 0.08, 0, 6.283); ctx.fill();
    ctx.restore();
  }
}
function drawWhaleC() {
  const w = whale;
  if (w.inv > 0 && state.screen === 'playing' && Math.floor(performance.now() / 90) % 2 === 0) return;
  ctx.save();
  ctx.translate(w.x, w.y);
  if (w.facing < 0) ctx.scale(-1, 1);
  const r = w.r;
  const spd = Math.min(1, Math.hypot(w.vx, w.vy) / 260);
  const tailA = Math.sin(w.wobble) * 0.6 * spd;
  ctx.rotate(Math.sin(w.wobble) * 0.05 * spd);
  ctx.fillStyle = '#2f6fd8';
  ctx.beginPath();
  ctx.moveTo(-r * 0.7, 0);
  ctx.quadraticCurveTo(-r * 1.25, -r * 0.34, -r * 1.52, -r * 0.55 + tailA * r * 0.55);
  ctx.quadraticCurveTo(-r * 1.28, -r * 0.16, -r * 1.08, 0);
  ctx.quadraticCurveTo(-r * 1.28, r * 0.16, -r * 1.52, r * 0.55 + tailA * r * 0.55);
  ctx.quadraticCurveTo(-r * 1.25, r * 0.34, -r * 0.7, 0);
  ctx.closePath(); ctx.fill();
  const g = ctx.createLinearGradient(0, -r, 0, r);
  g.addColorStop(0, '#2f6fd8'); g.addColorStop(0.55, '#4a94e8'); g.addColorStop(1, '#6fb0f0');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.ellipse(r * 0.12, 0, r * 1.02, r * 0.64, 0, 0, 6.283); ctx.fill();
  ctx.beginPath(); ctx.ellipse(r * 0.78, -r * 0.03, r * 0.5, r * 0.52, 0, 0, 6.283); ctx.fill();
  ctx.fillStyle = '#d8ecfb';
  ctx.beginPath(); ctx.ellipse(r * 0.08, r * 0.2, r * 0.88, r * 0.32, 0, 0, 6.283); ctx.fill();
  ctx.fillStyle = '#2f6fd8';
  ctx.beginPath(); ctx.moveTo(-r * 0.28, -r * 0.52);
  ctx.quadraticCurveTo(r * 0.06, -r * 1.06, r * 0.38, -r * 0.48);
  ctx.quadraticCurveTo(r * 0.04, -r * 0.7, -r * 0.28, -r * 0.52);
  ctx.closePath(); ctx.fill();
  const pf = Math.sin(w.wobble * 0.9) * 0.35;
  ctx.save(); ctx.translate(-r * 0.1, r * 0.26); ctx.rotate(0.4 + pf * 0.4);
  ctx.fillStyle = '#3d7fe0';
  ctx.beginPath(); ctx.ellipse(0, 0, r * 0.44, r * 0.17, 0, 0, 6.283); ctx.fill();
  ctx.restore();
  if (w.eatT > 0) {
    const m = w.eatT / 0.3;
    ctx.fillStyle = '#123a6e';
    ctx.beginPath();
    ctx.moveTo(r * 0.62, r * 0.1);
    ctx.quadraticCurveTo(r * 1.02, r * 0.12 + r * 0.4 * m, r * 1.12, r * 0.04);
    ctx.quadraticCurveTo(r * 0.92, -r * 0.06, r * 0.58, -r * 0.14);
    ctx.closePath(); ctx.fill();
  } else {
    ctx.strokeStyle = '#123a6e'; ctx.lineWidth = Math.max(1.6, r * 0.05); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(r * 0.74, r * 0.06, r * 0.26, 0.3, Math.PI - 0.55); ctx.stroke();
  }
  ctx.fillStyle = '#2a5fc4';
  ctx.beginPath(); ctx.ellipse(r * 0.48, -r * 0.5, r * 0.045, r * 0.085, 0, 0, 6.283); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(r * 0.72, -r * 0.18, r * 0.17, 0, 6.283); ctx.fill();
  ctx.fillStyle = '#123a6e'; ctx.beginPath(); ctx.arc(r * 0.76, -r * 0.18, r * 0.09, 0, 6.283); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(r * 0.79, -r * 0.21, r * 0.035, 0, 6.283); ctx.fill();
  ctx.restore();
  if (quote) {
    const bx = w.x, by = w.y - r * 1.9 - 24;
    ctx.font = '13px "Microsoft YaHei",sans-serif';
    const tw = ctx.measureText(quote.text).width;
    const bw = tw + 22, bh = 28, x = clamp(bx - bw / 2, 4, W - bw - 4), y = clamp(by, 30, H - 30);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, bw, bh, 10); else ctx.rect(x, y, bw, bh);
    const tx = clamp(bx, x + 10, x + bw - 10);
    ctx.moveTo(tx, y + bh);
    ctx.lineTo(tx - 5, y + bh + 7);
    ctx.lineTo(tx + 5, y + bh + 7);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#123a6e'; ctx.textAlign = 'center';
    ctx.fillText(quote.text, x + bw / 2, y + bh / 2 + 5);
    ctx.textAlign = 'left';
  }
}
function drawHook() {
  if (!hook || hook.phase === 'warn') return;
  if (hook.phase === 'reel' && Math.floor(performance.now() / 120) % 2 === 0) return;
  const hx = hook.x, hy = hook.y;
  const lw = 3 / zoom, r = 14 / zoom;
  ctx.strokeStyle = '#cfd6e4';
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(hx, vy);
  ctx.lineTo(hx, hy);
  ctx.stroke();
  ctx.strokeStyle = '#e8eef6';
  ctx.lineWidth = lw * 1.3;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(hx - r, hy, r, 0, Math.PI, false);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(hx - r, hy);
  ctx.lineTo(hx - r, hy - r * 1.2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(hx - r, hy - r * 0.7);
  ctx.lineTo(hx - r * 0.55, hy - r);
  ctx.stroke();
}
function drawHookWarn() {
  if (!hook || hook.phase !== 'warn') return;
  const a = 0.5 + 0.5 * Math.sin(performance.now() / 100);
  ctx.fillStyle = 'rgba(255,40,40,' + (0.3 * a) + ')';
  ctx.fillRect(0, 0, W, 8);
  ctx.fillStyle = 'rgba(255,90,90,' + (0.55 + 0.45 * a) + ')';
  ctx.font = 'bold 22px "Microsoft YaHei",sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('鱼钩来袭！', W / 2, 50);
  ctx.textAlign = 'left';
}
function updateDanger() {
  let minD = 1e9;
  for (const f of fish) {
    if (f.pred && f.r >= whale.r * 0.88) {
      const dx = whale.x - f.x, dy = whale.y - f.y, d = Math.hypot(dx, dy);
      if (d < minD) minD = d;
    }
  }
  const target = clamp(1 - minD / 400, 0, 1);
  danger = lerp(danger, target, 0.08);
}
function drawVignette() {
  ctx.fillStyle = vigGrad; ctx.fillRect(0, 0, W, H);
  if (danger > 0.02) {
    ctx.globalAlpha = danger * 0.6;
    ctx.fillStyle = dangerGrad; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
  }
}
function render() {
  ctx.clearRect(0, 0, W, H);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawBg(); drawSeaweed(); drawBubbles();
  ctx.save();
  const sx = shake > 0 ? rand(-1, 1) * shake * 9 : 0;
  const sy = shake > 0 ? rand(-1, 1) * shake * 9 : 0;
  ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, dpr * (W / 2 - whale.x * zoom + sx), dpr * (H / 2 - whale.y * zoom + sy));
  drawFishAll();
  drawParticles();
  drawWhaleC();
  drawHook();
  ctx.restore();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawVignette();
  drawHookWarn();
}

/* ================= HUD ================= */
const scoreVal = document.getElementById('scoreVal');
const highVal = document.getElementById('highVal');
const heartsEl = document.getElementById('hearts');
const hintEl = document.getElementById('hint');
const comboEl = document.getElementById('combo');
const powerEl = document.getElementById('power');
const hudEl = document.getElementById('hud');
const heartsSpans = [];
let heartsMax = 0;
function ensureHearts(max) {
  if (max === heartsMax) return;
  heartsEl.innerHTML = '';
  heartsSpans.length = 0;
  for (let i = 0; i < max; i++) {
    const s = document.createElement('span');
    s.textContent = '♥';
    heartsEl.appendChild(s);
    heartsSpans.push(s);
  }
  heartsMax = max;
}
let hudScore = -1, hudHigh = -1, hudLives = -1, hudCombo = -1, hudPower = '';
function updateHUD() {
  if (state.score !== hudScore) { hudScore = state.score; scoreVal.textContent = state.score; }
  if (state.high !== hudHigh) { hudHigh = state.high; highVal.textContent = state.high; }
  const maxLives = 3 + upgEffect('lives');
  if (maxLives !== heartsMax || state.lives !== hudLives) {
    ensureHearts(maxLives);
    hudLives = state.lives;
    for (let i = 0; i < heartsSpans.length; i++) heartsSpans[i].className = i < state.lives ? 'on' : 'off';
  }
  if (combo !== hudCombo) {
    hudCombo = combo;
    if (combo >= 2) {
      comboEl.textContent = 'x' + combo + ' 连击 · ' + comboMult(combo) + 'x';
      comboEl.classList.remove('pop'); void comboEl.offsetWidth; comboEl.classList.add('pop');
    } else comboEl.textContent = '';
  }
  const pNow = whale.powerT > 0 ? ('power|' + Math.ceil(whale.powerT)) : (whale.magnetT > 0 ? ('magnet|' + Math.ceil(whale.magnetT)) : '');
  if (pNow !== hudPower) {
    hudPower = pNow;
    if (whale.powerT > 0) { powerEl.textContent = '无敌 ' + Math.ceil(whale.powerT) + 's'; powerEl.className = 'power'; }
    else if (whale.magnetT > 0) { powerEl.textContent = '磁铁 ' + Math.ceil(whale.magnetT) + 's'; powerEl.className = 'magnet'; }
    else { powerEl.textContent = ''; powerEl.className = ''; }
  }
}

/* ================= 流程 ================= */
const menuEl = document.getElementById('menu');
const overEl = document.getElementById('over');
const pauseEl = document.getElementById('pause');
const finalScore = document.getElementById('finalScore');
const finalHigh = document.getElementById('finalHigh');
const finalCombo = document.getElementById('finalCombo');
const finalGold = document.getElementById('finalGold');
const recordEl = document.getElementById('record');
const startBtn = document.getElementById('startBtn');
const againBtn = document.getElementById('againBtn');
const muteBtn = document.getElementById('muteBtn');
const pauseResumeBtn = document.getElementById('pauseResumeBtn');
const pauseHomeBtn = document.getElementById('pauseHomeBtn');
const overHomeBtn = document.getElementById('overHomeBtn');
const rulesEl = document.getElementById('rules');
const rulesBtn = document.getElementById('rulesBtn');
const rulesBackBtn = document.getElementById('rulesBackBtn');
const upgradeEl = document.getElementById('upgrade');
const upgradeBtn = document.getElementById('upgradeBtn');
const upgradeBackBtn = document.getElementById('upgradeBackBtn');
const upgList = document.getElementById('upgList');
const upgGold = document.getElementById('upgGold');
const goldVal = document.getElementById('goldVal');
const deleteSaveBtn = document.getElementById('deleteSaveBtn');

function showOverlay(el, show) { el.classList.toggle('hidden', !show); }
function setModalBack(hidden) {
  hudEl.classList.toggle('hide-hud', hidden);
  muteBtn.classList.toggle('hide-hud', hidden);
}
function renderUpgrade() {
  upgGold.textContent = gold;
  goldVal.textContent = gold;
  upgList.innerHTML = '';
  for (const u of UPGRADES) {
    const lv = upg[u.id] || 0;
    const price = upgPrice(u.id);
    const maxed = price === null;
    const card = document.createElement('div');
    card.className = 'upg-card';
    const nm = document.createElement('div'); nm.className = 'nm'; nm.textContent = u.name;
    const lvEl = document.createElement('div'); lvEl.className = 'lv'; lvEl.textContent = maxed ? 'Lv.' + lv + ' / MAX' : 'Lv.' + lv;
    const efEl = document.createElement('div'); efEl.className = 'ef';
    efEl.textContent = maxed ? u.fmt(u.inc * lv) : (u.fmt(u.inc * lv) + ' → ' + u.fmt(u.inc * (lv + 1)));
    const desc = document.createElement('div'); desc.className = 'desc'; desc.textContent = u.desc;
    const btn = document.createElement('button'); btn.className = 'upg-btn';
    btn.textContent = maxed ? '已满级' : (price + ' 金币');
    btn.disabled = maxed || gold < price;
    btn.addEventListener('click', () => { if (!maxed && gold >= price) { gold -= price; upg[u.id] = lv + 1; saveUpg(); renderUpgrade(); } });
    card.appendChild(nm); card.appendChild(lvEl); card.appendChild(efEl); card.appendChild(desc); card.appendChild(btn);
    upgList.appendChild(card);
  }
}
function startGame() {
  initAudio(); sfx.start();
  state.screen = 'playing'; state.score = 0; state.lives = 3 + upgEffect('lives'); state.time = 0;
  whale.x = W / 2; whale.y = H * 0.6; whale.vx = 0; whale.vy = 0;
  whale.r = 26 + upgEffect('size'); whale.inv = 0; whale.eatT = 0; whale.facing = 1; whale.powerT = 0; whale.magnetT = 0;
  updateCamera();
  fish = []; parts = []; quote = null; quoteT = 6;
  spawnT = 0.8; goldT = 12; gemT = 8; shake = 0;
  starCd = 20; magnetCd = 18; rushCd = 30; rushActive = 0; rushSpawnT = 0;
  combo = 0; comboT = 0; maxCombo = 0; danger = 0;
  hook = null; hookCd = 20;
  mouse.lastMove = -1e9;
  showOverlay(menuEl, false); showOverlay(overEl, false); showOverlay(pauseEl, false); showOverlay(rulesEl, false); showOverlay(upgradeEl, false);
  hintEl.textContent = '鼠标 / WASD 控制方向 · P 暂停 · M 静音';
}
function gameOver() {
  state.screen = 'gameover';
  sfx.die();
  const earned = Math.floor(state.score / 20);
  gold += earned; saveUpg();
  const isRecord = state.score > state.high;
  if (isRecord) { state.high = state.score; store.set('twlj_high', String(state.high)); }
  finalScore.textContent = state.score;
  finalHigh.textContent = state.high;
  finalCombo.textContent = 'x' + maxCombo;
  finalGold.textContent = '+' + earned;
  recordEl.classList.toggle('hidden', !isRecord);
  showOverlay(overEl, true);
  hintEl.textContent = '吃小鱼长大 · 金鱼大补 · 绿宝石回血 · 别碰大鱼';
}
function togglePause() {
  if (state.screen === 'playing') { state.screen = 'paused'; showOverlay(pauseEl, true); }
  else if (state.screen === 'paused') { state.screen = 'playing'; showOverlay(pauseEl, false); }
}
function toggleMute() {
  muted = !muted; store.set('twlj_muted', muted ? '1' : '0');
  muteBtn.textContent = muted ? '🔇' : '🔊';
}
function goMenu() {
  state.screen = 'menu'; state.score = 0; state.lives = 3 + upgEffect('lives');
  whale.r = 26 + upgEffect('size'); whale.inv = 0; whale.eatT = 0; whale.powerT = 0; whale.magnetT = 0;
  fish = []; parts = []; quote = null; shake = 0;
  combo = 0; comboT = 0; maxCombo = 0; danger = 0;
  hook = null;
  showOverlay(menuEl, true); showOverlay(overEl, false); showOverlay(pauseEl, false); showOverlay(rulesEl, false); showOverlay(upgradeEl, false);
  goldVal.textContent = gold;
  hintEl.textContent = '吃小鱼长大 · 金鱼大补 · 绿宝石回血 · 别碰大鱼';
}

/* ================= 输入 ================= */
window.addEventListener('mousemove', e => {
  mouse.x = e.clientX; mouse.y = e.clientY; mouse.lastMove = performance.now();
});
window.addEventListener('touchstart', e => {
  const t = e.touches[0]; mouse.x = t.clientX; mouse.y = t.clientY; mouse.lastMove = performance.now();
}, { passive: true });
window.addEventListener('touchmove', e => {
  e.preventDefault();
  const t = e.touches[0]; mouse.x = t.clientX; mouse.y = t.clientY; mouse.lastMove = performance.now();
}, { passive: false });
window.addEventListener('keydown', e => {
  keys[e.key] = true;
  initAudio();
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    if (state.screen === 'menu' || state.screen === 'gameover') startGame();
    else if (state.screen === 'paused') togglePause();
  }
  if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
    if (e.key === 'Escape' && !rulesEl.classList.contains('hidden')) { showOverlay(rulesEl, false); setModalBack(false); showOverlay(menuEl, true); }
    else if (e.key === 'Escape' && !upgradeEl.classList.contains('hidden')) { showOverlay(upgradeEl, false); setModalBack(false); showOverlay(menuEl, true); }
    else if (state.screen === 'playing' || state.screen === 'paused') togglePause();
  }
  if (e.key === 'm' || e.key === 'M') toggleMute();
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].indexOf(e.key) >= 0) e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.key] = false; });
startBtn.addEventListener('click', () => { initAudio(); startGame(); startBtn.blur(); });
againBtn.addEventListener('click', () => { startGame(); againBtn.blur(); });
muteBtn.addEventListener('click', () => { initAudio(); toggleMute(); muteBtn.blur(); });
pauseResumeBtn.addEventListener('click', () => { togglePause(); pauseResumeBtn.blur(); });
pauseHomeBtn.addEventListener('click', () => { goMenu(); pauseHomeBtn.blur(); });
overHomeBtn.addEventListener('click', () => { goMenu(); overHomeBtn.blur(); });
rulesBtn.addEventListener('click', () => { initAudio(); showOverlay(menuEl, false); setModalBack(true); showOverlay(rulesEl, true); rulesBtn.blur(); });
rulesBackBtn.addEventListener('click', () => { showOverlay(rulesEl, false); setModalBack(false); showOverlay(menuEl, true); rulesBackBtn.blur(); });
upgradeBtn.addEventListener('click', () => { initAudio(); renderUpgrade(); showOverlay(menuEl, false); setModalBack(true); showOverlay(upgradeEl, true); upgradeBtn.blur(); });
upgradeBackBtn.addEventListener('click', () => { showOverlay(upgradeEl, false); setModalBack(false); showOverlay(menuEl, true); upgradeBackBtn.blur(); });
deleteSaveBtn.addEventListener('click', () => {
  if (confirm('确定要删除全部存档吗？\n金币、升级等级和最高分都会被清空，此操作不可撤销。')) {
    store.set('twlj_gold', '0');
    store.set('twlj_upg', '{}');
    store.set('twlj_high', '0');
    gold = 0; upg = {};
    state.high = 0;
    highVal.textContent = '0';
    goldVal.textContent = '0';
    renderUpgrade();
  }
});
window.addEventListener('blur', () => { if (state.screen === 'playing') togglePause(); });

/* ================= 主循环 ================= */
resize();
whale.x = W / 2; whale.y = H * 0.56;
whale.r = 26 + upgEffect('size');
muteBtn.textContent = muted ? '🔇' : '🔊';
goldVal.textContent = gold;
let lastT = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.033, (now - lastT) / 1000); lastT = now;
  if (state.screen === 'playing') { updatePlay(dt); updateHook(dt); }
  updateDecor(dt);
  updateFish(dt);
  updateDanger();
  updateWhale(dt);
  updateCamera(dt);
  updateParticles(dt);
  if (shake > 0) shake = Math.max(0, shake - dt);
  render();
  updateHUD();
}
requestAnimationFrame(loop);
