# Testing and verification

## What is verified, and how

| Layer | Tool | What it proves |
| --- | --- | --- |
| Syntax | `node --check script.js` + `peer-manager.js` + `voice-chat.js` | all three modules parse |
| Repository | `node scripts/check.mjs` | files, links, version, i18n parity, rule constants, serialization policy, CDN pins, redaction guards |
| Rules + protocol | `?selftest=1` → `selfTest()` | 36 pure checks: deck, hierarchy, combos, comparisons, scoring, simulation, i18n, export, chat normalization, room codes, redaction, hydration, loopback |
| Browser | `node scripts/verify.mjs` | Chrome loads the page, no console exceptions, the table renders, the self-test passes |
| Flow | CDP playthrough (below) | a complete round, 32-tile conservation |
| Multiplayer | `node scripts/net-check.mjs` | two real browsers: host, join, bot fill, redaction, chat, voice mesh, mute/deafen, actions, disconnect-to-bot |
| Visual | screenshots in `screenshots/` | desktop EN, desktop TH, rules drawer, 390×844 phone, lobby |

Run the static checks first:

```bash
node --check script.js
node --check peer-manager.js
node scripts/check.mjs
```

Start a server for browser checks:

```bash
python3 -m http.server 8123 &
node scripts/verify.mjs
node scripts/net-check.mjs   # real broker, needs outbound 0.peerjs.com
```

`scripts/verify.mjs` starts its own server on port 8123 if one is not already running, launches Chrome through `scripts/browser-check.mjs`, reads `window.__selftest`, and fails on any console exception. `scripts/net-check.mjs` is separate because it depends on the public broker; it launches two pages in one headless Chrome.

## The 35 self-checks

| # | Check | Expected |
| --- | --- | --- |
| 1 | deck has 32 tiles | 32 |
| 2 | 16 red / 16 black | 16 + 16 |
| 3 | rank copies | soldier 5, others 2, general 1 |
| 4 | hierarchy | `7654321` |
| 5 | single detects | `single` |
| 6 | pair detects | `pair` |
| 7 | General cannot pair | `null` |
| 8 | mixed-colour pair rejected | `null` |
| 9 | Soldier triple detects | `triple` |
| 10 | five Soldiers detect | `quint` |
| 11 | big Sa Hoo detects | `sahoo`, `set: big` |
| 12 | small Sa Hoo detects | `sahoo`, `set: small` |
| 13 | big Sa Hoo beats small | `true` |
| 14 | red Sa Hoo beats black big | `true` |
| 15 | See Hoo duplicate pair | `dup[0] = 6` |
| 16 | See Hoo compares pairs | `true` |
| 17 | Ngoh Hoo detects | `ngohoo` |
| 18 | Lak Hoo detects | `lakhoo` |
| 19 | red beats black at equal rank | `true` |
| 20 | equal set cannot overtake | `true` |
| 21 | deal gives four hands of eight | 4 × 8, 32 unique |
| 22 | scoring table | `-2,-1,0,1,2,3,4,5,16` |
| 23 | simulated round conserves tiles | captures = 32 |
| 24 | i18n keys symmetrical | EN and TH share every key |
| 25 | export payload shape | app + credits + 4 scores |
| 26 | chat text | whitespace collapsed, 200-character cap |
| 27 | room code | six chars from the unambiguous alphabet |
| 28 | code normalization | `leab-abc-234` → `ABC234` |
| 29 | incomplete code rejected | `ABC` → `null` |
| 30 | formatted code | starts with `LEAB-` |
| 31 | peer id stability | uppercase and dashed codes collide intentionally |
| 32 | redaction hides another hand | every id is a ghost |
| 33 | redaction keeps the recipient hand | every id is real |
| 34 | host-only maps stripped | no `hiddenTags`, no `snapshot` |
| 35 | ghost hydration | `ghost-2-3` round-trips |
| 36 | loopback transport | envelope arrives with `__leab: 1` |

Latest result: **SELFTEST PASS 36/36** (Chrome headless, 2026-11-06).

## Recorded flow tests

These were run through `window.LeabTui` with `setFast(true)` and the public actions (`hint`, `lead`, `follow`, `undo`, `nextRound`).

### Full round

```text
phase: roundEnd
trick: 6
captures: [4, 0, 12, 16]  → 32 tiles
hands: [0, 0, 0, 0]
roundPoints: [-1, -2, 1, 2] → sum 0
```

The round ended, the table was empty, the four point values summed to zero, and no console exception was logged.

### Undo

At `roundEnd`, `LeabTui.undo()` restored the pre-trick position:

```text
afterUndo: phase follow (AI restarted the trick), trick 4
hands + captures + centre = 32
stats.rounds: 1 → 0
stats.currentStreak: 1 → 0
```

