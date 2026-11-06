/* ==========================================================================
   Leab-Tui 3D — voice-chat.js
   Independent full-mesh voice chat over PeerJS media calls.

   The game data channel remains host-authoritative. Voice is a separate mesh:
   every voice-active human calls every other voice-active human. Mute stops
   the local track's `enabled` flag; deafen mutes the remote <audio> elements.
   ========================================================================== */

const SPEAK_THRESHOLD = 0.028;
const METER_INTERVAL = 120;

export class VoiceChat {
  constructor({ onState, onSpeaking, onError } = {}) {
    this.peer = null;
    this.selfPeerId = null;
    this.selfSeat = 0;
    this.peers = [];
    this.joined = false;
    this.micMuted = false;
    this.deafened = false;
    this.localStream = null;
    this.calls = new Map();
    this.remotes = new Map();
    this.analysers = new Map();
    this.levels = new Map();
    this.ctx = null;
    this.timer = null;
    this.container = null;
    this.onState = onState || (() => {});
    this.onSpeaking = onSpeaking || (() => {});
    this.onError = onError || (() => {});
    this._onCall = null;
  }

  attach({ peer, selfPeerId, selfSeat }) {
    if (peer && this.peer !== peer) {
      if (this.peer && this._onCall && typeof this.peer.off === "function") {
        this.peer.off("call", this._onCall);
      }
      this.peer = peer;
      this._onCall = (call) => this._answer(call);
      peer.on("call", this._onCall);
    }
    if (selfPeerId) this.selfPeerId = selfPeerId;
    if (Number.isInteger(selfSeat)) this.selfSeat = selfSeat;
  }

  setPeers(peers = []) {
    this.peers = peers.filter((peer) => peer && peer.peerId);
    for (const peer of this.peers) {
      const entry = this.remotes.get(peer.peerId);
      if (entry && Number.isInteger(peer.seat) && entry.seat !== peer.seat) {
        entry.seat = peer.seat;
        entry.audio.dataset.seat = String(peer.seat);
        this._addAnalyser(peer.peerId, entry.stream, peer.seat);
      }
    }
    if (this.joined) this._syncCalls();
  }

