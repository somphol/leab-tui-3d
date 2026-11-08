# Performance

## Budget

| Resource | Count | Notes |
| --- | --- | --- |
| Tiles | 32 + 32 ghost back-only meshes | one shared cylinder geometry; 14 cached face textures (7 ranks × 2 colours); one shared back texture |
| Table | 1 top + rim + inlay + pedestal + foot + floor | 96-segment cylinder, 120-segment torus |
| Lights | 1 hemisphere, 1 ambient, 1 key directional (3D shadow), 1 rim directional, 1 spot (3D shadow), 2 points | 2048 and 1024 shadow maps, skipped entirely in 2D |
| Sprites | 3 AI labels + 1 hidden human label | canvas textures, redrawn on score change |
| Particles | 220 dust points | one buffer geometry |
| Animations | 32 real + 32 ghost tile records | position + flip records, no tween library |
| Draw calls | roughly 60–120 | no post-processing |

The scene is tiny by WebGL standards. In 3D the dominant costs are the two shadow maps and the 2048 px key light, not the tile count. The default 2D view disables the shadow pass, which removes that cost and the dark halos around tiles on iPad.

## Runtime behaviour

- One `renderer.setAnimationLoop`; no extra `requestAnimationFrame`.
- `dt` is clamped to 80 ms so returning to a background tab does not snap every lift or camera tween.
- `moveTile` skips a target within 0.004 units; `setFace` skips an identical face. Re-rendering the UI does **not** restart animations.
- Texture generation happens once at scene creation: 14 faces, 1 back, 1 felt (1024²), 1 wood (1024²). The initial deal is the most expensive frame.
- Pixel ratio is capped at 2. On a 3× phone this avoids 2.25× the fragment work for little visual gain.
- The table uses `MeshStandardMaterial`; no transmission, no clearcoat, no environment map.
- `prefers-reduced-motion` only affects CSS; Three.js timings are already short (≈520–760 ms).
- Theme changes regenerate three 1024²/512² CanvasTextures once and dispose the old maps. Text size is pure CSS (`--fs-scale`) with no render-loop cost.

## Network

- State payload per guest is a JSON snapshot of ~6–12 KB, sent on each host action (throttled to 40 ms). At normal trick speed this is a few KB/s.
- The host serialises and sanitises once per connected guest; with four humans that is three payloads per action.
- Guests do not run the AI or the scene deal; they hydrate and animate. Rendering cost is the same as solo.
- PeerJS + the broker are loaded only when a room opens. A solo page never requests them.

## Measured

Measurements were taken in headless Chrome on macOS (SwiftShader where GPU is unavailable). They are indicative, not a benchmark:

| Scenario | Observation |
| --- | --- |
| Boot to first frame | ~1.5–2.5 s including the Three.js CDN fetch |
| Deal animation | ~1.4 s for 32 tiles (17 ms stagger + 520 ms move) |
| Trick resolution | ~1.25 s including the capture sweep |
| Self-test (rules only) | < 100 ms once the page is loaded |
| Full round, fast mode | ~10–15 s (AI timers and 260 poll steps) |
| Screenshot run | ~16 s including the demo wait |

A desktop GPU should hold 60 fps comfortably. Headless SwiftShader is slower; no fps claim is made for software rendering.

## Optimisation opportunities

1. **Lower the shadow budget on mobile.** Detect `max-width: 640px` or a coarse pointer and use 1024/512 maps.
2. **Pause the loop when the tab is hidden.** `visibilitychange` already saves; it could also stop `setAnimationLoop`.
3. **Dispose textures on language/theme changes.** Currently nothing is regenerated after boot, so there is no leak; if you add themes, add `texture.dispose()`.
4. **Cache the coach string** while nothing has changed; it currently recomputes a small amount of text on every render.
5. **Avoid `clone` on large state** in the snapshot. The state is small (32 tiles + logs), but `structuredClone` on every trick is still a measurable allocation. A shallow ID snapshot would be cheaper.
6. **Instanced tiles** would cut draw calls, but 32 meshes is not the bottleneck; the complexity is not justified.
7. **Reduce texture size for the felt** to 512 on mobile; the medallion is soft anyway.
8. **Gate the voice meter when deafened** or when the chat panel is collapsed if you need to shave a few percent of CPU.

## Memory

- Deck/state: a few KB.
- Tile textures: 14 × 512² × 4 ≈ 14 MB uncompressed, plus mipmaps; the felt/wood 1024² textures add ~8 MB. This is the main memory cost.
- Geometry: negligible (shared cylinder, torus, planes).
- History is capped (40 stats entries, 20 round entries, 12 log entries rendered).
- No `ObjectURL` leaks: the export URL is revoked after 1.5 s.

## Mobile notes

The portrait layout uses a computed 2D fit and a compact dock. The canvas is 368×756 CSS px at 390×844, pixel ratio capped at 2. The whole rim is fitted to the stage with the HUD and dock reserves; the 3D hand still receives pointer events and the dock does not cover it after the compact CSS.

If you need a locked 60 fps on low-end phones, reduce the shadow maps and dust count first, then cap pixel ratio at 1.5.
