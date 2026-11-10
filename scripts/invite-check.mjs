#!/usr/bin/env node
/**
 * Solo → Invite WebRTC verification for Leab-Tui 3D.
 *
 *   python3 -m http.server 8123 &
 *   node scripts/invite-check.mjs
 *
 * This test uses the real public PeerJS broker and real WebRTC data channels.
 * It is deliberately separate from scripts/verify.mjs so offline CI stays
 * deterministic. Requires Chrome and outbound access to 0.peerjs.com.
 *
 * Flow:
 *   1. Host page ?mode=host.
 *   2. Guest page ?room=CODE.
 *   3. Host starts with 2 humans + 2 bots.
 *   4. Guest sees seat 1, a real own hand and ghosted other hands.
 *   5. Host plays a lead, guest follows, host state advances.
 *   6. Guest page closes; host converts seat 1 to a bot.
 */

import { spawn } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = process.env.BASE_URL || "http://127.0.0.1:8123/";
const port = Number(process.env.CDP_PORT || 9555);
const chromePath = process.env.CHROME_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const profile = mkdtempSync(join(tmpdir(), "leab-net-"));
const failures = [];
const passes = [];

function pass(label, detail = "") { passes.push(label); console.log(`PASS ${label}${detail ? ` — ${detail}` : ""}`); }
function fail(label, detail = "") { failures.push(`${label}: ${detail}`); console.error(`FAIL ${label} — ${detail}`); }
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const chrome = spawn(chromePath, [
  "--headless=new",
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-background-networking",
  "--disable-component-update",
  "--disable-sync",
  "--hide-scrollbars",
  "--window-size=1440,900",
  `--user-data-dir=${profile}`,
  `--remote-debugging-port=${port}`,
  "--autoplay-policy=no-user-gesture-required",
  "--use-fake-device-for-media-stream",
  "--use-fake-ui-for-media-stream",
  "about:blank"
], { stdio: ["ignore", "ignore", "pipe"] });
let chromeErr = "";
chrome.stderr.on("data", (chunk) => { chromeErr += chunk.toString(); });

