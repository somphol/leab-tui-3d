# Project State — Leab-Tui 3D

**Leab-Tui 3D — Traditional Xiangqi Trick-Taking Studio**  
**เลี๊ยบตุ่ย 3 มิติ · สตูดิโอเกมกินกองด้วยหมากรุกจีน**

> Build record for release **1.10.3**: what shipped, how it was verified, how long it took, and how many tokens it consumed.
>
> **Continuation handoff:** [`docs/CONTINUATION.md`](docs/CONTINUATION.md) — current behaviour, invariants, open items and release routine.

## Status

| Field | Value |
| --- | --- |
| Project status | ✅ Complete, verified and published |
| App version | `1.10.3` |
| Repository | <https://github.com/somphol/leab-tui-3d> |
| Live page | <https://somphol.github.io/leab-tui-3d/> (Pages verified, 1.10.3, self-test 38/38) |
| Primary branch | `main` |
| Build type | Static site; no package manager, no build step |
| Runtime files | `index.html`, `style.css`, `script.js`, `peer-manager.js`, `voice-chat.js`, `security.js`, `manifest.webmanifest`, `icons/` |
| Source lines | 14,055 |
| Source size | 591,819 bytes |
| Runtime dependency | Three.js r160 and PeerJS 1.5.4 from jsDelivr (pinned) |
| Network | PeerJS public broker for signalling + public STUN; no game server |
| Storage | `localStorage` + JSON export |
| Licence | MIT |

## Release 1.10.3 — invite, audience, watchers and a stable iPad table

A running solo table can become a hosted room with **Invite** in the top bar or Actions: the live round, hand and score are kept, a room number and PIN appear, and the host joins audio. A friend approved mid-trick enters immediately as an **audience viewer** with a banner, then takes the reserved bot seat at the next trick. Every participant sees a top-bar **👁 watcher** chip with names. Actions carry IDs and host ACKs, full snapshots are re-sent every 4 seconds, and a lagging guest can request a resync. A client watchdog reconnects a stalled seat; the host marks a silent guest offline after 20 seconds and gives the bot their seat after 30 seconds of an active turn, sending a reconnectable `seat-timeout`. The local hand fan now uses `seat === MY_SEAT` with a 0.245 rad step so an iPad guest's face-up tiles do not overlap, and promotion restores the hidden hand dock. Update no longer drops a host who started from `?mode=solo`.

## Release 1.9.22 — play history from the turn-log sheet

Opening **L** on iPad moves the turn log into the panel sheet, which hides the panel's own header and with it the old History button. The sheet header now carries **View trick log / ดูประวัติการเล่น**, the same action as the round summary. It closes the sheet and opens the shared `#lastTrickModal` round/trick browser; before the first completed trick it is disabled and explains “No completed turns yet.”

## Release 1.9.21 — the panel rail returns in iPad landscape

At 1180 px wide the CSS hides the sidebar because the pointer is coarse, but the rail mode only checked `max-width: 1024px`, so both the sidebar and the C/M/A/i/H/L circle rail disappeared. `isPanelRailMode()` now uses the same `(max-width: 1024px), (pointer: coarse)` query as the sidebar rule, and its media listener follows it. The circular navigation is back on iPad horizontal.

## Release 1.9.20 — readable hints and hand controls on iPad

The toast layer now measures the HUD and positions below it, so a wrapped Thai HUD cannot cover the hint, and the Hint toast names the suggested set instead of only confirming. Selecting a tile records it for the inspector, and opening the `i` orb falls back to that selection instead of showing the empty prompt; touch devices see a tap-specific prompt. The two circular **手** controls (panel rail and collapsed dock) now read **H**.

## Release 1.9.19 — clean 2D, fitted iPad

