# Changelog

All notable changes to Leab-Tui 3D are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [1.10.25] — 2026-11-11

### Fixed

- **The turn result now closes when its countdown reaches zero.** The countdown interval and a separate close timeout fired in the same millisecond; the interval cleared the timeout, leaving the sheet open at `0`. One interval now closes the sheet directly.

## [1.10.24] — 2026-11-11

### Fixed

- **The host's turn no longer starts while its result sheet is up.** The authority gates the next trick on its own turn-result dialog, so a 15 s result actually holds the table for the host. Guests are unaffected and keep their own sheet and autoplay hold.

## [1.10.23] — 2026-11-11

### Changed

- **The turn result is per player.** Guests now see the result sheet too, and each device's auto-close (5–30 s, or off) applies only to that player. Autoplay waits while that device's sheet is open, host included.
- **The host no longer gates the table on its own result sheet.** In a network room the next trick starts normally, so a guest is never stalled by the host reading; a seat simply does not play until its own sheet closes. The round summary closes any leftover sheet.

## [1.10.22] — 2026-11-11

### Removed

- **The HUD result-duration control.** The `RESULT 0s/2s/4s/6s` selector is gone; the banner keeps its 2 s default and the turn-result dialog owns auto-close. The HUD now reads Round, Turn, Now, Call, Last turn.

## [1.10.21] — 2026-11-11

### Fixed

- **Join is hidden once you are in a room.** The top-bar Join pill now disappears (and is disabled) for hosts as well as guests, instead of staying visible and ignoring the click. Leave the room to join another table.

## [1.10.20] — 2026-11-11

### Added

- **Join from the top bar.** A `入 Join / เข้าร่วม` pill sits beside Invite, opening the room-code form with your saved name and the code field focused. It hides for guests and while the lobby is open.

### Fixed

- **Autoplay no longer acts behind a result sheet.** While the turn-result or round-summary dialog is visible for your seat, the coach waits; closing the sheet reschedules it. A two-player table no longer jumps ahead while someone reads.

### Removed

- **New match.** With endless play there is no match to restart; the Actions button and its confirmation dialog are gone. Reload for a fresh solo table.

## [1.10.19] — 2026-11-11

### Changed

- **Scoring is tiles against par eight.** Every seat starts a round with eight tiles, so the round score is `capturedTiles − 8` (times the redraw multiplier): eight back is even, sixteen is **+8**, all 32 is **+24**. The "first to 20/50/100" target and the match-end screen are gone; scores accumulate for as long as the table plays and players leave when they choose. The Target chip, the scoreboard target line and the "Play to" rule select were removed.
- **Round-summary auto-start is adjustable.** The summary checkbox now has a 5/10/15/20/25/30-second dropdown instead of a fixed 30 s, disabled while unticked and remembered between sessions.

## [1.10.18] — 2026-11-11

### Added

- **Optional auto-close for the turn result.** The dialog gets a **Close automatically** checkbox (unchecked by default) and a 5/10/15/20/25/30-second dropdown, with a live countdown. The choice is remembered, and the timer is cleared whenever the dialog closes by any route.

### Changed

- **Thai turn results are bilingual.** Each compared set, the winner line, the result toast and the history detail now show the Chinese character and Thai meaning next to the transliterated name, e.g. `คู่แบ้ดำ (馬 · ม้า)`. Dock errors, logs and the coach stay concise.

## [1.10.17] — 2026-11-11

### Fixed

- **The guest panel no longer flickers when the host leaves.** An intentional host exit (`closed {reason:"host-left"}`) is terminal for the guest: the scheduled rejoin, the client watchdog and the join watch are cancelled, so the panel cannot alternate between "Table closed" and "Reconnecting". Re-entry is manual through a **Reconnect to the room** button that uses the stored seat token. A host reload (no `closed` message) still auto-rejoins.

### Changed

- **Tile size applies to your own hand only.** The display setting no longer scales opponents' hands, centre plays or captures, which had pushed those tiles into neighbouring seats and off the rim on tablets. The local row grows with the setting (capped at 1.18) and pulls inward to keep its outer edge on the felt.

## [1.10.16] — 2026-11-10

### Changed

- **Blind pick is now a face-down choice, not an automatic deal.** When the house variant is enabled, each seat sees a pool of card backs and picks two by position; the values are hidden until the cards join the hand. The pool is CSPRNG-shuffled, bots pick randomly, and the standard deal remains untouched when the variant is off.

