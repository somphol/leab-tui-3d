# Handoff — Leab-Tui 3D 1.10.0

**Session:** 2026-11-08 → 2026-11-09 · OpenCode 2.2.5 · DeepSeek V4.1 Flash

## Outcome

Release **1.10.0** is built, verified and published. It turns the table into a resilient multiplayer studio:

- **Invite from a solo game.** A gold **Invite** in the top bar and Actions opens a host room around the running solo match without redealing. The invite sheet shows the room number, PIN, Copy room info, Copy link, Share, seats and approvals. Host audio joins automatically.
- **Audience queue.** A guest approved mid-trick enters the table immediately as a viewer (`seat: -1`, ghosted hands, no dock/chat/voice) with an “Approved — watching until this trick ends” banner, then takes the reserved bot seat at the next trick. The hand dock returns after promotion.
- **Watchers everywhere.** Every participant sees a top-bar `👁 n` chip and a name list; queued audience members are marked “waiting for seat”.
- **Reliability.** Guest actions carry an `actionId`; the host ACKs and deduplicates retries. Active play re-sends a full snapshot every 4 s; summary screens use `pulse {seq}`. A lagging guest requests `resync`; Actions has **Refresh table**. A client watchdog pings every 5 s and reconnects a stalled seat after 15 s.
- **Host keepalive.** A silent guest is marked offline after 20 s. If it is their active turn for 30 s, the host gives the bot the seat, sends `seat-timeout`, and closes the old connection; the guest reclaims it with the seven-day seat card.
- **iPad fixes.** Local hand fan uses `seat === MY_SEAT` with a 0.245 rad step (no overlap), promotion clears the dock’s `hidden` attribute, and a host who started from `?mode=solo` now recovers the same room after **Update**.
- Live: [https://somphol.github.io/leab-tui-3d/](https://somphol.github.io/leab-tui-3d/)
- Preview: [https://somphol.github.io/leab-tui-3d/preview/invite-friends/](https://somphol.github.io/leab-tui-3d/preview/invite-friends/)
- Repository: [https://github.com/somphol/leab-tui-3d](https://github.com/somphol/leab-tui-3d)
- Local master: `~/Projects/leab-tui-3d`

## Evidence

```
node --check script.js / peer-manager.js / voice-chat.js / security.js   PASS
node scripts/check.mjs                                                  PASS (441 checks)
?selftest=1                                                             SELFTEST PASS 38/38
node scripts/verify.mjs                                                 ALL BROWSER CHECKS PASSED
node scripts/invite-check.mjs                                           ALL 16 INVITE CHECKS PASSED
node scripts/net-check.mjs                                              ALL 47 MULTIPLAYER CHECKS PASSED
BASE_URL=…/preview/invite-friends/ node scripts/invite-check.mjs        ALL 16 INVITE CHECKS PASSED
invite/audience      solo → Invite → host audio, popup, audience, promotion
reconnect            closed tab reopens the same seat through the seat card
state catch-up       manual resync + heartbeat + action ACK/dedup
iPad                 hand fan no overlap, dock returns, host update recovers
watchers             host and guest see the same name list; chip clears on leave
```

## Decisions a next agent must not silently change

See **[CONTINUATION.md](CONTINUATION.md) §3** and **[../AGENTS.md](../AGENTS.md) §4**. Short list: host authority; full-circle showdown; legal losing sets showable; redaction and viewer seat `-1`; PIN/token handling; `hostCurrentMatch()` must not call `beginMatch()`/`leaveRoom()`; queued guests are audience viewers until promotion; `seat === MY_SEAT` for the local fan; promotion clears the dock; 2D has no cast shadows; all version strings move together.

## Open items

- **iPad checks are emulated** (820×1180 / 1180×820); Safari toolbar, safe-area and GPU timing still need a physical pass.
- Watchers are names only; they have no rejoin token and are not promoted when a seat becomes a bot.
- A queued reservation is held for five minutes after a disconnect; the host can cancel it from the invite sheet.
- Host recovery is **same-tab only**; closing the tab ends the room. Voice drops on reload.
- Android Chrome can still fail at `ice-checking`/`host-timeout`; no TURN relay (issue #1).
- No service worker/offline mode.

## Continuity

- Deployed from `main` (repository root) by GitHub Pages.
- `develop` is the feature train; `feature/invite-friends` carries this release preview.
- Local master: `~/Projects/leab-tui-3d`.
- Build record: `STATE.md` and `state.json`.
- Verification: `docs/TESTING.md`; release routine: `CONTINUATION.md` §7.
