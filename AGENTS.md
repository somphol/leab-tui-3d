# AGENTS.md — Leab-Tui 3D

## 1. What this is

A static, bilingual 3D teaching table for **เลี๊ยบตุ่ย (Leab-Tui)**, the Thai trick-taking game played with the 32 tiles of a Chinese chess set. One page, six source files plus a web-app manifest and icons, Three.js r160 from jsDelivr, no build step. It plays four seats — solo (1 human + 3 heuristic AI) or a serverless WebRTC table (host + up to 3 guests, empty seats filled by bots), with host-routed text chat, independent full-mesh voice chat (mic mute + deafen), late join/bot replacement, read-only viewers, same-tab host reload recovery, installable full-screen mode, and an off-by-default experimental draft deal. It implements Leab/Tui/Sa Hoo/See Hoo/Ngoh Hoo/Lak Hoo and Soldier sets, and adds a tile inspector, live coach, Hint, Undo & Learn, synthesised audio, autosave and JSON export.

It is **not** a gambling app, a game server, a tournament rules authority, or a complete implementation of the two- and three-player variants. Release **1.9.19**.

Live: <https://somphol.github.io/leab-tui-3d/> · Local master: `~/Projects/leab-tui-3d`

Multiplayer in one line: host browser authoritative, PeerJS public broker for signalling only, per-seat redaction on the wire, disconnect converts a seat to a bot.

## 2. Commands

```bash
cd ~/Projects/leab-tui-3d

# run
python3 -m http.server 8123
# open http://127.0.0.1:8123/
# an HTTP server is required: script.js is an ES module

# static verification (no browser, no dependencies)
node --check script.js
node --check peer-manager.js
node --check voice-chat.js
node --check security.js
node scripts/check.mjs

# headless browser verification (Chrome + local server)
python3 -m http.server 8123 &
node scripts/verify.mjs

# two-client WebRTC verification (needs outbound 0.peerjs.com)
node scripts/net-check.mjs

# one-off CDP inspection or screenshot
node scripts/browser-check.mjs --url "http://127.0.0.1:8123/?selftest=1"
node scripts/browser-check.mjs --url "http://127.0.0.1:8123/?demo=1" --wait 16000 --out screenshots/hero.png
node scripts/browser-check.mjs --url "http://127.0.0.1:8123/?lobby=1" --wait 3500 --out screenshots/lobby.png

# iPad emulation (viewport, DPR, touch/coarse pointer, Safari UA)
node scripts/browser-check.mjs --url "http://127.0.0.1:8123/?mode=solo" \
  --device ipad --orientation portrait --wait 6000 \
  --eval "LeabTui.getFraming()" --out screenshots/ipad-portrait.png

# deploy (GitHub Pages serves the repository root from main)
git push origin main
```

`?selftest=1` runs 38 pure-rule, serialization, redaction, chat and PIN checks and sets the document title to `SELFTEST PASS 38/38`. `?demo=1` auto-leads one human combination after dealing so a screenshot shows a real trick. `?seed=123` makes the shuffle reproducible.

Launch modes: no parameter or `?lobby=1` shows the lobby on every normal load, including a saved solo game (Resume match); `?mode=solo` skips it; `?mode=host&name=Ana` opens a room; `?room=482173` opens the join panel with the code prefilled (guests confirm their name); `&name=Bea` joins immediately. Network rooms are not resumable. The host/guest exit is **Leave room** in Actions, with confirmation.

## 3. Architecture

Load order: `index.html` → `style.css` → `script.js` (module; import map pins `three@0.160.0` and `three/addons/`; imports `peer-manager.js`). PeerJS 1.5.4 is injected lazily by `peer-manager.js` only when a room opens.

`script.js` is one module with these layers, in order:

