# Changelog

All notable changes to Leab-Tui 3D are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [1.9.8] — 2026-11-07

### Changed

- **The reveal result now looks like the captured-pile popup.** Four seat frames in play order, the played set as mini tile cards (backs while hidden), a large green ✓ with a gold frame on the current winner, and a note block with the leader/comparison and the reason.
- **Turn history uses the same comparison.** After choosing a round and turn, the detail shows the tile cards per seat, the winning frame's ✓ and the winner/reason note — not a text row list. The live sidebar log is unchanged.
- **Reveal dismissal is safe.** Continue, ×, Escape and the backdrop all apply the pending reveal; none can leave the showdown waiting on a callback that was already dismissed.

### Fixed

- English first-person wording in the comparison: “You lead with …” instead of “You leads with …”.

## [1.9.7] — 2026-11-07

### Added

- **Experimental draft deal.** A host-only, off-by-default toggle in the lobby and in Actions replaces the automatic deal with a public pool: seats take turns picking 2 tiles, four times, for an 8-tile hand. The red-General holder leads. Bots pick automatically; a human always picks their own. It applies to the next deal, works in solo and P2P, resumes mid-draft, and is relayed as a host-validated `draft` action.
- **`docs/DRAFT.md`** plus a `RULES.md` section explain the variant and state plainly that it is not part of the source rules.
- **Draft modal** with the public pool, a 2-tile selection, step/pool counts and a host toggle in the Actions panel; the lobby toggle covers the pre-room case.

### Changed

- **Redraw is disabled while draft mode is on.** A drafted hand is the player's own choice, so the softening rule does not apply.
- **Draft completion requires all four hands to reach 8 tiles** rather than counting cycles, so a rejected or replayed pick cannot end the draft early.
- Saved games keep `draftPool`, `draftOrder`, `draftCycle`, `draftIndex` and `draftSeat`, so a reload mid-draft reopens the pool on the right seat.

## [1.9.6] — 2026-11-07

### Added

- **Big winner badge in the captured pile.** Every card played by the winning seat now carries a large green ✓ on its corner and a gold frame, in addition to the small check on the pile title. Face-down winning cards are marked the same way.

## [1.9.5] — 2026-11-07

### Changed

- **Reveal result now looks like the Turn Log.** Instead of a long sentence, the panel lists every set in the trick, shows the sets that were revealed and face-down placeholders for the rest, and puts a green ✓ on the current winner. A short footer says “You set the mark”, “You are ahead” or “The trick stays with {seat}”; the big Continue button is unchanged.

## [1.9.4] — 2026-11-07

### Fixed

- **Chuan is explained correctly in every result view.** The Chuan claim now stores a real Soldier set (not an out-of-range score), marks the trick `chuan`, and the result banner, Turn history, undo explanation and captured-pile popup say “Chuan claim: seven piles plus the last Soldier; the Soldier wins by the special rule, not by rank.”
- The captured-pile popup now includes the trick’s winner, the comparison and the reason below the cards (the count line stays hidden).
- The dock shows “Seven piles and the last Soldier: claim Chuan” when the claim is available.

## [1.9.3] — 2026-11-07

### Added

- **Illustrated rules document.** The Rules modal now has a visual piece ladder (red and black tiles, Teochew reading, meaning, English name and rank) and six worked examples with real tile faces: single, pair, Sa Hoo big vs small, See Hoo (the duplicated pair decides), Soldier sets vs straights, and the Chuan seven-piles-plus-Soldier claim.
- A **How to play** button in the launch menu opens the same document; the top-bar **?** still does.

## [1.9.2] — 2026-11-07

### Docs

- Clarified that **Chuan is a standard Leab-Tui rule**, not a house rule. Both routes — the clean sweep and seven piles plus the last Soldier — are in the source and always enabled.
- The in-app rules text now states the seven-piles-plus-last-Soldier claim.
- The house-rule note is limited to “Soldier beats General” (จุกกินตี่), which the source does not contain.

## [1.9.1] — 2026-11-07

### Changed

- **Staged drag-to-play.** A tile dragged into the battle ring no longer uses a stale selection. The dragged tile (or the selection it belongs to) becomes the candidate. On a follow call, tiles are staged one at a time and the final tile sends face-down automatically; on a lead, tiles are staged and **Lead** confirms the shape.

### Docs

- **Pile popup:** a green ✓ marks the winning seat in the title, and the “4 tiles · 3 face-up” line is gone (the cards show it).
- Added **[docs/ARRANGEMENT.md](docs/ARRANGEMENT.md)**: the table zones, hand arrangement, drag staging, showdown reveal pause, captured-pile grouping/provenance and layout relay, with invariants and a code map.

