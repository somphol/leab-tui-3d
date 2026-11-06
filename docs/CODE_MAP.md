# Code map

`script.js` is one module, but it is organised in numbered sections. `peer-manager.js`, `voice-chat.js` and `security.js` are the other runtime modules.

## `script.js`

| Section | Approx. lines | Key symbols |
| --- | --- | --- |
| Header + `APP` + import | 1–50 | version, storage keys, export name, build record, `peer-manager` imports |
| 1. Tile data | 52–218 | `COLORS`, `RANKS`, `SEATS`, `TABLE_Y`, `HAND_RADIUS`, `CORE_BIG`, `CORE_SMALL`, `GHOST_PREFIX` |
| 2. Utilities | 219–273 | `shuffle`, `mulberry32`, `clone`, `escapeHTML`, `formatTime` |
| 3. I18N | 274–987 | `I18N.en`, `I18N.th`, `t`, `tileName`, `comboSummary`, `seatName` (uses `SEAT_PROFILES`) |
| 4. Rules | 988–1168 | `buildDeck`, `detectCombo`, `compareScores`, `beats`, `allCombos`, `scorePiles` |
| 5. AI | 1169–1246 | `chooseLead`, `chooseFollow`, `recommendedFollow`, `comboPower` |
| 6. State | 1247–1489 | `MY_SEAT`, `SEAT_PROFILES`, `net`, `isBotSeat`, `makeState`, `serializableState`, `saveMatch`, `loadMatch` |
| 7. Flow | 1490–1884 | `beginMatch`, `dealRound`, `beginTrick`, `leadTrick`, `submitPlay`, `resolveTrick`, `endRound`, `undoLastTrick`, `aiLead`, `aiFollow` |
| 8. Human + coach | 1885–2081 | `humanLead`, `humanFollow`, `sendNetAction`, `toggleTile`, `applyHint`, `coachMessage`, `coachMeta` |
| 9. Toasts + summaries | 2082–2191 | `toast`, `showRoundSummary`, `buildUndoExplanation` |
| 10. Rendering | 2192–2514 | `renderAll`, `renderHUD`, `renderScoreboard`, `renderHandList`, `renderSelection`, `renderInspector`, `renderLog`, `renderRules`, `renderAbout` |
| 11. Language/chrome | 2515–2640 | `applyLanguage`, `applyFontSize`, `applyTheme`, `setSound`, `setLanguage` |
| 12. Persistence/export | 2641–2684 | `buildExport`, `exportGame` |
| 13. Multiplayer | ~2900–3550 | `sanitizeForSeat`, `hydrateRemoteState`, `applyRemoteState`, `publishState`, `createHostRoom`, `joinRoom`, `startHostedMatch`, `convertSeatToBot`, `showLobby`, `renderLobby`, `renderChat`, `hostChat`, `syncVoicePeers`, `renderVoiceState`, `netSelfTest` |
| 14. Self-test | ~3550–3700 | `selfTest`, network checks via `netSelfTest` |
| 15. Audio | ~3700–3850 | `StudioAudio` |
| 16. Scene | ~3850–4850 | `createScene`, ghost mesh pool, `setViewSeat`, `placementMap`, `handPosition`, `centerPosition`, `capturePosition` |
| 17. Boot + events | ~4850–end | `bindEvents`, `boot`, `window.LeabTui` |

## `peer-manager.js`

| Area | Key symbols |
| --- | --- |
| Room codes | `makeRoomCode`, `normalizeRoomCode`, `formatRoomCode`, `peerIdForCode`, `roomCodeFromPeerId`, `inviteUrl` |
| Loading | `PEERJS_VERSION`, `PEERJS_CDN`, `loadPeerJS` |
| Host | `PeerHost`, `openHostWithRetry` |
| Guest | `PeerClient` |
| Test | `createLoopbackPair`, `protocolEnvelope`, `isProtocolMessage` |
| Constants | `PROTOCOL_VERSION`, `ROOM_PREFIX`, `ROOM_CODE_LENGTH`, `PEER_MANAGER_INFO` |

## `security.js`

| Area | Key symbols |
| --- | --- |
| Policy | `PIN_MIN`, `PIN_MAX`, `validatePin`, `PIN_POLICY` |
| Generation | `generatePin`, `pinStrength` |
| Storage | `hashPin` (SHA-256, memory only) |
| Input | `normalisePin` |

## `voice-chat.js`

