# Gallery

All screenshots are captured from the local build at 1440×900 unless noted. Regenerate them after any camera, material, copy or dock change.

## Hero — English table

![English table](../screenshots/hero.jpg)

A trick in progress: the human hand fanned across the south edge, the opponent hands face-down, the centre lead and a face-up challenger, the coach naming the consequence, the inspector showing a selected Red Soldier, the scoreboard and the action dock. This is the canonical release image.

## Thai table

![Thai table](../screenshots/thai.jpg)

The same table after **EN ⇄ ไทย**: header, HUD, seat names, coach, scoreboard, actions, inspector, tile names and hand list. The selected tile is lifted with a gold ring; the inspector shows จุก 兵, แดง · Soldier, อันดับ 1/7, จำนวน 5.

## Rules drawer

![Rules](../screenshots/rules.jpg)

The in-app rules: goal, equipment, hierarchy, colour/tie, the nine calls, the trick flow, the pile table and the digital-table conventions. The drawer is dark, scrollable and fully bilingual.

## Phone — 390×844

![Phone](../screenshots/mobile.jpg)

The portrait layout: a wider camera keeps the whole table and the human hand visible; the dock is compact (title, one line of advice, four buttons) and the coach/score panels follow below the stage.

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
```

Then convert with `sips -s format jpeg -s formatOptions 86 screenshots/hero.png --out screenshots/hero.jpg` (or any image tool). The PNGs are working files; the repository ships the JPGs.
