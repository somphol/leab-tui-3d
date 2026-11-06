/* ==========================================================================
   Leab-Tui 3D — security.js
   Room-PIN policy and a memory-only digest.

   The policy is public by design. It raises the cost of online guessing; it is
   not authentication. Host approval and the per-connection/global rate limits
   remain the real lobby gate.
   ========================================================================== */

export const PIN_MIN = 15;
export const PIN_MAX = 64;

/* A small starter deny-list. It is intentionally visible in the source: its
   job is to stop the obvious, not to be a full password dictionary. */
const COMMON = new Set([
  "12345678", "123456789", "1234567890", "87654321", "11111111", "00000000",
  "password", "password1", "password123", "passw0rd", "p@ssw0rd", "qwerty",
  "qwerty123", "qwertyuiop", "letmein", "welcome", "welcome1", "admin",
  "admin123", "iloveyou", "monkey", "dragon", "football", "baseball",
  "sunshine", "princess", "master", "shadow", "superman", "batman",
  "trustno1", "abc12345", "abcd1234", "a1b2c3d4", "changeme", "secret",
  "leabtui", "leabtui3d", "leab", "tui", "xiangqi", "mahjong", "poker",
  "thailand", "bangkok", "somphol", "opencode", "deepseek", "peerjs",
  "webRTC", "webrtc", "multiplayer", "roomcode", "hosttable", "guest"
].map((value) => value.toLowerCase()));

const SEQUENCES = [
  "0123456789", "9876543210", "abcdefghijklmnopqrstuvwxyz",
  "zyxwvutsrqponmlkjihgfedcba", "qwertyuiop", "poiuytrewq", "asdfghjkl",
  "lkjhgfdsa", "123456789", "abcdefgh"
];

export function normalisePin(value) {
  return String(value ?? "").trim().slice(0, PIN_MAX);
}

export function validatePin(value, context = {}) {
  const pin = normalisePin(value);
  const lower = pin.toLowerCase();
  if (pin.length < PIN_MIN) return { ok: false, reason: "short" };
  if (pin.length > PIN_MAX) return { ok: false, reason: "long" };
  if (/\s/.test(pin)) return { ok: false, reason: "space" };
  if (!/[a-z]/.test(pin)) return { ok: false, reason: "lower" };
  if (!/[A-Z]/.test(pin)) return { ok: false, reason: "upper" };
  if (!/[0-9]/.test(pin)) return { ok: false, reason: "digit" };
  if (!/[^A-Za-z0-9]/.test(pin)) return { ok: false, reason: "symbol" };
  if (COMMON.has(lower) || COMMON.has(lower.replace(/[^a-z0-9]/g, ""))) {
    return { ok: false, reason: "common" };
  }
  if (/^(.)\1+$/.test(pin)) return { ok: false, reason: "repeat" };
  if (SEQUENCES.some((sequence) => lower.includes(sequence))) {
    return { ok: false, reason: "sequence" };
  }
  const roomCode = String(context.roomCode || "").replace(/[^a-z0-9]/gi, "").toLowerCase();
  if (roomCode.length >= 4 && lower.replace(/[^a-z0-9]/g, "").includes(roomCode)) {
    return { ok: false, reason: "room" };
  }
  const name = String(context.name || "").trim().toLowerCase();
  if (name.length >= 3 && lower.includes(name)) return { ok: false, reason: "name" };
  return { ok: true, reason: "", score: pinStrength(pin) };
}

const PIN_LOWER = "abcdefghjkmnpqrstuvwxyz";
const PIN_UPPER = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const PIN_DIGITS = "23456789";
const PIN_SYMBOLS = "!@$%*+";
const PIN_ALL = PIN_LOWER + PIN_UPPER + PIN_DIGITS + PIN_SYMBOLS;

function randomInt(max) {
  if (globalThis.crypto?.getRandomValues) {
    const values = new Uint32Array(1);
    globalThis.crypto.getRandomValues(values);
    return values[0] % max;
  }
  return Math.floor(Math.random() * max);
}

/**
 * 20 unambiguous characters in four groups, guaranteed to contain lower,
 * upper, digit and symbol. Example: K7mQ9-xTa2p-Rw4!n-Z8vB3.
 */
export function generatePin() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const chars = Array.from({ length: 20 }, () => PIN_ALL[randomInt(PIN_ALL.length)]);
    chars[0] = PIN_UPPER[randomInt(PIN_UPPER.length)];
    chars[1] = PIN_LOWER[randomInt(PIN_LOWER.length)];
    chars[2] = PIN_DIGITS[randomInt(PIN_DIGITS.length)];
    chars[3] = PIN_SYMBOLS[randomInt(PIN_SYMBOLS.length)];
    for (let index = chars.length - 1; index > 0; index -= 1) {
      const swap = randomInt(index + 1);
      [chars[index], chars[swap]] = [chars[swap], chars[index]];
    }
    const groups = [];
    for (let index = 0; index < chars.length; index += 5) groups.push(chars.slice(index, index + 5).join(""));
    const pin = groups.join("-");
    if (validatePin(pin).ok) return pin;
  }
  return "K7mQ9-xTa2p-Rw4!n-Z8vB3";
}

export function pinStrength(value) {
  const pin = normalisePin(value);
  let score = 0;
  if (pin.length >= PIN_MIN) score += 1;
  if (pin.length >= 20) score += 1;
  if (/[a-z]/.test(pin) && /[A-Z]/.test(pin)) score += 1;
  if (/[0-9]/.test(pin)) score += 1;
  if (/[^A-Za-z0-9]/.test(pin)) score += 1;
  return Math.min(5, score);
}

/**
 * Hash the PIN for in-memory comparison. The plain PIN is never stored in the
 * app state, roster, exports or localStorage. In a non-secure context where
 * SubtleCrypto is unavailable, return a namespaced in-memory value and let the
 * caller refuse to set a PIN (the UI reports that secure context is required).
 */
export async function hashPin(value) {
  const pin = normalisePin(value);
  if (!globalThis.crypto?.subtle) return null;
  try {
    const bytes = new TextEncoder().encode(pin);
    const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  } catch {
    return null;
  }
}

export const PIN_POLICY = Object.freeze({
  min: PIN_MIN,
  max: PIN_MAX,
  classes: ["lowercase", "uppercase", "digit", "symbol"],
  denyListSize: COMMON.size,
  hash: "SHA-256, memory only"
});
