# Reproduction guide

This is the order that worked. It assumes a blank folder and no framework. The goal is a static, bilingual 3D trick-taking studio with six source files, serverless P2P multiplayer, text chat and independent voice and a verified release.

## 0. Write the rules contract before the code

1. Research the traditional game in its own language. For Leab-Tui the usable source is Navee Angsuputiphant's 2016 Thai article (linked in [RULES.md](RULES.md)).
2. Extract the equipment, hierarchy, call names, combination shapes, comparison order, trick flow and scoring table.
3. Mark every ambiguity. For this project: Ngoh Hoo construction, Lak Hoo colour, mixed-colour straights, pair definition. Decide, document, and make the code and self-test agree.
4. Write `docs/RULES.md` as the contract. Do not start the engine until it exists.

The rules are the product. A beautiful table with a guessed ruleset is a reskin.

## 1. Scaffold

```text
index.html
style.css
script.js
peer-manager.js
docs/
screenshots/
scripts/
.github/
```

Create `git init`, `git branch -M main`, and a `.gitignore` for `.DS_Store`, `node_modules`, logs and local saves.

Pin the graphics library in an import map:

```html
<script type="importmap">
{"imports":{
  "three":"https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js",
  "three/addons/":"https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"
}}
</script>
```

Use a pinned version. Do not float `three@latest`; the scene's color management and light intensities are version-sensitive.

## 2. Build the rules engine first, with no DOM

In `script.js`, write data and pure functions:

1. `RANKS` with `power`, `copies`, red/black Hanzi, English and Thai names.
2. `buildDeck()` → 32 tiles with stable IDs such as `r-advisor-0`.
3. `detectCombo(tiles)` → type, count, colour, score array, set/dup metadata.
4. `compareScores(a,b)` and `beats(a,b)` — strict, type-gated.
5. `allCombos(hand)` — group by rank+colour for singles/pairs/Soldier sets; enumerate the two straight cores and the subsets of doubled ranks.
6. `scorePiles(piles)` — `0..7 → -2..5`, `8 → 16`.

Then write a pure `simulateRound(seed)` that deals, plays four AI hands and asserts 32 tiles are conserved. If this does not pass, do not touch the renderer.

### Rules traps

- A General cannot pair (one copy per colour). Enforce `power !== 7` in pair detection.
- A pair is same rank **and** same colour.
- Equal rank + colour does not overtake. `beats` must be `> 0`, not `>= 0`.
- A six-tile set is only the small core with all three ranks doubled; the General cannot be duplicated.
- A five-tile straight needs **two distinct** doubled ranks, not a triple.

## 3. State and flow

Use one `state` object. The minimum shape:

```js
{
  phase, round, trick, dealer, leader, turn,
  hands: [[], [], [], []],
  captures: [[], [], [], []],
  center: [], lead: null, best: null, selected: [],
  scores: [0,0,0,0], roundPoints: [0,0,0,0],
  history: [], log: [], snapshot: null, lastTrick: null
}
```

Flow:

```text
deal → beginTrick → leadTrick → submitPlay ×3 → resolveTrick
     → beginTrick (or endRound → nextRound / matchEnd)
```

- Snapshot **before** the leader acts. The snapshot includes the game and the stats.
- The leader must form the called set.
- A follower always sends exactly `lead.count` tiles; `revealed` only when the set matches the call and beats the best.
- The winner takes all centre tiles and leads next.
- `endRound` computes piles → points, updates history/stats, and opens the summary.
- `undo` restores the snapshot, maps IDs back to tiles, and restarts the trick.

### The serialization trap

Snapshots, `localStorage` and exports must contain **IDs**, not live tile objects. Write one `serializableState(state)` that converts hands, captures, centre, lead/best, lastTrick and log combos. `loadMatch` rebuilds objects and recomputes combos with `detectCombo`. During this build, a snapshot with live objects silently emptied every hand on undo, and a save with live objects failed validation on reload. The self-test now covers both.

## 4. 3D scene

