# Multiplayer

Leab-Tui 3D supports a **serverless, host-authoritative WebRTC table** for two to four humans. Empty seats are filled with bots. There is no game server, account, database or matchmaking service.

The transport lives in [`peer-manager.js`](../peer-manager.js), voice in [`voice-chat.js`](../voice-chat.js), and the authority, lobby, chat and privacy logic live in [`script.js`](../script.js). The wire format is documented in [PROTOCOL.md](PROTOCOL.md).

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

## Room security

The protocol is public. Do not treat the room code or PIN as authentication.

- **Host approval is on by default.** A guest sends `hello`; the host sees a pending request with the name and time, then **Approve** or **Deny**. No seat, roster entry or game state is sent before approval. Pending requests expire after 120 seconds; six can wait at once.
- **PIN is generated automatically.** **New PIN** rotates it before sharing. Policy: exactly 5 digits; reject common, repeated and obvious sequential values. **New PIN** creates a fresh 5-digit PIN; the first one is generated automatically. A 5-digit PIN has only 100,000 possibilities, so approval remains the real access control and 8 wrong attempts trigger a 60-second lockout.
- **The host stores only a SHA-256 digest** in memory. The plain PIN is shown once in the host panel for copying, never in the invite URL, roster, state, export or `localStorage`.
- **Copy room info** writes the code, PIN and link. That is convenient but puts the PIN in the clipboard; share it only in a trusted channel. **Copy invite link** never includes the PIN.
- **Wrong PIN / denied / expired / busy** connections receive a `rejected` reason and are closed. Eight wrong PINs trigger a 60-second room-wide lockout.
- **Caps:** 16 connections, 6 pending, 4 human seats, 80 messages/10 s per connection, 16 KB payloads, 200-char chat at 350 ms, voice calls only from approved roster IDs.

Approval is the access-control decision. The PIN only reduces who can ask. A malicious approved guest can still flood within the caps or inspect their own client; there is no anti-cheat, moderation or MFA.

## Lobby lifecycle

```text
launch
  ├─ Play solo ───────────────► normal solo table
  ├─ Host a table
  │    generate XXXXXX ──► open PeerJS host
  │    PIN (auto) / approval► lobby security
  │    guest hello ───────────► PIN check -> pending request
  │    host Approve / Deny ───► assign seat 1–3 (or close)
  │    at least 2 humans ─────► Start table
  │    fill empty seats ──────► Bot 1..n
  │    beginMatch + publish ──► game
  └─ Join a table
       enter code + name ─────► PeerJS client
       (invite links prefill the code, never the identity)
       welcome { seat } ──────► waiting lobby
       state #1 ──────────────► table
```

The launch overlay appears on every normal load. `?mode=solo` skips it. `?mode=host` opens a room. `?room=CODE` opens the join panel with the code prefilled and waits for a name/PIN; it does not silently join.

## Room codes

A number is six digits, displayed as `482-173`. The `LEAB-` prefix exists only inside the peer id.

- Spaces, dashes and the `LEAB` prefix are stripped.
- A full invite URL is accepted.
- The PeerJS ID is `leabtui-v1-<code>`.
- Code collisions are retried up to four times (`unavailable-id`).

There are 10⁶ = 1,000,000 codes. A numeric code is a convenience identifier, not a secret; the PIN and host approval gate the room. The broker does not provide a directory; a code is only useful while the host page is open.

## Leaving the room

During a network game the Actions panel carries a wine-coloured **Leave room** button, full-width below the action grid.

- **Host:** asks for confirmation, sends `closed` to every guest, destroys the peer and returns to the launch menu. Guests see **Table closed**. The room code stops working.
- **Guest:** asks for confirmation, closes the data channel and returns to the menu. The host converts the seat to a bot; the match continues.
- **Lobby before start:** the host panel's **Back** and the guest waiting panel's **Leave room** use the same confirmation.

The button is hidden in solo. On phones it sits inside the Actions panel below the table, so it never covers the hand dock; the header room chip shrinks to a status icon.

## Text chat

The sidebar carries a collapsible **Table chat** panel in every room. Messages are host-routed, attributed and capped at 200 characters; guests are rate-limited to one message per 350 ms. A new guest receives the last 30 messages in `welcome`. Chat is memory-only, ends with the room and is never saved.

## Voice chat

Voice is opt-in and independent of the game data channel.

1. Press **Join voice**. The browser asks for microphone permission; this must happen on a user gesture.
2. Each voice-active human calls every other voice-active human (full mesh). The host only relays presence (`voice`) and PeerJS IDs; it does not carry audio.
3. Remote streams attach to hidden `<audio class="remote-player-audio" autoplay playsinline>` elements in `#remoteAudio`.
4. **Mute mic** sets `localStream.getAudioTracks()[0].enabled = false`; the call stays connected.
5. **Mute others** sets `.muted = true` on every remote audio element; it does not affect your mic.
6. **Leave voice** stops tracks, closes the calls and removes the audio elements. Leaving the room does this automatically.
7. A green pulse on the seat avatar/scoreboard row means that mic is transmitting.

Voice requires HTTPS or localhost. Symmetric NAT can block media just as it blocks the data channel; there is no TURN relay. Four speakers make six media paths, so uplink grows with the number of active mics. No audio is recorded.

## Starting and filling

`startHostedMatch()`:

