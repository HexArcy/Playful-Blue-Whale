# AGENTS.md

This file provides guidance to AI coding agents (Claude Code, Cursor, Gemini CLI, CodeBuddy Code, etc.) when working with code in this repository.

## Project Overview

A browser-based "贪玩蓝鲸" (Greedy Whale) eating game. The player controls a whale that grows by eating smaller fish and must avoid larger predators. Written in **vanilla JavaScript + HTML5 Canvas + CSS** with **zero dependencies, no build system, and no tests**.

## Running the Game

There is no build step or package.json. Two ways to run:

- Open `index.html` directly in a browser, or
- Serve the directory with any static server, e.g. `python -m http.server` and open `http://localhost:8000`.

The only "build" concern is script load order in `index.html` — all files share the global scope, so new files must be added as `<script>` tags after the files they depend on.

## Architecture

All state lives in the **shared global scope** (no ES modules, no bundler). Files are loaded in dependency order in `index.html`:

1. **`game-core.js`** — Foundation layer. Utility helpers (`rand`, `randInt`, `clamp`, `lerp`, `comboMult`), the `store` localStorage wrapper, the `UPGRADES` meta-array and upgrade economy functions (`upgEffect`, `upgPrice`, `saveUpg`), canvas setup + `resize()`, camera/zoom (`updateCamera`, `vx`/`vy`/`viewW`/`viewH`), global game state (`state`, `whale`, `fish`, `parts`, etc.), and WebAudio (`tone`, `sfx`). Pure data + setup — no per-frame logic.
2. **`game-entities.js`** — Factory functions for game objects: scene decoration (`genDecor`/`initDecor` for bubbles, seaweeds, rays, sand) and fish spawning (`spawnFish`, `spawnGolden`, `spawnGem`, `spawnStar`, `spawnMagnet`). Also particle helpers (`addParts`, `addText`). Each spawner creates objects with a shared shape: `{x, y, vx, vy, r, dir, pred, c1, c2, wob, wobS}` plus type flags (`golden`, `gem`, `star`, `magnet`, `pred`).
3. **`game-update.js`** — All simulation logic: `updateFish` (movement, magnet attraction, collision → `eatFish`/`hurtBy`), `updateWhale` (input-driven movement, timers, trail particles, speech quotes), `updatePlay` (spawn timers, gold rush, power-up cooldowns), and the hook mechanic (`spawnHook`, `updateHook`). Purely mutates shared state; never draws.
4. **`game-render.js`** — All Canvas drawing. Per-entity draw functions (`drawGemFish`, `drawStarFish`, `drawMagnetFish`, `drawWhaleC`), background layers (`drawBg`, `drawSeaweed`, `drawBubbles`), overlay effects (`drawVignette`, `drawHookWarn`, `drawBanner`, `drawQuote`), and the master `render()` that sets up the world transform. Note `updateDanger` lives here too (computed during render pass).
5. **`game-ui.js`** — DOM/HUD management and game flow. Overlay screens (menu, game over, pause, rules, upgrade shop), input listeners (keyboard/mouse/touch), `startGame`, `gameOver`, `goMenu`, and the **main loop** (`loop` via `requestAnimationFrame`, dt capped at 0.033s). This is the orchestrator that calls update + render + HUD each frame.

### Key Patterns & Non-Obvious Behavior

- **Global state, not modules**: `state` (`{screen, score, high, lives, time}`), `whale` (`{x, y, vx, vy, r, facing, wobble, eatT, inv, powerT, magnetT}`), and module-scope arrays (`fish`, `parts`, `bubbles`, `seaweeds`, `rays`, `sandDots`) are plain globals mutated across files. `state.screen` is one of `'menu' | 'playing' | 'paused' | 'gameover'` and gates most update logic.
- **Camera/zoom**: `updateCamera` keeps the whale centered; when `whale.r > 90` the zoom factor is `90 / whale.r` (camera pulls out as the whale grows). World-space view is `vx, vy, viewW, viewH`.
- **Screen-constant special items**: Golden fish, gem, star, magnet are rendered and collide at a **fixed on-screen size** — their effective radius is `f.r / zoom` (see `drawFishAll` line 122 and `updateFish` line 27). Regular fish scale with zoom normally. Preserve this distinction when touching collision or rendering.
- **Entity flags**: fish objects carry type flags in a single shape — `golden` (+200, big growth), `gem` (+100, heal 1 life), `star` (5s invincibility, can eat predators), `magnet` (attract fish), `pred` (gray predator). `eatFish` (game-update.js:35) handles the reward/effect logic per flag. `hurtBy` knocks the predator away and sets `whale.inv = 2.2` (invincibility frames); after that window the same fish can hurt again (no permanent `harmless` flag).
- **Zoom-constant movement & effects**: The whale's world speed is `430 * (1+upg) / zoom` (game-update.js `updateWhale`), fish integrate as `f.x += f.vx * dt / zoom`, and particles (score popups, whale trail bubbles, burst effects) integrate the same way in `updateParticles` — so **on-screen speeds stay constant** regardless of how far the camera zooms out. Particles are also drawn zoom-compensated: text font size, bubble radius, and line width are divided by `zoom` in `drawParticles` (game-render.js), keeping popups and trails visible at any whale size. Keep this `/ zoom` compensation whenever you add velocity-based movement or world-space drawing, or things will appear tiny/crawling when the whale grows. The whale speech bubble (`drawQuote`) is drawn in screen space (after the world transform), so it's naturally screen-constant.
- **Magnet attraction**: `updateFish` pulls edible fish (`!pred && r < whale.r*0.88`) toward the whale when `whale.magnetT > 0`. Range and pull speed are both zoom-compensated: `range = (320 + upgEffect('magnetRange')) / zoom`, `spd = (220 + upgEffect('magnetSpeed')) / zoom` — a **screen-constant radius** (~320–520 screen px) and pull speed. While active, `drawMagnetAura` (game-render.js) draws a pulsing pink radius ring around the whale so the effect is visible.
- **Upgrades**: Defined in the `UPGRADES` array (game-core.js:14). Levels stored in `upg` (localStorage `twlj_upg`); effects queried via `upgEffect(id)` (raw bonus) and priced via `upgPrice(id)` (exponential cost curve, `null` = maxed). New upgrade types are added by appending to `UPGRADES`, then wired where the effect applies.
- **localStorage keys**: `twlj_upg` (upgrade levels JSON), `twlj_gold` (currency), `twlj_high` (high score), `twlj_muted` (`'1'`/`'0'`). All reads/writes go through the `store` wrapper (game-core.js:7) which silently swallows errors.
- **Difficulty scaling**: fish speed increases with `state.time` (capped +70%), predator probability scales with `whale.r`, and spawn interval shrinks over time (game-update.js `updatePlay`).
- **Canvas sizing**: `resize()` (game-core.js:38) handles devicePixelRatio (capped at 2), sets CSS pixel dims, and rebuilds cached gradients and decoration on resize.
- **Audio**: WebAudio oscillators only — no audio files. `tone()` sweeps frequency/exponential gain; `sfx` maps named events to tones. Requires a user gesture (`initAudio()` is called on all interactions) because of browser autoplay policy.

### Conventions

- Files start with a section banner comment like `/* ================= 更新 ================= */`.
- Helpers and gameplay constants use `camelCase` (`spawnFish`, `viewW`); types/classes (fish objects) use lowercase single-letter fields (`x, y, vx, vy, r`).
- Existing functionality deliberately avoids classes — new entities should follow the plain-object + flag pattern.
- Comments are in Chinese; keep new comments in Chinese to match.
