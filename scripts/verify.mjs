#!/usr/bin/env node
/**
 * Headless verification for Leab-Tui 3D.
 *
 *   python3 -m http.server 8123 &
 *   node scripts/verify.mjs
 *
 * Starts a temporary server when one is not already listening, runs the
 * in-page 25-check suite, then plays a complete round through the public API.
 * Fails on console exceptions, rule failures, or lost tiles.
 */

import { spawn, execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const port = 8123;
const base = `http://127.0.0.1:${port}/`;
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
      const picked = LeabTui.getState().selected;
      const before = s.hands[0].length;
      LeabTui.follow(picked, true);
      await wait(25);
      if (LeabTui.getState().hands[0].length === before) LeabTui.follow(picked, false);
    }
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
  if (passed === 25 && results.length === 25) pass("self-test 25/25");
  else fail("self-test 25/25", `${passed}/${results.length}`);
  if (self.camera && self.camera.tiles >= 32) pass(`3D scene rendered ${self.camera.tiles} tiles`);
  else fail("3D scene rendered 32 tiles", JSON.stringify(self.camera));
  if (self.bootError === false) pass("no boot error overlay");
  else fail("no boot error overlay");

  const flow = runHarness(["--url", base, "--wait", "900", "--eval", playthrough]);
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