## [1.10.15] — 2026-11-10

### Changed

- **The hand dock opens automatically.** It no longer starts collapsed, so the Hint/Clear/Auto/Lead controls are visible on first load. A legacy saved `dockCollapsed: true` is ignored once; collapsing with H is stored in a new `dockChosen` flag and respected afterwards.

## [1.10.14] — 2026-11-10

### Added

- **Blind pick (house variant).** An off-by-default host toggle in Actions deals eight cards per seat from a **CSPRNG Fisher-Yates shuffle**, face-down, with no open pool and no choosing. It is labelled as a house variant, not part of the Navee source; the standard seeded deal remains the default. The host's choice is stored with the match, and guests simply receive the dealt hands.

## [1.10.13] — 2026-11-10

### Removed

- **Draft picker.** The experimental public pool (“pick 2 tiles ×4”) let players choose from open cards, which is not how Leab-Tui is dealt. The source deals eight random tiles face-down to each seat. The toggle, HUD chip and modal are gone; old draft saves are refused and the engine path is dormant.

## [1.10.12] — 2026-11-10

### Fixed

- **iPad showed an incomplete hand until Tidy hand.** iPad Safari can throttle the staged deal timers while booting, leaving one or more local tiles at their start position. Every deal now tidies and re-applies the local row when the animation finishes, with a 1.4-second fallback, and refreshes the 2D framing. All eight tiles are visible without pressing Tidy hand.
- **Regression test.** `verify.mjs` now checks all eight dealt tiles are on screen in iPad landscape at 1.6 seconds (50 browser checks).

## [1.10.11] — 2026-11-10

### Removed

- **Bid-piles scoring.** The 0–8 bid variant was an experimental house rule, **not part of the Navee source**. It is no longer offered in the rules panel or stored as a preference. The engine path is dormant only to migrate an old saved match back to standard scoring. Standard “most piles” scoring is the only mode.

## [1.10.10] — 2026-11-10

### Changed

- **The bid screen now explains itself.** The title asks “How many piles will you capture this round?” and the help line defines a pile (four captured tiles, eight per round), states the exact-bid bonus (+5, or +3 for a zero bid), the miss penalty, the running total and the last-bidder restriction. Thai copy uses “ทายกอง” instead of the ambiguous “คุณจะได้กี่กอง?”.

## [1.10.9] — 2026-11-10

### Fixed

- **Duplicate bot names.** Two seats could both be called “Bot 3” after takeovers because the name was derived from the current bot count. Bot names now choose the lowest unused number across the roster, so the coach line and turn chip always identify one seat.
- **Your seat is unmistakable.** The scoreboard marks the local row with a **You** badge, so a human at South is not confused with the East/North/West bot labels.

## [1.10.8] — 2026-11-10

### Fixed

- **Slow players are no longer kicked.** A seat was replaced by a bot after 30 seconds of turn time even when the player was still connected and sending keepalive. Takeover is now liveness-only: a seat is covered after 30 seconds of silence or a closed connection, never because a player is thinking. State ACKs and pings keep the seat.

### Added

- **Host: Push table update.** Actions has a host-only button that publishes a fresh snapshot to every seated guest and viewer immediately, with a receipt toast. It is the manual counterpart to the automatic 4-second heartbeat and per-seat state ACK repair.

## [1.10.7] — 2026-11-09

### Changed

- **Simpler launch menu.** “How do you want to play?” now offers **Play now (invite friends later)** and **Join a game** only. Hosting no longer has a separate entry: start solo, then use **Invite** on the live table to turn it into a room without redealing. The host panel remains available for `?mode=host`, recovery and diagnostics.
- **Autoplay is one tap away.** The dock now carries an **Auto** toggle beside Hint and Clear, so the player can switch the coach in and out without opening Actions. It stays in sync with the Actions checkbox.
- **Queued audience loses the confusing Actions orb.** While waiting for a seat, the Actions orb/panel is hidden and the status pill carries its own **Leave** button.
- **“Trick” is “turn” in the English interface.** Turn result, turn log, turn history, next turn, the queued banner and the coach now use “turn” consistently. The genre name “trick-taking” stays only in the About/description text.

### Fixed