2D is now shadow-free: the top-down table no longer pays for a shadow pass, and the 3D view still enables cast shadows when toggled. The 2D camera also fits the whole table rim to the live stage aspect between the HUD strip and the hand dock, so iPad portrait no longer crops the rim and both iPad orientations frame the table consistently; expanding the dock re-fits the board. `scripts/browser-check.mjs` gains `--device ipad` profiles with viewport, DPR, touch, coarse pointer and Safari UA, and `scripts/verify.mjs` checks both orientations, the shadow switch and `LeabTui.getFraming()`.

## Release 1.9.18 — show a losing legal set, explain an illegal one

The showdown dock now distinguishes “your set is legal but loses” from “your submitted tiles are not a legal set of the called type.” A legal losing set keeps **Show set** enabled; an illegal set explains that only Keep hidden is possible, and the follow dock warns before sending an illegal set.

## Release 1.9.17 — join late, or watch

A started table now accepts join requests: the host approves (replaces a bot seat, keeping its hand/score), allows the guest as a **viewer**, denies, or pauses all joins for 30 minutes. Viewers get a fully hidden table (all hands ghosted), no dock/chat/voice and no actions. The host also gets **Copy room info** in Actions, and clicking the room chip as host copies the code, link and current PIN.

## Release 1.9.16 — install it full screen

The app is now an installable web app: `manifest.webmanifest`, home-screen icons, Apple standalone meta tags, safe-area padding and a Display → **Full screen** action. On iPad/iPhone, Share → Add to Home Screen gives a browser-free game; Chrome iPad has no page-fullscreen API, so that route is the reliable one. Updates keep the table: solo resumes, guests rejoin their seat, and a same-tab **host reload reopens the same room** from a sessionStorage recovery blob, restores the match, issues a fresh PIN and guests reconnect automatically.

## Release 1.9.15 — the update keeps your table

Clicking **Update/Reload** no longer drops a solo player at the launch menu: a `resume=1` boot restores the saved match and shows “Updated — your table is restored.” A guest with a rejoin token sees **“Reconnecting to your seat…”** instead of the join form; the token restores the same seat and the table. If the rejoin fails, the join form appears prefilled with the room code and name so the guest can enter the PIN. The Turn-history footer now stamps the running version, and a successful boot clears the one-shot update guard so an interrupted update retries. The host reload still ends the room.

## Release 1.9.14 — 2D pans, 3D orbits

The 2D view is now a fixed-orientation table: rotation is disabled, left-drag/one-finger drag pans, and wheel/pinch zooms. 3D keeps the orbit controls; cinema is 3D-only. The launch menu also has a Draft toggle for solo/host play, synced with the HUD chip and Actions — easier to find on an iPad. iOS page autozoom is disabled (viewport, touch-action and 16 px coarse-pointer controls) while the canvas keeps its own pinch zoom. The distance fog is removed, so zooming out no longer fades the table into the light background.

## Release 1.9.13 — readjust the board on a tablet

A bottom-right **reset board** shortcut appears on touch and ≤1024 px layouts. It returns the world to the local seat, switches to 2D, re-fits the canvas and re-syncs the table. If the WebGL context was lost, it reloads instead; a guest then auto-rejoins the room. Context-loss and restore handlers keep the table recoverable on iPad Safari.

## Release 1.9.12 — the verdict waits, and everyone sees it

Showing a set applies immediately; there is no intermediate reveal popup. The trick is judged only after every seat has chosen Show or Keep hidden, and the result summary then opens for **every human** — host and guests, reveal or hidden — with the shared card comparison and reason. In solo the next trick waits for Continue. Guests also rejoin the same seat automatically after a reload or version update via a per-seat token, while the host stays open. The captured piles now sit on the rim with arc spacing, centre plays use a wider grid, the history modal refreshes live and closes when the turn reaches you, the view toggle reads **2D / 3D**, and older iPad Safari gets `vh` fallbacks.

## Release 1.9.11 — the seed reaches the draft

`?seed=123` (and `newMatch({ seed })`) now flows into `state.seed` at boot, so the draft pool shuffle and the random bot draws are reproducible across reloads. Rounds derive from the match seed, and a redraw uses a derived seed, so it deals a different hand.

