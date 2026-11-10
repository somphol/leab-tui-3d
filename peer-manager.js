/* ==========================================================================
   Leab-Tui 3D — peer-manager.js
   Serverless WebRTC transport for the four-seat table.

   This module knows nothing about Leab-Tui's rules. It owns four things:
     1. Room-code formatting and validation.
     2. Lazy loading of the pinned PeerJS browser bundle from a CDN.
     3. A host endpoint that accepts many data connections.
     4. A client endpoint that dials one host and reconnects on request.

   Game protocol, seat assignment, redaction and authority live in script.js
   and are documented in docs/PROTOCOL.md. PeerJS is MIT licensed.
   ========================================================================== */

export const PROTOCOL_VERSION = 1;
export const ROOM_PREFIX = "LEAB-";
export const ROOM_CODE_LENGTH = 6;
export const PEER_ID_PREFIX = "leabtui-v1-";
export const PEERJS_VERSION = "1.5.4";
export const PEERJS_CDN = `https://cdn.jsdelivr.net/npm/peerjs@${PEERJS_VERSION}/dist/peerjs.min.js`;

/* Test-only network impairment for the multiplayer soak. It never engages
   unless a page is opened with `?netem=...`; the transport itself is
   unchanged. Drops/duplicates/delays application frames, not PeerJS
   signalling, so the data channel stays up while the game protocol is hurt. */
let netem = null;
let netemSeed = 0x9e3779b9;

export function configureNetem(config = {}) {
  const drop = Math.max(0, Math.min(0.9, Number(config.drop) || 0));
  const dup = Math.max(0, Math.min(0.5, Number(config.dup) || 0));
  const delay = Math.max(0, Math.min(5000, Number(config.delay) || 0));
  const jitter = Math.max(0, Math.min(5000, Number(config.jitter) || 0));
  const seed = Number(config.seed) || 0x9e3779b9;
  netem = (drop || dup || delay || jitter) ? { drop, dup, delay, jitter } : null;
  netemSeed = seed >>> 0;
  return netem;
}

export function netemState() {
  return netem ? { ...netem } : null;
}

function netemRoll() {
  netemSeed = (netemSeed + 0x6d2b79f5) >>> 0;
  let value = netemSeed;
  value = Math.imul(value ^ (value >>> 15), value | 1);
  value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
  return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
}

function netemDeliver(deliver) {
  if (!netem) { deliver(); return; }
  if (netem.drop && netemRoll() < netem.drop) return;
  const run = () => {
    deliver();
    if (netem.dup && netemRoll() < netem.dup) setTimeout(deliver, 20 + netemRoll() * 80);
  };
  const wait = netem.delay + (netem.jitter ? netemRoll() * netem.jitter : 0);
  if (wait > 0) setTimeout(run, wait);
  else run();
}


/* Numeric-only codes are easiest to read over the phone. */
const ROOM_ALPHABET = "0123456789";

/**
 * Six digits (1,000,000 combinations). `rand` is injectable so the self-test
 * is deterministic. A numeric code is a convenience identifier, not a secret;
 * host approval and the PIN gate the room.
 */
export function makeRoomCode(rand = Math.random) {
  let out = "";
  for (let index = 0; index < ROOM_CODE_LENGTH; index += 1) {
    out += ROOM_ALPHABET[Math.floor(rand() * ROOM_ALPHABET.length) % ROOM_ALPHABET.length];
  }
  return out;
}

/**
 * Accepts "abc-def", "ABC DEF", "LEAB-ABC-DEF", a full invite URL, or the
 * bare six characters. Returns the canonical six characters or null.
 */
export function normalizeRoomCode(input) {
  if (typeof input !== "string") return null;
  let value = input.trim().toUpperCase();
  if (/^https?:\/\//.test(value) || value.includes("?")) {
    try {
      const url = new URL(value, "https://example.invalid/");
      value = url.searchParams.get("room") || "";
      value = value.toUpperCase();
    } catch {
      /* fall through to character stripping */
    }
  }
  value = value.replace(/^LEAB[\s-]*/, "").replace(/[^0-9]/g, "");
  if (value.length !== ROOM_CODE_LENGTH) return null;
  return value;
}