  async join() {
    if (this.joined) return true;
    if (!this.peer || !this.selfPeerId || !navigator.mediaDevices?.getUserMedia) {
      this.onError(new Error("Voice is unavailable in this browser or room."));
      return false;
    }
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });
    } catch (error) {
      this.onError(error);
      return false;
    }
    return this.joinWithStream(this.localStream);
  }

  /**
   * Test/advanced path: attach an already-created audio MediaStream without
   * calling getUserMedia. The normal join() uses the microphone.
   */
  joinWithStream(stream) {
    if (!stream || !this.peer || !this.selfPeerId) {
      this.onError(new Error("Voice stream unavailable."));
      return false;
    }
    if (this.joined) return true;
    this.localStream = stream;
    this.joined = true;
    this.micMuted = false;
    this.deafened = false;
    this._ensureContext();
    this._addAnalyser("self", this.localStream, this.selfSeat);
    this._startMeter();
    this._syncCalls();
    this._emit();
    return true;
  }

  leave() {
    this.joined = false;
    for (const call of this.calls.values()) {
      try { call.close(); } catch { /* ignore */ }
    }
    this.calls.clear();
    for (const entry of this.remotes.values()) {
      try { entry.audio.remove(); } catch { /* ignore */ }
      this.onSpeaking(entry.seat, false);
    }
    this.remotes.clear();
    for (const key of [...this.analysers.keys()]) this._removeAnalyser(key);
    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        try { track.stop(); } catch { /* ignore */ }
      }
    }
    this.localStream = null;
    this.micMuted = false;
    this.deafened = false;
    clearInterval(this.timer);
    this.timer = null;
    this.levels.clear();
    this._emit();
  }

  destroy() {
    this.leave();
    if (this.peer && this._onCall && typeof this.peer.off === "function") {
      this.peer.off("call", this._onCall);
    }
    this.peer = null;
    this._onCall = null;
    try { this.ctx?.close(); } catch { /* ignore */ }
    this.ctx = null;
  }

  setMicMuted(muted) {
    this.micMuted = Boolean(muted);
    if (this.localStream) {
      for (const track of this.localStream.getAudioTracks()) track.enabled = !this.micMuted;
    }
    if (this.micMuted) {
      this.levels.set(this.selfSeat, false);
      this.onSpeaking(this.selfSeat, false);
    }
    this._emit();
  }

  setDeafened(deafened) {
    this.deafened = Boolean(deafened);
    for (const entry of this.remotes.values()) entry.audio.muted = this.deafened;
    this._emit();
  }

  snapshot() {
    return {
      joined: this.joined,
      micMuted: this.micMuted,
      deafened: this.deafened,
      remotes: this.remotes.size,
      micEnabled: this.localStream?.getAudioTracks?.()[0]?.enabled ?? false,
      selfSeat: this.selfSeat
    };
  }

  _emit() {
    this.onState(this.snapshot());
  }

  _ensureContext() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.ctx.resume?.().catch(() => {});
  }

  _container() {
    if (this.container && this.container.isConnected) return this.container;
    this.container = document.getElementById("remoteAudio");
    if (!this.container) {
      this.container = document.createElement("div");
      this.container.id = "remoteAudio";
      this.container.className = "remote-audio";
      document.body.appendChild(this.container);
    }
    return this.container;
  }

  _syncCalls() {
    if (!this.joined || !this.localStream) return;
    const active = new Map();
    for (const peer of this.peers) {
      if (peer.active) active.set(peer.peerId, peer);
    }
    for (const [peerId, call] of [...this.calls.entries()]) {
      if (!active.has(peerId)) {
        try { call.close(); } catch { /* ignore */ }
        this.calls.delete(peerId);
        this._removeRemote(peerId);
      }
    }
    for (const [peerId, peer] of active) {
      if (peerId === this.selfPeerId || this.calls.has(peerId)) continue;
      /* The lexicographically larger peer id initiates, so both sides agree. */
      if (this.selfPeerId > peerId) this._call(peerId, peer);
    }
  }

  _call(peerId, peer) {
    try {
      const call = this.peer.call(peerId, this.localStream, {
        metadata: { seat: this.selfSeat, name: "voice" }
      });
      if (!call) return;
      this._trackCall(peerId, call, peer);
    } catch (error) {
      this.onError(error);
    }
  }

  _answer(call) {
    if (!this.joined || !this.localStream) {
      try { call.close(); } catch { /* ignore */ }
      return;
    }
    const peerId = call.peer;
    const peer = this.peers.find((entry) => entry.peerId === peerId) || { seat: -1, name: "" };
    try {
      call.answer(this.localStream);
      this._trackCall(peerId, call, peer);
    } catch (error) {
      this.onError(error);
    }
  }

  _trackCall(peerId, call, peer) {
    this.calls.set(peerId, call);
    call.on("stream", (stream) => this._attachRemote(peerId, stream, peer));
    call.on("close", () => {
      this.calls.delete(peerId);
      this._removeRemote(peerId);
    });
    call.on("error", (error) => this.onError(error));
  }

  _attachRemote(peerId, stream, peer) {
    if (!stream) return;
    const seat = Number.isInteger(peer?.seat) ? peer.seat : -1;
    let entry = this.remotes.get(peerId);
    if (!entry) {
      const audio = document.createElement("audio");
      audio.className = "remote-player-audio";
      audio.autoplay = true;
      audio.playsInline = true;
      audio.muted = this.deafened;
      audio.dataset.peerId = peerId;
      audio.dataset.seat = String(seat);
      this._container().appendChild(audio);
      entry = { audio, stream, seat };
      this.remotes.set(peerId, entry);
    } else if (entry.seat !== seat) {
      entry.seat = seat;
      entry.audio.dataset.seat = String(seat);
      this._addAnalyser(peerId, entry.stream, seat);
    }
    entry.audio.srcObject = stream;
    entry.audio.play?.().catch(() => {});
    this._addAnalyser(peerId, stream, seat);
    this._emit();
  }

  _removeRemote(peerId) {
    const entry = this.remotes.get(peerId);
    if (!entry) return;
    this.remotes.delete(peerId);
    this._removeAnalyser(peerId);
    this.onSpeaking(entry.seat, false);
    try { entry.audio.remove(); } catch { /* ignore */ }
    this._emit();
  }

  _addAnalyser(key, stream, seat) {
    this._removeAnalyser(key);
    if (!this.ctx || !stream?.getAudioTracks?.().length) return;
    try {
      const source = this.ctx.createMediaStreamSource(stream);
      const analyser = this.ctx.createAnalyser();
      analyser.fftSize = 512;
      source.connect(analyser);
      this.analysers.set(key, { source, analyser, seat, buffer: new Uint8Array(analyser.fftSize) });
    } catch { /* unsupported stream */ }
  }

  _removeAnalyser(key) {
    const entry = this.analysers.get(key);
    if (!entry) return;
    this.analysers.delete(key);
    try { entry.source.disconnect(); } catch { /* ignore */ }
    if (Number.isInteger(entry.seat) && entry.seat >= 0) {
      this.levels.set(entry.seat, false);
      this.onSpeaking(entry.seat, false);
    }
  }

  _startMeter() {
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      if (document.hidden) return;
      for (const [key, entry] of this.analysers) {
        entry.analyser.getByteTimeDomainData(entry.buffer);
        let sum = 0;
        for (let index = 0; index < entry.buffer.length; index += 1) {
          const value = (entry.buffer[index] - 128) / 128;
          sum += value * value;
        }
        const rms = Math.sqrt(sum / entry.buffer.length);
        const speaking = rms > SPEAK_THRESHOLD && !(key === "self" && this.micMuted) && entry.seat >= 0;
        if (speaking !== this.levels.get(entry.seat)) {
          this.levels.set(entry.seat, speaking);
          this.onSpeaking(entry.seat, speaking);
        }
      }
    }, METER_INTERVAL);
  }
}

export const VOICE_LIMITS = Object.freeze({
  threshold: SPEAK_THRESHOLD,
  meterInterval: METER_INTERVAL,
  mesh: "full",
  media: "audio-only"
});