## Release 1.9.10 — random bot picks

The experimental bot no longer takes the two strongest tiles. It draws two tiles uniformly at random from the remaining pool, so a bot hand is not simply the best available cards. The pool shuffle and bot draws are reproducible when a seed is set.

## Release 1.9.9 — table draft switch and a readable PIN

The Draft mode gets a **Draft: on/off** chip in the HUD so the host can switch it without opening Actions; the change applies to the next deal and may be made while a draft is running. Every pick, including bot picks, appears in the live Turn log. The host room PIN now uses the same 28 px mono treatment as the room number, in its own gold card.

## Release 1.9.8 — one comparison popup

The reveal result and the turn-history detail now use the captured-pile popup language: one frame per seat, the played tiles as mini cards, a large green ✓ and gold frame on the winner, and the comparison plus reason in the gold-bordered note. The sidebar live log and the flat captured-pile grid are unchanged.

## Release 1.9.7 — experimental draft deal

The host can enable a draft deal (off by default) in the lobby or from Actions. The automatic deal is replaced by a public pool: seats take turns taking 2 tiles, four times, for 8 each; bots pick automatically and the red-General holder leads. The draft is host-validated and relayed in P2P, resumes mid-draft, and disables redraw. Documented as experimental in `docs/DRAFT.md`.

## Release 1.9.6 — winner badge on captured cards

Cards from the winning seat in a captured pile now carry a large green ✓ and a gold frame, including face-down winners.

## Release 1.9.5 — reveal result as a comparison

The reveal panel now lists the trick’s sets like the Turn Log, with a green ✓ on the current winner and a short “You are ahead / The trick stays with …” footer. Continue still controls when the reveal is applied and the trick swept.

## Release 1.9.4 — Chuan-aware explanations

A Chuan claim stores a real Soldier set and marks the trick. The result banner, Turn history, undo explanation and captured-pile popup explain that the Soldier won by the special seven-piles-plus-last-Soldier rule, not by rank. The pile popup also shows the winner, comparison and reason.

## Release 1.9.3 — illustrated rules

The rules modal now includes a visual piece ladder and six worked examples with tile faces (single, pair, Sa Hoo, See Hoo, Soldier sets, Chuan). A How to play button opens it from the launch menu.

## Release 1.9.2 — Chuan is a standard rule

Chuan is standard Leab-Tui, not a house rule: all eight piles, or seven piles plus the last Soldier revealed for the final trick. The rules text and docs say so; the house-rule note is only the unsupported Soldier-beats-General variant.

## Release 1.9.1 — staged drag and the arrangement record

Dragging a tile into the battle ring uses the dragged tile (or the selection it belongs to), never a stale selection. Follow calls stage one tile at a time and send on the final tile; leads stage and confirm with Lead. `docs/ARRANGEMENT.md` records the zones, staging, reveal pause, captured piles and layout relay.

## Release 1.9.0 — reveal announcement

A local reveal (Show set or double-click) opens a big-button result panel: the set, whether it beats the current best and why. The showdown is paused; pressing **Continue** applies the reveal, advances the queue or resolves and sweeps the trick.

## Release 1.8.9 — capture fixes and exits

Revealed tiles now stay face-up in the pile, and all tiles from one trick form one pile. Turn history marks the winner with a green check. The round summary no longer offers New match; Leave room sits in the top bar, and the Actions button reads **Cancel turn**.

## Release 1.8.8 — deeper personal zone

The private arrangement band runs from radius 2.92 to 4.88 with a wider arc (±0.98 rad), giving rows and fans more depth while keeping the centre and other seats off-limits.

## Release 1.8.7 — zones and Turn wording

A gold battle ring marks the centre and a private arc marks the player's arrangement area; drops outside the arc snap back. Double-clicking your own centre tile at showdown shows it. The HUD now reads **Round · Turn** and **Now** for the current player, with **Turn log** / **Last turn** wording.

