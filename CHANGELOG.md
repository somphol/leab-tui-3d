# Changelog

All notable changes to Leab-Tui 3D are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [1.6.1] — 2026-11-06

### Added

- **Auto-generated PIN by default** — a 20-character grouped PIN is created when the room opens. **New PIN** rotates it; the awkward Save PIN field is gone and policy details live behind an ⓘ.
- **Copy invite + PIN** — one paste carries the URL and the generated passcode together. The label switches from “Copy room info” when a PIN is set.
- **Share invite + PIN** — native `navigator.share` where available, with clipboard fallback.
- **Paste** on the guest PIN field — extracts `PIN:`/`Passcode:`/`รหัส:` from the host's message, or accepts the passcode alone.
- **Host listening state** — “Listening for guests…”, “A guest is connecting…”, pending count and “Ready to start” make it clear that a guest has not reached the host yet.
- **Staged join retry** — broker, host and ICE failures are distinguished; the client retries once and turns Connect into Retry.
- **Host wake lock** — where supported, hosting requests a screen wake lock; the UI warns to keep the tab open and awake.
- Self-test for passcode extraction (38 total).

### Changed

- The guest join panel explains that the passcode comes from the host's message.
- The PIN remains outside the URL; only the shared text contains it.

## [1.6.0] — 2026-11-06

### Added

- **Host approval queue** — guests request access; the host sees name/time and approves or denies each one. No seat or game state is sent before approval. Pending requests expire after 120 seconds.
- **Strong optional room PIN** — 15–64 characters with upper case, lower case, a digit and a symbol. Rejects whitespace, common passwords, sequences, repeated characters, the room code and the host name.
- **Auto-generate PIN** — a 20-character grouped passphrase with all four classes.
- **Copy room info** — copies room code, optional PIN and link for one-click sharing. **Copy invite link** still never includes the PIN.
- **PIN digest only** — SHA-256 in memory; the plain PIN is never in the roster, state, export, URL or localStorage. `security.js` owns the policy and generator.
- **Abuse caps** — 16 live connections, 6 pending requests, 80 messages/10 s per connection, 16 KB inbound envelope, 200-char/350 ms chat, six action tiles, voice calls only from approved roster peer IDs.
- 8 wrong PIN attempts trigger a 60-second room-wide lockout.
- 1 new self-test (37 total), 3 new two-browser checks (20 total), security screenshot to follow.

### Changed

- Host approval is on by default.
- Room-code + PIN + approval are documented as gates, not authentication.
- README, AGENTS, architecture, multiplayer, protocol, security, privacy, testing, checklist, FAQ and reproduction updated with the threat model and caps.

## [1.5.0] — 2026-11-06

### Added

- **Host-routed P2P text chat.** A collapsible glass panel in the sidebar, message echo through the host, 30-message history on join, 200-character cap, 350 ms guest rate limit, EN/TH copy.
- **Independent full-mesh P2P voice.** PeerJS media calls between voice-active humans, microphone permission on demand, remote streams attached to hidden `<audio class="remote-player-audio">` elements.
- **Dual mute controls.** **Mute mic** toggles `localStream.getAudioTracks()[0].enabled` without closing the call; **Mute others** toggles `.muted` on every remote audio element.
- **Speaking indicator.** A green animated pulse on lobby avatar cards and scoreboard seats when the local or a remote mic is transmitting.
- Chat/voice state is carried on the existing room roster; `voice-state` updates are relayed by the host.
- `voice-chat.js` — mesh calls, mute/deafen, analyser meter, synthetic-stream test path.
- `LeabTui.chat` and `LeabTui.voice` test surfaces.
- Chat + voice screenshots and 4 new two-browser checks (17 total).

### Changed

- Version bumped to `1.5.0`; save/export version follows.
- The two-browser harness now uses fake media only for the synthetic voice path; production still requests the real microphone on a user gesture.
- README, AGENTS, architecture, multiplayer, protocol, testing, controls, security, privacy, browser support, performance, gallery, checklist and state updated.

### Limits

- Voice is full-mesh, so uplink grows with the number of speakers.
- No TURN relay; symmetric NAT can block media as well as data.
- No recording, moderation, authentication, noise gate or push-to-talk.
- Chat and voice are room-scoped and end with the host tab.

## [1.4.1] — 2026-11-06

### Added

