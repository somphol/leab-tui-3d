# Architecture

## Shape of the app

Leab-Tui 3D is a **static single page** with three runtime files:

```text
index.html   document, import map, static HUD, modals
style.css    design tokens, layout, responsive rules, modal system
script.js    one ES module: data → rules → AI → state → flow → 3D → audio → UI
```

There is no bundler, framework, server, database or API key. `script.js` dynamically imports `three@0.160.0` and `OrbitControls` from jsDelivr so the rule engine, coaching, scoring and persistence still initialise if WebGL or the CDN fails.

## Construction order

```text
index.html
  └─ import map (three + three/addons/)
  └─ script.js type="module"

boot()
  loadPrefs()              localStorage prefs + language
  loadStats()              localStorage statistics + history
  applyLanguage(LANG)      translate static DOM, rules, about, empty panels
  bindEvents()             buttons, modals, keyboard, visibility
  loadMatch()              validate saved game or return false
  makeState()              only if no valid save
  createScene()            dynamic import; may throw → #bootError
  dealRound()              shuffle, deal, animate, beginTrick()
  optional ?selftest / ?demo / ?seed
```

The scene is created **after** the first render so the UI is usable during the Three.js download. `dealRound` waits for the scene's deal promise before `beginTrick`, but falls back to a timeout if `scene` is null.

## The layers inside `script.js`

| Section | Responsibility | Must not |
| --- | --- | --- |
| Data | `RANKS`, `COLORS`, `SEATS`, `DECK`, `TILE_BY_ID` | depend on DOM |
| Rules | deck, combo detection, comparison, scoring | mutate state |
| AI | `chooseLead`, `chooseFollow`, `simulateRound` | touch DOM or Three.js |
| State | one mutable `state`, `prefs`, `stats` | store Three.js objects |
| Flow | deal, lead, submit, resolve, round, undo | render pixels directly |
| Scene | tile meshes, table, camera, animations | decide game outcomes |
| Audio | synthesised effects | create a context before a gesture |
| UI | render functions, language, inspector, coach | duplicate rule logic |
| Persistence | save/load/export | persist live objects |
| Self-test | rule and conservation checks | require a GPU |

## Rules model

A tile is a plain object:

```js
{ id: "r-advisor-0", rank: "advisor", power: 6, color: "r", hanzi: "仕" }
```

A combination is:

```js
{
  type: "seehoo",
  count: 4,
  tiles: [tile, ...],
  score: [6, 1],       // duplicated rank, red=1 / black=0
  color: "r",
  set: "big",
  dup: [6],
  key: "seehoo:6,1:..."
}
```

`detectCombo(tiles)` is the single source of truth for legality. The AI, the coach, the inspector and the self-test all call it. `allCombos(hand)` generates candidates by grouping rank/colour and by enumerating the two straight cores and the subsets of doubled ranks.

`beats(a, b)` is strict: it requires the same `type` and a lexicographically greater `score`. Equal sets do not overtake. This encodes the “earlier play wins” rule.

## State machine

```text
dealing ──► lead ──► follow ──► resolving ──► lead (next trick)
                 │                     │
                 └──── undo ───────────┘
                                       └──► roundEnd ──► lead (next round)
                                                     └──► matchEnd
```

- `beginTrick` stores `state.snapshot = { game: serializableState(state), stats }` before changing anything.
- `leadTrick` removes the leader's tiles, sets `lead`/`best`, and advances the turn.
- `submitPlay` removes exactly `lead.count` tiles; `revealed` is true only when the set matches the call and strictly beats `best`.
- `resolveTrick` adds all centre tiles to the winner's captures, records `lastTrick`, clears the centre, and schedules the next trick or `endRound`.
- `undoLastTrick` restores the ID-based snapshot, maps IDs back to tiles, restores `stats`, and restarts the trick.
- `endRound` computes piles → points, updates scores/stats/history, saves, and opens the summary.
- `startNextRound` rotates the dealer, uses the last trick winner as the next leader, and re-deals.

## 3D scene

`createScene` returns an API, not a second game model:

