# FAQ

**What is Leab-Tui?**  
เลี๊ยบตุ่ย is a Thai trick-taking game played with the 32 tiles of a Chinese chess set. Players call a shape (single, pair, straight, Soldier set), everyone sends that many tiles, and only revealed sets compete. The winner captures the pile. See [RULES.md](RULES.md).

**Is this the same as Chinese chess?**  
No. The tiles are Xiangqi tiles, but there is no board, no movement and no checkmate. The game is a trick-taking card game that reuses the pieces.

**Why do I have to send tiles face-down?**  
Because that is the core decision. You can always send the required number, even if you cannot form the called shape; unrevealed tiles cannot win. This lets you conserve strong tiles for a later lead.

**Can I reveal a pair when the call was a single?**  
No. The set must match the called type. A pair cannot beat a single, and a Sa Hoo cannot beat a See Hoo.

**Why did my General pair not work?**  
There is one General per colour, so a General pair cannot exist. Pairs must be two copies of the same rank and colour.

**Why did an identical set lose?**  
Equal rank and colour do not overtake. The earlier play keeps the trick. Red beats black at equal rank; if rank and colour are both equal, the first set stays best.

**What is Chuan?**  
Capturing all eight piles (all 32 tiles) in a round. It scores 16 points instead of the normal pile table.

**How long is a match?**  
First to 20 points by default. A round ends when all hands are empty; scores are added and a new round is dealt.

**Why does the coach say I have no legal Tui?**  
You selected two tiles that are not an identical pair, or you have no pair in hand. You can still send two tiles face-down.

**Does Hint play for me?**  
No. It selects a legal recommendation; you still press Lead, Reveal or Play face-down.

**Does Undo work after a reload?**  
No. The live game resumes, but the pre-trick snapshot is intentionally not persisted. Undo is a one-trick teaching tool.

**Can I make the text bigger?**  
Yes. Open **Aa** in the stage toolbar and choose Small, Default, Large or Extra large. The interface scales; the 3D table stays fixed. The choice persists.

**Can I change the theme?**  
Yes. The same Display panel offers Mahogany, Jade Court and Midnight Lacquer. Themes recolour the UI and the 3D felt/wood/light palette. They do not change the rules.

**I hear no sound. What should I check?**  
Click once anywhere in the page first — browsers block audio until a gesture. Then check the speaker icon (sound on), the device volume, and the browser tab mute. The clack is synthesised, not a file; there is no audio download to fail. If you still hear nothing, open the console and check for an `AudioContext` error.

**Where is my data?**  
In this browser's `localStorage` (`leabtui.match.v1`, `leabtui.prefs.v1`, `leabtui.stats.v1`). **Export JSON** writes a file; nothing is uploaded.

**Can I play offline?**  
The rule engine, coach and panels work without the CDN, but the 3D table needs Three.js from jsDelivr. There is no service worker or bundled copy.

**Does it work on my phone?**  
The layout is built for 390×844 and verified in headless Chrome. Physical iOS/Android testing is still on the roadmap. Landscape is not specially tuned.

**Why is there no online multiplayer?**  
The release is deliberately static and serverless. Online play would require a backend, matchmaking and anti-cheat, which is out of scope.

**Can I use this commercially?**  
The code is MIT. The name and the traditional game are not owned by this project; check the rules source and local cultural considerations before commercial use.

**How do I report a bug?**  
Open a GitHub issue with the browser, viewport, steps, expected/actual, and the console output. See [SUPPORT.md](../SUPPORT.md).
