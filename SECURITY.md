# Security policy

## Supported versions

| Version | Supported |
| --- | --- |
| 1.4.x | ✅ |
| < 1.4 | ❌ |

## Reporting a vulnerability

This is a static site with no game server, account system, database or API keys. Multiplayer adds a WebRTC data channel and the public PeerJS signalling broker. The realistic security surface is:

- Cross-site scripting through user-controlled text (handles are trimmed and escaped; tile names are fixed).
- A malicious saved game in `localStorage` (validated on load; malformed data falls back to a new match).
- A compromised or typo-squatted CDN path for Three.js or PeerJS.
- A dependency vulnerability in Three.js r160 or PeerJS 1.5.4.
- A malicious host, or a guest inspecting their own client; the host is trusted by design and redaction only protects the wire.
- Denial of service by a guest flooding `action` or `chat` messages (actions are validated; chat is capped at 200 chars and 350 ms).
- Microphone permission and browser media handling. Voice is opt-in; the app never opens the mic on load.
- Unmoderated chat. Text is escaped before rendering, but there is no profanity filter, block list or report flow.
- Voice mesh metadata: every active speaker learns the PeerJS IDs of the other active speakers. Audio is DTLS-SRTP encrypted in transit.

Please **do not open a public issue** for a vulnerability. Contact the maintainer privately through GitHub (profile: <https://github.com/somphol>) with:

1. The affected version and browser.
2. Reproduction steps or a proof of concept.
3. The impact and any suggested fix.
4. Whether you want credit.

You can expect an acknowledgement within a few days and a fix or mitigation as soon as is practical. There is no bug bounty.

## What is not a vulnerability

- The lack of accounts or server-side validation.
- The host being able to see every hand (that is how an authoritative peer works).
- Chat messages being visible to the host and every guest (that is the feature).
- Voice being peer-to-peer with no recording (the app does not record; the browser/OS may still have its own controls).
- A guest being able to read its own client memory.
- The lack of a focus trap in modals (an accessibility gap, tracked in `docs/ACCESSIBILITY.md`).
- The CDN and the PeerJS broker being runtime dependencies (documented).
- `localStorage` being readable by the same origin (by design).
- The export JSON containing the current game (that is its purpose).

## Hardening notes

- The page uses a meta CSP. `script-src` permits `'unsafe-inline'` only for the import map; there are no inline event handlers. `connect-src` is limited to the app origin, jsDelivr and the PeerJS broker.
- User-facing dynamic text is inserted with `textContent` or `escapeHTML`; handles are capped at 18 characters.
- Saved games are shape-checked; unknown tile IDs are rejected.
- Guest actions are re-validated by the host engine, never trusted as combos.
- Chat is escaped, length-capped and host-rate-limited; voice is opt-in and uses `getUserMedia` only after a click.
- Private hands are redacted per recipient with `sanitizeForSeat`; the host-only `hiddenTags` map is stripped from every payload and save.
- No token, key or credential is stored in the repository or the app.
- The build process reads a GitHub credential from the OS keychain in memory and never writes it to disk or logs.

## Dependency updates

Three.js is pinned at `0.160.0`; PeerJS at `1.5.4`. To update either:

1. Change the import map / `PEERJS_CDN` and the pin check in `scripts/check.mjs`.
2. Re-run `node scripts/check.mjs`, `node scripts/verify.mjs` and `node scripts/net-check.mjs`.
3. Re-check colour space, light intensities, shadow behaviour, OrbitControls API, PeerJS connection events and serialisation.
4. Update `THIRD_PARTY_NOTICES.md`, `CHANGELOG.md` and the CSP if the peer host changes.