## Release 1.8.6 — drag to play

Dropping a hand tile inside the centre play zone plays it: a single when nothing is selected, or the current selection when tiles are pre-selected. Leading validates the combo; following sends the called count face-down. Invalid or out-of-turn drops snap back. The dock buttons remain.

## Release 1.8.5 — trick history and self-healing refresh

The Trick Log now has a round/trick browser showing the call, the winner, every seat's set and the actual tiles played (backs for hidden sets). The summary links to it and offers the host a 30-second auto-next toggle. A cached-HTML boot guard compares `app-version` with `state.json` and reloads once with a cache-busting query.

## Release 1.8.4 — pile provenance

Every captured tile records the seat that played it. The pile popup shows **from {seat}** on face-up and face-down cards, so a pile can be reviewed as a record of the trick.

## Release 1.8.3 — show a losing set

At showdown any legal set of the called type may be shown, even if it loses. Showing it reveals the set and leaves it face-up in the winner's pile; **Keep hidden** is the alternative. The button is **Show set**.

## Release 1.8.2 — congratulations and host-gated rounds

The summary screen now holds a small Three.js stage with a dancing rabbit, hippo and parrot plus a celebration jingle. Guests only get **Back to table**; the host gets **Next round** with a 5-second countdown and an automatic start. The showdown buttons and the HUD Top/3D and Result controls now receive clicks.

## Release 1.8.1 — manual showdown and result tools

Every seat now chooses to show or keep hidden; the leader is prompted first and the trick never auto-collects. A host-set 0/2/4/6-second banner names the winner and compares the revealed sets, a **Last trick** HUD button reopens the details, the view control is an explicit Top/3D switch, and pile cards use the Ranks ladder's tile and typography.

## Release 1.8.0 — top view, hand arrangement and the showdown order

The table opens from straight above, framed so the whole board and the player's hand are visible. A labelled **Top view / 3D view** chip in the HUD switches to the existing orbit view, and **Reset camera** returns to the top.

Players can drag any face-up hand tile anywhere on the felt; **Tidy hand** restores the arc, and the other seats see the arrangement as coordinates only.

The trick flow now follows the source: the leader and every follower send **face-down**; after all four have sent, the leader reveals first and each follower chooses to show or stay hidden. Hidden captured tiles stay face-down in the winner's pile, and clicking a pile opens it left-to-right with backs for hidden tiles.

## Release 1.8.0 — top view and hand arrangement

The table opens from straight above, framed so the whole board and the player's hand are visible. A labelled **Top view / 3D view** chip in the HUD switches to the existing orbit view, and **Reset camera** returns to the top.

Players can drag any face-up hand tile anywhere on the felt; only the table edge and the very centre are excluded. The first drag snapshots the whole hand so later plays do not re-flow it, and **Tidy hand** restores the arc. Positions are relayed to the other seats as coordinates only (never tile identities), and a new deal resets the layout.

## Release 1.7.2 — room numbers and self-update

Room numbers are shown as `482-173`: the `LEAB-` prefix stays internal to the peer id, and old prefixed codes still normalise. The launch, host, join and waiting dialogs share a pinned **Reload version** bar that turns gold and shows **Update to vX** when a newer build exists.

The app checks `state.json` once on first open and then at most every 5 minutes, plus when returning to the tab. If the launch menu is open with no room or match, a newer build reloads the page once; otherwise an update banner appears. A session guard and a `?v=` confirmation check prevent loops.

## Release 1.7.1 — automatic audio join

**Join audio chat when the table starts** is a new checkbox, on by default, in the launch menu, Host a game and Join a game. The microphone prompt appears on the Connect or Start click, and voice joins as the seat/table becomes ready. Denial never blocks the match and leaves the **Join audio** pill available. The choice persists as `autoAudio`.

Silent invite links (`?room=…&name=…`) skip the mic request because the browser needs a user gesture; the pill remains for those.

## Release 1.7.0 — friendlier launch, audio and themes

