# Data format

There are two JSON files with different jobs:

| File | Job |
| --- | --- |
| `localStorage["leabtui.match.v1"]` | live match autosave |
| `leab_tui_3d_game.json` | user-exported game record |
| `state.json` (repository root) | build metadata, not read by the app |

## Autosave

```json
{
  "format": "leab-tui-3d-save",
  "version": "1.9.11",
  "savedAt": "2026-11-06T10:00:00.000Z",
  "network": false,
  "game": { "...": "see Game" }
}
```

Key: `leabtui.match.v1`. Preferences live at `leabtui.prefs.v1`, statistics at `leabtui.stats.v1`. The three are independent so a new match does not wipe language, sound, display or lifetime stats.

Preferences shape:

```json
{
  "lang": "en",
  "sound": true,
  "coach": true,
  "cinema": false,
  "tileList": true,
  "theme": "daybreak",
  "fontSize": "md",
  "autoAudio": true
}
```

`theme` is `mahogany`, `jade`, `midnight`, `parchment` or `daybreak`; `fontSize` is `sm`, `md`, `lg` or `xl`. Invalid values fall back to `daybreak` and `md`. The display fields were added in 1.1.0; 1.4.0 adds the `network` flag and 1.7.1 adds `autoAudio` (default `true`). Neither changes the core game schema.

The autosave is written after every action, on `visibilitychange` when hidden, and on `beforeunload`. `network: true` marks a hosted room; `loadMatch` rejects it because a WebRTC room cannot be restored after a reload. A guest never writes the autosave.

`hiddenTags` (the host-only tile→ghost map) and `snapshot` (the undo record) are stripped by `serializableState` and never appear in an autosave or export.
## Export

```json
{
  "format": "leab-tui-3d-save",
  "version": "1.9.11",
  "exportedAt": "2026-11-04T01:10:00.000Z",
  "app": {
    "name": "Leab-Tui 3D — Traditional Xiangqi Trick-Taking Studio",
    "version": "1.9.11",
    "repository": "https://github.com/somphol/leab-tui-3d",
    "live": "https://somphol.github.io/leab-tui-3d/",
    "license": "MIT"
  },
  "credits": {
    "harness": "OpenCode 2.2.5",
    "model": "DeepSeek V4.1 Flash (opencode-go/deepseek-v4.1-flash)",
    "sessionId": "ses_...",
    "buildDuration": "…",
    "tokensTotal": "…"
  },
  "stats": { "...": "lifetime statistics" },
  "game": { "...": "see Game" }
}
```

Filename: `leab_tui_3d_game.json`. MIME type: `application/json`. The download is created with a `Blob` and a temporary object URL; nothing is uploaded.

A guest's export is intentionally partial: it contains that guest's own hand and public information, with other hands as `ghost-<seat>-<index>` ids. Export from the host for a complete record.
## Game

```json
{
  "phase": "lead",
  "draftMode": false,
  "draftPool": null,
  "draftOrder": null,
  "draftCycle": 0,
  "draftIndex": 0,
  "draftSeat": null,
  "round": 1,
  "trick": 3,
  "dealer": 3,
  "leader": 0,
  "turn": 0,
  "hands": [["r-general-0", "..."], ["..."], ["..."], ["..."]],
  "captures": [["..."], [], [], []],
  "center": [
    {
      "seat": 1,
      "revealed": true,
      "tiles": ["b-elephant-0", "b-elephant-1"],
      "combo": { "...": "Combo" }
    }
  ],
  "lead": { "seat": 1, "combo": { "...": "Combo" } },
  "best": { "seat": 1, "combo": { "...": "Combo" } },
  "selected": ["r-elephant-0"],
  "scores": [2, -2, 2, -2],
  "roundPoints": [0, 0, 0, 0],
  "target": 20,
  "history": [
    { "round": 1, "points": [2, -2, 2, -2], "scores": [2, -2, 2, -2], "piles": [4, 0, 4, 0], "chuan": false }
  ],
  "log": [
    { "kind": "lead", "trick": 3, "seat": 1, "combo": { "...": "Combo" } }
  ],
  "lastTrick": null,
  "lastRound": null,
  "winner": null,
  "startedAt": 1793781214924,
  "handCounts": [8, 6, 8, 8],
  "seed": 626512933,
  "language": "en"
}
```

