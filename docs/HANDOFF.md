# Handoff — Leab-Tui 3D 1.9.18

**Session:** 2026-11-08 · OpenCode 2.2.5 · DeepSeek V4.1 Flash

## Outcome

Release **1.9.18** is built, verified and published. This session grew the
studio from the 1.9.6 table into a release-grade teaching table with:

- table zones, drag-to-play/staging, free hand arrangement and layout relay;
- a full-circle showdown: Show applies immediately, every seat decides, then
  the result summary opens for **every human**; a legal losing set can always
  be shown, while an illegal submission is explained;
- the captured-pile-style comparison for the trick result and Turn history;
- Chuan-aware explanations, winner badges and a live history that closes when
  the turn reaches you;
- an off-by-default experimental draft deal (2 tiles ×4, random bot picks,
  reproducible `?seed=`, HUD switch, logged picks);
- seed reproducibility, 2D pan/zoom (fixed orientation), tablet reset-board,
  iOS autozoom disabled, fog removed;
- update-safe tables: solo resume, guest rejoin tokens, guest reconnect view;
- an installable full-screen web app (manifest, icons, Apple meta, safe area,
  Display → Full screen);
- same-tab **host reload recovery** that reopens the same room, restores the
  match and lets guests reconnect;
- **late join** into a bot seat, **read-only viewers**, a **30-minute join
  pause**, and in-room **Copy room info**.

- Live: <https://somphol.github.io/leab-tui-3d/>
- Repository: <https://github.com/somphol/leab-tui-3d>
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
| Showdown | Face-down sends, full circle, legal losing sets showable, result for everyone, Chuan-aware reason |
| History | Turn Log live, Turn history card comparison, pile popup with winner/reason |
| Multiplayer | Host-authoritative WebRTC; guest rejoin tokens; host same-tab reload recovery; late join into bot seats; viewers; 30-min join pause |
| Privacy | Per-seat redaction; viewer seat `-1` ghosts all hands |
| Chat / voice | Host-routed chat; full-mesh voice with mute/deafen; viewers have neither |
| Full screen | `manifest.webmanifest`, icons, Apple meta, Display → Full screen, Add to Home Screen |
| Persistence | Autosave, solo resume, stats, JSON export; network saves non-resumable; sessionStorage rejoin/host recovery |
| Verification | 38/38 self-test, 394 static checks, browser harness, 37-check two-browser WebRTC suite (local and live) |
| Docs | README, AGENTS, STATE, CONTINUATION, rules, architecture, multiplayer, protocol, tests, deployment, data, controls, accessibility, performance, design, browsers, FAQ, roadmap, checklist, gallery, glossary |

## Evidence

```text
node --check script.js / peer-manager.js / voice-chat.js / security.js   PASS
node scripts/check.mjs                                                  PASS (394 checks)
?selftest=1                                                             SELFTEST PASS 38/38
node scripts/verify.mjs                                                 ALL BROWSER CHECKS PASSED
AUDIO_TEST=1 node scripts/verify.mjs                                    audio peak measured
node scripts/net-check.mjs                                              ALL 37 PASSED
BASE_URL=https://somphol.github.io/leab-tui-3d/ node scripts/net-check.mjs  ALL 37 PASSED
host + guest           2 humans + 2 bots; guest privacy (8 real / 24 ghost)
late join              third guest approved into bot seat 2 with a live hand
viewer                 seat -1, all hands ghosted, hand dock hidden, console clean
join pause             new guest rejected with "not accepting"
copy room info         host Actions button + host chip title
guest reload           same seat via token; no PIN/approval
host reload            same room code, trick 3, guest seat reconnected
showdown legality      illegal pair explained; Show disabled; Keep hidden only
full round             roundEnd, 32 tiles conserved, points sum 0
```

## Decisions a next agent must not silently change

See **[CONTINUATION.md](CONTINUATION.md) §3** and **[../AGENTS.md](../AGENTS.md)
§4**. The short list: full-circle judgement; legal losing sets can be shown;
redaction/seat `-1` for viewers; host authority; session-only PIN/token/recovery
handling; draft is experimental; 2D is fixed-orientation; all version strings
move together.

## Open items

- iPad users can still be on a stale cached build (the 1.9.15 screenshot showed
  the old UI). The Turn-history footer prints the running version; update via
  **Update** or reopen the page. After 1.9.16 a guest update rejoins, and a
  host update recovers the same-tab room.
- Viewers have no rejoin token, chat or voice, and are not promoted when a seat
  later becomes a bot.
- A late-joined guest inherits the bot’s current hand/score; the bot may have
  played in the current trick.
- Join pause is a fixed global 30 minutes (not per-guest).
- Host recovery is same-tab only; closing the tab or another device ends the
  room. Voice calls drop on host reload.
- Android Chrome can still fail at `ice-checking`/`host-timeout` on some
  networks; no TURN is implemented (issue #1).
- No service worker/offline mode; the home-screen app is a shortcut to the live
  site.

## Continuity

- Deployed from `main` (repository root) by GitHub Pages.
- Local master: `~/Projects/leab-tui-3d`.
- Build record: `STATE.md` and `state.json`.
- Verification: `docs/TESTING.md`; release routine: `CONTINUATION.md` §7.
