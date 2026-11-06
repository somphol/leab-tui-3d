# Leab-Tui 3D — Traditional Xiangqi Trick-Taking Studio

[![Live demo](https://img.shields.io/badge/live-demo-d8b26b)](https://somphol.github.io/leab-tui-3d/)
[![Release](https://img.shields.io/badge/release-v1.6.1-7b2434)](CHANGELOG.md)
[![License: MIT](https://img.shields.io/badge/license-MIT-brightgreen)](LICENSE)
[![No build](https://img.shields.io/badge/build-none-lightgrey)](docs/ARCHITECTURE.md)
[![Three.js r160](https://img.shields.io/badge/three.js-r160-79c3a3)](https://threejs.org/)
[![P2P](https://img.shields.io/badge/multiplayer-WebRTC-d8b26b)](docs/MULTIPLAYER.md)

A bilingual, interactive 3D studio for **เลี๊ยบตุ่ย (Leab-Tui)**, the Thai trick-taking game played with the 32 tiles of a Chinese chess (Xiangqi) set. Thirty-two carved tiles, four seats, eight tiles each, and a full rules engine with a beginner coach. Play solo against three bots or host a serverless WebRTC table for up to four humans, with empty seats filled by bots.

**Live demo:** <https://somphol.github.io/leab-tui-3d/>  
**Stack:** vanilla HTML5, CSS3, ES2022 JavaScript, Three.js r160 (CDN). No build step, no framework, no API keys, no tracking.

![Leab-Tui 3D table with the coach and tile inspector open](screenshots/hero.jpg)

## What makes it different

- **A real trick-taking engine, not a toy.** Leab (single), Tui (pair), Sa Hoo, See Hoo, Ngoh Hoo, Lak Hoo, and the Soldier sets; red-beats-black tie-breaking; face-down submissions; revealed-only comparison; the eight-pile Chuan bonus.
- **Serverless P2P multiplayer.** Host a room, share a six-character code or invite link, and play with up to three guests over a WebRTC data channel. The host browser is authoritative; each guest receives only their own hand. Two humans are enough to start — empty seats become bots, and a guest who leaves mid-game is replaced by a bot without stopping the table. See **[docs/MULTIPLAYER.md](docs/MULTIPLAYER.md)**.
- **Host approval and an optional strong PIN.** Guests request a seat; the host approves or denies each one. A 20-character PIN is generated automatically (15–64 chars, upper/lower/digit/symbol); **New PIN** rotates it is checked against an in-memory SHA-256 digest and never appears in the invite link or saved game. One-click **Copy room info** includes the code, link and PIN; **Copy invite link** never includes the PIN.
- **Table chat and independent P2P voice.** A collapsible glass chat routes messages through the host; a full-mesh voice call carries audio directly between browsers. **Mute mic** toggles the local track, **Mute others** mutes every remote `<audio>` element, and a green pulse marks the active speaker. No voice is recorded.
- **Carved 3D Xiangqi tiles.** Every tile is a bevelled cylinder with a procedurally painted Hanzi face, raised rim and a lacquered back. Dealing, flipping, playing and capture sweeps are animated with lerped transforms.
- **A table you can orbit.** Drag to rotate, scroll to zoom, right-drag to pan. Reset, top view and a cinematic orbit are one click away.
- **A coach that explains the trick.** The side panel names a legal lead, warns when a set cannot beat the table, counts the remaining tiles and explains rank dominance. It never plays for you.
- **A rank-order quick reference.** The **Ranks** button at the top-left HUD opens a pictorial ladder — red and black Hanzi, Thai/English names, rank numbers and the red/earlier-play tie rules. Click again, press `Esc`, or click outside to hide.
- **Display settings for long sessions.** Four interface text sizes (Small, Default, Large, Extra large) and five themes — **Mahogany**, **Jade Court**, **Midnight Lacquer**, **Parchment** and **Daybreak** — that recolour both the panels and the 3D felt, wood, inlay and lighting. Two of them are genuinely bright. Preferences persist.
- **Undo and Learn.** Rewind the last trick and read a side-by-side comparison of your set and the winning set, with the hierarchy in view.
- **Bilingual everywhere.** EN ⇄ ไทย switches the header, HUD, rules, tile names, coach, summaries, log, inspector and ARIA labels without a reload.
- **Synthesised sound.** Shuffles, wooden clacks, flips, sweeps and win/lose stings are generated with the Web Audio API. No audio files, no network requests.
- **Local-first.** Match state, preferences and statistics live in `localStorage`. **Export JSON** downloads a complete, documented game record.

## Multiplayer in one minute

![Multiplayer lobby](screenshots/lobby.jpg)

1. On load, the **Choose how to play** overlay appears: Play solo, Host a table, Join a table, or Resume match when a solo save exists.
2. Enter **Your name**, then choose **Host a table**. The browser opens a room and shows a code such as `LEAB-ABC-234`.
3. Send the code or the **Copy invite link** URL to a friend. They open it, enter their own name and the PIN if set, then request a seat. **Copy room info** sends code + PIN + link in one paste.
4. Approve each guest request in the host lobby. Only approved guests get a seat and game state.
5. As soon as **two humans** are connected, press **Start table**. Empty seats are filled with bots (`Bot 1`, `Bot 2`).
6. If a guest closes the tab, their hand and score stay in place and a bot takes over the seat. The host can leave with the wine-coloured **Leave room** button in Actions; it confirms first and closes the room for everyone.
7. Open **Table chat** to type to the room. Chat is delivered through the host and echoed to every guest.
8. Press **Join voice** to request the microphone. The voice mesh connects active speakers directly; **Mute mic** stops your track without dropping the call, and **Mute others** deafens every remote stream locally.

The room is peer-to-peer: **no game server**, no account, no database. PeerJS's public broker is used only for the first WebRTC handshake; game traffic then flows directly between browsers. The host runs all rules and AI. Guests receive a redacted state in which every other hand and every hidden centre play is replaced by a face-down placeholder. Full protocol: **[docs/PROTOCOL.md](docs/PROTOCOL.md)** · operations and troubleshooting: **[docs/MULTIPLAYER.md](docs/MULTIPLAYER.md)**.

> **Privacy boundary.** Redaction stops accidental leaks over the wire, but the host browser necessarily knows every hand. Play with people you trust; this is a teaching table, not an anti-cheat tournament server.

## The game in one minute

| | |
| --- | --- |
| **Players** | 1 human + 3 AI in solo; host + up to 3 guests in P2P, bots fill empty seats |
| **Tiles** | 32 Xiangqi tiles: 16 red, 16 black |
| **Deal** | 8 tiles each |
| **Hierarchy** | General 帥/將 > Advisor 仕/士 > Elephant 相/象 > Chariot 俥/車 > Horse 傌/馬 > Cannon 炮/包 > Soldier 兵/卒 |
| **Tie-break** | Red beats black at equal rank; equal rank + colour keeps the earlier play |
| **Calls** | Leab ×1, Tui ×2, Sa Hoo ×3, See Hoo ×4, Ngoh Hoo ×5, Lak Hoo ×6, Soldier sets ×3–5 |
| **Trick** | Everyone sends the called number of tiles. Only revealed sets compete. The winner takes all 4×N tiles and leads next |
| **Scoring** | 2 piles = par (0). Each pile above or below is ±1. All 8 piles = Chuan, **16 points**. First to 20 wins |

The **Display** panel also carries the text-size and theme controls. Full rules, including the source and the interpretation choices: **[docs/RULES.md](docs/RULES.md)**.

## Quick start

```bash
cd leab-tui-3d
python3 -m http.server 8123
# open http://127.0.0.1:8123/
```

An HTTP server is required because `script.js` is an ES module. The page needs network access for the pinned Three.js CDN; multiplayer additionally needs `cdn.jsdelivr.net` for PeerJS and the public broker at `0.peerjs.com`. Everything else is local. Opening `index.html` directly with `file://` will not load the module in most browsers.

Useful launch URLs:

| URL | Behaviour |
| --- | --- |
| `/` | Launch overlay: solo, host, join, or Resume match when a solo save exists |
| `/?mode=solo` | Skip the overlay and deal/resume a solo table |
| `/?mode=host&name=Ana` | Open a room immediately |
| `/?room=ABC234` | Open the join panel with the code prefilled; the guest confirms their name |
| `/?lobby=1` | Force the launch overlay |
| `/?selftest=1` | Run the 35-check suite |

### Controls

| Action | Mouse / keyboard |
| --- | --- |
| Orbit the table | Drag with the left mouse button |
| Zoom | Scroll / pinch |
| Pan | Right-drag |
| Select a tile | Click a face-up tile in your hand |
| Select via the accessible list | Click a chip in **Your hand** |
| Hint / Clear | Buttons, or `H` / `Esc` |
| Lead / Reveal / Play face-down | Buttons under the table |
| Display settings | `Aa` in the stage toolbar |
| Rank order | **Ranks** at the top-left HUD |
| Multiplayer lobby | **Multiplayer** in Actions, or the room chip in the header |
| Rules / About | `?` and `i` in the header |

See **[docs/CONTROLS.md](docs/CONTROLS.md)** for touch and keyboard details.

## Three screens, one language toggle

| English table with the inspector | ไทย |
| --- | --- |
| ![English table](screenshots/hero.jpg) | ![Thai table](screenshots/thai.jpg) |

| Rules drawer | Phone layout |
| --- | --- |
| ![Rules](screenshots/rules.jpg) | ![Mobile](screenshots/mobile.jpg) |

![Rank order quick reference](screenshots/ranks.jpg)

![Table chat and voice controls](screenshots/chat-voice.jpg)

### Themes

![Jade Court](screenshots/jade.jpg)
![Midnight Lacquer](screenshots/midnight.jpg)
![Parchment](screenshots/parchment.jpg)
![Daybreak](screenshots/daybreak.jpg)

## Run and verify

```bash
# syntax
node --check script.js
node --check peer-manager.js
node --check voice-chat.js

# dependency-free release check: files, links, version, i18n, rules and privacy invariants
node scripts/check.mjs

# headless rules + browser smoke test (needs Chrome + a local server)
python3 -m http.server 8123 &
node scripts/verify.mjs

# two-client WebRTC test (needs Chrome + outbound access to 0.peerjs.com)
node scripts/net-check.mjs

# interactive CDP harness
node scripts/browser-check.mjs --url "http://127.0.0.1:8123/?selftest=1"
```

The browser self-test is also available at `?selftest=1`; it prints a 38-check report into the page and sets the document title to `SELFTEST PASS 38/38` or `SELFTEST FAIL n/38`. Verification details and the manual checklist are in **[docs/TESTING.md](docs/TESTING.md)**.

## Project layout

```text
index.html              single page, import map, modals, lobby markup
style.css               dark mahogany visual system, responsive layout, lobby
script.js               rules engine, AI, 3D scene, audio, i18n, persistence, authority, chat
peer-manager.js         room codes, PeerJS host/client, loopback test transport
voice-chat.js           full-mesh media calls, mic mute, deafen, speaking meter
security.js             PIN policy, generated passphrases, deny-list, SHA-256 digest
scripts/check.mjs       dependency-free static release check
scripts/verify.mjs      headless browser verification
scripts/net-check.mjs   two-client WebRTC verification
scripts/browser-check.mjs  reusable CDP harness
docs/                   rules, architecture, multiplayer, protocol, tests, deployment
screenshots/            release screenshots
state.json              build record: time, tokens, model, harness
```

The load order and module boundaries are documented in **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

## Design notes

- **The rule engine is pure.** `buildDeck`, `detectCombo`, `compareScores`, `beats`, `allCombos`, `chooseLead` and `chooseFollow` have no DOM or Three.js dependency. The browser self-test exercises them without a GPU.
- **One source of truth.** The 3D scene never owns game state. `scene.sync(state)` maps tiles to hand / centre / capture positions and animates the difference.
- **The host is authoritative.** Only the host runs the engine, deals, scores and bot decisions. Guests send intent (`lead` / `follow`) and render the state they receive. `sanitizeForSeat` is the single privacy boundary; `hydrateRemoteState` is its counterpart.
- **The coach is computed, not scripted.** It runs the same combo detector and a deterministic AI recommendation, so its advice stays correct as the rules evolve.
- **The export format is versioned.** `leab-tui-3d-save` v1 stores tile IDs and combo descriptors; it never stores live Three.js objects.
- **The lobby is gated, not authenticated.** The host approves every request by default; the optional PIN is a brute-force cost, not identity. Assume the attacker has read this code. See [SECURITY.md](SECURITY.md).
- **Chat and voice are separate paths.** Chat uses the host's data-channel relay so it can be ordered and attributed; voice uses direct PeerJS media calls, never the host data channel. Muting the mic changes `track.enabled`, so the call stays connected.

## Known limits

- Four-player games only. The traditional two- and three-player variants are not implemented. Leab-Tui's 32-tile contract fixes the table at four winds, so the lobby supports four human seats, not six.
- Online play is host-authoritative and serverless. There is no host migration: if the host closes the tab, the room ends. Guests are not authenticated.
- Redaction keeps other hands off the wire, but the host browser knows every hand and a determined guest can inspect their own client. There is no collusion or cheating detection.
- The rules follow the Thai description cited in [docs/RULES.md](docs/RULES.md); where that source is ambiguous, the studio documents a playable interpretation. It is not an official tournament rulebook.
- No accounts, leaderboards or server-side storage.
- The page is not fully offline: Three.js r160 is loaded from jsDelivr. Multiplayer also needs PeerJS from jsDelivr and the `0.peerjs.com` broker. The rule engine can still be exercised if the CDN fails, but the table and rooms will not start.
- Mobile is verified under Chrome device emulation, not on physical iOS/Android hardware.
- Symmetric NAT or restrictive corporate firewalls can block WebRTC. The project uses public STUN only; there is no TURN relay.
- Voice requires microphone permission and a secure page (HTTPS or localhost). Browsers without `getUserMedia` can still play and chat. Voice is full-mesh, so uplink grows with the number of speakers.
- Chat and voice are not recorded, moderated or authenticated. Play with people you trust.
- Host approval, PIN complexity, connection/message caps and the voice allowlist reduce abuse but do not make the room DDoS-proof or cheat-proof. A malicious approved guest still controls their own client; a malicious host sees every hand.

## Credits

Designed, written, verified and documented in a single session with **OpenCode 2.2.5** and **DeepSeek V4.1 Flash** (`opencode-go/deepseek-v4.1-flash`). The build time, token counts and session ID are recorded in **[STATE.md](STATE.md)** and **[state.json](state.json)**. The chat/voice build is release **1.6.1**; the original table was 1.0.0.

Rules reference: Navee Angsuputiphant, “กฏกติกาการเล่น เลี๊ยบตุ่ย” (2016), linked in [docs/RULES.md](docs/RULES.md). Three.js and PeerJS are MIT-licensed; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

## Licence

MIT. See [LICENSE](LICENSE).
