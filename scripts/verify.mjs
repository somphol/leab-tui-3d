#!/usr/bin/env node
/**
 * Headless verification for Leab-Tui 3D.
 *
 *   python3 -m http.server 8123 &
 *   node scripts/verify.mjs
 *
 * Starts a temporary server when one is not already listening, runs the
 * in-page 35-check suite, then plays a complete round through the public API.
 * Fails on console exceptions, rule failures, or lost tiles.
 */

import { spawn, execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const port = 8123;
const base = `http://127.0.0.1:${port}/`;
const soloBase = `${base}?mode=solo`;
const failures = [];
let server = null;

function pass(label) { console.log(`PASS ${label}`); }
function fail(label, detail = "") { failures.push(`${label}${detail ? ` — ${detail}` : ""}`); console.error(`FAIL ${label}${detail ? ` — ${detail}` : ""}`); }

async function listening() {
  try {
    const response = await fetch(base, { signal: AbortSignal.timeout(1000) });
    return response.ok;
  } catch {
    return false;
  }
}

async function ensureServer() {
  if (await listening()) return;
  server = spawn("python3", ["-m", "http.server", String(port)], { cwd: root, stdio: "ignore" });
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await new Promise((resolvePromise) => setTimeout(resolvePromise, 150));
    if (await listening()) return;
  }
  throw new Error(`Could not start an HTTP server on ${base}`);
}

function runHarness(args) {
  const output = execFileSync(process.execPath, ["scripts/browser-check.mjs", ...args], {
    cwd: root,
    encoding: "utf8",
    timeout: 120000,
    env: { ...process.env }
  });
  const start = output.indexOf("{");
  const end = output.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("Browser harness returned no JSON report");
  return JSON.parse(output.slice(start, end + 1));
}

const playthrough = `(async () => {
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  LeabTui.setFast(true);
  for (let step = 0; step < 260; step += 1) {
    await wait(60);
    const s = LeabTui.getState();
    if (s.phase === 'roundEnd' || s.phase === 'matchEnd') {
      const captures = s.captures.reduce((n, p) => n + p.length, 0);
      const hands = s.hands.reduce((n, h) => n + h.length, 0);
      return JSON.stringify({
        ok: true,
        phase: s.phase,
        trick: s.trick,
        captures,
        hands,
        points: s.roundPoints,
        pointSum: s.roundPoints.reduce((a, b) => a + b, 0),
        scores: s.scores
      });
    }
    if (s.turn === 0 && s.phase === 'lead') {
      LeabTui.hint();
      LeabTui.lead(LeabTui.getState().selected);
    } else if (s.turn === 0 && s.phase === 'follow') {
      LeabTui.hint();
      LeabTui.follow(LeabTui.getState().selected, false);
    } else if (s.turn === 0 && s.phase === 'showdown') {
      LeabTui.showdown(true);
      await wait(40);
      const next = LeabTui.getState();
      if (next.phase === 'showdown' && next.turn === 0) LeabTui.showdown(false);
    }
    const trickResult = document.querySelector('#trickResultModal');
    if (!trickResult.hidden) document.querySelector('#trickResultContinue').click();
  }
  const s = LeabTui.getState();
  return JSON.stringify({ ok: false, phase: s.phase, turn: s.turn, trick: s.trick, hands: s.hands.map((h) => h.length), center: s.center.length });
})()`;

