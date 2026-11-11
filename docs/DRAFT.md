# Draft deal (experimental)

Draft is an **optional, experimental** way to deal a round. It is **off by
default**: a normal table deals eight tiles to each seat automatically and the
game starts immediately.

Draft is **not** part of the Navee 2016 rule source. It is a deck-building
variant for players who want the deal to be a decision instead of luck. Do not
describe it as a standard Leab-Tui rule.

## How it works

1. The 32 tiles are shuffled into a public pool.
2. Seats pick **in turn**, starting after the dealer (clockwise by default, so
   seat 0 when the dealer is seat 3).
3. A pick takes **2 tiles** from the pool. Then the next seat picks.
4. After all four seats have picked, the cycle repeats. **Four cycles** give
   every seat **8 tiles**.
5. The seat holding the **red General** leads the first trick.

The turn order for picking follows `nextSeat`, so the direction setting applies.

## Turning it on

Only the host can change the mode, in three places:

- **Before the room / match** — the host panel in the lobby has
  *"Draft mode: pick 2 tiles ×4 (experimental)"*. It is stored in preferences
  and copied into the match when it starts.
- **At the table** — a **Draft: on/off** chip in the HUD (next to Last trick)
  toggles it without opening a panel. It is hidden for guests.
- **Actions** — *"Draft next deal (experimental)"* carries the same switch.

All three apply to the **next deal**, not to a hand already in play. Changing
the setting while a draft is running is allowed: the current draft finishes, and
the new setting takes effect on the following deal. Guests never see a toggle;
the host's state is authoritative and is published with the rest of the match
state.

In solo play a human always picks their own tiles. Bots pick automatically, one
seat at a time, and every pick (human or bot) is written to the live Turn log as
*"{seat} picked 2 tiles"* with a `D` time marker. That makes it explicit that
the bots are drafting too, rather than silently skipping their turns.

## Bots

The bot picks **two tiles uniformly at random** from the remaining pool. It does
not rank by power, does not read the human's hand and does not plan a
combination. The pool is public in this variant, so every seat can see the
available tiles; the random pick is a fairness/feel decision, not a hidden
information one.

With `?seed=123` in the URL (or `LeabTui.newMatch({ seed })`), the pool shuffle,
every bot draw and the round seeds are reproducible. The URL seed is now copied
into `state.seed` at boot, re-seeding `dealRound` before `startDraft`, so a
reload with the same URL deals the same pool and the bots make the same picks.
Human picks still change the pool, and a redraw uses a derived seed so it deals
a different hand.

## Interactions with the rest of the rules

- **No redraw (โละ) in draft mode.** The redraw rule exists to soften a bad
  random deal; a drafted hand is the player's own choice, so `canRedraw` returns
  false whenever draft mode is on.
- **Chuan, scoring, captures and reveal/showdown are unchanged.** The
  draft only replaces the deal.
- **Lead** is the red-General holder rather than the previous trick's winner.
  This is the same idea as the first-round lead rule, applied to each drafted
  round.
- **Resume** works mid-draft: the pool, order, cycle, current seat and hands are
  saved, and the draft modal reopens on reload. Network rooms are still not
  resumable.
- **Undo** is disabled during the draft (there is no resolved trick to rewind).

## Multiplayer

The host runs the draft, exactly like every other phase:

- A guest pick is sent as `{type:"action", kind:"draft", tiles:[id,id]}`.
- The host validates that it is that seat's turn and that both ids are still in
  the pool, then applies the pick, advances the seat and publishes the new
  state.
- The **pool is public** (it is the board, not a hand). Every guest receives the
  full pool plus their own hand; other hands stay ghosted through
  `sanitizeForSeat`.
- The pick is rejected if the seat is not current or a tile was already taken,
  so a double-click cannot take four tiles.

## Failure modes

- If a pick message is lost, the host is still waiting on that seat; the guest
  can resend after their local "waiting" state clears on the next publish.
- A guest who disconnects during their pick is converted to a bot and the bot
  completes the draft.
- A host who closes the room ends the draft with the room; there is no
  migration.

## Where it lives

| Concern | Code |
| --- | --- |
| Start / order / pool | `startDraft` |
| Validate and apply a pick | `draftPick` |
| Hand-over to play, red-General leader | `finishDraft` |
| Bot choice | `aiDraftPick` |
| Modal, selection, host toggles | `renderDraft`, `#draftModal`, `#draftChip`, `[data-draft-toggle]`, `setDraftMode` |
| Pick log | `draftPick` → `state.log` kind `draft` → `renderLog` (`log.draftPick`) |
| Network action | host `message.kind === "draft"` branch |
| Save / hydrate | `serializableState` / `hydrateRemoteState` (`draftPool`, `draftOrder`, `draftCycle`, `draftIndex`, `draftSeat`, `draftMode`) |
