function updateParticles(dt) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i]; p.life -= dt;
    if (p.life <= 0) { parts.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.bub) { p.vy -= 30 * dt; p.x += Math.sin(p.life * 6) * 14 * dt; }
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
    if (f.x < vx - 2000 || f.x > vx + viewW + 2000 || f.y < vy - 2000 || f.y > vy + viewH + 2000) { fish.splice(i, 1); continue; }
    if (state.screen === 'playing' && whale.magnetT > 0 && !f.pred && f.r < whale.r * 0.88) {
      const mx = whale.x - f.x, my = whale.y - f.y, md = Math.hypot(mx, my);
      const range = 320 + whale.r * 2 + upgEffect('magnetRange'), spd = 220 + upgEffect('magnetSpeed');
      if (md < range && md > 1) { f.x += mx / md * spd * dt; f.y += my / md * spd * dt; }
    }
    if (state.screen === 'playing' && !f.harmless && whale.inv <= 0) {
      const dx = whale.x - f.x, dy = whale.y - f.y;
      const er = (f.golden || f.gem || f.star || f.magnet) ? f.r / zoom : f.r;
      const rr = whale.r * 0.75 + er * 0.85;
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
  whale.r = whale.r + (f.golden || f.gem ? 3 : (f.star || f.magnet ? 0 : f.r * 0.10 * (1 + upgEffect('grow') / 100) * (1 / (1 + whale.r / 500))));
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
    const K = 430 * (1 + upgEffect('speed') / 100) / zoom;
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
  if (state.screen === 'playing') {
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
    quoteT -= dt;
    if (quoteT <= 0) { quote = { text: QUOTES[randInt(0, QUOTES.length - 1)], t: 4 }; quoteT = rand(16, 28); }
    if (quote) { quote.t -= dt; if (quote.t <= 0) quote = null; }
  }
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
  if (rushCd <= 0) { rushCd = rand(25, 40); rushActive = 3.0; rushSpawnT = 0; sfx.rush(); showBanner('金鱼潮来袭！', 2.5); }
  if (rushActive > 0) {
    rushActive -= dt; rushSpawnT -= dt;
    if (rushSpawnT <= 0) { spawnGolden(); rushSpawnT = 0.35; }
  }
  hookCd -= dt;
  if (hookCd <= 0) { hookCd = rand(18, 28); if (whale.r >= 100 && !hook) spawnHook(); }
}
function showBanner(text, dur) { banner = { text, t: dur, dur }; }
function updateBanner(dt) { if (banner) { banner.t -= dt; if (banner.t <= 0) banner = null; } }
function spawnHook() {
  hook = {
    x: whale.x + rand(-0.3, 0.3) * viewW,
    y: vy,
    targetY: whale.y + rand(-0.1, 0.1) * viewH,
    phase: 'warn',
    t: 2
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
      showBanner('被钩住了！', 1.2);
      addParts(hook.x, hook.y, '#ff5e5e', 24, 190, 0.5);
      hook = null;
      if (state.lives <= 0) gameOver();
    }
  }
}
