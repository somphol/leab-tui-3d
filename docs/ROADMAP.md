# Roadmap

## Deliberately out of scope

- Online multiplayer, accounts, leaderboards and server-side saves.
- Gambling, betting, chips or real-money play.
- A complete tournament rules authority. The source is a community description; the studio documents its interpretation.
- Two- and three-player variants.
- An engine-strength AI or a search over hidden information.
- Photo-real tile scanning or licensed Xiangqi artwork.

## Next candidates

| Priority | Item | Why |
| --- | --- | --- |
| P1 | **Focus trap and restore for modals** | The main accessibility gap; straightforward and high value |
| P1 | **Physical mobile testing** | Current verification is Chrome emulation only |
| P1 | **Reduced-motion “snap” mode** | Three.js animations still run under `prefers-reduced-motion` |
| P2 | **2- and 3-player variants** | Explicitly described in the source; needs deck trimming and scoring changes |
| P2 | **Stronger AI** | Track unseen tiles, estimate challenge probabilities, add a small determinized search |
| P2 | **Round-by-round scoreboard chart** | The history is stored but only the latest round is shown |
| P3 | **Import JSON** | Export exists; a validated import would complete the loop |
| P3 | **PWA/offline cache** | Would remove the CDN dependency and allow install |
| P3 | **Landscape phone layout** | Portrait is tuned; landscape currently crops |
| P3 | **Theme presets** | Green baize, black lacquer, paper; needs texture disposal |
| P4 | **Replay a round** | The log and history exist; a frame-by-frame replay is a large UI feature |
| P4 | **Thai voice pronunciation** | The Makruk project bundles Thai audio; this one is silent by design |

## Non-goals for 1.x

- Framework migration. The three-file constraint is the product.
- A build step or bundler.
- Remote fonts or analytics.
- Automatic reveal. The face-down decision is the game.

## How to propose a change

Open an issue with the rule or UX consequence, the affected files, and a verification plan. Rule changes must update `docs/RULES.md`, `detectCombo`, the self-test and the rules modal together.
