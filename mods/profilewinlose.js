/**
 * 403Changer - Profil Galibiyet / Mağlubiyet (Win/Lose) Takipçisi
 *
 * @name         ProfileWinLose
 * @author       403Changer
 * @description  Sihirdar profilinde son maçların G/M (W/L) istatistiklerini, kazanma oranını ve KDA'yı gösterir.
 * @version      2.1.0
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

  // --- İki Katmanlı Kalıcı Depolama (DataStore + localStorage) ---
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
        display: inline-flex !important;
        align-items: center !important;
        width: auto !important;
        max-width: fit-content !important;
        margin: 0 0 0 16px !important;
        padding: 0 !important;
        z-index: 100 !important;
        position: relative !important;
        pointer-events: auto !important;
        flex: 0 0 auto !important;
        align-self: center !important;
        vertical-align: middle !important;
      }

      .c403-pwl-pill {
        display: inline-flex;
        flex-direction: row;
        align-items: center;
        gap: 12px;
        padding: 6px 14px;
        background: radial-gradient(120% 100% at 50% 0%, rgba(200, 170, 110, 0.16), rgba(10, 16, 24, 0.94));
        border: 1px solid rgba(200, 170, 110, 0.45);
        border-radius: 5px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.08);
        backdrop-filter: blur(8px);
        font-family: "Beaufort for LOL", "Segoe UI", sans-serif;
        user-select: none;
        white-space: nowrap;
        transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
        cursor: pointer;
      }

      .c403-pwl-pill:hover {
        transform: translateY(-1px);
        border-color: rgba(200, 170, 110, 0.85);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.8), 0 0 12px rgba(200, 170, 110, 0.3);
      }

      .c403-pwl-meta {
        display: flex;
        flex-direction: column;
        line-height: 1.15;
      }

      .c403-pwl-queue {
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: #c8aa6e;
      }

      .c403-pwl-count {
        font-size: 9.5px;
        color: rgba(205, 190, 145, 0.65);
        letter-spacing: 0.02em;
      }

      .c403-pwl-divider {
        width: 1px;
        height: 22px;
        background: rgba(200, 170, 110, 0.28);
      }

      .c403-pwl-row {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        font-weight: 700;
      }

      .c403-pwl-wins {
        color: #0acbe6;
        text-shadow: 0 0 8px rgba(10, 203, 230, 0.4);
      }

      .c403-pwl-losses {
        color: #e84057;
        text-shadow: 0 0 8px rgba(232, 64, 87, 0.4);
      }

      .c403-pwl-winrate {
        color: #f0e6d2;
        padding: 1px 6px;
        background: rgba(200, 170, 110, 0.15);
        border: 1px solid rgba(200, 170, 110, 0.35);
        border-radius: 3px;
        font-size: 11px;
      }

      .c403-pwl-kda {
        color: #f0e6d2;
        font-size: 11px;
        opacity: 0.88;
      }

      .c403-pwl-loading, .c403-pwl-error {
        font-size: 11px;
        color: rgba(205, 190, 145, 0.7);
        letter-spacing: 0.03em;
      }

      /* Ayarlar Modalı */
      #${MODAL_ID} {
        position: fixed;
        inset: 0;
        z-index: 2147483647 !important;
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
        display: flex !important;
      }

      .c403-pwl-dialog {
        width: 440px;
        max-width: 90vw;
        background: radial-gradient(120% 90% at 50% -20%, rgba(200, 170, 110, 0.14), transparent 65%),
                    linear-gradient(180deg, #0e151d 0%, #06090d 100%);
        border: 1px solid rgba(200, 170, 110, 0.45);
        border-radius: 8px;
        box-shadow: 0 24px 64px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.06);
        overflow: hidden;
      }

      .c403-pwl-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 20px;
        background: rgba(0, 0, 0, 0.35);
        border-bottom: 1px solid rgba(200, 170, 110, 0.2);
      }

      .c403-pwl-head-left {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .c403-pwl-logo {
        width: 32px;
        height: 32px;
        background: url("/asset/logo.png") center / contain no-repeat;
        filter: drop-shadow(0 0 8px rgba(200, 170, 110, 0.6));
      }

      .c403-pwl-titles h2 {
        margin: 0;
        font-size: 14px;
        font-weight: 800;
        letter-spacing: 0.06em;
        color: #f0e6d2;
        text-transform: uppercase;
      }

      .c403-pwl-titles span {
        font-size: 10.5px;
        color: rgba(205, 190, 145, 0.7);
      }

      .c403-pwl-close {
        background: none;
        border: none;
        color: #a09b8c;
        font-size: 18px;
        cursor: pointer;
        padding: 4px 8px;
        transition: color 0.15s;
      }

      .c403-pwl-close:hover {
        color: #f0e6d2;
      }

      .c403-pwl-body {
        padding: 20px;
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .c403-pwl-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .c403-pwl-group label {
        font-size: 11.5px;
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
      this.pollTimer = null;
      this.requestId = 0;
      this.disposed = false;
      this.init();
    }

    async init() {
      loadSettings();
      injectStyles();
      this.observeProfile();
      this.checkAndRender();

      // İkincil hafif kontrol (Riot sekme geçişlerinde mutation observer tetiklenmezse)
      this.pollTimer = setInterval(() => {
        if (!this.disposed) {
          this.checkAndRender();
        }
      }, 1200);

      window.addEventListener("unload", () => this.cleanup());
    }

    cleanup() {
      this.disposed = true;
      if (this.observer) this.observer.disconnect();
      if (this.pollTimer) clearInterval(this.pollTimer);
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
        attributeFilter: ["puuid", "is-searched", "data-screen-name", "class"],
      });
    }

    async findProfilePuuid(profileRoot) {
      // 1. Profil konteyneri içindeki tüm regalia ve puuid elemanları
      const candidates = [];
      if (profileRoot) {
        candidates.push(profileRoot);
        const inside = profileRoot.querySelectorAll("lol-regalia-profile-v2-element, lol-regalia-identity-v2-element, [puuid], [data-puuid]");
        inside.forEach((el) => candidates.push(el));
      }

      document.querySelectorAll("lol-regalia-profile-v2-element, lol-regalia-identity-v2-element, [puuid]").forEach((el) => candidates.push(el));

      // Öncelik: is-searched="true" olan veya doğrudan puuid taşıyan eleman
      for (const el of candidates) {
        if (el.getAttribute?.("is-searched") === "true") {
          const val = el.getAttribute?.("puuid") || el.puuid || el.dataset?.puuid;
          if (typeof val === "string" && val.length > 20) return val;
        }
      }

      for (const el of candidates) {
        const val = el.getAttribute?.("puuid") || el.puuid || el.dataset?.puuid || el.getAttribute?.("data-puuid");
        if (typeof val === "string" && val.length > 20) return val;
      }

      // 2. URL route / hash kontrolü (#/profile/UUID...)
      const hash = window.location.hash || "";
      const match = hash.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
      if (match) return match[0];

      // 3. Geçerli kullanıcı (kendi profilinde bakıyorsa)
      try {
        const res = await fetch("/lol-summoner/v1/current-summoner");
        if (res.ok) {
          const me = await res.json();
          if (me && me.puuid) return me.puuid;
        }
      } catch (e) {}

      return null;
    }

    async checkAndRender() {
      // Profil ekranının aktif olup olmadığını kontrol et
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

      const puuid = await this.findProfilePuuid(profileRoot);
      if (!puuid) return;

      const container = document.getElementById(CONTAINER_ID);
      const isDetached = !container || !document.body.contains(container);

      if (puuid !== this.currentPuuid || isDetached) {
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

      // Kullanıcı talebi: Tam profil isminin hemen sağında yer alsın
      const nameAndTitle = document.querySelector(".style-profile-name-and-title");
      const summonerInfo = document.querySelector(".style-profile-summoner-info-component");
      const statusIcons = document.querySelector(".style-profile-summoner-status-icons");
      const regalia = document.querySelector("lol-regalia-profile-v2-element");
      const subNav = document.querySelector(".style-profile-sub-nav-component");
      const overview = document.querySelector(".style-profile-overview-component");

      if (nameAndTitle && nameAndTitle.parentNode) {
        nameAndTitle.parentNode.insertBefore(container, nameAndTitle.nextSibling);
      } else if (statusIcons && statusIcons.parentNode) {
        statusIcons.parentNode.insertBefore(container, statusIcons.nextSibling);
      } else if (summonerInfo) {
        summonerInfo.appendChild(container);
      } else if (regalia && regalia.parentNode) {
        regalia.parentNode.insertBefore(container, regalia.nextSibling);
      } else if (subNav && subNav.parentNode) {
        subNav.parentNode.insertBefore(container, subNav);
      } else if (overview) {
        overview.prepend(container);
      } else if (profileRoot) {
        profileRoot.prepend(container);
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
          const endpoint = `/lol-match-history/v1/products/lol/${encodeURIComponent(puuid)}/matches?begIndex=0&endIndex=${gamesCount - 1}`;
          const res = await fetch(endpoint);
          if (res.ok) {
            const json = await res.json();
            stats = this.computeStats(json, puuid);
            cache.set(cacheKey, { data: stats, time: Date.now() });
          } else {
            console.warn(`[ProfileWinLose] Maç geçmişi HTTP ${res.status}`);
          }
        } catch (err) {
          console.warn("[ProfileWinLose] Maç geçmişi alınamadı:", err);
        }
      }

      if (this.disposed || curReq !== this.requestId || this.currentPuuid !== puuid) return;

      const queueName = QUEUE_TYPES[CONFIG.selectedQueue]?.name || "Tüm Modlar";

      if (!stats) {
        container.innerHTML = `
          <div class="c403-pwl-pill" title="Tıkla: Ayarları Aç" style="cursor: pointer;">
            <div class="c403-pwl-meta">
              <span class="c403-pwl-queue">${queueName}</span>
              <span class="c403-pwl-count">Kayıt Bulunamadı</span>
            </div>
            <div class="c403-pwl-divider"></div>
            <div class="c403-pwl-row">
              <span style="color: rgba(205,190,145,0.7); font-size: 11px;">0 Maç</span>
            </div>
          </div>
        `;
        container.querySelector(".c403-pwl-pill")?.addEventListener("click", () => openModal());
        return;
      }

      container.innerHTML = `
        <div class="c403-pwl-pill" title="Tıkla: Mod Ayarlarını Aç">
          <div class="c403-pwl-meta">
            <span class="c403-pwl-queue">${queueName}</span>
            <span class="c403-pwl-count">${stats.totalGames} Maç</span>
          </div>
          <div class="c403-pwl-divider"></div>
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
        let player = game.participants?.find((p) => p.puuid === puuid);
        if (!player) {
          const ident = game.participantIdentities?.find((entry) => entry.player?.puuid === puuid);
          if (ident) {
            player = game.participants?.find((p) => p.participantId === ident.participantId);
          }
        }
        if (!player && game.participants?.length === 1) {
          player = game.participants[0];
        }
        if (!player) continue;

        const stats = player.stats || player;
        const team = game.teams?.find((t) => t.teamId === player.teamId) ||
          game.teams?.[player.teamId === 100 ? 0 : 1];

        const isWin = typeof stats.win === "boolean"
          ? stats.win
          : (typeof stats.win === "string" ? stats.win.toLowerCase() === "win" : (team?.win === "Win" || team?.win === true));

        if (isWin) wins++;
        else losses++;

        totalKills += Number(stats.kills || 0);
        totalDeaths += Number(stats.deaths || 0);
        totalAssists += Number(stats.assists || 0);
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
    let modal = document.getElementById(MODAL_ID);
    if (!modal) {
      injectStyles();
      modal = document.createElement("div");
      modal.id = MODAL_ID;
      modal.innerHTML = `
        <div class="c403-pwl-dialog">
          <div class="c403-pwl-head">
            <div class="c403-pwl-head-left">
              <div class="c403-pwl-logo"></div>
              <div class="c403-pwl-titles">
                <h2>Profil Galibiyet/Mağlubiyet</h2>
                <span>403Changer İstatistik Ayarları</span>
              </div>
            </div>
            <button type="button" class="c403-pwl-close" id="c403-pwl-close-btn">✕</button>
          </div>

          <div class="c403-pwl-body">
            <div class="c403-pwl-group">
              <label>Takip Edilecek Sıra Türü</label>
              <select class="c403-pwl-select" id="c403-pwl-queue-sel">
                <option value="solo">Dereceli Tek/Çift</option>
                <option value="flex">Dereceli Esnek</option>
                <option value="normal">Normal (Sıralı/Seçimli)</option>
                <option value="aram">ARAM</option>
                <option value="arena">Arena</option>
                <option value="quickplay">Hızlı Oyun</option>
                <option value="all">Tüm Modlar</option>
              </select>
            </div>

            <div class="c403-pwl-group">
              <label>Hesaplanacak Son Maç Sayısı (1 - 200)</label>
              <input type="number" class="c403-pwl-input" id="c403-pwl-count-inp" min="1" max="200" value="40" />
            </div>

            <div class="c403-pwl-group">
              <label>KDA Oranı Gösterimi</label>
              <select class="c403-pwl-select" id="c403-pwl-kda-sel">
                <option value="show">Göster</option>
                <option value="hide">Gizle</option>
              </select>
            </div>
          </div>

          <div class="c403-pwl-foot">
            <button type="button" class="c403-pwl-btn" id="c403-pwl-save-btn">Kaydet ve Uygula</button>
          </div>
        </div>
      `;

      modal.querySelector("#c403-pwl-close-btn").addEventListener("click", closeModal);
      modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
      });

      modal.querySelector("#c403-pwl-save-btn").addEventListener("click", () => {
        const qSel = modal.querySelector("#c403-pwl-queue-sel").value;
        const cInp = parseInt(modal.querySelector("#c403-pwl-count-inp").value, 10);
        const kSel = modal.querySelector("#c403-pwl-kda-sel").value;

        CONFIG.selectedQueue = QUEUE_TYPES[qSel] ? qSel : "solo";
        CONFIG.gamesCount = Math.min(200, Math.max(1, isNaN(cInp) ? 40 : cInp));
        CONFIG.kdaDisplay = kSel === "hide" ? "hide" : "show";

        saveSettings();
        cache.clear();

        if (window.__c403ProfileWinLoseInstance && window.__c403ProfileWinLoseInstance.currentPuuid) {
          window.__c403ProfileWinLoseInstance.fetchAndRender(window.__c403ProfileWinLoseInstance.currentPuuid);
        }

        closeModal();
      });
    }

    if (document.body && !document.body.contains(modal)) {
      document.body.appendChild(modal);
    }

    modalEl = modal;
    return modal;
  }

  function openModal() {
    loadSettings();
    const modal = ensureModal();
    if (!modal) return;
    if (!document.body.contains(modal)) {
      document.body.appendChild(modal);
    }
    const qSel = modal.querySelector("#c403-pwl-queue-sel");
    const cInp = modal.querySelector("#c403-pwl-count-inp");
    const kSel = modal.querySelector("#c403-pwl-kda-sel");
    if (qSel) qSel.value = CONFIG.selectedQueue;
    if (cInp) cInp.value = CONFIG.gamesCount;
    if (kSel) kSel.value = CONFIG.kdaDisplay;
    modal.classList.add("c403-open");
    modal.style.display = "flex";
  }

  function closeModal() {
    const modal = document.getElementById(MODAL_ID) || modalEl;
    if (modal) {
      modal.classList.remove("c403-open");
      modal.style.display = "none";
    }
  }

  // --- Global Ayarlar Erişimi (BuiltinMods Paneli İçin) ---
  window.__c403ModSettings = window.__c403ModSettings || {};
  window.__c403ModSettings["profilewinlose"] = () => openModal();
  window.__c403ModSettings["profile_win_lose"] = () => openModal();
  window.c403OpenProfileWinLoseSettings = () => openModal();
  window.addEventListener("c403-open-mod-settings-profilewinlose", () => openModal());

  // --- Başlatma Mantığı ---
  function startTracker() {
    if (!document.body) {
      window.addEventListener("DOMContentLoaded", startTracker);
      return;
    }
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

  console.log("[ProfileWinLose] Mod başarıyla yüklendi ve aktif edildi.");
})();
