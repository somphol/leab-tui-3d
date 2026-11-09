# Testing and verification

## What is verified, and how

| Layer | Tool | What it proves |
| --- | --- | --- |
| Syntax | `node --check script.js` + `peer-manager.js` + `voice-chat.js` | all three modules parse |
| Repository | `node scripts/check.mjs` | files, links, version, i18n parity, rule constants, serialization policy, CDN pins, redaction guards |
| Rules + protocol | `?selftest=1` → `selfTest()` | 38 pure checks: deck, hierarchy, combos, comparisons, scoring, simulation, i18n, export, chat normalization, room codes, redaction, hydration, loopback |
| Browser | `node scripts/verify.mjs` | Chrome loads the page, no console exceptions, the table renders, the self-test passes |
| Flow | CDP playthrough (below) | a complete round, 32-tile conservation |
| Tablet | `scripts/browser-check.mjs --device ipad` | 820×1180 / 1180×820 viewport, coarse pointer, whole rim on screen, clear of the dock, 2D shadows off / 3D on |
| Multiplayer | `node scripts/net-check.mjs` | two real browsers: host, join, bot fill, redaction, PIN/approval, probe, chat, voice mesh, mute/deafen, actions, disconnect-to-bot |
| Invite | `node scripts/invite-check.mjs` | solo mid-trick → Invite → host room + auto audio, host popup, guest queued, promotion, resync, seat-card reconnect |
| Visual | screenshots in `screenshots/` | desktop EN, desktop TH, rules drawer, 390×844 phone, iPad portrait/landscape, lobby |

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
node scripts/net-check.mjs     # real broker, needs outbound 0.peerjs.com
node scripts/invite-check.mjs  # solo → Invite → queued guest, real broker
```

`scripts/verify.mjs` starts its own server on port 8123 if one is not already running, launches Chrome through `scripts/browser-check.mjs`, reads `window.__selftest`, and fails on any console exception. `scripts/net-check.mjs` and `scripts/invite-check.mjs` are separate because they depend on the public broker; each launches multiple pages in one headless Chrome. `invite-check.mjs` asserts the conversion does not redeal, the guest is told to wait, and the reserved seat is promoted at the next trick.

## The 38 self-checks

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
| 27 | PIN policy | exactly 5 digits, deny-list |
| 28 | room code | six chars from the unambiguous alphabet |
| 29 | code normalization | `leab-abc-234` → `482173` |
| 30 | incomplete code rejected | `ABC` → `null` |
| 31 | formatted number | matches `NNN-NNN` and never shows a prefix |
| 32 | peer id stability | uppercase and dashed codes collide intentionally |
| 33 | redaction hides another hand | every id is a ghost |
| 34 | redaction keeps the recipient hand | every id is real |
| 35 | host-only maps stripped | no `hiddenTags`, no `snapshot` |
| 36 | ghost hydration | `ghost-2-3` round-trips |
| 37 | loopback transport | envelope arrives with `__leab: 1` |
| 38 | passcode extraction | `PIN: …` is pulled from a shared message |

Latest result: **SELFTEST PASS 38/38** (Chrome headless, 2026-11-06).

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

### iPad framing and 2D shadows

`scripts/verify.mjs` runs the same page twice through iPad emulation:

```text
--device ipad --orientation portrait   → 820×1180, DPR 2, coarse pointer
--device ipad --orientation landscape  → 1180×820, DPR 2, coarse pointer
LeabTui.getFraming()                   → fits true, clearOfDock true
2D                                     → shadows false
3D                                     → shadows true
back to 2D                             → shadows false, framing refitted
hint toast                             → below the HUD, names "Hint: …"
inspector orb                          → selected tile, "Selected for play"
hand controls                          → H, not 手
L sheet                                → View trick log opens #lastTrickModal after one trick
```

`getFraming()` projects 64 points of the 6.83-radius rim through the live camera and returns NDC bounds plus the dock's top edge. This catches a fixed camera distance that crops portrait or lets an expanded dock cover the hand. The emulator matches viewport, DPR, touch and coarse pointer; it does not reproduce Safari's toolbar, safe-area insets or GPU timing, so a physical iPad pass is still listed for layout-critical releases.

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
host room             482-173        (six digits, shown without a prefix)
guest seat            1
lobby humans          2
start                 host + guest + Bot 1 + Bot 2
guest own hand        8 real tile ids
other hands           24 ghost ids, no real ids on the wire
host in-game controls leave button visible, Start hidden, "Match in progress"
actions               9–12 moves crossed the channel, a trick resolved
guest reload          token reused, auto-rejoined seat 1 without PIN/approval
host reload           same room code, trick preserved, guest retried and reconnected
guest reconnect UI    "Reconnecting to your seat…" instead of the join form
late guest            started join queued, approved into a bot seat (8 tiles)
viewer                seat -1, all hands ghosted, hand dock hidden
join pause            new guest rejected with "not accepting"
room-info copy        host Actions button and chip title
guest tab closed      seat 1 became Bot 3, score/hand preserved
console               no exceptions on either page
```

The privacy check is the important one: it reads the guest's `LeabTui.getState()` and asserts that every id outside the guest's own seat starts with `ghost-`. That value comes from the actual data channel, not from a unit stub.

### Install / full screen

