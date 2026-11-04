# Deployment

## Local

```bash
cd leab-tui-3d
python3 -m http.server 8123
# http://127.0.0.1:8123/
```

`script.js` is an ES module, so it must be served over HTTP. Opening `index.html` with `file://` will be blocked by the browser's module/CORS rules in most cases.

The page needs `https://cdn.jsdelivr.net/npm/three@0.160.0/...` for the 3D table. Everything else is local: no fonts, no images, no audio files, no analytics, no API.

## GitHub Pages

The repository is published from **`main` / repository root**.

1. Push `main`.
2. Repository → **Settings → Pages** → Source: **Deploy from a branch** → Branch: `main` → Folder: `/ (root)`.
3. Wait for the Pages build; the site is at `https://somphol.github.io/leab-tui-3d/`.
4. `.nojekyll` is present so files beginning with `_` are served verbatim and Jekyll does not process the site.

The included workflow `.github/workflows/static-check.yml` runs `node --check script.js` and `node scripts/check.mjs` on pushes and pull requests. It does not deploy; Pages deploys from the branch, which keeps the release simple and avoids a second source of truth.

If you prefer Actions-based Pages deployment, add `actions/configure-pages`, `actions/upload-pages-artifact` and `actions/deploy-pages`; the artifact path is the repository root. If you do, remove the branch deployment in Settings to avoid two publishers.

## Cache busting

The source files are referenced without a query string:

```html
<link rel="stylesheet" href="style.css" />
<script type="module" src="script.js"></script>
```

GitHub Pages serves them with a short cache. After a release, a hard reload (`Cmd/Ctrl + Shift + R`) may be needed. If you need deterministic cache busting, append `?v=1.0.0` to both references and update them with every version. The current release keeps clean URLs and relies on the Pages cache headers; the README and `state.json` carry the version.

## CSP

`index.html` sends:

```text
default-src 'self';
script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:;
connect-src 'self' https://cdn.jsdelivr.net;
font-src 'self' data:;
media-src 'self' data: blob:;
object-src 'none';
base-uri 'self';
form-action 'none'
```

`'unsafe-inline'` in `script-src` is required by the inline import map. There are no inline event handlers. If you move the import map to a supported external mechanism or use a hash, tighten this directive.

`style-src 'unsafe-inline'` is required for the few inline `style` attributes in generated HTML (for example the muted rank colour in the rules list). If you remove those, tighten it too.

GitHub Pages cannot set custom response headers. The meta CSP is the only policy; it is enforced by modern browsers for the document. Do not add a service worker or remote font without updating the policy and the verification.

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
