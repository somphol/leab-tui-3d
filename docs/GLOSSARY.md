# Glossary

| Term | Meaning |
| --- | --- |
| **Leab-Tui** | เลี๊ยบตุ่ย, the Thai trick-taking game implemented here. Also written “เล็บตุ่ย”. |
| **Leab** | เลี๊ยบ, a single-tile call. |
| **Tui** | ตุ่ย, a pair call. Two identical tiles, same rank and colour. |
| **Sa Hoo** | ซาฮู้, a three-tile straight. Big (General–Advisor–Elephant) or small (Chariot–Horse–Cannon). |
| **See Hoo** | สี่ฮู้, a four-tile straight: Sa Hoo plus one duplicated core rank. |
| **Ngoh Hoo** | ห้าฮู้, a five-tile straight: Sa Hoo with two core ranks doubled. |
| **Lak Hoo** | หลักฮู้, a six-tile straight: Chariot ×2 + Horse ×2 + Cannon ×2, one colour. |
| **Sam Juk** | ซาจุก, three Soldiers of one colour. |
| **Si Juk** | สี่จุก, four Soldiers of one colour. |
| **Ha Juk** | ห้าจุก, all five Soldiers of one colour. |
| **Chuan** | ช้วน, capturing all eight piles in a round; worth 16 points. |
| **Pile** | A group of four captured tiles. Two piles is par. |
| **Par** | Two piles at the end of a round; scores 0 points. |
| **General** | ตี่, 帥 / 將, rank 7, one per colour. Cannot pair. |
| **Advisor** | บิน / สือ, 仕 / 士, rank 6, two per colour. |
| **Elephant** | ช้าง / เฉียว, 相 / 象, rank 5, two per colour. |
| **Chariot** | กือ / เรือ, 俥 / 車, rank 4, two per colour. |
| **Horse** | เบ๊ / ม้า, 傌 / 馬, rank 3, two per colour. |
| **Cannon** | เผ่า / ปืนใหญ่, 炮 / 包, rank 2, two per colour. |
| **Soldier** | จุก / ทหาร, 兵 / 卒, rank 1, five per colour. |
| **Face-down** | Tiles sent without revealing. They cannot win. |
| **Reveal / challenge** | Show a legal set of the called type that beats the current best. |
| **Leader** | The player who calls the type and starts the trick. |
| **Trick** | One call, four submissions, one winner. |
| **Round** | Eight deals' worth of tricks (or fewer with multi-tile calls) until all hands are empty. |
| **Match** | Rounds played until a player reaches the target score. |
| **Coach** | The rule-aware advice panel. |
| **Inspector** | The tile detail card (Thai name, English name, rank, copies, colour). |
| **Step guard / Undo & Learn** | Rewind the last trick and compare the sets. |
| **CDP** | Chrome DevTools Protocol, used by the headless verification harness. |
| **Snapshot** | The ID-based pre-trick copy used by Undo. |
| **`serializableState`** | The only function that converts live tiles to IDs for snapshots, saves and exports. |
| **Three.js** | The pinned 3D library (`three@0.160.0`). |
| **OrbitControls** | The camera controller from `three/addons/`. |
| **CanvasTexture** | Procedural textures drawn on `<canvas>` for felt, wood and tile faces. |
| **Chuan bonus** | The 16-point score for eight piles. |
