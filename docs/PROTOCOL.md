# Wire protocol

Version **1**. Every message is a JSON object with `__leab: 1` and `type`. PeerJS serialises with its JSON serialisation; the data channel is reliable and ordered.

`peer-manager.js` stamps `__leab` on send and ignores messages without it. `script.js` ignores messages whose `type` it does not know, so additive fields are safe.

## Envelope

```json
{ "__leab": 1, "type": "state", "...": "..." }
```

PeerJS connection metadata also carries `{ name, protocol: 1 }` during the handshake. The metadata is advisory; the in-band `hello` is authoritative.

## Host → guest

### `welcome`

Sent once after a valid `hello`.

```json
{
  "__leab": 1,
  "type": "welcome",
  "roomCode": "482173",
  "protocol": 1,
  "seat": 1,
  "hostName": "Ana",
  "players": [ { "seat": 0, "name": "Ana", "kind": "host", "connected": true, "bot": false }, ... ],
  "canStart": true,
  "chat": [ { "seat": 0, "name": "Ana", "text": "Welcome", "at": 1793989000000 } ],
  "rejoinToken": "9f2c…",
  "started": false
}
```

`rejoinToken` is issued once per seat and stored by the guest in
`sessionStorage`. It is never in the roster, state, export or URL. On a rejoin
the host sends `"rejoin": true`, `"started": true` and a per-seat redacted
`state` in the same welcome; the guest applies it directly to the table. A
guest approved into a started match receives `"joinedSeat": true`, `"started":
true` and the state. A **viewer** receives `"seat": -1`, `"viewer": true`,
`"started": true` and `sanitizeForSeat(state, -1)` (all hands and unrevealed
sets hidden). Viewer state publications use the same `seat: -1` envelope.

### `lobby`

Roster update while the room is open.

```json
{
  "type": "lobby",
  "roomCode": "482173",
  "hostName": "Ana",
  "players": [ ... ],
  "canStart": true,
  "started": false,
  "players": [ { "seat": 0, "name": "Ana", "kind": "host", "connected": true, "bot": false, "peerId": "abc123", "voice": true }, ... ]
}
```

### `start`

Sent immediately before the first `state` of a match.

```json
{
  "type": "start",
  "roomCode": "482173",
  "seat": 1,
  "players": [ ... ],
  "hostName": "Ana"
}
```

### `state`

The authoritative game snapshot, redacted for the recipient. `seq` increases monotonically for the lifetime of the room.

```json
{
  "type": "state",
  "roomCode": "482173",
  "seq": 17,
  "seat": 1,
  "players": [ ... ],
  "hostName": "Ana",
  "state": {
    "phase": "follow",
    "round": 1,
    "trick": 3,
    "dealer": 3,
    "leader": 0,
    "turn": 1,
    "hands": [
      ["ghost-0-0", "ghost-0-1"],
      ["r-general-0", "b-soldier-2"],
      ["ghost-2-0", "ghost-2-1"],
      ["ghost-3-0", "ghost-3-1"]
    ],
    "captures": [[], [], [], []],
    "center": [
      { "seat": 0, "revealed": true, "tiles": ["r-advisor-0"], "combo": { ... } },
      { "seat": 1, "revealed": false, "tiles": ["b-soldier-2"], "combo": null }
    ],
    "lead": { "seat": 0, "combo": { ... } },
    "best": { "seat": 0, "combo": { ... } },
    "scores": [0, 0, 0, 0],
    "roundPoints": [0, 0, 0, 0],
    "target": 20,
    "history": [],
    "log": [ ... ],
    "lastTrick": null,
    "lastRound": null,
    "winner": null,
    "handCounts": [2, 2, 2, 2],
    "seed": 123456,
    "language": "en"
  }
}
```

The snapshot is produced by `sanitizeForSeat(state, seat)`. It is the **only** payload that may contain real tile ids for a private zone.

### `rejected`

```json
{ "type": "rejected", "reason": "full" }
```

| Reason | Meaning |
| --- | --- |
| `full` | all three guest seats are taken |
| `in-progress` | the match already started |
| `illegal` | the host rejected an action (wrong turn, wrong count, not in hand, not legal) |

### `closed`

Sent to every guest when the host leaves intentionally.

```json
{ "type": "closed", "reason": "host-left" }
```

Abrupt host closure has no message; guests detect the data-channel close.

### `pong`

```json
{ "type": "pong", "at": 1793989000000 }
```

Echo of a guest `ping`. The guest stores `Date.now() - at` as a rough clock offset; it is not used for turn timing.

## Guest → host

### `hello`

Sent once the data channel opens.

```json
{ "type": "hello", "name": "Bea", "protocol": 1, "rejoinToken": "" }
```

The host checks `rejoinToken` **first**. A valid token is matched to its seat
(host memory only) and reattaches the connection without a PIN or approval,
even while the match is running. Otherwise the host verifies the optional PIN
against an in-memory SHA-256 digest, then either queues the request (`pending`)
or rejects it. The host assigns the lowest free seat 1–3 only after approval. Names are trimmed to 18 characters; control characters and angle brackets are stripped. Empty names become `Guest n`.

`bad-pin`, `denied`, `busy`, `timeout`, `full`, `in-progress` and `suppressed` are `rejected` reasons; the host closes the connection after sending. Pending requests expire after 120 s. A started room queues a valid PIN request instead of rejecting `in-progress`; the host decides bot seat, viewer, deny or a 30-minute pause.

### `action`

The guest's intent. The host validates it with the same engine that validates local play.

```json
{ "type": "action", "kind": "lead", "tiles": ["r-advisor-0"], "reveal": false }
{ "type": "action", "kind": "follow", "tiles": ["b-soldier-2"], "reveal": true }
```