| Area | Key symbols |
| --- | --- |
| Mesh | `VoiceChat.attach`, `setPeers`, `_syncCalls`, `_call`, `_answer` |
| Media | `join`, `joinWithStream`, `leave`, `_attachRemote`, `_removeRemote` |
| Controls | `setMicMuted`, `setDeafened`, `snapshot` |
| Meter | `_addAnalyser`, `_startMeter`, `onSpeaking` |

## Entry points

- **Browser boot:** `boot()` at the bottom of `script.js`, called on `DOMContentLoaded` or immediately if the document is ready.
- **Test surface:** `window.LeabTui` exposes state and actions; `window.LeabTui.net` exposes the room API.
- **Self-test:** `?selftest=1` → `selfTest()` at the end of `boot`.
- **Screenshot state:** `?demo=1` → selects the best lead with `chooseLead` and plays it after dealing.
- **Seeded shuffle:** `?seed=123`.
- **Launch overlay:** no parameter, or `?lobby=1`.
- **Host a room:** `?mode=host&name=Ana`.
- **Join a room:** `?room=ABC234&name=Bea`.

## Where to change what

| Change | Touch |
| --- | --- |
| Add a combination | `detectCombo`, `allCombos`, `comboPower`, `comboSummary`, `COMBO_TYPES`, `COMBO_COUNT`, both `I18N` dictionaries, rules modal, `docs/RULES.md`, self-test |
| Change AI | `chooseLead`, `chooseFollow`, `recommendedFollow`, `tileKeepValue`, `isBotSeat` |
| Change table/camera | `createScene`, `handPosition`, `centerPosition`, `capturePosition`, `homePosition`/`homeTarget`, `style.css` responsive rules |
| Change seat layout | `SEATS`, `TABLE_SEATS`, `dealRound`, `hiddenTags`, scoreboard, scene seat vectors, `docs/MULTIPLAYER.md` |
| Change UI copy | `I18N.en`/`I18N.th`; static `data-i18n` attributes in `index.html` |
| Change scoring | `scorePiles`, `endRound`, `showRoundSummary`, `docs/RULES.md` |
| Change save format | `serializableState`, `loadMatch`, `buildExport`, `docs/DATA_FORMAT.md`, `APP.format`/`version` |
| Change wire format | `sanitizeForSeat`, `hydrateRemoteState`, `clientMessage`, `hostMessage`, `docs/PROTOCOL.md`, `netSelfTest`, `scripts/net-check.mjs` |
| Change lobby UI | `index.html` `#lobbyModal`, `renderLobby`, `lobbyRosterHTML`, `style.css` `.lobby-*` |
| Change chat | `sendChat`, `hostChat`, `appendChat`, `renderChat`, `chatHistory`, `index.html` `#chatPanel`, `docs/PROTOCOL.md` |
| Change voice | `voice-chat.js`, `syncVoicePeers`, `renderVoiceState`, `serialiseRoster` (`peerId`/`voice`), `index.html` voice bar, docs/MULTIPLAYER.md |
| Change lobby security | `requestGuest`, `approvePending`, `denyPending`, `setRoomApproval`, `setRoomPin`, `roomInfoText`, `security.js`, host panel markup, docs/SECURITY.md |
| Change PIN policy | `security.js`, `setRoomPin`, `requestGuest`, `docs/SECURITY.md`, self-test, `scripts/net-check.mjs` |
| Change room codes / PeerJS | `peer-manager.js`, `index.html` CSP, `docs/MULTIPLAYER.md` |
| Change visuals | `:root` tokens in `style.css`, felt/wood/tile texture functions, `SCENE_THEMES` |

## Invariants

- `detectCombo` is the only legality authority.
- `beats` is strict and type-gated.
- `serializableState` is the only object→ID boundary.
- `sanitizeForSeat` is the only privacy boundary; it must run per recipient.
- `hiddenTags` never leaves the host.
- The scene never decides a winner.
- `renderAll` must be safe to call at any time, including with `state === null` during boot.
- `audio.play` must be a no-op until `audio.unlocked`.
- `isBotSeat` is the only scheduler predicate; guests never run the AI.
- A guest never calls the engine flow.
- Chat is appended once on the host and broadcast; guest input is rate-limited and escaped.
- Voice never uses the data channel; mic mute is `track.enabled`, deafen is `<audio>.muted`.
- The host stores only a PIN digest; the plain PIN is never in state, roster, export, URL or localStorage.
- A guest is not seated before `approvePending`; `requestGuest` only queues.