1. `createScene()` dynamically imports Three.js so a CDN failure does not kill the UI.
2. Build the table: cylinder with a felt top texture, wood side, torus rim, pedestal, gold inlay, floor.
3. Build 32 tiles from a shared body geometry and cached face textures. Use `root → lift → tilt` groups so position, hover lift and flip are independent.
4. Map every tile from state:

```text
hand    → polar fan around the seat (human wider than AI)
centre  → 1–3 in a row, 4–6 in a grid, radius 2.05 toward the seat
capture → 2×4 grid of four-tile stacks, radius 3.36
```

5. `moveTile` and `setFace` keep animation records; skip a target if it is already close. Do not restart every animation on every render.
6. Raycast against tile body/face meshes. Hover lifts and fills the inspector; click selects in the human hand and inspects elsewhere.
7. Camera: OrbitControls with damping, polar limits, pan clamped to a small radius. Desktop and portrait need different home positions and FOV; this build uses `(0,10.2,11.4)` / 40° and `(0,14.3,17.2)` / 46°.
8. Soft shadows: one 2048 key light and a 1024 warm spot are enough. Cap pixel ratio at 2.

### The canvas trap

Put `<canvas id="scene">` **inside** `.stage-wrap`, not at app level. An app-level canvas with `position:absolute; inset:0` renders behind the sidebar and looks like a broken scene.

### The mobile dock trap

The hand dock overlays the bottom of the stage. On a 390×844 phone, the desktop dock (title + three lines of detail + wrapped buttons) is ~230 px tall and hides the entire hand. Hide the kicker, clamp the detail to one line, keep the actions on one row, and make the stage `calc(100dvh - 86px)`. Move the camera back for portrait so the hand is not cropped.

## 5. Audio

Synthesise everything with oscillators, a shared noise buffer, biquad filters and stereo panners. Do **not** create the `AudioContext` until the first pointer/key event; Chrome logs an autoplay warning otherwise. `play()` must return until `unlocked` is true.

## 6. Serverless multiplayer

Do this **after** the solo game is correct. Network code magnifies an unstable engine.

1. **Generalise the local seat first.** Replace every hard-coded `seat === 0` in UI, coach, hand list, pointer picking and AI scheduling with `MY_SEAT`. In solo `MY_SEAT = 0`; add `SEAT_PROFILES = null` and make `isBotSeat(seat)` fall back to `seat !== 0`. This one refactor is the difference between a reskin and a real guest seat.
2. **Create `peer-manager.js`.** Room codes, lazy PeerJS loading, `PeerHost`, `PeerClient`, and an in-memory loopback pair. Keep game rules out of it.
3. **Lobby before game.** A modal with three modes: solo, host, join. Host shows the code and a four-seat roster; Start is disabled until two humans are connected. Fill empty seats with bot profiles before `beginMatch`.
4. **Host authority.** The host runs the existing engine unchanged. Guests call `sendNetAction(kind, ids, reveal)` instead of `leadTrick`/`submitPlay`. The host re-validates through the same functions.
5. **Publish from `saveMatch`.** Host-only, throttled (~40 ms), guarded by `net.started`. Build a separate payload per guest.
6. **Redact per recipient.** `sanitizeForSeat(state, seat)` is the only privacy boundary. Replace other hands and unrevealed centre/log/last-trick entries with stable `ghost-<seat>-<index>` ids; null their combos; strip `hiddenTags`, `snapshot`, `selected`, `fast`.
7. **Hydrate.** `hydrateRemoteState` maps real ids through `TILE_BY_ID`, ghost ids to back-only proxy tiles, and clears selection.
8. **Ghost meshes.** Create 32 back-only meshes (`ghost-0-0` … `ghost-3-7`) sharing the side/back/edge materials. A face-down card then moves as the same mesh from hand to centre.
9. **Rotate the view.** Put the table, tiles, rings and labels in a `world` group. `setViewSeat(MY_SEAT)` rotates it by `-SEATS[seat].angle` so the guest's seat is at the bottom.
10. **Disconnect to bot.** On connection close, keep the seat, hand and score; replace the profile with `{kind:'bot'}`; if it is their turn, `scheduleAI(700)`.
11. **Reload is not resumable.** Mark host saves `network: true`; `loadMatch` rejects them. A guest never saves.

