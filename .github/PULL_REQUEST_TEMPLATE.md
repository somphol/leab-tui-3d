## Base branch

- [ ] This PR targets `develop` (features, fixes, docs) **or** is a `release/*` / `hotfix/*` PR targeting `main`.

## What changed

<!-- One or two sentences. Link the issue. -->

## Why

<!-- The rule/UX consequence. -->

## Verification

- [ ] `node --check script.js`
- [ ] `node scripts/check.mjs`
- [ ] `node scripts/verify.mjs` (or explain why not)
- [ ] `?selftest=1` shows `SELFTEST PASS 38/38`
- [ ] Screenshot for UI changes
- [ ] `npm`-free: no build step or generated runtime source added

## Rule / architecture changes

- [ ] `docs/RULES.md` updated
- [ ] `detectCombo` / comparison / scoring updated
- [ ] EN and TH dictionaries updated
- [ ] self-test updated
- [ ] `AGENTS.md` updated for a changed command, invariant or architecture boundary
- [ ] `CHANGELOG.md` updated under `## [Unreleased]` (or the release section on `release/*`)

## Branch hygiene

- [ ] Branched from `develop`, not `main` (except hotfix/release)
- [ ] Version strings were **not** bumped on this branch (release branch only)
- [ ] Rebased on `origin/develop` and CI is green
