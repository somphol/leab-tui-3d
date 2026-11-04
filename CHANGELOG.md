# Changelog

All notable changes to Leab-Tui 3D are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

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
