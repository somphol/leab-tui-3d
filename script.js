/* ==========================================================================
   Leab-Tui 3D — Traditional Xiangqi Trick-Taking Studio
   Vanilla ES module. Three.js is imported dynamically so the rule engine,
   coaching, scoring and persistence still work if WebGL or the CDN fails.
   PeerJS is loaded lazily by peer-manager.js; the solo table needs no network
   beyond the pinned Three.js CDN.
   ========================================================================== */

import {
  PROTOCOL_VERSION,
  makeRoomCode,
  normalizeRoomCode,
  formatRoomCode,
  peerIdForCode,
  inviteUrl,
  openHostWithRetry,
  PeerClient,
  createLoopbackPair,
  isProtocolMessage
} from "./peer-manager.js?v=1.9.13";
import { VoiceChat } from "./voice-chat.js?v=1.9.13";
import { normalisePin, validatePin, hashPin, generatePin, PIN_POLICY } from "./security.js?v=1.9.13";

const APP = Object.freeze({
  name: "Leab-Tui 3D",
  fullName: "Leab-Tui 3D — Traditional Xiangqi Trick-Taking Studio",
  version: "1.9.13",
  format: "leab-tui-3d-save",
  storageKey: "leabtui.match.v1",
  prefsKey: "leabtui.prefs.v1",
  statsKey: "leabtui.stats.v1",
  exportName: "leab_tui_3d_game.json",
  repository: "https://github.com/somphol/leab-tui-3d",
  live: "https://somphol.github.io/leab-tui-3d/",
  license: "MIT",
  build: {
    startedAt: "2026-11-06T10:05:33-08:00",
    packagedAt: "2026-11-07T10:35:11-08:00",
    durationHuman: "24h 29m 37s",
    tokensTotal: "7758531",
    tokensInput: "6615671",
    tokensOutput: "607856",
    tokensReasoning: "535004",
    tokensCacheRead: "705187840",
    sessionId: "ses_e4df670e0ffeOm01DFj236fffs",
    harness: "OpenCode 2.2.5",
    model: "DeepSeek V4.1 Flash (opencode-go/deepseek-v4.1-flash)"
  }
});

/* --------------------------------------------------------------------------
   1. Tile data and layout constants
   -------------------------------------------------------------------------- */

const COLORS = Object.freeze({
  r: { id: "r", en: "Red", th: "แดง", hex: "#a31f28", ink: "#8d1f24", wind: "南" },
  b: { id: "b", en: "Black", th: "ดำ", hex: "#201a18", ink: "#1d1716", wind: "北" }
});

const RANKS = Object.freeze([
  { id: "soldier",  power: 1, copies: 5, en: "Soldier",  th: "จุก",  thMeaning: "พลทหาร",  red: "兵", black: "卒", note: { en: "The only rank with five copies; it can form same-rank sets.", th: "ฐานันดรเดียวที่มีห้าตัว จึงสร้างชุดตัวเหมือนได้" } },
  { id: "cannon",   power: 2, copies: 2, en: "Cannon",   th: "เผ่า", thMeaning: "ปืนใหญ่", red: "炮", black: "砲", note: { en: "Low straight member; pairs and straights are its value.", th: "ตัวเล็กในชุดเรียง มีค่าเมื่อจับคู่หรือเรียง" } },
  { id: "horse",    power: 3, copies: 2, en: "Horse",    th: "แบ้",  thMeaning: "ม้า",     red: "馬", black: "馬", note: { en: "Middle of the small straight Chariot–Horse–Cannon.", th: "ตัวกลางของชุดเล็ก รถศึก–ม้า–เผ่า" } },
  { id: "chariot",  power: 4, copies: 2, en: "Chariot",  th: "กือ",  thMeaning: "รถศึก",   red: "車", black: "車", note: { en: "Top of the small straight; a red Chariot pair is strong.", th: "หัวชุดเล็ก คู่กือแดงแข็งแรง" } },
  { id: "elephant", power: 5, copies: 2, en: "Elephant", th: "เฉีย", thMeaning: "ช้าง",     red: "相", black: "象", note: { en: "Foot of the big straight; only Advisors and Generals outrank it.", th: "ท้ายชุดใหญ่ มีเพียงสือและตี่ที่ใหญ่กว่า" } },
  { id: "advisor",  power: 6, copies: 2, en: "Advisor",  th: "สือ",  thMeaning: "องครักษ์", red: "仕", black: "士", note: { en: "Second only to the General; red Advisor pairs are the top pair.", th: "รองจากตี่ คู่สือแดงคือคู่ที่ใหญ่ที่สุด" } },
  { id: "general",  power: 7, copies: 1, en: "General",  th: "ตี่",  thMeaning: "แม่ทัพ",   thRed: "อั้งตี่", thBlack: "โอวตี่", red: "帥", black: "將", note: { en: "One per colour. It cannot form a pair, but wins every single. Red reads อั้งตี่, black reads โอวตี่.", th: "สีละหนึ่งตัว สร้างคู่ไม่ได้ แต่ชนะเลี๊ยบทุกตัว แดงเรียกอั้งตี่ ดำเรียกโอวตี่" } }
]);

const RANK_BY_ID = Object.fromEntries(RANKS.map((r) => [r.id, r]));
const RANK_BY_POWER = Object.fromEntries(RANKS.map((r) => [r.power, r]));
const SEATS = Object.freeze([
  { id: 0, key: "you",   wind: "南", angle: 0,             en: "You",   th: "คุณ",        short: "S" },
  { id: 1, key: "east",  wind: "東", angle: Math.PI / 2,   en: "East",  th: "บูรพา",      short: "E" },
  { id: 2, key: "north", wind: "北", angle: Math.PI,       en: "North", th: "อุดร",       short: "N" },
  { id: 3, key: "west",  wind: "西", angle: -Math.PI / 2,  en: "West",  th: "ประจิม",     short: "W" }
]);

const TABLE_SEATS = SEATS.length;
const MAX_HUMAN_SEATS = TABLE_SEATS;
const GHOST_PREFIX = "ghost-";
const NET_TICK_MS = 40;

const FONT_SIZES = Object.freeze([
  { id: "sm", scale: 0.9, labelKey: "display.small" },
  { id: "md", scale: 1.0, labelKey: "display.default" },
  { id: "lg", scale: 1.12, labelKey: "display.large" },
  { id: "xl", scale: 1.24, labelKey: "display.xlarge" }
]);

const THEMES = Object.freeze([
  { id: "mahogany", labelKey: "theme.mahogany", descKey: "theme.mahoganyDesc" },
  { id: "jade", labelKey: "theme.jade", descKey: "theme.jadeDesc" },
  { id: "midnight", labelKey: "theme.midnight", descKey: "theme.midnightDesc" },
  { id: "parchment", labelKey: "theme.parchment", descKey: "theme.parchmentDesc" },
  { id: "daybreak", labelKey: "theme.daybreak", descKey: "theme.daybreakDesc" }
]);

const SCENE_THEMES = Object.freeze({
  mahogany: {
    felt: ["#56222a", "#3d161d", "#240b0f"],
    ring: "#d8b26b",
    woodBase: "#3b180f",
    woodLight: "#8a4a28",
    woodDark: "#1c0804",
    woodTint: 0x8b5a3c,
    rim: 0x35150f,
    gold: 0xc9a35e,
    background: 0x0f0507,
    fog: 0x0f0507,
    key: 0xffe2b8,
    rimLight: 0x8fcbb6,
    warm: 0xffc78e,
    redGlow: 0xb63d52,
    jadeGlow: 0x5fa88c,
    floor: 0x17090c,
    tileSide: 0xe6d2ab,
    tileEdge: 0x9b7648,
    back: ["#65242c", "#43151c", "#250a0e"]
  },
  jade: {
    felt: ["#1d4a3d", "#12332a", "#07201a"],
    ring: "#d8c08a",
    woodBase: "#2e1d12",
    woodLight: "#6a4428",
    woodDark: "#160d07",
    woodTint: 0x8a6a4a,
    rim: 0x20382c,
    gold: 0xd8c08a,
    background: 0x06110d,
    fog: 0x06110d,
    key: 0xffe7c0,
    rimLight: 0x8fe0c3,
    warm: 0xffd7a0,
    redGlow: 0x3f8f74,
    jadeGlow: 0x8fe0c3,
    floor: 0x08150f,
    tileSide: 0xe9ddc3,
    tileEdge: 0x9aa87c,
    back: ["#2a4a3c", "#163026", "#081a14"]
  },
  midnight: {
    felt: ["#1a2438", "#101827", "#070c14"],
    ring: "#b9c9e6",
    woodBase: "#1a1410",
    woodLight: "#3f2f24",
    woodDark: "#0d0906",
    woodTint: 0x6a5a4a,
    rim: 0x17202e,
    gold: 0xb9c9e6,
    background: 0x05070d,
    fog: 0x05070d,
    key: 0xdce8ff,
    rimLight: 0x8fb8ff,
    warm: 0xffd9b0,
    redGlow: 0x6a4fae,
    jadeGlow: 0x5f9fd0,
    floor: 0x070a12,
    tileSide: 0xe4ddcb,
    tileEdge: 0x8d8a7a,
    back: ["#26324a", "#151f31", "#080d16"]
  },
  parchment: {
    felt: ["#4a5236", "#343d26", "#222a18"],
    ring: "#c9a35e",
    woodBase: "#4a2e1a",
    woodLight: "#8a623c",
    woodDark: "#2a160c",
    woodTint: 0x9a7048,
    rim: 0x3a2414,
    gold: 0xc9a35e,
    background: 0xd9cdb8,
    fog: 0xd9cdb8,
    key: 0xfff2d8,
    rimLight: 0xa8c7a0,
    warm: 0xffd9a8,
    redGlow: 0xb06a4a,
    jadeGlow: 0x6f9a78,
    floor: 0xb9a98f,
    tileSide: 0xf1e4c8,
    tileEdge: 0xb08a58,
    back: ["#7a4a2a", "#55301a", "#2e180c"]
  },
  daybreak: {
    felt: ["#2f5d63", "#1f464b", "#102d31"],
    ring: "#d8c08a",
    woodBase: "#6b4a30",
    woodLight: "#a67a52",
    woodDark: "#3a2416",
    woodTint: 0xb08a62,
    rim: 0x4a3220,
    gold: 0xd8c08a,
    background: 0xdbe7ea,
    fog: 0xdbe7ea,
    key: 0xf4f8ff,
    rimLight: 0x9fc7d6,
    warm: 0xffe2b8,
    redGlow: 0xc06a5a,
    jadeGlow: 0x6fb0b8,
    floor: 0xb8c8cc,
    tileSide: 0xf4ecd8,
    tileEdge: 0xb09a72,
    back: ["#4a6a72", "#304a52", "#182b30"]
  }
});

const TABLE_Y = 0.30;
const HAND_RADIUS = 4.12;
const HAND_PLAY_RADIUS = 2.8;
const CAPTURE_RADIUS = 5.9;
const CAPTURE_PILE_SPACING = 1.02;
const CENTER_TILE_SPACING = 0.96;
const CENTER_RADIUS = 2.05;
const TILE_THICKNESS = 0.15;
const TILE_RADIUS = 0.455;

const CORE_BIG = [7, 6, 5];
const CORE_SMALL = [4, 3, 2];
const COMBO_TYPES = ["single", "pair", "triple", "quad", "quint", "sahoo", "seehoo", "ngohoo", "lakhoo"];
const COMBO_COUNT = { single: 1, pair: 2, triple: 3, quad: 4, quint: 5, sahoo: 3, seehoo: 4, ngohoo: 5, lakhoo: 6 };
const STRAIGHT_NAMES = { big: { en: "big", th: "ใหญ่" }, small: { en: "small", th: "เล็ก" } };

/* --------------------------------------------------------------------------
   2. Utilities
   -------------------------------------------------------------------------- */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let random = Math.random;
let bootSeed = null;
function shuffle(list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function clone(value) {
  if (typeof structuredClone === "function") {
    try { return structuredClone(value); } catch { /* fall through */ }
  }
  return JSON.parse(JSON.stringify(value));
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

function formatTime(ms) {
  const seconds = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h) return `${h}h ${m}m ${s}s`;
  if (m) return `${m}m ${s}s`;
  return `${s}s`;
}

function nowISO() { return new Date().toISOString(); }

/* --------------------------------------------------------------------------
   3. Bilingual copy
   -------------------------------------------------------------------------- */

const I18N = {
  en: {
    "app.title": "Leab-Tui 3D",
    "app.subtitle": "Traditional Xiangqi Trick-Taking Studio",
    "hud.round": "Round",
    "hud.trick": "Turn",
    "hud.target": "Target",
    "hud.turn": "Now",
    "hud.call": "Call",
    "hud.result": "Result",
    "dock.select": "Select your tiles",
    "dock.leadTitle": "Choose a combination to lead",
    "dock.leadHelp": "Click carved tiles on the table. Tap Hint if you want a suggestion.",
    "dock.leadReady": "Ready to lead {combo}. {n} tile(s) selected.",
    "dock.followTitle": "{seat} led {combo}",
    "dock.followHelp": "Pick exactly {n} tile(s) of the called shape. Everyone sends face-down; the leader reveals first.",
    "dock.followHidden": "Send these {n} tiles face-down. The leader reveals first once all four have sent.",
    "dock.showdown": "Showdown",
    "dock.showdownTitle": "Show or keep hidden?",
    "dock.showdownCan": "Your {combo} beats {best}. Show it to take the trick.",
    "dock.showdownWait": "Only a revealed set can win. You may show yours even if it loses.",
    "dock.showdownLose": "Your {combo} does not beat {best}, but you may still show it.",
    "dock.showdownDouble": "Double-click your tile on the table to show it.",
    "dock.chuanReady": "Seven piles and the last Soldier: claim Chuan.",
    "dock.showdownFirst": "Show your set first",
    "dock.showdownFirstHelp": "You called this shape. Reveal it to set the mark for the other seats.",
    "dock.showdownNoBeat": "You cannot beat the table",
    "showdown.hidden": "face-down",
    "actions.showFirst": "Show first",
    "result.title": "Trick result",
    "dock.waiting": "{seat} is thinking…",
    "dock.pick": "Select {n} tile(s) for this trick.",
    "dock.selected": "{n} selected.",
    "actions.hint": "Hint",
    "actions.clear": "Clear",
    "actions.lead": "Lead",
    "actions.reveal": "Show & win",
    "actions.showWin": "Show & win",
    "actions.showSet": "Show set",
    "actions.redraw": "Redraw (โละ)",
    "actions.chuan": "Chuan",
    "actions.sendHidden": "Send face-down",
    "actions.keepHidden": "Keep hidden",
    "actions.tidy": "Tidy hand",
    "actions.revealLog": "showed",
    "actions.facedown": "Play face-down",
    "draft.title": "Draft — pick 2 tiles",
    "draft.metaYou": "You have {n} tiles · pick 2 from the pool ({step}/4). {pool} left.",
    "draft.waiting": "{seat} is picking 2 tiles…",
    "draft.waitingShort": "Waiting…",
    "draft.confirm": "Take these 2",
    "draft.toggle": "Draft next deal (experimental)",
    "draft.toggleHost": "Draft mode: pick 2 tiles ×4 (experimental)",
    "draft.toggleToast": "Draft mode will apply to the next deal.",
    "draft.chipOn": "Draft: on",
    "draft.chipOff": "Draft: off",
    "draft.chipTitle": "Draft deal (experimental): every seat picks 2 tiles ×4",
    "draft.onToast": "Draft on: the next deal lets every seat pick 2 tiles.",
    "draft.offToast": "Draft off: the next deal is automatic.",
    "actions.title": "Actions",
    "actions.newMatch": "New match",
    "actions.nextRound": "Next round",
    "actions.undo": "Cancel turn",
    "actions.export": "Export JSON",
    "actions.continue": "Continue",
    "actions.keep": "Keep playing",
    "actions.sound": "Sound",
    "display.title": "Display",
    "display.language": "Language",
    "display.font": "Text size",
    "display.small": "Small",
    "display.default": "Default",
    "display.large": "Large",
    "display.xlarge": "Extra large",
    "display.theme": "Theme",
    "display.note": "Text size scales the interface, not the 3D table. Theme changes the panels and the felt / wood palette.",
    "display.reset": "Reset display",
    "display.testSound": "Test sound",
    "theme.mahogany": "Mahogany",
    "theme.mahoganyDesc": "Burgundy felt, aged brass and lacquer red.",
    "theme.jade": "Jade Court",
    "theme.jadeDesc": "Deep green felt, cool brass and a jade glow.",
    "theme.midnight": "Midnight Lacquer",
    "theme.midnightDesc": "Blue-black felt, silver inlay and a cold table light.",
    "theme.parchment": "Parchment",
    "theme.parchmentDesc": "Warm ivory panels, dark ink and an olive table.",
    "theme.daybreak": "Daybreak",
    "theme.daybreakDesc": "Pale blue-white panels, navy ink and a teal table.",
    "toast.fontSize": "Text size set to {size}.",
    "toast.theme": "Theme set to {theme}.",
    "toast.displayReset": "Display settings reset.",
    "toast.soundTest": "Sound test — a wooden clack.",
    "rankRef.open": "Ranks",
    "rankRef.title": "Rank order",
    "rankRef.note": "General > Advisor > Elephant > Chariot > Horse > Cannon > Soldier. Red beats black at equal rank; if rank and colour are equal, the earlier play wins.",
    "rankRef.close": "Close rank order",
    "rankRef.highest": "Highest",
    "rankRef.lowest": "Lowest",
    "camera.hint": "Drag to orbit · drag a tile to arrange · drop it in the centre ring to play",
    "play.release": "Release to play",
    "view.top": "2D view",
    "view.3d": "3D view",
    "view.topShort": "2D",
    "view.3dShort": "3D",
    "view.switch": "Switch between 2D and 3D view",
    "coach.title": "Coach",
    "coach.live": "live",
    "score.title": "Match",
    "score.target": "First to",
    "score.points": "points",
    "score.pile": "pile",
    "score.piles": "piles",
    "lastTrick.button": "Last turn",
    "lastTrick.title": "Last turn",
    "log.history": "History",
    "log.browserTitle": "Turn history",
    "log.round": "Round",
    "log.trick": "Turn",
    "log.call": "Call",
    "log.winner": "Winner",
    "log.why": "Only revealed sets compete; the highest revealed set takes the trick. Face-down tiles stay hidden.",
    "log.chuan": "Chuan",
    "log.draftPick": "picked 2 tiles",
    "log.chuanWhy": "Chuan claim: seven piles plus the last Soldier. The Soldier takes the final trick by the special rule, not by rank.",
    "log.empty": "No tricks recorded yet.",
    "summary.viewLog": "View trick log",
    "summary.autoNext": "Auto-start next round (30s)",
    "lastTrick.winner": "{seat} won {n} tiles with {combo}",
    "pile.title": "{seat} · pile {n}",
    "pile.meta": "{n} tiles · {up} face-up",
    "pile.hidden": "Face-down tile",
    "pile.from": "from {seat}",
    "inspector.title": "Tile inspector",
    "inspector.hover": "hover",
    "inspector.empty": "Hover or click a carved tile to see its Thai name, English name and rank.",
    "inspector.rank": "Rank",
    "inspector.copies": "Copies",
    "inspector.color": "Colour",
    "inspector.hidden": "Face-down tile",
    "inspector.hiddenNote": "The carved face is hidden. In Leab-Tui, unrevealed tiles never win a trick — even if they could have.",
    "inspector.selected": "Selected for play",
    "inspector.note": "Hierarchy: General > Advisor > Elephant > Chariot > Horse > Cannon > Soldier. Red beats black at equal rank; equal rank and colour keeps the earlier play ahead.",
    "handList.title": "Your hand",
    "handList.hide": "hide",
    "handList.show": "show",
    "handList.empty": "No tiles left this round.",
    "log.title": "Turn log",
    "log.live": "live",
    "log.empty": "The table is quiet. Lead the first trick.",
    "footer.credit": "Built with OpenCode + DeepSeek V4.1 Flash",
    "error.webglTitle": "The 3D table could not start",
    "error.webglBody": "Three.js needs WebGL 2 and a network connection to the CDN. The rules, score and coaching panels still work.",
    "rules.title": "Rules of เลี๊ยบตุ่ย",
    "undo.title": "Why did that turn go wrong?",
    "about.title": "About this studio",
    "about.short": "About",
    "confirm.title": "Start a new match?",
    "confirm.body": "The current scores and round history will be cleared. Saved statistics stay.",
    "confirm.yes": "Start match",
    "confirm.no": "Cancel",
    "color.red": "Red",
    "color.black": "Black",
    "combo.single": "Leab",
    "combo.pair": "Tui",
    "combo.triple": "Sam Juk",
    "combo.quad": "Si Juk",
    "combo.quint": "Ha Juk",
    "combo.sahoo": "Sa Hoo",
    "combo.seehoo": "See Hoo",
    "combo.ngohoo": "Ngoh Hoo",
    "combo.lakhoo": "Lak Hoo",
    "combo.single.desc": "One tile. Highest rank wins; red beats black.",
    "combo.pair.desc": "Two identical tiles — same rank and same colour. Generals cannot pair.",
    "combo.triple.desc": "Three Soldiers of one colour.",
    "combo.quad.desc": "Four Soldiers of one colour.",
    "combo.quint.desc": "All five Soldiers of one colour.",
    "combo.sahoo.desc": "A three-tile straight: big (General–Advisor–Elephant) or small (Chariot–Horse–Cannon), one colour.",
    "combo.seehoo.desc": "Sa Hoo plus a duplicate of one member. The duplicated pair decides.",
    "combo.ngohoo.desc": "Sa Hoo with two member ranks doubled. The highest pair decides, then the second.",
    "combo.lakhoo.desc": "Both Chariot–Horse–Cannon pairs — six tiles. Colour decides.",
    "rank.1": "Soldier",
    "rank.2": "Cannon",
    "rank.3": "Horse",
    "rank.4": "Chariot",
    "rank.5": "Elephant",
    "rank.6": "Advisor",
    "rank.7": "General",
    "phase.dealing": "Dealing",
    "phase.lead": "Lead",
    "phase.follow": "Follow",
    "phase.bid": "Bid",
    "bid.kicker": "Auction",
    "bid.title": "How many piles will you take?",
    "bid.waiting": "{seat} is bidding…",
    "bid.help": "Bids so far total {total}. The last bidder may not make the total exactly 8.",
    "phase.resolving": "Resolving",
    "phase.roundEnd": "Round over",
    "phase.matchEnd": "Match over",
    "phase.ready": "Ready",
    "seat.you": "You",
    "seat.east": "East",
    "seat.north": "North",
    "seat.west": "West",
    "coach.welcome": "Welcome to the felt. The holder of the red General leads first.",
    "coach.dealing": "Shuffling 32 carved tiles. Eight to each seat.",
    "coach.yourLead": "Your lead. {n} tiles in hand. Choose a single, a pair, a straight or a Soldier set.",
    "coach.aiLead": "{seat} is choosing a lead…",
    "coach.follow": "{seat} led {combo}. Select exactly {n} tile(s).",
    "coach.followBeat": "{seat} played {combo}. You can beat it with {yours}. Show it to win the trick.",
    "coach.followNoBeat": "Your best {type} is {yours}, but {best} still wins. Send {n} tiles face-down and keep your strength.",
    "coach.followNoCombo": "You have no legal {type}. Send {n} tiles face-down — hidden tiles cannot win.",
    "coach.followHidden": "Send these {n} tiles face-down. Everyone sends hidden; the leader reveals first.",
    "coach.showdownYou": "The leader has revealed. Show your set or keep it hidden — showing a losing set is allowed.",
    "coach.showdownWait": "Showdown: {seat} is deciding whether to reveal.",
    "coach.allHidden": "all hidden",
    "coach.followReady": "Your {combo} beats {best}. Show it to win the trick and take the {tiles} tiles — or play face-down and keep them hidden.",
    "coach.followLose": "Your {combo} does not beat {best}. Play it face-down and save the tiles for a later lead.",
    "coach.invalidLead": "That mix is not a legal combination. A lead is 1 tile, 2 identical tiles, a 3–6 tile straight, or 3–5 identical Soldiers.",
    "coach.invalidFollow": "That selection is not a legal {type}. You may still send {n} tiles face-down.",
    "coach.selectMore": "Select {n} tile(s) for this trick. You have {m} selected.",
    "coach.hintLead": "Suggested lead: {combo}. {why}",
    "coach.hintFollow": "Suggested: {combo}. {why}",
    "coach.hintDiscard": "No beating {type} is available. Discard {n} low tiles face-down.",
    "coach.trickWon": "You took the trick with {combo}. {piles} pile(s) captured so far.",
    "coach.trickLost": "{seat} took the trick with {combo}. {why}",
    "coach.hiddenLost": "{seat} took the trick with {combo}. You played face-down, so your tiles could not compete.",
    "coach.roundEnd": "Round complete. You scored {points} point(s) and now hold {score}.",
    "coach.matchEnd": "Match complete. {winner}",
    "coach.chuan": "ช้วน! All eight piles captured — worth 16 points.",
    "coach.redTie": "Equal rank and colour: the earlier play stays ahead.",
    "coach.tilesLeft": "{n} tiles left in each hand.",
    "coach.youLead": "You lead the next trick.",
    "coach.otherLead": "{seat} leads the next trick.",
    "coach.lastTrick": "Last trick of the round.",
    "coach.rematch": "Press New match to play again.",
    "coach.whyPair": "Only a higher pair of the same colour can beat it.",
    "coach.whyStraight": "Only a stronger {type} can beat it; the set size and pair ranks matter.",
    "coach.whySingle": "Only a higher rank — or a red tile of the same rank — can beat it.",
    "coach.whySet": "Only a larger same-rank set of the same colour can beat it.",
    "coach.whyGeneral": "The General cannot be beaten as a single, but it cannot form a pair.",
    "coach.whyUnknown": "The revealed combination outranks yours.",
    "toast.dealt": "Eight tiles each. {seat} leads.",
    "toast.saved": "Match saved locally.",
    "toast.exported": "Game JSON downloaded.",
    "toast.undone": "Trick undone. Learn, then try again.",
    "toast.newMatch": "New match started.",
    "toast.nextRound": "Round {n} dealt.",
    "toast.soundOff": "Sound muted.",
    "toast.soundOn": "Sound on.",
    "toast.hint": "Hint applied to your selection.",
    "toast.noUndo": "Nothing to undo yet.",
    "toast.selectFirst": "Select the required tiles first.",
    "toast.notLegal": "That set cannot be revealed for this call.",
    "toast.copied": "Copied.",
    "toast.handTidied": "Hand tidied back into an arc.",
    "toast.modeNext": "Scoring changes apply to the next match.",
    "toast.redraw": "Redraw {n}: this round scores ×{n}.",
    "toast.trickResult": "{winner} wins with {combo} — {entries}",
    "toast.trickResultChuan": "{winner} completes Chuan with the last Soldier — {entries}",
    "toast.chuan": "Chuan! Seven piles plus the last Soldier.",
    "toast.draftDone": "Draft complete. The red General holder leads.",
    "toast.stayZone": "Keep your tiles inside your own area.",
    "toast.needMore": "Selected {n}/{m} — drag another tile.",
    "toast.stagedLead": "Staged {n} tile(s). Press Lead to play.",
    "toast.lang": "Language switched to English.",
    "summary.round": "Round {n} complete",
    "summary.match": "Match complete",
    "summary.congrats": "Congratulations!",
    "summary.waitingHost": "Waiting for the host to start the next round…",
    "summary.nextIn": "Next round in {n}s",
    "summary.you": "You",
    "summary.points": "points",
    "summary.piles": "piles",
    "summary.roundPoints": "Round points",
    "summary.total": "Match total",
    "summary.next": "Next round",
    "summary.newMatch": "New match",
    "summary.chuan": "Chuan — all 32 tiles captured",
    "summary.win": "You win the match.",
    "summary.lose": "{seat} wins the match.",
    "summary.draw": "The match is drawn.",
    "summary.targetReached": "First to {target} points.",
    "summary.streak": "Round streak ×{n}",
    "summary.note": "Scoring follows the traditional pile table: 2 piles is par (0), each pile above or below is one point, and all 8 piles is a 16-point Chuan.",
    "undo.intro": "The trick is stored. Step back, read the comparison, then replay it with a better plan.",
    "undo.youPlayed": "You played",
    "undo.winnerPlayed": "{seat} won with",
    "undo.faceDown": "face-down",
    "undo.rankOrder": "Rank order, strongest to weakest",
    "undo.why": "Why it lost",
    "undo.whyChuan": "The winner completed Chuan: seven piles plus the last Soldier. The Soldier takes the final trick by the special rule, not by rank.",
    "undo.whyHidden": "You kept your tiles face-down, so they never entered the comparison. Revealing is optional — but only a revealed set can win.",
    "undo.whyRank": "{losing} is below {winning} in the hierarchy. Rank is checked before colour.",
    "undo.whyColor": "Both sets share a rank, but {winning} is red and red beats black at equal rank.",
    "undo.whyTie": "The sets are equal in rank and colour, so the earlier play keeps the trick.",
    "undo.whyType": "Only the called type can win. Your set did not match the call.",
    "undo.whyPair": "The duplicated pair decides a See Hoo: {winning} has the higher pair.",
    "undo.whySet": "The set value decides: {winning} is the stronger straight or same-rank set.",
    "undo.whyUnknown": "The winner's revealed combination outranks your entry for this call.",
    "undo.noTrick": "No completed trick is stored yet.",
    "about.intro": "A bilingual, single-page studio for เลี๊ยบตุ่ย (Leab-Tui), the Thai trick-taking game played with the 32 tiles of a Chinese chess set. It plays solo against three bots or hosts a serverless WebRTC table for up to four humans. It is a teaching table, not a gambling app, tournament server or complete historical rulebook.",
    "about.how": "Thirty-two carved tiles, four seats, eight tiles each. The holder of the red General leads. Each trick calls a shape — Leab, Tui, Sa Hoo, See Hoo, Ngoh Hoo or Lak Hoo — and everyone sends that many tiles. Revealed sets compete; face-down sets never do. The winner takes 4×N tiles and leads next.",
    "about.credits": "Credits",
    "about.harness": "Harness",
    "about.model": "Model",
    "about.build": "Build record",
    "about.tech": "Technology",
    "about.privacy": "Privacy",
    "about.privacyBody": "No account and no analytics. Solo play calls only the pinned Three.js CDN. A network room also loads PeerJS from the same CDN and contacts the public PeerJS broker and STUN servers for the handshake; game data then flows directly between browsers. Match state, preferences and statistics stay in this browser's localStorage. Export writes a JSON file locally.",
    "about.license": "Licence",
    "about.licenseBody": "MIT. The Three.js library is distributed under its own MIT licence. See THIRD_PARTY_NOTICES.md.",
    "about.source": "Source and live demo",
    "about.buildLine": "Built {date} in {duration}; {tokens} measured tokens across the OpenCode session.",
    "about.modelLine": "Designed, written, verified and documented with {harness} using {model}.",
    "rules.source": "Rule reference",
    "rules.sourceBody": "The rules are modelled on the traditional Thai description compiled by Navee Angsuputiphant (2016), with the five-tile Ngoh Hoo included and the two- and three-player variants left out. Where the source is ambiguous, this studio documents its interpretation in docs/RULES.md.",
    "rules.digital": "Digital table conventions",
    "rules.digitalBody": "You may always send tiles face-down, even when you hold a legal set. A set must be revealed to compete. The leader must be able to form the called combination. The holder of the red General leads the opening trick; the winner of a trick leads the next.",
    "rules.target": "Play to",
    "rules.direction": "Turn order",
    "rules.cw": "Clockwise",
    "rules.ccw": "Counter-clockwise",
    "rules.scoring": "Scoring",
    "rules.pilesMode": "Most piles",
    "rules.bidMode": "Bid piles",

    "rules.open": "How to play",
    "rules.pieces": "The pieces",
    "rules.examples": "Examples",
    "rules.ex.single": "Single (Leab)",
    "rules.ex.singleBody": "Red beats black at equal rank.",
    "rules.ex.pair": "Pair (Tui)",
    "rules.ex.pairBody": "Only a true pair of the same rank and colour can win a Tui call; mixed singles never win.",
    "rules.ex.sahoo": "Sa Hoo",
    "rules.ex.sahooBody": "The big core (General + Advisor + Elephant) beats the small core (Chariot + Horse + Cannon). At the same size, red beats black.",
    "rules.ex.seehoo": "See Hoo",
    "rules.ex.seehooBody": "The duplicated pair decides, not the colour of the whole set. A black Advisor pair beats a red Elephant pair.",
    "rules.ex.soldier": "Soldier sets",
    "rules.ex.soldierBody": "A straight and a same-rank Soldier set are different categories; neither can beat the other.",
    "rules.ex.chuan": "Chuan",
    "rules.ex.chuanBody": "With seven piles and the last Soldier in hand, reveal it to take the final trick and reach eight piles (16 points).",
    "rules.goal": "Goal",
    "rules.goalBody": "Capture piles of four tiles. Two piles at the end of a round is par (0 points). Every pile above or below par is one point; capturing all eight piles is a 16-point Chuan. A player with seven piles and the last Soldier in hand may reveal it to take the final trick and complete the Chuan. The first player to the match target (20 points by default) wins.",
    "rules.equipment": "Equipment",
    "rules.equipmentBody": "The 32 tiles of a Chinese chess set: 16 red and 16 black. Each colour has one General, two Advisors, two Elephants, two Chariots, two Horses, two Cannons and five Soldiers. Four players take eight tiles each.",
    "rules.hierarchy": "Hierarchy",
    "rules.color": "Colour and ties",
    "rules.colorBody": "At equal rank, red beats black. If rank and colour are both equal, the earlier play keeps the trick — a later identical set cannot overtake it.",
    "rules.calls": "Calls and combinations",
    "rules.flow": "How a trick runs",
    "rules.flowBody": "The leader chooses a call, plays the matching tiles face-up, and names the shape. Every other player sends exactly the same number of tiles, face-down. The leader's set is revealed first. In turn, each player may reveal a legal set of the called type that beats the current best; if they cannot or choose not to, their tiles stay hidden. The highest revealed set wins all 4×N tiles and leads the next trick.",
    "rules.scoring": "Scoring",
    "rules.piles": "Piles at the end",
    "rules.points": "Points",
    "rules.beginner": "Beginner guard",
    "rules.beginnerBody": "Undo trick restores the position before the last trick and explains the comparison. The coach panel names the best lead or challenge in your hand, but never plays for you.",
    "rules.footnote": "This is an independent, open-source teaching implementation. It is not affiliated with any publisher or standards body.",
    "net.menuKicker": "Leab-Tui 3D",
    "net.launchTitle": "How do you want to play?",
    "net.launchBody": "Start a game on this device, or invite friends with one link.",
    "net.pickMode": "Start playing in one tap, or invite friends with a single link.",
    "net.menuNote": "No account and no game server. The two browsers talk directly.",
    "net.orFriends": "or play with friends",
    "net.orType": "or type it",
    "net.solo": "Play now",
    "net.soloDesc": "Start immediately. Three bots take the other seats.",
    "net.host": "Host a game",
    "net.hostDesc": "Keep this tab open. We make a room number you can send.",
    "net.join": "Join a game",
    "net.joinDesc": "A friend sent you a room number? Paste it here.",
    "net.yourNameHint": "Shown to other players.",
    "net.autoAudio": "Join audio chat when the table starts",
    "net.hostLead": "Send the invite, approve your friends, then start.",
    "net.joinLead": "Paste the message your host sent, or type the code.",
    "net.joinNote": "The host still has to approve you before you get a seat.",
    "net.pasteInvite": "Paste invite",
    "net.pasteInviteDesc": "Fills the code and PIN from your clipboard.",
    "net.pasteInviteDone": "Invite pasted.",
    "net.pasteInviteFailed": "No invite found on the clipboard.",
    "net.hostTitle": "Host a table",
    "net.roomCode": "Room number",
    "net.codeHelp": "Share this six-digit number.",
    "net.copyLink": "Copy invite link",
    "net.roster": "Seats",
    "net.startTable": "Start table",
    "net.startHint": "At least two humans are connected. Empty seats become bots.",
    "net.needTwo": "Need 2 humans",
    "net.needTwoLong": "At least two humans must be connected. Empty seats become bots.",
    "net.joinTitle": "Join a table",
    "net.codeLabel": "Room number",
    "net.codePlaceholder": "482-173",
    "net.nameLabel": "Your name",
    "net.namePlaceholder": "Guest",
    "net.yourName": "Your name",
    "net.yourNamePlaceholder": "Host or guest name",
    "net.enterName": "Enter your name before hosting or joining.",
    "net.approvalLabel": "Approve each guest before they get a seat",
    "net.pinLabel": "Room PIN",
    "net.pinPlaceholder": "5 digits",
    "net.pinGuestPlaceholder": "5 digits",
    "net.pinPolicy": "A 5-digit PIN is generated for convenience. Approval is the real access control.",
    "net.pinSecureOnly": "PIN hashing needs HTTPS or localhost.",
    "net.pinRule.short": "PIN must be 5 digits.",
    "net.pinRule.long": "PIN must be 5 digits.",
    "net.pinRule.lower": "PIN needs a lower-case letter.",
    "net.pinRule.upper": "PIN needs an upper-case letter.",
    "net.pinRule.digit": "PIN needs a number.",
    "net.pinRule.symbol": "PIN needs a symbol (for example ! @ # $ % * + ?).",
    "net.pinRule.space": "PIN cannot contain spaces.",
    "net.pinRule.common": "That PIN is too common. Choose another.",
    "net.pinRule.repeat": "PIN cannot be one repeated character.",
    "net.pinRule.sequence": "PIN cannot be a simple sequence.",
    "net.pinRule.room": "PIN cannot contain the room code.",
    "net.pinRule.name": "PIN cannot contain your name.",
    "net.pinSave": "Save PIN",
    "net.pinGenerate": "Generate",
    "net.pinNew": "New PIN",
    "net.pinAuto": "Auto-generated · 5 digits · digest only",
    "net.pinApprovalOnly": "Approval only (no PIN)",
    "net.pinInfoAria": "About the room PIN",
    "net.pinInfoTitle": "How the PIN works",
    "net.pinInfoBody": "A 5-digit PIN is generated for each room. New PIN replaces it for future joins. Guests need the code + PIN, then you approve them. The PIN is a convenience gate, not authentication.",
    "net.pinInfoDigest": "Only a SHA-256 digest is kept in memory. The PIN is not in the invite link, saved game or export. Copy invite + PIN is the one-paste share text.",
    "net.pinReveal": "PIN to share",
    "net.pinCopy": "Copy PIN",
    "net.pinCopied": "PIN copied.",
    "net.copyRoomInfo": "Copy room info",
    "net.copyInvitePin": "Copy invite + PIN",
    "net.shareInvitePin": "Share invite + PIN",
    "net.pinPaste": "Paste PIN",
    "net.pinPasted": "Passcode filled from the clipboard.",
    "net.pinPasteFailed": "Clipboard access was blocked. Paste the passcode manually.",
    "net.pinFromMessage": "Paste the passcode from the host's message.",
    "net.roomInfoCopied": "Room info copied — it includes the PIN. Share it only in a trusted channel.",
    "net.roomInfoNoPin": "Room info copied without a PIN. Approval still gates the room.",
    "net.pinSet": "PIN set; only a digest is kept. Share it separately from the room link.",
    "net.pinCleared": "PIN cleared. The room now relies on approval.",
    "net.pinInvalid": "A PIN must be 4–6 digits.",
    "net.pinHint": "Share the PIN separately from the invite link. The link never contains it.",
    "net.pendingTitle": "Join requests",
    "net.pendingEmpty": "No one is waiting.",
    "net.approve": "Approve",
    "net.deny": "Deny",
    "net.approveAll": "Approve all",
    "net.waitingApproval": "Waiting for the host to approve you…",
    "net.rejected.denied": "The host declined your request.",
    "net.rejected.bad-pin": "Wrong room PIN.",
    "net.rejected.busy": "The host is busy. Try again in a moment.",
    "net.rejected.timeout": "The join request timed out.",
    "net.pinLocked": "Too many wrong PINs. Try again in a minute.",
    "net.pendingCount": "{n} waiting",
    "net.connect": "Connect",
    "net.connecting": "Connecting…",
    "net.retrying": "Connection attempt {n} of 2…",
    "net.retry": "Retry",
    "net.brokerTimeout": "Could not reach the PeerJS broker. Check Wi-Fi/mobile data and try again.",
    "net.hostTimeout": "The host did not answer. Check the host tab is still open on this room code, or try another network.",
    "net.iceFailed": "WebRTC could not find a direct path. Try another network or a phone hotspot.",
    "net.handshake": "Connected. Waiting for the host…",
    "net.connectedWaiting": "Connected. The host will start when ready.",
    "net.reconnected": "Reconnected — restoring your seat…",
    "net.lobbyOpen": "Room open. Share the code or invite link.",
    "net.listening": "Listening for guests…",
    "net.hostKeepOpen": "Keep this host tab open and awake. If it closes or sleeps, guests cannot connect.",
    "net.guestConnecting": "A guest is connecting…",
    "net.readyToStart": "Ready to start · {n} humans",
    "net.dealing": "Table starting…",
    "net.waitingHost": "Waiting for the host",
    "net.hostBadge": "Host",
    "net.guestBadge": "Guest",
    "net.botBadge": "Bot",
    "net.emptySeat": "Empty",
    "net.botPreview": "Bot seat {n}",
    "net.startingHost": "Opening the room…",
    "net.hostDefault": "Host",
    "net.guestDefault": "Guest",
    "net.error": "Connection error: {error}",
    "net.hostFailed": "Could not open the room: {error}",
    "net.joinFailed": "Could not join: {error}",
    "net.roomNotFound": "Room not found. Check the number and that the host page is open.",
    "net.badCode": "A room number is six digits.",
    "net.versionMismatch": "Protocol mismatch. Both pages must run protocol {version}.",
    "net.hostLeft": "The host left the table. You can join another room or play solo.",
    "net.reconnecting": "Signalling connection lost. Reconnecting…",
    "net.hostOnly": "Only the host can undo a networked trick.",
    "net.chipHint": "Your room. Click to copy the invite link.",
    "net.modeSolo": "Solo",
    "net.modeHost": "Host",
    "net.modeClient": "Guest",
    "net.leave": "Leave room",
    "net.back": "Back",
    "net.resume": "Back to table",
    "net.lostTitle": "Table closed",
    "net.fourSeats": "Leab-Tui is a four-seat game: the host plus up to three guests. Empty seats are filled with bots.",
    "net.localOnly": "No account. WebRTC data channels are encrypted in transit (DTLS), but the host can see every hand.",
    "net.rejected.in-progress": "The match already started.",
    "net.rejected.full": "The table is full (four seats).",
    "net.rejected.illegal": "That play was not legal.",
    "net.openLobby": "Multiplayer",
    "net.resumeMatch": "Resume match",
    "net.resumeMeta": "Round {round} · trick {trick} · {score} points",
    "net.leaveTitle": "Leave the room?",
    "net.leaveBodyHost": "This closes the room for every guest. Their seats become bots and the room code stops working.",
    "net.leaveBodyGuest": "You will leave the table. A bot will take over your seat and the match will continue.",
    "net.matchInProgress": "Match in progress",
    "net.alreadyStarted": "The match is already running. Use New match for a rematch, or leave the room.",
    "net.joinHint": "Ask the host for the six-digit room number.",
    "net.reconnectHint": "Room {code} restored. Enter the PIN again to reconnect.",
    "diag.open": "Troubleshoot",
    "diag.title": "Troubleshoot connection",
    "diag.probe": "Probe with PIN",
    "diag.probeNoPin": "Probe without PIN",
    "diag.copy": "Copy report",
    "diag.copied": "Diagnostic report copied.",
    "diag.probing": "Probing the host…",
    "diag.reachable": "Host reachable. PIN required: {required}. PIN accepted: {accepted}. Approval: {approval}. Started: {started}. Free seats: {seats}.",
    "diag.unreachable": "Probe failed: {error}",
    "diag.noCode": "Enter a room code first.",
    "dock.expand": "Expand hand dock",
    "dock.collapse": "Collapse hand dock",
    "version.reload": "Reload version",
    "version.update": "Update",
    "version.updateShort": "Update v{version}",
    "version.updateTo": "Update to v{version}",
    "version.autoUpdating": "New version v{version}. Updating…",
    "version.reloadHint": "Force reload the app and its scripts",
    "version.reloadConfirm": "Reloading closes the current room or match. Continue?",
    "version.updateAvailable": "New version {version} is available. Reload to update.",
    "chat.title": "Table chat",
    "chat.hide": "hide",
    "chat.show": "show",
    "chat.empty": "No messages yet.",
    "chat.placeholder": "Message the table…",
    "chat.send": "Send",
    "voice.off": "Voice off",
    "voice.join": "Join voice",
    "voice.joinAudio": "Join audio",
    "voice.connecting": "Connecting…",
    "voice.callHintJoin": "Join the table audio chat",
    "voice.callHintLive": "Tap to mute or unmute your microphone",
    "voice.on": "Voice on",
    "voice.micOn": "Mute mic",
    "voice.micOff": "Unmute mic",
    "voice.deafen": "Mute others",
    "voice.undeafen": "Unmute others",
    "voice.leave": "Leave voice",
    "voice.micMuted": "Microphone muted",
    "voice.deafened": "Others muted",
    "voice.allMuted": "Microphone and incoming voice muted",
    "voice.active": "Voice connected · {n} remote",
    "voice.error": "Voice error: {error}",
    "voice.denied": "Microphone permission was denied.",
    "voice.unavailable": "Voice needs a secure page and microphone permission.",
    "voice.peerCount": "{n} remote voice stream(s)",
    "voice.localOnly": "Voice is peer-to-peer and not recorded.",
    "toast.netGuest": "{name} joined the table.",
    "toast.netGuestLeft": "{name} left the lobby.",
    "toast.netGuestHeld": "{name} disconnected — the seat is held for rejoin.",
    "toast.netRejoin": "{name} reconnected to their seat.",
    "toast.yourTurn": "Your turn — the table is waiting.",
    "toast.boardReset": "Board view reset to 2D.",
    "toast.boardLost": "The board lost its graphics context. Tap the reset button to recover.",
    "toast.boardReload": "The board was lost — reloading. A guest will rejoin the room.",
    "toast.boardUnavailable": "The 3D board is unavailable on this device. The rules and log still work.",
    "board.resetAria": "Reset the board view to 2D",
    "toast.netBot": "{name} left — a bot takes the seat.",
    "toast.netStarted": "Table {code} started.",
    "toast.netLeft": "Left the table.",
    "toast.netCopied": "Invite link copied.",
    "toast.solo": "Solo table ready.",
    "toast.resumed": "Match resumed."
  },
  th: {
    "app.title": "เลี๊ยบตุ่ย 3 มิติ",
    "app.subtitle": "สตูดิโอเกมกินกองด้วยหมากรุกจีน",
    "hud.round": "รอบ",
    "hud.trick": "ตา",
    "hud.target": "เป้า",
    "hud.turn": "ตอนนี้",
    "hud.call": "เรียก",
    "hud.result": "ประกาศผล",
    "dock.select": "เลือกหมากของคุณ",
    "dock.leadTitle": "เลือกชุดที่จะนำ",
    "dock.leadHelp": "คลิกหมากบนโต๊ะ หรือกด “ใบ้” เพื่อขอคำแนะนำ",
    "dock.leadReady": "พร้อมนำ {combo} เลือกแล้ว {n} ตัว",
    "dock.followTitle": "{seat} เรียก {combo}",
    "dock.followHelp": "เลือกให้ครบ {n} ตัวตามชนิดที่เรียก ทุกคนส่งคว่ำก่อน แล้วคนเรียกจะเปิดก่อน",
    "dock.followHidden": "ส่ง {n} ตัวนี้แบบคว่ำ คนเรียกจะเปิดก่อนเมื่อทุกคนส่งครบ",
    "dock.showdown": "เปิดไพ่",
    "dock.showdownTitle": "จะเปิดหรือเก็บคว่ำ?",
    "dock.showdownCan": "{combo} ของคุณชนะ {best} เปิดเพื่อกินกองนี้",
    "dock.showdownWait": "เปิดแล้วชนะเท่านั้น คุณจะเปิดชุดที่แพ้ให้ดูก็ได้",
    "dock.showdownLose": "{combo} ของคุณไม่ชนะ {best} แต่จะเปิดให้ดูก็ได้",
    "dock.showdownDouble": "ดับเบิลคลิกไพ่ของคุณบนโต๊ะเพื่อเปิด",
    "dock.chuanReady": "เจ็ดกองกับจุกตัวสุดท้าย: กดช้วนได้เลย",
    "dock.showdownFirst": "เปิดชุดของคุณก่อน",
    "dock.showdownFirstHelp": "คุณเป็นคนเรียก เปิดชุดนี้เพื่อตั้งมาตรฐานให้คนอื่น",
    "dock.showdownNoBeat": "คุณสู้โต๊ะไม่ได้",
    "showdown.hidden": "คว่ำ",
    "actions.showFirst": "เปิดก่อน",
    "result.title": "ผลของตา",
    "dock.waiting": "{seat} กำลังคิด…",
    "dock.pick": "เลือก {n} ตัวสำหรับตานี้",
    "dock.selected": "เลือกแล้ว {n} ตัว",
    "actions.hint": "ใบ้",
    "actions.clear": "ล้าง",
    "actions.lead": "นำ",
    "actions.reveal": "เปิดเพื่อชนะ",
    "actions.showWin": "เปิดเพื่อชนะ",
    "actions.showSet": "เปิดชุด",
    "actions.redraw": "โละแจกใหม่",
    "actions.chuan": "ช้วน",
    "actions.sendHidden": "ส่งแบบคว่ำ",
    "actions.keepHidden": "เก็บคว่ำไว้",
    "actions.tidy": "จัดมือ",
    "actions.revealLog": "เปิด",
    "actions.facedown": "ลงคว่ำ",
    "draft.title": "เลือกไพ่ — หยิบ 2 ใบ",
    "draft.metaYou": "คุณมี {n} ใบ · เลือก 2 ใบจากกองกลาง (รอบ {step}/4) เหลือ {pool} ใบ",
    "draft.waiting": "{seat} กำลังเลือก 2 ใบ…",
    "draft.waitingShort": "รอ…",
    "draft.confirm": "หยิบ 2 ใบนี้",
    "draft.toggle": "เลือกไพ่เองตอนแจกถัดไป (ทดลอง)",
    "draft.toggleHost": "โหมดเลือกไพ่: หยิบ 2 ใบ ×4 (ทดลอง)",
    "draft.toggleToast": "โหมดเลือกไพ่จะมีผลตอนแจกครั้งถัดไป",
    "draft.chipOn": "เลือกไพ่: เปิด",
    "draft.chipOff": "เลือกไพ่: ปิด",
    "draft.chipTitle": "โหมดเลือกไพ่ (ทดลอง): ทุกที่นั่งหยิบ 2 ใบ ×4",
    "draft.onToast": "เปิดโหมดเลือกไพ่: การแจกครั้งถัดไปทุกคนหยิบเอง 2 ใบ ×4",
    "draft.offToast": "ปิดโหมดเลือกไพ่: การแจกครั้งถัดไปเป็นอัตโนมัติ",
    "actions.title": "การกระทำ",
    "actions.newMatch": "แมตช์ใหม่",
    "actions.nextRound": "รอบถัดไป",
    "actions.undo": "ยกเลิกตานี้",
    "actions.export": "ส่งออก JSON",
    "actions.continue": "เล่นต่อ",
    "actions.keep": "เล่นต่อ",
    "actions.sound": "เสียง",
    "display.title": "การแสดงผล",
    "display.language": "ภาษา",
    "display.font": "ขนาดตัวอักษร",
    "display.small": "เล็ก",
    "display.default": "ปกติ",
    "display.large": "ใหญ่",
    "display.xlarge": "ใหญ่พิเศษ",
    "display.theme": "ธีม",
    "display.note": "ขนาดตัวอักษรปรับเฉพาะหน้าจอ ไม่กระทบโต๊ะ 3 มิติ ส่วนธีมเปลี่ยนสีแผงและโทนโต๊ะ",
    "display.reset": "รีเซ็ตการแสดงผล",
    "display.testSound": "ทดสอบเสียง",
    "theme.mahogany": "มาฮอกกานี",
    "theme.mahoganyDesc": "ผ้าสีเบอร์กันดี ทองเก่า และแดงแล็กเกอร์",
    "theme.jade": "ศาลหยก",
    "theme.jadeDesc": "ผ้าสีเขียวเข้ม ทองเย็น และแสงหยก",
    "theme.midnight": "แล็กเกอร์เที่ยงคืน",
    "theme.midnightDesc": "ผ้าสีน้ำเงินดำ เงินฝัง และแสงโต๊ะเย็น",
    "theme.parchment": "กระดาษพาร์ชเมนต์",
    "theme.parchmentDesc": "แผงงาช้างอุ่น หมึกเข้ม และโต๊ะมะกอก",
    "theme.daybreak": "อรุณรุ่ง",
    "theme.daybreakDesc": "แผงขาวฟ้าอ่อน หมึกน้ำเงิน และโต๊ะสีเขียวน้ำทะเล",
    "toast.fontSize": "ตั้งขนาดตัวอักษรเป็น {size}",
    "toast.theme": "ตั้งธีมเป็น {theme}",
    "toast.displayReset": "รีเซ็ตการแสดงผลแล้ว",
    "toast.soundTest": "ทดสอบเสียง — เสียงไม้กระทบ",
    "rankRef.open": "ลำดับศักดิ์",
    "rankRef.title": "ลำดับศักดิ์",
    "rankRef.note": "ตี่ > สือ > เฉีย > กือ > แบ้ > เผ่า > จุก · แดงชนะดำเมื่อศักดิ์เท่ากัน · ถ้าศักดิ์กับสีเท่ากัน คนที่ลงก่อนชนะ",
    "rankRef.close": "ปิดลำดับศักดิ์",
    "rankRef.highest": "สูงสุด",
    "rankRef.lowest": "ต่ำสุด",
    "camera.hint": "ลากเพื่อหมุน · ลากไพ่เพื่อจัดวาง · ปล่อยในวงกลางเพื่อลงไพ่",
    "play.release": "ปล่อยเพื่อลงไพ่",
    "view.top": "มุมมอง 2D",
    "view.3d": "มุมมอง 3D",
    "view.topShort": "2D",
    "view.3dShort": "3D",
    "view.switch": "สลับมุมมอง 2D และ 3D",
    "coach.title": "โค้ช",
    "coach.live": "สด",
    "score.title": "คะแนน",
    "score.target": "ถึง",
    "score.points": "แต้ม",
    "score.pile": "กอง",
    "score.piles": "กอง",
    "lastTrick.button": "ตาล่าสุด",
    "lastTrick.title": "ตาล่าสุด",
    "log.history": "ประวัติ",
    "log.browserTitle": "ประวัติการเล่น",
    "log.round": "รอบ",
    "log.trick": "ตา",
    "log.call": "เรียก",
    "log.winner": "ผู้ชนะ",
    "log.why": "เฉพาะชุดที่เปิดเท่านั้นที่แข่งกัน ชุดที่เปิดสูงสุดกินกอง ไพ่ที่คว่ำจะถูกซ่อนไว้",
    "log.chuan": "ช้วน",
    "log.draftPick": "หยิบ 2 ใบ",
    "log.chuanWhy": "ช้วน: เจ็ดกองกับจุกตัวสุดท้าย จุกกินตาสุดท้ายได้ด้วยกติกาพิเศษ ไม่ใช่เพราะศักดิ์ใหญ่กว่า",
    "log.empty": "ยังไม่มีประวัติตา",
    "summary.viewLog": "ดูประวัติการเล่น",
    "summary.autoNext": "เริ่มรอบถัดไปอัตโนมัติ (30 วิ)",
    "lastTrick.winner": "{seat} กิน {n} ตัว ด้วย {combo}",
    "pile.title": "{seat} · กอง {n}",
    "pile.meta": "{n} ตัว · เปิด {up} ตัว",
    "pile.hidden": "ไพ่คว่ำ",
    "pile.from": "จาก {seat}",
    "inspector.title": "ตรวจหมาก",
    "inspector.hover": "ชี้",
    "inspector.empty": "ชี้หรือคลิกหมากเพื่อดูชื่อไทย ชื่ออังกฤษ และอันดับ",
    "inspector.rank": "อันดับ",
    "inspector.copies": "จำนวน",
    "inspector.color": "สี",
    "inspector.hidden": "หมากคว่ำ",
    "inspector.hiddenNote": "หน้าหมากถูกซ่อน ในเลี๊ยบตุ่ยหมากที่ไม่เปิดจะชนะไม่ได้ แม้จะมีศักดิ์ใหญ่กว่า",
    "inspector.selected": "เลือกเพื่อลง",
    "inspector.note": "ลำดับศักดิ์: ตี่ > สือ > เฉีย > กือ > แบ้ > เผ่า > จุก สีแดงชนะสีดำเมื่อศักดิ์เท่ากัน และถ้าศักดิ์กับสีเท่ากัน คนที่ลงก่อนชนะ",
    "handList.title": "หมากในมือ",
    "handList.hide": "ซ่อน",
    "handList.show": "แสดง",
    "handList.empty": "หมากหมดมือในรอบนี้",
    "log.title": "บันทึกตา",
    "log.live": "สด",
    "log.empty": "โต๊ะยังเงียบ เริ่มนำตแรกได้เลย",
    "footer.credit": "สร้างด้วย OpenCode + DeepSeek V4.1 Flash",
    "error.webglTitle": "เริ่มโต๊ะ 3 มิติไม่ได้",
    "error.webglBody": "Three.js ต้องใช้ WebGL 2 และการเชื่อมต่อ CDN แต่กติกา คะแนน และโค้ชยังใช้งานได้",
    "rules.title": "กติกาเลี๊ยบตุ่ย",
    "undo.title": "ทำไมตานี้ถึงแพ้?",
    "about.title": "เกี่ยวกับสตูดิโอนี้",
    "about.short": "เกี่ยวกับ",
    "confirm.title": "เริ่มแมตช์ใหม่?",
    "confirm.body": "คะแนนและประวัติรอบปัจจุบันจะถูกล้าง แต่สถิติที่บันทึกไว้จะยังอยู่",
    "confirm.yes": "เริ่มแมตช์",
    "confirm.no": "ยกเลิก",
    "color.red": "แดง",
    "color.black": "ดำ",
    "combo.single": "เลี๊ยบ",
    "combo.pair": "ตุ่ย",
    "combo.triple": "ซาจุก",
    "combo.quad": "สี่จุก",
    "combo.quint": "ห้าจุก",
    "combo.sahoo": "ซาฮู้",
    "combo.seehoo": "สี่ฮู้",
    "combo.ngohoo": "ห้าฮู้",
    "combo.lakhoo": "หลักฮู้",
    "combo.single.desc": "หนึ่งตัว ฐานันดรสูงกว่าชนะ แดงชนะดำเมื่อเท่ากัน",
    "combo.pair.desc": "สองตัวเหมือนกันทั้งศักดิ์และสี ตี่สร้างคู่ไม่ได้",
    "combo.triple.desc": "จุกสามตัวสีเดียวกัน",
    "combo.quad.desc": "จุกสี่ตัวสีเดียวกัน",
    "combo.quint.desc": "จุกทั้งห้าตัวสีเดียวกัน",
    "combo.sahoo.desc": "ชุดเรียงสามตัว: ชุดใหญ่ (ตี่–สือ–เฉีย) หรือชุดเล็ก (กือ–แบ้–เผ่า) สีเดียวกัน",
    "combo.seehoo.desc": "ซาฮู้บวกตัวซ้ำหนึ่งตัว คู่ที่ซ้ำเป็นตัวตัดสิน",
    "combo.ngohoo.desc": "ซาฮู้ที่มีสองฐานันดรซ้ำ คู่สูงสุดตัดสินก่อน แล้วจึงคู่ถัดไป",
    "combo.lakhoo.desc": "คู่กือ–แบ้–เผ่าครบทั้งสามคู่ หกตัว สีเป็นตัวตัดสิน",
    "rank.1": "จุก",
    "rank.2": "เผ่า",
    "rank.3": "แบ้",
    "rank.4": "กือ",
    "rank.5": "เฉีย",
    "rank.6": "สือ",
    "rank.7": "ตี่",
    "phase.dealing": "แจกหมาก",
    "phase.lead": "นำ",
    "phase.follow": "ตาม",
    "phase.bid": "ประเมิน",
    "bid.kicker": "ประเมินกอง",
    "bid.title": "คุณจะได้กี่กอง?",
    "bid.waiting": "{seat} กำลังประเมิน…",
    "bid.help": "ประเมินรวมแล้ว {total} คนสุดท้ายห้ามทำให้รวมเป็น 8 พอดี",
    "phase.resolving": "ตัดสิน",
    "phase.roundEnd": "จบรอบ",
    "phase.matchEnd": "จบแมตช์",
    "phase.ready": "พร้อม",
    "seat.you": "คุณ",
    "seat.east": "บูรพา",
    "seat.north": "อุดร",
    "seat.west": "ประจิม",
    "coach.welcome": "ยินดีต้อนรับ คนที่ถือตี่แดงได้นำก่อน",
    "coach.dealing": "สับหมาก 32 ตัว แจกคนละแปดตัว",
    "coach.yourLead": "ตาคุณนำ เหลือ {n} ตัวในมือ เลือกเลี๊ยบ ตุ่ย ชุดเรียง หรือชุดจุก",
    "coach.aiLead": "{seat} กำลังเลือกชุดนำ…",
    "coach.follow": "{seat} เรียก {combo} เลือกให้ครบ {n} ตัว",
    "coach.followBeat": "{seat} ลง {combo} คุณชนะได้ด้วย {yours} เปิดไพ่เพื่อชนะตัก",
    "coach.followNoBeat": "{type} ที่ดีที่สุดของคุณคือ {yours} แต่ {best} ยังใหญ่กว่า ส่ง {n} ตัวลงคว่ำและเก็บของดีไว้",
    "coach.followNoCombo": "คุณไม่มี {type} ที่ถูกกติกา ส่ง {n} ตัวลงคว่ำ — ไพ่ที่คว่ำชนะไม่ได้",
    "coach.followHidden": "ส่ง {n} ตัวนี้แบบคว่ำ ทุกคนส่งคว่ำก่อน แล้วคนเรียกจะเปิดก่อน",
    "coach.showdownYou": "คนเรียกเปิดแล้ว จะเปิดชุดหรือเก็บคว่ำก็ได้ — เปิดชุดที่แพ้ให้ดูก็ได้",
    "coach.showdownWait": "เปิดไพ่: {seat} กำลังตัดสินใจจะเปิดหรือไม่",
    "coach.allHidden": "ทุกคนคว่ำ",
    "coach.followReady": "{combo} ของคุณชนะ {best} เปิดเพื่อชนะตักและเก็บ {tiles} ตัว หรือจะคว่ำไว้ก็ได้ แต่ไพ่ที่คว่ำชนะไม่ได้",
    "coach.followLose": "{combo} ของคุณไม่ชนะ {best} ลงคว่ำแล้วเก็บไว้ใช้ตอนนำ",
    "coach.invalidLead": "ชุดนี้ไม่ถูกกติกา การนำต้องเป็น 1 ตัว, 2 ตัวเหมือนกัน, ชุดเรียง 3–6 ตัว หรือจุกเหมือนกัน 3–5 ตัว",
    "coach.invalidFollow": "ชุดนี้ไม่ใช่ {type} ที่เรียก แต่ยังส่ง {n} ตัวลงคว่ำได้",
    "coach.selectMore": "เลือกให้ครบ {n} ตัวสำหรับตานี้ ตอนนี้เลือกแล้ว {m} ตัว",
    "coach.hintLead": "แนะนำให้นำ {combo} {why}",
    "coach.hintFollow": "แนะนำ: {combo} {why}",
    "coach.hintDiscard": "ไม่มี {type} ที่สู้ได้ ทิ้ง {n} ตัวล่างสุดลงคว่ำ",
    "coach.trickWon": "คุณกินกองนี้ด้วย {combo} ตอนนี้ได้ {piles} กอง",
    "coach.trickLost": "{seat} กินกองนี้ด้วย {combo} {why}",
    "coach.hiddenLost": "{seat} กินกองนี้ด้วย {combo} คุณลงคว่ำ หมากจึงไม่ได้แข่งขัน",
    "coach.roundEnd": "จบรอบ คุณได้ {points} แต้ม รวมเป็น {score}",
    "coach.matchEnd": "จบแมตช์ {winner}",
    "coach.chuan": "ช้วน! กินครบแปดกอง ได้ 16 แต้ม",
    "coach.redTie": "ศักดิ์และสีเท่ากัน คนที่ลงก่อนยังนำอยู่",
    "coach.tilesLeft": "เหลือคนละ {n} ตัว",
    "coach.youLead": "คุณนำตาถัดไป",
    "coach.otherLead": "{seat} นำตาถัดไป",
    "coach.lastTrick": "ตาสุดท้ายของรอบ",
    "coach.rematch": "กดแมตช์ใหม่เพื่อเล่นอีกครั้ง",
    "coach.whyPair": "มีเพียงคู่ที่ใหญ่กว่าและสีเดียวกันเท่านั้นที่ชนะได้",
    "coach.whyStraight": "มีเพียง {type} ที่แข็งกว่าซึ่งชนะได้ ขนาดชุดและคู่ที่ซ้ำมีผล",
    "coach.whySingle": "มีเพียงฐานันดรที่สูงกว่า หรือหมากแดงศักดิ์เดียวกันเท่านั้นที่ชนะ",
    "coach.whySet": "มีเพียงชุดตัวเหมือนสีเดียวกันที่ใหญ่กว่าเท่านั้นที่ชนะ",
    "coach.whyGeneral": "ตี่เป็นเลี๊ยบที่ไม่มีใครชนะ แต่สร้างคู่ไม่ได้",
    "coach.whyUnknown": "ชุดที่เปิดมีศักดิ์ใหญ่กว่าของคุณ",
    "toast.dealt": "แจกคนละแปดตัว {seat} นำก่อน",
    "toast.saved": "บันทึกแมตช์ในเครื่องแล้ว",
    "toast.exported": "ดาวน์โหลด JSON แล้ว",
    "toast.undone": "ย้อนตากลับแล้ว เรียนรู้แล้วลองใหม่",
    "toast.newMatch": "เริ่มแมตช์ใหม่แล้ว",
    "toast.nextRound": "แจกหมากรอบที่ {n} แล้ว",
    "toast.soundOff": "ปิดเสียงแล้ว",
    "toast.soundOn": "เปิดเสียงแล้ว",
    "toast.hint": "เลือกหมากตามคำใบ้แล้ว",
    "toast.noUndo": "ยังไม่มีอะไรให้ย้อน",
    "toast.selectFirst": "เลือกหมากให้ครบก่อน",
    "toast.notLegal": "ชุดนี้เปิดสู้กับตานี้ไม่ได้",
    "toast.copied": "คัดลอกแล้ว",
    "toast.handTidied": "จัดมือกลับเป็นพัดแล้ว",
    "toast.modeNext": "การคิดแต้มใหม่จะมีผลในแมตช์ถัดไป",
    "toast.redraw": "โละครั้งที่ {n}: รอบนี้คิดแต้มคูณ {n}",
    "toast.trickResult": "{winner} กินกองด้วย {combo} — {entries}",
    "toast.trickResultChuan": "{winner} ปิดช้วนด้วยจุกตัวสุดท้าย — {entries}",
    "toast.chuan": "ช้วน! เจ็ดกองกับจุกตัวสุดท้าย",
    "toast.draftDone": "เลือกครบแล้ว คนถือตี่แดงเริ่มก่อน",
    "toast.stayZone": "วางไพ่ไว้ในโซนของคุณเท่านั้น",
    "toast.needMore": "เลือกแล้ว {n}/{m} — ลากไพ่อีกใบ",
    "toast.stagedLead": "เตรียมไว้ {n} ตัว กด Lead เพื่อลง",
    "toast.lang": "เปลี่ยนภาษาเป็นไทยแล้ว",
    "summary.round": "จบรอบที่ {n}",
    "summary.match": "จบแมตช์",
    "summary.congrats": "ยินดีด้วย!",
    "summary.waitingHost": "รอเจ้าบ้านเริ่มรอบถัดไป…",
    "summary.nextIn": "รอบถัดไปใน {n} วิ",
    "summary.congrats": "ยินดีด้วย!",
    "summary.waitingHost": "รอเจ้าบ้านเริ่มรอบถัดไป…",
    "summary.nextIn": "รอบถัดไปใน {n} วิ",
    "summary.you": "คุณ",
    "summary.points": "แต้ม",
    "summary.piles": "กอง",
    "summary.roundPoints": "แต้มรอบนี้",
    "summary.total": "รวมแมตช์",
    "summary.next": "รอบถัดไป",
    "summary.newMatch": "แมตช์ใหม่",
    "summary.chuan": "ช้วน — กินครบ 32 ตัว",
    "summary.win": "คุณชนะแมตช์",
    "summary.lose": "{seat} ชนะแมตช์",
    "summary.draw": "แมตช์เสมอ",
    "summary.targetReached": "ถึง {target} แต้มก่อน",
    "summary.streak": "ชนะติดกัน ×{n}",
    "summary.note": "คิดคะแนนตามกอง: สองกองคือทุน (0) เกินหรือขาดกองละหนึ่งแต้ม และแปดกองคือช้วน 16 แต้ม",
    "undo.intro": "เก็บตานี้ไว้แล้ว ย้อนกลับไปอ่านการเปรียบเทียบ แล้วลองใหม่ด้วยแผนที่ดีกว่า",
    "undo.youPlayed": "คุณลง",
    "undo.winnerPlayed": "{seat} ชนะด้วย",
    "undo.faceDown": "ลงคว่ำ",
    "undo.rankOrder": "ลำดับศักดิ์ จากใหญ่ไปเล็ก",
    "undo.why": "ทำไมถึงแพ้",
    "undo.whyChuan": "ผู้ชนะปิดช้วน: เจ็ดกองกับกองสุดท้ายเป็นจุก จุกกินตาสุดท้ายได้ด้วยกติกาพิเศษ ไม่ใช่เพราะศักดิ์ใหญ่กว่า",
    "undo.whyHidden": "คุณลงคว่ำ หมากจึงไม่เข้าการเปรียบเทียบ การเปิดสู้เป็นทางเลือก แต่มีเพียงชุดที่เปิดเท่านั้นที่ชนะ",
    "undo.whyRank": "{losing} อยู่ต่ำกว่า {winning} ในลำดับศักดิ์ ศักดิ์ถูกตัดสินก่อนสี",
    "undo.whyColor": "ศักดิ์เท่ากัน แต่ {winning} เป็นสีแดง และแดงชนะดำเมื่อศักดิ์เท่ากัน",
    "undo.whyTie": "ศักดิ์และสีเท่ากัน คนที่ลงก่อนจึงรักษากองไว้",
    "undo.whyType": "มีเพียงชนิดที่เรียกเท่านั้นที่ชนะ ชุดของคุณไม่ตรงกับที่เรียก",
    "undo.whyPair": "คู่ที่ซ้ำตัดสินสี่ฮู้: {winning} มีคู่ที่ใหญ่กว่า",
    "undo.whySet": "ค่าของชุดตัดสิน: {winning} เป็นชุดเรียงหรือชุดเดียวกันที่แข็งกว่า",
    "undo.whyUnknown": "ชุดที่ผู้ชนะเปิดมีศักดิ์ใหญ่กว่าชุดของคุณสำหรับตานี้",
    "undo.noTrick": "ยังไม่มีตาที่จบให้ย้อน",
    "about.intro": "สตูดิโอหน้าเดียวสองภาษาสำหรับเลี๊ยบตุ่ย เกมกินกองไทยที่เล่นด้วยหมากรุกจีน 32 ตัว เล่นคนเดียวกับบอทสามตัว หรือเปิดโต๊ะ WebRTC แบบไม่มีเซิร์ฟเวอร์สำหรับมนุษย์ไม่เกินสี่คน เป็นโต๊ะสอนเล่น ไม่ใช่แอพพนัน เซิร์ฟเวอร์ทัวร์นาเมนต์ หรือกติกาประวัติศาสตร์ฉบับสมบูรณ์",
    "about.how": "หมากแกะสลัก 32 ตัว สี่ที่นั่ง คนละแปดตัว คนถือตี่แดงนำก่อน แต่ละตาเรียกชุด เลี๊ยบ ตุ่ย ซาฮู้ สี่ฮู้ ห้าฮู้ หรือหลักฮู้ แล้วทุกคนส่งจำนวนเท่ากัน ชุดที่เปิดเท่านั้นแข่งขัน ชุดคว่ำไม่แข่งขัน ผู้ชนะกิน 4×N ตัวและนำตาถัดไป",
    "about.credits": "เครดิต",
    "about.harness": "เครื่องมือ",
    "about.model": "โมเดล",
    "about.build": "บันทึกการสร้าง",
    "about.tech": "เทคโนโลยี",
    "about.privacy": "ความเป็นส่วนตัว",
    "about.privacyBody": "ไม่มีบัญชีและไม่มีการวิเคราะห์ การเล่นคนเดียวเรียกเฉพาะ Three.js CDN ที่ปักหมุดไว้ ห้องออนไลน์โหลด PeerJS จาก CDN เดียวกันและติดต่อ broker/STUN สาธารณะเพื่อจับมือ จากนั้นข้อมูลเกมไหลระหว่างเบราว์เซอร์โดยตรง สถานะแมตช์ การตั้งค่า และสถิติเก็บใน localStorage ของเบราว์เซอร์นี้ การส่งออกเขียนไฟล์ JSON ในเครื่อง",
    "about.license": "สัญญาอนุญาต",
    "about.licenseBody": "MIT ส่วน Three.js เผยแพร่ภายใต้ MIT ของตัวเอง ดู THIRD_PARTY_NOTICES.md",
    "about.source": "ซอร์สและเดโม",
    "about.buildLine": "สร้างเมื่อ {date} ใช้เวลา {duration} และวัดได้ {tokens} โทเคนตลอดเซสชัน OpenCode",
    "about.modelLine": "ออกแบบ เขียน ตรวจสอบ และเขียนเอกสารด้วย {harness} โดยใช้ {model}",
    "rules.source": "แหล่งอ้างอิงกติกา",
    "rules.sourceBody": "กติกาอิงคำอธิบายไทยโดย นาวี อ. (2559) โดยเพิ่มห้าฮู้และตัดรูปแบบสองกับสามผู้เล่นออก หากต้นฉบับกำกวม สตูดิโอนี้อธิบายการตีความไว้ใน docs/RULES.md",
    "rules.digital": "ข้อตกลงของโต๊ะดิจิทัล",
    "rules.digitalBody": "ส่งหมากคว่ำได้เสมอแม้จะมีชุดถูกกติกา ชุดต้องเปิดจึงจะแข่งขันได้ ผู้นำต้องสร้างชุดที่เรียกได้ คนถือตี่แดงนำตแรก และผู้ชนะตาก่อนนำตาถัดไป",
    "rules.target": "เล่นถึง",
    "rules.direction": "ทิศทางวน",
    "rules.cw": "ตามเข็มนาฬิกา",
    "rules.ccw": "ทวนเข็มนาฬิกา",
    "rules.scoring": "การคิดแต้ม",
    "rules.pilesMode": "กองมากที่สุด",
    "rules.bidMode": "ประเมินกอง",

    "rules.open": "วิธีเล่น",
    "rules.pieces": "ตัวหมาก",
    "rules.examples": "ตัวอย่าง",
    "rules.ex.single": "เลี๊ยบ",
    "rules.ex.singleBody": "ศักดิ์เท่ากัน แดงชนะดำ",
    "rules.ex.pair": "ตุ่ย",
    "rules.ex.pairBody": "ต้องเป็นคู่จริงที่มีศักดิ์และสีเดียวกันเท่านั้นจึงชนะการเรียกตุ่ย สองตัวคนละอย่างชนะไม่ได้",
    "rules.ex.sahoo": "ซาฮู้",
    "rules.ex.sahooBody": "ชุดใหญ่ (ตี่ + สือ + เฉีย) ชนะชุดเล็ก (กือ + แบ้ + เผ่า) ขนาดเดียวกันแดงชนะดำ",
    "rules.ex.seehoo": "สี่ฮู้",
    "rules.ex.seehooBody": "คู่ที่ซ้ำเป็นตัวตัดสิน ไม่ใช่สีของทั้งชุด คู่สือดำชนะคู่เฉียแดง",
    "rules.ex.soldier": "ชุดจุก",
    "rules.ex.soldierBody": "ชุดเรียงกับชุดจุกเป็นคนละประเภท ชนะกันไม่ได้",
    "rules.ex.chuan": "ช้วน",
    "rules.ex.chuanBody": "เหลือ 7 กองและตัวสุดท้ายเป็นจุก เปิดโชว์เพื่อกินตาสุดท้ายและครบ 8 กอง (16 แต้ม)",
    "rules.goal": "เป้าหมาย",
    "rules.goalBody": "เก็บกองละสี่ตัว สองกองเมื่อจบรอบคือทุน (0 แต้ม) เกินหรือขาดกองละหนึ่งแต้ม และแปดกองคือช้วน 16 แต้ม ถ้าเหลือ 7 กองและตัวสุดท้ายในมือเป็นจุก เปิดโชว์เพื่อกินตาสุดท้ายและปิดช้วนได้ ผู้ที่ถึงเป้าแมตช์ก่อน (ค่าเริ่มต้น 20 แต้ม) ชนะ",
    "rules.equipment": "อุปกรณ์",
    "rules.equipmentBody": "หมากรุกจีน 32 ตัว แดง 16 ดำ 16 แต่ละสีมีตี่ 1 สือ 2 เฉีย 2 กือ 2 แบ้ 2 เผ่า 2 จุก 5 ผู้เล่นสี่คนได้คนละแปดตัว",
    "rules.hierarchy": "ลำดับศักดิ์",
    "rules.color": "สีและการเสมอ",
    "rules.colorBody": "ศักดิ์เท่ากัน แดงชนะดำ ถ้าทั้งศักดิ์และสีเท่ากัน คนที่ลงก่อนรักษากองไว้ ชุดที่เหมือนกันทุกประการและลงทีหลังจะแซงไม่ได้",
    "rules.calls": "การเรียกและชุด",
    "rules.flow": "ลำดับของหนึ่งตา",
    "rules.flowBody": "ผู้นำเลือกชนิดชุด ลงหมากที่เข้าชุดหน้าขึ้น และประกาศชื่อชุด ผู้เล่นคนอื่นส่งจำนวนเท่ากันคว่ำหน้า ผู้นำเปิดชุดก่อน จากนั้นแต่ละคนตามลำดับอาจเปิดชุดชนิดเดียวกันที่ใหญ่กว่าชุดที่ดีที่สุด ถ้าไม่ได้หรือไม่ต้องการ หมากจะคว่ำไว้ ชุดที่เปิดและใหญ่ที่สุดกินทั้งหมด 4×N ตัว และนำตาถัดไป",
    "rules.scoring": "การคิดคะแนน",
    "rules.piles": "กองเมื่อจบ",
    "rules.points": "แต้ม",
    "rules.beginner": "ตัวช่วยผู้เริ่มต้น",
    "rules.beginnerBody": "ปุ่มย้อนตาจะคืนตำแหน่งก่อนตาสุดท้ายและอธิบายการเปรียบเทียบ แผงโค้ชบอกชุดนำหรือชุดสู้ที่ดีที่สุดในมือ แต่จะไม่เล่นแทนคุณ",
    "rules.footnote": "นี่คือimplementation สอนเล่นโอเพนซอร์สอิสระ ไม่ได้เกี่ยวข้องกับสำนักพิมพ์หรือองค์กรมาตรฐานใด",
    "net.menuKicker": "ละบตุ้ย 3D",
    "net.launchTitle": "จะเล่นแบบไหน?",
    "net.launchBody": "เริ่มเกมบนเครื่องนี้ หรือชวนเพื่อนด้วยลิงก์เดียว",
    "net.pickMode": "เริ่มเล่นได้ในแตะเดียว หรือชวนเพื่อนด้วยลิงก์เดียว",
    "net.menuNote": "ไม่มีบัญชี ไม่มีเซิร์ฟเวอร์เกม สองเบราว์เซอร์คุยกันโดยตรง",
    "net.orFriends": "หรือเล่นกับเพื่อน",
    "net.orType": "หรือพิมพ์เอง",
    "net.solo": "เล่นเลย",
    "net.soloDesc": "เริ่มทันที บอทสามตัวนั่งแทนที่เหลือ",
    "net.host": "เปิดโต๊ะ",
    "net.hostDesc": "เปิดแท็บนี้ไว้ ระบบจะสร้างเลขห้องให้ส่งต่อ",
    "net.join": "เข้าร่วมโต๊ะ",
    "net.joinDesc": "เพื่อนส่งเลขห้องมา? วางที่นี่",
    "net.yourNameHint": "ชื่อนี้จะแสดงให้ผู้เล่นคนอื่นเห็น",
    "net.autoAudio": "เข้าร่วมแชทเสียงเมื่อเริ่มโต๊ะ",
    "net.hostLead": "ส่งคำเชิญ อนุมัติเพื่อน แล้วเริ่มโต๊ะ",
    "net.joinLead": "วางข้อความที่เจ้าบ้านส่งมา หรือพิมพ์รหัสเอง",
    "net.joinNote": "เจ้าบ้านยังต้องอนุมัติก่อนคุณจะได้ที่นั่ง",
    "net.pasteInvite": "วางคำเชิญ",
    "net.pasteInviteDesc": "เติมรหัสห้องและ PIN จากคลิปบอร์ด",
    "net.pasteInviteDone": "วางคำเชิญแล้ว",
    "net.pasteInviteFailed": "ไม่พบคำเชิญในคลิปบอร์ด",
    "net.hostTitle": "เปิดโต๊ะ",
    "net.roomCode": "เลขห้อง",
    "net.codeHelp": "แชร์เลขหกหลักนี้",
    "net.copyLink": "คัดลอกลิงก์เชิญ",
    "net.roster": "ที่นั่ง",
    "net.startTable": "เริ่มโต๊ะ",
    "net.startHint": "มีมนุษย์อย่างน้อยสองคน ที่นั่งว่างจะกลายเป็นบอท",
    "net.needTwo": "ต้องมีมนุษย์ 2 คน",
    "net.needTwoLong": "ต้องมีมนุษย์อย่างน้อยสองคน ที่นั่งที่เหลือจะเป็นบอท",
    "net.joinTitle": "เข้าร่วมโต๊ะ",
    "net.codeLabel": "เลขห้อง",
    "net.codePlaceholder": "482-173",
    "net.nameLabel": "ชื่อของคุณ",
    "net.namePlaceholder": "แขก",
    "net.yourName": "ชื่อของคุณ",
    "net.yourNamePlaceholder": "ชื่อเจ้าบ้านหรือแขก",
    "net.enterName": "กรอกชื่อของคุณก่อนเปิดหรือเข้าร่วมโต๊ะ",
    "net.approvalLabel": "ให้เจ้าบ้านอนุมัติแขกทีละคนก่อนได้ที่นั่ง",
    "net.pinLabel": "PIN ห้อง",
    "net.pinPlaceholder": "5 หลัก",
    "net.pinGuestPlaceholder": "5 หลัก",
    "net.pinPolicy": "ระบบสร้าง PIN 5 หลักเพื่อความสะดวก การอนุมัติเป็นตัวกันหลัก",
    "net.pinSecureOnly": "การแฮช PIN ต้องใช้ HTTPS หรือ localhost",
    "net.pinRule.short": "PIN ต้องมี 5 หลัก",
    "net.pinRule.long": "PIN ต้องมี 5 หลัก",
    "net.pinRule.lower": "PIN ต้องมีตัวพิมพ์เล็ก",
    "net.pinRule.upper": "PIN ต้องมีตัวพิมพ์ใหญ่",
    "net.pinRule.digit": "PIN ต้องมีตัวเลข",
    "net.pinRule.symbol": "PIN ต้องมีสัญลักษณ์ (เช่น ! @ # $ % * + ?)",
    "net.pinRule.space": "PIN ต้องไม่มีช่องว่าง",
    "net.pinRule.common": "PIN นี้พบบ่อยเกินไป เลือกใหม่",
    "net.pinRule.repeat": "PIN ต้องไม่ใช่ตัวเดิมซ้ำทั้งหมด",
    "net.pinRule.sequence": "PIN ต้องไม่ใช่ลำดับง่าย ๆ",
    "net.pinRule.room": "PIN ต้องไม่มีรหัสห้อง",
    "net.pinRule.name": "PIN ต้องไม่มีชื่อของคุณ",
    "net.pinSave": "บันทึก PIN",
    "net.pinGenerate": "สร้าง PIN",
    "net.pinNew": "PIN ใหม่",
    "net.pinAuto": "สร้างอัตโนมัติ · 5 หลัก · เก็บเฉพาะแฮช",
    "net.pinApprovalOnly": "ใช้การอนุมัติอย่างเดียว (ไม่มี PIN)",
    "net.pinInfoAria": "เกี่ยวกับ PIN ห้อง",
    "net.pinInfoTitle": "PIN ทำงานอย่างไร",
    "net.pinInfoBody": "ระบบสร้าง PIN 5 หลักต่อห้อง ปุ่ม PIN ใหม่จะเปลี่ยนสำหรับคนที่เข้าหลังจากนี้ แขกต้องใช้รหัสห้อง + PIN แล้วเจ้าบ้านอนุมัติ PIN เป็นเพียงประตูสะดวก ไม่ใช่การยืนยันตัวตน",
    "net.pinInfoDigest": "เก็บเฉพาะค่าแฮช SHA-256 ในหน่วยความจำ PIN ไม่อยู่ในลิงก์เชิญ ไฟล์เซฟ หรือไฟล์ส่งออก ใช้คัดลอกลิงก์ + PIN เพื่อแชร์ครั้งเดียว",
    "net.pinReveal": "PIN สำหรับแชร์",
    "net.pinCopy": "คัดลอก PIN",
    "net.pinCopied": "คัดลอก PIN แล้ว",
    "net.copyRoomInfo": "คัดลอกข้อมูลห้อง",
    "net.copyInvitePin": "คัดลอกลิงก์ + PIN",
    "net.shareInvitePin": "แชร์ลิงก์ + PIN",
    "net.pinPaste": "วาง PIN",
    "net.pinPasted": "เติมรหัสผ่านจากคลิปบอร์ดแล้ว",
    "net.pinPasteFailed": "เข้าถึงคลิปบอร์ดไม่ได้ กรุณาวางรหัสผ่านเอง",
    "net.pinFromMessage": "วางรหัสผ่านจากข้อความของเจ้าบ้าน",
    "net.roomInfoCopied": "คัดลอกข้อมูลห้องแล้ว — มี PIN อยู่ด้วย แชร์เฉพาะช่องทางที่ไว้ใจ",
    "net.roomInfoNoPin": "คัดลอกข้อมูลห้องโดยไม่มี PIN การอนุมัติยังเป็นตัวกันหลัก",
    "net.pinSet": "ตั้ง PIN แล้ว เก็บเฉพาะค่าแฮช แชร์แยกจากลิงก์ห้อง",
    "net.pinCleared": "ล้าง PIN แล้ว ห้องจะใช้การอนุมัติแทน",
    "net.pinInvalid": "PIN ต้องเป็นตัวเลข 4–6 หลัก",
    "net.pinHint": "แชร์ PIN แยกจากลิงก์เชิญ ลิงก์จะไม่มี PIN",
    "net.pendingTitle": "คำขอเข้าร่วม",
    "net.pendingEmpty": "ยังไม่มีใครรอ",
    "net.approve": "อนุมัติ",
    "net.deny": "ปฏิเสธ",
    "net.approveAll": "อนุมัติทั้งหมด",
    "net.waitingApproval": "กำลังรอเจ้าบ้านอนุมัติ…",
    "net.rejected.denied": "เจ้าบ้านปฏิเสธคำขอของคุณ",
    "net.rejected.bad-pin": "PIN ห้องไม่ถูกต้อง",
    "net.rejected.busy": "เจ้าบ้านไม่ว่าง ลองใหม่ภายหลัง",
    "net.rejected.timeout": "คำขอเข้าร่วมหมดเวลา",
    "net.pinLocked": "ใส่ PIN ผิดหลายครั้ง ลองใหม่ในหนึ่งนาที",
    "net.pendingCount": "รอ {n} คน",
    "net.connect": "เชื่อมต่อ",
    "net.connecting": "กำลังเชื่อมต่อ…",
    "net.retrying": "พยายามเชื่อมต่อครั้งที่ {n} จาก 2…",
    "net.retry": "ลองใหม่",
    "net.brokerTimeout": "ติดต่อ PeerJS broker ไม่ได้ ตรวจ Wi-Fi/ข้อมูลมือถือแล้วลองใหม่",
    "net.hostTimeout": "เจ้าบ้านไม่ตอบ ตรวจว่าแท็บเจ้าบ้านยังเปิดด้วยรหัสห้องนี้ หรือลองเครือข่ายอื่น",
    "net.iceFailed": "WebRTC หาเส้นทางตรงไม่ได้ ลองเครือข่ายอื่นหรือฮอตสปอตมือถือ",
    "net.handshake": "เชื่อมต่อแล้ว กำลังรอเจ้าบ้าน…",
    "net.connectedWaiting": "เชื่อมต่อแล้ว เจ้าบ้านจะเริ่มเมื่อพร้อม",
    "net.reconnected": "กลับเข้าห้องแล้ว — กำลังคืนที่นั่ง…",
    "net.lobbyOpen": "ห้องเปิดอยู่ แชร์รหัสหรือลิงก์เชิญ",
    "net.listening": "กำลังรอแขก…",
    "net.hostKeepOpen": "เปิดแท็บเจ้าบ้านไว้และอย่าให้เครื่องหลับ ถ้าปิดหรือหลับ แขกจะเชื่อมต่อไม่ได้",
    "net.guestConnecting": "แขกกำลังเชื่อมต่อ…",
    "net.readyToStart": "พร้อมเริ่ม · มนุษย์ {n} คน",
    "net.dealing": "กำลังเริ่มโต๊ะ…",
    "net.waitingHost": "รอเจ้าบ้าน",
    "net.hostBadge": "เจ้าบ้าน",
    "net.guestBadge": "แขก",
    "net.botBadge": "บอท",
    "net.emptySeat": "ว่าง",
    "net.botPreview": "ที่นั่งบอท {n}",
    "net.startingHost": "กำลังเปิดห้อง…",
    "net.hostDefault": "เจ้าบ้าน",
    "net.guestDefault": "แขก",
    "net.error": "ข้อผิดพลาดการเชื่อมต่อ: {error}",
    "net.hostFailed": "เปิดห้องไม่ได้: {error}",
    "net.joinFailed": "เข้าร่วมไม่ได้: {error}",
    "net.roomNotFound": "ไม่พบห้อง ตรวจเลขห้องและหน้าเจ้าบ้าน",
    "net.badCode": "เลขห้องต้องเป็นตัวเลขหกหลัก",
    "net.versionMismatch": "โปรโตคอลไม่ตรงกัน ต้องใช้รุ่น {version}",
    "net.hostLeft": "เจ้าบ้านออกจากโต๊ะแล้ว คุณสามารถเข้าห้องอื่นหรือเล่นคนเดียว",
    "net.reconnecting": "การเชื่อมต่อสัญญาณขาด กำลังเชื่อมใหม่…",
    "net.hostOnly": "เฉพาะเจ้าบ้านจึงจะย้อนตาในเกมออนไลน์ได้",
    "net.chipHint": "ห้องของคุณ คลิกเพื่อคัดลอกลิงก์เชิญ",
    "net.modeSolo": "คนเดียว",
    "net.modeHost": "เจ้าบ้าน",
    "net.modeClient": "แขก",
    "net.leave": "ออกจากห้อง",
    "net.back": "กลับ",
    "net.resume": "กลับโต๊ะ",
    "net.lostTitle": "โต๊ะปิดแล้ว",
    "net.fourSeats": "เลี๊ยบตุ่ยเป็นเกมสี่ที่นั่ง: เจ้าบ้านและแขกไม่เกินสามคน ที่นั่งว่างจะเติมด้วยบอท",
    "net.localOnly": "ไม่ต้องมีบัญชี ช่องข้อมูล WebRTC เข้ารหัสระหว่างทาง (DTLS) แต่เจ้าบ้านเห็นไพ่ทุกมือ",
    "net.rejected.in-progress": "แมตช์เริ่มแล้ว",
    "net.rejected.full": "โต๊ะเต็ม (สี่ที่นั่ง)",
    "net.rejected.illegal": "ชุดนั้นไม่ถูกกติกา",
    "net.openLobby": "ผู้เล่นหลายคน",
    "net.resumeMatch": "เล่นต่อ",
    "net.resumeMeta": "รอบ {round} · ตา {trick} · {score} แต้ม",
    "net.leaveTitle": "ออกจากห้องหรือไม่?",
    "net.leaveBodyHost": "การออกจะปิดห้องสำหรับแขกทุกคน ที่นั่งของแขกทุกคนจะกลายเป็นบอท และรหัสห้องจะใช้ไม่ได้อีก",
    "net.leaveBodyGuest": "คุณจะออกจากโต๊ะ บอทจะรับที่นั่งของคุณและแมตช์จะดำเนินต่อ",
    "net.matchInProgress": "แมตช์กำลังเล่น",
    "net.alreadyStarted": "แมตช์เริ่มแล้ว ใช้ปุ่มสร้างแมตช์ใหม่เพื่อเล่นอีกครั้ง หรือออกจากห้อง",
    "net.joinHint": "ขอเลขห้องหกหลักจากเจ้าบ้าน",
    "net.reconnectHint": "กู้ห้อง {code} แล้ว กรอก PIN อีกครั้งเพื่อเชื่อมต่อใหม่",
    "diag.open": "ตรวจสอบปัญหา",
    "diag.title": "ตรวจสอบการเชื่อมต่อ",
    "diag.probe": "ทดสอบด้วย PIN",
    "diag.probeNoPin": "ทดสอบโดยไม่ใส่ PIN",
    "diag.copy": "คัดลอกรายงาน",
    "diag.copied": "คัดลอกรายงานแล้ว",
    "diag.probing": "กำลังทดสอบเจ้าบ้าน…",
    "diag.reachable": "ถึงเจ้าบ้าน ต้องใช้ PIN: {required} PIN ถูกต้อง: {accepted} อนุมัติ: {approval} เริ่มแล้ว: {started} ที่นั่งว่าง: {seats}",
    "diag.unreachable": "ทดสอบไม่สำเร็จ: {error}",
    "diag.noCode": "กรอกรหัสห้องก่อน",
    "dock.expand": "ขยายแถบมือ",
    "dock.collapse": "ย่อแถบมือ",
    "version.reload": "โหลดเวอร์ชันใหม่",
    "version.update": "อัปเดต",
    "version.updateShort": "อัปเดต v{version}",
    "version.updateTo": "อัปเดตเป็น v{version}",
    "version.autoUpdating": "มีเวอร์ชันใหม่ v{version} กำลังอัปเดต…",
    "version.reloadHint": "บังคับโหลดแอปและสคริปต์ใหม่",
    "version.reloadConfirm": "การโหลดใหม่จะปิดห้องหรือแมตช์ปัจจุบัน ดำเนินการต่อหรือไม่?",
    "version.updateAvailable": "มีเวอร์ชันใหม่ {version} โหลดใหม่เพื่ออัปเดต",
    "chat.title": "แชทโต๊ะ",
    "chat.hide": "ซ่อน",
    "chat.show": "แสดง",
    "chat.empty": "ยังไม่มีข้อความ",
    "chat.placeholder": "ส่งข้อความถึงโต๊ะ…",
    "chat.send": "ส่ง",
    "voice.off": "ปิดเสียงพูด",
    "voice.join": "เข้าร่วมเสียง",
    "voice.joinAudio": "เข้าร่วมเสียง",
    "voice.connecting": "กำลังเชื่อมเสียง…",
    "voice.callHintJoin": "เข้าร่วมแชทเสียงของโต๊ะ",
    "voice.callHintLive": "แตะเพื่อปิดหรือเปิดไมโครโฟน",
    "voice.on": "เสียงเปิด",
    "voice.micOn": "ปิดไมค์",
    "voice.micOff": "เปิดไมค์",
    "voice.deafen": "ปิดเสียงคนอื่น",
    "voice.undeafen": "เปิดเสียงคนอื่น",
    "voice.leave": "ออกจากเสียง",
    "voice.micMuted": "ปิดไมโครโฟน",
    "voice.deafened": "ปิดเสียงขาเข้า",
    "voice.allMuted": "ปิดทั้งไมโครโฟนและเสียงขาเข้า",
    "voice.active": "เชื่อมเสียงแล้ว · ขาเข้า {n}",
    "voice.error": "ข้อผิดพลาดเสียง: {error}",
    "voice.denied": "ไม่ได้รับอนุญาตให้ใช้ไมโครโฟน",
    "voice.unavailable": "เสียงต้องใช้หน้าปลอดภัยและอนุญาตไมโครโฟน",
    "voice.peerCount": "เสียงขาเข้า {n} สตรีม",
    "voice.localOnly": "เสียงส่งแบบเพียร์ทูเพียร์และไม่มีการบันทึก",
    "toast.netGuest": "{name} เข้าร่วมโต๊ะ",
    "toast.netGuestLeft": "{name} ออกจากห้องรับแขก",
    "toast.netGuestHeld": "{name} หลุด — เก็บที่นั่งไว้ให้กลับมา",
    "toast.netRejoin": "{name} กลับเข้าที่นั่งเดิมแล้ว",
    "toast.yourTurn": "ถึงตาคุณแล้ว — โต๊ะรออยู่",
    "toast.boardReset": "จัดกระดานกลับเป็น 2D แล้ว",
    "toast.boardLost": "กระดานสูญเสีย context กราฟิก — กดปุ่มจัดกระดานเพื่อกู้คืน",
    "toast.boardReload": "กระดานหลุด — กำลังโหลดใหม่ ผู้เล่นจะกลับเข้าห้องอัตโนมัติ",
    "toast.boardUnavailable": "อุปกรณ์นี้แสดงกระดาน 3D ไม่ได้ แต่กฎและบันทึกยังใช้ได้",
    "board.resetAria": "จัดกระดานกลับเป็นมุมมอง 2D",
    "toast.netBot": "{name} ออก — บอทรับที่นั่งแทน",
    "toast.netStarted": "โต๊ะ {code} เริ่มแล้ว",
    "toast.netLeft": "ออกจากโต๊ะแล้ว",
    "toast.netCopied": "คัดลอกลิงก์เชิญแล้ว",
    "toast.solo": "โต๊ะคนเดียวพร้อมแล้ว",
    "toast.resumed": "เล่นแมตช์เดิมต่อแล้ว"
  }
};

let LANG = "en";
function t(key, vars) {
  const table = I18N[LANG] || I18N.en;
  let text = table[key] ?? I18N.en[key] ?? key;
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

function rankName(power, lang = LANG) {
  const rank = RANK_BY_POWER[power];
  if (!rank) return "";
  return lang === "th" ? rank.th : rank.en;
}

function rankReading(rank) {
  if (!rank) return "";
  return rank.thRed && rank.thBlack ? `${rank.thRed} / ${rank.thBlack}` : rank.th;
}

function tileName(tile, lang = LANG) {
  if (!tile) return "";
  const rank = RANK_BY_ID[tile.rank] || RANK_BY_POWER[tile.power];
  if (!rank) return "";
  if (lang === "th") {
    return (tile.color === "r" ? rank.thRed : rank.thBlack) || rank.th;
  }
  return rank.en;
}

function colorName(color, lang = LANG) {
  return lang === "th" ? COLORS[color].th : COLORS[color].en;
}

function seatName(seat, lang = LANG) {
  const profile = SEAT_PROFILES?.[seat];
  if (profile?.name) return profile.name;
  return lang === "th" ? SEATS[seat].th : SEATS[seat].en;
}

function comboName(type) {
  return t(`combo.${type}`);
}

function comboSummary(combo, lang = LANG) {
  if (!combo) return "";
  const color = colorName(combo.color, lang);
  const power = combo.score?.[0] ?? 1;
  const name = rankName(power, lang);
  const tileTxt = rankName(power, lang);
  switch (combo.type) {
    case "single":
      return lang === "th" ? `${tileTxt}${color}` : `${color} ${tileTxt}`;
    case "pair":
      return lang === "th" ? `คู่${tileTxt}${color}` : `${color} ${tileTxt} pair`;
    case "triple":
      return lang === "th" ? `จุก${color}สามตัว` : `three ${color} Soldiers`;
    case "quad":
      return lang === "th" ? `จุก${color}สี่ตัว` : `four ${color} Soldiers`;
    case "quint":
      return lang === "th" ? `จุก${color}ทั้งห้า` : `all five ${color} Soldiers`;
    case "sahoo": {
      const set = combo.set === "big" ? (lang === "th" ? "ใหญ่" : "big") : (lang === "th" ? "เล็ก" : "small");
      return lang === "th" ? `ซาฮู้${set}${color}` : `${set} ${color} Sa Hoo`;
    }
    case "seehoo": {
      const dup = rankName(combo.dup?.[0] ?? combo.score?.[0] ?? 1, lang);
      return lang === "th" ? `สี่ฮู้ ${dup}${color}` : `${color} See Hoo · ${dup} pair`;
    }
    case "ngohoo": {
      const pairs = (combo.dup || []).map((p) => rankName(p, lang)).join(" + ");
      return lang === "th" ? `ห้าฮู้ ${pairs}${color}` : `${color} Ngoh Hoo · ${pairs} pairs`;
    }
    case "lakhoo":
      return lang === "th" ? `หลักฮู้${color}` : `${color} Lak Hoo`;
    default:
      return comboName(combo.type);
  }
}

/* --------------------------------------------------------------------------
   4. Rules engine
   -------------------------------------------------------------------------- */

function buildDeck() {
  const deck = [];
  for (const color of ["r", "b"]) {
    for (const rank of RANKS) {
      for (let copy = 0; copy < rank.copies; copy += 1) {
        deck.push({
          id: `${color}-${rank.id}-${copy}`,
          rank: rank.id,
          power: rank.power,
          color,
          hanzi: color === "r" ? rank.red : rank.black
        });
      }
    }
  }
  return deck;
}

const DECK = buildDeck();
const TILE_BY_ID = Object.fromEntries(DECK.map((tile) => [tile.id, tile]));

function groupByRankColor(tiles) {
  const groups = new Map();
  for (const tile of tiles) {
    const key = `${tile.color}:${tile.power}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(tile);
  }
  return groups;
}

function makeCombo(type, tiles, score, meta = {}) {
  return {
    type,
    count: tiles.length,
    tiles,
    score,
    color: tiles[0].color,
    set: meta.set || null,
    dup: meta.dup || [],
    key: `${type}:${score.join(",")}:${tiles.map((tile) => tile.id).sort().join("|")}`
  };
}

function detectCombo(tiles) {
  if (!Array.isArray(tiles) || !tiles.length) return null;
  const n = tiles.length;
  if (n > 6) return null;
  const color = tiles[0].color;
  if (!tiles.every((tile) => tile.color === color)) return null;

  const counts = new Map();
  for (const tile of tiles) counts.set(tile.power, (counts.get(tile.power) || 0) + 1);

  if (n === 1) return makeCombo("single", tiles, [tiles[0].power, color === "r" ? 1 : 0]);

  if (n === 2) {
    if (counts.size === 1 && tiles[0].power !== 7) return makeCombo("pair", tiles, [tiles[0].power, color === "r" ? 1 : 0]);
    return null;
  }

  if (n >= 3 && n <= 5 && counts.size === 1) {
    const type = n === 3 ? "triple" : n === 4 ? "quad" : "quint";
    if (tiles[0].power !== 1) return null;
    return makeCombo(type, tiles, [1, color === "r" ? 1 : 0]);
  }

  for (const [setName, core] of [["big", CORE_BIG], ["small", CORE_SMALL]]) {
    if (!tiles.every((tile) => core.includes(tile.power))) continue;
    const coreCounts = core.map((power) => counts.get(power) || 0);
    if (coreCounts.some((count) => count < 1)) continue;
    const extra = coreCounts.map((count) => count - 1);
    const extras = extra.reduce((sum, count) => sum + count, 0);
    if (extras !== n - 3) continue;
    if (extra.some((count) => count > 1)) continue;

    const colorRank = color === "r" ? 1 : 0;
    if (n === 3) {
      return makeCombo("sahoo", tiles, [setName === "big" ? 2 : 1, colorRank], { set: setName });
    }
    const dup = core.filter((power, index) => extra[index] === 1);
    if (n === 4 && dup.length === 1) {
      return makeCombo("seehoo", tiles, [dup[0], colorRank], { set: setName, dup });
    }
    if (n === 5 && dup.length === 2) {
      const sorted = dup.slice().sort((a, b) => b - a);
      return makeCombo("ngohoo", tiles, [sorted[0], sorted[1], colorRank], { set: setName, dup: sorted });
    }
    if (n === 6 && dup.length === 3 && setName === "small") {
      return makeCombo("lakhoo", tiles, [0, colorRank], { set: setName, dup: dup.slice().sort((a, b) => b - a) });
    }
  }
  return null;
}

function compareScores(a, b) {
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    const av = a[i] ?? 0;
    const bv = b[i] ?? 0;
    if (av !== bv) return av > bv ? 1 : -1;
  }
  return 0;
}

function beats(combo, best) {
  if (!combo || !best) return false;
  if (combo.type !== best.type) return false;
  return compareScores(combo.score, best.score) > 0;
}

function sameCombo(a, b) {
  if (!a || !b) return false;
  return a.type === b.type && compareScores(a.score, b.score) === 0;
}

function allCombos(hand, typeFilter = null) {
  const out = [];
  const seen = new Set();
  const add = (tiles) => {
    const combo = detectCombo(tiles);
    if (!combo) return;
    if (typeFilter && combo.type !== typeFilter) return;
    const key = tiles.map((tile) => tile.id).sort().join("|");
    if (seen.has(key)) return;
    seen.add(key);
    out.push(combo);
  };

  const groups = [...groupByRankColor(hand).values()];
  for (const group of groups) {
    for (let size = 1; size <= group.length && size <= 5; size += 1) {
      add(group.slice(0, size));
    }
  }

  for (const color of ["r", "b"]) {
    const colorTiles = hand.filter((tile) => tile.color === color);
    const byPower = new Map();
    for (const tile of colorTiles) {
      if (!byPower.has(tile.power)) byPower.set(tile.power, []);
      byPower.get(tile.power).push(tile);
    }
    for (const core of [CORE_BIG, CORE_SMALL]) {
      if (core.some((power) => !byPower.has(power))) continue;
      for (let mask = 0; mask < 8; mask += 1) {
        const chosen = [];
        let valid = true;
        core.forEach((power, index) => {
          const need = 1 + ((mask >> index) & 1);
          const available = byPower.get(power) || [];
          if (available.length < need) { valid = false; return; }
          chosen.push(...available.slice(0, need));
        });
        if (!valid) continue;
        if (core === CORE_BIG && chosen.length === 6) continue;
        add(chosen);
      }
    }
  }

  return out;
}

function combosBeating(hand, lead, best) {
  return allCombos(hand, lead.type).filter((combo) => beats(combo, best));
}

function scorePiles(piles) {
  if (piles >= 8) return 16;
  return piles - 2;
}

function scoredPilesFromTiles(tiles) {
  return Math.floor(tiles.length / 4);
}

/* --------------------------------------------------------------------------
   5. AI heuristics
   -------------------------------------------------------------------------- */

function comboPower(combo) {
  switch (combo.type) {
    case "single": return (combo.score[0] - 1) / 6;
    case "pair": return (combo.score[0] - 1) / 5;
    case "triple":
    case "quad":
    case "quint": return 0.35 + (combo.count - 3) * 0.08;
    case "sahoo": return 0.35 + (combo.set === "big" ? 0.35 : 0.1);
    case "seehoo": return 0.4 + (combo.score[0] - 2) / 5;
    case "ngohoo": return 0.55 + (combo.score[0] - 2) / 5;
    case "lakhoo": return 0.85;
    default: return 0.3;
  }
}

function comboCost(combo) {
  return combo.tiles.reduce((sum, tile) => sum + tile.power, 0);
}

function tileKeepValue(tile, hand) {
  const same = hand.filter((other) => other.color === tile.color && other.power === tile.power).length;
  let value = tile.power;
  if (same >= 2) value += 2.2;
  if (tile.power === 7) value += 2.5;
  if (CORE_BIG.includes(tile.power) || CORE_SMALL.includes(tile.power)) value += 0.6;
  return value;
}

function chooseLead(hand, options = {}) {
  const combos = allCombos(hand);
  if (!combos.length) return null;
  let best = null;
  let bestScore = -Infinity;
  for (const combo of combos) {
    const power = comboPower(combo);
    const winChance = Math.pow(power, 2.1);
    const cost = comboCost(combo) / (combo.count * 7);
    const generalTax = combo.type === "single" && combo.score[0] === 7 ? 1.6 : 0;
    const lastTrick = hand.length <= combo.count;
    const lengthBonus = combo.count > 1 ? 0.28 * combo.count : 0;
    const score = winChance * (2.1 + lengthBonus) - cost * 0.55 - generalTax + (lastTrick ? 1.4 : 0) + (options.jitter === false ? 0 : random() * 0.32);
    if (score > bestScore) { bestScore = score; best = combo; }
  }
  return best;
}

function chooseFollow(hand, lead, bestCombo, options = {}) {
  const needed = lead.count;
  const beating = combosBeating(hand, lead, bestCombo).sort((a, b) => {
    const byStrength = compareScores(a.score, b.score);
    if (byStrength !== 0) return byStrength;
    return comboCost(a) - comboCost(b);
  });

  if (beating.length) {
    const playsLeft = options.playsLeft ?? 3;
    const chance = options.challengeChance ?? (playsLeft <= 1 ? 0.96 : 0.78);
    if ((options.deterministic && options.reveal !== false) || (!options.deterministic && random() < chance)) {
      return { tiles: beating[0].tiles, reveal: true, combo: beating[0] };
    }
  }

  const sorted = hand.slice().sort((a, b) => tileKeepValue(a, hand) - tileKeepValue(b, hand) || a.power - b.power);
  const discard = sorted.slice(0, needed);
  return { tiles: discard, reveal: false, combo: detectCombo(discard) };
}

function recommendedFollow(hand, lead, bestCombo) {
  const beating = combosBeating(hand, lead, bestCombo).sort((a, b) => compareScores(a.score, b.score) || comboCost(a) - comboCost(b));
  if (beating.length) return { kind: "beat", combo: beating[0] };
  const sorted = hand.slice().sort((a, b) => tileKeepValue(a, hand) - tileKeepValue(b, hand));
  return { kind: "discard", tiles: sorted.slice(0, lead.count) };
}

/* --------------------------------------------------------------------------
   6. Match state
   -------------------------------------------------------------------------- */

const DEFAULT_PREFS = Object.freeze({ lang: "en", sound: true, coach: true, cinema: false, tileList: true, theme: "daybreak", fontSize: "md", chatOpen: true, dockCollapsed: true, autoAudio: true, target: 20, direction: "cw", mode: "piles", resultSeconds: 2, autoNext: true, draftMode: false });
const DEFAULT_STATS = Object.freeze({ matches: 0, wins: 0, losses: 0, draws: 0, rounds: 0, bestStreak: 0, currentStreak: 0, history: [], lastPlayed: null });

let prefs = { ...DEFAULT_PREFS };
let stats = clone(DEFAULT_STATS);
let state = null;
let scene = null;
let audio = null;
let inspectedTileId = null;
let actionTimer = null;
let actionToken = 0;
let newMatchGuard = false;

/*
 * Multiplayer identity.
 * MY_SEAT is the seat this browser controls. In solo it is 0 and seats 1–3 are
 * bots. In a hosted room it is 0; a guest gets the seat assigned by the host.
 * SEAT_PROFILES is null in solo, so every historical seat label and AI path is
 * unchanged.
 */
let MY_SEAT = 0;
let SEAT_PROFILES = null;
let net = null;
let lobbyState = null;
let resumeAvailable = false;
let voice = null;
let voiceActive = false;
let voiceJoining = false;
let chatHistory = [];
let chatOpen = true;
let chatUnread = 0;
let pendingRequests = new Map();
const pendingTimers = new Map();
let roomPinPlain = "";
let joinToken = 0;
let availableVersion = "";
let lastNetError = "";
let lastNetStage = "";
let activePanelId = null;
let panelHome = null;
let hostWakeLock = null;
const speakingSeats = new Set();
let remoteClock = null;
let lastPublished = 0;
let publishTimer = null;
const VERSION_CHECK_KEY = "leabtui.versionCheck.v1";
const AUTO_RELOAD_KEY = "leabtui.autoReload.v1";
const VERSION_CHECK_MS = 5 * 60 * 1000;
const PLAYER_NAME_KEY = "leabtui.name.v1";
const ROOM_INTENT_KEY = "leabtui.room.v1";
const REJOIN_KEY = "leabtui.rejoin.v1";
const LAUNCH_KEY = "leabtui.launch.v1";

function isNetworked() {
  return Boolean(net && (net.role === "host" || net.role === "client") && SEAT_PROFILES);
}

function isHost() {
  return Boolean(net && net.role === "host");
}

function isClient() {
  return Boolean(net && net.role === "client");
}

function isBotSeat(seat) {
  if (seat === MY_SEAT) return false;
  if (SEAT_PROFILES) {
    const kind = SEAT_PROFILES[seat]?.kind;
    return kind !== "host" && kind !== "human";
  }
  return seat !== 0;
}

function nextSeat(seat) {
  const dir = state?.direction === "ccw" ? -1 : 1;
  return (seat + dir + TABLE_SEATS) % TABLE_SEATS;
}

function isLocalSeat(seat) {
  return seat === MY_SEAT;
}

function isHumanSeat(seat) {
  if (!SEAT_PROFILES) return seat === 0;
  const kind = SEAT_PROFILES[seat]?.kind;
  return kind === "host" || kind === "human";
}

function seatProfile(seat) {
  if (SEAT_PROFILES?.[seat]) return SEAT_PROFILES[seat];
  return { seat, name: seatName(seat), kind: seat === 0 ? "host" : "bot", connected: seat === 0 };
}

function makeState(seed) {  return {
    phase: "dealing",
    round: 1,
    trick: 0,
    dealer: 3,
    leader: 0,
    turn: 0,
    hands: [[], [], [], []],
    captures: [[], [], [], []],
    captureHidden: [[], [], [], []],
    captureFrom: [[], [], [], []],
    captureTrick: [[], [], [], []],
    trickArchive: [],
    center: [],
    lead: null,
    best: null,
    selected: [],
    scores: [0, 0, 0, 0],
    roundPoints: [0, 0, 0, 0],
    target: 20,
    direction: "cw",
    mode: "piles",
    multiplier: 1,
    redraws: 0,
    resultSeconds: 2,
    draftMode: false,
    draftPool: null,
    draftOrder: null,
    draftCycle: 0,
    draftIndex: 0,
    draftSeat: null,
    bids: null,
    bidOrder: null,
    bidTurn: 0,
    history: [],
    log: [],
    snapshot: null,
    lastTrick: null,
    lastRound: null,
    winner: null,
    startedAt: Date.now(),
    handCounts: [0, 0, 0, 0],
    seed: seed ?? Math.floor(Math.random() * 1e9),
    fast: false,
    language: prefs.lang,
    /* Host-only: tileId → ghost mesh id. Stripped before every wire message. */
    hiddenTags: [[], [], [], []]
  };
}

function serializeCombo(combo) {
  if (!combo) return null;
  return {
    type: combo.type,
    count: combo.count,
    tiles: combo.tiles.map((tile) => typeof tile === "string" ? tile : tile.id),
    score: combo.score.slice(),
    color: combo.color,
    set: combo.set || null,
    dup: (combo.dup || []).slice(),
    key: combo.key
  };
}

function serializableState(source = state) {
  if (!source) return null;
  const base = { ...source };
  delete base.snapshot;
  delete base.fast;
  delete base.hiddenTags;
  const copy = clone(base);
  copy.hands = source.hands.map((hand) => hand.map((tile) => typeof tile === "string" ? tile : tile.id));
  copy.captures = source.captures.map((pile) => pile.map((tile) => typeof tile === "string" ? tile : tile.id));
  copy.captureHidden = [0, 1, 2, 3].map((seat) => (
    (source.captures[seat] || []).map((_, index) => Boolean(source.captureHidden?.[seat]?.[index]))
  ));
  copy.trickArchive = (source.trickArchive || []).map((record) => ({
    ...record,
    combo: serializeCombo(record.combo),
    entries: (record.entries || []).map((entry) => ({
      ...entry,
      combo: serializeCombo(entry.combo),
      tiles: (entry.tiles || []).map((tile) => (tile && tile.id ? tile.id : "hidden"))
    }))
  }));
  copy.draftPool = source.draftPool ? source.draftPool.map((tile) => (typeof tile === "string" ? tile : tile.id)) : null;
  copy.captureTrick = [0, 1, 2, 3].map((seat) => (
    (source.captures[seat] || []).map((_, index) => (
      Number.isInteger(source.captureTrick?.[seat]?.[index]) ? source.captureTrick[seat][index] : null
    ))
  ));
  copy.captureFrom = [0, 1, 2, 3].map((seat) => (
    (source.captures[seat] || []).map((_, index) => (
      Number.isInteger(source.captureFrom?.[seat]?.[index]) ? source.captureFrom[seat][index] : null
    ))
  ));
  copy.center = source.center.map((entry) => ({
    seat: entry.seat,
    revealed: Boolean(entry.revealed),
    tiles: entry.tiles.map((tile) => typeof tile === "string" ? tile : tile.id),
    combo: serializeCombo(entry.combo)
  }));
  copy.lead = source.lead ? { seat: source.lead.seat, combo: serializeCombo(source.lead.combo) } : null;
  copy.best = source.best ? { seat: source.best.seat, combo: serializeCombo(source.best.combo) } : null;
  if (source.lastTrick) {
    copy.lastTrick = {
      ...source.lastTrick,
      combo: serializeCombo(source.lastTrick.combo),
      humanCombo: serializeCombo(source.lastTrick.humanCombo),
      entries: (source.lastTrick.entries || []).map((entry) => ({ ...entry, combo: serializeCombo(entry.combo) }))
    };
  }
  copy.log = (source.log || []).map((entry) => ({ ...entry, combo: serializeCombo(entry.combo) }));
  return copy;
}

function savePrefs() {
  try { localStorage.setItem(APP.prefsKey, JSON.stringify(prefs)); } catch { /* storage may be denied */ }
}

function saveStats() {
  try { localStorage.setItem(APP.statsKey, JSON.stringify(stats)); } catch { /* ignore */ }
}

function saveMatch() {
  if (!state) return;
  if (isClient()) return; // a guest view is not a resumable game
  try {
    localStorage.setItem(APP.storageKey, JSON.stringify({
      format: APP.format,
      version: APP.version,
      savedAt: nowISO(),
      network: isNetworked(),
      game: serializableState()
    }));
  } catch { /* ignore */ }
  if (isHost()) queuePublish();
}

function loadPrefs() {
  try {
    const raw = localStorage.getItem(APP.prefsKey);
    if (raw) prefs = { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch { prefs = { ...DEFAULT_PREFS }; }
  LANG = prefs.lang === "th" ? "th" : "en";
  if (!FONT_SIZES.some((entry) => entry.id === prefs.fontSize)) prefs.fontSize = "md";
  if (!THEMES.some((entry) => entry.id === prefs.theme)) prefs.theme = "daybreak";
  if (![20, 50, 100].includes(Number(prefs.target))) prefs.target = 20;
  if (!["cw", "ccw"].includes(prefs.direction)) prefs.direction = "cw";
  if (!["piles", "bid"].includes(prefs.mode)) prefs.mode = "piles";
  if (![0, 2, 4, 6].includes(Number(prefs.resultSeconds))) prefs.resultSeconds = 2;
  prefs.autoNext = prefs.autoNext !== false;
  prefs.draftMode = prefs.draftMode === true;
}

function loadStats() {
  try {
    const raw = localStorage.getItem(APP.statsKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      stats = { ...clone(DEFAULT_STATS), ...parsed, history: Array.isArray(parsed.history) ? parsed.history.slice(0, 40) : [] };
    }
  } catch { stats = clone(DEFAULT_STATS); }
}

function loadMatch() {
  try {
    const raw = localStorage.getItem(APP.storageKey);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.format !== APP.format || !parsed.game) return false;
    if (parsed.network) return false; // network rooms are not restorable across reloads
    const game = parsed.game;
    if (!Array.isArray(game.hands) || game.hands.length !== 4) return false;
    if (!Array.isArray(game.scores) || game.scores.length !== 4) return false;
    if (!["lead", "follow", "showdown", "roundEnd", "matchEnd", "draft"].includes(game.phase)) return false;
    const tileIds = new Set(DECK.map((tile) => tile.id));
    for (const hand of game.hands) {
      if (!Array.isArray(hand) || hand.length > 8) return false;
      if (!hand.every((id) => tileIds.has(id))) return false;
    }
    const savedPhase = game.phase;
    state = { ...makeState(game.seed), ...game, fast: false };
    state.hands = state.hands.map((hand) => hand.map((id) => TILE_BY_ID[id]).filter(Boolean));
    state.captures = (state.captures || [[], [], [], []]).map((pile) => pile.map((id) => TILE_BY_ID[id]).filter(Boolean));
    state.captureHidden = [0, 1, 2, 3].map((seat) => (
      (state.captures[seat] || []).map((_, index) => Boolean(game.captureHidden?.[seat]?.[index]))
    ));
    state.draftPool = game.draftPool ? game.draftPool.map((id) => TILE_BY_ID[id]).filter(Boolean) : null;
    state.captureTrick = [0, 1, 2, 3].map((seat) => (
      (state.captures[seat] || []).map((_, index) => (
        Number.isInteger(game.captureTrick?.[seat]?.[index]) ? game.captureTrick[seat][index] : null
      ))
    ));
    state.captureFrom = [0, 1, 2, 3].map((seat) => (
      (state.captures[seat] || []).map((_, index) => (
        Number.isInteger(game.captureFrom?.[seat]?.[index]) ? game.captureFrom[seat][index] : null
      ))
    ));
    state.center = (state.center || []).map((entry) => ({
      ...entry,
      tiles: entry.tiles.map((id) => TILE_BY_ID[id]).filter(Boolean),
      combo: entry.combo && entry.combo.tiles ? {
        ...entry.combo,
        tiles: entry.combo.tiles.map((id) => TILE_BY_ID[id]).filter(Boolean)
      } : null
    })).filter((entry) => entry.tiles.length);
    state.center = state.center.map((entry) => ({ ...entry, combo: detectCombo(entry.tiles) }));
    const leadEntry = state.center.find((entry) => entry.seat === game.lead?.seat) || state.center[0] || null;
    state.lead = leadEntry ? { seat: leadEntry.seat, combo: leadEntry.combo } : null;
    const bestEntry = state.center.find((entry) => entry.seat === game.best?.seat && entry.revealed)
      || state.center.filter((entry) => entry.revealed).sort((a, b) => compareScores(a.combo?.score || [0], b.combo?.score || [0])).pop()
      || null;
    state.best = bestEntry ? { seat: bestEntry.seat, combo: bestEntry.combo } : null;
    state.selected = [];
    if (savedPhase === "roundEnd" || savedPhase === "matchEnd" || savedPhase === "draft") state.phase = savedPhase;
    else state.phase = state.center.length ? "follow" : "lead";
    if (state.phase === "lead" && state.turn !== state.leader) state.turn = state.leader;
    if (state.phase === "draft") {
      state.draftPool = state.draftPool || [];
      state.draftOrder = Array.isArray(state.draftOrder) && state.draftOrder.length === 4
        ? state.draftOrder
        : [0, 1, 2, 3];
      if (!Number.isInteger(state.draftSeat)) state.draftSeat = state.draftOrder[0];
      state.turn = state.draftSeat;
    }
    if (state.snapshot) state.snapshot = null;
    return true;
  } catch {
    return false;
  }
}

function resetStats() {
  stats = clone(DEFAULT_STATS);
  saveStats();
}

/* --------------------------------------------------------------------------
   7. Game flow
   -------------------------------------------------------------------------- */

function setPhase(phase) {
  if (!state) return;
  state.phase = phase;
  state.language = LANG;
  renderAll();
}

function handCounts() {
  return state.hands.map((hand) => hand.length);
}

function currentSeatName(seat) {
  return seatName(seat);
}

function handHasHigh(hand) {
  return (hand || []).some((tile) => tile.power >= 5 && (tile.color === "r" || tile.power >= 6));
}

function canRedraw(seat) {
  if (!state || state.draftMode) return false;
  if (!["lead", "bid"].includes(state.phase)) return false;
  if (state.trick !== 0 && state.phase !== "bid") return false;
  if (state.center.length || state.lead) return false;
  if (state.phase === "bid" && state.bidTurn > 0) return false;
  if (state.phase === "lead" && state.bids?.some((value) => Number.isInteger(value))) return false;
  const hand = state.hands?.[seat] || [];
  return hand.length === 8 && !handHasHigh(hand);
}

function applyRedraw(seat) {
  if (!canRedraw(seat)) return false;
  state.redraws = (state.redraws || 0) + 1;
  state.multiplier = 1 + state.redraws;
  state.log.push({ kind: "redraw", trick: 0, seat, count: state.redraws });
  audio?.play("shuffle", seat);
  toast(t("toast.redraw", { n: state.redraws + 1 }), "gold");
  dealRound(seat);
  return true;
}

function canClaimChuan(seat) {
  if (!state || state.phase !== "follow" || state.turn !== seat) return false;
  if (state.center.length !== 3) return false;
  const hand = state.hands?.[seat] || [];
  return hand.length === 1 && hand[0].power === 1 && (state.captures?.[seat]?.length || 0) === 28;
}

function claimChuan(seat) {
  if (!canClaimChuan(seat)) return false;
  const tile = state.hands[seat][0];
  const combo = detectCombo([tile]);
  state.hands[seat] = [];
  state.center.push({ seat, tiles: [tile], combo, revealed: true, chuan: true });
  state.best = { seat, combo };
  state.log.push({ kind: "chuan", trick: state.trick + 1, seat });
  toast(t("toast.chuan"), "gold");
  state.snapshot = null;
  resolveTrick();
  return true;
}

function bidSum() {
  return (state?.bids || []).reduce((sum, value) => sum + (Number.isInteger(value) ? value : 0), 0);
}

function bidForbidden() {
  if (!state?.bidOrder || state.bidTurn !== 3) return null;
  const sum = bidSum();
  const value = 8 - sum;
  return value >= 0 && value <= 8 ? value : null;
}

function beginBidPhase() {
  if (!state) return;
  state.phase = "bid";
  state.bids = [null, null, null, null];
  state.bidOrder = [];
  let cursor = state.leader;
  for (let step = 0; step < TABLE_SEATS; step += 1) {
    state.bidOrder.push(cursor);
    cursor = nextSeat(cursor);
  }
  state.bidTurn = 0;
  state.turn = state.bidOrder[0];
  state.center = [];
  state.lead = null;
  state.best = null;
  renderAll();
  saveMatch();
  if (scene) scene.sync(state);
  if (isBotSeat(state.turn)) scheduleAI(700);
}

function placeBid(seat, value) {
  if (!state || state.phase !== "bid" || state.turn !== seat) return false;
  if (!Number.isInteger(value) || value < 0 || value > 8) return false;
  if (state.bids[seat] !== null) return false;
  if (state.bidTurn === 3 && bidForbidden() === value) return false;
  state.bids[seat] = value;
  state.bidTurn += 1;
  state.log.push({ kind: "bid", trick: 0, seat, value });
  if (state.bidTurn >= TABLE_SEATS) {
    state.phase = "lead";
    state.leader = state.bidOrder[0];
    state.turn = state.leader;
    renderAll();
    saveMatch();
    if (scene) scene.sync(state);
    if (isBotSeat(state.turn)) scheduleAI(700);
    return true;
  }
  state.turn = state.bidOrder[state.bidTurn];
  renderAll();
  saveMatch();
  if (scene) scene.sync(state);
  if (isBotSeat(state.turn)) scheduleAI(600);
  return true;
}

function aiBid(seat) {
  if (!state || state.phase !== "bid" || state.turn !== seat) return;
  const hand = state.hands[seat] || [];
  const strength = hand.reduce((sum, tile) => sum + (tile.power >= 5 ? 2 : tile.power >= 4 ? 1 : 0), 0);
  let value = Math.max(0, Math.min(8, Math.round(strength / 2)));
  if (state.bidTurn === 3) {
    const forbidden = bidForbidden();
    if (value === forbidden) value = value >= 8 ? 7 : value + 1;
  }
  placeBid(seat, value);
}

function startDraft() {
  clearTimeout(actionTimer);
  actionToken += 1;
  const deck = shuffle(buildDeck());
  state.hands = [[], [], [], []];
  state.hiddenTags = [{}, {}, {}, {}];
  state.captures = [[], [], [], []];
  state.captureHidden = [[], [], [], []];
  state.captureFrom = [[], [], [], []];
  state.captureTrick = [[], [], [], []];
  state.center = [];
  state.lead = null;
  state.best = null;
  state.selected = [];
  state.lastTrick = null;
  state.trick = 0;
  state.phase = "draft";
  state.handCounts = [0, 0, 0, 0];
  state.winner = null;
  state.snapshot = null;
  state.draftPool = deck;
  state.draftOrder = [];
  let cursor = state.dealer;
  for (let i = 0; i < TABLE_SEATS; i += 1) {
    cursor = nextSeat(cursor);
    state.draftOrder.push(cursor);
  }
  state.draftCycle = 0;
  state.draftIndex = 0;
  state.draftSeat = state.draftOrder[0];
  state.turn = state.draftSeat;
  renderAll();
  saveMatch();
  audio?.play("shuffle", 0);
  if (isBotSeat(state.turn)) scheduleAI(650);
}

function draftPick(seat, ids) {
  if (!state || state.phase !== "draft" || state.turn !== seat) return false;
  if ((state.hands[seat] || []).length >= 8) return false;
  const wanted = Array.isArray(ids) ? ids.filter((id) => typeof id === "string").slice(0, 2) : [];
  if (wanted.length !== 2) return false;
  const tiles = wanted.map((id) => state.draftPool.find((tile) => tile.id === id)).filter(Boolean);
  if (tiles.length !== 2) return false;
  state.draftPool = state.draftPool.filter((tile) => !tiles.includes(tile));
  state.hands[seat].push(...tiles);
  state.hands[seat].forEach((tile, index) => {
    if (!state.hiddenTags[seat][tile.id]) state.hiddenTags[seat][tile.id] = `${GHOST_PREFIX}${seat}-${index}`;
  });
  state.handCounts = handCounts();
  state.log.push({ kind: "draft", trick: 0, seat, count: tiles.length });
  state.draftIndex = (state.draftIndex + 1) % TABLE_SEATS;
  if (state.draftIndex === 0) state.draftCycle += 1;
  if (state.hands.every((hand) => hand.length === 8)) { finishDraft(); return true; }
  state.draftSeat = state.draftOrder[state.draftIndex];
  state.turn = state.draftSeat;
  renderAll();
  saveMatch();
  if (scene) scene.sync(state);
  if (isBotSeat(state.turn)) scheduleAI(600);
  return true;
}

function finishDraft() {
  state.draftPool = null;
  state.draftSeat = null;
  state.draftOrder = null;
  const holder = state.hands.findIndex((hand) => hand.some((tile) => tile.id === "r-general-0"));
  state.leader = holder >= 0 ? holder : 0;
  state.turn = state.leader;
  state.phase = "lead";
  state.handCounts = handCounts();
  if (scene) scene.sync(state);
  beginTrick();
  toast(t("toast.draftDone"), "jade");
}

function randomDraftPair(pool, rng = random) {
  const copy = (pool || []).slice();
  const picks = [];
  for (let i = 0; i < 2 && copy.length; i += 1) {
    const [tile] = copy.splice(Math.floor(rng() * copy.length), 1);
    if (tile) picks.push(tile);
  }
  return picks;
}

function aiDraftPick(seat) {
  if (!state || state.phase !== "draft" || state.turn !== seat) return;
  const picks = randomDraftPair(state.draftPool).map((tile) => tile.id);
  if (picks.length !== 2) return;
  draftPick(seat, picks);
}

function beginTrick() {
  if (!state) return;
  clearTimeout(actionTimer);
  if (state.hands.every((hand) => hand.length === 0)) {
    endRound();
    return;
  }
  state.snapshot = { game: serializableState(state), stats: clone(stats), hiddenTags: clone(state.hiddenTags), at: Date.now() };
  state.trick += 1;
  state.center = [];
  state.lead = null;
  state.best = null;
  state.selected = [];
  state.lastTrick = null;
  state.turn = state.leader;
  state.phase = "lead";
  state.handCounts = handCounts();
  updateUndoButton();
  renderAll();
  saveMatch();
  if (isLocalSeat(state.turn)) {
    audio?.play("flip", 0);
    coachTick();
  } else if (isBotSeat(state.turn)) {
    scheduleAI(1100);
  }
  if (scene) scene.sync(state);
}

function scheduleAI(delay = 1000) {
  clearTimeout(actionTimer);
  if (!state) return;
  if (!isBotSeat(state.turn)) return;
  if (!["lead", "follow", "showdown", "bid", "draft"].includes(state.phase)) return;
  const token = ++actionToken;
  const seat = state.turn;
  actionTimer = setTimeout(() => {
    if (!state || token !== actionToken) return;
    if (!["lead", "follow", "showdown", "bid", "draft"].includes(state.phase) || state.turn !== seat) return;
    if (!isBotSeat(seat)) return;
    if (state.phase === "draft") aiDraftPick(seat);
    else if (state.phase === "bid") aiBid(seat);
    else if (canClaimChuan(seat)) claimChuan(seat);
    else if (state.phase === "lead") aiLead(seat);
    else if (state.phase === "showdown") aiShowdown(seat);
    else aiFollow(seat);
  }, state.fast ? 5 : delay);
}

function dealRound(leaderHint = null) {
  if (!state) return;
  random = Number.isFinite(state.seed)
    ? mulberry32(state.seed + state.round * 7919 + (state.redraws || 0) * 104729)
    : Math.random;
  if (state.draftMode) { startDraft(); return; }
  clearTimeout(actionTimer);
  actionToken += 1;
  const deck = shuffle(buildDeck());
  const hands = [[], [], [], []];
  for (let i = 0; i < 32; i += 1) hands[i % 4].push(deck[i]);
  state.hands = hands;
  state.hiddenTags = hands.map((hand, seat) => {
    const tags = {};
    hand.forEach((tile, index) => { tags[tile.id] = `${GHOST_PREFIX}${seat}-${index}`; });
    return tags;
  });
  state.captures = [[], [], [], []];
  state.captureHidden = [[], [], [], []];
  state.captureFrom = [[], [], [], []];
  state.captureTrick = [[], [], [], []];
  state.center = [];
  state.lead = null;
  state.best = null;
  state.selected = [];
  state.lastTrick = null;
  state.lastRound = state.lastRound || null;
  state.trick = 0;
  state.phase = "dealing";
  state.handCounts = [8, 8, 8, 8];
  state.winner = null;
  state.snapshot = null;
  state.bids = null;
  state.bidOrder = null;
  state.bidTurn = 0;

  if (leaderHint !== null) {
    state.leader = leaderHint;
  } else {
    const holder = state.hands.findIndex((hand) => hand.some((tile) => tile.id === "r-general-0"));
    state.leader = holder >= 0 ? holder : 0;
  }
  state.turn = state.leader;

  updateUndoButton();
  renderAll();
  saveMatch();
  audio?.play("shuffle", 0);

  const finishDeal = () => {
    if (!state || state.phase !== "dealing") return;
    if (scene) scene.flipHumanHand(state);
    setTimeout(() => {
      if (!state || state.phase !== "dealing") return;
      if (state.mode === "bid") beginBidPhase();
      else beginTrick();
      toast(t("toast.dealt", { seat: seatName(state.leader) }));
    }, state.fast ? 10 : 380);
  };

  if (scene) {
    scene.deal(state).then(finishDeal).catch(finishDeal);
  } else {
    setTimeout(finishDeal, state.fast ? 0 : 30);
  }
}

function beginMatch(options = {}) {
  clearTimeout(actionTimer);
  actionToken += 1;
  resumeAvailable = false;
  pendingTrickFinish = null;
  trickResultGate = false;
  lastResultKey = "";
  lastFocusKey = "";
  state = makeState(options.seed ?? bootSeed ?? Math.floor(Math.random() * 1e9));
  state.fast = Boolean(options.fast);
  state.dealer = 3;
  state.round = options.round ?? 1;
  state.scores = [0, 0, 0, 0];
  state.history = [];
  state.log = [];
  state.trickArchive = [];
  state.lastRound = null;
  state.snapshot = null;
  state.target = options.target ?? prefs.target ?? 20;
  state.direction = prefs.direction || "cw";
  state.mode = prefs.mode || "piles";
  state.multiplier = 1;
  state.redraws = 0;
  state.resultSeconds = prefs.resultSeconds;
  state.draftMode = prefs.draftMode === true;
  state.bids = null;
  state.bidOrder = null;
  state.bidTurn = 0;
  hideAllModals();
  renderAll();
  dealRound();
  savePrefs();
  saveStats();
  saveMatch();
  if (scene) scene.reset(state);
}

function startNextRound() {
  if (isClient()) {
    toast(t("net.hostOnly"));
    return;
  }
  if (!state || state.phase === "matchEnd") return;
  clearTimeout(actionTimer);
  pendingTrickFinish = null;
  trickResultGate = false;
  lastResultKey = "";
  closeModal("trickResultModal");
  state.round += 1;
  state.dealer = (state.dealer + 1) % 4;
  state.target = state.target || 20;
  state.scores = state.scores.slice();
  state.multiplier = 1;
  state.redraws = 0;
  state.bids = null;
  state.roundPoints = [0, 0, 0, 0];
  state.lastRound = null;
  state.winner = null;
  state.log = [];
  state.snapshot = null;
  const lastWinner = state.lastTrick?.winner ?? state.dealer;
  hideAllModals();
  renderAll();
  dealRound(lastWinner);
  toast(t("toast.nextRound", { n: state.round }));
}

function leadTrick(seat, tileIds, comboOverride = null) {
  if (!state || state.phase !== "lead" || state.turn !== seat) return false;
  const hand = state.hands[seat];
  const tiles = tileIds.map((id) => hand.find((tile) => tile.id === id)).filter(Boolean);
  if (tiles.length !== tileIds.length) return false;
  const combo = detectCombo(tiles);
  if (!combo || (comboOverride && combo.type !== comboOverride)) return false;

  state.hands[seat] = hand.filter((tile) => !tiles.includes(tile));
  state.lead = { seat, combo };
  state.best = null;
  state.center.push({ seat, tiles, combo, revealed: false });
  state.selected = [];
  state.turn = nextSeat(seat);
  state.phase = "follow";
  state.handCounts = handCounts();
  state.log.push({ kind: "lead", trick: state.trick, seat, callType: combo.type, callCount: combo.count });
  audio?.play("clack", seat);
  renderAll();
  saveMatch();
  if (scene) scene.sync(state);
  coachTick();

  if (isBotSeat(state.turn)) scheduleAI(1200);
  return true;
}

function submitPlay(seat, tileIds, reveal) {
  if (!state || state.phase !== "follow" || state.turn !== seat || !state.lead) return false;
  const hand = state.hands[seat];
  const tiles = tileIds.map((id) => hand.find((tile) => tile.id === id)).filter(Boolean);
  if (tiles.length !== state.lead.combo.count || tiles.length !== tileIds.length) return false;

  const combo = detectCombo(tiles);
  const shown = false;

  state.hands[seat] = hand.filter((tile) => !tiles.includes(tile));
  state.center.push({ seat, tiles, combo, revealed: false });
  state.selected = [];
  state.handCounts = handCounts();
  state.turn = nextSeat(seat);
  state.log.push({ kind: shown ? "challenge" : "hidden", trick: state.trick, seat, combo: clone(combo || null), revealed: shown });
  audio?.play(shown ? "flip" : "clack", seat);
  renderAll();
  saveMatch();
  if (scene) scene.sync(state);
  coachTick();

  if (state.center.length === 4) {
    beginShowdown();
  } else if (!isBotSeat(state.turn)) {
    // A local or remote human is next; wait for their action.
    coachTick();
  } else {
    scheduleAI(900);
  }
  return true;
}

function showdownCanShow(seat) {
  if (!state?.center) return false;
  const entry = state.center.find((item) => item.seat === seat);
  if (!entry?.combo) return false;
  return !state.lead?.combo || entry.combo.type === state.lead.combo.type;
}

function showdownCanBeat(seat) {
  if (!state?.center) return false;
  const entry = state.center.find((item) => item.seat === seat);
  if (!entry?.combo) return false;
  if (!state.best) return true;
  return entry.combo.type === state.best.combo.type && beats(entry.combo, state.best.combo);
}

function beginShowdown() {
  if (!state || !state.lead || !state.center.length) return;
  const leaderEntry = state.center.find((entry) => entry.seat === state.lead.seat);
  if (!leaderEntry) return;
  state.best = null;
  state.phase = "showdown";
  state.showdownQueue = [];
  let cursor = leaderEntry.seat;
  for (let step = 0; step < TABLE_SEATS; step += 1) {
    state.showdownQueue.push(cursor);
    cursor = nextSeat(cursor);
  }
  state.log.push({ kind: "showdown", trick: state.trick, seat: leaderEntry.seat });
  advanceShowdown();
}

function advanceShowdown() {
  if (!state || state.phase !== "showdown") return;
  if (!state.showdownQueue?.length) {
    resolveTrick();
    return;
  }
  state.turn = state.showdownQueue[0];
  renderAll();
  saveMatch();
  if (scene) scene.sync(state);
  coachTick();
  if (isBotSeat(state.turn)) scheduleAI(900);
}

function trickCardsMarkup(entry, showTiles, isWinner) {
  const tiles = entry.tiles || [];
  if (!showTiles) {
    return tiles.map(() => (
      `<div class="pile-item back"><span class="mini-tile back" role="img" aria-label="${escapeHTML(t("pile.hidden"))}">?</span></div>`
    )).join("");
  }
  return tiles.map((tile) => {
    const rank = RANK_BY_ID[tile.rank] || RANK_BY_POWER[tile.power];
    return `<div class="pile-item ${isWinner ? "winner" : ""}">
      <em>${rank.power}</em>
      <span class="mini-tile ${tile.color === "r" ? "red" : "black"}">${tile.hanzi}</span>
      <b>${escapeHTML(tileName(tile))}</b>
    </div>`;
  }).join("");
}

/* One comparison layout for the reveal result, the trick history and (in spirit) the captured pile. */
function trickCompareMarkup(entries, winnerSeat, showFor = null) {
  return `<div class="trick-compare">${(entries || []).map((entry) => {
    const isWinner = entry.seat === winnerSeat;
    const showTiles = entry.revealed || entry.seat === showFor;
    const label = showTiles && entry.combo ? comboSummary(entry.combo) : t("showdown.hidden");
    return `<section class="trick-seat ${isWinner ? "win" : ""}" role="group" aria-label="${escapeHTML(seatName(entry.seat))}">
      <div class="trick-seat-head">
        <b>${isWinner ? `<span class="seat-tick" role="img" aria-label="${escapeHTML(t("log.winner"))}">✓</span>` : ""}${escapeHTML(seatName(entry.seat))}</b>
        <span>${escapeHTML(label)}</span>
      </div>
      <div class="trick-cards">${trickCardsMarkup(entry, showTiles, isWinner)}</div>
    </section>`;
  }).join("")}</div>`;
}

let pendingTrickFinish = null;
let trickResultGate = false;
let lastResultKey = "";

/* The final trick summary is shown only after every seat has shown or stayed hidden. */
function showTrickResult(record) {
  if (!record) return;
  const key = `${record.round}:${record.trick}`;
  if (lastResultKey === key) return;
  lastResultKey = key;
  const body = $("#trickResultBody");
  if (body) {
    body.innerHTML = `${trickCompareMarkup(record.entries || [], record.winner)}
      <div class="pile-why">
        <b>${escapeHTML(t("lastTrick.winner", { seat: seatName(record.winner), combo: comboSummary(record.combo), n: record.captured }))}</b>
        <p>${escapeHTML(t(record.chuan ? "log.chuanWhy" : "log.why"))}</p>
      </div>`;
  }
  const modal = $("#trickResultModal");
  if (modal) modal.hidden = false;
  audio?.play(record.winner === MY_SEAT ? "win" : "lose", 0);
}

function closeTrickResult() {
  closeModal("trickResultModal");
  const next = pendingTrickFinish;
  pendingTrickFinish = null;
  trickResultGate = false;
  if (next) setTimeout(next, 200);
}

function applyShowdown(seat, shown) {
  if (!state || state.phase !== "showdown") return false;
  const entry = state.center.find((item) => item.seat === seat);
  if (!entry) return false;
  entry.revealed = shown;
  if (shown && showdownCanBeat(seat)) state.best = { seat, combo: entry.combo };
  state.log.push({
    kind: shown ? "challenge" : "hidden",
    trick: state.trick,
    seat,
    combo: entry.combo ? clone(entry.combo) : null,
    revealed: shown
  });
  audio?.play(shown ? "flip" : "clack", seat);
  state.showdownQueue.shift();
  renderAll();
  saveMatch();
  if (scene) scene.sync(state);
  if (state.showdownQueue.length) advanceShowdown();
  else resolveTrick();
  return true;
}

function showdown(seat, reveal) {
  if (!state || state.phase !== "showdown" || state.turn !== seat) return false;
  const entry = state.center.find((item) => item.seat === seat);
  if (!entry) return false;
  const shown = Boolean(reveal && showdownCanShow(seat));
  if (!shown && !state.best) return false;
  return applyShowdown(seat, shown);
}

function resolveTrick() {
  if (!state || !state.best) return;
  state.phase = "resolving";
  const winner = state.best.seat;
  const winningCombo = state.best.combo;
  const captured = state.center.reduce((sum, entry) => sum + entry.tiles.length, 0);
  const chuan = state.center.some((entry) => entry.chuan);
  const allTiles = state.center.flatMap((entry) => entry.tiles);
  const captureFlags = state.center.flatMap((entry) => entry.tiles.map(() => !entry.revealed));
  const captureFrom = state.center.flatMap((entry) => entry.tiles.map(() => entry.seat));
  const captureTrick = state.center.flatMap((entry) => entry.tiles.map(() => state.trick));
  const localEntry = state.center.find((entry) => entry.seat === MY_SEAT);
  state.captures[winner].push(...allTiles);
  state.captureHidden[winner].push(...captureFlags);
  state.captureFrom[winner].push(...captureFrom);
  state.captureTrick[winner].push(...captureTrick);
  state.trickArchive = state.trickArchive || [];
  const record = {
    round: state.round,
    trick: state.trick,
    leader: state.lead?.seat ?? null,
    call: state.lead?.combo ? { type: state.lead.combo.type, count: state.lead.combo.count } : null,
    winner,
    combo: clone(winningCombo),
    captured,
    chuan,
    entries: state.center.map((entry) => ({
      seat: entry.seat,
      revealed: Boolean(entry.revealed),
      combo: entry.combo ? clone(entry.combo) : null,
      tiles: entry.tiles.map((tile) => ({
        id: tile.id, hanzi: tile.hanzi, color: tile.color, rank: tile.rank, power: tile.power
      }))
    }))
  };
  state.trickArchive.push(record);
  if (state.trickArchive.length > 400) state.trickArchive.splice(0, state.trickArchive.length - 400);
  state.lastTrick = {
    winner,
    combo: clone(winningCombo),
    chuan,
    entries: state.center.map((entry) => ({
      seat: entry.seat,
      revealed: entry.revealed,
      combo: entry.combo ? clone(entry.combo) : null
    })),
    humanSeat: MY_SEAT,
    humanWon: winner === MY_SEAT,
    humanRevealed: Boolean(localEntry?.revealed),
    humanCombo: localEntry?.combo ? clone(localEntry.combo) : null,
    humanTiles: localEntry ? localEntry.tiles.map((tile) => tile.id) : [],
    captured
  };
  state.log.push({ kind: "win", trick: state.trick, seat: winner, combo: clone(winningCombo), count: captured, human: winner === MY_SEAT });
  state.center = [];
  state.selected = [];
  state.handCounts = handCounts();
  state.leader = winner;
  updateUndoButton();
  renderAll();
  saveMatch();

  if (scene) scene.collect(state, winner, allTiles);
  audio?.play(winner === MY_SEAT ? "win" : "sweep", winner);
  const comparison = state.lastTrick.entries.map((entry) => (
    `${seatName(entry.seat)}: ${entry.revealed && entry.combo ? comboSummary(entry.combo) : t("showdown.hidden")}`
  )).join(" · ");
  showResult(t(chuan ? "toast.trickResultChuan" : "toast.trickResult", {
    winner: seatName(winner),
    combo: comboSummary(winningCombo),
    entries: comparison
  }));

  if (!isClient()) {
    showTrickResult(record);
    trickResultGate = !isNetworked();
  }

  const finish = () => {
    if (!state || state.phase !== "resolving") return;
    if (state.hands.every((hand) => hand.length === 0)) {
      endRound();
    } else {
      state.leader = winner;
      beginTrick();
    }
  };
  if (trickResultGate) pendingTrickFinish = finish;
  else setTimeout(finish, state.fast ? 5 : 1250);
}

function endRound() {
  if (!state) return;
  closeModal("trickResultModal");
  pendingTrickFinish = null;
  trickResultGate = false;
  clearTimeout(actionTimer);
  const piles = state.captures.map((pile) => scoredPilesFromTiles(pile));
  const multiplier = state.multiplier || 1;
  const points = state.mode === "bid" && state.bids?.every((value) => Number.isInteger(value))
    ? piles.map((count, seat) => {
      const bid = state.bids[seat];
      const base = count === bid ? bid + (bid === 0 ? 3 : 5) : -(Math.abs(count - bid));
      return base * multiplier;
    })
    : piles.map((count) => scorePiles(count) * multiplier);
  state.roundPoints = points;
  state.scores = state.scores.map((score, index) => score + points[index]);
  state.phase = "roundEnd";
  state.handCounts = [0, 0, 0, 0];

  const localPoints = points[MY_SEAT];
  stats.rounds += 1;
  stats.currentStreak = localPoints > 0 ? stats.currentStreak + 1 : 0;
  stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak);
  stats.lastPlayed = nowISO();
  stats.history.unshift({
    at: nowISO(),
    round: state.round,
    points: points.slice(),
    scores: state.scores.slice(),
    piles: piles.slice(),
    human: localPoints
  });
  stats.history = stats.history.slice(0, 40);

  state.history.unshift({
    round: state.round,
    points: points.slice(),
    scores: state.scores.slice(),
    piles: piles.slice(),
    chuan: piles.some((count) => count >= 8)
  });
  state.history = state.history.slice(0, 20);

  state.lastRound = { piles, points, scores: state.scores.slice(), chuan: piles.some((count) => count >= 8) };

  const finished = state.scores.some((score) => score >= state.target);
  if (finished) {
    const top = Math.max(...state.scores);
    const leaders = state.scores.map((score, index) => score === top ? index : -1).filter((index) => index >= 0);
    state.winner = leaders.length === 1 ? leaders[0] : -1;
    state.phase = "matchEnd";
    stats.matches += 1;
    if (state.winner === MY_SEAT) stats.wins += 1;
    else if (state.winner === -1) stats.draws += 1;
    else stats.losses += 1;
  }

  saveStats();
  saveMatch();
  renderAll();
  updateUndoButton();
  if (scene) scene.sync(state);
  audio?.play(state.winner === MY_SEAT || (state.phase === "roundEnd" && localPoints > 0) ? "win" : "lose", 0);
  showRoundSummary(finished);
  if (state.phase === "matchEnd") toast(t("summary.match"), "gold");
}

function undoLastTrick() {
  if (isClient()) {
    toast(t("net.hostOnly"));
    return false;
  }
  pendingTrickFinish = null;
  trickResultGate = false;
  lastResultKey = "";
  closeModal("trickResultModal");
  if (!state || !state.snapshot) {
    toast(t("toast.noUndo"));
    return false;
  }
  const snapshot = state.snapshot;
  state = { ...snapshot.game, fast: state.fast };
  state.hands = state.hands.map((hand) => hand.map((id) => TILE_BY_ID[id]).filter(Boolean));
  state.captures = (state.captures || []).map((pile) => pile.map((id) => TILE_BY_ID[id]).filter(Boolean));
  state.center = [];
  state.lead = null;
  state.best = null;
  state.selected = [];
  state.lastTrick = null;
  state.phase = "lead";
  state.turn = state.leader;
  state.snapshot = null;
  state.hiddenTags = snapshot.hiddenTags || state.hands.map((hand, seat) => {
    const tags = {};
    hand.forEach((tile, index) => { tags[tile.id] = `${GHOST_PREFIX}${seat}-${index}`; });
    return tags;
  });
  stats = clone(snapshot.stats);
  saveStats();
  hideAllModals();
  updateUndoButton();
  renderAll();
  if (scene) scene.sync(state);
  beginTrick();
  toast(t("toast.undone"), "jade");
  audio?.play("undo", 0);
  return true;
}

function aiLead(seat) {
  if (!state || state.phase !== "lead" || state.turn !== seat) return;
  const hand = state.hands[seat];
  const combo = chooseLead(hand);
  if (!combo) return;
  leadTrick(seat, combo.tiles.map((tile) => tile.id));
}

function aiShowdown(seat) {
  if (!state || state.phase !== "showdown" || state.turn !== seat) return;
  showdown(seat, showdownCanBeat(seat));
}

function aiFollow(seat) {
  if (!state || state.phase !== "follow" || state.turn !== seat || !state.lead) return;
  const decision = chooseFollow(state.hands[seat], state.lead.combo, state.lead.combo, {
    playsLeft: 4 - state.center.length,
    deterministic: false
  });
  submitPlay(seat, decision.tiles.map((tile) => tile.id), false);
}

/* --------------------------------------------------------------------------
   8. Human actions and coaching
   -------------------------------------------------------------------------- */

function humanLead() {
  if (!state || state.phase !== "lead" || state.turn !== MY_SEAT) return;
  const tiles = selectedTiles();
  const combo = detectCombo(tiles);
  if (!combo) {
    toast(t("coach.invalidLead"), "wine");
    return;
  }
  if (isClient()) {
    if (sendNetAction("lead", tiles.map((tile) => tile.id), false)) {
      state.selected = [];
      renderAll();
      scene?.setSelected([]);
    }
    return;
  }
  if (leadTrick(MY_SEAT, tiles.map((tile) => tile.id))) {
    audio?.play("clack", MY_SEAT);
    coachTick();
  }
}

function humanFollow(reveal) {
  if (!state) return;
  if (state.phase === "showdown") {
    if (state.turn !== MY_SEAT) return;
    if (isClient()) {
      sendNetAction("show", [], Boolean(reveal));
      return;
    }
    showdown(MY_SEAT, Boolean(reveal));
    return;
  }
  if (state.phase !== "follow" || state.turn !== MY_SEAT || !state.lead) return;
  const tiles = selectedTiles();
  if (tiles.length !== state.lead.combo.count) {
    toast(t("coach.selectMore", { n: state.lead.combo.count, m: tiles.length }), "wine");
    return;
  }
  if (isClient()) {
    if (sendNetAction("follow", tiles.map((tile) => tile.id), false)) {
      state.selected = [];
      renderAll();
      scene?.setSelected([]);
    }
    return;
  }
  submitPlay(MY_SEAT, tiles.map((tile) => tile.id), false);
}

function selectedTiles() {
  if (!state) return [];
  return state.selected.map((id) => state.hands[MY_SEAT].find((tile) => tile.id === id)).filter(Boolean);
}

function toggleTile(id, options = {}) {
  if (!state) return;
  if (isClient() && !["lead", "follow"].includes(state.phase)) return;
  if (!["lead", "follow"].includes(state.phase) || state.turn !== MY_SEAT) return;
  if (!state.hands[MY_SEAT].some((tile) => tile.id === id)) return;
  const index = state.selected.indexOf(id);
  if (index >= 0) state.selected.splice(index, 1);
  else {
    const limit = state.phase === "follow" && state.lead ? state.lead.combo.count : 6;
    if (state.selected.length >= limit) {
      if (options.replace) state.selected = [id];
      else toast(t("dock.selected", { n: limit }));
    } else {
      state.selected.push(id);
    }
  }
  if (prefs.sound) audio?.play("click", 0);
  expandDock();
  renderAll();
  if (scene) scene.setSelected(state.selected);
}

function clearSelection() {
  if (!state) return;
  state.selected = [];
  renderAll();
  if (scene) scene.setSelected([]);
  audio?.play("click", 0);
}

function applyHint() {
  if (!state || !["lead", "follow"].includes(state.phase) || state.turn !== MY_SEAT) return;
  if (state.phase === "lead") {
    const combo = chooseLead(state.hands[MY_SEAT], { jitter: false });
    if (!combo) return;
    state.selected = combo.tiles.map((tile) => tile.id);
    toast(t("toast.hint"), "jade");
  } else {
    const recommendation = recommendedFollow(state.hands[MY_SEAT], state.lead.combo, state.lead.combo);
    if (recommendation.kind === "beat") {
      state.selected = recommendation.combo.tiles.map((tile) => tile.id);
    } else {
      state.selected = recommendation.tiles.map((tile) => tile.id);
    }
    toast(t("toast.hint"), "jade");
  }
  renderAll();
  if (scene) scene.setSelected(state.selected);
  coachTick();
}

function coachTick() {
  if (!state) return;
  const text = $("#coachText");
  const meta = $("#coachMeta");
  if (!text || !meta) return;
  text.textContent = coachMessage();
  meta.textContent = coachMeta();
}

function coachWhy(combo) {
  if (!combo) return "";
  if (combo.type === "single") {
    if (combo.score[0] === 7) return t("coach.whyGeneral");
    return t("coach.whySingle");
  }
  if (combo.type === "pair") return t("coach.whyPair");
  if (["triple", "quad", "quint"].includes(combo.type)) return t("coach.whySet");
  return t("coach.whyStraight", { type: comboName(combo.type) });
}

function coachMessage() {
  if (!state) return t("coach.welcome");
  if (state.phase === "dealing") return t("coach.dealing");
  if (state.phase === "resolving") {
    return t("coach.trickWon", { combo: comboSummary(state.best?.combo), piles: scoredPilesFromTiles(state.captures[MY_SEAT]) });
  }
  if (state.phase === "roundEnd") {
    return t("coach.roundEnd", { points: state.roundPoints[MY_SEAT], score: state.scores[MY_SEAT] });
  }
  if (state.phase === "matchEnd") {
    const winner = state.winner === MY_SEAT ? t("summary.win") : state.winner === -1 ? t("summary.draw") : t("summary.lose", { seat: seatName(state.winner) });
    return `${winner} ${t("coach.rematch")}`;
  }

  const localHand = state.hands[MY_SEAT];
  const left = localHand.length;
  if (left === 0) return t("coach.roundEnd", { points: state.roundPoints[MY_SEAT], score: state.scores[MY_SEAT] });

  if (state.phase === "lead" && state.turn === MY_SEAT) {
    const selected = detectCombo(selectedTiles());
    if (selected) return t("coach.followReady", { combo: comboSummary(selected), best: t("dock.leadTitle"), tiles: selected.count * 4 });
    if (state.selected.length) return t("coach.invalidLead");
    const combo = chooseLead(localHand, { jitter: false });
    return t("coach.hintLead", { combo: comboSummary(combo), why: coachWhy(combo) });
  }

  if (state.phase === "lead" && state.turn !== MY_SEAT) {
    return t("coach.aiLead", { seat: seatName(state.turn) });
  }

  if (state.phase === "showdown") {
    return state.turn === MY_SEAT
      ? t("coach.showdownYou")
      : t("coach.showdownWait", { seat: seatName(state.turn) });
  }
  if (state.phase === "follow") {
    const lead = state.lead;
    if (!lead) return t("coach.welcome");
    const call = `${comboName(lead.combo.type)} ×${lead.combo.count}`;
    if (state.turn !== MY_SEAT) {
      return t("coach.follow", { seat: seatName(state.turn), combo: call, n: lead.combo.count });
    }
    const needed = lead.combo.count;
    const selected = selectedTiles();
    const combo = detectCombo(selected);
    if (selected.length !== needed) {
      return t("coach.selectMore", { n: needed, m: selected.length });
    }
    if (!combo || combo.type !== lead.combo.type) {
      return t("coach.followNoCombo", { type: comboName(lead.combo.type), n: needed });
    }
    return t("coach.followHidden", { n: needed });
  }
  return t("coach.welcome");
}

function coachMeta() {
  if (!state) return "";
  const counts = state.hands.map((hand) => hand.length);
  const left = counts[MY_SEAT];
  const pieces = [`${t("coach.tilesLeft", { n: left })}`];
  if (state.phase === "follow" && state.lead) {
    pieces.push(`${t("hud.trick")} ${state.trick} · ${comboName(state.lead.combo.type)} ×${state.lead.combo.count}`);
    pieces.push(t("coach.allHidden"));
  } else if (state.phase === "lead" && state.turn === MY_SEAT) {
    pieces.push(t("coach.youLead"));
  } else if (state.phase === "lead") {
    pieces.push(t("coach.otherLead", { seat: seatName(state.turn) }));
  }
  if (left <= 3 && left > 0) pieces.push(t("coach.lastTrick"));
  return pieces.join(" · ");
}

/* --------------------------------------------------------------------------
   9. Toasts and summaries
   -------------------------------------------------------------------------- */

function toast(message, tone = "") {
  const layer = $("#toastLayer");
  if (!layer) return;
  const node = document.createElement("div");
  node.className = `toast ${tone}`.trim();
  node.textContent = message;
  layer.appendChild(node);
  setTimeout(() => {
    node.classList.add("out");
    setTimeout(() => node.remove(), 240);
  }, 2600);
}

function hideAllModals() {
  $$(".modal").forEach((modal) => { modal.hidden = true; });
}

function openModal(id) {
  hideAllModals();
  const modal = $(`#${id}`);
  if (modal) modal.hidden = false;
}

function closeModal(id) {
  const modal = $(`#${id}`);
  if (modal) modal.hidden = true;
  if (id === "summaryModal") stopParty();
}

let threeLib = null;
let party = null;
let summaryTimer = null;

function stopParty() {
  if (!party) return;
  cancelAnimationFrame(party.raf);
  try { party.renderer.dispose(); } catch { /* ignore */ }
  party = null;
}

function startParty() {
  const canvas = $("#partyCanvas");
  if (!canvas || !threeLib) return;
  stopParty();
  const THREE = threeLib;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    toast(t("toast.boardLost"), "wine");
  });
  canvas.addEventListener("webglcontextrestored", () => {
    resize();
    if (currentState) sync(currentState);
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  const width = canvas.clientWidth || 560;
  const height = canvas.clientHeight || 150;
  renderer.setSize(width, height, false);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 20);
  camera.position.set(0, 1.5, 4.1);
  camera.lookAt(0, 0.75, 0);
  scene.add(new THREE.HemisphereLight(0xfff2d8, 0x40202a, 2.1));
  const key = new THREE.DirectionalLight(0xffe3b0, 2.2);
  key.position.set(2.4, 4, 3);
  scene.add(key);

  const make = (color, x) => {
    const group = new THREE.Group();
    group.position.x = x;
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.05 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 18), mat);
    body.position.y = 0.35;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 24, 18), mat);
    head.position.y = 0.82;
    group.add(body, head);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1b1414 });
    [-0.08, 0.08].forEach((dx) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), eyeMat);
      eye.position.set(dx, 0.86, 0.2);
      group.add(eye);
    });
    return { group, head };
  };

  const rabbit = make(0xf7f2ea, -1.15);
  [-0.09, 0.09].forEach((dx) => {
    const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.07, 0.42, 12), new THREE.MeshStandardMaterial({ color: 0xf7f2ea, roughness: 0.6 }));
    ear.position.set(dx, 1.2, 0);
    rabbit.group.add(ear);
  });
  const hippo = make(0x9b86c9, 0);
  const snout = new THREE.Mesh(new THREE.SphereGeometry(0.17, 18, 14), new THREE.MeshStandardMaterial({ color: 0xb6a3dc, roughness: 0.6 }));
  snout.position.set(0, 0.74, 0.19);
  hippo.group.add(snout);

  const parrot = make(0x58b88a, 1.15);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.16, 10), new THREE.MeshStandardMaterial({ color: 0xe8a13a, roughness: 0.5 }));
  beak.rotation.x = Math.PI / 2;
  beak.position.set(0, 0.78, 0.24);
  parrot.group.add(beak);
  [-1, 1].forEach((side) => {
    const wing = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 10), new THREE.MeshStandardMaterial({ color: 0x3f8f72, roughness: 0.6 }));
    wing.scale.set(0.45, 0.9, 0.3);
    wing.position.set(side * 0.27, 0.42, 0);
    parrot.group.add(wing);
  });
  const chars = [rabbit, hippo, parrot];
  chars.forEach((char) => scene.add(char.group));
  chars.forEach((char) => { char.group.rotation.y = 0.35; });

  const start = performance.now();
  const frame = (now) => {
    if (!party) return;
    const t = (now - start) / 1000;
    const active = Math.floor(t / 1.4) % chars.length;
    chars.forEach((char, index) => {
      const isActive = index === active;
      const bounce = isActive ? Math.abs(Math.sin(t * 7)) * 0.22 : Math.sin(t * 2.2 + index) * 0.05;
      char.group.position.y = bounce;
      char.group.rotation.y = 0.35 + Math.sin(t * (isActive ? 4 : 1.6) + index) * 0.35;
      char.group.scale.setScalar(isActive ? 1.12 : 1);
    });
    renderer.render(scene, camera);
    party.raf = requestAnimationFrame(frame);
  };
  party = { renderer, raf: requestAnimationFrame(frame), scene };
}

function startSummaryCountdown() {
  clearInterval(summaryTimer);
  const primary = $("#summaryPrimary");
  if (!primary) return;
  if (isClient() || !state || state.phase !== "roundEnd" || prefs.autoNext === false) {
    primary.textContent = t("summary.next");
    return;
  }
  let left = 30;
  const tick = () => {
    if (!state || state.phase !== "roundEnd") { clearInterval(summaryTimer); return; }
    primary.textContent = t("summary.nextIn", { n: left });
    if (left <= 0) {
      clearInterval(summaryTimer);
      closeModal("summaryModal");
      startNextRound();
      return;
    }
    left -= 1;
  };
  tick();
  summaryTimer = setInterval(tick, 1000);
}

function showRoundSummary(matchEnded) {
  const modal = $("#summaryModal");
  if (!modal || !state) return;
  const isMatch = Boolean(matchEnded || state.phase === "matchEnd");
  $("#summaryTitle").textContent = isMatch ? t("summary.congrats") : t("summary.round", { n: state.round });
  const scoreRows = SEATS.map((seat) => `
    <tr>
      <td>${escapeHTML(seatName(seat.id))}${seat.id === MY_SEAT ? " ★" : ""}${isBotSeat(seat.id) ? ` <span class="mini-tag">${escapeHTML(t("net.botBadge"))}</span>` : ""}</td>
      <td class="num">${state.lastRound?.piles?.[seat.id] ?? 0}</td>
      <td class="num">${state.lastRound?.points?.[seat.id] ?? 0}</td>
      <td class="num">${state.scores[seat.id]}</td>
    </tr>`).join("");
  const chuan = state.lastRound?.chuan ? `<div class="summary-note">${escapeHTML(t("summary.chuan"))} — 16 ${escapeHTML(t("summary.points"))}.</div>` : "";
  const winnerLine = isMatch
    ? `<div class="summary-note">${escapeHTML(state.winner === MY_SEAT ? t("summary.win") : state.winner === -1 ? t("summary.draw") : t("summary.lose", { seat: seatName(state.winner) }))}</div>`
    : "";
  $("#summaryBody").innerHTML = `
    <div class="summary-hero"><strong>${state.lastRound?.points?.[MY_SEAT] ?? 0}</strong><span>${escapeHTML(t("summary.roundPoints"))} · ${escapeHTML(seatName(MY_SEAT))}</span></div>
    <table class="summary-table">
      <thead><tr><th>${escapeHTML(t("score.title"))}</th><th class="num">${escapeHTML(t("summary.piles"))}</th><th class="num">${escapeHTML(t("summary.points"))}</th><th class="num">${escapeHTML(t("summary.total"))}</th></tr></thead>
      <tbody>${scoreRows}</tbody>
    </table>
    ${chuan}
    ${winnerLine}
    ${isClient() ? `<div class="summary-note">${escapeHTML(t("summary.waitingHost"))}</div>` : ""}
    <div class="summary-note">${escapeHTML(t("summary.note"))}</div>
    <div class="summary-note">${escapeHTML(t("summary.streak", { n: stats.currentStreak }))} · ${escapeHTML(t("summary.targetReached", { target: state.target }))}</div>
    <div class="summary-log-row"><button id="summaryLogBtn" class="btn btn-ghost btn-small" type="button">${escapeHTML(t("summary.viewLog"))}</button></div>`;
  const primary = $("#summaryPrimary");
  const secondary = $("#summarySecondary");
  primary.textContent = isClient() ? t("net.resume") : isMatch ? t("summary.newMatch") : t("summary.next");
  primary.dataset.action = isClient() ? "close" : isMatch ? "new" : "next";
  secondary.hidden = isClient() || !isMatch;
  if (!isClient() && isMatch) {
    secondary.textContent = t("actions.export");
    secondary.dataset.action = "export";
  }
  const autoWrap = $("#summaryAutoWrap");
  if (autoWrap) autoWrap.hidden = isClient() || isMatch;
  const autoCheck = $("#summaryAutoNext");
  if (autoCheck) autoCheck.checked = prefs.autoNext !== false;
  modal.hidden = false;
  requestAnimationFrame(startParty);
  audio?.play("celebrate", 0);
  startSummaryCountdown();
}

function buildUndoExplanation() {
  if (!state || !state.lastTrick) return t("undo.noTrick");
  const trick = state.lastTrick;
  const winnerCombo = trick.combo;
  const humanCombo = trick.humanCombo;
  const winner = seatName(trick.winner);
  const youPlayed = humanCombo ? comboSummary(humanCombo) : t("undo.faceDown");
  const winnerPlayed = winnerCombo ? comboSummary(winnerCombo) : "—";
  let why = t("undo.whyUnknown");
  if (trick.chuan) why = t("undo.whyChuan");
  else if (!trick.humanRevealed) why = t("undo.whyHidden");
  else if (humanCombo && winnerCombo) {
    if (humanCombo.type !== winnerCombo.type) why = t("undo.whyType");
    else if (["seehoo"].includes(winnerCombo.type)) why = t("undo.whyPair", { winning: winnerPlayed });
    else if (["ngohoo", "lakhoo"].includes(winnerCombo.type)) why = t("undo.whySet", { winning: winnerPlayed });
    else {
      const hs = humanCombo.score;
      const ws = winnerCombo.score;
      if (hs[0] !== ws[0]) why = t("undo.whyRank", { losing: youPlayed, winning: winnerPlayed });
      else if ((hs[1] ?? 0) !== (ws[1] ?? 0)) why = t("undo.whyColor", { winning: winnerPlayed });
      else why = t("undo.whyTie");
    }
  }
  const ranks = RANKS.slice().reverse().map((rank) => `<span>${rank.power} ${escapeHTML(LANG === "th" ? rank.th : rank.en)}</span>`).join("");
  return `
    <p>${escapeHTML(t("undo.intro"))}</p>
    <div class="undo-compare">
      <div class="undo-side"><span>${escapeHTML(t("undo.youPlayed"))}</span><b>${escapeHTML(youPlayed)}</b><span>${trick.humanSeat === MY_SEAT ? escapeHTML(t("summary.you")) : ""}</span></div>
      <div class="undo-vs">VS</div>
      <div class="undo-side"><span>${escapeHTML(t("undo.winnerPlayed", { seat: winner }))}</span><b>${escapeHTML(winnerPlayed)}</b><span>${escapeHTML(winner)}</span></div>
    </div>
    <h3>${escapeHTML(t("undo.why"))}</h3>
    <p>${escapeHTML(why)}</p>
    <h3>${escapeHTML(t("undo.rankOrder"))}</h3>
    <div class="undo-rank">${ranks}</div>`;
}

function showUndoExplanation() {
  if (!state || !state.lastTrick) {
    toast(t("undo.noTrick"));
    return;
  }
  $("#undoBody").innerHTML = buildUndoExplanation();
  openModal("undoModal");
}

/* --------------------------------------------------------------------------
   10. Rendering
   -------------------------------------------------------------------------- */

function updateUndoButton() {
  const button = $("#undoBtn");
  if (!button) return;
  button.disabled = !(state && state.snapshot);
}

function renderAll() {
  if (!state) return;
  renderHUD();
  renderScoreboard();
  renderHandList();
  renderSelection();
  coachTick();
  renderLog();
  renderInspector();
  updateUndoButton();
  const nextRound = $("#nextRoundBtn");
  if (nextRound) nextRound.hidden = state.phase !== "roundEnd" || isClient();
  const streak = $("#streakChip");
  if (streak) streak.textContent = `×${stats.currentStreak}`;
  const target = $("#scoreTarget");
  if (target) target.textContent = state.target;
  const dock = $("#handDock");
  if (dock) dock.classList.toggle("is-turn", state.turn === MY_SEAT && ["lead", "follow"].includes(state.phase));
  renderNetChrome();
  maybePublishHandLayout();
  renderDraft();
  focusTurnIfNeeded();
  refreshHistoryModal();
}

let historyFollowLatest = true;

function refreshHistoryModal() {
  const modal = $("#lastTrickModal");
  if (!modal || modal.hidden) return;
  if (historyFollowLatest) renderLogBrowser();
  else renderLogBrowser($("#logRoundSelect")?.value, $("#logTrickSelect")?.value);
}

let lastFocusKey = "";

function resetBoardView() {
  const canvas = $("#scene");
  const gl = canvas?.getContext?.("webgl2");
  if (!scene) {
    toast(t("toast.boardUnavailable"), "wine");
    return;
  }
  if (gl?.isContextLost?.()) {
    toast(t("toast.boardReload"), "wine");
    setTimeout(() => location.reload(), 700);
    return;
  }
  scene.resetBoard?.();
  if (state) {
    renderAll();
    scene?.sync(state);
  }
  toast(t("toast.boardReset"), "jade");
}

function focusTurnIfNeeded() {
  if (!state) return;
  const key = `${state.round}:${state.trick}:${state.phase}:${state.turn}`;
  const changed = key !== lastFocusKey;
  lastFocusKey = key;
  if (!changed || state.turn !== MY_SEAT) return;
  if (!["lead", "follow", "showdown", "draft"].includes(state.phase)) return;
  const closed = [];
  const history = $("#lastTrickModal");
  if (history && !history.hidden) {
    closeModal("lastTrickModal");
    closed.push("history");
  }
  const pile = $("#pileModal");
  if (pile && !pile.hidden) {
    closeModal("pileModal");
    closed.push("pile");
  }
  const result = $("#trickResultModal");
  if (isNetworked() && result && !result.hidden) {
    closeTrickResult();
    closed.push("result");
  }
  if (closed.length) toast(t("toast.yourTurn"), "gold");
}

function renderHUD() {
  $("#roundChip").textContent = state.round;
  $("#trickChip").textContent = `${state.trick}`;
  $("#targetChip").textContent = state.target;
  const turn = $("#turnChip");
  if (state.phase === "dealing") turn.textContent = t("phase.dealing");
  else if (state.phase === "roundEnd") turn.textContent = t("phase.roundEnd");
  else if (state.phase === "matchEnd") turn.textContent = t("phase.matchEnd");
  else if (state.phase === "resolving") turn.textContent = t("phase.resolving");
  else if (state.phase === "bid") turn.textContent = t("phase.bid");
  else turn.textContent = seatName(state.turn);
  turn.dataset.seat = state.turn;
  const call = $("#callChip");
  if (call) {
    const showCall = Boolean(state.lead && ["follow", "showdown"].includes(state.phase));
    call.hidden = !showCall;
    if (showCall) call.textContent = `${t("hud.call")}: ${comboName(state.lead.combo.type)} ×${state.lead.combo.count}`;
  }
  const resultSelect = $("#resultSelect");
  if (resultSelect) {
    resultSelect.value = String(state.resultSeconds ?? prefs.resultSeconds ?? 2);
    resultSelect.disabled = isClient();
  }
  const lastTrick = $("#lastTrickBtn");
  if (lastTrick) {
    lastTrick.hidden = !state.lastTrick;
    lastTrick.textContent = t("lastTrick.button");
  }
}

function renderScoreboard() {
  const board = $("#scoreboard");
  if (!board) return;
  board.innerHTML = SEATS.map((seat) => {
    const active = ["lead", "follow", "showdown", "bid", "resolving"].includes(state.phase) && state.turn === seat.id;
    const piles = scoredPilesFromTiles(state.captures[seat.id]);
    const profile = SEAT_PROFILES?.[seat.id];
    const tag = isBotSeat(seat.id) ? `<span class="seat-tag bot">${escapeHTML(t("net.botBadge"))}</span>`
      : profile?.kind === "host" ? `<span class="seat-tag host">${escapeHTML(t("net.hostBadge"))}</span>`
      : profile?.kind === "human" ? `<span class="seat-tag guest">${escapeHTML(t("net.guestBadge"))}</span>` : "";
    return `<div class="score-row ${active ? "active" : ""} ${seat.id === MY_SEAT ? "you" : ""} ${profile?.connected === false ? "offline" : ""} ${speakingSeats.has(seat.id) ? "speaking" : ""}" data-seat="${seat.id}">
      <span class="score-seat">${seat.wind}</span>
      <span class="score-name">${escapeHTML(seatName(seat.id))}${tag}</span>
      <span class="score-piles">${piles} ${escapeHTML(piles === 1 ? t("score.pile") : t("score.piles"))}</span>
      <span class="score-points">${state.scores[seat.id]}</span>
    </div>`;
  }).join("");
}

function renderHandList() {
  const list = $("#tileList");
  if (!list) return;
  const hand = state.hands[MY_SEAT];
  if (!hand.length) {
    list.innerHTML = `<span class="tile-list-empty">${escapeHTML(t("handList.empty"))}</span>`;
    return;
  }
  const order = hand.slice().sort((a, b) => b.power - a.power || (a.color === "r" ? -1 : 1));
  list.innerHTML = order.map((tile) => {
    const selected = state.selected.includes(tile.id);
    return `<button type="button" class="tile-chip ${selected ? "selected" : ""} ${tile.color === "r" ? "red" : "black"}" data-tile-id="${tile.id}" aria-pressed="${selected}" title="${escapeHTML(comboSummary(detectCombo([tile])))}">
      <b>${tile.hanzi}</b><span>${escapeHTML(tileName(tile))}</span>
    </button>`;
  }).join("");
  list.querySelectorAll("[data-tile-id]").forEach((button) => {
    button.addEventListener("click", () => toggleTile(button.dataset.tileId));
    button.addEventListener("mouseenter", () => inspectTile(button.dataset.tileId));
  });
}

function renderSelection() {
  const kicker = $("#selectionKicker");
  const title = $("#selectionTitle");
  const detail = $("#selectionDetail");
  const pips = $("#selectionPips");
  const leadBtn = $("#leadBtn");
  const revealBtn = $("#revealBtn");
  const facedownBtn = $("#facedownBtn");
  const hintBtn = $("#hintBtn");
  const clearBtn = $("#clearBtn");
  const tidyBtn = $("#tidyHandBtn");
  if (tidyBtn) tidyBtn.hidden = !scene?.hasCustomHand?.();
  const redrawBtn = $("#redrawBtn");
  if (redrawBtn) redrawBtn.hidden = !canRedraw(MY_SEAT);
  const chuanBtn = $("#chuanBtn");
  if (chuanBtn) chuanBtn.hidden = !canClaimChuan(MY_SEAT);
  const bidRow = $("#bidRow");
  if (bidRow) bidRow.hidden = true;
  if (!title) return;

  if (state.phase === "bid") {
    const humanBidTurn = state.turn === MY_SEAT;
    const forbidden = humanBidTurn && state.bidTurn === 3 ? bidForbidden() : null;
    kicker.textContent = t("bid.kicker");
    title.textContent = humanBidTurn ? t("bid.title") : t("bid.waiting", { seat: seatName(state.turn) });
    detail.textContent = t("bid.help", { total: bidSum() });
    pips.innerHTML = "";
    leadBtn.hidden = true;
    revealBtn.hidden = true;
    facedownBtn.hidden = true;
    hintBtn.disabled = true;
    clearBtn.disabled = true;
    if (bidRow) {
      bidRow.hidden = !humanBidTurn;
      if (humanBidTurn) {
        bidRow.innerHTML = Array.from({ length: 9 }, (_, value) => (
          `<button class="bid-btn" type="button" data-bid="${value}" ${value === forbidden ? "disabled" : ""}>${value}</button>`
        )).join("");
      }
    }
    return;
  }

  const humanTurn = state.turn === MY_SEAT && ["lead", "follow", "showdown", "bid"].includes(state.phase);
  hintBtn.disabled = !humanTurn;
  clearBtn.disabled = !state.selected.length;

  if (state.phase === "dealing") {
    kicker.textContent = t("phase.dealing");
    title.textContent = t("coach.dealing");
    detail.textContent = "";
    pips.innerHTML = "";
    leadBtn.hidden = false;
    leadBtn.disabled = true;
    leadBtn.textContent = t("actions.lead");
    revealBtn.hidden = true;
    facedownBtn.hidden = true;
    return;
  }

  if (state.phase === "roundEnd" || state.phase === "matchEnd") {
    kicker.textContent = t("phase.roundEnd");
    title.textContent = state.phase === "matchEnd" ? t("summary.match") : t("summary.round", { n: state.round });
    detail.textContent = t("summary.note");
    pips.innerHTML = "";
    leadBtn.hidden = false;
    leadBtn.disabled = true;
    leadBtn.textContent = t("actions.lead");
    revealBtn.hidden = true;
    facedownBtn.hidden = true;
    return;
  }

  if (state.phase === "resolving") {
    kicker.textContent = t("phase.resolving");
    title.textContent = comboSummary(state.best?.combo);
    detail.textContent = t("phase.resolving");
    pips.innerHTML = "";
    leadBtn.hidden = false;
    leadBtn.disabled = true;
    revealBtn.hidden = true;
    facedownBtn.hidden = true;
    return;
  }

  if (state.phase === "showdown") {
    const leaderTurn = humanTurn && !state.best;
    const canShow = humanTurn && showdownCanShow(MY_SEAT);
    const canBeat = humanTurn && showdownCanBeat(MY_SEAT);
    const entry = state.center.find((item) => item.seat === MY_SEAT);
    kicker.textContent = t("dock.showdown");
    title.textContent = humanTurn
      ? (leaderTurn ? t("dock.showdownFirst") : canShow ? t("dock.showdownTitle") : t("dock.showdownNoBeat"))
      : t("dock.waiting", { seat: seatName(state.turn) });
    detail.textContent = leaderTurn
      ? t("dock.showdownFirstHelp")
      : !canShow
        ? t("dock.showdownWait")
        : canBeat && entry?.combo && state.best
          ? `${t("dock.showdownCan", { combo: comboSummary(entry.combo), best: comboSummary(state.best.combo) })} ${t("dock.showdownDouble")}`
          : `${t("dock.showdownLose", { combo: comboSummary(entry?.combo), best: comboSummary(state.best?.combo) })} ${t("dock.showdownDouble")}`;
    pips.innerHTML = "";
    leadBtn.hidden = true;
    revealBtn.hidden = !humanTurn;
    revealBtn.disabled = !canShow;
    revealBtn.textContent = leaderTurn ? t("actions.showFirst") : t("actions.showSet");
    facedownBtn.hidden = !humanTurn;
    facedownBtn.disabled = !humanTurn || leaderTurn;
    facedownBtn.textContent = t("actions.keepHidden");
    return;
  }

  if (!humanTurn) {
    kicker.textContent = t("phase.follow");
    title.textContent = t("dock.waiting", { seat: seatName(state.turn) });
    detail.textContent = coachMeta();
    pips.innerHTML = "";
    leadBtn.hidden = false;
    leadBtn.disabled = true;
    leadBtn.textContent = t("actions.lead");
    revealBtn.hidden = true;
    facedownBtn.hidden = true;
    return;
  }

  if (state.phase === "lead") {
    const selected = selectedTiles();
    const combo = detectCombo(selected);
    kicker.textContent = t("dock.select");
    title.textContent = combo ? comboSummary(combo) : t("dock.leadTitle");
    detail.textContent = combo
      ? t("dock.leadReady", { combo: comboName(combo.type), n: selected.length })
      : (selected.length ? t("coach.invalidLead") : t("dock.leadHelp"));
    leadBtn.hidden = false;
    leadBtn.disabled = !combo;
    leadBtn.textContent = combo ? `${t("actions.lead")} ${comboName(combo.type)}` : t("actions.lead");
    revealBtn.hidden = true;
    facedownBtn.hidden = true;
    pips.innerHTML = [0, 1, 2, 3, 4, 5].map((index) => `<i class="${index < selected.length ? "on" : ""}"></i>`).join("");
    return;
  }

  if (state.phase === "follow" && state.lead) {
    const needed = state.lead.combo.count;
    const selected = selectedTiles();
    kicker.textContent = t("dock.select");
    title.textContent = t("dock.followTitle", { seat: seatName(state.lead.seat), combo: `${comboName(state.lead.combo.type)} ×${state.lead.combo.count}` });
    detail.textContent = canClaimChuan(MY_SEAT)
      ? t("dock.chuanReady")
      : selected.length !== needed
        ? t("dock.followHelp", { n: needed, type: comboName(state.lead.combo.type) })
        : t("dock.followHidden", { n: needed });
    leadBtn.hidden = true;
    revealBtn.hidden = true;
    facedownBtn.hidden = false;
    facedownBtn.disabled = selected.length !== needed;
    facedownBtn.textContent = t("actions.sendHidden");
    pips.innerHTML = Array.from({ length: needed }, (_, index) => `<i class="${index < selected.length ? "on" : ""}"></i>`).join("");
  }
}

let tileTipTimer = null;

function positionTileTip(x, y) {
  const tip = $("#tileTip");
  if (!tip || tip.hidden) return;
  const pad = 10;
  const rect = tip.getBoundingClientRect();
  let left = (x ?? window.innerWidth / 2) + 14;
  let top = (y ?? 100) + 14;
  if (left + rect.width > window.innerWidth - pad) left = (x ?? window.innerWidth / 2) - rect.width - 14;
  if (top + rect.height > window.innerHeight - pad) top = (y ?? 100) - rect.height - 14;
  tip.style.left = `${Math.max(pad, left)}px`;
  tip.style.top = `${Math.max(pad, top)}px`;
}

function showTileTip(id, options = {}) {
  const tip = $("#tileTip");
  if (!tip) return;
  const tile = TILE_BY_ID[id];
  if (!tile) { hideTileTip(); return; }
  const rank = RANK_BY_ID[tile.rank];
  tip.innerHTML = `
    <span class="tile-tip-medallion ${tile.color === "b" ? "black" : ""}">${tile.hanzi}</span>
    <span class="tile-tip-copy">
      <strong>${escapeHTML(tileName(tile))}</strong>
      <span>${escapeHTML(colorName(tile.color))} · ${escapeHTML(rank.en)} · ${escapeHTML(t("inspector.copies"))} ${rank.copies}</span>
      <small>${escapeHTML(rank.note[LANG])}</small>
    </span>`;
  tip.hidden = false;
  positionTileTip(options.x, options.y);
  clearTimeout(tileTipTimer);
  if (options.touch) tileTipTimer = setTimeout(hideTileTip, 4500);
}

function showHiddenTip(options = {}) {
  const tip = $("#tileTip");
  if (!tip) return;
  tip.innerHTML = `
    <span class="tile-tip-medallion">?</span>
    <span class="tile-tip-copy"><strong>${escapeHTML(t("inspector.hidden"))}</strong><span>${escapeHTML(t("inspector.hiddenNote"))}</span></span>`;
  tip.hidden = false;
  positionTileTip(options.x, options.y);
  clearTimeout(tileTipTimer);
  if (options.touch) tileTipTimer = setTimeout(hideTileTip, 4500);
}

function hideTileTip() {
  clearTimeout(tileTipTimer);
  const tip = $("#tileTip");
  if (tip) tip.hidden = true;
}

let resultTimer = null;
function showResult(text) {
  const seconds = Number(state?.resultSeconds ?? prefs.resultSeconds ?? 2);
  const banner = $("#resultBanner");
  if (!banner) return;
  clearTimeout(resultTimer);
  if (!seconds || !text) { banner.hidden = true; return; }
  banner.textContent = text;
  banner.hidden = false;
  resultTimer = setTimeout(() => { banner.hidden = true; }, seconds * 1000);
}

function renderLogRecord(record) {
  const meta = $("#lastTrickMeta");
  const list = $("#lastTrickList");
  if (!record) {
    if (meta) meta.textContent = t("log.empty");
    if (list) list.innerHTML = "";
    return;
  }
  const call = record.call ? `${comboName(record.call.type)} ×${record.call.count}` : "—";
  if (meta) {
    meta.textContent = `${t("log.round")} ${record.round} · ${t("log.trick")} ${record.trick} · ${t("log.call")}: ${call} · ${t("log.winner")}: ${seatName(record.winner)} (${comboSummary(record.combo)})${record.chuan ? ` · ${t("log.chuan")}` : ""}`;
  }
  if (list) {
    list.innerHTML = `${trickCompareMarkup(record.entries || [], record.winner)}
      <div class="pile-why">
        <b>${escapeHTML(t("lastTrick.winner", { seat: seatName(record.winner), combo: comboSummary(record.combo), n: record.captured }))}</b>
        <p>${escapeHTML(t(record.chuan ? "log.chuanWhy" : "log.why"))}</p>
      </div>`;
  }
}

function renderLogBrowser(round, trick) {
  const records = state?.trickArchive || [];
  const roundSelect = $("#logRoundSelect");
  const trickSelect = $("#logTrickSelect");
  if (!records.length) {
    renderLogRecord(null);
    if (roundSelect) roundSelect.innerHTML = "";
    if (trickSelect) trickSelect.innerHTML = "";
    return;
  }
  const rounds = [...new Set(records.map((record) => record.round))].sort((a, b) => a - b);
  const currentRound = rounds.includes(Number(round)) ? Number(round) : rounds[rounds.length - 1];
  if (roundSelect) {
    roundSelect.innerHTML = rounds.map((value) => `<option value="${value}" ${value === currentRound ? "selected" : ""}>${t("log.round")} ${value}</option>`).join("");
  }
  const inRound = records.filter((record) => record.round === currentRound);
  const currentTrick = inRound.some((record) => record.trick === Number(trick)) ? Number(trick) : inRound[inRound.length - 1].trick;
  if (trickSelect) {
    trickSelect.innerHTML = inRound.map((record) => `<option value="${record.trick}" ${record.trick === currentTrick ? "selected" : ""}>${t("log.trick")} ${record.trick}</option>`).join("");
  }
  renderLogRecord(inRound.find((record) => record.trick === currentTrick) || inRound[inRound.length - 1]);
}

function openLastTrickModal(round = null, trick = null) {
  const records = state?.trickArchive || [];
  if (!records.length) return;
  historyFollowLatest = round == null && trick == null;
  const latest = records[records.length - 1];
  renderLogBrowser(round ?? latest.round, trick ?? latest.trick);
  const modal = $("#lastTrickModal");
  if (modal) modal.hidden = false;
  audio?.play("click", 0);
}

function openPileModal(seat, pileIndex) {
  if (!state || !Number.isInteger(seat)) return;
  const pile = state.captures?.[seat] || [];
  const groups = captureGroupsFor(state, seat);
  const group = groups[Math.max(0, pileIndex)] || groups[groups.length - 1];
  const start = group?.start ?? 0;
  const tiles = group ? pile.slice(start, start + group.count) : [];
  if (!tiles.length) return;
  const hidden = state.captureHidden?.[seat] || [];
  const title = $("#pileTitle");
  const meta = $("#pileMeta");
  const body = $("#pileTiles");
  const why = $("#pileWhy");
  if (title) {
    title.innerHTML = `<span class="log-win-badge" role="img" aria-label="${escapeHTML(t("log.winner"))}">✓</span>${escapeHTML(t("pile.title", { seat: seatName(seat), n: pileIndex + 1 }))}`;
  }
  if (meta) {
    meta.hidden = true;
    meta.textContent = "";
  }
  if (why) {
    const trickNumber = state.captureTrick?.[seat]?.[start];
    const records = state.trickArchive || [];
    const record = records.slice().reverse().find((item) => item.trick === trickNumber && item.winner === seat)
      || records.slice().reverse().find((item) => item.trick === trickNumber);
    if (record) {
      const entries = (record.entries || []).map((entry) => (
        `${seatName(entry.seat)}: ${entry.revealed && entry.combo ? comboSummary(entry.combo) : t("showdown.hidden")}`
      )).join(" · ");
      why.innerHTML = `<b>${escapeHTML(t("lastTrick.winner", { seat: seatName(record.winner), combo: comboSummary(record.combo), n: record.captured }))}</b>
        <p>${escapeHTML(t(record.chuan ? "log.chuanWhy" : "log.why"))}</p>
        <small>${escapeHTML(entries)}</small>`;
      why.hidden = false;
    } else {
      why.hidden = true;
      why.innerHTML = "";
    }
  }
  if (body) {
    body.innerHTML = tiles.map((tile, index) => {
      const up = !hidden[start + index];
      if (!up) {
        const hiddenFrom = state.captureFrom?.[seat]?.[start + index];
        const hiddenFromText = Number.isInteger(hiddenFrom) ? t("pile.from", { seat: seatName(hiddenFrom) }) : "";
        const hiddenWinner = hiddenFrom === seat;
        return `<div class="pile-item back ${hiddenWinner ? "winner" : ""}">
          ${hiddenWinner ? `<span class="pile-win-big" role="img" aria-label="${escapeHTML(t("log.winner"))}">✓</span>` : ""}
          <span class="mini-tile back" role="img" aria-label="${escapeHTML(t("pile.hidden"))}">?</span>
          <b>${escapeHTML(t("showdown.hidden"))}</b>
          <span>${escapeHTML(t("pile.hidden"))}</span>
          ${hiddenFromText ? `<span class="pile-from">${escapeHTML(hiddenFromText)}</span>` : ""}
        </div>`;
      }
      const rank = RANK_BY_ID[tile.rank] || RANK_BY_POWER[tile.power];
      const reading = tileName(tile);
      const primary = LANG === "th" ? reading : rank.en;
      const secondary = LANG === "th" ? `${rank.en} · ${rank.thMeaning}` : `${reading} · ${rank.thMeaning}`;
      const fromSeat = state.captureFrom?.[seat]?.[start + index];
      const from = Number.isInteger(fromSeat) ? t("pile.from", { seat: seatName(fromSeat) }) : "";
      const isWinner = fromSeat === seat;
      return `<div class="pile-item ${isWinner ? "winner" : ""}">
        ${isWinner ? `<span class="pile-win-big" role="img" aria-label="${escapeHTML(t("log.winner"))}">✓</span>` : ""}
        <em>${rank.power}</em>
        <span class="mini-tile ${tile.color === "r" ? "red" : "black"}">${tile.hanzi}</span>
        <b>${escapeHTML(primary)}</b>
        <span>${escapeHTML(secondary)}</span>
        ${from ? `<span class="pile-from">${escapeHTML(from)}</span>` : ""}
      </div>`;
    }).join("");
  }
  const modal = $("#pileModal");
  if (modal) modal.hidden = false;
  audio?.play("click", 0);
}

function inspectTile(id, options = {}) {
  const tile = TILE_BY_ID[id];
  if (!tile) return;
  inspectedTileId = id;
  renderInspector(tile, true);
  showTileTip(id, options);
}

function renderInspector(tile = null, pinned = false) {
  const body = $("#inspectorBody");
  if (!body) return;
  if (!tile && inspectedTileId === "hidden") {
    body.innerHTML = `<div class="inspector-empty"><span class="ghost-tile" aria-hidden="true">?</span><div><strong>${escapeHTML(t("inspector.hidden"))}</strong><p>${escapeHTML(t("inspector.hiddenNote"))}</p></div></div>`;
    return;
  }
  if (!tile && inspectedTileId) tile = TILE_BY_ID[inspectedTileId] || null;
  if (!tile) {
    body.innerHTML = `<div class="inspector-empty"><span class="ghost-tile" aria-hidden="true">兵</span><p>${escapeHTML(t("inspector.empty"))}</p></div>`;
    return;
  }
  const rank = RANK_BY_ID[tile.rank];
  const color = COLORS[tile.color];
  const selected = state?.selected?.includes(tile.id);
  body.innerHTML = `
    <div class="tile-card">
      <div class="tile-medallion ${tile.color === "b" ? "black" : ""}">${tile.hanzi}</div>
      <div>
        <div class="tile-title">${escapeHTML(tileName(tile))} <span style="color:var(--ink-faint);font-size:13px">${tile.hanzi}</span></div>
        <div class="tile-sub">${escapeHTML(colorName(tile.color))} · ${escapeHTML(rank.en)}</div>
        <div class="tile-stats">
          <span class="tag ${tile.color === "r" ? "red" : "black"}">${escapeHTML(colorName(tile.color))}</span>
          <span class="tag gold">${escapeHTML(t("inspector.rank"))} ${tile.power}/7</span>
          <span class="tag">${escapeHTML(t("inspector.copies"))} ${rank.copies}</span>
          ${selected ? `<span class="tag gold">${escapeHTML(t("inspector.selected"))}</span>` : ""}
        </div>
      </div>
    </div>
    <p class="tile-note">${escapeHTML(rank.note[LANG])}</p>
    <p class="tile-note">${escapeHTML(t("inspector.note"))}</p>`;
}

function inspectHidden(options = {}) {
  inspectedTileId = "hidden";
  const body = $("#inspectorBody");
  if (body) body.innerHTML = `<div class="inspector-empty"><span class="ghost-tile" aria-hidden="true">?</span><div><strong>${escapeHTML(t("inspector.hidden"))}</strong><p>${escapeHTML(t("inspector.hiddenNote"))}</p></div></div>`;
  showHiddenTip(options);
}

function renderLog() {
  const list = $("#logList");
  if (!list) return;
  if (!state.log.length) {
    list.innerHTML = `<li class="log-empty">${escapeHTML(t("log.empty"))}</li>`;
    return;
  }
  const items = state.log.slice(-12);
  list.innerHTML = items.map((entry) => {
    const time = entry.kind === "draft" ? "D" : String(entry.trick).padStart(2, "0");
    let text = "";
    if (entry.kind === "draft") text = `<strong>${escapeHTML(seatName(entry.seat))}</strong> ${escapeHTML(t("log.draftPick"))}`;
    else if (entry.kind === "lead") text = `<strong>${escapeHTML(seatName(entry.seat))}</strong> ${escapeHTML(t("actions.lead"))} ${escapeHTML(comboName(entry.callType))} ×${entry.callCount}`;
    else if (entry.kind === "challenge") text = `<strong>${escapeHTML(seatName(entry.seat))}</strong> ${escapeHTML(t("actions.revealLog"))} ${escapeHTML(comboSummary(entry.combo))}`;
    else if (entry.kind === "hidden") text = `<strong>${escapeHTML(seatName(entry.seat))}</strong> ${escapeHTML(t("actions.facedown"))}`;
    else if (entry.kind === "win") text = `<strong>${escapeHTML(seatName(entry.seat))}</strong> +${entry.count} ${escapeHTML(t("summary.piles"))} · ${escapeHTML(comboSummary(entry.combo))}`;
    else if (entry.kind === "round") text = `${escapeHTML(t("summary.round", { n: entry.round }))} · ${entry.points[0]} ${escapeHTML(t("summary.points"))}`;
    else text = "";
    return `<li class="log-item ${entry.kind === "win" && entry.human ? "win" : ""}"><time>${time}</time><span>${text}</span></li>`;
  }).join("");
}

function renderRules() {
  const body = $("#rulesBody");
  if (!body) return;
  const hierarchy = RANKS.slice().reverse().map((rank) => {
    const reading = rankReading(rank);
    const primary = LANG === "th" ? reading : rank.en;
    const secondary = LANG === "th" ? `${rank.en} · ${rank.thMeaning}` : `${reading} · ${rank.thMeaning}`;
    return `<div class="rule-piece">
      <span class="rule-tile red">${rank.red}</span>
      <span class="rule-tile black">${rank.black}</span>
      <span class="rule-piece-copy"><b>${escapeHTML(primary)}</b><span>${escapeHTML(secondary)}</span></span>
      <em>${rank.power}</em>
    </div>`;
  }).join("");
  const tile = (power, color) => {
    const rank = RANK_BY_POWER[power];
    return `<span class="rule-tile ${color === "r" ? "red" : "black"}">${color === "r" ? rank.red : rank.black}</span>`;
  };
  const row = (powers, color) => powers.map((power) => tile(power, color)).join("");
  const examples = [
    ["rules.ex.single", `${tile(7, "r")}<span class="rule-vs">vs</span>${tile(7, "b")}`],
    ["rules.ex.pair", `${row([6, 6], "r")}<span class="rule-vs">vs</span>${row([6, 6], "b")}`],
    ["rules.ex.sahoo", `${row([7, 6, 5], "r")}<span class="rule-vs">vs</span>${row([4, 3, 2], "b")}`],
    ["rules.ex.seehoo", `${row([7, 6, 5, 6], "b")}<span class="rule-vs">vs</span>${row([7, 6, 5, 5], "r")}`],
    ["rules.ex.soldier", `${row([1, 1, 1], "r")}<span class="rule-vs">≠</span>${row([4, 3, 2], "r")}`],
    ["rules.ex.chuan", `${row([1], "r")}<span class="rule-vs">+ 7</span>`]
  ].map(([key, tiles]) => `<div class="rule-example"><b>${escapeHTML(t(key))}</b><div class="rule-tiles">${tiles}</div><p>${escapeHTML(t(`${key}Body`))}</p></div>`).join("");
  const calls = COMBO_TYPES.map((type) => `<div class="rule-card"><b>${escapeHTML(comboName(type))}</b><span>${escapeHTML(t(`combo.${type}.desc`))}</span></div>`).join("");
  const scoreRows = Array.from({ length: 9 }, (_, piles) => `<tr><td>${piles} ${escapeHTML(t("rules.piles"))}</td><td>${piles === 8 ? "16" : piles - 2}</td></tr>`).join("");
  body.innerHTML = `
    <h3>${escapeHTML(t("rules.goal"))}</h3>
    <p>${escapeHTML(t("rules.goalBody"))}</p>
    <h3>${escapeHTML(t("rules.equipment"))}</h3>
    <p>${escapeHTML(t("rules.equipmentBody"))}</p>
    <h3>${escapeHTML(t("rules.pieces"))}</h3>
    <div class="rule-pieces">${hierarchy}</div>
    <h3>${escapeHTML(t("rules.examples"))}</h3>
    ${examples}
    <h3>${escapeHTML(t("rules.color"))}</h3>
    <p>${escapeHTML(t("rules.colorBody"))}</p>
    <h3>${escapeHTML(t("rules.calls"))}</h3>
    <div class="rule-grid">${calls}</div>
    <h3>${escapeHTML(t("rules.flow"))}</h3>
    <p>${escapeHTML(t("rules.flowBody"))}</p>
    <h3>${escapeHTML(t("rules.scoring"))}</h3>
    <table><thead><tr><th>${escapeHTML(t("rules.piles"))}</th><th>${escapeHTML(t("rules.points"))}</th></tr></thead><tbody>${scoreRows}</tbody></table>
    <h3>${escapeHTML(t("rules.beginner"))}</h3>
    <p>${escapeHTML(t("rules.beginnerBody"))}</p>
    <h3>${escapeHTML(t("rules.digital"))}</h3>
    <p>${escapeHTML(t("rules.digitalBody"))}</p>
    <h3>${escapeHTML(t("rules.source"))}</h3>
    <p>${escapeHTML(t("rules.sourceBody"))}</p>
    <p style="color:var(--ink-faint);font-size:11px">${escapeHTML(t("rules.footnote"))}</p>`;
}

function renderAbout() {
  const body = $("#aboutBody");
  if (!body) return;
  const build = APP.build;
  const tokenText = build.tokensTotal === "PENDING" ? "—" : Number(build.tokensTotal).toLocaleString();
  body.innerHTML = `
    <p>${escapeHTML(t("about.intro"))}</p>
    <p>${escapeHTML(t("about.how"))}</p>
    <h3>${escapeHTML(t("about.credits"))}</h3>
    <div class="credit-grid">
      <div class="credit-card"><b>${escapeHTML(t("about.harness"))}</b><span>${escapeHTML(build.harness)}</span></div>
      <div class="credit-card"><b>${escapeHTML(t("about.model"))}</b><span>${escapeHTML(build.model)}</span></div>
      <div class="credit-card"><b>${escapeHTML(t("about.tech"))}</b><span>Three.js r160 · PeerJS 1.5.4 · HTML5 · CSS3 · ES2022</span></div>
      <div class="credit-card"><b>${escapeHTML(t("about.license"))}</b><span>${escapeHTML(APP.license)}</span></div>
    </div>
    <h3>${escapeHTML(t("about.build"))}</h3>
    <p>${escapeHTML(t("about.buildLine", { date: build.packagedAt === "PENDING" ? "—" : build.packagedAt.slice(0, 10), duration: build.durationHuman, tokens: tokenText }))}</p>
    <p>${escapeHTML(t("about.modelLine", { harness: build.harness, model: build.model }))}</p>
    <div class="build-stats">
      <span>${escapeHTML(build.sessionId)}</span>
      <span>v${escapeHTML(APP.version)}</span>
      <span>${escapeHTML(APP.format)}</span>
    </div>
    <h3>${escapeHTML(t("about.privacy"))}</h3>
    <p>${escapeHTML(t("about.privacyBody"))}</p>
    <h3>${escapeHTML(t("about.license"))}</h3>
    <p>${escapeHTML(t("about.licenseBody"))}</p>
    <h3>${escapeHTML(t("about.source"))}</h3>
    <p><a href="${APP.repository}" target="_blank" rel="noopener">${escapeHTML(APP.repository)}</a><br><a href="${APP.live}" target="_blank" rel="noopener">${escapeHTML(APP.live)}</a></p>`;
}

/* --------------------------------------------------------------------------
   11. Language, theme and chrome
   -------------------------------------------------------------------------- */

function renderRankReference() {
  const steps = $("#rankReferenceSteps");
  if (!steps) return;
  steps.innerHTML = RANKS.slice().reverse().map((rank, index) => {
    const reading = rankReading(rank);
    const primary = LANG === "th" ? reading : rank.en;
    const secondary = LANG === "th" ? `${rank.thMeaning} · ${rank.en}` : `${reading} · ${rank.thMeaning}`;
    return `
    <div class="rank-step">
      <em>${rank.power}</em>
      <div class="rank-tiles"><span class="mini-tile red">${rank.red}</span><span class="mini-tile black">${rank.black}</span></div>
      <b>${escapeHTML(primary)}</b>
      <span>${escapeHTML(secondary)}</span>
    </div>${index < RANKS.length - 1 ? '<span class="rank-arrow" aria-hidden="true">›</span>' : ""}`;
  }).join("");
}

function setRankReference(open) {
  const panel = $("#rankReference");
  const button = $("#rankReferenceBtn");
  if (!panel || !button) return;
  panel.hidden = !open;
  button.setAttribute("aria-expanded", String(open));
  button.classList.toggle("active", open);
}

function applyFontSize(id, options = {}) {
  const entry = FONT_SIZES.find((item) => item.id === id) || FONT_SIZES[1];
  prefs.fontSize = entry.id;
  document.documentElement.dataset.fontSize = entry.id;
  document.documentElement.style.setProperty("--fs-scale", String(entry.scale));
  if (!options.silent) {
    savePrefs();
    audio?.play("click", 0);
    toast(t("toast.fontSize", { size: t(entry.labelKey) }));
  }
  renderDisplay();
}

function applyTheme(id, options = {}) {
  const entry = THEMES.find((item) => item.id === id) || THEMES[0];
  prefs.theme = entry.id;
  document.documentElement.dataset.theme = entry.id;
  scene?.setTheme?.(entry.id);
  if (!options.silent) {
    savePrefs();
    audio?.play("click", 0);
    toast(t("toast.theme", { theme: t(entry.labelKey) }));
  }
  renderDisplay();
}

function renderDisplay() {
  $$("button[data-font-size]").forEach((button) => {
    const active = button.dataset.fontSize === prefs.fontSize;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  $$("button[data-theme-choice]").forEach((button) => {
    const active = button.dataset.themeChoice === prefs.theme;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

function resetDisplay() {
  applyFontSize("md", { silent: true });
  applyTheme("daybreak", { silent: true });
  savePrefs();
  toast(t("toast.displayReset"), "jade");
  audio?.play("click", 0);
  renderDisplay();
}

function applyLanguage(lang) {
  LANG = lang === "th" ? "th" : "en";
  prefs.lang = LANG;
  document.documentElement.lang = LANG;
  document.documentElement.dataset.lang = LANG;
  $$("[data-i18n]").forEach((node) => {
    const key = node.dataset.i18n;
    const text = t(key);
    if (node.children.length === 0 || node.dataset.i18nForce) node.textContent = text;
    else node.textContent = text;
  });
  $$("[data-i18n-aria]").forEach((node) => node.setAttribute("aria-label", t(node.dataset.i18nAria)));
  $$("[data-i18n-placeholder]").forEach((node) => node.setAttribute("placeholder", t(node.dataset.i18nPlaceholder)));
  $$("button[data-lang]").forEach((button) => {
    const active = button.dataset.lang === LANG;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  const label = $("#langLabel");
  if (label) label.textContent = LANG === "en" ? "ไทย" : "EN";
  const chatToggle = $("#chatToggle");
  if (chatToggle) chatToggle.textContent = t(chatOpen ? "chat.hide" : "chat.show");
  const tileToggle = $("#tileListToggle");
  if (tileToggle) {
    tileToggle.textContent = prefs.tileList ? t("handList.hide") : t("handList.show");
    tileToggle.setAttribute("aria-expanded", String(prefs.tileList));
    const list = $("#tileList");
    if (list) list.hidden = !prefs.tileList;
  }
  const sound = $("#soundToggle");
  if (sound) sound.setAttribute("aria-label", `${t("actions.sound")}: ${prefs.sound ? "on" : "off"}`);
  renderDisplay();
  renderRankReference();
  renderRules();
  renderAbout();
  renderAll();
  renderInspector();
  renderChat();
  renderVersion();
  if (availableVersion) {
    const updateText = $("#updateText");
    if (updateText) updateText.textContent = t("version.updateAvailable", { version: availableVersion });
  }
  if (voice) renderVoiceState(voice.snapshot());
  if (lobbyState) renderLobby();
  if (scene && state && ["lead", "follow", "roundEnd", "matchEnd"].includes(state.phase)) scene.sync(state);
  if (state?.lastTrick) $("#undoBody").innerHTML = buildUndoExplanation();
  savePrefs();
}

function setSound(enabled) {
  prefs.sound = Boolean(enabled);
  const button = $("#soundToggle");
  button?.setAttribute("aria-pressed", String(prefs.sound));
  const icon = $("#soundIcon");
  if (icon) icon.textContent = prefs.sound ? "♪" : "♪";
  if (prefs.sound) audio?.play("clack", 0);
  savePrefs();
  toast(prefs.sound ? t("toast.soundOn") : t("toast.soundOff"));
}

function setLanguage(lang) {
  applyLanguage(lang);
  audio?.play("click", 0);
  toast(t("toast.lang"));
}

/* --------------------------------------------------------------------------
   12. Persistence and export
   -------------------------------------------------------------------------- */

function buildExport() {
  const payload = {
    format: APP.format,
    version: APP.version,
    exportedAt: nowISO(),
    app: {
      name: APP.fullName,
      version: APP.version,
      repository: APP.repository,
      live: APP.live,
      license: APP.license
    },
    credits: {
      harness: APP.build.harness,
      model: APP.build.model,
      sessionId: APP.build.sessionId,
      buildDuration: APP.build.durationHuman,
      tokensTotal: APP.build.tokensTotal
    },
    stats: clone(stats),
    game: serializableState()
  };
  return payload;
}

function exportGame() {
  const payload = buildExport();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = APP.exportName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  toast(t("toast.exported"), "gold");
  audio?.play("click", 0);
}

/* --------------------------------------------------------------------------
   13. Serverless multiplayer (host-authoritative WebRTC)
   -------------------------------------------------------------------------- */

function isGhostTileId(id) {
  return typeof id === "string" && id.startsWith(GHOST_PREFIX);
}

function sanitizeHandSlots(raw) {
  if (!Array.isArray(raw)) return null;
  const slots = raw.slice(0, 8).map((slot) => {
    if (!slot || typeof slot !== "object") return null;
    const x = Number(slot.x);
    const z = Number(slot.z);
    const a = Number(slot.a);
    if (!Number.isFinite(x) || !Number.isFinite(z) || !Number.isFinite(a)) return null;
    const radius = Math.hypot(x, z);
    const clamped = Math.max(0.8, Math.min(HAND_RADIUS + 0.82, radius));
    const angle = Math.atan2(x, z);
    return {
      x: Math.round(Math.sin(angle) * clamped * 1000) / 1000,
      z: Math.round(Math.cos(angle) * clamped * 1000) / 1000,
      a: Math.round(a * 1000) / 1000
    };
  });
  return slots.some((slot) => !slot) ? null : slots;
}

function publishHandLayout(slots) {
  if (!isNetworked() || !net?.started) return;
  const payload = slots === null ? null : sanitizeHandSlots(slots);
  if (slots !== null && !payload) return;
  const seat = isHost() ? MY_SEAT : net.seat;
  if (isHost()) {
    scene?.setSeatLayout?.(seat, payload);
    net.host?.broadcast({ type: "hand-layout", seat, slots: payload });
  } else if (net?.client) {
    net.client.send({ type: "hand-layout", slots: payload });
  }
}

function onHandLayoutChange() {
  const slots = scene?.exportHandSlots?.();
  if (!slots) return;
  const seat = Number.isInteger(state?.mySeat) ? state.mySeat : MY_SEAT;
  lastHandLayoutSig = (state?.hands?.[seat] || []).map((tile) => tile.id).join(",");
  publishHandLayout(slots);
}

let lastHandLayoutSig = "";
function maybePublishHandLayout() {
  if (!isNetworked() || !net?.started || !state) return;
  const seat = Number.isInteger(state.mySeat) ? state.mySeat : MY_SEAT;
  const hand = state.hands?.[seat] || [];
  const sig = hand.map((tile) => tile.id).join(",");
  if (sig === lastHandLayoutSig) return;
  lastHandLayoutSig = sig;
  if (!scene?.hasCustomHand?.()) return;
  publishHandLayout(scene.exportHandSlots());
}

function sendNetAction(kind, tileIds, reveal = false, value = null) {
  if (!isClient() || !net?.client) return false;
  return net.client.send({ type: "action", kind, tiles: tileIds, reveal: Boolean(reveal), value });
}

function makeGhostTile(id) {
  const match = /^ghost-(\d)-(\d+)$/.exec(id);
  return {
    id,
    rank: "soldier",
    power: 1,
    color: "b",
    hanzi: "?",
    hidden: true,
    ghostSeat: match ? Number(match[1]) : 0
  };
}

function tileFromWire(id) {
  return TILE_BY_ID[id] || makeGhostTile(id);
}

function ensureHiddenTags(source = state) {
  if (!source) return;
  if (!Array.isArray(source.hiddenTags) || source.hiddenTags.length !== TABLE_SEATS) {
    source.hiddenTags = [[], [], [], []];
  }
  source.hands.forEach((hand, seat) => {
    const tags = source.hiddenTags[seat] && !Array.isArray(source.hiddenTags[seat]) ? source.hiddenTags[seat] : {};
    hand.forEach((tile, index) => {
      if (!tags[tile.id]) tags[tile.id] = `${GHOST_PREFIX}${seat}-${index}`;
    });
    source.hiddenTags[seat] = tags;
  });
}

function hiddenTag(seat, tileId, source = state) {
  return source?.hiddenTags?.[seat]?.[tileId] || `${GHOST_PREFIX}${seat}-0`;
}

/**
 * The only function allowed to cross the privacy boundary.
 *
 * Hands and face-down centre plays that belong to another seat become ghost
 * mesh ids; their real tile ids and combination values never leave the host.
 * Captures are public, so they keep real ids. The host's undo snapshot and the
 * tile→ghost map are stripped by serializableState.
 */
function sanitizeForSeat(source, seat) {
  if (!source) return null;
  ensureHiddenTags(source);
  const raw = serializableState(source);
  raw.hands = raw.hands.map((hand, handSeat) => (
    handSeat === seat ? hand : hand.map((tileId) => hiddenTag(handSeat, tileId, source))
  ));
  raw.center = raw.center.map((entry) => {
    if (entry.revealed || entry.seat === seat) return entry;
    return {
      ...entry,
      tiles: entry.tiles.map((tileId) => hiddenTag(entry.seat, tileId, source)),
      combo: null
    };
  });
  raw.log = (raw.log || []).map((entry) => {
    if (entry.kind === "hidden" && entry.seat !== seat) return { ...entry, combo: null };
    return entry;
  });
  if (raw.lastTrick) {
    const entries = (raw.lastTrick.entries || []).map((entry) => (
      entry.revealed || entry.seat === seat ? entry : { ...entry, combo: null }
    ));
    const localEntry = entries.find((entry) => entry.seat === seat) || null;
    raw.lastTrick = {
      ...raw.lastTrick,
      entries,
      humanSeat: seat,
      humanWon: raw.lastTrick.winner === seat,
      humanRevealed: Boolean(localEntry?.revealed),
      humanCombo: localEntry?.combo || null,
      humanTiles: []
    };
  }
  raw.trickArchive = (raw.trickArchive || []).map((record) => ({
    ...record,
    entries: (record.entries || []).map((entry) => {
      if (entry.revealed || entry.seat === seat) return entry;
      return { ...entry, combo: null, tiles: (entry.tiles || []).map(() => "hidden") };
    })
  }));
  raw.selected = [];
  return raw;
}

function hydrateRemoteState(raw) {
  if (!raw) return null;
  const game = { ...raw };
  game.hands = (raw.hands || []).map((hand) => hand.map(tileFromWire));
  game.captures = (raw.captures || [[], [], [], []]).map((pile) => pile.map(tileFromWire));
  game.captureHidden = [0, 1, 2, 3].map((seat) => (
    (raw.captures?.[seat] || []).map((_, index) => Boolean(raw.captureHidden?.[seat]?.[index]))
  ));
  game.draftPool = raw.draftPool ? raw.draftPool.map((id) => TILE_BY_ID[id]).filter(Boolean) : null;
  game.trickArchive = (raw.trickArchive || []).map((record) => ({
    ...record,
    combo: record.combo || null,
    entries: (record.entries || []).map((entry) => ({
      ...entry,
      combo: entry.combo || null,
      tiles: (entry.tiles || []).map((id) => TILE_BY_ID[id] || { id: "hidden", hanzi: "?", color: "b", rank: "soldier", power: 1 })
    }))
  }));
  game.captureTrick = [0, 1, 2, 3].map((seat) => (
    (raw.captures?.[seat] || []).map((_, index) => (
      Number.isInteger(raw.captureTrick?.[seat]?.[index]) ? raw.captureTrick[seat][index] : null
    ))
  ));
  game.captureFrom = [0, 1, 2, 3].map((seat) => (
    (raw.captures?.[seat] || []).map((_, index) => (
      Number.isInteger(raw.captureFrom?.[seat]?.[index]) ? raw.captureFrom[seat][index] : null
    ))
  ));
  game.center = (raw.center || []).map((entry) => ({
    ...entry,
    tiles: (entry.tiles || []).map(tileFromWire),
    combo: entry.combo || null
  }));
  game.lead = raw.lead ? { seat: raw.lead.seat, combo: raw.lead.combo || null } : null;
  game.best = raw.best ? { seat: raw.best.seat, combo: raw.best.combo || null } : null;
  game.selected = [];
  game.snapshot = null;
  game.fast = false;
  game.language = LANG;
  game.hiddenTags = [[], [], [], []];
  return game;
}

function applyRemoteState(raw) {
  if (!raw) return;
  const next = hydrateRemoteState(raw);
  const previousSelected = state && next.hands[MY_SEAT] ? state.selected || [] : [];
  const inHand = new Set(next.hands[MY_SEAT].map((tile) => tile.id));
  next.selected = ["lead", "follow"].includes(next.phase) && next.turn === MY_SEAT
    ? previousSelected.filter((id) => inHand.has(id))
    : [];
  state = next;
  if (!["roundEnd", "matchEnd"].includes(next.phase)) closeModal("summaryModal");
  resumeAvailable = false;
  if (scene) scene.setViewSeat?.(MY_SEAT);
  renderAll();
  if (scene) {
    scene.sync(state);
    scene.setSelected(state.selected);
  }
  maybePublishHandLayout();
  const resultRecord = next.trickArchive?.[next.trickArchive.length - 1];
  if (next.phase === "resolving" && resultRecord) showTrickResult(resultRecord);
  if (next.phase === "roundEnd" || next.phase === "matchEnd") {
    closeModal("trickResultModal");
    showRoundSummary(next.phase === "matchEnd");
  }
  if (next.phase === "dealing") scene?.flipHumanHand?.(state);
  if (lobbyState?.view === "waiting") {
    lobbyState.view = "table";
    closeLobby();
  }
}

function serialiseRoster() {
  return SEAT_PROFILES.map((profile, seat) => ({
    seat,
    name: profile?.name || t("net.emptySeat"),
    kind: profile?.kind || "bot",
    connected: profile?.connected !== false,
    bot: profile?.kind === "bot" || !profile,
    peerId: profile?.peerId || null,
    voice: Boolean(profile?.voice)
  }));
}

function queuePublish() {
  if (!isHost()) return;
  clearTimeout(publishTimer);
  publishTimer = setTimeout(publishState, NET_TICK_MS);
}

function publishState() {
  if (!isHost() || !state || !net?.host) return;
  if (!net.started) return;
  const roster = serialiseRoster();
  net.seq = (net.seq || 0) + 1;
  for (const profile of SEAT_PROFILES) {
    if (!profile || profile.kind !== "human" || !profile.connId) continue;
    const payload = sanitizeForSeat(state, profile.seat);
    net.host.send(profile.connId, {
      type: "state",
      roomCode: net.code,
      seq: net.seq,
      seat: profile.seat,
      players: roster,
      hostName: net.name,
      state: payload
    });
  }
  lastPublished = Date.now();
}

function sendLobbyToGuests() {
  if (!isHost() || !net?.host) return;
  const roster = serialiseRoster();
  const humans = SEAT_PROFILES.filter((profile) => profile && (profile.kind === "host" || profile.kind === "human") && profile.connected).length;
  for (const profile of SEAT_PROFILES) {
    if (!profile || profile.kind !== "human" || !profile.connId) continue;
    net.host.send(profile.connId, {
      type: "lobby",
      roomCode: net.code,
      hostName: net.name,
      players: roster,
      canStart: humans >= 2,
      started: Boolean(net.started)
    });
  }
}

function nextBotName() {
  const used = SEAT_PROFILES ? SEAT_PROFILES.filter((profile) => profile?.kind === "bot").length : 0;
  return `Bot ${used + 1}`;
}

function convertSeatToBot(seat, reason = "left") {
  if (!SEAT_PROFILES?.[seat]) return;
  const former = SEAT_PROFILES[seat];
  const keepRejoin = reason !== "left";
  SEAT_PROFILES[seat] = {
    seat,
    name: nextBotName(),
    kind: "bot",
    connected: true,
    voice: false,
    replaced: former.name || former.handle,
    since: nowISO(),
    rejoinToken: keepRejoin ? (former.rejoinToken || null) : null,
    rejoinName: former.rejoinName || former.name || "",
    clientId: former.clientId || null
  };
  if (state) {
    // The seat stays occupied; the hand and score are untouched.
  }
  toast(t("toast.netBot", { name: former.name || seatName(seat) }), "wine");
  renderAll();
  sendLobbyToGuests();
  queuePublish();
  syncVoicePeers();
  if (state && state.turn === seat && ["lead", "follow"].includes(state.phase)) scheduleAI(700);
}

function makeRejoinToken() {
  try {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  } catch {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`;
  }
}

function acceptGuest(connId, name) {
  clearPending(connId);
  const clean = cleanGuestName(name, `Guest ${net.seatSeq + 1}`);
  if (net.started) {
    net.host.send(connId, { type: "rejected", reason: "in-progress" });
    return;
  }
  let seat = -1;
  for (let index = 1; index < TABLE_SEATS; index += 1) {
    if (!SEAT_PROFILES[index]) { seat = index; break; }
  }
  if (seat < 0) {
    net.host.send(connId, { type: "rejected", reason: "full" });
    return;
  }
  net.seatSeq += 1;
  SEAT_PROFILES[seat] = {
    seat,
    name: clean,
    kind: "human",
    connected: true,
    connId,
    peerId: connId,
    voice: false,
    clientId: `guest-${net.seatSeq}`,
    rejoinToken: makeRejoinToken(),
    rejoinName: clean
  };
  net.host.send(connId, {
    type: "welcome",
    roomCode: net.code,
    protocol: PROTOCOL_VERSION,
    seat,
    hostName: net.name,
    players: serialiseRoster(),
    chat: chatHistory.slice(-30),
    canStart: SEAT_PROFILES.filter((profile) => profile && profile.connected).length >= 2,
    rejoinToken: SEAT_PROFILES[seat].rejoinToken,
    started: false
  });
  sendLobbyToGuests();
  renderLobby();
  syncVoicePeers();
  toast(t("toast.netGuest", { name: clean }), "jade");
  audio?.play("click", 0);
}

function cleanGuestName(name, fallback = "Guest") {
  const clean = String(name || "").replace(/[\u0000-\u001f<>]/g, " ").replace(/\s+/g, " ").trim().slice(0, 18);
  if (clean) return clean;
  if (fallback === "") return "";
  return fallback || "Guest";
}

function pendingList() {
  return [...pendingRequests.values()];
}

function clearPending(connId) {
  pendingRequests.delete(connId);
  const timer = pendingTimers.get(connId);
  if (timer) clearTimeout(timer);
  pendingTimers.delete(connId);
}

function rejectConnection(connId, reason) {
  if (net?.host) net.host.send(connId, { type: "rejected", reason });
  setTimeout(() => net?.host?.closeConnection?.(connId), 350);
}

function expirePending(connId) {
  if (!pendingRequests.has(connId)) return;
  clearPending(connId);
  rejectConnection(connId, "timeout");
  renderLobby();
}

function reattachGuest(connId, seat, token) {
  if (!isHost() || !net?.host) return false;
  const current = SEAT_PROFILES?.[seat];
  if (!current || !token || current.rejoinToken !== token) return false;
  clearPending(connId);
  const name = cleanGuestName(current.rejoinName || current.name || "", `Guest ${seat}`);
  SEAT_PROFILES[seat] = {
    seat,
    name,
    kind: "human",
    connected: true,
    connId,
    peerId: connId,
    voice: false,
    clientId: current.clientId || `guest-${seat}`,
    rejoinToken: token,
    rejoinName: name
  };
  const started = Boolean(net.started && state);
  net.host.send(connId, {
    type: "welcome",
    roomCode: net.code,
    protocol: PROTOCOL_VERSION,
    seat,
    hostName: net.name,
    players: serialiseRoster(),
    chat: chatHistory.slice(-30),
    canStart: SEAT_PROFILES.filter((profile) => profile && profile.connected).length >= 2,
    rejoinToken: token,
    rejoin: true,
    started,
    state: started ? sanitizeForSeat(state, seat) : null
  });
  if (started) {
    queuePublish();
    renderAll();
  } else {
    renderLobby();
  }
  sendLobbyToGuests();
  syncVoicePeers();
  toast(t("toast.netRejoin", { name }), "jade");
  return true;
}

async function requestGuest(connId, message) {
  if (!isHost() || !net?.host) return;
  const rejoinToken = typeof message.rejoinToken === "string" ? message.rejoinToken.trim() : "";
  if (rejoinToken) {
    const seat = SEAT_PROFILES?.findIndex((profile) => profile && profile.rejoinToken === rejoinToken) ?? -1;
    if (seat > 0 && reattachGuest(connId, seat, rejoinToken)) return;
  }
  if (net.started) {
    rejectConnection(connId, "in-progress");
    return;
  }
  const humans = SEAT_PROFILES.filter((profile) => profile && (profile.kind === "host" || profile.kind === "human") && profile.connected).length;
  if (humans >= TABLE_SEATS) {
    rejectConnection(connId, "full");
    return;
  }
  if (pendingRequests.has(connId)) return;
  if (pendingRequests.size >= 6) {
    rejectConnection(connId, "busy");
    return;
  }
  if (net.security.lockUntil > Date.now()) {
    rejectConnection(connId, "busy");
    return;
  }
  if (net.security.pinHash) {
    const candidate = await hashPin(message.pin);
    if (!candidate || candidate !== net.security.pinHash) {
      net.security.pinFails += 1;
      rejectConnection(connId, "bad-pin");
      if (net.security.pinFails >= 8) net.security.lockUntil = Date.now() + 60000;
      return;
    }
    net.security.pinFails = 0;
  }
  const name = cleanGuestName(message.name, `Guest ${net.seatSeq + 1}`);
  if (net.security.approval) {
    pendingRequests.set(connId, { connId, name, at: Date.now() });
    pendingTimers.set(connId, setTimeout(() => expirePending(connId), 120000));
    net.host.send(connId, { type: "pending", roomCode: net.code, hostName: net.name });
    renderLobby();
    return;
  }
  acceptGuest(connId, name);
}

function approvePending(connId) {
  const request = pendingRequests.get(connId);
  if (!request) return false;
  clearPending(connId);
  acceptGuest(connId, request.name);
  renderLobby();
  return true;
}

function denyPending(connId, reason = "denied") {
  if (!pendingRequests.has(connId)) return false;
  clearPending(connId);
  rejectConnection(connId, reason);
  renderLobby();
  return true;
}

function denyAllPending(reason = "denied") {
  for (const connId of [...pendingRequests.keys()]) denyPending(connId, reason);
}

function approveAllPending() {
  for (const request of pendingList()) {
    if (pendingRequests.size === 0) break;
    approvePending(request.connId);
  }
}

function setRoomApproval(value) {
  if (!isHost() || !net) return;
  net.security.approval = Boolean(value);
  if (!net.security.approval) approveAllPending();
  renderLobby();
}

async function setRoomPin(value, options = {}) {
  if (!isHost() || !net) return false;
  const pin = normalisePin(value);
  if (!pin) {
    net.security.pinHash = null;
    net.security.pinSet = false;
    net.security.pinFails = 0;
    net.security.lockUntil = 0;
    roomPinPlain = "";
    renderLobby();
    if (!options.silent) toast(t("net.pinCleared"), "");
    return true;
  }
  const check = validatePin(pin, { roomCode: net.code, name: net.name });
  if (!check.ok) {
    if (!options.silent) toast(t(`net.pinRule.${check.reason}`), "wine");
    return false;
  }
  const digest = await hashPin(pin);
  if (!digest) {
    if (!options.silent) toast(t("net.pinSecureOnly"), "wine");
    return false;
  }
  net.security.pinHash = digest;
  net.security.pinSet = true;
  net.security.pinFails = 0;
  net.security.lockUntil = 0;
  roomPinPlain = pin;
  renderLobby();
  if (!options.silent) toast(t("net.pinSet"), "jade");
  return true;
}

async function probeHost(connId, message) {
  if (!isHost() || !net?.host) return;
  const pinRequired = Boolean(net.security?.pinHash);
  const digest = await hashPin(message.pin);
  const pinAccepted = !pinRequired || Boolean(digest && digest === net.security.pinHash);
  const humans = SEAT_PROFILES.filter((profile) => profile && (profile.kind === "host" || profile.kind === "human") && profile.connected).length;
  net.host.send(connId, {
    type: "probe-result",
    roomCode: net.code,
    pinRequired,
    pinAccepted,
    approval: Boolean(net.security?.approval),
    started: Boolean(net.started),
    seatsFree: Math.max(0, TABLE_SEATS - humans)
  });
}

function hostMessage({ connId, message }) {
  if (!isProtocolMessage(message)) return;
  switch (message.type) {
    case "hello":
      requestGuest(connId, message).catch(() => rejectConnection(connId, "busy"));
      break;
    case "action": {
      const profile = SEAT_PROFILES?.find((entry) => entry?.connId === connId);
      if (!profile) return;
      const tiles = Array.isArray(message.tiles) ? message.tiles.filter((id) => typeof id === "string").slice(0, 6) : [];
      const ok = message.kind === "lead"
        ? leadTrick(profile.seat, tiles)
        : message.kind === "follow"
          ? submitPlay(profile.seat, tiles, false)
          : message.kind === "show"
            ? showdown(profile.seat, Boolean(message.reveal))
            : message.kind === "redraw"
              ? applyRedraw(profile.seat)
              : message.kind === "chuan"
                ? claimChuan(profile.seat)
                : message.kind === "bid"
                  ? placeBid(profile.seat, Number(message.value))
                  : message.kind === "draft"
                    ? draftPick(profile.seat, message.tiles)
                    : false;
      if (!ok) net.host.send(connId, { type: "rejected", reason: "illegal" });
      break;
    }
    case "chat": {
      const profile = SEAT_PROFILES?.find((entry) => entry?.connId === connId);
      if (!profile) return;
      const now = Date.now();
      if (profile.chatAt && now - profile.chatAt < 350) return;
      const text = normaliseChat(message.text);
      if (!text) return;
      profile.chatAt = now;
      hostChat(profile.seat, text);
      break;
    }
    case "hand-layout": {
      const profile = SEAT_PROFILES?.find((entry) => entry?.connId === connId);
      if (!profile || !net?.started) return;
      const slots = sanitizeHandSlots(message.slots);
      if (message.slots !== null && !slots) return;
      scene?.setSeatLayout?.(profile.seat, slots);
      const targets = [...(net.host?.connections?.keys?.() || [])].filter((id) => id !== connId);
      if (targets.length) net.host.broadcast({ type: "hand-layout", seat: profile.seat, slots }, targets);
      break;
    }
    case "voice-state": {
      const profile = SEAT_PROFILES?.find((entry) => entry?.connId === connId);
      if (!profile) return;
      profile.voice = Boolean(message.active);
      sendLobbyToGuests();
      syncVoicePeers();
      break;
    }
    case "probe":
      probeHost(connId, message).catch(() => {});
      break;
    case "ping":
      net.host.send(connId, { type: "pong", at: Date.now() });
      break;
    case "leave": {
      if (pendingRequests.has(connId)) {
        clearPending(connId);
        renderLobby();
        return;
      }
      const profile = SEAT_PROFILES?.find((entry) => entry?.connId === connId);
      if (profile) {
        if (net.started && state) convertSeatToBot(profile.seat);
        else {
          SEAT_PROFILES[profile.seat] = null;
          sendLobbyToGuests();
          renderLobby();
          syncVoicePeers();
        }
      }
      break;
    }
    default:
      break;
  }
}

function hostConnectionLost({ connId }) {
  if (pendingRequests.has(connId)) {
    clearPending(connId);
    renderLobby();
    return;
  }
  const profile = SEAT_PROFILES?.find((entry) => entry?.connId === connId);
  if (!profile) return;
  if (net?.started && state) {
    convertSeatToBot(profile.seat, "disconnected");
  } else {
    SEAT_PROFILES[profile.seat] = {
      ...profile,
      connected: false,
      connId: null,
      peerId: null,
      voice: false,
      rejoinToken: profile.rejoinToken || null,
      rejoinName: profile.rejoinName || profile.name
    };
    sendLobbyToGuests();
    renderLobby();
    syncVoicePeers();
    toast(t("toast.netGuestHeld", { name: profile.name }), "wine");
  }
}

async function acquireHostWakeLock() {
  if (!isHost() || !("wakeLock" in navigator) || hostWakeLock) return;
  try {
    hostWakeLock = await navigator.wakeLock.request("screen");
    hostWakeLock.addEventListener("release", () => { hostWakeLock = null; });
  } catch { hostWakeLock = null; }
}

function releaseHostWakeLock() {
  try { hostWakeLock?.release(); } catch { /* ignore */ }
  hostWakeLock = null;
}

async function createHostRoom(name) {
  if (net) leaveRoom({ silent: true });
  clearRoomIntent();
  roomPinPlain = "";
  const handle = String(name || "").trim().slice(0, 18) || t("net.hostDefault");
  lobbyState = { view: "host", roomCode: "", status: t("net.startingHost"), error: "", players: [], hostName: handle, started: false };
  showLobby("host");
  const hostHandlers = {
    onConnection: () => {
      setLobbyStatus(t("net.guestConnecting"), "");
      renderLobby();
    },
    onMessage: hostMessage,
    onClose: hostConnectionLost,
    onError: ({ type }) => {
      if (type === "unavailable-id") return;
      lastNetError = type;
      setLobbyStatus(t("net.error", { error: type }), "wine");
    },
    onStatus: ({ state: status }) => {
      if (status === "reconnecting") setLobbyStatus(t("net.reconnecting"), "wine");
    }
  };
  try {
    const host = await openHostWithRetry({ name: handle, ...hostHandlers });
    net = {
      role: "host",
      host,
      code: host.code,
      name: handle,
      seq: 0,
      started: false,
      seatSeq: 0,
      security: { approval: true, pinHash: null, pinSet: false, pinFails: 0, lockUntil: 0 }
    };
    SEAT_PROFILES = [{ seat: 0, name: handle, kind: "host", connected: true, host: true, peerId: host.id, voice: false }, null, null, null];
    MY_SEAT = 0;
    lobbyState.roomCode = host.code;
    await setRoomPin(generatePin(), { silent: true });
    setLobbyStatus("", "");
    renderLobby();
    renderNetChrome();
    syncVoicePeers();
    acquireHostWakeLock();
    audio?.play("win", 0);
    savePlayerName(handle);
  } catch (error) {
    setLobbyStatus(t("net.hostFailed", { error: error?.type || error?.message || "unknown" }), "wine");
  }
}

function startHostedMatch() {
  if (!isHost()) return;
  if (net.started) {
    toast(t("net.alreadyStarted"), "wine");
    return;
  }
  denyAllPending("in-progress");
  const humans = SEAT_PROFILES.filter((profile) => profile && (profile.kind === "host" || profile.kind === "human") && profile.connected).length;
  if (humans < 2) {
    toast(t("net.needTwo"), "wine");
    return;
  }
  let botIndex = 1;
  SEAT_PROFILES = [0, 1, 2, 3].map((seat) => {
    const profile = SEAT_PROFILES[seat];
    if (profile && (profile.kind === "host" || profile.kind === "human") && profile.connected) return profile;
    const bot = { seat, name: `Bot ${botIndex++}`, kind: "bot", connected: true };
    if (profile?.rejoinToken) {
      bot.rejoinToken = profile.rejoinToken;
      bot.rejoinName = profile.rejoinName || profile.name || "";
      bot.clientId = profile.clientId || null;
    }
    return bot;
  });
  net.started = true;
  net.seq = 0;
  if (lobbyState) lobbyState.status = t("net.matchInProgress");
  const roster = serialiseRoster();
  for (const profile of SEAT_PROFILES) {
    if (profile.kind !== "human" || !profile.connId) continue;
    net.host.send(profile.connId, {
      type: "start",
      roomCode: net.code,
      seat: profile.seat,
      players: roster,
      hostName: net.name
    });
  }
  closeLobby();
  beginMatch();
  toast(t("toast.netStarted", { code: formatRoomCode(net.code) }), "gold");
  sendLobbyToGuests();
  publishState();
}

function clientMessage({ message }) {
  if (!isProtocolMessage(message)) return;
  switch (message.type) {
    case "welcome": {
      MY_SEAT = Number(message.seat) || 1;
      SEAT_PROFILES = message.players.map((player) => ({ ...player }));
      net.seat = MY_SEAT;
      net.name = message.players?.[MY_SEAT]?.name || net.name;
      const rejoinToken = typeof message.rejoinToken === "string" ? message.rejoinToken : "";
      if (rejoinToken) {
        saveRejoinSeat({
          code: message.roomCode,
          seat: MY_SEAT,
          token: rejoinToken,
          name: net.name
        });
      }
      net.started = Boolean(message.started) || Boolean(message.rejoin && message.state);
      lobbyState = {
        view: "waiting",
        roomCode: message.roomCode,
        hostName: message.hostName,
        players: message.players,
        status: message.rejoin ? t("net.reconnected") : t("net.connectedWaiting"),
        started: net.started,
        pending: false
      };
      chatHistory = Array.isArray(message.chat) ? message.chat.slice(-30) : [];
      if (message.rejoin && message.state) {
        applyRemoteState(message.state);
      } else {
        showLobby("waiting");
        renderLobby();
      }
      renderNetChrome();
      renderChat();
      syncVoicePeers();
      audio?.play("win", 0);
      break;
    }
    case "lobby":
      if (SEAT_PROFILES && message.players) SEAT_PROFILES = message.players.map((player) => ({ ...player }));
      if (lobbyState) {
        lobbyState.players = message.players || lobbyState.players;
        lobbyState.started = Boolean(message.started);
        lobbyState.canStart = Boolean(message.canStart);
      }
      if (lobbyState?.view !== "table") renderLobby();
      syncVoicePeers();
      break;
    case "start":
      if (net) net.started = true;
      if (message.players) SEAT_PROFILES = message.players.map((player) => ({ ...player }));
      if (lobbyState) {
        lobbyState.started = true;
        lobbyState.status = t("net.dealing");
        renderLobby();
      }
      syncVoicePeers();
      break;
    case "state":
      if (message.players) SEAT_PROFILES = message.players.map((player) => ({ ...player }));
      applyRemoteState(message.state);
      syncVoicePeers();
      break;
    case "hand-layout":
      if (Number.isInteger(message.seat) && message.seat !== MY_SEAT) {
        const slots = sanitizeHandSlots(message.slots);
        if (message.slots === null || slots) scene?.setSeatLayout?.(message.seat, slots);
      }
      break;
    case "chat":
      if (message.entry) appendChat(message.entry);
      break;
    case "pending":
      lobbyState = {
        view: "waiting",
        roomCode: message.roomCode,
        hostName: message.hostName,
        players: [],
        status: t("net.waitingApproval"),
        started: false,
        pending: true
      };
      showLobby("waiting");
      break;
    case "rejected": {
      if (net) net.rejected = true;
      lastNetError = message.reason || "rejected";
      if (message.reason === "illegal") {
        toast(t("net.rejected.illegal"), "wine");
        break;
      }
      if (["bad-pin", "in-progress", "denied"].includes(message.reason)) clearRejoinSeat();
      if (lobbyState?.view !== "table") {
        lobbyState = {
          ...(lobbyState || {}),
          view: "join",
          pending: false,
          status: t(`net.rejected.${message.reason}`)
        };
        showLobby("join");
        if (message.reason === "bad-pin") $("#lobbyPinInput")?.focus();
      }
      setLobbyStatus(t(`net.rejected.${message.reason}`), "wine");
      break;
    }
    case "closed":
      handleHostLost();
      break;
    case "pong":
      remoteClock = Date.now() - Number(message.at || Date.now());
      break;
    default:
      break;
  }
}

function handleHostLost() {
  if (!isClient()) return;
  lastNetError = "host-left";
  if (voice) {
    voice.leave();
    voice.destroy();
    voice = null;
  }
  voiceActive = false;
  clearSpeaking();
  if (lobbyState) {
    lobbyState.view = "lost";
    lobbyState.status = t("net.hostLeft");
  } else {
    lobbyState = { view: "lost", roomCode: net?.code || "", status: t("net.hostLeft"), players: SEAT_PROFILES || [], started: true };
  }
  showLobby("lost");
}

async function joinRoom(code, name, pin = "", rejoinToken = "") {
  if (net) leaveRoom({ silent: true });
  const normalized = normalizeRoomCode(code);
  if (!normalized) {
    setLobbyStatus(t("net.badCode"), "wine");
    return;
  }
  const handle = cleanGuestName(name, t("net.guestDefault"));
  const roomPin = normalisePin(pin);
  const storedRejoin = rejoinToken || loadRejoinSeat(normalized)?.token || "";
  saveRoomIntent({ role: "guest", code: normalized, name: handle });
  const token = ++joinToken;
  MY_SEAT = 0;
  SEAT_PROFILES = null;
  lobbyState = { view: "join", roomCode: normalized, status: t("net.connecting"), error: "", players: [], hostName: "", started: false, name: handle };
  showLobby("join");
  const connectButton = $("#lobbyConnectBtn");
  if (connectButton) {
    connectButton.disabled = true;
    connectButton.textContent = t("net.connecting");
  }
  let client = null;
  const makeClient = () => {
    client = new PeerClient({
      code: normalized,
      name: handle,
      connectTimeoutMs: 11000,
      onMessage: clientMessage,
      onOpen: () => {
        client.send({ type: "hello", name: handle, pin: roomPin, protocol: PROTOCOL_VERSION, rejoinToken: storedRejoin });
        setLobbyStatus(t("net.handshake"), "jade");
      },
      onClose: () => {
        if (net?.rejected) { net = null; return; }
        if (net?.role === "client" && net.client === client) handleHostLost();
      },
      onError: ({ type }) => {
        if (type === "protocol") setLobbyStatus(t("net.versionMismatch", { version: PROTOCOL_VERSION }), "wine");
      },
      onStatus: ({ state: status }) => {
        if (status === "dialing" && token === joinToken) setLobbyStatus(t("net.connecting"), "wine");
      }
    });
    net = { role: "client", client, code: normalized, name: handle, pin: roomPin, seq: 0, started: false, rejected: false };
    return client;
  };
  const autoMic = prefs.autoAudio ? preloadAudio() : null;
  try {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      if (token !== joinToken) return;
      makeClient();
      try {
        await client.connect();
        if (token !== joinToken) return;
        if (autoMic) {
          autoMic.then((stream) => {
            if (stream && token === joinToken && isClient()) joinAudioWithStream(stream);
            else if (stream && !voice?.joined) releaseAutoAudio();
          });
        }
        savePlayerName(handle);
        if (connectButton) {
          connectButton.disabled = false;
          connectButton.textContent = t("net.connect");
        }
        return;
      } catch (error) {
        const failedClient = client;
        try { failedClient?.close(); } catch { /* ignore */ }
        if (net?.client === failedClient) net = null;
        if (attempt === 1) {
          if (token !== joinToken) return;
          setLobbyStatus(t("net.retrying", { n: 2 }), "");
          await new Promise((resolve) => setTimeout(resolve, 800));
          continue;
        }
        const type = error?.code || error?.type || error?.message || "unknown";
        lastNetError = type;
        lastNetStage = error?.stage || "";
        if (type === "peer-unavailable") setLobbyStatus(t("net.roomNotFound"), "wine");
        else if (type === "broker-timeout") setLobbyStatus(t("net.brokerTimeout"), "wine");
        else if (type === "host-timeout") setLobbyStatus(t("net.hostTimeout"), "wine");
        else if (type === "ice-failed") setLobbyStatus(t("net.iceFailed"), "wine");
        else setLobbyStatus(t("net.joinFailed", { error: type }), "wine");
      }
    }
  } finally {
    if (token === joinToken && connectButton) {
      connectButton.disabled = false;
      if (connectButton.textContent === t("net.connecting")) connectButton.textContent = t("net.retry");
    }
    if (!isNetworked()) releaseAutoAudio();
  }
}

function leaveRoom({ silent = false, keepState = false } = {}) {
  releaseAutoAudio();
  lastHandLayoutSig = "";
  clearTimeout(publishTimer);
  actionToken += 1;
  joinToken += 1;
  const role = net?.role;
  const host = net?.host;
  const client = net?.client;
  const roster = SEAT_PROFILES;
  releaseHostWakeLock();
  if (host) {
    for (const profile of roster || []) {
      if (profile?.kind === "human" && profile.connId) {
        host.send(profile.connId, { type: "closed", reason: "host-left" });
      }
    }
    host.close();
  }
  if (client) client.close();
  if (voice) {
    voice.leave();
    voice.destroy();
    voice = null;
  }
  voiceActive = false;
  clearSpeaking();
  chatHistory = [];
  chatUnread = 0;
  renderChat();
  renderChatBadge();
  roomPinPlain = "";
  clearRoomIntent();
  renderPinReveal();
  denyAllPending("host-left");
  pendingRequests = new Map();
  for (const timer of pendingTimers.values()) clearTimeout(timer);
  pendingTimers.clear();
  net = null;
  SEAT_PROFILES = null;
  MY_SEAT = 0;
  lobbyState = null;
  resumeAvailable = false;
  if (!keepState) {
    state = null;
    renderAll();
  }
  if (!silent) {
    hideAllModals();
    toast(t("toast.netLeft"), "wine");
    audio?.play("click", 0);
  }
  if (role) renderNetChrome();
}

function resumeSavedMatch() {
  if (!state || isNetworked() || !resumeAvailable) return;
  resumeAvailable = false;
  closeLobby();
  if (state.phase === "roundEnd" || state.phase === "matchEnd") {
    showRoundSummary(state.phase === "matchEnd");
  } else {
    renderAll();
    if (scene) scene.sync(state);
  }
  toast(t("toast.resumed"), "jade");
}

function requestLeaveRoom() {
  if (!isNetworked()) {
    showLobby("menu");
    return;
  }
  const body = $("#leaveBody");
  if (body) body.textContent = t(isHost() ? "net.leaveBodyHost" : "net.leaveBodyGuest");
  const modal = $("#leaveModal");
  if (modal) modal.hidden = false;
  audio?.play("click", 0);
}

function backToSolo() {
  leaveRoom({ silent: true });
  closeLobby();
  beginMatch();
  toast(t("toast.solo"), "jade");
}

function setLobbyStatus(text, tone = "") {
  const node = $("#lobbyStatus");
  if (node) {
    node.textContent = text;
    node.dataset.tone = tone;
  }
  const wait = $("#lobbyWaitStatus");
  if (wait) {
    wait.textContent = text;
    wait.dataset.tone = tone;
  }
  if (lobbyState) lobbyState.status = text;
}

function savePlayerName(name) {
  try { localStorage.setItem(PLAYER_NAME_KEY, name); } catch { /* ignore */ }
}

function loadPlayerName() {
  try { return localStorage.getItem(PLAYER_NAME_KEY) || ""; } catch { return ""; }
}

function saveRoomIntent(intent) {
  try {
    if (!intent || intent.role !== "guest") { sessionStorage.removeItem(ROOM_INTENT_KEY); return; }
    const code = normalizeRoomCode(intent.code || "");
    if (!code) return;
    sessionStorage.setItem(ROOM_INTENT_KEY, JSON.stringify({ role: "guest", code, name: cleanGuestName(intent.name || "", "") }));
  } catch { /* storage may be denied */ }
}

function loadRoomIntent() {
  try {
    const raw = sessionStorage.getItem(ROOM_INTENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.role !== "guest") return null;
    const code = normalizeRoomCode(parsed.code || "");
    if (!code) return null;
    return { role: "guest", code, name: cleanGuestName(parsed.name || "", "") };
  } catch { return null; }
}

function clearRoomIntent() {
  try { sessionStorage.removeItem(ROOM_INTENT_KEY); } catch { /* ignore */ }
  clearRejoinSeat();
}

function saveRejoinSeat(info) {
  try {
    if (!info?.token) return;
    const code = normalizeRoomCode(info.code || "");
    if (!code) return;
    sessionStorage.setItem(REJOIN_KEY, JSON.stringify({
      code,
      seat: Number(info.seat) || 0,
      token: String(info.token),
      name: cleanGuestName(info.name || "", "")
    }));
  } catch { /* storage may be denied */ }
}

function loadRejoinSeat(code) {
  try {
    const normalized = normalizeRoomCode(code || "");
    const parsed = JSON.parse(sessionStorage.getItem(REJOIN_KEY) || "null");
    if (!parsed || parsed.code !== normalized || !parsed.token) return null;
    return { code: normalized, seat: Number(parsed.seat) || 0, token: String(parsed.token), name: cleanGuestName(parsed.name || "", "") };
  } catch { return null; }
}

function clearRejoinSeat() {
  try { sessionStorage.removeItem(REJOIN_KEY); } catch { /* ignore */ }
}

function renderRuleSelects() {
  const target = $("#targetSelect");
  if (target) target.value = String(prefs.target);
  const direction = $("#directionSelect");
  if (direction) direction.value = prefs.direction;
  const mode = $("#modeSelect");
  if (mode) mode.value = prefs.mode;
}

function renderVersion() {
  const label = `v${APP.version}`;
  const chip = $("#versionChip");
  if (chip) chip.textContent = label;
  const brandVersion = $("#brandVersion");
  if (brandVersion) brandVersion.textContent = `(${label})`;
  document.querySelector(".brand")?.setAttribute("data-version", label);
  $$(".version-label").forEach((node) => { node.textContent = label; });
  const action = availableVersion ? t("version.updateTo", { version: availableVersion }) : t("version.reload");
  $$("[data-version-label]").forEach((node) => { node.textContent = action; });
  const pillAction = availableVersion ? t("version.updateShort", { version: availableVersion }) : t("version.update");
  $$("[data-update-label]").forEach((node) => { node.textContent = pillAction; });
  $$(".update-pill").forEach((button) => button.classList.toggle("is-update", Boolean(availableVersion)));
  const dot = $("#updateDot");
  if (dot) dot.hidden = !availableVersion;
  $$(".version-reload-big").forEach((button) => {
    button.classList.toggle("is-update", Boolean(availableVersion));
    button.title = availableVersion
      ? t("version.updateAvailable", { version: availableVersion })
      : t("version.reloadHint");
  });
}

function versionCheckDue(force = false) {
  if (force) return true;
  try {
    const parsed = JSON.parse(localStorage.getItem(VERSION_CHECK_KEY) || "null");
    if (!parsed?.at) return true;
    return Date.now() - Number(parsed.at) >= VERSION_CHECK_MS;
  } catch { return true; }
}

function markVersionCheck() {
  try {
    localStorage.setItem(VERSION_CHECK_KEY, JSON.stringify({ at: Date.now(), version: APP.version }));
  } catch { /* ignore */ }
}

/* Only the launch menu auto-reloads: no room, no match, page visible. */
function canAutoReload() {
  const modal = $("#lobbyModal");
  return !isNetworked()
    && !document.hidden
    && Boolean(modal)
    && !modal.hidden
    && (lobbyState?.view || "menu") === "menu";
}

function autoReloadFor(version) {
  try {
    if (sessionStorage.getItem(AUTO_RELOAD_KEY) === version) return false;
    sessionStorage.setItem(AUTO_RELOAD_KEY, version);
  } catch { /* storage may be denied; still reload once via the in-memory guard */ }
  const text = $("#updateText");
  const banner = $("#updateBanner");
  if (text) text.textContent = t("version.autoUpdating", { version });
  if (banner) banner.hidden = false;
  setTimeout(() => {
    if (!canAutoReload()) {
      if (text) text.textContent = t("version.updateAvailable", { version });
      if (banner) banner.hidden = false;
      return;
    }
    forceReload();
  }, 900);
  return true;
}

function forceReload() {
  if (isNetworked() && !window.confirm(t("version.reloadConfirm"))) return;
  try {
    const url = new URL(location.href);
    url.searchParams.set("v", String(Date.now()));
    url.searchParams.delete("pin");
    location.replace(url.toString());
  } catch {
    location.reload();
  }
}

function isNewerVersion(candidate, current) {
  const a = String(candidate).split(".").map(Number);
  const b = String(current).split(".").map(Number);
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    const av = a[index] || 0;
    const bv = b[index] || 0;
    if (av !== bv) return av > bv;
  }
  return false;
}

async function checkForUpdate({ force = false } = {}) {
  if (!versionCheckDue(force)) return;
  markVersionCheck();
  try {
    const response = await fetch(`state.json?ts=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return;
    const data = await response.json();
    if (!data?.version || !isNewerVersion(data.version, APP.version)) return;
    const hadVersion = Boolean(availableVersion);
    availableVersion = data.version;
    renderVersion();
    if (canAutoReload() && autoReloadFor(data.version)) return;
    if (!hadVersion && isNetworked()) toast(t("version.updateAvailable", { version: data.version }), "gold");
    const banner = $("#updateBanner");
    const text = $("#updateText");
    if (text) text.textContent = t("version.updateAvailable", { version: data.version });
    if (banner) banner.hidden = false;
  } catch { /* offline or blocked */ }
}

function preferredPlayerName() {
  const menu = $("#lobbyPlayerName")?.value || "";
  const join = $("#lobbyNameInput")?.value || "";
  return (menu || join || loadPlayerName()).trim().slice(0, 18);
}

function preferredPin() {
  return normalisePin($("#lobbyPinInput")?.value || "");
}

function extractPasscode(text) {
  const source = String(text || "");
  const match = source.match(/(?:pass(?:code)?|pin|รหัส(?:ผ่าน)?)\s*[:：=]\s*([^\s]+)/i);
  if (match) return normalisePin(match[1]);
  const bare = source.match(/(?:^|\D)(\d{5})(?:\D|$)/);
  return bare ? bare[1] : "";
}

async function pasteInvite() {
  const codeField = $("#lobbyCodeInput");
  if (!codeField) return;
  let text = "";
  try {
    text = await navigator.clipboard.readText();
  } catch {
    toast(t("net.pasteInviteFailed"), "wine");
    codeField.focus();
    return;
  }
  const code = normalizeRoomCode(text);
  const pin = extractPasscode(text);
  if (!code && !pin) {
    toast(t("net.pasteInviteFailed"), "wine");
    codeField.focus();
    return;
  }
  if (code) {
    codeField.value = formatRoomCode(code);
    codeField.dispatchEvent(new Event("input", { bubbles: true }));
    saveRoomIntent({ role: "guest", code, name: $("#lobbyNameInput")?.value || "" });
  }
  const pinField = $("#lobbyPinInput");
  if (pin && pinField) {
    pinField.value = pin;
    pinField.dispatchEvent(new Event("input", { bubbles: true }));
  }
  toast(t("net.pasteInviteDone"), "jade");
  if (code && pin) $("#lobbyConnectBtn")?.focus();
  else if (code) ($("#lobbyPinInput") || $("#lobbyNameInput"))?.focus();
  else codeField.focus();
}

async function pastePasscode() {
  const field = $("#lobbyPinInput");
  if (!field) return;
  try {
    const text = await navigator.clipboard.readText();
    const pin = extractPasscode(text);
    if (!pin) {
      toast(t("net.pinPasteFailed"), "wine");
      field.focus();
      return;
    }
    field.value = pin;
    field.dispatchEvent(new Event("input", { bubbles: true }));
    toast(t("net.pinPasted"), "jade");
    field.focus();
  } catch {
    toast(t("net.pinPasteFailed"), "wine");
    field.focus();
  }
}

function lobbyRosterHTML(players, options = {}) {
  const preview = options.preview !== false;
  return SEATS.map((seat) => {
    const player = players?.[seat.id];
    const empty = !player || (!player.kind && !player.name);
    const kind = empty && preview ? "bot" : player?.kind || "empty";
    const connected = player?.connected !== false;
    const label = kind === "host" ? t("net.hostBadge") : kind === "human" ? t("net.guestBadge") : kind === "bot" ? t("net.botBadge") : t("net.emptySeat");
    const name = empty && preview ? t("net.botPreview", { n: seat.id + 1 }) : player?.name || t("net.emptySeat");
    return `<div class="lobby-seat ${kind} ${connected ? "" : "offline"} ${speakingSeats.has(seat.id) ? "speaking" : ""}" data-seat="${seat.id}">
      <span class="lobby-wind">${seat.wind}</span>
      <span class="lobby-seat-copy"><strong>${escapeHTML(name)}</strong><small>${escapeHTML(label)}</small></span>
      <span class="lobby-dot" aria-hidden="true"></span>
    </div>`;
  }).join("");
}

function renderPending() {
  const list = $("#lobbyPending");
  if (!list) return;
  const entries = pendingList();
  list.innerHTML = entries.length
    ? entries.map((request) => `
      <div class="pending-row" data-conn="${escapeHTML(request.connId)}">
        <span class="pending-name">${escapeHTML(request.name)}</span>
        <time>${escapeHTML(chatClock(request.at))}</time>
        <button class="mini-btn approve" type="button" data-approve data-i18n="net.approve">${escapeHTML(t("net.approve"))}</button>
        <button class="mini-btn deny" type="button" data-deny data-i18n="net.deny">${escapeHTML(t("net.deny"))}</button>
      </div>`).join("")
    : `<span class="pending-empty">${escapeHTML(t("net.pendingEmpty"))}</span>`;
  const approveAll = $("#lobbyApproveAll");
  if (approveAll) approveAll.hidden = entries.length === 0;
  const pendingBlock = $("#hostPendingBlock");
  if (pendingBlock) pendingBlock.hidden = entries.length === 0;
  const status = $("#hostSecurityStatus");
  if (status && isHost() && net?.security) {
    status.textContent = net.security.pinSet ? t("net.pinAuto") : t("net.pinApprovalOnly");
  }
  const approval = $("#hostApproval");
  if (approval && isHost() && net?.security) approval.checked = Boolean(net.security.approval);
}

function updateLobbyScrollState() {
  $$(".lobby-view").forEach((view) => {
    if (!view || view.hidden) return;
    view.classList.toggle("is-scrollable", view.scrollHeight > view.clientHeight + 4);
  });
}

function renderLobby() {
  const modal = $("#lobbyModal");
  if (!modal) return;
  const view = lobbyState?.view || "menu";
  modal.dataset.view = view;
  renderAutoAudio();
  const views = { menu: $("#lobbyMenu"), host: $("#lobbyHostPanel"), join: $("#lobbyJoinPanel"), waiting: $("#lobbyWaitPanel"), lost: $("#lobbyWaitPanel") };
  Object.entries(views).forEach(([key, node]) => {
    if (node) node.hidden = key !== view;
  });
  if (view === "menu") {
    if ($("#lobbyTitle")) $("#lobbyTitle").textContent = t("net.launchTitle");
    const resume = $("#lobbyResumeSaved");
    if (resume) {
      const canResume = Boolean(resumeAvailable && state && !isNetworked());
      resume.hidden = !canResume;
      if (canResume) {
        const meta = $("#lobbyResumeMeta");
        if (meta) meta.textContent = t("net.resumeMeta", {
          round: state.round,
          trick: state.trick,
          score: state.scores[MY_SEAT]
        });
      }
    }
    requestAnimationFrame(updateLobbyScrollState);
    return;
  }
  const started = Boolean(net?.started);
  const title = $("#lobbyTitle");
  if (title) {
    title.textContent = view === "host" ? (started ? t("net.matchInProgress") : t("net.hostTitle"))
      : view === "join" ? t("net.joinTitle")
      : view === "lost" ? t("net.lostTitle")
      : view === "waiting" ? t("net.waitingHost")
      : t("net.launchTitle");
  }
  const players = lobbyState?.players || [];
  const code = lobbyState?.roomCode || net?.code || "";
  const formatted = code ? formatRoomCode(code) : "—";
  const humans = (SEAT_PROFILES || []).filter((profile) => profile && (profile.kind === "host" || profile.kind === "human") && profile.connected).length;
  const canStart = view === "host" ? humans >= 2 && !started : Boolean(lobbyState?.canStart);

  if ($("#lobbyRoomCode")) $("#lobbyRoomCode").textContent = formatted;
  const invite = code ? inviteUrl(code) : "";
  if ($("#lobbyInvite")) {
    $("#lobbyInvite").value = invite;
    $("#lobbyInvite").hidden = true;
  }
  if ($("#lobbyRoster")) $("#lobbyRoster").innerHTML = lobbyRosterHTML(SEAT_PROFILES || players);
  if ($("#lobbyWaitCode")) $("#lobbyWaitCode").textContent = formatted;
  if ($("#lobbyWaitRoster")) $("#lobbyWaitRoster").innerHTML = lobbyRosterHTML(SEAT_PROFILES || players);
  if ($("#lobbyWaitTitle")) {
    $("#lobbyWaitTitle").textContent = view === "lost" ? t("net.lostTitle")
      : view === "waiting" && lobbyState?.pending ? t("net.waitingApproval")
      : view === "waiting" ? t("net.waitingHost")
      : t("net.joinTitle");
  }
  if ($("#lobbyWaitRoster")) $("#lobbyWaitRoster").hidden = Boolean(lobbyState?.pending);
  const start = $("#lobbyStartBtn");
  if (start) {
    start.hidden = started;
    start.disabled = !canStart || started;
    start.textContent = canStart ? t("net.startTable") : t("net.needTwo");
  }
  const hint = $("#lobbyStartHint");
  if (hint) {
    hint.hidden = started;
    hint.textContent = canStart ? t("net.startHint") : t("net.needTwoLong");
  }
  const hostBack = $("#lobbyHostPanel [data-lobby-back]");
  if (hostBack) hostBack.textContent = started ? t("net.leave") : t("net.back");
  const hostListening = $("#hostListening");
  if (hostListening) {
    if (started) hostListening.textContent = t("net.matchInProgress");
    else if (pendingRequests.size) hostListening.textContent = t("net.pendingCount", { n: pendingRequests.size });
    else if (humans >= 2) hostListening.textContent = t("net.readyToStart", { n: humans });
    else if (net?.host?.connectionCount?.() > 0) hostListening.textContent = t("net.guestConnecting");
    else hostListening.textContent = t("net.listening");
  }
  const status = $("#lobbyStatus");
  if (status && lobbyState?.status) status.textContent = lobbyState.status;
  requestAnimationFrame(updateLobbyScrollState);
  const waitStatus = $("#lobbyWaitStatus");
  if (waitStatus && lobbyState?.status) waitStatus.textContent = lobbyState.status;
  const back = $("#lobbyBackBtn");
  if (back) back.hidden = view !== "host" && view !== "join";
  const resume = $("#lobbyResumeBtn");
  if (resume) resume.hidden = !(state && view === "waiting");
  const soloFromLost = $("#lobbySoloFromLost");
  if (soloFromLost) soloFromLost.hidden = !(view === "lost" || view === "join");
  const waitLeave = $("#lobbyWaitLeave");
  if (waitLeave) waitLeave.hidden = view === "lost";
  const copyInfo = $("#lobbyCopyInfo");
  if (copyInfo) {
    copyInfo.disabled = !code;
    copyInfo.textContent = roomPinPlain ? t("net.copyInvitePin") : t("net.copyRoomInfo");
  }
  const share = $("#lobbyShareBtn");
  if (share) share.hidden = !(code && roomPinPlain && typeof navigator.share === "function");
  renderPending();
  renderPinReveal();
}

function showLobby(view = "menu") {
  const modal = $("#lobbyModal");
  if (!modal) return;
  hideAllModals();
  modal.hidden = false;
  if (!lobbyState) lobbyState = { view, players: [], status: "", roomCode: "" };
  lobbyState.view = view;
  const storedName = loadPlayerName();
  for (const selector of ["#lobbyNameInput", "#lobbyPlayerName"]) {
    const field = $(selector);
    if (field && !field.value) field.value = storedName;
  }
  renderLobby();
}

function closeLobby() {
  const modal = $("#lobbyModal");
  if (modal) modal.hidden = true;
}

function isPanelRailMode() {
  return window.matchMedia("(max-width: 1024px)").matches;
}

function setDockCollapsed(collapsed, options = {}) {
  const dock = $("#handDock");
  const button = $("#dockFold");
  if (!dock) return;
  dock.classList.toggle("dock-collapsed", Boolean(collapsed));
  prefs.dockCollapsed = Boolean(collapsed);
  if (button) {
    button.textContent = collapsed ? "手" : "⌄";
    button.setAttribute("aria-expanded", String(!collapsed));
    button.setAttribute("aria-label", collapsed ? t("dock.expand") : t("dock.collapse"));
  }
  if (!options.silent) savePrefs();
}

function expandDock() {
  if (isPanelRailMode() && $("#handDock")?.classList.contains("dock-collapsed")) setDockCollapsed(false);
}

function renderPanelRail() {
  const rail = $("#panelRail");
  if (!rail) return;
  const chatPanel = $("#chatPanel");
  const chatButton = rail.querySelector('[data-panel="chatPanel"]');
  if (chatButton) chatButton.hidden = Boolean(chatPanel?.hidden);
  rail.hidden = !isPanelRailMode();
  if (!isPanelRailMode() && activePanelId) closePanelSheet();
}

function openPanelSheet(id) {
  if (!isPanelRailMode()) return;
  if (activePanelId) closePanelSheet();
  if (id === "chatPanel") {
    chatUnread = 0;
    renderChatBadge();
  }
  const panel = document.getElementById(id);
  if (!panel || panel.hidden) return;
  panelHome = { parent: panel.parentElement, next: panel.nextElementSibling };
  const title = panel.querySelector(".panel-head h2")?.textContent || "";
  const titleNode = $("#panelSheetTitle");
  if (titleNode) titleNode.textContent = title;
  activePanelId = id;
  panel.classList.add("in-sheet");
  $("#panelSheetBody")?.appendChild(panel);
  const sheet = $("#panelSheet");
  if (sheet) sheet.hidden = false;
  document.body.classList.add("panel-sheet-open");
}

function closePanelSheet() {
  if (!activePanelId) return;
  const panel = document.getElementById(activePanelId);
  if (panel) {
    panel.classList.remove("in-sheet");
    if (panelHome?.parent) {
      if (panelHome.next && panelHome.next.parentElement === panelHome.parent) {
        panelHome.parent.insertBefore(panel, panelHome.next);
      } else {
        panelHome.parent.appendChild(panel);
      }
    }
  }
  activePanelId = null;
  panelHome = null;
  const sheet = $("#panelSheet");
  if (sheet) sheet.hidden = true;
  document.body.classList.remove("panel-sheet-open");
}

function renderNetChrome() {
  const chip = $("#netChip");
  if (chip) {
    if (isNetworked()) {
      chip.hidden = false;
      chip.dataset.mode = net.role;
      const compact = window.matchMedia("(max-width: 520px)").matches;
      const code = compact ? `${net.code.slice(0, 3)}-${net.code.slice(3)}` : formatRoomCode(net.code);
      chip.textContent = `${isHost() ? "◉" : "◇"} ${code}`;
      chip.title = t("net.chipHint");
    } else {
      chip.hidden = true;
      chip.textContent = "";
    }
  }
  const mode = $("#modeChip");
  if (mode) {
    mode.textContent = isNetworked() ? (isHost() ? t("net.modeHost") : t("net.modeClient")) : t("net.modeSolo");
  }
  const undo = $("#undoBtn");
  if (undo && isClient()) undo.disabled = true;
  const leave = $("#leaveRoomBtn");
  if (leave) leave.hidden = !isNetworked();
  const leaveTop = $("#leaveRoomTopBtn");
  if (leaveTop) leaveTop.hidden = !isNetworked();
  const chatPanel = $("#chatPanel");
  if (chatPanel) chatPanel.hidden = !isNetworked();
  const chatTool = $("#chatToolBtn");
  if (chatTool) chatTool.hidden = !isNetworked();
  const voiceCall = $("#voiceCallBtn");
  if (voiceCall) voiceCall.hidden = !isNetworked();
  renderChatBadge();
  renderPanelRail();
}

async function copyText(text, message) {
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    toast(message, "jade");
    return true;
  } catch {
    const field = $("#lobbyInvite");
    if (field) {
      field.hidden = false;
      field.value = text;
      field.focus();
      field.select();
      try {
        if (document.execCommand("copy")) {
          toast(message, "jade");
          return true;
        }
      } catch { /* fall through */ }
    }
    toast(text);
    return false;
  }
}

async function copyInvite() {
  const code = lobbyState?.roomCode || net?.code;
  if (!code) return;
  await copyText(inviteUrl(code), t("toast.netCopied"));
}

function setPinInfo(open) {
  const panel = $("#pinInfoPanel");
  const button = $("#hostPinInfo");
  if (!panel || !button) return;
  panel.hidden = !open;
  button.setAttribute("aria-expanded", String(open));
  button.classList.toggle("active", open);
}

function renderPinReveal() {
  const ready = $("#hostPinReady");
  const value = $("#hostPinValue");
  if (!ready || !value) return;
  ready.hidden = !roomPinPlain;
  value.textContent = roomPinPlain || "";
}

async function copyPin() {
  if (!roomPinPlain) return;
  await copyText(roomPinPlain, t("net.pinCopied"));
}

function roomInfoText() {
  if (!isHost() || !net) return "";
  const code = formatRoomCode(net.code);
  return [
    "Leab-Tui 3D table",
    `Room number: ${code}`,
    roomPinPlain ? `PIN: ${roomPinPlain}` : "PIN: none — host approval still applies",
    `Link: ${inviteUrl(net.code)}`,
    roomPinPlain
      ? "Open the link, enter your name and the PIN, then wait for the host to approve you."
      : "Open the link, enter your name, then wait for the host to approve you.",
    net.security?.approval ? "The host approves each guest before a seat is assigned." : ""
  ].filter(Boolean).join("\n");
}

async function copyRoomInfo() {
  const text = roomInfoText();
  if (!text) return;
  const ok = await copyText(text, t(roomPinPlain ? "net.roomInfoCopied" : "net.roomInfoNoPin"));
  if (!ok) toast(text.split("\n").slice(0, 3).join(" · "));
}

async function shareRoomInfo() {
  const text = roomInfoText();
  if (!text) return;
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title: "Leab-Tui 3D table", text });
      return;
    } catch (error) {
      if (error?.name === "AbortError") return;
    }
  }
  await copyRoomInfo();
}

async function probeRoom(code, pin = "") {
  const normalized = normalizeRoomCode(code);
  if (!normalized) throw new Error("bad-code");
  return new Promise((resolve, reject) => {
    let client = null;
    let settled = false;
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      try { client?.close(); } catch { /* ignore */ }
      fn(value);
    };
    client = new PeerClient({
      code: normalized,
      name: "diagnostics",
      connectTimeoutMs: 9000,
      onOpen: () => client.send({ type: "probe", pin: normalisePin(pin) }),
      onMessage: ({ message }) => {
        if (message.type === "probe-result") finish(resolve, message);
      },
      onError: ({ type }) => {
        if (type === "peer-unavailable") finish(reject, Object.assign(new Error("host-unavailable"), { code: "peer-unavailable" }));
      }
    });
    client.connect().catch((error) => finish(reject, error));
    setTimeout(() => finish(reject, Object.assign(new Error("probe-timeout"), { code: "probe-timeout" })), 16000);
  });
}

function diagnosticsText() {
  const role = net?.role || "none";
  const code = normalizeRoomCode($("#lobbyCodeInput")?.value || net?.code || "");
  const selfPeer = isHost() ? net?.host?.id : net?.client?.peer?.id;
  const hostPeer = isHost() ? net?.host?.id : net?.client?.hostId;
  return [
    `Version: ${APP.version}`,
    `URL: ${location.href}`,
    `Secure context: ${window.isSecureContext}`,
    `PeerJS: ${window.Peer ? "loaded" : "not loaded"}`,
    `Role: ${role}`,
    `Room: ${code ? formatRoomCode(code) : "—"}`,
    `Self peer: ${selfPeer || "—"}`,
    `Host peer: ${hostPeer || "—"}`,
    `Connections: ${isHost() && net?.host?.connectionCount ? net.host.connectionCount() : "—"}`,
    `Pending: ${isHost() ? pendingRequests.size : "—"}`,
    `Last error: ${lastNetError || "none"}`,
    `Last stage: ${lastNetStage || "none"}`,
    `Room intent: ${loadRoomIntent()?.code ? formatRoomCode(loadRoomIntent().code) : "none"}`
  ].join("\n");
}

function openDiagnostics() {
  const body = $("#diagBody");
  if (body) body.textContent = diagnosticsText();
  const status = $("#diagStatus");
  if (status) status.textContent = "";
  const guest = isClient() || (!net && normalizeRoomCode($("#lobbyCodeInput")?.value || ""));
  const code = normalizeRoomCode($("#lobbyCodeInput")?.value || net?.code || "");
  const pinButton = $("#diagProbePin");
  const noPinButton = $("#diagProbeNoPin");
  if (pinButton) pinButton.disabled = !guest || !code;
  if (noPinButton) noPinButton.disabled = !guest || !code;
  const modal = $("#diagModal");
  if (modal) modal.hidden = false;
}

async function runProbe(withPin) {
  const status = $("#diagStatus");
  const code = normalizeRoomCode($("#lobbyCodeInput")?.value || net?.code || "");
  if (!code) {
    if (status) status.textContent = t("diag.noCode");
    return;
  }
  if (status) status.textContent = t("diag.probing");
  try {
    const result = await probeRoom(code, withPin ? preferredPin() : "");
    lastNetError = result.pinAccepted ? "" : "bad-pin";
    const text = t("diag.reachable", {
      required: result.pinRequired ? "yes" : "no",
      accepted: result.pinAccepted ? "yes" : "no",
      approval: result.approval ? "yes" : "no",
      started: result.started ? "yes" : "no",
      seats: result.seatsFree
    });
    if (status) status.textContent = text;
    const body = $("#diagBody");
    if (body) body.textContent = `${diagnosticsText()}\nProbe: ${JSON.stringify(result)}`;
  } catch (error) {
    const type = error?.code || error?.type || error?.message || "unknown";
    lastNetError = type;
    if (status) status.textContent = t("diag.unreachable", { error: type });
  }
}

async function generateRoomPin() {
  if (!isHost() || !net) return;
  const pin = generatePin();
  const ok = await setRoomPin(pin);
  if (ok) {
    toast(t("net.pinAuto"), "jade");
    renderPinReveal();
  }
}

function renderNetChip() {
  renderNetChrome();
}

function normaliseChat(value) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, 200);
}

function chatClock(at) {
  try {
    return new Date(at).toLocaleTimeString(LANG === "th" ? "th-TH" : "en-US", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

let draftSelection = [];
let draftSig = "";
let draftSent = false;

function setDraftMode(enabled) {
  if (isClient()) {
    toast(t("net.hostOnly"));
    return false;
  }
  prefs.draftMode = Boolean(enabled);
  if (state) state.draftMode = prefs.draftMode;
  savePrefs();
  if (isHost()) saveMatch();
  renderDraft();
  toast(t(state?.phase === "draft"
    ? "draft.toggleToast"
    : (prefs.draftMode ? "draft.onToast" : "draft.offToast")), "jade");
  return true;
}

function renderDraft() {
  const modal = $("#draftModal");
  if (!modal) return;
  const mode = state ? state.draftMode === true : prefs.draftMode === true;
  $$("[data-draft-toggle]").forEach((input) => { input.checked = mode; });
  const wrap = $("#draftToggleWrap");
  if (wrap) wrap.hidden = isClient();
  const chip = $("#draftChip");
  if (chip) {
    chip.hidden = isClient() || !state;
    chip.textContent = t(mode ? "draft.chipOn" : "draft.chipOff");
    chip.title = t("draft.chipTitle");
    chip.setAttribute("aria-pressed", String(mode));
  }
  if (!state || state.phase !== "draft") {
    draftSelection = [];
    draftSig = "";
    modal.hidden = true;
    return;
  }
  const humanTurn = state.turn === MY_SEAT && !draftSent;
  const sig = `${state.turn}:${state.draftCycle}:${state.draftIndex}:${state.hands[MY_SEAT]?.length ?? 0}`;
  if (sig !== draftSig) {
    draftSig = sig;
    draftSelection = [];
    draftSent = false;
  }
  modal.hidden = false;
  const meta = $("#draftMeta");
  if (meta) {
    meta.textContent = humanTurn
      ? t("draft.metaYou", {
        n: state.hands[MY_SEAT]?.length ?? 0,
        step: Math.min(state.draftCycle + 1, 4),
        pool: state.draftPool?.length ?? 0
      })
      : t("draft.waiting", { seat: seatName(state.turn) });
  }
  const pool = $("#draftPool");
  if (pool) {
    pool.innerHTML = (state.draftPool || []).map((tile) => (
      `<button type="button" class="draft-tile ${tile.color === "r" ? "red" : "black"} ${draftSelection.includes(tile.id) ? "selected" : ""}" data-draft-id="${tile.id}" ${humanTurn ? "" : "disabled"}>${tile.hanzi}</button>`
    )).join("");
  }
  const confirm = $("#draftConfirm");
  if (confirm) {
    confirm.disabled = !humanTurn || draftSelection.length !== 2;
    confirm.textContent = state.turn === MY_SEAT
      ? (draftSent ? t("draft.waitingShort") : t("draft.confirm"))
      : t("draft.waitingShort");
  }
}

function renderChat() {
  const list = $("#chatList");
  if (!list) return;
  if (!chatHistory.length) {
    list.innerHTML = `<li class="chat-empty">${escapeHTML(t("chat.empty"))}</li>`;
    return;
  }
  list.innerHTML = chatHistory.slice(-60).map((entry) => `
    <li class="chat-item ${entry.seat === MY_SEAT ? "self" : ""}">
      <div class="chat-meta"><b>${escapeHTML(entry.name || seatName(entry.seat))}</b><time>${escapeHTML(chatClock(entry.at))}</time></div>
      <p>${escapeHTML(entry.text)}</p>
    </li>`).join("");
  list.scrollTop = list.scrollHeight;
}

function appendChat(entry) {
  if (!entry || !entry.text) return;
  const seat = Number(entry.seat) || 0;
  chatHistory.push({
    seat,
    name: String(entry.name || "").slice(0, 18),
    text: normaliseChat(entry.text),
    at: Number(entry.at) || Date.now()
  });
  if (chatHistory.length > 80) chatHistory = chatHistory.slice(-80);
  renderChat();
  if (seat !== MY_SEAT && !chatIsVisible()) {
    chatUnread += 1;
    renderChatBadge();
  }
}

function chatIsVisible() {
  const panel = $("#chatPanel");
  if (!chatOpen || !panel || panel.hidden) return false;
  if (isPanelRailMode()) return activePanelId === "chatPanel";
  return true;
}

function renderChatBadge() {
  const badge = $("#chatBadge");
  if (badge) {
    badge.hidden = chatUnread <= 0;
    badge.textContent = chatUnread > 9 ? "9+" : String(chatUnread);
  }
  const railButton = document.querySelector('.panel-orb[data-panel="chatPanel"]');
  railButton?.classList.toggle("has-unread", chatUnread > 0);
}

function openChat() {
  if (!isNetworked()) {
    showLobby("menu");
    return;
  }
  chatUnread = 0;
  renderChatBadge();
  if (isPanelRailMode()) {
    openPanelSheet("chatPanel");
    return;
  }
  setChatOpen(true);
  const panel = $("#chatPanel");
  panel?.scrollIntoView({ behavior: "smooth", block: "center" });
  setTimeout(() => $("#chatInput")?.focus(), 220);
}

function hostChat(seat, text) {
  const entry = { seat, name: seatName(seat), text, at: Date.now() };
  appendChat(entry);
  if (!isHost() || !net?.host) return;
  for (const profile of SEAT_PROFILES || []) {
    if (profile?.kind === "human" && profile.connId) net.host.send(profile.connId, { type: "chat", entry });
  }
}

function sendChat(value) {
  const text = normaliseChat(value);
  if (!text || !isNetworked()) return false;
  if (isClient()) return net.client.send({ type: "chat", text });
  hostChat(MY_SEAT, text);
  return true;
}

function setChatOpen(open) {
  chatOpen = Boolean(open);
  prefs.chatOpen = chatOpen;
  savePrefs();
  if (chatOpen) {
    chatUnread = 0;
    renderChatBadge();
  }
  const body = $("#chatBody");
  if (body) body.hidden = !chatOpen;
  const button = $("#chatToggle");
  if (button) {
    button.textContent = t(chatOpen ? "chat.hide" : "chat.show");
    button.setAttribute("aria-expanded", String(chatOpen));
  }
}

function currentVoicePeer() {
  if (isHost()) return net?.host?.peer || null;
  if (isClient()) return net?.client?.peer || null;
  return null;
}

function currentVoicePeerId() {
  if (isHost()) return net?.host?.id || null;
  if (isClient()) return net?.client?.peer?.id || null;
  return null;
}

function voicePeers() {
  if (!SEAT_PROFILES) return [];
  return SEAT_PROFILES
    .filter((profile) => profile && (profile.kind === "host" || profile.kind === "human") && profile.peerId)
    .map((profile) => ({
      seat: profile.seat,
      name: profile.name,
      peerId: profile.peerId,
      active: Boolean(profile.voice)
    }));
}

function ensureVoice() {
  if (voice) return voice;
  voice = new VoiceChat({
    onState: renderVoiceState,
    onSpeaking: setSpeaking,
    onError: (error) => {
      const denied = error?.name === "NotAllowedError" || error?.name === "SecurityError";
      const text = denied ? t("voice.denied") : t("voice.error", { error: error?.name || error?.message || "unknown" });
      const node = $("#voiceState");
      if (node) node.textContent = text;
      toast(text, "wine");
    }
  });
  return voice;
}

let autoAudioStream = null;
let autoAudioRequest = null;

function preloadAudio() {
  if (!prefs.autoAudio || voice?.joined) return null;
  if (autoAudioStream) return Promise.resolve(autoAudioStream);
  if (autoAudioRequest) return autoAudioRequest;
  if (!navigator.mediaDevices?.getUserMedia) return null;
  /* getUserMedia needs a gesture; skip silent auto-join links rather than
     showing a permission prompt the browser will refuse. */
  if (navigator.userActivation && navigator.userActivation.isActive === false) return null;
  autoAudioRequest = navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    video: false
  }).then((stream) => {
    autoAudioStream = stream;
    autoAudioRequest = null;
    return stream;
  }).catch((error) => {
    autoAudioRequest = null;
    if (error?.name !== "NotAllowedError" && error?.name !== "AbortError") {
      toast(t("voice.unavailable"), "wine");
    }
    return null;
  });
  return autoAudioRequest;
}

function joinAudioWithStream(stream) {
  if (!stream || voice?.joined || !isNetworked()) return false;
  const engine = ensureVoice();
  engine.attach({
    peer: currentVoicePeer(),
    selfPeerId: currentVoicePeerId(),
    selfSeat: MY_SEAT
  });
  engine.setPeers(voicePeers());
  const joined = engine.joinWithStream(stream);
  if (joined) autoAudioStream = stream;
  return joined;
}

function releaseAutoAudio() {
  if (autoAudioStream && !voice?.joined) {
    for (const track of autoAudioStream.getTracks()) {
      try { track.stop(); } catch { /* ignore */ }
    }
  }
  autoAudioStream = null;
  autoAudioRequest = null;
}

function renderAutoAudio() {
  $$("[data-auto-audio]").forEach((input) => {
    input.checked = prefs.autoAudio !== false;
  });
}

function joinVoice() {
  if (!isNetworked() || voiceJoining || voice?.joined) return;
  voiceJoining = true;
  renderVoiceState(voice?.snapshot?.() || { joined: false });
  const engine = ensureVoice();
  engine.attach({
    peer: currentVoicePeer(),
    selfPeerId: currentVoicePeerId(),
    selfSeat: MY_SEAT
  });
  engine.setPeers(voicePeers());
  return Promise.resolve(engine.join()).finally(() => {
    voiceJoining = false;
    renderVoiceState(engine.snapshot());
  });
}

function syncVoicePeers() {
  if (!isNetworked()) return;
  const engine = ensureVoice();
  engine.attach({
    peer: currentVoicePeer(),
    selfPeerId: currentVoicePeerId(),
    selfSeat: MY_SEAT
  });
  engine.setPeers(voicePeers());
  renderVoiceState(engine.snapshot());
}

function renderVoiceState(state) {
  const wasActive = voiceActive;
  voiceActive = Boolean(state?.joined);
  const join = $("#voiceJoinBtn");
  const mic = $("#micBtn");
  const deafen = $("#deafenBtn");
  const leave = $("#voiceLeaveBtn");
  if (join) join.hidden = voiceActive;
  if (mic) {
    mic.disabled = !voiceActive;
    mic.setAttribute("aria-pressed", String(Boolean(state?.micMuted)));
    const label = mic.querySelector("span");
    if (label) label.textContent = state?.micMuted ? t("voice.micOff") : t("voice.micOn");
  }
  if (deafen) {
    deafen.disabled = !voiceActive;
    deafen.setAttribute("aria-pressed", String(Boolean(state?.deafened)));
    const label = deafen.querySelector("span");
    if (label) label.textContent = state?.deafened ? t("voice.undeafen") : t("voice.deafen");
  }
  if (leave) leave.hidden = !voiceActive;
  const call = $("#voiceCallBtn");
  if (call) {
    call.hidden = !isNetworked();
    call.disabled = voiceJoining;
    call.classList.toggle("is-live", voiceActive && !state?.micMuted);
    call.classList.toggle("is-muted", voiceActive && Boolean(state?.micMuted));
    call.setAttribute("aria-pressed", String(voiceActive ? Boolean(state?.micMuted) : false));
    const callLabel = call.querySelector(".voice-call-label");
    if (callLabel) {
      callLabel.textContent = voiceJoining ? t("voice.connecting")
        : voiceActive ? (state?.micMuted ? t("voice.micMuted") : t("voice.on"))
        : t("voice.joinAudio");
    }
    call.title = voiceActive ? t("voice.callHintLive") : t("voice.callHintJoin");
    call.setAttribute("aria-label", call.title);
  }
  const status = $("#voiceState");
  if (status) {
    if (!voiceActive) status.textContent = t("voice.off");
    else if (state.micMuted && state.deafened) status.textContent = t("voice.allMuted");
    else if (state.micMuted) status.textContent = t("voice.micMuted");
    else if (state.deafened) status.textContent = t("voice.deafened");
    else status.textContent = t("voice.active", { n: state.remotes ?? 0 });
  }
  if (wasActive !== voiceActive && isNetworked()) {
    if (isHost()) {
      if (SEAT_PROFILES?.[0]) SEAT_PROFILES[0].voice = voiceActive;
      sendLobbyToGuests();
      syncVoicePeers();
    } else if (net?.client) {
      net.client.send({ type: "voice-state", active: voiceActive });
    }
  }
}

function setSpeaking(seat, on) {
  const index = Number(seat);
  if (!Number.isInteger(index) || index < 0) return;
  if (on) speakingSeats.add(index);
  else speakingSeats.delete(index);
  for (const node of document.querySelectorAll(`.lobby-seat[data-seat="${index}"], .score-row[data-seat="${index}"]`)) {
    node.classList.toggle("speaking", Boolean(on));
  }
}

function clearSpeaking() {
  for (const seat of [...speakingSeats]) setSpeaking(seat, false);
  speakingSeats.clear();
}

function netSelfTest() {
  const results = [];
  const check = (name, fn) => {
    try {
      const value = fn();
      results.push({ name, pass: Boolean(value), detail: value === true ? "" : String(value) });
    } catch (error) {
      results.push({ name, pass: false, detail: error.message });
    }
  };

  check("room code is six digits", () => {
    const code = makeRoomCode(() => 0.42);
    return /^[0-9]{6}$/.test(code) && code.length === 6;
  });
  check("room code normalization accepts LEAB and separators", () => normalizeRoomCode("leab-482-173") === "482173");
  check("room code rejects an incomplete code", () => normalizeRoomCode("173") === null && normalizeRoomCode("LEAB-ABC-234") === null);
  check("formatted room number is grouped", () => formatRoomCode("482173") === "482-173");
  check("peer id is stable and lowercase", () => peerIdForCode("ABC234") === peerIdForCode("abc-234"));
  check("sanitized state hides another hand", () => {
    if (!state) return "no state";
    const raw = sanitizeForSeat(state, 1);
    const hidden = raw.hands[0].every((id) => isGhostTileId(id));
    const realLeak = raw.hands[0].some((id) => TILE_BY_ID[id]);
    return hidden && !realLeak;
  });
  check("sanitized state keeps the recipient's hand", () => {
    if (!state) return "no state";
    const raw = sanitizeForSeat(state, 1);
    return raw.hands[1].every((id) => TILE_BY_ID[id]);
  });
  check("sanitized state strips host-only maps", () => {
    if (!state) return "no state";
    const raw = sanitizeForSeat(state, 1);
    return !("hiddenTags" in raw) && !("snapshot" in raw);
  });
  check("ghost tiles hydrate and round-trip", () => {
    const ghost = makeGhostTile("ghost-2-3");
    return ghost.hidden === true && ghost.ghostSeat === 2 && tileFromWire(ghost.id).id === "ghost-2-3";
  });
  check("loopback transport carries envelopes", () => {
    const pair = createLoopbackPair();
    let received = null;
    pair.b.onMessage(({ message }) => { received = message; });
    pair.a.send({ type: "ping", at: 1 });
    pair.flush();
    return received?.type === "ping" && received.__leab === PROTOCOL_VERSION;
  });

  return results;
}

/* --------------------------------------------------------------------------
   14. Self-test
   -------------------------------------------------------------------------- */

function selfTest() {
  const results = [];
  const check = (name, fn) => {
    try {
      const value = fn();
      results.push({ name, pass: Boolean(value), detail: value === true ? "" : String(value) });
    } catch (error) {
      results.push({ name, pass: false, detail: error.message });
    }
  };

  check("deck has 32 tiles", () => buildDeck().length === 32 || "count");
  check("16 red and 16 black", () => {
    const deck = buildDeck();
    return deck.filter((tile) => tile.color === "r").length === 16 && deck.filter((tile) => tile.color === "b").length === 16;
  });
  check("rank copies are 1/2/2/2/2/2/5", () => {
    const counts = RANKS.map((rank) => buildDeck().filter((tile) => tile.rank === rank.id && tile.color === "r").length);
    return counts.join(",") === "5,2,2,2,2,2,1";
  });
  check("hierarchy is general to soldier", () => RANKS.slice().reverse().map((rank) => rank.power).join("") === "7654321");

  const tile = (color, power, copy = 0) => ({ id: `${color}-${RANK_BY_POWER[power].id}-${copy}`, rank: RANK_BY_POWER[power].id, power, color, hanzi: color === "r" ? RANK_BY_POWER[power].red : RANK_BY_POWER[power].black });
  check("single detects", () => detectCombo([tile("r", 7)])?.type === "single");
  check("pair detects", () => detectCombo([tile("r", 6), tile("r", 6, 1)])?.type === "pair");
  check("general cannot pair", () => detectCombo([tile("r", 7), tile("r", 7, 1)]) === null);
  check("mixed-colour pair rejected", () => detectCombo([tile("r", 6), tile("b", 6)]) === null);
  check("soldier triple detects", () => detectCombo([tile("r", 1), tile("r", 1, 1), tile("r", 1, 2)])?.type === "triple");
  check("five soldiers detect", () => detectCombo([0, 1, 2, 3, 4].map((copy) => tile("b", 1, copy)))?.type === "quint");

  const sahooBig = detectCombo([tile("r", 7), tile("r", 6), tile("r", 5)]);
  const sahooSmall = detectCombo([tile("b", 4), tile("b", 3), tile("b", 2)]);
  check("big Sa Hoo detects", () => sahooBig?.type === "sahoo" && sahooBig.set === "big");
  check("small Sa Hoo detects", () => sahooSmall?.type === "sahoo" && sahooSmall.set === "small");
  check("big Sa Hoo beats small", () => beats(sahooBig, sahooSmall));
  check("red Sa Hoo beats black big", () => beats(sahooBig, detectCombo([tile("b", 7), tile("b", 6), tile("b", 5)])));

  const seehoo = detectCombo([tile("r", 7), tile("r", 6), tile("r", 6, 1), tile("r", 5)]);
  const seehooLow = detectCombo([tile("b", 7), tile("b", 6), tile("b", 5), tile("b", 5, 1)]);
  check("See Hoo detects duplicated pair", () => seehoo?.type === "seehoo" && seehoo.dup[0] === 6);
  check("See Hoo compares pairs", () => beats(seehoo, seehooLow));
  check("Ngoh Hoo detects", () => detectCombo([tile("r", 7), tile("r", 6), tile("r", 6, 1), tile("r", 5), tile("r", 5, 1)])?.type === "ngohoo");
  check("Lak Hoo detects", () => detectCombo([tile("b", 4), tile("b", 4, 1), tile("b", 3), tile("b", 3, 1), tile("b", 2), tile("b", 2, 1)])?.type === "lakhoo");

  check("red beats black at equal rank", () => {
    const red = detectCombo([tile("r", 4)]);
    const black = detectCombo([tile("b", 4)]);
    return beats(red, black) && !beats(black, red);
  });
  check("equal set cannot overtake", () => {
    const red = detectCombo([tile("r", 4)]);
    const red2 = detectCombo([tile("r", 4, 1)]);
    return !beats(red2, red);
  });

  check("deal gives four hands of eight", () => {
    const deck = shuffle(buildDeck());
    const hands = [[], [], [], []];
    deck.forEach((item, index) => hands[index % 4].push(item));
    return hands.every((hand) => hand.length === 8) && new Set(hands.flat().map((item) => item.id)).size === 32;
  });

  check("scoring table is -2..5 and Chuan 16", () => [0, 1, 2, 3, 4, 5, 6, 7, 8].map(scorePiles).join(",") === "-2,-1,0,1,2,3,4,5,16");

  check("a full simulated round conserves 32 tiles", () => {
    const sim = simulateRound(12345);
    if (sim.capturesTotal !== 32) return `captured ${sim.capturesTotal}`;
    if (sim.tricks < 3) return `only ${sim.tricks} tricks`;
    return true;
  });

  check("i18n keys are symmetrical", () => {
    const en = Object.keys(I18N.en).sort();
    const th = Object.keys(I18N.th).sort();
    const missingTh = en.filter((key) => !th.includes(key));
    const missingEn = th.filter((key) => !en.includes(key));
    return (!missingTh.length && !missingEn.length) || `EN-only ${missingTh.join(",")} | TH-only ${missingEn.join(",")}`;
  });

  check("export payload has app, credits and game", () => {
    const payload = buildExport();
    return Boolean(payload.format && payload.app?.name && payload.credits?.model && payload.game?.scores?.length === 4);
  });

  check("chat text is normalised and bounded", () => (
    normaliseChat("  hello \n  table  ") === "hello table" && normaliseChat("x".repeat(300)).length === 200
  ));

  check("room PIN is exactly five digits", () => (
    normalisePin(" 48-213 ") === "48213"
      && validatePin("48213", { roomCode: "ABC234", name: "Host" }).ok
      && !validatePin("12345").ok
      && !validatePin("00000").ok
      && !validatePin("1234").ok
  ));

  check("invite text extracts the passcode", () => (
    extractPasscode("Join my table\nPIN: 48213\nLink: https://example.test/?room=ABC234") === "48213"
      && extractPasscode("48213") === "48213"
  ));

  for (const result of netSelfTest()) results.push(result);

  return results;
}

function simulateRound(seed = 42) {
  const rng = mulberry32(seed);
  const savedRandom = random;
  random = rng;
  try {
    const deck = shuffle(buildDeck());
    const hands = [[], [], [], []];
    deck.forEach((item, index) => hands[index % 4].push(item));
    let leader = hands.findIndex((hand) => hand.some((item) => item.id === "r-general-0"));
    if (leader < 0) leader = 0;
    let tricks = 0;
    let capturesTotal = 0;
    const safety = 64;
    while (hands[0].length && tricks < safety) {
      tricks += 1;
      const leadCombo = chooseLead(hands[leader], { jitter: false });
      if (!leadCombo) throw new Error("leader had no legal lead");
      let bestCombo = leadCombo;
      const entries = [{ seat: leader, combo: leadCombo, revealed: true }];
      hands[leader] = hands[leader].filter((item) => !leadCombo.tiles.includes(item));
      for (let offset = 1; offset < 4; offset += 1) {
        const seat = (leader + offset) % 4;
        const decision = chooseFollow(hands[seat], leadCombo, bestCombo, { playsLeft: 3 - offset, deterministic: true });
        if (decision.tiles.length !== leadCombo.count) throw new Error("bad follow count");
        hands[seat] = hands[seat].filter((item) => !decision.tiles.includes(item));
        entries.push({ seat, combo: decision.combo, revealed: decision.reveal });
        if (decision.reveal) bestCombo = decision.combo;
      }
      const winner = entries.find((entry) => entry.revealed && entry.combo === bestCombo)?.seat ?? leader;
      capturesTotal += leadCombo.count * 4;
      leader = winner;
    }
    const left = hands.reduce((sum, hand) => sum + hand.length, 0);
    const captures = [0, 0, 0, 0];
    return { tricks, capturesTotal, left, captures };
  } finally {
    random = savedRandom;
  }
}

/* --------------------------------------------------------------------------
   15. Audio
   -------------------------------------------------------------------------- */

class StudioAudio {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.noiseBuffer = null;
    this.enabled = true;
    this.unlocked = false;
    this.playCount = 0;
    this.lastPlayed = null;
  }

  ensure() {
    if (this.ctx) return this.ctx;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return null;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.8;
    this.compressor = this.ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -18;
    this.compressor.knee.value = 20;
    this.compressor.ratio.value = 6;
    this.compressor.attack.value = 0.003;
    this.compressor.release.value = 0.25;
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 256;
    this.master.connect(this.compressor);
    this.compressor.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
    const length = this.ctx.sampleRate * 0.7;
    this.noiseBuffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
    return this.ctx;
  }

  resume() {
    this.unlocked = true;
    const ctx = this.ensure();
    if (ctx && ctx.state === "suspended") ctx.resume();
  }

  noise(duration, filterType, frequency, gainValue, pan = 0, when = 0, sweepTo = null) {
    const ctx = this.ensure();
    if (!ctx || !this.noiseBuffer) return;
    const start = ctx.currentTime + when;
    const source = ctx.createBufferSource();
    source.buffer = this.noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.setValueAtTime(frequency, start);
    if (sweepTo) filter.frequency.exponentialRampToValueAtTime(Math.max(40, sweepTo), start + duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainValue), start + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (panner) panner.pan.value = clamp(pan, -1, 1);
    source.connect(filter);
    filter.connect(gain);
    if (panner) { gain.connect(panner); panner.connect(this.master); } else gain.connect(this.master);
    source.start(start);
    source.stop(start + duration + 0.05);
  }

  tone(frequency, duration, gainValue = 0.08, type = "sine", pan = 0, when = 0, slideTo = null) {
    const ctx = this.ensure();
    if (!ctx) return;
    const start = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(frequency, start);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), start + duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, gainValue), start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    const panner = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (panner) panner.pan.value = clamp(pan, -1, 1);
    osc.connect(gain);
    if (panner) { gain.connect(panner); panner.connect(this.master); } else gain.connect(this.master);
    osc.start(start);
    osc.stop(start + duration + 0.02);
  }

  level() {
    if (!this.analyser) return 0;
    const data = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(data);
    let sum = 0;
    for (let i = 0; i < data.length; i += 1) {
      const value = (data[i] - 128) / 128;
      sum += value * value;
    }
    return Math.sqrt(sum / data.length);
  }

  play(name, seat = 0) {
    if (!prefs.sound || !this.unlocked) return;
    this.playCount += 1;
    this.lastPlayed = name;
    const ctx = this.ensure();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      ctx.resume().then(() => {
        if (ctx.state === "running") this.play(name, seat);
      }).catch(() => {});
      return;
    }
    const pan = seat === 0 ? 0 : seat === 1 ? 0.55 : seat === 3 ? -0.55 : 0;
    switch (name) {
      case "click":
        this.tone(620, 0.045, 0.055, "triangle", pan);
        break;
      case "clack":
        this.noise(0.11, "bandpass", 1750, 0.3, pan);
        this.tone(150, 0.1, 0.18, "sine", pan);
        this.tone(78, 0.16, 0.11, "triangle", pan);
        break;
      case "flip":
        this.noise(0.05, "highpass", 2800, 0.12, pan);
        this.tone(900, 0.04, 0.05, "triangle", pan);
        break;
      case "shuffle":
        for (let i = 0; i < 9; i += 1) {
          this.noise(0.09, "bandpass", 900 + i * 170, 0.11, (i % 3) * 0.3 - 0.3, i * 0.055);
        }
        this.tone(95, 0.3, 0.07, "triangle", 0);
        break;
      case "sweep":
        this.noise(0.45, "bandpass", 380, 0.2, pan, 0, 2600);
        this.tone(220, 0.35, 0.07, "sine", pan, 0, 540);
        break;
      case "celebrate":
        [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((freq, index) => this.tone(freq, 0.3, 0.075, "triangle", pan, index * 0.09));
        this.noise(0.45, "highpass", 4200, 0.05, pan, 0.1);
        break;
      case "win":
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, index) => this.tone(freq, 0.32, 0.09, "triangle", pan, index * 0.075));
        this.noise(0.5, "highpass", 3400, 0.06, pan, 0.05);
        break;
      case "lose":
        [330, 294, 262, 196].forEach((freq, index) => this.tone(freq, 0.3, 0.07, "sine", pan, index * 0.09));
        break;
      case "undo":
        this.tone(440, 0.12, 0.07, "triangle", pan, 0, 300);
        this.tone(300, 0.18, 0.055, "sine", pan, 0.08);
        break;
      default:
        break;
    }
  }
}

/* --------------------------------------------------------------------------
   16. Three.js scene
   -------------------------------------------------------------------------- */

function createCanvasTexture(THREE, draw, size = 512) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  draw(ctx, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function hexToRgba(hex, alpha) {
  const value = parseInt(hex.replace("#", ""), 16);
  const r = (value >> 16) & 255;
  const g = (value >> 8) & 255;
  const b = value & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function makeFeltTexture(THREE, palette) {
  return createCanvasTexture(THREE, (ctx, size) => {
    const gradient = ctx.createRadialGradient(size * 0.5, size * 0.46, 40, size * 0.5, size * 0.5, size * 0.7);
    gradient.addColorStop(0, palette.felt[0]);
    gradient.addColorStop(0.55, palette.felt[1]);
    gradient.addColorStop(1, palette.felt[2]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 9000; i += 1) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const alpha = Math.random() * 0.055;
      ctx.fillStyle = Math.random() > 0.5 ? `rgba(255, 225, 190, ${alpha})` : `rgba(0, 0, 0, ${alpha})`;
      ctx.fillRect(x, y, 1.2, 1.2);
    }

    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.strokeStyle = hexToRgba(palette.ring, 0.22);
    ctx.lineWidth = 2;
    [0.78, 0.70, 0.36, 0.30].forEach((radius) => {
      ctx.beginPath();
      ctx.arc(0, 0, size * radius * 0.5, 0, Math.PI * 2);
      ctx.stroke();
    });
    ctx.strokeStyle = hexToRgba(palette.ring, 0.1);
    ctx.lineWidth = 1;
    for (let i = 0; i < 32; i += 1) {
      const angle = (i / 32) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * size * 0.31, Math.sin(angle) * size * 0.31);
      ctx.lineTo(Math.cos(angle) * size * 0.35, Math.sin(angle) * size * 0.35);
      ctx.stroke();
    }
    ctx.fillStyle = hexToRgba(palette.ring, 0.1);
    ctx.font = `500 ${size * 0.19}px "Iowan Old Style", "Palatino Linotype", "Noto Serif Thai", Georgia, serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("帥", 0, -size * 0.015);
    ctx.font = `600 ${size * 0.035}px "Avenir Next", "Sarabun", sans-serif`;
    ctx.letterSpacing = "8px";
    ctx.fillStyle = hexToRgba(palette.ring, 0.16);
    ctx.fillText("L E A B · T U I", 0, size * 0.135);
    ctx.restore();
  }, 1024);
}

function makeWoodTexture(THREE, palette) {
  return createCanvasTexture(THREE, (ctx, size) => {
    ctx.fillStyle = palette.woodBase;
    ctx.fillRect(0, 0, size, size);
    for (let x = 0; x < size; x += 1) {
      const wave = Math.sin(x * 0.031) * 14 + Math.sin(x * 0.11) * 4;
      const light = 0.1 + 0.09 * Math.sin(x * 0.12 + wave);
      ctx.fillStyle = hexToRgba(palette.woodLight, Math.max(0.02, light));
      ctx.fillRect(x, 0, 1.4, size);
    }
    for (let i = 0; i < 160; i += 1) {
      const y = Math.random() * size;
      ctx.strokeStyle = hexToRgba(palette.woodDark, Math.random() * 0.16);
      ctx.lineWidth = Math.random() * 1.5;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(size * 0.3, y + Math.random() * 20, size * 0.7, y - Math.random() * 20, size, y + Math.random() * 8);
      ctx.stroke();
    }
  }, 1024);
}

function makeTileFaceTexture(THREE, tile) {
  const color = COLORS[tile.color];
  return createCanvasTexture(THREE, (ctx, size) => {
    const r = size * 0.5;
    const gradient = ctx.createRadialGradient(size * 0.36, size * 0.3, size * 0.05, size * 0.5, size * 0.5, r);
    gradient.addColorStop(0, "#fbf1dc");
    gradient.addColorStop(0.55, "#eddcc0");
    gradient.addColorStop(1, "#cfb68c");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < 500; i += 1) {
      ctx.fillStyle = `rgba(96, 60, 28, ${Math.random() * 0.05})`;
      ctx.beginPath();
      ctx.arc(Math.random() * size, Math.random() * size, Math.random() * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.strokeStyle = "rgba(91, 55, 25, 0.62)";
    ctx.lineWidth = size * 0.018;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.445, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(150, 105, 52, 0.45)";
    ctx.lineWidth = size * 0.005;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.405, 0, Math.PI * 2);
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `700 ${size * 0.48}px "Songti SC", "STSong", "Noto Serif SC", "Kaiti SC", serif`;
    ctx.fillStyle = "rgba(255, 250, 236, 0.72)";
    ctx.fillText(tile.hanzi, size * 0.5 + size * 0.008, size * 0.485 + size * 0.012);
    ctx.fillStyle = color.ink;
    ctx.fillText(tile.hanzi, size * 0.5, size * 0.485);

    const pips = tile.power;
    const pipRadius = size * 0.011;
    const gap = size * 0.038;
    const startX = size * 0.5 - ((pips - 1) * gap) / 2;
    for (let i = 0; i < pips; i += 1) {
      ctx.fillStyle = tile.color === "r" ? "rgba(163, 31, 40, 0.75)" : "rgba(32, 26, 24, 0.72)";
      ctx.beginPath();
      ctx.arc(startX + i * gap, size * 0.845, pipRadius, 0, Math.PI * 2);
      ctx.fill();
    }
  }, 512);
}

function makeTileBackTexture(THREE, palette) {
  return createCanvasTexture(THREE, (ctx, size) => {
    const gradient = ctx.createRadialGradient(size * 0.38, size * 0.3, size * 0.04, size * 0.5, size * 0.5, size * 0.55);
    gradient.addColorStop(0, palette.back[0]);
    gradient.addColorStop(0.6, palette.back[1]);
    gradient.addColorStop(1, palette.back[2]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 700; i += 1) {
      ctx.fillStyle = `rgba(0, 0, 0, ${Math.random() * 0.1})`;
      ctx.beginPath();
      ctx.arc(Math.random() * size, Math.random() * size, Math.random() * 2.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.strokeStyle = hexToRgba(palette.ring, 0.68);
    ctx.lineWidth = size * 0.012;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.44, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = size * 0.004;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size * 0.36, 0, Math.PI * 2);
    ctx.stroke();

    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.strokeStyle = hexToRgba(palette.ring, 0.55);
    ctx.lineWidth = size * 0.018;
    ctx.strokeRect(-size * 0.11, -size * 0.11, size * 0.22, size * 0.22);
    ctx.beginPath();
    ctx.arc(0, 0, size * 0.23, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }, 512);
}

function seatVector(seat, radius) {
  const angle = SEATS[seat].angle;
  return { x: Math.sin(angle) * radius, z: Math.cos(angle) * radius };
}

function seatTangent(seat) {
  const angle = SEATS[seat].angle;
  return { x: Math.cos(angle), z: -Math.sin(angle) };
}

function handPosition(seat, index, count) {
  const total = seat === 0
    ? Math.min(1.56, Math.max(0, count - 1) * 0.225)
    : Math.min(1.08, Math.max(0, count - 1) * 0.15);
  const offsetAngle = count > 1 ? (index - (count - 1) / 2) * (total / (count - 1)) : 0;
  const angle = SEATS[seat].angle + offsetAngle;
  const radius = HAND_RADIUS + Math.abs(offsetAngle) * 0.24;
  return {
    x: Math.sin(angle) * radius,
    y: TABLE_Y + TILE_THICKNESS / 2 + 0.012,
    z: Math.cos(angle) * radius,
    angle
  };
}

function centerPosition(seat, index, count) {
  const cols = count <= 3 ? count : count === 4 ? 2 : 3;
  const rows = Math.ceil(count / cols);
  const col = index % cols;
  const row = Math.floor(index / cols);
  const tangentOffset = (col - (cols - 1) / 2) * CENTER_TILE_SPACING;
  const radialOffset = (row - (rows - 1) / 2) * CENTER_TILE_SPACING;
  const base = seatVector(seat, CENTER_RADIUS);
  const tangent = seatTangent(seat);
  const radial = { x: Math.sin(SEATS[seat].angle), z: Math.cos(SEATS[seat].angle) };
  return {
    x: base.x + tangent.x * tangentOffset + radial.x * radialOffset,
    y: TABLE_Y + TILE_THICKNESS / 2 + 0.012,
    z: base.z + tangent.z * tangentOffset + radial.z * radialOffset
  };
}

function captureGroupsFor(game, seat) {
  const pile = game?.captures?.[seat] || [];
  const tricks = game?.captureTrick?.[seat] || [];
  const groups = [];
  pile.forEach((_, index) => {
    const trick = Number.isInteger(tricks[index]) ? tricks[index] : Math.floor(index / 4);
    let last = groups[groups.length - 1];
    if (!last || last.trick !== trick) {
      last = { trick, start: index, count: 0 };
      groups.push(last);
    }
    last.count += 1;
  });
  return groups;
}

function capturePosition(seat, pileIndex = 0, within = 0, pileCount = 1) {
  const step = CAPTURE_PILE_SPACING / CAPTURE_RADIUS;
  const angle = SEATS[seat].angle + (pileIndex - (pileCount - 1) / 2) * step;
  return {
    x: Math.sin(angle) * CAPTURE_RADIUS,
    y: TABLE_Y + TILE_THICKNESS / 2 + 0.014 + within * 0.036,
    z: Math.cos(angle) * CAPTURE_RADIUS
  };
}

async function createScene() {
  const THREE = await import("three");
  threeLib = THREE;
  const { OrbitControls } = await import("three/addons/controls/OrbitControls.js");
  const canvas = $("#scene");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  if (!renderer.capabilities.isWebGL2) throw new Error("WebGL 2 is required");

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;

  let currentThemeId = SCENE_THEMES[prefs.theme] ? prefs.theme : "daybreak";
  const scenePalette = SCENE_THEMES[currentThemeId];
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(scenePalette.background);
  scene.fog = new THREE.Fog(scenePalette.fog ?? scenePalette.background, 15, 34);

  /* Table and tiles live in a rotatable world so every guest sees their own
     seat at the bottom of the screen. Lights, floor and dust stay fixed. */
  const world = new THREE.Group();
  scene.add(world);

  // Battle ring (centre) and the player's private arrangement arc.
  const battleRing = new THREE.Mesh(
    new THREE.RingGeometry(2.72, 2.82, 96),
    new THREE.MeshBasicMaterial({ color: 0xd8b26b, transparent: true, opacity: 0.34, side: THREE.DoubleSide, depthWrite: false })
  );
  battleRing.rotation.x = -Math.PI / 2;
  battleRing.position.y = TABLE_Y + 0.006;
  world.add(battleRing);
  const personalZone = new THREE.Mesh(
    new THREE.RingGeometry(2.92, 4.88, 96, 1, -Math.PI / 2 - 0.98, 1.96),
    new THREE.MeshBasicMaterial({ color: 0xd8b26b, transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false })
  );
  personalZone.rotation.x = -Math.PI / 2;
  personalZone.position.y = TABLE_Y + 0.004;
  world.add(personalZone);
  let viewSeat = MY_SEAT || 0;
  let viewAngle = -SEATS[viewSeat].angle;

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 80);
  const portrait = window.matchMedia("(max-width: 640px)").matches;
  camera.fov = portrait ? 46 : 40;
  const homePosition = portrait
    ? new THREE.Vector3(0, 14.3, 17.2)
    : new THREE.Vector3(0, 10.2, 11.4);
  const homeTarget = portrait
    ? new THREE.Vector3(0, 0.18, 0.7)
    : new THREE.Vector3(0, 0.22, 0.9);
  const topTarget = new THREE.Vector3(0, 0, portrait ? 0.95 : 0.75);
  const topPosition = new THREE.Vector3(0, portrait ? 24.8 : 18.6, topTarget.z + 0.01);
  camera.position.copy(topPosition);

  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(topTarget);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.minDistance = 7.4;
  controls.maxDistance = 32;
  controls.minPolarAngle = 0.02;
  controls.maxPolarAngle = 1.32;
  controls.enablePan = true;
  controls.screenSpacePanning = true;
  controls.panSpeed = 0.55;
  controls.rotateSpeed = 0.62;
  controls.zoomSpeed = 0.8;
  controls.autoRotateSpeed = 0.42;

  const hemi = new THREE.HemisphereLight(0xf4dcc0, 0x1a0709, 0.85);
  scene.add(hemi);
  const ambient = new THREE.AmbientLight(0x5b2a2f, 0.55);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(scenePalette.key, 2.6);
  key.position.set(6.5, 13, 7.5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -10;
  key.shadow.camera.right = 10;
  key.shadow.camera.top = 10;
  key.shadow.camera.bottom = -10;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 34;
  key.shadow.bias = -0.0004;
  key.shadow.radius = 4;
  scene.add(key);

  const rim = new THREE.DirectionalLight(scenePalette.rimLight, 0.8);
  rim.position.set(-8, 6, -7);
  scene.add(rim);

  const warm = new THREE.SpotLight(scenePalette.warm, 95, 26, 0.62, 0.55, 1.7);
  warm.position.set(0, 12.5, 3.5);
  warm.target.position.set(0, 0, 0);
  warm.castShadow = true;
  warm.shadow.mapSize.set(1024, 1024);
  warm.shadow.bias = -0.0008;
  scene.add(warm);
  scene.add(warm.target);

  const redGlow = new THREE.PointLight(scenePalette.redGlow, 8, 12, 2);
  redGlow.position.set(-6, 2.4, 4);
  scene.add(redGlow);
  const jadeGlow = new THREE.PointLight(scenePalette.jadeGlow, 6, 12, 2);
  jadeGlow.position.set(6, 2.2, -4);
  scene.add(jadeGlow);

  const table = new THREE.Group();
  const feltTexture = makeFeltTexture(THREE, scenePalette);
  const woodTexture = makeWoodTexture(THREE, scenePalette);
  woodTexture.wrapS = THREE.RepeatWrapping;
  woodTexture.wrapT = THREE.RepeatWrapping;
  woodTexture.repeat.set(4, 1);

  const feltMaterial = new THREE.MeshStandardMaterial({ map: feltTexture, roughness: 0.96, metalness: 0.02 });
  const woodSide = new THREE.MeshStandardMaterial({ map: woodTexture, color: scenePalette.woodTint, roughness: 0.55, metalness: 0.08 });
  const woodDark = new THREE.MeshStandardMaterial({ color: scenePalette.woodDark, roughness: 0.66, metalness: 0.12 });

  const tabletop = new THREE.Mesh(new THREE.CylinderGeometry(6.62, 6.62, 0.42, 96), [woodSide, feltMaterial, woodDark]);
  tabletop.position.y = TABLE_Y - 0.21;
  tabletop.castShadow = true;
  tabletop.receiveShadow = true;
  table.add(tabletop);

  const rimRing = new THREE.Mesh(new THREE.TorusGeometry(6.64, 0.19, 18, 120), new THREE.MeshStandardMaterial({ color: scenePalette.rim, roughness: 0.42, metalness: 0.22 }));
  rimRing.rotation.x = Math.PI / 2;
  rimRing.position.y = TABLE_Y - 0.06;
  rimRing.castShadow = true;
  table.add(rimRing);

  const goldInlay = new THREE.Mesh(new THREE.TorusGeometry(6.3, 0.012, 8, 120), new THREE.MeshStandardMaterial({ color: scenePalette.gold, roughness: 0.28, metalness: 0.8 }));
  goldInlay.rotation.x = Math.PI / 2;
  goldInlay.position.y = TABLE_Y + 0.003;
  table.add(goldInlay);

  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.5, 2.5, 48), woodDark);
  pedestal.position.y = -1.6;
  pedestal.castShadow = true;
  table.add(pedestal);
  const foot = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.85, 0.22, 64), woodDark);
  foot.position.y = -2.78;
  foot.receiveShadow = true;
  table.add(foot);

  world.add(table);

  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(20, 72),
    new THREE.MeshStandardMaterial({ color: scenePalette.floor, roughness: 0.9, metalness: 0.05 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -2.9;
  floor.receiveShadow = true;
  scene.add(floor);

  const faceTextures = new Map();
  const backTexture = makeTileBackTexture(THREE, scenePalette);
  const backMaterial = new THREE.MeshStandardMaterial({ map: backTexture, roughness: 0.46, metalness: 0.04 });
  const sideMaterial = new THREE.MeshStandardMaterial({ color: scenePalette.tileSide, roughness: 0.52, metalness: 0.02 });
  const edgeMaterial = new THREE.MeshStandardMaterial({ color: scenePalette.tileEdge, roughness: 0.42, metalness: 0.35 });
  const hitMeshes = [];
  const tileObjects = new Map();

  for (const tile of DECK) {
    const root = new THREE.Group();
    const lift = new THREE.Group();
    const tilt = new THREE.Group();
    root.add(lift);
    lift.add(tilt);

    const body = new THREE.Mesh(new THREE.CylinderGeometry(TILE_RADIUS, TILE_RADIUS, TILE_THICKNESS, 48), sideMaterial);
    body.castShadow = true;
    body.receiveShadow = true;
    body.userData.tileId = tile.id;
    tilt.add(body);
    hitMeshes.push(body);

    const cacheKey = `${tile.color}-${tile.rank}`;
    let faceTexture = faceTextures.get(cacheKey);
    if (!faceTexture) {
      faceTexture = makeTileFaceTexture(THREE, tile);
      faceTextures.set(cacheKey, faceTexture);
    }
    const face = new THREE.Mesh(
      new THREE.CircleGeometry(TILE_RADIUS * 0.965, 48),
      new THREE.MeshStandardMaterial({ map: faceTexture, roughness: 0.58, metalness: 0.02, transparent: false })
    );
    face.rotation.x = -Math.PI / 2;
    face.position.y = TILE_THICKNESS / 2 + 0.0015;
    face.userData.tileId = tile.id;
    tilt.add(face);
    hitMeshes.push(face);

    const back = new THREE.Mesh(
      new THREE.CircleGeometry(TILE_RADIUS * 0.965, 48),
      backMaterial
    );
    back.rotation.x = Math.PI / 2;
    back.position.y = -TILE_THICKNESS / 2 - 0.0015;
    back.userData.tileId = tile.id;
    tilt.add(back);

    const bevel = new THREE.Mesh(new THREE.TorusGeometry(TILE_RADIUS * 0.975, 0.016, 8, 48), edgeMaterial);
    bevel.rotation.x = Math.PI / 2;
    bevel.position.y = TILE_THICKNESS / 2;
    tilt.add(bevel);

    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(TILE_RADIUS * 1.08, 0.018, 6, 48),
      new THREE.MeshBasicMaterial({ color: 0xf0d49a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -TILE_THICKNESS / 2 - 0.005;
    root.add(ring);

    root.position.set(0, TABLE_Y + 0.4, 0);
    root.visible = false;
    root.rotation.y = 0;
    tilt.rotation.x = Math.PI;
    world.add(root);

    const record = {
      id: tile.id,
      tile,
      root,
      lift,
      tilt,
      ring,
      faceUp: false,
      anim: null,
      faceAnim: null,
      seat: 0
    };
    tileObjects.set(tile.id, record);
  }

  /*
   * Ghost tiles are back-only meshes used on guest clients for another
   * player's private hand and face-down centre plays. The host sends ids such
   * as "ghost-2-5"; every client owns the same 32-mesh pool, so no real tile
   * identity is required to draw a believable card back.
   */
  const ghostGeometry = new THREE.CylinderGeometry(TILE_RADIUS, TILE_RADIUS, TILE_THICKNESS, 32);
  for (let seat = 0; seat < TABLE_SEATS; seat += 1) {
    for (let index = 0; index < 8; index += 1) {
      const id = `${GHOST_PREFIX}${seat}-${index}`;
      const root = new THREE.Group();
      const lift = new THREE.Group();
      const tilt = new THREE.Group();
      root.add(lift);
      lift.add(tilt);
      const body = new THREE.Mesh(ghostGeometry, sideMaterial);
      body.castShadow = true;
      body.receiveShadow = true;
      body.userData.tileId = id;
      tilt.add(body);
      hitMeshes.push(body);
      const back = new THREE.Mesh(new THREE.CircleGeometry(TILE_RADIUS * 0.965, 32), backMaterial);
      back.rotation.x = Math.PI / 2;
      back.position.y = -TILE_THICKNESS / 2 - 0.0015;
      back.userData.tileId = id;
      tilt.add(back);
      const bevel = new THREE.Mesh(new THREE.TorusGeometry(TILE_RADIUS * 0.975, 0.016, 8, 32), edgeMaterial);
      bevel.rotation.x = Math.PI / 2;
      bevel.position.y = TILE_THICKNESS / 2;
      tilt.add(bevel);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(TILE_RADIUS * 1.08, 0.018, 6, 32),
        new THREE.MeshBasicMaterial({ color: 0xf0d49a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = -TILE_THICKNESS / 2 - 0.005;
      root.add(ring);
      root.position.set(0, TABLE_Y + 0.4, 0);
      root.visible = false;
      root.rotation.y = 0;
      tilt.rotation.x = Math.PI;
      world.add(root);
      tileObjects.set(id, {
        id,
        tile: null,
        ghost: true,
        root,
        lift,
        tilt,
        ring,
        faceUp: false,
        anim: null,
        faceAnim: null,
        seat
      });
    }
  }

  const seatRings = [];
  const labels = [];
  const labelCanvases = [];
  for (const seat of SEATS) {
    const pos = seatVector(seat.id, 4.0);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.65, 1.8, 72),
      new THREE.MeshBasicMaterial({ color: 0xd8b26b, transparent: true, opacity: 0.08, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(pos.x, TABLE_Y + 0.004, pos.z);
    world.add(ring);
    seatRings.push(ring);

    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 160;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
    const lp = seatVector(seat.id, 5.15);
    sprite.position.set(lp.x, 0.66, lp.z);
    sprite.scale.set(1.95, 0.61, 1);
    sprite.renderOrder = 4;
    sprite.visible = seat.id !== 0;
    world.add(sprite);
    labels.push(sprite);
    labelCanvases.push({ canvas, texture });
  }

  function drawLabel(index, title, subtitle) {
    const { canvas, texture } = labelCanvases[index];
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, "rgba(36, 16, 20, 0.92)");
    gradient.addColorStop(1, "rgba(16, 6, 9, 0.88)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(8, 8, w - 16, h - 16, 30);
    ctx.fill();
    ctx.strokeStyle = "rgba(216, 178, 107, 0.48)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#f0d49a";
    ctx.font = '600 38px "Iowan Old Style", "Palatino Linotype", "Noto Serif Thai", Georgia, serif';
    ctx.fillText(title, w / 2, 58);
    ctx.fillStyle = "rgba(220, 201, 172, 0.78)";
    ctx.font = '500 26px "Avenir Next", "Sarabun", sans-serif';
    ctx.fillText(subtitle, w / 2, 112);
    texture.needsUpdate = true;
  }

  const dustGeometry = new THREE.BufferGeometry();
  const dustCount = 220;
  const dustPositions = new Float32Array(dustCount * 3);
  for (let i = 0; i < dustCount; i += 1) {
    dustPositions[i * 3] = (Math.random() - 0.5) * 17;
    dustPositions[i * 3 + 1] = Math.random() * 5.5 + 0.2;
    dustPositions[i * 3 + 2] = (Math.random() - 0.5) * 17;
  }
  dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
  const dust = new THREE.Points(dustGeometry, new THREE.PointsMaterial({ color: 0xe8c58d, size: 0.026, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false }));
  scene.add(dust);

  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let hoverId = null;
  let selectedIds = new Set();
  let downPoint = null;
  let lastCenterTap = null;
  let dragging = false;
  let currentState = null;
  const handLayout = new Map();
  const seatLayouts = new Map();
  let handDrag = null;
  const tablePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -TABLE_Y);
  let topView = true;
  let cinema = false;
  let cameraTween = null;

  function resize() {
    const width = canvas.clientWidth || canvas.parentElement.clientWidth;
    const height = canvas.clientHeight || canvas.parentElement.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
  resize();
  const observer = new ResizeObserver(resize);
  observer.observe(canvas.parentElement);

  function moveTile(record, target, duration = 650, arc = 0.3) {
    const current = record.root.position;
    if (record.anim && record.anim.to.distanceTo(new THREE.Vector3(target.x, target.y, target.z)) < 0.004) return;
    record.anim = {
      from: current.clone(),
      to: new THREE.Vector3(target.x, target.y, target.z),
      start: performance.now(),
      duration,
      arc
    };
  }

  function setFace(record, up, duration = 320) {
    if (record.faceUp === up && !record.faceAnim) return;
    record.faceUp = up;
    const from = record.tilt.rotation.x;
    const to = up ? 0 : Math.PI;
    if (Math.abs(from - to) < 0.001) { record.faceAnim = null; record.tilt.rotation.x = to; return; }
    record.faceAnim = { from, to, start: performance.now(), duration };
  }

  function placementMap(gameState) {
    const map = new Map();
    const localSeat = Number.isInteger(gameState.mySeat) ? gameState.mySeat : (Number.isInteger(MY_SEAT) ? MY_SEAT : 0);
    gameState.hands.forEach((hand, seat) => {
      const ordered = seat === localSeat ? hand.slice().sort((a, b) => b.power - a.power || (a.color === "r" ? -1 : 1)) : hand.slice();
      const layout = seat === localSeat ? null : seatLayouts.get(seat);
      ordered.forEach((tile, index) => {
        const slot = layout?.[index] || null;
        map.set(tile.id, {
          kind: "hand",
          id: tile.id,
          seat,
          index,
          count: ordered.length,
          up: seat === localSeat,
          angle: slot?.a ?? handPosition(seat, index, ordered.length).angle,
          custom: slot
        });
      });
    });
    gameState.center.forEach((entry) => {
      entry.tiles.forEach((tile, index) => {
        map.set(tile.id, { kind: "center", seat: entry.seat, index, count: entry.tiles.length, up: Boolean(entry.revealed) });
      });
    });
    gameState.captures.forEach((pile, seat) => {
      const hidden = gameState.captureHidden?.[seat] || [];
      const groups = captureGroupsFor(gameState, seat);
      const slotOf = new Map();
      groups.forEach((group, pileIndex) => {
        for (let offset = 0; offset < group.count; offset += 1) {
          slotOf.set(group.start + offset, { pileIndex, within: offset });
        }
      });
      pile.forEach((tile, index) => {
        const slot = slotOf.get(index) || { pileIndex: 0, within: index };
        map.set(tile.id, {
          kind: "capture",
          seat,
          index,
          pileIndex: slot.pileIndex,
          within: slot.within,
          pileCount: groups.length,
          count: pile.length,
          up: !hidden[index]
        });
      });
    });
    return map;
  }

  function positionFor(placement) {
    if (placement.kind === "hand") {
      const custom = handLayout.get(placement.id) || placement.custom;
      if (custom) {
        return {
          x: custom.x,
          y: TABLE_Y + TILE_THICKNESS / 2 + 0.012,
          z: custom.z,
          angle: custom.a ?? custom.angle
        };
      }
      return handPosition(placement.seat, placement.index, placement.count);
    }
    if (placement.kind === "center") return centerPosition(placement.seat, placement.index, placement.count);
    return capturePosition(placement.seat, placement.pileIndex ?? Math.floor(placement.index / 4), placement.within ?? (placement.index % 4), placement.pileCount || 1);
  }

  function updateLabels(gameState) {
    if (!gameState) return;
    SEATS.forEach((seat) => {
      const piles = Math.floor(gameState.captures[seat.id].length / 4);
      drawLabel(seat.id, `${seat.wind} ${seatName(seat.id)}`, `${gameState.scores[seat.id]} ${t("score.points")} · ${piles} ${t("score.piles")}`);
    });
  }

  function orient(record, seat, angle = null) {
    record.root.rotation.y = -(angle ?? SEATS[seat].angle);
    record.seat = seat;
  }

  function applyState(gameState, options = {}) {
    currentState = gameState;
    const map = placementMap(gameState);
    const duration = options.duration ?? 620;
    const arc = options.arc ?? 0.26;
    for (const record of tileObjects.values()) {
      const placement = map.get(record.id);
      if (!placement) {
        record.root.visible = false;
        continue;
      }
      record.root.visible = true;
      record.kind = placement.kind;
      record.index = placement.index;
      record.pileIndex = placement.pileIndex || 0;
      const target = positionFor(placement);
      orient(record, placement.seat, placement.angle);
      moveTile(record, target, options.deal ? 560 : duration, options.deal ? 0.75 : arc);
      setFace(record, placement.up, options.deal ? 260 : 300);
    }
    updateLabels(gameState);
    selectedIds = new Set(gameState.selected || []);
  }

  function deal(gameState) {
    return new Promise((resolve) => {
      currentState = gameState;
      handLayout.clear();
      seatLayouts.clear();
      const map = placementMap(gameState);
      let order = 0;
      for (const record of tileObjects.values()) {
        const placement = map.get(record.id);
        record.root.visible = Boolean(placement);
        record.root.position.set((Math.random() - 0.5) * 0.8, TABLE_Y + 0.35 + Math.random() * 0.55, (Math.random() - 0.5) * 0.8);
        record.tilt.rotation.x = Math.PI;
        record.faceUp = false;
        record.anim = null;
        record.faceAnim = null;
      }
      const entries = [...map.entries()];
      entries.forEach(([id, placement], index) => {
        const record = tileObjects.get(id);
        if (!record) return;
        const target = positionFor(placement);
        setTimeout(() => {
          orient(record, placement.seat, placement.angle);
          moveTile(record, target, 520, 0.9);
          setFace(record, placement.up, 220);
        }, index * 17);
        order = Math.max(order, index * 17 + 540);
      });
      updateLabels(gameState);
      setTimeout(resolve, order + 80);
    });
  }

  function flipHumanHand(gameState) {
    if (!gameState) return;
    const localSeat = Number.isInteger(gameState.mySeat) ? gameState.mySeat : (Number.isInteger(MY_SEAT) ? MY_SEAT : 0);
    gameState.hands[localSeat].forEach((tile, index) => {
      const record = tileObjects.get(tile.id);
      if (!record) return;
      setTimeout(() => setFace(record, true, 260), index * 38);
    });
  }

  function collect(gameState) {
    applyState(gameState, { duration: 760, arc: 0.5 });
  }

  function sync(gameState) {
    if (!gameState) return;
    applyState(gameState, { duration: 620, arc: 0.24 });
  }

  function setSelected(ids) {
    selectedIds = new Set(ids || []);
  }

  function tileScreen(id) {
    const record = tileObjects.get(id);
    if (!record || !record.root.visible) return null;
    const point = new THREE.Vector3();
    record.root.getWorldPosition(point);
    point.project(camera);
    const rect = canvas.getBoundingClientRect();
    return {
      x: rect.left + ((point.x + 1) / 2) * rect.width,
      y: rect.top + ((1 - point.y) / 2) * rect.height
    };
  }

  function pick(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObjects(hitMeshes, false);
    if (!hits.length) return null;
    const id = hits[0].object.userData.tileId;
    return tileObjects.get(id) || null;
  }

  function localHandRecord(record) {
    if (!record || record.ghost || !record.faceUp) return false;
    const localSeat = Number.isInteger(currentState?.mySeat) ? currentState.mySeat : MY_SEAT;
    if (record.seat !== localSeat) return false;
    return (currentState?.hands?.[localSeat] || []).some((tile) => tile.id === record.id);
  }

  /* Freeze every hand tile where it currently sits before the first drag, so
     playing a tile does not re-flow the player's arrangement. */
  function localHandOrdered() {
    if (!currentState) return { seat: MY_SEAT, tiles: [] };
    const localSeat = Number.isInteger(currentState.mySeat) ? currentState.mySeat : MY_SEAT;
    const hand = currentState.hands?.[localSeat] || [];
    return {
      seat: localSeat,
      tiles: hand.slice().sort((a, b) => b.power - a.power || (a.color === "r" ? -1 : 1))
    };
  }

  /* Slots in the raw hand order, because that is the order every other
     client uses to index this seat's hidden tiles. The local view sorts the
     hand by rank, so each tile's default position comes from its sorted
     index while the array itself follows the deal order. */
  function exportHandSlots() {
    if (!currentState) return [];
    const localSeat = Number.isInteger(currentState.mySeat) ? currentState.mySeat : MY_SEAT;
    const hand = currentState.hands?.[localSeat] || [];
    if (!hand.length) return [];
    const sorted = hand.slice().sort((a, b) => b.power - a.power || (a.color === "r" ? -1 : 1));
    const sortedIndex = new Map(sorted.map((tile, index) => [tile.id, index]));
    return hand.map((tile) => {
      const index = sortedIndex.get(tile.id) ?? 0;
      const custom = handLayout.get(tile.id);
      const point = custom || handPosition(localSeat, index, sorted.length);
      const angle = custom ? custom.angle : point.angle;
      return {
        x: Math.round(point.x * 1000) / 1000,
        z: Math.round(point.z * 1000) / 1000,
        a: Math.round(angle * 1000) / 1000
      };
    });
  }

  function hasCustomHand() {
    const { tiles } = localHandOrdered();
    return tiles.some((tile) => handLayout.has(tile.id));
  }

  function tidyHand() {
    handLayout.clear();
    if (currentState) applyState(currentState, { duration: 220 });
  }

  function setSeatLayout(seat, slots) {
    const next = Number(seat);
    if (!Number.isInteger(next) || next < 0 || next >= TABLE_SEATS) return;
    if (!Array.isArray(slots) || !slots.length) seatLayouts.delete(next);
    else seatLayouts.set(next, slots);
    if (currentState) applyState(currentState, { duration: 260 });
  }

  function captureHandLayout() {
    if (!currentState) return;
    const localSeat = Number.isInteger(currentState.mySeat) ? currentState.mySeat : MY_SEAT;
    const hand = currentState.hands?.[localSeat] || [];
    if (!hand.length) return;
    if (hand.every((tile) => handLayout.has(tile.id))) return;
    const ordered = hand.slice().sort((a, b) => b.power - a.power || (a.color === "r" ? -1 : 1));
    ordered.forEach((tile, index) => {
      const point = handPosition(localSeat, index, ordered.length);
      handLayout.set(tile.id, { x: point.x, z: point.z, angle: point.angle });
    });
  }

  function handPointFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(pointer, camera);
    const point = new THREE.Vector3();
    if (!raycaster.ray.intersectPlane(tablePlane, point)) return null;
    return world.worldToLocal(point.clone());
  }

  /* Free placement across the whole felt: only the table edge and the very
     centre are excluded, so a player can build rows, fans or groups. */
  function clampHandPoint(point) {
    const radius = Math.hypot(point.x, point.z);
    const clamped = Math.max(0.8, Math.min(HAND_RADIUS + 0.55, radius));
    const angle = Math.atan2(point.x, point.z);
    return { x: Math.sin(angle) * clamped, z: Math.cos(angle) * clamped, angle };
  }

  function updateHandDrag(event) {
    if (!handDrag) return;
    const point = handPointFromEvent(event);
    if (!point) return;
    const target = clampHandPoint(point);
    handDrag.point = target;
    const record = handDrag.record;
    record.anim = null;
    record.root.position.set(target.x, TABLE_Y + TILE_THICKNESS / 2 + 0.26, target.z);
    record.root.rotation.y = -target.angle;
    const hint = $("#playHint");
    if (hint) hint.hidden = Math.hypot(target.x, target.z) >= HAND_PLAY_RADIUS;
  }

  function inPersonalZone(point, seat) {
    const radius = Math.hypot(point.x, point.z);
    if (radius < 2.9 || radius > HAND_RADIUS + 0.82) return false;
    const base = SEATS[seat].angle;
    let offset = Math.atan2(point.x, point.z) - base;
    while (offset > Math.PI) offset -= Math.PI * 2;
    while (offset < -Math.PI) offset += Math.PI * 2;
    return Math.abs(offset) <= 0.98;
  }

  function tryPlayFromHand(record) {
    if (!state || !["lead", "follow"].includes(state.phase) || state.turn !== MY_SEAT) return false;
    const selected = state.selected || [];
    const ids = selected.includes(record.id) ? selected.slice() : [record.id];
    const hand = state.hands?.[MY_SEAT] || [];
    const tiles = ids.map((id) => hand.find((tile) => tile.id === id)).filter(Boolean);
    if (!tiles.length) return false;
    if (state.phase === "lead") {
      state.selected = ids;
      renderAll();
      setSelected(ids);
      if (detectCombo(tiles)) toast(t("toast.stagedLead", { n: ids.length }), "jade");
      return "stage";
    }
    const needed = state.lead.combo.count;
    if (ids.length < needed) {
      state.selected = ids;
      renderAll();
      setSelected(ids);
      toast(t("toast.needMore", { n: ids.length, m: needed }), "");
      return "stage";
    }
    if (ids.length > needed) {
      toast(t("coach.selectMore", { n: needed, m: ids.length }), "wine");
      return false;
    }
    state.selected = ids;
    renderAll();
    humanFollow(false);
    return "play";
  }

  function endHandDrag(commit) {
    if (!handDrag) return false;
    const { record, point, moved, origin } = handDrag;
    handDrag = null;
    controls.enabled = true;
    canvas.classList.remove("is-dragging-tile");
    const hint = $("#playHint");
    if (hint) hint.hidden = true;
    if (moved && point && Math.hypot(point.x, point.z) < HAND_PLAY_RADIUS) {
      const outcome = tryPlayFromHand(record);
      if (outcome === "play") return true;
      record.anim = null;
      record.root.position.copy(origin);
      return true;
    }
    if (moved && point) {
      const localSeat = Number.isInteger(currentState?.mySeat) ? currentState.mySeat : MY_SEAT;
      if (!inPersonalZone(point, localSeat)) {
        record.anim = null;
        record.root.position.copy(origin);
        toast(t("toast.stayZone"), "wine");
        return true;
      }
      handLayout.set(record.id, { x: point.x, z: point.z, angle: point.angle });
      record.anim = null;
      record.root.position.set(point.x, TABLE_Y + TILE_THICKNESS / 2 + 0.012, point.z);
      record.root.rotation.y = -point.angle;
      if (typeof onHandLayoutChange === "function") onHandLayoutChange();
      if (typeof renderSelection === "function") renderSelection();
      return true;
    }
    return false;
  }

  function onPointerMove(event) {
    if (handDrag) {
      if (!handDrag.moved && Math.hypot(event.clientX - handDrag.startX, event.clientY - handDrag.startY) > 6) {
        handDrag.moved = true;
        canvas.classList.add("is-dragging-tile");
        hideTileTip();
        captureHandLayout();
      }
      if (handDrag.moved) {
        updateHandDrag(event);
        return;
      }
    }
    if (event.pointerType === "touch") return;
    if (event.buttons || dragging) return;
    const record = pick(event);
    const id = record?.id ?? null;
    if (id !== hoverId) {
      hoverId = id;
      canvas.classList.toggle("is-hovering-tile", Boolean(id));
      if (record) {
        const localSeat = Number.isInteger(currentState?.mySeat) ? currentState.mySeat : MY_SEAT;
        const stateHasHumanTurn = currentState && currentState.turn === localSeat;
        if (record.faceUp || (currentState && currentState.hands[localSeat]?.some((tile) => tile.id === record.id))) {
          inspectTile(record.id, { x: event.clientX, y: event.clientY });
        } else if (stateHasHumanTurn) {
          inspectHidden({ x: event.clientX, y: event.clientY });
        } else {
          inspectHidden({ x: event.clientX, y: event.clientY });
        }
      } else {
        hideTileTip();
      }
    }
  }

  function onPointerLeave() {
    if (handDrag) endHandDrag(handDrag.moved);
    hoverId = null;
    canvas.classList.remove("is-hovering-tile");
    hideTileTip();
  }

  function onPointerDown(event) {
    downPoint = { x: event.clientX, y: event.clientY, time: performance.now() };
    dragging = false;
    hideTileTip();
    if (handDrag) endHandDrag(handDrag.moved);
    const record = pick(event);
    if (localHandRecord(record)) {
      handDrag = {
        record,
        moved: false,
        startX: event.clientX,
        startY: event.clientY,
        point: null,
        origin: record.root.position.clone()
      };
      controls.enabled = false;
    }
  }

  function onPointerUp(event) {
    if (!downPoint) return;
    if (handDrag) {
      const committed = endHandDrag(handDrag.moved);
      if (committed) {
        downPoint = null;
        return;
      }
    }
    const moved = Math.hypot(event.clientX - downPoint.x, event.clientY - downPoint.y);
    const elapsed = performance.now() - downPoint.time;
    downPoint = null;
    if (dragging || moved > 7 || elapsed > 900) return;
    const record = pick(event);
    if (!record) {
      hideTileTip();
      return;
    }
    if (record.kind === "capture") {
      openPileModal(record.seat, record.pileIndex || 0);
      return;
    }
    const localSeat = Number.isInteger(currentState?.mySeat) ? currentState.mySeat : MY_SEAT;
    if (record.kind === "center" && record.seat === localSeat) {
      const now = performance.now();
      if (lastCenterTap && lastCenterTap.id === record.id && now - lastCenterTap.time < 420) {
        lastCenterTap = null;
        if (currentState?.phase === "showdown" && currentState.turn === localSeat) {
          humanFollow(true);
          return;
        }
      } else {
        lastCenterTap = { id: record.id, time: now };
      }
    } else {
      lastCenterTap = null;
    }
    const humanHand = currentState?.hands?.[localSeat] || [];
    const touch = event.pointerType === "touch";
    if (humanHand.some((tile) => tile.id === record.id) && currentState?.turn === localSeat && ["lead", "follow"].includes(currentState.phase)) {
      toggleTile(record.id);
      showTileTip(record.id, { x: event.clientX, y: event.clientY, touch });
    } else if (record.faceUp) {
      inspectTile(record.id, { x: event.clientX, y: event.clientY, touch });
    } else {
      inspectHidden({ x: event.clientX, y: event.clientY, touch });
    }
  }

  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerleave", onPointerLeave);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("dblclick", (event) => {
    const record = pick(event);
    if (record?.kind === "center" && record.seat === MY_SEAT
      && currentState?.phase === "showdown" && currentState.turn === MY_SEAT) {
      humanFollow(true);
    }
  });
  canvas.addEventListener("pointercancel", () => {
    if (handDrag) endHandDrag(handDrag.moved);
  });
  controls.addEventListener("start", () => { dragging = true; cameraTween = null; });
  controls.addEventListener("end", () => { setTimeout(() => { dragging = false; }, 0); });

  function tweenCamera(toPosition, toTarget, duration = 760) {
    cameraTween = {
      fromPos: camera.position.clone(),
      toPos: toPosition.clone(),
      fromTarget: controls.target.clone(),
      toTarget: toTarget.clone(),
      start: performance.now(),
      duration
    };
  }

  function updateViewToggle() {
    const top = $("#viewTopBtn");
    const three = $("#view3dBtn");
    if (top) top.setAttribute("aria-pressed", String(topView));
    if (three) three.setAttribute("aria-pressed", String(!topView));
  }

  function setTopView(value) {
    topView = Boolean(value);
    updateViewToggle();
    if (topView) tweenCamera(topPosition, topTarget);
    else tweenCamera(homePosition, homeTarget);
  }

  function resetView() {
    setTopView(true);
  }

  function resetBoard() {
    setViewSeat(MY_SEAT);
    setTopView(true);
    cameraTween = null;
    camera.position.copy(topPosition);
    controls.target.copy(topTarget);
    controls.update();
    resize();
    if (currentState) sync(currentState);
  }

  function toggleTopView() {
    setTopView(!topView);
  }

  function toggleCinema() {
    cinema = !cinema;
    controls.autoRotate = cinema;
    const button = $("#cinemaBtn");
    button?.setAttribute("aria-pressed", String(cinema));
    if (!cinema) controls.autoRotate = false;
  }

  let lastFrame = performance.now();
  function render(now) {
    const dt = Math.min(now - lastFrame, 80);
    lastFrame = now;

    for (const record of tileObjects.values()) {
      if (record.anim) {
        const t = clamp((now - record.anim.start) / record.anim.duration, 0, 1);
        const eased = easeOutCubic(t);
        const from = record.anim.from;
        const to = record.anim.to;
        record.root.position.x = lerp(from.x, to.x, eased);
        record.root.position.z = lerp(from.z, to.z, eased);
        record.root.position.y = lerp(from.y, to.y, eased) + Math.sin(Math.PI * t) * record.anim.arc;
        if (t >= 1) {
          record.root.position.copy(to);
          record.anim = null;
        }
      }
      if (record.faceAnim) {
        const t = clamp((now - record.faceAnim.start) / record.faceAnim.duration, 0, 1);
        record.tilt.rotation.x = lerp(record.faceAnim.from, record.faceAnim.to, easeInOutCubic(t));
        if (t >= 1) {
          record.tilt.rotation.x = record.faceAnim.to;
          record.faceAnim = null;
        }
      }
      const lifted = record.id === hoverId || selectedIds.has(record.id);
      const targetLift = lifted && record.root.visible ? 0.19 : 0;
      record.lift.position.y += (targetLift - record.lift.position.y) * Math.min(0.32, dt / 90);
      const showRing = lifted && record.root.visible;
      const targetOpacity = showRing ? 0.72 : 0;
      record.ring.material.opacity += (targetOpacity - record.ring.material.opacity) * Math.min(0.3, dt / 100);
    }

    if (currentState) {
      const activePhase = ["lead", "follow", "resolving"].includes(currentState.phase);
      SEATS.forEach((seat) => {
        const active = activePhase && currentState.turn === seat.id;
        const ring = seatRings[seat.id];
        const pulse = 0.08 + (active ? 0.26 + Math.sin(now / 460) * 0.08 : 0);
        ring.material.opacity += (pulse - ring.material.opacity) * 0.12;
      });
    }

    if (cameraTween) {
      const t = clamp((now - cameraTween.start) / cameraTween.duration, 0, 1);
      const eased = easeInOutCubic(t);
      camera.position.lerpVectors(cameraTween.fromPos, cameraTween.toPos, eased);
      controls.target.lerpVectors(cameraTween.fromTarget, cameraTween.toTarget, eased);
      if (t >= 1) cameraTween = null;
    }

    if (controls.target.length() > 4.2) controls.target.setLength(4.2);
    controls.update();
    const desiredAngle = -SEATS[viewSeat].angle;
    let deltaAngle = desiredAngle - world.rotation.y;
    while (deltaAngle > Math.PI) deltaAngle -= Math.PI * 2;
    while (deltaAngle < -Math.PI) deltaAngle += Math.PI * 2;
    if (Math.abs(deltaAngle) > 0.001) world.rotation.y += deltaAngle * Math.min(0.22, dt / 180);
    dust.rotation.y += 0.00025;
    dust.position.y = Math.sin(now / 4200) * 0.05;
    renderer.render(scene, camera);
  }
  renderer.setAnimationLoop(render);

  function applySceneTheme(id) {
    const palette = SCENE_THEMES[id];
    if (!palette) return;
    currentThemeId = id;
    const oldFelt = feltMaterial.map;
    const oldWood = woodSide.map;
    const oldBack = backMaterial.map;

    const nextFelt = makeFeltTexture(THREE, palette);
    feltMaterial.map = nextFelt;
    feltMaterial.needsUpdate = true;

    const nextWood = makeWoodTexture(THREE, palette);
    nextWood.wrapS = THREE.RepeatWrapping;
    nextWood.wrapT = THREE.RepeatWrapping;
    nextWood.repeat.set(4, 1);
    woodSide.map = nextWood;
    woodSide.color.set(palette.woodTint);
    woodSide.needsUpdate = true;

    backMaterial.map = makeTileBackTexture(THREE, palette);
    backMaterial.needsUpdate = true;

    woodDark.color.set(palette.woodDark);
    rimRing.material.color.set(palette.rim);
    goldInlay.material.color.set(palette.gold);
    floor.material.color.set(palette.floor);
    sideMaterial.color.set(palette.tileSide);
    edgeMaterial.color.set(palette.tileEdge);

    scene.background.set(palette.background);
    scene.fog.color.set(palette.fog ?? palette.background);
    key.color.set(palette.key);
    rim.color.set(palette.rimLight);
    warm.color.set(palette.warm);
    redGlow.color.set(palette.redGlow);
    jadeGlow.color.set(palette.jadeGlow);

    if (oldFelt) oldFelt.dispose();
    if (oldWood) oldWood.dispose();
    if (oldBack) oldBack.dispose();
    updateLabels(currentState);
  }

  function setViewSeat(seat) {
    const next = clamp(Number(seat) || 0, 0, TABLE_SEATS - 1);
    viewSeat = next;
    labels.forEach((sprite, index) => { sprite.visible = index !== next; });
  }

  updateViewToggle();

  const api = {
    deal,
    sync,
    collect,
    flipHumanHand,
    setSelected,
    setViewSeat,
    setTheme: applySceneTheme,
    reset(gameState) {
      currentState = gameState;
      for (const record of tileObjects.values()) {
        record.root.visible = false;
        record.root.position.set(0, TABLE_Y + 0.4, 0);
      }
      updateLabels(gameState);
    },
    resetView,
    resetBoard,
    toggleTopView,
    setTopView,
    toggleCinema,
    exportHandSlots,
    hasCustomHand,
    tidyHand,
    setSeatLayout,
    getSeatLayout(seat) { return seatLayouts.get(Number(seat)) || null; },
    tileScreen,
    getState() {
      return {
        position: camera.position.toArray(),
        target: controls.target.toArray(),
        topView,
        cinema,
        theme: currentThemeId,
        viewSeat,
        background: scene.background?.getHexString?.(),
        fog: scene.fog?.color?.getHexString?.(),
        tiles: [...tileObjects.values()].filter((record) => record.root.visible).length
      };
    }
  };
  return api;
}

/* --------------------------------------------------------------------------
   17. Boot and events
   -------------------------------------------------------------------------- */

function bindEvents() {
  $("#langToggle")?.addEventListener("click", () => setLanguage(LANG === "en" ? "th" : "en"));
  $$("button[data-lang]").forEach((button) => button.addEventListener("click", () => {
    if (button.dataset.lang !== LANG) setLanguage(button.dataset.lang);
  }));
  $("#soundToggle")?.addEventListener("click", () => setSound(!prefs.sound));
  $("#rulesBtn")?.addEventListener("click", () => { renderRules(); openModal("rulesModal"); audio?.play("click", 0); });
  $("#aboutBtn")?.addEventListener("click", () => { renderAbout(); openModal("aboutModal"); audio?.play("click", 0); });
  $("#aboutBtnSide")?.addEventListener("click", () => { renderAbout(); openModal("aboutModal"); audio?.play("click", 0); });
  $("#resetViewBtn")?.addEventListener("click", () => scene?.resetView());
  $("#boardResetBtn")?.addEventListener("click", resetBoardView);
  $$("[data-view]").forEach((button) => button.addEventListener("click", () => {
    scene?.setTopView?.(button.dataset.view === "top");
  }));
  $("#cinemaBtn")?.addEventListener("click", () => scene?.toggleCinema());
  $("#displayBtn")?.addEventListener("click", () => { renderDisplay(); openModal("displayModal"); audio?.play("click", 0); });
  $("#rankReferenceBtn")?.addEventListener("click", () => setRankReference($("#rankReference")?.hidden ?? true));
  $("[data-rank-close]")?.addEventListener("click", () => setRankReference(false));
  document.addEventListener("pointerdown", (event) => {
    const panel = $("#rankReference");
    const button = $("#rankReferenceBtn");
    if (panel && !panel.hidden && !panel.contains(event.target) && !button?.contains(event.target)) setRankReference(false);
    const pinPanel = $("#pinInfoPanel");
    const pinButton = $("#hostPinInfo");
    if (pinPanel && !pinPanel.hidden && !pinPanel.contains(event.target) && !pinButton?.contains(event.target)) setPinInfo(false);
  });
  $$("button[data-font-size]").forEach((button) => button.addEventListener("click", () => applyFontSize(button.dataset.fontSize)));
  $$("button[data-theme-choice]").forEach((button) => button.addEventListener("click", () => applyTheme(button.dataset.themeChoice)));
  $("#displayReset")?.addEventListener("click", resetDisplay);
  $("#soundTest")?.addEventListener("click", () => {
    audio?.resume();
    setTimeout(() => audio?.play("clack", 0), 30);
    toast(t("toast.soundTest"), "jade");
  });

  $("#leadBtn")?.addEventListener("click", humanLead);
  $("#redrawBtn")?.addEventListener("click", () => {
    if (isClient()) sendNetAction("redraw", [], false);
    else applyRedraw(MY_SEAT);
  });
  $("#chuanBtn")?.addEventListener("click", () => {
    if (isClient()) sendNetAction("chuan", [], false);
    else claimChuan(MY_SEAT);
  });
  $("#lastTrickBtn")?.addEventListener("click", () => openLastTrickModal());
  $("#logHistoryBtn")?.addEventListener("click", () => openLastTrickModal());
  $("#summaryBody")?.addEventListener("click", (event) => {
    if (event.target.closest("#summaryLogBtn")) openLastTrickModal();
  });
  $("#logRoundSelect")?.addEventListener("change", (event) => {
    historyFollowLatest = false;
    renderLogBrowser(event.target.value, null);
  });
  $("#logTrickSelect")?.addEventListener("change", (event) => {
    historyFollowLatest = false;
    renderLogBrowser($("#logRoundSelect")?.value, event.target.value);
  });
  $("#trickResultContinue")?.addEventListener("click", closeTrickResult);
  $("#trickResultModal [data-close]")?.addEventListener("click", closeTrickResult);
  $("#draftPool")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-draft-id]");
    if (!button || button.disabled || !state || state.phase !== "draft" || state.turn !== MY_SEAT) return;
    const id = button.dataset.draftId;
    if (draftSelection.includes(id)) draftSelection = draftSelection.filter((value) => value !== id);
    else if (draftSelection.length < 2) draftSelection.push(id);
    else return;
    renderDraft();
  });
  $("#draftConfirm")?.addEventListener("click", () => {
    if (draftSelection.length !== 2 || !state || state.phase !== "draft" || state.turn !== MY_SEAT || draftSent) return;
    if (isClient()) {
      draftSent = sendNetAction("draft", draftSelection, false);
      renderDraft();
      return;
    }
    draftPick(MY_SEAT, draftSelection);
    draftSelection = [];
    renderDraft();
  });
  $$("[data-draft-toggle]").forEach((input) => input.addEventListener("change", () => {
    setDraftMode(input.checked);
  }));
  $("#draftChip")?.addEventListener("click", () => {
    const current = state ? state.draftMode === true : prefs.draftMode === true;
    setDraftMode(!current);
  });
  $("#summaryAutoNext")?.addEventListener("change", (event) => {
    prefs.autoNext = event.target.checked;
    savePrefs();
    startSummaryCountdown();
  });
  $("#resultSelect")?.addEventListener("change", (event) => {
    const value = Number(event.target.value);
    prefs.resultSeconds = value;
    if (state) state.resultSeconds = value;
    savePrefs();
    if (isHost()) saveMatch();
  });
  $("#bidRow")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-bid]");
    if (!button || button.disabled) return;
    const value = Number(button.dataset.bid);
    if (isClient()) sendNetAction("bid", [], false, value);
    else placeBid(MY_SEAT, value);
  });
  $("#revealBtn")?.addEventListener("click", () => humanFollow(true));
  $("#tidyHandBtn")?.addEventListener("click", () => {
    if (!scene?.tidyHand) return;
    scene.tidyHand();
    publishHandLayout(null);
    renderSelection();
    audio?.play("click", 0);
    toast(t("toast.handTidied"), "jade");
  });
  $("#facedownBtn")?.addEventListener("click", () => humanFollow(false));
  $("#hintBtn")?.addEventListener("click", applyHint);
  $("#clearBtn")?.addEventListener("click", clearSelection);

  $("#lobbyBtn")?.addEventListener("click", () => {
    if (isNetworked()) {
      if (lobbyState) showLobby(lobbyState.view === "table" ? "waiting" : lobbyState.view);
      else showLobby(isHost() ? "host" : "waiting");
    } else {
      showLobby("menu");
    }
    audio?.play("click", 0);
  });
  $("#netChip")?.addEventListener("click", copyInvite);
  $("#lobbySolo")?.addEventListener("click", backToSolo);
  $("#lobbyResumeSaved")?.addEventListener("click", resumeSavedMatch);
  $("#lobbyHost")?.addEventListener("click", () => {
    const name = preferredPlayerName();
    if (!name) {
      setLobbyStatus(t("net.enterName"), "wine");
      $("#lobbyPlayerName")?.focus();
      return;
    }
    createHostRoom(name);
  });
  $("#lobbyJoin")?.addEventListener("click", () => {
    showLobby("join");
    const field = $("#lobbyNameInput");
    if (field && !field.value) field.value = preferredPlayerName();
    if (normalizeRoomCode($("#lobbyCodeInput")?.value || "")) $("#lobbyNameInput")?.focus();
    else $("#lobbyCodeInput")?.focus();
  });
  $("#lobbyConnectBtn")?.addEventListener("click", () => {
    const name = preferredPlayerName();
    if (!name) {
      setLobbyStatus(t("net.enterName"), "wine");
      $("#lobbyNameInput")?.focus();
      return;
    }
    joinRoom($("#lobbyCodeInput")?.value || "", name, preferredPin());
  });
  $("#lobbyPlayerName")?.addEventListener("input", (event) => {
    const field = $("#lobbyNameInput");
    if (field) field.value = event.target.value;
  });
  $("#lobbyNameInput")?.addEventListener("input", (event) => {
    const field = $("#lobbyPlayerName");
    if (field) field.value = event.target.value;
    const code = normalizeRoomCode($("#lobbyCodeInput")?.value || "");
    if (code) saveRoomIntent({ role: "guest", code, name: event.target.value });
  });
  $("#lobbyCodeInput")?.addEventListener("input", () => {
    const input = $("#lobbyCodeInput");
    if (!input) return;
    const raw = input.value;
    let digits = "";
    if (/^https?:|room=/i.test(raw)) digits = normalizeRoomCode(raw) || "";
    else digits = raw.replace(/\D/g, "").slice(0, 6);
    if (digits.length === 6) input.value = formatRoomCode(digits);
    else if (digits.length > 3) input.value = `${digits.slice(0, 3)}-${digits.slice(3)}`;
    else input.value = digits;
    const end = input.value.length;
    try { input.setSelectionRange(end, end); } catch { /* ignore */ }
    if (digits) saveRoomIntent({ role: "guest", code: digits, name: $("#lobbyNameInput")?.value || "" });
  });
  $("#lobbyCodeInput")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      const name = preferredPlayerName();
      if (!name) { setLobbyStatus(t("net.enterName"), "wine"); $("#lobbyNameInput")?.focus(); return; }
      joinRoom($("#lobbyCodeInput").value, name, preferredPin());
    }
  });
  $("#lobbyNameInput")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      const name = preferredPlayerName();
      if (!name) { setLobbyStatus(t("net.enterName"), "wine"); $("#lobbyNameInput").focus(); return; }
      const joinView = !$("#lobbyJoinPanel")?.hidden;
      if (joinView) joinRoom($("#lobbyCodeInput")?.value || "", name, preferredPin());
      else createHostRoom(name);
    }
  });
  $$(".panel-orb").forEach((button) => button.addEventListener("click", () => openPanelSheet(button.dataset.panel)));
  $("#panelSheetClose")?.addEventListener("click", closePanelSheet);
  $("#panelSheet")?.addEventListener("pointerdown", (event) => {
    if (event.target === $("#panelSheet")) closePanelSheet();
  });
  $("#dockFold")?.addEventListener("click", () => {
    const dock = $("#handDock");
    if (!dock) return;
    setDockCollapsed(!dock.classList.contains("dock-collapsed"));
  });
  window.matchMedia("(max-width: 1024px)").addEventListener("change", renderPanelRail);
  window.matchMedia("(max-width: 520px)").addEventListener("change", renderNetChrome);
  window.addEventListener("resize", () => requestAnimationFrame(updateLobbyScrollState));
  $("#chatToolBtn")?.addEventListener("click", openChat);
  $("#joinDiagBtn")?.addEventListener("click", openDiagnostics);
  $("#hostDiagBtn")?.addEventListener("click", openDiagnostics);
  $("#diagProbePin")?.addEventListener("click", () => runProbe(true));
  $("#diagProbeNoPin")?.addEventListener("click", () => runProbe(false));
  $("#diagCopy")?.addEventListener("click", async () => {
    const body = $("#diagBody")?.textContent || "";
    const status = $("#diagStatus")?.textContent || "";
    await copyText(`${body}\n${status}`.trim(), t("diag.copied"));
  });
  $("#reloadAppBtn")?.addEventListener("click", forceReload);
  $$("[data-rule]").forEach((select) => select.addEventListener("change", () => {
    const key = select.dataset.rule;
    const value = key === "target" ? Number(select.value) : select.value;
    prefs[key] = value;
    if (key === "direction" && state) state.direction = value;
    if (key === "target" && state) state.target = value;
    savePrefs();
    renderAll();
    if (key === "mode") toast(t("toast.modeNext"), "jade");
  }));
  $$("[data-auto-audio]").forEach((input) => input.addEventListener("change", () => {
    prefs.autoAudio = input.checked;
    savePrefs();
    renderAutoAudio();
  }));
  $("#lobbyReload")?.addEventListener("click", forceReload);
  $("#appUpdateBtn")?.addEventListener("click", forceReload);
  $("#updateReload")?.addEventListener("click", forceReload);
  $("#updateDismiss")?.addEventListener("click", () => { const banner = $("#updateBanner"); if (banner) banner.hidden = true; });
  $("#lobbyCopyInfo")?.addEventListener("click", copyRoomInfo);
  $("#lobbyShareBtn")?.addEventListener("click", shareRoomInfo);
  $("#lobbyPinPaste")?.addEventListener("click", pastePasscode);
  $("#lobbyPasteInvite")?.addEventListener("click", pasteInvite);
  $("#hostPinRegenerate")?.addEventListener("click", generateRoomPin);
  $("#hostPinCopy")?.addEventListener("click", copyPin);
  $("#hostPinInfo")?.addEventListener("click", () => setPinInfo($("#pinInfoPanel")?.hidden ?? true));
  $("#hostApproval")?.addEventListener("change", (event) => setRoomApproval(event.target.checked));
  $("#lobbyApproveAll")?.addEventListener("click", approveAllPending);
  $("#lobbyPending")?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-approve], [data-deny]");
    if (!button) return;
    const row = button.closest("[data-conn]");
    if (!row) return;
    const connId = row.dataset.conn;
    if (button.hasAttribute("data-approve")) approvePending(connId);
    else denyPending(connId);
  });
  $("#lobbyStartBtn")?.addEventListener("click", () => {
    startHostedMatch();
    if (!isHost() || !net?.started) return;
    const mic = prefs.autoAudio ? preloadAudio() : null;
    if (mic) {
      mic.then((stream) => {
        if (stream && isHost() && net?.started) joinAudioWithStream(stream);
        else if (stream && !voice?.joined) releaseAutoAudio();
      });
    }
  });
  $("#lobbyWaitLeave")?.addEventListener("click", requestLeaveRoom);
  $("#lobbyResumeBtn")?.addEventListener("click", closeLobby);
  $("#lobbySoloFromLost")?.addEventListener("click", backToSolo);
  $("#leaveRoomBtn")?.addEventListener("click", requestLeaveRoom);
  $("#leaveRoomTopBtn")?.addEventListener("click", requestLeaveRoom);
  $("#leaveCancel")?.addEventListener("click", () => closeModal("leaveModal"));
  $("#leaveConfirm")?.addEventListener("click", () => {
    closeModal("leaveModal");
    leaveRoom();
    showLobby("menu");
  });
  $("#chatToggle")?.addEventListener("click", () => setChatOpen(!chatOpen));
  $("#chatForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = $("#chatInput");
    if (!input) return;
    if (sendChat(input.value)) input.value = "";
    input.focus();
  });
  $("#voiceJoinBtn")?.addEventListener("click", joinVoice);
  $("#voiceCallBtn")?.addEventListener("click", () => {
    if (voice?.joined) {
      voice.setMicMuted(!voice.micMuted);
      audio?.play("click", 0);
      return;
    }
    joinVoice();
  });
  $("#micBtn")?.addEventListener("click", () => {
    if (!voice?.joined) return;
    voice.setMicMuted(!voice.micMuted);
    audio?.play("click", 0);
  });
  $("#deafenBtn")?.addEventListener("click", () => {
    if (!voice?.joined) return;
    voice.setDeafened(!voice.deafened);
    audio?.play("click", 0);
  });
  $("#voiceLeaveBtn")?.addEventListener("click", () => voice?.leave());
  $$("[data-lobby-back]").forEach((button) => button.addEventListener("click", () => {
    if (net) requestLeaveRoom();
    else {
      releaseAutoAudio();
      clearRoomIntent();
      showLobby("menu");
    }
  }));

  $("#newMatchBtn")?.addEventListener("click", () => { openModal("confirmModal"); });
  $("#nextRoundBtn")?.addEventListener("click", startNextRound);
  $("#undoBtn")?.addEventListener("click", () => {
    if (state?.lastTrick) showUndoExplanation();
    else if (state?.snapshot) undoLastTrick();
    else toast(t("undo.noTrick"));
  });
  $("#undoConfirm")?.addEventListener("click", () => undoLastTrick());
  $("#undoCancel")?.addEventListener("click", () => closeModal("undoModal"));
  $("#exportBtn")?.addEventListener("click", exportGame);

  $("#confirmYes")?.addEventListener("click", () => {
    closeModal("confirmModal");
    if (isClient()) leaveRoom({ silent: true });
    beginMatch();
    toast(t("toast.newMatch"), "gold");
  });
  $("#confirmNo")?.addEventListener("click", () => closeModal("confirmModal"));

  $("#summaryPrimary")?.addEventListener("click", (event) => {
    clearInterval(summaryTimer);
    const action = event.currentTarget.dataset.action;
    if (action === "close") { closeModal("summaryModal"); return; }
    if (action === "new") { closeModal("summaryModal"); beginMatch(); }
    else { closeModal("summaryModal"); startNextRound(); }
  });
  $("#summarySecondary")?.addEventListener("click", (event) => {
    clearInterval(summaryTimer);
    const action = event.currentTarget.dataset.action;
    if (action === "solo") { closeModal("summaryModal"); backToSolo(); }
    else if (action === "export") exportGame();
    else { closeModal("summaryModal"); beginMatch(); }
  });

  document.addEventListener("pointerdown", () => hideTileTip(), { capture: true });
  $$("[data-close]").forEach((button) => button.addEventListener("click", () => closeModal(button.dataset.close)));
  $$(".modal").forEach((modal) => {
    modal.addEventListener("pointerdown", (event) => {
      if (event.target !== modal) return;
      if (modal.id === "trickResultModal") { closeTrickResult(); return; }
      if (modal.id !== "summaryModal" && modal.id !== "lobbyModal") modal.hidden = true;
    });
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      const open = $$(".modal").find((modal) => !modal.hidden);
      if (open && open.id === "trickResultModal") closeTrickResult();
      else if (open && open.id !== "summaryModal") open.hidden = true;
      setRankReference(false);
      setPinInfo(false);
      closePanelSheet();
    }
    if (event.key === "h" && !event.metaKey && !event.ctrlKey && !event.altKey) applyHint();
    if (event.key === "Escape" && state?.selected?.length) clearSelection();
  });

  $("#tileListToggle")?.addEventListener("click", () => {
    prefs.tileList = !prefs.tileList;
    const list = $("#tileList");
    if (list) list.hidden = !prefs.tileList;
    $("#tileListToggle").textContent = prefs.tileList ? t("handList.hide") : t("handList.show");
    $("#tileListToggle").setAttribute("aria-expanded", String(prefs.tileList));
    savePrefs();
  });

  window.addEventListener("pointerdown", () => { audio?.resume(); audio?.play("click", 0); }, { once: true });
  window.addEventListener("keydown", () => audio?.resume(), { once: true });
  window.addEventListener("beforeunload", saveMatch);
  window.addEventListener("pagehide", () => voice?.leave());
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      saveMatch();
      return;
    }
    if (lobbyState && ["join", "waiting", "lost"].includes(lobbyState.view) && $("#lobbyModal")?.hidden) {
      showLobby(lobbyState.view);
    }
    if (isHost()) acquireHostWakeLock();
    checkForUpdate();
  });
  window.addEventListener("pageshow", (event) => {
    if (!event.persisted) return;
    if (lobbyState && ["join", "waiting", "lost"].includes(lobbyState.view) && $("#lobbyModal")?.hidden) {
      showLobby(lobbyState.view);
    }
  });
}

async function boot() {
  loadPrefs();
  loadStats();
  applyFontSize(prefs.fontSize, { silent: true });
  applyTheme(prefs.theme, { silent: true });
  audio = new StudioAudio();
  applyLanguage(LANG);
  bindEvents();
  renderVersion();
  renderRuleSelects();
  chatOpen = prefs.chatOpen !== false;
  setChatOpen(chatOpen);
  setDockCollapsed(prefs.dockCollapsed !== false, { silent: true });
  renderChat();

  const params = new URLSearchParams(location.search);
  if (params.get("seed")) {
    const seed = Number(params.get("seed"));
    if (Number.isFinite(seed)) {
      bootSeed = seed;
      random = mulberry32(seed);
    }
  }

  const autoHost = params.get("mode") === "host" || params.get("host") === "1";
  const mode = params.get("mode");
  if (mode === "solo" || params.get("selftest") === "1" || params.get("demo") === "1") clearRoomIntent();
  const savedIntent = loadRoomIntent();
  const useIntent = !autoHost && mode !== "solo" && params.get("selftest") !== "1" && params.get("demo") !== "1";
  const autoRoom = normalizeRoomCode(params.get("room") || (useIntent && savedIntent?.code ? savedIntent.code : ""));
  const restoreName = savedIntent && savedIntent.code === autoRoom ? savedIntent.name : "";
  const skipLaunch = autoRoom || autoHost || mode === "solo"
    || params.get("selftest") === "1" || params.get("demo") === "1";
  const willPrompt = !skipLaunch;

  const restored = loadMatch();
  resumeAvailable = restored;
  if (restored) {
    renderAll();
    if (state.phase === "roundEnd" || state.phase === "matchEnd") showRoundSummary(state.phase === "matchEnd");
  } else if (!willPrompt) {
    state = makeState(bootSeed ?? undefined);
    state.target = 20;
    renderAll();
  } else {
    state = null;
  }
  updateUndoButton();

  try {
    scene = await createScene();
  } catch (error) {
    console.warn("3D scene unavailable:", error);
    $("#bootError").hidden = false;
  }

  if (!restored && !willPrompt) {
    dealRound();
  } else if (restored && (state.phase === "lead" || state.phase === "follow" || state.phase === "draft")) {
    if (isBotSeat(state.turn)) scheduleAI(900);
    else coachTick();
    if (scene) scene.sync(state);
  } else if (!restored && willPrompt && scene) {
    scene.reset?.(state);
  }

  if (scene) scene.setViewSeat?.(MY_SEAT);

  if (params.get("selftest") === "1") {
    const results = selfTest();
    const passed = results.filter((result) => result.pass).length;
    const pre = document.createElement("pre");
    pre.id = "selftest-results";
    pre.style.cssText = "position:fixed;left:8px;bottom:8px;z-index:99;max-width:70vw;max-height:40vh;overflow:auto;background:#000;color:#0f0;font:11px monospace;padding:8px;white-space:pre-wrap";
    pre.textContent = results.map((result) => `${result.pass ? "PASS" : "FAIL"} ${result.name}${result.detail ? ` — ${result.detail}` : ""}`).join("\n");
    document.body.appendChild(pre);
    document.title = `${passed === results.length ? "SELFTEST PASS" : "SELFTEST FAIL"} ${passed}/${results.length}`;
    window.__selftest = results;
  }

  if (params.get("demo") === "1") {
    // Keep the table in a readable mid-game state for screenshots.
    state.fast = false;
    setTimeout(() => {
      if (!state || state.phase !== "lead" || state.turn !== MY_SEAT) return;
      const combo = chooseLead(state.hands[MY_SEAT], { jitter: false });
      if (!combo) return;
      state.selected = combo.tiles.map((tile) => tile.id);
      renderAll();
      scene?.setSelected(state.selected);
      setTimeout(() => {
        if (state && state.phase === "lead" && state.turn === MY_SEAT) humanLead();
      }, 500);
    }, 2600);
  }

  if (willPrompt) {
    setTimeout(() => showLobby("menu"), 450);
    /* A page reached by forceReload carries ?v=; check once even inside the
       5-minute window so the new version is confirmed, not assumed. */
    const forced = Boolean(new URLSearchParams(location.search).get("v"));
    setTimeout(() => checkForUpdate({ force: forced }), 1400);
  } else if (autoRoom) {
    setTimeout(() => {
      const field = $("#lobbyCodeInput");
      if (field) field.value = formatRoomCode(autoRoom);
      const explicitName = cleanGuestName(params.get("name") || "", "");
      const explicitPin = normalisePin(params.get("pin") || "");
      const rejoin = loadRejoinSeat(autoRoom);
      if (rejoin) {
        const rejoinName = restoreName || rejoin.name || explicitName || loadPlayerName();
        joinRoom(autoRoom, rejoinName, "", rejoin.token);
        return;
      }
      if (explicitName) {
        joinRoom(autoRoom, explicitName, explicitPin);
        return;
      }
      const nameField = $("#lobbyNameInput");
      if (nameField && !nameField.value) nameField.value = params.get("name") || restoreName || loadPlayerName();
      const pinField = $("#lobbyPinInput");
      if (pinField && params.get("pin")) pinField.value = normalisePin(params.get("pin"));
      showLobby("join");
      setLobbyStatus(restoreName ? t("net.reconnectHint", { code: formatRoomCode(autoRoom) }) : nameField?.value ? t("net.joinHint") : t("net.enterName"), restoreName ? "jade" : "");
      if (nameField?.value) $("#lobbyCodeInput")?.focus();
      else nameField?.focus();
    }, 350);
  } else if (autoHost) {
    setTimeout(() => createHostRoom(params.get("name") || loadPlayerName() || t("net.hostDefault")), 300);
  }
}

window.LeabTui = {
  version: APP.version,
  getState: () => serializableState(),
  getStats: () => clone(stats),
  getPrefs: () => clone(prefs),
  getLanguage: () => LANG,
  setLanguage,
  newMatch: (options = {}) => beginMatch(options),
  nextRound: startNextRound,
  lead: (ids) => {
    if (isClient()) return sendNetAction("lead", ids || [], false);
    return leadTrick(MY_SEAT, ids || []);
  },
  follow: (ids, reveal = false) => {
    if (isClient()) return sendNetAction("follow", ids || [], false);
    return submitPlay(MY_SEAT, ids || [], false);
  },
  showdown: (reveal = false) => humanFollow(Boolean(reveal)),
  openPile: (seat, pile) => openPileModal(seat, pile),
  toggleTile,
  clearSelection,
  hint: applyHint,
  undo: undoLastTrick,
  exportPayload: buildExport,
  selfTest,
  simulateRound,
  detectCombo: (ids) => detectCombo(ids.map((id) => TILE_BY_ID[id]).filter(Boolean)),
  getCamera: () => scene?.getState?.() || null,
  applyFontSize,
  applyTheme,
  getDisplay: () => ({ fontSize: prefs.fontSize, theme: prefs.theme, fontSizes: FONT_SIZES.map((entry) => entry.id), themes: THEMES.map((entry) => entry.id) }),
  checkUpdate: (force = false) => checkForUpdate({ force }),
  exportHandSlots: () => scene?.exportHandSlots?.() || [],
  publishHandLayout: (slots) => publishHandLayout(slots),
  getSeatLayout: (seat) => scene?.getSeatLayout?.(seat) || null,
  getTileScreen: (id) => scene?.tileScreen?.(id) || null,
  getVersionState: () => ({ current: APP.version, available: availableVersion, checkedAt: (() => { try { return JSON.parse(localStorage.getItem(VERSION_CHECK_KEY) || "null")?.at || 0; } catch { return 0; } })() }),
  openRanks: () => setRankReference(true),
  closeRanks: () => setRankReference(false),
  getAudioState: () => ({ context: audio?.ctx?.state || null, unlocked: Boolean(audio?.unlocked), sound: prefs.sound, master: audio?.master?.gain.value ?? null, level: audio?.level?.() ?? 0, time: audio?.ctx?.currentTime ?? null, playCount: audio?.playCount ?? 0, lastPlayed: audio?.lastPlayed ?? null }),
  playSound: (name, seat = 0) => audio?.play(name, seat),
  inspect: (id) => inspectTile(id),
  inspectHidden,
  resetView: () => scene?.resetView(),
  resetBoard: () => resetBoardView(),
  topView: () => scene?.toggleTopView(),
  setTopView: (value) => scene?.setTopView?.(Boolean(value)),
  setFast: (value) => { if (state) state.fast = Boolean(value); },
  net: {
    getState: () => (isNetworked() ? {
      role: net.role,
      code: formatRoomCode(net.code),
      mySeat: MY_SEAT,
      started: Boolean(net.started),
      players: serialiseRoster(),
      peerId: isHost() ? net.host?.id : net.client?.hostId,
      pending: isHost() ? pendingList() : [],
      approval: isHost() ? Boolean(net.security?.approval) : null,
      pinSet: isHost() ? Boolean(net.security?.pinSet) : null,
      lastPublished
    } : null),
    openLobby: () => showLobby(isNetworked() ? (isHost() ? "host" : "waiting") : "menu"),
    closeLobby,
    host: (name) => createHostRoom(name),
    join: (code, name, pin = "") => joinRoom(code, name, pin),
    start: () => startHostedMatch(),
    pending: () => pendingList().map((request) => ({ connId: request.connId, name: request.name, at: request.at })),
    approve: approvePending,
    deny: denyPending,
    setApproval: setRoomApproval,
    setPin: setRoomPin,
    leave: () => leaveRoom(),
    solo: backToSolo,
    selfTest: netSelfTest,
    sanitize: (seat) => sanitizeForSeat(state, seat),
    hydrate: hydrateRemoteState,
    roomCode: () => (net ? formatRoomCode(net.code) : ""),
    copyInvite,
    roomInfo: roomInfoText,
    probe: (code, pin = "") => probeRoom(code, pin),
    diagnostics: diagnosticsText
  },
  chat: {
    send: sendChat,
    append: appendChat,
    messages: () => clone(chatHistory),
    open: setChatOpen,
    isOpen: () => chatOpen
  },
  voice: {
    join: () => ensureVoice().join(),
    joinWithStream: (stream) => ensureVoice().joinWithStream(stream),
    leave: () => voice?.leave(),
    state: () => (voice ? voice.snapshot() : null),
    peers: () => voicePeers(),
    mic: (muted) => voice?.setMicMuted(muted),
    deafen: (deafened) => voice?.setDeafened(deafened)
  }
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
