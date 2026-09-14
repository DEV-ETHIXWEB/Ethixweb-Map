/* Ethixweb Client Map
 * Imagery: Esri World Imagery · Places & roads: Esri reference layers
 * Geocoding & city boundaries: OpenStreetMap Nominatim · Renderer: MapLibre GL JS
 */
(() => {
  "use strict";

  // Edition settings. index.html runs with these defaults (Ethixweb); another edition
  // (e.g. spartan/index.html) sets window.MAP_CONFIG and window.MAP_DATA before this file.
  const CONFIG = {
    brand: "Ethixweb",
    storageKey: "ethixweb-client-map/v1",
    exportName: "ethixweb-clients",
    noun: { one: "client", many: "clients" },
    scope: { key: "country", one: "country", many: "countries" }, // third stat + subtitle
    officeLabel: "Office",
    initialView: "world", // "world" or "fit" (zoom to the businesses)
    sections: null, // optional [{ name, regions: [...] }] to group the list
    colors: { area: "#C1272D", areaHalo: "#FFFDF9", preview: "#F3EBDD", arc: "#FFFDF9", pulse: "#C1272D" },
    ...(window.MAP_CONFIG || {}),
  };
  CONFIG.colors = { area: "#C1272D", areaHalo: "#FFFDF9", preview: "#F3EBDD", arc: "#FFFDF9", pulse: "#C1272D", ...(window.MAP_CONFIG?.colors || {}) };
  const STORAGE_KEY = CONFIG.storageKey;
  const SHIPPED = window.MAP_DATA || window.ETHIXWEB_CLIENTS || [];
  const nounFor = (n) => (n === 1 ? CONFIG.noun.one : CONFIG.noun.many);
  const scopeFor = (n) => (n === 1 ? CONFIG.scope.one : CONFIG.scope.many);
  const SEEDED_KEY = `${STORAGE_KEY}/seeded`;
  const NOMINATIM = "https://nominatim.openstreetmap.org";
  const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services";
  const WORLD_CENTER = [12, 24];

  const $ = (id) => document.getElementById(id);
  const isPhone = () => window.matchMedia("(max-width: 760px)").matches;

  /* ------------------------------------------------------------------ icons */

  const ICONS = {
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4-4"/>',
    pin: '<path d="M12 21s-6.5-5.8-6.5-11A6.5 6.5 0 0 1 18.5 10c0 5.2-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="m13 7 4 4"/>',
    trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
    globe: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.3 2.5 3.5 5.3 3.5 8.5s-1.2 6-3.5 8.5c-2.3-2.5-3.5-5.3-3.5-8.5S9.7 6 12 3.5z"/>',
    flat: '<path d="M9 4.5 3.5 6.5v13L9 17.5l6 2 5.5-2v-13L15 6.5l-6-2z"/><path d="M9 4.5v13M15 6.5v13"/>',
    labels: '<path d="M5 7V5h14v2M12 5v14M9 19h6"/>',
    compass: '<circle cx="12" cy="12" r="8.5"/><path d="m15.5 8.5-2 5-5 2 2-5 5-2z"/>',
    fit: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/><circle cx="12" cy="12" r="2"/>',
    world: '<circle cx="12" cy="12" r="8.5"/><path d="M5 7.5c2 .5 3 2 2.5 3.5S9 13.5 10 14s.5 3 1.5 4M14 4c-.5 1.5 0 3 1.5 3.5s2.5 2 2 3.5 1 2.5 2.5 2.5"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    phone: '<path d="M5 4h3.5l2 5-2.3 1.4a11 11 0 0 0 5.4 5.4L15 13.5l5 2V19a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    upload: '<path d="M12 16V5M7 10l5-5 5 5M5 20h14"/>',
    chevronLeft: '<path d="m15 6-6 6 6 6"/>',
    soundOn: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18.2 6.5a8 8 0 0 1 0 11"/>',
    soundOff: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z"/><path d="m16 9.5 5 5M21 9.5l-5 5"/>',
    list: '<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
    crosshair: '<circle cx="12" cy="12" r="7.5"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
  };
  const icon = (name) =>
    `<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;
  const hydrateIcons = (root = document) =>
    root.querySelectorAll("[data-icon]").forEach((el) => { el.innerHTML = icon(el.dataset.icon); });

  const PIN_PATH = "M20 50.5c-1 0-1.9-.6-2.6-1.6L6.6 33A18.5 18.5 0 1 1 33.4 33L22.6 48.9c-.7 1-1.6 1.6-2.6 1.6z";
  const pinSvg = (fill = "pin-main", cls = "") =>
    `<svg class="${cls}" viewBox="0 0 40 52" aria-hidden="true"><path d="${PIN_PATH}" fill="url(#${fill})"/><path d="${PIN_PATH}" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1"/><circle cx="20" cy="19.5" r="7" fill="url(#pin-core)"/>${fill === "pin-hq" ? '<circle cx="20" cy="19.5" r="3.2" style="fill: var(--hq-dot)"/>' : ""}</svg>`;

  /* ------------------------------------------------------------------ state & storage */

  const state = {
    clients: loadClients(),
    markers: [],
    projection: "mercator",
    labels: true,
    popup: null,
    activeKey: null,
    filter: "",
    picking: false,
    editingId: null,
    draftLocation: null,
    previewMarker: null,
    arcs: [],
    dropKey: null,
  };

  // Browser copy + entries from data/clients.js not seen before in this browser
  // (a shipped entry the user deleted stays deleted).
  function loadClients() {
    let clients = [];
    let seeded = [];
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      clients = Array.isArray(raw) ? raw.filter(isValidClient) : [];
      seeded = JSON.parse(localStorage.getItem(SEEDED_KEY) || "[]");
    } catch { /* storage unavailable: use the shipped list */ }

    const shipped = (Array.isArray(SHIPPED) ? SHIPPED : []).filter(isValidClient);
    // Logos are site files, so always use the shipped path (it changes if the site is reorganised)
    const shippedLogo = new Map(shipped.filter((c) => c.logo).map((c) => [c.id, c.logo]));
    clients = clients.map((c) => (shippedLogo.has(c.id) && c.logo !== shippedLogo.get(c.id) ? { ...c, logo: shippedLogo.get(c.id) } : c));
    const known = new Set(clients.map((c) => c.id));
    const fresh = shipped.filter((c) => !seeded.includes(c.id) && !known.has(c.id));
    if (fresh.length) {
      clients = clients.concat(fresh);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(clients));
        localStorage.setItem(SEEDED_KEY, JSON.stringify([...new Set([...seeded, ...shipped.map((c) => c.id)])]));
      } catch { /* ignore */ }
    }
    return clients;
  }

  // Returns false (and warns) when the browser blocks storage, e.g. some private modes
  function saveClients() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.clients));
      return true;
    } catch {
      toast("This browser couldn't save the change, so it will be lost on reload. Use Export to keep a copy.");
      return false;
    }
  }

  function isValidClient(c) {
    return c && typeof c.company === "string" && c.location &&
      Number.isFinite(c.location.lat) && Number.isFinite(c.location.lng);
  }

  /* ------------------------------------------------------------------ helpers */

  function esc(s) {
    return String(s ?? "").replace(/[&<>"']/g, (ch) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
  }

  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `c${Date.now()}${Math.random().toString(16).slice(2)}`);
  const groupKey = (loc) => `${loc.lat.toFixed(2)},${loc.lng.toFixed(2)}`;
  const cityKey = (loc) => (loc.city ? `${loc.city}|${loc.region || ""}|${loc.countryCode || loc.country}` : groupKey(loc));

  function placeLabel(loc) {
    return [...new Set([loc.city || loc.name, loc.region].filter(Boolean))].join(", ") || loc.country || "";
  }

  function safeUrl(u) {
    if (!u) return "";
    try {
      const url = new URL(/^[a-z]+:\/\//i.test(u) ? u : `https://${u}`);
      return /^https?:$/.test(url.protocol) ? url.href : "";
    } catch {
      return "";
    }
  }
  // Logos may come from imported files, so only allow local assets or https images
  const safeImg = (u) =>
    typeof u === "string" && (/^https:\/\/[^\s"'<>]+$/i.test(u) || /^(?!\/\/)[\w.\/-]+\.(png|jpe?g|webp|svg|gif)$/i.test(u)) ? u : "";
  const prettyUrl = (u) => u.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, "");

  let toastTimer;
  function toast(msg) {
    const el = $("toast");
    el.textContent = msg;
    el.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("show"), 3000);
  }

  /* ------------------------------------------------------------------ sound & haptics */

  // Soft clay-like UI sounds synthesised with Web Audio (no audio files), plus a
  // matching vibration: navigator.vibrate on Android, the native switch tap on iOS 18+.
  const feedback = (() => {
    const PREF_KEY = `${STORAGE_KEY}/feedback`;
    let on = true;
    try { on = localStorage.getItem(PREF_KEY) !== "off"; } catch { /* default on */ }

    let ac = null;
    let master = null;
    let noise = null;

    function audio() {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      if (!ac) {
        ac = new AC();
        master = ac.createGain();
        master.gain.value = 0.55;
        const warm = ac.createBiquadFilter();
        warm.type = "lowpass";
        warm.frequency.value = 5200;
        master.connect(warm).connect(ac.destination);
        noise = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.05), ac.sampleRate);
        const ch = noise.getChannelData(0);
        for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
      }
      if (ac.state === "suspended") ac.resume();
      return ac;
    }

    function envelope(gainNode, t, attack, peak, decay) {
      gainNode.gain.setValueAtTime(0.0001, t);
      gainNode.gain.exponentialRampToValueAtTime(peak, t + attack);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    }

    function tone({ type = "sine", from, to, at = 0, attack = 0.004, decay = 0.08, gain = 0.12 }) {
      const t = ac.currentTime + at;
      const osc = ac.createOscillator();
      const g = ac.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(from, t);
      if (to) osc.frequency.exponentialRampToValueAtTime(to, t + attack + decay);
      envelope(g, t, attack, gain, decay);
      osc.connect(g).connect(master);
      osc.start(t);
      osc.stop(t + attack + decay + 0.03);
    }

    function tick({ at = 0, freq = 2400, gain = 0.2, decay = 0.02 }) {
      const t = ac.currentTime + at;
      const src = ac.createBufferSource();
      const band = ac.createBiquadFilter();
      const g = ac.createGain();
      src.buffer = noise;
      band.type = "bandpass";
      band.frequency.value = freq;
      band.Q.value = 1.4;
      envelope(g, t, 0.002, gain, decay);
      src.connect(band).connect(g).connect(master);
      src.start(t);
      src.stop(t + 0.05);
    }

    const SOUNDS = {
      tap: () => { tick({ freq: 2600, gain: 0.16 }); tone({ from: 880, to: 520, decay: 0.045, gain: 0.04 }); },
      pop: () => { tone({ from: 640, to: 230, attack: 0.003, decay: 0.12, gain: 0.15 }); tick({ freq: 1700, gain: 0.08 }); },
      success: () => {
        tone({ from: 520, to: 250, attack: 0.003, decay: 0.1, gain: 0.12 });
        tone({ type: "triangle", from: 784, at: 0.08, decay: 0.16, gain: 0.07 });
        tone({ type: "triangle", from: 1175, at: 0.16, decay: 0.3, gain: 0.06 });
      },
      remove: () => { tone({ from: 320, to: 110, attack: 0.004, decay: 0.2, gain: 0.16 }); tick({ freq: 900, gain: 0.08, decay: 0.04 }); },
      error: () => { tone({ type: "triangle", from: 240, decay: 0.06, gain: 0.08 }); tone({ type: "triangle", from: 200, at: 0.09, decay: 0.09, gain: 0.08 }); },
      toggle: () => { tick({ freq: 3000, gain: 0.12 }); tone({ from: 700, to: 980, decay: 0.06, gain: 0.05 }); },
    };
    const VIBES = { tap: 8, pop: 14, success: [12, 70, 22], remove: 28, error: [18, 50, 18], toggle: 10 };

    // iOS Safari has no vibrate(), but tapping a native switch gives a system haptic
    let iosSwitch = null;
    function iosHaptic() {
      if (!iosSwitch) {
        iosSwitch = document.createElement("label");
        iosSwitch.className = "haptic-switch";
        iosSwitch.setAttribute("aria-hidden", "true");
        iosSwitch.innerHTML = '<input type="checkbox" switch tabindex="-1" />';
        document.body.appendChild(iosSwitch);
      }
      iosSwitch.click();
    }
    const touch = window.matchMedia("(pointer: coarse)").matches;

    function play(name) {
      if (!on || !SOUNDS[name]) return;
      try {
        if (audio()) SOUNDS[name]();
      } catch { /* audio is a nicety */ }
      try {
        if (typeof navigator.vibrate === "function") navigator.vibrate(VIBES[name]);
        else if (touch) iosHaptic();
      } catch { /* haptics are a nicety */ }
    }

    function setOn(value) {
      on = value;
      try { localStorage.setItem(PREF_KEY, on ? "on" : "off"); } catch { /* session only */ }
      if (on) play("toggle");
    }

    return { play, setOn, get on() { return on; } };
  })();

  function matchesFilter(c) {
    if (!state.filter) return true;
    const l = c.location;
    return [c.company, c.client, c.industry, c.website, l.name, l.city, l.region, l.country, l.display]
      .join(" ").toLowerCase().includes(state.filter);
  }
  const visibleClients = () => state.clients.filter(matchesFilter);

  function mapPadding() {
    const gap = 16;
    if (isPhone()) {
      const panelH = $("panel").getBoundingClientRect().height;
      return { top: 90, bottom: panelH + 40, left: 40, right: 84 };
    }
    const panelOpen = !$("panel").classList.contains("collapsed");
    const sheetOpen = $("sheet").classList.contains("open");
    return {
      top: 72 + gap * 2 + 30,
      bottom: 50,
      left: panelOpen ? 360 + gap * 2 + 70 : 70,
      right: sheetOpen ? 420 + gap * 2 + 40 : 90,
    };
  }

  // Small dialog that replaces the browser's confirm()
  function ask({ title, text, actions }) {
    return new Promise((resolve) => {
      const modal = $("modal");
      $("modal-title").textContent = title;
      $("modal-text").textContent = text;
      const box = $("modal-actions");
      box.innerHTML = "";
      const finish = (value) => {
        modal.hidden = true;
        document.removeEventListener("keydown", onKey, true);
        resolve(value);
      };
      const onKey = (e) => {
        if (e.key === "Escape") { e.stopPropagation(); finish(null); }
      };
      actions.forEach((a) => {
        const b = document.createElement("button");
        b.className = `btn ${a.kind === "primary" ? "btn-primary" : a.kind === "ink" ? "btn-ink" : "btn-soft"}`;
        b.textContent = a.label;
        if (a.silent) b.dataset.sound = "none";
        b.addEventListener("click", () => finish(a.value));
        box.appendChild(b);
      });
      modal.onclick = (e) => { if (e.target === modal) finish(null); };
      document.addEventListener("keydown", onKey, true);
      modal.hidden = false;
      box.lastElementChild?.focus();
    });
  }

  /* ------------------------------------------------------------------ map */

  const worldZoom = () => Math.max(minMercatorZoom(), Math.log2(window.innerWidth / 512) + 0.05);
  const minMercatorZoom = () => Math.max(0, Math.log2(window.innerHeight / 512) - 0.35);

  // World view is centred on the clients' longitude so their pins are in view on any screen
  function worldCenter() {
    const pts = state.clients.map((c) => c.location);
    if (!pts.length) return WORLD_CENTER;
    const r = Math.PI / 180;
    const x = pts.reduce((s, p) => s + Math.cos(p.lng * r), 0);
    const y = pts.reduce((s, p) => s + Math.sin(p.lng * r), 0);
    const lat = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
    return [Math.atan2(y, x) / r, Math.max(-30, Math.min(45, lat * 0.6))];
  }

  const map = new maplibregl.Map({
    container: "map",
    center: worldCenter(),
    zoom: worldZoom(),
    minZoom: minMercatorZoom(),
    maxZoom: 19,
    maxPitch: 60,
    renderWorldCopies: true,
    attributionControl: false,
    style: {
      version: 8,
      sources: {
        imagery: {
          type: "raster", tileSize: 256, maxzoom: 18,
          tiles: [`${ESRI}/World_Imagery/MapServer/tile/{z}/{y}/{x}`],
          attribution: "Imagery © Esri, Maxar, Earthstar Geographics, and the GIS User Community",
        },
        roads: {
          type: "raster", tileSize: 256, maxzoom: 18,
          tiles: [`${ESRI}/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}`],
        },
        places: {
          type: "raster", tileSize: 256, maxzoom: 18,
          tiles: [`${ESRI}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`],
          attribution: "Boundaries & places © Esri · Search © OpenStreetMap contributors",
        },
      },
      layers: [
        { id: "space", type: "background", paint: { "background-color": "#0d0b0a" } },
        { id: "imagery", type: "raster", source: "imagery", paint: { "raster-contrast": 0.06, "raster-saturation": 0.05, "raster-fade-duration": 250 } },
        { id: "roads", type: "raster", source: "roads", minzoom: 8, paint: { "raster-opacity": ["interpolate", ["linear"], ["zoom"], 8, 0, 10, 0.75] } },
        { id: "places", type: "raster", source: "places" },
      ],
    },
  });
  map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

  map.on("load", () => {
    addDataLayers();
    renderAll();
    if (CONFIG.initialView === "fit" && state.clients.length > 1) fitAllClients({ duration: 0 });
    else map.jumpTo({ center: worldCenter(), zoom: worldZoom(), padding: mapPadding() });
  });

  const emptyFC = () => ({ type: "FeatureCollection", features: [] });

  function addDataLayers() {
    // Client city areas sit under the place names so labels stay readable
    map.addSource("areas", { type: "geojson", data: emptyFC() });
    map.addLayer({ id: "areas-fill", type: "fill", source: "areas",
      paint: { "fill-color": CONFIG.colors.area, "fill-opacity": ["interpolate", ["linear"], ["zoom"], 4, 0.35, 12, 0.18] } }, "places");
    map.addLayer({ id: "areas-halo", type: "line", source: "areas",
      layout: { "line-join": "round" },
      paint: { "line-color": CONFIG.colors.areaHalo, "line-width": ["interpolate", ["linear"], ["zoom"], 4, 1.5, 12, 5], "line-opacity": 0.55, "line-blur": 1 } }, "places");
    map.addLayer({ id: "areas-line", type: "line", source: "areas",
      layout: { "line-join": "round" },
      paint: { "line-color": CONFIG.colors.area, "line-width": ["interpolate", ["linear"], ["zoom"], 4, 1, 12, 2.5] } }, "places");

    map.addSource("preview-area", { type: "geojson", data: emptyFC() });
    map.addLayer({ id: "preview-fill", type: "fill", source: "preview-area",
      paint: { "fill-color": CONFIG.colors.preview, "fill-opacity": 0.16 } }, "places");
    map.addLayer({ id: "preview-line", type: "line", source: "preview-area",
      paint: { "line-color": CONFIG.colors.areaHalo, "line-width": 2.2, "line-dasharray": [2, 1.5] } }, "places");

    // Lines from the office / headquarters to each location
    const fade = (max) => ["interpolate", ["linear"], ["zoom"], 5, max, 8, 0];
    map.addSource("arcs", { type: "geojson", data: emptyFC() });
    map.addLayer({ id: "arcs-shadow", type: "line", source: "arcs",
      layout: { "line-cap": "round" },
      paint: { "line-color": "#000", "line-width": 3.5, "line-blur": 2, "line-opacity": fade(0.35), "line-translate": [0, 2] } });
    map.addLayer({ id: "arcs-line", type: "line", source: "arcs",
      layout: { "line-cap": "round" },
      paint: { "line-color": CONFIG.colors.arc, "line-width": 1.6, "line-opacity": fade(0.9), "line-dasharray": [3, 2] } });
    map.addSource("pulses", { type: "geojson", data: emptyFC() });
    map.addLayer({ id: "pulses", type: "circle", source: "pulses",
      paint: { "circle-radius": 4, "circle-color": CONFIG.colors.pulse, "circle-stroke-color": CONFIG.colors.arc, "circle-stroke-width": 1.5, "circle-opacity": fade(1), "circle-stroke-opacity": fade(1) } });
  }

  /* ------------------------------------------------------------------ rendering */

  function renderAll() {
    renderList();
    renderStats();
    if (!map.getSource("areas")) return;
    renderMarkers();
    renderAreas();
    renderArcs();
  }

  function groups(clients) {
    const byKey = new Map();
    for (const c of clients) {
      const key = groupKey(c.location);
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push(c);
    }
    for (const list of byKey.values()) list.sort((a, b) => Number(!!b.isHQ) - Number(!!a.isHQ));
    return byKey;
  }

  function renderMarkers() {
    state.markers.forEach((m) => m.marker.remove());
    state.markers = [];

    for (const [key, list] of groups(visibleClients())) {
      const lead = list[0];
      const el = document.createElement("div");
      el.className = ["pin", lead.isHQ && "hq", state.activeKey === key && "active", state.dropKey === key && "drop"]
        .filter(Boolean).join(" ");
      el.innerHTML = `
        <span class="pin-shadow"></span>
        <div class="pin-body">
          ${pinSvg(lead.isHQ ? "pin-hq" : "pin-main")}
          ${list.length > 1 ? `<span class="pin-count">${list.length}</span>` : ""}
        </div>
        <div class="pin-label">${esc(lead.company)}${list.length > 1 ? `<small>+${list.length - 1} more</small>` : ""}</div>`;
      el.setAttribute("role", "button");
      el.setAttribute("aria-label", list.map((c) => c.company).join(", "));
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        if (state.picking) return pickAt(marker.getLngLat()); // adding a client at an existing pin's spot
        feedback.play("pop");
        openGroupPopup(key);
      });

      const marker = new maplibregl.Marker({ element: el, anchor: "bottom" })
        .setLngLat([lead.location.lng, lead.location.lat])
        .addTo(map);
      state.markers.push({ key, marker, el });
    }
    state.dropKey = null;
    scheduleLabelLayout();
  }

  // Place each label right of its pin, else left, else show it only on hover.
  let labelFrame = 0;
  function scheduleLabelLayout() {
    if (!labelFrame) labelFrame = requestAnimationFrame(layoutLabels);
  }
  function layoutLabels() {
    labelFrame = 0;
    const placed = [];
    const hits = (r) => placed.some((p) => r.l < p.r && r.r > p.l && r.t < p.b && r.b > p.t);
    const rank = (m) => (m.el.classList.contains("active") ? 2 : 0) + (m.el.classList.contains("hq") ? 1 : 0);
    const ordered = [...state.markers].sort((a, b) => rank(b) - rank(a));
    const globe = state.projection === "globe";
    const c0 = map.getCenter();
    const r = Math.PI / 180;

    // Labels also steer clear of the floating interface (top bar, list, buttons)
    for (const el of [document.querySelector(".topbar"), $("panel"), $("btn-reopen"), document.querySelector(".controls")]) {
      if (!el || el.hidden || (el.id === "panel" && el.classList.contains("collapsed") && !isPhone())) continue;
      const r = el.getBoundingClientRect();
      if (r.width && r.height) placed.push({ l: r.left - 6, r: r.right + 6, t: r.top - 6, b: r.bottom + 6 });
    }
    const shown = [];
    for (const m of ordered) {
      if (globe) {
        // hide pins on the far side of the globe
        const p = m.marker.getLngLat();
        const cos = Math.sin(c0.lat * r) * Math.sin(p.lat * r) + Math.cos(c0.lat * r) * Math.cos(p.lat * r) * Math.cos((p.lng - c0.lng) * r);
        const behind = cos < 0.15;
        m.el.style.visibility = behind ? "hidden" : "";
        if (behind) continue;
      } else if (m.el.style.visibility) {
        m.el.style.visibility = "";
      }
      const { x, y } = map.project(m.marker.getLngLat());
      shown.push({ m, x, y });
      placed.push({ l: x - 16, r: x + 16, t: y - 44, b: y }); // every pin blocks labels
    }

    const panel = $("panel");
    const edgeL = !isPhone() && !panel.classList.contains("collapsed") ? panel.getBoundingClientRect().right + 8 : 8;
    const edgeR = window.innerWidth - 8;
    for (const { m, x, y } of shown) {
      const w = m.el.querySelector(".pin-label").offsetWidth + 6;
      const right = { l: x + 21, r: x + 21 + w, t: y - 38, b: y - 10 };
      const left = { l: x - 21 - w, r: x - 21, t: y - 38, b: y - 10 };
      let side = "off";
      if (right.r < edgeR && !hits(right)) side = "right";
      else if (left.l > edgeL && !hits(left)) side = "left";
      m.el.classList.toggle("label-left", side === "left");
      m.el.classList.toggle("label-off", side === "off");
      if (side === "right") placed.push(right);
      if (side === "left") placed.push(left);
    }
  }
  map.on("move", scheduleLabelLayout);

  function renderAreas() {
    const seen = new Set();
    const features = [];
    for (const c of visibleClients()) {
      const g = c.location.geojson;
      if (!g) continue;
      const k = c.location.osmArea || JSON.stringify(c.location.bbox) || c.id;
      if (seen.has(k)) continue; // two clients in one city: draw the boundary once
      seen.add(k);
      features.push({ type: "Feature", properties: {}, geometry: g });
    }
    map.getSource("areas").setData({ type: "FeatureCollection", features });
  }

  function renderArcs() {
    const hq = state.clients.find((c) => c.isHQ);
    state.arcs = [];
    if (hq) {
      const from = [hq.location.lng, hq.location.lat];
      for (const c of visibleClients()) {
        if (c.isHQ || groupKey(c.location) === groupKey(hq.location)) continue;
        state.arcs.push({ coords: greatCircle(from, [c.location.lng, c.location.lat]), offset: Math.random() });
      }
    }
    map.getSource("arcs").setData({
      type: "FeatureCollection",
      features: state.arcs.map((a) => ({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: a.coords } })),
    });
    if (!state.arcs.length) map.getSource("pulses").setData(emptyFC());
  }

  // Points along the shortest route over the Earth's surface
  function greatCircle(a, b, n = 120) {
    const r = Math.PI / 180;
    const [l1, p1, l2, p2] = [a[0] * r, a[1] * r, b[0] * r, b[1] * r];
    const d = 2 * Math.asin(Math.sqrt(Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin((l2 - l1) / 2) ** 2));
    if (d < 1e-9) return [a, b];
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const f = i / n;
      const A = Math.sin((1 - f) * d) / Math.sin(d);
      const B = Math.sin(f * d) / Math.sin(d);
      const x = A * Math.cos(p1) * Math.cos(l1) + B * Math.cos(p2) * Math.cos(l2);
      const y = A * Math.cos(p1) * Math.sin(l1) + B * Math.cos(p2) * Math.sin(l2);
      const z = A * Math.sin(p1) + B * Math.sin(p2);
      pts.push([Math.atan2(y, x) / r, Math.atan2(z, Math.sqrt(x * x + y * y)) / r]);
    }
    for (let i = 1; i < pts.length; i++) {
      while (pts[i][0] - pts[i - 1][0] > 180) pts[i][0] -= 360;
      while (pts[i][0] - pts[i - 1][0] < -180) pts[i][0] += 360;
    }
    return pts;
  }

  function animatePulses(now) {
    if (state.arcs.length && map.getSource("pulses") && !document.hidden) {
      const features = state.arcs.map((a) => {
        const t = (now / 4200 + a.offset) % 1;
        const idx = Math.min(a.coords.length - 1, Math.floor(t * (a.coords.length - 1)));
        return { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: a.coords[idx] } };
      });
      map.getSource("pulses").setData({ type: "FeatureCollection", features });
    }
    requestAnimationFrame(animatePulses);
  }
  requestAnimationFrame(animatePulses);

  function renderStats() {
    const clients = state.clients.filter((c) => !c.isHQ);
    const cities = new Set(clients.map((c) => cityKey(c.location))).size;
    const scopeKey = (l) => (CONFIG.scope.key === "region" ? l.region && `${l.region}|${l.countryCode}` : l.countryCode || l.country);
    const scopes = new Set(clients.map((c) => scopeKey(c.location)).filter(Boolean)).size;
    $("stat-clients").textContent = clients.length;
    $("stat-cities").textContent = cities;
    $("stat-countries").textContent = scopes;
    $("topbar-sub").textContent = clients.length
      ? `${clients.length} ${nounFor(clients.length)} in ${scopes} ${scopeFor(scopes)}`
      : `No ${CONFIG.noun.many} added yet`;
  }

  function renderList() {
    const list = $("client-list");
    const items = visibleClients().sort((a, b) =>
      Number(!!b.isHQ) - Number(!!a.isHQ) || a.company.localeCompare(b.company));

    $("empty").hidden = state.clients.length > 0;
    const countable = (arr) => arr.filter((c) => !c.isHQ).length;
    $("list-count").textContent = state.filter ? `${countable(items)}/${countable(state.clients)}` : countable(state.clients);

    if (state.clients.length && !items.length) {
      list.innerHTML = `<li class="no-match">Nothing matches “${esc(state.filter)}”</li>`;
      return;
    }

    const card = (c) => {
      const sub = [c.industry, c.client].filter(Boolean).join(" · ");
      const logo = safeImg(c.logo);
      return `
      <li class="card${state.activeKey === groupKey(c.location) ? " active" : ""}${logo ? " has-logo" : ""}" data-id="${esc(c.id)}" tabindex="0">
        ${logo ? `<span class="card-logo"><img src="${esc(logo)}" alt="" loading="lazy" /></span>` : pinSvg(c.isHQ ? "pin-hq" : "pin-main", "card-mark")}
        <div class="card-body">
          <div class="card-title"><span>${esc(c.company)}</span>${c.isHQ ? `<em class="tag-hq">${esc(CONFIG.officeLabel)}</em>` : ""}</div>
          ${sub ? `<div class="card-sub">${esc(sub)}</div>` : ""}
          <div class="card-loc"><span class="place">${esc(placeLabel(c.location))}</span>${c.location.countryCode ? `<span class="cc">${esc(c.location.countryCode)}</span>` : ""}</div>
        </div>
        <div class="card-actions">
          <button data-action="edit" data-id="${esc(c.id)}" title="Edit" aria-label="Edit ${esc(c.company)}">${icon("edit")}</button>
          <button data-action="delete" data-id="${esc(c.id)}" title="Remove" aria-label="Remove ${esc(c.company)}">${icon("trash")}</button>
        </div>
      </li>`;
    };

    if (!CONFIG.sections) {
      list.innerHTML = items.map(card).join("");
      return;
    }
    // Grouped like the brand's own locations page: office first, then each section by state
    const sectionOf = (c) => CONFIG.sections.find((sec) => sec.regions.includes(c.location.region));
    const order = (c) => {
      const sec = sectionOf(c);
      return sec ? CONFIG.sections.indexOf(sec) * 100 + sec.regions.indexOf(c.location.region) : 9999;
    };
    const offices = items.filter((c) => c.isHQ);
    const rest = items.filter((c) => !c.isHQ).sort((a, b) => order(a) - order(b) || a.company.localeCompare(b.company));
    let html = offices.map(card).join("");
    let lastSection;
    let lastRegion;
    for (const c of rest) {
      const sec = sectionOf(c);
      const name = sec ? sec.name : `More ${CONFIG.noun.many}`;
      if (name !== lastSection) {
        html += `<li class="list-section" aria-hidden="true"><span>${esc(name)}</span></li>`;
        lastSection = name;
        lastRegion = undefined;
      }
      if (sec && c.location.region !== lastRegion) {
        html += `<li class="list-region" aria-hidden="true">${esc(c.location.region)}</li>`;
        lastRegion = c.location.region;
      }
      html += card(c);
    }
    list.innerHTML = html;
  }

  /* ------------------------------------------------------------------ popup & focus */

  const POPUP_OFFSET = {
    top: [0, 6], "top-left": [0, 6], "top-right": [0, 6],
    bottom: [0, -46], "bottom-left": [0, -46], "bottom-right": [0, -46],
    left: [18, -24], right: [-18, -24],
  };

  function openGroupPopup(key) {
    const list = groups(visibleClients()).get(key);
    if (!list) return;
    const loc = list[0].location;

    if (state.popup) state.popup.remove();
    setActive(key);

    const html = `
      <div class="pop-head">${icon("pin")}<span class="place">${esc(placeLabel(loc))}</span>${loc.countryCode ? `<span class="cc">${esc(loc.countryCode)}</span>` : ""}</div>
      <div class="pop-items">
        ${list.map((c) => {
          const url = safeUrl(c.website);
          const logo = safeImg(c.logo);
          const tags = [c.isHQ ? `<span class="tag-hq">${esc(CONFIG.officeLabel)}</span>` : "", c.industry && `<span>${esc(c.industry)}</span>`, c.since && `<span>Since ${esc(c.since)}</span>`].filter(Boolean).join("");
          return `
          <article class="pop-item">
            ${logo ? `<div class="pop-logo"><img src="${esc(logo)}" alt="${esc(c.company)} logo" /></div>` : ""}
            <h3>${esc(c.company)}</h3>
            ${c.client ? `<div class="pop-contact">${esc(c.client)}</div>` : ""}
            ${c.location.display ? `<div class="pop-address">${esc(c.location.display)}</div>` : ""}
            ${tags ? `<div class="pop-tags">${tags}</div>` : ""}
            ${url || c.phone ? `<div class="pop-rows">
              ${url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${icon("link")}<span>${esc(prettyUrl(url))}</span></a>` : ""}
              ${c.phone ? `<a href="tel:${esc(c.phone.replace(/[^\d+]/g, ""))}">${icon("phone")}<span>${esc(c.phone)}</span></a>` : ""}
            </div>` : ""}
            ${c.notes ? `<p class="pop-notes">${esc(c.notes)}</p>` : ""}
            <div class="pop-actions">
              <button class="btn btn-soft btn-sm" data-action="edit" data-id="${esc(c.id)}">${icon("edit")}Edit</button>
              <button class="btn btn-soft btn-sm danger" data-action="delete" data-id="${esc(c.id)}">${icon("trash")}Remove</button>
            </div>
          </article>`;
        }).join("")}
      </div>`;

    state.popup = new maplibregl.Popup({ className: "client-popup", offset: POPUP_OFFSET, maxWidth: "320px", focusAfterOpen: false })
      .setLngLat([loc.lng, loc.lat])
      .setHTML(html)
      .addTo(map);
    state.popup.on("close", () => {
      state.popup = null;
      setActive(null);
    });
    requestAnimationFrame(() => requestAnimationFrame(keepPopupInView)); // after the popup has laid out
  }

  // Nudge the map so an open popup never hides under the top bar, list or form
  function keepPopupInView() {
    const el = state.popup?.getElement();
    if (!el) return;
    const box = el.getBoundingClientRect();
    const pad = mapPadding();
    const topLimit = isPhone() ? 84 : 72 + 16 * 2 + 8;
    const leftLimit = Math.max(12, pad.left - 30);
    const rightLimit = window.innerWidth - Math.max(12, pad.right - 40);
    let dx = 0;
    let dy = 0;
    if (box.top < topLimit) dy = box.top - topLimit;
    if (box.left < leftLimit) dx = box.left - leftLimit;
    else if (box.right > rightLimit) dx = box.right - rightLimit;
    if (dx || dy) map.panBy([dx, dy], { duration: 450 });
  }

  function setActive(key) {
    state.activeKey = key;
    state.markers.forEach((m) => m.el.classList.toggle("active", m.key === key));
    document.querySelectorAll(".card[data-id]").forEach((card) => {
      const c = state.clients.find((x) => x.id === card.dataset.id);
      card.classList.toggle("active", !!c && groupKey(c.location) === key);
    });
    scheduleLabelLayout();
  }

  function focusLocation(loc, { duration = 2400 } = {}) {
    const padding = mapPadding();
    const bb = loc.bbox; // [south, north, west, east]
    if (loc.geojson && Array.isArray(bb) && bb.length === 4 && bb.every(Number.isFinite)) {
      // city area plus the pin itself: some addresses sit just outside the city limits
      const bounds = new maplibregl.LngLatBounds([bb[2], bb[0]], [bb[3], bb[1]]).extend([loc.lng, loc.lat]);
      map.fitBounds(bounds, { padding, maxZoom: 14, duration, pitch: 0, essential: true });
    } else {
      map.flyTo({ center: [loc.lng, loc.lat], zoom: 15, padding, duration, essential: true });
    }
  }

  function focusClient(id) {
    const c = state.clients.find((x) => x.id === id);
    if (!c || !matchesFilter(c)) return;
    if (state.popup) state.popup.remove();
    focusLocation(c.location);
    map.once("moveend", () => openGroupPopup(groupKey(c.location)));
    if (isPhone()) setPanelCollapsed(true);
  }

  function fitAllClients({ duration = 1800 } = {}) {
    const clients = visibleClients();
    if (!clients.length) return goWorld();
    if (state.popup) state.popup.remove();
    if (clients.length === 1) return focusLocation(clients[0].location, { duration });
    const b = new maplibregl.LngLatBounds();
    clients.forEach((c) => b.extend([c.location.lng, c.location.lat]));
    map.fitBounds(b, { padding: mapPadding(), maxZoom: 9, pitch: 0, bearing: 0, duration });
  }

  function goWorld() {
    if (state.popup) state.popup.remove();
    map.flyTo({
      center: worldCenter(),
      zoom: state.projection === "globe" ? 1.6 : worldZoom(),
      padding: mapPadding(),
      pitch: 0, bearing: 0, duration: 1800, essential: true,
    });
  }

  /* ------------------------------------------------------------------ map controls */

  $("btn-zoom-in").addEventListener("click", () => map.zoomIn());
  $("btn-zoom-out").addEventListener("click", () => map.zoomOut());
  $("btn-north").addEventListener("click", () => map.easeTo({ bearing: 0, pitch: 0, duration: 600 }));
  $("btn-fit").addEventListener("click", () => fitAllClients());
  $("btn-world").addEventListener("click", goWorld);
  // The logo returns to the edition's home view: the whole world, or all locations
  $("btn-brand").addEventListener("click", () => (CONFIG.initialView === "fit" ? fitAllClients() : goWorld()));

  $("btn-view").addEventListener("click", () => {
    state.projection = state.projection === "globe" ? "mercator" : "globe";
    const globe = state.projection === "globe";
    map.setMinZoom(globe ? 0 : minMercatorZoom());
    map.setProjection({ type: state.projection });
    if (globe) {
      try {
        map.setSky({
          "sky-color": "#0d0b0a", "horizon-color": "#cfd9e6", "fog-color": "#0d0b0a",
          "sky-horizon-blend": 0.4, "horizon-fog-blend": 0.7, "fog-ground-blend": 0.9,
          "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 5, 1, 8, 0],
        });
      } catch { /* atmosphere is decorative */ }
      if (map.getZoom() < 3) map.easeTo({ center: worldCenter(), zoom: 1.6, padding: mapPadding(), duration: 900 });
    }
    scheduleLabelLayout();
    const btn = $("btn-view");
    btn.innerHTML = icon(globe ? "flat" : "globe");
    btn.title = globe ? "Switch to flat map" : "Switch to globe";
    toast(globe ? "Globe view" : "Flat world map");
  });

  $("btn-labels").addEventListener("click", () => {
    state.labels = !state.labels;
    const v = state.labels ? "visible" : "none";
    map.setLayoutProperty("places", "visibility", v);
    map.setLayoutProperty("roads", "visibility", v);
    const btn = $("btn-labels");
    btn.classList.toggle("on", state.labels);
    btn.title = state.labels ? "Hide place names and roads" : "Show place names and roads";
  });

  window.addEventListener("resize", () => {
    if (state.projection === "mercator") map.setMinZoom(minMercatorZoom());
    scheduleLabelLayout();
  });

  /* ------------------------------------------------------------------ panel & search */

  document.querySelectorAll(".filter-input").forEach((input) => {
    input.addEventListener("input", (e) => {
      state.filter = e.target.value.trim().toLowerCase();
      document.querySelectorAll(".filter-input").forEach((other) => { if (other !== e.target) other.value = e.target.value; });
      if (state.popup) state.popup.remove();
      renderAll();
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const first = visibleClients().sort((a, b) => a.company.localeCompare(b.company))[0];
        if (first) focusClient(first.id);
      }
    });
  });

  function setFilter(value) {
    state.filter = value;
    document.querySelectorAll(".filter-input").forEach((i) => { i.value = value; });
  }

  $("client-list").addEventListener("click", (e) => {
    const card = e.target.closest(".card[data-id]");
    if (!card || e.target.closest("[data-action]")) return;
    focusClient(card.dataset.id);
  });
  $("client-list").addEventListener("keydown", (e) => {
    const card = e.target.closest(".card[data-id]");
    if (card && e.key === "Enter" && e.target === card) focusClient(card.dataset.id);
  });

  // Edit / remove buttons in the list and in popups
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const client = state.clients.find((c) => c.id === btn.dataset.id);
    if (!client) return;
    if (btn.dataset.action === "edit") openSheet(client);
    if (btn.dataset.action === "delete") deleteClient(client);
  });

  async function deleteClient(client) {
    const ok = await ask({
      title: `Remove ${client.company}?`,
      text: "Their pin will be taken off the map. You can add them again at any time.",
      actions: [{ label: "Keep", value: false }, { label: "Remove", value: true, kind: "primary", silent: true }],
    });
    if (!ok) return;
    feedback.play("remove");
    state.clients = state.clients.filter((c) => c.id !== client.id);
    if (state.popup) state.popup.remove();
    const saved = saveClients();
    renderAll();
    if (saved) toast(`${client.company} removed`);
  }

  function setPanelCollapsed(collapsed) {
    $("panel").classList.toggle("collapsed", collapsed);
    document.body.classList.toggle("panel-collapsed", collapsed);
    $("btn-reopen").hidden = !collapsed || isPhone();
  }
  $("btn-collapse").addEventListener("click", () => setPanelCollapsed(true));
  $("btn-reopen").addEventListener("click", () => setPanelCollapsed(false));
  $("sheet-grip").addEventListener("click", () => setPanelCollapsed(!$("panel").classList.contains("collapsed")));

  $("btn-add").addEventListener("click", () => openSheet());
  $("btn-add-empty").addEventListener("click", () => openSheet());

  /* ------------------------------------------------------------------ backup */

  $("btn-export").addEventListener("click", () => {
    const payload = { app: CONFIG.storageKey.replace(/\/v\d+$/, ""), version: 1, exportedAt: new Date().toISOString(), clients: state.clients };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${CONFIG.exportName}-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1500);
    toast(`Downloaded a backup of ${state.clients.length} ${nounFor(state.clients.length)}`);
  });

  $("btn-import").addEventListener("click", () => $("import-file").click());
  $("import-file").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    let incoming;
    try {
      const data = JSON.parse(await file.text());
      incoming = (Array.isArray(data) ? data : data.clients || []).filter(isValidClient);
      if (!incoming.length) throw new Error("empty");
    } catch {
      feedback.play("error");
      toast("That file isn't a map backup");
      return;
    }
    let mode = "replace";
    if (state.clients.length) {
      mode = await ask({
        title: `Import ${incoming.length} ${nounFor(incoming.length)}`,
        text: `Add them to the ${CONFIG.noun.many} already on the map, or replace the map with this file?`,
        actions: [{ label: "Cancel", value: null }, { label: "Replace", value: "replace", kind: "ink" }, { label: "Add to map", value: "merge", kind: "primary" }],
      });
      if (!mode) return;
    }
    const byId = new Map((mode === "merge" ? state.clients : []).map((c) => [c.id, c]));
    incoming.forEach((c) => {
      const id = c.id || uid();
      byId.set(id, { ...c, id });
    });
    state.clients = [...byId.values()];
    enforceSingleHQ(state.clients.find((c) => c.isHQ)?.id);
    const saved = saveClients();
    renderAll();
    fitAllClients();
    if (saved) {
      feedback.play("success");
      toast(`Imported ${incoming.length} ${nounFor(incoming.length)}`);
    }
  });

  /* ------------------------------------------------------------------ add / edit sheet */

  function openSheet(client = null) {
    if (state.popup) state.popup.remove();
    state.editingId = client?.id || null;
    state.draftLocation = client ? client.location : null;

    $("sheet-eyebrow").textContent = client ? `Edit ${CONFIG.noun.one}` : `New ${CONFIG.noun.one}`;
    $("sheet-title").textContent = client ? client.company : `Add a ${CONFIG.noun.one}`;
    $("btn-save").textContent = client ? "Save changes" : `Save ${CONFIG.noun.one}`;
    $("f-company").value = client?.company || "";
    $("f-client").value = client?.client || "";
    $("f-industry").value = client?.industry || "";
    $("f-since").value = client?.since || "";
    $("f-website").value = client?.website || "";
    $("f-phone").value = client?.phone || "";
    $("f-notes").value = client?.notes || "";
    $("f-hq").checked = !!client?.isHQ;
    $("f-loc").value = "";
    $("loc-results").hidden = true;
    document.querySelectorAll(".field.invalid").forEach((f) => f.classList.remove("invalid"));
    renderSelectedLocation();

    $("sheet").classList.add("open");
    $("sheet").setAttribute("aria-hidden", "false");
    document.body.classList.add("sheet-open");
    if (isPhone()) setPanelCollapsed(true);
    setTimeout(() => (client ? $("f-company") : $("f-company")).focus({ preventScroll: true }), 380);
    if (client) previewLocation(client.location);
  }

  function closeSheet() {
    $("sheet").classList.remove("open", "away");
    $("sheet").setAttribute("aria-hidden", "true");
    document.body.classList.remove("sheet-open");
    stopPicking();
    clearPreview();
    state.editingId = null;
    state.draftLocation = null;
  }

  $("sheet-close").addEventListener("click", closeSheet);
  $("btn-cancel").addEventListener("click", closeSheet);

  $("client-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const company = $("f-company").value.trim();
    $("f-company").closest(".field").classList.toggle("invalid", !company);
    $("f-loc").closest(".field").classList.toggle("invalid", !state.draftLocation);
    if (!company) {
      feedback.play("error");
      $("f-company").focus();
      toast("Add the company name");
      return;
    }
    if (!state.draftLocation) {
      feedback.play("error");
      $("f-loc").focus();
      toast(`Choose where the ${CONFIG.noun.one} is: search for it or click the map`);
      return;
    }

    const existing = state.clients.find((c) => c.id === state.editingId);
    const record = {
      ...(existing || {}),
      id: existing?.id || uid(),
      company,
      client: $("f-client").value.trim(),
      industry: $("f-industry").value.trim(),
      since: $("f-since").value.trim(),
      website: $("f-website").value.trim(),
      phone: $("f-phone").value.trim(),
      notes: $("f-notes").value.trim(),
      isHQ: $("f-hq").checked,
      location: state.draftLocation,
      createdAt: existing?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    if (existing) state.clients[state.clients.indexOf(existing)] = record;
    else state.clients.push(record);
    if (record.isHQ) enforceSingleHQ(record.id);
    const saved = saveClients();
    feedback.play(saved ? "success" : "error");

    closeSheet();
    if (!matchesFilter(record)) setFilter("");
    state.dropKey = existing ? null : groupKey(record.location);
    renderAll();
    focusClient(record.id);
    if (saved) toast(existing ? "Changes saved" : `${company} added to the map`);
  });

  function enforceSingleHQ(hqId) {
    state.clients.forEach((c) => { if (c.id !== hqId) c.isHQ = false; });
  }

  /* ------------------------------------------------------------------ location search */

  let searchTimer;
  let searchAbort;
  let results = [];
  let highlighted = -1;

  $("f-loc").addEventListener("input", (e) => {
    const q = e.target.value.trim();
    clearTimeout(searchTimer);
    if (q.length < 3) {
      $("loc-results").hidden = true;
      return;
    }
    searchTimer = setTimeout(() => searchPlaces(q), 500); // Nominatim allows ~1 request/second
  });

  $("f-loc").addEventListener("keydown", (e) => {
    const open = !$("loc-results").hidden && results.length;
    if (e.key === "Enter") {
      e.preventDefault();
      if (open) chooseResult(Math.max(0, highlighted));
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      highlighted = (highlighted + (e.key === "ArrowDown" ? 1 : -1) + results.length) % results.length;
      [...$("loc-results").children].forEach((li, i) => li.classList.toggle("hl", i === highlighted));
    } else if (e.key === "Escape") {
      e.stopPropagation();
      $("loc-results").hidden = true;
    }
  });

  async function nominatim(path, params, signal) {
    const url = `${NOMINATIM}/${path}?` + new URLSearchParams({
      format: "jsonv2", addressdetails: "1", "accept-language": "en", ...params,
    });
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`Nominatim ${res.status}`);
    return res.json();
  }

  async function searchPlaces(q) {
    searchAbort?.abort();
    searchAbort = new AbortController();
    $("loc-spinner").hidden = false;
    try {
      const data = await nominatim("search", { q, limit: "7", polygon_geojson: "1", polygon_threshold: "0.0005" }, searchAbort.signal);
      results = data.map(toLocation);
      highlighted = -1;
      const ul = $("loc-results");
      ul.innerHTML = results.length
        ? results.map((r, i) => `
            <li data-i="${i}">
              ${icon("pin")}
              <div>
                <div class="r-name">${esc(r.title)}<span class="r-type">${esc(r.type)}</span></div>
                <div class="r-sub">${esc(r.display)}</div>
              </div>
            </li>`).join("")
        : `<li class="r-empty">No matches. Try the city name, or click the spot on the map.</li>`;
      ul.hidden = false;
    } catch (err) {
      if (err.name !== "AbortError") toast("Location search isn't responding. Try again in a moment.");
    } finally {
      $("loc-spinner").hidden = true;
    }
  }

  $("loc-results").addEventListener("click", (e) => {
    const li = e.target.closest("li[data-i]");
    if (li) chooseResult(Number(li.dataset.i));
  });

  function chooseResult(i) {
    const loc = results[i];
    if (!loc) return;
    $("loc-results").hidden = true;
    $("f-loc").value = "";
    useLocation(loc);
  }

  async function useLocation(loc, { picked = false } = {}) {
    state.draftLocation = loc;
    $("f-loc").closest(".field").classList.remove("invalid");
    renderSelectedLocation();
    previewLocation(loc, { move: !picked });
    if (loc.geojson) return;
    const withArea = await findCityArea(loc);
    if (withArea && state.draftLocation === loc) {
      state.draftLocation = withArea;
      renderSelectedLocation();
      previewLocation(withArea, { move: !picked });
    }
  }

  // Street addresses come back as points: look up the surrounding city or town
  // boundary so the whole area gets highlighted.
  async function findCityArea(loc) {
    const place = loc.city || loc.name;
    if (!place) return null;
    $("loc-spinner").hidden = false;
    try {
      const data = await nominatim("search", {
        q: [place, loc.region, loc.country].filter(Boolean).join(", "),
        limit: "5", polygon_geojson: "1", polygon_threshold: "0.0005",
      });
      const hit = data.find((r) => {
        if (!/Polygon/.test(r.geojson?.type || "")) return false;
        const [s, n, w, e] = r.boundingbox.map(Number);
        return loc.lat >= s && loc.lat <= n && loc.lng >= w && loc.lng <= e;
      });
      return hit ? { ...loc, geojson: hit.geojson, bbox: hit.boundingbox.map(Number), osmArea: `${hit.osm_type}/${hit.osm_id}` } : null;
    } catch {
      return null;
    } finally {
      $("loc-spinner").hidden = true;
    }
  }

  function toLocation(r) {
    const a = r.address || {};
    const city = a.city || a.town || a.village || a.municipality || a.hamlet || "";
    const areaLevel = /^(city|town|village|municipality|hamlet|suburb|county|state|country|region|province|district)$/.test(r.addresstype || "");
    const street = [a.house_number, a.road].filter(Boolean).join(" ");
    const title = r.name || street || city || (r.display_name || "").split(",")[0] || "Selected spot";
    const geo = r.geojson && /Polygon/.test(r.geojson.type) ? r.geojson : null;
    return {
      title,
      name: areaLevel ? (r.name || city) : (city || r.name || title),
      city: areaLevel && !city ? (r.name || "") : city,
      region: a.state || a.region || "",
      display: r.display_name || "",
      lat: Number(r.lat),
      lng: Number(r.lon),
      country: a.country || "",
      countryCode: (a.country_code || "").toUpperCase(),
      type: (r.addresstype || r.type || "place").replace(/_/g, " "),
      bbox: geo && Array.isArray(r.boundingbox) ? r.boundingbox.map(Number) : null,
      geojson: geo,
      osmArea: geo ? `${r.osm_type}/${r.osm_id}` : null,
    };
  }

  function renderSelectedLocation() {
    const box = $("loc-selected");
    const loc = state.draftLocation;
    box.hidden = !loc;
    if (!loc) return;
    box.innerHTML = `
      ${pinSvg("pin-main", "mini-pin")}
      <div>
        <div class="ls-name">${esc(placeLabel(loc) || loc.title || "Selected spot")}</div>
        <div class="ls-sub">${esc(loc.display)}</div>
        <div class="ls-meta">${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)}${loc.geojson ? " · <b>city area highlighted</b>" : ""}</div>
      </div>`;
  }

  function previewLocation(loc, { move = true } = {}) {
    clearPreview();
    map.getSource("preview-area")?.setData(loc.geojson ? { type: "Feature", properties: {}, geometry: loc.geojson } : emptyFC());
    const el = document.createElement("div");
    el.className = "pin preview";
    el.innerHTML = `<span class="pin-shadow"></span><div class="pin-body">${pinSvg("pin-main")}</div>`;
    state.previewMarker = new maplibregl.Marker({ element: el, anchor: "bottom" }).setLngLat([loc.lng, loc.lat]).addTo(map);
    if (move) focusLocation(loc, { duration: 2000 });
  }

  function clearPreview() {
    state.previewMarker?.remove();
    state.previewMarker = null;
    map.getSource("preview-area")?.setData(emptyFC());
  }

  /* ------------------------------------------------------------------ pick on map */

  $("btn-pick").addEventListener("click", () => {
    state.picking = true;
    $("loc-results").hidden = true;
    $("sheet").classList.add("away");
    $("pick-hint").hidden = false;
    $("map").classList.add("picking");
    if (map.getZoom() < 3) map.easeTo({ zoom: 3, duration: 700 });
  });
  $("btn-pick-cancel").addEventListener("click", stopPicking);

  function stopPicking() {
    state.picking = false;
    $("pick-hint").hidden = true;
    $("map").classList.remove("picking");
    $("sheet").classList.remove("away");
  }

  map.on("click", (e) => {
    if (state.picking) pickAt(e.lngLat);
  });

  async function pickAt(lngLat) {
    feedback.play("pop");
    const { lat, lng } = lngLat.wrap();
    stopPicking();
    let loc = {
      title: "Selected spot", name: "", city: "", region: "", display: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
      lat, lng, country: "", countryCode: "", type: "pin", bbox: null, geojson: null, osmArea: null,
    };
    $("loc-spinner").hidden = false;
    try {
      const zoom = Math.max(10, Math.min(18, Math.round(map.getZoom()) + 2));
      const data = await nominatim("reverse", { lat, lon: lng, zoom });
      if (data && !data.error) loc = { ...toLocation(data), lat, lng, geojson: null, bbox: null, osmArea: null };
    } catch {
      toast("Couldn't find an address there, so the exact coordinates were kept");
    } finally {
      $("loc-spinner").hidden = true;
    }
    useLocation(loc, { picked: true });
  }

  /* ------------------------------------------------------------------ sound & haptics wiring */

  // One soft tap for buttons, cards and search results; specific actions play their own sound
  document.addEventListener("click", (e) => {
    const el = e.target.closest("button, .card[data-id], .loc-results li[data-i]");
    if (!el || el.dataset.sound === "none" || el.closest(".pin")) return;
    feedback.play("tap");
  }, true);

  $("f-hq").addEventListener("change", () => feedback.play("toggle"));

  function renderSoundButton() {
    const btn = $("btn-sound");
    btn.innerHTML = icon(feedback.on ? "soundOn" : "soundOff");
    btn.classList.toggle("on", feedback.on);
    btn.setAttribute("aria-pressed", String(feedback.on));
    btn.title = feedback.on ? "Turn off sound and haptics" : "Turn on sound and haptics";
  }
  $("btn-sound").addEventListener("click", () => {
    feedback.setOn(!feedback.on);
    renderSoundButton();
    toast(feedback.on ? "Sound and haptics on" : "Sound and haptics off");
  });

  /* ------------------------------------------------------------------ keyboard */

  document.addEventListener("keydown", (e) => {
    const typing = /INPUT|TEXTAREA/.test(document.activeElement?.tagName || "");
    if (e.key === "/" && !typing && $("modal").hidden) {
      e.preventDefault();
      document.querySelector(isPhone() ? ".panel .filter-input" : ".topbar .filter-input").focus();
    }
    if (e.key !== "Escape" || !$("modal").hidden) return;
    if (state.picking) stopPicking();
    else if ($("sheet").classList.contains("open")) closeSheet();
    else if (state.popup) state.popup.remove();
  });

  /* ------------------------------------------------------------------ boot */

  hydrateIcons();
  renderSoundButton();
  renderList();
  renderStats();
  if (isPhone()) setPanelCollapsed(true);

  // Read-only handle for automated checks: open the page with ?qa
  if (new URLSearchParams(location.search).has("qa")) window.__ethixwebQA = { map, state, feedback, config: CONFIG };
})();