### Multiplayer traps

| Trap | Symptom | Fix |
| --- | --- | --- |
| Seat 0 still hard-coded | guest sees the host hand / cannot act | `MY_SEAT` everywhere; grep for `turn === 0` and `hands[0]` |
| Sending host state as-is | guest can read all hands in devtools | `sanitizeForSeat` per recipient |
| Reusing hand index as ghost id | cards visibly reshuffle when one is played | assign stable tags at deal and restore them on undo |
| Publishing during the lobby | guest receives the host's solo game | `if (!net.started) return;` |
| AI scheduling remote humans | guest's turn is auto-played | `isBotSeat` is the only predicate |
| Guest calls `leadTrick` locally | silent desync | route the public API through `sendNetAction` |
| Rotating the camera instead of the world | lighting/controls break | rotate a world group; keep lights and camera fixed |
| Expecting six seats | rules no longer Leab-Tui | four winds, 32 tiles, eight each |
| Using a public broker in CI | flaky offline tests | keep `net-check.mjs` separate from `verify.mjs` |

### Lobby security

Treat the source as public. The room code is an identifier, not a secret. Add three gates:

1. **Host approval** on by default. `hello` goes to a pending queue; only host `approve` assigns a seat and sends `welcome`. Pending entries expire.
2. **Optional PIN** with a real policy: 15–64 chars, upper/lower/digit/symbol, no whitespace, deny-list and sequence checks, no room code or host name. Hash it with SHA-256 and keep only the digest in memory. Show the plain PIN once for copying; never put it in the URL, roster, export or localStorage.
3. **Caps and allowlists**: connections, pending requests, messages/second, payload size, chat rate, action tile count, voice calls only from approved roster peer IDs.

The PIN is not authentication. Say so in the UI and the docs. The host approval click is the access-control decision. Add **Generate** and **Copy room info** so the host can use a strong PIN without choosing a weak one; warn that Copy room info puts the PIN in the clipboard.

### Text chat

Route guest `{type:"chat", text}` through the host. The host finds the sender profile, rate-limits (350 ms), normalises/caps at 200 chars, appends one entry and broadcasts `{type:"chat", entry}` to every guest. Include the last 30 entries in `welcome`. Render with `textContent` or `escapeHTML`. Keep it memory-only.

### Voice

Keep voice **out** of the data channel and out of the host. Add a `VoiceChat` module that:

1. Installs one `peer.on("call")` handler.
2. Initiates calls only when both sides are voice-active, with the lexicographically larger peer ID calling the smaller.
3. Requests `getUserMedia({audio:{echoCancellation,noiseSuppression,autoGainControl}})` only after **Join voice**.
4. Attaches remote streams to hidden `<audio autoplay playsinline>` elements.
5. Mutes the local track with `track.enabled = false`; deafens with `audio.muted = true`.
6. Drives a speaking pulse from an analyser that is **not** connected to `destination`.
7. Relays `voice-state` through the host and puts `peerId`/`voice` in the roster.

Use a synthetic oscillator stream (`joinWithStream`) for the headless test; keep the real `getUserMedia` path for production.

The full message set is in [PROTOCOL.md](PROTOCOL.md); operations are in [MULTIPLAYER.md](MULTIPLAYER.md).

## 7. Bilingual copy

- Use a flat dictionary with `{placeholders}` and a `t(key, vars)` function.
- Mark static DOM with `data-i18n`; dynamic strings are composed in `coachMessage`, `comboSummary`, `renderLog` and summaries.
- Add a self-test that both dictionaries have the same keys. This build has more than 300 keys per language.
- Translate tile names, colour names, seat names, combo names, button labels and ARIA labels.
- Re-render 3D score labels after a language switch.

## 8. Persistence and export

