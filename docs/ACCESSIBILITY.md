# Accessibility

## What is in place

- Semantic landmarks: `<header>`, `<main>`, `<section>`, `<aside>`, `<nav>`, `<footer>`.
- The 3D canvas has `role="img"` and an `aria-label`; the game is fully playable through the DOM hand list, action buttons and modals, so the canvas is not the only input.
- Icon-only buttons (`sound`, `rules`, `about`, camera tools) have `aria-label` and `title`.
- `#soundToggle` uses `aria-pressed`.
- The coach panel is `aria-live="polite"`; the HUD is `role="status" aria-live="polite"`; the toast layer is `aria-live="polite"`.
- Modals use `role="dialog" aria-modal="true"` and `aria-labelledby`, with a visible close button and an `Esc` handler. Focus is not trapped; this is a known gap.
- The hand list is a set of real `<button>` elements with `aria-pressed` and a tooltip naming the tile.
- Modals can be closed by clicking the backdrop (except the round summary, which requires a choice).
- Keyboard `H` for Hint and `Esc` for Clear.
- `prefers-reduced-motion` collapses CSS animations and transitions to 0.01 ms.
- Colour is never the only signal: every tile also has a Hanzi, a Thai/English name and a rank number. The inspector spells out the colour.
- Text contrast is high on the dark panels; gold on near-black is the primary combination.

## Known gaps

- **No focus trap or focus restore** in modals. `Tab` can reach the page behind an open dialog. A production pass should move focus to the dialog, loop within it, and restore the trigger on close.
- **No automated axe-core audit.** The DOM was reviewed manually; it has not been screened by a screen reader.
- **The 3D canvas is not navigable by keyboard.** The hand list is the accessible path; it mirrors the same selection state.
- **Live regions are chatty.** The coach updates on every action; a screen reader may queue several messages. Consider `aria-live="off"` on the meta line and a single polite summary.
- **Colour-blindness.** Red/black tiles are distinguished by Hanzi and by the inspector's written colour, not by hue alone. The red felt/gold text is decorative.
- **Motion.** The 3D scene still animates deals, flips and captures under reduced motion; only CSS transitions are shortened. A future option should snap tile positions.
- **Touch target size.** The mobile buttons are ~31 px high, below the 44 px recommendation. The hand chips are also small. Increase padding if you are targeting accessibility compliance.
- **Language.** The `<html lang>` and `data-lang` switch with the UI, and Thai text uses Thai fonts, but there is no `lang` attribute on individual Thai phrases inside the English UI.

## Testing recommendations

1. Run axe-core or Lighthouse Accessibility against `http://127.0.0.1:8123/`.
2. Tab through: header → HUD (not focusable) → camera tools → hand dock → panels → hand chips → footer.
3. Open the rules modal, tab, press `Esc`, confirm focus returns to the trigger (currently it does not; fix before claiming WCAG conformance).
4. Turn on VoiceOver/NVDA and play one trick using only the hand list and action buttons.
5. Enable Reduce Motion at the OS level and confirm the UI does not jump.
6. Test at 200 % browser zoom and at 390×844.

## Improvement backlog

- Focus trap/restore for modals.
- `aria-live` policy: announce only the coach headline, not every meta change.
- 44 px touch targets on phone.
- Tile list grouping by rank with headings.
- A “snap animations” preference for reduced motion.
- High-contrast theme option.
