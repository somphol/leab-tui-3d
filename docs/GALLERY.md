# Gallery

All screenshots are captured from the local build at 1440×900 unless noted. Regenerate them after any camera, material, copy or dock change.

## Hero — English table

![English table](../screenshots/hero.jpg)

A turn in progress: the human hand fanned across the south edge, the opponent hands face-down, the centre lead and a face-up challenger, the coach naming the consequence, the inspector showing a selected Red Soldier, the scoreboard and the action dock. This is the canonical release image.

## Thai table

![Thai table](../screenshots/thai.jpg)

The same table after **EN ⇄ ไทย**: header, HUD, seat names, coach, scoreboard, actions, inspector, tile names and hand list. The selected tile is lifted with a gold ring; the inspector shows จุก 兵, แดง · Soldier, อันดับ 1/7, จำนวน 5.

## Jade Court

![Jade Court](../screenshots/jade.jpg)

The green theme: felt, panels and brass follow the palette; the tiles stay ivory for contrast.

## Midnight Lacquer

![Midnight Lacquer](../screenshots/midnight.jpg)

The blue-black theme: silver inlay, cool key light and a cold table.

## Display panel

![Display panel](../screenshots/display.jpg)

Four text sizes and five themes, with a reset. The bright themes make the modal itself light. The modal is the same component system as the rules and about drawers.

## Rules drawer

![Rules](../screenshots/rules.jpg)

The in-app rules: goal, equipment, hierarchy, colour/tie, the nine calls, the turn flow, the pile table and the digital-table conventions. The drawer is dark, scrollable and fully bilingual.

## Phone — 390×844

![Phone](../screenshots/mobile.jpg)

The portrait layout: a wider camera keeps the whole table and the human hand visible; the dock is compact (title, one line of advice, four buttons) and the coach/score panels follow below the stage.

## Rank order quick reference

![Rank order quick reference](../screenshots/ranks.jpg)

The **Ranks** shortcut at the top-left HUD: seven cards, red and black Hanzi, Thai/English names, rank numbers, highest/lowest labels and the tie rules.

## Rank order — ไทย

![Rank order in Thai](../screenshots/ranks-th.jpg)

The same ladder in Thai on the Parchment theme: ตี่ > สือ > เฉีย > กือ > แบ้ > เผ่า > จุก, with the tie rules underneath.

## Parchment

![Parchment](../screenshots/parchment.jpg)

Warm ivory panels, dark ink and an olive felt table — the first bright theme.

## Daybreak

![Daybreak](../screenshots/daybreak.jpg)

Pale blue-white panels, navy ink and a teal table — the second bright theme.

## Phone at Extra large + Jade

![Phone at XL with Jade](../screenshots/mobile-xl.jpg)

The stress case: 390×844, 1.24× text and the Jade Court palette. The header drops the About icon (it moves to the sidebar footer), the HUD wraps to two rows, the action buttons wrap to two rows, and the hand is still visible.

## Multiplayer lobby

![Multiplayer lobby](../screenshots/lobby.jpg)

The launch overlay: a required **Your name**, **Play solo**, **Host a table** and **Join a table**, with a short privacy note. The Resume match card appears here when a solo save exists. The dimmed table behind is intentionally empty until the player chooses.

## Host panel

![Host panel](../screenshots/lobby-host.jpg)

A live room: the branded code, copy-invite field, the host seat and three bot-preview seats. The Start button stays disabled with a clear "Need 2 humans" reason. The code in the screenshot is from a live broker session and is no longer open.

## Multiplayer lobby — phone

![Multiplayer lobby on a phone](../screenshots/lobby-mobile.jpg)

The same overlay at 390×844: one mode per row, full-width touch targets, and the privacy note still readable without scrolling the card.

## Guest table

![Guest table](../screenshots/guest-play.jpg)

A guest's view after the host started: the guest's own hand is at the bottom, the host is on the left, bots are opposite and right, and the room chip shows the room number. The other hands are back-only ghost meshes; the wire never carried their tile ids. This capture came from `scripts/net-check.mjs` with `GUEST_SHOT` set.

## Mobile — room exit

![Mobile leave room](../screenshots/mobile-leave.jpg)

The host in a room at 390×844: the room chip is now a compact status icon, and **Leave room** spans the Actions grid below the table. It is visible, but it never covers the hand dock. The confirmation modal explains that the host exit closes the room for everyone.

## Table chat and voice

![Table chat and voice controls](../screenshots/chat-voice.jpg)

A hosted room with the glass chat panel open: two messages, the voice controls in the joined state, **Mute mic**, **Mute others** and **Leave voice**, plus the confirmed **Leave room** action above. The green ring on the Host seat is the speaking pulse. The room chip in the header is a compact icon on phones.

## Mobile chat and voice

![Mobile chat and voice](../screenshots/mobile-chat.jpg)

The chat panel at 390×844: **Leave room** is still visible in Actions, the glass chat sits below it, and the voice bar collapses to two columns. The hand dock is below the inspector and is not covered.

## Host security

![Host security](../screenshots/host-security.jpg)