The snapshot is ID-based; the restored hands were real tile objects, not strings. This specifically guards the regression where a snapshot held live objects and undo emptied every hand.

### Next round

```text
end:  roundEnd, scores [2,-2,2,-2]
next: round 2, hands [8,8,8,8], scores preserved, total tiles 32
```

### Audio

```text
pointerdown → AudioContext running, unlocked true
playSound("clack") → analyser peak ≈ 0.04 RMS (master 0.8 + compressor)
playCount increments; no autoplay warning
```

The graph is `source → filter → gain → panner → master → compressor → analyser → destination`. The analyser tap is used by the harness; it does not change the output. The first `play` retries after `resume()` if the context was still suspended, which covers the first-gesture race.

### Rank quick reference

```text
click #rankReferenceBtn → panel open, 7 .rank-step cards
click again              → panel hidden
Esc / outside click      → panel hidden
```

The button is outside the `role="status"` HUD region; the region now wraps only the four status chips. The ladder is generated from `RANKS`, so it cannot drift from the engine order.

### Display settings

```text
applyFontSize("xl")  → html[data-font-size="xl"], --fs-scale 1.24
applyTheme("jade")   → html[data-theme="jade"], scene.theme "jade"
prefs                → { fontSize: "xl", theme: "jade" }
reload               → fontSize "xl", theme "jade", scene "jade"
panel                → 4 font buttons, 5 theme buttons
```

The browser harness asserts that **Jade and bright Parchment reach the 3D scene**, not just the CSS. The scene updates felt, wood, rim, inlay, floor, lights and tile side/edge/back; old textures are disposed.

### Reload resume

Played to a mid-trick state, reloaded the page in the same profile:

```text
phase: follow
trick: 1
turn: 0
hands: [8,7,7,7]
centre: 3
captures: [0,0,0,0]
lead: single, best: single
log: 3
stored: true
```

The saved game survived the reload and the scene re-synced. A saved `roundEnd` or `matchEnd` reopens the summary.

### Multiplayer, two real browsers

`node scripts/net-check.mjs` opens a host page (`?mode=host`) and a guest page
(`?room=CODE&name=Guest`) in the same headless Chrome, then asserts:

```text
host room             LEAB-ABC-234   (branded, six-char code)
guest seat            1
lobby humans          2
start                 host + guest + Bot 1 + Bot 2
guest own hand        8 real tile ids
other hands           24 ghost ids, no real ids on the wire
host in-game controls leave button visible, Start hidden, "Match in progress"
actions               9–12 moves crossed the channel, a trick resolved
guest tab closed      seat 1 became Bot 3, score/hand preserved
console               no exceptions on either page
```

The privacy check is the important one: it reads the guest's `LeabTui.getState()` and asserts that every id outside the guest's own seat starts with `ghost-`. That value comes from the actual data channel, not from a unit stub.

## Manual checklist

### Launch

- [ ] A normal load shows Choose how to play before dealing a game.
- [ ] Your name is required before hosting or joining; an empty name shows a clear message.
- [ ] Hosting uses the menu name and the roster shows it.
- [ ] An invite link prefills the room code but asks the guest to confirm their own name.
- [ ] Reloading a solo save shows Resume match with the round, trick and score.
- [ ] Play solo starts a fresh deal; Resume match restores the saved one.

### First load

- [ ] Header, HUD, coach, scoreboard, actions, inspector and hand list all render.
- [ ] Eight face-down tiles deal to each seat; the human hand flips face-up.
- [ ] The holder of the red General is the leader.
- [ ] **Ranks** opens the pictorial ladder with 7 cards; the toggle, close, `Esc` and outside click hide it.
- [ ] The rank note reads correctly in EN and TH.
- [ ] **Display** (`Aa`) opens; Small/Default/Large/XL change the interface text and persist.
- [ ] All five themes — Mahogany, Jade Court, Midnight Lacquer, Parchment, Daybreak — change the panels **and** the felt/wood/light palette.
- [ ] The 3D table does not scale with text size (by design).
- [ ] The table can be orbited, zoomed and panned; reset returns home.
- [ ] No console error. No network request except `cdn.jsdelivr.net/npm/three@0.160.0/...`.
- [ ] Click once, then lead a tile: the wooden clack is clearly audible. Toggle sound off/on. The toggle does not lie about the state.

### Turn loop

- [ ] Clicking a hand tile selects it; clicking again deselects.
- [ ] **Lead** is disabled for a mixed selection and enabled for a legal set.
- [ ] A follower can select exactly N tiles; **Play face-down** is enabled only at N.
- [ ] **Reveal & challenge** is enabled only for a legal set that beats the table.
- [ ] AI tiles reveal or stay face-down; the winner sweeps all `4×N` tiles.
- [ ] The winner leads the next trick; the active seat ring moves.
- [ ] A face-down tile never wins, even when its hidden set would have.

