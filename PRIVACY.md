# Privacy

Leab-Tui 3D is a static page. It has no account, no analytics, no advertising, no tracking pixels and no server-side storage.

## What is stored

In this browser's `localStorage`:

| Key | Contents |
| --- | --- |
| `leabtui.match.v1` | current match: hands, captures, centre, scores, log, history |
| `leabtui.prefs.v1` | language, sound, coach, tile-list visibility, cinema preference |
| `leabtui.stats.v1` | lifetime matches, wins, losses, draws, rounds, streaks, last 40 round summaries |
| `leabtui.name.v1` | the last multiplayer handle you typed (local only) |

This data never leaves the browser unless you press **Export JSON**, which writes a file locally, or you play a network match. There is no upload to a game server.

## Multiplayer

When you host or join a room:

- The **host** sends a redacted game state over a WebRTC data channel. Other hands are replaced by face-down placeholders; the host still sees every hand in its own browser.
- The **PeerJS public broker** (`0.peerjs.com`) is used only to exchange the initial WebRTC handshake. It sees connection metadata (peer IDs, IP-level metadata normal for signalling), not the game payload once the data channel is open.
- **STUN** servers (`stun.l.google.com`) are contacted for NAT traversal. They see your public IP, as any WebRTC application does.
- Room codes are random and are not published in a directory. Anyone with the code can try to join while the host page is open.
- The host's handle and the guests' handles are shared with everyone in the room.
- **Chat** messages are visible to the host and every guest and are kept in memory only.
- **Voice** is opt-in. The browser asks for microphone permission when you press **Join voice**. Audio flows directly between voice-active peers over encrypted WebRTC media; the host does not relay it and the app does not record it. PeerJS IDs of voice-active peers are shared so the mesh can connect. Public STUN sees your IP.
- **Room PIN** is sent by the guest over the encrypted data channel and stored by the host only as an in-memory SHA-256 digest. It is never in the invite URL, roster, exported game, or `localStorage`.
- **Copy room info** writes the room code, link and (if set) the PIN to the clipboard. Clipboard managers and the operating system may retain it; share only in a trusted channel and clear the clipboard if that matters.
- Closing the host tab ends the room. No game data is stored on a server.

The guest's `leabtui.name.v1` handle is never sent anywhere except the room you join. Clearing site data removes it.

## Network requests

The page requests:

1. Its own `index.html`, `style.css`, `script.js`, `peer-manager.js`, `favicon.svg`.
2. `https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js`.
3. `https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js` (and its internal imports).
4. Only when you open a room: `https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js`, then `https://0.peerjs.com` / `wss://0.peerjs.com` and public STUN.

There are no fonts, images, audio files, analytics or third-party APIs. The CDN and broker see the request metadata they normally see (IP address, user agent, referrer); that is a consequence of using them, not a feature of this app.

## Clearing your data

- Clear site data in the browser, or run `localStorage.clear()` in the console.
- Use a private window for a session that leaves no local history.
- The **Export JSON** file is the only copy that leaves the browser; delete it like any downloaded file.

## Children

The app collects no personal data and has no chat or user-generated content. It is suitable for classroom use, subject to local policy.

## Changes

If a future version adds accounts, analytics or a server, this document and the CSP must change before release. The current release is local-first by design.
