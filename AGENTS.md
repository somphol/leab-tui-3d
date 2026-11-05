# AGENTS.md — Leab-Tui 3D

## 1. What this is

A static, bilingual 3D teaching table for **เลี๊ยบตุ่ย (Leab-Tui)**, the Thai trick-taking game played with the 32 tiles of a Chinese chess set. One page, three source files, Three.js r160 from jsDelivr, no build step. It plays four seats (1 human + 3 heuristic AI), implements Leab/Tui/Sa Hoo/See Hoo/Ngoh Hoo/Lak Hoo and Soldier sets, and adds a tile inspector, live coach, Hint, Undo & Learn, synthesised audio, autosave and JSON export.

It is **not** a gambling app, an online multiplayer service, a tournament rules authority, or a complete implementation of the two- and three-player variants. Release **1.1.0**.

Live: <https://somphol.github.io/leab-tui-3d/> · Local master: `~/Projects/leab-tui-3d`

## 2. Commands

```bash
cd ~/Projects/leab-tui-3d

# run
python3 -m http.server 8123
# open http://127.0.0.1:8123/
# an HTTP server is required: script.js is an ES module

# static verification (no browser, no dependencies)
node --check script.js
node scripts/check.mjs

# headless browser verification (Chrome + local server)
python3 -m http.server 8123 &
node scripts/verify.mjs

# one-off CDP inspection or screenshot
node scripts/browser-check.mjs --url "http://127.0.0.1:8123/?selftest=1"
node scripts/browser-check.mjs --url "http://127.0.0.1:8123/?demo=1" --wait 16000 --out screenshots/hero.png

# deploy (GitHub Pages serves the repository root from main)
git push origin main
```

`?selftest=1` runs 25 pure-rule and serialization checks and sets the document title to `SELFTEST PASS 25/25`. `?demo=1` auto-leads one human combination after dealing so a screenshot shows a real trick. `?seed=123` makes the shuffle reproducible.

## 3. Architecture

Load order: `index.html` → `style.css` → `script.js` (module; import map pins `three@0.160.0` and `three/addons/`).

`script.js` is one module with these layers, in order:

1. **Data** — `RANKS`, `COLORS`, `SEATS`, `DECK`, `TILE_BY_ID`, combination types and scoring constants.
2. **Rules** — `buildDeck` → `detectCombo` → `compareScores` / `beats` → `allCombos` → `combosBeating` → `scorePiles`. Pure functions; no DOM or Three.js.
3. **AI** — `chooseLead` and `chooseFollow` are deterministic when passed `{ deterministic: true }`; otherwise they add jitter/challenge probability. `simulateRound(seed)` is the fuzz harness used by the self-test.
4. **State** — one mutable `state` object (hands, captures, centre, lead/best, scores, history, log, snapshot) plus `prefs` and `stats`. `serializableState` is the **only** boundary that converts tile objects to IDs; use it for snapshots, saves and exports.
5. **Flow** — `beginMatch` → `dealRound` → `beginTrick` → `leadTrick` / `submitPlay` → `resolveTrick` → `endRound` / `startNextRound`; `undoLastTrick` restores the pre-trick snapshot and restarts the trick.
6. **3D scene** — `createScene` dynamically imports Three.js. `scene.deal`, `scene.sync`, `scene.collect`, `scene.flipHumanHand` map state to tile targets; the scene never owns rules. `scene.setTheme` regenerates felt/wood/back textures, recolours the table and lights, and disposes the old maps.
7. **Audio** — `StudioAudio` synthesises everything; the context is unlocked by the first pointer/key event.
8. **UI** — `renderAll` → HUD, scoreboard, hand list, selection dock, coach, log, inspector; `applyLanguage` swaps all `data-i18n` text and re-renders the 3D labels. `applyFontSize` sets `--fs-scale` and `applyTheme` sets `data-theme`; both persist in prefs and are exposed in the Display modal.
9. **Persistence/export** — `saveMatch`, `savePrefs`, `saveStats`, `loadMatch`, `buildExport`, `exportGame`.
10. **Self-test** — `selfTest()` and `simulateRound()`; also exposed through `window.LeabTui`.

Boot order: `loadPrefs` → `loadStats` → `applyLanguage` → `bindEvents` → `loadMatch` (resume if valid, else `makeState`) → `createScene` → `dealRound` or resume. If the CDN/WebGL fails, `#bootError` appears and the rule/coach panels still work.

Key constants and formats:

```text
TABLE_Y = 0.30; HAND_RADIUS = 4.12; CENTER_RADIUS = 2.05
TILE_RADIUS = 0.455; TILE_THICKNESS = 0.15
rank power: soldier 1, cannon 2, horse 3, chariot 4, elephant 5, advisor 6, general 7
scorePiles: 0..7 => -2..5; 8 => 16
storage: leabtui.match.v1 / leabtui.prefs.v1 / leabtui.stats.v1
export: leab_tui_3d_game.json, format "leab-tui-3d-save", version "1.1.0"
prefs: theme mahogany|jade|midnight; fontSize sm|md|lg|xl; CSS --fs-scale 0.9/1/1.12/1.24
```

