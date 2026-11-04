# Code map

`script.js` is one module, but it is organised in numeric sections. Use this map to jump.

| Section | Approx. lines | Key symbols |
| --- | --- | --- |
| Header + `APP` | 1–40 | version, storage keys, export name, build record |
| 1. Tile data | 40–120 | `COLORS`, `RANKS`, `SEATS`, `TABLE_Y`, `HAND_RADIUS`, `CORE_BIG`, `CORE_SMALL` |
| 2. Utilities | 120–190 | `shuffle`, `mulberry32`, `clone`, `escapeHTML` |
| 3. I18N | 190–760 | `I18N.en`, `I18N.th`, `t`, `tileName`, `comboSummary` |
| 4. Rules | 760–930 | `buildDeck`, `detectCombo`, `compareScores`, `beats`, `allCombos`, `scorePiles` |
| 5. AI | 930–1040 | `chooseLead`, `chooseFollow`, `recommendedFollow`, `comboPower` |
| 6. State | 1040–1210 | `makeState`, `serializableState`, `saveMatch`, `loadMatch`, `loadPrefs`, `loadStats` |
| 7. Flow | 1210–1570 | `beginMatch`, `dealRound`, `beginTrick`, `leadTrick`, `submitPlay`, `resolveTrick`, `endRound`, `undoLastTrick`, `aiLead`, `aiFollow` |
| 8. Human + coach | 1570–1780 | `humanLead`, `humanFollow`, `toggleTile`, `applyHint`, `coachMessage`, `coachMeta` |
| 9. Toasts + summaries | 1780–1890 | `toast`, `showRoundSummary`, `buildUndoExplanation` |
| 10. Rendering | 1890–2130 | `renderAll`, `renderHUD`, `renderScoreboard`, `renderHandList`, `renderSelection`, `renderInspector`, `renderLog`, `renderRules`, `renderAbout` |
| 11. Language/chrome | 2130–2200 | `applyLanguage`, `setSound`, `setLanguage` |
| 12. Persistence/export | 2200–2280 | `buildExport`, `exportGame` |
| 13. Self-test | 2280–2440 | `selfTest`, `simulateRound` |
| 14. Audio | 2440–2600 | `StudioAudio` |
| 15. Scene | 2600–3350 | `createCanvasTexture`, `makeFeltTexture`, `makeWoodTexture`, `makeTileFaceTexture`, `makeTileBackTexture`, `handPosition`, `centerPosition`, `capturePosition`, `createScene` |
| 16. Boot + events | 3350–3456 | `bindEvents`, `boot`, `window.LeabTui` |

## Entry points

- **Browser boot:** `boot()` at the bottom, called on `DOMContentLoaded` or immediately if the document is ready.
- **Test surface:** `window.LeabTui` exposes state and actions; see `AGENTS.md` §3.
- **Self-test:** `?selftest=1` → `selfTest()` at the end of `boot`.
- **Screenshot state:** `?demo=1` → selects the best lead with `chooseLead` and plays it after dealing.
- **Seeded shuffle:** `?seed=123`.

## Where to change what

| Change | Touch |
| --- | --- |
| Add a combination | `detectCombo`, `allCombos`, `comboPower`, `comboSummary`, `COMBO_TYPES`, `COMBO_COUNT`, both `I18N` dictionaries, rules modal, `docs/RULES.md`, self-test |
| Change AI | `chooseLead`, `chooseFollow`, `recommendedFollow`, `tileKeepValue` |
| Change table/camera | `createScene`, `handPosition`, `centerPosition`, `capturePosition`, `homePosition`/`homeTarget`, `style.css` responsive rules |
| Change UI copy | `I18N.en`/`I18N.th`; static `data-i18n` attributes in `index.html` |
| Change scoring | `scorePiles`, `endRound`, `showRoundSummary`, `docs/RULES.md` |
| Change save format | `serializableState`, `loadMatch`, `buildExport`, `docs/DATA_FORMAT.md`, `APP.format`/`version` |
| Change visuals | `:root` tokens in `style.css`, felt/wood/tile texture functions |

## Invariants

- `detectCombo` is the only legality authority.
- `beats` is strict and type-gated.
- `serializableState` is the only object→ID boundary.
- The scene never decides a winner.
- `renderAll` must be safe to call at any time, including with `state === null` during boot.
- `audio.play` must be a no-op until `audio.unlocked`.
