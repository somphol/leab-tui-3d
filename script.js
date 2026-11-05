/* ==========================================================================
   Leab-Tui 3D — Traditional Xiangqi Trick-Taking Studio
   Vanilla ES module. Three.js is imported dynamically so the rule engine,
   coaching, scoring and persistence still work if WebGL or the CDN fails.
   ========================================================================== */

const APP = Object.freeze({
  name: "Leab-Tui 3D",
  fullName: "Leab-Tui 3D — Traditional Xiangqi Trick-Taking Studio",
  version: "1.3.0",
  format: "leab-tui-3d-save",
  storageKey: "leabtui.match.v1",
  prefsKey: "leabtui.prefs.v1",
  statsKey: "leabtui.stats.v1",
  exportName: "leab_tui_3d_game.json",
  repository: "https://github.com/somphol/leab-tui-3d",
  live: "https://somphol.github.io/leab-tui-3d/",
  license: "MIT",
  build: {
    startedAt: "2026-11-04T00:16:43-08:00",
    packagedAt: "2026-11-04T17:32:31-08:00",
    durationHuman: "2h 5m 0s",
    tokensTotal: "900146",
    tokensInput: "522500",
    tokensOutput: "211891",
    tokensReasoning: "165755",
    tokensCacheRead: "90081152",
    sessionId: "ses_e5a5e419dffedJGEsMy3mKV3ey",
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
  { id: "soldier",  power: 1, copies: 5, en: "Soldier",  th: "จุก",  thAlt: "ทหาร",     red: "兵", black: "卒", note: { en: "The only rank with five copies; it can form same-rank sets.", th: "ฐานันดรเดียวที่มีห้าตัว จึงสร้างชุดตัวเหมือนได้" } },
  { id: "cannon",   power: 2, copies: 2, en: "Cannon",   th: "เผ่า",  thAlt: "ปืนใหญ่",  red: "炮", black: "包", note: { en: "Low straight member; pairs and straights are its value.", th: "ตัวเล็กในชุดเรียง มีค่าเมื่อจับคู่หรือเรียง" } },
  { id: "horse",    power: 3, copies: 2, en: "Horse",    th: "เบ๊",  thAlt: "ม้า",      red: "傌", black: "馬", note: { en: "Middle of the small straight Chariot–Horse–Cannon.", th: "ตัวกลางของชุดเล็ก เรือ–ม้า–เผ่า" } },
  { id: "chariot",  power: 4, copies: 2, en: "Chariot",  th: "กือ",  thAlt: "เรือ",     red: "俥", black: "車", note: { en: "Top of the small straight; a red Chariot pair is strong.", th: "หัวชุดเล็ก คู่กือแดงแข็งแรง" } },
  { id: "elephant", power: 5, copies: 2, en: "Elephant", th: "ช้าง", thAlt: "เฉียว",    red: "相", black: "象", note: { en: "Foot of the big straight; only Advisors and Generals outrank it.", th: "ท้ายชุดใหญ่ มีเพียงบินและตี่ที่ใหญ่กว่า" } },
  { id: "advisor",  power: 6, copies: 2, en: "Advisor",  th: "บิน",  thAlt: "สือ",      red: "仕", black: "士", note: { en: "Second only to the General; red Advisor pairs are the top pair.", th: "รองจากตี่ คู่บินแดงคือคู่ที่ใหญ่ที่สุด" } },
  { id: "general",  power: 7, copies: 1, en: "General",  th: "ตี่",  thAlt: "กษัตริย์", red: "帥", black: "將", note: { en: "One per colour. It cannot form a pair, but wins every single.", th: "สีละหนึ่งตัว สร้างคู่ไม่ได้ แต่ชนะเลี๊ยบทุกตัว" } }
]);

const RANK_BY_ID = Object.fromEntries(RANKS.map((r) => [r.id, r]));
const RANK_BY_POWER = Object.fromEntries(RANKS.map((r) => [r.power, r]));
const SEATS = Object.freeze([
  { id: 0, key: "you",   wind: "南", angle: 0,             en: "You",   th: "คุณ",        short: "S" },
  { id: 1, key: "east",  wind: "東", angle: Math.PI / 2,   en: "East",  th: "บูรพา",      short: "E" },
  { id: 2, key: "north", wind: "北", angle: Math.PI,       en: "North", th: "อุดร",       short: "N" },
  { id: 3, key: "west",  wind: "西", angle: -Math.PI / 2,  en: "West",  th: "ประจิม",     short: "W" }
]);

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
    "hud.trick": "Trick",
    "hud.target": "Target",
    "hud.turn": "Turn",
    "dock.select": "Select your tiles",
    "dock.leadTitle": "Choose a combination to lead",
    "dock.leadHelp": "Click carved tiles on the table. Tap Hint if you want a suggestion.",
    "dock.leadReady": "Ready to lead {combo}. {n} tile(s) selected.",
    "dock.followTitle": "{seat} led {combo}",
    "dock.followHelp": "Select exactly {n} tile(s). A legal {type} that beats the table can be revealed; anything else must go face-down.",
    "dock.waiting": "{seat} is thinking…",
    "dock.pick": "Select {n} tile(s) for this trick.",
    "dock.selected": "{n} selected.",
    "actions.hint": "Hint",
    "actions.clear": "Clear",
    "actions.lead": "Lead",
    "actions.reveal": "Reveal & challenge",
    "actions.facedown": "Play face-down",
    "actions.title": "Actions",
    "actions.newMatch": "New match",
    "actions.nextRound": "Next round",
    "actions.undo": "Undo trick",
    "actions.export": "Export JSON",
    "actions.continue": "Continue",
    "actions.keep": "Keep playing",
    "actions.sound": "Sound",
    "display.title": "Display",
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
    "camera.hint": "Drag to orbit · scroll to zoom · right-drag to pan",
    "coach.title": "Coach",
    "coach.live": "live",
    "score.title": "Match",
    "score.target": "First to",
    "score.points": "points",
    "score.pile": "pile",
    "score.piles": "piles",
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
    "log.title": "Trick log",
    "log.live": "live",
    "log.empty": "The table is quiet. Lead the first trick.",
    "footer.credit": "Built with OpenCode + DeepSeek V4.1 Flash",
    "error.webglTitle": "The 3D table could not start",
    "error.webglBody": "Three.js needs WebGL 2 and a network connection to the CDN. The rules, score and coaching panels still work.",
    "rules.title": "Rules of เลี๊ยบตุ่ย",
    "undo.title": "Why did that trick go wrong?",
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
    "coach.followBeat": "{seat} led {combo}. You can beat it with {yours} — reveal and take the trick.",
    "coach.followNoBeat": "Your best {type} is {yours}, but {best} still wins. Send {n} tiles face-down and keep your strength.",
    "coach.followNoCombo": "You have no legal {type}. Send {n} tiles face-down; an unrevealed set cannot win.",
    "coach.followReady": "Your {combo} beats {best}. Reveal to capture {tiles} tiles, or play face-down to keep it.",
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
    "toast.lang": "Language switched to English.",
    "summary.round": "Round {n} complete",
    "summary.match": "Match complete",
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
    "undo.whyHidden": "You kept your tiles face-down, so they never entered the comparison. Revealing is optional — but only a revealed set can win.",
    "undo.whyRank": "{losing} is below {winning} in the hierarchy. Rank is checked before colour.",
    "undo.whyColor": "Both sets share a rank, but {winning} is red and red beats black at equal rank.",
    "undo.whyTie": "The sets are equal in rank and colour, so the earlier play keeps the trick.",
    "undo.whyType": "Only the called type can win. Your set did not match the call.",
    "undo.whyPair": "The duplicated pair decides a See Hoo: {winning} has the higher pair.",
    "undo.whySet": "The set value decides: {winning} is the stronger straight or same-rank set.",
    "undo.whyUnknown": "The winner's revealed combination outranks your entry for this call.",
    "undo.noTrick": "No completed trick is stored yet.",
    "about.intro": "A bilingual, single-page studio for เลี๊ยบตุ่ย (Leab-Tui), the Thai trick-taking game played with the 32 tiles of a Chinese chess set. It is a teaching table, not a gambling app, tournament server or complete historical rulebook.",
    "about.how": "Thirty-two carved tiles, four seats, eight tiles each. The holder of the red General leads. Each trick calls a shape — Leab, Tui, Sa Hoo, See Hoo, Ngoh Hoo or Lak Hoo — and everyone sends that many tiles. Revealed sets compete; face-down sets never do. The winner takes 4×N tiles and leads next.",
    "about.credits": "Credits",
    "about.harness": "Harness",
    "about.model": "Model",
    "about.build": "Build record",
    "about.tech": "Technology",
    "about.privacy": "Privacy",
    "about.privacyBody": "No account, no analytics, no network calls except the pinned Three.js CDN. Match state, preferences and statistics stay in this browser's localStorage. Export writes a JSON file locally.",
    "about.license": "Licence",
    "about.licenseBody": "MIT. The Three.js library is distributed under its own MIT licence. See THIRD_PARTY_NOTICES.md.",
    "about.source": "Source and live demo",
    "about.buildLine": "Built {date} in {duration}; {tokens} measured tokens across the OpenCode session.",
    "about.modelLine": "Designed, written, verified and documented with {harness} using {model}.",
    "rules.source": "Rule reference",
    "rules.sourceBody": "The rules are modelled on the traditional Thai description compiled by Navee Angsuputiphant (2016), with the five-tile Ngoh Hoo included and the two- and three-player variants left out. Where the source is ambiguous, this studio documents its interpretation in docs/RULES.md.",
    "rules.digital": "Digital table conventions",
    "rules.digitalBody": "You may always send tiles face-down, even when you hold a legal set. A set must be revealed to compete. The leader must be able to form the called combination. The holder of the red General leads the opening trick; the winner of a trick leads the next.",
    "rules.goal": "Goal",
    "rules.goalBody": "Capture piles of four tiles. Two piles at the end of a round is par (0 points). Every pile above or below par is one point; capturing all eight piles is a 16-point Chuan. The first player to the match target (20 points by default) wins.",
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
    "rules.footnote": "This is an independent, open-source teaching implementation. It is not affiliated with any publisher or standards body."
  },
  th: {
    "app.title": "เลี๊ยบตุ่ย 3 มิติ",
    "app.subtitle": "สตูดิโอเกมกินกองด้วยหมากรุกจีน",
    "hud.round": "รอบ",
    "hud.trick": "ตา",
    "hud.target": "เป้า",
    "hud.turn": "ตาเดิน",
    "dock.select": "เลือกหมากของคุณ",
    "dock.leadTitle": "เลือกชุดที่จะนำ",
    "dock.leadHelp": "คลิกหมากบนโต๊ะ หรือกด “ใบ้” เพื่อขอคำแนะนำ",
    "dock.leadReady": "พร้อมนำ {combo} เลือกแล้ว {n} ตัว",
    "dock.followTitle": "{seat} เรียก {combo}",
    "dock.followHelp": "เลือกให้ครบ {n} ตัว ถ้าเป็น {type} ที่ใหญ่กว่าบนโต๊ะจึงเปิดสู้ได้ ไม่เช่นนั้นต้องลงคว่ำ",
    "dock.waiting": "{seat} กำลังคิด…",
    "dock.pick": "เลือก {n} ตัวสำหรับตานี้",
    "dock.selected": "เลือกแล้ว {n} ตัว",
    "actions.hint": "ใบ้",
    "actions.clear": "ล้าง",
    "actions.lead": "นำ",
    "actions.reveal": "เปิดสู้",
    "actions.facedown": "ลงคว่ำ",
    "actions.title": "การกระทำ",
    "actions.newMatch": "แมตช์ใหม่",
    "actions.nextRound": "รอบถัดไป",
    "actions.undo": "ย้อนตา",
    "actions.export": "ส่งออก JSON",
    "actions.continue": "เล่นต่อ",
    "actions.keep": "เล่นต่อ",
    "actions.sound": "เสียง",
    "display.title": "การแสดงผล",
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
    "rankRef.note": "ตี่ > บิน > ช้าง > กือ > เบ๊ > เผ่า > จุก · แดงชนะดำเมื่อศักดิ์เท่ากัน · ถ้าศักดิ์กับสีเท่ากัน คนที่ลงก่อนชนะ",
    "rankRef.close": "ปิดลำดับศักดิ์",
    "rankRef.highest": "สูงสุด",
    "rankRef.lowest": "ต่ำสุด",
    "camera.hint": "ลากเพื่อหมุน · เลื่อนเพื่อซูม · ลากขวาเพื่อเลื่อนฉาก",
    "coach.title": "โค้ช",
    "coach.live": "สด",
    "score.title": "คะแนน",
    "score.target": "ถึง",
    "score.points": "แต้ม",
    "score.pile": "กอง",
    "score.piles": "กอง",
    "inspector.title": "ตรวจหมาก",
    "inspector.hover": "ชี้",
    "inspector.empty": "ชี้หรือคลิกหมากเพื่อดูชื่อไทย ชื่ออังกฤษ และอันดับ",
    "inspector.rank": "อันดับ",
    "inspector.copies": "จำนวน",
    "inspector.color": "สี",
    "inspector.hidden": "หมากคว่ำ",
    "inspector.hiddenNote": "หน้าหมากถูกซ่อน ในเลี๊ยบตุ่ยหมากที่ไม่เปิดจะชนะไม่ได้ แม้จะมีศักดิ์ใหญ่กว่า",
    "inspector.selected": "เลือกเพื่อลง",
    "inspector.note": "ลำดับศักดิ์: ตี่ > บิน > ช้าง > กือ > เบ๊ > เผ่า > จุก สีแดงชนะสีดำเมื่อศักดิ์เท่ากัน และถ้าศักดิ์กับสีเท่ากัน คนที่ลงก่อนชนะ",
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
    "undo.title": "ทำไมตานั้นถึงแพ้?",
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
    "combo.sahoo.desc": "ชุดเรียงสามตัว: ชุดใหญ่ (ตี่–บิน–ช้าง) หรือชุดเล็ก (กือ–เบ๊–เผ่า) สีเดียวกัน",
    "combo.seehoo.desc": "ซาฮู้บวกตัวซ้ำหนึ่งตัว คู่ที่ซ้ำเป็นตัวตัดสิน",
    "combo.ngohoo.desc": "ซาฮู้ที่มีสองฐานันดรซ้ำ คู่สูงสุดตัดสินก่อน แล้วจึงคู่ถัดไป",
    "combo.lakhoo.desc": "คู่กือ–เบ๊–เผ่าครบทั้งสามคู่ หกตัว สีเป็นตัวตัดสิน",
    "rank.1": "จุก",
    "rank.2": "เผ่า",
    "rank.3": "เบ๊",
    "rank.4": "กือ",
    "rank.5": "ช้าง",
    "rank.6": "บิน",
    "rank.7": "ตี่",
    "phase.dealing": "แจกหมาก",
    "phase.lead": "นำ",
    "phase.follow": "ตาม",
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
    "coach.followBeat": "{seat} เรียก {combo} คุณสู้ได้ด้วย {yours} — เปิดเพื่อกินกองนี้",
    "coach.followNoBeat": "{type} ที่ดีที่สุดของคุณคือ {yours} แต่ {best} ยังใหญ่กว่า ส่ง {n} ตัวลงคว่ำและเก็บของดีไว้",
    "coach.followNoCombo": "คุณไม่มี {type} ที่ถูกกติกา ส่ง {n} ตัวลงคว่ำ หมากที่ไม่เปิดจะชนะไม่ได้",
    "coach.followReady": "{combo} ของคุณชนะ {best} เปิดเพื่อกิน {tiles} ตัว หรือลงคว่ำเพื่อเก็บไว้",
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
    "toast.lang": "เปลี่ยนภาษาเป็นไทยแล้ว",
    "summary.round": "จบรอบที่ {n}",
    "summary.match": "จบแมตช์",
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
    "undo.whyHidden": "คุณลงคว่ำ หมากจึงไม่เข้าการเปรียบเทียบ การเปิดสู้เป็นทางเลือก แต่มีเพียงชุดที่เปิดเท่านั้นที่ชนะ",
    "undo.whyRank": "{losing} อยู่ต่ำกว่า {winning} ในลำดับศักดิ์ ศักดิ์ถูกตัดสินก่อนสี",
    "undo.whyColor": "ศักดิ์เท่ากัน แต่ {winning} เป็นสีแดง และแดงชนะดำเมื่อศักดิ์เท่ากัน",
    "undo.whyTie": "ศักดิ์และสีเท่ากัน คนที่ลงก่อนจึงรักษากองไว้",
    "undo.whyType": "มีเพียงชนิดที่เรียกเท่านั้นที่ชนะ ชุดของคุณไม่ตรงกับที่เรียก",
    "undo.whyPair": "คู่ที่ซ้ำตัดสินสี่ฮู้: {winning} มีคู่ที่ใหญ่กว่า",
    "undo.whySet": "ค่าของชุดตัดสิน: {winning} เป็นชุดเรียงหรือชุดเดียวกันที่แข็งกว่า",
    "undo.whyUnknown": "ชุดที่ผู้ชนะเปิดมีศักดิ์ใหญ่กว่าชุดของคุณสำหรับตานี้",
    "undo.noTrick": "ยังไม่มีตาที่จบให้ย้อน",
    "about.intro": "สตูดิโอหน้าเดียวสองภาษาสำหรับเลี๊ยบตุ่ย เกมกินกองไทยที่เล่นด้วยหมากรุกจีน 32 ตัว เป็นโต๊ะสอนเล่น ไม่ใช่แอพพนัน เซิร์ฟเวอร์ทัวร์นาเมนต์ หรือกติกาประวัติศาสตร์ฉบับสมบูรณ์",
    "about.how": "หมากแกะสลัก 32 ตัว สี่ที่นั่ง คนละแปดตัว คนถือตี่แดงนำก่อน แต่ละตาเรียกชุด เลี๊ยบ ตุ่ย ซาฮู้ สี่ฮู้ ห้าฮู้ หรือหลักฮู้ แล้วทุกคนส่งจำนวนเท่ากัน ชุดที่เปิดเท่านั้นแข่งขัน ชุดคว่ำไม่แข่งขัน ผู้ชนะกิน 4×N ตัวและนำตาถัดไป",
    "about.credits": "เครดิต",
    "about.harness": "เครื่องมือ",
    "about.model": "โมเดล",
    "about.build": "บันทึกการสร้าง",
    "about.tech": "เทคโนโลยี",
    "about.privacy": "ความเป็นส่วนตัว",
    "about.privacyBody": "ไม่มีบัญชี ไม่มีการวิเคราะห์ และไม่มีการเรียกเครือข่ายนอกจาก Three.js CDN ที่ปักหมุดไว้ สถานะแมตช์ การตั้งค่า และสถิติเก็บใน localStorage ของเบราว์เซอร์นี้ การส่งออกเขียนไฟล์ JSON ในเครื่อง",
    "about.license": "สัญญาอนุญาต",
    "about.licenseBody": "MIT ส่วน Three.js เผยแพร่ภายใต้ MIT ของตัวเอง ดู THIRD_PARTY_NOTICES.md",
    "about.source": "ซอร์สและเดโม",
    "about.buildLine": "สร้างเมื่อ {date} ใช้เวลา {duration} และวัดได้ {tokens} โทเคนตลอดเซสชัน OpenCode",
    "about.modelLine": "ออกแบบ เขียน ตรวจสอบ และเขียนเอกสารด้วย {harness} โดยใช้ {model}",
    "rules.source": "แหล่งอ้างอิงกติกา",
    "rules.sourceBody": "กติกาอิงคำอธิบายไทยโดย นาวี อ. (2559) โดยเพิ่มห้าฮู้และตัดรูปแบบสองกับสามผู้เล่นออก หากต้นฉบับกำกวม สตูดิโอนี้อธิบายการตีความไว้ใน docs/RULES.md",
    "rules.digital": "ข้อตกลงของโต๊ะดิจิทัล",
    "rules.digitalBody": "ส่งหมากคว่ำได้เสมอแม้จะมีชุดถูกกติกา ชุดต้องเปิดจึงจะแข่งขันได้ ผู้นำต้องสร้างชุดที่เรียกได้ คนถือตี่แดงนำตแรก และผู้ชนะตาก่อนนำตาถัดไป",
    "rules.goal": "เป้าหมาย",
    "rules.goalBody": "เก็บกองละสี่ตัว สองกองเมื่อจบรอบคือทุน (0 แต้ม) เกินหรือขาดกองละหนึ่งแต้ม และแปดกองคือช้วน 16 แต้ม ผู้ที่ถึงเป้าแมตช์ก่อน (ค่าเริ่มต้น 20 แต้ม) ชนะ",
    "rules.equipment": "อุปกรณ์",
    "rules.equipmentBody": "หมากรุกจีน 32 ตัว แดง 16 ดำ 16 แต่ละสีมีตี่ 1 บิน 2 ช้าง 2 กือ 2 เบ๊ 2 เผ่า 2 จุก 5 ผู้เล่นสี่คนได้คนละแปดตัว",
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
    "rules.footnote": "นี่คือimplementation สอนเล่นโอเพนซอร์สอิสระ ไม่ได้เกี่ยวข้องกับสำนักพิมพ์หรือองค์กรมาตรฐานใด"
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

function tileName(tile, lang = LANG) {
  if (!tile) return "";
  return rankName(tile.power, lang);
}

function colorName(color, lang = LANG) {
  return lang === "th" ? COLORS[color].th : COLORS[color].en;
}

function seatName(seat, lang = LANG) {
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

const DEFAULT_PREFS = Object.freeze({ lang: "en", sound: true, coach: true, cinema: false, tileList: true, theme: "mahogany", fontSize: "md" });
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

function makeState(seed) {
  return {
    phase: "dealing",
    round: 1,
    trick: 0,
    dealer: 3,
    leader: 0,
    turn: 0,
    hands: [[], [], [], []],
    captures: [[], [], [], []],
    center: [],
    lead: null,
    best: null,
    selected: [],
    scores: [0, 0, 0, 0],
    roundPoints: [0, 0, 0, 0],
    target: 20,
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
    language: prefs.lang
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
  const copy = clone(base);
  copy.hands = source.hands.map((hand) => hand.map((tile) => typeof tile === "string" ? tile : tile.id));
  copy.captures = source.captures.map((pile) => pile.map((tile) => typeof tile === "string" ? tile : tile.id));
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
  try {
    localStorage.setItem(APP.storageKey, JSON.stringify({
      format: APP.format,
      version: APP.version,
      savedAt: nowISO(),
      game: serializableState()
    }));
  } catch { /* ignore */ }
}

function loadPrefs() {
  try {
    const raw = localStorage.getItem(APP.prefsKey);
    if (raw) prefs = { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch { prefs = { ...DEFAULT_PREFS }; }
  LANG = prefs.lang === "th" ? "th" : "en";
  if (!FONT_SIZES.some((entry) => entry.id === prefs.fontSize)) prefs.fontSize = "md";
  if (!THEMES.some((entry) => entry.id === prefs.theme)) prefs.theme = "mahogany";
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
    const game = parsed.game;
    if (!Array.isArray(game.hands) || game.hands.length !== 4) return false;
    if (!Array.isArray(game.scores) || game.scores.length !== 4) return false;
    if (!["lead", "follow", "roundEnd", "matchEnd"].includes(game.phase)) return false;
    const tileIds = new Set(DECK.map((tile) => tile.id));
    for (const hand of game.hands) {
      if (!Array.isArray(hand) || hand.length > 8) return false;
      if (!hand.every((id) => tileIds.has(id))) return false;
    }
    const savedPhase = game.phase;
    state = { ...makeState(game.seed), ...game, fast: false };
    state.hands = state.hands.map((hand) => hand.map((id) => TILE_BY_ID[id]).filter(Boolean));
    state.captures = (state.captures || [[], [], [], []]).map((pile) => pile.map((id) => TILE_BY_ID[id]).filter(Boolean));
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
    if (savedPhase === "roundEnd" || savedPhase === "matchEnd") state.phase = savedPhase;
    else state.phase = state.center.length ? "follow" : "lead";
    if (state.phase === "lead" && state.turn !== state.leader) state.turn = state.leader;
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

function beginTrick() {
  if (!state) return;
  clearTimeout(actionTimer);
  if (state.hands.every((hand) => hand.length === 0)) {
    endRound();
    return;
  }
  state.snapshot = { game: serializableState(state), stats: clone(stats), at: Date.now() };
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
  if (state.turn === 0) {
    audio?.play("flip", 0);
    coachTick();
  } else {
    scheduleAI(1100);
  }
  if (scene) scene.sync(state);
}

function scheduleAI(delay = 1000) {
  clearTimeout(actionTimer);
  if (!state || state.turn === 0) return;
  if (!["lead", "follow"].includes(state.phase)) return;
  const token = ++actionToken;
  const seat = state.turn;
  actionTimer = setTimeout(() => {
    if (!state || token !== actionToken) return;
    if (!["lead", "follow"].includes(state.phase) || state.turn !== seat) return;
    if (seat === 0) return;
    if (state.phase === "lead") aiLead(seat);
    else aiFollow(seat);
  }, state.fast ? 5 : delay);
}

function dealRound(leaderHint = null) {
  if (!state) return;
  clearTimeout(actionTimer);
  actionToken += 1;
  random = state.seed ? mulberry32(state.seed + state.round * 7919) : Math.random;
  const deck = shuffle(buildDeck());
  const hands = [[], [], [], []];
  for (let i = 0; i < 32; i += 1) hands[i % 4].push(deck[i]);
  state.hands = hands;
  state.captures = [[], [], [], []];
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
      beginTrick();
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
  state = makeState(options.seed ?? Math.floor(Math.random() * 1e9));
  state.fast = Boolean(options.fast);
  state.dealer = 3;
  state.round = options.round ?? 1;
  state.scores = [0, 0, 0, 0];
  state.history = [];
  state.log = [];
  state.lastRound = null;
  state.snapshot = null;
  state.target = options.target ?? 20;
  hideAllModals();
  renderAll();
  dealRound();
  savePrefs();
  saveStats();
  saveMatch();
  if (scene) scene.reset(state);
}

function startNextRound() {
  if (!state || state.phase === "matchEnd") return;
  clearTimeout(actionTimer);
  state.round += 1;
  state.dealer = (state.dealer + 1) % 4;
  state.target = state.target || 20;
  state.scores = state.scores.slice();
  state.roundPoints = [0, 0, 0, 0];
  state.lastRound = null;
  state.winner = null;
  state.log = [];
  state.seed = Math.floor(Math.random() * 1e9);
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
  state.best = { seat, combo };
  state.center.push({ seat, tiles, combo, revealed: true });
  state.selected = [];
  state.turn = (seat + 1) % 4;
  state.phase = "follow";
  state.handCounts = handCounts();
  state.log.push({ kind: "lead", trick: state.trick, seat, combo: clone(combo) });
  audio?.play("clack", seat);
  renderAll();
  saveMatch();
  if (scene) scene.sync(state);
  coachTick();

  if (state.turn !== 0) scheduleAI(1200);
  return true;
}

function submitPlay(seat, tileIds, reveal) {
  if (!state || state.phase !== "follow" || state.turn !== seat || !state.lead) return false;
  const hand = state.hands[seat];
  const tiles = tileIds.map((id) => hand.find((tile) => tile.id === id)).filter(Boolean);
  if (tiles.length !== state.lead.combo.count || tiles.length !== tileIds.length) return false;

  const combo = detectCombo(tiles);
  const legalType = combo && combo.type === state.lead.combo.type;
  const canReveal = Boolean(legalType && beats(combo, state.best.combo));
  const shown = Boolean(reveal && canReveal);

  state.hands[seat] = hand.filter((tile) => !tiles.includes(tile));
  state.center.push({ seat, tiles, combo, revealed: shown });
  if (shown) state.best = { seat, combo };
  state.selected = [];
  state.handCounts = handCounts();
  state.turn = (seat + 1) % 4;
  state.log.push({ kind: shown ? "challenge" : "hidden", trick: state.trick, seat, combo: clone(combo || null), revealed: shown });
  audio?.play(shown ? "flip" : "clack", seat);
  renderAll();
  saveMatch();
  if (scene) scene.sync(state);
  coachTick();

  if (state.center.length === 4) {
    resolveTrick();
  } else if (state.turn === 0) {
    // Human is next.
  } else {
    scheduleAI(900);
  }
  return true;
}

function resolveTrick() {
  if (!state || !state.best) return;
  state.phase = "resolving";
  const winner = state.best.seat;
  const winningCombo = state.best.combo;
  const captured = state.center.reduce((sum, entry) => sum + entry.tiles.length, 0);
  const allTiles = state.center.flatMap((entry) => entry.tiles);
  const humanEntry = state.center.find((entry) => entry.seat === 0);
  state.captures[winner].push(...allTiles);
  state.lastTrick = {
    winner,
    combo: clone(winningCombo),
    entries: state.center.map((entry) => ({
      seat: entry.seat,
      revealed: entry.revealed,
      combo: entry.combo ? clone(entry.combo) : null
    })),
    humanSeat: 0,
    humanWon: winner === 0,
    humanRevealed: Boolean(humanEntry?.revealed),
    humanCombo: humanEntry?.combo ? clone(humanEntry.combo) : null,
    humanTiles: humanEntry ? humanEntry.tiles.map((tile) => tile.id) : [],
    captured
  };
  state.log.push({ kind: "win", trick: state.trick, seat: winner, combo: clone(winningCombo), count: captured, human: winner === 0 });
  state.center = [];
  state.selected = [];
  state.handCounts = handCounts();
  state.leader = winner;
  updateUndoButton();
  renderAll();
  saveMatch();

  if (scene) scene.collect(state, winner, allTiles);
  audio?.play(winner === 0 ? "win" : "sweep", winner);
  if (winner === 0) {
    toast(t("coach.trickWon", { combo: comboSummary(winningCombo), piles: scoredPilesFromTiles(state.captures[0]) }), "gold");
  } else {
    toast(t("coach.trickLost", { seat: seatName(winner), combo: comboSummary(winningCombo), why: t("coach.whyUnknown") }), "");
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
  setTimeout(finish, state.fast ? 5 : 1250);
}

function endRound() {
  if (!state) return;
  clearTimeout(actionTimer);
  const piles = state.captures.map((pile) => scoredPilesFromTiles(pile));
  const points = piles.map((count) => scorePiles(count));
  state.roundPoints = points;
  state.scores = state.scores.map((score, index) => score + points[index]);
  state.phase = "roundEnd";
  state.handCounts = [0, 0, 0, 0];

  const humanPoints = points[0];
  stats.rounds += 1;
  stats.currentStreak = humanPoints > 0 ? stats.currentStreak + 1 : 0;
  stats.bestStreak = Math.max(stats.bestStreak, stats.currentStreak);
  stats.lastPlayed = nowISO();
  stats.history.unshift({
    at: nowISO(),
    round: state.round,
    points: points.slice(),
    scores: state.scores.slice(),
    piles: piles.slice(),
    human: humanPoints
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
    if (state.winner === 0) stats.wins += 1;
    else if (state.winner === -1) stats.draws += 1;
    else stats.losses += 1;
  }

  saveStats();
  saveMatch();
  renderAll();
  updateUndoButton();
  if (scene) scene.sync(state);
  audio?.play(state.winner === 0 || (state.phase === "roundEnd" && humanPoints > 0) ? "win" : "lose", 0);
  showRoundSummary(finished);
  if (state.phase === "matchEnd") toast(t("summary.match"), "gold");
}

function undoLastTrick() {
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

function aiFollow(seat) {
  if (!state || state.phase !== "follow" || state.turn !== seat || !state.lead) return;
  const decision = chooseFollow(state.hands[seat], state.lead.combo, state.best.combo, {
    playsLeft: 4 - state.center.length,
    deterministic: false
  });
  submitPlay(seat, decision.tiles.map((tile) => tile.id), decision.reveal);
}

/* --------------------------------------------------------------------------
   8. Human actions and coaching
   -------------------------------------------------------------------------- */

function humanLead() {
  if (!state || state.phase !== "lead" || state.turn !== 0) return;
  const tiles = selectedTiles();
  const combo = detectCombo(tiles);
  if (!combo) {
    toast(t("coach.invalidLead"), "wine");
    return;
  }
  if (leadTrick(0, tiles.map((tile) => tile.id))) {
    audio?.play("clack", 0);
    coachTick();
  }
}

function humanFollow(reveal) {
  if (!state || state.phase !== "follow" || state.turn !== 0 || !state.lead) return;
  const tiles = selectedTiles();
  if (tiles.length !== state.lead.combo.count) {
    toast(t("coach.selectMore", { n: state.lead.combo.count, m: tiles.length }), "wine");
    return;
  }
  if (reveal) {
    const combo = detectCombo(tiles);
    if (!combo || combo.type !== state.lead.combo.type || !beats(combo, state.best.combo)) {
      toast(t("toast.notLegal"), "wine");
      return;
    }
  }
  submitPlay(0, tiles.map((tile) => tile.id), reveal);
}

function selectedTiles() {
  if (!state) return [];
  return state.selected.map((id) => state.hands[0].find((tile) => tile.id === id)).filter(Boolean);
}

function toggleTile(id, options = {}) {
  if (!state) return;
  if (!["lead", "follow"].includes(state.phase) || state.turn !== 0) return;
  if (!state.hands[0].some((tile) => tile.id === id)) return;
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
  if (!state || !["lead", "follow"].includes(state.phase) || state.turn !== 0) return;
  if (state.phase === "lead") {
    const combo = chooseLead(state.hands[0], { jitter: false });
    if (!combo) return;
    state.selected = combo.tiles.map((tile) => tile.id);
    toast(t("toast.hint"), "jade");
  } else {
    const recommendation = recommendedFollow(state.hands[0], state.lead.combo, state.best.combo);
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
    return t("coach.trickWon", { combo: comboSummary(state.best?.combo), piles: scoredPilesFromTiles(state.captures[0]) });
  }
  if (state.phase === "roundEnd") {
    return t("coach.roundEnd", { points: state.roundPoints[0], score: state.scores[0] });
  }
  if (state.phase === "matchEnd") {
    const winner = state.winner === 0 ? t("summary.win") : state.winner === -1 ? t("summary.draw") : t("summary.lose", { seat: seatName(state.winner) });
    return `${winner} ${t("coach.rematch")}`;
  }

  const humanHand = state.hands[0];
  const left = humanHand.length;
  if (left === 0) return t("coach.roundEnd", { points: state.roundPoints[0], score: state.scores[0] });

  if (state.phase === "lead" && state.turn === 0) {
    const selected = detectCombo(selectedTiles());
    if (selected) return t("coach.followReady", { combo: comboSummary(selected), best: t("dock.leadTitle"), tiles: selected.count * 4 });
    if (state.selected.length) return t("coach.invalidLead");
    const combo = chooseLead(humanHand, { jitter: false });
    return t("coach.hintLead", { combo: comboSummary(combo), why: coachWhy(combo) });
  }

  if (state.phase === "lead" && state.turn !== 0) {
    return t("coach.aiLead", { seat: seatName(state.turn) });
  }

  if (state.phase === "follow") {
    const lead = state.lead;
    if (!lead) return t("coach.welcome");
    if (state.turn !== 0) {
      return t("coach.follow", { seat: seatName(state.turn), combo: comboSummary(lead.combo), n: lead.combo.count });
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
    if (beats(combo, state.best.combo)) {
      return t("coach.followReady", { combo: comboSummary(combo), best: comboSummary(state.best.combo), tiles: needed * 4 });
    }
    return t("coach.followLose", { combo: comboSummary(combo), best: comboSummary(state.best.combo) });
  }
  return t("coach.welcome");
}

function coachMeta() {
  if (!state) return "";
  const counts = state.hands.map((hand) => hand.length);
  const left = counts[0];
  const pieces = [`${t("coach.tilesLeft", { n: left })}`];
  if (state.phase === "follow" && state.lead) {
    const bestSeat = state.best?.seat;
    pieces.push(`${t("hud.trick")} ${state.trick} · ${comboName(state.lead.combo.type)} ×${state.lead.combo.count}`);
    if (bestSeat !== undefined) pieces.push(`${seatName(bestSeat)}: ${comboSummary(state.best.combo)}`);
  } else if (state.phase === "lead" && state.turn === 0) {
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
}

function showRoundSummary(matchEnded) {
  const modal = $("#summaryModal");
  if (!modal || !state) return;
  const isMatch = Boolean(matchEnded || state.phase === "matchEnd");
  $("#summaryTitle").textContent = isMatch ? t("summary.match") : t("summary.round", { n: state.round });
  const scoreRows = SEATS.map((seat) => `
    <tr>
      <td>${escapeHTML(seatName(seat.id))}${seat.id === 0 ? " ★" : ""}</td>
      <td class="num">${state.lastRound?.piles?.[seat.id] ?? 0}</td>
      <td class="num">${state.lastRound?.points?.[seat.id] ?? 0}</td>
      <td class="num">${state.scores[seat.id]}</td>
    </tr>`).join("");
  const chuan = state.lastRound?.chuan ? `<div class="summary-note">${escapeHTML(t("summary.chuan"))} — 16 ${escapeHTML(t("summary.points"))}.</div>` : "";
  const winnerLine = isMatch
    ? `<div class="summary-note">${escapeHTML(state.winner === 0 ? t("summary.win") : state.winner === -1 ? t("summary.draw") : t("summary.lose", { seat: seatName(state.winner) }))}</div>`
    : "";
  $("#summaryBody").innerHTML = `
    <div class="summary-hero"><strong>${state.lastRound?.points?.[0] ?? 0}</strong><span>${escapeHTML(t("summary.roundPoints"))} · ${escapeHTML(t("summary.you"))}</span></div>
    <table class="summary-table">
      <thead><tr><th>${escapeHTML(t("score.title"))}</th><th class="num">${escapeHTML(t("summary.piles"))}</th><th class="num">${escapeHTML(t("summary.points"))}</th><th class="num">${escapeHTML(t("summary.total"))}</th></tr></thead>
      <tbody>${scoreRows}</tbody>
    </table>
    ${chuan}
    ${winnerLine}
    <div class="summary-note">${escapeHTML(t("summary.note"))}</div>
    <div class="summary-note">${escapeHTML(t("summary.streak", { n: stats.currentStreak }))} · ${escapeHTML(t("summary.targetReached", { target: state.target }))}</div>`;
  $("#summaryPrimary").textContent = isMatch ? t("summary.newMatch") : t("summary.next");
  $("#summaryPrimary").dataset.action = isMatch ? "new" : "next";
  $("#summarySecondary").textContent = isMatch ? t("actions.export") : t("summary.newMatch");
  $("#summarySecondary").dataset.action = isMatch ? "export" : "new";
  modal.hidden = false;
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
  if (!trick.humanRevealed) why = t("undo.whyHidden");
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
      <div class="undo-side"><span>${escapeHTML(t("undo.youPlayed"))}</span><b>${escapeHTML(youPlayed)}</b><span>${trick.humanSeat === 0 ? escapeHTML(t("seat.you")) : ""}</span></div>
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
  if (nextRound) nextRound.hidden = state.phase !== "roundEnd";
  const streak = $("#streakChip");
  if (streak) streak.textContent = `×${stats.currentStreak}`;
  const target = $("#scoreTarget");
  if (target) target.textContent = state.target;
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
  else turn.textContent = seatName(state.turn);
  turn.dataset.seat = state.turn;
}

function renderScoreboard() {
  const board = $("#scoreboard");
  if (!board) return;
  board.innerHTML = SEATS.map((seat) => {
    const active = ["lead", "follow", "resolving"].includes(state.phase) && state.turn === seat.id;
    const piles = scoredPilesFromTiles(state.captures[seat.id]);
    return `<div class="score-row ${active ? "active" : ""} ${seat.id === 0 ? "you" : ""}">
      <span class="score-seat">${seat.wind}</span>
      <span class="score-name">${escapeHTML(seatName(seat.id))}</span>
      <span class="score-piles">${piles} ${escapeHTML(piles === 1 ? t("score.pile") : t("score.piles"))}</span>
      <span class="score-points">${state.scores[seat.id]}</span>
    </div>`;
  }).join("");
}

function renderHandList() {
  const list = $("#tileList");
  if (!list) return;
  const hand = state.hands[0];
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
  if (!title) return;

  const humanTurn = state.turn === 0 && ["lead", "follow"].includes(state.phase);
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
    const combo = detectCombo(selected);
    const legal = combo && combo.type === state.lead.combo.type;
    const canBeat = legal && beats(combo, state.best.combo);
    kicker.textContent = t("dock.select");
    title.textContent = t("dock.followTitle", { seat: seatName(state.lead.seat), combo: comboSummary(state.lead.combo) });
    if (selected.length !== needed) {
      detail.textContent = t("dock.followHelp", { n: needed, type: comboName(state.lead.combo.type) });
    } else if (!legal) {
      detail.textContent = t("coach.followNoCombo", { type: comboName(state.lead.combo.type), n: needed });
    } else if (canBeat) {
      detail.textContent = t("coach.followReady", { combo: comboSummary(combo), best: comboSummary(state.best.combo), tiles: needed * 4 });
    } else {
      detail.textContent = t("coach.followLose", { combo: comboSummary(combo), best: comboSummary(state.best.combo) });
    }
    leadBtn.hidden = true;
    revealBtn.hidden = false;
    facedownBtn.hidden = false;
    revealBtn.disabled = !canBeat;
    facedownBtn.disabled = selected.length !== needed;
    revealBtn.textContent = t("actions.reveal");
    facedownBtn.textContent = t("actions.facedown");
    pips.innerHTML = Array.from({ length: needed }, (_, index) => `<i class="${index < selected.length ? "on" : ""}"></i>`).join("");
  }
}

function inspectTile(id) {
  const tile = TILE_BY_ID[id];
  if (!tile) return;
  inspectedTileId = id;
  renderInspector(tile, true);
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

function inspectHidden() {
  inspectedTileId = "hidden";
  const body = $("#inspectorBody");
  if (!body) return;
  body.innerHTML = `<div class="inspector-empty"><span class="ghost-tile" aria-hidden="true">?</span><div><strong>${escapeHTML(t("inspector.hidden"))}</strong><p>${escapeHTML(t("inspector.hiddenNote"))}</p></div></div>`;
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
    const time = String(entry.trick).padStart(2, "0");
    let text = "";
    if (entry.kind === "lead") text = `<strong>${escapeHTML(seatName(entry.seat))}</strong> ${escapeHTML(t("actions.lead"))} ${escapeHTML(comboSummary(entry.combo))}`;
    else if (entry.kind === "challenge") text = `<strong>${escapeHTML(seatName(entry.seat))}</strong> ${escapeHTML(t("actions.reveal"))} ${escapeHTML(comboSummary(entry.combo))}`;
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
  const hierarchy = RANKS.slice().reverse().map((rank) => `<li><code>${rank.power}</code> ${escapeHTML(LANG === "th" ? rank.th : rank.en)} <span style="color:var(--ink-faint)">· ${escapeHTML(LANG === "th" ? rank.en : rank.th)} · ${rank.red}${rank.black}</span></li>`).join("");
  const calls = COMBO_TYPES.map((type) => `<div class="rule-card"><b>${escapeHTML(comboName(type))}</b><span>${escapeHTML(t(`combo.${type}.desc`))}</span></div>`).join("");
  const scoreRows = Array.from({ length: 9 }, (_, piles) => `<tr><td>${piles} ${escapeHTML(t("rules.piles"))}</td><td>${piles === 8 ? "16" : piles - 2}</td></tr>`).join("");
  body.innerHTML = `
    <h3>${escapeHTML(t("rules.goal"))}</h3>
    <p>${escapeHTML(t("rules.goalBody"))}</p>
    <h3>${escapeHTML(t("rules.equipment"))}</h3>
    <p>${escapeHTML(t("rules.equipmentBody"))}</p>
    <h3>${escapeHTML(t("rules.hierarchy"))}</h3>
    <ul>${hierarchy}</ul>
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
      <div class="credit-card"><b>${escapeHTML(t("about.tech"))}</b><span>Three.js r160 · HTML5 · CSS3 · ES2022</span></div>
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
  steps.innerHTML = RANKS.slice().reverse().map((rank, index) => `
    <div class="rank-step">
      <em>${rank.power}</em>
      <div class="rank-tiles"><span class="mini-tile red">${rank.red}</span><span class="mini-tile black">${rank.black}</span></div>
      <b>${escapeHTML(LANG === "th" ? rank.th : rank.en)}</b>
      <span>${escapeHTML(LANG === "th" ? rank.en : rank.th)}</span>
    </div>${index < RANKS.length - 1 ? '<span class="rank-arrow" aria-hidden="true">›</span>' : ""}`).join("");
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
  applyTheme("mahogany", { silent: true });
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
  const label = $("#langLabel");
  if (label) label.textContent = LANG === "en" ? "ไทย" : "EN";
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
   13. Self-test
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
   14. Audio
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
   15. Three.js scene
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
  const tangentOffset = (col - (cols - 1) / 2) * 0.52;
  const radialOffset = (row - (rows - 1) / 2) * 0.52;
  const base = seatVector(seat, CENTER_RADIUS);
  const tangent = seatTangent(seat);
  const radial = { x: Math.sin(SEATS[seat].angle), z: Math.cos(SEATS[seat].angle) };
  return {
    x: base.x + tangent.x * tangentOffset + radial.x * radialOffset,
    y: TABLE_Y + TILE_THICKNESS / 2 + 0.012,
    z: base.z + tangent.z * tangentOffset + radial.z * radialOffset
  };
}

function capturePosition(seat, index) {
  const pile = Math.floor(index / 4);
  const within = index % 4;
  const row = Math.floor(pile / 4);
  const col = pile % 4;
  const base = seatVector(seat, 3.36);
  const tangent = seatTangent(seat);
  const radial = { x: Math.sin(SEATS[seat].angle), z: Math.cos(SEATS[seat].angle) };
  const tangentOffset = (col - 1.5) * 0.52;
  const radialOffset = (row - 0.5) * 0.42;
  return {
    x: base.x + tangent.x * tangentOffset + radial.x * radialOffset,
    y: TABLE_Y + TILE_THICKNESS / 2 + 0.014 + within * 0.036,
    z: base.z + tangent.z * tangentOffset + radial.z * radialOffset
  };
}

async function createScene() {
  const THREE = await import("three");
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

  let currentThemeId = SCENE_THEMES[prefs.theme] ? prefs.theme : "mahogany";
  const scenePalette = SCENE_THEMES[currentThemeId];
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(scenePalette.background);
  scene.fog = new THREE.Fog(scenePalette.fog ?? scenePalette.background, 15, 34);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 80);
  const portrait = window.matchMedia("(max-width: 640px)").matches;
  camera.fov = portrait ? 46 : 40;
  const homePosition = portrait
    ? new THREE.Vector3(0, 14.3, 17.2)
    : new THREE.Vector3(0, 10.2, 11.4);
  const homeTarget = portrait
    ? new THREE.Vector3(0, 0.18, 0.7)
    : new THREE.Vector3(0, 0.22, 0.9);
  camera.position.copy(homePosition);

  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(homeTarget);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.minDistance = 7.4;
  controls.maxDistance = 18.5;
  controls.minPolarAngle = 0.14;
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

  scene.add(table);

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
    scene.add(root);

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
    scene.add(ring);
    seatRings.push(ring);

    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 160;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 8;
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false }));
    const lp = seatVector(seat.id, 5.78);
    sprite.position.set(lp.x, 0.66, lp.z);
    sprite.scale.set(1.95, 0.61, 1);
    sprite.renderOrder = 4;
    sprite.visible = seat.id !== 0;
    scene.add(sprite);
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
  let dragging = false;
  let currentState = null;
  let topView = false;
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
    gameState.hands.forEach((hand, seat) => {
      const ordered = seat === 0 ? hand.slice().sort((a, b) => b.power - a.power || (a.color === "r" ? -1 : 1)) : hand.slice();
      ordered.forEach((tile, index) => {
        map.set(tile.id, { kind: "hand", seat, index, count: ordered.length, up: seat === 0, angle: handPosition(seat, index, ordered.length).angle });
      });
    });
    gameState.center.forEach((entry) => {
      entry.tiles.forEach((tile, index) => {
        map.set(tile.id, { kind: "center", seat: entry.seat, index, count: entry.tiles.length, up: Boolean(entry.revealed) });
      });
    });
    gameState.captures.forEach((pile, seat) => {
      pile.forEach((tile, index) => {
        map.set(tile.id, { kind: "capture", seat, index, count: pile.length, up: true });
      });
    });
    return map;
  }

  function positionFor(placement) {
    if (placement.kind === "hand") return handPosition(placement.seat, placement.index, placement.count);
    if (placement.kind === "center") return centerPosition(placement.seat, placement.index, placement.count);
    return capturePosition(placement.seat, placement.index);
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
    gameState.hands[0].forEach((tile, index) => {
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

  function onPointerMove(event) {
    if (event.buttons || dragging) return;
    const record = pick(event);
    const id = record?.id ?? null;
    if (id !== hoverId) {
      hoverId = id;
      canvas.classList.toggle("is-hovering-tile", Boolean(id));
      if (record) {
        const stateHasHumanTurn = currentState && currentState.turn === 0;
        if (record.faceUp || (currentState && currentState.hands[0].some((tile) => tile.id === record.id))) {
          inspectTile(record.id);
        } else if (stateHasHumanTurn) {
          inspectHidden();
        } else {
          inspectHidden();
        }
      }
    }
  }

  function onPointerLeave() {
    hoverId = null;
    canvas.classList.remove("is-hovering-tile");
  }

  function onPointerDown(event) {
    downPoint = { x: event.clientX, y: event.clientY, time: performance.now() };
    dragging = false;
  }

  function onPointerUp(event) {
    if (!downPoint) return;
    const moved = Math.hypot(event.clientX - downPoint.x, event.clientY - downPoint.y);
    const elapsed = performance.now() - downPoint.time;
    downPoint = null;
    if (dragging || moved > 7 || elapsed > 900) return;
    const record = pick(event);
    if (!record) return;
    const humanHand = currentState?.hands?.[0] || [];
    if (humanHand.some((tile) => tile.id === record.id) && currentState?.turn === 0 && ["lead", "follow"].includes(currentState.phase)) {
      toggleTile(record.id);
    } else if (record.faceUp) {
      inspectTile(record.id);
    } else {
      inspectHidden();
    }
  }

  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerleave", onPointerLeave);
  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointerup", onPointerUp);
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

  function resetView() {
    topView = false;
    $("#topViewBtn")?.setAttribute("aria-pressed", "false");
    tweenCamera(homePosition, homeTarget);
  }

  function toggleTopView() {
    topView = !topView;
    const button = $("#topViewBtn");
    button?.setAttribute("aria-pressed", String(topView));
    if (topView) tweenCamera(new THREE.Vector3(0, 14.6, 0.01), new THREE.Vector3(0, 0, 0));
    else tweenCamera(homePosition, homeTarget);
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

  const api = {
    deal,
    sync,
    collect,
    flipHumanHand,
    setSelected,
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
    toggleTopView,
    toggleCinema,
    getState() {
      return {
        position: camera.position.toArray(),
        target: controls.target.toArray(),
        topView,
        cinema,
        theme: currentThemeId,
        background: scene.background?.getHexString?.(),
        fog: scene.fog?.color?.getHexString?.(),
        tiles: [...tileObjects.values()].filter((record) => record.root.visible).length
      };
    }
  };
  return api;
}

/* --------------------------------------------------------------------------
   16. Boot and events
   -------------------------------------------------------------------------- */

function bindEvents() {
  $("#langToggle")?.addEventListener("click", () => setLanguage(LANG === "en" ? "th" : "en"));
  $("#soundToggle")?.addEventListener("click", () => setSound(!prefs.sound));
  $("#rulesBtn")?.addEventListener("click", () => { renderRules(); openModal("rulesModal"); audio?.play("click", 0); });
  $("#aboutBtn")?.addEventListener("click", () => { renderAbout(); openModal("aboutModal"); audio?.play("click", 0); });
  $("#aboutBtnSide")?.addEventListener("click", () => { renderAbout(); openModal("aboutModal"); audio?.play("click", 0); });
  $("#resetViewBtn")?.addEventListener("click", () => scene?.resetView());
  $("#topViewBtn")?.addEventListener("click", () => scene?.toggleTopView());
  $("#cinemaBtn")?.addEventListener("click", () => scene?.toggleCinema());
  $("#displayBtn")?.addEventListener("click", () => { renderDisplay(); openModal("displayModal"); audio?.play("click", 0); });
  $("#rankReferenceBtn")?.addEventListener("click", () => setRankReference($("#rankReference")?.hidden ?? true));
  $("[data-rank-close]")?.addEventListener("click", () => setRankReference(false));
  document.addEventListener("pointerdown", (event) => {
    const panel = $("#rankReference");
    const button = $("#rankReferenceBtn");
    if (!panel || panel.hidden) return;
    if (!panel.contains(event.target) && !button?.contains(event.target)) setRankReference(false);
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
  $("#revealBtn")?.addEventListener("click", () => humanFollow(true));
  $("#facedownBtn")?.addEventListener("click", () => humanFollow(false));
  $("#hintBtn")?.addEventListener("click", applyHint);
  $("#clearBtn")?.addEventListener("click", clearSelection);

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

  $("#confirmYes")?.addEventListener("click", () => { closeModal("confirmModal"); beginMatch(); toast(t("toast.newMatch"), "gold"); });
  $("#confirmNo")?.addEventListener("click", () => closeModal("confirmModal"));

  $("#summaryPrimary")?.addEventListener("click", (event) => {
    const action = event.currentTarget.dataset.action;
    if (action === "new") { closeModal("summaryModal"); beginMatch(); }
    else { closeModal("summaryModal"); startNextRound(); }
  });
  $("#summarySecondary")?.addEventListener("click", (event) => {
    const action = event.currentTarget.dataset.action;
    if (action === "export") exportGame();
    else { closeModal("summaryModal"); beginMatch(); }
  });

  $$("[data-close]").forEach((button) => button.addEventListener("click", () => closeModal(button.dataset.close)));
  $$(".modal").forEach((modal) => {
    modal.addEventListener("pointerdown", (event) => {
      if (event.target === modal && modal.id !== "summaryModal") modal.hidden = true;
    });
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      const open = $$(".modal").find((modal) => !modal.hidden);
      if (open && open.id !== "summaryModal") open.hidden = true;
      setRankReference(false);
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
  document.addEventListener("visibilitychange", () => { if (document.hidden) saveMatch(); });
}

async function boot() {
  loadPrefs();
  loadStats();
  applyFontSize(prefs.fontSize, { silent: true });
  applyTheme(prefs.theme, { silent: true });
  audio = new StudioAudio();
  applyLanguage(LANG);
  bindEvents();

  const params = new URLSearchParams(location.search);
  if (params.get("seed")) {
    const seed = Number(params.get("seed"));
    if (Number.isFinite(seed)) random = mulberry32(seed);
  }

  const restored = loadMatch();
  if (!restored) {
    state = makeState();
    state.target = 20;
    renderAll();
  } else {
    renderAll();
    if (state.phase === "roundEnd" || state.phase === "matchEnd") showRoundSummary(state.phase === "matchEnd");
  }
  updateUndoButton();

  try {
    scene = await createScene();
  } catch (error) {
    console.warn("3D scene unavailable:", error);
    $("#bootError").hidden = false;
  }

  if (!restored) {
    dealRound();
  } else if (state.phase === "lead" || state.phase === "follow") {
    if (state.turn !== 0) scheduleAI(900);
    else coachTick();
    if (scene) scene.sync(state);
  }

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
      if (!state || state.phase !== "lead" || state.turn !== 0) return;
      const combo = chooseLead(state.hands[0], { jitter: false });
      if (!combo) return;
      state.selected = combo.tiles.map((tile) => tile.id);
      renderAll();
      scene?.setSelected(state.selected);
      setTimeout(() => {
        if (state && state.phase === "lead" && state.turn === 0) humanLead();
      }, 500);
    }, 2600);
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
  lead: (ids) => leadTrick(0, ids || []),
  follow: (ids, reveal = false) => submitPlay(0, ids || [], reveal),
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
  openRanks: () => setRankReference(true),
  closeRanks: () => setRankReference(false),
  getAudioState: () => ({ context: audio?.ctx?.state || null, unlocked: Boolean(audio?.unlocked), sound: prefs.sound, master: audio?.master?.gain.value ?? null, level: audio?.level?.() ?? 0, time: audio?.ctx?.currentTime ?? null, playCount: audio?.playCount ?? 0, lastPlayed: audio?.lastPlayed ?? null }),
  playSound: (name, seat = 0) => audio?.play(name, seat),
  inspect: (id) => inspectTile(id),
  inspectHidden,
  resetView: () => scene?.resetView(),
  topView: () => scene?.toggleTopView(),
  setFast: (value) => { if (state) state.fast = Boolean(value); }
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