- `localStorage` keys: match, prefs, stats. Separate them so preferences survive a new match.
- Autosave after every action; save on `visibilitychange` and `beforeunload`.
- Validate a restored game: format, four hands of ≤8 valid IDs, four scores, known phase. Reject silently to a new match.
- Export a versioned JSON with `app`, `credits`, `stats` and the ID-based `game`. See [DATA_FORMAT.md](DATA_FORMAT.md).

## 9. Verify with a real browser, no dependencies

Write a Chrome DevTools Protocol harness (`scripts/browser-check.mjs`) using Node's built-in `WebSocket` and `fetch`. It should:

1. Launch Chrome headless with a temp profile and a random remote-debugging port.
2. Read `/json/list` and connect to the **page** target, not the browser target.
3. Enable `Page`, `Runtime`, `Log`, `Network`.
4. Navigate, wait, evaluate `window.LeabTui` and `window.__selftest`.
5. Capture console exceptions and a screenshot.
6. Fail loudly if the CDP method is missing or the target is wrong.

Use `?selftest=1` for the rule suite and a `window.LeabTui` playthrough for the flow. Add `--reload` to prove resume. For multiplayer, add a second page through `/json/new` and drive both sessions; see `scripts/net-check.mjs`. The harness in this repository is reusable; see [TESTING.md](TESTING.md).

## 10. Screenshots

- Desktop 1440×900 with `?demo=1`, wait ~16 s, then `LeabTui.hint()` and `LeabTui.inspect(id)`.
- Thai: `LeabTui.setLanguage('th')`, wait for the toast to clear.
- Rules: click `#rulesBtn`, wait 900 ms for the modal animation.
- Mobile: 390×844, `?demo=1`.

Wait for animations before capturing. A screenshot taken 100 ms after opening a modal shows it half-transparent; a screenshot taken right after a hint shows the toast.

## 11. Documentation and release

Write, in this order:

1. `README.md` — what it is, live link, features, rules summary, run/verify, screenshots, credits, limits.
2. `AGENTS.md` — what, commands, architecture, decisions, known issues, continuity. This is the file another agent reads first.
3. `docs/RULES.md`, `docs/ARCHITECTURE.md`, `docs/MULTIPLAYER.md`, `docs/PROTOCOL.md`, `docs/TESTING.md`, `docs/DEPLOYMENT.md`, `docs/DATA_FORMAT.md`.
4. `docs/REPRODUCTION.md` — this file.
5. `STATE.md` + `state.json` — duration, tokens, model, harness, verification.
6. Licence, changelog, contribution/security/privacy/support, citation, notices, GitHub templates.

Run every check, push, enable Pages, and verify the live URL. Then write the skill.

## 12. Measure the build

For an OpenCode session, the state lives in `~/.local/share/opencode/opencode.db`:

```sql
select tokens_input, tokens_output, tokens_reasoning,
       tokens_cache_read, tokens_cache_write, cost,
       datetime(time_created/1000,'unixepoch','localtime'),
       datetime(time_updated/1000,'unixepoch','localtime')
from session_v2 where id = 'ses_...';
```

`total = input + output + reasoning`. Report cache reads separately. Use `time_created` → `time_updated` for the wall-clock duration, and state clearly that the final publishing turns add a small amount. Write the numbers into `state.json` and `STATE.md`, and credit OpenCode + the model in the README, About modal and footer.

## 13. Publish without repeated Keychain prompts

On macOS, `gh` may be absent and repeated `git` calls can trigger Keychain dialogs. The approach that avoided that:

1. Retrieve the existing HTTPS credential once, in memory, without printing it:

```bash
TOKEN=$(printf 'protocol=https\nhost=github.com\n\n' | git credential fill 2>/dev/null | sed -n 's/^password=//p')
```

2. Create the repository with the GitHub API (`POST /user/repos`) using that token.
3. Push with the existing `osxkeychain` helper; it reuses the cached credential.
4. Enable Pages with `POST /repos/{owner}/{repo}/pages` (`source.branch=main`, `source.path=/`).
5. Never write the token to a file, a log, a commit or the transcript.

If the credential helper prompts on the first call, that is one prompt, not one per command. Do not loop `gh auth login` or re-run `security find-*` repeatedly.
