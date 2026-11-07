# Project State — Leab-Tui 3D

**Leab-Tui 3D — Traditional Xiangqi Trick-Taking Studio**  
**เลี๊ยบตุ่ย 3 มิติ · สตูดิโอเกมกินกองด้วยหมากรุกจีน**

> Build record for release **1.8.6**: what shipped, how it was verified, how long it took, and how many tokens it consumed.

## Status

| Field | Value |
| --- | --- |
| Project status | ✅ Complete, verified and published |
| App version | `1.8.6` |
| Repository | <https://github.com/somphol/leab-tui-3d> |
| Live page | <https://somphol.github.io/leab-tui-3d/> (Pages verified, self-test 38/38) |
| Primary branch | `main` |
| Build type | Static site; no package manager, no build step |
| Runtime files | `index.html`, `style.css`, `script.js`, `peer-manager.js`, `voice-chat.js`, `security.js` |
| Source lines | 12,205 |
| Source size | 511,304 bytes |
| Runtime dependency | Three.js r160 and PeerJS 1.5.4 from jsDelivr (pinned) |
| Network | PeerJS public broker for signalling + public STUN; no game server |
| Storage | `localStorage` + JSON export |
| Licence | MIT |

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

**Measured session wall clock:** **23h 27m 23s** (84,443 s) from the OpenCode session record at the last token measurement. This includes the idle gap while waiting for review feedback; active work is roughly 1h 40m. The final commit and push add a small amount.

## Token consumption

Measured from OpenCode session `ses_e4df670e0ffeOm01DFj236fffs` at 2026-11-06T12:33:59-08:00 (-08:00), covering 1.4.0 and 1.4.1:

| Metric | Tokens |
| --- | ---: |
| Input | 5,620,165 |
| Output | 572,712 |
| Reasoning | 493,666 |
| **Total (input + output + reasoning)** | **6,686,543** |
| Cache read | 662,606,592 |
| Cache write | 1,087 |
| **Total including cache** | **669,294,222** |
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
