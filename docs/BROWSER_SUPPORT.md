# Browser support

## Verified

| Browser | Version | Platform | Result |
| --- | --- | --- | --- |
| Google Chrome | current stable (headless) | macOS arm64 | ✅ boot, 38/38 self-test, full round, screenshots |
| Google Chrome | 390×844 device metrics | macOS headless | ✅ responsive layout and hand dock |

## Expected to work

These use the same standards (ES modules, import maps, WebGL 2, CanvasTexture, Web Audio, localStorage) but were not individually run for this release:

- Microsoft Edge (Chromium) 111+
- Safari 16.4+ (import maps and ES modules; WebGL 2)
- Firefox 108+ (import maps and WebGL 2)
- Chrome for Android 111+
- Safari on iOS 16.4+

## Requirements

- **WebGL 2** for the table. Without it, `#bootError` appears and the DOM panels remain usable.
- **ES modules + import maps** for the pinned Three.js import. Very old browsers fail to load `script.js`; there is no transpiled fallback.
- **Network access to `cdn.jsdelivr.net`** for Three.js r160. Multiplayer also loads PeerJS 1.5.4 from the same CDN and contacts `0.peerjs.com` for signalling. No other remote request is made.
- **WebRTC data channels** for multiplayer. Chrome, Edge, Firefox and Safari support the reliable ordered channel; older Safari may need a recent version.
- **PIN hashing** uses WebCrypto SHA-256 and needs HTTPS or localhost. Without it the host can still use approval but cannot set a PIN.
- **Microphone/media** is requested only when the player presses **Join voice**. It needs HTTPS or localhost plus `navigator.mediaDevices.getUserMedia`. Denying it leaves chat and the game usable. No camera permission is requested.
- **localStorage** for autosave; if denied, the game still runs but does not persist.
- **AudioContext** for sound; browsers require a user gesture before it starts.

## Not supported

- Internet Explorer.
- Browsers without import-map support (Chrome < 89, Safari < 16.4, Firefox < 108) without a bundler rewrite.
- `file://` opening for the module; serve over HTTP.
- Devices without WebGL 2 for the 3D view (the rest of the UI still works).

## iPad / iPhone full screen

Add to Home Screen (Chrome or Safari) uses `manifest.webmanifest` and the Apple standalone meta tags; the browser chrome is removed. Display → Full screen works where the Fullscreen API exists; Chrome iPad does not expose it for a normal page. Guided Access is the kiosk option. No service worker/offline mode.

## Known environment notes

- **Headless Chrome on macOS** logs `CVDisplayLinkCreateWithCGDisplay failed`; this is a display-link warning from the headless backend, not an app error. The harness ignores it.
- **SwiftShader** (software WebGL) is used when no GPU is available. The scene renders, but frame rate is not representative.
- **Chrome autoplay policy** blocks an `AudioContext` created before a gesture. The code waits for the first pointer/key event; if you add an auto-playing sound, expect a console warning.
- **GitHub Pages caching** may serve a previous `script.js` after a release. Hard-reload if the version badge and behaviour disagree.
- **Android Chrome ICE failure.** Some Wi-Fi paths reach `ice-checking` and then time out (`host-timeout`) even though iPad and desktop join the same room. The build is STUN-only. See issue [#1](https://github.com/somphol/leab-tui-3d/issues/1) for the probe report, workarounds and TURN options.

## Testing a new browser

1. Serve the folder over HTTP.
2. Open `?selftest=1`; expect `SELFTEST PASS 38/38`.
3. Open the page, orbit, select a tile, lead/follow one turn.
4. Check the inspector, rules modal, language toggle, export and reload.
5. On mobile, check 390×844 and a landscape orientation; confirm the hand is not behind the dock.
6. For iPad, run the emulated pass first: `node scripts/browser-check.mjs --url "http://127.0.0.1:8123/?mode=solo" --device ipad --orientation portrait --wait 6000 --eval "LeabTui.getFraming()"`, then repeat with `--orientation landscape`. Confirm `fits` and `clearOfDock` are true and that 2D reports `shadows: false`; then check a physical iPad for Safari toolbar and safe-area behaviour.
7. Record the result here with the browser version and platform.