1. **Data** — `RANKS`, `COLORS`, `SEATS`, `DECK`, `TILE_BY_ID`, combination types and scoring constants.
2. **Rules** — `buildDeck` → `detectCombo` → `compareScores` / `beats` → `allCombos` → `combosBeating` → `scorePiles`. Pure functions; no DOM or Three.js.
3. **AI** — `chooseLead` and `chooseFollow` are deterministic when passed `{ deterministic: true }`; otherwise they add jitter/challenge probability. `simulateRound(seed)` is the fuzz harness used by the self-test.
4. **State** — one mutable `state` object (hands, captures, centre, lead/best, scores, history, log, snapshot, hiddenTags) plus `prefs`, `stats`, `MY_SEAT`, `SEAT_PROFILES`, `net`. `serializableState` is the **only** boundary that converts tile objects to IDs; use it for snapshots, saves and exports. `hiddenTags` is host-only and stripped there.
5. **Flow** — `beginMatch` → `dealRound` → (`startDraft` → `draftPick` ×16 → `finishDraft`) → `beginTrick` → `leadTrick` / `submitPlay` → `resolveTrick` → `endRound` / `startNextRound`; `undoLastTrick` restores the pre-trick snapshot and restarts the trick. `isBotSeat(seat)` is the only AI-scheduling predicate.
6. **3D scene** — `createScene` dynamically imports Three.js. `scene.deal`, `scene.sync`, `scene.collect`, `scene.flipHumanHand`, `scene.setViewSeat` map state to tile targets; the scene never owns rules. The table and tiles live in a rotatable `world` group; 32 back-only ghost meshes draw other players' private hands.
7. **Audio** — `StudioAudio` synthesises everything; the context is unlocked by the first pointer/key event.
8. **UI** — `renderAll` → HUD, scoreboard, hand list, selection dock, coach, log, inspector; `applyLanguage` swaps all `data-i18n` text and re-renders the 3D labels. `renderChat` and `renderVoiceState` own the chat/voice panel. `applyFontSize` sets `--fs-scale` and `applyTheme` sets `data-theme`; both persist in prefs and are exposed in the Display modal. `renderRankReference` builds the pictorial rank ladder; `setRankReference` toggles it.
9. **Persistence/export** — `saveMatch`, `savePrefs`, `saveStats`, `loadMatch`, `buildExport`, `exportGame`.
10. **Multiplayer** — `sanitizeForSeat` (privacy boundary), `hydrateRemoteState`, `publishState`, `createHostRoom`, `joinRoom`, `startHostedMatch`, `convertSeatToBot`, `showLobby`, `renderLobby`, `hostChat`, `sendChat`, `syncVoicePeers`, `netSelfTest`.
11. **Self-test** — `selfTest()` and `netSelfTest()`; also exposed through `window.LeabTui`.

Boot order: `loadPrefs` → `loadStats` → `applyLanguage` → `bindEvents` → `loadMatch` (resume if valid, else `makeState`) → `createScene` → `dealRound` or resume → optional lobby / `?mode=host` / `?room=`. If the CDN/WebGL fails, `#bootError` appears and the rule/coach panels still work.

`peer-manager.js` owns only transport and room codes: `makeRoomCode`, `normalizeRoomCode`, `peerIdForCode`, `PeerHost`, `PeerClient`, `openHostWithRetry`, `createLoopbackPair`.

`voice-chat.js` owns the independent media mesh: `VoiceChat.join`, `joinWithStream`, `leave`, `setMicMuted`, `setDeafened`, `setPeers`, the analyser meter and remote `<audio>` attachment.

`security.js` owns the room-PIN policy: `validatePin`, `generatePin`, `pinStrength`, `hashPin` (SHA-256, memory only), plus a small common-password deny-list and sequence checks.

Key constants and formats:

```text
TABLE_Y = 0.30; HAND_RADIUS = 4.12; CENTER_RADIUS = 2.05
TILE_RADIUS = 0.455; TILE_THICKNESS = 0.15
rank power: soldier 1, cannon 2, horse 3, chariot 4, elephant 5, advisor 6, general 7
scorePiles: 0..7 => -2..5; 8 => 16
storage: leabtui.match.v1 / leabtui.prefs.v1 / leabtui.stats.v1 / leabtui.name.v1
export: leab_tui_3d_game.json, format "leab-tui-3d-save", version "1.9.19"
prefs: theme daybreak (default)|mahogany|jade|midnight|parchment; fontSize sm|md|lg|xl; autoAudio on by default; CSS --fs-scale 0.9/1/1.12/1.24
room: 482-173 (display; the peer id still carries a private leab prefix); peer id leabtui-v1-abc234; protocol 1; PeerJS 1.5.4; broker 0.peerjs.com:443
```

