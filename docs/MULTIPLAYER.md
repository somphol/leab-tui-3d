# Multiplayer

Leab-Tui 3D supports a **serverless, host-authoritative WebRTC table** for two to four humans. Empty seats are filled with bots. There is no game server, account, database or matchmaking service.

The transport lives in [`peer-manager.js`](../peer-manager.js); the authority, lobby and privacy logic live in [`script.js`](../script.js). The wire format is documented in [PROTOCOL.md](PROTOCOL.md).

## Why four seats, not six

Leab-Tui is played with the **32 tiles of a Chinese chess set**, dealt to **four winds**, eight tiles each. That is the rule contract in [RULES.md](RULES.md), and the engine, scoring and 3D table all assume it.

The original request for this feature mentioned a six-player limit, inherited from a poker-table template. Adding two seats would require inventing a different deck, deal and scoring rule, which would no longer be Leab-Tui. The table therefore supports:

- **1 human + 3 bots** in solo,
- **2 humans + 2 bots** as the minimum network start,
- **3 humans + 1 bot**,
- **4 humans**.

This is a deliberate rules decision, not a missing seat. If you fork the project for another game, change `SEATS`, `TABLE_SEATS`, the deal loop and `docs/RULES.md` together.

## Roles

| Role | Runs the engine | Deals | Chooses bots | Sees every hand | Sends |
| --- | --- | --- | --- | --- | --- |
| Host | yes | yes | yes | yes | `lobby`, `state`, `start`, `closed` |
| Guest | no | no | no | only its own hand + public info | `hello`, `action`, `ping`, `leave` |
| Bot | host-side | — | — | host-side | — |

The host is always seat 0. Guests are assigned seats 1–3 in join order. A guest cannot choose or swap seats.

## Identity

Every human sets a name in the launch flow before hosting or joining. The name is trimmed to 18 characters and stored in `localStorage["leabtui.name.v1"]`; the menu and join fields stay in sync.

- The host name becomes the seat 0 roster label.
- A guest confirms their own name in the join panel.
- An invite link (`?room=...`) pre-fills the code but never the identity, so a shared link cannot silently join as the last person who used that browser.
- `?room=...&name=Bea` is an explicit deep link for tests and automation; it joins immediately.
- There is no account, password or uniqueness check.

## Lobby lifecycle

```text
launch
  ├─ Play solo ───────────────► normal solo table
  ├─ Host a table
  │    generate LEAB-XXXXXX ──► open PeerJS host
  │    guest hello ───────────► assign seat 1–3
  │    at least 2 humans ─────► Start table
  │    fill empty seats ──────► Bot 1..n
  │    beginMatch + publish ──► game
  └─ Join a table
       enter code + name ─────► PeerJS client
       (invite links prefill the code, never the identity)
       welcome { seat } ──────► waiting lobby
       state #1 ──────────────► table
```

The launch overlay appears when there is no resumable solo save and no explicit launch parameter. `?mode=solo` skips it. `?mode=host` opens a room. `?room=CODE` joins immediately.

## Room codes

A code is six characters from an unambiguous alphabet: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no `0`, `O`, `1`, `I`). It is displayed as `LEAB-ABC-234`.

- Case does not matter.
- Spaces, dashes and the `LEAB` prefix are stripped.
- A full invite URL is accepted.
- The PeerJS ID is `leabtui-v1-<lowercase code>`.
- Code collisions are retried up to four times (`unavailable-id`).

There are 32⁶ ≈ 1.07 billion codes. The broker does not provide a directory; a code is only useful while the host page is open.

## Leaving the room

During a network game the Actions panel carries a wine-coloured **Leave room** button, full-width below the action grid.

- **Host:** asks for confirmation, sends `closed` to every guest, destroys the peer and returns to the launch menu. Guests see **Table closed**. The room code stops working.
- **Guest:** asks for confirmation, closes the data channel and returns to the menu. The host converts the seat to a bot; the match continues.
- **Lobby before start:** the host panel's **Back** and the guest waiting panel's **Leave room** use the same confirmation.

The button is hidden in solo. On phones it sits inside the Actions panel below the table, so it never covers the hand dock; the header room chip shrinks to a status icon.

## Starting and filling

`startHostedMatch()`:

1. Counts connected humans (`host` + `human`).
2. Refuses unless at least two are connected.
3. Keeps every connected human profile.
4. Replaces every empty seat with `{ kind: "bot", name: "Bot n" }`.
5. Sends `start` to guests, then calls `beginMatch()`; the normal deal and first `state` follow.

The host may keep waiting for more humans; the button is disabled until the second human arrives. There is no separate "add bot" button — bots are the default for empty seats.

## Disconnection

When a guest connection closes or sends `leave`:

1. The host keeps the seat, hand, captures and score.
2. It replaces the profile with a bot, preserving turn order.
3. It publishes the new roster and state.
4. If it was that seat's turn, `scheduleAI(700)` takes over.

