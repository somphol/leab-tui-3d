# Deployment

## Local

```bash
cd leab-tui-3d
python3 -m http.server 8123
# http://127.0.0.1:8123/
```

`script.js` is an ES module, so it must be served over HTTP. Opening `index.html` with `file://` will be blocked by the browser's module/CORS rules in most cases.

The page needs `https://cdn.jsdelivr.net/npm/three@0.160.0/...` for the 3D table. Multiplayer also needs `https://cdn.jsdelivr.net/npm/peerjs@1.5.4/...` and the public broker at `https://0.peerjs.com` / `wss://0.peerjs.com`. Everything else is local: no fonts, no images, no audio files, no analytics, no API.

WebRTC data channels work on `http://127.0.0.1` and on any HTTPS origin. Pages is HTTPS, so no extra certificate work is needed.

## GitHub Pages

The repository is published by **`.github/workflows/pages.yml`** from **`main` / repository root**. `develop`,
`feature/*`, `release/*` and `hotfix/*` are never deployed directly; production changes reach Pages only through
the release merge.

1. Repository → **Settings → Pages** → Source: **GitHub Actions**.
2. Settings → Environments → `github-pages` → allow `main` and the preview branch (`feature/invite-friends`).
3. Merge the verified `release/x.y.z` branch (or a hotfix) into `main` and push `main`.
4. The workflow checks out `main` into `site/`, uploads the artifact and deploys it; the site is at
   `https://somphol.github.io/leab-tui-3d/`.
5. `.nojekyll` is present so files beginning with `_` are served verbatim and Jekyll does not process the site.

On a push to `feature/invite-friends`, the same workflow adds that branch under `site/preview/invite-friends/`
and publishes `https://somphol.github.io/leab-tui-3d/preview/invite-friends/`. It marks the preview `noindex` and
leaves production untouched. A later `main` build contains only the root, so the preview disappears after
promotion. See [BRANCHING.md](BRANCHING.md).

The included workflow `.github/workflows/static-check.yml` runs `node --check script.js`, `node --check
peer-manager.js` and `node scripts/check.mjs` on pushes and pull requests. It does not run `net-check.mjs`
because the public broker is an external dependency; run it before a multiplayer release. The Pages workflow is
the only publisher, so Settings must not also point at a branch.

## Install assets

`manifest.webmanifest`, `icons/icon-180.png`, `icons/icon-192.png`, `icons/icon-512.png` and `icons/icon-maskable-512.png` are static runtime assets. Add to Home Screen links to the live page; there is no service worker. Keep the manifest and icons in the repository root/`icons/` so GitHub Pages serves them.

## Cache busting

The runtime files are versioned in `index.html` and in the module imports:

```html
<link rel="stylesheet" href="style.css?v=1.10.2" />
<script type="module" src="script.js?v=1.10.2"></script>
```

`script.js` imports `peer-manager.js`, `voice-chat.js` and `security.js` with the same query. Bump all of them,
`APP.version` and `<meta name="app-version">` together on the release branch; `scripts/check.mjs` enforces the
match. The launch-page version guard also fetches `state.json` with `no-store` and reloads once if the cached
HTML and the deployed version disagree.

## CSP

`index.html` sends:

```text
default-src 'self';
script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:;
connect-src 'self' https://cdn.jsdelivr.net https://0.peerjs.com wss://0.peerjs.com;
font-src 'self' data:;
media-src 'self' data: blob:;
object-src 'none';
base-uri 'self';
form-action 'none'
```

`'unsafe-inline'` in `script-src` is required by the inline import map. There are no inline event handlers. If you move the import map to a supported external mechanism or use a hash, tighten this directive.

`style-src 'unsafe-inline'` is required for the few inline `style` attributes in generated HTML (for example the muted rank colour in the rules list). If you remove those, tighten it too.

GitHub Pages cannot set custom response headers. The meta CSP is the only policy; it is enforced by modern browsers for the document. Do not add a service worker or remote font without updating the policy and the verification.

## Multiplayer deployment

No server is deployed. The host's browser is the authoritative game process; PeerJS only performs signalling.

1. Deploy the same static files to Pages.
2. Confirm `peer-manager.js` is served (it is imported by `script.js`).
3. Confirm the CSP allows jsDelivr scripts and `0.peerjs.com` in `connect-src`.
4. Open the live page in two different networks (for example Wi-Fi and a phone hotspot) and run a two-human start.
5. Keep the host tab open for the whole match. Network rooms are deliberately not resumable after a reload.

If the public broker is unavailable, self-host a PeerJS server and change `host`/`port`/`secure` in `defaultPeerOptions()` and the CSP. The host and guest must use the same broker. A TURN relay must be added to `iceServers` for symmetric NAT; public STUN alone is the documented limit.

## Custom domain

1. Add a `CNAME` file at the repository root with the domain.
2. Configure the DNS record (CNAME to `somphol.github.io` for a subdomain; A/ALIAS records for an apex).
3. Enable **Enforce HTTPS** in Pages settings.
4. Update `APP.live`, `README.md`, `state.json` and the Open Graph URLs if the canonical URL changes.

## Rollback

Pages serves the branch. To roll back, revert the release commit on `main` and push; Pages rebuilds from the new HEAD. There is no database or server state to migrate.

## Release identity

- App version: `APP.version` in `script.js`.
- Save version: `APP.version` inside the save/export payload.
- Build record: `state.json`, `STATE.md`.
- Changelog: `CHANGELOG.md`.

`scripts/check.mjs` fails if the README badge, changelog heading and `state.json` version drift from `APP.version`.