Persistence saves `{format, version, savedAt, network, game}` where `game` is the ID-based `serializableState`. The snapshot for Undo is also ID-based; `undoLastTrick` maps IDs back to `TILE_BY_ID`. Do **not** store live tile objects in a snapshot or in localStorage — that was a real bug during the build. Network saves carry `network: true` and are rejected by `loadMatch`.

`window.LeabTui` exposes: `getState`, `getStats`, `getPrefs`, `getLanguage`, `setLanguage`, `newMatch`, `nextRound`, `lead`, `follow`, `toggleTile`, `clearSelection`, `hint`, `undo`, `exportPayload`, `selfTest`, `simulateRound`, `detectCombo`, `getCamera`, `getFraming`, `resetView`, `resetBoard`, `topView`, `setTopView`, `setFast`, `inspect`, `inspectHidden`, `applyFontSize`, `applyTheme`, `getDisplay`, `getVersionState`, and `net` (`getState`, `openLobby`, `closeLobby`, `host`, `join`, `start`, `approve`, `deny`, `pauseJoins`, `resumeJoins`, `leave`, `solo`, `selfTest`, `sanitize`, `hydrate`, `roomCode`, `copyInvite`).

## 4. Decisions and constraints

- **Rules contract.** The source is Navee Angsuputiphant's 2016 Thai description (see `docs/RULES.md`). It is ambiguous about Ngoh Hoo and about mixed-colour six-tile sets. This studio's interpretation: a straight is one colour; See Hoo duplicates one core rank; Ngoh Hoo duplicates two; Lak Hoo is the small Chariot–Horse–Cannon core with all three ranks doubled; same-rank sets are Soldiers only. Do not silently change these; update `docs/RULES.md`, `detectCombo`, the self-test and the rules modal together.
- **Comparison order.** For single/pair/Soldier sets: rank then colour. Sa Hoo: big vs small, then colour. See Hoo: duplicated pair rank then colour. Ngoh Hoo: highest duplicated rank, second duplicated rank, then colour. Lak Hoo: colour only. Equal rank + colour never overtakes; the earlier play stays best. `beats` is strict (`> 0`).
- **Face-down play.** The leader and every follower send exactly the called count **face-down**. When all four have sent, the leader reveals automatically; each follower then decides to show or stay hidden, in turn. A set must be revealed to compete. Do not auto-reveal a follower or let an unrevealed set win.
- **Table rules.** `prefs.target` (20/50/100), `prefs.direction` (`cw`/`ccw`, `nextSeat` is the only turn-order helper) and `prefs.mode` (`piles`/`bid`) are copied into `state` by `beginMatch`. Changing mode mid-match is ignored until the next match; target and direction apply live.
- **Bid mode.** After the deal, phase `bid`; `bidOrder` starts at the leader and follows `nextSeat`. `bidForbidden()` blocks the last bidder from making the total exactly 8. `endRound` uses bid + 5 (zero bid + 3) on a hit, minus the difference on a miss, times `state.multiplier`.
- **Draft deal (experimental).** `prefs.draftMode` / `state.draftMode` default false. A host-only toggle exists in the lobby (before the room starts) and in Actions (applies to the next deal, disabled during a draft). `startDraft` shuffles a public pool, orders seats from `nextSeat(dealer)`, and each seat takes exactly 2 tiles for 4 cycles; `finishDraft` requires all four hands at 8 and gives the lead to the red-General holder. Bots pick two tiles at random (`randomDraftPair` / `aiDraftPick`), seeded from the round when a seed is set. Redraw is disabled while draft mode is on. The pool is public on the wire; hands stay redacted. Guests relay picks as `kind:"draft"`. Do not present this as a standard rule; the source has no draft. Design record: `docs/DRAFT.md`.
- **Redraw (โละ).** `canRedraw` requires no tile from the red Elephant up before the first play. `applyRedraw` increments `redraws`, sets `multiplier = redraws + 1`, and redeals with the requester as leader. Multipliers apply at `endRound` and reset each round.
- **Chuan special.** `canClaimChuan` requires the last follower, seven piles (28 tiles), one tile left and it is a Soldier. `claimChuan` adds it, sets an unbeatable best and resolves; the winner reaches 32 tiles.
- **Captured visibility.** `state.captureHidden` is a per-seat boolean array parallel to `captures`. A hidden tile stays face-down in the winner's pile and is never flipped by the UI. `serializableState` carries the flags; saves and network state preserve them. Clicking a captured tile opens `pileModal` with the pile left-to-right, face-up or back.
- **Four seats, not six.** The 32-tile / four-wind rule contract fixes the table at four. Multiplayer supports host + up to three guests; empty seats are bots. Do not add seats without changing the deck, deal and `docs/RULES.md`. The original feature request mentioned six players (a poker-template assumption); the deviation is documented in `docs/MULTIPLAYER.md`.
- **Host authority.** Only the host runs the engine, deals, scores and bot decisions. Guests send `{type:"action"}` and render the state they receive. `saveMatch` is the host's publish point; `publishState` refuses before `net.started`. Guests never call `leadTrick`/`submitPlay`.
- **Redaction.** `sanitizeForSeat(state, seat)` is the only privacy boundary. Other hands and unrevealed centre/log/last-trick entries become `ghost-<seat>-<index>` ids; `hiddenTags`, `snapshot`, `selected` and `fast` are stripped. Captures are public. Never send the same object to two guests.
- **Ghost stability.** Tags are assigned at deal (`state.hiddenTags`) and restored by Undo, so a face-down card moves as the same ghost mesh. Do not derive the tag from the tile id or from the current hand index.
- **Seat generalisation.** `MY_SEAT` replaces hard-coded seat 0 in UI, coach, hand list, pointer and public API. In solo `MY_SEAT = 0` and `SEAT_PROFILES = null`, so the historical solo behaviour is unchanged. `isBotSeat` is the only scheduler predicate.
- **View rotation.** `scene.setViewSeat(MY_SEAT)` rotates the `world` group by `-SEATS[seat].angle`; lights, camera and floor stay fixed. Do not rotate the camera to fake a seat view.
- **Disconnect.** A dropped guest keeps their seat, hand, captures and score; the profile becomes a bot and the host schedules AI if it is their turn. Do not delete or reseat mid-match.
- **Host reload recovery.** `saveHostRecovery`/`loadHostRecovery`/`resumeHostRoom`/`resumeHostFlow` restore the same-tab room; `pagehide` saves and closes the host peer to release the code, then boot reopens it with `openHostWithRetry({ code })`. Do not store this blob in localStorage, the export, or the wire; do not promise cross-tab/device host migration. The host gets a new PIN; guests' tokens are the rejoin credential.
- **Late join / bot replacement.** `requestGuest` queues a started-room guest after the PIN; `approvePending` chooses `approveBotSeat` (first bot, preserves hand/score, new token, sends the state) or `approveViewer`. Never assign seat 0 to a guest. A replaced bot's old rejoin token is discarded.
- **Viewers.** `net.viewers` is separate from `SEAT_PROFILES`; `MY_SEAT = -1`; `sanitizeForSeat(state, -1)` must ghost every hand and unrevealed set; hide the hand dock/panel/chat/voice and block actions. Viewers have no rejoin token and must be re-approved after a reload. `publishState` loops viewers with seat -1.
- **Join suppression.** `net.security.suppressUntil` pauses new requests (`rejected.suppressed`); rejoin tokens bypass it. The host can pause/resume from the host panel or a pending request; the 30-minute value is stored in the host recovery blob.
- **Copy room info.** The in-room Actions button and the host's room-chip click copy code, link and current PIN; guest chip click copies only the invite link. Use the current PIN after host recovery.
- **Guest auto-rejoin.** `acceptGuest` issues a 16-byte `rejoinToken` per seat and sends it in `welcome`; the guest stores `{code, seat, token, name}` in `sessionStorage`. `hello.rejoinToken` is checked in `requestGuest` **before** the PIN/approval gate and calls `reattachGuest`, which stops the bot, restores the human profile on the same seat, and sends `welcome` with `rejoin: true`, `started` and `sanitizeForSeat(state, seat)`. The guest UI shows a “Reconnecting to your seat…” view while this happens; on failure it falls back to the prefilled join form. A solo `forceReload` adds `resume=1`, and boot restores the saved match instead of showing the launch menu. For a host, `saveHostRecovery` writes `{code, state, profiles with rejoinTokens, stats, chat}` to `sessionStorage` (never localStorage/export); boot detects it, reopens the **same** PeerJS code, hydrates the state, resumes the phase/timers and issues a new PIN. Guests show “The host is restarting…” and retry. `leaveRoom` clears the blob; closing the tab clears sessionStorage. The token survives disconnect-to-bot and the start-of-match bot fill; an intentional Leave clears it. Invariants: never put the token in the roster, state, URL, export, logs or localStorage (sessionStorage only), and never let a rejoin mint a new seat. A **same-tab** reload recovers the host room; closing the tab or another device still ends it. Do not promise cross-tab/device migration.
- **No cross-tab/device host migration.** A host reload in the **same tab** recovers from sessionStorage (see above); closing the tab or moving to another device ends the room. Guests see "Table closed". Do not promise migration.
- **Approval is the real gate.** A guest is not seated on `hello`; `requestGuest` checks the PIN and suppression, then queues. Lobby approval calls `acceptGuest`; a started table calls `approveBotSeat` or `approveViewer` via `approvePending`. Pending requests expire; denied/wrong-PIN/suppressed connections close. Do not auto-seat a started guest without host approval.
- **PIN is a gate, not authentication.** Exactly 5 digits, common/repeat/sequence checks. Only 100,000 possibilities, so approval remains primary. Store only the SHA-256 digest in memory. Never put the plain PIN in state, roster, URL, export or localStorage. The host's plain copy is UI-only for Copy room info.
- **Assume the source is public.** The code, protocol, policy and deny-list are readable. Do not rely on hidden message names or secret endpoints. Caps are part of the boundary: 16 connections, 6 pending, 80 messages/10 s, 16 KB payload, 200-char/350 ms chat, six action tiles.
- **Voice calls are allowlisted.** `VoiceChat._answer` closes calls from peer IDs not in the approved roster; the host PeerJS id is deterministic from the room code.
- **Chat goes through the host.** `sendChat` → host `hostChat` → append once → broadcast one entry to every guest. Cap at 200 chars and rate-limit guests (350 ms). Never inject chat with `innerHTML`.
- **Voice does not go through the host.** It is a full mesh of PeerJS media calls between voice-active humans. The host only relays `voice-state` and the roster's `peerId`/`voice` flags. Do not route voice over the data channel.
- **Mic mute is `track.enabled = false`**, not `track.stop()` and not closing the call. Deafen is `audio.muted` on every remote element, not the local mic.
- **Voice is opt-in.** Never call `getUserMedia` on load; it must be a user gesture with HTTPS/localhost. Render `<audio autoplay playsinline>` only after a stream arrives. `prefs.autoAudio` (default on) preloads the mic only from the Connect/Start click, skips silent `?room=&name=` auto-joins, and joins with the preloaded stream once the seat exists. Denial never blocks the match; the **Join audio** pill remains.
- **Speaking meter** uses `AudioContext` analysers and a 120 ms interval; it must not connect to `destination` (playback is the `<audio>` element).
- **The 3D scene is a view.** `scene.sync(state)` is idempotent; it animates only targets that differ. Never mutate `state` from inside the scene except through the public callbacks (`toggleTile`, `inspect*`).
- **Camera.** The default is a **2D top view** (the HUD label is 2D / 3D). `fitTopFraming()` computes the distance from `TABLE_FIT_RADIUS` (7.08), the live canvas aspect, and the space between a 54 px HUD reserve and the measured hand dock; it shifts the target so the rim clears the dock, and re-fits when the dock expands. FOV is 46 when the aspect is below 0.9, otherwise 40. Do not replace this with a fixed desktop/portrait distance: that cropped iPad portrait and hid the hand behind the dock in landscape. `LeabTui.getFraming()` reports projected rim bounds, dock clearance and the shadow state. `#topViewBtn` is a labelled HUD toggle (2D view / 3D view); `resetView` returns to the top view. Touch and ≤1024 px layouts show a bottom-right **reset board** button (`#boardResetBtn`) that re-seats the world to `MY_SEAT`, returns to 2D, re-fits the canvas and re-syncs; if the WebGL context is lost it reloads (a guest auto-rejoins). Touch Safari page autozoom is disabled with `maximum-scale=1`, `touch-action: manipulation` on controls and 16 px coarse-pointer inputs; the canvas keeps `touch-action: none` so OrbitControls still pinch-zooms the table. **2D is not an orbit view**: rotation is disabled, left-drag/one-finger drag pans the table (target clamped to 4.2), and wheel/pinch still zooms. 3D maps left/one-finger to orbit and keeps two-finger dolly-pan. The 3D home is desktop `(0, 10.2, 11.4)` target `(0, 0.22, 0.9)`, narrow `(0, 14.3, 17.2)` target `(0, 0.18, 0.7)`. `controls.maxDistance` is 42 so the narrow portrait top view can frame the whole rim. The mobile hand dock must stay under ~110 px or it hides the hand.
- **Shadows.** The 2D top view renders **no cast shadows**; the shadow pass starts disabled and `applyShadowMode()` enables it only in 3D, toggling both shadow-casting lights and flagging materials for a rebuild. A shadow in the 2D table is a regression, not a style preference.
- **Show vs Keep hidden.** `showdownCanShow` requires a legal combo of the called type; it does not require beating the best. `renderSelection` must keep the Show button enabled for a legal losing set and explain an illegal/wrong-type submission (`dock.showdownNoSet`/`WrongType`); never say “cannot beat” when the real issue is legality. The follow dock warns (`dock.followInvalid`).
- **Reveal and trick result.** **Show set applies immediately**; there is no intermediate reveal popup. Every seat must choose Show or Keep hidden before the trick is judged. Only when the showdown queue is empty does `resolveTrick` compare the sets, sweep, and open `trickResultModal` for **every local human** — host and guests, whether they revealed or stayed hidden. The modal uses `trickCompareMarkup` (mini cards, backs for hidden sets, a big ✓ and gold frame on the winner, winner/reason note). In solo the next trick waits for **Continue**; in a network room the summary is informational and the table continues. The Turn-history detail uses the same renderer; do not fork the layout.
- **Table zones.** A faint gold **battle ring** marks the centre play area and an arc marks the player's private zone. Arrangement drops outside the personal arc (other seats or the centre) snap back; the centre is only for a play drop.
- **Arrangement design record.** `docs/ARRANGEMENT.md` documents the zones, drag staging, reveal pause, captured-pile grouping and layout relay. Update it with those mechanics.
- **Drag to play.** Dropping a hand tile inside `HAND_PLAY_RADIUS` (2.8) plays it: a single when nothing is selected, or the current selection when tiles are pre-selected. Lead validates the combo; follow sends the called count face-down. Invalid drops or a non-turn drop snap back with a toast. The dock buttons remain.
- **Hand arrangement.** `handLayout` is a scene-local `Map<tileId, {x, z, angle}>`. The first drag snapshots every local hand tile so later plays do not re-flow the rest; `deal()` clears it. Dragging is free across the felt: only the table edge (`radius ≤ HAND_RADIUS + 0.55`) and the very centre (`radius ≥ 0.8`) are excluded. Overlap is allowed and intentional.
- **Captured-pile layout.** Piles sit on the rim (`CAPTURE_RADIUS = 5.90`) and are spaced along the rim arc by 1.02, not on a straight tangent fan; a tangent fan pushes the outer piles past the table at eight piles. Nameplates are inward at 5.15. Centre plays use 0.96 spacing. Do not reduce these without checking a 6-tile set and eight captured piles in the top view.
- **Live history.** `renderAll` refreshes an open `#lastTrickModal` from `trickArchive` (following the latest unless a round/turn is selected) and closes it with a “Your turn” toast when the turn reaches the local player. This prevents a stale Log from hiding the board.
- **Layout relay.** On drop the owner sends `{type:"hand-layout", slots}` with `{x,z,a}` in **raw hand order** (never tile ids). The host clamps each slot, applies it to the sender's seat, and relays `{type:"hand-layout", seat, slots}` to the other guests. `slots:null` clears it (Tidy). Because slots are index-based, the owner republishes whenever their hand changes (a play shifts indices). The host applies guest layouts through `scene.setSeatLayout`. Layouts are memory-only and never saved or exported.
- **Audio.** `StudioAudio.play` returns until `unlocked` is true. Never create/resume an `AudioContext` before a user gesture; Chrome logs autoplay warnings otherwise. The graph is `source → filter → gain → panner → master (0.8) → compressor → analyser → destination`. If the context is still suspended at the first play, `play` calls `resume()` and retries; this covers the first-gesture race. Keep the analyser tap: `verify.mjs` measures a real RMS peak. Do not lower the master to the old 0.32 without re-measuring; it was effectively inaudible.
- **CDN pins.** `three@0.160.0` in the import map and `peerjs@1.5.4` in `peer-manager.js`. Do not float either version. If the CDN fails, the table cannot render and rooms cannot open; that is a documented limitation, not a reason to inline the libraries.
- **CSP.** `script-src` allows `'unsafe-inline'` only because import maps are inline. `connect-src` allows jsDelivr, `https://0.peerjs.com` and `wss://0.peerjs.com`. The app has no inline event handlers. Do not add remote fonts or analytics.
- **Display settings.** Font size scales the interface through `--fs-scale` on `html[data-font-size]`, never the 3D table. Five themes are `html[data-theme]` CSS variables plus `SCENE_THEMES`: Mahogany, Jade Court, Midnight Lacquer, Parchment and Daybreak. `scene.setTheme` must dispose the replaced felt/wood/back textures. Never add a theme that only recolours the panels and leaves the 3D scene behind.
- **Boot version guard.** `index.html` carries `<meta name="app-version">`; an inline head script fetches `state.json` with `no-store` and reloads once with `?v=` if they differ. Keep the meta in step with `APP.version` or every cached page reloads once (the session guard stops loops).
- **Trick archive.** `state.trickArchive` records each resolved trick: round, trick, call, winner, combo, captured and per-seat `{seat, revealed, combo, tiles}`. It is serialized/sanitized and shown by the round/trick browser (`#lastTrickModal`, opened by Last trick, the Trick Log History button, or the summary).
- **Summary auto-next.** `prefs.autoNext` (host checkbox on the summary) controls the 30-second countdown; guests never see the control and only get **Back to table**.
- **Versioned assets.** `index.html` links `style.css?v=X.Y.Z` / `script.js?v=X.Y.Z`, and `script.js` imports the three modules with the same query. Bump all five strings with `APP.version` on every release or a force reload can still use cached modules. `check.mjs` enforces the match.
- **Version checks.** `checkForUpdate()` reads `state.json` with `no-store`, throttled to once per 5 minutes by `leabtui.versionCheck.v1` in localStorage. It runs 1.4 s after boot when the launch menu is shown and on `visibilitychange`. The launch-menu only may auto-reload once per version (sessionStorage `leabtui.autoReload.v1`); rooms, matches and every other view get the banner and the big Reload button instead. Pages reached by `forceReload` carry `?v=` and force one confirmation check so a stale deploy cannot loop.
- **Reload/update.** Footer and launch overlay show the version; Reload adds a `v=<timestamp>` page query, removes `pin`, and confirms when a room/match is active. `state.json` is fetched with `no-store` for the update banner.
- **Install / full screen.** `manifest.webmanifest` (`display: fullscreen`), `icons/icon-{180,192,512}.png`, a maskable icon, `apple-touch-icon`, `apple-mobile-web-app-capable` and `viewport-fit=cover` make the app installable; `.app` pads `safe-area-inset-top/bottom` and the dock/reset button lift above the home indicator. There is deliberately **no service worker**: Three.js and PeerJS need the network. Chrome iPad has no page-fullscreen API, so Add to Home Screen is the reliable full-screen route; the Display button uses the API where available and otherwise shows the hint. Do not add a manifest version/query string; the icons are static and cache-busted with the HTML.
- **No build step.** Keep it six runtime files plus the manifest/icons. Scripts may verify, screenshot, or publish, but must not generate the runtime source.

