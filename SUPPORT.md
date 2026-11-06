# Support

## I need help playing

- Read the in-app **Rules** drawer (`?` in the header).
- Read [docs/RULES.md](docs/RULES.md) and [docs/FAQ.md](docs/FAQ.md).
- If the coach says a set cannot beat the table, try **Hint** or play face-down and keep the set for a later lead.
- For a room, read [docs/MULTIPLAYER.md](docs/MULTIPLAYER.md). The host must keep the tab open; "Room not found" usually means the code is wrong or the host left.

## Chat or voice is not working

- Chat is only available in a room; the panel is hidden in solo.
- Voice needs HTTPS or localhost and microphone permission. Check the browser's site settings.
- **Mute mic** should stop your track without dropping the call; **Mute others** only deafens incoming audio.
- Echo is usually the room, not the app: headphones help. There is no noise gate or push-to-talk.
- If one peer is silent, leave and rejoin voice; a strict NAT can block media even when game data works.

## Multiplayer bug reports

Include:

1. Who was host and who was guest.
2. The room code (a dead code is fine).
3. Network type (home Wi-Fi, hotspot, corporate) and whether the two players were on different networks.
4. The lobby status text and any console error (`peer-unavailable`, `network`, `server-error`).
5. Whether the failure was joining, starting, a play, or a disconnect.

## I found a bug

Open an issue at <https://github.com/somphol/leab-tui-3d/issues> with:

1. Browser and version.
2. Viewport size (desktop or phone).
3. Steps to reproduce.
4. Expected and actual behaviour.
5. Console errors, if any.
6. A screenshot if it is visual.

Please do not include personal data, tokens or private URLs.

## I want a feature

Open a feature request with the problem it solves and the rule/UX consequence. Rule changes need a source and a test plan. See [docs/ROADMAP.md](docs/ROADMAP.md) for what is deliberately out of scope.

## I want to contribute

Read [CONTRIBUTING.md](CONTRIBUTING.md). The fastest useful contributions are accessibility fixes, physical-device testing and rule-source verification.

## Security

Do not open a public issue for a security problem. See [SECURITY.md](SECURITY.md).

## Licence

MIT. See [LICENSE](LICENSE). The traditional game and the Xiangqi tile names are not owned by this project; the rule source is cited in [docs/RULES.md](docs/RULES.md).
