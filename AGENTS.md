# AGENTS.md — Leab-Tui 3D

## 1. What this is

A static, bilingual 3D teaching table for **เลี๊ยบตุ่ย (Leab-Tui)**, the Thai trick-taking game played with the 32 tiles of a Chinese chess set. One page, six source files, Three.js r160 from jsDelivr, no build step. It plays four seats — solo (1 human + 3 heuristic AI) or a serverless WebRTC table (host + up to 3 guests, empty seats filled by bots), with host-routed text chat and independent full-mesh voice chat (mic mute + deafen). It implements Leab/Tui/Sa Hoo/See Hoo/Ngoh Hoo/Lak Hoo and Soldier sets, and adds a tile inspector, live coach, Hint, Undo & Learn, synthesised audio, autosave and JSON export.

It is **not** a gambling app, a game server, a tournament rules authority, or a complete implementation of the two- and three-player variants. Release **1.8.1**.

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
5. **Flow** — `beginMatch` → `dealRound` → `beginTrick` → `leadTrick` / `submitPlay` → `resolveTrick` → `endRound` / `startNextRound`; `undoLastTrick` restores the pre-trick snapshot and restarts the trick. `isBotSeat(seat)` is the only AI-scheduling predicate.
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
export: leab_tui_3d_game.json, format "leab-tui-3d-save", version "1.8.1"
prefs: theme daybreak (default)|mahogany|jade|midnight|parchment; fontSize sm|md|lg|xl; autoAudio on by default; CSS --fs-scale 0.9/1/1.12/1.24
room: 482-173 (display; the peer id still carries a private leab prefix); peer id leabtui-v1-abc234; protocol 1; PeerJS 1.5.4; broker 0.peerjs.com:443
```

Persistence saves `{format, version, savedAt, network, game}` where `game` is the ID-based `serializableState`. The snapshot for Undo is also ID-based; `undoLastTrick` maps IDs back to `TILE_BY_ID`. Do **not** store live tile objects in a snapshot or in localStorage — that was a real bug during the build. Network saves carry `network: true` and are rejected by `loadMatch`.

`window.LeabTui` exposes: `getState`, `getStats`, `getPrefs`, `getLanguage`, `setLanguage`, `newMatch`, `nextRound`, `lead`, `follow`, `toggleTile`, `clearSelection`, `hint`, `undo`, `exportPayload`, `selfTest`, `simulateRound`, `detectCombo`, `getCamera`, `resetView`, `topView`, `setFast`, `inspect`, `inspectHidden`, `applyFontSize`, `applyTheme`, `getDisplay`, and `net` (`getState`, `openLobby`, `closeLobby`, `host`, `join`, `start`, `leave`, `solo`, `selfTest`, `sanitize`, `hydrate`, `roomCode`, `copyInvite`).

## 4. Decisions and constraints

- **Rules contract.** The source is Navee Angsuputiphant's 2016 Thai description (see `docs/RULES.md`). It is ambiguous about Ngoh Hoo and about mixed-colour six-tile sets. This studio's interpretation: a straight is one colour; See Hoo duplicates one core rank; Ngoh Hoo duplicates two; Lak Hoo is the small Chariot–Horse–Cannon core with all three ranks doubled; same-rank sets are Soldiers only. Do not silently change these; update `docs/RULES.md`, `detectCombo`, the self-test and the rules modal together.
- **Comparison order.** For single/pair/Soldier sets: rank then colour. Sa Hoo: big vs small, then colour. See Hoo: duplicated pair rank then colour. Ngoh Hoo: highest duplicated rank, second duplicated rank, then colour. Lak Hoo: colour only. Equal rank + colour never overtakes; the earlier play stays best. `beats` is strict (`> 0`).
- **Face-down play.** The leader and every follower send exactly the called count **face-down**. When all four have sent, the leader reveals automatically; each follower then decides to show or stay hidden, in turn. A set must be revealed to compete. Do not auto-reveal a follower or let an unrevealed set win.
- **Table rules.** `prefs.target` (20/50/100), `prefs.direction` (`cw`/`ccw`, `nextSeat` is the only turn-order helper) and `prefs.mode` (`piles`/`bid`) are copied into `state` by `beginMatch`. Changing mode mid-match is ignored until the next match; target and direction apply live.
- **Bid mode.** After the deal, phase `bid`; `bidOrder` starts at the leader and follows `nextSeat`. `bidForbidden()` blocks the last bidder from making the total exactly 8. `endRound` uses bid + 5 (zero bid + 3) on a hit, minus the difference on a miss, times `state.multiplier`.
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
- **No host migration.** A closed host ends the room. Guests see "Table closed". Do not pretend the match resumes.
- **Approval is the real gate.** A guest is not seated on `hello`; `requestGuest` checks the PIN, then queues. Only `approvePending` calls `acceptGuest` and sends `welcome`. Pending requests expire; denied/wrong-PIN connections close.
- **PIN is a gate, not authentication.** Exactly 5 digits, common/repeat/sequence checks. Only 100,000 possibilities, so approval remains primary. Store only the SHA-256 digest in memory. Never put the plain PIN in state, roster, URL, export or localStorage. The host's plain copy is UI-only for Copy room info.
- **Assume the source is public.** The code, protocol, policy and deny-list are readable. Do not rely on hidden message names or secret endpoints. Caps are part of the boundary: 16 connections, 6 pending, 80 messages/10 s, 16 KB payload, 200-char/350 ms chat, six action tiles.
- **Voice calls are allowlisted.** `VoiceChat._answer` closes calls from peer IDs not in the approved roster; the host PeerJS id is deterministic from the room code.
- **Chat goes through the host.** `sendChat` → host `hostChat` → append once → broadcast one entry to every guest. Cap at 200 chars and rate-limit guests (350 ms). Never inject chat with `innerHTML`.
- **Voice does not go through the host.** It is a full mesh of PeerJS media calls between voice-active humans. The host only relays `voice-state` and the roster's `peerId`/`voice` flags. Do not route voice over the data channel.
- **Mic mute is `track.enabled = false`**, not `track.stop()` and not closing the call. Deafen is `audio.muted` on every remote element, not the local mic.
- **Voice is opt-in.** Never call `getUserMedia` on load; it must be a user gesture with HTTPS/localhost. Render `<audio autoplay playsinline>` only after a stream arrives. `prefs.autoAudio` (default on) preloads the mic only from the Connect/Start click, skips silent `?room=&name=` auto-joins, and joins with the preloaded stream once the seat exists. Denial never blocks the match; the **Join audio** pill remains.
- **Speaking meter** uses `AudioContext` analysers and a 120 ms interval; it must not connect to `destination` (playback is the `<audio>` element).
- **The 3D scene is a view.** `scene.sync(state)` is idempotent; it animates only targets that differ. Never mutate `state` from inside the scene except through the public callbacks (`toggleTile`, `inspect*`).
- **Camera.** The default is a **top view**: `(0, 18.6, 0.76)` target `(0, 0, 0.75)` on desktop, `(0, 24.8, 0.96)` target `(0, 0, 0.95)` on portrait with FOV 46. `#topViewBtn` is a labelled HUD toggle (Top view / 3D view); `resetView` returns to the top view. The 3D home is desktop `(0, 10.2, 11.4)` target `(0, 0.22, 0.9)`, portrait `(0, 14.3, 17.2)` target `(0, 0.18, 0.7)`. `controls.maxDistance` is 32 so the portrait top view can frame the table. The mobile hand dock must stay under ~110 px or it hides the hand.
- **Hand arrangement.** `handLayout` is a scene-local `Map<tileId, {x, z, angle}>`. The first drag snapshots every local hand tile so later plays do not re-flow the rest; `deal()` clears it. Dragging is free across the felt: only the table edge (`radius ≤ HAND_RADIUS + 0.55`) and the very centre (`radius ≥ 0.8`) are excluded. Overlap is allowed and intentional.
- **Layout relay.** On drop the owner sends `{type:"hand-layout", slots}` with `{x,z,a}` in **raw hand order** (never tile ids). The host clamps each slot, applies it to the sender's seat, and relays `{type:"hand-layout", seat, slots}` to the other guests. `slots:null` clears it (Tidy). Because slots are index-based, the owner republishes whenever their hand changes (a play shifts indices). The host applies guest layouts through `scene.setSeatLayout`. Layouts are memory-only and never saved or exported.
- **Audio.** `StudioAudio.play` returns until `unlocked` is true. Never create/resume an `AudioContext` before a user gesture; Chrome logs autoplay warnings otherwise. The graph is `source → filter → gain → panner → master (0.8) → compressor → analyser → destination`. If the context is still suspended at the first play, `play` calls `resume()` and retries; this covers the first-gesture race. Keep the analyser tap: `verify.mjs` measures a real RMS peak. Do not lower the master to the old 0.32 without re-measuring; it was effectively inaudible.
- **CDN pins.** `three@0.160.0` in the import map and `peerjs@1.5.4` in `peer-manager.js`. Do not float either version. If the CDN fails, the table cannot render and rooms cannot open; that is a documented limitation, not a reason to inline the libraries.
- **CSP.** `script-src` allows `'unsafe-inline'` only because import maps are inline. `connect-src` allows jsDelivr, `https://0.peerjs.com` and `wss://0.peerjs.com`. The app has no inline event handlers. Do not add remote fonts or analytics.
- **Display settings.** Font size scales the interface through `--fs-scale` on `html[data-font-size]`, never the 3D table. Five themes are `html[data-theme]` CSS variables plus `SCENE_THEMES`: Mahogany, Jade Court, Midnight Lacquer, Parchment and Daybreak. `scene.setTheme` must dispose the replaced felt/wood/back textures. Never add a theme that only recolours the panels and leaves the 3D scene behind.
- **Versioned assets.** `index.html` links `style.css?v=X.Y.Z` / `script.js?v=X.Y.Z`, and `script.js` imports the three modules with the same query. Bump all five strings with `APP.version` on every release or a force reload can still use cached modules. `check.mjs` enforces the match.
- **Version checks.** `checkForUpdate()` reads `state.json` with `no-store`, throttled to once per 5 minutes by `leabtui.versionCheck.v1` in localStorage. It runs 1.4 s after boot when the launch menu is shown and on `visibilitychange`. The launch-menu only may auto-reload once per version (sessionStorage `leabtui.autoReload.v1`); rooms, matches and every other view get the banner and the big Reload button instead. Pages reached by `forceReload` carry `?v=` and force one confirmation check so a stale deploy cannot loop.
- **Reload/update.** Footer and launch overlay show the version; Reload adds a `v=<timestamp>` page query, removes `pin`, and confirms when a room/match is active. `state.json` is fetched with `no-store` for the update banner.
- **No build step.** Keep it six runtime files. Scripts may verify, screenshot, or publish, but must not generate the runtime source.

## 5. Known issues

- The two- and three-player traditional variants are not implemented; only four seats. The table is deliberately four seats, not six (32 tiles, four winds).
- `Ngoh Hoo` and the `Lak Hoo` colour rule are interpretations of an ambiguous source; documented in `docs/RULES.md`.
- Undo is a one-trick rewind and is not available after a page reload (the snapshot is deliberately not persisted; only the live game is). It is host-only in multiplayer.
- The AI is heuristic, not a search engine. It conserves strong sets and challenges with a probability, but it does not model opponents' hands.
- The mobile layout is verified in headless Chrome at 390×844, not on physical iOS/Android hardware. Safe-area insets are not handled.
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
- **Verification:** `docs/TESTING.md`; the self-test is the fastest regression check. Run `node scripts/check.mjs` before every push and `node scripts/net-check.mjs` before a multiplayer release.
- **Network verification:** `scripts/net-check.mjs` requires outbound access to `0.peerjs.com`; it is intentionally not part of `verify.mjs`.
