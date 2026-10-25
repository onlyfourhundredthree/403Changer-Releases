/**
 * 403Changer - 3D Kostüm Görüntüleyici (3D Skin Viewer)
 *
 * @name         3DSkinViewer
 * @author       Ventoba (403Changer Entegrasyonu)
 * @description  Şampiyon kostümlerini incelerken 3D modelini, tüm animasyonlarını ve parçalarını incelemenizi sağlar.
 * @version      1.1.0
 */

(function () {
  "use strict";

  if (window.__c403SkinViewer3DLoaded) return;
  window.__c403SkinViewer3DLoaded = true;

  const CONFIG_KEY = "c403-skinviewer-settings";
  const MODAL_ID = "c403-skinviewer-info-modal";

  const DEFAULT_CONFIG = {
    mapBgEnabled: true,
    preloadingEnabled: true,
  };

  const loadConfig = () => {
    try {
      if (window.DataStore && typeof window.DataStore.get === "function") {
        const val = window.DataStore.get(CONFIG_KEY);
        if (val) return { ...DEFAULT_CONFIG, ...(typeof val === "string" ? JSON.parse(val) : val) };
      }
      const raw = localStorage.getItem(CONFIG_KEY);
      if (raw) return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    } catch (e) {}
    return { ...DEFAULT_CONFIG };
  };

  const saveConfig = (cfg) => {
    try {
      if (window.DataStore && typeof window.DataStore.set === "function") {
        window.DataStore.set(CONFIG_KEY, JSON.stringify(cfg));
      }
      localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
    } catch (e) {}
  };

  let CONFIG = loadConfig();

  let preloadedUrl = null;
  let eyeOverlay = null;
  let loopInterval = null;

  let championSummaryPromise = null;

  function getChampionSummary() {
    if (!championSummaryPromise) {
      championSummaryPromise = fetch("/lol-game-data/assets/v1/champion-summary.json")
        .then((res) => (res.ok ? res.json() : []))
        .catch(() => []);
    }
    return championSummaryPromise;
  }

  function parseSkinFromElement(el) {
    if (!el) return null;
    const style = el.style?.backgroundImage || window.getComputedStyle(el).backgroundImage || "";
    const match = style.match(/\/Characters\/([a-zA-Z0-9]+)\/Skins\/(Skin\d+|Base)\//i);
    if (!match) return null;
    return { champAlias: match[1], skinPath: match[2] };
  }

  async function toSkinInfo(champAlias, skinPath) {
    const alias = String(champAlias || "").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!alias) return null;

    const lc = skinPath ? String(skinPath).toLowerCase() : "base";
    const skinIndex = lc === "base" ? 0 : (parseInt(lc.replace("skin", ""), 10) || 0);

    const data = await getChampionSummary();
    if (!Array.isArray(data)) return null;
    const ch = data.find((c) => (c.alias || "").toLowerCase() === alias);
    if (!ch) return null;
    return { champAlias: alias, skinId: ch.id * 1000 + skinIndex, skinIndex };
  }

  async function resolveActiveSkin() {
    // Scan for the explicitly active thumbnail block natively
    const activeThumb = document.querySelector(".thumbnail-wrapper.active-skin .cdp-skin-thumbnail-img");
    let info = parseSkinFromElement(activeThumb);

    // Fallback for baseline character overview
    if (!info) {
      const bd = Array.from(document.querySelectorAll("img.cdp-backdrop-img"))
        .reverse()
        .find((img) => img.src && img.src.includes("/Characters/"));
      if (bd) info = parseSkinFromElement(bd);
    }

    // Bulunamadıysa yanlış şampiyon (eski "ahri" varsayılanı) göstermek yerine
    // hiç açmayalım.
    if (!info) return null;
    return toSkinInfo(info.champAlias, info.skinPath);
  }

  // Göz düğmesini fare hareketine göre konumlandırma: her mousemove'da tüm
  // kartların ölçüsünü almak yerine sadece hedef değiştiğinde çalışır.
  let eyeTrackingBound = false;
  function ensureEyeTracking() {
    if (eyeTrackingBound) return;
    eyeTrackingBound = true;

    let eyeRaf = 0;
    const hideEye = () => {
      if (eyeOverlay) eyeOverlay.style.display = "none";
    };

    const trackEye = (target) => {
      if (!eyeOverlay || !target) return;
      const section = document.querySelector(".cdp-skins-section");
      if (!section || window.getComputedStyle(section).display === "none") {
        hideEye();
        return;
      }
      if (eyeOverlay.contains(target)) return;

      const hoveredThumb = target.closest && target.closest(".thumbnail-wrapper, .buffer-wrapper");
      if (!hoveredThumb) {
        hideEye();
        return;
      }

      const r = hoveredThumb.getBoundingClientRect();
      if (!r.width || !r.height) {
        hideEye();
        return;
      }

      let maxArea = 0;
      document.querySelectorAll(".thumbnail-wrapper, .buffer-wrapper").forEach((t) => {
        const tr = t.getBoundingClientRect();
        const area = tr.width * tr.height;
        if (area > maxArea) maxArea = area;
      });

      const myArea = r.width * r.height;
      if (maxArea > 0 && Math.abs(maxArea - myArea) < 6) {
        const skinEl = hoveredThumb.querySelector(".cdp-skin-thumbnail-img") || hoveredThumb;
        eyeOverlay._skinInfo = parseSkinFromElement(skinEl);
        eyeOverlay.style.left = r.left + r.width / 2 - 24 + "px";
        eyeOverlay.style.top = r.top + r.height / 2 - 24 + "px";
        eyeOverlay.style.display = "flex";
      } else {
        hideEye();
      }
    };

    document.addEventListener("pointerover", (e) => {
      if (eyeRaf) return;
      eyeRaf = requestAnimationFrame(() => {
        eyeRaf = 0;
        trackEye(e.target);
      });
    });

    document.addEventListener("pointerout", (e) => {
      const to = e.relatedTarget;
      if (to && (to.closest?.(".thumbnail-wrapper, .buffer-wrapper") || eyeOverlay?.contains(to))) return;
      hideEye();
    });
  }

  function initWatcher() {
    if (loopInterval) clearInterval(loopInterval);

    let busy = false;
    loopInterval = setInterval(async () => {
      if (busy || document.hidden) return;
      busy = true;
      try {
        const skinsSection = document.querySelector(".cdp-skins-section");
        const isSkinsTab = skinsSection && window.getComputedStyle(skinsSection).display !== "none";

        if (!isSkinsTab) {
          if (eyeOverlay) eyeOverlay.style.display = "none";
          return;
        }

      // Pre-load current skin model into browser cache if enabled
      if (CONFIG.preloadingEnabled) {
        const sInfo = await resolveActiveSkin();
        if (sInfo) {
          const targetGlb = `https://cdn.modelviewer.lol/lol/models/${sInfo.champAlias}/${sInfo.skinId}/model.glb`;
          if (preloadedUrl !== targetGlb) {
            preloadedUrl = targetGlb;
            fetch(targetGlb).catch(() => {});
            fetch("https://cdn.jsdelivr.net/npm/three@0.163.0/build/three.module.js").catch(() => {});
            fetch("https://cdn.jsdelivr.net/npm/three@0.163.0/examples/jsm/loaders/GLTFLoader.js").catch(() => {});
            fetch("https://cdn.jsdelivr.net/npm/three@0.163.0/examples/jsm/controls/OrbitControls.js").catch(() => {});
          }
        }
      }

      // Ensure eye overlay button exists
      if (!eyeOverlay || !document.body.contains(eyeOverlay)) {
        eyeOverlay = document.createElement("div");
        eyeOverlay.className = "c403-3d-eye-btn";
        eyeOverlay.title = "3D Kostüm Görüntüleyici (403Changer)";
        eyeOverlay.innerHTML = `
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c8aa6e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        `;
        eyeOverlay.style.cssText = `
          position: fixed; z-index: 99999; cursor: pointer; padding: 12px;
          background: rgba(10, 14, 20, 0.95); border: 1px solid rgba(200, 170, 110, 0.7);
          border-radius: 50%; display: none; align-items: center; justify-content: center;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.8), 0 0 10px rgba(200, 170, 110, 0.3);
          transition: background 0.2s, transform 0.2s, border-color 0.2s; pointer-events: auto;
        `;
        eyeOverlay.onmouseover = () => {
          eyeOverlay.style.background = "rgba(25, 34, 46, 0.98)";
          eyeOverlay.style.borderColor = "#f0e6d2";
          eyeOverlay.style.transform = "scale(1.15)";
        };
        eyeOverlay.onmouseout = () => {
          eyeOverlay.style.background = "rgba(10, 14, 20, 0.95)";
          eyeOverlay.style.borderColor = "rgba(200, 170, 110, 0.7)";
          eyeOverlay.style.transform = "scale(1)";
        };
        eyeOverlay.addEventListener("click", (e) => {
          e.stopPropagation();
          e.preventDefault();
          open3DViewer(eyeOverlay._skinInfo || null);
        });
        document.body.appendChild(eyeOverlay);
        ensureEyeTracking();
      }
      } finally {
        busy = false;
      }
    }, 1000);
  }

  async function open3DViewer(skinHint = null) {
    if (document.getElementById("c403-3d-overlay")) return;

    const overlay = document.createElement("div");
    overlay.id = "c403-3d-overlay";
    overlay.style.cssText = `
      position: fixed; inset: 0; width: 100vw; height: 100vh;
      background: rgba(4, 7, 11, 0.92); z-index: 9999999;
      display: flex; flex-direction: column; justify-content: center; align-items: center;
      backdrop-filter: blur(12px); font-family: 'Beaufort for LOL', 'Segoe UI', sans-serif;
    `;

    const closeBtn = document.createElement("div");
    closeBtn.innerHTML = `
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#c8aa6e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    `;
    closeBtn.title = "Kapat (ESC)";
    closeBtn.style.cssText = `
      position: absolute; top: 24px; right: 32px; cursor: pointer; color: #c8aa6e; z-index: 10000000;
      padding: 10px; border: 1px solid rgba(200, 170, 110, 0.4); border-radius: 50%;
      background: rgba(10, 14, 20, 0.9); display: flex; align-items: center; justify-content: center;
      transition: all 0.2s ease;
    `;
    closeBtn.onmouseover = () => {
      closeBtn.style.background = "rgba(200, 170, 110, 0.25)";
      closeBtn.style.borderColor = "#c8aa6e";
    };
    closeBtn.onmouseout = () => {
      closeBtn.style.background = "rgba(10, 14, 20, 0.9)";
      closeBtn.style.borderColor = "rgba(200, 170, 110, 0.4)";
    };

    let iframe = null;
    let watchdogToken = null;
    let closed = false;

    const escListener = (e) => {
      if (e.key === "Escape") cleanupViewer();
    };

    const cleanupViewer = () => {
      if (closed) return;
      closed = true;
      if (watchdogToken) {
        clearInterval(watchdogToken);
        watchdogToken = null;
      }
      window.removeEventListener("keydown", escListener);
      overlay.style.display = "none";
      if (iframe) iframe.src = "about:blank";
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }, 50);
      });
    };

    closeBtn.addEventListener("click", cleanupViewer);
    window.addEventListener("keydown", escListener);

    iframe = document.createElement("iframe");
    iframe.setAttribute("allowfullscreen", "");
    iframe.allow = "fullscreen";
    iframe.style.cssText = `
      width: 94%; height: 90%;
      border: 1px solid rgba(200, 170, 110, 0.4);
      border-radius: 8px; box-shadow: 0 16px 64px rgba(0, 0, 0, 0.85);
      background: #010a13;
    `;

    overlay.appendChild(closeBtn);
    overlay.appendChild(iframe);
    document.body.appendChild(overlay);

    // Watchdog: If Gameflow phase changes to ReadyCheck, ChampSelect, etc., auto-close
    let watchdogBusy = false;
    watchdogToken = setInterval(async () => {
      if (watchdogBusy) return;
      watchdogBusy = true;
      try {
        const res = await fetch("/lol-gameflow/v1/gameflow-phase");
        const phase = await res.text();
        if (
          phase.includes("ReadyCheck") ||
          phase.includes("ChampSelect") ||
          phase.includes("InProgress") ||
          phase.includes("PreEndOfGame")
        ) {
          cleanupViewer();
        }
      } catch (e) {
      } finally {
        watchdogBusy = false;
      }
    }, 900);

    const sInfo = skinHint
      ? await toSkinInfo(skinHint.champAlias, skinHint.skinPath)
      : await resolveActiveSkin();
    if (!sInfo) {
      const message = document.createElement("div");
      message.textContent = "Aktif kostüm kimliği tespit edilemedi. Kostüm sekmesinde bir kostüm seçip tekrar deneyin.";
      message.style.cssText = "position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#ff4655;font-size:14px;text-align:center;max-width:70%;line-height:1.5;";
      overlay.appendChild(message);
      setTimeout(cleanupViewer, 2600);
      return;
    }

    loadCustomViewer(iframe, sInfo.champAlias, sInfo.skinId);
  }

  function loadCustomViewer(iframe, champAlias, skinId) {
    const modelUrl = `https://cdn.modelviewer.lol/lol/models/${champAlias}/${skinId}/model.glb`;

    iframe.srcdoc = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { 
        background-color: #010a13; 
        background-size: cover; background-position: center; background-repeat: no-repeat;
        overflow:hidden; font-family:'Beaufort for LOL',Arial,sans-serif; color:#a09b8c; 
        transition: background-image 0.4s ease-in-out;
    }
    body.map-bg {
        background-image: 
            radial-gradient(ellipse at 50% 120%, rgba(34,85,34,0.45) 0%, rgba(1,10,19,0) 70%),
            radial-gradient(ellipse at 20% 80%, rgba(20,60,20,0.35) 0%, rgba(1,10,19,0) 50%),
            radial-gradient(ellipse at 80% 90%, rgba(30,70,30,0.25) 0%, rgba(1,10,19,0) 50%),
            linear-gradient(180deg, rgba(10,25,40,0.85) 0%, rgba(15,40,20,0.55) 50%, rgba(30,60,30,0.35) 100%),
            url('https://raw.githubusercontent.com/Ventoba/3DSkinViewer/main/3DSkinViewer/SRbackground.jfif');
        background-color: #0a1a10;
    }
    #canvas-container { width:100vw; height:100vh; position:relative; }
    canvas { display:block; cursor: default; }

    #controls {
        position:absolute; bottom:20px; left:0; right:0; margin:0 auto;
        background: rgba(10,14,20,0.94); border: 1px solid rgba(200,170,110,0.35);
        border-radius: 6px; padding: 10px 16px; -webkit-font-smoothing: antialiased;
        display: none; flex-direction: column; gap: 8px;
        width: 440px; max-width: 90vw; z-index: 10;
        box-shadow: 0 8px 32px rgba(0,0,0,0.7);
    }
    .ctrl-row { display: flex; align-items: center; gap: 8px; width: 100%; }
    #controls label { color: #c8aa6e; font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap; }
    #controls select, #controls button, .cdropdown-trigger {
        background: rgba(13,19,25,0.9); color: #f0e6d2; border: 1px solid rgba(200,170,110,0.3);
        border-radius: 4px; padding: 4px 8px; font-size: 11px; cursor: pointer;
        font-family: 'Beaufort for LOL', Arial, sans-serif;
        height: 26px; line-height: 16px; transition: all 0.2s ease;
    }
    #controls select { max-width: 140px; }
    #controls button:hover, .cdropdown-trigger:hover { border-color: #c8aa6e; background: rgba(200,170,110,0.18); }
    .cdropdown { position: relative; flex: 1; }
    .cdropdown-trigger { display: flex; align-items: center; justify-content: space-between; width: 100%; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .cdropdown-trigger::after { content: '▼'; font-size: 8px; margin-left: 6px; opacity: 0.7; }
    .cdropdown-list {
        display: none; position: absolute; bottom: 100%; left: 0; right: 0;
        background: rgba(10,14,20,0.98); border: 1px solid rgba(200,170,110,0.45);
        border-radius: 4px; max-height: 220px; overflow-y: auto; z-index: 100;
        margin-bottom: 4px; box-shadow: 0 10px 30px rgba(0,0,0,0.85);
    }
    .cdropdown-list.open { display: block; }
    .cdropdown-item {
        padding: 6px 10px; font-size: 11px; color: #a09b8c; cursor: pointer;
        font-family: 'Beaufort for LOL', Arial, sans-serif; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .cdropdown-item:hover { background: rgba(200,170,110,0.2); color: #f0e6d2; }
    .cdropdown-item.active { color: #c8aa6e; background: rgba(200,170,110,0.12); font-weight: bold; }
    .cdropdown-list::-webkit-scrollbar { width: 5px; }
    .cdropdown-list::-webkit-scrollbar-thumb { background: rgba(200,170,110,0.3); border-radius: 3px; }
    #timeline, #auto-rotate, #speed-slider {
        flex: 1; -webkit-appearance: none; appearance: none;
        height: 4px; background: rgba(200,170,110,0.2); border-radius: 2px; outline: none; cursor: pointer;
    }
    #timeline::-webkit-slider-thumb, #auto-rotate::-webkit-slider-thumb, #speed-slider::-webkit-slider-thumb {
        -webkit-appearance: none; width: 12px; height: 12px;
        background: #c8aa6e; border-radius: 50%; cursor: pointer;
    }
    #time-display { color: #7a8288; font-size: 10px; min-width: 70px; text-align: right; white-space: nowrap; }

    #loading { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); color:#c8aa6e; font-size:14px; text-align:center; letter-spacing:1px; }
    #hint { position:absolute; top:16px; left:50%; transform:translateX(-50%); color:rgba(200,170,110,0.6); font-size:11px; letter-spacing:0.5px; pointer-events:none; text-align:center; background: rgba(0,0,0,0.4); padding: 4px 12px; border-radius: 12px; border: 1px solid rgba(200,170,110,0.2); }
    #error { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); color:#ff4655; font-size:13px; text-align:center; display:none; }

    #side-panel {
        position: absolute; right: 16px; top: 16px; width: 230px;
        background: rgba(10,14,20,0.88); border: 1px solid rgba(200,170,110,0.3);
        border-radius: 6px; padding: 12px; backdrop-filter: blur(8px);
        display: none; flex-direction: column; gap: 8px; z-index: 10;
        max-height: 80vh; overflow-y: auto;
    }
    .panel-section-title {
        color: #c8aa6e; font-size: 11px; text-transform: uppercase; letter-spacing: 1.2px; font-weight: bold;
        border-bottom: 1px solid rgba(200,170,110,0.2); padding-bottom: 4px; margin-bottom: 6px;
    }
    .toggle-row {
        display: flex; align-items: center; justify-content: space-between;
        margin-bottom: 6px; font-size: 11px; color: #a09b8c;
    }
    .toggle-row input { accent-color: #c8aa6e; cursor: pointer; flex-shrink: 0; }
    .toggle-row label { cursor: pointer; flex: 1; margin-left: 6px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .action-btn {
        background: rgba(20,26,34,0.9); color: #f0e6d2; border: 1px solid rgba(200,170,110,0.3);
        border-radius: 3px; padding: 4px 0; font-size: 10px; cursor: pointer; text-align: center; width: 100%; transition: all 0.2s ease;
    }
    .action-btn:hover { border-color: #c8aa6e; background: rgba(200,170,110,0.15); }
    #side-panel::-webkit-scrollbar { width: 5px; }
    #side-panel::-webkit-scrollbar-thumb { background: rgba(200,170,110,0.3); border-radius: 3px; }
</style>
</head><body class="${CONFIG.mapBgEnabled ? "map-bg" : ""}">
<div id="canvas-container">
    <div id="hint">Sol Tık: Döndür &nbsp;|&nbsp; Sağ Tık: Kaydır &nbsp;|&nbsp; Tekerlek: Yakınlaştır</div>
    <div id="loading">3D Model Yükleniyor...</div>
    <div id="error">Model bulunamadı veya yüklenemedi.</div>
</div>
<div id="controls">
    <div class="ctrl-row">
        <label>Animasyon</label>
        <div class="cdropdown" id="anim-dropdown">
            <div class="cdropdown-trigger" id="anim-trigger">Bekleme (Idle)</div>
            <div class="cdropdown-list" id="anim-list"></div>
        </div>
        <button id="btn-playpause" style="padding:2px 8px; display:flex; align-items:center; justify-content:center;">
          <svg id="icon-pause" width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
          <svg id="icon-play" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="display:none;"><polygon points="5,3 19,12 5,21"/></svg>
        </button>
        <button id="btn-reset" style="color:#ff4655; border-color:rgba(255,70,85,0.4);">Sıfırla</button>
    </div>
    <div class="ctrl-row">
        <input type="range" id="timeline" min="0" max="100" value="0" step="0.1">
        <span id="time-display">0.0s / 0.0s</span>
    </div>
    <div class="ctrl-row" style="margin-top: 4px;">
        <label style="color:#a09b8c; font-size:10px; margin-right:8px;">Hız</label>
        <input type="range" id="speed-slider" min="0.25" max="2" value="1" step="0.25">
        <span id="speed-display" style="font-size:10px; color:#a09b8c; min-width:28px; text-align:right;">1.0x</span>
    </div>
    <div class="ctrl-row" style="margin-top: 4px;">
        <label style="color:#a09b8c; font-size:10px; margin-right:8px;">Oto Döndürme</label>
        <input type="range" id="auto-rotate" min="0" max="120" value="0">
    </div>
</div>
<button id="btn-fs" title="Tam Ekran" style="position:absolute; bottom:16px; right:16px; background:rgba(10,14,20,0.85); border:1px solid rgba(200,170,110,0.3); border-radius:4px; padding:6px; cursor:pointer; color:#c8aa6e; z-index:10; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(8px);">
    <svg id="icon-fs-enter" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
    <svg id="icon-fs-exit" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="display:none;"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>
</button>
<div style="position:absolute; bottom:10px; left:10px; font-size:10px; color:rgba(200,170,110,0.5); font-family:sans-serif; pointer-events:none; z-index:10;">403Changer · Ventoba 3D Viewer</div>
<div id="side-panel">
    <div class="panel-section-title">Seçenekler</div>
    <div class="toggle-row"><input type="checkbox" id="opt-wireframe"><label for="opt-wireframe">Tel Çerçeve (Wireframe)</label></div>
    <div class="toggle-row"><input type="checkbox" id="opt-map-bg" ${CONFIG.mapBgEnabled ? "checked" : ""}><label for="opt-map-bg">Vadi Arka Planı</label></div>
    <div class="toggle-row"><input type="checkbox" id="opt-skeleton"><label for="opt-skeleton">İskelet Yapısı</label></div>
    <div class="panel-section-title" style="margin-top:10px;">Model Parçaları</div>
    <div style="display:flex;gap:4px;margin-bottom:8px;">
        <button id="btn-auto-hide" class="action-btn">Oto Gizle</button>
        <button id="btn-show-all" class="action-btn">Tümünü Göster</button>
    </div>
    <div id="parts-list"></div>
</div>

<script type="importmap">
{ "imports": {
    "three": "https://cdn.jsdelivr.net/npm/three@0.163.0/build/three.module.js",
    "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.163.0/examples/jsm/"
}}
<\/script>
<script type="module">
window.onerror = function(msg, url, line) {
    document.getElementById('loading').style.display = 'none';
    const e = document.getElementById('error');
    e.style.display = 'block';
    e.textContent = "Hata: " + msg;
};
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(30, window.innerWidth/window.innerHeight, 0.1, 2000);
const renderer = new THREE.WebGLRenderer({ antialias:true, alpha:true, powerPreference:'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.3;
document.getElementById('canvas-container').appendChild(renderer.domElement);

scene.add(new THREE.AmbientLight(0xffffff, 0.7));
const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
dirLight.position.set(5, 10, 7);
scene.add(dirLight);
const fillLight = new THREE.DirectionalLight(0x8888ff, 0.3);
fillLight.position.set(-5, 3, -5);
scene.add(fillLight);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = true;
controls.panSpeed = 0.8;
controls.screenSpacePanning = true;

const cvs = renderer.domElement;
cvs.addEventListener('mousedown', (e) => {
    if (e.button === 0) cvs.style.cursor = 'grabbing';
    else if (e.button === 2) cvs.style.cursor = 'move';
});
cvs.addEventListener('mouseup', () => { cvs.style.cursor = 'default'; });
cvs.addEventListener('mouseleave', () => { cvs.style.cursor = 'default'; });

let mixer = null, currentAction = null, cachedActions = [];
let clock = new THREE.Clock();
let isPlaying = true, isScrubbing = false, isAutoHideEnabled = true;
let skeletonHelper = null;
let meshList = [];

const loader = new GLTFLoader();
loader.load('${modelUrl}',
    (gltf) => {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('side-panel').style.display = 'flex';
        
        try {
            const btnReset = document.getElementById('btn-reset');
            const btnPlayPause = document.getElementById('btn-playpause');
            const optWireframe = document.getElementById('opt-wireframe');
            const optMapBg = document.getElementById('opt-map-bg');

            optMapBg.addEventListener('change', (e) => {
                document.body.classList.toggle('map-bg', e.target.checked);
            });

            optWireframe.addEventListener('change', (e) => {
                meshList.forEach(m => { if (m.material) m.material.wireframe = e.target.checked; });
            });

            const model = gltf.scene;
            const partsList = document.getElementById('parts-list');

            model.traverse(c => {
                if (c.isMesh) {
                    meshList.push(c);
                    if (c.material) {
                        c.material.alphaTest = 0.5;
                        c.material.transparent = true;
                        c.material.side = THREE.DoubleSide;
                    }

                    let nodeName = 'Unnamed';
                    if (c.material && c.material.name) {
                        nodeName = c.material.name;
                    } else {
                        nodeName = c.name || 'Unnamed';
                    }
                    c.userData.uiName = nodeName;
                    c.userData.khadaDefaultVisible = (c.material && c.material.userData && c.material.userData.visible !== undefined)
                        ? c.material.userData.visible : true;

                    const row = document.createElement('div');
                    row.className = 'toggle-row';
                    
                    const inp = document.createElement('input');
                    inp.type = 'checkbox';
                    inp.id = 'mesh-' + c.uuid;
                    inp.checked = c.userData.khadaDefaultVisible;
                    c.userData.inputRef = inp;
                    
                    const lbl = document.createElement('label');
                    lbl.htmlFor = inp.id;
                    lbl.title = nodeName;
                    lbl.textContent = nodeName;
                    
                    row.appendChild(inp);
                    row.appendChild(lbl);
                    
                    let origColor = c.material && c.material.color ? c.material.color.clone() : null;
                    row.addEventListener('mouseenter', () => { 
                        if (c.material && c.material.color) {
                            c.material.color.setRGB(
                                Math.min(1, origColor.r + 0.3),
                                Math.min(1, origColor.g + 0.3),
                                Math.min(1, origColor.b + 0.3)
                            );
                        }
                    });
                    row.addEventListener('mouseleave', () => { 
                        if (c.material && c.material.color && origColor) {
                            c.material.color.copy(origColor);
                        }
                    });
                    
                    inp.addEventListener('change', (e) => { 
                        isAutoHideEnabled = false; 
                        const btn = document.getElementById('btn-auto-hide');
                        if (btn) { btn.style.background = 'rgba(20,26,34,0.9)'; btn.style.borderColor = 'rgba(200,170,110,0.3)'; btn.style.color = '#f0e6d2'; }
                        c.visible = e.target.checked; 
                    });
                    partsList.appendChild(row);
                }
            });

            const applyAutoHide = () => {
                const hideKeywords = ['proxy', 'vfx', 'bounds', 'shadow', 'recall', 'marker', 'collision', 'root', 'screen', 'prop', 'decal', 'zen'];
                meshList.forEach(m => {
                    let shouldHide = !m.userData.khadaDefaultVisible;
                    const n = (m.userData.uiName || '').toLowerCase();
                    if (hideKeywords.some(k => n.includes(k))) shouldHide = true;

                    const hasHelmetOff = meshList.some(x => (x.userData.uiName || '').toLowerCase().includes('helmet_off'));
                    if (n.includes('helmet') && !n.includes('helmet_off') && hasHelmetOff) shouldHide = true;
                    
                    const hasHoodDown = meshList.some(x => (x.userData.uiName || '').toLowerCase().includes('hood_down'));
                    if (n.includes('hood') && !n.includes('hood_down') && hasHoodDown) shouldHide = true;

                    m.userData.isForceHidden = shouldHide;
                    m.visible = !shouldHide;
                    const inp = m.userData.inputRef;
                    if (inp) inp.checked = !shouldHide;
                });
            };

            scene.add(model);
            
            const btnAutoHide = document.getElementById('btn-auto-hide');
            const updateAutoHideBtn = () => {
                btnAutoHide.style.background = isAutoHideEnabled ? 'rgba(200,170,110,0.3)' : 'rgba(20,26,34,0.9)';
                btnAutoHide.style.borderColor = isAutoHideEnabled ? '#c8aa6e' : 'rgba(200,170,110,0.3)';
                btnAutoHide.style.color = isAutoHideEnabled ? '#fff' : '#f0e6d2';
            };
            updateAutoHideBtn();

            btnAutoHide.addEventListener('click', () => {
                isAutoHideEnabled = !isAutoHideEnabled;
                updateAutoHideBtn();
                if (isAutoHideEnabled) applyAutoHide();
            });
            document.getElementById('btn-show-all').addEventListener('click', () => {
                isAutoHideEnabled = false;
                meshList.forEach(m => {
                    m.visible = true;
                    const inp = m.userData.inputRef;
                    if (inp) inp.checked = true;
                });
            });
            document.getElementById('opt-skeleton').addEventListener('change', (e) => {
                if (e.target.checked) {
                    if (!skeletonHelper) { skeletonHelper = new THREE.SkeletonHelper(model); scene.add(skeletonHelper); }
                    skeletonHelper.visible = true;
                } else if (skeletonHelper) { skeletonHelper.visible = false; }
            });
            
            const autoRotateSlider = document.getElementById('auto-rotate');
            autoRotateSlider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                controls.autoRotate = val > 0;
                controls.autoRotateSpeed = val;
            });

            const box = new THREE.Box3();
            model.traverse(c => { if (c.isMesh && c.visible) box.expandByObject(c); });
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const cameraZ = Math.max(size.x, size.y, size.z) * 2.5;
            camera.position.set(center.x, center.y + size.y * 0.2, center.z + cameraZ);
            const minZ = box.min.z;
            const cameraToFarEdge = (minZ < 0) ? -minZ + cameraZ : cameraZ - minZ;
            camera.far = cameraToFarEdge * 3;
            camera.updateProjectionMatrix();

            controls.target.copy(center);
            controls.update();
            controls.saveState();

            const animations = gltf.animations;
            const animTrigger = document.getElementById('anim-trigger');
            const animList = document.getElementById('anim-list');

            function toggleDropdown(list) {
                document.querySelectorAll('.cdropdown-list.open').forEach(l => {
                    if (l !== list) l.classList.remove('open');
                });
                list.classList.toggle('open');
            }
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.cdropdown')) {
                    document.querySelectorAll('.cdropdown-list.open').forEach(l => l.classList.remove('open'));
                }
            });

            const speedSlider = document.getElementById('speed-slider');
            const speedDisplay = document.getElementById('speed-display');
            speedSlider.addEventListener('input', () => {
                const val = parseFloat(speedSlider.value);
                if (mixer) mixer.timeScale = val;
                speedDisplay.textContent = val.toFixed(val % 1 === 0 ? 1 : 2) + 'x';
            });

            if (animations && animations.length > 0) {
                mixer = new THREE.AnimationMixer(model);

                cachedActions = animations.map((clip) => {
                    const action = mixer.clipAction(clip);
                    action.setLoop(THREE.LoopRepeat);
                    action.clampWhenFinished = false;
                    return action;
                });

                let defaultIdx = 0;
                const idlePriority = ['idle1_base', 'idle_base', 'idle_var01', 'idle1', 'idlein', 'idle_in', 'idle'];
                for (let pi = 0; pi < idlePriority.length; pi++) {
                    const pref = idlePriority[pi];
                    let found = -1;
                    for (let ai = 0; ai < animations.length; ai++) {
                        if (animations[ai].name.toLowerCase() === pref || animations[ai].name.toLowerCase().indexOf(pref) >= 0) {
                            found = ai; break;
                        }
                    }
                    if (found >= 0) { defaultIdx = found; break; }
                }

                animations.forEach((clip, i) => {
                    const item = document.createElement('div');
                    item.className = 'cdropdown-item' + (i === defaultIdx ? ' active' : '');
                    item.textContent = clip.name || 'Animasyon ' + (i+1);
                    item.dataset.index = i;
                    item.addEventListener('click', () => {
                        playAnimation(i);
                        animTrigger.textContent = item.textContent;
                        animList.querySelectorAll('.cdropdown-item').forEach(it => it.classList.remove('active'));
                        item.classList.add('active');
                        animList.classList.remove('open');
                    });
                    animList.appendChild(item);
                });

                animTrigger.addEventListener('click', (e) => { e.stopPropagation(); toggleDropdown(animList); });

                document.getElementById('btn-reset').addEventListener('click', () => {
                    playAnimation(defaultIdx);
                    animTrigger.textContent = animations[defaultIdx].name || 'Animasyon ' + (defaultIdx+1);
                    animList.querySelectorAll('.cdropdown-item').forEach(it => it.classList.remove('active'));
                    const activeItem = animList.querySelector('[data-index="' + defaultIdx + '"]');
                    if (activeItem) activeItem.classList.add('active');
                    speedSlider.value = 1;
                    speedDisplay.textContent = '1.0x';
                    if (mixer) mixer.timeScale = 1;
                    applyAutoHide();
                    controls.reset();
                });

                meshList.forEach(m => m.visible = true);
                for (let wi = 0; wi < cachedActions.length; wi++) {
                    cachedActions.forEach(a => a.stop());
                    cachedActions[wi].reset().play();
                    mixer.update(0.016);
                    renderer.render(scene, camera);
                }
                cachedActions.forEach(a => a.stop());
                applyAutoHide();

                playAnimation(defaultIdx);
                animTrigger.textContent = animations[defaultIdx].name || 'Animasyon ' + (defaultIdx+1);

                btnPlayPause.addEventListener('click', () => {
                    if (!currentAction) return;
                    if (currentAction.paused) {
                        currentAction.paused = false;
                        isPlaying = true;
                        document.getElementById('icon-pause').style.display = 'block';
                        document.getElementById('icon-play').style.display = 'none';
                    } else {
                        currentAction.paused = true;
                        isPlaying = false;
                        document.getElementById('icon-pause').style.display = 'none';
                        document.getElementById('icon-play').style.display = 'block';
                    }
                });

                document.getElementById('controls').style.display = 'flex';
            }

        } catch (execErr) {
            console.error('[3DSkinViewer] Yükleme hatası:', execErr);
            const errDiv = document.getElementById('error');
            errDiv.style.display = 'block';
            errDiv.textContent = 'Hata: ' + execErr.message;
        }
    },
    (progress) => {
        if (progress.total > 0) {
            const pct = Math.round(progress.loaded / progress.total * 100);
            document.getElementById('loading').textContent = 'Yükleniyor... %' + pct;
        }
    },
    () => {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('error').style.display = 'block';
    }
);

function playAnimation(idx) {
    if (!mixer || !cachedActions[idx]) return;
    cachedActions.forEach(a => a.stop());
    currentAction = cachedActions[idx];
    currentAction.reset().play();
    isPlaying = true;

    if (isAutoHideEnabled) {
        meshList.forEach(m => {
            const inp = m.userData.inputRef;
            if (!inp) return;
            if (m.userData.isForceHidden) {
                m.visible = false;
                inp.checked = false;
            } else {
                m.visible = true;
                inp.checked = true;
            }
        });
    }
}

document.getElementById('btn-fs').addEventListener('click', () => {
    const fs = document.documentElement;
    if (!document.fullscreenElement) {
        fs.requestFullscreen().catch(() => {});
    } else {
        document.exitFullscreen().catch(() => {});
    }
});

document.addEventListener('fullscreenchange', () => {
    const isFs = !!document.fullscreenElement;
    document.getElementById('icon-fs-enter').style.display = isFs ? 'none' : 'block';
    document.getElementById('icon-fs-exit').style.display = isFs ? 'block' : 'none';
});

const timeline = document.getElementById('timeline');
const timeDisplay = document.getElementById('time-display');
timeline.addEventListener('input', () => {
    if (!currentAction) return;
    isScrubbing = true;
    currentAction.time = (parseFloat(timeline.value) / 100) * currentAction.getClip().duration;
    mixer.update(0);
});
timeline.addEventListener('change', () => { isScrubbing = false; });

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    
    if (mixer && isPlaying && !isScrubbing) {
        mixer.update(delta);
        if (!isAutoHideEnabled) {
            meshList.forEach(m => {
                const inp = m.userData.inputRef;
                if (inp && !inp.checked) m.visible = false;
            });
        }
    }

    controls.update();
    renderer.render(scene, camera);
    if (currentAction && !isScrubbing) {
        const clip = currentAction.getClip();
        const pct = (currentAction.time % clip.duration) / clip.duration * 100;
        timeline.value = pct;
        timeDisplay.textContent = currentAction.time.toFixed(1) + ' / ' + clip.duration.toFixed(1) + 's';
    }
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
<\/script>
</body></html>`;
  }

  // 403Changer Mod Ayar Çarkı Kaydı
  function showSettingsModal() {
    // Aynı anda iki mod ayar penceresi açık kalmasın.
    ["c403-bg-modal", "c403-profile-winloss-modal", "c403-icon-swapper-modal", "c403-soloq-settings-modal"]
      .forEach((id) => document.getElementById(id)?.remove());
    document.getElementById(MODAL_ID)?.remove();

    let modal = document.getElementById(MODAL_ID);
    if (!modal) {
      modal = document.createElement("div");
      modal.id = MODAL_ID;
      modal.style.cssText = `
        position: fixed; inset: 0; z-index: 2147483640;
        display: flex; align-items: center; justify-content: center;
        background: rgba(3, 6, 9, 0.75); backdrop-filter: blur(6px);
        font-family: 'Beaufort for LOL', 'Segoe UI', sans-serif;
      `;
      modal.innerHTML = `
        <div style="
          width: 440px; max-width: 92vw; background: #0d1319;
          border: 1px solid rgba(200, 170, 110, 0.4); border-radius: 8px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.85); overflow: hidden;
        ">
          <div style="
            display: flex; align-items: center; justify-content: space-between;
            padding: 16px 20px; border-bottom: 1px solid rgba(200, 170, 110, 0.2);
            background: rgba(200, 170, 110, 0.06);
          ">
            <h3 style="margin: 0; font-size: 15px; color: #f0e6d2; font-weight: 600;">3D Kostüm Görüntüleyici Ayarları</h3>
            <button id="c403-sv-close" style="background: none; border: none; color: #7a8288; font-size: 18px; cursor: pointer;">✕</button>
          </div>
          <div style="padding: 20px; display: flex; flex-direction: column; gap: 16px; color: #cdbe91; font-size: 13px;">
            <div style="background: rgba(200, 170, 110, 0.08); border-left: 3px solid #c8aa6e; padding: 10px 14px; border-radius: 4px; font-size: 12px; line-height: 1.4;">
              <b>Nasıl Kullanılır:</b> Şampiyon detay veya kostüm sayfasındayken seçili kostümün üzerinde beliren <b>3D Göz (👁️)</b> simgesine tıklayarak 3 boyutlu model görüntüleyiciyi açabilirsiniz.
            </div>

            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span>Varsayılan Vadi Arka Planı</span>
              <input type="checkbox" id="c403-sv-mapbg" style="accent-color: #c8aa6e; width: 16px; height: 16px; cursor: pointer;">
            </div>

            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span>Modelleri Önceden Önbelleğe Al</span>
              <input type="checkbox" id="c403-sv-preload" style="accent-color: #c8aa6e; width: 16px; height: 16px; cursor: pointer;">
            </div>
          </div>
          <div style="padding: 12px 20px; border-top: 1px solid rgba(200, 170, 110, 0.15); display: flex; justify-content: flex-end;">
            <button id="c403-sv-ok" style="padding: 8px 18px; background: rgba(200, 170, 110, 0.2); border: 1px solid #c8aa6e; border-radius: 4px; color: #f0e6d2; font-size: 12px; font-weight: 600; cursor: pointer;">Tamam</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      const mapBgInp = modal.querySelector("#c403-sv-mapbg");
      const preloadInp = modal.querySelector("#c403-sv-preload");

      mapBgInp.checked = !!CONFIG.mapBgEnabled;
      preloadInp.checked = !!CONFIG.preloadingEnabled;

      const save = () => {
        CONFIG.mapBgEnabled = mapBgInp.checked;
        CONFIG.preloadingEnabled = preloadInp.checked;
        saveConfig(CONFIG);
      };

      mapBgInp.onchange = save;
      preloadInp.onchange = save;

      modal.querySelector("#c403-sv-close").onclick = () => modal.remove();
      modal.querySelector("#c403-sv-ok").onclick = () => modal.remove();
      modal.onclick = (e) => {
        if (e.target === modal) modal.remove();
      };
    }
  }

  window.__c403ModSettings = window.__c403ModSettings || {};
  window.__c403ModSettings["skinviewer3d"] = showSettingsModal;

  if (document.readyState === "complete" || document.readyState === "interactive") {
    initWatcher();
  } else {
    window.addEventListener("load", initWatcher);
  }
})();