## [1.9.0] — 2026-11-07

### Added

- **Reveal announcement with a pause.** When you reveal at showdown (Show set or double-click), a big-button panel names the set and says whether it beats the current best, with the reason. The trick is not swept until you press **Continue**; then the reveal is applied and the queue or the winner collection proceeds.

## [1.8.9] — 2026-11-07

### Fixed

- **Revealed tiles were captured face-down.** The capture flag was stored inverted, so a set shown by double-click or **Show set** entered the winner's pile as a back. It now stays face-up, and hidden sets stay hidden.
- **One trick, one pile.** Captures are grouped by trick instead of every four tiles, so an 8-tile pair trick is one stack, not two piles. The pile popup opens the whole trick.
- **`actions.showSet` label fixed.** The missing key made the button print its key; dictionaries now contain it and `check.mjs` verifies every `t("…")` key.

### Changed

- **Round summary no longer offers New match.** Only the match-end screen does; the round summary keeps Next round (with the 30s option).
- **Leave room moved to the top bar**, next to the room code, for a deliberate exit. The Actions button remains.
- **Cancel turn** replaces “Undo trick” in the Actions panel (Thai **ยกเลิกตานี้**).
- **Winner check** in Turn history: a green ✓ badge marks the winning row.

## [1.8.8] — 2026-11-07

### Changed

- **A deeper personal zone.** The private arrangement band now runs from radius 2.92 to 4.88 (was 3.06–4.60) with a wider arc (±0.98 rad), so rows and fans have room without touching the centre or another seat. The zone tint is slightly stronger.

## [1.8.7] — 2026-11-07

### Added

- **Table zones.** A gold **battle ring** marks the centre and a faint arc marks the player's private area. Tiles may only be arranged inside the private arc; a drop in another seat's area or the gap snaps back with a message. The centre is reserved for a play drop.
- **Double-click to show.** At showdown, double-click one of your own tiles in the centre to reveal it (same as **Show set**).

### Changed

- The HUD counter is **Round · Turn** and the current player chip is **Now** (Thai **ตอนนี้**), so “Turn 3” no longer collides with “Turn You”. The log is **Turn log** and the history is **Turn history**; **Last turn** replaces Last trick.

## [1.8.6] — 2026-11-07

### Added

- **Drag a tile onto the table to play it.** Drop a hand tile in the centre play zone to lead a single, or to send the current selection when tiles were pre-selected. Following sends the called count face-down. A **Release to play** hint appears over the zone; invalid drops or a drop outside your turn snap back with a toast. The dock buttons still work.

## [1.8.5] — 2026-11-07

### Added

- **Trick history browser.** The Trick Log header, the Last trick HUD button and the summary all open a round/trick browser. It shows the call, the winner, every seat's set, and the actual tiles each seat played — face-up for revealed sets and backs for hidden ones.
- **Host auto-next toggle.** The summary has an **Auto-start next round (30s)** checkbox for the host. Off means it waits indefinitely; on means a 30-second countdown. Guests only get **Back to table**.
- **Boot version guard.** A cached HTML page compares `app-version` with `state.json` and reloads once with a cache-busting query, so a normal refresh picks up a new release.

## [1.8.4] — 2026-11-07

### Added

- **Captured pile provenance.** Every captured tile records the seat that played it. The pile popup shows **from {seat}** on both face-up and face-down cards. Saves and network state carry the source list.

## [1.8.3] — 2026-11-07

### Changed

- **A losing set can be shown.** At showdown the **Show** button is enabled for any legal set of the called type, not only one that beats the table. Showing a weaker set reveals it, loses the trick, and stays face-up in the winner's pile; **Keep hidden** remains the other choice. The button is labelled **Show set** instead of “Show & win”.

## [1.8.2] — 2026-11-07

### Fixed

- **Showdown buttons were missing for the human.** The dock treated a showdown turn as "not your turn", so only Hint/Clear appeared. It now shows **Show first** / **Show & win** and **Keep hidden**.
- **Top/3D and the Result selector did not receive clicks.** The HUD container ignores pointer events; the new controls are now explicitly clickable.

### Added

- **Congratulations summary.** The round/match summary now shows three dancing 3D characters (rabbit, hippo, parrot) on a small Three.js stage, with a short celebration jingle.
- **Host-controlled summary.** Guests only get **Back to table** (no New game/Play solo). The host sees **Next round** with a 5-second countdown; if the host does nothing the next round starts automatically. Match end still waits for the host.

## [1.8.1] — 2026-11-07

### Changed