- **Launch prompt on every normal load.** The Choose how to play overlay now appears even when a saved solo game exists, with a **Resume match** card showing the round, trick and score. A fresh visit no longer deals a game behind the overlay.
- **Dedicated Leave room button** in the Actions panel during a network game. It is wine-coloured, full-width below the action grid, and opens a confirmation that explains the host/guest consequence.
- The host lobby hides **Start table** after kickoff and relabels its back action **Leave room**; it shows "Match in progress" instead.

### Changed

- The mobile header compresses the room chip to a 34 px status icon so the rules button stays reachable at 390 px.
- `scripts/browser-check.mjs` accepts `--reload-url` for saved-game/launch tests.
- The two-browser suite now checks the host in-game controls (leave visible, start hidden), 13 checks total.

### Fixed

- A fresh visit no longer created a hidden deal that could later appear as a phantom "Resume match".
- `LeabTui.net.openLobby()` opens the host panel for a host instead of the guest waiting panel.
- Starting an already-running host match now refuses with a clear message instead of silently re-dealing.

## [1.4.0] — 2026-11-06

### Added

- **Serverless P2P multiplayer over WebRTC.** Host a table, share a six-character `LEAB-ABC-234` code or invite link, and play with up to three guests. PeerJS 1.5.4 is loaded lazily from jsDelivr; the public `0.peerjs.com` broker handles only the initial handshake.
- **Launch lobby** with Play solo, Host a table and Join a table. A four-seat roster, copy-invite action, join panel and "table closed" recovery panel.
- **Dynamic bot fill.** Two connected humans are enough to start; every empty seat becomes `Bot n`.
- **Host authority and per-seat redaction.** `sanitizeForSeat` replaces other hands and hidden centre/log/last-trick plays with stable `ghost-<seat>-<index>` ids. Guests hydrate those into back-only 3D meshes.
- **Disconnect-to-bot.** A guest who leaves keeps their seat, hand and score; a bot takes over and play continues.
- **Seat-relative view.** Guests see their own seat at the bottom; the table world rotates, not the camera.
- `peer-manager.js` — room codes, PeerJS host/client, retry allocation and a loopback test transport.
- `docs/MULTIPLAYER.md`, `docs/PROTOCOL.md` and `scripts/net-check.mjs` (two real browsers, 12 checks).
- Ten new self-tests for room codes, redaction, hydration and the loopback transport (35 total).

### Changed

- `MY_SEAT` and `SEAT_PROFILES` replace hard-coded seat 0 across coach, hand list, pointer, scoreboard and public API. Solo behaviour is unchanged.
- The 3D scene wraps the table, tiles, rings and labels in a rotatable `world` group and adds 32 back-only ghost meshes.
- CSP `connect-src` now allows `https://0.peerjs.com` and `wss://0.peerjs.com`.
- Version bumped to `1.4.0`; save/export version follows. Network saves are marked `network: true` and are not resumable.
- README, AGENTS, architecture, testing, deployment, data format, privacy, security, browser support, FAQ, roadmap, controls, accessibility, gallery, checklist and notices updated.

### Fixed

- Seat labels, round summaries, undo explanations and coach lines now follow the local seat rather than assuming seat 0.
- The last-trick payload no longer carries the host's hidden combination to other guests.

## [1.3.2] — 2026-11-04

### Fixed

- The Hanzi in the rank sheet were being overridden by the secondary-name selector and rendered at 11 px. The name rule is now scoped to the direct child, so the red/black glyphs render at **44 px on 76 px medallions** on desktop and **36 px on 64 px** on phones.
- The red and black tiles are stacked in each card, making the characters much easier to compare against the table.
- Screenshots regenerated.

## [1.3.1] — 2026-11-04

### Changed

- Enlarged the rank-order reference to a near-full-stage sheet (980 px on desktop), with 44 px tile medallions, 17 px names, larger rank numbers and a larger tie note.
- On phones the ladder now uses a two-column grid so all seven ranks are visible at once.
- Screenshots and galleries regenerated for the larger sheet.

## [1.3.0] — 2026-11-04

### Added

- **Rank order quick reference** — a **Ranks** button at the top-left HUD opens a pictorial hierarchy: red and black Hanzi tiles, Thai and English names, rank numbers, highest/lowest labels and the red/earlier-play tie rules.
- Toggle it closed with the button, the close control, `Esc`, or a click outside. It is theme-aware and bilingual.

### Changed

- Version bumped to `1.3.0`; save/export version follows.
- The HUD status region was separated from the quick-reference button for cleaner screen-reader semantics.

## [1.2.0] — 2026-11-04

### Added

