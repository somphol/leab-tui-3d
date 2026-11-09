# Controls

## Mouse

| Input | Action |
| --- | --- |
| Left-drag on the table | Orbit |
| Right-drag | Pan |
| Scroll | Zoom |
| Click a face-up tile in your hand | Select / deselect |
| Click a tile in the centre, a capture or a face-down tile | Inspect it |
| Click a chip in **Your hand** | Select / deselect |
| Hover a tile | Lift + inspect |
| `H` | Hint |
| `Esc` | Clear selection (or close the open modal) |
| `?` button | Rules |
| `i` button | About / credits |
| Camera buttons (top-right) | Reset view · 2D view · cinematic orbit |
| Reseat the table (touch/tablet) | Bottom-right **reset board** button: local seat, 2D, refit |
| 2D view | Drag the table to pan, pinch/scroll to zoom; rotation is locked |
| 3D view | Drag to orbit, scroll/pinch to zoom, right-drag/two-finger to pan |
| **Aa** (stage toolbar) | Display settings: text size and theme |
| **Ranks** (top-left HUD) | Show/hide the pictorial rank-order reference |
| **Invite** (top bar and Actions) | Solo only: turn the current table into a hosted room, show the code/PIN, copy or share the invite |
| **Panel rail** (touch/tablet, right edge) | **C** coach · **M** match · **A** actions · **💬** chat · **i** tile inspector · **H** your hand · **L** trick log |
| **H** (collapsed hand dock) | Reopen the hand dock. The keyboard shortcut `H` is Hint. |
| **Multiplayer** (Actions) | Open the lobby: solo / host / join; set your name here |
| **Leave room** (Actions) | Confirmed exit from a network room; hidden in solo |
| **Table chat** | Collapsible room chat; type and press Enter |
| **Join voice** | Request the microphone and join the voice mesh |
| **Mute mic** | Stop transmitting your mic; the call stays connected |
| **Mute others** | Deafen every remote voice stream locally |
| **Leave voice** | Stop tracks and leave the voice mesh |
| Room chip (header) | Copy the invite link while in a room |

The camera is damped; release the mouse and it glides to a stop. Pan is clamped so the table cannot be lost off-screen.

## Touch

| Input | Action |
| --- | --- |
| One-finger drag on the table | Orbit |
| Two-finger pinch | Zoom |
| Two-finger drag | Pan |
| Tap a tile | Select it (human hand) or inspect it |
| Tap a chip | Select / deselect |

The mobile layout puts the table in the top ~90 % of the viewport and the panels below. The hand dock is deliberately compact: title, one line of advice and the action buttons. On narrow screens, the button row scrolls horizontally rather than covering the hand. The lobby switches to one mode card per row and a single-column roster.

## Keyboard

The app is usable without a mouse for the main flow:

- `Tab` / `Shift+Tab` move through the header, action buttons, hand chips, chat and modals.
- Enter sends a chat message; Enter in the name/code fields starts hosting or joining.
- `Enter` / `Space` activate buttons and hand chips.
- `H` hints.
- `Esc` clears the selection; if a modal is open, it closes the modal (except the round summary, which requires a choice).
- The hand list is the accessible equivalent of clicking the 3D tiles.

## Turn vocabulary

| Label | Meaning |
| --- | --- |
| **Lead** | You are the leader. Choose a legal set and press Lead. |
| **Reveal & challenge** | Your selected set matches the call and beats the table. It will be face-up and can win. |
| **Play face-down** | Send the required number of tiles without revealing them. They cannot win. |
| **Hint** | Select a deterministic recommendation. It does not play the tiles. |
| **Undo trick** | Rewind the last completed trick and explain the comparison. |

## Rank order

Press **Ranks** at the top-left HUD to open the pictorial hierarchy. Each card shows the red and black Hanzi, the Thai and English names, and its rank number (7 down to 1). The note repeats the tie rules. Click **Ranks** again, the `×`, press `Esc`, or click outside to hide it.

## Display settings

Press **Aa** in the stage toolbar to open the Display panel.

- **Text size** — Small (0.9×), Default (1×), Large (1.12×), Extra large (1.24×). The whole interface scales; the 3D table does not.
- **Theme** — Mahogany, Jade Court, Midnight Lacquer, Parchment and Daybreak. Both the panels and the 3D felt/wood/light palette change; Parchment and Daybreak are bright.
- **Test sound** plays a wooden clack so you can confirm the audio path.
- **Reset display** returns to Default + Mahogany.
- The choices persist in `localStorage` and are restored on reload.

## Camera presets

- **Reset (⤾)** — return to the desktop/portrait home view.
- **Top (⌖)** — near-overhead view of the whole table; press again to return.
- **Cinema (◉)** — slow automatic orbit. Dragging or pressing reset stops it.

## Troubleshooting

- **No table:** check the browser console for a Three.js CDN or WebGL 2 error. The coach and rules still work.
- **No sound:** click once anywhere in the page (browsers require a gesture), confirm the speaker icon is on, and check the device/tab volume. The sounds are synthesised; the analyser in `verify.mjs` measures a real signal.
- **Hand hidden on phone:** rotate to landscape or use the hand chips in the sidebar; the 3D hand is framed for 390×844 portrait.
- **Tile not selectable:** it is not your turn, it is not in your hand, or the round is over.
