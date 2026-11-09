# Handoff — Leab-Tui 3D 1.9.22

**Session:** 2026-11-08 · OpenCode 2.2.5 · DeepSeek V4.1 Flash

## Outcome

Release **1.9.22** is built, verified and published. It follows the 1.9.19–1.9.21 iPad work with these fixes:

- **Hints clear the HUD.** `positionToastLayer()` measures the HUD strip before every toast, so a wrapped Thai HUD cannot cover the message; the layer also sits above the HUD on the z-axis. The Hint toast now names the suggested set (`Hint: Red Advisor`) or the discard count.
- **The inspector opens on the selected tile.** A tap, hand-list click or Hint records the tile, and opening the `i` orb falls back to the newest selection instead of the empty prompt. Touch devices get a tap-specific prompt.
- **Readable hand controls.** The two circular buttons that showed **手** — the panel-rail hand orb and the collapsed hand dock — now show **H**, with the same `Your hand` / `Expand hand dock` labels.
- **The C/M/A/i/H/L rail is back on iPad landscape.** `isPanelRailMode()` now matches the coarse-pointer sidebar rule instead of width alone.
- **The L sheet links to play history.** The panel-sheet header shows **View trick log / ดูประวัติการเล่น**, closes the sheet and opens the same `#lastTrickModal` as the round summary. It is disabled with “No completed turns yet.” until a trick resolves.
- Release **1.9.19** removed 2D cast shadows and fitted the whole table to iPad portrait and landscape, with `--device ipad` emulation and `getFraming()` checks.
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
| 2D framing | Fit to stage aspect and HUD/dock/rail occupancy; no cast shadows |
| Hints / inspector | HUD-aware toasts, combo named in the hint, inspector follows the selection |
| Showdown | Face-down sends, full circle, legal losing sets showable, result for everyone, Chuan-aware reason |
| History | Turn Log live, Turn history card comparison, pile popup with winner/reason |
| Multiplayer | Host-authoritative WebRTC; guest rejoin tokens; host same-tab reload recovery; late join into bot seats; viewers; 30-min join pause |
| Privacy | Per-seat redaction; viewer seat `-1` ghosts all hands |
| Chat / voice | Host-routed chat; full-mesh voice with mute/deafen; viewers have neither |
| Full screen | `manifest.webmanifest`, icons, Apple meta, Display → Full screen |
| Persistence | Autosave, solo resume, stats, JSON export; network saves non-resumable; sessionStorage rejoin/host recovery |
| Verification | 38/38 self-test, 413 static checks, 44 browser checks (incl. iPad portrait/landscape), 37-check two-browser WebRTC suite (local and live) |
| Docs | README, AGENTS, STATE, CONTINUATION, rules, architecture, multiplayer, protocol, tests, deployment, data, controls, accessibility, performance, design, browsers, FAQ, roadmap, checklist, gallery, glossary |

## Evidence

```
node --check script.js / peer-manager.js / voice-chat.js / security.js   PASS
node scripts/check.mjs                                                  PASS (413 checks)
?selftest=1                                                             SELFTEST PASS 38/38
node scripts/verify.mjs                                                 ALL 44 BROWSER CHECKS PASSED
AUDIO_TEST=1 node scripts/verify.mjs                                    audio peak measured
node scripts/net-check.mjs                                              ALL 37 PASSED
BASE_URL=https://somphol.github.io/leab-tui-3d/ node scripts/net-check.mjs  ALL 37 PASSED
iPad portrait 820×1180    whole rim on-screen, clear of dock, 2D shadows off, 3D shadows on
iPad landscape 1180×820   whole rim on-screen, clear of dock, 2D shadows off, 3D shadows on
iPad hint                 toast below the HUD, names the suggested set
iPad inspector            opens with the selected tile and "Selected for play"
iPad landscape rail       C/M/A/i/H/L circles visible
iPad L sheet              View trick log enabled after one trick; opens the shared history
hand controls             panel rail and collapsed dock both read H
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

See **[CONTINUATION.md](CONTINUATION.md) §3** and **[../AGENTS.md](../AGENTS.md) §4**. The short list: full-circle judgement; legal losing sets can be shown; redaction/seat `-1` for viewers; host authority; session-only PIN/token/recovery handling; draft is experimental; 2D is fixed-orientation; **2D has no cast shadows**; **2D framing is computed from the live stage**; **toasts measure the HUD**; **inspector follows the selection**; **hand orbs use H**; **the rail follows the coarse-pointer query**; **the L sheet uses the shared history modal**; all version strings move together.

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
