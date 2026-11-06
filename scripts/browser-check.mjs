#!/usr/bin/env node
/**
 * Dependency-free Chrome DevTools Protocol harness for Leab-Tui 3D.
 *
 *   node scripts/browser-check.mjs --url http://127.0.0.1:8123/?selftest=1
 *   node scripts/browser-check.mjs --url http://127.0.0.1:8123/?demo=1 --out screenshots/hero.png
 *   node scripts/browser-check.mjs --url http://127.0.0.1:8123/ --eval "LeabTui.getState()"
 *
 * Requires a locally installed Chrome at the default macOS path (override with
 * CHROME_PATH). Starts its own HTTP server only when --serve <dir> is passed.
 */

import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};

const url = arg("--url", "http://127.0.0.1:8123/?selftest=1");
const out = arg("--out");
const evalExpr = arg("--eval");
const evalExpr2 = arg("--eval2");
const reload = args.includes("--reload");
const reloadUrl = arg("--reload-url");
const waitMs = Number(arg("--wait", "9000"));
const width = Number(arg("--width", "1440"));
const click = arg("--click");
const height = Number(arg("--height", "900"));
const port = Number(arg("--port", String(9300 + Math.floor(Math.random() * 400))));
const chromePath = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const profile = mkdtempSync(join(tmpdir(), "leab-cdp-"));
const chrome = spawn(chromePath, [
  "--headless=new",
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-background-networking",
  "--disable-component-update",
  "--disable-sync",
  "--hide-scrollbars",
  `--window-size=${width},${height}`,
  `--user-data-dir=${profile}`,
  `--remote-debugging-port=${port}`,
  ...(process.env.AUDIO_TEST ? ["--autoplay-policy=no-user-gesture-required"] : []),
  "about:blank"
], { stdio: ["ignore", "ignore", "pipe"] });

let chromeErr = "";
chrome.stderr.on("data", (chunk) => { chromeErr += chunk.toString(); });

const sleep = (ms) => new Promise((resolvePromise) => setTimeout(resolvePromise, ms));

async function debuggerUrl() {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      if (response.ok) {
        const targets = await response.json();
        const page = targets.find((target) => target.type === "page");
        if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
      }
    } catch { /* not ready */ }
    await sleep(125);
  }
  throw new Error("Chrome DevTools endpoint did not start");
}

let nextId = 0;
const pending = new Map();
const events = [];
let socket;

function send(method, params = {}) {
  const id = ++nextId;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolvePromise, reject) => {
    pending.set(id, { resolve: resolvePromise, reject, method });
    setTimeout(() => {
      if (pending.has(id)) {
        pending.delete(id);
        reject(new Error(`CDP timeout: ${method}`));
      }
    }, 30000);
  });
}

function logEvent(event) {
  if (event.method === "Runtime.consoleAPICalled") {
    events.push({ type: "console", level: event.params.type, text: event.params.args.map((a) => a.value ?? a.description ?? a.type).join(" ") });
  } else if (event.method === "Runtime.exceptionThrown") {
    const detail = event.params.exceptionDetails;
    events.push({ type: "exception", text: detail.exception?.description || detail.text });
  } else if (event.method === "Log.entryAdded") {
    events.push({ type: "log", level: event.params.entry.level, text: event.params.entry.text });
  }
}

async function main() {
  const wsUrl = await debuggerUrl();
  socket = new WebSocket(wsUrl);
  await new Promise((resolvePromise, reject) => {
    socket.addEventListener("open", resolvePromise, { once: true });
    socket.addEventListener("error", reject, { once: true });
  });
  socket.addEventListener("message", (message) => {
    const data = JSON.parse(message.data);
    if (data.id && pending.has(data.id)) {
      const entry = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) entry.reject(new Error(`${entry.method}: ${data.error.message}`));
      else entry.resolve(data.result);
    } else {
      logEvent(data);
    }
  });

  await send("Page.enable");
  await send("Runtime.enable");
  await send("Log.enable");
  await send("Network.enable");
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url });
  await sleep(waitMs);
  if (click) {
    const [x, y] = click.split(",").map(Number);
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y });
    await send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", clickCount: 1 });
    await send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", clickCount: 1 });
    await sleep(350);
  }

  const result = await send("Runtime.evaluate", {
    expression: evalExpr || `JSON.stringify({
      title: document.title,
      selftest: window.__selftest || null,
      ready: Boolean(window.LeabTui),
      state: window.LeabTui ? window.LeabTui.getState() : null,
      camera: window.LeabTui ? window.LeabTui.getCamera() : null,
      bootError: document.querySelector('#bootError')?.hidden === false,
      coach: document.querySelector('#coachText')?.textContent,
      turn: document.querySelector('#turnChip')?.textContent,
      hand: document.querySelectorAll('#tileList .tile-chip').length,
      canvas: { w: document.querySelector('#scene')?.clientWidth, h: document.querySelector('#scene')?.clientHeight }
    })`,
    awaitPromise: true,
    returnByValue: true,
    userGesture: true
  });

  let value = result.result?.value;
  const evalError = result.exceptionDetails?.exception?.description || result.exceptionDetails?.text || null;
  try { value = JSON.parse(value); } catch { /* leave raw */ }
  const report = {
    evalValue: value,
    evalError,
    url,
    title: value?.title,
    ready: value?.ready,
    selftest: value?.selftest,
    state: value?.state,
    camera: value?.camera,
    bootError: value?.bootError,
    coach: value?.coach,
    turn: value?.turn,
    hand: value?.hand,
    canvas: value?.canvas,
    events
  };
  if (reload) {
    await send("Page.reload", { ignoreCache: false });
    await sleep(Number(arg("--wait2", "6000")));
    if (reloadUrl) {
      await send("Page.navigate", { url: reloadUrl });
      await sleep(Number(arg("--wait2", "6000")));
    }
    const second = await send("Runtime.evaluate", {
      expression: evalExpr2 || "JSON.stringify({state: window.LeabTui?.getState(), stored: JSON.parse(localStorage.getItem('leabtui.match.v1') || 'null'), title: document.title})",
      awaitPromise: true,
      returnByValue: true,
      userGesture: true
    });
    let secondValue = second.result?.value;
    try { secondValue = JSON.parse(secondValue); } catch { /* raw */ }
    report.reloaded = secondValue;
    report.reloadError = second.exceptionDetails?.exception?.description || null;
  }

  console.log(JSON.stringify(report, null, 2));

  if (out) {
    const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    const target = resolve(out);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, Buffer.from(shot.data, "base64"));
    console.log(`SCREENSHOT ${target}`);
  }

  socket.close();
  chrome.kill("SIGTERM");
  await sleep(150);
  if (chromeErr && process.env.DEBUG_CHROME) console.error(chromeErr);
}

main().catch((error) => {
  console.error("BROWSER-CHECK FAILED:", error.message);
  if (process.env.DEBUG_CHROME) console.error(chromeErr);
  chrome.kill("SIGTERM");
  process.exitCode = 1;
});
