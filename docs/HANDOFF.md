# Handoff — session of 2026-11-04

## Outcome

Release 1.0.0 of Leab-Tui 3D is built, verified and published.

- Repository: <https://github.com/somphol/leab-tui-3d>
- Live: <https://somphol.github.io/leab-tui-3d/>
- Local master: `~/Projects/leab-tui-3d`
- Session: `ses_e5a5e419dffedJGEsMy3mKV3ey` (OpenCode 2.2.5, DeepSeek V4.1 Flash)

## What is in the box

| Area | State |
| --- | --- |
| Rules engine | Complete for the four-player game: 9 combination types, strict comparison, Chuan scoring |
| AI | Heuristic lead/follow with conservation and challenge probability |
| 3D | 32 carved tiles, mahogany table, OrbitControls, deal/flip/capture animations, portrait framing |
| UI | Bilingual EN/TH, coach, inspector, hint, undo comparison, rules, summaries, toasts |
| Audio | Synthesised shuffle/clack/flip/sweep/win/lose, gesture-unlocked |
| Persistence | Autosave, resume, stats, versioned JSON export |
| Verification | 25/25 self-test, static check, CDP harness, full-round/undo/next-round/reload evidence |
| Release docs | README, AGENTS, STATE, rules, architecture, tests, deployment, reproduction, data format, controls, accessibility, performance, design, browser support, FAQ, roadmap, release checklist, gallery, glossary |
| Skill | `leab-tui-studio`, mirrored to `~/Projects/opencode-skills/` and published |

## Evidence

```text
node --check script.js                 PASS
node scripts/check.mjs                 PASS
?selftest=1                            SELFTEST PASS 25/25
full round                             roundEnd, 6 tricks, 32 tiles, points sum 0
undo                                   pre-trick restored, 32 tiles, stats reverted
next round                             round 2, 8 tiles each, scores preserved
reload                                 phase follow, turn 0, hands [8,7,7,7], centre 3
console exceptions                     none
```

## Decisions a next agent must not silently change

1. **Straight colour.** Every straight is one colour. See Hoo duplicates one core rank; Ngoh Hoo duplicates two; Lak Hoo is the small core with all three doubled. The source is ambiguous; this is documented.
2. **Strict comparison.** Equal rank + colour does not overtake. `beats` is `> 0`.
3. **Face-down is a real choice.** Never auto-reveal and never let an unrevealed set win.
4. **Serialization boundary.** `serializableState` is the only place that turns tiles into IDs. Snapshots and saves must be ID-based; undo maps back with `TILE_BY_ID`.
5. **Canvas placement.** `#scene` lives inside `.stage-wrap`; an app-level canvas renders behind the sidebar.
6. **Audio unlock.** Do not create an `AudioContext` before the first user gesture.
7. **Portrait camera.** Mobile needs `(0,14.3,17.2)`, FOV 46 and a compact dock; otherwise the hand is hidden.

## If the build is resumed

1. Read `AGENTS.md` and `docs/ARCHITECTURE.md`.
2. Run `node scripts/check.mjs` and `node scripts/verify.mjs`.
3. Open `?selftest=1` and confirm 25/25.
4. If changing rules, update `docs/RULES.md`, `detectCombo`, `allCombos`/`comboPower`, both dictionaries, the rules modal and the self-test together.
5. If changing the save format, bump `APP.version`, update `docs/DATA_FORMAT.md`, add a migration or reject safely.

## Known unfinished work

- Focus trap and focus restore in modals.
- Physical iOS/Android verification.
- Reduced-motion snap mode for Three.js.
- 2/3-player variants.
- Stronger AI / hidden-hand modelling.
- JSON import.
- PWA/offline cache.

## Token and time accounting

The snapshot at the documentation checkpoint is in `state.json` and `STATE.md`. The final numbers, including the release/publish turns, are written at the end of the session. The session record is in `~/.local/share/opencode/opencode.db` under `session_v2`.

## Publishing note

The repository was created through the GitHub API using the existing credential retrieved once from `git credential fill`. No token was written to a file or printed. Pushes use the existing `osxkeychain` helper, so the Keychain prompt is not repeated per command.