`manifest.webmanifest` parses, `display` is `fullscreen`/`standalone`, and every icon path exists (180, 192, 512, maskable). The page links the manifest, `apple-touch-icon`, `apple-mobile-web-app-capable` and `viewport-fit=cover`. `.app` uses `safe-area-inset-top/bottom`; the hand dock and reset button add `safe-area-inset-bottom`. Display → Full screen exists; on iPad Chrome it falls back to the Add-to-Home-Screen hint.

### Draft switch and PIN

On a solo table the HUD has a **Draft: on/off** chip (hidden for guests):

```text
chip before          Draft: off, aria-pressed="false"
after click          Draft: on,  aria-pressed="true", state.draftMode=true
after second click   Draft: off, aria-pressed="false"
draft with bots      4 human picks, 16 picks total, hands [8,8,8,8]
live Turn log        16 draft entries, e.g. "East picked 2 tiles" with a D marker
mid-draft change     current draft finishes; next deal is automatic
seeded draft         ?seed=777 reloads to the same pool, bot draws and hands
solo update resume   ?resume=1 restores phase/trick and hides the launch menu
```

The create-room panel shows the room number and the 5-digit PIN at the same
computed font size (28 px), the PIN digits select as one block, and no toast or
chip overlaps the PIN card at 1280×900.

### Trick result and history

Showing a set applies immediately; there is **no** intermediate reveal popup.
The trick is judged only after every seat has chosen Show or Keep hidden, and
then `trickResultModal` opens for the local human — whether they showed or hid.

```text
after Show            #revealModal absent; centre entry revealed; turn advanced
result timing         result modal opens only at phase "resolving", centre 0
result frames         4 seat frames, 1 winner frame, 1 big tick
result cards          the trick's tiles; backs for every hidden set
result note           "North won 4 tiles with Black General" + reason
hidden human          still gets the result modal (tested by choosing Keep hidden)
history (1 trick)     4 seat frames, 1 winner frame, 1 big tick
history note          "East won 4 tiles with Red Advisor"
history selector      changing Round/Turn re-renders the same layout
mobile 390×844        1 column, no horizontal overflow, card scrolls internally
```

In solo the next trick waits for **Continue** on the result; in a network room
the result is informational and every human (host and guests) receives it.

### Draft deal

Run with `?mode=solo`, enable **Draft next deal**, then `LeabTui.newMatch()`:

```text
pool at start          32 tiles
human picks            4 × 2 = 8 tiles
hands after finish     [8, 8, 8, 8]
unique ids             32
phase / trick          lead / 1
leader                 seat holding r-general-0
draft modal            hidden
```

Also checked: the toggle defaults off (automatic 8-tile deal, no modal); an
in-match toggle applies to the next deal (`nextRound()` → phase `draft`); and a
reload mid-draft restores `phase: draft`, the pool, the current seat and an open
modal. The draft end condition is "every hand has 8 tiles", not a cycle count.

The P2P relay (`kind:"draft"`) shares the same action envelope as `bid` and is
host-validated, but a dedicated two-browser draft test is not part of
`net-check.mjs` yet; see Known gaps.

## Manual checklist

### Launch

- [ ] A normal load shows Choose how to play before dealing a game.
- [ ] Host approval is on by default; a guest waits for Approve/Deny.
- [ ] A generated PIN is 5 digits and is not in state/URL.
- [ ] Wrong PIN is rejected; eight wrong attempts lock the room briefly.
- [ ] Troubleshoot reports broker/host reachability and PIN accepted/not accepted.
- [ ] Reload button busts cached assets; version chip and update banner show the running/latest version.
- [ ] Switching away/back on mobile restores the join panel with code and name (PIN is not stored).
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
- [ ] Host shows an `XXX-XXX` room number, a 4-seat roster and a disabled Start until a second human joins.
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
- [ ] 1024×768 landscape: Join panel is top-aligned, scrolls internally, inputs are 16 px and focusing them does not make the page bounce.
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
| `screenshots/host-security.jpg` | approval, generated PIN, Copy room info, digest note |

A green suite does not prove the table looks right. Inspect the screenshots after any camera, material or dock change.

## Known gaps

- Headless Chrome uses SwiftShader on this machine; frame-rate and GPU-specific behaviour are not measured.
- No automated axe-core pass. The DOM uses semantic headings, buttons, `aria-live` for the coach and toast layer, and labelled icon buttons, but this has not been audited by a screen reader.
- No physical iOS/Android testing. The mobile layout is verified at 390×844 under Chrome device metrics only.
- The AI is not benchmarked for strength; only its legality and conservation are tested.
- `scripts/net-check.mjs` needs outbound access to `0.peerjs.com`; it is not part of the default `verify.mjs` run.
- Redaction is tested from the guest's JavaScript state, not by inspecting every packet. The host is trusted by design.
- The experimental draft is verified in solo and on resume; its host-relayed guest pick is code-reviewed but not exercised by `net-check.mjs`.

## Adding a test

1. Add the pure check to `selfTest()` in `script.js`; use `check("name", () => ...)`.
2. If it is a rule invariant, add it to `scripts/check.mjs` as a string/regex guard too.
3. If it is a flow, add a CDP expression to `scripts/verify.mjs` and assert on `window.LeabTui.getState()`.
4. If it is a protocol or redaction invariant, add it to `netSelfTest()` and, when it needs a real channel, to `scripts/net-check.mjs`.
5. Update this document and the count in the title assertion (`38/38`).
