function drawParticles() {
  for (const p of parts) {
    const a = clamp(p.life / p.max, 0, 1);
    if (p.text) {
      ctx.globalAlpha = a; ctx.fillStyle = p.color;
      // 字号按视角缩放换算，保证屏幕上的分数飘字大小恒定
      ctx.font = 'bold ' + (p.size || 15) / zoom + 'px "Microsoft YaHei",sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(p.text, p.x, p.y); ctx.globalAlpha = 1; continue;
    }
    if (p.bub) {
      ctx.globalAlpha = a * 0.6; ctx.strokeStyle = p.color; ctx.lineWidth = 1.5 / zoom;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r / zoom, 0, 6.283); ctx.stroke();
    }
    else {
      ctx.globalAlpha = a; ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r / zoom, 0, 6.283); ctx.fill();
    }
    ctx.globalAlpha = 1;
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
    const r = (f.golden || f.gem || f.star || f.magnet) ? f.r / zoom : f.r;
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
}
function drawQuote() {
  if (!quote) return;
  const sx = W / 2, sy = H / 2;
  const rs = whale.r * zoom;
  const by = sy - rs * 1.9 - 30;
  ctx.font = 'bold 14px "Microsoft YaHei",sans-serif';
  const tw = ctx.measureText(quote.text).width;
  const bw = tw + 32, bh = 36;
  const x = clamp(sx - bw / 2, 8, W - bw - 8);
  const y = clamp(by, 34, H - 44);
  const cr = 16;
  const tx = clamp(sx, x + cr, x + bw - cr); // 尾巴尖对准鲸鱼
  // 气泡主体 + 尾巴（合成一个路径，指向下方鲸鱼）
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, bw, bh, cr); else ctx.rect(x, y, bw, bh);
  ctx.moveTo(tx - 9, y + bh - 3);
  ctx.quadraticCurveTo(tx, y + bh + 12, tx + 9, y + bh - 3);
  ctx.closePath();
  // 柔和投影
  ctx.shadowColor = 'rgba(0,25,70,0.30)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 4;
  // 白→浅蓝渐变主体
  const g = ctx.createLinearGradient(x, y, x, y + bh);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(1, '#e6f1ff');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  // 浅蓝描边
  ctx.strokeStyle = 'rgba(46,116,216,0.35)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // 顶部高光
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + cr * 1.4, y + 7);
  ctx.lineTo(x + bw - cr * 1.4, y + 7);
  ctx.stroke();
  // 文字
  ctx.fillStyle = '#123a6e';
  ctx.textAlign = 'center';
  ctx.fillText(quote.text, x + bw / 2, y + bh / 2 + 6);
  ctx.textAlign = 'left';
}
function hookScreenPos(wx, wy) {
  return { x: (wx - whale.x) * zoom + W / 2, y: (wy - whale.y) * zoom + H / 2 };
}
function drawHook() {
  if (!hook || hook.phase === 'warn') return;
  if (hook.phase === 'reel' && Math.floor(performance.now() / 120) % 2 === 0) return;
  const hx = hook.x, hy = hook.y;
  const lw = 4 / zoom, r = 18 / zoom;
  // 落点警告圈（drop/stay 阶段持续显示）
  if (hook.phase === 'drop' || hook.phase === 'stay') {
    const a = 0.5 + 0.5 * Math.sin(performance.now() / 200);
    ctx.strokeStyle = 'rgba(255,60,60,' + (0.4 + 0.3 * a) + ')';
    ctx.lineWidth = 3 / zoom;
    ctx.beginPath(); ctx.arc(hook.x, hook.targetY, r + 14, 0, 6.283); ctx.stroke();
  }
  // 吊线（红色）
  ctx.strokeStyle = '#ff6b6b';
  ctx.lineWidth = lw;
  ctx.beginPath();
  ctx.moveTo(hx, vy);
  ctx.lineTo(hx, hy);
  ctx.stroke();
  // 弯钩（红色描边 + 白色内芯）
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#ff5252';
  ctx.lineWidth = lw * 1.4;
  ctx.beginPath();
  ctx.arc(hx - r, hy, r, 0, Math.PI, false);
  ctx.stroke();
  ctx.strokeStyle = '#ffc9c9';
  ctx.lineWidth = lw * 0.8;
  ctx.beginPath();
  ctx.arc(hx - r, hy, r - lw, 0, Math.PI, false);
  ctx.stroke();
  // 钩尖 + 倒刺
  ctx.strokeStyle = '#ff5252';
  ctx.lineWidth = lw * 1.2;
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
  if (!hook) return;
  const a = 0.5 + 0.5 * Math.sin(performance.now() / 100);
  if (hook.phase === 'warn') {
    // 顶部警示条（加宽渐变）
    const g = ctx.createLinearGradient(0, 0, 0, 14);
    g.addColorStop(0, 'rgba(255,40,40,' + (0.55 * a) + ')');
    g.addColorStop(1, 'rgba(255,40,40,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, 14);
    // 落点顶部箭头
    const p = hookScreenPos(hook.x, hook.targetY);
    const ax = clamp(p.x, 30, W - 30);
    ctx.fillStyle = 'rgba(255,70,70,' + (0.75 + 0.25 * a) + ')';
    ctx.beginPath();
    ctx.moveTo(ax - 12, 14); ctx.lineTo(ax + 12, 14); ctx.lineTo(ax, 32);
    ctx.closePath(); ctx.fill();
    // 落点警告圈（脉冲 + 叉号）
    const pr = 16 + Math.sin(performance.now() / 300) * 5;
    ctx.strokeStyle = 'rgba(255,60,60,' + (0.5 + 0.5 * a) + ')';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(ax, p.y, pr, 0, 6.283); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ax - pr * 0.5, p.y - pr * 0.5); ctx.lineTo(ax + pr * 0.5, p.y + pr * 0.5);
    ctx.moveTo(ax + pr * 0.5, p.y - pr * 0.5); ctx.lineTo(ax - pr * 0.5, p.y + pr * 0.5);
    ctx.stroke();
    // 大字号警告文字（红色光晕）
    ctx.save();
    ctx.shadowColor = 'rgba(255,40,40,0.9)'; ctx.shadowBlur = 18;
    ctx.fillStyle = 'rgba(255,90,90,' + (0.7 + 0.3 * a) + ')';
    ctx.font = 'bold 28px "Microsoft YaHei",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('鱼钩来袭！', W / 2, 64);
    ctx.restore();
    ctx.textAlign = 'left';
  } else if (hook.phase === 'reel') {
    // 收钩提示
    ctx.fillStyle = 'rgba(255,90,90,' + (0.7 + 0.3 * a) + ')';
    ctx.font = 'bold 18px "Microsoft YaHei",sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('钩子收回！', W / 2, 40);
    ctx.textAlign = 'left';
  }
}
function drawBanner() {
  if (!banner) return;
  const a = Math.min(1, banner.t / 0.4);
  ctx.fillStyle = 'rgba(255,209,102,' + (0.95 * a) + ')';
  ctx.font = 'bold 28px "Microsoft YaHei",sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(banner.text, W / 2, H * 0.25);
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
function drawMagnetAura() {
  if (whale.magnetT <= 0 || state.screen !== 'playing') return;
  const range = (320 + upgEffect('magnetRange')) / zoom;
  const t = performance.now() / 1000;
  const a = 0.22 + 0.12 * Math.sin(t * 4);
  // 淡粉色填充（从鲸鱼边缘到吸附半径渐隐）
  const g = ctx.createRadialGradient(whale.x, whale.y, whale.r, whale.x, whale.y, range);
  g.addColorStop(0, 'rgba(255,107,157,0.10)');
  g.addColorStop(1, 'rgba(255,107,157,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(whale.x, whale.y, range, 0, 6.283); ctx.fill();
  // 粉色虚线光环，随吸附效果脉动
  ctx.strokeStyle = 'rgba(255,107,157,' + (0.35 + 0.25 * a) + ')';
  ctx.lineWidth = 3 / zoom;
  ctx.setLineDash([16 / zoom, 12 / zoom]);
  ctx.beginPath(); ctx.arc(whale.x, whale.y, range, 0, 6.283); ctx.stroke();
  ctx.setLineDash([]);
}
function render() {
  ctx.clearRect(0, 0, W, H);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawBg(); drawSeaweed(); drawBubbles();
  ctx.save();
  const sx = shake > 0 ? rand(-1, 1) * shake * 9 : 0;
  const sy = shake > 0 ? rand(-1, 1) * shake * 9 : 0;
  ctx.setTransform(dpr * zoom, 0, 0, dpr * zoom, dpr * (W / 2 - whale.x * zoom + sx), dpr * (H / 2 - whale.y * zoom + sy));
  drawMagnetAura();
  drawFishAll();
  drawParticles();
  drawWhaleC();
  drawHook();
  ctx.restore();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawVignette();
  drawHookWarn();
  drawBanner();
  drawQuote();
}
