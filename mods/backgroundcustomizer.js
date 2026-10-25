/**
 * 403Changer - Arka Plan & Tema Özelleştirici (Background Customizer)
 *
 * @name         BackgroundCustomizer
 * @author       403Changer
 * @description  İstemci arka planına özel görsel ve video temaları uygular.
 *               Kullanıcılar kendi temalarını kolayca oluşturabilir, düzenleyebilir ve kaydedebilir.
 * @version      2.4.0
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

  // --- Hazır Başlangıç Temaları ---
  const STARTER_THEMES = [
    {
      id: "theme_403_gold",
      name: "403 Gothic Gold",
      author: "403Changer",
      url: "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/hextech-bg.jpg",
      opacity: 0.35,
      blur: 0,
      createdAt: 1700000000000,
    },
    {
      id: "theme_arcane_zaun",
      name: "Arcane: Zaun & Piltover",
      author: "403Changer",
      url: "https://images.contentstack.io/v3/assets/blt731acb42bb3d1659/blt4ee7aebeaa9a35e8/63914a27c00e625ff19762fa/120822_Season_2023_Cinematic_Banner.jpg",
      opacity: 0.4,
      blur: 0,
      createdAt: 1700000001000,
    },
    {
      id: "theme_project_neon",
      name: "Siberpunk: PROJECT Neon",
      author: "403Changer",
      url: "https://images.contentstack.io/v3/assets/blt731acb42bb3d1659/blt56dc3b6647240c5e/5eb9b05779c6d376f2df3b68/PROJECT_Wallpaper_1920x1080.jpg",
      opacity: 0.38,
      blur: 0,
      createdAt: 1700000002000,
    },
    {
      id: "theme_spirit_blossom",
      name: "Ruh Çiçeği (Spirit Blossom)",
      author: "403Changer",
      url: "https://images.contentstack.io/v3/assets/blt731acb42bb3d1659/bltb96ecf7b9ebc19ec/5f0f7f3e8ca7791845bb3826/Spirit_Blossom_2020_Article_Header.jpg",
      opacity: 0.38,
      blur: 0,
      createdAt: 1700000003000,
    },
    {
      id: "theme_dark_star",
      name: "Karanlık Yıldız (Dark Star)",
      author: "403Changer",
      url: "https://images.contentstack.io/v3/assets/blt731acb42bb3d1659/bltae33cf14d9bfe2b4/5e73e91d6f461e712a297920/Dark_Star_2020_Wallpaper.jpg",
      opacity: 0.36,
      blur: 0,
      createdAt: 1700000004000,
    },
    {
      id: "theme_kda_allout",
      name: "K/DA ALL OUT: Sahne",
      author: "403Changer",
      url: "https://images.contentstack.io/v3/assets/blt731acb42bb3d1659/bltc210d7a46973e0a2/5f8dfb15275e523f33ce9bc0/KDA_2020_Key_Art.jpg",
      opacity: 0.35,
      blur: 0,
      createdAt: 1700000005000,
    },
  ];

  const DEFAULT_STATE = {
    enabled: true,
    activeThemeId: "theme_403_gold",
    themes: STARTER_THEMES,
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

      /* Modal Arka Plan & Çerçeve */
      #${MODAL_ID} {
        position: fixed !important;
        inset: 0 !important;
        z-index: 2147483647 !important;
        display: none !important;
        align-items: center !important;
        justify-content: center !important;
        background: rgba(0, 0, 0, 0.78) !important;
        backdrop-filter: blur(8px) !important;
        font-family: "Beaufort for LOL", "Segoe UI", sans-serif !important;
        color: #f0e6d2 !important;
        user-select: none !important;
      }

      #${MODAL_ID}.c403-open {
        display: flex !important;
      }

      #${MODAL_ID} .c403-bg-box {
        width: 860px;
        max-width: 95vw;
        height: 640px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        background: radial-gradient(120% 90% at 50% -20%, rgba(200, 170, 110, 0.15), transparent 65%),
                    linear-gradient(180deg, #0e151d 0%, #06090d 100%);
        border: 1px solid rgba(200, 170, 110, 0.45);
        border-radius: 8px;
        box-shadow: 0 24px 64px rgba(0, 0, 0, 0.9), inset 0 1px 0 rgba(255, 255, 255, 0.06);
        overflow: hidden;
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
        width: 40px;
        height: 40px;
        background: url("/asset/logo.png") center / contain no-repeat;
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

      /* Aksiyon Barı */
      #${MODAL_ID} .c403-sub-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 24px;
        background: rgba(0, 0, 0, 0.2);
        border-bottom: 1px solid rgba(200, 170, 110, 0.15);
        gap: 12px;
        flex-wrap: wrap;
      }

      .c403-btn-gold {
        background: linear-gradient(180deg, #1e282d, #141c22);
        border: 1px solid #c8aa6e;
        color: #f0e6d2;
        padding: 7px 16px;
        border-radius: 4px;
        font-size: 12px;
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
        padding: 6px 14px;
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

      /* Hızlı İnce Ayarlar */
      .c403-quick-sliders {
        display: flex;
        align-items: center;
        gap: 20px;
      }

      .c403-slider-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 11px;
        font-weight: 700;
        color: #cdbe91;
      }

      .c403-slider-item input[type="range"] {
        width: 80px;
        accent-color: #c8aa6e;
        cursor: pointer;
      }

      /* Ana İçerik Grid */
      #${MODAL_ID} .c403-bg-body {
        flex: 1 1 auto;
        overflow-y: auto;
        padding: 20px 24px;
      }

      #${MODAL_ID} .c403-bg-body::-webkit-scrollbar { width: 6px; }
      #${MODAL_ID} .c403-bg-body::-webkit-scrollbar-thumb {
        background: rgba(200, 170, 110, 0.3);
        border-radius: 3px;
      }

      .c403-theme-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: 16px;
      }

      .c403-theme-card {
        background: rgba(14, 21, 29, 0.7);
        border: 1px solid rgba(200, 170, 110, 0.2);
        border-radius: 6px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        transition: all 0.2s ease;
        position: relative;
      }

      .c403-theme-card:hover {
        border-color: rgba(200, 170, 110, 0.6);
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
      }

      .c403-theme-card.active {
        border-color: #0acbe6;
        box-shadow: 0 0 16px rgba(10, 203, 230, 0.35);
      }

      .c403-card-preview {
        height: 125px;
        position: relative;
        background: #000;
        overflow: hidden;
      }

      .c403-card-img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }

      .c403-card-badge {
        position: absolute;
        top: 8px;
        right: 8px;
        background: rgba(10, 203, 230, 0.9);
        color: #010a13;
        font-size: 10px;
        font-weight: 800;
        padding: 2px 8px;
        border-radius: 3px;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .c403-card-info {
        padding: 12px;
        flex: 1 1 auto;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
      }

      .c403-card-title {
        font-size: 13.5px;
        font-weight: 700;
        color: #f0e6d2;
        margin-bottom: 2px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .c403-card-author {
        font-size: 11px;
        color: rgba(205, 190, 145, 0.5);
        margin-bottom: 12px;
      }

      .c403-card-actions {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .c403-btn-select {
        flex: 1;
        padding: 6px 10px;
        font-size: 11.5px;
        font-weight: 700;
        border-radius: 4px;
        cursor: pointer;
        border: 1px solid rgba(200, 170, 110, 0.4);
        background: rgba(200, 170, 110, 0.1);
        color: #f0e6d2;
        transition: all 0.15s;
        text-align: center;
      }

      .c403-btn-select:hover {
        background: rgba(200, 170, 110, 0.25);
        border-color: #c8aa6e;
      }

      .c403-btn-select.selected {
        background: #0acbe6;
        border-color: #0acbe6;
        color: #010a13;
        cursor: default;
      }

      .c403-card-icon-btn {
        width: 28px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(255, 255, 255, 0.04);
        border: 1px solid rgba(200, 170, 110, 0.2);
        color: #cdbe91;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        transition: all 0.15s;
      }

      .c403-card-icon-btn:hover {
        border-color: #c8aa6e;
        color: #f0e6d2;
        background: rgba(200, 170, 110, 0.15);
      }

      .c403-card-icon-btn.delete:hover {
        border-color: #e04444;
        color: #ff6666;
        background: rgba(224, 68, 68, 0.15);
      }

      /* Tema Ekleme / Düzenleme Modal Pop-up */
      .c403-edit-dialog {
        position: absolute;
        inset: 0;
        background: rgba(3, 6, 9, 0.85);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10;
      }

      .c403-edit-box {
        width: 440px;
        max-width: 90%;
        background: #0d141c;
        border: 1px solid rgba(200, 170, 110, 0.5);
        border-radius: 8px;
        padding: 20px 24px;
        display: flex;
        flex-direction: column;
        gap: 14px;
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.85);
      }

      .c403-edit-title {
        margin: 0;
        font-size: 15px;
        font-weight: 700;
        color: #f0e6d2;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .c403-form-group {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }

      .c403-form-group label {
        font-size: 11.5px;
        font-weight: 700;
        color: #cdbe91;
      }

      .c403-form-input {
        background: #060a0f;
        border: 1px solid rgba(200, 170, 110, 0.3);
        border-radius: 4px;
        color: #f0e6d2;
        padding: 7px 10px;
        font-size: 12px;
        outline: none;
      }

      .c403-form-input:focus {
        border-color: #c8aa6e;
      }

      .c403-edit-actions {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 8px;
      }

      /* Toast Bildirim */
      .c403-bg-toast {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        background: #091016;
        border: 1px solid #c8aa6e;
        color: #f0e6d2;
        padding: 10px 22px;
        border-radius: 4px;
        font-size: 12px;
        font-weight: 700;
        z-index: 2147483647;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.8);
        pointer-events: none;
        animation: c403-toast-in 0.25s ease;
      }

      @keyframes c403-toast-in {
        from { transform: translate(-50%, 15px); opacity: 0; }
        to { transform: translate(-50%, 0); opacity: 1; }
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  function showToast(msg) {
    const prev = document.querySelector(".c403-bg-toast");
    if (prev) prev.remove();
    const toast = document.createElement("div");
    toast.className = "c403-bg-toast";
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 2800);
  }

  // --- Arka Planı DOM'a Uygulama ---
  let failedThemeUrl = null;

  function isWebUrl(value) {
    if (typeof value !== "string" || !value.trim()) return false;
    try {
      const parsed = new URL(value, window.location.href);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }

  function removeBackground() {
    const container = document.getElementById(BG_CONTAINER_ID);
    if (container) container.remove();
    document.body.classList.remove("c403-bg-active");
  }

  function applyActiveBackground() {
    const theme = currentState.themes.find((t) => t.id === currentState.activeThemeId) || currentState.themes[0];

    // Arka planı yalnızca gerçekten yüklenebilen bir görsel/video için açarız.
    // Aksi halde istemci arka planı şeffaflaşır ve lobi siyah kalır.
    if (!currentState.enabled || !theme || !isWebUrl(theme.url)) {
      removeBackground();
      return;
    }

    // Yüklenemeyen tema her 2.5 sn'de yeniden denenip bildirim yağmuruna
    // dönüşmesin; kullanıcı temayı yeniden seçerse tekrar denenir.
    if (theme.url === failedThemeUrl) {
      removeBackground();
      return;
    }

    let container = document.getElementById(BG_CONTAINER_ID);
    const viewport = document.getElementById("rcp-fe-viewport-root") || document.body;
    if (!container) {
      container = document.createElement("div");
      container.id = BG_CONTAINER_ID;
      viewport.prepend(container);
    } else if (container.parentElement !== viewport) {
      viewport.prepend(container);
    }

    const isVideo = /\.(mp4|webm|ogg)($|\?)/i.test(theme.url);
    const opacity = theme.opacity != null ? theme.opacity : 0.35;
    const blur = theme.blur ? `blur(${theme.blur}px)` : "none";
    const existingMedia = container.querySelector(".c403-bg-media");
    const sameMedia = existingMedia &&
      existingMedia.dataset.url === theme.url &&
      existingMedia.tagName === (isVideo ? "VIDEO" : "IMG");

    if (sameMedia) {
      existingMedia.style.opacity = opacity;
      existingMedia.style.filter = blur;
      document.body.classList.add("c403-bg-active");
      return;
    }

    const media = document.createElement(isVideo ? "video" : "img");
    media.className = "c403-bg-media";
    media.dataset.url = theme.url;
    media.style.opacity = opacity;
    media.style.filter = blur;

    if (isVideo) {
      media.autoplay = true;
      media.loop = true;
      media.muted = true;
      media.playsInline = true;
    }

    const onReady = () => {
      if (!media.isConnected) return;
      document.body.classList.add("c403-bg-active");
    };
    const onError = () => {
      if (!media.isConnected) return;
      failedThemeUrl = media.dataset.url || theme.url;
      document.body.classList.remove("c403-bg-active");
      if (media.parentNode) media.remove();
      console.warn("[403-BG] Tema medyası yüklenemedi:", theme.url);
      showToast("Tema görseli yüklenemedi, arka plan kapatıldı.");
    };

    media.addEventListener(isVideo ? "loadeddata" : "load", onReady, { once: true });
    media.addEventListener("error", onError, { once: true });

    container.replaceChildren(media);
    document.body.classList.remove("c403-bg-active");
    media.src = theme.url;
    if (isVideo) {
      media.play().catch(() => {});
    }
  }

  // --- Modal İnşası & Yönetimi ---
  let modalElement = null;

  function ensureModal() {
    let modal = document.getElementById(MODAL_ID);
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = MODAL_ID;
    modal.style.setProperty("display", "none", "important");

    modal.innerHTML = `
      <div class="c403-bg-box" role="dialog">
        <!-- Başlık -->
        <div class="c403-bg-head">
          <div class="c403-bg-brand">
            <div class="c403-bg-logo"></div>
            <div class="c403-bg-titles">
              <h2>Arka Plan Özelleştirici</h2>
              <span>Özel Görsel & Video Temaları</span>
            </div>
          </div>
          <div class="c403-bg-head-controls">
            <label class="c403-bg-switch-label">
              <span>Etkin</span>
              <div class="c403-bg-toggle ${currentState.enabled ? "active" : ""}" id="c403-toggle-enable"></div>
            </label>
            <button type="button" class="c403-btn-outline" id="c403-btn-reset-default">Varsayılana Sıfırla</button>
            <button type="button" class="c403-bg-close-btn" id="c403-bg-close">✕</button>
          </div>
        </div>

        <!-- Üst Bar: Aksiyonlar & Anlık Slider'lar -->
        <div class="c403-sub-bar">
          <button type="button" class="c403-btn-gold" id="c403-btn-add-theme">
            <span>➕</span>
            <span>Yeni Tema Oluştur</span>
          </button>
          <div class="c403-quick-sliders">
            <div class="c403-slider-item">
              <span>Saydamlık:</span>
              <input type="range" id="c403-slider-opacity" min="0.05" max="1" step="0.05" value="0.35">
              <span id="c403-label-opacity">35%</span>
            </div>
            <div class="c403-slider-item">
              <span>Bulanıklık:</span>
              <input type="range" id="c403-slider-blur" min="0" max="20" step="1" value="0">
              <span id="c403-label-blur">0px</span>
            </div>
          </div>
        </div>

        <!-- Ana İçerik: Kayıtlı Temalar Grid -->
        <div class="c403-bg-body">
          <div class="c403-theme-grid" id="c403-theme-grid"></div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    modalElement = modal;

    // Olay Dinleyicileri
    modal.querySelector("#c403-bg-close").addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });

    const toggle = modal.querySelector("#c403-toggle-enable");
    toggle.addEventListener("click", () => {
      currentState.enabled = !currentState.enabled;
      if (currentState.enabled) failedThemeUrl = null;
      toggle.classList.toggle("active", currentState.enabled);
      saveState(currentState);
      applyActiveBackground();
      renderGrid();
      showToast(currentState.enabled ? "Arka plan teması aktifleştirildi." : "Arka plan kapatıldı.");
    });

    modal.querySelector("#c403-btn-reset-default").addEventListener("click", () => {
      const defaults = structuredClone(DEFAULT_STATE);
      // "Varsayılana sıfırla" = özel arka planı kapat, istemcinin kendi
      // arka planına dön (tema seçimi de varsayılana çekilir).
      currentState.enabled = false;
      currentState.activeThemeId = defaults.activeThemeId;
      if (!currentState.themes.some((t) => t.id === defaults.activeThemeId)) {
        currentState.themes.unshift(defaults.themes[0]);
      }
      toggle.classList.remove("active");
      failedThemeUrl = null;
      saveState(currentState);
      applyActiveBackground();
      renderGrid();
      showToast("İstemci varsayılan arka planına döndürüldü.");
    });

    modal.querySelector("#c403-btn-add-theme").addEventListener("click", () => {
      openEditDialog(null);
    });

    // Slider her pikselde kaydedilmesin: önizleme anında, kayıt 200 ms sonra.
    let saveTimer = null;
    const queueSave = () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => saveState(currentState), 200);
    };

    const opSlider = modal.querySelector("#c403-slider-opacity");
    const opLabel = modal.querySelector("#c403-label-opacity");
    opSlider.addEventListener("input", (e) => {
      const val = parseFloat(e.target.value);
      opLabel.textContent = `${Math.round(val * 100)}%`;
      const cur = currentState.themes.find((t) => t.id === currentState.activeThemeId);
      if (cur) {
        cur.opacity = val;
        applyActiveBackground();
        queueSave();
      }
    });

    const blurSlider = modal.querySelector("#c403-slider-blur");
    const blurLabel = modal.querySelector("#c403-label-blur");
    blurSlider.addEventListener("input", (e) => {
      const val = parseInt(e.target.value, 10);
      blurLabel.textContent = `${val}px`;
      const cur = currentState.themes.find((t) => t.id === currentState.activeThemeId);
      if (cur) {
        cur.blur = val;
        applyActiveBackground();
        queueSave();
      }
    });

    return modal;
  }

  function renderGrid() {
    const modal = ensureModal();
    const grid = modal.querySelector("#c403-theme-grid");
    if (!grid) return;

    const curTheme = currentState.themes.find((t) => t.id === currentState.activeThemeId) || currentState.themes[0];

    // Slider'ları güncelle
    if (curTheme) {
      const op = curTheme.opacity != null ? curTheme.opacity : 0.35;
      const bl = curTheme.blur || 0;
      modal.querySelector("#c403-slider-opacity").value = op;
      modal.querySelector("#c403-label-opacity").textContent = `${Math.round(op * 100)}%`;
      modal.querySelector("#c403-slider-blur").value = bl;
      modal.querySelector("#c403-label-blur").textContent = `${bl}px`;
    }

    grid.innerHTML = currentState.themes
      .map((theme) => {
        const isActive = currentState.enabled && theme.id === currentState.activeThemeId;
        const isVideo = /\.(mp4|webm|ogg)($|\?)/i.test(theme.url);

        const safeUrl = escapeHtml(theme.url);
        const safeId = escapeHtml(theme.id);

        return `
          <div class="c403-theme-card ${isActive ? "active" : ""}" data-id="${safeId}">
            <div class="c403-card-preview">
              ${isVideo ? `
                <video class="c403-card-img" muted loop playsinline preload="metadata" src="${safeUrl}"></video>
              ` : `
                <img class="c403-card-img" src="${safeUrl}" loading="lazy" referrerpolicy="no-referrer">
              `}
              ${isActive ? '<div class="c403-card-badge">Aktif</div>' : ""}
            </div>
            <div class="c403-card-info">
              <div>
                <div class="c403-card-title">${escapeHtml(theme.name)}</div>
                <div class="c403-card-author">${escapeHtml(theme.author || "Kullanıcı")}</div>
              </div>
              <div class="c403-card-actions">
                <button type="button" class="c403-btn-select ${isActive ? "selected" : ""}" data-act="select" data-id="${safeId}">
                  ${isActive ? "Seçili" : "Uygula"}
                </button>
                <button type="button" class="c403-card-icon-btn" data-act="edit" data-id="${safeId}" title="Düzenle">✎</button>
                <button type="button" class="c403-card-icon-btn delete" data-act="delete" data-id="${safeId}" title="Sil">✕</button>
              </div>
            </div>
          </div>
        `;
      })
      .join("");

    // Kart önizlemeleri: hatalı görselde bir kez logoya düş, videoyu sadece hover'da oynat.
    grid.querySelectorAll("img.c403-card-img").forEach((img) => {
      img.addEventListener("error", () => {
        if (img.dataset.fallback) return;
        img.dataset.fallback = "1";
        img.src = "/asset/logo.png";
      }, { once: true });
    });
    grid.querySelectorAll("video.c403-card-img").forEach((video) => {
      video.addEventListener("mouseenter", () => video.play().catch(() => {}));
      video.addEventListener("mouseleave", () => video.pause());
    });

    // Kart butonları dinleyicileri
    grid.querySelectorAll("[data-act]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const act = btn.dataset.act;
        const id = btn.dataset.id;
        const targetTheme = currentState.themes.find((t) => t.id === id);

        if (act === "select") {
          currentState.activeThemeId = id;
          currentState.enabled = true;
          failedThemeUrl = null;
          modal.querySelector("#c403-toggle-enable").classList.add("active");
          saveState(currentState);
          applyActiveBackground();
          renderGrid();
          showToast(`"${targetTheme ? targetTheme.name : ""}" uygulandı!`);
        } else if (act === "edit") {
          openEditDialog(targetTheme);
        } else if (act === "delete") {
          if (currentState.themes.length <= 1) {
            showToast("Son kalan temayı silemezsiniz!");
            return;
          }
          currentState.themes = currentState.themes.filter((t) => t.id !== id);
          if (currentState.activeThemeId === id) {
            currentState.activeThemeId = currentState.themes[0].id;
          }
          saveState(currentState);
          applyActiveBackground();
          renderGrid();
          showToast("Tema silindi.");
        }
      });
    });
  }

  // --- Tema Ekleme / Düzenleme Dialogu ---
  function openEditDialog(themeToEdit) {
    const isEditing = !!themeToEdit;
    const dialog = document.createElement("div");
    dialog.className = "c403-edit-dialog";

    const initialName = isEditing ? themeToEdit.name : "Yeni Temam";
    const initialUrl = isEditing ? themeToEdit.url : "";
    const initialOpacity = isEditing ? (themeToEdit.opacity != null ? themeToEdit.opacity : 0.35) : 0.35;
    const initialBlur = isEditing ? (themeToEdit.blur || 0) : 0;

    dialog.innerHTML = `
      <div class="c403-edit-box">
        <h3 class="c403-edit-title">${isEditing ? "Temayı Düzenle" : "Yeni Tema Oluştur"}</h3>
        <div class="c403-form-group">
          <label>Tema Adı</label>
          <input type="text" class="c403-form-input" id="c403-edit-name" value="${escapeHtml(initialName)}" placeholder="Örn: Ruh Çiçeği Gecesi">
        </div>
        <div class="c403-form-group">
          <label>Görsel veya Video URL'si (.mp4, .webm, .jpg, .png)</label>
          <input type="text" class="c403-form-input" id="c403-edit-url" value="${escapeHtml(initialUrl)}" placeholder="https://ornek.com/video.mp4 veya görsel linki">
        </div>
        <div class="c403-form-group">
          <label>Saydamlık (${Math.round(initialOpacity * 100)}%)</label>
          <input type="range" min="0.05" max="1" step="0.05" value="${initialOpacity}" id="c403-edit-opacity">
        </div>
        <div class="c403-form-group">
          <label>Bulanıklık (${initialBlur}px)</label>
          <input type="range" min="0" max="20" step="1" value="${initialBlur}" id="c403-edit-blur">
        </div>
        <div class="c403-edit-actions">
          <button type="button" class="c403-btn-outline" id="c403-dialog-cancel">İptal</button>
          <button type="button" class="c403-btn-gold" id="c403-dialog-save">Kaydet ve Uygula</button>
        </div>
      </div>
    `;

    document.getElementById(MODAL_ID).querySelector(".c403-bg-box").appendChild(dialog);

    const nameInput = dialog.querySelector("#c403-edit-name");
    const urlInput = dialog.querySelector("#c403-edit-url");
    const opInput = dialog.querySelector("#c403-edit-opacity");
    const blurInput = dialog.querySelector("#c403-edit-blur");

    opInput.addEventListener("input", (e) => {
      opInput.previousElementSibling.textContent = `Saydamlık (${Math.round(parseFloat(e.target.value) * 100)}%)`;
    });

    blurInput.addEventListener("input", (e) => {
      blurInput.previousElementSibling.textContent = `Bulanıklık (${e.target.value}px)`;
    });

    dialog.querySelector("#c403-dialog-cancel").addEventListener("click", () => dialog.remove());

    dialog.querySelector("#c403-dialog-save").addEventListener("click", () => {
      const name = nameInput.value.trim() || "Özel Tema";
      const url = urlInput.value.trim();

      if (!isWebUrl(url)) {
        showToast("Lütfen http(s) ile başlayan geçerli bir görsel veya video linki girin!");
        return;
      }

      if (isEditing) {
        themeToEdit.name = name;
        themeToEdit.url = url;
        themeToEdit.opacity = parseFloat(opInput.value);
        themeToEdit.blur = parseInt(blurInput.value, 10);
        currentState.activeThemeId = themeToEdit.id;
      } else {
        const newTheme = {
          id: `theme_${Date.now()}`,
          name,
          author: "Sen",
          url,
          opacity: parseFloat(opInput.value),
          blur: parseInt(blurInput.value, 10),
          createdAt: Date.now(),
        };
        currentState.themes.unshift(newTheme);
        currentState.activeThemeId = newTheme.id;
      }

      currentState.enabled = true;
      failedThemeUrl = null;
      saveState(currentState);
      applyActiveBackground();
      dialog.remove();
      renderGrid();
      showToast(`"${name}" kaydedildi ve uygulandı!`);
    });
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Aynı anda iki mod ayar penceresi açık kalmasın (z-index çakışması).
  function closeOtherModals() {
    [
      "c403-profile-winloss-modal",
      "c403-icon-swapper-modal",
      "c403-skinviewer-info-modal",
      "c403-soloq-settings-modal",
    ].forEach((id) => document.getElementById(id)?.remove());
  }

  function openModal() {
    closeOtherModals();
    injectStyles();
    const modal = ensureModal();
    renderGrid();
    modal.style.setProperty("display", "flex", "important");
    modal.classList.add("c403-open");
  }

  function closeModal() {
    if (modalElement) {
      modalElement.classList.remove("c403-open");
      modalElement.style.setProperty("display", "none", "important");
    }
  }

  // --- Başlatıcı ve Optimize Edilmiş Gözlemci ---
  function init() {
    if (!document.body) {
      window.addEventListener("DOMContentLoaded", init);
      return;
    }
    injectStyles();
    applyActiveBackground();

    // Hafif ve throttled kontrol (CEF kasmadan arka planı korur)
    let lastCheck = 0;
    let lastRetry = 0;
    const throttledApply = () => {
      if (document.hidden || !currentState.enabled) return;
      const now = Date.now();
      if (now - lastCheck < 1500) return;
      lastCheck = now;

      const viewport = document.getElementById("rcp-fe-viewport-root");
      if (!viewport) return;

      const container = document.getElementById(BG_CONTAINER_ID);
      const misplaced = container && container.parentElement !== viewport;
      const missing = !container;
      const noMedia = container && !container.querySelector(".c403-bg-media");
      // Yükleme başarısız olduysa hemen tekrar denemeyelim (60 sn bekle).
      if (missing || misplaced || (noMedia && now - lastRetry > 60000)) {
        lastRetry = now;
        applyActiveBackground();
      }
    };

    window.addEventListener("hashchange", throttledApply);
    setInterval(throttledApply, 2500);

    console.log("[403-BG] Arka Plan & Tema Özelleştirici yüklendi.");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