The launch dialog now leads with one **Play now** action and keeps **Host a game** / **Join a game** as plain-language secondary choices. The host panel is a room-code card plus **Copy invite + PIN** / **Share invite + PIN**, with join requests appearing only when someone is waiting. The join panel has a single **Paste invite** button that fills both the code and the PIN.

**Join audio** is an obvious gold pill in the top bar that joins the mic call in one tap and then acts as the mute control. An **EN / TH** switch now sits inside the launch dialog and Display, and the choice persists.

Fixed: Table Chat no longer keeps a dark background while using light-theme text, so it is readable on Parchment and Daybreak; success/danger colours use per-theme tokens. The host status line clears instead of leaving "Opening the room…", and the mobile top bar no longer overflows at 390 px.

## Release 1.6.6 — simpler host panel

Removed the separate **Copy invite link** button and the “Share this six-digit code” label. **Copy invite + PIN** and **Share invite + PIN** already contain the link, so the host panel is shorter and less repetitive.

## Release 1.6.5 — persistent launch prompt

Tapping the backdrop of the Host/Join launch prompt no longer dismisses it. Only the explicit close (×), Back, or Escape does. This prevents an accidental outside tap from hiding the room controls.

## Release 1.6.4 — iPad join and approval contrast

- iPad/tablet landscape: 16 px inputs stop Safari auto-zoom; tall lobby modals top-align and scroll internally so the keyboard does not bounce the page.
- Approve and Deny are solid green/wine buttons with larger hit areas; Approve all is gold; Copy PIN/New PIN have stronger contrast.

## Release 1.6.3 — 5-digit PIN and clearer exit

Room codes are now numeric `LEAB-482-173` (six digits; 1,000,000 possibilities). PIN management is simplified to **exactly 5 digits**, auto-generated on room open, with **New PIN** to rotate. Common, repeated and sequential values are rejected; the PIN remains a digest in memory. This is a deliberate usability trade-off: 5 digits is only 100,000 possibilities, so **approval is the real access control** and the 8-attempt/60-second lockout stays. **Leave room** is a solid wine button with stronger contrast. iPad landscape uses 16 px inputs to prevent Safari auto-zoom and top-aligns tall lobby modals with internal scrolling so the keyboard does not bounce the page.

## Release 1.6.2 — visibility and diagnostics

- **Version chip + Reload** in the footer and launch overlay; Reload uses a cache-busted URL, removes any PIN query param, and confirms if a room/match is active.
- **Update banner** checks `state.json` with `no-store` and offers Reload when a newer version is deployed.
- **Versioned assets** — CSS, `script.js` and the three module imports carry `?v=1.6.2`, so a forced reload actually busts the module graph.
- **Troubleshoot panel** with Probe with PIN / without PIN, reporting PIN requirement, acceptance, approval, started state and free seats without creating a pending request.
- **Join intent restore** — mobile tab reload restores the join panel with room code + name; PIN is not persisted.
- **Staged join errors** — broker, host and ICE timeouts are distinct; Connect becomes Retry.

## Release 1.6.1 — one-paste sharing

- A 20-character PIN is generated automatically. **New PIN** rotates it; policy detail lives behind ⓘ.
- **Copy invite + PIN** puts the room URL and the generated passcode in one clipboard payload.
- **Share invite + PIN** uses the native share sheet where available and falls back to the clipboard.
- **Paste** on the guest PIN field extracts `PIN:`/`Passcode:`/`รหัส:` from the host's message, or accepts the passcode alone.
- The link still never contains the PIN; only the shared text does.
- The host panel now shows **Listening for guests**, **A guest is connecting**, waiting count or **Ready to start**, and warns to keep the host tab open/awake.
- Join failures distinguish broker, host and ICE timeouts, retry once, and turn Connect into Retry.

## Release 1.6.0 — room hardening

Release 1.6.0 assumes the source and protocol are public and treats the room code/PIN as gates, not authentication.

