# Architecture

## Shape of the app

Leab-Tui 3D is a **static single page** with five runtime files:

```text
index.html        document, import map, static HUD, modals, lobby, chat/voice controls
style.css         design tokens, layout, responsive rules, modal system, chat/voice
script.js         one ES module: data → rules → AI → state → flow → 3D → audio → UI → network
peer-manager.js   room codes, lazy PeerJS loader, host/client endpoints, loopback test pair
voice-chat.js     full-mesh media calls, mic mute, deafen, remote audio, speaking meter
security.js       PIN policy, generated passphrases, deny-list, SHA-256 digest
```

There is no bundler, framework, server, database or API key. `script.js` dynamically imports `three@0.160.0` and `OrbitControls` from jsDelivr so the rule engine, coaching, scoring and persistence still initialise if WebGL or the CDN fails. `peer-manager.js` lazily injects the pinned PeerJS UMD bundle only when a room is opened.

## Construction order

```text
index.html
  └─ import map (three + three/addons/)
  └─ script.js type="module"

boot()
  loadPrefs()              localStorage prefs + language + display
  loadStats()              localStorage statistics + history
  applyFontSize()          html[data-font-size] + --fs-scale
  applyTheme()             html[data-theme] (scene reads prefs.theme at creation)
  applyLanguage(LANG)      translate static DOM, rules, about, empty panels
  bindEvents()             buttons, modals, keyboard, visibility
  loadMatch()              validate saved game or return false
  makeState()              only if no valid save
  createScene()            dynamic import; may throw → #bootError
  dealRound()              only when the launch prompt is skipped or a save resumes
  optional ?selftest / ?demo / ?seed
  optional launch overlay / ?mode=host / ?room=
```

A normal load does not deal behind the overlay. It asks for **Your name** and a mode first; a restored save appears as **Resume match**. This avoids a phantom game that would otherwise be saved before the player chose to play.

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
| Network | lobby, seats, host authority, redaction, bot takeover | let a guest run the engine |
| Chat | host relay, attribution, history, rate limit | trust guest HTML |
| Security | approval queue, PIN policy/hash, connection/rate/payload caps | call a PIN authentication |
| Voice | mesh calls, mute/deafen, analyser pulse | route audio through the data channel |
| Self-test | rule, conservation and redaction checks | require a GPU or network |

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
   │
   └──► draft (experimental) ──► lead
                 │                     │
                 └──── undo ───────────┘
                                       └──► roundEnd ──► lead (next round)
                                                     └──► matchEnd
```

- `startDraft` (experimental, default off) builds a public pool and rotates seats; `draftPick` applies one 2-tile pick and `finishDraft` hands over to `beginTrick` with the red-General holder leading.
- `beginTrick` stores `state.snapshot = { game: serializableState(state), stats }` before changing anything.
- `leadTrick` removes the leader's tiles, sets `lead`/`best`, and advances the turn.
- `submitPlay` removes exactly `lead.count` tiles; `revealed` is true only when the set matches the call and strictly beats `best`.
- `resolveTrick` adds all centre tiles to the winner's captures, records `lastTrick`, clears the centre, and schedules the next trick or `endRound`.
- `undoLastTrick` restores the ID-based snapshot, maps IDs back to tiles, restores `stats`, and restarts the trick.
- `endRound` computes piles → points, updates scores/stats/history, saves, and opens the summary.
- `startNextRound` rotates the dealer, uses the last trick winner as the next leader, and re-deals.

## Multiplayer architecture

The network layer is a **host-authoritative projection**, not a lockstep engine.

```text
host browser                         guest browser
┌──────────────────────────┐         ┌──────────────────────────┐
│ lobby + seat profiles    │         │ lobby view               │
│ engine (deal/AI/score)   │         │ no engine                │
│ sanitizeForSeat(state, s)│──state──►│ hydrateRemoteState(raw)  │
│ publishState per guest   │         │ scene.sync(state)        │
│ handleRemoteAction(seat) │◄─action──│ humanLead/humanFollow    │
└──────────────────────────┘         └──────────────────────────┘
```

- `MY_SEAT` replaces the hard-coded seat 0 in the UI, coach, hand list, scene and pointer handling. In solo it is 0; a guest receives it in `welcome`.
- `SEAT_PROFILES` is `null` in solo, so `isBotSeat(seat)` falls back to the historical "seat 0 is human, 1–3 are AI" rule. In a room it carries `host|human|bot` and the handle.
- `isBotSeat` is the only scheduler predicate. `scheduleAI` returns unless the current seat is a bot. Remote humans are waited on; disconnected humans are converted to bots.
- `saveMatch` is the publication point: it writes localStorage on the host and calls `queuePublish()`. `publishState` builds one redacted payload per connected guest. It is throttled by `NET_TICK_MS` (40 ms) and refuses to run before `net.started`.
- `sanitizeForSeat` is the **only** privacy boundary. `serializableState` runs first, then other hands and unrevealed centre/log/last-trick entries become `ghost-<seat>-<index>` ids. The host-only `hiddenTags` map is deleted by `serializableState`.
- Guests own the same 32 back-only ghost meshes. The tag map is stable for a round, so a face-down card moves from hand to centre as the same mesh.
- `scene.setViewSeat(MY_SEAT)` rotates the table world group by `-SEATS[seat].angle`, putting the local seat at the bottom of the screen. Camera, lights and floor stay fixed.

The full message set, redaction table and invariants are in [PROTOCOL.md](PROTOCOL.md); operations and troubleshooting are in [MULTIPLAYER.md](MULTIPLAYER.md).

## Security boundary

The room has three gates, in order:

1. **Room code** — six unambiguous characters. It identifies the host PeerJS id, so it is not a secret from anyone who has it.
2. **PIN** — exactly 5 digits, common/repeat/sequence checks. The host stores only a SHA-256 digest in memory; the plain PIN is shown once in the host panel for copying and is never in the roster, state, export, URL or `localStorage`.
3. **Host approval** — every request enters a pending queue by default. Only `approvePending` calls `acceptGuest`, which assigns a seat and sends `welcome`.

`requestGuest` is async because it hashes the candidate PIN. A wrong PIN increments a per-room counter; eight failures set a 60-second `lockUntil`. Pending requests expire in 120 seconds. Denied, wrong-PIN, busy, expired and in-progress connections receive `rejected` and are closed.

The host transport also enforces caps: 16 live connections, 80 messages per 10 s per connection, 16 KB inbound envelopes, six pending requests. Voice calls are accepted only from a peer already in the approved roster. Chat is escaped and rate-limited.

Assume the attacker has read this file. The PIN is a brute-force cost, not authentication; approval is the access-control decision. See [SECURITY.md](../SECURITY.md).

## Chat and voice

**Text chat** is a host-relayed data-channel feature:

```text
guest input → {type:"chat", text} → host validates, appends once
             → {type:"chat", entry} to every guest (including sender)
