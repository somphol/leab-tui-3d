# Contributing

Thanks for taking the time to improve Leab-Tui 3D. This is a small, deliberately dependency-free project; the best contributions are focused, tested and documented.

## Before you start

- Read [RULES.md](docs/RULES.md) and [ARCHITECTURE.md](docs/ARCHITECTURE.md).
- For a rule change, open an issue first. The rules are the product and the source is ambiguous in places.
- For a visual change, include a before/after screenshot.

## Setup

```bash
git clone https://github.com/somphol/leab-tui-3d.git
cd leab-tui-3d
python3 -m http.server 8123
# http://127.0.0.1:8123/
```

There is no install step and no build step.

## Verification

```bash
node --check script.js
node scripts/check.mjs
node scripts/verify.mjs      # needs Chrome; starts its own server if needed
```

Open `?selftest=1` and confirm `SELFTEST PASS 25/25`. If you add a check, update the count in `docs/TESTING.md` and the title assertion.

## Style

- Keep `script.js` as one ES module with the existing numbered sections. Do not add a framework or a bundler.
- Pure rules functions take and return plain data; no DOM, no Three.js.
- New UI copy goes into both `I18N.en` and `I18N.th`. The self-test checks symmetry.
- New mutable state belongs in `state`, `prefs` or `stats`; document it in `docs/DATA_FORMAT.md` if it is persisted.
- Use `serializableState` for any save, snapshot or export. Never persist live tile objects.
- Respect the pinned Three.js version. Do not float the CDN.
- No remote fonts, analytics, trackers or autoplay audio.
- British or American English is fine; be consistent within a file.

## Rule changes

A rule change must update all of:

1. `docs/RULES.md` (the contract).
2. `detectCombo` / `allCombos` / `comboPower` / `scorePiles` as needed.
3. Both `I18N` dictionaries and the rules modal.
4. `selfTest()` and, if it is a flow, the CDP playthrough.
5. `CHANGELOG.md`.

## Pull requests

- One logical change per PR.
- Include the commands you ran and their result.
- Include a screenshot for UI changes.
- Do not commit `node_modules`, local saves, Chrome profiles, `.DS_Store` or secrets.

## Licence

By contributing, you agree that your contribution is licensed under the MIT licence in [LICENSE](LICENSE).