Persistence saves `{format, version, savedAt, game}` where `game` is the ID-based `serializableState`. The snapshot for Undo is also ID-based; `undoLastTrick` maps IDs back to `TILE_BY_ID`. Do **not** store live tile objects in a snapshot or in localStorage — that was a real bug during the build.

`window.LeabTui` exposes: `getState`, `getStats`, `getPrefs`, `getLanguage`, `setLanguage`, `newMatch`, `nextRound`, `lead`, `follow`, `toggleTile`, `clearSelection`, `hint`, `undo`, `exportPayload`, `selfTest`, `simulateRound`, `detectCombo`, `getCamera`, `resetView`, `topView`, `setFast`, `inspect`, `inspectHidden`, `applyFontSize`, `applyTheme`, `getDisplay`.

## 4. Decisions and constraints

- **Rules contract.** The source is Navee Angsuputiphant's 2016 Thai description (see `docs/RULES.md`). It is ambiguous about Ngoh Hoo and about mixed-colour six-tile sets. This studio's interpretation: a straight is one colour; See Hoo duplicates one core rank; Ngoh Hoo duplicates two; Lak Hoo is the small Chariot–Horse–Cannon core with all three ranks doubled; same-rank sets are Soldiers only. Do not silently change these; update `docs/RULES.md`, `detectCombo`, the self-test and the rules modal together.
- **Comparison order.** For single/pair/Soldier sets: rank then colour. Sa Hoo: big vs small, then colour. See Hoo: duplicated pair rank then colour. Ngoh Hoo: highest duplicated rank, second duplicated rank, then colour. Lak Hoo: colour only. Equal rank + colour never overtakes; the earlier play stays best. `beats` is strict (`> 0`).
- **Face-down play.** Every follower must send exactly the called count. A set must be revealed to compete. The leader always reveals. This is intentional and is the core of the game; do not auto-reveal or let unrevealed sets win.
- **The 3D scene is a view.** `scene.sync(state)` is idempotent; it animates only targets that differ. Never mutate `state` from inside the scene except through the public callbacks (`toggleTile`, `inspect*`).
- **Camera.** Desktop home is `(0, 10.2, 11.4)` target `(0, 0.22, 0.9)`; portrait is `(0, 14.3, 17.2)` target `(0, 0.18, 0.7)` with FOV 46. The wider portrait framing is required so the human hand is not cropped. The mobile hand dock must stay under ~110 px or it hides the hand.
- **Audio.** `StudioAudio.play` returns until `unlocked` is true. Never create/resume an `AudioContext` before a user gesture; Chrome logs autoplay warnings otherwise. The graph is `source → filter → gain → panner → master (0.8) → compressor → analyser → destination`. If the context is still suspended at the first play, `play` calls `resume()` and retries; this covers the first-gesture race. Keep the analyser tap: `verify.mjs` measures a real RMS peak. Do not lower the master to the old 0.32 without re-measuring; it was effectively inaudible.
- **CDN pin.** `three@0.160.0` in the import map. Do not float the version. If the CDN fails, the table cannot render; that is a documented limitation, not a reason to inline Three.js.
- **CSP.** `script-src` allows `'unsafe-inline'` only because import maps are inline. The app has no inline event handlers. Do not add remote fonts or analytics.
- **Display settings.** Font size scales the interface through `--fs-scale` on `html[data-font-size]`, never the 3D table. Five themes are `html[data-theme]` CSS variables plus `SCENE_THEMES`: Mahogany, Jade Court, Midnight Lacquer, Parchment and Daybreak. `scene.setTheme` must dispose the replaced felt/wood/back textures. Never add a theme that only recolours the panels and leaves the 3D scene behind.
- **No build step.** Keep it three files. Scripts may verify, screenshot, or publish, but must not generate the runtime source.

## 5. Known issues

- The two- and three-player traditional variants are not implemented; only four seats.
- `Ngoh Hoo` and the `Lak Hoo` colour rule are interpretations of an ambiguous source; documented in `docs/RULES.md`.
- Undo is a one-trick rewind and is not available after a page reload (the snapshot is deliberately not persisted; only the live game is).
- The AI is heuristic, not a search engine. It conserves strong sets and challenges with a probability, but it does not model opponents' hands.
- The mobile layout is verified in headless Chrome at 390×844, not on physical iOS/Android hardware. Safe-area insets are not handled.
- The page requires network access for Three.js. The HUD and coach work without it, but the table does not.
- The title/meta screenshots use the `?demo=1` seed state; regenerating them changes the hand and may change the coach text.
- Five themes ship, including two bright palettes (Parchment, Daybreak); there is no dedicated high-contrast mode. Text size scales the interface but not the 3D table (by design).

## 6. Continuity

- **Deployed copy:** GitHub Pages from `main`, repository root; live URL above.
- **Local master:** `~/Projects/leab-tui-3d`.
- **Build record:** `STATE.md` and `state.json` record the session start/end, wall-clock duration, token counts, harness and model. Update both if you make a new measured release.
- **Skill:** `leab-tui-studio` in `~/.config/opencode/skills/` and the public mirror `~/Projects/opencode-skills/leab-tui-studio/`.
- **Rule source:** <http://naveea.blogspot.com/2016/03/blog-post.html>.
- **Verification:** `docs/TESTING.md`; the self-test is the fastest regression check. Run `node scripts/check.mjs` before every push.