- **Parchment** — warm ivory panels, dark ink and an olive felt table.
- **Daybreak** — pale blue-white panels, navy ink and a teal table.
- Both bright themes are full palettes: UI surfaces, text, borders, buttons, modals and the 3D felt, wood, rim, inlay, floor, lights and tile backs.
- The theme picker is now a two-column grid of five cards.

### Changed

- Version bumped to `1.2.0`; save/export version follows.
- Display docs, screenshots and verification updated for five themes.

## [1.1.1] — 2026-11-04

### Changed

- Removed the floating, spinning 3D turn chevron above the active seat. It read as a selector but was only a decorative turn marker; the pulsing seat ring and the **TURN** HUD chip now carry that signal. The active ring is slightly stronger to compensate.

## [1.1.0] — 2026-11-04

### Added

- **Display settings panel** (`Aa` in the stage toolbar) with four interface text sizes: Small, Default, Large and Extra large.
- **Three themes**: Mahogany (default), Jade Court and Midnight Lacquer.
- Theme switching recolours the UI panels, felt, wood, brass/silver inlay, table rim, floor and lighting; old procedural textures are disposed.
- Display preferences persist in `localStorage` alongside language, sound and coach settings.
- A `Reset display` action and browser verification for the 1.24× XL scale, theme propagation to the 3D scene, persistence and the four-size/three-theme controls.
- 24 new bilingual keys (235 per language), a **Test sound** action and updated release documentation.

### Fixed

- **Audio audibility.** The master gain was raised from 0.32 to 0.8, a dynamics compressor was added, and per-effect levels were raised. The old graph produced ~0.009 RMS on the clack, which was effectively inaudible on laptop speakers; the new graph measures ~0.04–0.11 RMS peak. The analyser tap is used by `verify.mjs`.
- **First-gesture audio.** If the context is still suspended when the first sound is requested, `play()` now calls `resume()` and retries after the promise resolves, covering the resume race.
- **Mobile header at XL.** The About icon moves to the sidebar footer on phones, the HUD is bounded before the stage tools, and the action buttons wrap so nothing is clipped at 1.24× text.

### Changed

- Version bumped to `1.1.0`; save/export version follows.
- Screenshots now include the Display panel and both alternate themes.

## [1.0.0] — 2026-11-04

### Added

- A bilingual, single-page 3D studio for the Thai trick-taking game เลี๊ยบตุ่ย (Leab-Tui).
- 32 procedurally carved Xiangqi tiles with Hanzi faces, lacquered backs and bevelled rims.
- Mahogany felt table with soft shadows, brass inlay, seat rings, floating score labels and dust.
- OrbitControls camera with reset, near-overhead and cinematic orbit presets; separate portrait framing.
- Full four-player rules engine: Leab, Tui, Sam/Si/Ha Juk, Sa Hoo, See Hoo, Ngoh Hoo and Lak Hoo.
- Strict comparison with red-beats-black and earlier-play tie handling.
- Face-down submission, optional reveal, revealed-only comparison, pile capture and trick leadership.
- Three heuristic AI opponents with conservation and challenge probability.
- Live coach with bilingual explanations, deterministic Hint, and the tile inspector.
- Undo & Learn: pre-trick snapshot, side-by-side comparison, hierarchy reference and replay.
- EN ⇄ TH switching across 211 dictionary keys, dynamic coach/log/summary strings, tile names and ARIA labels.
- Synthesised Web Audio: shuffle, clack, flip, sweep, win, lose and undo; gesture-unlocked, no files.
- Autosave to `localStorage`, reload-resume, lifetime statistics and versioned JSON export.
- 25-check in-page self-test, dependency-free static release check, Chrome CDP harness and recorded flow tests.
- Release documentation: rules, architecture, code map, testing, deployment, reproduction, data format, controls, accessibility, performance, design, browser support, FAQ, roadmap, release checklist, handoff, gallery and glossary.
- MIT licence, contribution/security/privacy/support docs, citation, third-party notices, GitHub templates and a static-check workflow.

### Known issues

- Four-player only; two- and three-player variants are not implemented.
- Ngoh Hoo and the Lak Hoo colour rule are documented interpretations of an ambiguous source.
- Undo is a one-trick rewind and is not available after a reload.
- The AI is heuristic, not a search engine.
- Mobile is verified under Chrome emulation only.
- The table requires the Three.js CDN.

[1.0.0]: https://github.com/somphol/leab-tui-3d/releases/tag/v1.0.0
