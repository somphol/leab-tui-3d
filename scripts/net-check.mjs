#!/usr/bin/env node
/**
 * Two-client WebRTC verification for Leab-Tui 3D.
 *
 *   python3 -m http.server 8123 &
 *   node scripts/net-check.mjs
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
  await host.goto(`${BASE}?mode=host&name=Host`);
  const hostNet = await host.waitFor("JSON.stringify(window.LeabTui?.net.getState?.() || null)", "host room open", 30000);
  const hostState = JSON.parse(hostNet);
  if (hostState.role === "host" && /^\d{3}-\d{3}$/.test(hostState.code)) pass("host opened a room number", hostState.code);
  else fail("host opened a branded room", hostNet);
  const code = hostState.code.replace("-", "");
  const roomPin = "48213";
  await host.eval(`LeabTui.net.setPin(${JSON.stringify(roomPin)})`);

  const guestWs = await newTarget(`${BASE}?room=${code}&name=Guest&pin=${encodeURIComponent(roomPin)}`);
  const guest = await Session.connect(guestWs);
  await sleep(2500);
  const pending = JSON.parse(await host.waitFor(
    "window.LeabTui?.net.pending?.().length >= 1 ? JSON.stringify(window.LeabTui.net.pending()) : ''",
    "host approval queue",
    20000
  ));
  if (pending.length === 1 && pending[0].name === "Guest") pass("PIN accepted and guest is held for host approval", pending[0].name);
  else fail("PIN accepted and guest is held for host approval", JSON.stringify(pending));
  const approveControls = await host.eval("document.querySelectorAll('#lobbyPending [data-approve]').length");
  if (approveControls === 1) pass("host sees an approval control for the request");
  else fail("host sees an approval control for the request", String(approveControls));
  await host.eval(`LeabTui.net.approve(${JSON.stringify(pending[0].connId)}); true`);

  const guestNet = await guest.waitFor("window.LeabTui?.net.getState?.()?.role === 'client' ? JSON.stringify(window.LeabTui.net.getState()) : ''", "guest joined", 30000);
  const guestState = JSON.parse(guestNet);
  if (guestState.role === "client" && guestState.mySeat >= 1) pass("guest joined a seat", `seat ${guestState.mySeat}`);
  else fail("guest joined a seat", guestNet);

  const probe = JSON.parse(await guest.eval(`LeabTui.net.probe(${JSON.stringify(code)}, ${JSON.stringify(roomPin)}).then((r) => JSON.stringify(r))`));
  const noPinProbe = JSON.parse(await guest.eval(`LeabTui.net.probe(${JSON.stringify(code)}, "").then((r) => JSON.stringify(r))`));
  if (probe.pinRequired && probe.pinAccepted && !noPinProbe.pinAccepted) {
    pass("diagnostic probe reports PIN acceptance", `pinRequired=${probe.pinRequired}`);
  } else {
    fail("diagnostic probe reports PIN acceptance", JSON.stringify({ probe, noPinProbe }));
  }

  const roster = await host.waitFor("JSON.stringify(window.LeabTui?.net.getState?.().players || null)", "host roster", 12000);
  const players = JSON.parse(roster);
  if (players.filter((player) => player.kind === "host" || player.kind === "human").length === 2) pass("lobby sees two humans");
  else fail("lobby sees two humans", roster);

  const badWs = await newTarget(`${BASE}?room=${code}&name=Mallory&pin=00000`);
  const bad = await Session.connect(badWs);
  await sleep(2500);
  const badStatus = await bad.waitFor(
    "document.querySelector('#lobbyStatus')?.textContent?.includes('Wrong room PIN') ? document.querySelector('#lobbyStatus').textContent : ''",
    "wrong PIN rejection",
    20000
  );
  if (badStatus) pass("wrong PIN is rejected", badStatus);
  else fail("wrong PIN is rejected", "no status");
  await bad.closePage();

  await host.eval("document.querySelector('#lobbyStartBtn').click(); true");
  const guestPhase = await guest.waitFor("['lead','follow'].includes(window.LeabTui?.getState?.()?.phase) ? window.LeabTui.getState().phase : ''", "guest received match state", 30000);
  if (["lead", "follow"].includes(guestPhase)) pass("guest received authoritative state", guestPhase);
  else fail("guest received authoritative state", guestPhase);

  const privacy = await guest.eval(`JSON.stringify({
    seat: LeabTui.net.getState().mySeat,
    own: LeabTui.getState().hands[LeabTui.net.getState().mySeat].map((t) => typeof t === "string" ? t : t?.id ?? null),
    other: LeabTui.getState().hands.filter((_, i) => i !== LeabTui.net.getState().mySeat).flat().map((t) => typeof t === "string" ? t : t?.id ?? null),
    turn: LeabTui.getState().turn,
    phase: LeabTui.getState().phase,
    seats: LeabTui.net.getState().players.map((p) => p.kind)
  })`);
  const view = JSON.parse(privacy);
  if (view.own.length === 8 && view.own.every((id) => !id.startsWith("ghost-"))) pass("guest sees its own eight real tiles");
  else fail("guest sees its own eight real tiles", JSON.stringify(view.own));
  if (view.other.length === 24 && view.other.every((id) => id.startsWith("ghost-"))) pass("other hands are ghosted on the wire");
  else fail("other hands are ghosted on the wire", JSON.stringify(view.other));
  if (view.seats.filter((kind) => kind === "bot").length === 2) pass("two empty seats filled with bots");
  else fail("two empty seats filled with bots", JSON.stringify(view.seats));

  if (process.env.GUEST_SHOT) {
    await sleep(1200);
    await guest.screenshot(process.env.GUEST_SHOT);
    console.log(`GUEST SHOT ${process.env.GUEST_SHOT}`);
  }

  await host.eval("LeabTui.net.openLobby(); true");
  await sleep(400);
  const hostControls = JSON.parse(await host.eval(`JSON.stringify({
    leave: !document.querySelector('#leaveRoomBtn').hidden,
    startHidden: document.querySelector('#lobbyStartBtn').hidden,
    back: document.querySelector('#lobbyHostPanel [data-lobby-back]').textContent,
    title: document.querySelector('#lobbyTitle').textContent
  })`));
  if (hostControls.leave && hostControls.startHidden && /leave/i.test(hostControls.back)) {
    pass("host in-game controls: leave visible, start hidden", hostControls.title);
  } else {
    fail("host in-game controls: leave visible, start hidden", JSON.stringify(hostControls));
  }
  await host.eval("document.querySelector('#lobbyModal').hidden = true; true");

  await guest.eval("LeabTui.chat.send('Guest says hello'); true");
  await sleep(800);
  const hostChat = JSON.parse(await host.eval("JSON.stringify(LeabTui.chat.messages())"));
  const guestChat = JSON.parse(await guest.eval("JSON.stringify(LeabTui.chat.messages())"));
  if (hostChat.some((m) => m.text === "Guest says hello") && guestChat.some((m) => m.text === "Guest says hello")) {
    pass("text chat crossed the data channel", `${hostChat.length} host / ${guestChat.length} guest message(s)`);
  } else {
    fail("text chat crossed the data channel", JSON.stringify({ hostChat, guestChat }));
  }

  const synth = `(async () => {
    const ctx = new AudioContext();
    await ctx.resume();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const dest = ctx.createMediaStreamDestination();
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(dest);
    osc.start();
    window.__fakeVoice = { ctx, osc, gain, stream: dest.stream };
    return dest.stream.getAudioTracks().length;
  })()`;
  await host.eval(synth);
  await guest.eval(synth);
  await host.eval("LeabTui.voice.joinWithStream(window.__fakeVoice.stream)");
  await guest.eval("LeabTui.voice.joinWithStream(window.__fakeVoice.stream)");
  const voiceHost = JSON.parse(await host.waitFor(`window.LeabTui.voice.state()?.remotes >= 1 ? JSON.stringify({
    state: LeabTui.voice.state(),
    audio: [...document.querySelectorAll('audio.remote-player-audio')].map((a) => ({ muted: a.muted, hasStream: Boolean(a.srcObject) }))
  }) : ''`, "host voice stream", 20000));
  const voiceGuest = JSON.parse(await guest.waitFor(`window.LeabTui.voice.state()?.remotes >= 1 ? JSON.stringify({
    state: LeabTui.voice.state(),
    audio: [...document.querySelectorAll('audio.remote-player-audio')].map((a) => ({ muted: a.muted, hasStream: Boolean(a.srcObject) }))
  }) : ''`, "guest voice stream", 20000));
  if (voiceHost.state.joined && voiceHost.audio.length >= 1 && voiceHost.audio.every((a) => a.hasStream)
    && voiceGuest.state.joined && voiceGuest.audio.length >= 1 && voiceGuest.audio.every((a) => a.hasStream)) {
    pass("voice mesh attached remote audio", `${voiceHost.audio.length}+${voiceGuest.audio.length} stream(s)`);
  } else {
    fail("voice mesh attached remote audio", JSON.stringify({ voiceHost, voiceGuest }));
  }

  const micState = JSON.parse(await host.eval("LeabTui.voice.mic(true); JSON.stringify(LeabTui.voice.state())"));
  if (micState.micMuted && micState.micEnabled === false) pass("mic mute disables the local track");
  else fail("mic mute disables the local track", JSON.stringify(micState));
  await host.eval("LeabTui.voice.mic(false); true");

  await guest.eval("LeabTui.voice.deafen(true); true");
  await sleep(200);
  const mutedRemotes = JSON.parse(await guest.eval("JSON.stringify([...document.querySelectorAll('audio.remote-player-audio')].map((a) => a.muted))"));
  if (mutedRemotes.length >= 1 && mutedRemotes.every(Boolean)) pass("deafen mutes every remote audio element", `${mutedRemotes.length} element(s)`);
  else fail("deafen mutes every remote audio element", JSON.stringify(mutedRemotes));
  await guest.eval("LeabTui.voice.deafen(false); true");

  // Drive whichever human seat is on turn until a trick resolves. This works
  // regardless of who holds the red General and exercises both directions of
  // the action channel.
  const hostSeat = 0;
  const guestSeat = view.seat;

  // Guest arrangement relay: positions only, never tile identities.
  const guestSlots = JSON.parse(await guest.eval("JSON.stringify(LeabTui.exportHandSlots())"));
  await guest.eval("LeabTui.publishHandLayout(LeabTui.exportHandSlots()); true");
  await sleep(600);
  const hostLayout = JSON.parse(await host.eval(`JSON.stringify(LeabTui.getSeatLayout(${guestSeat}))`));
  if (Array.isArray(hostLayout) && hostLayout.length === guestSlots.length && guestSlots.length > 0) {
    pass("guest hand layout reached the host", `${guestSlots.length} slots`);
  } else {
    fail("guest hand layout reached the host", JSON.stringify({ guest: guestSlots.length, host: hostLayout }));
  }
  await guest.eval("LeabTui.publishHandLayout(null); true");
  await sleep(500);
  const clearedLayout = JSON.parse(await host.eval(`JSON.stringify(LeabTui.getSeatLayout(${guestSeat}))`));
  if (clearedLayout === null) pass("tidy cleared the relayed layout");
  else fail("tidy cleared the relayed layout", JSON.stringify(clearedLayout));

  // Drive whichever human seat is on turn until a trick resolves.
  let acted = 0;
  let resolved = null;
  for (let step = 0; step < 40; step += 1) {
    const snapshot = JSON.parse(await guest.eval(`JSON.stringify({
      phase: LeabTui.getState().phase,
      turn: LeabTui.getState().turn,
      trick: LeabTui.getState().trick,
      center: LeabTui.getState().center.length,
      lastWinner: LeabTui.getState().lastTrick?.winner ?? null
    })`));
    if (snapshot.phase === "showdown" && snapshot.turn === guestSeat) {
      await guest.eval("(LeabTui.showdown(true) || LeabTui.showdown(false)); true");
      acted += 1;
      await sleep(500);
    } else if (snapshot.phase === "showdown" && snapshot.turn === hostSeat) {
      await host.eval("(LeabTui.showdown(true) || LeabTui.showdown(false)); true");
      acted += 1;
      await sleep(500);
    } else if (snapshot.phase === "follow" && snapshot.turn === guestSeat) {
      await guest.eval("LeabTui.hint(); LeabTui.follow(LeabTui.getState().selected, false); true");
      acted += 1;
      await sleep(700);
    } else if (snapshot.phase === "follow" && snapshot.turn === hostSeat) {
      await host.eval("LeabTui.hint(); LeabTui.follow(LeabTui.getState().selected, false); true");
      acted += 1;
      await sleep(700);
    } else if (snapshot.phase === "lead" && snapshot.turn === guestSeat) {
      await guest.eval("LeabTui.hint(); LeabTui.lead(LeabTui.getState().selected); true");
      acted += 1;
      await sleep(900);
    } else if (snapshot.phase === "lead" && snapshot.turn === hostSeat) {
      await host.eval("LeabTui.hint(); LeabTui.lead(LeabTui.getState().selected); true");
      acted += 1;
      await sleep(900);
    } else if (snapshot.phase === "roundEnd" || snapshot.phase === "matchEnd") {
      resolved = snapshot;
      break;
    } else if (snapshot.lastWinner !== null && snapshot.phase !== "resolving") {
      resolved = snapshot;
      break;
    } else {
      await sleep(700);
    }
  }
  if (acted > 0) pass("human actions crossed the data channel", `${acted} action(s)`);
  else fail("human actions crossed the data channel", "no turn reached a human seat");
  const after = JSON.parse(await guest.eval("JSON.stringify({trick:LeabTui.getState().trick, center:LeabTui.getState().center.length, lastWinner:LeabTui.getState().lastTrick?.winner ?? null, scores:LeabTui.getState().scores})"));
  if (after.lastWinner !== null || after.trick >= 2 || resolved) pass("a trick resolved and state advanced", JSON.stringify(after));
  else fail("a trick resolved and state advanced", JSON.stringify(after));

  // Rejoin after a reload (the version-update path): the guest keeps a token
  // in sessionStorage and must reclaim the same seat without PIN or approval.
  const rejoinInfo = JSON.parse(await guest.eval("JSON.stringify(JSON.parse(sessionStorage.getItem('leabtui.rejoin.v1') || 'null'))"));
  if (rejoinInfo?.token && rejoinInfo?.code) pass("guest stored a rejoin token", `seat ${rejoinInfo.seat}`);
  else fail("guest stored a rejoin token", JSON.stringify(rejoinInfo));
  const beforeReload = JSON.parse(await guest.eval("JSON.stringify({seat:LeabTui.net.getState().mySeat,trick:LeabTui.getState().trick,phase:LeabTui.getState().phase})"));
  await guest.send("Page.reload");
  const rejoinedRaw = await guest.waitFor(
    "window.LeabTui?.net?.getState?.().role === 'client' && window.LeabTui?.getState?.() ? JSON.stringify({seat:LeabTui.net.getState().mySeat,trick:LeabTui.getState().trick,phase:LeabTui.getState().phase}) : ''",
    "guest auto-rejoin",
    30000
  );
  const rejoined = JSON.parse(rejoinedRaw);
  if (rejoined.seat === beforeReload.seat && rejoined.trick >= beforeReload.trick) pass("guest auto-rejoined the same seat", `seat ${rejoined.seat}, trick ${rejoined.trick}`);
  else fail("guest auto-rejoined the same seat", JSON.stringify({ beforeReload, rejoined }));
  const rosterAfterReload = JSON.parse(await host.eval("JSON.stringify(LeabTui.net.getState().players)"));
  const seatAfterReload = rosterAfterReload[beforeReload.seat];
  if (seatAfterReload?.kind === "human" && seatAfterReload?.connected) pass("host reclaimed the seat for the guest", seatAfterReload.name);
  else fail("host reclaimed the seat for the guest", JSON.stringify(seatAfterReload));

  // Disconnect handling: close the guest tab, host must replace the seat with a bot.
  await guest.closePage();
  const takeover = await host.waitFor("window.LeabTui?.net.getState?.().players?.[1]?.kind === 'bot' ? JSON.stringify(window.LeabTui.net.getState().players) : ''", "host roster after close", 20000);
  const afterClose = JSON.parse(takeover);
  if (afterClose[1]?.kind === "bot" && /^Bot/.test(afterClose[1]?.name || "")) pass("disconnected guest converted to a bot", afterClose[1].name);
  else fail("disconnected guest converted to a bot", takeover);

  if (host.events.length) fail("host console clean", host.events.join(" | ").slice(0, 500));
  else pass("host console clean");
  if (guest.events.length) fail("guest console clean", guest.events.join(" | ").slice(0, 500));
  else pass("guest console clean");

  host.close();
  if (failures.length) {
    console.error(`\n${failures.length} multiplayer check(s) failed.`);
    process.exitCode = 1;
  } else {
    console.log(`\nALL ${passes.length} MULTIPLAYER CHECKS PASSED`);
  }
}

main()
  .catch((error) => {
    console.error("NET CHECK FAILED:", error.message);
    if (process.env.DEBUG_CHROME) console.error(chromeErr.slice(-2000));
    process.exitCode = 1;
  })
  .finally(() => {
    chrome.kill("SIGTERM");
  });
