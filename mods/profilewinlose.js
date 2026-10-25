/**
 * 403Changer - Profil Galibiyet / Mağlubiyet (Win/Lose) Takipçisi
 *
 * @name         ProfileWinLose
 * @author       403Changer
 * @description  Sihirdar profilinde kullanıcının isminin tam altında son maçların
 *               G/M (W/L) istatistiklerini, kazanma oranını ve KDA'yı gösterir.
 * @version      2.4.2
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
  let cachedCurrentSummonerPuuid = null;
  let cachedCurrentSummonerId = null;
  let cachedCurrentSummonerName = null;
  let summonerFetchedAt = 0;
  let summonerFailedAt = 0;
  let summonerFetchPromise = null;

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      /* The profile column (.style-profile-summoner-info-component) is
         position:relative and every child inside it is absolutely positioned.
         A static child would land at the top of the column (or off the
         bottom), which is why the pill used to appear in a random spot. */
      #${CONTAINER_ID} {
        position: absolute !important;
        /* JS sets the real value from the summoner name's position; this is
           only a fallback for the first frame.  No !important here, otherwise
           the inline value computed by positionContainer() would be ignored. */
        top: 400px;
        left: 4px !important;
        right: 4px !important;
        bottom: auto !important;
        width: auto !important;
        height: auto !important;
        max-width: none !important;
        min-width: 0 !important;
        box-sizing: border-box !important;
        display: flex !important;
        flex-direction: row !important;
        align-items: flex-start !important;
        justify-content: flex-start !important;
        margin: 0 !important;
        padding: 0 !important;
        z-index: 10 !important;
        /* Only the pill itself is clickable; the empty area around it lets
           clicks through to the client UI. */
        pointer-events: none !important;
      }

      #${CONTAINER_ID} .c403-pwl-pill {
        pointer-events: auto !important;
        width: 100%;
        max-width: 100%;
        box-sizing: border-box;
      }

      .c403-pwl-pill {
        display: inline-flex;
        flex-wrap: wrap;
        flex-direction: row;
        align-items: center;
        gap: 8px 12px;
        max-width: 100%;
        padding: 6px 14px;
        background: radial-gradient(120% 100% at 50% 0%, rgba(200, 170, 110, 0.18), rgba(10, 16, 24, 0.95));
        border: 1px solid rgba(200, 170, 110, 0.5);
        border-radius: 5px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.1);
        backdrop-filter: blur(8px);
        font-family: "Beaufort for LOL", "Segoe UI", sans-serif;
        user-select: none;
        white-space: nowrap;
        transition: transform 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
        cursor: pointer;
      }

      .c403-pwl-pill:hover {
        transform: translateY(-1px);
        border-color: rgba(200, 170, 110, 0.9);
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.85), 0 0 14px rgba(200, 170, 110, 0.35);
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
        background: rgba(0, 0, 0, 0.4);
        border-bottom: 1px solid rgba(200, 170, 110, 0.2);
      }

      .c403-pwl-brand {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .c403-pwl-logo {
        width: 32px;
        height: 32px;
        background: url("/asset/logo.png") center / contain no-repeat;
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
    (document.head || document.documentElement).appendChild(style);
  }

  // --- Görünürlük yardımcıları ---
  // Profil ekranı istemcide sürekli takılı kalıyor (sadece gizleniyor), bu
  // yüzden DOM'da bulunması "profili açtı" demek değil. Eski kod bunu
  // ayırt etmediği için rozet ana ekranda Oyna düğmesinin üstüne biniyordu.
  function isRendered(el) {
    if (!el || !el.isConnected) return false;
    if (typeof el.getClientRects === "function" && el.getClientRects().length === 0) return false;
    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return false;
    const style = window.getComputedStyle(el);
    if (!style) return true;
    if (style.display === "none" || style.visibility === "hidden") return false;
    if (parseFloat(style.opacity || "1") < 0.05) return false;
    return true;
  }

  function getActiveProfileScreen() {
    // Ana ekran (Oyna düğmesinin bulunduğu yer) açıkken rozeti ASLA çizme.
    // Profil uygulaması arkada takılı kaldığı için bu kontrol şart.
    const homeScreens = document.querySelectorAll(
      '[data-screen-name^="rcp-fe-lol-home"], rcp-fe-lol-home'
    );
    for (const home of homeScreens) {
      if (isRendered(home)) return null;
    }

    const screens = document.querySelectorAll(
      '[data-screen-name^="rcp-fe-lol-profiles"], rcp-fe-lol-profiles'
    );
    for (const screen of screens) {
      if (isRendered(screen)) return screen;
    }

    // Yeni istemcide hash doğrudan profili işaret eder.
    if (/^#\/profile\b/i.test(window.location.hash || "")) {
      const overview = document.querySelector(".style-profile-overview-component");
      if (isRendered(overview)) return overview;
    }

    return null;
  }

  // Profil ekranındaki isim/ikon sütununu bul. Bu sütun position:relative
  // olduğu için rozeti mutlak konumla ismin hemen altına koyabiliyoruz.
  function findProfileHost(screen) {
    const selectors = [
      ".style-profile-summoner-info-component",
      "lol-regalia-profile-v2-element",
    ];

    for (const root of [screen, document]) {
      for (const selector of selectors) {
        let nodes;
        try {
          nodes = root.querySelectorAll(selector);
        } catch (e) {
          continue;
        }
        for (const node of nodes) {
          if (!isRendered(node)) continue;

          if (selector === "lol-regalia-profile-v2-element") {
            const column =
              node.closest(".style-profile-summoner-info-component") ||
              node.parentElement;
            if (column && isRendered(column)) return column;
          }

          return node;
        }
      }
    }

    return null;
  }

  // --- Profil Takipçi Sınıfı ---
  class ProfileWinLoseTracker {
    constructor() {
      this.currentPuuid = null;
      this.currentHost = null;
      this.pollTimer = null;
      this.requestId = 0;
      this.disposed = false;
      this.init();
    }

    async init() {
      loadSettings();
      injectStyles();
      this.fetchCurrentSummonerOnce();

      // Optimize edilmiş periyodik kontrol (CPU/CEF yormaz, sonsuz döngü yaratmaz)
      this.checkAndRender();
      this.pollTimer = setInterval(() => {
        if (!this.disposed) {
          this.checkAndRender();
        }
      }, 1500);

      window.addEventListener("hashchange", () => this.checkAndRender());
      window.addEventListener("unload", () => this.cleanup());
    }

    async fetchCurrentSummonerOnce() {
      if (summonerFetchPromise) return summonerFetchPromise;
      if (Date.now() - summonerFetchedAt < 5 * 60 * 1000) return;
      // Başarısız denemelerde her 1.5 sn'de istek atmayalım.
      if (Date.now() - summonerFailedAt < 30000) return;

      summonerFetchPromise = (async () => {
        try {
          const res = await fetch("/lol-summoner/v1/current-summoner");
          if (res.ok) {
            const me = await res.json();
            if (me && me.puuid) {
              cachedCurrentSummonerPuuid = me.puuid;
              cachedCurrentSummonerId = me.summonerId != null ? String(me.summonerId) : null;
              cachedCurrentSummonerName = me.gameName || me.displayName || null;
              summonerFetchedAt = Date.now();
            }
          } else {
            summonerFailedAt = Date.now();
          }
        } catch (e) {
          summonerFailedAt = Date.now();
        } finally {
          summonerFetchPromise = null;
        }
      })();

      return summonerFetchPromise;
    }

    cleanup() {
      this.disposed = true;
      if (this.pollTimer) clearInterval(this.pollTimer);
      const el = document.getElementById(CONTAINER_ID);
      if (el) el.remove();
      cache.clear();
    }

    async resolveProfilePuuid(profileRoot) {
      // 1. Profil ekranındaki regalia / puuid elemanları
      const elements = profileRoot ? profileRoot.querySelectorAll("lol-regalia-profile-v2-element, lol-regalia-identity-v2-element, [puuid]") : [];
      for (const el of elements) {
        if (el.getAttribute?.("is-searched") === "true") {
          const val = el.getAttribute?.("puuid") || el.puuid || el.dataset?.puuid;
          if (typeof val === "string" && val.length > 20) return val;
        }
      }
      for (const el of elements) {
        const val = el.getAttribute?.("puuid") || el.puuid || el.dataset?.puuid || el.getAttribute?.("data-puuid");
        if (typeof val === "string" && val.length > 20) return val;
      }

      // 2. summoner-id → puuid (başka bir oyuncunun profili olabilir)
      const idEl = profileRoot?.querySelector?.("[summoner-id]") || profileRoot;
      const summonerId = idEl?.getAttribute?.("summoner-id");
      if (summonerId) {
        if (cachedCurrentSummonerId && String(summonerId) === cachedCurrentSummonerId) {
          return cachedCurrentSummonerPuuid;
        }
        try {
          const res = await fetch(`/lol-summoner/v1/summoners/${encodeURIComponent(summonerId)}`);
          if (res.ok) {
            const data = await res.json();
            if (data && typeof data.puuid === "string" && data.puuid.length > 20) {
              return data.puuid;
            }
          }
        } catch (e) {}
      }

      // 3. URL hash kontrolü (#/profile/UUID...)
      const hash = window.location.hash || "";
      const match = hash.match(/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/);
      if (match) return match[0];

      // 4. Sadece gerçekten kendi profilimizdeyse kendi puuid'imize dön.
      //    Başka birinin profilinde yanlışlıkla kendi istatistiklerimizi göstermeyelim.
      const nameEl = profileRoot?.querySelector?.(
        ".style-profile-summoner-name, .style-profile-summoner-namings-component"
      );
      const shownName = (nameEl?.innerText || nameEl?.textContent || "").toLowerCase();
      if (cachedCurrentSummonerName && shownName.includes(cachedCurrentSummonerName.toLowerCase())) {
        return cachedCurrentSummonerPuuid;
      }

      return null;
    }

    async checkAndRender() {
      if (this._resolving) return;
      this._resolving = true;
      try {
        await this.fetchCurrentSummonerOnce();

        // Sadece gerçekten GÖRÜNÜR profil ekranında çalış. Profil uygulaması
        // arka planda takılı kaldığı için varlığı yeterli değil.
        const profileScreen = getActiveProfileScreen();
        if (!profileScreen) {
          this.removeContainer();
          return;
        }

        const host = findProfileHost(profileScreen);
        if (!host) {
          this.removeContainer();
          return;
        }

        const puuid = await this.resolveProfilePuuid(profileScreen);
        if (!puuid) {
          this.removeContainer();
          return;
        }

        const container = document.getElementById(CONTAINER_ID);

        // PUUID ve konum aynıysa sadece konumu tazele (CPU sıfıra yakın)
        if (
          container &&
          this.currentPuuid === puuid &&
          this.currentHost === host &&
          container.parentElement === host
        ) {
          this.positionContainer(host, container);
          return;
        }

        this.currentPuuid = puuid;
        this.attachContainer(host);
        this.fetchAndRender(puuid);
      } finally {
        this._resolving = false;
      }
    }

    removeContainer() {
      const container = document.getElementById(CONTAINER_ID);
      if (container) container.remove();

      document.querySelectorAll(".c403-pwl-host").forEach((host) => {
        host.classList.remove("c403-pwl-host");
        host.style.removeProperty("--c403-pwl-tokens-top");
      });

      this.currentPuuid = null;
      this.currentHost = null;
    }

    attachContainer(host) {
      let container = document.getElementById(CONTAINER_ID);
      if (!container) {
        container = document.createElement("div");
        container.id = CONTAINER_ID;
      }

      // Rozet, isim sütununun (position:relative) mutlak konumlu bir çocuğu
      // olarak eklenir. Böylece istemci düzeni değişse bile hep ismin
      // altında kalır; başka ekranlara / Oyna düğmesinin üstüne taşmaz.
      if (container.parentElement !== host) {
        host.appendChild(container);
      }

      host.classList.add("c403-pwl-host");
      this.currentHost = host;
      this.positionContainer(host, container);
      return container;
    }

    positionContainer(host, container) {
      if (!host || !container) return;

      const hostRect = host.getBoundingClientRect();
      if (hostRect.height < 2) return;

      // Konumu sabit piksel varsayımıyla değil, ismin gerçek yerinden hesapla.
      let top = 400;

      const nameEl = host.querySelector(".style-profile-summoner-name");
      if (nameEl && isRendered(nameEl)) {
        const nameRect = nameEl.getBoundingClientRect();
        if (nameRect.height >= 2) {
          top = nameRect.bottom - hostRect.top + 8;
        }
      }

      // Riot'un isim altındaki challenge rozetleri yerinde kalsın; bizim
      // pill onların altına, aynı sütunun içine yerleşsin.
      const flair = host.querySelector(".profile-challenge-banner-tokens");
      if (flair && isRendered(flair) && (flair.innerText || "").trim()) {
        const flairRect = flair.getBoundingClientRect();
        if (flairRect.height >= 2) {
          top = Math.max(top, flairRect.bottom - hostRect.top + 6);
        }
      }

      container.style.top = Math.round(Math.max(0, top)) + "px";
    }

    async fetchAndRender(puuid) {
      const container = document.getElementById(CONTAINER_ID);
      if (!container) return;

      container.innerHTML = `
        <div class="c403-pwl-pill">
          <span class="c403-pwl-loading">İstatistikler yükleniyor…</span>
        </div>
      `;
      this.positionContainer(this.currentHost, container);

      const curReq = ++this.requestId;
      const { selectedQueue, gamesCount } = CONFIG;
      const cacheKey = `${puuid}_${selectedQueue}_${gamesCount}`;

      let stats = null;
      let failed = false;
      if (cache.has(cacheKey) && Date.now() - cache.get(cacheKey).time < 120000) {
        stats = cache.get(cacheKey).data;
      } else {
        try {
          // Kuyruk filtresi sonradan uygulandığı için daha geniş bir pencere çekiyoruz;
          // aksi halde "son 40 maç" seçilince elde 5-10 dereceli maç kalıyordu.
          const fetchCount = selectedQueue === "all"
            ? gamesCount
            : Math.min(200, Math.max(gamesCount * 5, 40));
          const endpoint = `/lol-match-history/v1/products/lol/${encodeURIComponent(puuid)}/matches?begIndex=0&endIndex=${fetchCount - 1}`;
          const res = await fetch(endpoint);
          if (res.ok) {
            const json = await res.json();
            stats = this.computeStats(json, puuid, selectedQueue, gamesCount);
            cache.set(cacheKey, { data: stats, time: Date.now() });
          } else {
            failed = true;
            console.warn(`[ProfileWinLose] Maç geçmişi HTTP ${res.status}`);
          }
        } catch (err) {
          failed = true;
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
              <span class="c403-pwl-count">${failed ? "İstatistik alınamadı" : "Kayıt Bulunamadı"}</span>
            </div>
            <div class="c403-pwl-divider"></div>
            <div class="c403-pwl-row">
              <span style="color: rgba(205,190,145,0.7); font-size: 11px;">${failed ? "Tekrar dene" : "0 Maç"}</span>
            </div>
          </div>
        `;
        container.querySelector(".c403-pwl-pill")?.addEventListener("click", () => {
          cache.clear();
          this.currentPuuid = null;
          this.checkAndRender();
        });
        this.positionContainer(this.currentHost, container);
        return;
      }

      const noGames = stats.totalGames === 0;
      container.innerHTML = `
        <div class="c403-pwl-pill" title="Tıkla: Mod Ayarlarını Aç">
          <div class="c403-pwl-meta">
            <span class="c403-pwl-queue">${queueName}</span>
            <span class="c403-pwl-count">${noGames ? "Bu modda maç yok" : `${stats.totalGames} Maç`}</span>
          </div>
          <div class="c403-pwl-divider"></div>
          <div class="c403-pwl-row">
            ${noGames
              ? '<span style="color: rgba(205,190,145,0.7); font-size: 11px;">0 Maç</span>'
              : `<span class="c403-pwl-wins">${stats.wins}G</span>
                 <span class="c403-pwl-losses">${stats.losses}M</span>
                 <span class="c403-pwl-winrate">%${stats.winRate}</span>
                 ${CONFIG.kdaDisplay === "show" ? `<span class="c403-pwl-kda">${stats.kda} KDA</span>` : ""}`}
          </div>
        </div>
      `;

      container.querySelector(".c403-pwl-pill")?.addEventListener("click", () => {
        openModal();
      });
      this.positionContainer(this.currentHost, container);
    }

    computeStats(data, puuid, selectedQueue = CONFIG.selectedQueue, gamesCount = CONFIG.gamesCount) {
      if (!data || !Array.isArray(data.games?.games)) {
        return { wins: 0, losses: 0, totalGames: 0, winRate: "0.0", kda: "0.0" };
      }

      const allGames = data.games.games;

      const queue = QUEUE_TYPES[selectedQueue];
      const filtered =
        !queue || selectedQueue === "all"
          ? allGames
          : allGames.filter((g) => (queue.ids ? queue.ids.includes(g.queueId) : g.queueId === queue.id));

      const slice = filtered.slice(0, gamesCount);
      let wins = 0;
      let losses = 0;
      let totalKills = 0;
      let totalDeaths = 0;
      let totalAssists = 0;

      for (const game of slice) {
        // Remake'leri (5 dakikadan kısa maçlar) istatistiğe katma.
        if (typeof game.gameDuration === "number" && game.gameDuration > 0 && game.gameDuration < 300) {
          continue;
        }

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
  function ensureModal() {
    let modal = document.getElementById(MODAL_ID);
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = MODAL_ID;
    modal.innerHTML = `
      <div class="c403-pwl-dialog" role="dialog">
        <div class="c403-pwl-head">
          <div class="c403-pwl-brand">
            <div class="c403-pwl-logo"></div>
            <div class="c403-pwl-titles">
              <h2>Profil Win/Lose Ayarları</h2>
              <span>İstatistik & Takip Tercihleri</span>
            </div>
          </div>
          <button type="button" class="c403-pwl-close" id="c403-pwl-close">✕</button>
        </div>
        <div class="c403-pwl-body">
          <div class="c403-pwl-group">
            <label>Kuyruk / Oyun Modu</label>
            <select class="c403-pwl-select" id="c403-pwl-queue-select">
              ${Object.entries(QUEUE_TYPES)
                .map(([key, item]) => `<option value="${key}">${item.name}</option>`)
                .join("")}
            </select>
          </div>
          <div class="c403-pwl-group">
            <label>İncelenecek Son Maç Sayısı (1 - 200)</label>
            <input type="number" class="c403-pwl-input" id="c403-pwl-count-input" min="1" max="200" value="40">
          </div>
          <div class="c403-pwl-group">
            <label>KDA Gösterimi</label>
            <select class="c403-pwl-select" id="c403-pwl-kda-select">
              <option value="show">Göster</option>
              <option value="hide">Gizle</option>
            </select>
          </div>
        </div>
        <div class="c403-pwl-foot">
          <button type="button" class="c403-pwl-btn" id="c403-pwl-save">Kaydet ve Uygula</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector("#c403-pwl-close").addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });

    modal.querySelector("#c403-pwl-save").addEventListener("click", () => {
      const qSelect = modal.querySelector("#c403-pwl-queue-select");
      const cInput = modal.querySelector("#c403-pwl-count-input");
      const kSelect = modal.querySelector("#c403-pwl-kda-select");

      const games = Math.min(200, Math.max(1, parseInt(cInput.value, 10) || 40));
      CONFIG.selectedQueue = qSelect.value;
      CONFIG.gamesCount = games;
      CONFIG.kdaDisplay = kSelect.value;

      saveSettings();
      closeModal();
      cache.clear();

      if (window.__c403ProfileTrackerInstance) {
        window.__c403ProfileTrackerInstance.currentPuuid = null;
        window.__c403ProfileTrackerInstance.checkAndRender();
      }
    });

    return modal;
  }

  function closeOtherModals() {
    [
      "c403-bg-modal",
      "c403-icon-swapper-modal",
      "c403-skinviewer-info-modal",
      "c403-soloq-settings-modal",
    ].forEach((id) => document.getElementById(id)?.remove());
  }

  function openModal() {
    closeOtherModals();
    loadSettings();
    const modal = ensureModal();
    modal.querySelector("#c403-pwl-queue-select").value = CONFIG.selectedQueue;
    modal.querySelector("#c403-pwl-count-input").value = CONFIG.gamesCount;
    modal.querySelector("#c403-pwl-kda-select").value = CONFIG.kdaDisplay;
    modal.classList.add("c403-open");
  }

  function closeModal() {
    const modal = document.getElementById(MODAL_ID);
    if (modal) modal.classList.remove("c403-open");
  }

  window.__c403ModSettings = window.__c403ModSettings || {};
  window.__c403ModSettings["profilewinlose"] = () => openModal();
  window.c403OpenProfileWinLose = () => openModal();
  window.addEventListener("c403-open-mod-settings-profilewinlose", () => openModal());

  // Başlat
  window.__c403ProfileTrackerInstance = new ProfileWinLoseTracker();
  console.log("[ProfileWinLose] Mod optimize edilmiş versiyonla yüklendi.");
})();
