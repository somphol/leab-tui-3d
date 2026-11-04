# Security policy

## Supported versions

| Version | Supported |
| --- | --- |
| 1.0.x | ✅ |
| < 1.0 | ❌ |

## Reporting a vulnerability

This is a static site with no server, account system, database or API keys. The realistic security surface is small:

- Cross-site scripting through user-controlled text (tile names are fixed; notes are not collected).
- A malicious saved game in `localStorage` (validated on load; malformed data falls back to a new match).
- A compromised or typo-squatted CDN path for Three.js.
- A dependency vulnerability in Three.js r160.

Please **do not open a public issue** for a vulnerability. Contact the maintainer privately through GitHub (profile: <https://github.com/somphol>) with:

1. The affected version and browser.
2. Reproduction steps or a proof of concept.
3. The impact and any suggested fix.
4. Whether you want credit.

You can expect an acknowledgement within a few days and a fix or mitigation as soon as is practical. There is no bug bounty.

## What is not a vulnerability

- The lack of online multiplayer, accounts or server-side validation.
- The lack of a focus trap in modals (an accessibility gap, tracked in `docs/ACCESSIBILITY.md`).
- The CDN being a runtime dependency (documented).
- `localStorage` being readable by the same origin (by design).
- The export JSON containing the current game (that is its purpose).

## Hardening notes

- The page uses a meta CSP. `script-src` permits `'unsafe-inline'` only for the import map; there are no inline event handlers.
- User-facing dynamic text is inserted with `textContent` or `escapeHTML`.
- Saved games are shape-checked; unknown tile IDs are rejected.
- No token, key or credential is stored in the repository or the app.
- The build process reads a GitHub credential from the OS keychain in memory and never writes it to disk or logs.

## Dependency updates

Three.js is pinned at `0.160.0`. To update:

1. Change the import map and `scripts/check.mjs` pin.
2. Re-run `node scripts/check.mjs` and `node scripts/verify.mjs`.
3. Re-check the colour space, light intensities, shadow behaviour and OrbitControls API.
4. Update `THIRD_PARTY_NOTICES.md` and `CHANGELOG.md`.
