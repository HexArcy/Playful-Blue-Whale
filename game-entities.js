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
  const minR = Math.max(8, whale.r * 0.15);
  let r = rand(minR, Math.max(minR + 4, whale.r * 1.7));
  const dangerP = 0.22 + Math.min(0.4, whale.r / 140);
  if (r >= whale.r * 0.88 && Math.random() > dangerP) r = rand(minR, Math.max(minR + 1, whale.r * 0.75));
  let pred = false;
  if (whale.r > 38 && Math.random() < 0.1 && r >= whale.r * 0.95) { r = whale.r * rand(1.15, 1.45); pred = true; }
  const c = PALETTE[randInt(0, PALETTE.length - 1)];
  fish.push({
    x: fromLeft ? vx - 250 : vx + viewW + 250, y: rand(vy + viewH * 0.12, vy + viewH * 0.88),
    vx: dir * rand(60, 140) * (1 + Math.min(1, state.time / 240) * 0.7) * (pred ? 0.55 : 1),
    vy: rand(-15, 15), r, dir, pred, c1: c[0], c2: c[1],
    wob: rand(0, 6.28), wobS: rand(4, 8), golden: false, harmless: false
  });
}
function spawnGolden() {
  const fromLeft = Math.random() < 0.5;
  const dir = fromLeft ? 1 : -1;
  fish.push({
    x: fromLeft ? vx - 250 : vx + viewW + 250, y: rand(vy + viewH * 0.15, vy + viewH * 0.85), vx: dir * rand(55, 95), vy: rand(-10, 10),
    r: rand(11, 15), dir, pred: false, c1: '#ffd166', c2: '#f59f1c', wob: 0, wobS: 6, golden: true, harmless: false
  });
}
function spawnGem() {
  const fromLeft = Math.random() < 0.5;
  const dir = fromLeft ? 1 : -1;
  fish.push({
    x: fromLeft ? vx - 250 : vx + viewW + 250, y: rand(vy + viewH * 0.15, vy + viewH * 0.85), vx: dir * rand(50, 90), vy: rand(-10, 10),
    r: rand(12, 16), dir, pred: false, c1: '#5fe37c', c2: '#1f9e4d', wob: 0, wobS: 5, golden: false, gem: true, harmless: false
  });
}
function spawnStar() {
  const fromLeft = Math.random() < 0.5;
  const dir = fromLeft ? 1 : -1;
  fish.push({
    x: fromLeft ? vx - 250 : vx + viewW + 250, y: rand(vy + viewH * 0.15, vy + viewH * 0.85), vx: dir * rand(50, 85), vy: rand(-10, 10),
    r: rand(13, 17), dir, pred: false, c1: '#ffe66d', c2: '#f5a623', wob: 0, wobS: 5, golden: false, gem: false, star: true, harmless: false
  });
}
function spawnMagnet() {
  const fromLeft = Math.random() < 0.5;
  const dir = fromLeft ? 1 : -1;
  fish.push({
    x: fromLeft ? vx - 250 : vx + viewW + 250, y: rand(vy + viewH * 0.15, vy + viewH * 0.85), vx: dir * rand(50, 85), vy: rand(-10, 10),
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
