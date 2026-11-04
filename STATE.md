# Project State — Leab-Tui 3D

**Leab-Tui 3D — Traditional Xiangqi Trick-Taking Studio**  
**เลี๊ยบตุ่ย 3 มิติ · สตูดิโอเกมกินกองด้วยหมากรุกจีน**

> Build record for release 1.0.0: what shipped, how it was verified, how long it took, and how many tokens it consumed.

## Status

| Field | Value |
| --- | --- |
| Project status | ✅ Complete, verified and published |
| App version | `1.0.0` |
| Repository | <https://github.com/somphol/leab-tui-3d> |
| Live page | <https://somphol.github.io/leab-tui-3d/> (Pages verified, self-test 25/25) |
| Primary branch | `main` |
| Build type | Static site; no package manager, no build step |
| Source files | `index.html`, `style.css`, `script.js` |
| Source lines | 4,443 |
| Source size | 196,076 bytes (~191 KB) |
| Runtime dependency | Three.js r160 from jsDelivr (pinned) |
| Storage | `localStorage` + JSON export |
| Licence | MIT |

## Build timeline

| Milestone | Time (local) | Elapsed |
| --- | --- | --- |
| Session opened | 2026-11-04 00:16:43 | 0m |
| Rules research and interpretation | 00:16–00:24 | ~8m |
| Rules engine, AI, state, UI, 3D scene written | 00:24–00:40 | ~16m |
| First headless run; canvas, render and audio fixes | 00:40–00:50 | ~10m |
| Full round, undo, next-round and reload tests | 00:50–00:58 | ~8m |
| Screenshots (EN, TH, rules, mobile) | 00:58–01:03 | ~5m |
| Documentation, release files, state record | 01:03–01:15 | ~12m |
| GitHub publication, Pages and skill catalog | 01:15–01:21 | ~6m |

**Measured build duration:** **1h 7m 40s** (4,060 s), handoff snapshot at 2026-11-04 01:24:23 -08:00. The final state commit and Pages rebuild add a small amount.

## Token consumption

Measured from the OpenCode session record `ses_e5a5e419dffedJGEsMy3mKV3ey` at 2026-11-04 01:24:23 (-08:00), after the project and skill were published:

| Metric | Tokens |
| --- | ---: |
| Input | 322,458 |
| Output | 142,357 |
| Reasoning | 86,810 |
| **Total (input + output + reasoning)** | **551,625** |
| Cache read | 31,036,288 |
| Cache write | 1,639 |
| **Total including cache** | **31,589,552** |
| Cost | $0.00 (as reported) |

The cache figures describe context reuse, not additional generated work. They are reported separately so the headline number stays comparable to a normal token count. These are handoff figures. The final state-file commit and Pages rebuild add a small number of tokens; the session ID allows re-measurement from `opencode.db`.

## What shipped

- **Rules engine** — 32-tile deck, nine combination types, strict comparison, red-beats-black tie-break, earlier-play tie, 8-pile Chuan scoring.
- **Four-seat game** — human South plus three heuristic AI seats; dealing, leading, face-down submission, optional reveal, trick capture, next leader, round and match end.
- **3D table** — 32 bevelled cylindrical tiles with procedural Hanzi faces and lacquered backs, mahogany felt table, soft shadows, seat rings, floating labels, dust, dealing/flip/capture animations, OrbitControls, reset/top/cinematic cameras, portrait framing.
- **Learning tools** — tile inspector (Thai/English/rank/copies), live bilingual coach, deterministic Hint, Undo & Learn comparison, full rules drawer.
- **Bilingual UI** — EN ⇄ TH across 211 dictionary keys, dynamic coach/log/summary strings, tile names, ARIA labels and 3D score labels.
- **Audio** — synthesised shuffle, clack, flip, sweep, win, lose, undo; unlocked on first gesture; no files.
- **Persistence** — autosaved match, preferences and statistics; reload-resume; versioned JSON export with app, credits, stats and game.
- **Verification** — 25-check in-page suite, dependency-free static check, Chrome CDP harness, full-round/undo/next-round/reload tests, four release screenshots.
- **Release** — README, AGENTS handoff, rules, architecture, testing, deployment, reproduction, data format, controls, accessibility, performance, design, FAQ, roadmap, release checklist, gallery, glossary, browser support, licence, changelog, contribution/security/privacy/support docs, citation, notices, GitHub templates and a static-check workflow.

## Verification snapshot

| Test | Result |
| --- | --- |
| `node --check script.js` | pass |
| `node scripts/check.mjs` | pass |
| In-page self-test | **25/25** |
| Full round through the public API | `roundEnd`, 6 tricks, 32 tiles captured, hands empty, points `[-1,-2,1,2]` sum 0 |
| Undo at round end | pre-trick position restored, 32 tiles accounted for, stats reverted |
| Next round | round 2, eight tiles each, scores preserved |
| Reload mid-trick | phase `follow`, turn 0, hands `[8,7,7,7]`, centre 3, lead/best restored |
| Console exceptions | none during boot, self-test or full round |
| Screenshots | 1440×900 EN, 1440×900 TH, 1440×900 rules, 390×844 mobile |

The detailed evidence is in [docs/TESTING.md](docs/TESTING.md).

## Credits

| Role | Credit |
| --- | --- |
| Design, implementation, verification, documentation | **OpenCode 2.2.5** with **DeepSeek V4.1 Flash** (`opencode-go/deepseek-v4.1-flash`) |
| Rules reference | Navee Angsuputiphant, “กฏกติกาการเล่น เลี๊ยบตุ่ย” (2016) |
| 3D engine | Three.js r160, MIT |
| Xiangqi tile names | Thai Wikipedia, หมากรุกจีน |
| Type | System fonts only (Iowan Old Style / Palatino / Thonburi / Sarabun fallbacks) |

## Known issues

- Four-player only; the two- and three-player variants are not implemented.
- The source is ambiguous about Ngoh Hoo and the Lak Hoo colour rule; the interpretation is documented in [docs/RULES.md](docs/RULES.md).
- Undo is a one-trick rewind and is not restored after a reload.
- The AI is heuristic; it is not a search engine and does not model hidden hands.
- Mobile is verified under Chrome device emulation at 390×844, not on physical hardware.
- Three.js is loaded from a CDN; the table cannot render without network access.

## Continuity

- Local master: `~/Projects/leab-tui-3d`
- Live: <https://somphol.github.io/leab-tui-3d/>
- Skill: `leab-tui-studio` (local `~/.config/opencode/skills/`, public mirror `~/Projects/opencode-skills/`)
- Full agent handoff: [AGENTS.md](AGENTS.md)
- Reproduction guide: [docs/REPRODUCTION.md](docs/REPRODUCTION.md)