- **Every seat chooses to reveal.** The showdown no longer auto-opens the leader. The leader is prompted first (must show), then each follower chooses **Show & win** or **Keep hidden**. No more automatic collection; the "cannot reveal" stall is fixed.
- **Result callout.** After the last decision, a banner names the winner, the winning set and every seat's shown/hidden set.
- **Host-controlled duration.** A **Result** selector next to Turn/Call sets 0/2/4/6 seconds; guests follow the host's value.
- **Last trick button.** A HUD button opens the last trick: winner, winning set, every entry, and the tile count.
- **Top / 3D switch** is a two-button segmented control, so 3D is an explicit choice.
- **Pile cards** now show the same 76 px tile and rank typography as the Ranks ladder, with the hanzi, Thai reading, meaning, English name and rank number; hidden tiles show a back.

## [1.8.0] — 2026-11-07

### Added

- **Arrange your hand.** Drag any face-up tile anywhere on the felt — rows, fans or groups, including the centre. The first drag freezes the whole hand, so playing a tile does not re-flow the rest; a new deal resets the arrangement.
- **Tidy hand.** A dock button restores the default arc without waiting for a new deal.
- **Other seats see your arrangement.** Positions are relayed as coordinates only — never tile identities — so the host and the other guests see the same layout. The relay is memory-only and cleared at every deal.
- **Top-down by default.** The table now opens in a straight-down view that fits the whole board, with a labelled **Top view / 3D view** toggle in the HUD. **Reset camera** returns to the top view. The 3D orbit view is unchanged and one tap away.

### Changed

- **Showdown order now follows the source.** The leader and every follower send face-down. Once all four have sent, the leader reveals first; each follower then chooses **Show & win** or **Keep hidden** in turn. The old "Reveal & challenge" at play time is gone.
- **Hidden stays hidden.** Tiles captured face-down remain face-down in the winner's pile.
- The camera distance limit is raised so the portrait top view can frame the full table.
- **Clearer reveal wording.** The button now says **Show & win** instead of “Reveal & challenge”, and the coach explains the trade: showing the set wins the trick and takes the tiles; playing face-down keeps them hidden but cannot win.

### Added

- **Table rules before the deal.** Choose the target (20/50/100), the turn direction (clockwise or counter-clockwise) and the scoring mode (**Most piles** or **Bid piles**).
- **Bid piles (4-player mode).** Each seat bids 0–8 piles in turn. The last bidder may not make the total exactly 8. Hit your bid for bid + 5 (or + 3 for a zero bid); miss by the difference, negative.
- **Redraw (โละ).** A seat with no tile from the red Elephant up may request a redeal before the first play. The requester leads and the round scores ×2, ×3 … per redraw.
- **Chuan special.** With seven piles and the last Soldier, the final follower may reveal it and take the last trick, reaching eight piles for 16.
- **Call chip.** The HUD keeps the current call (type × count) visible while everyone is face-down.
- **Pile inspector.** Click any captured pile to open it: tiles are shown left to right, face-up tiles with their carved face and hidden tiles as backs.

### Fixed

- **Thai piece names corrected** to the Teochew readings: ตี่ · สือ · เฉีย · กือ · แบ้ · เผ่า · จุก, each with its Thai meaning (แม่ทัพ, องครักษ์, ช้าง, รถศึก, ม้า, ปืนใหญ่, พลทหาร). The red General reads **อั้งตี่** and the black General **โอวตี่**.
- **Tile glyphs corrected:** red 車 and 馬 (not 俥 / 傌), black 砲 (not 包), matching a standard set.

## [1.7.2] — 2026-11-07

### Changed

- **Room numbers no longer show a prefix.** The host card, join field, room chip, invite text and diagnostics show `482-173`. `LEAB-` still exists inside the peer id, and pasting an old `LEAB-482-173` code still normalises correctly.
- **Label copy** now says **Room number** instead of room code.

### Added

- **Big Reload version bar** pinned to the bottom of the launch, host, join and waiting dialogs. It turns gold and reads **Update to vX** when a newer build is live.
- **Version check on first open**, throttled to once every 5 minutes per browser, plus the existing check when returning to the tab.
- **Self-update from the launch menu.** If a newer version is found while the menu is open and no room or match is active, the page reloads itself once. Rooms and active matches get the banner instead, so a game is never interrupted.
- A session guard and a `?v=` confirmation check prevent reload loops if GitHub Pages briefly serves a mixed build.

## [1.7.1] — 2026-11-07

### Added

