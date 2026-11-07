# Table arrangement and interaction mechanics

This document describes how a player's tiles move between the hand, the private
arrangement area and the centre of the table. It is the design record for the
drag, zone, reveal and captured-pile behaviour added in 1.8.x–1.9.x.

The goal is direct manipulation: a player should be able to arrange a hand, play
a tile, reveal a set and inspect a captured pile without hunting for a button,
while the table still makes it obvious which tiles are private and which are in
play.

## 1. Table zones

The felt is 6.62 units in radius. Two zones are drawn on it:

| Zone | Radius | Purpose |
| --- | --- | --- |
| Battle ring | 2.72–2.82 (play target < 2.8) | Tiles committed to the current turn |
| Private arc | 2.92–4.88, ±0.98 rad around the player's seat | Arranging hand tiles |

- The private arc is a faint gold band, raised a few millimetres above the felt.
  It follows the player's seat because it is a child of the rotated `world`
  group.
- The battle ring is a thin gold circle at the centre.
- A drop inside the battle ring is a **play** attempt.
- A drop outside the private arc (another seat, the gap, or the centre when the
  play is invalid) **snaps back** and shows “Keep your tiles inside your own
  area.”
- The only exception is a valid play drop in the battle ring. The centre is not
  an arrangement area.

## 2. Hand arrangement

- `handLayout` is a scene-local `Map<tileId, {x, z, angle}>` for the local seat.
- The first drag snapshots every tile in the hand at its current arc position,
  so playing one tile does not re-flow the rest of the arrangement.
- A new deal clears the map. **Tidy hand** clears it immediately and restores
  the default arc.
- Arrangement is local UI state. It is not saved in the match or the export.
- The arrangement is relayed to the other seats as **positions only**, never
  tile identities (see §6).

## 3. Drag to play

Dragging a face-up hand tile into the battle ring is the fast path.

- The candidate set is the current selection if the dragged tile is part of it;
  otherwise the dragged tile replaces the selection. A stale selection from a
  different tile is never used.
- **Follow turn:** each tile dropped into the ring is staged. The dock shows
  `n/N selected`. When the count reaches the called count, the set is sent
  face-down automatically. Fewer than N waits for another tile; more than N is
  rejected.
- **Lead turn:** each drop stages the tile. Press **Lead** to confirm the set,
  because the leader chooses the shape (a pair is not a half-built straight).
  The Lead button is enabled only for a legal combination.
- A drop in the ring while it is not the player's turn, or with an illegal
  lead, snaps back.
- Staged tiles snap back into the hand but keep their selection ring; the dock
  and the scene ring show what is staged.
- The dock buttons remain available for keyboard, accessibility and touch
  users; drag is an accelerator, not the only path.

## 4. Showdown and reveal

The turn order follows the source:

1. The leader and every follower send the called count **face-down**.
2. Once all four have sent, the leader is prompted first and must show.
3. Each following seat, in order, chooses **Show set** or **Keep hidden**.

- Showing is allowed for any **legal set of the called type**, even if it loses
  to the current best. A losing show is revealed, does not become the best, and
  is captured face-up.
- The leader's first show sets the mark. Only a set that beats the mark becomes
  the new best.
- There is no auto-reveal and no auto-skip. A human always gets the choice; a
  bot reveals when it can beat the mark.
- **Double-click** (or double-tap) a player's own tile in the centre during
  showdown is a shortcut for **Show set**.
- A local reveal opens a result panel with the set, whether it beats the mark
  and the reason, plus a full-width **Continue** button. The showdown state is
  not mutated and the trick is not swept until Continue (or ×) is pressed.
- The final winner takes all `4 × N` tiles; only then are they added to the
  winner's pile.

## 5. Captured piles

- One trick produces **one pile**, not one pile per four tiles. A pair trick
  (8 tiles) is a single stack; a three-tile call (12 tiles) is a single stack.
- Tiles are stacked within the pile; the base of each pile is spread along the
  table edge, grouped by trick (`captureTrick`).
- Visibility is preserved per tile (`captureHidden`): a tile shown at showdown
  is face-up in the pile, a hidden tile stays face-down forever.
- Provenance is preserved per tile (`captureFrom`): the pile popup shows
  **from {seat}** on both face-up and face-down cards.
- Clicking a captured tile opens the trick's pile: tiles left to right, with
  the same 76 px tile and ranking typography as the Ranks ladder.
- The **Turn history** browser shows the call, winner, each seat's set and the
  tiles actually played (backs for hidden sets); the winner row carries a green
  ✓ badge.

## 6. Layout relay

The host is authoritative, but the arrangement is cosmetic. It is relayed
without leaking hidden information:

- The owner sends `{type:"hand-layout", slots}` where `slots` is an array of
  `{x, z, a}` in **raw hand order** (the order every client uses to index that
  seat's hidden tiles).
- The host clamps each slot to the felt, applies it to the sender's seat and
  relays `{type:"hand-layout", seat, slots}` to the other guests.
- `slots: null` clears the seat (Tidy).
- Slots are index-based; after a play the owner republishes because the hand
  order shifts.
- No tile ids, ranks or colours are sent. A guest cannot learn a hidden tile
  from a layout.
- Layouts are memory-only and cleared at every deal.

## 7. Wording

To avoid the collision between a card-game “trick” and a player's turn:

| Concept | English | Thai |
| --- | --- | --- |
| One set of plays | **Turn** | ตา |
| The current player | **Now** | ตอนนี้ |
| The log | **Turn log** | บันทึกตา |
| The history | **Turn history** | ประวัติการเล่น |
| The undo action | **Cancel turn** | ยกเลิกตานี้ |

## 8. Invariants

These are deliberate and should not be “simplified” away:

- No automatic reveal. A human always chooses Show set or Keep hidden.
- No automatic collection. The reveal result panel must be dismissed before the
  trick is swept.
- Hidden stays hidden. A face-down tile is never revealed by a capture, a pile
  popup or the history browser.
- No arrangement outside the private arc; the centre is only a play target.
- No tile identities in the layout relay.
- One trick = one captured pile.
- The dock buttons remain a complete alternative to drag.

## 9. Code map

| Concern | Location |
| --- | --- |
| Zones, drag, reveal, piles | `script.js` → `createScene` (`personalZone`, `battleRing`, `tryPlayFromHand`, `endHandDrag`, `showdown`, `capturePosition`) |
| Hand layout + relay | `handLayout`, `seatLayouts`, `exportHandSlots`, `publishHandLayout` |
| Captured visibility / source / trick | `captureHidden`, `captureFrom`, `captureTrick` in `state` |
| Reveal panel | `#revealModal`, `revealPending`, `applyShowdown` |
| History browser | `trickArchive`, `renderLogBrowser`, `#lastTrickModal` |
| Pile popup | `openPileModal`, `captureGroupsFor` |