- **Four-human deadlock at the end of a round.** PeerJS JSON serialisation refuses any frame over 16 KB; a late-round four-human snapshot crossed that line, stopped state publishing and left every client on a different turn. The transport now uses binary serialisation, which chunks instead of refusing.
- **Stale or duplicate state could move a client backwards.** Each host page has an epoch and every state/welcome carries a monotonic `seq`. Guests ignore older, duplicate or previous-epoch frames, so a delayed message or an old connection cannot regress the table.
- **State loss now repairs in under a second.** Seated guests acknowledge every applied snapshot; the host resends a targeted snapshot to any seat that acknowledges an older `seq`, in addition to the 4-second full heartbeat.
- **A dropped action is retried, not lost.** The client replays the same `actionId` up to four times at 1.5-second intervals; the host deduplicates it and returns the cached acknowledgement. The client also refuses to act on a snapshot older than 6 seconds.
- **Silent seats no longer block the table.** A closed or quiet human connection is swept to a bot after 20–30 seconds, with a `seat-timeout` and preserved rejoin token. A connection that was both a seat and a viewer can no longer be cleaned up as a viewer and leave a dead seat behind.
- **iPad white band after a double-tap.** iOS now pins the document to the visual viewport, cancels the second `touchstart` (not only `touchend`), and blocks pinch/gesture so the table cannot scroll under the browser bar.

### Tests

- `scripts/net-check.mjs` runs **≈58 checks**, including a four-human full round, a 10% loss + duplicate + 100 ms delay round, state-ACK repair, host reload, lost-token seat reclaim and console cleanliness.
- A test-only `?netem=drop:…,dup:…,delay:…,jitter:…` hook impairs application frames without touching PeerJS signalling, so recovery paths are exercised deterministically.
- `scripts/verify.mjs` covers tile size and autoplay; `scripts/check.mjs` covers the two-choice launch menu.


## [1.10.6] — 2026-11-09

### Added

- **Tile size.** Display now offers four sizes (Small, Default, Large, Extra large) for your own 3D hand and the accessible card chips in the dock. The 3D row reflows with a wider spacing and pulls slightly inward at Extra large so the outer tile never overhangs the rim. The preference is saved per device and does not change other seats or the rules.
- **Autoplay my seat.** Actions has an opt-in toggle that lets the coach take your legal turn after a short pause. It works in solo, as host and as guest, covers lead, follow, showdown, bid and draft, and stops the moment you switch it off. It never touches another player's seat.

### Fixed

- **Seated guest showing as a spectator.** A returning guest whose rejoin token was lost could be approved as a viewer while its stale human seat froze the table, so both devices showed the guest's name “thinking” with no controls. The host now reclaims an offline human seat with the same name when it approves the request, and automatically reconciles an already-approved viewer into that seat.
- **Frozen snapshot with a live channel.** Pings kept the old watchdog satisfied even when state messages stopped. The client now tracks the last applied snapshot: it asks for a resync after 9 seconds and reconnects after 24 seconds. A failed snapshot apply is caught and recovered instead of leaving the lobby on “waiting”.
- **Zombie seats after host recovery.** Recovered human seats get a 30-second grace window to reconnect, then become bots; their rejoin token is preserved so the guest can still reclaim the seat.
- **Automatic rejoin no longer gives up after one try.** The auto path was taking the manual two-attempt branch, showing “Connection attempt 2 of 2…” and stopping without scheduling another host-rejoin attempt. It now reaches the retry loop, which retries every 1.2 s until the recovered host answers.
- **Stale welcome could demote a seated guest.** A queued/viewer welcome arriving after the real seat was granted (for example from a retry on an older connection) is now acknowledged but ignored.

## [1.10.5] — 2026-11-09

### Fixed

- **Approval no longer looks stuck.** The invite sheet re-renders on every approval path and shows a green receipt (seated, watching, or queued with the reserved seat). Previously a seated/viewer approval left the pending row in place, so the host could not tell whether the tap worked.
- **Lost welcomes are retried until acknowledged.** The host now resends a welcome every second (up to eight tries) until the guest returns `welcome-ack`; a guest that receives a welcome acknowledges it immediately.
- **Waiting guests recover themselves.** While a guest is on the waiting screen it asks the host for its join status every four seconds. The host answers with the pending notice, the queued welcome with a fresh snapshot, a viewer welcome, or a seated state, so a dropped approval message cannot strand the guest.
- **Resync works before a seat exists.** Queued guests and viewers can now request a resync; the host answers with their role-appropriate welcome instead of ignoring the request.