1. Counts connected humans (`host` + `human`).
2. Refuses unless at least two are connected.
3. Keeps every connected human profile.
4. Replaces every empty seat with `{ kind: "bot", name: "Bot n" }`.
5. Sends `start` to guests, then calls `beginMatch()`; the normal deal and first `state` follow.

The host may keep waiting for more humans; the button is disabled until the second human arrives. There is no separate "add bot" button — bots are the default for empty seats.

## Disconnection

When a guest connection closes, the host holds the seat:

1. The host keeps the seat, hand, captures and score.
2. It replaces the profile with a bot, preserving turn order, and keeps the
   guest's **rejoin token** plus their display name on that seat.
3. It publishes the new roster and state.
4. If it was that seat's turn, `scheduleAI(700)` takes over.

A guest **reclaims the same seat automatically after a reload or version
update** by presenting the token:

1. `acceptGuest` issues a random 16-byte token and sends it in `welcome`.
2. The guest stores `{code, seat, token, name}` in `sessionStorage`, never in the
   URL, saved game or export.
3. On boot with a stored room intent, the guest sends `hello` with
   `rejoinToken`; the host matches it to the seat **before** the PIN and
   approval checks and reattaches the connection (`reattachGuest`).
4. The welcome carries `rejoin: true`, `started` and a per-seat redacted
   `state`, so the table is restored immediately.
5. If the seat had become a bot, the bot stops; the hand, captures and score are
   exactly where the bot left them.

The token is a **bearer credential for that seat**, not a room password. Anyone
who obtains it can claim the seat; it is kept in sessionStorage and in the
host's memory only. An intentional **Leave room** clears the token, so a later
connection cannot reclaim the seat. If the token is missing or stale, the guest
falls back to the normal PIN + approval flow.

While the match has not started, a disconnected guest's seat is held with
`connected: false`; starting the match turns it into a bot that keeps the token,
so the guest can still return mid-match.

If the **host** closes the tab, the data channels close and the room ends.
Guests see a "Table closed" panel with **Play solo** and **Leave room**. There
is still **no host migration**: the host's tokens and state are memory-only.
Reload the page as the host and the room is gone; a guest update only survives
because the host stayed open.

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
| `?room=482173` | Open the join panel with the code prefilled; no connection until the guest confirms a name |
| `?room=482173&name=Bea` | Join immediately as Bea (used by the net-check harness) |
| `?lobby=1` | Force the launch overlay |
| `LeabTui.net.getState()` | Role, formatted code, seat, roster, PeerJS ID |
| `LeabTui.net.host(name)` | Open a room from the console |
| `LeabTui.net.join(code, name)` | Join from the console |
| `LeabTui.net.start()` | Start the hosted match |
| `LeabTui.net.leave()` | Close the room |
| `LeabTui.net.solo()` | Leave and deal a solo table |
| `LeabTui.net.sanitize(seat)` | Inspect the exact payload for a seat |
| `LeabTui.net.selfTest()` | Ten protocol/redaction checks |
| `LeabTui.chat` | `send`, `append`, `messages`, `open`, `isOpen` |
| `LeabTui.voice` | `join`, `joinWithStream`, `leave`, `state`, `peers`, `mic`, `deafen` |

The host panel shows **Listening for guests…** until a guest's data channel actually opens. A guest stuck at “PeerJS client timed out” never reached the host, so there is no pending request to approve. The host should keep the tab open and awake; mobile backgrounding can suspend it.

**Troubleshoot** opens a diagnostic panel. It shows version, secure context, PeerJS, role, peer IDs, pending count and the last error. Guests can **Probe with PIN** or **Probe without PIN**; the host answers with PIN required/accepted, approval, started state and free seats without creating a pending seat request. This distinguishes “host offline”, “wrong PIN”, “no PIN” and “ICE blocked”.

A failed join retries once automatically and turns **Connect** into **Retry**. The status line distinguishes broker, host and ICE failures rather than showing a generic timeout.

The **two-client** verification is `node scripts/net-check.mjs`. It uses the real broker and checks: host room, guest join, two-human start, bot fill, own-hand privacy, ghosted other hands, host controls, text chat, voice mesh attachment, mic mute, deafen, actions in both directions, a resolved trick, **reload → auto-rejoin to the same seat**, and disconnect-to-bot. Voice media is exercised with a synthetic oscillator stream so headless Chrome does not need a real microphone; the production path still uses `getUserMedia`. It is separate from `scripts/verify.mjs` so offline CI stays deterministic. Set `GUEST_SHOT=screenshots/guest-play.png` to capture the guest table during the run.

## Troubleshooting

| Symptom | Likely cause | Action |
| --- | --- | --- |
| "Room not found" | wrong code, host tab closed, different broker | recheck code; host must keep the tab open |
| Stuck at "Connecting…" | broker blocked, CSP, firewall | the app retries once; if it still fails, check `0.peerjs.com` on that network |
| "Could not reach the PeerJS broker" | mobile data/Wi-Fi blocked signalling | switch network, disable VPN, retry |
| "The host did not answer" | host tab closed, wrong code, or NAT blocked ICE | keep the host tab open; retry; try another network/hotspot |
| "WebRTC could not find a direct path" | symmetric NAT / strict firewall | use a hotspot or a network with less restrictive NAT; no TURN is bundled |
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
