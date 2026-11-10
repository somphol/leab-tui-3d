# Continuation — Leab-Tui 3D

**As of 2026-11-09 · release 1.10.7**

- Live: <https://somphol.github.io/leab-tui-3d/>
- Repository: <https://github.com/somphol/leab-tui-3d>
- Local master: `~/Projects/leab-tui-3d`
- Primary branch: `main` (GitHub Pages serves the repository root)
- Last release commit: `this release commit` — *Release Leab-Tui 3D 1.10.7: resilient multiplayer, tile size and autoplay*
- Branch workflow: [`BRANCHING.md`](BRANCHING.md) — `main` is production, `develop` is the feature train
- Feature train: `feature/invite-friends` — Invite, audience queue, watchers and reliability; preview at `/preview/invite-friends/` (1.10.7)

This is the short handoff for a new agent or a later session. The durable
project rules are in [`../AGENTS.md`](../AGENTS.md); release history is in
[`../CHANGELOG.md`](../CHANGELOG.md) and [`../STATE.md`](../STATE.md).

## 1. Where the product is now

A zero-build, static, bilingual Three.js table for **เลี๊ยบตุ่ย (Leab-Tui)**.
Four seats, solo or host-authoritative WebRTC, PeerJS signalling only, no game
server. The app is installable from the browser (manifest + icons +
safe-area), but there is **no service worker** and no offline mode.

Current table/network model:

- **Solo** — 1 human + 3 heuristic bots.
- **Hosted room** — host + up to 3 humans; empty seats become bots.
- **Late join** — a new guest can request a started table. The host approves
  them into a **bot seat** (the bot’s hand/captures/score are inherited) or
  allows them as a **viewer**; deny, or pause joins for 30 minutes.
- **Viewer** — seat `-1`, every hand ghosted, no dock/chat/voice and no
  actions. No viewer rejoin token; re-approval is required after a reload.
- **Guest rejoin** — a per-seat 16-byte token in `sessionStorage`; `hello`
  carries it and `reattachGuest` restores the same seat after a reload/update.
- **Host reload recovery (same tab)** — a `sessionStorage` blob (room code,
  state, roster with guest tokens, stats, chat) is saved on `pagehide`; boot
  reopens the **same** PeerJS room, hydrates the match and issues a new PIN.
  Guests see “The host is restarting…” and retry. Closing the tab ends the
  room; there is no cross-tab/device host migration.
- **Join pause** — `net.security.suppressUntil`; new requests get
  `rejected.suppressed`, rejoin tokens bypass. Host can resume.
- **Copy room info** — host Actions button and host room-chip click copy code
  + link + **current** PIN; guests’ chip copies only the invite link.

## 2. What changed since 1.9.6

| Release | What it added |
| --- | --- |
| 1.9.7 | Experimental draft deal (off by default; 2 tiles ×4) |
| 1.9.8 | Captured-pile-style comparison for reveal/history |
| 1.9.9 | Draft HUD chip, logged bot picks, large host PIN |
| 1.9.10 | Bot draft picks uniformly random |
| 1.9.11 | `?seed=` reaches the draft; reproducible pool/bot draws |
| 1.9.12 | Full-circle result for every human; guest auto-rejoin |
| 1.9.13 | Tablet reset-board shortcut; WebGL context recovery |
| 1.9.14 | 2D pan/zoom (no orbit), launch-menu Draft toggle, iOS autozoom disabled, fog removed |
| 1.9.15 | Update keeps the table (solo resume, guest reconnect view, version stamp) |
| 1.9.16 | Installable full-screen web app; same-tab host reload recovery |
| 1.9.17 | Late join/bot replacement, viewers, 30-minute join pause, in-room Copy room info |
| 1.9.18 | Legal losing sets stay showable; illegal submissions explained |
| 1.9.19 | 2D shadows off; 2D camera fits iPad portrait/landscape; device-emulated checks |
| 1.9.20 | Hint toast clears the HUD; inspector opens on the selected tile; 手 → H |
| 1.9.21 | C/M/A/i/H/L rail visible on iPad landscape |
| 1.9.22 | L sheet exposes the shared play-history browser |
| 1.10.4 | Invite from solo, audience queue, watchers, keepalive/resync, iPad hand fan and dock fixes |
| 1.10.5 | Approval receipts, welcome ack/retry, join-status recovery, queued/viewer resync |
| 1.10.6 | Tile size (2D+3D), autoplay my seat, seat reclaim, state-freshness watchdog |
| 1.10.7 | Launch menu offers only Play now (invite later) and Join a game |

Feature design records: [`ARRANGEMENT.md`](ARRANGEMENT.md) (table/reveal/piles),
[`DRAFT.md`](DRAFT.md), [`MULTIPLAYER.md`](MULTIPLAYER.md),
[`PROTOCOL.md`](PROTOCOL.md), [`RULES.md`](RULES.md).