## [1.10.4] — 2026-11-09

### Added

- **Invite friends from a solo game.** A gold **Invite** control in the top bar and Actions promotes the running solo table into a host room without redealing: room number, generated PIN, Copy room info, Copy link, Share, seat roster and approval queue. Host approval and the PIN still gate every guest.
- **Queued mid-trick joins.** A guest approved during a trick reserves a bot seat, immediately enters the table as an audience viewer with an “Approved — watching until this trick ends” banner, and is seated at the next trick with the bot’s hand, captures and score. A disconnect keeps the reservation for five minutes so a reload can reattach; queued guests get a rejoin token and are restored by host recovery.
- **Host-request popup and room info.** A join request while the host is on the table shows a persistent Allow / Watch only / Deny / Later popup; Later leaves an **n waiting** pill in the top bar. The top-bar room chip now opens the room-info sheet instead of only copying, so the host can read the number and PIN aloud.
- **Automatic host audio.** Opening the invite room auto-joins the host voice mesh (subject to microphone permission and the Auto audio preference). A queued guest waits for the seating `welcome` before joining audio.
- **Action acknowledgement and state catch-up.** Guest actions carry an `actionId`; the host acknowledges and deduplicates retries. During active play the host re-sends a full snapshot every 4 seconds (plus `seq` pulses on summary screens); a lagging guest requests a full `resync`, and an illegal play or returning to the tab does the same. Actions has **Refresh table**. A client watchdog pings every 5 seconds and reconnects to the same seat after 15 seconds of silence, so a stalled channel no longer leaves “Bot 2 is thinking” frozen on screen. The host marks a guest offline after 20 seconds without a message; if it is that guest's active turn for 30 seconds, the bot takes the seat, the old connection closes, and the guest can reclaim it with the seat card.
- **Stable iPad menus and viewport.** The tablet layout is a fixed `100dvh` viewport, the HUD wraps before the right rail instead of clipping the Result chip, and iOS double-tap page zoom/callout is suppressed. The second `touchend` and Safari gesture events are cancelled on the canvas as well, so double-tapping a tile cannot zoom the page or leave a white gap. The in-room tablet top bar is compact (icon-only Update/Join audio, no About/Leave in the bar, Actions owns Leave) so the room chip cannot widen the layout and crop the table. This stops a double-tap from scrolling the table, hiding the dock or leaving a white gap.
- **Local hand row and dock on iPad.** The owner's hand is now one straight row along the seat tangent (`seat === MY_SEAT`, step 0.98), so face-up tiles neither overlap nor collide with the next seat's fan. Promotion from audience mode clears the dock's `hidden` attribute, so “Choose a combination to lead” returns as soon as the seat is handed over.
- **Watcher presence.** Every participant sees a top-bar `👁 n` chip and a name list whenever someone is watching, including queued audience members marked “waiting for seat”.
- **Easy reconnect after a bot replacement.** A guest's seat card is kept for seven days in `localStorage` (plus `sessionStorage`) so closing and reopening the link on the same device reclaims the same seat without approval. The waiting panel has **Reconnect**, and a lost `welcome` resends `hello` up to three times.
- **Feature previews.** `.github/workflows/pages.yml` publishes `main` at the root and `feature/invite-friends` under `/preview/invite-friends/`, so the feature can be tested without replacing production.

### Changed

- **Feature-train branch workflow.** `main` remains production and the only Pages source; `develop` is the integration/feature train. Features, fixes and docs branch from `develop`, releases are cut from `develop` and merged to `main`, then back-merged. Added `docs/BRANCHING.md` and updated `CONTRIBUTING.md`, `AGENTS.md`, the PR template, deployment and release checklist.

## [1.9.22] — 2026-11-08

### Added

- **Play-history link in the turn-log sheet.** On iPad, opening **L** moves the log into the panel sheet, which hides the panel's own header and therefore the old **History** button. The sheet header now carries the same **View trick log / ดูประวัติการเล่น** action used on the round summary. It opens the shared `#lastTrickModal` browser (round/trick selectors and the comparison cards), closes the sheet first, and is disabled with “No completed turns yet.” until the first trick resolves.