## 5. Known issues

- The two- and three-player traditional variants are not implemented; only four seats. The table is deliberately four seats, not six (32 tiles, four winds).
- `Ngoh Hoo` and the `Lak Hoo` colour rule are interpretations of an ambiguous source; documented in `docs/RULES.md`.
- Undo is a one-trick rewind and is not available after a page reload (the snapshot is deliberately not persisted; only the live game is). It is host-only in multiplayer.
- The AI is heuristic, not a search engine. It conserves strong sets and challenges with a probability, but it does not model opponents' hands.
- The mobile layout is verified in headless Chrome at 390×844, and iPad at 820×1180 / 1180×820 via device emulation, not on physical iOS/Android hardware. Emulation matches CSS viewport, DPR, touch and coarse pointer, but not Safari's toolbar, safe-area insets or GPU timing.
- The page requires network access for Three.js. Multiplayer also needs jsDelivr for PeerJS and `0.peerjs.com` for signalling. The HUD and coach work without them; the table and rooms do not.
- Multiplayer is host-authoritative with no host migration, authentication, turn timer or anti-cheat. A closed host ends the room; an idle guest can stall the table.
- Voice is full-mesh and needs microphone permission plus HTTPS/localhost; no TURN relay, noise gate, push-to-talk or recording. Chat is unmoderated and not persisted.
- Host approval and the PIN reduce abuse but do not make the room DDoS-proof, cheat-proof or authenticated. A malicious approved guest still controls their own client; a malicious host sees every hand.
- The PIN is public policy, not a password. Eight wrong attempts lock the room for 60 seconds; there is no account-level lockout.
- Public STUN only, no TURN. Symmetric NAT or a strict corporate firewall can block the data channel. Confirmed on Android Chrome: join reaches `ice-checking`, then fails with `host-timeout`, while iPad joins the same room. Diagnosis, workarounds and three TURN designs are documented in issue [#1](https://github.com/somphol/leab-tui-3d/issues/1); nothing is implemented and nothing TURN-related is in the runtime.
- Redaction keeps other hands off the wire, but the host browser knows every hand and a guest can inspect their own client. Play with people you trust.
- The title/meta screenshots use the `?demo=1` seed state; regenerating them changes the hand and may change the coach text.
- Five themes ship, including two bright palettes (Parchment, Daybreak); there is no dedicated high-contrast mode. Text size scales the interface but not the 3D table (by design).

## 6. Continuity

- **Deployed copy:** GitHub Pages from `main`, repository root; live URL above.
- **Local master:** `~/Projects/leab-tui-3d`.
- **Build record:** `STATE.md` and `state.json` record the session start/end, wall-clock duration, token counts, harness and model. Update both if you make a new measured release.
- **Skill:** `leab-tui-studio` in `~/.config/opencode/skills/` and the public mirror `~/Projects/opencode-skills/leab-tui-studio/`.
- **Rule source:** <http://naveea.blogspot.com/2016/03/blog-post.html>.
- **Continuation:** `docs/CONTINUATION.md` is the short “where we are / what next” handoff; keep it current with the release.
- **Verification:** `docs/TESTING.md`; the self-test is the fastest regression check. Run `node scripts/check.mjs` before every push and `node scripts/net-check.mjs` before a multiplayer release.
- **Network verification:** `scripts/net-check.mjs` requires outbound access to `0.peerjs.com`; it is intentionally not part of `verify.mjs`.