## 3. Invariants not to break

- **Show vs hidden (1.9.18).** Any *legal set of the called type* can be shown,
  even if it loses. Only an illegal/wrong-type submission is limited to Keep
  hidden. Do not reintroduce “cannot beat” as the reason when the real issue is
  legality; the dock/follow text explains which case applies.
- **Full-circle judgement.** The trick is resolved only after every seat has
  chosen Show or Keep hidden. The result summary then opens for every human,
  including those who stayed hidden. `resolveTrick` must not run earlier.
- **Redaction.** `sanitizeForSeat` is the only privacy boundary. A viewer is
  `seat = -1`; every hand and unrevealed set must be ghosted. Captures are
  public. Never send the same state object to two seats.
- **Host authority.** Guests send `{type:"action"}`; only the host runs rules,
  deals, bots and scoring. A late-join replacement and viewer are host-approved.
- **Pin/token handling.** The PIN is 5 digits, hashed in memory; the plain PIN
  never enters state, roster, URL, export or localStorage. Guest rejoin tokens
  live in sessionStorage only. Host recovery is sessionStorage only.
- **Draft is experimental and not in the source rules.** Off by default; bots
  pick uniformly at random; the pool is public; redraw is disabled in draft.
- **2D is fixed orientation.** Rotation disabled; drag pans; wheel/pinch
  zooms. 3D orbits. Do not let a page pinch/double-tap zoom the game (iOS).
- **2D framing (1.9.19).** `fitTopFraming` fits `TABLE_FIT_RADIUS` to the live
  stage aspect between the HUD strip and the hand dock, and re-fits (tween) when
  the dock expands. Do not restore a fixed desktop top distance — it cropped
  iPad portrait and hid the hand behind the dock in landscape.
- **Shadows (1.9.19).** The shadow pass is **off in 2D** and on in 3D;
  `applyShadowMode` toggles both shadow-casting lights and rebuilds materials.
  A shadow in the top view is a regression, not a style choice.
- **Panel rail (1.9.21).** `isPanelRailMode()` must match the CSS sidebar
  rule — `(max-width: 1024px), (pointer: coarse)`. iPad landscape is wider than
  1024 px yet coarse, so a width-only check hides both the sidebar and the rail.
- **History from the log sheet (1.9.22).** `openPanelSheet("logPanel")`
  shows `#panelSheetAction` with `summary.viewLog`; it hides the sheet and
  calls the same `openLastTrickModal()` as `#logHistoryBtn` and the summary.
  Keep one history renderer; do not fork a second modal.
- **Hints and inspector (1.9.20).** `toast()` measures the HUD and positions
  the layer below it; never hard-code a top that a wrapped Thai HUD can cover.
  Selecting a tile records `inspectedTileId`, and opening the inspector falls
  back to the newest selection. The hand orbs read **H**, not 手.
- **Version strings.** Bump `APP.version`, `<meta name="app-version">`,
  `style.css?v=`, `script.js?v=`, the three module imports in `script.js`, and
  the docs; `check.mjs` enforces most of them.

## 4. Verification (what passes today)

```bash
cd ~/Projects/leab-tui-3d
node --check script.js && node --check peer-manager.js
node --check voice-chat.js && node --check security.js
node scripts/check.mjs                 # 444/444
python3 -m http.server 8123 &          # if not running
node scripts/verify.mjs                # ALL 49 BROWSER CHECKS PASSED (includes iPad portrait/landscape)
AUDIO_TEST=1 node scripts/verify.mjs   # includes a real audio peak
node scripts/net-check.mjs             # ALL 57 MULTIPLAYER CHECKS PASSED (includes 4 humans + 10% loss)
node scripts/invite-check.mjs          # ALL 16 INVITE CHECKS PASSED
BASE_URL="https://somphol.github.io/leab-tui-3d/" node scripts/net-check.mjs
```

`net-check.mjs` covers host/guest start, privacy, chat, voice, actions, invite/audience,
guest reload rejoin, **host reload recovery**, **late join → bot seat**,
**viewer mode**, **30-minute join pause**, **copy-room-info UI**, and
disconnect-to-bot. `verify.mjs` covers boot, 3D, audio, display, the full
round, the showdown/result/history layout, **iPad portrait/landscape framing
and the 2D/3D shadow switch**, and no console exceptions.

## 4a. Multiplayer invariants (do not regress)