async function main() {
  if (!existsSync(resolve(root, "index.html"))) throw new Error("Run from the project root");
  await ensureServer();

  const self = runHarness(["--url", `${base}?selftest=1`, "--wait", "15000"]);
  const exceptions = (self.events || []).filter((event) => event.type === "exception");
  const results = self.selftest || self.evalValue?.selftest || [];
  const passed = results.filter((result) => result.pass).length;
  if (self.ready) pass("page booted and window.LeabTui is available");
  else fail("page booted and window.LeabTui is available");
  if (!exceptions.length) pass("no console exceptions during boot and self-test");
  else fail("no console exceptions during boot and self-test", exceptions.map((event) => event.text).join(" | "));
  if (passed === results.length && results.length >= 35) pass(`self-test ${passed}/${results.length}`);
  else fail("self-test all checks", `${passed}/${results.length}`);
  if (self.camera && self.camera.tiles >= 32) pass(`3D scene rendered ${self.camera.tiles} tiles`);
  else fail("3D scene rendered 32 tiles", JSON.stringify(self.camera));
  if (self.bootError === false) pass("no boot error overlay");
  else fail("no boot error overlay");

  const audioExpr = `(async () => {
    document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    for (let i = 0; i < 40; i += 1) {
      if (LeabTui.getAudioState().context === 'running') break;
      await new Promise((r) => setTimeout(r, 50));
    }
    LeabTui.playSound('clack', 0);
    let peak = 0;
    for (let i = 0; i < 30; i += 1) {
      if (i === 10) LeabTui.playSound('clack', 0);
      await new Promise((r) => setTimeout(r, 20));
      peak = Math.max(peak, LeabTui.getAudioState().level);
    }
    const state = LeabTui.getAudioState();
    return JSON.stringify({ context: state.context, unlocked: state.unlocked, peak, playCount: state.playCount });
  })()`;
  // Headless Chrome occasionally starts the graph after the measurement window;
  // retry once instead of failing a release on that race.
  let audioValue = {};
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const audio = runHarness(["--url", soloBase, "--wait", "2500", "--eval", audioExpr]);
    audioValue = audio.evalValue || {};
    if (audioValue.context === "running" && audioValue.unlocked && audioValue.peak > 0.01) break;
  }
  if (audioValue.context === "running" && audioValue.unlocked && audioValue.peak > 0.01) pass(`audio signal measured (peak ${audioValue.peak.toFixed(3)})`);
  else fail("audio signal measured", JSON.stringify(audioValue));

  const rankExpr = `(async () => {
    document.querySelector('#rankReferenceBtn').click();
    await new Promise((r) => setTimeout(r, 150));
    const open = !document.querySelector('#rankReference').hidden;
    const steps = document.querySelectorAll('.rank-step').length;
    document.querySelector('#rankReferenceBtn').click();
    await new Promise((r) => setTimeout(r, 100));
    const closed = document.querySelector('#rankReference').hidden;
    return JSON.stringify({ open, steps, closed });
  })()`;
  const rank = runHarness(["--url", soloBase, "--wait", "2500", "--eval", rankExpr]);
  const rankValue = rank.evalValue || {};
  if (rankValue.open && rankValue.steps === 7 && rankValue.closed) pass("rank reference opens with 7 cards and toggles closed");
  else fail("rank reference opens with 7 cards and toggles closed", JSON.stringify(rankValue));

  const display = runHarness(["--url", soloBase, "--wait", "2500", "--eval", `(async () => {
    LeabTui.applyFontSize('xl');
    LeabTui.applyTheme('jade');
    const jadeScene = LeabTui.getCamera()?.theme;
    LeabTui.applyTheme('parchment');
    document.querySelector('#displayBtn').click();
    await new Promise((r) => setTimeout(r, 900));
    const style = getComputedStyle(document.documentElement);
    return JSON.stringify({
      font: document.documentElement.dataset.fontSize,
      scale: style.getPropertyValue('--fs-scale').trim(),
      theme: document.documentElement.dataset.theme,
      scene: LeabTui.getCamera()?.theme,
      background: LeabTui.getCamera()?.background,
      jadeScene,
      prefs: LeabTui.getPrefs(),
      modal: !document.querySelector('#displayModal').hidden,
      fontButtons: document.querySelectorAll('button[data-font-size]').length,
      themeButtons: document.querySelectorAll('button[data-theme-choice]').length
    });
  })()`]);
  const displayValue = display.evalValue || {};
  if (displayValue.font === "xl" && displayValue.scale === "1.24") pass("text size XL applies a 1.24 scale");
  else fail("text size XL applies a 1.24 scale", JSON.stringify(displayValue));
  if (displayValue.jadeScene === "jade" && displayValue.theme === "parchment" && displayValue.scene === "parchment" && displayValue.background === "d9cdb8") pass("bright Parchment theme reaches the UI and 3D scene");
  else fail("bright Parchment theme reaches the UI and 3D scene", JSON.stringify(displayValue));
  if (displayValue.prefs?.fontSize === "xl" && displayValue.prefs?.theme === "parchment") pass("display preferences persist");
  else fail("display preferences persist", JSON.stringify(displayValue.prefs));
  if (displayValue.modal && displayValue.fontButtons === 4 && displayValue.themeButtons === 5) pass("display panel exposes four sizes and five themes");
  else fail("display panel exposes four sizes and five themes", JSON.stringify(displayValue));

  const draftExpr = `(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const chip = document.querySelector('#draftChip');
    const before = { hidden: chip.hidden, text: chip.textContent, pressed: chip.getAttribute('aria-pressed') };
    chip.click();
    await sleep(150);
    const on = { text: chip.textContent, pressed: chip.getAttribute('aria-pressed'), state: LeabTui.getState().draftMode };
    chip.click();
    await sleep(150);
    const off = { text: chip.textContent, pressed: chip.getAttribute('aria-pressed'), state: LeabTui.getState().draftMode };
    return JSON.stringify({ before, on, off });
  })()`;
  const draft = runHarness(["--url", soloBase, "--wait", "2500", "--eval", draftExpr]);
  const draftValue = draft.evalValue || {};
  if (draftValue.before?.hidden === false && draftValue.on?.pressed === "true" && draftValue.off?.pressed === "false" && draftValue.off?.state === false) pass("draft switch toggles from the table HUD");
  else fail("draft switch toggles from the table HUD", JSON.stringify(draftValue));

  const compareExpr = `(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    LeabTui.setFast(true);
    LeabTui.newMatch({ fast: true });
    await sleep(250);
    const act = async () => {
      const st = LeabTui.getState();
      if (!st) return 'end';
      if (st.phase === 'showdown' && st.turn === 0) {
        LeabTui.showdown(true);
        await sleep(60);
        return 'revealed';
      }
      if (st.phase === 'lead' && st.turn === 0) { LeabTui.hint(); LeabTui.lead(LeabTui.getState().selected); }
      else if (st.phase === 'follow' && st.turn === 0) { LeabTui.hint(); LeabTui.follow(LeabTui.getState().selected); }
      else if (st.phase === 'roundEnd' || st.phase === 'matchEnd') { LeabTui.newMatch({ fast: true }); }
      return 'wait';
    };
    let revealed = false;
    for (let i = 0; i < 500 && !revealed; i += 1) {
      await sleep(20);
      if (await act() === 'revealed') revealed = true;
    }
    const noPopup = document.querySelector('#revealModal') === null;
    let result = null;
    if (revealed) {
      for (let i = 0; i < 220; i += 1) {
        await sleep(30);
        if (!document.querySelector('#trickResultModal').hidden) {
          const modal = document.querySelector('#trickResultModal');
          result = {
            seats: modal.querySelectorAll('.trick-seat').length,
            tick: modal.querySelectorAll('.seat-tick').length,
            why: modal.querySelector('.pile-why b')?.textContent || '',
            title: document.querySelector('#trickResultTitle').textContent,
            phase: LeabTui.getState().phase,
            center: LeabTui.getState().center.length
          };
          break;
        }
      }
    }
    if (result) {
      document.querySelector('#trickResultContinue').click();
      await sleep(450);
    }
    document.querySelector('#logHistoryBtn').click();
    await sleep(250);
    const list = document.querySelector('#lastTrickList');
    const history = {
      open: !document.querySelector('#lastTrickModal').hidden,
      seats: list.querySelectorAll('.trick-seat').length,
      tick: list.querySelectorAll('.seat-tick').length,
      why: list.querySelector('.pile-why b')?.textContent || ''
    };
    const after = { phase: LeabTui.getState().phase, trick: LeabTui.getState().trick };
    return JSON.stringify({ noPopup, result, history, after });
  })()`;
  const compare = runHarness(["--url", soloBase, "--wait", "2500", "--eval", compareExpr]);
  const compareValue = compare.evalValue || {};
  if (compareValue.noPopup === true) pass("reveal applies without an intermediate popup");
  else fail("reveal applies without an intermediate popup", JSON.stringify(compareValue.noPopup));
  if (compareValue.result?.seats === 4 && compareValue.result.tick === 1 && compareValue.result.phase === "resolving" && compareValue.result.center === 0) pass("trick result waits for every decision");
  else fail("trick result waits for every decision", JSON.stringify(compareValue.result));
  if (compareValue.history?.open && compareValue.history.seats === 4 && compareValue.history.tick === 1) pass("turn history uses the comparison cards");
  else fail("turn history uses the comparison cards", JSON.stringify(compareValue.history));

  const tabletExpr = `(async () => {
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const initial = { w: innerWidth, h: innerHeight, cam: LeabTui.getCamera(), frame: LeabTui.getFraming() };
    const handId = LeabTui.getState()?.hands?.[0]?.[0] || null;
    if (handId) LeabTui.toggleTile(handId);
    await sleep(350);
    document.querySelector('.panel-orb[data-panel="inspectorCard"]')?.click();
    await sleep(350);
    const inspector = document.querySelector('#inspectorBody')?.textContent.replace(/\\s+/g, ' ').trim() || '';
    document.querySelector('#panelSheetClose')?.click();
    await sleep(250);
    document.querySelector('#hintBtn')?.click();
    await sleep(400);
    const toasts = [...document.querySelectorAll('.toast')].map((node) => node.textContent.trim());
    const toastRect = document.querySelector('.toast-layer')?.getBoundingClientRect();
    const hudRect = document.querySelector('.hud-strip')?.getBoundingClientRect();
    const toastClear = Boolean(toastRect && hudRect && toastRect.top >= hudRect.bottom - 1);
    const rail = document.querySelector('#panelRail');
    const railOrbs = rail
      ? [...rail.querySelectorAll('.panel-orb')].filter((node) => !node.hidden && getComputedStyle(node).display !== 'none').map((node) => node.textContent.trim())
      : [];
    const railState = { hidden: Boolean(rail?.hidden), display: rail ? getComputedStyle(rail).display : 'missing', orbs: railOrbs };
    const inviteState = {
      top: Boolean(document.querySelector('#inviteTopBtn') && !document.querySelector('#inviteTopBtn').hidden),
      action: Boolean(document.querySelector('#inviteBtn') && !document.querySelector('#inviteBtn').hidden)
    };
    document.querySelector('.panel-orb[data-panel="logPanel"]')?.click();
    await sleep(350);
    const logAction = document.querySelector('#panelSheetAction');
    const logActionState = {
      hidden: Boolean(logAction?.hidden),
      disabled: Boolean(logAction?.disabled),
      text: logAction?.textContent.trim() || '',
      title: document.querySelector('#panelSheetTitle')?.textContent.trim() || ''
    };
    document.querySelector('#panelSheetClose')?.click();
    await sleep(200);
    document.querySelector('#dockFold')?.click();
    await sleep(1000);
    const expanded = LeabTui.getFraming();
    LeabTui.setTopView(false);
    await sleep(1200);
    const three = LeabTui.getCamera();
    LeabTui.setTopView(true);
    await sleep(1200);
    const two = { cam: LeabTui.getCamera(), frame: LeabTui.getFraming() };
    return JSON.stringify({
      initial,
      expanded,
      inspector,
      toasts,
      toastClear,
      rail: railState,
      invite: inviteState,
      logAction: logActionState,
      three: { topView: three?.topView, shadows: three?.shadows },
      two: { topView: two.cam?.topView, shadows: two.cam?.shadows, frame: two.frame },
      coarse: matchMedia('(pointer: coarse)').matches,
      dockCollapsed: document.querySelector('#handDock')?.classList.contains('dock-collapsed')
    });
  })()`;
  for (const orientation of ["portrait", "landscape"]) {
    const tablet = runHarness(["--url", soloBase, "--device", "ipad", "--orientation", orientation, "--wait", "6000", "--eval", tabletExpr]);
    const value = tablet.evalValue || {};
    const expected = orientation === "portrait" ? { w: 820, h: 1180 } : { w: 1180, h: 820 };
    const tabletExceptions = (tablet.events || []).filter((event) => event.type === "exception");
    if (value.initial?.w === expected.w && value.initial?.h === expected.h && value.coarse) pass(`iPad ${orientation} emulates ${expected.w}×${expected.h} at coarse pointer`);
    else fail(`iPad ${orientation} emulates ${expected.w}×${expected.h} at coarse pointer`, JSON.stringify({ w: value.initial?.w, h: value.initial?.h, coarse: value.coarse }));
    if (value.initial?.frame?.fits && value.initial?.frame?.clearOfDock && value.initial?.cam?.shadows === false) pass(`iPad ${orientation} 2D fits the whole table above the dock with no shadows`);
    else fail(`iPad ${orientation} 2D fits the whole table above the dock with no shadows`, JSON.stringify(value.initial?.frame));
    if (value.expanded?.fits && value.expanded?.clearOfDock) pass(`iPad ${orientation} expanded dock re-fits the table clear of the hand`);
    else fail(`iPad ${orientation} expanded dock re-fits the table clear of the hand`, JSON.stringify(value.expanded));
    if (value.inspector?.includes("Selected for play")) pass(`iPad ${orientation} inspector opens on the selected tile`);
    else fail(`iPad ${orientation} inspector opens on the selected tile`, value.inspector);
    if (Array.isArray(value.toasts) && value.toasts.some((text) => text.startsWith("Hint:"))) pass(`iPad ${orientation} hint toast names the suggested set`);
    else fail(`iPad ${orientation} hint toast names the suggested set`, JSON.stringify(value.toasts));
    if (value.toastClear === true) pass(`iPad ${orientation} toast clears the HUD strip`);
    else fail(`iPad ${orientation} toast clears the HUD strip`, JSON.stringify({ toasts: value.toasts, clear: value.toastClear }));
    const expectedOrbs = ["C", "M", "A", "i", "H", "L"];
    if (value.rail?.hidden === false && value.rail?.display === "flex" && expectedOrbs.every((label) => value.rail?.orbs?.includes(label))) pass(`iPad ${orientation} keeps the C/M/A/i/H/L panel rail visible`);
    else fail(`iPad ${orientation} keeps the C/M/A/i/H/L panel rail visible`, JSON.stringify(value.rail));
    if (value.logAction?.hidden === false && value.logAction?.text === "View trick log" && value.logAction?.title === "Turn log") pass(`iPad ${orientation} turn-log sheet exposes the play-history link`);
    else fail(`iPad ${orientation} turn-log sheet exposes the play-history link`, JSON.stringify(value.logAction));
    if (value.invite?.top && value.invite?.action) pass(`iPad ${orientation} shows Invite in the top bar and Actions`);
    else fail(`iPad ${orientation} shows Invite in the top bar and Actions`, JSON.stringify(value.invite));
    if (value.three?.topView === false && value.three?.shadows === true) pass(`iPad ${orientation} 3D enables shadows`);
    else fail(`iPad ${orientation} 3D enables shadows`, JSON.stringify(value.three));
    if (value.two?.topView === true && value.two?.shadows === false && value.two?.frame?.fits && value.two?.frame?.clearOfDock) pass(`iPad ${orientation} returns to a fitted, shadow-free 2D view`);
    else fail(`iPad ${orientation} returns to a fitted, shadow-free 2D view`, JSON.stringify(value.two));
    if (!tabletExceptions.length) pass(`iPad ${orientation} console clean`);
    else fail(`iPad ${orientation} console clean`, tabletExceptions.map((event) => event.text).join(" | "));
  }

  const logSheetExpr = `(async () => {
    const s = (ms) => new Promise((r) => setTimeout(r, ms));
    LeabTui.setFast(true);
    let done = false;
    for (let i = 0; i < 220 && !done; i += 1) {
      const st = LeabTui.getState();
      if (st.trickArchive && st.trickArchive.length >= 1) { done = true; break; }
      if (!document.querySelector('#trickResultModal').hidden) document.querySelector('#trickResultContinue').click();
      if (st.turn === 0 && st.phase === 'lead') { LeabTui.hint(); LeabTui.lead(LeabTui.getState().selected); }
      else if (st.turn === 0 && st.phase === 'follow') { LeabTui.hint(); LeabTui.follow(LeabTui.getState().selected, false); }
      else if (st.turn === 0 && st.phase === 'showdown') {
        LeabTui.showdown(true);
        await s(60);
        const next = LeabTui.getState();
        if (next.phase === 'showdown' && next.turn === 0) LeabTui.showdown(false);
      }
      await s(50);
    }
    if (!document.querySelector('#trickResultModal').hidden) document.querySelector('#trickResultContinue').click();
    await s(200);
    document.querySelector('.panel-orb[data-panel="logPanel"]')?.click();
    await s(350);
    const action = document.querySelector('#panelSheetAction');
    const before = { disabled: Boolean(action?.disabled), text: action?.textContent.trim() || '', title: action?.title || '' };
    action?.click();
    await s(500);
    const modal = document.querySelector('#lastTrickModal');
    return JSON.stringify({
      before,
      after: {
        open: Boolean(modal && !modal.hidden),
        title: document.querySelector('#lastTrickTitle')?.textContent || '',
        sheet: Boolean(document.querySelector('#panelSheet') && !document.querySelector('#panelSheet').hidden),
        records: LeabTui.getState().trickArchive.length
      }
    });
  })()`;
  const logSheet = runHarness(["--url", soloBase, "--device", "ipad", "--orientation", "landscape", "--wait", "8000", "--eval", logSheetExpr]);
  const logSheetValue = logSheet.evalValue || {};
  if (logSheetValue.before?.disabled === false && logSheetValue.after?.records >= 1) pass("iPad turn-log link enables after the first completed trick");
  else fail("iPad turn-log link enables after the first completed trick", JSON.stringify(logSheetValue));
  if (logSheetValue.after?.open === true && logSheetValue.after?.sheet === false && logSheetValue.after?.title === "Turn history") pass("iPad turn-log link opens the shared turn-history modal");
  else fail("iPad turn-log link opens the shared turn-history modal", JSON.stringify(logSheetValue.after));

  const flow = runHarness(["--url", soloBase, "--wait", "900", "--eval", playthrough]);
  const value = flow.evalValue || {};
  const flowExceptions = (flow.events || []).filter((event) => event.type === "exception");
  if (value.ok === true) pass("complete round reached roundEnd");
  else fail("complete round reached roundEnd", JSON.stringify(value));
  if (value.captures === 32 && value.hands === 0) pass("32 tiles captured, every hand empty");
  else fail("32 tiles captured, every hand empty", JSON.stringify({ captures: value.captures, hands: value.hands }));
  if (value.pointSum === 0) pass("round points sum to zero");
  else fail("round points sum to zero", String(value.pointSum));
  if (!flowExceptions.length) pass("no console exceptions during the round");
  else fail("no console exceptions during the round", flowExceptions.map((event) => event.text).join(" | "));

  if (failures.length) {
    console.error(`\n${failures.length} verification failure(s).`);
    process.exitCode = 1;
  } else {
    console.log("\nALL BROWSER CHECKS PASSED");
  }
}

main()
  .catch((error) => {
    console.error("VERIFY FAILED:", error.message);
    process.exitCode = 1;
  })
  .finally(() => {
    if (server) server.kill("SIGTERM");
  });