### Learning

- [ ] **Hint** selects a legal lead or the best follow/discard.
- [ ] The inspector shows Thai name, English name, rank, copies and colour.
- [ ] **Undo trick** opens the comparison; confirming restores the pre-trick state.
- [ ] Rules modal contains the hierarchy, calls, flow and scoring table.
- [ ] EN ⇄ ไทย translates every visible control, tile name, coach line and log entry.
- [ ] Thai hand list and inspector use Thai rank names.

### Persistence

- [ ] Reload mid-game resumes the same hands, centre and scores.
- [ ] Reload at round end reopens the summary.
- [ ] **Export JSON** downloads `leab_tui_3d_game.json` with `format`, `version`, `app`, `credits`, `stats` and `game`.
- [ ] Cleared site data starts a new match without an error.

### Multiplayer

- [ ] The launch overlay offers Your name, Play solo, Host a table and Join a table, plus Resume match when a save exists.
- [ ] Table chat receives host and guest messages and survives a language switch.
- [ ] Join voice prompts for the microphone; remote audio plays.
- [ ] Mute mic disables the local track but keeps the call connected.
- [ ] Mute others deafens every remote stream and is independent of the mic.
- [ ] A green pulse appears on the speaking seat avatar/scoreboard row.
- [ ] The host Leave room button is visible in Actions, confirms first, and returns to the menu.
- [ ] Host shows a `LEAB-XXX-XXX` code, a 4-seat roster and a disabled Start until a second human joins.
- [ ] Copy invite link copies a URL with `?room=...`.
- [ ] Guest enters the code and a name; the waiting panel shows the same roster.
- [ ] Host Start fills empty seats with bots and deals immediately on both screens.
- [ ] Each guest sees their own hand face-up and the other three hands face-down.
- [ ] A guest's own seat appears at the bottom of their table (the world rotates).
- [ ] Guest actions are reflected on the host and all other guests within a second.
- [ ] A guest closing the tab leaves their score and hand in place; a bot takes over and play continues.
- [ ] Host leaving shows "Table closed" to guests with a Play solo escape.
- [ ] `?mode=solo` and a resumed solo save never show the launch overlay.
- [ ] A blocked PeerJS CDN leaves solo play unaffected.

### Responsive

- [ ] 1440×900: sidebar visible, hand dock fits, inspector readable.
- [ ] 1024×768: sidebar narrower, dock wraps without covering the hand.
- [ ] 390×844: stage fills most of the viewport, hand and dock visible, coach below.
- [ ] Keyboard `H` hints and `Esc` clears the selection.
- [ ] Reduced-motion preference shortens CSS transitions.

## Visual checks

| Screenshot | What to look for |
| --- | --- |
| `screenshots/hero.jpg` | hand, centre trick, coach, inspector, scoreboard, action buttons |
| `screenshots/thai.jpg` | Thai header, labels, coach, inspector and hand list |
| `screenshots/rules.jpg` | readable modal, hierarchy, calls grid, no overflow |
| `screenshots/mobile.jpg` | table fits, human hand not hidden by the dock, buttons all reachable |
| `screenshots/lobby.jpg` | launch overlay, name field, three modes, no clipped copy |
| `screenshots/chat-voice.jpg` | chat messages, voice buttons, leave room, speaking pulse |
| `screenshots/mobile-chat.jpg` | chat/voice fit at 390 px, hand dock not covered |

A green suite does not prove the table looks right. Inspect the screenshots after any camera, material or dock change.

## Known gaps

- Headless Chrome uses SwiftShader on this machine; frame-rate and GPU-specific behaviour are not measured.
- No automated axe-core pass. The DOM uses semantic headings, buttons, `aria-live` for the coach and toast layer, and labelled icon buttons, but this has not been audited by a screen reader.
- No physical iOS/Android testing. The mobile layout is verified at 390×844 under Chrome device metrics only.
- The AI is not benchmarked for strength; only its legality and conservation are tested.
- `scripts/net-check.mjs` needs outbound access to `0.peerjs.com`; it is not part of the default `verify.mjs` run.
- Redaction is tested from the guest's JavaScript state, not by inspecting every packet. The host is trusted by design.

## Adding a test

1. Add the pure check to `selfTest()` in `script.js`; use `check("name", () => ...)`.
2. If it is a rule invariant, add it to `scripts/check.mjs` as a string/regex guard too.
3. If it is a flow, add a CDP expression to `scripts/verify.mjs` and assert on `window.LeabTui.getState()`.
4. If it is a protocol or redaction invariant, add it to `netSelfTest()` and, when it needs a real channel, to `scripts/net-check.mjs`.
5. Update this document and the count in the title assertion (`36/36`).