- **Host approval by default.** `hello` → PIN check → pending queue. Only **Approve** assigns a seat and sends `welcome`; **Deny**, wrong PIN, expiry and full/in-progress close the connection. Pending requests expire after 120 seconds; six can wait.
- **Strong optional PIN.** 15–64 characters, upper case, lower case, digit and symbol; no whitespace; reject common passwords, sequences, repeated characters, the room code and host name. **Generate** makes a 20-character grouped passphrase. The host stores only SHA-256 in memory; the plain PIN is shown once for copying and never enters state, roster, URL, export or localStorage.
- **Copy room info** copies code + optional PIN + link. **Copy invite link** never includes the PIN. The warning says Copy room info puts the PIN in the clipboard.
- **Abuse caps.** 16 connections, 6 pending, 80 messages/10 s per connection, 16 KB envelopes, 200-char/350 ms chat, six action tiles, voice calls only from approved roster peer IDs, 8 wrong PINs → 60 s lockout.
- The UI, README and SECURITY.md state plainly that approval is the access-control decision and the PIN is not authentication.

## Release 1.5.0 — table chat and independent voice

Release 1.5.0 adds two communication paths without changing the authoritative game protocol:

- **Table chat** — a collapsible glass panel in the sidebar. Guest messages go to the host, are escaped, whitespace-normalised, capped at 200 characters and rate-limited to one per 350 ms. The host appends one entry and echoes it to every guest. New guests receive the last 30 messages in `welcome`; history is memory-only.
- **Voice** — opt-in **Join voice** requests the microphone on a user gesture. Voice-active humans form a full PeerJS media mesh; remote streams attach to hidden `<audio class="remote-player-audio" autoplay playsinline>` elements. The host only relays `voice` presence and `peerId`s, never audio.
- **Independent mute controls** — **Mute mic** toggles `localStream.getAudioTracks()[0].enabled` without dropping the call. **Mute others** toggles `.muted` on every remote `<audio>`; neither affects the other. The buttons show their state and the status line explains "microphone muted", "others muted" or both.
- **Speaking pulse** — an analyser per local/remote stream drives a green pulse on the seat avatar and scoreboard row. The analyser is not connected to `destination`; playback is the audio element.
- **Verification** — the two-browser suite now exercises chat round-trip, voice mesh attachment, mic mute and deafen with a synthetic oscillator stream, 17 checks total.

## Release 1.4.1 — launch choice and a clear exit

The launch overlay now appears on every normal load, even when a solo save exists. It offers Play solo, Host a table, Join a table and, when applicable, **Resume match** with the round, trick and current score. A first visit no longer deals a hidden game behind the overlay, so there is no phantom save to resume.

During a network game, the Actions panel carries a wine-coloured **Leave room** button. It is full-width below the action grid, confirms first, and explains the consequence:

- **Host:** closes the room for every guest; their seats become bots and the code stops working.
- **Guest:** leaves the table; a bot takes over their seat and the match continues.

The host lobby hides **Start table** after kickoff, relabels its back action **Leave room**, and shows "Match in progress". On phones the room chip compresses to a 34 px status icon so the rules button stays reachable.

## Release 1.4.0 — serverless P2P multiplayer

Release 1.4.0 adds a **host-authoritative WebRTC table** without a game server:

- **Launch lobby** — Play solo, Host a table, Join a table. Six-digit `482-173` room numbers, copy-invite, four-seat roster.
- **Two-human start** — the host can start as soon as one guest is connected. Every empty seat becomes `Bot n`.
- **Host authority** — only the host deals, scores, runs the AI and validates actions. Guests send one `action` message and render the state they receive.
- **Per-seat redaction** — `sanitizeForSeat` replaces other hands and unrevealed centre/log/last-trick plays with stable `ghost-<seat>-<index>` ids. The host-only tag map and undo snapshot never leave the browser.
- **Ghost meshes** — 32 back-only meshes let a guest see a believable face-down hand without knowing any tile identity.
- **Seat-relative view** — the table world rotates so the guest's own seat is at the bottom; the camera and lights stay fixed.
- **Disconnect-to-bot** — a guest who leaves keeps their seat, hand, captures and score. A bot takes over and play continues.
- **No host migration** — a closed host ends the room; guests get a "Table closed" escape to solo.