### Phases

`dealing` · `lead` · `follow` · `resolving` · `roundEnd` · `matchEnd`

Only `lead`, `follow`, `roundEnd` and `matchEnd` are accepted on reload. A `dealing` save is treated as stale and starts a new match.
### Combo

```json
{
  "type": "seehoo",
  "count": 4,
  "tiles": ["r-general-0", "r-advisor-0", "r-advisor-1", "r-elephant-0"],
  "score": [6, 1],
  "color": "r",
  "set": "big",
  "dup": [6],
  "key": "seehoo:6,1:r-advisor-0|r-advisor-1|r-elephant-0|r-general-0"
}
```

- `type` is one of `single`, `pair`, `triple`, `quad`, `quint`, `sahoo`, `seehoo`, `ngohoo`, `lakhoo`.
- `score` is the lexicographic comparison key. It contains 2 elements for single/pair/Soldier sets and Sa Hoo, 2 for See Hoo (rank, colour), 3 for Ngoh Hoo (pair, pair, colour), and 2 for Lak Hoo (`0`, colour).
- `set` is `big`, `small` or `null`.
- `dup` is the sorted list of doubled core ranks (empty unless See/Ngoh/Lak Hoo).
- `tiles` are IDs; in the live engine they are tile objects.

### Tiles

A live tile is:

```json
{ "id": "r-advisor-0", "rank": "advisor", "power": 6, "color": "r", "hanzi": "仕" }
```

IDs are `${color}-${rank}-${copy}`, for example `b-soldier-4`. They are stable for the lifetime of the deck and are the only tile representation allowed in saves and exports.
### Stats

```json
{
  "matches": 0,
  "wins": 0,
  "losses": 0,
  "draws": 0,
  "rounds": 0,
  "bestStreak": 0,
  "currentStreak": 0,
  "history": [
    { "at": "2026-11-04T01:...", "round": 1, "points": [-1,-2,1,2], "scores": [-1,-2,1,2], "piles": [1,0,3,4], "human": -1 }
  ],
  "lastPlayed": "2026-11-04T01:..."
}
```

History is capped at 40 entries. A match counts only when a score reaches the target.
## Validation on load

`loadMatch` requires:

1. `format === "leab-tui-3d-save"`.
2. `game.hands` is an array of four arrays, each length ≤ 8.
3. Every tile ID exists in the deck.
4. `game.scores` is an array of four numbers.
5. `game.phase` is `lead`, `follow`, `roundEnd`, `matchEnd` or, for the experimental draft, `draft`.

It then rebuilds tile objects, recomputes centre combos with `detectCombo`, rebuilds `lead`/`best` from the saved seats, clears `selected`, and reopens the summary for `roundEnd`/`matchEnd`. A failure returns `false` and the app deals a new match.

Undo snapshots are **not** persisted. A reload can resume the live game but cannot undo the trick before the reload.

### Draft fields

`draftMode` is the host's experimental draft setting for the current match. While
`phase` is `draft`, `draftPool` holds the remaining tile ids, `draftOrder` lists
the four seats in pick order, `draftCycle` (0–3) and `draftIndex` (0–3) locate the
pick, and `draftSeat` is the seat picking now (equal to `turn`). Outside a draft `draftPool`,
`draftOrder` and `draftSeat` are `null`; the two counters keep their last values
but are ignored. `draftPool` is public; hands are still redacted per seat on
the wire. See [DRAFT.md](DRAFT.md).

## Versioning

`APP.version` is written into every save and export. A breaking format change should bump `APP.version` and add a migration or reject older payloads. There is no migration code as of 1.9.11; the loader is strict and falls back to a new match. New preference fields are additive and validated on load.
