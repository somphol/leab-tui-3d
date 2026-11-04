# Project State — Leab-Tui 3D

**Leab-Tui 3D — Traditional Xiangqi Trick-Taking Studio**  
**เลี๊ยบตุ่ย 3 มิติ · สตูดิโอเกมกินกองด้วยหมากรุกจีน**

> Build record for release 1.1.0: what shipped, how it was verified, how long it took, and how many tokens it consumed.

## Status

| Field | Value |
| --- | --- |
| Project status | ✅ Complete, verified and published |
| App version | `1.1.0` |
| Repository | <https://github.com/somphol/leab-tui-3d> |
| Live page | <https://somphol.github.io/leab-tui-3d/> (Pages verified, self-test 25/25) |
| Primary branch | `main` |
| Build type | Static site; no package manager, no build step |
| Source files | `index.html`, `style.css`, `script.js` |
| Source lines | 4,927 |
| Source size | 218,918 bytes (~214 KB) |
| Runtime dependency | Three.js r160 from jsDelivr (pinned) |
| Storage | `localStorage` + JSON export |
| Licence | MIT |

## Release 1.1.0 — display settings

Added a **Display** panel (`Aa` in the stage toolbar) with four interface text sizes — Small (0.9×), Default (1×), Large (1.12×), Extra large (1.24×) — and three themes:

- **Mahogany** — the original burgundy felt, brass and lacquer red.
- **Jade Court** — deep green felt, cool brass and a jade glow.
- **Midnight Lacquer** — blue-black felt, silver inlay and a cold table light.

Audio was also rebalanced: master 0.8, a dynamics compressor, higher per-effect gains, an analyser tap for verification, and a first-gesture `resume()` retry. Themes recolour both the CSS panels and the 3D scene: felt, wood, rim, brass/silver inlay, floor, key/rim/warm lights, point lights and tile side/edge/back. Old procedural textures are disposed on switch. Text size scales the interface only, by design; the 3D table stays fixed. Both preferences persist in `localStorage` and are covered by the browser verification.

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
| **1.1.0 display + audio update** | 08:02–08:31 | 29m 0s |

**Measured active build duration:** **1h 36m 40s** (5,800 s) = 1h 7m 40s initial build + 29m 0s display/audio update. Session wall clock is longer because it includes an overnight idle gap; the source freeze for 1.0.0 was 01:24:23 and the 1.1.0 update completed at 08:31:38.

## Token consumption

Measured from the OpenCode session record `ses_e5a5e419dffedJGEsMy3mKV3ey` at 2026-11-04 08:31:38 (-08:00), including the 1.1.0 display/audio update:

| Metric | Tokens |
| --- | ---: |
| Input | 433,865 |
| Output | 180,500 |
| Reasoning | 128,924 |
| **Total (input + output + reasoning)** | **743,289** |
| Cache read | 56,907,776 |
| Cache write | 1,639 |
| **Total including cache** | **57,652,704** |
| Cost | $0.00 (as reported) |

The cache figures describe context reuse, not additional generated work. They are reported separately so the headline number stays comparable to a normal token count. These are session totals. The final state-file commit and Pages rebuild add a small number of tokens; the session ID allows re-measurement from `opencode.db`.

## What shipped

- **Rules engine** — 32-tile deck, nine combination types, strict comparison, red-beats-black tie-break, earlier-play tie, 8-pile Chuan scoring.
- **Four-seat game** — human South plus three heuristic AI seats; dealing, leading, face-down submission, optional reveal, trick capture, next leader, round and match end.
- **3D table** — 32 bevelled cylindrical tiles with procedural Hanzi faces and lacquered backs, mahogany felt table, soft shadows, seat rings, floating labels, dust, dealing/flip/capture animations, OrbitControls, reset/top/cinematic cameras, portrait framing.
- **Learning tools** — tile inspector (Thai/English/rank/copies), live bilingual coach, deterministic Hint, Undo & Learn comparison, full rules drawer.
- **Bilingual UI** — EN ⇄ TH across 232 dictionary keys, dynamic coach/log/summary strings, tile names, ARIA labels and 3D score labels.
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
| Display settings | XL applies 1.24×; Jade theme reaches UI + 3D scene; prefs survive reload; 4 sizes + 3 themes exposed |
| Audio | context running after a trusted gesture; clack peak ≈ 0.11 RMS; no autoplay warning |
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

- Three dark themes only; no light or high-contrast theme yet.
- Text size scales the interface, not the 3D table (intentional).
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