export function formatRoomCode(code) {
  const normalized = normalizeRoomCode(code);
  return normalized ? `${normalized.slice(0, 3)}-${normalized.slice(3)}` : "";
}

export function roomCodeFromPeerId(peerId) {
  if (typeof peerId !== "string" || !peerId.startsWith(PEER_ID_PREFIX)) return null;
  return normalizeRoomCode(peerId.slice(PEER_ID_PREFIX.length));
}

/** PeerJS IDs are lowercase; the human-facing code stays uppercase. */
export function peerIdForCode(code) {
  const normalized = normalizeRoomCode(code);
  return normalized ? `${PEER_ID_PREFIX}${normalized.toLowerCase()}` : null;
}

export function inviteUrl(code, base = globalThis.location?.href || "") {
  const normalized = normalizeRoomCode(code);
  if (!normalized) return "";
  try {
    const url = new URL(base || "https://example.invalid/");
    url.search = "";
    url.hash = "";
    url.searchParams.set("room", normalized);
    return url.toString();
  } catch {
    return "";
  }
}

/**
 * Load the pinned PeerJS UMD bundle once. A dynamic script keeps the initial
 * import map free of a second global and lets the solo game boot when the CDN
 * is blocked.
 */
let peerLoadPromise = null;
export function loadPeerJS(timeoutMs = 15000) {
  if (typeof window === "undefined") return Promise.reject(new Error("PeerJS needs a browser"));
  if (window.Peer) return Promise.resolve(window.Peer);
  if (peerLoadPromise) return peerLoadPromise;

  peerLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-peerjs="${PEERJS_VERSION}"]`);
    const script = existing || document.createElement("script");
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error("PeerJS CDN timed out"));
    }, timeoutMs);
    const finish = (fn, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn(value);
    };
    script.addEventListener("load", () => finish(resolve, window.Peer));
    script.addEventListener("error", () => finish(reject, new Error("PeerJS CDN failed to load")));
    if (!existing) {
      script.src = PEERJS_CDN;
      script.async = true;
      script.crossOrigin = "anonymous";
      script.dataset.peerjs = PEERJS_VERSION;
      document.head.appendChild(script);
    } else if (window.Peer) {
      finish(resolve, window.Peer);
    }
  }).catch((error) => {
    peerLoadPromise = null;
    throw error;
  });

  return peerLoadPromise;
}

function defaultPeerOptions() {
  return {
    debug: 1,
    /* BinaryPack chunks payloads above ~16 KB. JSON serialisation refuses
       them, which used to kill a four-human state snapshot late in a round. */
    serialization: "binary",
    /* Free public PeerJS broker. Explicit so a future PeerJS default cannot
       silently move the signalling endpoint. */
    host: "0.peerjs.com",
    port: 443,
    secure: true,
    path: "/",
    config: {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" }
      ],
      iceCandidatePoolSize: 4
    }
  };
}

function peerErrorText(error) {
  if (!error) return "unknown";
  return error.type || error.message || String(error);
}

/**
 * Host endpoint. It does not assign seats: script.js owns the lobby and the
 * game. It only reports connection lifecycle and carries JSON envelopes.
 */
export class PeerHost {
  constructor({ code, name = "Host", onOpen, onConnection, onMessage, onClose, onError, onStatus, options = {}, maxConnections = 16 } = {}) {
    this.code = normalizeRoomCode(code);
    this.name = name;
    this.id = peerIdForCode(this.code);
    this.onOpen = onOpen || (() => {});
    this.onConnection = onConnection || (() => {});
    this.onMessage = onMessage || (() => {});
    this.onClose = onClose || (() => {});
    this.onError = onError || (() => {});
    this.onStatus = onStatus || (() => {});
    this.options = { ...defaultPeerOptions(), ...options };
    this.peer = null;
    this.connections = new Map();
    this.rates = new Map();
    this.maxConnections = maxConnections;
    this.rateWindowMs = 10000;
    this.rateLimit = 80;
    this.closed = false;
  }

  async open() {
    if (!this.id) throw new Error("Invalid room code");
    const Peer = await loadPeerJS();
    return new Promise((resolve, reject) => {
      let settled = false;
      const settle = (fn, value) => {
        if (settled) return;
        settled = true;
        fn(value);
      };
      this.peer = new Peer(this.id, this.options);
      this.peer.on("open", (id) => {
        this.onStatus?.({ state: "open", id });
        settle(resolve, this);
        this.onOpen({ id, code: this.code });
      });
      this.peer.on("connection", (connection) => this._accept(connection));
      this.peer.on("disconnected", () => {
        this.onStatus?.({ state: "reconnecting", id: this.id });
        if (!this.closed) {
          try { this.peer.reconnect(); } catch { /* PeerJS will retry */ }
        }
      });
      this.peer.on("error", (error) => {
        const text = peerErrorText(error);
        this.onError({ scope: "host", type: text, error });
        if (!settled) settle(reject, error);
      });
      this.peer.on("close", () => {
        this.closed = true;
        this.onStatus?.({ state: "closed", id: this.id });
        this.onClose({ scope: "host" });
      });
      setTimeout(() => {
        if (!settled) settle(reject, new Error("PeerJS host timed out"));
      }, 18000);
    });
  }

  _accept(connection) {
    const connId = connection.peer || `conn-${this.connections.size + 1}`;
    if (this.connections.size >= this.maxConnections) {
      try { connection.close(); } catch { /* ignore */ }
      this.onError({ scope: "host", type: "busy", connId });
      return;
    }
    this.connections.set(connId, connection);
    const drop = (reason) => {
      if (!this.connections.has(connId)) return;
      this.connections.delete(connId);
      this.rates.delete(connId);
      this.onClose({ connId, reason });
    };
    connection.on("open", () => this.onConnection({ connId, connection }));
    connection.on("data", (data) => {
      const now = Date.now();
      const rate = this.rates.get(connId) || { start: now, count: 0 };
      if (now - rate.start > this.rateWindowMs) {
        rate.start = now;
        rate.count = 0;
      }
      rate.count += 1;
      this.rates.set(connId, rate);
      if (rate.count > this.rateLimit) {
        this.onError({ scope: "host", type: "rate-limit", connId });
        drop("rate-limit");
        try { connection.close(); } catch { /* ignore */ }
        return;
      }
      let size = 0;
      try { size = JSON.stringify(data).length; } catch { size = Infinity; }
      if (size > 16384) {
        this.onError({ scope: "host", type: "oversize", connId });
        drop("oversize");
        try { connection.close(); } catch { /* ignore */ }
        return;
      }
      if (data && data.__leab === PROTOCOL_VERSION) {
        netemDeliver(() => this.onMessage({ connId, message: data, connection }));
      } else this.onError({ scope: "host", type: "protocol", connId, message: data });
    });
    connection.on("close", () => drop("closed"));
    connection.on("error", (error) => {
      this.onError({ scope: "host", type: peerErrorText(error), connId, error });
    });
    connection.on("iceStateChanged", (state) => {
      if (state === "failed" || state === "disconnected") drop(state);
    });
  }

  send(connId, message) {
    const connection = this.connections.get(connId);
    if (!connection || !connection.open) return false;
    const payload = { __leab: PROTOCOL_VERSION, ...message };
    netemDeliver(() => {
      if (!connection.open) return;
      try { connection.send(payload); } catch { /* the retry loop will notice */ }
    });
    return true;
  }

  broadcast(message, connIds = null) {
    let sent = 0;
    const targets = connIds ? connIds.filter((id) => this.connections.has(id)) : [...this.connections.keys()];
    for (const connId of targets) if (this.send(connId, message)) sent += 1;
    return sent;
  }

  connectionCount() {
    let count = 0;
    for (const connection of this.connections.values()) if (connection.open) count += 1;
    return count;
  }

  closeConnection(connId) {
    const connection = this.connections.get(connId);
    if (!connection) return false;
    this.connections.delete(connId);
    this.rates.delete(connId);
    try { connection.close(); } catch { /* ignore */ }
    return true;
  }

  close() {
    this.closed = true;
    for (const connection of this.connections.values()) {
      try { connection.close(); } catch { /* ignore */ }
    }
    this.connections.clear();
    try { this.peer?.destroy(); } catch { /* ignore */ }
    this.peer = null;
  }
}

/** Client endpoint. One host, one data channel, JSON envelopes. */
export class PeerClient {
  constructor({ code, name = "Guest", onOpen, onMessage, onClose, onError, onStatus, options = {}, connectTimeoutMs = 12000 } = {}) {
    this.code = normalizeRoomCode(code);
    this.name = name;
    this.hostId = peerIdForCode(this.code);
    this.onOpen = onOpen || (() => {});
    this.onMessage = onMessage || (() => {});
    this.onClose = onClose || (() => {});
    this.onError = onError || (() => {});
    this.onStatus = onStatus || (() => {});
    this.options = { ...defaultPeerOptions(), ...options };
    this.connectTimeoutMs = connectTimeoutMs;
    this.peer = null;
    this.connection = null;
    this.closed = false;
    this.stage = "starting";
  }

  async connect() {
    if (!this.hostId) throw new Error("Invalid room code");
    const Peer = await loadPeerJS();
    return new Promise((resolve, reject) => {
      let settled = false;
      let peerOpened = false;
      const settle = (fn, value) => {
        if (settled) return;
        settled = true;
        fn(value);
      };
      this.peer = new Peer(this.options);
      this.peer.on("open", () => {
        peerOpened = true;
        this.stage = "broker-open";
        this.onStatus?.({ state: "dialing", code: this.code });
        const connection = this.peer.connect(this.hostId, {
          reliable: true,
          serialization: "binary",
          metadata: { name: this.name, protocol: PROTOCOL_VERSION }
        });
        this.connection = connection;
        connection.on("open", () => {
          this.stage = "data-open";
          this.onStatus?.({ state: "open", code: this.code });
          settle(resolve, this);
          this.onOpen({ code: this.code });
        });
        connection.on("iceStateChanged", (state) => {
          this.stage = `ice-${state}`;
          if (state === "failed") {
            const error = new Error("WebRTC ICE failed");
            error.code = "ice-failed";
            error.stage = this.stage;
            this.onError({ scope: "client", type: "ice-failed", error });
            settle(reject, error);
          }
        });
        connection.on("data", (data) => {
          if (data && data.__leab === PROTOCOL_VERSION) {
            netemDeliver(() => this.onMessage({ message: data }));
          } else this.onError({ scope: "client", type: "protocol", message: data });
        });
        connection.on("close", () => {
          if (this.closed) return;
          this.onStatus?.({ state: "closed", code: this.code });
          this.onClose({ reason: "closed" });
        });
        connection.on("error", (error) => {
          this.onError({ scope: "client", type: peerErrorText(error), error });
        });
      });
      this.peer.on("error", (error) => {
        const text = peerErrorText(error);
        this.onError({ scope: "client", type: text, error });
        if (!settled) {
          error.code = text;
          error.stage = this.stage;
          settle(reject, error);
        }
      });
      this.peer.on("disconnected", () => {
        this.stage = "signalling-lost";
        this.onStatus?.({ state: "signalling-lost", code: this.code });
      });
      setTimeout(() => {
        if (settled) return;
        const error = new Error(peerOpened ? "Host did not answer" : "Signalling broker did not open");
        error.code = peerOpened ? "host-timeout" : "broker-timeout";
        error.stage = this.stage;
        settle(reject, error);
      }, this.connectTimeoutMs);
    });
  }

  send(message) {
    if (!this.connection || !this.connection.open) return false;
    const payload = { __leab: PROTOCOL_VERSION, ...message };
    netemDeliver(() => {
      if (!this.connection?.open) return;
      try { this.connection.send(payload); } catch { /* the retry loop will notice */ }
    });
    return true;
  }

  close() {
    this.closed = true;
    try { this.connection?.close(); } catch { /* ignore */ }
    try { this.peer?.destroy(); } catch { /* ignore */ }
    this.connection = null;
    this.peer = null;
  }
}

/**
 * Host code allocation: one attempt is not enough because two tables can pick
 * the same six characters. `attempts` bounds the retry loop.
 */
export async function openHostWithRetry({ code = "", name, onOpen, onConnection, onMessage, onClose, onError, onStatus, attempts = 4, rand = Math.random, options = {} } = {}) {
  let lastError = null;
  const fixedCode = code ? normalizeRoomCode(code) : "";
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const roomCode = fixedCode || makeRoomCode(rand);
    const host = new PeerHost({ code: roomCode, name, onOpen, onConnection, onMessage, onClose, onError, onStatus, options });
    try {
      await host.open();
      return host;
    } catch (error) {
      lastError = error;
      host.close();
      if (peerErrorText(error) !== "unavailable-id") throw error;
      if (fixedCode) await new Promise((resolve) => setTimeout(resolve, 450 + attempt * 250));
    }
  }
  throw lastError || new Error(fixedCode ? "Could not reopen the room code" : "Could not allocate a room code");
}

/**
 * In-memory, same-page transport used by the self-test. It mirrors the public
 * surface of PeerHost/PeerClient so protocol code can be exercised without a
 * signalling server or WebRTC permission.
 */
export function createLoopbackPair() {
  let closed = false;
  const pending = [];
  const endpoints = {
    a: { onMessage: null, onClose: null },
    b: { onMessage: null, onClose: null }
  };
  const link = (from, to) => ({
    open: true,
    send(message) {
      if (closed) return;
      pending.push({ to, message: { __leab: PROTOCOL_VERSION, ...message } });
    },
    close() {
      if (closed) return;
      closed = true;
      endpoints[to].onClose?.({ reason: "closed" });
    },
    get peer() { return from; }
  });
  const aLink = link("a", "b");
  const bLink = link("b", "a");
  return {
    a: {
      send: (message) => aLink.send(message),
      close: () => aLink.close(),
      onMessage: (handler) => { endpoints.a.onMessage = handler; },
      onClose: (handler) => { endpoints.a.onClose = handler; }
    },
    b: {
      send: (message) => bLink.send(message),
      close: () => bLink.close(),
      onMessage: (handler) => { endpoints.b.onMessage = handler; },
      onClose: (handler) => { endpoints.b.onClose = handler; }
    },
    /** Test-only: deliver queued messages synchronously. */
    flush() {
      while (pending.length) {
        const item = pending.shift();
        endpoints[item.to].onMessage?.({ message: item.message });
      }
    }
  };
}

export function protocolEnvelope(type, payload = {}) {
  return { __leab: PROTOCOL_VERSION, type, ...payload };
}

export function isProtocolMessage(data) {
  return Boolean(data && data.__leab === PROTOCOL_VERSION && typeof data.type === "string");
}

/* Exposed for static checks and the skill mirror. */
export const PEER_MANAGER_INFO = Object.freeze({
  protocol: PROTOCOL_VERSION,
  prefix: ROOM_PREFIX,
  roomCodeLength: ROOM_CODE_LENGTH,
  alphabet: ROOM_ALPHABET,
  peerjs: PEERJS_VERSION,
  cdn: PEERJS_CDN
});
