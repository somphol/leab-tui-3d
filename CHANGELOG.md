# Changelog

All notable changes to Leab-Tui 3D are documented here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/).

## [1.1.0] — 2026-11-04

### Added

- **Display settings panel** (`Aa` in the stage toolbar) with four interface text sizes: Small, Default, Large and Extra large.
- **Three themes**: Mahogany (default), Jade Court and Midnight Lacquer.
- Theme switching recolours the UI panels, felt, wood, brass/silver inlay, table rim, floor and lighting; old procedural textures are disposed.
- Display preferences persist in `localStorage` alongside language, sound and coach settings.
- A `Reset display` action and browser verification for the 1.24× XL scale, theme propagation to the 3D scene, persistence and the four-size/three-theme controls.
- 24 new bilingual keys (235 per language), a **Test sound** action and updated release documentation.

### Fixed

- **Audio audibility.** The master gain was raised from 0.32 to 0.8, a dynamics compressor was added, and per-effect levels were raised. The old graph produced ~0.009 RMS on the clack, which was effectively inaudible on laptop speakers; the new graph measures ~0.04–0.11 RMS peak. The analyser tap is used by `verify.mjs`.
- **First-gesture audio.** If the context is still suspended when the first sound is requested, `play()` now calls `resume()` and retries after the promise resolves, covering the resume race.
- **Mobile header at XL.** The About icon moves to the sidebar footer on phones, the HUD is bounded before the stage tools, and the action buttons wrap so nothing is clipped at 1.24× text.

### Changed

- Version bumped to `1.1.0`; save/export version follows.
- Screenshots now include the Display panel and both alternate themes.

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