## [1.9.21] — 2026-11-08

### Fixed

- **The C/M/A/i/H/L panel rail now appears on iPad landscape.** At 1180 px wide the CSS hid the sidebar because the pointer is coarse, but `isPanelRailMode()` only checked `max-width: 1024px`, so the rail stayed hidden and both navigation sets disappeared. `isPanelRailMode()` now uses the same `(max-width: 1024px), (pointer: coarse)` query as the sidebar rule, and its media listener follows the same query. The circle buttons return on iPad horizontal.

## [1.9.20] — 2026-11-08

### Fixed

- **iPad hints stay above the HUD.** The toast layer is repositioned from the measured HUD bottom before every toast, so a wrapped Thai HUD no longer covers the message. Toasts also sit above the HUD on the z-axis as a fallback. The **Hint** toast now names the suggested set (`Hint: Red Advisor`) or the discard count instead of only saying “Hint applied”.
- **The tile inspector opens on the selected tile.** Selecting a tile with a tap, the hand list or Hint records it for the inspector, and opening the `i` orb falls back to the newest selection. The empty prompt now says **tap** on touch devices instead of “hover or click”.
- **Readable hand buttons.** The two circular controls that showed **手** — the panel-rail hand orb and the collapsed hand dock — now show **H** with the same `Your hand` / `Expand hand dock` labels.

## [1.9.19] — 2026-11-08

### Fixed

- **2D mode no longer renders cast shadows.** The default top-down table had a soft shadow under every tile and the rim, which read as dark noise. The shadow pass now starts disabled and is enabled only for the 3D view; toggling views rebuilds materials so the change is immediate.
- **iPad portrait no longer crops the table.** The 2D camera now fits the whole rim to the live stage aspect between the HUD strip and the hand dock, instead of reusing the desktop distance. iPad portrait (820×1180) and landscape (1180×820) both show the complete table, and an expanded dock reframes the board so it stays clear.

### Added

- **iPad device emulation in the browser harness.** `scripts/browser-check.mjs --device ipad|ipad-air|ipad-mini|ipad-pro-11|ipad-pro-13 --orientation portrait|landscape` sets the viewport, DPR, touch, coarse pointer and Safari UA. `scripts/verify.mjs` now checks both iPad orientations, the 2D/3D shadow switch, and a `getFraming()` report that asserts the rim is on-screen and above the dock.
- **Framing API.** `LeabTui.getFraming()` returns projected table bounds, dock clearance and the current shadow state for regression checks.

## [1.9.18] — 2026-11-08

### Fixed

- **A legal set can always be shown, even when it loses.** The showdown dock previously used “You cannot beat the table” for both a losing legal set and an illegal submission, and the Show button was disabled whenever `showdownCanShow` was false. It is now enabled for any legal set of the called type, independent of the current best.
- **Illegal submissions are explained.** If the two/three/four tiles sent face-down do not form the called type, the dock says “Your submitted tiles are not a {type}” and explains that only Keep hidden is available; a legal but wrong-type set gets its own message. The follow dock warns before sending a set that cannot be shown.

## [1.9.17] — 2026-11-08

### Added

- **Join a started table.** A guest who asks mid-match is queued after the PIN and must be approved. The host approves them into a **bot seat** (the bot’s hand, captures and score are inherited) or allows them as a **viewer** when they choose Watch only. If no bot remains, the only option is viewer.
- **Viewer mode.** `MY_SEAT = -1`; `sanitizeForSeat(state, -1)` ghosts every hand, the viewer has no dock/chat/voice controls and cannot act, but sees the public table, captures, history and result summaries.
- **Pause joins for 30 minutes.** Host can pause from the host panel or from a pending request. New guests get `rejected.suppressed`; existing rejoin tokens still work. Resume from the same button.
- **Copy room info at the table.** Actions has **Copy room info**; clicking the room chip as host copies the code, invite link and current PIN. Guests still copy only the invite link.

### Changed

- `requestGuest` no longer rejects a started room outright; approval is required and the host gets a “wants to join” toast/badge.
- The host roster replaces the bot profile, clears the old bot rejoin token, issues a new guest token and publishes the current state to the guest.

## [1.9.16] — 2026-11-08

### Added