```js
{ deal, sync, collect, flipHumanHand, setSelected, reset,
  resetView, toggleTopView, toggleCinema, getState }
```

`placementMap(state)` decides every tile's location:

| Placement | Position | Face |
| --- | --- | --- |
| hand | polar fan around the seat, radius 4.12; human fan wider | up for seat 0, down for AI |
| centre | 1–3 in a row, 4–6 in a grid, at radius 2.05 toward the seat | `entry.revealed` |
| capture | 2×4 grid of four-tile stacks at radius 3.36 | up |

The scene stores `root → lift → tilt` groups:

- `root.position` is the animated table position.
- `lift.position.y` is the hover/selection lift.
- `tilt.rotation.x` is the flip: `0` face-up, `π` face-down.

`moveTile` and `setFace` keep their own animation records; `sync` skips a target if it is already within 0.004 units, so repeated renders do not restart animations. The render loop also pulses the active seat ring, bobs the turn chevron, drifts dust and applies camera tweens.

## Camera and responsive framing

- Desktop: `PerspectiveCamera(40)`, home `(0, 10.2, 11.4)`, target `(0, 0.22, 0.9)`.
- Portrait (`max-width: 640px`): FOV 46, home `(0, 14.3, 17.2)`, target `(0, 0.18, 0.7)`.
- `OrbitControls`: damping, min distance 7.4, max distance 18.5, polar 0.14–1.32, pan clamped to radius 4.2.
- The wider portrait framing is required because the human hand fans across the full stage width and the mobile dock overlays the bottom ~100 px.

## Serialization boundary

`serializableState(state)` is the **only** function allowed to cross the live-object boundary. It converts:

- hands/captures/centre tiles → IDs;
- every combo → `{type, count, tiles:[id], score, color, set, dup, key}`;
- removes `fast` and `snapshot`.

The saved payload is:

```json
{
  "format": "leab-tui-3d-save",
  "version": "1.0.0",
  "savedAt": "2026-11-04T...",
  "game": { "phase": "...", "hands": [["r-general-0"], ...], ... }
}
```

`loadMatch` validates the format, four hands of ≤8 valid IDs, four scores, and a known phase; then rebuilds tile objects and centre combos with `detectCombo`. A saved `roundEnd`/`matchEnd` keeps its phase and reopens the summary. Undo snapshots are intentionally not persisted.

## Audio

`StudioAudio` owns a lazily created `AudioContext`, a master gain (0.32) and one noise buffer. `play(name, seat)` pans by seat and synthesises:

- `clack` — band-passed noise + 150 Hz/78 Hz sine thumps.
- `flip` — high-passed click.
- `shuffle` — nine scheduled noise bursts.
- `sweep` — band-pass noise sweeping 380 → 2600 Hz.
- `win` / `lose` — arpeggios.
- `click` / `undo` — short tones.

`play` returns immediately until the first pointer/key event calls `resume()`. This avoids Chrome's autoplay warning.

## Failure model

- Missing WebGL 2 or a failed `import("three")` → `#bootError` overlay; the rule engine, coach, scoreboard and export still work.
- Invalid saved game → silently start a new match.
- `localStorage` denied (private mode) → saves are skipped; the game still runs.
- Lost CDN → no table; the page does not crash.

## Performance notes

- 32 tiles, one 96-segment table, 4 seat rings, 4 sprites, 220 dust points. No post-processing, no instancing (the tile count is small enough).
- 14 face textures (rank × colour) are cached; one shared back texture; one felt texture; one wood texture.
- Shadow maps: 2048 for the key light, 1024 for the warm spot. Pixel ratio capped at 2.
- The render loop uses a single `setAnimationLoop`; `dt` is clamped to 80 ms for stable lift damping.
- `prefers-reduced-motion` shortens CSS animation/transition durations; Three.js animations are kept short but not removed because the game uses them to communicate state.

## Why no framework

The deliverable is one offline-friendly page with three readable source files. A framework would add a build step, a dependency tree and a runtime layer that does not help the rules or the small scene. The cost is that UI rendering is manual; the `renderAll` boundary keeps that manageable.