host input  → hostChat() → append once → broadcast
```

`chatHistory` is a 80-entry in-memory ring, capped at 200 characters per message. A guest may send at most one message per 350 ms. The host includes the last 30 entries in `welcome` so a new guest sees context. Messages are rendered with `textContent`/`escapeHTML`; there is no HTML chat.

**Voice** is opt-in and independent of the data channel:

- `VoiceChat` installs one `peer.on("call")` handler and initiates calls to voice-active peers.
- The lexicographically larger peer ID initiates, so both sides agree without duplicate calls.
- `join()` requests `getUserMedia({audio:{echoCancellation,noiseSuppression,autoGainControl}})`; a user gesture and HTTPS/localhost are required.
- `setMicMuted` sets `track.enabled = false`; it never stops the track or closes the call.
- `setDeafened` sets `.muted` on every remote `<audio>` element; it never changes the local mic.
- Remote streams are attached to hidden `<audio class="remote-player-audio" autoplay playsinline>` elements in `#remoteAudio`.
- An `AudioContext` analyser per stream drives a 120 ms RMS meter. The analyser is **not** connected to `destination`; playback is the `<audio>` element. A green `.speaking` pulse is applied to lobby avatars and scoreboard seats.
- Voice-active state is relayed as `voice-state`; the roster carries `peerId` and `voice`.

Voice is a full mesh: every active speaker calls every other active speaker. With four humans that is six media paths; uplink grows with the number of speakers. No audio is sent through the host data channel or stored.

## 3D scene

`createScene` returns an API, not a second game model:

```js
{ deal, sync, collect, flipHumanHand, setSelected, setViewSeat, reset,
  resetView, toggleTopView, toggleCinema, getState }
```

`placementMap(state)` decides every tile's location. `gameState.mySeat ?? MY_SEAT` is the local seat; its fan is sorted and face-up, other hands are face-down.

| Placement | Position | Face |
| --- | --- | --- |
| hand | polar fan around the seat, radius 4.12; local fan wider | up for the local seat, down for everyone else |
| centre | 1–3 in a row, 4–6 in a grid, at radius 2.05 toward the seat | `entry.revealed` |
| capture | 2×4 grid of four-tile stacks at radius 3.36 | up |
| ghost | same positions, back-only mesh pool | down |

The scene stores `root → lift → tilt` groups:

- `root.position` is the animated table position.
- `lift.position.y` is the hover/selection lift.
- `tilt.rotation.x` is the flip: `0` face-up, `π` face-down.

`moveTile` and `setFace` keep their own animation records; `sync` skips a target if it is already within 0.004 units, so repeated renders do not restart animations. The render loop also pulses the active seat ring, drifts dust and applies camera tweens.

## Camera and responsive framing

