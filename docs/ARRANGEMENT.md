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
- The owner's hand is detected with `seat === MY_SEAT`, not `seat === 0`, so a
  guest's own hand is not rendered with the compact opponent fan. The owner's
  tiles are one **straight row along the seat tangent** at `HAND_RADIUS`, step
  0.98, so the face-up hand never overlaps or collides with the neighbouring
  fan. Opponent fans stay compact.
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
- **Show set applies immediately.** The local cards flip and the turn passes to
  the next seat; there is no intermediate reveal popup. The coach and the dock
  already describe the set and whether it can beat the mark.
- **Show is available for any legal set of the called type**, even if it
  loses; only an illegal submission is limited to Keep hidden. The dock says
  which case applies and why, and the follow dock warns before an illegal set
  is sent.
- **No winner is decided until the circle is complete.** Every seat must choose
  Show set or Keep hidden (a seat without a mark to beat cannot hide). Only
  after the last decision does `resolveTrick` compare the sets, sweep the
  centre and record the winner.
- **Then the trick result opens for every human** — the host and every guest,
  whether that player revealed or stayed hidden. It uses the captured-pile
  style: one frame per seat in play order, the chosen tiles as mini cards (backs
  for hidden sets), a large green ✓ and gold frame on the winner, and the
  winner/reason note below. The history browser uses the same
  `trickCompareMarkup`.
- In solo the next trick waits for **Continue** on the result; in a P2P room the
  table continues and each client closes the summary at their own pace.
- The final winner takes all `4 × N` tiles; only then are they added to the
  winner's pile.

## 5. Captured piles

- One trick produces **one pile**, not one pile per four tiles. A pair trick
  (8 tiles) is a single stack; a three-tile call (12 tiles) is a single stack.
- Tiles are stacked within the pile; each pile's base sits on the rim at
  `CAPTURE_RADIUS = 5.90`, and piles are spaced **along the rim arc** by
  `CAPTURE_PILE_SPACING = 1.02`, grouped by trick (`captureTrick`). Do not go
  back to a straight tangent fan: at eight piles it left the table.
- Seat nameplates sit inward at 5.15, between the hand and the captured piles.
- Automatic centre plays use `CENTER_TILE_SPACING = 0.96` (was 0.52), so a
  pair/triple/six-tile set does not interpenetrate.
- The history modal refreshes from `state.trickArchive` while open and follows
  the latest trick unless the player picks an older one; when the turn reaches
  the local player it closes with a “Your turn” toast.
- Visibility is preserved per tile (`captureHidden`): a tile shown at showdown
  is face-up in the pile, a hidden tile stays face-down forever.
- Provenance is preserved per tile (`captureFrom`): the pile popup shows
  **from {seat}** on both face-up and face-down cards.
- Clicking a captured tile opens the trick's pile: tiles left to right, with
  the same 76 px tile and ranking typography as the Ranks ladder.
- The **Turn history** browser uses the same comparison layout after a round
  and turn are selected: one frame per seat, the actual tiles as mini cards
  (backs for hidden sets), a large green ✓ on the winning frame, and the winner
  line plus the reason in the same gold-bordered note. The trick result and the
  history share `trickCompareMarkup`; do not fork the layout again.

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

- No automatic reveal. A human always chooses Show set or Keep hidden; Show
  applies immediately.
- No early verdict. The winner is decided only after every seat has shown or
  stayed hidden, and only then does the trick result open.
- The same summary for everyone. The result modal opens for the host and every
  guest, not only for players who revealed.
- Hidden stays hidden. A face-down tile is never revealed by a capture, a pile
  popup or the history browser.
- No arrangement outside the private arc; the centre is only a play target.
- No tile identities in the layout relay.
- One trick = one captured pile.
- One comparison layout. Reveal result, turn history and the captured-pile why
  block share the card and note treatment; hidden sets never render faces.
- The dock buttons remain a complete alternative to drag.

## 9. Code map

| Concern | Location |
| --- | --- |
| Zones, drag, reveal, piles | `script.js` → `createScene` (`personalZone`, `battleRing`, `tryPlayFromHand`, `endHandDrag`, `showdown`, `capturePosition`) |
| Hand layout + relay | `handLayout`, `seatLayouts`, `exportHandSlots`, `publishHandLayout` |
| Captured visibility / source / trick | `captureHidden`, `captureFrom`, `captureTrick` in `state` |
| Trick result | `#trickResultModal`, `showTrickResult`, `trickCompareMarkup`, `closeTrickResult` |
| History browser | `trickArchive`, `renderLogBrowser`, `trickCompareMarkup`, `#lastTrickModal` |
| Pile popup | `openPileModal`, `captureGroupsFor` |
