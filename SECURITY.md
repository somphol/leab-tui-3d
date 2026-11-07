# Security policy

## Supported versions

| Version | Supported |
| --- | --- |
| 1.6.x | ✅ |
| < 1.6 | ❌ |

## Threat model

Assume the attacker has read this repository and knows the protocol, message names, PeerJS IDs, room-code format and PIN policy. Nothing here relies on obscurity.

| Asset | Risk | Control |
| --- | --- | --- |
| Other players' hands | A guest reads them from the wire | Host-authoritative redaction (`sanitizeForSeat`); only own hand and public captures are real |
| The host browser | A stranger joins, floods it, or tries to run code | Room code + PIN + **host approval**, connection/message/payload caps, escaped text, no `eval`/`innerHTML` for peer input |
| Seat ownership | A guest acts for another seat | Actions are tied to the sender's `connId` profile and re-validated by the host |
| Room availability | A stranger opens many connections or floods actions/chat | 16-connection cap, 6 pending requests, 80 messages/10 s per connection, 16 KB payload cap, 350 ms chat limit |
| Voice mesh | A stranger calls the deterministic host peer id | Media calls are accepted only from peer IDs already in the approved roster |
| PIN | Offline guessing from source or online guessing | 5 digits, deny-list + sequence checks, SHA-256 digest in memory, 8-attempt lockout |
| Chat | XSS or impersonation | `escapeHTML`/`textContent`, 200-char cap, sender profile, host relay |
| Saved game | Malformed JSON | Shape/ID validation; malformed saves start a new match |

## Lobby gate

1. The host generates a room number (six digits, `482-173`).
2. A 5-digit PIN is generated when the room opens; **New PIN** rotates it. The PIN is **never in the invite URL**, never in the roster, never in `localStorage`, and never in the exported game.
3. A guest sends the room code, name and PIN over the encrypted WebRTC data channel.
4. The host verifies the PIN against an in-memory SHA-256 digest and then puts the request in the **approval queue**.
5. The host approves or denies each request. Only after approval is a seat assigned and a `welcome` sent.
6. Pending requests expire after 120 seconds. Denied, wrong-PIN and expired connections are closed.

The PIN is a **gate**, not authentication. Host approval is the real access-control decision. A determined attacker with the room code can still knock; they cannot get a seat without the host's click.

## PIN policy

- Exactly 5 digits.
- Rejected if it is in the bundled common-PIN deny-list, is one repeated digit, or is an obvious sequence.
- The host stores only `SHA-256(PIN)` in memory. The plain PIN is shown once in the host panel so it can be copied; it is never stored in app state, the roster, an export or localStorage.
- **New PIN** creates a fresh 5-digit PIN. The first PIN is generated automatically.
- **A 5-digit PIN is not strong authentication.** There are only 100,000 values. It is a convenience gate; host approval is the real access-control decision. Keep approval on for any room you do not fully trust.
- **Copy room info** includes the PIN and the link. Share it only in a trusted channel; for maximum separation, send the link and the PIN in different channels.
- Eight wrong attempts trigger a 60-second room-wide lockout.
- Changing the PIN affects future joins, not already-approved guests.

The policy and deny-list are public. They raise online guessing cost; they are not a substitute for approval, and a short human-chosen PIN is still weak. There is no account lockout, MFA or identity proof.

## Denial-of-service controls

- Host accepts at most **16** simultaneous data connections; rejected connections are closed.
- At most **6** pending approval requests.
- At most **4** human seats (the game's rule contract).
- **80 messages / 10 s** per connection, then the connection is closed.
- Inbound envelopes over **16 KB** are dropped and closed.
- Chat is 200 characters and limited to one message per **350 ms** per guest.
- Actions are limited to six tile IDs and validated by the engine.
- Voice calls from peer IDs not in the approved roster are closed immediately.
- The host tab remains a single point of failure: a browser crash or deliberate close ends the room. There is no server to absorb a flood.

These are mitigation, not a DDoS guarantee. A network-level flood against the public broker or the host's IP is outside the app's control.

## Reporting a vulnerability

This is a static site with no game server, account system, database or API keys. Realistic issues include:

- Cross-site scripting through a handle or chat message.
- A bypass of host approval, seat ownership or redaction.
- A way to crash the host with a small message.
- A voice call accepted from an unapproved peer.
- A compromised CDN path for Three.js or PeerJS.
- A dependency vulnerability in Three.js r160, PeerJS 1.5.4 or the browser media stack.

Please **do not open a public issue** for a vulnerability. Contact the maintainer privately through GitHub (profile: <https://github.com/somphol>) with:

1. The affected version and browser.
2. Reproduction steps or a proof of concept.
3. The impact and any suggested fix.
4. Whether you want credit.

You can expect an acknowledgement within a few days and a fix or mitigation as soon as practical. There is no bug bounty.

## What is not a vulnerability

- The host being able to see every hand (that is how an authoritative peer works).
- A guest being able to inspect its own client memory.
- Chat being visible to the host and every guest (that is the feature).
- Voice being peer-to-peer with no recording.
- The lack of accounts, MFA, anti-cheat, profanity filtering, moderation or a report queue.
- The lack of a TURN relay or host migration.
- The source being public. The controls above are designed to survive that.
- The lack of a focus trap in modals (an accessibility gap; see `docs/ACCESSIBILITY.md`).
- The CDN and PeerJS broker being runtime dependencies.
- A PIN copied to the clipboard by the host (that is the explicit Copy room info action).

## Hardening notes

- CSP: `script-src` allows `'unsafe-inline'` only for the inline import map; `connect-src` is limited to self, jsDelivr, `https://0.peerjs.com` and `wss://0.peerjs.com`.
- Peer input is rendered with `textContent`/`escapeHTML`; chat has no HTML mode.
- Host actions are re-validated; guest messages never carry a trusted combo.
- `sanitizeForSeat` is the only privacy boundary; `hiddenTags` is stripped from every payload and save.
- Voice is opt-in, requires a user gesture, and checks the roster before answering a media call.
- No token, key or credential is stored in the repository or the app.
- The build reads a GitHub credential from the OS keychain in memory and never writes it to disk or logs.

## Dependency updates

Three.js is pinned at `0.160.0`; PeerJS at `1.5.4`. To update either:

1. Change the import map / `PEERJS_CDN` and the pin check in `scripts/check.mjs`.
2. Re-run `node scripts/check.mjs`, `node scripts/verify.mjs` and `node scripts/net-check.mjs`.
3. Re-check colour space, light intensities, shadow behaviour, OrbitControls API, PeerJS connection events and serialisation.
4. Update `THIRD_PARTY_NOTICES.md`, `CHANGELOG.md` and the CSP if the peer host changes.
