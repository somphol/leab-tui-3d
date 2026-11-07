# Handoff — session of 2026-11-06

## Outcome

Release **1.7.0** of Leab-Tui 3D is built, verified and published. It adds version/reload controls, connection diagnostics and mobile join restore, and hardens the room with host approval, an auto-generated strong PIN with memory-only digest, connection/message caps and a voice allowlist, on top of chat and full-mesh voice.

- Repository: <https://github.com/somphol/leab-tui-3d>
- Live: <https://somphol.github.io/leab-tui-3d/>
- Local master: `~/Projects/leab-tui-3d`
- Session: `ses_e4df670e0ffeOm01DFj236fffs` (OpenCode 2.2.5, DeepSeek V4.1 Flash)
- Previous session: `ses_e5a5e419dffedJGEsMy3mKV3ey` (1.0.0 → 1.3.2)

## What is in the box

| Area | State |
| --- | --- |
| Rules engine | Complete for the four-player game: 9 combination types, strict comparison, Chuan scoring |
| AI | Heuristic lead/follow with conservation and challenge probability; also fills empty network seats |
| 3D | 32 carved tiles, 32 back-only ghost meshes, mahogany table, OrbitControls, deal/flip/capture animations, seat-relative world rotation, portrait framing |
| UI | Bilingual EN/TH, coach, inspector, hint, undo comparison, rules, summaries, toasts, launch lobby, room chip |
| Multiplayer | Host-authoritative WebRTC via PeerJS; 2–4 humans; empty seats become bots; disconnects become bots; per-seat redaction; confirmed Leave room |
| Chat | Host-routed, escaped, 200-char cap, 350 ms guest limit, 30-message history |
| Voice | Full-mesh PeerJS media, mic mute, deafen, speaking pulse, no recording |
| Audio | Synthesised shuffle/clack/flip/sweep/win/lose, gesture-unlocked |
| Persistence | Autosave, solo resume, stats, versioned JSON export; network saves marked non-resumable |
| Verification | 38/38 self-test, 342-check static check, CDP harness, full-round evidence, 21-check two-browser WebRTC suite |
| Release docs | README, AGENTS, STATE, rules, architecture, multiplayer, protocol, tests, deployment, reproduction, data format, controls, accessibility, performance, design, browser support, FAQ, roadmap, release checklist, gallery, glossary |
| Skill | `leab-tui-p2p-studio`, mirrored to `~/Projects/opencode-skills/` and published |

## Evidence

```text
node --check script.js                 PASS
node --check peer-manager.js           PASS
node scripts/check.mjs                 PASS (292 checks)
?selftest=1                            SELFTEST PASS 38/38
node scripts/verify.mjs                ALL BROWSER CHECKS PASSED
node scripts/net-check.mjs             ALL 17 MULTIPLAYER CHECKS PASSED
full round                             roundEnd, 32 tiles, points sum 0
host + guest                           2 humans + Bot 1 + Bot 2
guest privacy                          own 8 real ids, other 24 ghost ids
lead/follow                            11 actions crossed the data channel, trick resolved
guest close                            seat 1 became a bot, score/hand preserved
console exceptions                     none on either page
```

## Decisions a next agent must not silently change

1. **Straight colour.** Every straight is one colour. See Hoo duplicates one core rank; Ngoh Hoo duplicates two; Lak Hoo is the small core with all three doubled. The source is ambiguous; this is documented.
2. **Strict comparison.** Equal rank + colour does not overtake. `beats` is `> 0`.
3. **Face-down is a real choice.** Never auto-reveal and never let an unrevealed set win.
4. **Serialization boundary.** `serializableState` is the only place that turns tiles into IDs. Snapshots and saves must be ID-based; undo maps back with `TILE_BY_ID`.
5. **Redaction boundary.** `sanitizeForSeat` is the only place private zones become ghost ids. `hiddenTags` never leaves the host. Do not send the same payload object to two guests.
6. **Four seats.** 32 tiles, four winds, eight each. Do not add two poker-style seats without changing the rules contract and the deal.
7. **Host authority.** Guests send intent; the host validates and broadcasts. Guests never call the engine or the AI.
8. **Seat generalisation.** `MY_SEAT` and `SEAT_PROFILES` replace hard-coded seat 0. `isBotSeat` is the only scheduler predicate.
9. **Ghost stability.** Tags are assigned at deal and restored by Undo; do not derive them from tile ids or array indexes.
10. **View rotation.** Rotate the table `world` group, not the camera.
11. **Canvas placement.** `#scene` lives inside `.stage-wrap`; an app-level canvas renders behind the sidebar.
12. **Audio unlock.** Do not create an `AudioContext` before the first user gesture.
13. **Launch prompt.** Normal loads always ask; a saved solo game appears as Resume match, never as a phantom deal.
14. **Leave room.** The host exit is destructive and must keep its confirmation; guests keep their seat as a bot.
15. **Chat** goes through the host, is escaped, capped at 200 chars and rate-limited; never render HTML chat.
16. **Voice** is full-mesh and independent of the data channel. Mic mute is `track.enabled`, deafen is `<audio>.muted`; never stop the track or route audio through the host.
17. **Portrait camera.** Mobile needs `(0,14.3,17.2)`, FOV 46 and a compact dock; otherwise the hand is hidden.

## If the build is resumed

1. Read `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/MULTIPLAYER.md` and `docs/PROTOCOL.md`.
2. Run `node scripts/check.mjs`, `node scripts/verify.mjs` and `node scripts/net-check.mjs`.
3. Open `?selftest=1` and confirm 38/38.
4. If changing rules, update `docs/RULES.md`, `detectCombo`, `allCombos`/`comboPower`, both dictionaries, the rules modal and the self-test together.
5. If changing the wire format, bump `PROTOCOL_VERSION`, update `docs/PROTOCOL.md`, `sanitizeForSeat`, `hydrateRemoteState`, `netSelfTest` and `scripts/net-check.mjs`.
6. If changing the save format, bump `APP.version`, update `docs/DATA_FORMAT.md`, add a migration or reject safely.

## Known unfinished work

- Host migration or reconnection tokens.
- A TURN relay for symmetric NAT. The Android Chrome failure is diagnosed and documented in issue [#1](https://github.com/somphol/leab-tui-3d/issues/1); not implemented.
- Turn timer / idle auto-play.
- TURN relay for voice and data.
- Push-to-talk, noise gate, per-peer volume.
- Chat moderation/reporting.
- Focus trap and focus restore in modals.
- Physical iOS/Android verification.
- Reduced-motion snap mode for Three.js.
- 2/3-player variants.
- Stronger AI / hidden-hand modelling.
- JSON import.
- PWA/offline cache.

## Token and time accounting

`state.json` and `STATE.md` record the session start/end, wall-clock duration, token counts, harness and model. The session record is in `~/.local/share/opencode/opencode.db` under `session_v2`.

## Publishing note

Pushes use the existing `osxkeychain` helper. The repository and the skill mirror are updated with one push each, not a loop of credential calls. No token is written to a file or printed.
