# Branching and the feature train

This project uses two permanent branches and short-lived work branches. **Do not start a feature from `main`.**
`main` is production; `develop` is the feature train where work accumulates and is verified before a release
leaves the station.

## Branch map

```text
feature/*  fix/*  docs/*                hotfix/*
      \          /                        |
       v        v                         v
      develop (feature train)           main (production, Pages, tags)
           \                              ^
            \---- release/x.y.z ----------/
                         |
                         +---- back-merge main -> develop
```

| Branch | Lives | Purpose | Deploys? |
| --- | --- | --- | --- |
| `main` | forever | Production. Only release and hotfix merges. Every commit is deployable and tagged at release. | **Yes**, GitHub Pages from the repository root |
| `develop` | forever | Feature train / integration. Features, fixes and docs land here first. May be ahead of production. | No |
| `feature/<slug>` | one change | New behaviour, branched from `develop`, merged back by PR. | No |
| `fix/<slug>` | one change | Non-urgent bug fix, branched from `develop`. | No |
| `docs/<slug>` | one change | Documentation or process-only change, branched from `develop`. | No |
| `release/<x.y.z>` | one release | Stabilisation and version bump, cut from `develop`. Only fixes, copy, docs and version strings — no new features. | No |
| `hotfix/<slug>` | one emergency | Production bug fix, cut from `main`, merged to `main` and back-merged to `develop`. | Via `main` |

## Start work

```bash
git fetch origin
git switch develop
git pull --ff-only
git switch -c feature/ipad-log-history
```

Never branch from `main` unless it is a hotfix. A feature branch that starts from `main` will miss the train
and make the release diff harder to review.

## While working

- Keep one logical change per branch.
- Commit in small steps; the branch name is the working record.
- Do **not** bump `APP.version`, the CSS/JS query strings or the docs version on a feature branch. The release
  branch owns the version bump, so parallel features never fight over the same strings.
- Rebase on the train before opening the pull request:

```bash
git fetch origin
git rebase origin/develop
```

- Run the checks that match the change (see the table below).
- Update `AGENTS.md` when the change alters a command, invariant or architecture boundary. Update `CHANGELOG.md`
  under `## [Unreleased]` for user-visible behaviour.
- Open the pull request against **`develop`**, never `main`.

## Release train

When the train is ready to ship:

```bash
git switch develop
git pull --ff-only
git switch -c release/1.9.23
```

On the release branch:

1. Bump every version string together: `APP.version`, `<meta name="app-version">`, `style.css?v=`, `script.js?v=`,
   the three module imports, `CITATION.cff`, `README` badge, `STATE.md`, `state.json` and the docs that quote the
   export version.
2. Move `CHANGELOG.md` entries from `## [Unreleased]` into `## [1.9.23] — YYYY-MM-DD`.
3. Run the full gate: `node --check`, `scripts/check.mjs`, `scripts/verify.mjs`, and `scripts/net-check.mjs` for
   anything touching multiplayer or the wire. Run the live suite after Pages deploys.
4. Commit as `Release Leab-Tui 3D 1.9.23: <summary>`.

Merge to `main` with a merge commit so the release point stays visible:

```bash
git switch main
git pull --ff-only
git merge --no-ff release/1.9.23 -m "Release Leab-Tui 3D 1.9.23"
git push origin main
git tag -a v1.9.23 -m "Leab-Tui 3D 1.9.23"
git push origin v1.9.23
```

Then back-merge production into the train so the next feature starts from the released tree:

```bash
git switch develop
git merge --no-ff main -m "Back-merge v1.9.23 into develop"
git push origin develop
git branch -d release/1.9.23
git push origin --delete release/1.9.23
```

Never force-push `main` or `develop`.

## Hotfix

A production bug does not wait for the train.

```bash
git switch main
git pull --ff-only
git switch -c hotfix/pin-focus
# smallest possible fix, patch version bump, checks
git switch main
git merge --no-ff hotfix/pin-focus -m "Hotfix: restore PIN focus"
git tag -a v1.9.23 -m "Leab-Tui 3D 1.9.23"
git push origin main v1.9.23
git switch develop
git merge --no-ff main -m "Back-merge hotfix v1.9.23"
git push origin develop
```

A hotfix must be merged back to `develop` in the same session, or the next release will reintroduce the bug.

## Preview deployments

A feature branch does not replace production. `.github/workflows/pages.yml` builds one Pages artifact:

```text
/                                  main (production)
/preview/invite-friends/           feature/invite-friends
```

A push to `feature/invite-friends` publishes the preview at
`https://somphol.github.io/leab-tui-3d/preview/invite-friends/` while the root keeps serving `main`. A push to
`main` (or a manual run on `main`) rebuilds only the root, so the preview disappears when the feature is
promoted. The preview copy gets `<meta name="robots" content="noindex">`.

This needs **Settings → Pages → Source: GitHub Actions** and the `github-pages` environment must allow the
preview branch (or any branch). Test the preview with the same commands, changing `BASE_URL`:

```bash
BASE_URL="https://somphol.github.io/leab-tui-3d/preview/invite-friends/" node scripts/net-check.mjs
BASE_URL="https://somphol.github.io/leab-tui-3d/preview/invite-friends/" node scripts/invite-check.mjs
```

The preview carries the release-candidate version (`1.10.1`) so testers can see which build they are on; the release branch still owns the final tag. Label it as a
preview of the next release in the PR.

## Verification by branch

| Branch | Minimum gate |
| --- | --- |
| `feature/*`, `fix/*` | `node --check`, `node scripts/check.mjs`, the targeted `verify.mjs` path; full `verify.mjs` for UI, scene, rules or camera changes |
| `docs/*` | `node scripts/check.mjs` (links, required files, version identity) |
| `release/*` | Full `check.mjs`, `verify.mjs`, `net-check.mjs`; live `net-check.mjs` after Pages; physical iPad pass for layout changes |
| `hotfix/*` | `check.mjs` plus the smallest reproducing browser check; full `verify.mjs` if the fix touches shared code |
| After merge to `main` | Confirm the Pages version, `?selftest=1`, and one live smoke test |

## Pull request rules

- Base branch is `develop` for features, fixes and docs; `main` only for `release/*` and `hotfix/*`.
- One logical change per PR. Include the commands you ran and their result.
- Include a before/after screenshot for visual changes.
- Do not commit `node_modules`, Chrome profiles, local saves, `.DS_Store` or secrets.
- Docs and `AGENTS.md` ship in the same PR as the behaviour they describe.
- A solo maintainer may self-approve, but still uses the branch and records the checks. The branch boundary is
  the audit trail, not the approval click.

## Recommended repository settings

On GitHub, protect both permanent branches:

- Require a pull request before merging; require the `static-check` workflow to pass.
- Block force pushes and branch deletion for `main` and `develop`.
- Keep `main` as the default branch for visitors and Pages; `develop` is the working default for contributors.
- Enable auto-delete for merged head branches.
- Tag every production release with `vX.Y.Z`; the tag points at the `main` merge commit.

## Bootstrap note

`develop` was created from `main` at release 1.9.22. This document itself travelled through
`feature/branching-workflow` → `develop` → `main` as the bootstrap exception; from the next change onward,
work starts from `develop`. Purely documentary changes may merge to `main` without a version bump when they do
not alter runtime files, but they still use a branch instead of a direct commit.