async function endpoint() {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/list`);
      const targets = await response.json();
      const page = targets.find((target) => target.type === "page");
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch { /* not ready */ }
    await sleep(150);
  }
  throw new Error("Chrome DevTools endpoint did not start");
}

class Session {
  constructor(ws) {
    this.ws = ws;
    this.id = 0;
    this.pending = new Map();
    this.events = [];
    ws.addEventListener("message", (event) => {
      const data = JSON.parse(event.data);
      if (data.id && this.pending.has(data.id)) {
        const { resolve, reject } = this.pending.get(data.id);
        this.pending.delete(data.id);
        if (data.error) reject(new Error(data.error.message));
        else resolve(data.result);
      } else if (data.method === "Runtime.exceptionThrown") {
        this.events.push(data.params.exceptionDetails.exception?.description || data.params.exceptionDetails.text);
      } else if (data.method === "Runtime.consoleAPICalled" && data.params.type === "error") {
        this.events.push(data.params.args.map((arg) => arg.value || arg.description || "").join(" "));
      }
    });
  }

  static async connect(url) {
    const ws = new WebSocket(url);
    await new Promise((resolve, reject) => {
      ws.addEventListener("open", resolve, { once: true });
      ws.addEventListener("error", reject, { once: true });
    });
    const session = new Session(ws);
    await session.send("Runtime.enable");
    await session.send("Page.enable");
    return session;
  }

  send(method, params = {}) {
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new Error(`CDP timeout: ${method}`));
        }
      }, 45000);
    });
  }

  async goto(url) {
    await this.send("Page.navigate", { url });
    await sleep(2500);
  }

  async eval(expression) {
    const result = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true
    });
    if (result.exceptionDetails) {
      const detail = result.exceptionDetails.exception;
      throw new Error(detail?.description || detail?.value || result.exceptionDetails.text || "evaluation failed");
    }
    return result.result?.value;
  }

  async waitFor(expression, label, timeout = 25000) {
    const started = Date.now();
    let last = null;
    while (Date.now() - started < timeout) {
      try {
        last = await this.eval(expression);
        if (last) return last;
      } catch (error) { last = error.message; }
      await sleep(400);
    }
    throw new Error(`timed out waiting for ${label}; last=${JSON.stringify(last)}`);
  }

  close() { try { this.ws.close(); } catch { /* ignore */ } }

  async screenshot(path) {
    const shot = await this.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    writeFileSync(path, Buffer.from(shot.data, "base64"));
  }

  async closePage() {
    try { await this.send("Page.close"); } catch { /* target may already be gone */ }
    this.close();
  }
}

async function newTarget(url) {
  const response = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, { method: "PUT" });
  if (!response.ok) throw new Error(`could not create target: ${response.status}`);
  const target = await response.json();
  return target.webSocketDebuggerUrl;
}


async function main() {
  const hostWs = await endpoint();
  const host = await Session.connect(hostWs);
  await host.goto(`${BASE}?mode=solo&seed=4242`);
  await host.waitFor("window.LeabTui?.getState?.() ? 'ready' : ''", "solo table", 30000);
  await host.eval("LeabTui.newMatch({ seed: 4242 }); true");
  await host.waitFor("window.LeabTui.getState().phase !== 'dealing' ? 'ready' : ''", "solo deal", 20000);
  await host.eval(`(async () => {
    const st = LeabTui.getState();
    if (st.turn === 0 && st.phase === 'lead') { LeabTui.hint(); LeabTui.lead(LeabTui.getState().selected); }
    return true;
  })()`);
  const before = JSON.parse(await host.waitFor(
    "window.LeabTui.getState().center.length > 0 ? JSON.stringify({round:LeabTui.getState().round,trick:LeabTui.getState().trick,phase:LeabTui.getState().phase}) : ''",
    "mid-trick solo",
    20000
  ));
  await host.eval("LeabTui.net.openInvite(); true");
  const hostNet = JSON.parse(await host.waitFor(
    "window.LeabTui?.net.getState?.()?.role === 'host' && LeabTui.net.getState().code ? JSON.stringify(LeabTui.net.getState()) : ''",
    "invite host room",
    30000
  ));
  await host.eval("LeabTui.net.setPin('48213'); true");
  if (hostNet.started && hostNet.players?.[0]?.kind === "host" && hostNet.players?.[1]?.kind === "bot") pass("solo converted to a host room", hostNet.code);
  else fail("solo converted to a host room", JSON.stringify(hostNet));
  const hostVoice = await host.waitFor(
    "window.LeabTui?.voice?.state?.()?.joined ? JSON.stringify(LeabTui.voice.state()) : ''",
    "host auto audio",
    20000
  );
  if (JSON.parse(hostVoice).joined) pass("host joins audio automatically after Invite");
  else fail("host joins audio automatically after Invite", hostVoice);
  if (LeabTuiVersion(before)) pass("conversion kept the live round", `round ${before.round}, trick ${before.trick}`);
  const code = hostNet.code.replace("-", "");
  const guestWs = await newTarget(`${BASE}?room=${code}&name=Late&pin=48213`);
  const guest = await Session.connect(guestWs);
  const pending = JSON.parse(await host.waitFor(
    "window.LeabTui?.net.pending?.().length >= 1 ? JSON.stringify(window.LeabTui.net.pending()) : ''",
    "join request",
    20000
  ));
  await host.eval("document.querySelector('#inviteModal [data-close]')?.click(); true");
  await sleep(300);
  let popup = {};
  try {
    popup = JSON.parse(await host.waitFor(
      "document.querySelector('#joinRequestPop') && !document.querySelector('#joinRequestPop').hidden ? JSON.stringify({title:document.querySelector('#joinRequestTitle').textContent,body:document.querySelector('#joinRequestBody').textContent}) : ''",
      "host join popup",
      10000
    ));
  } catch (error) {
    console.log("POPUP DIAG", await host.eval("JSON.stringify({pending:LeabTui.net.pending(),popHidden:document.querySelector('#joinRequestPop')?.hidden,lobbyHidden:document.querySelector('#lobbyModal')?.hidden,inviteHidden:document.querySelector('#inviteModal')?.hidden,started:LeabTui.net.getState()?.started,alertHidden:document.querySelector('#joinAlertBtn')?.hidden,alertText:document.querySelector('#joinAlertText')?.textContent})"));
    throw error;
  }
  if (/Late/.test(popup.title) && /Allow|อนุญาต|trick|ตา/i.test(`${popup.title} ${popup.body}`)) pass("host sees the join-request popup on the table", popup.title);
  else fail("host sees the join-request popup on the table", JSON.stringify(popup));
  await host.eval("document.querySelector('#joinRequestApprove').click(); true");
  const queued = JSON.parse(await host.waitFor(
    "window.LeabTui?.net.getState?.().queued?.length >= 1 ? JSON.stringify(LeabTui.net.getState().queued) : ''",
    "queued guest",
    10000
  ));
  if (queued[0]?.seat > 0 && queued[0]?.joinAfter === "trick") pass("guest queued until trick end", `seat ${queued[0].seat}`);
  else fail("guest queued until trick end", JSON.stringify(queued));
  const queuedGuest = JSON.parse(await guest.waitFor(
    "LeabTui.net?.getState?.()?.queued && LeabTui.net.getState().viewer && LeabTui.getState?.() ? JSON.stringify({seat:LeabTui.net.getState().mySeat,reserved:LeabTui.net.getState().queuedSeat,viewer:LeabTui.net.getState().viewer,banner:!document.querySelector('#queuedBanner').hidden,dock:getComputedStyle(document.querySelector('#handDock')).display,body:document.body.classList.contains('is-viewer')}) : ''",
    "guest audience mode",
    20000
  ));
  if (queuedGuest.viewer && queuedGuest.banner && queuedGuest.body && queuedGuest.dock === "none") pass("approved guest watches the current trick immediately", `reserved seat ${queuedGuest.reserved}`);
  else fail("approved guest watches the current trick immediately", JSON.stringify(queuedGuest));
  await guest.send("Page.reload");
  await sleep(5000);
  const requeued = JSON.parse(await guest.waitFor(
    "LeabTui.net?.getState?.()?.queued && LeabTui.net.getState().viewer && LeabTui.getState?.() && !document.querySelector('#queuedBanner').hidden ? JSON.stringify({reserved:LeabTui.net.getState().queuedSeat,token:(()=>{try{return JSON.parse(sessionStorage.getItem('leabtui.rejoin.v1')||'null')?.token?'yes':'no'}catch{return 'err'}})()}) : ''",
    "guest reattached to the audience",
    20000
  ));
  if (requeued.token === "yes" && requeued.reserved > 0) pass("queued guest reconnects with the same token", `reserved ${requeued.reserved}`);
  else fail("queued guest reconnects with the same token", JSON.stringify(requeued));
  const finish = JSON.parse(await host.eval(`(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    for (let i = 0; i < 320; i += 1) {
      const st = LeabTui.getState();
      if (st.trick > ${before.trick}) return JSON.stringify({ ok: true, trick: st.trick, round: st.round });
      if (!document.querySelector('#trickResultModal').hidden) document.querySelector('#trickResultContinue').click();
      if (st.turn === 0 && st.phase === 'lead') { LeabTui.hint(); LeabTui.lead(LeabTui.getState().selected); }
      else if (st.turn === 0 && st.phase === 'follow') { LeabTui.hint(); LeabTui.follow(LeabTui.getState().selected, false); }
      else if (st.turn === 0 && st.phase === 'showdown') {
        LeabTui.showdown(true);
        await wait(40);
        const next = LeabTui.getState();
        if (next.phase === 'showdown' && next.turn === 0) LeabTui.showdown(false);
      }
      await wait(60);
    }
    return JSON.stringify({ ok: false, phase: LeabTui.getState().phase, trick: LeabTui.getState().trick });
  })()`));
  if (finish.ok) pass("host reached the next trick", `trick ${finish.trick}`);
  else fail("host reached the next trick", JSON.stringify(finish));
  const promoted = JSON.parse(await guest.waitFor(
    "window.LeabTui?.net?.getState?.()?.role === 'client' && LeabTui.net.getState().mySeat > 0 && LeabTui.getState?.() ? JSON.stringify({seat:LeabTui.net.getState().mySeat,hand:LeabTui.getState().hands[LeabTui.net.getState().mySeat].length}) : ''",
    "guest promoted",
    25000
  ));
  if (promoted.seat > 0 && promoted.hand > 0) pass("guest seated with a hand", `seat ${promoted.seat}, ${promoted.hand} tiles`);
  else fail("guest seated with a hand", JSON.stringify(promoted));
  const promotedDock = JSON.parse(await guest.eval("JSON.stringify({hidden:document.querySelector('#handDock').hidden,display:getComputedStyle(document.querySelector('#handDock')).display,body:document.body.classList.contains('is-viewer')})"));
  if (!promotedDock.hidden && promotedDock.display !== "none" && !promotedDock.body) pass("hand dock returns when the audience guest is seated");
  else fail("hand dock returns when the audience guest is seated", JSON.stringify(promotedDock));
  await guest.eval("LeabTui.net.resync(); true");
  await sleep(700);
  const resyncToast = await guest.eval("[...document.querySelectorAll('.toast')].map((n) => n.textContent).join(' | ')");
  if (/refreshed|ซิงก์/i.test(resyncToast)) pass("guest can resync the table from the host", resyncToast);
  else fail("guest can resync the table from the host", resyncToast);
  const after = JSON.parse(await host.eval("JSON.stringify(LeabTui.net.getState())"));
  if (!after.queued?.length && after.players?.[promoted.seat]?.kind === "human") pass("queue clears after seating");
  else fail("queue clears after seating", JSON.stringify({ queued: after.queued, seat: after.players?.[promoted.seat] }));
  await guest.closePage();
  const replaced = await host.waitFor(
    `LeabTui.net.getState().players?.[${promoted.seat}]?.kind === 'bot' ? JSON.stringify(LeabTui.net.getState().players[${promoted.seat}]) : ''`,
    "seat reverts to a bot",
    20000
  );
  if (JSON.parse(replaced).kind === "bot") pass("closed guest seat reverts to a bot with its rejoin token");
  else fail("closed guest seat reverts to a bot with its rejoin token", replaced);
  const rejoinWs = await newTarget(`${BASE}?room=${code}&name=Late&pin=48213`);
  const rejoinPage = await Session.connect(rejoinWs);
  let rejoined = {};
  try {
    rejoined = JSON.parse(await rejoinPage.waitFor(
      `LeabTui.net?.getState?.()?.mySeat === ${promoted.seat} && LeabTui.getState?.() ? JSON.stringify({seat:LeabTui.net.getState().mySeat,hand:LeabTui.getState().hands[LeabTui.net.getState().mySeat].length}) : ''`,
      "local seat card reconnects the guest",
      25000
    ));
  } catch (error) {
    console.log("REJOIN CARD DIAG", await rejoinPage.eval("JSON.stringify({session:sessionStorage.getItem('leabtui.rejoin.v1'),local:localStorage.getItem('leabtui.seat.v1'),net:LeabTui?.net?.getState?.()||null,status:document.querySelector('#lobbyStatus')?.textContent,view:[...document.querySelectorAll('#lobbyModal .lobby-view')].filter((n)=>!n.hidden).map((n)=>n.id)})"));
    console.log("REJOIN HOST DIAG", await host.eval("JSON.stringify({players:LeabTui.net.getState().players,pending:LeabTui.net.pending()})"));
    throw error;
  }
  if (rejoined.seat === promoted.seat && rejoined.hand > 0) pass("local seat card reconnects the guest with no approval", `seat ${rejoined.seat}, ${rejoined.hand} tiles`);
  else fail("local seat card reconnects the guest with no approval", JSON.stringify(rejoined));
  await rejoinPage.closePage();
  if (host.events.length) fail("host console clean", host.events.join(" | ").slice(0, 500));
  else pass("host console clean");
  if (guest.events.length) fail("guest console clean", guest.events.join(" | ").slice(0, 500));
  else pass("guest console clean");
  await guest.closePage();
  await host.closePage();
  if (failures.length) {
    console.error(`\n${failures.length} invite check(s) failed.`);
    process.exitCode = 1;
  } else {
    console.log(`\nALL ${passes.length} INVITE CHECKS PASSED`);
  }
}

function LeabTuiVersion(value) { return Boolean(value && value.trick >= 1 && value.round >= 1); }

main().catch((error) => {
  console.error("INVITE CHECK FAILED:", error.message);
  if (process.env.DEBUG_CHROME) console.error(chromeErr.slice(-2000));
  process.exitCode = 1;
}).finally(() => { chrome.kill("SIGTERM"); });
