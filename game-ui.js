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
  // 无敌与磁铁同时生效时分开着色（各自保留本来的颜色）
  let pHtml = '';
  if (whale.powerT > 0) pHtml += '<span class="power">无敌 ' + Math.ceil(whale.powerT) + 's</span>';
  if (whale.magnetT > 0) pHtml += (pHtml ? ' · ' : '') + '<span class="magnet">磁铁 ' + Math.ceil(whale.magnetT) + 's</span>';
  if (pHtml !== hudPower) {
    hudPower = pHtml;
    powerEl.innerHTML = pHtml;
    powerEl.className = pHtml ? 'show' : '';
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
  if (state.screen === 'playing') { updatePlay(dt); updateHook(dt); updateBanner(dt); }
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