The seat is **not** deleted, so the running round and scoring remain valid. A guest cannot reclaim the seat in the same room; they can rejoin only if a seat is free and the match has not started.

If the **host** closes the tab, the data channels close. Guests see a "Table closed" panel with **Play solo** and **Leave room**. There is no host migration.

## Privacy model

The host sends a **different payload per guest** via `sanitizeForSeat(state, seat)`:

| Field | Own seat | Other seats |
| --- | --- | --- |
| `hands` | real tile IDs | `ghost-<seat>-<index>` placeholders |
| face-down centre entry | real IDs + combo | ghost IDs, `combo: null` |
| revealed centre entry | real IDs + combo | real IDs + combo |
| captures | real IDs | real IDs (public) |
| `log` hidden entry | real combo | `combo: null` |
| `lastTrick` hidden entry | real combo | `combo: null` |
| `lastTrick.human*` | recomputed for recipient | recomputed for recipient |
| `hiddenTags`, `snapshot`, `selected`, `fast` | stripped | stripped |

Guests create back-only "ghost" meshes for `ghost-<seat>-<index>` ids, so a hand looks correct without knowing which tile it is. The tag map is stable across a round (assigned at deal and restored by Undo), so playing a face-down tile moves the same ghost mesh from hand to centre rather than reshuffling cards.

**What this does not do**

- The host browser has the full state. A malicious host can cheat.
- A guest can read its own JavaScript memory; the client is not a trusted execution environment.
- There is no encryption beyond the WebRTC data channel's DTLS. The PeerJS broker sees signalling metadata, not game data.
- There is no authentication, collusion detection or replay protection. Play with people you trust.

## Network requirements

- **Signalling:** PeerJS public broker `0.peerjs.com`, port 443, secure WebSocket.
- **ICE:** public STUN (`stun.l.google.com:19302`, `stun1`, `stun2`).
- **Media:** reliable, ordered data channel; no audio/video.
- **CSP:** `connect-src` must allow `https://0.peerjs.com` and `wss://0.peerjs.com`; `script-src` must allow `cdn.jsdelivr.net`.

Without a TURN relay, symmetric NAT and some corporate firewalls will fail. The app reports `peer-unavailable`, `network`, `server-error` or a timeout in the lobby status line. Try a phone hotspot or a different network.

## Tuning and test hooks

| URL / API | Effect |
| --- | --- |
| `?mode=solo` | Skip the launch overlay |
| `?mode=host&name=Ana` | Open a room immediately |
| `?room=ABC234` | Open the join panel with the code prefilled; no connection until the guest confirms a name |
| `?room=ABC234&name=Bea` | Join immediately as Bea (used by the net-check harness) |
| `?lobby=1` | Force the launch overlay |
| `LeabTui.net.getState()` | Role, formatted code, seat, roster, PeerJS ID |
| `LeabTui.net.host(name)` | Open a room from the console |
| `LeabTui.net.join(code, name)` | Join from the console |
| `LeabTui.net.start()` | Start the hosted match |
| `LeabTui.net.leave()` | Close the room |
| `LeabTui.net.solo()` | Leave and deal a solo table |
| `LeabTui.net.sanitize(seat)` | Inspect the exact payload for a seat |
| `LeabTui.net.selfTest()` | Ten protocol/redaction checks |

The **two-client** verification is `node scripts/net-check.mjs`. It uses the real broker and checks: host room, guest join, two-human start, bot fill, own-hand privacy, ghosted other hands, actions in both directions, a resolved trick, and disconnect-to-bot. It is separate from `scripts/verify.mjs` so offline CI stays deterministic. Set `GUEST_SHOT=screenshots/guest-play.png` to capture the guest table during the run.

## Troubleshooting

| Symptom | Likely cause | Action |
| --- | --- | --- |
| "Room not found" | wrong code, host tab closed, different broker | recheck code; host must keep the tab open |
| Stuck at "Connecting…" | broker blocked, CSP, firewall | open the browser console; check `0.peerjs.com` is reachable |
| Both connected, start disabled | only one human | invite a second human |
| Start works but guest sees a blank table | Three.js CDN blocked on guest | guest needs jsDelivr too |
| Guest cannot play | not their turn, or selection count wrong | the dock says whose turn it is; use Hint |
| Disconnect did not convert | connection still open (laptop sleep) | wait for the ICE timeout or close the tab |
| Host reload lost the room | network rooms are intentionally not resumable | open a new room |

## Files

| File | Role |
| --- | --- |
| `peer-manager.js` | room codes, PeerJS loading, host/client endpoints, loopback test pair |
| `script.js` §13 | lobby, seating, authority, redaction, hydration, bot takeover |
| `index.html` | lobby markup and room chip |
| `style.css` | lobby and seat styles |
| `scripts/net-check.mjs` | real two-client verification |
| `docs/PROTOCOL.md` | message schema and invariants |