Approval is on, a generated 5-digit PIN is set, and **Copy room info** sits next to **Copy invite link**. The plain PIN is shown once in the host panel; state, roster, URL and export contain only the digest. The warning explains that Copy room info puts the PIN in the clipboard.

## iPad landscape — join

![iPad landscape join](../screenshots/ipad-join.jpg)

The join sheet at 1024×768: top-aligned, internally scrollable, 16 px inputs so Safari does not auto-zoom when the keyboard opens. The panel rail sits on the right and the hand dock folds to a circle.

## iPad portrait — table

![iPad portrait table](../screenshots/ipad-portrait-1919.jpg)

The 820×1180 portrait stage fitted to the whole rim: the 2D camera computes its distance from the live aspect and the HUD/dock occupancy. No cast shadows; the collapsed hand dock sits bottom-right.

## iPad hints — 1.9.20

![iPad hints](../screenshots/ipad-hints-1920.jpg)

The Thai hint toast sits below the HUD and names the suggested set. The inspector opens on the selected tile, and both hand controls read **H** in the panel rail and collapsed dock.

## Invite from a solo table — preview

![Invite from solo](../screenshots/ipad-invite-preview.jpg)

The preview build: **Invite** in the top bar and Actions opens a room around the running solo match, with the room number, PIN, copy/share actions, seats and the approval queue. The guest is queued until the current turn ends.

## iPad turn-log history — 1.9.22

![iPad turn-log history](../screenshots/ipad-log-history-1922.jpg)

Pressing **L** opens the turn-log sheet; **View turn log** closes the sheet and opens the shared history browser, the same `#lastTurnModal` used by the round summary.

## iPad landscape — panel rail

![iPad landscape rail](../screenshots/ipad-landscape-rail-1921.jpg)

The 1.9.21 fix: at 1180 px the sidebar is hidden for coarse pointers, so the C/M/A/i/H/L circle rail is the navigation. It now follows the same media query and is visible in landscape.

## iPad landscape — table

![iPad landscape table](../screenshots/ipad-landscape-1919.jpg)

The 1180×820 landscape stage with the same fit: the rim is fully on-screen, the dock is clear of the hand, and 3D remains available from the HUD toggle.

## Approval actions

![Approval actions](../screenshots/ipad-approve.jpg)

On the bright Daybreak theme, **Approve** is solid green, **Deny** is solid wine, and **Approve all** is gold. The pending row is readable without relying on contrast alone.

## What is not shown

- The match-end summary and the undo comparison modal. Both use the same card system; capture them if you add release notes about scoring or learning.
- The about/credits modal.
- A top-down camera screenshot.
- A capture sweep mid-animation.

## Regenerating

```bash
python3 -m http.server 8123 &

node scripts/browser-check.mjs \
  --url "http://127.0.0.1:8123/?demo=1" \
  --wait 16500 \
  --eval "(async()=>{LeabTui.hint();const s=LeabTui.getState();const id=(s.selected&&s.selected[0])||s.hands[0][0];LeabTui.inspect(id);await new Promise(r=>setTimeout(r,3600));return JSON.stringify({tile:id});})()" \
  --out screenshots/hero.png

node scripts/browser-check.mjs --url "http://127.0.0.1:8123/?demo=1" --width 390 --height 844 --wait 16000 --out screenshots/mobile.png

node scripts/browser-check.mjs --url "http://127.0.0.1:8123/?lobby=1" --wait 3500 --out screenshots/lobby.png
```

Then convert with `sips -s format jpeg -s formatOptions 86 screenshots/hero.png --out screenshots/hero.jpg` (or any image tool). The PNGs are working files; the repository ships the JPGs.

## Experimental draft deal

![Draft modal on desktop](../screenshots/draft-modal.jpg)

The host-only draft deal (off by default): the public 32-tile pool, a step counter, the remaining pool size and the two-tile confirm button. The host toggle sits in Actions and is disabled while a draft is in progress; the lobby has the same switch before a room starts.

![Draft modal on a phone](../screenshots/draft-modal-mobile.jpg)

The same modal at 390×844: five tiles per row, a scrollable pool of 436 px and the confirm button still inside the card, with no horizontal overflow.

## Turn result and turn history

![Turn result on desktop](../screenshots/turn-result.jpg)

After every seat has chosen Show set or Keep hidden, the turn is judged and this summary opens for everyone — host and guests, whether they revealed or hid. One frame per seat in play order, the played tiles as mini cards (backs for hidden sets), a large green ✓ with a gold frame on the winner, and the winner/reason note. Continue starts the next turn in solo; in a room the summary is informational.

![Turn history on desktop](../screenshots/turn-history.jpg)

Turn history after choosing a round and turn: the same seat frames and cards, the winning frame's ✓, and the winner/reason note. The Round and Turn selects re-render this detail.

![Turn result on a phone](../screenshots/turn-result-mobile.jpg)

At 390×844 the seat frames fall to one column and the cards and note stay inside the modal without horizontal overflow.

![Turn history on a phone](../screenshots/turn-history-mobile.jpg)

The same history detail on a phone: one column, the four seat frames, and a modal that scrolls internally to the note and Continue.
