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
  "roomCode": "ABC234",
  "protocol": 1,
  "seat": 1,
  "hostName": "Ana",
  "players": [ { "seat": 0, "name": "Ana", "kind": "host", "connected": true, "bot": false }, ... ],
  "canStart": true
}
```

### `lobby`

Roster update while the room is open.

```json
{
  "type": "lobby",
  "roomCode": "ABC234",
  "hostName": "Ana",
  "players": [ ... ],
  "canStart": true,
  "started": false
}
```

### `start`

Sent immediately before the first `state` of a match.

```json
{
  "type": "start",
  "roomCode": "ABC234",
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
  "roomCode": "ABC234",
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
{ "type": "hello", "name": "Bea", "protocol": 1 }
```

The host assigns the lowest free seat 1–3. Names are trimmed to 18 characters. Empty names become `Guest n`.

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

## Versioning

`PROTOCOL_VERSION` is **1**. Add a field freely; remove or rename one only with a version bump and a matching `net.versionMismatch` path. The lobby shows a protocol error when the envelope version differs.