- **Automatic audio join.** A new checkbox, **Join audio chat when the table starts**, is on by default in the launch menu, **Host a game** and **Join a game**. The microphone prompt appears on the Connect / Start click; if allowed, voice joins as the table starts.
- The choice persists as `autoAudio` in preferences. Turning it off restores the manual **Join audio** pill.

### Notes

- Auto-join never blocks the game. A denied or unavailable microphone is ignored and the **Join audio** pill stays available.
- Links that auto-join on load (`?room=…&name=…`) skip the mic request because there is no user gesture; the pill is still there.

## [1.7.0] — 2026-11-06

### Changed

- **New launch menu.** One primary **Play now** action, then **Host a game** and **Join a game** as plain-language secondary choices. Your name moved into a compact row, so the first screen is a decision, not a form.
- **Host a game** shows the room code as a large card with **Copy invite + PIN** and **Share invite + PIN**. The raw invite field is gone, and **Join requests** only appears when someone is actually waiting.
- **Join a game** has a single **Paste invite** button that fills both the room code and the PIN from the host's message.
- **Join audio** is now an obvious gold pill in the top bar. It joins the microphone call in one tap, then becomes the mic mute/unmute control. The full voice panel is still in Table Chat.
- **EN / TH switch** is available inside the launch dialog and in Display, in addition to the top bar. The choice is saved and restored on reload.

### Fixed

- **Table Chat and status colours on bright themes.** The chat panel kept a dark background in every theme while its text used light-theme colours, which made it look washed out on Parchment and Daybreak. The panel now follows the theme, and success/danger text uses readable per-theme tokens.
- **Mobile top bar** no longer overflows at 390 px; the room chip compacts to the six digits on narrow screens.
- **Host status line** cleared after the room opens instead of leaving "Opening the room…" behind.

## [1.6.6] — 2026-11-06

### Changed

- **Host a table** is simpler: removed the separate **Copy invite link** button and the “Share this six-digit code” label. The host keeps **Copy invite + PIN** and **Share invite + PIN**; the link is still included in both.

## [1.6.5] — 2026-11-06

### Fixed

- The **Host a table / Join a table launch prompt** no longer closes when you tap or click outside it. Use the ×, Back, or Escape; accidental backdrop taps leave the prompt open.

## [1.6.4] — 2026-11-06

### Fixed

- **iPad/tablet landscape join bounce** — form controls are 16 px on touch/tablet (preventing Safari auto-zoom) and tall lobby modals are top-aligned with internal scrolling in short landscape, so the keyboard no longer makes the page bounce.
- **Approve / Deny contrast** — solid green and wine buttons with larger hit areas on dark and bright themes.
- **Approve all** is now a gold action instead of a faint outline.
- **Copy PIN / New PIN** have stronger card contrast on bright themes.

## [1.6.3] — 2026-11-06

### Changed

- **Numeric room codes** — `LEAB-482-173` (six digits) instead of mixed letters/digits. There are only 1,000,000 codes; the PIN and approval remain the gates.
- **PIN simplified to exactly 5 digits** for easier sharing and testing. Auto-generated; **New PIN** rotates it. Common/repeated/sequential values are rejected. A 5-digit PIN has only 100,000 possibilities, so host approval remains the real access control and 8 wrong attempts still lock the room for 60 seconds.
- **iPad landscape join fix** — 16 px form controls prevent Safari auto-zoom, and tall modals are top-aligned with internal scrolling in short landscape so the keyboard cannot make the page bounce.
- **Leave room** is now a solid wine button with a stronger border, weight and shadow, so it reads as an action rather than a faint outline.
- Passcode extraction and `Paste` accept a 5-digit PIN from a shared message.

## [1.6.2] — 2026-11-06

### Added

- **Visible version chip + Reload** — footer and launch overlay show `vX.Y.Z`; Reload forces a cache-busted navigation and confirms if a room/match is active.
- **Update banner** — fetches `state.json` with `no-store`; if a newer version is deployed, offers Reload.
- **Versioned assets** — `style.css`, `script.js` and the three ES module imports carry `?v=X.Y.Z`, so a forced reload actually picks up new code instead of a cached module graph.
- **Troubleshoot panel** — shows version, secure context, PeerJS, role, peers, pending count and last error. Guest can **Probe with PIN** or **Probe without PIN**; the host replies with reachability, PIN requirement/acceptance, approval, started and free seats — without creating a pending seat request.
- **Join intent restore** — mobile tab reload/re-entry restores the join panel with the room code and name from `sessionStorage`; the PIN is deliberately not saved.

### Changed

- Join failure messages distinguish broker, host and ICE timeouts; Connect becomes Retry.
- Host shows Listening / guest connecting / pending / ready-to-start and warns to keep the tab open and awake.

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