`tiles` must be ids that exist in **that seat's** hand. `reveal` is only consulted for `follow`. The host never trusts the guest's combo or score.

### `ping`

```json
{ "type": "ping" }
```

### `leave`

```json
{ "type": "leave" }
```

The host treats it like a disconnect: converts the seat to a bot mid-game, or frees the seat in the lobby.

## Seats and roster

A roster entry:

```json
{
  "seat": 0,
  "name": "Ana",
  "kind": "host",   // host | human | bot
  "connected": true,
  "bot": false
}
```

`kind` is authoritative for engine decisions. `connected` is informational. Empty seats are represented as `kind: "bot"` with a placeholder name until `startHostedMatch` fills them.

## Redaction invariants

1. A guest's own hand is real. Every other hand is `ghost-<seat>-<index>`.
2. A face-down centre entry from another seat is ghosted and has `combo: null`.
3. A hidden `log` entry from another seat has `combo: null`.
4. A hidden `lastTrick` entry from another seat has `combo: null`.
5. `hiddenTags`, `snapshot`, `selected` and `fast` are removed.
6. Captures are public and keep real ids.
7. `lastTrick.humanSeat` is rewritten to the recipient; `humanWon`, `humanRevealed`, `humanCombo` are recomputed for the recipient.
8. The host never sends the same payload object to two guests; `sanitizeForSeat` runs per recipient.

The mapping from real tile to ghost mesh is stable for the round. It is assigned in `dealRound` (`state.hiddenTags`) and restored by `undoLastTrick` from the snapshot.

## Client hydration

`hydrateRemoteState(raw)`:

- maps real ids through `TILE_BY_ID`;
- maps `ghost-*` ids to a back-only proxy `{ id, hidden: true, power: 1, color: "b", hanzi: "?" }`;
- converts `hands`, `captures` and `center.tiles`;
- keeps serialised combos (`score`, `color`, `type`) because the UI only needs comparison keys;
- clears `snapshot`, `selected`, `fast`, `mySeat` (the seat is global).

`applyRemoteState` preserves only the local selection that still exists in the local hand and only while it is that seat's turn.

## Authority invariants

- The host is the only writer of `state.hands`, `state.captures`, `state.center`, `state.scores` and `state.phase`.
- Guests never call `dealRound`, `leadTrick`, `submitPlay`, `resolveTrick`, `endRound` or `scheduleAI`.
- `saveMatch` is a no-op on a guest; a guest view is not resumable.
- `publishState` returns immediately unless `net.started` is true.
- A disconnected seat becomes a bot; the seat index never changes during a match.
- `beginMatch` resets the engine but not the lobby roster.

## Text chat

A guest sends `{type:"chat", text}`. The host:

1. finds the sender profile by `connId`;
2. rejects if the profile is missing or the sender wrote within 350 ms;
3. normalises whitespace, trims and caps at 200 characters;
4. appends one entry `{seat,name,text,at}` locally;
5. sends `{type:"chat", entry}` to every connected guest, including the sender.

The host's own `sendChat` skips step 1–3 and uses seat 0. The host includes the last 30 entries in `welcome.chat`. Rendering escapes text; there is no HTML chat. Chat is memory-only and cleared when the room closes.

## Hand arrangement

The order and position of a player's hand are visual, but every seat should see the same arrangement. Positions travel as coordinates only; tile identities never do.

A guest sends `{type:"hand-layout", slots}`. The host:

1. finds the sender profile by `connId` and ignores the message before `start`;
2. clamps each slot to the felt (radius `0.8 .. HAND_RADIUS + 0.55`, angle normalised) and caps the array at eight;
3. applies it to the sender's seat;
4. relays `{type:"hand-layout", seat, slots}` to the other guests.

`slots: null` clears the arrangement (the **Tidy hand** button). Slots are in **raw hand order**, so they map to the same hidden tiles on every client; after a play the owner republishes because the indices shift. Layouts are memory-only and cleared at every deal.

## Voice

Voice is **not** an envelope type and never travels over the data channel. It is a full mesh of PeerJS media calls:

- `peer.on("call")` is installed by `VoiceChat.attach`.
- The lexicographically larger peer ID initiates a call to the smaller one, so both sides agree.
- Only peers with roster `voice: true` are called.
- `voice-state` updates the host's roster and is rebroadcast via `lobby`.
- Incoming media calls are accepted **only** from a `peerId` already present in the approved roster; unknown peer IDs are closed immediately.
- The incoming media stream is attached to a hidden `<audio autoplay playsinline>` element; no base64 or JSON audio.
- Mic mute sets `localStream.getAudioTracks()[0].enabled = false`.
- Deafen sets `.muted = true` on every remote `<audio>`.
- An analyser per stream drives the speaking pulse; it is not connected to `destination`.

The broker only signals the media call. Game state remains on the data channel and is still host-authoritative.

## Abuse limits

- Host: 16 live data connections, 6 pending requests, 80 messages per 10 s per connection, 16 KB inbound envelope cap.
- Chat: 200 characters, 350 ms per guest.
- Actions: at most six tile IDs; the host re-validates ownership and legality.
- Voice: calls only from approved roster peer IDs.
- PIN: exactly 5 digits, deny-list/sequence checks, 8 wrong attempts -> 60 s room-wide lockout.

These are mitigation, not a DDoS guarantee.

## Versioning

`PROTOCOL_VERSION` is **1**. Add a field freely; remove or rename one only with a version bump and a matching `net.versionMismatch` path. The lobby shows a protocol error when the envelope version differs.