- **Installable full-screen web app.** `manifest.webmanifest` with `display: fullscreen`, 192/512 PNG icons, a maskable icon, `apple-touch-icon`, Apple standalone meta tags and `viewport-fit=cover`. On iPad/iPhone, **Share → Add to Home Screen** opens the game without the browser tab/address bar. Chrome iPad has no page-fullscreen API for a normal page, so this is the reliable route; Safari’s fullscreen API is used where available.
- **Display → Full screen.** A button enters/exits full screen where the browser supports it; on iPad Chrome it shows the Add-to-Home-Screen hint instead.
- **Safe-area layout.** `.app` respects `safe-area-inset-top/bottom`; the hand dock and reset-board button lift above the home indicator.
- **Host reload recovery (same tab).** The host saves a `sessionStorage` recovery blob — room code, serializable state, roster with rejoin tokens, stats, chat. On reload/update, the same tab reopens the **same PeerJS room**, restores the match and turn, issues a fresh PIN, and guests reconnect automatically. Guests show “The host is restarting — reconnecting…” and retry for up to ~30 s. An intentional Leave clears the blob.

### Notes

- There is still **no service worker**: the game needs the network for Three.js/PeerJS, so it is not an offline app. The home-screen app is a shortcut to the live site, and the version guard/update changes still apply.
- Host recovery is **same-tab only**: closing the tab clears sessionStorage, and another device cannot take over. Voice calls are dropped by the reload; guests must rejoin audio. The host's old PIN is replaced by a new one; guests with rejoin tokens bypass it.

## [1.9.15] — 2026-11-08

### Changed

- **Update keeps a solo table.** `forceReload` adds `resume=1` when a local match is active; boot restores the saved match and skips the launch menu, showing “Updated — your table is restored.” If the save is missing, the menu returns instead of silently starting a new game.
- **A reconnecting guest no longer sees the join form.** With a stored rejoin token, `joinRoom` opens a **“Reconnecting to your seat…”** view instead of the code/name/PIN form. The welcome restores the same seat and table. If the reconnect fails, the form appears prefilled with the code and name plus the error.
- **Host updates still end the room.** The reload confirmation says so; there is no host migration. Both sides need 1.9.12+ for guest tokens.
- **Version stamp in the history modal.** The Turn-history footer shows the running version, so an iPad can be checked against the web at a glance. A successful boot clears the one-shot `bootReload` guard, so an interrupted update retries on the next open instead of being skipped.

## [1.9.14] — 2026-11-08

### Changed

- **2D is a fixed table, not an orbit.** Rotation is disabled in 2D. Left-drag on the table background (one-finger on touch) **pans**; wheel/pinch still **zooms**. 3D keeps left/one-finger orbit and two-finger dolly-pan. The pan target is clamped to radius 4.2 so the table cannot be lost; the reset-board button recenters it.
- **Cinema is 3D-only.** Tapping the orbit button in 2D shows a short message instead of silently rotating the fixed table.

### Added

- **Draft toggle on the launch menu.** Before starting a solo or host match, the menu now exposes **Draft mode: pick 2 tiles ×4 (experimental)**, synced with the HUD chip and the Actions checkbox. A new match started from the menu uses the setting; this makes the option easier to find on iPad.

### Fixed

- **iOS autozoom.** The viewport now declares `maximum-scale=1, user-scalable=no`; `touch-action` prevents double-tap zoom on the table reset, buttons and chips, and coarse-pointer inputs use a 16 px minimum so Safari does not zoom the page when a control is focused. The game’s own pinch zoom on the canvas is unchanged.
- **The table no longer fades to white when zoomed out.** The distance fog (`scene.fog`, near 15 / far 34) was blending the table into the light background at the iPad’s maximum zoom-out. Fog is disabled; the table keeps its colours at every distance.

## [1.9.13] — 2026-11-08

### Added

- **Reset-board shortcut, bottom-right on tablets.** On touch devices and layouts ≤1024 px, a round button appears above the hand pill. It re-seats the world to the local player, returns to **2D**, re-fits the canvas and re-syncs the table. The desktop reset-camera tool stays where it was.
- **WebGL context recovery.** `webglcontextlost` shows a warning; `webglcontextrestored` re-fits and re-syncs. If the reset button finds a lost context it reloads the page, and a guest auto-rejoins the room (1.9.12).

### Notes

