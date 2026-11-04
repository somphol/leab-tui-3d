# Privacy

Leab-Tui 3D is a static page. It has no account, no analytics, no advertising, no tracking pixels and no server-side storage.

## What is stored

In this browser's `localStorage`:

| Key | Contents |
| --- | --- |
| `leabtui.match.v1` | current match: hands, captures, centre, scores, log, history |
| `leabtui.prefs.v1` | language, sound, coach, tile-list visibility, cinema preference |
| `leabtui.stats.v1` | lifetime matches, wins, losses, draws, rounds, streaks, last 40 round summaries |

This data never leaves the browser unless you press **Export JSON**, which writes a file locally. There is no upload.

## Network requests

The page requests:

1. Its own `index.html`, `style.css`, `script.js`, `favicon.svg`.
2. `https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js`.
3. `https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js` (and its internal imports).

There are no fonts, images, audio files, analytics or third-party APIs. The CDN sees the request metadata it normally sees (IP address, user agent, referrer); that is a consequence of using a CDN, not a feature of this app.

## Clearing your data

- Clear site data in the browser, or run `localStorage.clear()` in the console.
- Use a private window for a session that leaves no local history.
- The **Export JSON** file is the only copy that leaves the browser; delete it like any downloaded file.

## Children

The app collects no personal data and has no chat or user-generated content. It is suitable for classroom use, subject to local policy.

## Changes

If a future version adds accounts, analytics or a server, this document and the CSP must change before release. The current release is local-first by design.
