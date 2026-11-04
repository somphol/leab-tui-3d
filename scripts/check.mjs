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
  "scripts/browser-check.mjs",
  "docs/README.md",
  "docs/RULES.md",
  "docs/ARCHITECTURE.md",
  "docs/CODE_MAP.md",
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
  "screenshots/rules.jpg"
];

for (const file of required) {
  ok(exists(file), "missing required file", file);
}

const index = read("index.html");
const css = read("style.css");
const script = read("script.js");
const readme = read("README.md");
const agents = read("AGENTS.md");
const changelog = read("CHANGELOG.md");
const state = JSON.parse(read("state.json"));

ok(/<meta charset="utf-8"/i.test(index), "index has charset");
ok(/name="viewport"/i.test(index), "index has viewport");
ok(/name="description"/i.test(index), "index has description");
ok(/Content-Security-Policy/.test(index), "index has CSP");
ok(/type="importmap"/.test(index), "index has an import map");
ok(index.includes("three@0.160.0/build/three.module.js"), "Three.js r160 is pinned");
ok(index.includes("three@0.160.0/examples/jsm/"), "OrbitControls addons are pinned");
ok(index.includes('href="style.css"'), "index links style.css");
ok(index.includes('src="script.js"'), "index loads script.js as a module");
ok(index.includes('type="module"'), "script.js is a module");
const indexForRemote = index
  .replace(/https:\/\/somphol\.github\.io[^" ]*/g, "")
  .replace(/https:\/\/github\.com\/somphol\/leab-tui-3d/g, "");
ok(!/https?:\/\/(?!cdn\.jsdelivr\.net)/.test(indexForRemote), "index has no unexpected remote dependency");

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

ok(script.includes("function scorePiles"), "scorePiles exists");
ok(script.includes("if (piles >= 8) return 16;"), "Chuan scores 16");
ok(script.includes("return piles - 2;"), "par scoring is piles - 2");
ok(script.includes('["single", "pair", "triple", "quad", "quint", "sahoo", "seehoo", "ngohoo", "lakhoo"]'), "all nine combination types are declared");
ok(/if \(n === 2\) \{[\s\S]*?tiles\[0\]\.power !== 7/.test(script), "General pair is rejected in detection");
ok(script.includes("CORE_BIG") && script.includes("CORE_SMALL"), "both straight cores are declared");
ok(script.includes("function simulateRound"), "round simulation exists");
ok(script.includes("function selfTest"), "self-test exists");

// Count the self-test checks to keep the documented count honest.
const selfTestBody = script.slice(script.indexOf("function selfTest()"), script.indexOf("function simulateRound"));
const selfTestCount = (selfTestBody.match(/check\(/g) || []).length;
ok(selfTestCount >= 25, "self-test has at least 25 checks", String(selfTestCount));

// i18n symmetry
const enBlock = script.slice(script.indexOf("  en: {"), script.indexOf("  th: {"));
const thBlock = script.slice(script.indexOf("  th: {"), script.indexOf("let LANG"));
const keys = (block) => [...block.matchAll(/^\s{4}"([^"]+)":/gm)].map((match) => match[1]).sort();
const enKeys = keys(enBlock);
const thKeys = keys(thBlock);
const missingTh = enKeys.filter((key) => !thKeys.includes(key));
const missingEn = thKeys.filter((key) => !enKeys.includes(key));
ok(enKeys.length >= 200, "English dictionary is substantial", String(enKeys.length));
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
for (const file of ["index.html", "style.css", "script.js", "README.md", "AGENTS.md", "STATE.md", "state.json"]) {
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

if (failures.length) {
  console.error(`\nFAIL ${failures.length} of ${checks} checks\n`);
  for (const failure of failures) console.error(`  ✗ ${failure}`);
  process.exit(1);
}

console.log(`PASS ${checks}/${checks} checks`);
