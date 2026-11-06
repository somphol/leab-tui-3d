# Project State — Leab-Tui 3D

**Leab-Tui 3D — Traditional Xiangqi Trick-Taking Studio**  
**เลี๊ยบตุ่ย 3 มิติ · สตูดิโอเกมกินกองด้วยหมากรุกจีน**

> Build record for release **1.4.0**: what shipped, how it was verified, how long it took, and how many tokens it consumed.

## Status

| Field | Value |
| --- | --- |
| Project status | ✅ Complete, verified and published |
| App version | `1.4.0` |
| Repository | <https://github.com/somphol/leab-tui-3d> |
| Live page | <https://somphol.github.io/leab-tui-3d/> (Pages verified, self-test 35/35) |
| Primary branch | `main` |
| Build type | Static site; no package manager, no build step |
| Runtime files | `index.html`, `style.css`, `script.js`, `peer-manager.js` |
| Source lines | 7,163 |
| Source size | 310,181 bytes |
| Runtime dependency | Three.js r160 and PeerJS 1.5.4 from jsDelivr (pinned) |
| Network | PeerJS public broker for signalling + public STUN; no game server |
| Storage | `localStorage` + JSON export |
| Licence | MIT |

## Release 1.4.0 — serverless P2P multiplayer

Release 1.4.0 adds a **host-authoritative WebRTC table** without a game server:

- **Launch lobby** — Play solo, Host a table, Join a table. Six-character `LEAB-ABC-234` codes, copy-invite, four-seat roster.
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
| Verification, state record, commit and publish | 11:17–… | final |

**Measured session wall clock:** **1h 25m 57s** (5,157 s) from the OpenCode session record at the last token measurement. The final commit and push add a small amount.

## Token consumption

Measured from OpenCode session `ses_e4df670e0ffeOm01DFj236fffs` at 2026-11-06T11:17:17-08:00 (-08:00):

| Metric | Tokens |
| --- | ---: |
| Input | 361,358 |
| Output | 132,347 |
| Reasoning | 55,836 |
| **Total (input + output + reasoning)** | **549,541** |
| Cache read | 80,757,504 |
| Cache write | 1,087 |
| **Total including cache** | **81,308,132** |
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
- **Verification** — 35-check in-page suite, 299-check static release check, Chrome CDP harness, full-round test, 12-check two-browser WebRTC suite, 8 release screenshots.
- **Release** — README, AGENTS handoff, rules, architecture, multiplayer, protocol, testing, deployment, reproduction, data format, controls, accessibility, performance, design, FAQ, roadmap, release checklist, gallery, glossary, browser support, licence, changelog, contribution/security/privacy/support docs, citation, notices, GitHub templates, static-check workflow and a published skill.

## Verification snapshot

| Test | Result |
| --- | --- |
| `node --check script.js` | pass |
| `node --check peer-manager.js` | pass |
| `node scripts/check.mjs` | pass (299) |
| In-page self-test | **35/35** |
| `node scripts/verify.mjs` | ALL BROWSER CHECKS PASSED |
| `node scripts/net-check.mjs` | **12/12** multiplayer checks |
| Full round through the public API | `roundEnd`, 32 tiles captured, hands empty, points sum 0 |
| Host + guest | 2 humans + Bot 1 + Bot 2 |
| Guest privacy | own 8 real ids; other 24 ghost ids |
| Actions | 11 lead/follow moves crossed the data channel; a trick resolved |
| Guest close | seat 1 became a bot; hand and score preserved |
| Console exceptions | none on host or guest |
| Screenshots | hero, Thai, rules, mobile, lobby, host panel, mobile lobby, guest table |

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
