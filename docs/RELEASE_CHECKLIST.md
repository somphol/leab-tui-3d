# Release checklist

## Before the release commit

- [ ] `APP.version` bumped in `script.js`.
- [ ] `CHANGELOG.md` has a `## [x.y.z]` section with the date and changes.
- [ ] README badge and live URL match the version.
- [ ] `state.json` version matches `APP.version`; duration and tokens updated.
- [ ] `STATE.md` reflects the same numbers and the actual verification results.
- [ ] `node --check script.js` and `node --check peer-manager.js` pass.
- [ ] `node scripts/check.mjs` passes.
- [ ] `?selftest=1` shows `SELFTEST PASS 38/38`.
- [ ] `node scripts/verify.mjs` passes (boot, scene, full round, no exceptions).
- [ ] `node scripts/net-check.mjs` passes on a real network (PIN, approval, wrong PIN, host, join, redaction, chat, voice, mic mute, deafen, disconnect-to-bot).
- [ ] A full round, undo, next round and reload were exercised manually.
- [ ] EN and TH screenshots regenerated if UI or copy changed.
- [ ] Lobby screenshot regenerated if the multiplayer UI changed.
- [ ] Two-browser smoke test: host + guest on different networks, one guest disconnect, seat becomes a bot.
- [ ] Microphone permission and voice mesh tested in at least two real browsers; mute and deafen checked independently.
- [ ] Host approval on/off, generated PIN, Copy room info, wrong PIN and pending expiry checked.
- [ ] PIN appears in no URL, roster, export, localStorage or log.
- [ ] Chat text escaped, length-capped and visible to host and guest.
- [ ] Mobile screenshot at 390×844 checked; hand not hidden by the dock.
- [ ] Rules modal checked in both languages.
- [ ] No console errors and no autoplay warnings.
- [ ] No secrets, tokens, personal paths or private data in the diff.
- [ ] `AGENTS.md` still describes the current architecture and commands.
- [ ] `docs/RULES.md` matches `detectCombo` and the self-test.
- [ ] Licence and third-party notices current.

## Commit

```bash
git status
git diff --stat
git add -A
git commit -m "Release Leab-Tui 3D 1.9.17"
git push origin main
```

Use one release commit if possible. Do not commit `node_modules`, local saves, screenshots with personal data, or the Chrome profile.

## After the push

- [ ] GitHub Actions static check is green.
- [ ] Pages deployment succeeded (Settings → Pages shows the live URL).
- [ ] Open the live URL and repeat the smoke test: boot, selftest, one trick, language toggle, export.
- [ ] Check the live page over HTTPS and confirm there is no mixed content.
- [ ] Confirm the repository is public and contains no secrets.
- [ ] Tag the release: `git tag -a v1.9.17 -m "Leab-Tui 3D 1.9.17" && git push origin v1.9.17`.
- [ ] Create a GitHub release with the changelog and the hero screenshot.
- [ ] Verify the Open Graph image path resolves on Pages.
- [ ] Update the README “Live demo” link if the Pages URL changed.
- [ ] Archive the session transcript if that is part of your workflow.

## Rollback

1. Revert the release commit on `main`.
2. Push.
3. Wait for Pages to rebuild.
4. Verify the live URL and the selftest.
5. If the failure is in the CDN pin, restore the previous `three@` version in the import map and re-run the browser check.

## Release evidence to keep

- `screenshots/hero.jpg`, `thai.jpg`, `mobile.jpg`, `rules.jpg`, `lobby.jpg`.
- The exact commands and output of `scripts/check.mjs`, `scripts/verify.mjs` and `scripts/net-check.mjs`.
- The self-test title (`SELFTEST PASS 38/38`).
- `state.json` with the measured duration and tokens.
- The live URL and the commit SHA.
