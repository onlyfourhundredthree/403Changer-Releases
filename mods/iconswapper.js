/**
 * 403Changer - Sihirdar Simgesi Değiştirici (Icon Swapper)
 * İstemci içinde sihirdar simgenizi istediğiniz LoL simgesiyle veya
 * kendi yüklediğiniz özel görsellerle değiştirmenizi sağlar.
 */

(() => {
  const CONFIG = {
    STYLE_ID: "c403-icon-swapper-styles",
    MODAL_ID: "c403-icon-swapper-modal",
    DATASTORE_KEY: "c403-iconswapper.selectedIcon",
    CUSTOM_ICON_KEY: "c403-iconswapper.customIcon",
    CUSTOM_ICONS_LIST_KEY: "c403-iconswapper.customIconsList",
    LEGACY_DATASTORE_KEY: "icon-swapper.selectedIcon",
    LEGACY_CUSTOM_ICON_KEY: "icon-swapper.customIcon",
    LEGACY_CUSTOM_ICONS_LIST_KEY: "icon-swapper.customIconsList",
    API_URL:
      "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons.json",
  };

  const safeDataStore = {
    get: async (key, fallbackKey = null) => {
      let val = null;
      if (window.DataStore && typeof window.DataStore.get === "function") {
        try {
          val = await window.DataStore.get(key);
          if (val === null && fallbackKey) {
            val = await window.DataStore.get(fallbackKey);
          }
        } catch (e) {}
      }
      if (val === null || val === undefined) {
        try {
          const raw = localStorage.getItem(key) || (fallbackKey ? localStorage.getItem(fallbackKey) : null);
          val = raw ? JSON.parse(raw) : null;
        } catch (e) {
          val = null;
        }
      }
      return val;
    },
    set: async (key, val) => {
      if (window.DataStore && typeof window.DataStore.set === "function") {
        try {
          await window.DataStore.set(key, val);
        } catch (e) {}
      }
      try {
        if (val === null || val === undefined) {
          localStorage.removeItem(key);
        } else {
          localStorage.setItem(key, JSON.stringify(val));
        }
      } catch (e) {}
    },
  };

  const showToast = (message, type = "info") => {
    if (window.Toast) {
      if (type === "success" && typeof window.Toast.success === "function") {
        window.Toast.success(message);
        return;
      }
      if (type === "error" && typeof window.Toast.error === "function") {
        window.Toast.error(message);
        return;
      }
    }
    let container = document.getElementById("c403-toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "c403-toast-container";
      container.style.cssText =
        "position:fixed;bottom:24px;right:24px;z-index:999999;display:flex;flex-direction:column;gap:8px;pointer-events:none;";
      document.body.appendChild(container);
    }
    const toast = document.createElement("div");
    const borderCol = type === "error" ? "#ff4655" : "#c8aa6e";
    toast.style.cssText = `background:rgba(10,14,20,0.95);border:1px solid ${borderCol};border-left:4px solid ${borderCol};color:#f0e6d2;padding:10px 16px;border-radius:4px;font-size:12px;font-family:'Beaufort for LOL',sans-serif;box-shadow:0 6px 20px rgba(0,0,0,0.6);`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transition = "opacity 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  const fileCache = {};

  function generateFileId(file) {
    return `${file.name}-${file.size}-${file.lastModified}`;
  }

  function validateImageFile(file) {
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const maxSizeMB = 6;

    if (!validTypes.includes(file.type)) {
      return {
        valid: false,
        error: "Desteklenmeyen dosya formatı. Lütfen JPG, PNG, GIF veya WebP seçin.",
      };
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      return {
        valid: false,
        error: `Görsel boyutu çok yüksek. Maksimum: ${maxSizeMB}MB`,
      };
    }

    return { valid: true };
  }

  function validateImageUrl(url) {
    try {
      const urlObj = new URL(url);
      if (!["http:", "https:"].includes(urlObj.protocol)) {
        return { valid: false, error: "URL http:// veya https:// ile başlamalıdır." };
      }
      return { valid: true };
    } catch {
      return { valid: false, error: "Geçersiz URL adresi." };
    }
  }

  function loadImageFromUrl(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const maxWidth = 256;
        const maxHeight = 256;
        let { width, height } = img;

        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/png", 0.9);
        resolve({ dataUrl, width, height, originalUrl: url });
      };
      img.onerror = () => reject(new Error("Görsel yüklenemedi."));
      img.src = url;
    });
  }

  function processImageFile(file, maxWidth = 256, maxHeight = 256, quality = 0.9) {
    return new Promise((resolve, reject) => {
      const fileId = generateFileId(file);
      if (fileCache[fileId]) return resolve(fileCache[fileId]);

      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target.result;
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }

          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);

          const dataUrl = canvas.toDataURL("image/png", quality);
          fileCache[fileId] = {
            dataUrl,
            width,
            height,
            originalSize: file.size,
          };
          resolve(fileCache[fileId]);
        };
        img.onerror = () => reject(new Error("Görsel okunamadı."));
      };
      reader.onerror = () => reject(new Error("Dosya okuma hatası."));
      reader.readAsDataURL(file);
    });
  }

  class IconSwapper {
    constructor() {
      this.summonerId = null;
      this.puuid = null;
      this.observer = null;
      this.shadowObservers = new Map();
      this.shadowStyles = new Map();
      this._applyRevision = 0;
      this.disposed = false;
      this._catalog = null;
      this._catalogRequest = null;

      window.addEventListener("unload", () => {
        this.disposed = true;
        this.revertIcon();
      });

      this.init();
    }

    async init() {
      try {
        for (let attempt = 0; attempt < 25 && !this.disposed; attempt++) {
          try {
            const res = await fetch("/lol-summoner/v1/current-summoner");
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            if (!data.summonerId || !data.puuid) throw new Error("Account is not ready");
            this.summonerId = data.summonerId;
            this.puuid = data.puuid;
            break;
          } catch {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }
        if (this.disposed || !this.summonerId) return;

        await this.applyCustomIcon();
      } catch (error) {
        console.error("[403Changer] IconSwapper başlatılamadı:", error);
      }
    }

    revertIcon() {
      this._applyRevision++;
      clearTimeout(this._refreshTimer);
      for (const observer of this.shadowObservers.values()) observer.disconnect();
      this.shadowObservers.clear();
      for (const style of this.shadowStyles.values()) style.remove();
      this.shadowStyles.clear();
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
      const styleElement = document.getElementById(CONFIG.STYLE_ID);
      if (styleElement) {
        styleElement.remove();
      }
    }

    async applyCustomIcon() {
      this.revertIcon();
      const revision = this._applyRevision;
      const selectedIconId = await safeDataStore.get(CONFIG.DATASTORE_KEY, CONFIG.LEGACY_DATASTORE_KEY);
      const customIconData = await safeDataStore.get(CONFIG.CUSTOM_ICON_KEY, CONFIG.LEGACY_CUSTOM_ICON_KEY);

      if (this.disposed || revision !== this._applyRevision || !this.summonerId) return;
      if (!selectedIconId && !customIconData) return;

      let iconUrl;
      if (customIconData) {
        iconUrl = customIconData;
      } else {
        iconUrl = `/lol-game-data/assets/v1/profile-icons/${selectedIconId}.jpg`;
      }

      const style = document.createElement("style");
      style.id = CONFIG.STYLE_ID;
      style.textContent = `
        :root { --c403-custom-avatar: url(${JSON.stringify(iconUrl)}); }
        .top > .icon-image.has-icon, summoner-icon {
          content: var(--c403-custom-avatar) !important;
        }
      `;
      document.head.appendChild(style);

      this.observeDOM();
    }

    observeDOM() {
      const selector = [
        `lol-regalia-hovercard-v2-element[summoner-id="${this.summonerId}"]`,
        `lol-regalia-profile-v2-element[summoner-id="${this.summonerId}"]`,
        `lol-regalia-parties-v2-element[summoner-id="${this.summonerId}"]`,
        `lol-regalia-crest-v2-element[voice-puuid="${this.puuid}"]`,
      ].join(",");

      const schedule = () => {
        clearTimeout(this._refreshTimer);
        this._refreshTimer = setTimeout(refresh, 50);
      };

      let activeRoots;
      const visit = (root) => {
        activeRoots.add(root);
        if (!this.shadowObservers.has(root)) {
          const observer = new MutationObserver(schedule);
          observer.observe(root, { childList: true, subtree: true });
          this.shadowObservers.set(root, observer);
        }
        if (!this.shadowStyles.has(root)) {
          const style = document.createElement("style");
          style.textContent = ".lol-regalia-summoner-icon { background-image: var(--c403-custom-avatar) !important; }";
          this.shadowStyles.set(root, style);
          root.appendChild(style);
        }
        root.querySelectorAll("lol-regalia-crest-v2-element").forEach((crest) => {
          if (crest.shadowRoot) visit(crest.shadowRoot);
        });
      };

      const refresh = () => {
        activeRoots = new Set();
        document.querySelectorAll(selector).forEach((element) => {
          if (element.shadowRoot) visit(element.shadowRoot);
        });
        for (const [root, observer] of this.shadowObservers) {
          if (!activeRoots.has(root)) {
            observer.disconnect();
            this.shadowObservers.delete(root);
            this.shadowStyles.get(root)?.remove();
            this.shadowStyles.delete(root);
          }
        }
      };

      this.observer = new MutationObserver(schedule);
      this.observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["summoner-id", "voice-puuid"],
      });
      refresh();
    }

    async loadIconCatalog() {
      if (this._catalog && Date.now() < this._catalog.expires) return this._catalog.icons;
      if (!this._catalogRequest) {
        this._catalogRequest = (async () => {
          const response = await fetch(CONFIG.API_URL);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const icons = await response.json();
          if (!Array.isArray(icons)) throw new Error("Katalog listesi geçersiz");
          const sorted = icons
            .filter((icon) => Number.isInteger(icon.id) && icon.id >= 0)
            .sort((a, b) => b.id - a.id);
          this._catalog = { icons: sorted, expires: Date.now() + 30 * 60 * 1000 };
          return sorted;
        })().finally(() => {
          this._catalogRequest = null;
        });
      }
      return this._catalogRequest;
    }

    async showIconModal() {
      document.getElementById(CONFIG.MODAL_ID)?.remove();

      const modal = document.createElement("div");
      modal.id = CONFIG.MODAL_ID;
      modal.style.cssText = `
        position: fixed; inset: 0;
        background: rgba(4, 7, 11, 0.82);
        backdrop-filter: blur(8px);
        display: flex; align-items: center; justify-content: center;
        z-index: 100000;
        font-family: 'Beaufort for LOL', 'Segoe UI', sans-serif;
        animation: c403FadeIn 0.2s ease;
      `;
      modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
      };

      const content = document.createElement("div");
      content.style.cssText = `
        width: 90%; max-width: 980px; height: 80%; max-height: 720px;
        background: #0d1319;
        border: 1px solid rgba(200, 170, 110, 0.4);
        border-radius: 8px;
        display: flex; flex-direction: column;
        box-shadow: 0 16px 48px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(200, 170, 110, 0.15);
        overflow: hidden;
      `;

      content.innerHTML = `
        <style>
          @keyframes c403FadeIn {
            from { opacity: 0; transform: scale(0.98); }
            to { opacity: 1; transform: scale(1); }
          }
          @keyframes c403Spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .c403-tab-btn {
            width: 100%; padding: 12px 18px;
            background: transparent; border: none; border-left: 3px solid transparent;
            color: #a09b8c; text-align: left; font-size: 13px; font-weight: 600;
            cursor: pointer; transition: all 0.2s ease; text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .c403-tab-btn:hover {
            color: #f0e6d2; background: rgba(200, 170, 110, 0.08);
          }
          .c403-tab-btn.active {
            color: #c8aa6e; background: rgba(200, 170, 110, 0.12);
            border-left-color: #c8aa6e;
          }
          .c403-icon-item {
            position: relative; border-radius: 50%; cursor: pointer;
            transition: all 0.2s ease; border: 2px solid rgba(200, 170, 110, 0.2);
            overflow: hidden; aspect-ratio: 1;
          }
          .c403-icon-item:hover {
            transform: scale(1.08); border-color: #c8aa6e;
            box-shadow: 0 0 16px rgba(200, 170, 110, 0.5);
          }
          .c403-custom-card {
            position: relative; display: flex; flex-direction: column;
            align-items: center; gap: 8px; padding: 8px; border-radius: 8px;
            background: rgba(18, 26, 34, 0.6); border: 1px solid rgba(200, 170, 110, 0.15);
            transition: all 0.2s ease;
          }
          .c403-custom-card:hover {
            border-color: rgba(200, 170, 110, 0.4);
            background: rgba(24, 34, 44, 0.8);
          }
          .c403-scroll::-webkit-scrollbar { width: 6px; }
          .c403-scroll::-webkit-scrollbar-track { background: rgba(0,0,0,0.2); }
          .c403-scroll::-webkit-scrollbar-thumb { background: #323b44; border-radius: 3px; }
          .c403-scroll::-webkit-scrollbar-thumb:hover { background: #c8aa6e; }
        </style>

        <div style="display: flex; height: 100%; max-height: 100%;">
          <!-- Sidebar -->
          <div style="width: 220px; background: #080d12; border-right: 1px solid rgba(200, 170, 110, 0.2); display: flex; flex-direction: column;">
            <div style="padding: 20px 16px; border-bottom: 1px solid rgba(200, 170, 110, 0.15);">
              <div style="color: #f0e6d2; font-size: 15px; font-weight: 700; letter-spacing: 0.5px;">SİMGELER</div>
              <div style="color: #c8aa6e; font-size: 11px; margin-top: 2px;">403Changer Modu</div>
            </div>

            <div style="flex: 1; padding: 14px 0; display: flex; flex-direction: column; gap: 4px;">
              <button id="c403-tab-league" class="c403-tab-btn active">LoL Simgeleri</button>
              <button id="c403-tab-custom" class="c403-tab-btn">Özel Simgeler</button>
            </div>

            <div style="padding: 16px; border-top: 1px solid rgba(200, 170, 110, 0.15); display: flex; flex-direction: column; gap: 8px;">
              <button id="c403-btn-revert" style="
                width: 100%; padding: 10px; background: rgba(200, 170, 110, 0.12);
                color: #c8aa6e; border: 1px solid rgba(200, 170, 110, 0.4); border-radius: 4px;
                cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.2s ease;
              ">Varsayılana Sıfırla</button>
              <span style="color: #7a8288; font-size: 11px; text-align: center; line-height: 1.3;">Orijinal simgenize geri döndürür</span>
            </div>
          </div>

          <!-- Content Panel -->
          <div style="flex: 1; display: flex; flex-direction: column; min-width: 0; background: #0d1319;">
            <!-- Tab 1: LoL Simgeleri -->
            <div id="c403-tab-league-content" style="flex: 1; display: flex; flex-direction: column; min-height: 0; overflow: hidden;">
              <!-- Header & Search -->
              <div style="padding: 16px 24px; border-bottom: 1px solid rgba(200, 170, 110, 0.15); display: flex; align-items: center; justify-content: space-between; gap: 16px;">
                <div style="position: relative; flex: 1; max-width: 380px;">
                  <input type="text" id="c403-icon-search" placeholder="Simge ID ile ara (örn: 588)..." style="
                    width: 100%; padding: 9px 36px 9px 12px; background: #070b0e;
                    border: 1px solid rgba(200, 170, 110, 0.3); border-radius: 4px;
                    color: #f0e6d2; font-size: 13px; outline: none; transition: all 0.2s ease;
                  ">
                  <button id="c403-clear-search" style="
                    position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
                    background: none; border: none; color: #a09b8c; cursor: pointer;
                    font-size: 16px; width: 22px; height: 22px; display: none;
                    align-items: center; justify-content: center;
                  ">×</button>
                </div>
                <div id="c403-search-info" style="color: #a09b8c; font-size: 12px;"></div>
                <button id="c403-close-btn-1" style="background:none;border:none;color:#7a8288;font-size:22px;cursor:pointer;line-height:1;">✕</button>
              </div>

              <!-- Grid -->
              <div id="c403-league-grid" class="c403-scroll" style="
                flex: 1; overflow-y: auto; display: grid;
                grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
                gap: 16px; padding: 24px; align-content: start;
              ">
                <div style="grid-column: 1 / -1; text-align: center; padding: 48px 0;">
                  <div style="display: inline-block; width: 32px; height: 32px; border: 3px solid rgba(200,170,110,0.2); border-top: 3px solid #c8aa6e; border-radius: 50%; animation: c403Spin 0.9s linear infinite; margin-bottom: 12px;"></div>
                  <div style="color: #a09b8c; font-size: 13px;">LoL simgeleri yükleniyor...</div>
                </div>
              </div>
            </div>

            <!-- Tab 2: Özel Simgeler -->
            <div id="c403-tab-custom-content" style="flex: 1; display: none; flex-direction: column; min-height: 0; overflow: hidden;">
              <div style="padding: 16px 24px; border-bottom: 1px solid rgba(200, 170, 110, 0.15); display: flex; align-items: center; justify-content: space-between;">
                <div style="color: #f0e6d2; font-size: 14px; font-weight: 600;">Özel Simge Yönetimi</div>
                <button id="c403-close-btn-2" style="background:none;border:none;color:#7a8288;font-size:22px;cursor:pointer;line-height:1;">✕</button>
              </div>

              <div style="flex: 1; display: grid; grid-template-columns: 320px 1fr; gap: 20px; padding: 20px; min-height: 0; overflow: hidden;">
                <!-- Sol Taraf: Yükleme & Önizleme -->
                <div style="
                  background: rgba(8, 13, 18, 0.7); border: 1px solid rgba(200, 170, 110, 0.2);
                  border-radius: 6px; padding: 20px; display: flex; flex-direction: column; gap: 14px;
                ">
                  <div style="color: #c8aa6e; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">Simge Ekle</div>

                  <!-- Dosya Seçimi -->
                  <div>
                    <input type="file" id="c403-file-input" accept="image/jpeg,image/png,image/gif,image/webp" style="display: none;">
                    <button id="c403-btn-choose-file" style="
                      width: 100%; padding: 10px; background: rgba(200, 170, 110, 0.15);
                      border: 1px solid rgba(200, 170, 110, 0.4); border-radius: 4px;
                      color: #f0e6d2; font-size: 12px; font-weight: 600; cursor: pointer;
                      transition: all 0.2s ease;
                    ">📁 Bilgisayardan Dosya Seç</button>
                    <div id="c403-file-label" style="color: #7a8288; font-size: 11px; margin-top: 6px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">Dosya seçilmedi</div>
                  </div>

                  <div style="display: flex; align-items: center; gap: 10px; color: #5c636a; font-size: 11px;">
                    <div style="flex: 1; height: 1px; background: rgba(200, 170, 110, 0.1);"></div>
                    <span>VEYA</span>
                    <div style="flex: 1; height: 1px; background: rgba(200, 170, 110, 0.1);"></div>
                  </div>

                  <!-- Link ile Ekleme -->
                  <div>
                    <input type="url" id="c403-url-input" placeholder="Görsel URL'si yapıştırın (https://...)" style="
                      width: 100%; padding: 9px 12px; background: #070b0e;
                      border: 1px solid rgba(200, 170, 110, 0.25); border-radius: 4px;
                      color: #f0e6d2; font-size: 12px; outline: none; box-sizing: border-box;
                    ">
                    <div id="c403-url-status" style="font-size: 11px; margin-top: 4px; min-height: 14px;"></div>
                  </div>

                  <!-- Önizleme -->
                  <div style="display: flex; flex-direction: column; align-items: center; margin-top: 4px;">
                    <div id="c403-preview-box" style="
                      width: 104px; height: 104px; border-radius: 50%;
                      border: 2px dashed rgba(200, 170, 110, 0.3);
                      display: flex; align-items: center; justify-content: center;
                      background: #070b0e; overflow: hidden;
                    ">
                      <span style="color: #5c636a; font-size: 11px;">Önizleme</span>
                    </div>
                  </div>

                  <button id="c403-btn-add-collection" disabled style="
                    width: 100%; padding: 11px; margin-top: auto;
                    background: #1e282d; border: 1px solid #323b44; border-radius: 4px;
                    color: #7a8288; font-size: 12px; font-weight: 700; cursor: not-allowed;
                    transition: all 0.2s ease; text-transform: uppercase; letter-spacing: 0.5px;
                  ">Koleksiyona Ekle</button>
                </div>

                <!-- Sağ Taraf: Koleksiyon Listesi -->
                <div style="
                  background: rgba(8, 13, 18, 0.7); border: 1px solid rgba(200, 170, 110, 0.2);
                  border-radius: 6px; padding: 20px; display: flex; flex-direction: column; min-height: 0;
                ">
                  <div style="color: #c8aa6e; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">Koleksiyonum</div>
                  <div id="c403-custom-grid" class="c403-scroll" style="
                    flex: 1; overflow-y: auto; display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
                    gap: 16px; align-content: start; padding-right: 6px;
                  ">
                    <div style="grid-column: 1 / -1; text-align: center; padding: 48px 16px; color: #7a8288;">
                      <div style="font-size: 32px; margin-bottom: 8px;">🖼️</div>
                      <div style="font-size: 13px; color: #a09b8c;">Henüz özel simge eklenmedi.</div>
                      <div style="font-size: 11px; margin-top: 4px;">Sol panelden bir dosya yükleyerek veya link ekleyerek simge oluşturabilirsiniz.</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      modal.appendChild(content);
      document.body.appendChild(modal);

      // Kapat butonları
      content.querySelector("#c403-close-btn-1").onclick = () => modal.remove();
      content.querySelector("#c403-close-btn-2").onclick = () => modal.remove();

      // Sekme geçişleri
      const tabLeague = content.querySelector("#c403-tab-league");
      const tabCustom = content.querySelector("#c403-tab-custom");
      const tabLeagueContent = content.querySelector("#c403-tab-league-content");
      const tabCustomContent = content.querySelector("#c403-tab-custom-content");

      tabLeague.onclick = () => {
        tabLeague.classList.add("active");
        tabCustom.classList.remove("active");
        tabLeagueContent.style.display = "flex";
        tabCustomContent.style.display = "none";
      };

      tabCustom.onclick = () => {
        tabCustom.classList.add("active");
        tabLeague.classList.remove("active");
        tabCustomContent.style.display = "flex";
        tabLeagueContent.style.display = "none";
        this.loadCustomIconsUI(content);
      };

      // Sıfırla
      const revertBtn = content.querySelector("#c403-btn-revert");
      revertBtn.onclick = async () => {
        await safeDataStore.set(CONFIG.DATASTORE_KEY, null);
        await safeDataStore.set(CONFIG.CUSTOM_ICON_KEY, null);
        await safeDataStore.set(CONFIG.LEGACY_DATASTORE_KEY, null);
        await safeDataStore.set(CONFIG.LEGACY_CUSTOM_ICON_KEY, null);
        this.revertIcon();
        modal.remove();
        showToast("Orijinal sihirdar simgesi geri yüklendi.", "success");
      };

      // LoL Katalog & Arama
      const grid = content.querySelector("#c403-league-grid");
      const searchInput = content.querySelector("#c403-icon-search");
      const clearBtn = content.querySelector("#c403-clear-search");
      const searchInfo = content.querySelector("#c403-search-info");

      let allIcons = [];

      const renderLeagueIcons = (iconsToShow, page = 0) => {
        grid.innerHTML = "";
        if (!iconsToShow || iconsToShow.length === 0) {
          grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 48px 0; color: #7a8288; font-size: 13px;">Eşleşen simge bulunamadı.</div>';
          return;
        }

        const pageSize = 120;
        const slice = iconsToShow.slice(page * pageSize, (page + 1) * pageSize);

        slice.forEach((icon) => {
          const img = document.createElement("img");
          img.className = "c403-icon-item";
          img.loading = "lazy";
          img.decoding = "async";
          img.title = `ID: ${icon.id}`;
          img.alt = `Simge ${icon.id}`;
          img.src = `/lol-game-data/assets/v1/profile-icons/${icon.id}.jpg`;
          img.onerror = () => img.remove();

          img.onclick = async () => {
            await safeDataStore.set(CONFIG.DATASTORE_KEY, icon.id);
            await safeDataStore.set(CONFIG.CUSTOM_ICON_KEY, null);
            await this.applyCustomIcon();
            showToast(`Sihirdar simgesi değiştirildi (ID: ${icon.id})`, "success");
            modal.remove();
          };

          grid.appendChild(img);
        });

        const totalPages = Math.ceil(iconsToShow.length / pageSize);
        if (totalPages > 1) {
          const pager = document.createElement("div");
          pager.style.cssText = "grid-column: 1 / -1; display: flex; gap: 12px; justify-content: center; align-items: center; padding: 16px 0; color: #a09b8c; font-size: 12px;";

          const prevBtn = document.createElement("button");
          prevBtn.textContent = "« Önceki";
          prevBtn.disabled = page === 0;
          prevBtn.style.cssText = `padding: 6px 12px; background: rgba(200,170,110,0.1); border: 1px solid rgba(200,170,110,0.3); border-radius: 4px; color: ${page === 0 ? "#5c636a" : "#c8aa6e"}; cursor: ${page === 0 ? "default" : "pointer"};`;
          prevBtn.onclick = () => renderLeagueIcons(iconsToShow, page - 1);

          const pageText = document.createElement("span");
          pageText.textContent = `${page + 1} / ${totalPages}`;

          const nextBtn = document.createElement("button");
          nextBtn.textContent = "Sonraki »";
          nextBtn.disabled = page + 1 >= totalPages;
          nextBtn.style.cssText = `padding: 6px 12px; background: rgba(200,170,110,0.1); border: 1px solid rgba(200,170,110,0.3); border-radius: 4px; color: ${page + 1 >= totalPages ? "#5c636a" : "#c8aa6e"}; cursor: ${page + 1 >= totalPages ? "default" : "pointer"};`;
          nextBtn.onclick = () => renderLeagueIcons(iconsToShow, page + 1);

          pager.append(prevBtn, pageText, nextBtn);
          grid.appendChild(pager);
        }
      };

      const filterIcons = (term) => {
        const filtered = term
          ? allIcons.filter((i) => i.id.toString().includes(term))
          : allIcons;
        searchInfo.textContent = term
          ? `${filtered.length} / ${allIcons.length} simge`
          : `${allIcons.length} simge`;
        renderLeagueIcons(filtered, 0);
      };

      searchInput.oninput = (e) => {
        const term = e.target.value.trim().toLowerCase();
        clearBtn.style.display = term ? "flex" : "none";
        filterIcons(term);
      };

      clearBtn.onclick = () => {
        searchInput.value = "";
        clearBtn.style.display = "none";
        filterIcons("");
        searchInput.focus();
      };

      try {
        allIcons = await this.loadIconCatalog();
        if (modal.isConnected) {
          filterIcons("");
        }
      } catch (err) {
        if (modal.isConnected) {
          grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 48px 0; color: #ff4655;">Simgeler yüklenemedi. Lütfen internet bağlantınızı kontrol edin.</div>';
        }
      }

      // Özel Simge Yükleme Kontrolleri
      const fileInput = content.querySelector("#c403-file-input");
      const chooseFileBtn = content.querySelector("#c403-btn-choose-file");
      const fileLabel = content.querySelector("#c403-file-label");
      const urlInput = content.querySelector("#c403-url-input");
      const urlStatus = content.querySelector("#c403-url-status");
      const previewBox = content.querySelector("#c403-preview-box");
      const addCollectionBtn = content.querySelector("#c403-btn-add-collection");

      let pendingData = null;
      let pendingSource = null;

      const resetPending = () => {
        pendingData = null;
        pendingSource = null;
        addCollectionBtn.disabled = true;
        addCollectionBtn.style.background = "#1e282d";
        addCollectionBtn.style.borderColor = "#323b44";
        addCollectionBtn.style.color = "#7a8288";
        addCollectionBtn.style.cursor = "not-allowed";
        previewBox.innerHTML = '<span style="color: #5c636a; font-size: 11px;">Önizleme</span>';
      };

      const setReadyPending = (dataUrl, labelText) => {
        previewBox.innerHTML = `<img src="${dataUrl}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
        addCollectionBtn.disabled = false;
        addCollectionBtn.style.background = "linear-gradient(135deg, #c8aa6e, #a08040)";
        addCollectionBtn.style.borderColor = "#f0e6d2";
        addCollectionBtn.style.color = "#070b0e";
        addCollectionBtn.style.cursor = "pointer";
      };

      chooseFileBtn.onclick = () => fileInput.click();

      fileInput.onchange = async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;

        const val = validateImageFile(file);
        if (!val.valid) {
          showToast(val.error, "error");
          fileInput.value = "";
          fileLabel.textContent = "Dosya seçilmedi";
          resetPending();
          return;
        }

        fileLabel.textContent = file.name;
        urlInput.value = "";
        urlStatus.textContent = "";

        try {
          previewBox.innerHTML = '<div style="width: 22px; height: 22px; border: 2px solid rgba(200,170,110,0.2); border-top: 2px solid #c8aa6e; border-radius: 50%; animation: c403Spin 0.9s linear infinite;"></div>';
          const processed = await processImageFile(file);
          pendingData = { ...processed, name: file.name };
          pendingSource = "file";
          setReadyPending(processed.dataUrl, file.name);
        } catch (err) {
          showToast("Görsel işlenemedi.", "error");
          resetPending();
        }
      };

      let urlDebounce = null;
      urlInput.oninput = () => {
        const url = urlInput.value.trim();
        clearTimeout(urlDebounce);
        if (!url) {
          urlStatus.textContent = "";
          resetPending();
          return;
        }

        const val = validateImageUrl(url);
        if (!val.valid) {
          urlStatus.style.color = "#ff4655";
          urlStatus.textContent = val.error;
          resetPending();
          return;
        }

        urlStatus.style.color = "#c8aa6e";
        urlStatus.textContent = "Görsel yükleniyor...";
        urlDebounce = setTimeout(async () => {
          try {
            previewBox.innerHTML = '<div style="width: 22px; height: 22px; border: 2px solid rgba(200,170,110,0.2); border-top: 2px solid #c8aa6e; border-radius: 50%; animation: c403Spin 0.9s linear infinite;"></div>';
            const imgData = await loadImageFromUrl(url);
            pendingData = imgData;
            pendingSource = "url";
            urlStatus.style.color = "#0ac8b9";
            urlStatus.textContent = `Görsel yüklendi (${imgData.width}x${imgData.height})`;
            setReadyPending(imgData.dataUrl, "URL");
          } catch (err) {
            urlStatus.style.color = "#ff4655";
            urlStatus.textContent = "Görsel indirilemedi. Bağlantıyı kontrol edin.";
            resetPending();
          }
        }, 600);
      };

      addCollectionBtn.onclick = async () => {
        if (!pendingData || !pendingSource) return;

        let name = "Özel Simge";
        if (pendingSource === "file") {
          name = pendingData.name || "Dosya";
        } else {
          try {
            const u = new URL(pendingData.originalUrl);
            name = u.pathname.split("/").pop() || "Web Görseli";
          } catch {
            name = "Web Görseli";
          }
        }

        await this.addCustomIcon(name, pendingData.dataUrl);
        showToast("Özel simge koleksiyona eklendi!", "success");

        urlInput.value = "";
        fileInput.value = "";
        fileLabel.textContent = "Dosya seçilmedi";
        urlStatus.textContent = "";
        resetPending();

        this.loadCustomIconsUI(content);
      };
    }

    async addCustomIcon(name, dataUrl) {
      const list = (await safeDataStore.get(CONFIG.CUSTOM_ICONS_LIST_KEY, CONFIG.LEGACY_CUSTOM_ICONS_LIST_KEY)) || [];
      list.push({
        id: Date.now().toString(),
        name,
        dataUrl,
        addedAt: new Date().toISOString(),
      });
      await safeDataStore.set(CONFIG.CUSTOM_ICONS_LIST_KEY, list);
    }

    async removeCustomIcon(iconId) {
      const list = (await safeDataStore.get(CONFIG.CUSTOM_ICONS_LIST_KEY, CONFIG.LEGACY_CUSTOM_ICONS_LIST_KEY)) || [];
      const updated = list.filter((i) => i.id !== iconId);
      await safeDataStore.set(CONFIG.CUSTOM_ICONS_LIST_KEY, updated);
    }

    async loadCustomIconsUI(content) {
      const grid = content.querySelector("#c403-custom-grid");
      if (!grid) return;

      const list = (await safeDataStore.get(CONFIG.CUSTOM_ICONS_LIST_KEY, CONFIG.LEGACY_CUSTOM_ICONS_LIST_KEY)) || [];
      if (list.length === 0) {
        grid.innerHTML = `
          <div style="grid-column: 1 / -1; text-align: center; padding: 48px 16px; color: #7a8288;">
            <div style="font-size: 32px; margin-bottom: 8px;">🖼️</div>
            <div style="font-size: 13px; color: #a09b8c;">Henüz özel simge eklenmedi.</div>
            <div style="font-size: 11px; margin-top: 4px;">Sol panelden bir dosya yükleyerek veya link ekleyerek simge oluşturabilirsiniz.</div>
          </div>
        `;
        return;
      }

      grid.innerHTML = "";
      list.forEach((icon) => {
        const card = document.createElement("div");
        card.className = "c403-custom-card";

        const img = document.createElement("img");
        img.src = icon.dataUrl;
        img.title = "Uygulamak için tıkla: " + icon.name;
        img.style.cssText = "width: 76px; height: 76px; border-radius: 50%; cursor: pointer; object-fit: cover; border: 2px solid rgba(200, 170, 110, 0.3); transition: all 0.2s ease;";
        img.onmouseover = () => { img.style.borderColor = "#c8aa6e"; img.style.transform = "scale(1.05)"; };
        img.onmouseout = () => { img.style.borderColor = "rgba(200, 170, 110, 0.3)"; img.style.transform = "scale(1)"; };

        img.onclick = async () => {
          await safeDataStore.set(CONFIG.CUSTOM_ICON_KEY, icon.dataUrl);
          await safeDataStore.set(CONFIG.DATASTORE_KEY, null);
          await this.applyCustomIcon();
          showToast(`Özel simge uygulandı: ${icon.name}`, "success");
          document.getElementById(CONFIG.MODAL_ID)?.remove();
        };

        const label = document.createElement("div");
        label.textContent = icon.name.length > 14 ? icon.name.substring(0, 12) + "..." : icon.name;
        label.title = icon.name;
        label.style.cssText = "color: #f0e6d2; font-size: 11px; text-align: center; width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;";

        const deleteBtn = document.createElement("button");
        deleteBtn.innerHTML = "🗑️";
        deleteBtn.title = "Sil";
        deleteBtn.style.cssText = "background: none; border: none; cursor: pointer; font-size: 11px; opacity: 0.6; transition: opacity 0.2s ease; padding: 2px;";
        deleteBtn.onmouseover = () => { deleteBtn.style.opacity = "1"; };
        deleteBtn.onmouseout = () => { deleteBtn.style.opacity = "0.6"; };

        deleteBtn.onclick = async (e) => {
          e.stopPropagation();
          if (confirm(`"${icon.name}" simgesini koleksiyondan silmek istediğinize emin misiniz?`)) {
            await this.removeCustomIcon(icon.id);
            showToast("Özel simge silindi.", "info");
            this.loadCustomIconsUI(content);
          }
        };

        const bottomRow = document.createElement("div");
        bottomRow.style.cssText = "display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 0 4px;";
        bottomRow.appendChild(label);
        bottomRow.appendChild(deleteBtn);

        card.appendChild(img);
        card.appendChild(bottomRow);
        grid.appendChild(card);
      });
    }
  }

  // 403Changer Mod Ayar Çarkı Kaydı
  window.__c403ModSettings = window.__c403ModSettings || {};
  window.__c403ModSettings["iconswapper"] = () => {
    if (window.iconSwapper) {
      window.iconSwapper.showIconModal();
    } else {
      window.iconSwapper = new IconSwapper();
      window.iconSwapper.showIconModal();
    }
  };

  const startInstance = () => {
    if (!window.iconSwapper) {
      window.iconSwapper = new IconSwapper();
    }
  };

  if (document.readyState === "complete" || document.readyState === "interactive") {
    startInstance();
  } else {
    window.addEventListener("load", startInstance);
  }
})();
