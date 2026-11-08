# Handoff — Leab-Tui 3D 1.9.19

**Session:** 2026-11-08 · OpenCode 2.2.5 · DeepSeek V4.1 Flash

## Outcome

Release **1.9.19** is built, verified and published. This session fixed the two iPad table problems reported after 1.9.18:

- **2D is shadow-free.** The default top-down table no longer renders cast shadows under every tile and on the rim. The shadow pass starts disabled and is enabled only when the 3D view is selected; switching back disables it again.
- **iPad portrait no longer crops the table.** The 2D camera now fits the whole rim to the live stage aspect between the HUD strip and the hand dock, instead of reusing the desktop distance. iPad portrait (820×1180) and landscape (1180×820) both show the complete table, and an expanded dock re-fits the board so the hand stays clear.
- **iPad emulation is part of the harness.** `scripts/browser-check.mjs --device ipad|ipad-air|ipad-mini|ipad-pro-11|ipad-pro-13 --orientation portrait|landscape` sets viewport, DPR, touch, coarse pointer and a Safari UA. `scripts/verify.mjs` checks both orientations, the 2D/3D shadow switch and `LeabTui.getFraming()`.
- Live: [https://somphol.github.io/leab-tui-3d/](https://somphol.github.io/leab-tui-3d/)
- Repository: [https://github.com/somphol/leab-tui-3d](https://github.com/somphol/leab-tui-3d)
- Local master: `~/Projects/leab-tui-3d`
- Current continuation: **[CONTINUATION.md](CONTINUATION.md)**
- Durable rules: **[../AGENTS.md](../AGENTS.md)**

## What is in the box

| Area | State |
| --- | --- |
| Rules engine | Four-player game: 9 combo types, strict comparison, Chuan |
| AI | Heuristic lead/follow; fills empty network seats; random draft picks |
| Draft | Off-by-default, public 32-tile pool, 2×4 picks, seeded, logged |
| 3D | Carved tiles, ghosts, captured piles on the rim, 2D pan/zoom and 3D orbit, reset-board, safe area |
| 2D framing | Fit to stage aspect and HUD/dock occupancy; no cast shadows |
| Showdown | Face-down sends, full circle, legal losing sets showable, result for everyone, Chuan-aware reason |
| History | Turn Log live, Turn history card comparison, pile popup with winner/reason |
| Multiplayer | Host-authoritative WebRTC; guest rejoin tokens; host same-tab reload recovery; late join into bot seats; viewers; 30-min join pause |
| Privacy | Per-seat redaction; viewer seat `-1` ghosts all hands |
| Chat / voice | Host-routed chat; full-mesh voice with mute/deafen; viewers have neither |
| Full screen | `manifest.webmanifest`, icons, Apple meta, Display → Full screen |
| Persistence | Autosave, solo resume, stats, JSON export; network saves non-resumable; sessionStorage rejoin/host recovery |
| Verification | 38/38 self-test, 401 static checks, 32 browser checks (incl. iPad portrait/landscape), 37-check two-browser WebRTC suite (local and live) |
| Docs | README, AGENTS, STATE, CONTINUATION, rules, architecture, multiplayer, protocol, tests, deployment, data, controls, accessibility, performance, design, browsers, FAQ, roadmap, checklist, gallery, glossary |

## Evidence

```
node --check script.js / peer-manager.js / voice-chat.js / security.js   PASS
node scripts/check.mjs                                                  PASS (401 checks)
?selftest=1                                                             SELFTEST PASS 38/38
node scripts/verify.mjs                                                 ALL 32 BROWSER CHECKS PASSED
AUDIO_TEST=1 node scripts/verify.mjs                                    audio peak measured
node scripts/net-check.mjs                                              ALL 37 PASSED
BASE_URL=https://somphol.github.io/leab-tui-3d/ node scripts/net-check.mjs  ALL 37 PASSED
iPad portrait 820×1180    whole rim on-screen, clear of dock, 2D shadows off, 3D shadows on
iPad landscape 1180×820   whole rim on-screen, clear of dock, 2D shadows off, 3D shadows on
dock expand               board re-fits; table minY stays above the dock top
host + guest              2 humans + 2 bots; guest privacy (8 real / 24 ghost)
late join                 third guest approved into bot seat 2 with a live hand
viewer                    seat -1, all hands ghosted, hand dock hidden, console clean
join pause                new guest rejected with "not accepting"
guest reload              same seat via token; no PIN/approval
host reload               same room code, trick 3, guest seat reconnected
showdown legality         illegal pair explained; Show disabled; Keep hidden only
full round                roundEnd, 32 tiles conserved, points sum 0
```

## Decisions a next agent must not silently change

See **[CONTINUATION.md](CONTINUATION.md) §3** and **[../AGENTS.md](../AGENTS.md) §4**. The short list: full-circle judgement; legal losing sets can be shown; redaction/seat `-1` for viewers; host authority; session-only PIN/token/recovery handling; draft is experimental; 2D is fixed-orientation; **2D has no cast shadows**; **2D framing is computed from the live stage, not a fixed distance**; all version strings move together.

## Open items

- **iPad checks are emulated.** Chrome matches CSS viewport, DPR, touch/coarse pointer and a Safari UA, but not Safari's toolbar, safe-area insets or real GPU timing. Keep a physical iPad pass for layout-critical releases.
- iPad users can still be on a stale cached build. The Turn-history footer prints the running version; update via **Update** or reopen the page.
- Viewers have no rejoin token, chat or voice, and are not promoted when a seat later becomes a bot.
- A late-joined guest inherits the bot's current hand/score; the bot may have played in the current trick.
- Join pause is a fixed global 30 minutes (not per-guest).
- Host recovery is same-tab only; closing the tab or another device ends the room. Voice calls drop on host reload.
- Android Chrome can still fail at `ice-checking`/`host-timeout` on some networks; no TURN is implemented (issue #1).
- No service worker/offline mode; the home-screen app is a shortcut to the live site.

## Continuity

- Deployed from `main` (repository root) by GitHub Pages.
- Local master: `~/Projects/leab-tui-3d`.
- Build record: `STATE.md` and `state.json`.
- Verification: `docs/TESTING.md`; release routine: `CONTINUATION.md` §7.
