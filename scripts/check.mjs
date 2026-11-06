#!/usr/bin/env node
/**
 * Dependency-free release check for Leab-Tui 3D.
 *
 *   node scripts/check.mjs
 *
 * Verifies files, local links, version identity, the Three.js pin, i18n parity,
 * rules constants, serialization policy, storage/export names, screenshots and
 * the build record. Exit 0 on success, 1 on failure.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
let checks = 0;

function ok(condition, label, detail = "") {
  checks += 1;
  if (!condition) failures.push(`${label}${detail ? ` — ${detail}` : ""}`);
  return condition;
}

function read(file) {
  return readFileSync(join(root, file), "utf8");
}

function exists(file) {
  return existsSync(join(root, file));
}

const required = [
  "index.html",
  "style.css",
  "script.js",
  "peer-manager.js",
  "voice-chat.js",
  "security.js",
  "favicon.svg",
  "README.md",
  "AGENTS.md",
  "STATE.md",
  "state.json",
  "LICENSE",
  "CHANGELOG.md",
  "CONTRIBUTING.md",
  "CODE_OF_CONDUCT.md",
  "SECURITY.md",
  "SUPPORT.md",
  "PRIVACY.md",
  "AUTHORS.md",
  "CITATION.cff",
  "THIRD_PARTY_NOTICES.md",
  ".nojekyll",
  "robots.txt",
  "sitemap.xml",
  ".editorconfig",
  ".gitattributes",
  ".gitignore",
  ".github/CODEOWNERS",
  ".github/PULL_REQUEST_TEMPLATE.md",
  ".github/ISSUE_TEMPLATE/bug_report.yml",
  ".github/ISSUE_TEMPLATE/feature_request.yml",
  ".github/workflows/static-check.yml",
  "scripts/check.mjs",
  "scripts/verify.mjs",
  "scripts/net-check.mjs",
  "scripts/browser-check.mjs",
  "docs/README.md",
  "docs/RULES.md",
  "docs/ARCHITECTURE.md",
  "docs/CODE_MAP.md",
  "docs/MULTIPLAYER.md",
  "docs/PROTOCOL.md",
  "docs/TESTING.md",
  "docs/DEPLOYMENT.md",
  "docs/REPRODUCTION.md",
  "docs/DATA_FORMAT.md",
  "docs/CONTROLS.md",
  "docs/ACCESSIBILITY.md",
  "docs/PERFORMANCE.md",
  "docs/DESIGN.md",
  "docs/FAQ.md",
  "docs/ROADMAP.md",
  "docs/RELEASE_CHECKLIST.md",
  "docs/HANDOFF.md",
  "docs/GALLERY.md",
  "docs/GLOSSARY.md",
  "docs/BROWSER_SUPPORT.md",
  "screenshots/hero.jpg",
  "screenshots/thai.jpg",
  "screenshots/mobile.jpg",
  "screenshots/rules.jpg",
  "screenshots/jade.jpg",
  "screenshots/midnight.jpg",
  "screenshots/display.jpg",
  "screenshots/mobile-xl.jpg",
  "screenshots/parchment.jpg",
  "screenshots/daybreak.jpg",
  "screenshots/ranks.jpg",
  "screenshots/lobby.jpg",
  "screenshots/lobby-mobile.jpg",
  "screenshots/guest-play.jpg",
  "screenshots/mobile-leave.jpg",
  "screenshots/chat-voice.jpg",
  "screenshots/mobile-chat.jpg",
  "screenshots/host-security.jpg"
];

for (const file of required) {
  ok(exists(file), "missing required file", file);
}

const index = read("index.html");
const css = read("style.css");
const script = read("script.js");
const peer = read("peer-manager.js");
const voice = read("voice-chat.js");
const security = read("security.js");
const readme = read("README.md");
const agents = read("AGENTS.md");
const changelog = read("CHANGELOG.md");
const state = JSON.parse(read("state.json"));

ok(/<meta charset="utf-8"/i.test(index), "index has charset");
ok(/name="viewport"/i.test(index), "index has viewport");
ok(/name="description"/i.test(index), "index has description");
ok(/Content-Security-Policy/.test(index), "index has CSP");
ok(index.includes("https://0.peerjs.com") && index.includes("wss://0.peerjs.com"), "CSP allows the PeerJS broker");
ok(index.includes('id="lobbyModal"') && index.includes('id="lobbyHost"') && index.includes('id="lobbyJoin"'), "launch lobby markup exists");
ok(index.includes('id="netChip"'), "network room chip exists");
ok(index.includes('id="chatPanel"') && index.includes('id="chatList"') && index.includes('id="chatForm"'), "table chat markup exists");
ok(index.includes('id="voiceJoinBtn"') && index.includes('id="micBtn"') && index.includes('id="deafenBtn"'), "voice controls exist");
ok(index.includes('id="hostApproval"') && index.includes('id="hostPin"') && index.includes('id="lobbyPinInput"'), "approval and PIN controls exist");
ok(index.includes('id="lobbyPending"') && index.includes('id="lobbyApproveAll"'), "pending request UI exists");
ok(index.includes('id="remoteAudio"') && css.includes(".remote-audio") && css.includes(".chat-panel"), "remote audio and chat styles exist");
ok(/type="importmap"/.test(index), "index has an import map");
ok(index.includes("three@0.160.0/build/three.module.js"), "Three.js r160 is pinned");
ok(index.includes("three@0.160.0/examples/jsm/"), "OrbitControls addons are pinned");
ok(index.includes('href="style.css"'), "index links style.css");
ok(index.includes('src="script.js"'), "index loads script.js as a module");
ok(index.includes('type="module"'), "script.js is a module");
const indexForRemote = index
  .replace(/https:\/\/somphol\.github\.io[^" ]*/g, "")
  .replace(/https:\/\/github\.com\/somphol\/leab-tui-3d/g, "");
