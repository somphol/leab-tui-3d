# Design

## Intent

The table should feel like a late-night back room in a Thai shophouse: dark mahogany, worn brass, lacquer red, a pool of warm light, and tiles you want to pick up. The interface is an academy studio, not a casino. Gold is a material, not a reward animation. The only bright green is the jade of a live, legal challenge.

## Palette

| Token | Value | Use |
| --- | --- | --- |
| `--bg` | `#120708` | page |
| `--bg-deep` | `#090304` | deepest gradient |
| `--felt` | `#341318` | table |
| `--panel` | `rgba(27,13,16,.82)` | glass panels |
| `--ink` | `#f6ead7` | primary text |
| `--ink-dim` | `#cbb9a2` | secondary |
| `--ink-faint` | `#9b8874` | meta |
| `--gold` | `#d8b26b` | headings, rules, inlay |
| `--gold-bright` | `#f0d49a` | titles, live values |
| `--jade` | `#79c3a3` | legal challenge |
| `--wine` | `#7b2434` | face-down / destructive |
| `--red` | `#d9564f` | red tiles |

Red and black tiles are distinguished by Hanzi and written colour, not by hue alone. The red tone is a lacquer, not a fire-engine red; the black is warm near-black (`#201a18`), not pure black.

## Type

- Display: `Iowan Old Style`, `Palatino Linotype`, `Noto Serif Thai`, `Thonburi`, Georgia, serif. It carries the title, panel headings, coach, modal headings and tile medallions.
- UI: `Avenir Next`, Avenir, `Sarabun`, `Noto Sans Thai`, `Thonburi`, system-ui. It carries buttons, meta, tables and long copy.
- Mono: `SFMono-Regular`, `Cascadia Mono`, Menlo. Used only for tiny counters and log times.
- No remote fonts. Thai falls back to Thonburi on macOS; the layout was checked with that fallback.

The title is 20–27 px serif, the brand eyebrow 11.5 px uppercase with 0.16em tracking. Body copy is 11.5–13.5 px; it is deliberately dense because the panel is an instrument, not an article.

## Layout

- 76 px top bar; a 1fr stage and a 386 px sidebar with 16 px gutters.
- The stage is a rounded 18 px card with a radial felt background, a vignette and a noise overlay. The 3D canvas is absolute inside it.
- The hand dock is a floating glass bar at the bottom of the stage: title, one line of advice, rank pips and actions. It is the primary interaction surface.
- The sidebar is a vertical stack of panels: coach, match, actions, inspector, hand, log. It scrolls independently.
- At 1180 px the sidebar narrows to 340 px and the dock stacks.
- At 960 px the layout becomes one column; the stage is 64vh; the sidebar follows.
- At 640 px the stage is `calc(100dvh - 86px)`; the dock loses the kicker and clamps the detail to one line; buttons stay on one scrollable row. The 3D camera moves back and widens to portrait FOV so the hand is not cropped.

## The tile

A tile is a 0.455-radius, 0.15-thick cylinder with:

- a cream radial-gradient face;
- a dark outer ring and a thin inner gold ring;
- a 48 %-height Hanzi in `Songti SC`/`STSong`, red `#8d1f24` or black `#1d1716`;
- a light offset under the glyph to read as carved;
- rank pips near the bottom;
- a brass bevel torus;
- a lacquered maroon back with a gold double ring and a coin motif.

The face is a `CanvasTexture`; the geometry, side material and bevel are shared. The tile is a `root → lift → tilt` hierarchy so hover, selection and flipping do not fight.

## Motion

- Deal: 17 ms stagger, 520 ms move with a 0.9 arc, face-down, then a 38 ms-staggered human flip.
- Play: 620 ms move with a 0.24 arc.
- Capture: 760 ms sweep with a 0.5 arc.
- Flip: 260–300 ms `easeInOutCubic`.
- Hover/selection lift: damped toward 0.19 units.
- Active seat ring: 0.18 ± 0.09 opacity pulse at ~460 ms.
- Turn chevron: 0.055-unit bob, slow rotation.
- Dust: one 220-point cloud, 0.00025 rad/frame rotation.

The animation is functional: it shows where a tile came from and who owns it. It is not decorative confetti.

## Surfaces

- Panels are `linear-gradient(160deg, rgba(38,18,23,.82), rgba(18,8,11,.9))` over a 1 px gold-alpha border, with a 1 px inner top highlight.
- The coach panel is slightly warmer and brighter; it is the one panel allowed to pull the eye.
- Buttons are pill-shaped. Gold is the primary action, jade is a legal challenge, wine is face-down/destructive, ghost is neutral.
- Badges are tiny uppercase pills with a 5 px status dot. The dot is jade for live, gold for the streak.
- Modals are a dark radial card with a gold-alpha border and a 22 px radius; they fade and rise 12 px on entry.

## Copy

- English is plain and specific: “Your Red Elephant beats Black Elephant. Reveal to capture 4 tiles, or play face-down to keep it.”
- Thai uses the traditional names first (ตี่ บิน ช้าง กือ เบ๊ เผ่า จุก) and the English/alternate in the inspector.
- The coach never says “good luck” or “nice move”; it names the rule and the consequence.
- The UI calls the game “Leab-Tui 3D” and the game “เลี๊ยบตุ่ย”; it does not translate the name into an English invention.

## What was rejected

- A green poker felt: the brief asked for dark mahogany; green would read as casino.
- Glowing neon: the gold/brass system is warmer and matches the wood.
- A flat 2D hand: the 3D tiles are the point; the DOM hand list exists for accessibility, not as the primary view.
- Auto-reveal: it would remove the bluff/conservation decision that defines the game.
- A points popup on every tile: the score is a pile table, not a per-tile score.

## Known visual limits

- The mobile table is cropped left/right; the human hand and centre are prioritised.
- The felt medallion (`帥`) is intentionally low contrast; it is a watermark, not a label.
- Thai serif metrics differ from Latin; the title is checked with Thonburi but not with every Thai font.
- The rules modal is long and scrolls; it is not paginated.