The four-seat rule contract is unchanged: 32 tiles, four winds, eight each. The original request mentioned a six-player table (a poker-template assumption); six seats would require a different deck and rules, so the release documents the deviation rather than faking the game. See [docs/MULTIPLAYER.md](docs/MULTIPLAYER.md).

## Build timeline

| Milestone | Time (local) | Elapsed |
| --- | --- | --- |
| Session opened | 2026-11-06 10:05:33 | 0m |
| Repository and architecture read | 10:05–10:12 | ~7m |
| Transport module, seat refactor, lobby markup | 10:12–10:38 | ~26m |
| First browser boot, lobby and host-room test | 10:38–10:44 | ~6m |
| Two-browser harness; privacy, action and disconnect fixes | 10:44–11:04 | ~20m |
| Docs set, protocol, release files, screenshots | 11:04–11:17 | ~13m |
| Verification, state record, commit and publish | 11:17–11:31 | ~14m |
| Review gap between requests | 11:31–12:14 | idle |
| 1.4.1 launch name, resume card, Leave room, phone fit | 12:14–12:34 | ~20m |
| 1.5.0 chat, voice mesh, mute/deafen, screenshots | 12:34–13:15 | ~41m |
| 1.6.0 approval, PIN policy, caps, security docs | 13:15–14:30 | ~75m |
| 1.6.1 one-paste invite + PIN sharing, auto PIN UI | 14:30–15:20 | ~50m |
| 1.6.2 version/reload, diagnostics, join restore | 15:20–16:35 | ~75m |
| 1.6.3 five-digit PIN, clearer Leave room | 16:35–17:05 | ~30m |

**Measured session wall clock:** **24h 29m 37s** (88,177 s) from the OpenCode session record at the last token measurement. This includes the idle gap while waiting for review feedback; active work is roughly 1h 40m. The final commit and push add a small amount.

## Token consumption

Measured from OpenCode session `ses_e4df670e0ffeOm01DFj236fffs` at 2026-11-06T12:33:59-08:00 (-08:00), covering 1.4.0 and 1.4.1:

| Metric | Tokens |
| --- | ---: |
| Input | 6,615,671 |
| Output | 607,856 |
| Reasoning | 535,004 |
| **Total (input + output + reasoning)** | **7,758,531** |
| Cache read | 705,187,840 |
| Cache write | 1,087 |
| **Total including cache** | **712,947,458** |
| Cost | $0.00 (as reported) |

Cache figures describe context reuse, not additional generated work. They are reported separately so the headline number stays comparable to a normal token count. The session ID allows re-measurement from `opencode.db`; the final publishing turns add a small amount.

## What shipped

- **Rules engine** — 32-tile deck, nine combination types, strict comparison, red-beats-black tie-break, earlier-play tie, 8-pile Chuan scoring.
- **Four-seat game** — human South plus three heuristic AI seats in solo; host + up to three guests in P2P.
- **3D table** — 32 bevelled cylindrical tiles plus 32 ghost meshes, procedural Hanzi faces and lacquered backs, mahogany felt, soft shadows, seat rings, labels, dust, deal/flip/capture animations, OrbitControls, reset/top/cinematic cameras, portrait framing, seat-relative world rotation.
- **Learning tools** — tile inspector, live bilingual coach, deterministic Hint, Undo & Learn comparison, full rules drawer.
- **Multiplayer** — lobby, room codes, invite links, host authority, redaction, ghost meshes, bot fill, disconnect-to-bot, room chip, guest table.
- **Bilingual UI** — EN ⇄ TH across 315 dictionary keys, dynamic coach/log/summary strings, tile names, ARIA labels, lobby copy and 3D labels.
- **Audio** — synthesised shuffle, clack, flip, sweep, win, lose, undo; unlocked on first gesture; no files.
- **Persistence** — autosaved solo match, preferences and statistics; reload-resume; versioned JSON export with app, credits, stats and game; network saves marked non-resumable.
- **Verification** — 38-check in-page suite, 342-check static release check, Chrome CDP harness, full-round test, 21-check two-browser WebRTC suite, 20 release screenshots.
- **Release** — README, AGENTS handoff, rules, architecture, multiplayer, protocol, testing, deployment, reproduction, data format, controls, accessibility, performance, design, FAQ, roadmap, release checklist, gallery, glossary, browser support, licence, changelog, contribution/security/privacy/support docs, citation, notices, GitHub templates, static-check workflow and a published skill.