- **Transport:** PeerJS `serialization: "binary"` on host and client. JSON refuses frames over 16 KB and silently kills late-round four-human snapshots.
- **Ordering:** the host has an `epoch` (incremented on reload) and a monotonic `seq`; every `welcome` and `state` carries both. Clients ignore older sequences, duplicate frames and previous-epoch states.
- **Anti-entropy:** seated clients send `state-ack`; the host resends a targeted snapshot to any seat behind, plus a 4 s full heartbeat.
- **Actions:** at-least-once with the same `actionId` + host-side dedupe; retries at 1.5 s. Never generate a new id on retry.
- **Failure detection:** silent/closed seats are swept to bots after 20–30 s; rejoin tokens survive so the guest can reclaim.
- **Testing:** `?netem=drop:…,dup:…,delay:…,jitter:…` impairs app frames only (test hook). `net-check` includes a 4-human full round and a lossy round; both are release gates.

## 5. Open items / sensible next work

1. **Stale iPad cache.** The 1.9.15 screenshot still showed the old UI. The
   Turn-history footer now stamps the version; users should tap **Update** or
   reopen the page. After 1.9.16 a guest update rejoins the seat; after 1.9.16
   a host update recovers the same-tab room.
2. **Viewer limitations.** No rejoin token, no chat/voice, no promotion to a
   seat when a human later leaves. Add a viewer token/promotion if desired.
3. **Late join inherits the bot’s current hand.** The bot may have already
   played in the current trick. This is deliberate; do not reset the seat.
4. **Join pause is a fixed 30 minutes** and is global, not per-guest. The
   pending row can deny-and-pause; the host panel can resume.
5. **Host recovery is same-tab only.** No host migration across tabs/devices;
   closing the tab clears sessionStorage. Voice calls drop on host reload.
6. **Android Chrome WebRTC** still fails at `ice-checking`/`host-timeout` on
   some networks (issue #1); no TURN is implemented. iPad joins can work on the
   same room.
7. **No service worker/offline.** Full-screen install is a shortcut to the
   live site; the CDN is still required for Three.js/PeerJS.
8. **Showdown follow UX** now warns before sending an illegal set; if a real
   legal losing set ever disables Show, that is a regression — see invariant 1.
9. **iPad checks are emulated.** `scripts/browser-check.mjs --device ipad`
   matches CSS viewport, DPR, touch/coarse pointer and a Safari UA; it does not
   reproduce Safari's toolbar, safe-area insets or real GPU timing. Keep the
   physical iPad pass in a release when layout-critical code changes.

## 6. Files that matter

| Concern | Where |
| --- | --- |
| Branch / release flow | `docs/BRANCHING.md`, `CONTRIBUTING.md`, `docs/RELEASE_CHECKLIST.md` |
| Rules / combos / scoring | `script.js` — `detectCombo`, `compareScores`, `beats`, `scorePiles` |
| Showdown / result / history | `showdown`, `applyShowdown`, `resolveTrick`, `showTrickResult`, `trickCompareMarkup`, `renderLogRecord` |
| Draft | `startDraft`, `draftPick`, `finishDraft`, `randomDraftPair`, `renderDraft` |
| Host room / late join / viewers | `createHostRoom`, `requestGuest`, `approvePending`, `approveBotSeat`, `approveViewer`, `publishState` |
| Rejoin / host recovery | `saveRejoinSeat`, `reattachGuest`, `saveHostRecovery`, `resumeHostRoom`, `resumeHostFlow` |
| Join pause / copy info | `pauseJoinRequests`, `resumeJoinRequests`, `copyRoomInfo`, `#copyRoomBtn`, `#netChip` |
| 3D layout / view | `capturePosition`, `centerPosition`, `applyViewMode`, `fitTopFraming`, `#boardResetBtn` |
| Shadows / framing probe | `applyShadowMode`, `framing`, `LeabTui.getFraming()` |
| Hints / inspector | `positionToastLayer`, `toast`, `applyHint`, `renderInspector`, `openPanelSheet` |
| PWA / full screen | `manifest.webmanifest`, `icons/`, `#fullscreenBtn`, safe-area CSS |
| Verification | `scripts/check.mjs`, `scripts/verify.mjs`, `scripts/net-check.mjs`, iPad profiles in `scripts/browser-check.mjs` |

## 7. Release/handoff routine

1. Start from `develop`, not `main`: `git switch develop && git pull --ff-only`,
   then `git switch -c feature/<slug>` or cut `release/<x.y.z>` from `develop`.
2. Make the change; run `check.mjs`, `verify.mjs` (with `AUDIO_TEST=1`), and
   `net-check.mjs` (local, then `BASE_URL` live after deploy).
3. On the release branch, bump all version strings together and add a CHANGELOG
   entry + STATE section. Do not bump versions on a feature branch.
4. Update `state.json` (`version`, `verification`, `releaseHistory`), this file,
   `AGENTS.md` if an invariant/command changed, and `docs/TESTING.md` if a test
   count changed.
5. Merge the release branch to `main` with `--no-ff`, tag `vX.Y.Z`, push, wait
   for Pages, confirm `script.js` version and `?selftest=1` live, then run the
   live two-browser suite for network changes. Back-merge `main` into `develop`
   and delete the release branch.
