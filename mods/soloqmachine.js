/**
 * 403Changer - SoloQ Otopilotu (SoloQ Machine)
 *
 * @name         SoloQMachine
 * @author       403Changer (Original by Yimikami)
 * @description  Otomatik maç kabul, otomatik sıraya girme, otomatik takdir, otomatik tekrar oyna ve arayüz sadeleştirme.
 * @version      1.1.0
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

  const MAX_DELAY_MS = 30000;

  const clampDelay = (value, fallback = 0) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return fallback;
    return Math.max(0, Math.min(MAX_DELAY_MS, Math.round(num)));
  };

  const asObject = (value) => (value && typeof value === "object" && !Array.isArray(value) ? value : {});

  // İstemcinin kendi gezinme çubuklarını veya tüm sayfayı gizleyen seçiciler
  // kullanıcı ayarından gelseler bile uygulanmaz: arayüz kullanılamaz hale geliyordu.
  const FORBIDDEN_SELECTORS = new Set([
    ".right-nav-menu",
    ".left-nav-menu",
    "html",
    "body",
    ":root",
    "*",
    "rcp-fe-viewport-root",
  ]);

  const isValidSelector = (selector) => {
    if (typeof selector !== "string") return false;
    const trimmed = selector.trim();
    if (!trimmed || trimmed.length > 200) return false;
    if (FORBIDDEN_SELECTORS.has(trimmed)) return false;
    // Süslü parantez/noktalı virgül enjeksiyonuyla stil sayfası bozulmasın.
    if (/[{};]/.test(trimmed)) return false;
    try {
      document.createDocumentFragment().querySelector(trimmed);
      return true;
    } catch (e) {
      return false;
    }
  };

  // Bozuk / eski / elle düzenlenmiş ayarlar modun çökmesine yol açmasın.
  const normalizeConfig = (raw) => {
    const src = asObject(raw);
    const base = structuredClone(DEFAULT_CONFIG);

    const autoAccept = asObject(src.autoAccept);
    base.autoAccept = {
      enabled: autoAccept.enabled !== false,
      delayMs: clampDelay(autoAccept.delayMs, 0),
      muteLoopSound: !!autoAccept.muteLoopSound,
    };

    const autoHonor = asObject(src.autoHonor);
    base.autoHonor = { enabled: autoHonor.enabled !== false };

    const autoPlayAgain = asObject(src.autoPlayAgain);
    base.autoPlayAgain = {
      enabled: autoPlayAgain.enabled !== false,
      delayMs: clampDelay(autoPlayAgain.delayMs, 2000),
    };

    // Kullanıcı talebi: otomatik sıraya girme kesin olarak devre dışı
    // (oyna butonuna basmaz), hızlı dereceli lobi de kullanılmıyor.
    base.autoMatchmaking = { enabled: false, delayMs: 0, minimumMembers: 1, waitForInvites: false };
    base.instantRankedLobby = { enabled: false };

    const remove = asObject(src.removeElements);
    const selectors = Array.isArray(remove.selectors) ? remove.selectors.filter(isValidSelector) : [];
    base.removeElements = {
      enabled: !!remove.enabled,
      // Hepsi geçersizse varsayılan listeye dön (boş liste = hiçbir şey gizlenmez).
      selectors: selectors.length ? selectors.slice(0, 20) : structuredClone(DEFAULT_CONFIG.removeElements.selectors),
    };

    const queueId = Number(src.queueId);
    base.queueId = Number.isFinite(queueId) && queueId > 0 ? queueId : DEFAULT_CONFIG.queueId;

    return base;
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
        return normalizeConfig(parsed);
      } catch (e) {}
    }

    return normalizeConfig(null);
  };

  const saveConfig = (config) => {
    CONFIG = normalizeConfig(config);
    const serialized = JSON.stringify(CONFIG);
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
    const opts = { method, headers: {} };
    // GET isteklerinde Content-Type göndermek gereksiz preflight/ağ yükü çıkarıyor.
    if (body) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
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
      this._autoHonorTimer = null;
      this._autoPlayAgainTimer = null;
      this._audioTimer = null;
      this._currentPhase = null;
      this._disposed = false;
      this._polling = false;
      this._actionRevision = 0;
      this._buttonHandlers = new Map();
      this._honoredGames = new Set();
      this._playAgainSent = false;
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

      // Eksik metot yüzünden istemcinin ses motoru hata vermesin:
      // bilinen tüm Sound API'si no-op, bilinmeyenler de güvenli varsayılan döner.
      const dummySound = new Proxy(
        {
          play: () => Promise.resolve(null),
          stop: () => Promise.resolve(null),
          pause: () => Promise.resolve(null),
          resume: () => Promise.resolve(null),
          dispose: () => Promise.resolve(null),
          destroy: () => Promise.resolve(null),
          seek: () => Promise.resolve(null),
          setVolume: () => {},
          getVolume: () => 0,
          setLoop: () => {},
          isLooping: () => false,
          isPlaying: () => false,
          getDuration: () => 0,
          getCurrentTime: () => 0,
          setTime: () => {},
          on: () => {},
          off: () => {},
          once: () => {},
          trigger: () => {},
          addEventListener: () => {},
          removeEventListener: () => {},
          duration: 0,
          volume: 0,
          loop: false,
        },
        {
          get(target, prop) {
            if (prop in target) return target[prop];
            if (typeof prop === "symbol") return undefined;
            return () => {};
          },
        }
      );

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
        return;
      }

      // rcp henüz hazır değilse sınırlı süre bekle; sonsuza kadar interval bırakma.
      let attempts = 0;
      this._audioTimer = setInterval(() => {
        attempts++;
        if (window.rcp && typeof window.rcp.whenReady === "function") {
          clearInterval(this._audioTimer);
          this._audioTimer = null;
          window.rcp.whenReady("rcp-fe-audio").then(hookChannels).catch(() => {});
        } else if (attempts >= 60) {
          clearInterval(this._audioTimer);
          this._audioTimer = null;
        }
      }, 1000);
    }

    cleanup() {
      this._disposed = true;
      this._actionRevision++;
      this.cancelAutoAccept();
      this.cancelAutoPlayAgain();
      clearTimeout(this._autoHonorTimer);
      this._autoHonorTimer = null;
      if (this._audioTimer) {
        clearInterval(this._audioTimer);
        this._audioTimer = null;
      }
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
        const safeSelectors = (CONFIG.removeElements.selectors || []).filter(isValidSelector);
        extraRules = [
          ...safeSelectors.map((s) => `${s} { display: none !important; }`),
          '[data-soloq-machine-hidden="true"] { display: none !important; }',
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
      this._autoHonorTimer = null;

      // Oyun bitti/tekrar lobi akışına dönüldüyse "tekrar oyna" kilidini aç.
      if (phase !== "EndOfGame" && phase !== "WaitingForStats" && phase !== "PreEndOfGame") {
        this._playAgainSent = false;
      }

      if (phase === "ReadyCheck") {
        this.scheduleAutoAccept();
      } else {
        this.cancelAutoAccept();
      }

      if (phase === "PreEndOfGame") {
        this.scheduleAutoHonor();
      }

      if (phase === "EndOfGame" || phase === "WaitingForStats") {
        this.scheduleAutoPlayAgain(phase);
      } else {
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
      const delay = clampDelay(CONFIG.autoAccept.delayMs, 0);
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
        // Gecikme sırasında maç iptal edilmiş olabilir; fazı tekrar doğrula.
        if (this._currentPhase !== "ReadyCheck") return;
        await lcuFetch("/lol-matchmaking/v1/ready-check/accept", "POST");
        if (window.Toast && typeof window.Toast.success === "function") {
          window.Toast.success("Maç otomatik kabul edildi!");
        }
      } catch (e) {
        console.warn("[SoloQMachine] Maç kabul edilemedi:", e.message);
      }
    }

    // Otomatik sıraya girme/oyna butonu kalıcı olarak devre dışı; bu yüzden
    // ilgili zamanlayıcı ve istek kodları tamamen kaldırıldı.

    scheduleAutoHonor() {
      if (!CONFIG.autoHonor.enabled || this._disposed) return;
      const revision = this._actionRevision;
      let attempt = 0;

      const run = async () => {
        if (this._disposed || revision !== this._actionRevision || !CONFIG.autoHonor.enabled) return;
        const done = await this.honorPlayer();
        if (done) return;
        attempt++;
        // Oylama ekranı hemen hazır olmayabiliyor; kısa aralıklarla birkaç kez dene.
        if (attempt < 6) {
          this._autoHonorTimer = setTimeout(run, 1500);
        }
      };

      this._autoHonorTimer = setTimeout(run, 1500);
    }

    async honorPlayer() {
      try {
        const ballot = await lcuFetch("/lol-honor-v2/v1/ballot");
        if (!ballot || !ballot.gameId) return false;
        // Aynı maç için iki kez takdir göndermeyelim.
        if (this._honoredGames.has(ballot.gameId)) return true;
        if (!Array.isArray(ballot.eligibleAllies) || !ballot.eligibleAllies.length) return false;
        if (ballot.votePool && Number(ballot.votePool.votes) <= 0) return true;

        const candidates = ballot.eligibleAllies.filter((p) => !p.botPlayer && p.puuid && p.summonerId);
        if (!candidates.length) return true;

        const target = candidates[Math.floor(Math.random() * candidates.length)];
        await lcuFetch("/lol-honor-v2/v1/honor-player", "POST", {
          honorType: "HEART",
          gameId: ballot.gameId,
          summonerId: target.summonerId,
          puuid: target.puuid,
        });

        this._honoredGames.add(ballot.gameId);
        if (this._honoredGames.size > 20) {
          const oldest = this._honoredGames.values().next().value;
          this._honoredGames.delete(oldest);
        }

        if (window.Toast && typeof window.Toast.success === "function") {
          window.Toast.success("Takım arkadaşına otomatik takdir verildi!");
        }
        return true;
      } catch (err) {
        console.warn("[SoloQMachine] Otomatik takdir verilemedi:", err);
        return false;
      }
    }

    scheduleAutoPlayAgain(phase) {
      this.cancelAutoPlayAgain();
      if (!CONFIG.autoPlayAgain.enabled || this._disposed) return;
      // WaitingForStats → EndOfGame geçişinde aynı oyun için ikinci kez
      // "tekrar oyna" göndermeyelim.
      if (this._playAgainSent) return;

      const baseDelay = clampDelay(CONFIG.autoPlayAgain.delayMs, 2000);
      const delay = phase === "WaitingForStats" ? Math.max(baseDelay, 5000) : baseDelay;
      const revision = this._actionRevision;
      let attempt = 0;

      const run = async () => {
        if (this._disposed || revision !== this._actionRevision || !CONFIG.autoPlayAgain.enabled) return;
        const ok = await this.playAgain();
        if (ok) {
          this._playAgainSent = true;
          return;
        }
        attempt++;
        if (attempt < 4) {
          this._autoPlayAgainTimer = setTimeout(run, 3000);
        }
      };

      this._autoPlayAgainTimer = setTimeout(run, delay);
    }

    cancelAutoPlayAgain() {
      if (this._autoPlayAgainTimer) {
        clearTimeout(this._autoPlayAgainTimer);
        this._autoPlayAgainTimer = null;
      }
    }

    async playAgain() {
      try {
        if (this._disposed || !CONFIG.autoPlayAgain.enabled) return false;

        // Zaten bir lobideysek tekrar çağırmak "lobi zaten var" hatası üretiyor.
        try {
          const lobby = await lcuFetch("/lol-lobby/v2/lobby");
          if (lobby) return true;
        } catch (e) {
          if (!String(e.message || "").includes("404")) throw e;
        }

        await lcuFetch("/lol-lobby/v2/play-again", "POST");
        return true;
      } catch (e) {
        console.warn("[SoloQMachine] Tekrar oyna başarısız:", e);
        return false;
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

    modal.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeSettingsModal();
    });

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
      if (!input.dataset?.key) return;
      const key = input.dataset.key;
      let val = parseFloat(input.value);
      if (!Number.isFinite(val)) val = 0;
      // Arayüzde 0-30 sn aralığı var; elle yazılan değerleri de sınırla.
      val = Math.max(0, Math.min(30, val));

      if (key === "autoAccept.delaySec") CONFIG.autoAccept.delayMs = Math.round(val * 1000);
      else if (key === "autoPlayAgain.delaySec") CONFIG.autoPlayAgain.delayMs = Math.round(val * 1000);
      else return;

      input.value = val.toFixed(1);
      saveConfig(CONFIG);
      if (window.__c403SoloQInstance) {
        window.__c403SoloQInstance.recheckCurrentPhase();
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
    setInput("autoPlayAgain.delaySec", ((CONFIG.autoPlayAgain.delayMs || 2000) / 1000).toFixed(1));
  }

  // Aynı anda iki mod ayar penceresi açık kalmasın (z-index çakışması).
  function closeOtherModals() {
    [
      "c403-bg-modal",
      "c403-profile-winloss-modal",
      "c403-icon-swapper-modal",
      "c403-skinviewer-info-modal",
    ].forEach((id) => document.getElementById(id)?.remove());
  }

  function openSettingsModal() {
    closeOtherModals();
    const modal = ensureModal();
    updateModalUI(modal);
    modal.classList.add("c403-open");
    modal.querySelector(".c403-sq-card")?.focus?.();
  }

  function closeSettingsModal() {
    const modal = document.getElementById(MODAL_ID);
    if (modal) modal.classList.remove("c403-open");
  }

  // Hook into 403Changer Modları gear icon
  window.__c403ModSettings = window.__c403ModSettings || {};
  window.__c403ModSettings["soloqmachine"] = openSettingsModal;

  const start = () => {
    if (window.__c403SoloQInstance) return;
    window.__c403SoloQInstance = new SoloQController();
  };

  // Plugin, sayfa "load" olduktan sonra da enjekte edilebilir; o durumda
  // load olayı bir daha tetiklenmez ve otomasyon hiç çalışmazdı.
  if (document.readyState === "complete") {
    start();
  } else {
    window.addEventListener("load", start, { once: true });
  }
})();