## Verification snapshot

| Test | Result |
| --- | --- |
| `node --check script.js` | pass |
| `node --check peer-manager.js` | pass |
| `node scripts/check.mjs` | pass (342) |
| In-page self-test | **38/38** |
| `node scripts/verify.mjs` | ALL BROWSER CHECKS PASSED |
| `node scripts/net-check.mjs` | **23/23** multiplayer checks |
| Full round through the public API | `roundEnd`, 32 tiles captured, hands empty, points sum 0 |
| Host + guest | 2 humans + Bot 1 + Bot 2 |
| Guest privacy | own 8 real ids; other 24 ghost ids |
| Actions | 11 lead/follow moves crossed the data channel; a trick resolved |
| Guest close | seat 1 became a bot; hand and score preserved |
| Console exceptions | none on host or guest |
| Screenshots | hero, Thai, rules, mobile, lobby, host panel, mobile lobby, mobile leave, guest table, chat/voice |

The detailed evidence is in [docs/TESTING.md](docs/TESTING.md).

## Credits

| Role | Credit |
| --- | --- |
| Design, implementation, verification, documentation | **OpenCode 2.2.5** with **DeepSeek V4.1 Flash** (`opencode-go/deepseek-v4.1-flash`) |
| Rules reference | Navee Angsuputiphant, “กฏกติกาการเล่น เลี๊ยบตุ่ย” (2016) |
| 3D engine | Three.js r160, MIT |
| Multiplayer transport | PeerJS 1.5.4, MIT; public broker and STUN |
| Xiangqi tile names | Thai Wikipedia, หมากรุกจีน |
| Type | System fonts only (Iowan Old Style / Palatino / Thonburi / Sarabun fallbacks) |

## Known issues

- Four-player only; the two- and three-player variants are not implemented. Four seats is the rules contract, not a missing poker seat.
- No host migration or reconnect token: a closed host ends the room.
- Public STUN only, no TURN; symmetric NAT or a strict firewall can block the data channel.
- No turn timer; an idle guest can stall the hosted table.
- Redaction protects the wire, not the host browser or a guest's own client. No authentication or anti-cheat.
- Text size scales the interface, not the 3D table (intentional).
- The source is ambiguous about Ngoh Hoo and the Lak Hoo colour rule; the interpretation is documented in [docs/RULES.md](docs/RULES.md).
- Undo is a one-trick rewind and is not restored after a reload; it is host-only in multiplayer.
- The AI is heuristic; it is not a search engine and does not model hidden hands.
- Mobile is verified under Chrome device emulation at 390×844, not on physical hardware.
- Three.js and PeerJS are loaded from a CDN; the table and rooms cannot start without network access.

## Continuity

- Local master: `~/Projects/leab-tui-3d`
- Live: <https://somphol.github.io/leab-tui-3d/>
- Skill: `leab-tui-p2p-studio` (local `~/.config/opencode/skills/`, public mirror `~/Projects/opencode-skills/`)
- Full agent handoff: [AGENTS.md](AGENTS.md)
- Reproduction guide: [docs/REPRODUCTION.md](docs/REPRODUCTION.md)