- The button is intentionally hidden on wide desktop layouts, where the top-right reset-camera control is already visible.

## [1.9.12] — 2026-11-08

### Changed

- **No verdict before the full circle.** The trick is judged only after every seat has chosen **Show set** or **Keep hidden**. Previously the comparison and a winner tick appeared as soon as the local player revealed, even with the other three still face-down.
- **Show set applies immediately.** The intermediate “Reveal your set” popup is gone; the cards flip, the turn advances, and the showdown continues.
- **The trick result opens for everyone.** After the last decision, `trickResultModal` opens for the host and every guest — whether they revealed or stayed hidden — with all four seat frames, mini cards (backs while hidden), the large ✓ and gold frame on the winner, and the winner/reason note. In solo the next trick waits for Continue; in a P2P room the summary is informational and the table continues.

### Added

- **Captured piles sit on the rim.** They moved from radius 5.35 to **5.90** and are spaced along the rim arc by 1.02 (was a straight tangent fan at 0.58), so two piles no longer overlap and none push past the table edge. The seat nameplates moved inward to 5.15 so they are not buried under the piles.
- **Centre plays no longer overlap.** The automatic grid spacing went from 0.52 to **0.96**, so a pair, triple or six-tile set has a visible gap instead of interpenetrating.
- **The view toggle reads 2D / 3D.** The old “Top” label is now **2D** in both languages; the default remains the 2D view. The header Update pill also raises a toast when a new version appears during a match, so an iPad can find it without opening the lobby.
- **The Turn history stays live.** While the history modal is open it follows the latest trick (unless you pick an older round/turn) and re-renders on every state update. If the turn reaches you while it is open, it closes with a “Your turn” toast so the board is never hidden behind a stale Log.
- **Guest auto-rejoin after a reload or version update.** Each seat gets a random 16-byte rejoin token in `welcome`; the guest keeps it in `sessionStorage` with the room code and seat. On the next load, `hello.rejoinToken` is checked before the PIN/approval gate and the host reattaches the same seat, even mid-match and even if the seat had become a bot. The token is never in the roster, state, URL, export or localStorage; an intentional Leave clears it. A host reload still ends the room.

## [1.9.11] — 2026-11-07

### Fixed

- **Older iOS/iPadOS sizes.** `vh` fallbacks now precede the `dvh` modal and dock heights, so a Safari version without `dvh` still keeps the history/result modal inside the screen.
- **The URL seed now reaches the draft.** `?seed=123` was only setting a temporary RNG at boot; `beginMatch` and the boot deal replaced it with a fresh random seed. The seed is now parsed into `bootSeed`, copied into `state.seed`, and used by `dealRound` before `startDraft`, so a reload with the same URL reproduces the pool and every random bot draw.
- **Seeded rounds are stable.** `startNextRound` no longer replaces `state.seed` with a new random value; each round derives from the match seed.
- **Redraw deals a different hand.** The deal RNG includes the redraw count, so a redraw no longer replays the same shuffle.

## [1.9.10] — 2026-11-07

### Changed

- **Bots draft at random.** The experimental bot now takes two tiles uniformly at random from the remaining pool instead of the two highest-power tiles. It still never reads the human hand; the pool is public in this variant. Bot hands are therefore mixed rather than stacked with Generals and Advisors.
- **Seeded drafts stay reproducible.** The pool shuffle now uses the round seed (it previously reused the previous deal's generator), so `?seed=` reproduces the pool and the bot draws for the same round.

## [1.9.9] — 2026-11-07

### Added

- **Draft: on/off chip in the HUD.** The host can switch the experimental draft deal from the table without opening the Actions panel. It shows the current setting, is hidden for guests, and applies to the next deal.
- **Bot picks are visible.** Every draft pick — human or bot — is written to the live Turn log as “{seat} picked 2 tiles” with a `D` time marker, so the bots are clearly taking part instead of appearing to skip.

### Changed

- **The mode can be changed during a draft.** The current draft finishes normally and the new setting applies to the following deal; the control is no longer disabled mid-draft.
- **The host PIN is now as large as the room number.** The 5 digits use the same 28 px mono treatment in their own gold card, with Copy PIN and New PIN below; clicking the digits selects the whole PIN.

### Fixed

- The stale “20-character PIN” fallback copy now says 5 digits.

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
