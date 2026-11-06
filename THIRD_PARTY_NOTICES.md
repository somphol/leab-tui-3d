# Third-party notices

## Three.js

- Project: <https://threejs.org/>
- Version: r160 (`three@0.160.0`)
- Files loaded at runtime:
  - `https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js`
  - `https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/controls/OrbitControls.js`
- Licence: MIT
- Copyright: © 2010–2024 three.js authors

Three.js is not bundled; it is imported from jsDelivr under its own licence. A copy of the MIT licence is included with the upstream package. No modifications were made to Three.js.

## PeerJS

- Project: <https://peerjs.com/> · <https://github.com/peers/peerjs>
- Version: `1.5.4`
- Files loaded at runtime (only when a room is opened):
  - `https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js`
- Signalling broker: the free public PeerJS cloud at `0.peerjs.com` (not operated by this project)
- Licence: MIT
- Copyright: © 2015 Michelle Bu and Eric Zhang, and the PeerJS contributors

PeerJS is not bundled. The host and guest must use compatible versions; the app sends `protocol: 1` in the connection metadata and in every envelope. The broker is a shared community service with no uptime guarantee; see `docs/MULTIPLAYER.md` for self-hosting and TURN notes.

## Fonts

The application uses system font stacks only: Iowan Old Style, Palatino Linotype, Noto Serif Thai, Thonburi, Georgia, Avenir Next, Avenir, Sarabun, Noto Sans Thai, system-ui, SFMono-Regular, Cascadia Mono, Menlo, Consolas. No font files are redistributed and no remote font service is used.

## Xiangqi tile names

The Hanzi, rank names and counts are traditional game nomenclature, not copyrightable content. The Thai names and the historical rules are cited from public sources in `docs/RULES.md`.

## Rule source

Navee Angsuputiphant, “กฏกติกาการเล่น เลี๊ยบตุ่ย”, 22 March 2016, <http://naveea.blogspot.com/2016/03/blog-post.html>. Cited for the historical rules; the implementation and its interpretation notes are original work.

## Tooling

- Chrome DevTools Protocol, used by the verification harness. Chrome is not redistributed.
- Node.js built-ins only; no npm dependencies.
- Python's `http.server` for local serving and verification; not part of the shipped site.

## Cultural note

Leab-Tui is a traditional Thai game. This project is an independent, open-source teaching implementation. It is not affiliated with any publisher, temple fair, gambling operator or standards body. If you reuse the rules text or the interpretation notes, cite the source and this project.
