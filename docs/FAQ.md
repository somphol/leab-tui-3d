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
There is no target score: play continues round after round until players leave. A round ends when all hands are empty; each seat starts with eight tiles, returning eight is par, and every tile above or below par is ±1 point.

**Why does the coach say I have no legal Tui?**  
You selected two tiles that are not an identical pair, or you have no pair in hand. You can still send two tiles face-down.

**Does Hint play for me?**  
No. It selects a legal recommendation; you still press Lead, Reveal or Play face-down.

**Does Undo work after a reload?**  
No. The live game resumes, but the pre-trick snapshot is intentionally not persisted. Undo is a one-trick teaching tool.

**Can I make the text bigger?**  
Yes. Open **Aa** in the stage toolbar and choose Small, Default, Large or Extra large. The interface scales; the 3D table stays fixed. The choice persists.

**Can I change the theme?**  
Yes. The same Display panel offers Mahogany, Jade Court, Midnight Lacquer, Parchment and Daybreak. Themes recolour the UI and the 3D felt/wood/light palette. They do not change the rules.

**I hear no sound. What should I check?**  
Click once anywhere in the page first — browsers block audio until a gesture. Then check the speaker icon (sound on), the device volume, and the browser tab mute. The clack is synthesised, not a file; there is no audio download to fail. If you still hear nothing, open the console and check for an `AudioContext` error.

**Where is the rank order?**  
Press **Ranks** at the top-left HUD (next to Round). It opens the pictorial hierarchy with red/black Hanzi, Thai/English names and rank numbers. Click again, press `Esc`, or click outside to hide it.

**How do I confirm sound works?**  
Open **Aa** → **Test sound**. You should hear a wooden clack. The same sound plays when you lead a tile; if the test is silent, check the tab/device volume, the speaker icon, and the browser console.

**Where is my data?**  
In this browser's `localStorage` (`leabtui.match.v1`, `leabtui.prefs.v1`, `leabtui.stats.v1`, `leabtui.name.v1`). **Export JSON** writes a file; a network match sends redacted state directly to the other players, never to a game server.

**Can I play offline?**  
The rule engine, coach and panels work without the CDN, but the 3D table needs Three.js from jsDelivr. Multiplayer also needs PeerJS and the `0.peerjs.com` broker. There is no service worker or bundled copy.

**Does it work on my phone?**  
The layout is built for 390×844 and verified in headless Chrome. Physical iOS/Android testing is still on the roadmap. Landscape is not specially tuned.

**Is there online multiplayer?**

Yes — a serverless host/guest table over WebRTC. The host shares a six-digit code, two humans are enough to start, empty seats become bots, and a guest who leaves is replaced by a bot. See [MULTIPLAYER.md](MULTIPLAYER.md).

**Why only four seats?**

Leab-Tui is played with 32 tiles and four winds, eight tiles each. Six seats would need a different deck and rules. The request that inspired this feature mentioned six players, inherited from a poker template; this project keeps the game's actual table. See [MULTIPLAYER.md](MULTIPLAYER.md#why-four-seats-not-six).

**Can guests cheat?**

The host never sends another player's hand, so a guest cannot read the other hands from the network. But the host browser knows every hand, and a guest can inspect their own client. There is no anti-cheat or authentication. Play with people you trust.

**Does multiplayer work through a corporate firewall?**

Sometimes. It uses public STUN only, no TURN relay. Symmetric NAT or a restrictive firewall can block the data channel; a phone hotspot often works.

**Is there in-game chat and voice?**

Yes. **Table chat** is host-routed, escaped, capped at 200 characters and kept in memory. **Join voice** requests the microphone and connects a direct full-mesh voice call; **Mute mic** disables your track without dropping the call, and **Mute others** deafens every remote stream. Neither is recorded.

**Does the room have a PIN?**

Yes, optional. Set a 5-digit PIN, or press **New PIN** to rotate it. The host stores only a SHA-256 digest; the link never contains it. **Copy room info** can copy code + PIN + link for convenience.

**Is the PIN enough security?**

No. It raises guessing cost, but host approval is the real gate. Assume the source and policy are public. Approve only people you know, share the PIN separately when you can, and close the room when done.

**Can a stranger crash the app?**

The host caps connections, pending requests, message rate, payload size, chat rate and voice callers. There is no server to absorb a network flood, so a determined DDoS remains possible. The controls are mitigation, not a guarantee.

**Why does Join voice do nothing?**

Voice needs HTTPS or localhost and microphone permission. Denying the prompt leaves chat and the game working. Some corporate networks block WebRTC media; there is no TURN relay.

**Can I resume a network match after reload?**

No. The room lives in the host tab and is deliberately not saved. Reloading ends your side; the host converts your seat to a bot. Solo matches do resume automatically.

**Can I use this commercially?**  
The code is MIT. The name and the traditional game are not owned by this project; check the rules source and local cultural considerations before commercial use.

**How do I report a bug?**  
Open a GitHub issue with the browser, viewport, steps, expected/actual, and the console output. See [SUPPORT.md](../SUPPORT.md).