ok(!/https?:\/\/(?!cdn\.jsdelivr\.net|0\.peerjs\.com)/.test(indexForRemote), "index has no unexpected remote dependency");

const appVersion = (script.match(/version:\s*"([0-9]+\.[0-9]+\.[0-9]+)"/) || [])[1];
ok(/^\d+\.\d+\.\d+$/.test(appVersion || ""), "APP.version is semver", appVersion || "missing");
ok(state.projectVersion === appVersion || state.version === appVersion, "state.json version matches the app", `${state.projectVersion || state.version} vs ${appVersion}`);
ok(readme.includes(`release-v${appVersion}`), "README badge matches the app version");
ok(changelog.includes(`## [${appVersion}]`), "CHANGELOG has the current version");

ok(script.includes('storageKey: "leabtui.match.v1"'), "match storage key is pinned");
ok(script.includes('prefsKey: "leabtui.prefs.v1"'), "prefs storage key is pinned");
ok(script.includes('statsKey: "leabtui.stats.v1"'), "stats storage key is pinned");
ok(script.includes('exportName: "leab_tui_3d_game.json"'), "export filename is pinned");
ok(script.includes('format: "leab-tui-3d-save"'), "export format is pinned");

ok(script.includes("delete base.snapshot"), "serialization strips the recursive snapshot");
ok(script.includes("copy.hands = source.hands.map"), "serialization converts hands to IDs");
ok(script.includes("copy.captures = source.captures.map"), "serialization converts captures to IDs");
ok(script.includes("serializeCombo"), "combination serializer exists");
ok(!/localStorage\.setItem\([^,]+,\s*JSON\.stringify\(state\)/.test(script), "live state is not written to localStorage");
ok(script.includes("window.LeabTui"), "public test surface exists");
ok(script.includes("function sanitizeForSeat"), "per-seat redaction exists");
ok(script.includes("hiddenTags"), "host-only tile tags exist");
ok(script.includes("delete base.hiddenTags"), "redaction map is stripped from saves");
ok(script.includes("function hydrateRemoteState"), "guest state hydration exists");
ok(script.includes("function startHostedMatch"), "host start path exists");
ok(script.includes("function convertSeatToBot"), "disconnect-to-bot path exists");
ok(script.includes("sendNetAction"), "guest action forwarding exists");
ok(script.includes("if (!net.started) return;"), "state is not published before the match starts");
ok(peer.includes('host: "0.peerjs.com"') && peer.includes("secure: true"), "PeerJS uses the public secure broker");
ok(peer.includes("stun:stun.l.google.com:19302"), "STUN fallback is configured");
ok(peer.includes("peerjs@${PEERJS_VERSION}") && peer.includes('PEERJS_VERSION = "1.5.4"'), "PeerJS version is pinned");
ok(peer.includes("export function makeRoomCode") && peer.includes("normalizeRoomCode"), "room code helpers exist");
ok(peer.includes("class PeerHost") && peer.includes("class PeerClient"), "host and guest transports exist");
ok(peer.includes("createLoopbackPair"), "loopback transport exists for tests");
ok(script.includes("function sendChat") && script.includes("function hostChat"), "chat routing exists");
ok(voice.includes("getUserMedia") && voice.includes("getAudioTracks") && voice.includes("enabled = !this.micMuted"), "mic mute uses the local track");
ok(voice.includes("audio.muted = this.deafened"), "deafen mutes remote audio elements");
ok(voice.includes("createMediaStreamSource") && voice.includes("onSpeaking"), "speaking meter exists");
ok(script.includes("syncVoicePeers") && script.includes("voice-state"), "voice roster sync exists");
ok(script.includes("pendingRequests") && script.includes("approvePending") && script.includes("requestGuest"), "host approval queue exists");
ok(script.includes("pinHash") && !/pin:\s*["']/.test(script), "PIN is stored as a digest, not plaintext");
ok(script.includes("net.security.approval") && script.includes("setRoomApproval"), "approval can be toggled");
ok(security.includes("PIN_MIN = 15") && security.includes("COMMON") && security.includes("validatePin"), "PIN policy and deny-list exist");
ok(security.includes("crypto.subtle.digest") && security.includes("SHA-256"), "PIN is hashed in memory");
ok(voice.includes("if (!peer || !this.joined"), "voice calls are allowlisted by roster");
ok(peer.includes("maxConnections") && peer.includes("rateLimit") && peer.includes("size > 16384"), "host has connection, rate and payload caps");
ok(script.includes("function renderRankReference"), "rank reference renderer exists");
ok(script.includes("function setRankReference"), "rank reference toggle exists");
ok(index.includes('id="rankReference"') && index.includes('id="rankReferenceBtn"'), "rank reference markup exists");
ok(css.includes(".rank-reference") && css.includes(".rank-step") && css.includes(".mini-tile"), "rank reference styles exist");
ok(script.includes("const FONT_SIZES"), "font size table exists");
ok(script.includes("scale: 0.9") && script.includes("scale: 1.24"), "four font sizes are defined");
ok(script.includes("const THEMES"), "theme table exists");
ok(script.includes('id: "jade"') && script.includes('id: "midnight"') && script.includes('id: "parchment"') && script.includes('id: "daybreak"'), "five themes are defined");
ok(script.includes("setTheme: applySceneTheme"), "scene theme switching is wired");
ok(script.includes("this.master.gain.value = 0.8"), "audio master gain is audible");
ok(script.includes("createDynamicsCompressor"), "audio compressor exists");
ok(script.includes("this.analyser"), "audio analyser tap exists");
ok(script.includes("ctx.resume().then"), "first-gesture audio retry exists");
ok(script.includes("scene.fog.color.set"), "scene fog follows the theme");
ok(script.includes('theme: "mahogany"') && script.includes('fontSize: "md"'), "display preferences have defaults");
ok(index.includes('id="displayModal"'), "display modal exists");
ok(index.includes('data-font-size="xl"'), "font size control exists");
ok(index.includes('data-theme-choice="jade"') && index.includes('data-theme-choice="parchment"') && index.includes('data-theme-choice="daybreak"'), "theme controls exist");
ok(css.includes('html[data-theme="jade"]') && css.includes('html[data-theme="midnight"]') && css.includes('html[data-theme="parchment"]') && css.includes('html[data-theme="daybreak"]'), "theme CSS exists");
ok(css.includes("--fs-scale") && css.includes("data-font-size=\"xl\""), "font scale CSS exists");

ok(script.includes("function scorePiles"), "scorePiles exists");
ok(script.includes("if (piles >= 8) return 16;"), "Chuan scores 16");
ok(script.includes("return piles - 2;"), "par scoring is piles - 2");
ok(script.includes('["single", "pair", "triple", "quad", "quint", "sahoo", "seehoo", "ngohoo", "lakhoo"]'), "all nine combination types are declared");
ok(/if \(n === 2\) \{[\s\S]*?tiles\[0\]\.power !== 7/.test(script), "General pair is rejected in detection");
ok(script.includes("CORE_BIG") && script.includes("CORE_SMALL"), "both straight cores are declared");
ok(script.includes("function simulateRound"), "round simulation exists");
ok(script.includes("function selfTest"), "self-test exists");

// Count the self-test checks to keep the documented count honest.
const selfTestBody = script.slice(script.indexOf("function netSelfTest()"), script.indexOf("function simulateRound"));
const selfTestCount = (selfTestBody.match(/check\(/g) || []).length;
ok(selfTestCount >= 37, "self-test has at least 37 checks", String(selfTestCount));

// i18n symmetry
const enBlock = script.slice(script.indexOf("  en: {"), script.indexOf("  th: {"));
const thBlock = script.slice(script.indexOf("  th: {"), script.indexOf("let LANG"));
const keys = (block) => [...block.matchAll(/^\s{4}"([^"]+)":/gm)].map((match) => match[1]).sort();
const enKeys = keys(enBlock);
const thKeys = keys(thBlock);
const missingTh = enKeys.filter((key) => !thKeys.includes(key));
const missingEn = thKeys.filter((key) => !enKeys.includes(key));
ok(enKeys.length >= 330, "English dictionary is substantial", String(enKeys.length));
ok(!missingTh.length && !missingEn.length, "i18n dictionaries are symmetrical", `missing TH: ${missingTh.join(",")} | missing EN: ${missingEn.join(",")}`);

// Relative Markdown links must exist.
const markdownFiles = ["README.md", "AGENTS.md", "STATE.md", "CHANGELOG.md", "CONTRIBUTING.md", "SECURITY.md", "SUPPORT.md", "PRIVACY.md", "THIRD_PARTY_NOTICES.md", ...required.filter((file) => file.startsWith("docs/") && file.endsWith(".md"))];
for (const file of markdownFiles) {
  if (!exists(file)) continue;
  const text = read(file);
  for (const match of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    const target = match[1];
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(target)) continue;
    const clean = target.split("#")[0].split("?")[0];
    if (!clean) continue;
    const resolved = resolve(root, dirname(file), clean);
    ok(existsSync(resolved), `broken relative link in ${file}`, target);
  }
}

ok(css.includes("@media (max-width: 960px)"), "tablet breakpoint exists");
ok(css.includes("@media (max-width: 640px)"), "phone breakpoint exists");
ok(css.includes("prefers-reduced-motion"), "reduced-motion support exists");
ok(css.includes(".hand-dock"), "hand dock styles exist");
ok(css.includes(".modal"), "modal styles exist");

ok(readme.includes("live-demo") && readme.includes("somphol.github.io/leab-tui-3d"), "README has the live demo");
ok(readme.includes("OpenCode") && readme.includes("DeepSeek V4.1 Flash"), "README credits the harness and model");
ok(readme.includes("docs/RULES.md"), "README links the rules");
ok(agents.includes("## 2. Commands") && agents.includes("## 6. Continuity"), "AGENTS.md follows the handoff structure");
ok(agents.includes("python3 -m http.server 8123"), "AGENTS.md has the run command");
ok(state.tokens && ["input", "output", "reasoning", "total"].every((key) => Number.isFinite(state.tokens[key])), "state.json token counts are numeric");
ok(state.build && state.build.durationSeconds >= 0, "state.json records a duration");
ok(state.model && state.model.modelID, "state.json records the model");
ok(state.harness && state.harness.name, "state.json records the harness");

// Secret scan (the repository is public).
const secretPatterns = [
  /ghp_[A-Za-z0-9]{20,}/,
  /github_pat_[A-Za-z0-9_]{20,}/,
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /AKIA[0-9A-Z]{16}/,
  /sk-[A-Za-z0-9]{20,}/
];
for (const file of ["index.html", "style.css", "script.js", "peer-manager.js", "voice-chat.js", "security.js", "README.md", "AGENTS.md", "STATE.md", "state.json"]) {
  if (!exists(file)) continue;
  for (const pattern of secretPatterns) {
    ok(!pattern.test(read(file)), `possible secret in ${file}`, pattern.source);
  }
}

try {
  execFileSync(process.execPath, ["--check", join(root, "script.js")], { stdio: "pipe" });
  ok(true, "script.js parses");
} catch (error) {
  ok(false, "script.js parses", error.message);
}

try {
  execFileSync(process.execPath, ["--check", join(root, "peer-manager.js")], { stdio: "pipe" });
  ok(true, "peer-manager.js parses");
} catch (error) {
  ok(false, "peer-manager.js parses", error.message);
}

try {
  execFileSync(process.execPath, ["--check", join(root, "voice-chat.js")], { stdio: "pipe" });
  ok(true, "voice-chat.js parses");
} catch (error) {
  ok(false, "voice-chat.js parses", error.message);
}

try {
  execFileSync(process.execPath, ["--check", join(root, "security.js")], { stdio: "pipe" });
  ok(true, "security.js parses");
} catch (error) {
  ok(false, "security.js parses", error.message);
}

if (failures.length) {
  console.error(`\nFAIL ${failures.length} of ${checks} checks\n`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}

console.log(`PASS ${checks}/${checks} checks`);
