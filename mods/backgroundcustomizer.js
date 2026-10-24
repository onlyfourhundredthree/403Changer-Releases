/**
 * 403Changer - Arka Plan & Tema Özelleştirici (Background Customizer)
 *
 * @name         BackgroundCustomizer
 * @author       403Changer
 * @description  İstemci arka planına özel görsel ve video temaları uygular.
 *               "Keşfet" sekmesinde hem varsayılan temalar hem de kullanıcıların
 *               kendi client'larından canlı olarak paylaştığı tüm topluluk temaları listelenir ve tek tıkla alınabilir.
 * @version      2.2.0
 */

(function () {
  "use strict";

  if (window.__c403BackgroundCustomizerLoaded) return;
  window.__c403BackgroundCustomizerLoaded = true;

  // Global BuiltinMods ve konsol erişimi
  window.__c403ModSettings = window.__c403ModSettings || {};
  window.__c403ModSettings["backgroundcustomizer"] = () => openModal();
  window.__c403ModSettings["background_customizer"] = () => openModal();
  window.c403OpenBackgroundCustomizer = () => openModal();
  window.addEventListener("c403-open-mod-settings-backgroundcustomizer", () => openModal());
  window.addEventListener("c403-open-backgroundcustomizer", () => openModal());

  const STORAGE_KEY = "c403_bg_customizer_themes_v3";
  const MODAL_ID = "c403-bg-modal";
  const STYLE_ID = "c403-bg-styles";
  const BG_CONTAINER_ID = "c403-custom-bg-root";
  const COMMUNITY_API_URL = "https://403party.mamistikfistik.workers.dev/themes";

  // --- Varsayılan / Öne Çıkan Resmi Temalar (Official Curated) ---
  const DEFAULT_OFFICIAL_THEMES = [
    {
      id: "exp_403_gold",
      name: "403 Gothic Gold",
      author: "403Changer",
      category: "Hextech",
      isOfficial: true,
      url: "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/hextech-bg.jpg",
      opacity: 0.35,
      blur: 0,
      description: "Klasik ve asil 403Changer altın Hextech dokusu.",
      tags: ["Hextech", "Gold", "Klasik"],
    },
    {
      id: "exp_arcane_zaun",
      name: "Arcane: Zaun & Piltover",
      author: "403Changer",
      category: "Arcane",
      isOfficial: true,
      url: "https://images.contentstack.io/v3/assets/blt731acb42bb3d1659/blt4ee7aebeaa9a35e8/63914a27c00e625ff19762fa/120822_Season_2023_Cinematic_Banner.jpg",
      opacity: 0.4,
      blur: 0,
      description: "Yeşil neon Zaun dumanı ve Piltover gecesi atmosferi.",
      tags: ["Arcane", "Zaun", "Neon"],
    },
    {
      id: "exp_project_neon",
      name: "Siberpunk: PROJECT Neon",
      author: "403Changer",
      category: "Siberpunk",
      isOfficial: true,
      url: "https://images.contentstack.io/v3/assets/blt731acb42bb3d1659/blt56dc3b6647240c5e/5eb9b05779c6d376f2df3b68/PROJECT_Wallpaper_1920x1080.jpg",
      opacity: 0.38,
      blur: 0,
      description: "Kırmızı ve camgöbeği PROJECT sibernetik neon ışıkları.",
      tags: ["Siberpunk", "PROJECT", "Neon"],
    },
    {
      id: "exp_spirit_blossom",
      name: "Ruh Çiçeği (Spirit Blossom)",
      author: "403Changer",
      category: "Mistik",
      isOfficial: true,
      url: "https://images.contentstack.io/v3/assets/blt731acb42bb3d1659/bltb96ecf7b9ebc19ec/5f0f7f3e8ca7791845bb3826/Spirit_Blossom_2020_Article_Header.jpg",
      opacity: 0.38,
      blur: 0,
      description: "Ionia'nın mistik lila ve pembe ruhlar vadisi huzuru.",
      tags: ["Ionia", "Ruh Çiçeği", "Pastel"],
    },
    {
      id: "exp_dark_star",
      name: "Karanlık Yıldız (Dark Star)",
      author: "403Changer",
      category: "Kozmik",
      isOfficial: true,
      url: "https://images.contentstack.io/v3/assets/blt731acb42bb3d1659/bltae33cf14d9bfe2b4/5e73e91d6f461e712a297920/Dark_Star_2020_Wallpaper.jpg",
      opacity: 0.36,
      blur: 0,
      description: "Derin mor ve kara delik uzay kozmolojisi.",
      tags: ["Kozmik", "Kara Delik", "Uzay"],
    },
    {
      id: "exp_kda_allout",
      name: "K/DA ALL OUT: Sahne",
      author: "403Changer",
      category: "Müzik",
      isOfficial: true,
      url: "https://images.contentstack.io/v3/assets/blt731acb42bb3d1659/bltc210d7a46973e0a2/5f8dfb15275e523f33ce9bc0/KDA_2020_Key_Art.jpg",
      opacity: 0.35,
      blur: 0,
      description: "Pırlanta kristal ışıltılı K/DA konser sahnesi.",
      tags: ["K/DA", "Kristal", "Sahne"],
    },
    {
      id: "exp_void_abyss",
      name: "Hiçlik Uçurumu (Void)",
      author: "403Changer",
      category: "Hiçlik",
      isOfficial: true,
      url: "https://images.contentstack.io/v3/assets/blt731acb42bb3d1659/blt6d5d5930062ea9ee/628fe1b9d1f39118c7b80e8d/BelVeth_Base_Splash.jpg",
      opacity: 0.32,
      blur: 0,
      description: "Lavanta ve tekinsiz mor tonlarında Hiçlik derinliği.",
      tags: ["Hiçlik", "Mor", "Derinlik"],
    },
    {
      id: "exp_minimal_carbon",
      name: "Saf Gece Karbonu (Minimal)",
      author: "403Changer",
      category: "Minimal",
      isOfficial: true,
      url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='1920' height='1080'><radialGradient id='g' cx='50%' cy='25%' r='85%'><stop offset='0%' stop-color='%23121b24'/><stop offset='55%' stop-color='%23080c10'/><stop offset='100%' stop-color='%23030406'/></radialGradient><rect width='100%' height='100%' fill='url(%23g)'/></svg>",
      opacity: 0.45,
      blur: 0,
      description: "Sıfır dikkat dağıtıcı, derin Hextech gradyanı.",
      tags: ["Minimal", "Siyah", "Performans"],
    },
  ];

  let communityThemesList = [];
  let isFetchingCommunity = false;

  // --- Yerel Depolama (Temalarım) ---
  const DEFAULT_STATE = {
    enabled: true,
    activeThemeId: "exp_403_gold",
    themes: [
      {
        id: "exp_403_gold",
        name: "403 Gothic Gold",
        author: "403Changer",
        isPublic: true,
        url: "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/hextech-bg.jpg",
        opacity: 0.35,
        blur: 0,
        createdAt: 1700000000000,
      },
    ],
  };

  function loadState() {
    try {
      let raw = null;
      if (window.DataStore && typeof window.DataStore.get === "function") {
        raw = window.DataStore.get(STORAGE_KEY);
      }
      if (!raw) {
        raw = localStorage.getItem(STORAGE_KEY);
      }
      if (raw) {
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        if (!parsed.themes || !Array.isArray(parsed.themes) || parsed.themes.length === 0) {
          parsed.themes = structuredClone(DEFAULT_STATE.themes);
        }
        return Object.assign({}, DEFAULT_STATE, parsed);
      }
    } catch (e) {
      console.warn("[403-BG] Ayarlar okunamadı:", e);
    }
    return structuredClone(DEFAULT_STATE);
  }

  function saveState(state) {
    try {
      const serialized = JSON.stringify(state);
      if (window.DataStore && typeof window.DataStore.set === "function") {
        window.DataStore.set(STORAGE_KEY, state);
      }
      localStorage.setItem(STORAGE_KEY, serialized);
    } catch (e) {
      console.warn("[403-BG] Ayarlar kaydedilemedi:", e);
    }
  }

  let currentState = loadState();

  // --- Canlı Topluluk Temalarını Cloudflare API'den Çekme ---
  async function fetchLiveCommunityThemes() {
    if (isFetchingCommunity) return;
    isFetchingCommunity = true;
    try {
      const res = await fetch(COMMUNITY_API_URL, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          communityThemesList = data;
          if (modalElement && modalElement.classList.contains("c403-open")) {
            if (currentTab === "explore") {
              renderExploreTab();
            }
          }
        }
      }
    } catch (e) {
      console.warn("[403-BG] Topluluk temaları çekilemedi:", e);
    } finally {
      isFetchingCommunity = false;
      updateCounts();
    }
  }

  // --- Canlı Topluluğa Tema Yayınlama (POST) ---
  async function publishThemeToCommunity(theme, authorName, description) {
    try {
      const payload = {
        name: theme.name,
        author: authorName || "403 Oyuncusu",
        category: theme.category || "Topluluk",
        url: theme.url,
        opacity: theme.opacity != null ? theme.opacity : 0.35,
        blur: theme.blur || 0,
        description: description || "403Changer kullanıcısı tarafından paylaşıldı.",
      };

      const res = await fetch(COMMUNITY_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("HTTP " + res.status);
      }

      const resData = await res.json();
      showToast("🎉 Teman Keşfet topluluk havuzunda yayınlandı! Herkes görebilir.");
      fetchLiveCommunityThemes();
      return true;
    } catch (e) {
      console.error("[403-BG] Yayınlama hatası:", e);
      showToast("Yayınlanamadı, lütfen internet bağlantını kontrol et!");
      return false;
    }
  }

  // --- CSS Enjeksiyonu ---
  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = `
      #${BG_CONTAINER_ID} {
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        width: 100% !important;
        height: 100% !important;
        z-index: -1 !important;
        pointer-events: none !important;
        overflow: hidden !important;
      }

      #${BG_CONTAINER_ID} .c403-bg-media {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        background-position: center;
        background-repeat: no-repeat;
        background-size: cover;
        transition: opacity 0.4s ease, filter 0.4s ease;
      }

      /* Saydamlık kuralları (Lobi ve arayüz arkasını açar) */
      .c403-bg-active rcp-fe-lol-parties,
      .c403-bg-active lol-parties-v2-parties-view,
      .c403-bg-active .parties-view,
      .c403-bg-active .parties-background,
      .c403-bg-active .party-backdrop {
        background: transparent !important;
      }

      .c403-bg-active .parties-view .parties-background .uikit-background-switcher {
        opacity: 0 !important;
      }

      .c403-bg-active .placeholder-invited-container {
        display: none !important;
      }

      /* Modal Arka Plan & Çerçeve */
      #${MODAL_ID} {
        position: fixed;
        inset: 0;
        z-index: 2147483647 !important;
        display: none !important;
        align-items: center;
        justify-content: center;
        background: rgba(0, 0, 0, 0.78);
        backdrop-filter: blur(10px);
        font-family: "Beaufort for LOL", "Segoe UI", sans-serif;
        color: #f0e6d2;
        user-select: none;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.2s ease;
      }

      #${MODAL_ID}.c403-open {
        display: flex !important;
        opacity: 1 !important;
        pointer-events: auto !important;
      }

      #${MODAL_ID} .c403-bg-box {
        width: 890px;
        max-width: 96vw;
        height: 660px;
        max-height: 92vh;
        display: flex;
        flex-direction: column;
        background: radial-gradient(120% 90% at 50% -20%, rgba(200, 170, 110, 0.14), transparent 65%),
                    linear-gradient(180deg, #0e151d 0%, #06090d 100%);
        border: 1px solid rgba(200, 170, 110, 0.45);
        border-radius: 8px;
        box-shadow: 0 24px 64px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.06);
        overflow: hidden;
        animation: c403-bg-pop 0.2s cubic-bezier(0.1, 0.9, 0.2, 1);
      }

      @keyframes c403-bg-pop {
        from { transform: scale(0.96) translateY(8px); opacity: 0; }
        to { transform: scale(1) translateY(0); opacity: 1; }
      }

      /* Başlık Çubuğu */
      #${MODAL_ID} .c403-bg-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 24px;
        background: rgba(0, 0, 0, 0.38);
        border-bottom: 1px solid rgba(200, 170, 110, 0.22);
      }

      #${MODAL_ID} .c403-bg-brand {
        display: flex;
        align-items: center;
        gap: 14px;
      }

      #${MODAL_ID} .c403-bg-logo {
        width: 44px;
        height: 44px;
        background: url("/asset/logo.png") center / contain no-repeat;
        filter: drop-shadow(0 0 10px rgba(200, 170, 110, 0.65));
      }

      #${MODAL_ID} .c403-bg-titles h2 {
        margin: 0;
        font-size: 16px;
        font-weight: 800;
        letter-spacing: 0.08em;
        color: #f0e6d2;
        text-transform: uppercase;
      }

      #${MODAL_ID} .c403-bg-titles span {
        font-size: 11px;
        color: rgba(205, 190, 145, 0.75);
        letter-spacing: 0.03em;
      }

      #${MODAL_ID} .c403-bg-head-controls {
        display: flex;
        align-items: center;
        gap: 16px;
      }

      .c403-bg-switch-label {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
        font-weight: 700;
        color: #cdbe91;
        cursor: pointer;
      }

      .c403-bg-toggle {
        width: 38px;
        height: 20px;
        background: #1e2832;
        border: 1px solid #785a28;
        border-radius: 10px;
        position: relative;
        cursor: pointer;
        transition: all 0.2s;
      }

      .c403-bg-toggle::after {
        content: "";
        position: absolute;
        top: 2px;
        left: 2px;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #a09b8c;
        transition: all 0.2s;
      }

      .c403-bg-toggle.active {
        background: #0acbe6;
        border-color: #0acbe6;
      }

      .c403-bg-toggle.active::after {
        left: 20px;
        background: #010a13;
      }

      .c403-bg-close-btn {
        background: none;
        border: none;
        color: #a09b8c;
        font-size: 20px;
        cursor: pointer;
        padding: 4px 8px;
        transition: color 0.15s;
      }

      .c403-bg-close-btn:hover {
        color: #f0e6d2;
      }

      /* Ana Sekme Butonları (Keşfet vs Temalarım) */
      #${MODAL_ID} .c403-main-tabs {
        display: flex;
        align-items: center;
        padding: 0 24px;
        background: rgba(0, 0, 0, 0.25);
        border-bottom: 1px solid rgba(200, 170, 110, 0.16);
        gap: 20px;
      }

      .c403-tab-btn {
        background: none;
        border: none;
        border-bottom: 2px solid transparent;
        color: #cdbe91;
        font-family: inherit;
        font-size: 13px;
        font-weight: 800;
        padding: 12px 6px;
        cursor: pointer;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.18s;
      }

      .c403-tab-btn:hover {
        color: #f0e6d2;
      }

      .c403-tab-btn.active {
        color: #f0e6d2;
        border-bottom-color: #c8aa6e;
      }

      .c403-tab-badge {
        font-size: 10px;
        background: rgba(200, 170, 110, 0.2);
        color: #c8aa6e;
        padding: 2px 7px;
        border-radius: 10px;
        font-weight: 700;
      }

      /* İkincil Bar */
      #${MODAL_ID} .c403-sub-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 24px;
        background: rgba(0, 0, 0, 0.15);
        border-bottom: 1px solid rgba(200, 170, 110, 0.1);
        gap: 12px;
        flex-wrap: wrap;
      }

      .c403-explore-filters {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .c403-exp-pill {
        background: rgba(30, 40, 50, 0.5);
        border: 1px solid rgba(200, 170, 110, 0.2);
        color: #cdbe91;
        padding: 4px 10px;
        border-radius: 4px;
        font-size: 11px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.15s;
      }

      .c403-exp-pill:hover {
        border-color: #c8aa6e;
        color: #f0e6d2;
      }

      .c403-exp-pill.active {
        background: rgba(200, 170, 110, 0.25);
        border-color: #c8aa6e;
        color: #f0e6d2;
      }

      .c403-search-box {
        position: relative;
        flex: 1;
        max-width: 280px;
      }

      .c403-search-input {
        width: 100%;
        background: #091016;
        border: 1px solid rgba(200, 170, 110, 0.3);
        border-radius: 4px;
        color: #f0e6d2;
        padding: 6px 10px 6px 30px;
        font-size: 11.5px;
        outline: none;
        transition: border-color 0.15s;
        box-sizing: border-box;
      }

      .c403-search-input:focus {
        border-color: #c8aa6e;
      }

      .c403-search-icon {
        position: absolute;
        left: 9px;
        top: 50%;
        transform: translateY(-50%);
        width: 14px;
        height: 14px;
        color: rgba(205, 190, 145, 0.5);
        pointer-events: none;
      }

      .c403-btn-gold {
        background: linear-gradient(180deg, #1e282d, #141c22);
        border: 1px solid #c8aa6e;
        color: #f0e6d2;
        padding: 6px 14px;
        border-radius: 4px;
        font-size: 11.5px;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all 0.18s;
      }

      .c403-btn-gold:hover {
        background: linear-gradient(180deg, #2b3941, #1c2730);
        border-color: #f0e6d2;
        box-shadow: 0 0 12px rgba(200, 170, 110, 0.4);
      }

      .c403-btn-outline {
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(200, 170, 110, 0.25);
        color: #cdbe91;
        padding: 6px 12px;
        border-radius: 4px;
        font-size: 11.5px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.15s;
      }

      .c403-btn-outline:hover {
        border-color: #c8aa6e;
        color: #f0e6d2;
      }

      /* Ana İçerik Kaydırma Alanı */
      #${MODAL_ID} .c403-tab-content {
        flex: 1;
        overflow-y: auto;
        padding: 18px 24px;
        display: none;
      }

      #${MODAL_ID} .c403-tab-content.active {
        display: block;
      }

      #${MODAL_ID} .c403-tab-content::-webkit-scrollbar {
        width: 6px;
      }
      #${MODAL_ID} .c403-tab-content::-webkit-scrollbar-thumb {
        background: rgba(200, 170, 110, 0.3);
        border-radius: 3px;
      }

      /* KEŞFET KARTLARI IZGARASI */
      .c403-explore-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
        gap: 16px;
      }

      .c403-explore-card {
        background: rgba(16, 24, 32, 0.7);
        border: 1px solid rgba(200, 170, 110, 0.25);
        border-radius: 6px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        transition: all 0.2s cubic-bezier(0.1, 0.9, 0.2, 1);
      }

      .c403-explore-card:hover {
        transform: translateY(-2px);
        border-color: rgba(200, 170, 110, 0.6);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6), 0 0 16px rgba(200, 170, 110, 0.15);
      }

      .c403-explore-card.is-active {
        border-color: #c8aa6e;
        box-shadow: 0 0 20px rgba(200, 170, 110, 0.25);
      }

      .c403-exp-preview {
        width: 100%;
        height: 125px;
        background-color: #05080c;
        background-position: center;
        background-size: cover;
        position: relative;
        overflow: hidden;
      }

      .c403-exp-overlay-badges {
        position: absolute;
        top: 8px;
        left: 8px;
        right: 8px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        pointer-events: none;
      }

      .c403-exp-tag {
        font-size: 9.5px;
        font-weight: 800;
        background: rgba(0, 0, 0, 0.75);
        color: #0acbe6;
        border: 1px solid rgba(10, 203, 230, 0.4);
        padding: 2px 6px;
        border-radius: 3px;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .c403-exp-tag.official {
        color: #c8aa6e;
        border-color: #c8aa6e;
      }

      .c403-exp-tag.active {
        background: rgba(3, 151, 86, 0.85);
        color: #fff;
        border-color: #2be897;
      }

      .c403-exp-info {
        padding: 12px 14px;
        display: flex;
        flex-direction: column;
        flex: 1;
      }

      .c403-exp-title {
        font-size: 13.5px;
        font-weight: 700;
        color: #f0e6d2;
        margin-bottom: 2px;
      }

      .c403-exp-author {
        font-size: 11px;
        color: rgba(205, 190, 145, 0.7);
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .c403-exp-desc {
        font-size: 11px;
        color: rgba(205, 190, 145, 0.8);
        margin: 6px 0 12px 0;
        line-height: 1.35;
        flex: 1;
      }

      .c403-exp-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-top: auto;
      }

      .c403-exp-btn-apply {
        flex: 1;
        background: linear-gradient(180deg, #1e282d, #141c22);
        border: 1px solid #c8aa6e;
        color: #f0e6d2;
        padding: 6px 10px;
        border-radius: 4px;
        font-size: 11.5px;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        transition: all 0.15s;
      }

      .c403-exp-btn-apply:hover:not(:disabled) {
        border-color: #f0e6d2;
        background: #202b33;
        box-shadow: 0 0 10px rgba(200, 170, 110, 0.3);
      }

      .c403-exp-btn-apply:disabled {
        opacity: 0.6;
        cursor: default;
        border-color: rgba(200, 170, 110, 0.25);
      }

      /* TEMALARIM LİSTE KARTLARI */
      .c403-my-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .c403-theme-card {
        display: flex;
        align-items: center;
        background: rgba(20, 28, 36, 0.65);
        border: 1px solid rgba(200, 170, 110, 0.2);
        border-radius: 6px;
        padding: 12px 14px;
        gap: 16px;
        transition: all 0.18s;
      }

      .c403-theme-card:hover {
        background: rgba(28, 38, 48, 0.85);
        border-color: rgba(200, 170, 110, 0.45);
      }

      .c403-theme-card.is-active {
        border-color: #c8aa6e;
        background: rgba(200, 170, 110, 0.09);
        box-shadow: inset 0 0 16px rgba(200, 170, 110, 0.12);
      }

      .c403-theme-thumb {
        width: 100px;
        height: 60px;
        border-radius: 4px;
        background-color: #05080c;
        background-position: center;
        background-size: cover;
        border: 1px solid rgba(200, 170, 110, 0.3);
        flex-shrink: 0;
        overflow: hidden;
      }

      .c403-theme-info {
        flex: 1;
        min-width: 0;
      }

      .c403-theme-name-row {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }

      .c403-theme-name {
        font-size: 14px;
        font-weight: 700;
        color: #f0e6d2;
      }

      .c403-theme-badge {
        font-size: 10px;
        font-weight: 800;
        padding: 2px 7px;
        border-radius: 3px;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .c403-theme-badge.public {
        background: rgba(10, 203, 230, 0.18);
        border: 1px solid rgba(10, 203, 230, 0.45);
        color: #0acbe6;
      }

      .c403-theme-badge.private {
        background: rgba(200, 170, 110, 0.18);
        border: 1px solid rgba(200, 170, 110, 0.45);
        color: #c8aa6e;
      }

      .c403-theme-badge.active-indicator {
        background: rgba(3, 151, 86, 0.25);
        border: 1px solid rgba(3, 151, 86, 0.6);
        color: #2be897;
      }

      .c403-theme-meta {
        font-size: 11px;
        color: rgba(205, 190, 145, 0.7);
        margin-top: 4px;
        display: flex;
        gap: 12px;
      }

      .c403-theme-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }

      .c403-act-apply {
        background: linear-gradient(180deg, #1e282d, #141c22);
        border: 1px solid #c8aa6e;
        color: #f0e6d2;
        padding: 6px 14px;
        border-radius: 4px;
        font-size: 11.5px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.15s;
      }

      .c403-act-apply:hover:not(:disabled) {
        border-color: #f0e6d2;
        background: #202b33;
      }

      .c403-act-apply:disabled {
        opacity: 0.5;
        border-color: rgba(200, 170, 110, 0.3);
        cursor: default;
      }

      .c403-act-publish {
        background: rgba(10, 203, 230, 0.15);
        border: 1px solid #0acbe6;
        color: #0acbe6;
        padding: 6px 10px;
        border-radius: 4px;
        font-size: 11.5px;
        font-weight: 700;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 5px;
        transition: all 0.15s;
      }

      .c403-act-publish:hover {
        background: rgba(10, 203, 230, 0.3);
        color: #fff;
        box-shadow: 0 0 10px rgba(10, 203, 230, 0.4);
      }

      .c403-act-icon {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(200, 170, 110, 0.25);
        border-radius: 4px;
        color: #cdbe91;
        cursor: pointer;
        transition: all 0.15s;
      }

      .c403-act-icon:hover {
        background: rgba(200, 170, 110, 0.15);
        border-color: #c8aa6e;
        color: #f0e6d2;
      }

      .c403-act-icon.delete:hover {
        background: rgba(235, 60, 60, 0.2);
        border-color: #eb3c3c;
        color: #ff7070;
      }

      /* Form Çekmecesi */
      #${MODAL_ID} .c403-bg-form-drawer {
        padding: 16px 24px;
        background: rgba(10, 16, 22, 0.96);
        border-top: 1px solid rgba(200, 170, 110, 0.25);
        display: none;
        flex-direction: column;
        gap: 12px;
      }

      #${MODAL_ID} .c403-bg-form-drawer.open {
        display: flex;
        animation: c403-bg-pop 0.18s ease-out;
      }

      .c403-bg-form-title {
        font-size: 13px;
        font-weight: 700;
        color: #f0e6d2;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }

      .c403-bg-form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .c403-bg-field {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }

      .c403-bg-field label {
        font-size: 11px;
        font-weight: 700;
        color: #cdbe91;
      }

      .c403-bg-input {
        background: #091016;
        border: 1px solid rgba(200, 170, 110, 0.3);
        border-radius: 4px;
        color: #f0e6d2;
        padding: 7px 10px;
        font-size: 12px;
        outline: none;
        transition: border-color 0.15s;
      }

      .c403-bg-input:focus {
        border-color: #c8aa6e;
      }

      .c403-bg-type-selector {
        display: flex;
        gap: 8px;
      }

      .c403-bg-type-btn {
        flex: 1;
        padding: 6px 10px;
        border-radius: 4px;
        border: 1px solid rgba(200, 170, 110, 0.25);
        background: rgba(30, 40, 50, 0.4);
        color: #cdbe91;
        font-size: 11.5px;
        font-weight: 700;
        cursor: pointer;
        text-align: center;
        transition: all 0.15s;
      }

      .c403-bg-type-btn.selected {
        background: rgba(200, 170, 110, 0.22);
        border-color: #c8aa6e;
        color: #f0e6d2;
      }

      .c403-range-group {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .c403-range-group input[type="range"] {
        flex: 1;
        accent-color: #c8aa6e;
      }

      .c403-range-val {
        font-size: 11.5px;
        color: #f0e6d2;
        font-weight: 700;
        width: 44px;
        text-align: right;
      }

      .c403-bg-form-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 6px;
      }

      /* Bildirim Toast */
      .c403-toast {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%) translateY(20px);
        background: rgba(15, 23, 30, 0.95);
        border: 1px solid #c8aa6e;
        color: #f0e6d2;
        padding: 9px 18px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 700;
        z-index: 2147483647;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.7);
        opacity: 0;
        transition: all 0.25s ease;
        pointer-events: none;
      }

      .c403-toast.show {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
      }
    `;
    document.head.appendChild(style);
  }

  // --- Toast Bildirimi ---
  function showToast(text) {
    let toast = document.getElementById("c403-bg-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "c403-bg-toast";
      toast.className = "c403-toast";
      document.body.appendChild(toast);
    }
    toast.textContent = text;
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
    }, 2800);
  }

  // --- Arka Planı İstemciye Uygulama ---
  function applyActiveBackground() {
    const viewport = document.getElementById("rcp-fe-viewport-root");
    if (!viewport) return;

    let container = document.getElementById(BG_CONTAINER_ID);
    if (!container) {
      container = document.createElement("div");
      container.id = BG_CONTAINER_ID;
      viewport.appendChild(container);
    }

    if (!currentState.enabled) {
      container.innerHTML = "";
      document.body.classList.remove("c403-bg-active");
      viewport.classList.remove("custom-background");
      return;
    }

    const activeTheme =
      currentState.themes.find((t) => t.id === currentState.activeThemeId) ||
      currentState.themes[0] ||
      DEFAULT_OFFICIAL_THEMES[0];

    if (!activeTheme || !activeTheme.url) {
      container.innerHTML = "";
      document.body.classList.remove("c403-bg-active");
      viewport.classList.remove("custom-background");
      return;
    }

    document.body.classList.add("c403-bg-active");
    viewport.classList.add("custom-background");

    const url = activeTheme.url.trim();
    const isVideo = url.endsWith(".mp4") || url.endsWith(".webm") || url.includes("video/");
    const opacity = activeTheme.opacity != null ? activeTheme.opacity : 0.35;
    const blur = activeTheme.blur != null ? activeTheme.blur : 0;

    const currentMedia = container.querySelector(".c403-bg-media");
    if (currentMedia) {
      const currentSrc = isVideo ? currentMedia.src : currentMedia.dataset.src;
      if (currentSrc === url) {
        currentMedia.style.opacity = String(opacity);
        currentMedia.style.filter = blur > 0 ? `blur(${blur}px)` : "none";
        return;
      }
    }

    container.innerHTML = "";

    if (isVideo) {
      const video = document.createElement("video");
      video.className = "c403-bg-media";
      video.autoplay = true;
      video.loop = true;
      video.muted = true;
      video.playsInline = true;
      video.src = url;
      video.style.opacity = String(opacity);
      if (blur > 0) video.style.filter = `blur(${blur}px)`;
      video.onloadeddata = () => {
        video.play().catch(() => {});
      };
      container.appendChild(video);
    } else {
      const imgDiv = document.createElement("div");
      imgDiv.className = "c403-bg-media";
      imgDiv.dataset.src = url;
      imgDiv.style.backgroundImage = `url("${url}")`;
      imgDiv.style.opacity = String(opacity);
      if (blur > 0) imgDiv.style.filter = `blur(${blur}px)`;
      container.appendChild(imgDiv);
    }
  }

  // --- Modal Arayüzü & Sekme Mantığı ---
  let modalElement = null;
  let currentTab = "explore"; // 'explore' | 'my'
  let exploreFilter = "all"; // 'all' | 'official' | 'community' | 'video'
  let exploreSearch = "";
  let myThemesSearch = "";
  let editingThemeId = null;

  function ensureModal() {
    let modal = document.getElementById(MODAL_ID);
    if (!modal) {
      injectStyles();

      modal = document.createElement("div");
    modal.id = MODAL_ID;
    modal.style.setProperty("display", "none", "important");
    modal.innerHTML = `
      <div class="c403-bg-box">
        <!-- Başlık -->
        <div class="c403-bg-head">
          <div class="c403-bg-brand">
            <div class="c403-bg-logo"></div>
            <div class="c403-bg-titles">
              <h2>Arka Plan Özelleştirici</h2>
              <span>403Changer Canlı Topluluk & Tema Kataloğu</span>
            </div>
          </div>
          <div class="c403-bg-head-controls">
            <label class="c403-bg-switch-label">
              <span>Arka Plan</span>
              <div class="c403-bg-toggle ${currentState.enabled ? "active" : ""}" id="c403-bg-master-toggle"></div>
            </label>
            <button type="button" class="c403-bg-close-btn" id="c403-bg-close">✕</button>
          </div>
        </div>

        <!-- Ana Sekmeler -->
        <div class="c403-main-tabs">
          <button type="button" class="c403-tab-btn active" id="c403-tab-btn-explore">
            <span>✨ Keşfet (Canlı Topluluk & Public)</span>
            <span class="c403-tab-badge" id="c403-explore-count">...</span>
          </button>
          <button type="button" class="c403-tab-btn" id="c403-tab-btn-my">
            <span>🎨 Temalarım</span>
            <span class="c403-tab-badge" id="c403-my-count">${currentState.themes.length}</span>
          </button>
        </div>

        <!-- İkincil Bar (Filtreler / Arama / Butonlar) -->
        <div class="c403-sub-bar">
          <div class="c403-explore-filters" id="c403-explore-filter-pills">
            <button type="button" class="c403-exp-pill active" data-exp-filter="all">Tümü</button>
            <button type="button" class="c403-exp-pill" data-exp-filter="community">🌐 Topluluk Paylaşımları</button>
            <button type="button" class="c403-exp-pill" data-exp-filter="official">⭐ 403 Seçimleri</button>
            <button type="button" class="c403-exp-pill" data-exp-filter="video">🎬 Videolar</button>
            <button type="button" class="c403-btn-outline" id="c403-btn-refresh-community" title="En yeni paylaşılan temaları çek" style="padding: 4px 8px; font-size: 11px;">🔄 Yenile</button>
          </div>

          <div class="c403-search-box">
            <svg class="c403-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" class="c403-search-input" id="c403-search-field" placeholder="Keşfet'te ara..." />
          </div>

          <div style="display:flex; gap:8px;" id="c403-my-actions">
            <button type="button" class="c403-btn-outline" id="c403-btn-import">📥 Kod ile Ekle</button>
            <button type="button" class="c403-btn-gold" id="c403-btn-new">
              <span style="font-size:14px; font-weight:bold;">+</span> Yeni Tema Oluştur
            </button>
          </div>
        </div>

        <!-- Sekme 1: Keşfet (Katalog) -->
        <div class="c403-tab-content active" id="c403-pane-explore">
          <div class="c403-explore-grid" id="c403-explore-grid"></div>
        </div>

        <!-- Sekme 2: Temalarım -->
        <div class="c403-tab-content" id="c403-pane-my">
          <div class="c403-my-list" id="c403-my-list"></div>
        </div>

        <!-- Tema Oluşturma / Düzenleme Formu Çekmecesi -->
        <div class="c403-bg-form-drawer" id="c403-bg-drawer">
          <div class="c403-bg-form-title" id="c403-bg-form-heading">Yeni Tema Oluştur</div>
          <div class="c403-bg-form-grid">
            <div class="c403-bg-field">
              <label>Tema Adı</label>
              <input type="text" class="c403-bg-input" id="c403-form-name" placeholder="Örn: Ruhlar Vadisi" />
            </div>
            <div class="c403-bg-field">
              <label>Tema Türü</label>
              <div class="c403-bg-type-selector">
                <button type="button" class="c403-bg-type-btn" id="c403-type-priv" data-type="private">🔒 Kişisel (Private)</button>
                <button type="button" class="c403-bg-type-btn selected" id="c403-type-pub" data-type="public">🌐 Herkese Açık / Keşfet (Public)</button>
              </div>
            </div>
          </div>

          <div class="c403-bg-field">
            <label>Görsel veya Video URL Linki (.png, .jpg, .webp, .mp4, .webm)</label>
            <input type="text" class="c403-bg-input" id="c403-form-url" placeholder="https://ornek.com/duvarkagidi.jpg veya .mp4" />
          </div>

          <div class="c403-bg-form-grid">
            <div class="c403-bg-field">
              <label>Yazar / Sihirdar Adınız (Toplulukta görünecek)</label>
              <input type="text" class="c403-bg-input" id="c403-form-author" placeholder="Örn: 403Oyuncusu" />
            </div>
            <div class="c403-bg-field">
              <label>Kategori / Etiket</label>
              <input type="text" class="c403-bg-input" id="c403-form-cat" placeholder="Örn: Anime, Arcane, Siberpunk..." />
            </div>
          </div>

          <div class="c403-bg-form-grid">
            <div class="c403-bg-field">
              <label>Saydamlık / Opaklık</label>
              <div class="c403-range-group">
                <input type="range" min="10" max="100" step="5" value="35" id="c403-form-opacity" />
                <span class="c403-range-val" id="c403-val-opacity">%35</span>
              </div>
            </div>
            <div class="c403-bg-field">
              <label>Bulanıklık (Blur)</label>
              <div class="c403-range-group">
                <input type="range" min="0" max="10" step="1" value="0" id="c403-form-blur" />
                <span class="c403-range-val" id="c403-val-blur">0px</span>
              </div>
            </div>
          </div>

          <div class="c403-bg-form-actions">
            <button type="button" class="c403-btn-outline" id="c403-form-cancel">İptal</button>
            <button type="button" class="c403-btn-gold" id="c403-form-save">Kaydet ve Uygula</button>
          </div>
        </div>
      </div>
    `;

      modalElement = modal;

      // Kapatma
    modal.querySelector("#c403-bg-close").addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });

    // Master Toggle
    const masterToggle = modal.querySelector("#c403-bg-master-toggle");
    masterToggle.addEventListener("click", () => {
      currentState.enabled = !currentState.enabled;
      masterToggle.classList.toggle("active", currentState.enabled);
      saveState(currentState);
      applyActiveBackground();
      renderCurrentTab();
    });

    // Sekmeler
    const tabExploreBtn = modal.querySelector("#c403-tab-btn-explore");
    const tabMyBtn = modal.querySelector("#c403-tab-btn-my");
    const paneExplore = modal.querySelector("#c403-pane-explore");
    const paneMy = modal.querySelector("#c403-pane-my");
    const searchField = modal.querySelector("#c403-search-field");
    const filterPills = modal.querySelector("#c403-explore-filter-pills");

    tabExploreBtn.addEventListener("click", () => {
      currentTab = "explore";
      tabExploreBtn.classList.add("active");
      tabMyBtn.classList.remove("active");
      paneExplore.classList.add("active");
      paneMy.classList.remove("active");
      filterPills.style.display = "flex";
      searchField.placeholder = "Keşfet temalarında ara...";
      renderExploreTab();
    });

    tabMyBtn.addEventListener("click", () => {
      currentTab = "my";
      tabMyBtn.classList.add("active");
      tabExploreBtn.classList.remove("active");
      paneMy.classList.add("active");
      paneExplore.classList.remove("active");
      filterPills.style.display = "none";
      searchField.placeholder = "Temalarım içinde ara...";
      renderMyThemesTab();
    });

    // Keşfet Alt Filtre Butonları
    modal.querySelectorAll("[data-exp-filter]").forEach((pill) => {
      pill.addEventListener("click", () => {
        modal.querySelectorAll("[data-exp-filter]").forEach((p) => p.classList.remove("active"));
        pill.classList.add("active");
        exploreFilter = pill.dataset.expFilter;
        renderExploreTab();
      });
    });

    // Yenile Butonu
    modal.querySelector("#c403-btn-refresh-community").addEventListener("click", () => {
      showToast("Topluluk temaları yenileniyor...");
      fetchLiveCommunityThemes();
    });

    // Arama
    searchField.addEventListener("input", () => {
      const q = searchField.value.trim().toLowerCase();
      if (currentTab === "explore") {
        exploreSearch = q;
        renderExploreTab();
      } else {
        myThemesSearch = q;
        renderMyThemesTab();
      }
    });

    // Butonlar
    modal.querySelector("#c403-btn-new").addEventListener("click", () => {
      openDrawer(null);
    });

    modal.querySelector("#c403-btn-import").addEventListener("click", handleImportPrompt);

    // Form Drawer
    const drawer = modal.querySelector("#c403-bg-drawer");
    const typePriv = modal.querySelector("#c403-type-priv");
    const typePub = modal.querySelector("#c403-type-pub");
    let currentSelectedType = "public";

    typePriv.addEventListener("click", () => {
      currentSelectedType = "private";
      typePriv.classList.add("selected");
      typePub.classList.remove("selected");
    });
    typePub.addEventListener("click", () => {
      currentSelectedType = "public";
      typePub.classList.add("selected");
      typePriv.classList.remove("selected");
    });

    const opInput = modal.querySelector("#c403-form-opacity");
    const opVal = modal.querySelector("#c403-val-opacity");
    opInput.addEventListener("input", () => {
      opVal.textContent = `%${opInput.value}`;
    });

    const blurInput = modal.querySelector("#c403-form-blur");
    const blurVal = modal.querySelector("#c403-val-blur");
    blurInput.addEventListener("input", () => {
      blurVal.textContent = `${blurInput.value}px`;
    });

    modal.querySelector("#c403-form-cancel").addEventListener("click", () => {
      drawer.classList.remove("open");
    });

    modal.querySelector("#c403-form-save").addEventListener("click", async () => {
      const name = modal.querySelector("#c403-form-name").value.trim() || "Özel Tema";
      const url = modal.querySelector("#c403-form-url").value.trim();
      const author = modal.querySelector("#c403-form-author").value.trim() || "403 Oyuncusu";
      const category = modal.querySelector("#c403-form-cat").value.trim() || "Topluluk";
      const opacity = parseInt(opInput.value, 10) / 100;
      const blur = parseInt(blurInput.value, 10);

      if (!url) {
        showToast("Lütfen geçerli bir görsel veya video linki girin!");
        return;
      }

      const isPublic = currentSelectedType === "public";

      if (editingThemeId) {
        const target = currentState.themes.find((t) => t.id === editingThemeId);
        if (target) {
          target.name = name;
          target.url = url;
          target.author = author;
          target.category = category;
          target.isPublic = isPublic;
          target.opacity = opacity;
          target.blur = blur;
        }
        showToast(`"${name}" teması güncellendi.`);
      } else {
        const newId = `theme_${Date.now()}`;
        const newTheme = {
          id: newId,
          name,
          author,
          category,
          url,
          isPublic,
          opacity,
          blur,
          createdAt: Date.now(),
        };
        currentState.themes.unshift(newTheme);
        currentState.activeThemeId = newId;
        currentState.enabled = true;
        masterToggle.classList.add("active");

        // Eğer kullanıcı Herkese Açık / Public seçtiyse anında canlı Cloudflare API'sine de yayınla!
        if (isPublic) {
          publishThemeToCommunity(newTheme, author, `${name} - 403Changer topluluk teması.`);
        } else {
          showToast(`"${name}" kişisel teması kaydedildi ve uygulandı!`);
        }
      }

      saveState(currentState);
      applyActiveBackground();
      drawer.classList.remove("open");
      updateCounts();
      renderMyThemesTab();
    });
    }

    if (document.body && !document.body.contains(modal)) {
      document.body.appendChild(modal);
    }
    modalElement = modal;
    return modal;
  }

  function updateCounts() {
    if (!modalElement) return;
    const expBadge = modalElement.querySelector("#c403-explore-count");
    const myBadge = modalElement.querySelector("#c403-my-count");
    const totalExplore = DEFAULT_OFFICIAL_THEMES.length + communityThemesList.length;
    if (expBadge) expBadge.textContent = String(totalExplore);
    if (myBadge) myBadge.textContent = String(currentState.themes.length);
  }

  // --- KEŞFET (Topluluk & Public Kataloğu) RENDER ---
  function renderExploreTab() {
    const modal = ensureModal();
    if (!modal) return;
    const grid = modal.querySelector("#c403-explore-grid");
    if (!grid) return;
    grid.innerHTML = "";

    // 1. Resmi temalar ve Canlı Topluluk temalarını birleştir
    let combined = [];

    if (exploreFilter === "official") {
      combined = [...DEFAULT_OFFICIAL_THEMES];
    } else if (exploreFilter === "community") {
      combined = [...communityThemesList];
    } else {
      // 'all' veya 'video'
      // Resmi temalar önce, ardından canlı topluluk temaları
      const seenUrls = new Set();
      DEFAULT_OFFICIAL_THEMES.forEach((t) => {
        combined.push(t);
        seenUrls.add(t.url);
      });
      communityThemesList.forEach((t) => {
        if (!seenUrls.has(t.url)) {
          combined.push(t);
          seenUrls.add(t.url);
        }
      });
    }

    if (exploreFilter === "video") {
      combined = combined.filter((t) => t.url && (t.url.endsWith(".mp4") || t.url.endsWith(".webm")));
    }

    if (exploreSearch) {
      combined = combined.filter((t) => {
        const str = `${t.name} ${t.author || ""} ${t.category || ""} ${(t.tags || []).join(" ")}`.toLowerCase();
        return str.includes(exploreSearch);
      });
    }

    if (combined.length === 0) {
      grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 48px 20px; color: rgba(205, 190, 145, 0.6); font-size: 13px;">
          ${exploreFilter === "community" && communityThemesList.length === 0 ? "Henüz toplulukta paylaşılan tema yok veya yükleniyor. 'Temalarım' sekmesinden kendi temanızı ilk olarak yayınlayabilirsiniz!" : `"${escapeHtml(exploreSearch)}" ile eşleşen tema bulunamadı.`}
        </div>
      `;
      return;
    }

    combined.forEach((theme) => {
      const isCurrentlyActive = currentState.enabled && (currentState.activeThemeId === theme.id || (currentState.themes.find((t) => t.id === currentState.activeThemeId)?.url === theme.url));
      const card = document.createElement("div");
      card.className = `c403-explore-card ${isCurrentlyActive ? "is-active" : ""}`;

      const isVideo = theme.url && (theme.url.endsWith(".mp4") || theme.url.endsWith(".webm"));

      card.innerHTML = `
        <div class="c403-exp-preview" style="background-image: ${isVideo ? "none" : `url('${theme.url}')`};">
          <div class="c403-exp-overlay-badges">
            <span class="c403-exp-tag ${theme.isOfficial ? "official" : ""} ${isCurrentlyActive ? "active" : ""}">
              ${isCurrentlyActive ? "✓ AKTİF" : theme.isOfficial ? "⭐ 403 Seçimi" : "🌐 Topluluk"}
            </span>
            <span class="c403-exp-tag">${isVideo ? "🎬 Video" : "🖼️ Görsel"}</span>
          </div>
          ${isVideo ? '<div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:bold; color:#0acbe6; background:rgba(0,0,0,0.5);">[CANLI VİDEO]</div>' : ""}
        </div>
        <div class="c403-exp-info">
          <div class="c403-exp-title">${escapeHtml(theme.name)}</div>
          <div class="c403-exp-author">Paylaşan: <b>${escapeHtml(theme.author || "Topluluk")}</b></div>
          <div class="c403-exp-desc">${escapeHtml(theme.description || "403Changer uyumlu tema.")}</div>
          <div class="c403-exp-actions">
            <button type="button" class="c403-exp-btn-apply" data-action="quick-apply" ${isCurrentlyActive ? "disabled" : ""}>
              ${isCurrentlyActive ? "✓ Kullanımda" : "⚡ Hemen Uygula"}
            </button>
            <button type="button" class="c403-act-icon" data-action="share" title="Tema Kodunu Kopyala (Paylaş)">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
            </button>
          </div>
        </div>
      `;

      // Hemen Uygula (Tek tıkla direkt alıp uygular ve kütüphaneye kaydeder)
      card.querySelector('[data-action="quick-apply"]').addEventListener("click", () => {
        let targetTheme = currentState.themes.find((t) => t.id === theme.id || t.url === theme.url);
        if (!targetTheme) {
          targetTheme = {
            id: theme.id,
            name: theme.name,
            author: theme.author,
            category: theme.category,
            isPublic: true,
            url: theme.url,
            opacity: theme.opacity != null ? theme.opacity : 0.35,
            blur: theme.blur || 0,
            createdAt: Date.now(),
          };
          currentState.themes.unshift(targetTheme);
        }

        currentState.activeThemeId = targetTheme.id;
        currentState.enabled = true;
        modal.querySelector("#c403-bg-master-toggle").classList.add("active");

        saveState(currentState);
        applyActiveBackground();
        updateCounts();
        renderExploreTab();
        showToast(`"${theme.name}" teması başarıyla uygulandı!`);
      });

      card.querySelector('[data-action="share"]').addEventListener("click", () => {
        handleShareTheme(theme);
      });

      grid.appendChild(card);
    });
  }

  // --- TEMALARIM RENDER ---
  function renderMyThemesTab() {
    const modal = ensureModal();
    if (!modal) return;
    const list = modal.querySelector("#c403-my-list");
    if (!list) return;
    list.innerHTML = "";

    let filtered = currentState.themes;
    if (myThemesSearch) {
      filtered = filtered.filter((t) => t.name.toLowerCase().includes(myThemesSearch));
    }

    if (filtered.length === 0) {
      list.innerHTML = `
        <div style="text-align:center; padding: 48px 20px; color: rgba(205, 190, 145, 0.6); font-size: 13px;">
          Henüz kayıtlı temanız yok. <br/><b>"✨ Keşfet"</b> sekmesinden beğendiğiniz bir temayı hemen uygulayabilir veya yukarıdaki <b>"+ Yeni Tema Oluştur"</b> butonundan kendinize özel bir tema ekleyebilirsiniz!
        </div>
      `;
      return;
    }

    filtered.forEach((theme) => {
      const isActive = currentState.enabled && currentState.activeThemeId === theme.id;
      const card = document.createElement("div");
      card.className = `c403-theme-card ${isActive ? "is-active" : ""}`;

      const opPct = Math.round((theme.opacity != null ? theme.opacity : 0.35) * 100);
      const blurPx = theme.blur || 0;
      const isVideo = theme.url && (theme.url.endsWith(".mp4") || theme.url.endsWith(".webm"));

      card.innerHTML = `
        <div class="c403-theme-thumb" style="background-image: ${isVideo ? "none" : `url('${theme.url}')`};">
          ${isVideo ? '<div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:bold; color:#0acbe6;">[VIDEO]</div>' : ""}
        </div>
        <div class="c403-theme-info">
          <div class="c403-theme-name-row">
            <span class="c403-theme-name">${escapeHtml(theme.name)}</span>
            <span class="c403-theme-badge ${theme.isPublic ? "public" : "private"}">${theme.isPublic ? "🌐 Herkese Açık" : "🔒 Kişisel"}</span>
            ${isActive ? '<span class="c403-theme-badge active-indicator">✓ AKTİF</span>' : ""}
          </div>
          <div class="c403-theme-meta">
            <span>Yazar: ${escapeHtml(theme.author || "Sen")}</span>
            <span>Opaklık: %${opPct}</span>
            <span>Bulanıklık: ${blurPx}px</span>
            <span>Tür: ${isVideo ? "Video" : "Görsel"}</span>
          </div>
        </div>
        <div class="c403-theme-actions">
          <button type="button" class="c403-act-apply" data-action="apply" data-id="${theme.id}" ${isActive ? "disabled" : ""}>
            ${isActive ? "Kullanımda" : "Uygula"}
          </button>
          <button type="button" class="c403-act-publish" data-action="publish" data-id="${theme.id}" title="Bu temayı Keşfet topluluk havuzunda yayınla">
            <span>🌐 Toplulukta Paylaş</span>
          </button>
          <button type="button" class="c403-act-icon" data-action="share-code" data-id="${theme.id}" title="Tema Kodunu Kopyala">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
          </button>
          <button type="button" class="c403-act-icon" data-action="edit" data-id="${theme.id}" title="Düzenle">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
          </button>
          <button type="button" class="c403-act-icon delete" data-action="delete" data-id="${theme.id}" title="Sil">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      `;

      card.querySelector('[data-action="apply"]').addEventListener("click", () => {
        currentState.activeThemeId = theme.id;
        currentState.enabled = true;
        modal.querySelector("#c403-bg-master-toggle").classList.add("active");
        saveState(currentState);
        applyActiveBackground();
        renderMyThemesTab();
        showToast(`"${theme.name}" teması uygulandı.`);
      });

      // Toplulukta Paylaş butonu (Canlı Keşfet havuzuna gönderir)
      card.querySelector('[data-action="publish"]').addEventListener("click", () => {
        const author = prompt("Toplulukta görünecek Sihirdar / Yazar adınız:", theme.author || "403 Oyuncusu");
        if (author === null) return;
        const desc = prompt("Tema açıklaması (İsteğe bağlı):", `${theme.name} teması`);
        publishThemeToCommunity(theme, author, desc);
      });

      card.querySelector('[data-action="share-code"]').addEventListener("click", () => {
        handleShareTheme(theme);
      });

      card.querySelector('[data-action="edit"]').addEventListener("click", () => {
        openDrawer(theme.id);
      });

      card.querySelector('[data-action="delete"]').addEventListener("click", () => {
        if (currentState.themes.length <= 1) {
          showToast("En az bir tema bulunmalıdır!");
          return;
        }
        currentState.themes = currentState.themes.filter((t) => t.id !== theme.id);
        if (currentState.activeThemeId === theme.id) {
          currentState.activeThemeId = currentState.themes[0].id;
        }
        saveState(currentState);
        applyActiveBackground();
        updateCounts();
        renderMyThemesTab();
        showToast(`"${theme.name}" silindi.`);
      });

      list.appendChild(card);
    });
  }

  function renderCurrentTab() {
    if (currentTab === "explore") {
      renderExploreTab();
    } else {
      renderMyThemesTab();
    }
  }

  function openDrawer(themeId) {
    const modal = ensureModal();
    const drawer = modal.querySelector("#c403-bg-drawer");
    const heading = modal.querySelector("#c403-bg-form-heading");
    const nameInput = modal.querySelector("#c403-form-name");
    const urlInput = modal.querySelector("#c403-form-url");
    const authorInput = modal.querySelector("#c403-form-author");
    const catInput = modal.querySelector("#c403-form-cat");
    const opInput = modal.querySelector("#c403-form-opacity");
    const opVal = modal.querySelector("#c403-val-opacity");
    const blurInput = modal.querySelector("#c403-form-blur");
    const blurVal = modal.querySelector("#c403-val-blur");
    const typePriv = modal.querySelector("#c403-type-priv");
    const typePub = modal.querySelector("#c403-type-pub");

    editingThemeId = themeId;

    if (themeId) {
      const theme = currentState.themes.find((t) => t.id === themeId);
      if (!theme) return;
      heading.textContent = `Temayı Düzenle: ${theme.name}`;
      nameInput.value = theme.name;
      urlInput.value = theme.url;
      authorInput.value = theme.author || "";
      catInput.value = theme.category || "";
      const opPct = Math.round((theme.opacity != null ? theme.opacity : 0.35) * 100);
      opInput.value = opPct;
      opVal.textContent = `%${opPct}`;
      const blr = theme.blur || 0;
      blurInput.value = blr;
      blurVal.textContent = `${blr}px`;

      if (theme.isPublic) {
        typePub.click();
      } else {
        typePriv.click();
      }
    } else {
      heading.textContent = "Yeni Tema Oluştur";
      nameInput.value = "";
      urlInput.value = "";
      authorInput.value = "";
      catInput.value = "";
      opInput.value = 35;
      opVal.textContent = "%35";
      blurInput.value = 0;
      blurVal.textContent = "0px";
      typePub.click();
    }

    drawer.classList.add("open");
    drawer.scrollIntoView({ behavior: "smooth" });
  }

  // --- Kod Paylaşma & İçe Aktarma ---
  function handleShareTheme(theme) {
    const payload = {
      n: theme.name,
      u: theme.url,
      a: theme.author || "403 Oyuncusu",
      o: theme.opacity != null ? theme.opacity : 0.35,
      b: theme.blur || 0,
      p: !!theme.isPublic,
      v: 2,
    };
    try {
      const code = "403BG:" + btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(() => {
          showToast(`"${theme.name}" tema kodu panoya kopyalandı!`);
        }).catch(() => {
          prompt("Tema Kodu:", code);
        });
      } else {
        prompt("Tema Kodu:", code);
      }
    } catch (e) {
      console.warn("Paylaşma hatası:", e);
      showToast("Tema kodu oluşturulamadı.");
    }
  }

  function handleImportPrompt() {
    const raw = prompt("403Changer Tema Kodunu buraya yapıştırın (Örn: 403BG:...):");
    if (!raw) return;

    try {
      let jsonStr = raw.trim();
      if (jsonStr.startsWith("403BG:")) {
        jsonStr = decodeURIComponent(escape(atob(jsonStr.substring(6))));
      }
      const data = JSON.parse(jsonStr);
      if (!data.u) {
        showToast("Geçersiz tema kodu!");
        return;
      }

      const importedTheme = {
        id: `theme_${Date.now()}`,
        name: data.n || "İçe Aktarılan Tema",
        author: data.a || "Topluluk",
        url: data.u,
        opacity: data.o != null ? data.o : 0.35,
        blur: data.b || 0,
        isPublic: data.p !== undefined ? data.p : true,
        createdAt: Date.now(),
      };

      currentState.themes.unshift(importedTheme);
      currentState.activeThemeId = importedTheme.id;
      currentState.enabled = true;
      saveState(currentState);
      applyActiveBackground();
      updateCounts();
      renderMyThemesTab();
      showToast(`"${importedTheme.name}" başarıyla içe aktarıldı ve uygulandı!`);
    } catch (e) {
      console.warn("Import hatası:", e);
      showToast("Geçersiz veya bozuk tema kodu!");
    }
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function openModal() {
    try {
      const modal = ensureModal();
      if (!modal) return;
      if (document.body && !document.body.contains(modal)) {
        document.body.appendChild(modal);
      }
      modal.classList.add("c403-open");
      modal.style.display = "flex";
      modal.style.opacity = "1";
      modal.style.pointerEvents = "auto";

      try { updateCounts(); } catch (e) { console.warn("[403-BG] updateCounts hatasi:", e); }
      try { renderCurrentTab(); } catch (e) { console.warn("[403-BG] renderCurrentTab hatasi:", e); }
      try { fetchLiveCommunityThemes(); } catch (e) { console.warn("[403-BG] fetchLiveCommunityThemes hatasi:", e); }
    } catch (err) {
      console.error("[403-BG] openModal hatasi:", err);
    }
  }

  function closeModal() {
    const modal = document.getElementById(MODAL_ID) || modalElement;
    if (modal) {
      modal.classList.remove("c403-open");
      modal.style.setProperty("display", "none", "important");
      modal.style.opacity = "0";
      modal.style.pointerEvents = "none";
      const drawer = modal.querySelector("#c403-bg-drawer");
      if (drawer) drawer.classList.remove("open");
    }
  }

  // --- Başlatma ---
  function init() {
    if (!document.body) {
      window.addEventListener("DOMContentLoaded", init);
      return;
    }
    injectStyles();
    applyActiveBackground();
    fetchLiveCommunityThemes();

    const observer = new MutationObserver(() => {
      const viewport = document.getElementById("rcp-fe-viewport-root");
      if (viewport && !document.getElementById(BG_CONTAINER_ID)) {
        applyActiveBackground();
      }
    });
    if (document.body) {
      observer.observe(document.body, { childList: true, subtree: true });
    }

    window.__c403ModSettings = window.__c403ModSettings || {};
    window.__c403ModSettings["backgroundcustomizer"] = () => openModal();
    window.c403OpenBackgroundCustomizer = () => openModal();
    window.addEventListener("c403-open-mod-settings-backgroundcustomizer", () => openModal());

    console.log("[403-BG] Canlı Topluluk Paylaşımlı Arka Plan Özelleştirici yüklendi.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
