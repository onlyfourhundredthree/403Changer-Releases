/**
 * 403Changer - Profil Galibiyet / Mağlubiyet & KDA İstatistikleri
 *
 * @name         ProfileWinLose
 * @author       403Changer (Original by Yimikami)
 * @description  Profil sayfasında son maçların Galibiyet/Mağlubiyet, Win Rate ve KDA oranını gösterir.
 * @version      1.0.0
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
    all: { id: "all", name: "Tüm Modlar" },
    ranked_solo: { id: 420, name: "Dereceli (Tek/Çift)" },
    ranked_flex: { id: 440, name: "Dereceli (Esnek)" },
    normal_draft: { id: 400, name: "Normal (Sıralı)" },
    aram: { id: 450, name: "ARAM" },
    arena: { ids: [1700, 1710, 1740, 1750], name: "Arena" },
    swiftplay: { id: 480, name: "Hızlı Oyun" },
  };

  const DEFAULT_CONFIG = {
    gamesCount: 40,
    selectedQueue: "all",
    kdaDisplay: "show",
  };

  let CONFIG = { ...DEFAULT_CONFIG };
  const cache = new Map();

  function loadSettings() {
    try {
      if (window.DataStore && typeof window.DataStore.get === "function") {
        const saved = window.DataStore.get(STORAGE_KEY);
        if (saved) {
          const parsed = typeof saved === "string" ? JSON.parse(saved) : saved;
          CONFIG = {
            ...DEFAULT_CONFIG,
            gamesCount: Math.min(200, Math.max(1, parseInt(parsed.gamesCount, 10) || 40)),
            selectedQueue: QUEUE_TYPES[parsed.selectedQueue] ? parsed.selectedQueue : "all",
            kdaDisplay: parsed.kdaDisplay === "hide" ? "hide" : "show",
          };
        }
      }
    } catch (e) {
      console.warn("[ProfileWinLose] Ayarlar yüklenemedi:", e);
    }
  }

  function saveSettings() {
    try {
      if (window.DataStore && typeof window.DataStore.set === "function") {
        window.DataStore.set(STORAGE_KEY, JSON.stringify(CONFIG));
      }
    } catch (e) {
      console.warn("[ProfileWinLose] Ayarlar kaydedilemedi:", e);
    }
  }

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${CONTAINER_ID} {
        display: flex;
        justify-content: center;
        align-items: center;
        width: 100%;
        margin-top: 14px;
        z-index: 10;
        pointer-events: auto;
      }

      .c403-pwl-pill {
        display: inline-flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 6px 16px 8px;
        background: radial-gradient(120% 100% at 50% 0%, rgba(200, 170, 110, 0.12), rgba(10, 16, 24, 0.88));
        border: 1px solid rgba(200, 170, 110, 0.35);
        border-radius: 20px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(6px);
        font-family: "Beaufort for LOL", "Segoe UI", sans-serif;
        user-select: none;
        transition: transform 0.2s ease, border-color 0.2s ease;
      }

      .c403-pwl-pill:hover {
        transform: translateY(-1px);
        border-color: rgba(200, 170, 110, 0.7);
        box-shadow: 0 10px 28px rgba(0, 0, 0, 0.75), 0 0 12px rgba(200, 170, 110, 0.25);
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
        font-size: 13.5px;
        font-weight: 600;
        letter-spacing: 0.03em;
      }

      .c403-pwl-wins {
        color: #0acbe6;
        text-shadow: 0 0 8px rgba(10, 203, 230, 0.45);
      }

      .c403-pwl-losses {
        color: #ff4b4b;
        text-shadow: 0 0 8px rgba(255, 75, 75, 0.45);
      }

      .c403-pwl-winrate {
        color: #f0e6d2;
        font-weight: 700;
        text-shadow: 0 0 8px rgba(240, 230, 210, 0.3);
      }

      .c403-pwl-kda {
        color: #e8c887;
        font-size: 12.5px;
        padding-left: 6px;
        border-left: 1px solid rgba(200, 170, 110, 0.25);
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

      /* Settings Modal */
      #${MODAL_ID} {
        position: fixed;
        inset: 0;
        z-index: 2147483640;
        display: none;
        align-items: center;
        justify-content: center;
        background: rgba(3, 6, 9, 0.65);
        backdrop-filter: blur(4px);
        font-family: "Beaufort for LOL", "Segoe UI", sans-serif;
        color: #cdbe91;
      }

      #${MODAL_ID}.c403-open {
        display: flex;
      }

      #${MODAL_ID} .c403-pwl-card {
        width: 380px;
        max-width: 92vw;
        background: radial-gradient(120% 80% at 50% -20%, rgba(200, 170, 110, 0.15), transparent 60%),
                    linear-gradient(180deg, #0d1319 0%, #070b0f 100%);
        border: 1px solid rgba(200, 170, 110, 0.45);
        border-radius: 8px;
        box-shadow: 0 24px 64px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.06);
        overflow: hidden;
      }

      #${MODAL_ID} .c403-pwl-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 18px;
        border-bottom: 1px solid rgba(200, 170, 110, 0.2);
        background: rgba(200, 170, 110, 0.05);
      }

      #${MODAL_ID} .c403-pwl-title {
        margin: 0;
        font-size: 14px;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: #f0e6d2;
      }

      #${MODAL_ID} .c403-pwl-close {
        background: transparent;
        border: none;
        color: #cdbe91;
        font-size: 18px;
        cursor: pointer;
        padding: 0 4px;
      }
      #${MODAL_ID} .c403-pwl-close:hover { color: #f0e6d2; }

      #${MODAL_ID} .c403-pwl-body {
        padding: 16px 18px 20px;
        display: flex;
        flex-direction: column;
        gap: 14px;
      }

      #${MODAL_ID} .c403-pwl-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      #${MODAL_ID} label {
        font-size: 11.5px;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: #c8aa6e;
      }

      #${MODAL_ID} input[type="number"],
      #${MODAL_ID} select {
        width: 100%;
        background: #09121a;
        border: 1px solid rgba(200, 170, 110, 0.3);
        border-radius: 4px;
        color: #f0e6d2;
        padding: 8px 10px;
        font-size: 13px;
        outline: none;
        box-sizing: border-box;
        transition: border-color 0.15s ease;
      }

      #${MODAL_ID} input[type="number"]:focus,
      #${MODAL_ID} select:focus {
        border-color: #c8aa6e;
        box-shadow: 0 0 8px rgba(200, 170, 110, 0.25);
      }

      #${MODAL_ID} .c403-pwl-save {
        margin-top: 6px;
        padding: 9px 16px;
        background: linear-gradient(180deg, rgba(200, 170, 110, 0.25), rgba(200, 170, 110, 0.08));
        border: 1px solid rgba(200, 170, 110, 0.5);
        border-radius: 4px;
        color: #f0e6d2;
        font-size: 12.5px;
        font-weight: 600;
        letter-spacing: 0.04em;
        cursor: pointer;
        transition: all 0.18s ease;
      }

      #${MODAL_ID} .c403-pwl-save:hover {
        background: linear-gradient(180deg, rgba(200, 170, 110, 0.4), rgba(200, 170, 110, 0.15));
        border-color: #c8aa6e;
        box-shadow: 0 0 12px rgba(200, 170, 110, 0.3);
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function ensureModal() {
    injectStyles();
    let modal = document.getElementById(MODAL_ID);
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = MODAL_ID;
    modal.innerHTML = `
      <div class="c403-pwl-card" role="dialog">
        <div class="c403-pwl-head">
          <h3 class="c403-pwl-title">Win / Loss İstatistik Ayarları</h3>
          <button type="button" class="c403-pwl-close" data-act="close">✕</button>
        </div>
        <div class="c403-pwl-body">
          <div class="c403-pwl-group">
            <label for="c403-pwl-games">Analiz Edilecek Maç Sayısı (1 - 200)</label>
            <input type="number" id="c403-pwl-games" min="1" max="200" value="${CONFIG.gamesCount}">
          </div>
          <div class="c403-pwl-group">
            <label for="c403-pwl-queue">Varsayılan Oyun Modu</label>
            <select id="c403-pwl-queue">
              ${Object.entries(QUEUE_TYPES)
                .map(([key, val]) => `<option value="${key}">${val.name}</option>`)
                .join("")}
            </select>
          </div>
          <div class="c403-pwl-group">
            <label for="c403-pwl-kda">KDA Oranı Gösterimi</label>
            <select id="c403-pwl-kda">
              <option value="show">KDA Oranını Göster</option>
              <option value="hide">KDA Oranını Gizle</option>
            </select>
          </div>
          <button type="button" class="c403-pwl-save" data-act="save">Kaydet ve Uygula</button>
        </div>
      </div>
    `;

    modal.addEventListener("click", (e) => {
      if (e.target === modal || e.target.dataset.act === "close") {
        closeSettingsModal();
      } else if (e.target.dataset.act === "save") {
        const gamesInput = modal.querySelector("#c403-pwl-games");
        const queueSelect = modal.querySelector("#c403-pwl-queue");
        const kdaSelect = modal.querySelector("#c403-pwl-kda");

        let games = parseInt(gamesInput.value, 10);
        if (isNaN(games) || games < 1) games = 1;
        if (games > 200) games = 200;

        CONFIG.gamesCount = games;
        CONFIG.selectedQueue = queueSelect.value;
        CONFIG.kdaDisplay = kdaSelect.value;

        saveSettings();
        cache.clear();
        closeSettingsModal();

        if (window.__c403ProfileWinLoseInstance) {
          window.__c403ProfileWinLoseInstance.refreshCurrent();
        }

        if (window.Toast && typeof window.Toast.success === "function") {
          window.Toast.success("Win/Loss ayarları kaydedildi!");
        }
      }
    });

    document.body.appendChild(modal);
    return modal;
  }

  function openSettingsModal() {
    loadSettings();
    const modal = ensureModal();
    const gamesInput = modal.querySelector("#c403-pwl-games");
    const queueSelect = modal.querySelector("#c403-pwl-queue");
    const kdaSelect = modal.querySelector("#c403-pwl-kda");

    if (gamesInput) gamesInput.value = CONFIG.gamesCount;
    if (queueSelect) queueSelect.value = CONFIG.selectedQueue;
    if (kdaSelect) kdaSelect.value = CONFIG.kdaDisplay;

    modal.classList.add("c403-open");
  }

  function closeSettingsModal() {
    const modal = document.getElementById(MODAL_ID);
    if (modal) modal.classList.remove("c403-open");
  }

  // Register settings hook for 403Changer Modları gear icon
  window.__c403ModSettings = window.__c403ModSettings || {};
  window.__c403ModSettings["profilewinlose"] = openSettingsModal;

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
        const profileElements = document.querySelectorAll("lol-regalia-profile-v2-element");
        if (!profileElements.length) {
          this.currentPuuid = null;
          const container = document.getElementById(CONTAINER_ID);
          if (container) container.remove();
          return;
        }

        const searchedProfile = Array.from(profileElements).find(
          (el) => el.getAttribute("is-searched") === "true"
        );
        const targetProfile = searchedProfile || profileElements[0];
        if (!targetProfile) return;

        const puuid = targetProfile.getAttribute("puuid");
        if (!puuid) return;

        const container = document.getElementById(CONTAINER_ID);
        if (puuid !== this.currentPuuid || !container || !document.contains(container)) {
          this.currentPuuid = puuid;
          this.attachContainer(targetProfile);
          this.fetchAndRender(puuid);
        }
      });

      this.observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["puuid", "is-searched"],
      });
    }

    attachContainer(targetProfile) {
      let container = document.getElementById(CONTAINER_ID);
      if (!container) {
        container = document.createElement("div");
        container.id = CONTAINER_ID;
      }

      // Attach right underneath summoner status icons or banner within the profile
      const anchor =
        targetProfile.querySelector(".style-profile-summoner-status-icons") ||
        targetProfile.querySelector(".summoner-level-ring") ||
        targetProfile;

      if (anchor && anchor.parentNode) {
        anchor.parentNode.insertBefore(container, anchor.nextSibling);
      } else {
        targetProfile.appendChild(container);
      }
      return container;
    }

    refreshCurrent() {
      if (this.currentPuuid) {
        const profileElements = document.querySelectorAll("lol-regalia-profile-v2-element");
        const searchedProfile = Array.from(profileElements).find(
          (el) => el.getAttribute("is-searched") === "true"
        );
        const target = searchedProfile || profileElements[0];
        if (target) this.attachContainer(target);
        this.fetchAndRender(this.currentPuuid);
      }
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
      if (cache.has(cacheKey) && Date.now() - cache.get(cacheKey).time < 180000) {
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
        <div class="c403-pwl-pill">
          <span class="c403-pwl-queue">${queueName} (${stats.totalGames} Maç)</span>
          <div class="c403-pwl-row">
            <span class="c403-pwl-wins">${stats.wins}G</span>
            <span class="c403-pwl-losses">${stats.losses}M</span>
            <span class="c403-pwl-winrate">%${stats.winRate}</span>
            ${CONFIG.kdaDisplay === "show" ? `<span class="c403-pwl-kda">${stats.kda} KDA</span>` : ""}
          </div>
        </div>
      `;
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

  window.addEventListener("load", () => {
    window.__c403ProfileWinLoseInstance = new ProfileWinLoseTracker();
  });
})();