- Desktop: `PerspectiveCamera(40)`, home `(0, 10.2, 11.4)`, target `(0, 0.22, 0.9)`.
- Portrait (`max-width: 640px`): FOV 46, home `(0, 14.3, 17.2)`, target `(0, 0.18, 0.7)`.
- `OrbitControls`: damping, min distance 7.4, max distance 18.5, polar 0.14–1.32, pan clamped to radius 4.2.
- The wider portrait framing is required because the human hand fans across the full stage width and the mobile dock overlays the bottom ~100 px.

## Serialization boundary

`serializableState(state)` is the **only** function allowed to cross the live-object boundary. It converts:

- hands/captures/centre tiles → IDs;
- every combo → `{type, count, tiles:[id], score, color, set, dup, key}`;
- removes `fast`, `snapshot` and `hiddenTags`.

The saved payload is:

```json
{
  "format": "leab-tui-3d-save",
  "version": "1.9.15",
  "savedAt": "2026-11-06T...",
  "network": false,
  "game": { "phase": "...", "hands": [["r-general-0"], ...], ... }
}
```

`loadMatch` rejects a payload with `network: true` (a peer room cannot be restored) and validates the format, four hands of ≤8 valid IDs, four scores and a known phase; then rebuilds tile objects and centre combos with `detectCombo`. A saved `roundEnd`/`matchEnd` keeps its phase and reopens the summary. Undo snapshots are intentionally not persisted.

## Display and themes

`prefs` carries `fontSize` (`sm|md|lg|xl`) and `theme` (`mahogany|jade|midnight|parchment|daybreak`).

- `applyFontSize(id)` sets `html[data-font-size]` and `--fs-scale`. Every CSS type size uses `calc(Npx * var(--fs-scale))`; the 3D table does not scale.
- `applyTheme(id)` sets `html[data-theme]` and calls `scene.setTheme(id)`. `SCENE_THEMES` supplies felt/wood/back palettes, rim/inlay/floor colours and light colours.
- `scene.setTheme` regenerates the felt, wood and tile-back CanvasTextures, recolours the materials and lights, updates the scene background/fog, and disposes the replaced textures. It is the only part of the scene that allocates per interaction.
- The Display modal (`#displayModal`) contains the four font buttons and three theme cards. `renderDisplay()` keeps `aria-pressed` and `.active` in sync after a language switch or reload.
- The modal is opened from the `Aa` stage tool, not the top bar, to keep the mobile header uncluttered.

## Audio

`StudioAudio` owns a lazily created `AudioContext`, a master gain (0.8), a `DynamicsCompressorNode`, an `AnalyserNode` tap and one noise buffer. The analyser is inline so `verify.mjs` can measure a real RMS peak without altering the sound. `play(name, seat)` pans by seat and synthesises:

- `clack` — band-passed noise + 150 Hz/78 Hz sine thumps.
- `flip` — high-passed click.
- `shuffle` — nine scheduled noise bursts.
- `sweep` — band-pass noise sweeping 380 → 2600 Hz.
- `win` / `lose` — arpeggios.
- `click` / `undo` — short tones.

`play` returns immediately until the first pointer/key event calls `resume()`. If the context is still suspended when a sound is requested, `play` calls `resume()` and retries after the promise resolves. This covers the first-gesture race and avoids Chrome's autoplay warning.

## Failure model

- Missing WebGL 2 or a failed `import("three")` → `#bootError` overlay; the rule engine, coach, scoreboard and export still work.
- Invalid saved game → silently start a new match.
- `localStorage` denied (private mode) → saves are skipped; the game still runs.
- Lost CDN → no table; the page does not crash.
- PeerJS CDN blocked → the lobby reports a load error; solo still works.
- Broker unreachable → host/join status shows a timeout or `peer-unavailable`; the table stays solo.
- Guest data channel drops → host converts the seat to a bot; guest shows "Table closed".
- Host closes → guests keep the last rendered state behind a "Table closed" panel; no host migration.
- Microphone denied or unavailable → chat and the game continue; the voice status explains the failure.
- A remote voice call fails → its `<audio>` entry is removed; the peer can rejoin voice.

## Performance notes

- 32 tiles plus 32 back-only ghost meshes, one 96-segment table, 4 seat rings, 4 sprites, 220 dust points. No post-processing, no instancing (the tile count is small enough). Ghost meshes share side/back/edge materials, so theme changes cover them.
- 14 face textures (rank × colour) are cached; one shared back texture; one felt texture; one wood texture.
- Shadow maps: 2048 for the key light, 1024 for the warm spot. Pixel ratio capped at 2.
- The render loop uses a single `setAnimationLoop`; `dt` is clamped to 80 ms for stable lift damping.
- `prefers-reduced-motion` shortens CSS animation/transition durations; Three.js animations are kept short but not removed because the game uses them to communicate state.

## Why no framework

The deliverable is one offline-friendly page with four readable source files. A framework would add a build step, a dependency tree and a runtime layer that does not help the rules or the small scene. The cost is that UI rendering is manual; the `renderAll` boundary keeps that manageable. WebRTC is kept in a separate module so the solo game never downloads PeerJS.
