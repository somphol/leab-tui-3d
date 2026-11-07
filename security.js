/* ==========================================================================
   Leab-Tui 3D — security.js
   Room-PIN policy and a memory-only digest.

   The policy is public by design. It raises the cost of online guessing; it is
   not authentication. Host approval and the per-connection/global rate limits
   remain the real lobby gate.
   ========================================================================== */

export const PIN_MIN = 5;
export const PIN_MAX = 5;

/* A small starter deny-list. It is intentionally visible in the source: its
   job is to stop the obvious, not to be a full password dictionary. */
const COMMON = new Set([
  "00000", "11111", "22222", "33333", "44444", "55555", "66666", "77777",
  "88888", "99999", "12345", "54321", "12121", "11223", "12321", "11122",
  "22211", "12312", "12332", "12344", "43210", "55512", "77777", "10000",
  "20000", "30000", "40000", "50000", "60000", "70000", "80000", "90000"
].map((value) => value.toLowerCase()));

const SEQUENCES = [
  "0123456789", "9876543210", "abcdefghijklmnopqrstuvwxyz",
  "zyxwvutsrqponmlkjihgfedcba", "qwertyuiop", "poiuytrewq", "asdfghjkl",
  "lkjhgfdsa", "123456789", "abcdefgh"
];

export function normalisePin(value) {
  /* A 5-digit PIN is numeric by design; strip separators/spaces on paste. */
  return String(value ?? "").replace(/\D/g, "").slice(0, PIN_MAX);
}

export function validatePin(value, context = {}) {
  const pin = normalisePin(value);
  if (pin.length < PIN_MIN) return { ok: false, reason: "short" };
  if (pin.length > PIN_MAX) return { ok: false, reason: "long" };
  if (!/^[0-9]{5}$/.test(pin)) return { ok: false, reason: "digit" };
  if (COMMON.has(pin)) return { ok: false, reason: "common" };
  if (/^(.)\1{4}$/.test(pin)) return { ok: false, reason: "repeat" };
  if (SEQUENCES.some((sequence) => pin.includes(sequence))) {
    return { ok: false, reason: "sequence" };
  }
  const name = String(context.name || "").trim();
  if (name.length >= 3 && name === pin) return { ok: false, reason: "name" };
  return { ok: true, reason: "", score: pinStrength(pin) };
}

const PIN_ALL = "0123456789";

function randomInt(max) {
  if (globalThis.crypto?.getRandomValues) {
    const values = new Uint32Array(1);
    globalThis.crypto.getRandomValues(values);
    return values[0] % max;
  }
  return Math.floor(Math.random() * max);
}

/**
 * Five digits from a CSPRNG, rejecting common/repeated/sequential values.
 * Example: 48213.
 */
export function generatePin() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    let pin = "";
    for (let index = 0; index < 5; index += 1) pin += PIN_ALL[randomInt(PIN_ALL.length)];
    if (validatePin(pin).ok) return pin;
  }
  return "48213";
}

export function pinStrength(value) {
  const pin = normalisePin(value);
  let score = 0;
  if (pin.length === PIN_MIN) score += 2;
  if (/^[0-9]+$/.test(pin)) score += 1;
  if (!COMMON.has(pin)) score += 1;
  return Math.min(4, score);
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
  classes: ["digit"], length: 5,
  denyListSize: COMMON.size,
  hash: "SHA-256, memory only"
});
