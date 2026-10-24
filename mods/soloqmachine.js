/**
 * 403Changer - SoloQ Otopilotu (SoloQ Machine)
 *
 * @name         SoloQMachine
 * @author       403Changer (Original by Yimikami)
 * @description  Otomatik maç kabul, otomatik sıraya girme, otomatik takdir, otomatik tekrar oyna ve arayüz sadeleştirme.
 * @version      1.0.0
 */

(function () {
  "use strict";

  if (window.__c403SoloQMachineLoaded) return;
  window.__c403SoloQMachineLoaded = true;

  const STORAGE_KEY = "c403-soloq-machine-settings";
  const MODAL_ID = "c403-soloq-settings-modal";
  const STYLE_ID = "c403-soloq-styles";

  const DEFAULT_CONFIG = {
    queueId: 420, // Ranked Solo/Duo
    autoAccept: { enabled: true, delayMs: 0, muteLoopSound: false },
    autoMatchmaking: { enabled: false, delayMs: 3000, minimumMembers: 1, waitForInvites: true },
    autoHonor: { enabled: true },
    autoPlayAgain: { enabled: true, delayMs: 2000 },
    instantRankedLobby: { enabled: false },
    removeElements: {
      enabled: false,
      selectors: [
        'lol-uikit-navigation-item[item-id="challenges-collection"]',
        'lol-uikit-navigation-item[item-id="profile-main-highlights"]',
        ".social-button",
        ".notifications-button",
        ".missions-tracker-button-component",
      ],
    },
  };

  const deepMerge = (target, source) => {
    for (const key of Object.keys(source)) {
      if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
        if (!target[key]) target[key] = {};
        deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
    return target;
  };

  const loadConfig = () => {
    let saved = null;
    try {
      if (window.DataStore && typeof window.DataStore.get === "function") {
        saved = window.DataStore.get(STORAGE_KEY);
      }
    } catch (e) {}

    if (!saved) {
      try {
        saved = localStorage.getItem(STORAGE_KEY);
      } catch (e) {}
    }

    if (saved) {
      try {
        const parsed = typeof saved === "string" ? JSON.parse(saved) : saved;
        const merged = deepMerge(structuredClone(DEFAULT_CONFIG), parsed);
        if (merged.instantRankedLobby) merged.instantRankedLobby.enabled = false;
        // Kullanici talebi: Otomatik siraya girme kesin olarak devre disi (oyna butonuna basmaz)
        merged.autoMatchmaking = { enabled: false, delayMs: 0, minimumMembers: 1, waitForInvites: false };
        if (merged.removeElements && Array.isArray(merged.removeElements.selectors)) {
          merged.removeElements.selectors = merged.removeElements.selectors.filter(
            (s) => s !== ".right-nav-menu" && s !== ".left-nav-menu"
          );
        }
        return merged;
      } catch (e) {}
    }

    return structuredClone(DEFAULT_CONFIG);
  };

  const saveConfig = (config) => {
    config.autoMatchmaking = { enabled: false, delayMs: 0, minimumMembers: 1, waitForInvites: false };
    if (config.removeElements && Array.isArray(config.removeElements.selectors)) {
      config.removeElements.selectors = config.removeElements.selectors.filter(
        (s) => s !== ".right-nav-menu" && s !== ".left-nav-menu"
      );
    }
    const serialized = JSON.stringify(config);
    try {
      if (window.DataStore && typeof window.DataStore.set === "function") {
        window.DataStore.set(STORAGE_KEY, serialized);
      }
    } catch (e) {}

    try {
      localStorage.setItem(STORAGE_KEY, serialized);
    } catch (e) {}
  };

  let CONFIG = loadConfig();

  const lcuFetch = async (url, method = "GET", body = null) => {
    const opts = { method, headers: { "Content-Type": "application/json" } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`LCU ${method} ${url} → ${res.status}: ${text}`);
    }
    if (res.status === 204) return null;
    return res.json().catch(() => null);
  };

  class SoloQController {
    constructor() {
      this._observer = null;
      this._phasePoller = null;
      this._autoAcceptTimer = null;
      this._autoMatchmakingTimer = null;
      this._autoHonorTimer = null;
      this._autoPlayAgainTimer = null;
      this._currentPhase = null;
      this._disposed = false;
      this._actionRevision = 0;
      this._matchmakingRevision = 0;
      this._buttonHandlers = new Map();
      this.init();
    }

    async init() {
      this.injectStyles();
      this.observeDOM();
      this.startPhasePolling();
      this.initAudioBlocker();
      window.addEventListener("unload", () => this.cleanup());
    }

    initAudioBlocker() {
      const blockedUrls = [
        "sfx-readycheck-ringmagic-accepted-loop",
        "sfx-readycheck-sr-portal",
      ];

      const dummySound = {
        play: () => Promise.resolve(null),
        stop: () => Promise.resolve(null),
        pause: () => Promise.resolve(null),
        dispose: () => Promise.resolve(null),
        setVolume: () => {},
        getVolume: () => 0,
        isPlaying: () => false,
        on: () => {},
        off: () => {},
        trigger: () => {},
      };

      const hookChannels = (audioPlugin) => {
        try {
          if (!audioPlugin || typeof audioPlugin.getChannelsNames !== "function") return;
          const channelNames = Object.values(audioPlugin.getChannelsNames());
          channelNames.forEach((channelName) => {
            const channel = audioPlugin.getChannel(channelName);
            if (channel && channel.createSound && !channel.__c403MuteHooked) {
              channel.__c403MuteHooked = true;
              const originalCreateSound = channel.createSound.bind(channel);

              channel.createSound = function (url, options) {
                if (
                  CONFIG.autoAccept?.muteLoopSound &&
                  url &&
                  blockedUrls.some((blocked) => url.includes(blocked))
                ) {
                  return dummySound;
                }
                return originalCreateSound(url, options);
              };
            }
          });
        } catch (err) {
          console.warn("[SoloQMachine] Audio blocker hook error:", err);
        }
      };

      if (window.rcp && typeof window.rcp.whenReady === "function") {
        window.rcp.whenReady("rcp-fe-audio").then(hookChannels).catch(() => {});
      } else {
        const timer = setInterval(() => {
          if (window.rcp && typeof window.rcp.whenReady === "function") {
            clearInterval(timer);
            window.rcp.whenReady("rcp-fe-audio").then(hookChannels).catch(() => {});
          }
        }, 1000);
      }
    }

    cleanup() {
      this._disposed = true;
      this._actionRevision++;
      this.cancelAutoMatchmaking();
      this.cancelAutoAccept();
      this.cancelAutoPlayAgain();
      clearTimeout(this._autoHonorTimer);
      if (this._phasePoller) clearInterval(this._phasePoller);
      if (this._observer) this._observer.disconnect();

      for (const [btn, handler] of this._buttonHandlers) {
        btn.removeEventListener("click", handler, true);
      }
      this._buttonHandlers.clear();

      const style = document.getElementById(STYLE_ID);
      if (style) style.remove();
      const modal = document.getElementById(MODAL_ID);
      if (modal) modal.remove();
    }

    injectStyles() {
      let style = document.getElementById(STYLE_ID);
      if (!style) {
        style = document.createElement("style");
        style.id = STYLE_ID;
        (document.head || document.documentElement).appendChild(style);
      }

      let extraRules = "";
      if (CONFIG.removeElements && CONFIG.removeElements.enabled) {
        const safeSelectors = (CONFIG.removeElements.selectors || []).filter(
          (s) => s !== ".right-nav-menu" && s !== ".left-nav-menu"
        );
        extraRules = [
          ...safeSelectors.map((s) => `${s} { display: none !important; }`),
          ".custom-game-tournament-code-container { display: none !important; }",
          '[data-soloq-machine-hidden="true"] { display: none !important; }',
          `/* 403Changer navbar ve marka butonlari asla gizlenemez */
          #c403-nav-btn,
          .c403-nav-btn,
          #c403-brand-menu,
          .c403-brand-menu {
            display: flex !important;
            visibility: visible !important;
            opacity: 1 !important;
            pointer-events: auto !important;
          }`,
        ].join("\n");
      }

      style.textContent = `
        ${extraRules}

        /* 403Changer SoloQ Modal */
        #${MODAL_ID} {
          position: fixed;
          inset: 0;
          z-index: 2147483640;
          display: none;
          align-items: center;
          justify-content: center;
          background: rgba(3, 6, 9, 0.68);
          backdrop-filter: blur(4px);
          font-family: "Beaufort for LOL", "Segoe UI", sans-serif;
          color: #cdbe91;
          user-select: none;
        }

        #${MODAL_ID}.c403-open {
          display: flex;
        }

        #${MODAL_ID} .c403-sq-card {
          width: 440px;
          max-width: 92vw;
          max-height: 85vh;
          display: flex;
          flex-direction: column;
          background: radial-gradient(120% 80% at 50% -20%, rgba(200, 170, 110, 0.15), transparent 60%),
                      linear-gradient(180deg, #0d1319 0%, #070b0f 100%);
          border: 1px solid rgba(200, 170, 110, 0.45);
          border-radius: 8px;
          box-shadow: 0 24px 64px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.06);
          overflow: hidden;
        }

        #${MODAL_ID} .c403-sq-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          border-bottom: 1px solid rgba(200, 170, 110, 0.2);
          background: rgba(200, 170, 110, 0.05);
        }

        #${MODAL_ID} .c403-sq-title {
          margin: 0;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #f0e6d2;
        }

        #${MODAL_ID} .c403-sq-close {
          background: transparent;
          border: none;
          color: #cdbe91;
          font-size: 18px;
          cursor: pointer;
        }
        #${MODAL_ID} .c403-sq-close:hover { color: #f0e6d2; }

        #${MODAL_ID} .c403-sq-body {
          flex: 1 1 auto;
          overflow-y: auto;
          padding: 16px 20px 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        #${MODAL_ID} .c403-sq-body::-webkit-scrollbar { width: 6px; }
        #${MODAL_ID} .c403-sq-body::-webkit-scrollbar-thumb {
          background: rgba(200, 170, 110, 0.25);
          border-radius: 3px;
        }

        #${MODAL_ID} .c403-sq-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        #${MODAL_ID} .c403-sq-sec-title {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #c8aa6e;
          border-bottom: 1px solid rgba(200, 170, 110, 0.15);
          padding-bottom: 4px;
        }

        #${MODAL_ID} .c403-sq-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 4px 0;
        }

        #${MODAL_ID} .c403-sq-label {
          font-size: 12.5px;
          color: #f0e6d2;
        }

        #${MODAL_ID} .c403-sq-sublabel {
          font-size: 11px;
          color: rgba(205, 190, 145, 0.55);
        }

        /* Toggle switch */
        #${MODAL_ID} .c403-sq-switch {
          position: relative;
          width: 38px;
          height: 20px;
          border-radius: 10px;
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(200, 170, 110, 0.3);
          cursor: pointer;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        #${MODAL_ID} .c403-sq-switch::after {
          content: "";
          position: absolute;
          top: 2px;
          left: 2px;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #7c7466;
          transition: all 0.2s ease;
        }

        #${MODAL_ID} .c403-sq-switch.c403-on {
          background: rgba(200, 170, 110, 0.3);
          border-color: #c8aa6e;
        }

        #${MODAL_ID} .c403-sq-switch.c403-on::after {
          transform: translateX(18px);
          background: #f0e6d2;
          box-shadow: 0 0 6px rgba(200, 170, 110, 0.5);
        }

        #${MODAL_ID} input[type="number"] {
          width: 60px;
          background: #09121a;
          border: 1px solid rgba(200, 170, 110, 0.3);
          border-radius: 4px;
          color: #f0e6d2;
          padding: 4px 6px;
          font-size: 12px;
          text-align: center;
          outline: none;
        }

        #${MODAL_ID} input[type="number"]:focus {
          border-color: #c8aa6e;
        }

        #${MODAL_ID} .c403-sq-foot {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          padding: 12px 20px;
          border-top: 1px solid rgba(200, 170, 110, 0.2);
          background: rgba(0, 0, 0, 0.25);
        }

        #${MODAL_ID} .c403-sq-btn {
          padding: 7px 14px;
          border-radius: 4px;
          border: 1px solid rgba(200, 170, 110, 0.4);
          background: linear-gradient(180deg, rgba(200, 170, 110, 0.2), rgba(200, 170, 110, 0.05));
          color: #f0e6d2;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        #${MODAL_ID} .c403-sq-btn:hover {
          border-color: #c8aa6e;
          background: linear-gradient(180deg, rgba(200, 170, 110, 0.35), rgba(200, 170, 110, 0.12));
        }

        #${MODAL_ID} .c403-sq-btn.c403-ghost {
          background: transparent;
          border-color: transparent;
          color: rgba(205, 190, 145, 0.6);
        }
        #${MODAL_ID} .c403-sq-btn.c403-ghost:hover {
          color: #f0e6d2;
        }
      `;
    }

    startPhasePolling() {
      this._phasePoller = setInterval(() => this.pollPhase(), 2000);
      this.pollPhase();
    }

    async pollPhase() {
      if (this._polling || this._disposed) return;
      this._polling = true;
      const revision = this._actionRevision;
      try {
        const res = await fetch("/lol-gameflow/v1/gameflow-phase");
        if (!res.ok) return;
        const phase = await res.json();
        if (revision === this._actionRevision && phase !== this._currentPhase) {
          const prev = this._currentPhase;
          this._currentPhase = phase;
          this.onPhaseChange(phase, prev);
        }
      } catch {
      } finally {
        this._polling = false;
      }
    }

    onPhaseChange(phase, prev) {
      this._actionRevision++;
      clearTimeout(this._autoHonorTimer);

      if (phase === "ReadyCheck") {
        this.scheduleAutoAccept();
      } else {
        this.cancelAutoAccept();
      }

      if (phase === "Lobby") {
        this.scheduleAutoMatchmaking();
      } else {
        this.cancelAutoMatchmaking();
      }

      if (phase === "PreEndOfGame") {
        this.scheduleAutoHonor();
      }

      if (phase === "EndOfGame" || phase === "WaitingForStats") {
        this.scheduleAutoPlayAgain(phase);
      } else if (phase !== "PreEndOfGame") {
        this.cancelAutoPlayAgain();
      }
    }

    recheckCurrentPhase() {
      if (this._currentPhase) {
        this.onPhaseChange(this._currentPhase, this._currentPhase);
      }
    }

    scheduleAutoAccept() {
      this.cancelAutoAccept();
      if (!CONFIG.autoAccept.enabled || this._disposed) return;
      const delay = CONFIG.autoAccept.delayMs || 0;
      const revision = this._actionRevision;
      this._autoAcceptTimer = setTimeout(() => this.acceptMatch(revision), delay);
    }

    cancelAutoAccept() {
      if (this._autoAcceptTimer) {
        clearTimeout(this._autoAcceptTimer);
        this._autoAcceptTimer = null;
      }
    }

    async acceptMatch(revision = this._actionRevision) {
      try {
        if (this._disposed || revision !== this._actionRevision || !CONFIG.autoAccept.enabled) return;
        await lcuFetch("/lol-matchmaking/v1/ready-check/accept", "POST");
        if (window.Toast && typeof window.Toast.success === "function") {
          window.Toast.success("Maç otomatik kabul edildi!");
        }
      } catch (e) {
        console.warn("[SoloQMachine] Maç kabul edilemedi:", e.message);
      }
    }

    scheduleAutoMatchmaking() {
      // Kesin olarak devre disi: Asla siraya girmez veya oyna butonuna basmaz
      this.cancelAutoMatchmaking();
    }

    cancelAutoMatchmaking() {
      this._matchmakingRevision++;
      if (this._autoMatchmakingTimer) {
        clearTimeout(this._autoMatchmakingTimer);
        this._autoMatchmakingTimer = null;
      }
    }

    async tryStartMatchmaking() {
      // Kesin olarak devre disi: Asla oyna / mac ara butonuna basmaz
      return;
    }

    scheduleAutoHonor() {
      if (!CONFIG.autoHonor.enabled) return;
      const revision = this._actionRevision;
      this._autoHonorTimer = setTimeout(() => this.honorPlayer(revision), 1500);
    }

    async honorPlayer(revision = this._actionRevision) {
      try {
        const ballot = await lcuFetch("/lol-honor-v2/v1/ballot");
        if (!ballot?.gameId || !Array.isArray(ballot.eligibleAllies)) return;
        if (ballot.votePool && ballot.votePool.votes <= 0) return;

        const candidates = ballot.eligibleAllies.filter((p) => !p.botPlayer && p.puuid && p.summonerId);
        if (!candidates.length) return;

        const target = candidates[Math.floor(Math.random() * candidates.length)];
        await lcuFetch("/lol-honor-v2/v1/honor-player", "POST", {
          honorType: "HEART",
          gameId: ballot.gameId,
          summonerId: target.summonerId,
          puuid: target.puuid,
        });
        if (window.Toast && typeof window.Toast.success === "function") {
          window.Toast.success("Takım arkadaşına otomatik takdir verildi!");
        }
      } catch (err) {
        console.warn("[SoloQMachine] Otomatik takdir verilemedi:", err);
      }
    }

    scheduleAutoPlayAgain(phase) {
      this.cancelAutoPlayAgain();
      if (!CONFIG.autoPlayAgain.enabled || this._disposed) return;
      const delay = phase === "WaitingForStats" ? Math.max(CONFIG.autoPlayAgain.delayMs, 5000) : CONFIG.autoPlayAgain.delayMs;
      const revision = this._actionRevision;
      this._autoPlayAgainTimer = setTimeout(() => this.playAgain(revision), delay);
    }

    cancelAutoPlayAgain() {
      if (this._autoPlayAgainTimer) {
        clearTimeout(this._autoPlayAgainTimer);
        this._autoPlayAgainTimer = null;
      }
    }

    async playAgain(revision = this._actionRevision) {
      try {
        if (this._disposed || revision !== this._actionRevision || !CONFIG.autoPlayAgain.enabled) return;
        await lcuFetch("/lol-lobby/v2/play-again", "POST");
      } catch (e) {
        console.warn("[SoloQMachine] Tekrar oyna başarısız:", e);
      }
    }

    observeDOM() {
      // Oyna butonuna müdahale etme (oyuncunun normal seçim yapabilmesi için devre dışı bırakıldı)
    }
  }

  // Settings Modal Manager
  function ensureModal() {
    let modal = document.getElementById(MODAL_ID);
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = MODAL_ID;
    modal.innerHTML = `
      <div class="c403-sq-card" role="dialog">
        <div class="c403-sq-head">
          <h3 class="c403-sq-title">SoloQ Otopilot Ayarları</h3>
          <button type="button" class="c403-sq-close" data-act="close">✕</button>
        </div>
        <div class="c403-sq-body">

          <!-- Sıra & Maç -->
          <div class="c403-sq-section">
            <div class="c403-sq-sec-title">Sıra & Eşleşme Otomasyonu</div>

            <div class="c403-sq-row">
              <span class="c403-sq-label">Otomatik Maç Kabul</span>
              <button type="button" class="c403-sq-switch" data-key="autoAccept.enabled"></button>
            </div>

            <div class="c403-sq-row">
              <span class="c403-sq-sublabel">Kabul Gecikmesi (saniye)</span>
              <input type="number" min="0" max="30" step="0.5" data-key="autoAccept.delaySec">
            </div>

            <div class="c403-sq-row">
              <span class="c403-sq-sublabel">Döngüsel Kabul Sesini Sustur</span>
              <button type="button" class="c403-sq-switch" data-key="autoAccept.muteLoopSound" title="Maç kabul edildiğinde çalan sürekli döngüsel portal sesini susturur"></button>
            </div>

            <!-- Otomatik siraya girme kaldirildi: Asla oyna butonuna basmaz -->
          </div>

          <!-- Oyun Sonu -->
          <div class="c403-sq-section">
            <div class="c403-sq-sec-title">Oyun Sonu Otomasyonu</div>

            <div class="c403-sq-row">
              <span class="c403-sq-label">Otomatik Takdir (Kalp Ver)</span>
              <button type="button" class="c403-sq-switch" data-key="autoHonor.enabled"></button>
            </div>

            <div class="c403-sq-row">
              <span class="c403-sq-label">Otomatik Tekrar Oyna</span>
              <button type="button" class="c403-sq-switch" data-key="autoPlayAgain.enabled"></button>
            </div>

            <div class="c403-sq-row">
              <span class="c403-sq-sublabel">Tekrar Oyna Gecikmesi (saniye)</span>
              <input type="number" min="0" max="30" step="0.5" data-key="autoPlayAgain.delaySec">
            </div>
          </div>

          <!-- Lobi & Arayüz -->
          <div class="c403-sq-section">
            <div class="c403-sq-sec-title">Lobi & Arayüz</div>



            <div class="c403-sq-row">
              <span class="c403-sq-label">Dikkat Dağıtıcı Menüleri Gizle</span>
              <button type="button" class="c403-sq-switch" data-key="removeElements.enabled"></button>
            </div>
          </div>

        </div>
        <div class="c403-sq-foot">
          <button type="button" class="c403-sq-btn c403-ghost" data-act="reset">Varsayılana Sıfırla</button>
          <button type="button" class="c403-sq-btn" data-act="close">Kapat</button>
        </div>
      </div>
    `;

    modal.addEventListener("click", (e) => {
      if (e.target === modal || e.target.dataset.act === "close") {
        closeSettingsModal();
        return;
      }

      if (e.target.dataset.act === "reset") {
        CONFIG = structuredClone(DEFAULT_CONFIG);
        saveConfig(CONFIG);
        updateModalUI(modal);
        if (window.__c403SoloQInstance) {
          window.__c403SoloQInstance.injectStyles();
          window.__c403SoloQInstance.recheckCurrentPhase();
        }
        if (window.Toast?.success) window.Toast.success("Ayarlar varsayılana sıfırlandı!");
        return;
      }

      const sw = e.target.closest(".c403-sq-switch");
      if (sw) {
        const key = sw.dataset.key;
        const keys = key.split(".");
        let obj = CONFIG;
        for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
        const next = !obj[keys[keys.length - 1]];
        obj[keys[keys.length - 1]] = next;

        sw.classList.toggle("c403-on", next);
        saveConfig(CONFIG);

        if (window.__c403SoloQInstance) {
          window.__c403SoloQInstance.injectStyles();
          window.__c403SoloQInstance.recheckCurrentPhase();
        }
      }
    });

    modal.addEventListener("change", (e) => {
      const input = e.target;
      if (input.dataset.key) {
        const key = input.dataset.key;
        let val = parseFloat(input.value);
        if (isNaN(val)) val = 0;

        if (key === "autoAccept.delaySec") CONFIG.autoAccept.delayMs = Math.round(val * 1000);
        else if (key === "autoMatchmaking.delaySec") CONFIG.autoMatchmaking.delayMs = Math.round(val * 1000);
        else if (key === "autoPlayAgain.delaySec") CONFIG.autoPlayAgain.delayMs = Math.round(val * 1000);
        else if (key === "autoMatchmaking.minimumMembers") CONFIG.autoMatchmaking.minimumMembers = Math.max(1, Math.min(5, Math.round(val)));

        saveConfig(CONFIG);
        if (window.__c403SoloQInstance) {
          window.__c403SoloQInstance.recheckCurrentPhase();
        }
      }
    });

    document.body.appendChild(modal);
    return modal;
  }

  function updateModalUI(modal) {
    modal.querySelectorAll(".c403-sq-switch").forEach((sw) => {
      const key = sw.dataset.key;
      const keys = key.split(".");
      let val = CONFIG;
      for (const k of keys) val = val?.[k];
      sw.classList.toggle("c403-on", !!val);
    });

    const setInput = (key, val) => {
      const el = modal.querySelector(`input[data-key="${key}"]`);
      if (el) el.value = val;
    };

    setInput("autoAccept.delaySec", ((CONFIG.autoAccept.delayMs || 0) / 1000).toFixed(1));
    setInput("autoMatchmaking.delaySec", ((CONFIG.autoMatchmaking.delayMs || 3000) / 1000).toFixed(1));
    setInput("autoPlayAgain.delaySec", ((CONFIG.autoPlayAgain.delayMs || 2000) / 1000).toFixed(1));
    setInput("autoMatchmaking.minimumMembers", CONFIG.autoMatchmaking.minimumMembers || 1);
  }

  function openSettingsModal() {
    const modal = ensureModal();
    updateModalUI(modal);
    modal.classList.add("c403-open");
  }

  function closeSettingsModal() {
    const modal = document.getElementById(MODAL_ID);
    if (modal) modal.classList.remove("c403-open");
  }

  // Hook into 403Changer Modları gear icon
  window.__c403ModSettings = window.__c403ModSettings || {};
  window.__c403ModSettings["soloqmachine"] = openSettingsModal;

  window.addEventListener("load", () => {
    window.__c403SoloQInstance = new SoloQController();
  });
})();
