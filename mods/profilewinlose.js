/**
 * 403Changer - Profil Galibiyet / Mağlubiyet (Win/Lose) Takipçisi
 *
 * @name         ProfileWinLose
 * @author       403Changer
 * @description  Sihirdar profilinde son maçların G/M (W/L) istatistiklerini, kazanma oranını ve KDA'yı gösterir.
 * @version      2.0.0
 */

(function () {
  "use strict";

  if (window.__c403ProfileWinLoseLoaded) return;
  window.__c403ProfileWinLoseLoaded = true;

  const STORAGE_KEY = "c403-profile-winloss-settings";
  const CONTAINER_ID = "c403-profile-winloss-container";
  const MODAL_ID = "c403-profile-winloss-modal";
  const STYLE_ID = "c403-profile-winloss-styles";

  const QUEUE_TYPES = {
    all: { name: "Tüm Modlar", id: null, ids: null },
    solo: { name: "Dereceli Tek/Çift", id: 420 },
    flex: { name: "Dereceli Esnek", id: 440 },
    normal: { name: "Normal (Sıralı/Seçimli)", ids: [400, 430] },
    aram: { name: "ARAM", id: 450 },
    arena: { name: "Arena", id: 1700 },
    quickplay: { name: "Hızlı Oyun", id: 490 },
  };

  const DEFAULT_CONFIG = {
    gamesCount: 40,
    selectedQueue: "solo",
    kdaDisplay: "show",
  };

  // --- Sağlam İki Katmanlı Depolama (DataStore + localStorage) ---
  const Storage = {
    get(key, fallback = null) {
      try {
        if (window.DataStore && typeof window.DataStore.get === "function") {
          const val = window.DataStore.get(key);
          if (val !== undefined && val !== null) {
            return typeof val === "string" ? JSON.parse(val) : val;
          }
        }
      } catch (e) {}

      try {
        const local = localStorage.getItem(key);
        if (local) {
          return JSON.parse(local);
        }
      } catch (e) {}

      return fallback;
    },
    set(key, val) {
      const serialized = typeof val === "string" ? val : JSON.stringify(val);
      try {
        if (window.DataStore && typeof window.DataStore.set === "function") {
          window.DataStore.set(key, val);
        }
      } catch (e) {}

      try {
        localStorage.setItem(key, serialized);
      } catch (e) {}
    },
  };

  function loadSettings() {
    try {
      const saved = Storage.get(STORAGE_KEY, null);
      if (saved) {
        CONFIG = {
          ...DEFAULT_CONFIG,
          gamesCount: Math.min(200, Math.max(1, parseInt(saved.gamesCount, 10) || 40)),
          selectedQueue: QUEUE_TYPES[saved.selectedQueue] ? saved.selectedQueue : "solo",
          kdaDisplay: saved.kdaDisplay === "hide" ? "hide" : "show",
        };
        return;
      }
    } catch (e) {
      console.warn("[ProfileWinLose] Ayarlar okunamadı:", e);
    }
    CONFIG = { ...DEFAULT_CONFIG };
  }

  function saveSettings() {
    try {
      Storage.set(STORAGE_KEY, CONFIG);
    } catch (e) {
      console.warn("[ProfileWinLose] Ayarlar kaydedilemedi:", e);
    }
  }

  let CONFIG = { ...DEFAULT_CONFIG };
  const cache = new Map();

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${CONTAINER_ID} {
        display: flex !important;
        justify-content: center !important;
        align-items: center !important;
        width: 100% !important;
        margin: 10px auto 14px auto !important;
        z-index: 99 !important;
        position: relative !important;
        pointer-events: auto !important;
      }

      .c403-pwl-pill {
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        gap: 5px;
        padding: 7px 18px 9px;
        background: radial-gradient(120% 100% at 50% 0%, rgba(200, 170, 110, 0.16), rgba(10, 16, 24, 0.92));
        border: 1px solid rgba(200, 170, 110, 0.45);
        border-radius: 20px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.75), inset 0 1px 0 rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(8px);
        font-family: "Beaufort for LOL", "Segoe UI", sans-serif;
        user-select: none;
        transition: transform 0.2s ease, border-color 0.2s ease;
      }

      .c403-pwl-pill:hover {
        transform: translateY(-1px);
        border-color: rgba(200, 170, 110, 0.8);
        box-shadow: 0 10px 28px rgba(0, 0, 0, 0.8), 0 0 14px rgba(200, 170, 110, 0.3);
      }

      .c403-pwl-queue {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: #c8aa6e;
        text-shadow: 0 0 8px rgba(200, 170, 110, 0.4);
      }

      .c403-pwl-row {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 14px;
        font-weight: 700;
        letter-spacing: 0.03em;
      }

      .c403-pwl-wins {
        color: #0acbe6;
        text-shadow: 0 0 8px rgba(10, 203, 230, 0.5);
      }

      .c403-pwl-losses {
        color: #ff4b4b;
        text-shadow: 0 0 8px rgba(255, 75, 75, 0.5);
      }

      .c403-pwl-winrate {
        color: #f0e6d2;
        font-weight: 800;
        text-shadow: 0 0 8px rgba(240, 230, 210, 0.3);
      }

      .c403-pwl-kda {
        color: #e8c887;
        font-size: 13px;
        padding-left: 8px;
        border-left: 1px solid rgba(200, 170, 110, 0.3);
      }

      .c403-pwl-loading {
        font-size: 12px;
        color: #c8aa6e;
        letter-spacing: 0.05em;
        animation: c403PwlPulse 1.4s ease-in-out infinite;
      }

      .c403-pwl-error {
        font-size: 12px;
        color: rgba(228, 139, 139, 0.85);
      }

      @keyframes c403PwlPulse {
        0%, 100% { opacity: 0.45; }
        50% { opacity: 1; }
      }

      /* Ayarlar Modalı */
      #${MODAL_ID} {
        position: fixed;
        inset: 0;
        z-index: 2147483640;
        display: none;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.75);
        backdrop-filter: blur(8px);
        font-family: "Beaufort for LOL", "Segoe UI", sans-serif;
        color: #f0e6d2;
        user-select: none;
      }

      #${MODAL_ID}.c403-open {
        display: flex;
      }

      #${MODAL_ID} .c403-pwl-dialog {
        width: 440px;
        background: radial-gradient(120% 90% at 50% -20%, rgba(200, 170, 110, 0.12), transparent 60%),
                    linear-gradient(180deg, #0d141b 0%, #06090d 100%);
        border: 1px solid rgba(200, 170, 110, 0.45);
        border-radius: 8px;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.05);
        overflow: hidden;
      }

      #${MODAL_ID} .c403-pwl-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        border-bottom: 1px solid rgba(200, 170, 110, 0.2);
        background: rgba(0, 0, 0, 0.35);
      }

      #${MODAL_ID} .c403-pwl-head-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      #${MODAL_ID} .c403-pwl-logo {
        width: 36px;
        height: 36px;
        background: url("/asset/logo.png") center / contain no-repeat;
        filter: drop-shadow(0 0 8px rgba(200, 170, 110, 0.6));
      }

      #${MODAL_ID} .c403-pwl-titles h2 {
        margin: 0;
        font-size: 15px;
        font-weight: 800;
        letter-spacing: 0.08em;
        color: #f0e6d2;
        text-transform: uppercase;
      }

      #${MODAL_ID} .c403-pwl-titles span {
        font-size: 11px;
        color: rgba(205, 190, 145, 0.7);
      }

      #${MODAL_ID} .c403-pwl-close {
        background: none;
        border: none;
        color: #a09b8c;
        font-size: 20px;
        cursor: pointer;
        padding: 4px 8px;
        transition: color 0.15s;
      }

      #${MODAL_ID} .c403-pwl-close:hover {
        color: #f0e6d2;
      }

      #${MODAL_ID} .c403-pwl-body {
        padding: 18px 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .c403-pwl-field {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .c403-pwl-field label {
        font-size: 12px;
        font-weight: 700;
        color: #cdbe91;
      }

      .c403-pwl-select, .c403-pwl-input {
        background: #091016;
        border: 1px solid rgba(200, 170, 110, 0.3);
        border-radius: 4px;
        color: #f0e6d2;
        padding: 8px 10px;
        font-size: 12px;
        outline: none;
      }

      .c403-pwl-select:focus, .c403-pwl-input:focus {
        border-color: #c8aa6e;
      }

      .c403-pwl-foot {
        display: flex;
        justify-content: flex-end;
        padding: 12px 20px;
        border-top: 1px solid rgba(200, 170, 110, 0.15);
        background: rgba(0, 0, 0, 0.25);
      }

      .c403-pwl-btn {
        background: linear-gradient(180deg, #1e282d, #141c22);
        border: 1px solid #c8aa6e;
        color: #f0e6d2;
        padding: 7px 18px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.15s;
      }

      .c403-pwl-btn:hover {
        background: linear-gradient(180deg, #28373e, #1a242c);
        border-color: #f0e6d2;
        box-shadow: 0 0 10px rgba(200, 170, 110, 0.3);
      }
    `;
    document.head.appendChild(style);
  }

  // --- Profil Takipçi Sınıfı ---
  class ProfileWinLoseTracker {
    constructor() {
      this.observer = null;
      this.currentPuuid = null;
      this.requestId = 0;
      this.disposed = false;
      this.init();
    }

    async init() {
      loadSettings();
      injectStyles();
      this.observeProfile();
      this.checkAndRender();
      window.addEventListener("unload", () => this.cleanup());
    }

    cleanup() {
      this.disposed = true;
      if (this.observer) this.observer.disconnect();
      const el = document.getElementById(CONTAINER_ID);
      if (el) el.remove();
      cache.clear();
    }

    observeProfile() {
      this.observer = new MutationObserver(() => {
        if (this.disposed) return;
        this.checkAndRender();
      });

      this.observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["puuid", "is-searched", "data-screen-name"],
      });
    }

    async checkAndRender() {
      // Profil ekranının açık olup olmadığını kontrol et
      const profileRoot =
        document.querySelector('[data-screen-name="rcp-fe-lol-profiles-main"]') ||
        document.querySelector("rcp-fe-lol-profiles") ||
        document.querySelector(".style-profile-overview-component") ||
        document.querySelector("lol-regalia-profile-v2-element") ||
        document.querySelector("lol-regalia-identity-v2-element");

      if (!profileRoot) {
        this.currentPuuid = null;
        const container = document.getElementById(CONTAINER_ID);
        if (container) container.remove();
        return;
      }

      // PUUID'yi DOM'dan veya LCU'dan al
      let puuid = null;
      const profileElements = document.querySelectorAll("lol-regalia-profile-v2-element, lol-regalia-identity-v2-element");
      for (const el of profileElements) {
        if (el.getAttribute("is-searched") === "true" && el.getAttribute("puuid")) {
          puuid = el.getAttribute("puuid");
          break;
        }
      }

      if (!puuid && profileElements.length > 0) {
        puuid = profileElements[0].getAttribute("puuid");
      }

      // Eğer DOM'da puuid yoksa geçerli sihirdardan çek
      if (!puuid) {
        try {
          const res = await fetch("/lol-summoner/v1/current-summoner");
          if (res.ok) {
            const me = await res.json();
            puuid = me.puuid;
          }
        } catch (e) {}
      }

      if (!puuid) return;

      const container = document.getElementById(CONTAINER_ID);
      if (puuid !== this.currentPuuid || !container || !document.contains(container)) {
        this.currentPuuid = puuid;
        this.attachContainer(profileRoot);
        this.fetchAndRender(puuid);
      }
    }

    attachContainer(profileRoot) {
      let container = document.getElementById(CONTAINER_ID);
      if (!container) {
        container = document.createElement("div");
        container.id = CONTAINER_ID;
      }

      const anchor =
        document.querySelector(".style-profile-summoner-status-icons") ||
        document.querySelector(".style-profile-sub-nav-component") ||
        document.querySelector(".summoner-level-ring") ||
        document.querySelector(".style-profile-overview-component") ||
        profileRoot;

      if (anchor && anchor.parentNode && anchor !== profileRoot) {
        anchor.parentNode.insertBefore(container, anchor.nextSibling);
      } else {
        profileRoot.appendChild(container);
      }
      return container;
    }

    async fetchAndRender(puuid) {
      const container = document.getElementById(CONTAINER_ID);
      if (!container) return;

      container.innerHTML = `
        <div class="c403-pwl-pill">
          <span class="c403-pwl-loading">İstatistikler yükleniyor…</span>
        </div>
      `;

      const curReq = ++this.requestId;
      const { selectedQueue, gamesCount } = CONFIG;
      const cacheKey = `${puuid}_${selectedQueue}_${gamesCount}`;

      let stats = null;
      if (cache.has(cacheKey) && Date.now() - cache.get(cacheKey).time < 120000) {
        stats = cache.get(cacheKey).data;
      } else {
        try {
          const endpoint = `/lol-match-history/v1/products/lol/${puuid}/matches?begIndex=0&endIndex=${gamesCount - 1}`;
          const res = await fetch(endpoint);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          const json = await res.json();
          stats = this.computeStats(json, puuid);
          cache.set(cacheKey, { data: stats, time: Date.now() });
        } catch (err) {
          console.warn("[ProfileWinLose] Maç geçmişi alınamadı:", err);
        }
      }

      if (this.disposed || curReq !== this.requestId || this.currentPuuid !== puuid) return;

      if (!stats) {
        container.innerHTML = `
          <div class="c403-pwl-pill">
            <span class="c403-pwl-error">İstatistikler alınamadı</span>
          </div>
        `;
        return;
      }

      const queueName = QUEUE_TYPES[CONFIG.selectedQueue]?.name || "Tüm Modlar";
      container.innerHTML = `
        <div class="c403-pwl-pill" title="Tıkla: Mod Ayarlarını Aç" style="cursor: pointer;">
          <span class="c403-pwl-queue">${queueName} (${stats.totalGames} Maç)</span>
          <div class="c403-pwl-row">
            <span class="c403-pwl-wins">${stats.wins}G</span>
            <span class="c403-pwl-losses">${stats.losses}M</span>
            <span class="c403-pwl-winrate">%${stats.winRate}</span>
            ${CONFIG.kdaDisplay === "show" ? `<span class="c403-pwl-kda">${stats.kda} KDA</span>` : ""}
          </div>
        </div>
      `;

      container.querySelector(".c403-pwl-pill")?.addEventListener("click", () => {
        openModal();
      });
    }

    computeStats(data, puuid) {
      if (!data || !Array.isArray(data.games?.games)) {
        return { wins: 0, losses: 0, totalGames: 0, winRate: "0.0", kda: "0.0" };
      }

      const { selectedQueue, gamesCount } = CONFIG;
      const allGames = data.games.games;

      const filtered =
        selectedQueue === "all"
          ? allGames
          : allGames.filter((g) => {
              const q = QUEUE_TYPES[selectedQueue];
              return q.ids ? q.ids.includes(g.queueId) : g.queueId === q.id;
            });

      const slice = filtered.slice(0, gamesCount);
      let wins = 0;
      let losses = 0;
      let totalKills = 0;
      let totalDeaths = 0;
      let totalAssists = 0;

      for (const game of slice) {
        const ident = game.participantIdentities?.find((entry) => entry.player?.puuid === puuid);
        const player = ident
          ? game.participants?.find((p) => p.participantId === ident.participantId)
          : (game.participants?.length === 1 ? game.participants[0] : null);

        if (!player?.stats) continue;

        const team = game.teams?.find((t) => t.teamId === player.teamId) ||
          game.teams?.[player.teamId === 100 ? 0 : 1];
        const teamWin = typeof player.stats.win === "boolean" ? player.stats.win : team?.win === "Win";

        if (teamWin) wins++;
        else losses++;

        totalKills += player.stats.kills || 0;
        totalDeaths += player.stats.deaths || 0;
        totalAssists += player.stats.assists || 0;
      }

      const totalGames = wins + losses;
      const winRate = totalGames > 0 ? ((wins / totalGames) * 100).toFixed(1) : "0.0";
      const kda =
        totalDeaths === 0
          ? (totalKills + totalAssists).toFixed(1)
          : ((totalKills + totalAssists) / totalDeaths).toFixed(1);

      return { wins, losses, totalGames, winRate, kda };
    }
  }

  // --- Ayarlar Modalı ---
  let modalEl = null;

  function ensureModal() {
    if (modalEl) return modalEl;

    injectStyles();

    const modal = document.createElement("div");
    modal.id = MODAL_ID;
    modal.innerHTML = `
      <div class="c403-pwl-dialog">
        <div class="c403-pwl-head">
          <div class="c403-pwl-head-left">
            <div class="c403-pwl-logo"></div>
            <div class="c403-pwl-titles">
              <h2>Profil Galibiyet/Mağlubiyet</h2>
              <span>403Changer İstatistik Takipçisi</span>
            </div>
          </div>
          <button type="button" class="c403-pwl-close" id="c403-pwl-close-btn">✕</button>
        </div>

        <div class="c403-pwl-body">
          <div class="c403-pwl-field">
            <label>Hesaplanacak Sıra Modu</label>
            <select class="c403-pwl-select" id="c403-pwl-queue-sel">
              <option value="solo">Dereceli Tek/Çift</option>
              <option value="flex">Dereceli Esnek</option>
              <option value="all">Tüm Modlar</option>
              <option value="normal">Normal (Sıralı/Seçimli)</option>
              <option value="aram">ARAM</option>
              <option value="arena">Arena</option>
              <option value="quickplay">Hızlı Oyun</option>
            </select>
          </div>

          <div class="c403-pwl-field">
            <label>Son Kaç Maç Hesaplansın? (1 - 200)</label>
            <input type="number" class="c403-pwl-input" id="c403-pwl-count-inp" min="1" max="200" value="40" />
          </div>

          <div class="c403-pwl-field">
            <label>KDA Oranı Gösterilsin mi?</label>
            <select class="c403-pwl-select" id="c403-pwl-kda-sel">
              <option value="show">Göster</option>
              <option value="hide">Gizle</option>
            </select>
          </div>
        </div>

        <div class="c403-pwl-foot">
          <button type="button" class="c403-pwl-btn" id="c403-pwl-save-btn">Kaydet</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modalEl = modal;

    modal.querySelector("#c403-pwl-close-btn").addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });

    modal.querySelector("#c403-pwl-save-btn").addEventListener("click", () => {
      const q = modal.querySelector("#c403-pwl-queue-sel").value;
      const count = Math.min(200, Math.max(1, parseInt(modal.querySelector("#c403-pwl-count-inp").value, 10) || 40));
      const kda = modal.querySelector("#c403-pwl-kda-sel").value;

      CONFIG.selectedQueue = q;
      CONFIG.gamesCount = count;
      CONFIG.kdaDisplay = kda;

      saveSettings();
      closeModal();
      cache.clear();

      if (window.__c403ProfileWinLoseInstance) {
        window.__c403ProfileWinLoseInstance.checkAndRender();
      }
    });

    return modal;
  }

  function openModal() {
    loadSettings();
    const modal = ensureModal();
    modal.querySelector("#c403-pwl-queue-sel").value = CONFIG.selectedQueue;
    modal.querySelector("#c403-pwl-count-inp").value = CONFIG.gamesCount;
    modal.querySelector("#c403-pwl-kda-sel").value = CONFIG.kdaDisplay;
    modal.classList.add("c403-open");
  }

  function closeModal() {
    if (modalEl) modalEl.classList.remove("c403-open");
  }

  // --- Başlatma Mantığı (Anında ve gecikmesiz) ---
  function startTracker() {
    if (!window.__c403ProfileWinLoseInstance) {
      window.__c403ProfileWinLoseInstance = new ProfileWinLoseTracker();
    }
  }

  if (document.readyState === "complete" || document.readyState === "interactive") {
    startTracker();
  } else {
    window.addEventListener("DOMContentLoaded", startTracker);
    window.addEventListener("load", startTracker);
  }

  window.__c403ModSettings = window.__c403ModSettings || {};
  window.__c403ModSettings["profilewinlose"] = () => openModal();
  window.c403OpenProfileWinLoseSettings = () => openModal();
  window.addEventListener("c403-open-mod-settings-profilewinlose", () => openModal());

  console.log("[ProfileWinLose] Mod başarıyla yüklendi ve aktif edildi.");
})();
