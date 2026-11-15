import { bindWorkspacePanels } from './panels.js';
import {
  browserGeoAiDefinition, browserGeoAiLanguage, browserGeoAiScopeCheck, buildBrowserGeoAiMessages, configureBrowserGeoAiIdleTimeout,
  generateBrowserGeoAi, hasUnsupportedGeoAiImpact, hasUnsupportedGeoAiMeasurement, releaseBrowserGeoAi
} from './geoai-local.js';
import { MONTHS, UI, MODULE_COPY, VERIFICATION, englishLabel, englishPlace, eventKind, evidenceLimit, viewportFindings } from './english.js';

function uiIcon(name) {
  return '<svg class="ui-icon" aria-hidden="true"><use href="/icons.svg#' + name + '"/></svg>';
}

function presentationText(text) {
  return String(text || '').replace(/\p{Extended_Pictographic}[\uFE0F\uFE0E]? */gu, '').trim();
}

const MODULE_CARDS = [
  { code: 'water_wetland', icon: 'droplet' },
  { code: 'wildfire_ecosystem', icon: 'flame' },
  { code: 'ground_deformation_landslide', icon: 'mountain' },
  { code: 'coastal_change', icon: 'waves' },
  { code: 'agriculture_vegetation', icon: 'leaf' },
  { code: 'flood_inundation', icon: 'cloud-rain' },
  { code: 'mining_land_conversion', icon: 'pickaxe' },
  { code: 'urban_sprawl_hermitage', icon: 'building-2' }
];

const YEARS_LIST = [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];

const monthName = (month) => MONTHS[month - 1] || MONTHS[7];

const WAYBACK_FALLBACK_RELEASES = {
  2018: { release_id: '239', release_date: '2018-08-15' },
  2019: { release_id: '13161', release_date: '2019-08-21' },
  2020: { release_id: '119', release_date: '2020-08-12' },
  2021: { release_id: '26120', release_date: '2021-08-25' },
  2022: { release_id: '45441', release_date: '2022-08-17' },
  2023: { release_id: '64776', release_date: '2023-08-16' },
  2024: { release_id: '60013', release_date: '2024-08-14' },
  2025: { release_id: '58924', release_date: '2025-07-16' },
  2026: { release_id: '63116', release_date: '2026-02-26' }
};

const MIN_MAP_ZOOM = 5;
const MAX_MAP_ZOOM = 18;

const state = {
  mapCenterLat: 36.818,
  mapCenterLon: 28.215,
  mapZoom: 13,

  selectedLat: 36.818,
  selectedLon: 28.215,
  selectedAreaHa: 9420.0,
  selectedPlaceName: 'Marmaris — Armutalan, İçmeler, Turunç & Hisarönü Wildfire',
  selectedModule: 'wildfire_ecosystem',
  selectedRole: 'citizen',
  activeHotspotId: 'fire_marmaris_icmeler_2021',

  imageryMode: 'wayback', // 'wayback' (0.5m-1m, native max z=17) or 's2' (Sentinel-2 10m, native max z=14)
  showPolygons: true,
  showLabels: true,

  leftYear: 2020,
  rightYear: 2022,
  selectedYear: 2022,
  selectedMonth: 8,
  pendingFirstYearClick: null,
  eventsTabOpen: false,

  autoFollowViewport: false,
  swipeActive: true,
  swipePercent: 50,
  isDraggingSwipe: false,

  isDrawingPolygon: false,
  drawnPoints: [],
  hoverLonLat: null,
  customPolygonRing: null,

  isPanningMap: false,
  panStartScreen: null,
  panStartCenter: null,
  didDragMap: false,

  currentViewportAnalysis: null,
  geoAiStatus: null,
  isAskingGeoAi: false,
  chatHistory: [],
  chatTopic: null,
  tileCache: new Map(),
  tileStats: {
    loadedCount: 0,
    inFlightCount: 0,
    fallbackCount: 0,
    lastFallbackNotice: null
  }
};

// Web Mercator Slippy Tile Math (EPSG:3857)
function lonToTileX(lon, z) {
  return ((lon + 180) / 360) * Math.pow(2, z);
}
function latToTileY(lat, z) {
  const rad = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * Math.pow(2, z);
}
function tileXToLon(x, z) {
  return (x / Math.pow(2, z)) * 360 - 180;
}
function tileYToLat(y, z) {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

function getGroundResolutionMetersPerPixel(lat, zoom) {
  const cosLat = Math.cos(((lat || 37.0) * Math.PI) / 180);
  return (156543.03392 * cosLat) / Math.pow(2, zoom);
}

function getMaxNativeZoomForMode(mode) {
  // EOX Sentinel-2 L2A Cloudless has native tiles up to z=14 (10m/pixel).
  // Esri World Imagery Wayback has native tiles across all Muğla releases (2018-2026) up to z=17 (~0.6m/pixel).
  return mode === 's2' ? 14 : 17;
}

function lonLatToScreenXY(lon, lat, width, height) {
  const z = state.mapZoom;
  const centerTx = lonToTileX(state.mapCenterLon, z);
  const centerTy = latToTileY(state.mapCenterLat, z);
  const ptTx = lonToTileX(lon, z);
  const ptTy = latToTileY(lat, z);
  return [(ptTx - centerTx) * 256 + width / 2, (ptTy - centerTy) * 256 + height / 2];
}

function screenXYToLonLat(x, y, width, height) {
  const z = state.mapZoom;
  const centerTx = lonToTileX(state.mapCenterLon, z);
  const centerTy = latToTileY(state.mapCenterLat, z);
  const ptTx = centerTx + (x - width / 2) / 256;
  const ptTy = centerTy + (y - height / 2) / 256;
  return [Number(tileXToLon(ptTx, z).toFixed(5)), Number(tileYToLat(ptTy, z).toFixed(5))];
}

function computePolygonAreaHa(ring) {
  if (!ring || ring.length < 3) return 450;
  let areaDeg2 = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i];
    const [x2, y2] = ring[(i + 1) % ring.length];
    areaDeg2 += x1 * y2 - x2 * y1;
  }
  areaDeg2 = Math.abs(areaDeg2) / 2;
  return Math.max(15, Number((areaDeg2 * 986570).toFixed(1)));
}

function getActiveAoiPolygonRing() {
  if (state.customPolygonRing && state.customPolygonRing.length >= 3) {
    return state.customPolygonRing;
  }
  const activeSpot = (state.currentViewportAnalysis?.affected_hotspots || []).find((h) => h.id === state.activeHotspotId);
  if (activeSpot?.polygon_ring && activeSpot.polygon_ring.length >= 3) {
    return activeSpot.polygon_ring;
  }
  const lat = state.selectedLat;
  const lon = state.selectedLon;
  const sideKm = Math.sqrt(Math.max(4, Math.min(250, state.selectedAreaHa / 100)));
  const dLat = sideKm / 111.1 / 2;
  const dLon = sideKm / 88.8 / 2;
  return [
    [lon - dLon, lat + dLat],
    [lon + dLon, lat + dLat],
    [lon + dLon, lat - dLat],
    [lon - dLon, lat - dLat],
    [lon - dLon, lat + dLat]
  ];
}

function resolveClientWaybackMeta(year) {
  const comp = state.currentViewportAnalysis?.comparison;
  if (comp?.left_imagery && comp.left_imagery.year === Number(year)) {
    return {
      release_id: comp.left_imagery.release_id,
      release_date: comp.left_imagery.wayback_release_date
    };
  }
  if (comp?.right_imagery && comp.right_imagery.year === Number(year)) {
    return {
      release_id: comp.right_imagery.release_id,
      release_date: comp.right_imagery.wayback_release_date
    };
  }
  return WAYBACK_FALLBACK_RELEASES[year] || WAYBACK_FALLBACK_RELEASES[2026];
}

function getDirectDatedTileUrls(year, month, z, y, x, modeOverride = null) {
  const yr = Number(year) || 2026;
  const mo = Number(month) || 8;
  const mode = modeOverride || state.imageryMode;

  if (mode === 's2') {
    const eoxYr = Math.max(2018, Math.min(2024, yr));
    return {
      primary: `https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-${eoxYr}_3857/default/g/${z}/${y}/${x}.jpg`,
      fallback: `/api/v1/map-tiles/dated/${yr}/${mo}/${z}/${y}/${x}?mode=s2`,
      baseFallback: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`
    };
  }

  const wb = resolveClientWaybackMeta(yr);
  return {
    primary: `https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/${wb.release_id}/${z}/${y}/${x}`,
    fallback: `/api/v1/map-tiles/dated/${yr}/${mo}/${z}/${y}/${x}?mode=wayback`,
    baseFallback: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`
  };
}

let renderPending = false;

function scheduleMapRender() {
  if (renderPending) return;
  renderPending = true;
  requestAnimationFrame(() => {
    renderPending = false;
    renderSatelliteMap();
  });
}

// Cancel pending tile requests from intermediate zoom levels so rapid zooming never starves the active zoom level
function abortStaleInFlightTiles(activeFetchZ) {
  for (const [key, entry] of state.tileCache.entries()) {
    if (!entry.loaded && !entry.isOverview && entry.z !== undefined && Math.abs(entry.z - activeFetchZ) >= 1) {
      entry.aborted = true;
      entry.img.onload = null;
      entry.img.onerror = null;
      entry.img.src = '';
      state.tileCache.delete(key);
    }
  }
}

function getTileImage(primaryUrl, fallbackUrl = null, meta = {}) {
  if (state.tileCache.has(primaryUrl)) {
    return state.tileCache.get(primaryUrl);
  }
  const img = new Image();
  img.crossOrigin = 'anonymous';
  const entry = {
    img,
    loaded: false,
    failed: false,
    usedFallback: false,
    retryCount: 0,
    z: meta.z,
    yr: meta.yr,
    month: meta.month,
    x: meta.x,
    y: meta.y,
    isOverview: Boolean(meta.isOverview)
  };

  state.tileStats.inFlightCount++;

  img.onload = () => {
    if (entry.aborted) return;
    state.tileStats.inFlightCount = Math.max(0, state.tileStats.inFlightCount - 1);
    state.tileStats.loadedCount++;
    entry.loaded = true;
    entry.failed = false;
    scheduleMapRender();
  };

  img.onerror = () => {
    if (entry.aborted) return;
    // 1. Controlled retry on primary CDN URL (handles transient network hiccups)
    if (entry.retryCount === 0) {
      entry.retryCount = 1;
      setTimeout(() => {
        if (!entry.aborted) {
          img.src = primaryUrl + (primaryUrl.includes('?') ? '&' : '?') + 'retry=1';
        }
      }, 220);
      return;
    }

    // 2. Try local backend tile proxy / cache
    if (entry.retryCount === 1 && fallbackUrl && fallbackUrl !== primaryUrl) {
      entry.retryCount = 2;
      img.src = fallbackUrl;
      return;
    }

    // 3. If tile is unavailable at this zoom level, trigger parent zoom tile of the SAME historical year/mode
    state.tileStats.inFlightCount = Math.max(0, state.tileStats.inFlightCount - 1);
    entry.failed = true;
    state.tileStats.fallbackCount++;

    if (meta.z && meta.z > MIN_MAP_ZOOM && meta.yr !== undefined && meta.x !== undefined && meta.y !== undefined) {
      const pz = meta.z - 1;
      const ptx = Math.floor(meta.x / 2);
      const pty = Math.floor(meta.y / 2);
      const pUrls = getDirectDatedTileUrls(meta.yr, meta.month || state.selectedMonth, pz, pty, ptx);
      getTileImage(pUrls.primary, pUrls.fallback, {
        z: pz,
        yr: meta.yr,
        month: meta.month || state.selectedMonth,
        x: ptx,
        y: pty,
        isOverview: pz <= 9
      });
    }
    scheduleMapRender();
  };

  img.src = primaryUrl;
  state.tileCache.set(primaryUrl, entry);
  return entry;
}

// Pre-warm Muğla province low-zoom overview pyramid (z=5..9) so zooming in/out NEVER shows a dark canvas
function prewarmMuglaOverviewTiles() {
  const muglaCenterLat = 36.95;
  const muglaCenterLon = 28.35;
  const yearsToWarm = state.swipeActive ? [state.leftYear, state.rightYear] : [state.rightYear];

  for (const yr of yearsToWarm) {
    for (const z of [5, 6, 7, 8, 9]) {
      const cx = Math.floor(lonToTileX(muglaCenterLon, z));
      const cy = Math.floor(latToTileY(muglaCenterLat, z));
      const span = z <= 7 ? 0 : 1;
      for (let dy = -span; dy <= span; dy++) {
        for (let dx = -span; dx <= span; dx++) {
          const tx = cx + dx;
          const ty = cy + dy;
          const urls = getDirectDatedTileUrls(yr, state.selectedMonth, z, ty, tx);
          getTileImage(urls.primary, urls.fallback, {
            z,
            yr,
            month: state.selectedMonth,
            x: tx,
            y: ty,
            isOverview: true
          });
        }
      }
    }
  }
}

function drawParentOrChildPyramidFallback(ctx, yr, month, z, wrappedTx, ty, drawX, drawY, fetchZ, maxNativeZ) {
  let drewFallback = false;

  // Step A: Search Multi-Level Ancestor Tiles (pz = fetchZ - 1 down to MIN_MAP_ZOOM = 5) of the SAME year & mode
  for (let pz = fetchZ - 1; pz >= MIN_MAP_ZOOM; pz--) {
    const pScale = Math.pow(2, z - pz);
    const ptx = Math.floor(wrappedTx / pScale);
    const pty = Math.floor(ty / pScale);
    const pUrls = getDirectDatedTileUrls(yr, month, pz, pty, ptx);
    const pObj = state.tileCache.get(pUrls.primary);
    if (pObj && pObj.loaded) {
      const subSize = 256 / pScale;
      const sx = (wrappedTx % pScale) * subSize;
      const sy = (ty % pScale) * subSize;
      ctx.drawImage(pObj.img, sx, sy, subSize, subSize, drawX, drawY, 256, 256);
      drewFallback = true;
      break;
    }
  }

  // Step B: If no same-mode ancestor was in cache yet, check alternate mode (Wayback <-> S2) ancestor in cache
  if (!drewFallback) {
    const altMode = state.imageryMode === 's2' ? 'wayback' : 's2';
    for (let pz = Math.min(fetchZ, 14); pz >= MIN_MAP_ZOOM; pz--) {
      const pScale = Math.pow(2, z - pz);
      const ptx = Math.floor(wrappedTx / pScale);
      const pty = Math.floor(ty / pScale);
      const altUrls = getDirectDatedTileUrls(yr, month, pz, pty, ptx, altMode);
      const altObj = state.tileCache.get(altUrls.primary);
      if (altObj && altObj.loaded) {
        const subSize = 256 / pScale;
        const sx = (wrappedTx % pScale) * subSize;
        const sy = (ty % pScale) * subSize;
        ctx.drawImage(altObj.img, sx, sy, subSize, subSize, drawX, drawY, 256, 256);
        drewFallback = true;
        break;
      }
    }
  }

  // Step C: When zooming OUT (e.g. z=13 -> z=12 -> z=11), also draw any already-loaded higher-zoom child tiles (z+1, z+2)
  for (let cz = z + 1; cz <= Math.min(maxNativeZ, z + 2); cz++) {
    const cScale = Math.pow(2, cz - z); // 2 for z+1, 4 for z+2
    const subDrawSize = 256 / cScale;
    for (let cyOff = 0; cyOff < cScale; cyOff++) {
      for (let cxOff = 0; cxOff < cScale; cxOff++) {
        const ctxChild = wrappedTx * cScale + cxOff;
        const ctyChild = ty * cScale + cyOff;
        const cUrls = getDirectDatedTileUrls(yr, month, cz, ctyChild, ctxChild);
        const cObj = state.tileCache.get(cUrls.primary);
        if (cObj && cObj.loaded) {
          ctx.drawImage(
            cObj.img,
            drawX + cxOff * subDrawSize,
            drawY + cyOff * subDrawSize,
            subDrawSize,
            subDrawSize
          );
          drewFallback = true;
        }
      }
    }
  }

  // Step D: Ensure low-zoom overview tile (z=6) is requested if nothing was drawn yet
  if (!drewFallback) {
    const oz = 6;
    const oScale = Math.pow(2, z - oz);
    const otx = Math.floor(wrappedTx / oScale);
    const oty = Math.floor(ty / oScale);
    const oUrls = getDirectDatedTileUrls(yr, month, oz, oty, otx);
    const oObj = getTileImage(oUrls.primary, oUrls.fallback, {
      z: oz,
      yr,
      month,
      x: otx,
      y: oty,
      isOverview: true
    });
    if (oObj && oObj.loaded) {
      const subSize = 256 / oScale;
      const sx = (wrappedTx % oScale) * subSize;
      const sy = (ty % oScale) * subSize;
      ctx.drawImage(oObj.img, sx, sy, subSize, subSize, drawX, drawY, 256, 256);
      drewFallback = true;
    } else {
      ctx.fillStyle = '#0c1829';
      ctx.fillRect(drawX, drawY, 256, 256);
    }
  }
}

function drawDatedSatelliteLayer(ctx, year, month, width, height) {
  const z = state.mapZoom;
  const yr = Number(year) || 2026;
  const centerTx = lonToTileX(state.mapCenterLon, z);
  const centerTy = latToTileY(state.mapCenterLat, z);

  const halfTilesX = Math.ceil(width / 512) + 1;
  const halfTilesY = Math.ceil(height / 512) + 1;

  const minTx = Math.floor(centerTx - halfTilesX);
  const maxTx = Math.floor(centerTx + halfTilesX);
  const minTy = Math.floor(centerTy - halfTilesY);
  const maxTy = Math.floor(centerTy + halfTilesY);
  const maxTileIdx = Math.pow(2, z);

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const maxNativeZ = getMaxNativeZoomForMode(state.imageryMode);
  const fetchZ = Math.min(z, maxNativeZ);
  const overScale = Math.pow(2, z - fetchZ);

  for (let ty = minTy; ty <= maxTy; ty++) {
    if (ty < 0 || ty >= maxTileIdx) continue;
    for (let tx = minTx; tx <= maxTx; tx++) {
      const wrappedTx = ((tx % maxTileIdx) + maxTileIdx) % maxTileIdx;
      const drawX = Math.round((tx - centerTx) * 256 + width / 2);
      const drawY = Math.round((ty - centerTy) * 256 + height / 2);

      const srcTx = Math.floor(wrappedTx / overScale);
      const srcTy = Math.floor(ty / overScale);
      const urls = getDirectDatedTileUrls(yr, month, fetchZ, srcTy, srcTx);
      const tileObj = getTileImage(urls.primary, urls.fallback, {
        z: fetchZ,
        yr,
        month,
        x: srcTx,
        y: srcTy,
        isOverview: fetchZ <= 9
      });

      if (tileObj.loaded) {
        if (overScale === 1) {
          ctx.drawImage(tileObj.img, drawX, drawY, 256, 256);
        } else {
          const subSize = 256 / overScale;
          const sx = (wrappedTx % overScale) * subSize;
          const sy = (ty % overScale) * subSize;
          ctx.drawImage(tileObj.img, sx, sy, subSize, subSize, drawX, drawY, 256, 256);
        }
      } else {
        drawParentOrChildPyramidFallback(ctx, yr, month, z, wrappedTx, ty, drawX, drawY, fetchZ, maxNativeZ);
      }
    }
  }
}

function drawLabelsLayer(ctx, width, height) {
  if (!state.showLabels) return;
  const z = state.mapZoom;
  const fetchZ = Math.min(z, 17);
  const overScale = Math.pow(2, z - fetchZ);
  const centerTx = lonToTileX(state.mapCenterLon, z);
  const centerTy = latToTileY(state.mapCenterLat, z);

  const halfTilesX = Math.ceil(width / 512) + 1;
  const halfTilesY = Math.ceil(height / 512) + 1;

  const minTx = Math.floor(centerTx - halfTilesX);
  const maxTx = Math.floor(centerTx + halfTilesX);
  const minTy = Math.floor(centerTy - halfTilesY);
  const maxTy = Math.floor(centerTy + halfTilesY);
  const maxTileIdx = Math.pow(2, z);

  for (let ty = minTy; ty <= maxTy; ty++) {
    if (ty < 0 || ty >= maxTileIdx) continue;
    for (let tx = minTx; tx <= maxTx; tx++) {
      const wrappedTx = ((tx % maxTileIdx) + maxTileIdx) % maxTileIdx;
      const drawX = Math.round((tx - centerTx) * 256 + width / 2);
      const drawY = Math.round((ty - centerTy) * 256 + height / 2);

      const srcTx = Math.floor(wrappedTx / overScale);
      const srcTy = Math.floor(ty / overScale);
      const primary = `https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/${fetchZ}/${srcTy}/${srcTx}`;
      const fallback = `/api/v1/map-tiles/labels/${fetchZ}/${srcTy}/${srcTx}`;
      const tileObj = getTileImage(primary, fallback, { z: fetchZ, x: srcTx, y: srcTy, isOverview: fetchZ <= 8 });
      if (tileObj.loaded) {
        if (overScale === 1) {
          ctx.drawImage(tileObj.img, drawX, drawY, 256, 256);
        } else {
          const subSize = 256 / overScale;
          const sx = (wrappedTx % overScale) * subSize;
          const sy = (ty % overScale) * subSize;
          ctx.drawImage(tileObj.img, sx, sy, subSize, subSize, drawX, drawY, 256, 256);
        }
      }
    }
  }
}

function updateResolutionNoticeBanner() {
  const banner = document.getElementById('resolutionNoticeBanner');
  if (!banner) return;

  const maxNativeZ = getMaxNativeZoomForMode(state.imageryMode);
  if (state.imageryMode === 's2' && state.mapZoom > 14) {
    banner.innerHTML = `
      <span><b>Native resolution:</b> Sentinel-2 L2A is <b>10 m per pixel</b> at a native maximum zoom of 14x. The current <b>${state.mapZoom}x</b> view is upscaled.</span>
      <button id="btnSwitchToHighRes" class="res-switch-btn">Switch to 0.5–1 m Basemap</button>
    `;
    banner.style.display = 'flex';
    const btnSwitch = banner.querySelector('#btnSwitchToHighRes');
    if (btnSwitch) {
      btnSwitch.addEventListener('click', () => {
        state.imageryMode = 'wayback';
        const sel = document.getElementById('selectImageryMode');
        if (sel) sel.value = 'wayback';
        prewarmMuglaOverviewTiles();
        updateResolutionNoticeBanner();
        updateSwipeUI();
        scheduleMapRender();
      });
    }
    return;
  }

  if (state.imageryMode === 'wayback' && state.mapZoom > maxNativeZ) {
    banner.innerHTML = `
      <span><b>Native resolution:</b> Wayback imagery for Muğla has a native maximum zoom of <b>17x (~0.6 m/pixel)</b>. The <b>18x</b> view is upscaled from tiles of the same date.</span>
    `;
    banner.style.display = 'flex';
    return;
  }

  banner.style.display = 'none';
}

function renderSatelliteMap() {
  const viewport = document.getElementById('mapViewport');
  const canvasCurr = document.getElementById('mapCanvasCurrent');
  const canvasLeft = document.getElementById('mapCanvas2018');
  const svg = document.getElementById('mapOverlaySvg');
  if (!viewport || !canvasCurr || !svg) return;

  const zoomBadge = document.getElementById('lblZoomLevel');
  if (zoomBadge) {
    const maxZ = getMaxNativeZoomForMode(state.imageryMode);
    zoomBadge.textContent = `${state.mapZoom}x`;
    zoomBadge.title = `Current zoom: ${state.mapZoom}x (Native max: ${maxZ}x, Range: 5x–18x)`;
  }

  const width = viewport.clientWidth || 800;
  const height = viewport.clientHeight || 600;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const targetW = Math.round(width * dpr);
  const targetH = Math.round(height * dpr);

  if (canvasCurr.width !== targetW || canvasCurr.height !== targetH) {
    canvasCurr.width = targetW;
    canvasCurr.height = targetH;
    canvasLeft.width = targetW;
    canvasLeft.height = targetH;
  }
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

  const gsd = getGroundResolutionMetersPerPixel(state.mapCenterLat, state.mapZoom);
  const lblFooterRes = document.getElementById('lblFooterResolution');
  if (lblFooterRes) {
    const maxNativeZ = getMaxNativeZoomForMode(state.imageryMode);
    const nativeNote = state.mapZoom > maxNativeZ ? ` · Upscaled from ${maxNativeZ}x` : '';
    const sensorRes = state.imageryMode === 's2' ? '10m/pixel (Sentinel-2 L2A)' : '0.5m–1.0m/pixel (Wayback Optik)';
    lblFooterRes.textContent = `Sensor: ${sensorRes} • Display: ~${gsd.toFixed(1)} m/px (Zoom ${state.mapZoom}x${nativeNote})`;
  }

  // 1. Draw Right / AFTER Date Satellite Map with HiDPI scaling
  const ctxCurr = canvasCurr.getContext('2d');
  ctxCurr.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctxCurr.filter = 'none';
  ctxCurr.clearRect(0, 0, width, height);
  drawDatedSatelliteLayer(ctxCurr, state.rightYear, state.selectedMonth, width, height);
  drawLabelsLayer(ctxCurr, width, height);

  // 2. If Split-Screen Swipe is Active, draw Left / BEFORE Date Satellite Map on the left side
  if (state.swipeActive) {
    canvasLeft.style.display = 'block';
    const ctxLeft = canvasLeft.getContext('2d');
    ctxLeft.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctxLeft.filter = 'none';
    ctxLeft.clearRect(0, 0, width, height);
    const clipWidth = Math.round((width * state.swipePercent) / 100);

    ctxLeft.save();
    ctxLeft.beginPath();
    ctxLeft.rect(0, 0, clipWidth, height);
    ctxLeft.clip();

    drawDatedSatelliteLayer(ctxLeft, state.leftYear, state.selectedMonth, width, height);
    drawLabelsLayer(ctxLeft, width, height);
    ctxLeft.restore();
  } else {
    canvasLeft.style.display = 'none';
  }

  // 3. Draw Real Multi-Vertex Polygons & Interactive Pins on Map
  renderHotspotMarkersAndOutlines(svg, width, height);
}

function hexToRgba(hex, alpha) {
  const clean = (hex || '#f97316').replace('#', '');
  const num = parseInt(clean, 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function renderHotspotMarkersAndOutlines(svg, width, height) {
  let svgHtml = '';
  const theme = state.currentViewportAnalysis?.theme || { strokeColor: '#f97316', icon: '' };
  const hotspots = state.currentViewportAnalysis?.affected_hotspots || [];

  if (state.showPolygons) {
    for (const h of hotspots) {
      const isSelected = h.id === state.activeHotspotId;
      const isSusceptibility = h.provenance?.verification_status === 'SUSCEPTIBILITY_CORRIDOR';
      const strokeCol = isSelected ? '#fbbf24' : isSusceptibility ? '#38bdf8' : theme.strokeColor;
      const fillAlpha = isSelected ? 0.14 : 0.06;
      const dashAttr = isSusceptibility ? 'stroke-dasharray="8,5"' : isSelected ? '' : 'stroke-dasharray="6,4"';

      if (Array.isArray(h.polygon_ring) && h.polygon_ring.length >= 3) {
        const screenPts = h.polygon_ring.map(([lon, lat]) => lonLatToScreenXY(lon, lat, width, height));
        const visible = screenPts.some(([x, y]) => x >= -200 && x <= width + 200 && y >= -200 && y <= height + 200);
        if (!visible) continue;
        const pointsAttr = screenPts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
        svgHtml += `
          <polygon
            points="${pointsAttr}"
            fill="${hexToRgba(strokeCol, fillAlpha)}"
            stroke="${strokeCol}"
            stroke-width="${isSelected ? '2.6' : '1.9'}"
            ${dashAttr}
          />
        `;
      }
    }
  }

  if (state.customPolygonRing && state.customPolygonRing.length >= 3) {
    const screenPts = state.customPolygonRing.map(([lon, lat]) => lonLatToScreenXY(lon, lat, width, height));
    const pointsAttr = screenPts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
    svgHtml += `<polygon points="${pointsAttr}" fill="rgba(56,189,248,0.12)" stroke="#38bdf8" stroke-width="2.5" stroke-dasharray="6,4" />`;
  }

  if (state.isDrawingPolygon) {
    const dPts = state.drawnPoints.map(([lon, lat]) => lonLatToScreenXY(lon, lat, width, height));
    if (dPts.length >= 2) {
      const polyPts = dPts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
      svgHtml += `<polygon points="${polyPts}" fill="rgba(16,185,129,0.12)" stroke="#10b981" stroke-width="2.5" stroke-dasharray="6,4"/>`;
    }
    if (dPts.length >= 1 && state.hoverLonLat) {
      const [hx, hy] = lonLatToScreenXY(state.hoverLonLat[0], state.hoverLonLat[1], width, height);
      const [lx, ly] = dPts[dPts.length - 1];
      svgHtml += `<line x1="${lx.toFixed(1)}" y1="${ly.toFixed(1)}" x2="${hx.toFixed(1)}" y2="${hy.toFixed(1)}" stroke="#fbbf24" stroke-width="2" stroke-dasharray="4,4"/>`;
    }
    dPts.forEach(([x, y], idx) => {
      const isFirst = idx === 0;
      svgHtml += `
        <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${isFirst ? 7 : 5}" fill="${isFirst ? '#f59e0b' : '#10b981'}" stroke="#ffffff" stroke-width="2"/>
        <text x="${(x + 9).toFixed(1)}" y="${(y + 4).toFixed(1)}" fill="#fef3c7" font-size="11" font-weight="bold" style="paint-order:stroke;stroke:#09101e;stroke-width:3px;">${idx + 1}</text>
      `;
    });
  }

  svg.innerHTML = svgHtml;

  const pinsContainer = document.getElementById('mapHotspotsContainer');
  if (!pinsContainer) return;

  if (!state.showPolygons) {
    pinsContainer.innerHTML = '';
    return;
  }

  pinsContainer.innerHTML = hotspots
    .map((h, idx) => {
      const [cx, cy] = lonLatToScreenXY(h.lon, h.lat, width, height);
      if (cx < 10 || cx > width - 10 || cy < 25 || cy > height - 20) return '';
      const isSelected = h.id === state.activeHotspotId;
      const shortName = h.name.split('—')[0].trim();
      const verBadge = h.provenance?.verification_status === 'SUSCEPTIBILITY_CORRIDOR' ? 'Corridor' : 'Poligon';
      return `
        <div
          class="hotspot-map-pin ${isSelected ? 'active-pin' : ''}"
          data-hotspot-id="${h.id}"
          style="left:${cx.toFixed(1)}px;top:${(cy - 10).toFixed(1)}px;border-color:${isSelected ? 'var(--warning-text)' : theme.strokeColor};"
          title="${englishPlace(h.name, h.id)} (${VERIFICATION[h.verification_status] || verBadge} • Before: ${h.before_year} ➔ After: ${h.after_year})"
        >
          <span>${idx + 1}. ${shortName} (${h.event_year} • ${h.area_ha.toLocaleString('en-US')} ha)</span>
        </div>
      `;
    })
    .join('');

  pinsContainer.querySelectorAll('.hotspot-map-pin').forEach((pinEl) => {
    pinEl.addEventListener('click', async (ev) => {
      ev.stopPropagation();
      const hid = pinEl.getAttribute('data-hotspot-id');
      const spot = hotspots.find((x) => x.id === hid);
      if (spot) {
        await focusOnHotspotEvent(spot);
      }
    });
  });
}

async function focusOnHotspotEvent(spot) {
  state.activeHotspotId = spot.id;
  state.mapCenterLat = spot.lat;
  state.mapCenterLon = spot.lon;
  state.mapZoom = Math.max(MIN_MAP_ZOOM, Math.min(MAX_MAP_ZOOM, spot.zoom || 13));
  state.selectedLat = spot.lat;
  state.selectedLon = spot.lon;
  state.selectedAreaHa = spot.area_ha;
  state.selectedPlaceName = spot.name;
  state.leftYear = spot.before_year;
  state.rightYear = spot.after_year;
  state.selectedYear = spot.after_year;
  if (spot.event_month) {
    state.selectedMonth = spot.event_month;
    const selMo = document.getElementById('selectMonth');
    if (selMo) selMo.value = String(state.selectedMonth);
  }
  state.pendingFirstYearClick = null;
  state.customPolygonRing = null;
  state.swipeActive = true;
  prewarmMuglaOverviewTiles();
  updateResolutionNoticeBanner();
  await runViewportAnalysisAndRefreshUI();
}

function updateEventsTabUI() {
  const drawer = document.getElementById('affectedEventsDrawer');
  const btnTab = document.getElementById('btnToggleEventsTab');
  const count = state.currentViewportAnalysis?.affected_hotspots?.length || 0;
  if (!drawer || !btnTab) return;

  if (state.eventsTabOpen) {
    drawer.style.display = 'block';
    btnTab.classList.add('open');
    btnTab.innerHTML = `Events & Change (${count} events · Hide) ▲`;
  } else {
    drawer.style.display = 'none';
    btnTab.classList.remove('open');
    btnTab.innerHTML = `Events & Change (${count} events · Show) ▼`;
  }
}

function renderTwoYearButtonsBar() {
  const row = document.getElementById('twoYearButtonsRow');
  const lblPair = document.getElementById('lblSelectedYearPair');
  const mName = monthName(state.selectedMonth);
  if (!row) return;

  if (lblPair) {
    if (state.pendingFirstYearClick !== null) {
      lblPair.textContent = `First year: ${state.pendingFirstYearClick} ➔ Choose the second year`;
    } else {
      lblPair.textContent = `${state.leftYear} ➔ ${state.rightYear} (${mName})`;
    }
  }

  row.innerHTML = YEARS_LIST.map((yr) => {
    let cls = 'yr-pill-btn';
    let label = String(yr);
    if (state.pendingFirstYearClick !== null) {
      if (yr === state.pendingFirstYearClick) {
        cls += ' yr-before';
        label = `${yr} (first year)`;
      }
    } else {
      if (yr === state.leftYear) {
        cls += ' yr-before';
        label = `${yr}`;
      } else if (yr === state.rightYear) {
        cls += ' yr-after';
        label = `${yr} `;
      } else if (yr > state.leftYear && yr < state.rightYear) {
        cls += ' yr-between';
      }
    }
    return `<button class="${cls}" data-yr="${yr}" title="${yr} — Select year">${label}</button>`;
  }).join('');

  row.querySelectorAll('.yr-pill-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const clickedYr = Number(btn.getAttribute('data-yr'));
      if (state.pendingFirstYearClick === null) {
        state.pendingFirstYearClick = clickedYr;
        renderTwoYearButtonsBar();
      } else {
        const firstYr = state.pendingFirstYearClick;
        state.pendingFirstYearClick = null;
        if (clickedYr === firstYr) {
          state.leftYear = Math.max(2018, clickedYr - 1);
          state.rightYear = Math.min(2026, clickedYr + 1);
        } else {
          state.leftYear = Math.min(firstYr, clickedYr);
          state.rightYear = Math.max(firstYr, clickedYr);
        }
        state.selectedYear = state.rightYear;
        state.swipeActive = true;
        prewarmMuglaOverviewTiles();
        await runViewportAnalysisAndRefreshUI();
      }
    });
  });
}

function renderAffectedEventsAndChronologicalList(data) {
  const listEl = document.getElementById('affectedEventsList');
  const titleEl = document.getElementById('lblAffectedListTitle');
  if (!listEl) return;

  const hotspots = data.affected_hotspots || [];
  const chrono = data.chronological_changes || [];
  const mName = monthName(state.selectedMonth);

  if (titleEl) {
    titleEl.innerHTML = `<b>${MODULE_COPY[data.module_code]?.[0] || MODULE_COPY[state.selectedModule]?.[0] || 'Analysis'} (${state.leftYear} ➔ ${state.rightYear} ${mName}):</b> ${hotspots.length} reference events. Select an event to view it.`;
  }

  updateEventsTabUI();

  const hotspotCardsHtml = hotspots
    .map((h, i) => {
      const isSelected = h.id === state.activeHotspotId;
      const vBadge = VERIFICATION[h.verification_status] || 'Reference event';
      return `
        <div class="affected-event-card ${isSelected ? 'active-event' : ''}" data-spot-id="${h.id}">
          <div class="ae-card-top">
            <span>${h.start_date || h.event_year}</span>
            <span style="color:var(--text-main);">${h.before_year} ➔ ${h.after_year}</span>
          </div>
          <div class="ae-card-name">${i + 1}. ${englishPlace(h.name, h.id)}</div>
          <div class="ae-card-metric">${englishLabel(h.metric)}</div>
          <div style="font-size:9px;color:var(--text-muted);margin-top:2px;">${vBadge} • ${h.lat.toFixed(3)}°N, ${h.lon.toFixed(3)}°E</div>
        </div>
      `;
    })
    .join('');

  const chronoCardsHtml = chrono
    .map(
      (c) => `
        <div class="affected-event-card" data-chrono-yr="${c.year}" style="min-width:175px;border-color:var(--border);">
          <div class="ae-card-top">
            <span style="color:var(--text-main);">${c.year} (${mName})</span>
            <span style="color:var(--text-muted);">${Math.max(2018, c.year - 1)}➔${Math.min(2026, c.year + 1)}</span>
          </div>
          <div class="ae-card-name">${englishLabel(c.metric_summary)}</div>
          <div class="ae-card-metric" style="color:var(--text-muted);">${c.hotspot_id ? englishPlace(c.hotspot_name, c.hotspot_id) : 'Annual record'}</div>
        </div>
      `
    )
    .join('');

  listEl.innerHTML = hotspotCardsHtml + chronoCardsHtml;

  listEl.querySelectorAll('[data-spot-id]').forEach((card) => {
    card.addEventListener('click', async () => {
      const sid = card.getAttribute('data-spot-id');
      const spot = hotspots.find((x) => x.id === sid);
      if (spot) {
        await focusOnHotspotEvent(spot);
      }
    });
  });

  listEl.querySelectorAll('[data-chrono-yr]').forEach((card) => {
    card.addEventListener('click', async () => {
      const yr = Number(card.getAttribute('data-chrono-yr'));
      state.leftYear = Math.max(2018, yr - 1);
      state.rightYear = Math.min(2026, yr + 1);
      state.selectedYear = state.rightYear;
      state.swipeActive = true;
      prewarmMuglaOverviewTiles();
      await runViewportAnalysisAndRefreshUI();
    });
  });
}

function renderProvenanceCard(data) {
  const box = document.getElementById('provenanceCardBox');
  const leftVerifyPill = document.getElementById('lblSelectedVerificationBadge');
  if (!box) return;

  const p = data.provenance || {};
  const isVerified = p.verification_status === 'VERIFIED_EVENT' || p.verification_status === 'VERIFIED_EVENT_PERIMETER';
  const isSusceptibility = p.verification_status === 'HAZARD_SUSCEPTIBILITY_CORRIDOR';
  const verification = VERIFICATION[p.verification_status] || 'Reference record';
  const badgeColor = isVerified ? 'var(--success-text)' : isSusceptibility ? 'var(--accent-text)' : 'var(--warning-text)';

  if (leftVerifyPill) {
    leftVerifyPill.textContent = verification;
    leftVerifyPill.style.borderColor = badgeColor;
    leftVerifyPill.style.color = badgeColor;
  }

  box.innerHTML = `
    <div class="prov-row-top">
      <span class="prov-status-pill" style="border-color:${badgeColor};color:${badgeColor};">
        ${verification}
      </span>
      <span class="prov-meta-item"><b>Event type:</b> ${eventKind(data.module_code, isVerified || isSusceptibility)}</span>
      <span class="prov-meta-item"><b>Date:</b> ${p.start_date || '-'} ➔ ${p.end_date || '-'}</span>
      <span class="prov-meta-item"><b>Source:</b> ${englishLabel(p.data_source || '-')} (${englishLabel(p.data_version || '-')})</span>
    </div>
    <div class="prov-row-bottom">
      <span><b>Module method:</b> ${englishLabel(data.theme.spectral_formula)}</span>
      <span style="color:var(--warning-text);"><b>Uncertainty & limitations:</b> ${evidenceLimit(data.module_code, p.verification_status)}</span>
    </div>
  `;
}

function renderModuleCards() {
  const container = document.getElementById('moduleCardsContainer');
  container.innerHTML = MODULE_CARDS.map((m) => {
    const [title, description] = MODULE_COPY[m.code];
    const isActive = m.code === state.selectedModule;
    return `
      <button type="button" class="module-card ${isActive ? 'active' : ''}" data-module="${m.code}" aria-pressed="${isActive}">
        <span class="module-card-left">
          <span class="module-icon-box">${uiIcon(m.icon)}</span>
          <span class="module-card-copy">
            <span class="module-card-title">${title}</span>
            <span class="module-card-sub">${description}</span>
          </span>
        </span>
      </button>
    `;
  }).join('');

  container.querySelectorAll('.module-card').forEach((card) => {
    card.addEventListener('click', async () => {
      const code = card.getAttribute('data-module');
      state.selectedModule = code;
      state.pendingFirstYearClick = null;
      if (code !== state.currentViewportAnalysis?.module_code) {
        if (state.activeHotspotId) {
          state.selectedPlaceName = null;
          state.selectedAreaHa = 0;
        }
        state.activeHotspotId = null;
      }
      renderModuleCards();
      await runViewportAnalysisAndRefreshUI();
    });
  });
}

let analysisRequest = 0;
let studySelection = null;
let studySelectionError = null;

function activeAnalysisContext() {
  return {
    version: analysisRequest,
    ...studySelection,
    source: state.customPolygonRing ? 'drawn' : state.activeHotspotId ? 'event' : 'viewport',
    module_code: state.selectedModule,
    hotspot_id: state.activeHotspotId,
    drawn_aoi: state.customPolygonRing ? { crs: 'EPSG:4326', geometry: { type: 'Polygon', coordinates: [state.customPolygonRing] } } : null,
    lat: state.selectedLat, lon: state.selectedLon, area_ha: state.selectedAreaHa,
    place_name: state.selectedPlaceName,
    left_year: state.leftYear, right_year: state.rightYear, selected_month: state.selectedMonth
  };
}

function updateReportTarget() {
  const context = activeAnalysisContext();
  const target = document.getElementById('reportTarget');
  const generate = document.getElementById('btnGenerateReport');
  const active = context.source !== 'viewport';
  const label = context.place_name || (context.source === 'drawn' ? 'Drawn area' : 'Selected event');
  target.textContent = active
    ? `${label} · ${MODULE_COPY[context.module_code][0]} · ${context.left_year}–${context.right_year} (${monthName(context.selected_month)})${studySelectionError ? ` — ${studySelectionError}` : !studySelection ? ' — Updating analysis…' : ''}`
    : 'Select a verified event or draw an area before generating a report.';
  document.getElementById('btnOpenReport').title = target.textContent;
  generate.disabled = !active || !studySelection;
}

async function runViewportAnalysisAndRefreshUI() {
  const request = ++analysisRequest;
  studySelection = null;
  studySelectionError = null;
  updateReportTarget();
  const bbox = (() => {
    const ring = getActiveAoiPolygonRing();
    const lons = ring.map((p) => p[0]);
    const lats = ring.map((p) => p[1]);
    return [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)];
  })();

  renderTwoYearButtonsBar();
  updateSwipeUI();
  scheduleMapRender();

  const res = await fetch('/api/v1/viewport/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({ bbox, analysis_context: activeAnalysisContext() })
  }).catch((error) => {
    console.error('Viewport analysis request failed', error);
    return null;
  });
  const data = await res?.json().catch(() => null);
  if (request !== analysisRequest) return;
  if (!res?.ok || !data?.area) {
    console.error('Viewport analysis failed', res?.status);
    studySelectionError = 'The current analysis could not be loaded.';
    updateReportTarget();
    return;
  }
  studySelection = data.selection || null;
  studySelectionError = data.selection_error || null;
  state.currentViewportAnalysis = data;
  state.selectedPlaceName = englishPlace(data.area.name, data.provenance?.event_id);
  updateReportTarget();

  document.getElementById('lblSelectedHa').textContent = `${Math.round(data.area.area_ha).toLocaleString('en-US')} ha`;
  document.getElementById('lblSelectedName').textContent = englishPlace(data.area.name, data.provenance?.event_id);
  document.getElementById('lblSelectedCoords').textContent = `Center: ${data.area.lat.toFixed(4)}°N, ${data.area.lon.toFixed(4)}°E (EPSG:4326)`;

  document.getElementById('pillPlaceName').textContent = englishPlace(data.area.name, data.provenance?.event_id);
  const pillTag = document.getElementById('pillModuleTag');
  pillTag.textContent = MODULE_COPY[data.module_code]?.[0] || MODULE_COPY[state.selectedModule]?.[0] || 'Analysis';

  renderProvenanceCard(data);
  renderTwoYearButtonsBar();
  renderAffectedEventsAndChronologicalList(data);

  const mName = monthName(state.selectedMonth);
  const yrEntry =
    (data.timeline || []).find((t) => t.year === state.rightYear) || data.timeline?.[data.timeline.length - 1];
  if (yrEntry) {
    document.getElementById('lblTimelineMetricBadge').textContent = `[${state.leftYear} ➔ ${state.rightYear} ${mName} | ${yrEntry.label}]`;
  }

  const interpretation = document.getElementById('reasonsListBox');
  interpretation.textContent = viewportFindings(data);

  const all8 = [...data.row1_metrics, ...data.row2_metrics];
  document.getElementById('metricsGrid8').innerHTML = all8
    .map(
      (m) => `
        <div class="m-card">
          <div class="m-card-label">${englishLabel(m.label)}</div>
          <div class="m-card-val">${englishLabel(m.value)}</div>
        </div>
      `
    )
    .join('');

  document.getElementById('lblSensorFooter').textContent = englishLabel(data.sensor_footer);
  document.getElementById('lblRecommendationFooter').textContent = `Recommendation: ${MODULE_COPY[data.module_code]?.[2] || 'Check source coverage before interpreting this area.'}`;

  const ctxBanner = document.getElementById('geoAiContextBanner');
  if (ctxBanner) {
    const title = document.createElement('strong');
    title.textContent = state.customPolygonRing ? UI.drawnArea : englishPlace(data.area.name, data.provenance?.event_id);
    const detail = document.createElement('span');
    detail.textContent = `${MODULE_COPY[data.module_code]?.[0] || 'Analysis'} · ${state.leftYear}–${state.rightYear}`;
    ctxBanner.replaceChildren(title, detail);
  }

  updateSwipeUI();
  scheduleMapRender();
}

const GEOAI_SESSION_KEY = 'mugla-geoinsight.chat.v1';

function formatMarkdownToHtml(md) {
  return presentationText(md)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^#{2,4} (.+)$/gm, '<strong class="chat-heading">$1</strong>')
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br/>');
}

function createChatMessage(message) {
  const bubble = document.createElement('div');
  bubble.className = message.role === 'user' ? 'chat-msg-user' : 'chat-msg-ai';
  if (message.role === 'user') {
    bubble.textContent = message.content;
    return bubble;
  }
  const content = document.createElement('div');
  if (message.evidence) {
    const label = document.createElement('strong');
    label.textContent = 'GIS evidence';
    bubble.append(label);
  }
  content.innerHTML = formatMarkdownToHtml(message.content);
  bubble.append(content);
  if (message.warning) {
    const warning = document.createElement('div');
    warning.className = 'geoai-status-detail';
    warning.textContent = message.warning;
    bubble.append(warning);
  }
  return bubble;
}

function renderInitialGeoAiGreeting() {
  const stream = document.getElementById('geoAiChatStream');
  try {
    const saved = JSON.parse(sessionStorage.getItem(GEOAI_SESSION_KEY));
    if (Array.isArray(saved?.history)) {
      state.chatHistory = saved.history.slice(-16).filter((message) =>
        ['user', 'assistant'].includes(message?.role) && typeof message.content === 'string');
      state.chatTopic = saved.topic || null;
      state.chatTopicProvider = saved.topicProvider || 'server';
      state.chatTopicKey = saved.topicKey || null;
    }
  } catch { /* An unavailable session store does not prevent chat. */ }
  const welcome = UI.welcome;
  const messages = state.chatHistory.length ? state.chatHistory : [{ role: 'assistant', content: welcome }];
  stream.replaceChildren(...messages.map(createChatMessage));
  stream.scrollTop = stream.scrollHeight;
}

function renderGeoAiStatus(status) {
  state.geoAiStatus = status;
  const button = document.getElementById('btnGeoAiStatusInfo');
  button.textContent = status.badge_tr;
  button.dataset.connection = status.llm_connected ? 'connected' : status.llm_error ? 'error' : 'idle';
  document.getElementById('lblGeoAiEngineMode').textContent = status.provider;
  document.getElementById('lblGeoAiEngineNote').textContent = status.security_note_tr;
}

function renderBrowserGeoAiStatus(note = 'Send a message to load the model. The first run downloads about 630 MB. Chats run on this device.', ready = false) {
  renderGeoAiStatus({
    provider: 'Local Browser AI',
    badge_tr: 'Local Browser AI',
    security_note_tr: note,
    llm_connected: ready
  });
}

async function fetchAndRenderGeoAiStatus() {
  const select = document.getElementById('geoAiProvider');
  document.getElementById('geoAiPerformanceOptions').hidden = select.value !== 'browser';
  if (select.value === 'browser') return renderBrowserGeoAiStatus();
  releaseBrowserGeoAi();
  try {
    const response = await fetch('/api/v1/assistant/status');
    if (response.ok && select.value === 'server') {
      const status = await response.json();
      renderGeoAiStatus({ ...status,
        security_note_tr: `${status.security_note_tr} Prompts and relevant map evidence may be sent to the configured provider in this mode.`
      });
    }
  } catch { /* The first answer can also provide connection status. */ }
}

async function askReasoningGeoAi(questionText, previousBubble) {
  const question = questionText.trim();
  if (!question || state.isAskingGeoAi) return;
  const stream = document.getElementById('geoAiChatStream');
  const send = document.getElementById('btnSendGeoAi');
  const provider = document.getElementById('geoAiProvider');
  const localBrowser = provider.value === 'browser';
  const mode = document.getElementById('geoAiPerformance').value;
  const user = { role: 'user', content: question };
  const userBubble = previousBubble || createChatMessage(user);
  const pending = createChatMessage({ role: 'assistant', content: UI.thinking });
  const progress = pending.firstElementChild;
  const controller = new AbortController();
  const abortOnPageHide = () => controller.abort();
  let failedEvidence;
  const context = activeAnalysisContext();
  const allowPreviousArea = /(?:^|\s)(previous|earlier|prior|önceki|eski)\s+(drawn |selected )?(polygon|area|event|selection|bölge|alan|olay)/i.test(question);
  const addRetry = (message) => {
    pending.textContent = message;
    const retry = document.createElement('button');
    retry.className = 'hdr-btn';
    retry.type = 'button';
    retry.textContent = 'Retry';
    retry.onclick = () => {
      if (state.isAskingGeoAi) return;
      failedEvidence?.remove();
      pending.remove();
      void askReasoningGeoAi(question, userBubble);
    };
    pending.append(' ', retry);
  };
  state.isAskingGeoAi = true;
  send.disabled = true;
  provider.disabled = true;
  if (localBrowser) {
    window.addEventListener('pagehide', abortOnPageHide, { once: true });
    const stop = document.createElement('button');
    stop.className = 'hdr-btn';
    stop.type = 'button';
    stop.textContent = 'Stop';
    stop.onclick = () => controller.abort();
    pending.append(stop);
  }
  if (previousBubble) userBubble.after(pending);
  else stream.append(userBubble, pending);
  stream.scrollTop = stream.scrollHeight;

  try {
    const contextKey = JSON.stringify([context.source, context.hotspot_id, context.drawn_aoi, context.module_code,
      context.lat, context.lon, context.left_year, context.right_year, context.selected_month]);
    const contextualHistory = state.chatHistory.filter((message) =>
      (message.provider || 'server') === provider.value &&
      (!message.contextKey || message.contextKey === contextKey || allowPreviousArea));
    const language = localBrowser
      ? browserGeoAiLanguage(question, contextualHistory.findLast((message) => message.role === 'user')?.language)
      : 'en';
    const rememberedTopic = state.chatTopicProvider === provider.value &&
      (!localBrowser || allowPreviousArea || state.chatTopicKey === contextKey) ? state.chatTopic : null;
    const response = await fetch('/api/v1/assistant/query', {
      method: 'POST',
      signal: AbortSignal.any([controller.signal, AbortSignal.timeout(35_000)]),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: question,
        language,
        context_only: true,
        local_browser: localBrowser,
        topic_context: rememberedTopic,
        use_previous_area: allowPreviousArea,
        analysis_context: context,
        role: state.selectedRole,
        map_context: { imagery_mode: state.imageryMode },
        chat_history: (localBrowser ? contextualHistory.filter((message) => !message.evidence).slice(-6) : contextualHistory).map(({ role, content, intent }) =>
          ({ role, content: localBrowser ? content.slice(0, 640) : content, intent }))
      })
    }).catch((error) => {
      if (error.name === 'TimeoutError') throw new Error(UI.timedOut);
      throw new Error(`Unable to reach the local GeoAI server (${location.host}).`);
    });
    const data = await response.json().catch(() => null);
    if (!response.ok) {
      console.warn('GeoAI API request failed', { status: response.status });
      throw new Error(response.status === 400 && data?.error ? data.error : 'The GeoAI request could not be processed.');
    }
    if (!data?.reasoned_chat?.intent) throw new Error('GeoAI returned an invalid response.');
    if (controller.signal.aborted) throw controller.signal.reason;
    const result = data.reasoned_chat;
    let localWarning;
    let localEvidence;
    const evidenceOnly = localBrowser && result.browser_context?.evidence_only;
    if (localBrowser) {
      localEvidence = result.evidence_markdown;
    }
    if (localBrowser && !evidenceOnly) {
      const lastReplyIndex = contextualHistory.findLastIndex((message) => message.role === 'assistant' && message.intent !== 'social');
      const priorCard = contextualHistory[lastReplyIndex]?.evidence
        ? contextualHistory[lastReplyIndex] : contextualHistory[lastReplyIndex - 1];
      const priorEvidence = ['clarify', 'summarize'].includes(result.intent) && priorCard?.evidence ? priorCard.content : null;
      const reference = browserGeoAiDefinition(question, language);
      const selection = {
        module: MODULE_COPY[result.browser_context?.module || context.module_code]?.[0],
        comparison_years: [context.left_year, context.right_year]
      };
      const evidence = localEvidence && {
        ...result.browser_context,
        drawn: Boolean(data.aoi_analysis),
        verified_record: localEvidence?.slice(0, 1700)
      };
      const messages = buildBrowserGeoAiMessages(question, contextualHistory,
        selection, evidence, language, result.intent, mode, reference);
      const generated = await generateBrowserGeoAi(messages, controller.signal, (text) => {
        progress.textContent = text;
      }, {
        scopeCheck: browserGeoAiScopeCheck(question, language, result.intent, reference), mode,
        singleSentence: Boolean(reference || evidence?.area_question || (language === 'tr' && localEvidence && !evidence?.source_question)),
        onDraft: localEvidence || priorEvidence ? undefined : (text) => { progress.textContent = text; }
      }).catch((error) => {
        if (!localEvidence || controller.signal.aborted) throw error;
        localWarning = error.message;
        return null;
      });
      result.markdown_answer = generated?.text;
      if (result.markdown_answer && hasUnsupportedGeoAiMeasurement(result.markdown_answer, localEvidence || priorEvidence)) {
        result.markdown_answer = null;
        localWarning = 'The local model added a measurement that could not be verified.';
      }
      if (result.markdown_answer && hasUnsupportedGeoAiImpact(result.markdown_answer, localEvidence || priorEvidence)) {
        result.markdown_answer = null;
        localWarning = language === 'tr' ? 'Model kayıtla doğrulanmayan bir sonuç çıkardı. Doğrulanmış bulgu kanıt kartında yer alıyor.'
          : 'The model added a conclusion outside the record. The evidence card contains the verified finding.';
      }
      if (localEvidence && /^\s*(?:`{2,}|\{)/.test(result.markdown_answer || '')) {
        result.markdown_answer = null;
        localWarning = 'The local model could not produce a readable explanation.';
      }
      if (!result.markdown_answer && !localEvidence) throw new Error(localWarning || 'The local model returned an empty response.');
      if (generated) renderBrowserGeoAiStatus(`Model ready · Qwen3-0.6B · ${generated.device === 'wasm' ? 'CPU (WebAssembly)' : 'WebGPU'}`, true);
    }
    if (context.version !== analysisRequest && result.intent !== 'social' && !allowPreviousArea) {
      addRetry('The active analysis changed while the request was running.');
      return;
    }
    if (result.response_status === 'unavailable') {
      addRetry(result.markdown_answer);
      if (result.engine_status) renderGeoAiStatus(result.engine_status);
      return;
    }
    if (localBrowser && !result.markdown_answer && !evidenceOnly) {
      failedEvidence = createChatMessage({ role: 'assistant', content: localEvidence, evidence: true });
      pending.before(failedEvidence);
      addRetry(localWarning);
      return;
    }
    const answer = { role: 'assistant', content: result.markdown_answer, intent: result.intent, warning: result.api_warning, evidence: result.is_gis_evidence };
    const replies = localBrowser ? [
      localEvidence && { role: 'assistant', content: localEvidence, intent: result.intent, evidence: true, contextKey },
      answer.content && { ...answer, contextKey }
    ].filter(Boolean) : [answer];
    user.intent = result.intent;
    if (localBrowser) Object.assign(user, { contextKey, language });
    user.provider = provider.value;
    for (const reply of replies) reply.provider = provider.value;
    state.chatHistory = [...state.chatHistory, user, ...replies].slice(-16);
    if (result.topic_context) {
      state.chatTopic = result.topic_context;
      state.chatTopicProvider = provider.value;
      state.chatTopicKey = contextKey;
    } else if (evidenceOnly && !allowPreviousArea && state.chatTopicProvider === provider.value) {
      state.chatTopic = null;
      state.chatTopicKey = null;
    }
    try {
      sessionStorage.setItem(GEOAI_SESSION_KEY, JSON.stringify({
        history: state.chatHistory, topic: state.chatTopic, topicProvider: state.chatTopicProvider, topicKey: state.chatTopicKey
      }));
    } catch { /* The current page retains the conversation in memory. */ }
    pending.replaceWith(...replies.map(createChatMessage));
    if (result.engine_status) renderGeoAiStatus(result.engine_status);
  } catch (error) {
    pending.classList.add('geoai-status-detail');
    addRetry(controller.signal.aborted ? 'Generation stopped.' : `${UI.retry} ${error.message}`);
  } finally {
    window.removeEventListener('pagehide', abortOnPageHide);
    state.isAskingGeoAi = false;
    send.disabled = false;
    provider.disabled = false;
    while (stream.children.length > 48) stream.firstElementChild.remove();
    stream.scrollTop = stream.scrollHeight;
  }
}

function updateSwipeUI() {
  const btn = document.getElementById('btnToggleSwipe');
  const btnBot = document.getElementById('btnBottomSwipeToggle');
  const div = document.getElementById('swipeDivider');
  const lblL = document.getElementById('swipeLabelLeft');
  const lblR = document.getElementById('swipeLabelRight');
  const footerLbl = document.getElementById('lblSwipeFooterStatus');
  const footerMode = document.getElementById('lblFooterImageryMode');
  const mName = monthName(state.selectedMonth);

  const leftWb = resolveClientWaybackMeta(state.leftYear);
  const rightWb = resolveClientWaybackMeta(state.rightYear);

  const isS2 = state.imageryMode === 's2';
  const leftSourceLabel = isS2
    ? `Sentinel-2 L2A (${Math.min(2024, state.leftYear)} • 10m/px • Native max 14x)`
    : `Wayback Archive (${leftWb.release_date} • 0.5m–1m • #${leftWb.release_id})`;
  const rightSourceLabel = isS2
    ? `Sentinel-2 L2A (${Math.min(2024, state.rightYear)} • 10m/px • Native max 14x)`
    : `Wayback Archive (${rightWb.release_date} • 0.5m–1m • #${rightWb.release_id})`;

  if (footerMode) {
    footerMode.textContent = isS2
      ? 'Basemap: EOX Copernicus Sentinel-2 L2A (10m/pixel • EPSG:3857 • Native max zoom: 14x)'
      : 'Basemap: Esri World Imagery Wayback (0.5m–1.0m/pixel • EPSG:3857 • Native max zoom: 17x)';
  }

  btn.setAttribute('aria-pressed', state.swipeActive);
  if (state.swipeActive) {
    btn.classList.add('active');
    if (btnBot) btnBot.textContent = `Swipe On`;
    div.style.display = 'block';
    div.style.left = `${state.swipePercent}%`;
    lblL.style.display = 'block';
    lblL.innerHTML = `<b>BEFORE (${state.leftYear} ${mName}):</b> ${leftSourceLabel}`;
    lblR.style.display = 'block';
    lblR.innerHTML = `<b>AFTER (${state.rightYear} ${mName}):</b> ${rightSourceLabel} `;
    footerLbl.textContent = `Swipe Comparison (${state.leftYear} ${mName} vs ${state.rightYear} ${mName} • Shared projection EPSG:3857)`;
  } else {
    btn.classList.remove('active');
    if (btnBot) btnBot.textContent = `Enable Swipe`;
    div.style.display = 'none';
    lblL.style.display = 'none';
    lblR.style.display = 'block';
    lblR.innerHTML = `<b>ACTIVE IMAGERY (${state.rightYear} ${mName}):</b> ${rightSourceLabel}`;
    footerLbl.textContent = `Single Map View (${state.rightYear} ${mName})`;
  }
  scheduleMapRender();
}

async function selectCurrentScreenViewportAndAnalyze() {
  const viewport = document.getElementById('mapViewport');
  const w = viewport?.clientWidth || 800;
  const h = viewport?.clientHeight || 600;
  const [lon1, lat1] = screenXYToLonLat(w * 0.25, h * 0.18, w, h);
  const [lon2, lat2] = screenXYToLonLat(w * 0.75, h * 0.65, w, h);
  const ring = [
    [lon1, lat1],
    [lon2, lat1],
    [lon2, lat2],
    [lon1, lat2],
    [lon1, lat1]
  ];
  state.activeHotspotId = null;
  state.selectedLat = Number(state.mapCenterLat.toFixed(5));
  state.selectedLon = Number(state.mapCenterLon.toFixed(5));
  state.selectedAreaHa = computePolygonAreaHa(ring);
  state.selectedPlaceName = null;
  state.customPolygonRing = null;
  await runViewportAnalysisAndRefreshUI();
}

function openToolbarPopover(id, anchor) {
  const panel = document.getElementById(id);
  if (!panel.matches(':popover-open')) panel.showPopover();
  const rect = anchor.getBoundingClientRect();
  panel.style.top = `${Math.min(rect.bottom + 4, window.innerHeight - panel.offsetHeight - 8)}px`;
  panel.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - panel.offsetWidth - 8))}px`;
}

let searchVersion = 0;

async function searchAnyLocationInMugla() {
  const inp = document.getElementById('inpLocationSearch');
  const query = inp.value.trim();
  if (!query) return;
  const request = ++searchVersion;
  const results = document.getElementById('locationResults');
  const status = document.getElementById('locationStatus');
  const choices = document.getElementById('locationChoices');
  choices.replaceChildren();
  status.textContent = 'Searching Muğla…';
  openToolbarPopover(results.id, inp);
  const goTo = async (hit) => {
    ++searchVersion;
    inp.value = hit.name;
    results.hidePopover();
    state.mapCenterLat = hit.lat;
    state.mapCenterLon = hit.lon;
    applyZoomChange(hit.zoom);
    scheduleMapRender();
    if (!state.activeHotspotId && !state.customPolygonRing) {
      state.selectedLat = hit.lat;
      state.selectedLon = hit.lon;
      state.selectedPlaceName = hit.name;
      state.selectedAreaHa = 0;
      await runViewportAnalysisAndRefreshUI();
    }
  };
  try {
    const response = await fetch(`/api/v1/search-location?q=${encodeURIComponent(query)}`, { signal: AbortSignal.timeout(7000) });
    const data = await response.json();
    if (request !== searchVersion) return;
    if (!response.ok) throw new Error(data.error || 'Location search is unavailable.');
    if (data.results.length === 1) return await goTo(data.results[0]);
    status.textContent = data.results.length
      ? `Select a place in Muğla · ${data.results[0].source || 'Location search'}`
      : `No location matched “${query}” within Muğla.`;
    choices.replaceChildren(...data.results.map((hit) => {
      const button = document.createElement('button');
      button.className = 'hdr-btn';
      button.type = 'button';
      button.textContent = hit.name;
      button.onclick = () => void goTo(hit);
      return button;
    }));
  } catch (error) {
    if (request !== searchVersion) return;
    status.textContent = error.name === 'TimeoutError' ? 'Location search timed out. Try again.' : error.message;
  }
  openToolbarPopover(results.id, inp);
}

function updateDrawBannerStatus() {
  const lbl = document.getElementById('lblDrawStatus');
  if (!lbl) return;
  const n = state.drawnPoints.length;
  if (n < 3) {
    lbl.innerHTML = `<b>Drawing mode:</b> Click the map to add vertices (<b>${n}</b> added; minimum 3).`;
  } else {
    const tempRing = [...state.drawnPoints, state.drawnPoints[0]];
    const ha = computePolygonAreaHa(tempRing);
    lbl.innerHTML = `<b>Area ready (${n} vertices • ~${Math.round(ha).toLocaleString('en-US')} ha):</b> Add another vertex or select <b>Finish & Analyze</b>.`;
  }
}

async function finishPolygonDrawing() {
  if (state.drawnPoints.length < 3) {
    alert('Add at least three distinct vertices to draw an area.');
    return;
  }
  state.customPolygonRing = [...state.drawnPoints, state.drawnPoints[0]];
  const avgLon = state.drawnPoints.reduce((s, p) => s + p[0], 0) / state.drawnPoints.length;
  const avgLat = state.drawnPoints.reduce((s, p) => s + p[1], 0) / state.drawnPoints.length;
  state.activeHotspotId = null;
  state.selectedLon = Number(avgLon.toFixed(5));
  state.selectedLat = Number(avgLat.toFixed(5));
  state.selectedAreaHa = computePolygonAreaHa(state.customPolygonRing);
  state.selectedPlaceName = null;
  state.isDrawingPolygon = false;
  state.drawnPoints = [];
  state.hoverLonLat = null;
  document.getElementById('drawModeBanner').style.display = 'none';

  await runViewportAnalysisAndRefreshUI();
}

function applyZoomChange(newZoom) {
  const clamped = Math.max(MIN_MAP_ZOOM, Math.min(MAX_MAP_ZOOM, Math.round(newZoom)));
  if (clamped !== state.mapZoom) {
    state.mapZoom = clamped;
    const maxNativeZ = getMaxNativeZoomForMode(state.imageryMode);
    abortStaleInFlightTiles(Math.min(clamped, maxNativeZ));
  }
  updateResolutionNoticeBanner();
  scheduleMapRender();
}

function bindEvents(panels) {
  const btnSearch = document.getElementById('btnLocationSearch');
  const inpSearch = document.getElementById('inpLocationSearch');
  if (btnSearch) btnSearch.addEventListener('click', () => searchAnyLocationInMugla());
  if (inpSearch) {
    const dismissResults = () => {
      ++searchVersion;
      document.getElementById('locationResults').hidePopover();
    };
    inpSearch.addEventListener('input', dismissResults);
    inpSearch.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') searchAnyLocationInMugla();
      if (e.key === 'Escape') dismissResults();
    });
    document.addEventListener('pointerdown', (event) => {
      if (!event.target.closest('#locationResults, #btnLocationSearch, #inpLocationSearch')) dismissResults();
    });
  }

  const showAllMuglaHotspots = async () => {
    state.mapCenterLat = 37.02;
    state.mapCenterLon = 28.38;
    applyZoomChange(9);
  };

  const btnResetMugla = document.getElementById('btnResetMuglaView');
  if (btnResetMugla) btnResetMugla.addEventListener('click', showAllMuglaHotspots);

  const btnShowAllHotspots = document.getElementById('btnShowAllHotspots');
  if (btnShowAllHotspots) btnShowAllHotspots.addEventListener('click', showAllMuglaHotspots);

  const selImagery = document.getElementById('selectImageryMode');
  if (selImagery) {
    selImagery.addEventListener('change', (e) => {
      state.imageryMode = e.target.value;
      prewarmMuglaOverviewTiles();
      updateResolutionNoticeBanner();
      updateSwipeUI();
      scheduleMapRender();
    });
  }

  const chkPolygons = document.getElementById('chkShowPolygons');
  if (chkPolygons) {
    chkPolygons.addEventListener('change', (e) => {
      state.showPolygons = e.target.checked;
      scheduleMapRender();
    });
  }

  const chkLabels = document.getElementById('chkShowLabels');
  if (chkLabels) {
    chkLabels.addEventListener('change', (e) => {
      state.showLabels = e.target.checked;
      scheduleMapRender();
    });
  }

  document.getElementById('btnAnalyzeScreen').addEventListener('click', async () => {
    await selectCurrentScreenViewportAndAnalyze();
  });

  document.getElementById('chkAutoViewport').addEventListener('change', (e) => {
    state.autoFollowViewport = e.target.checked;
  });

  const selMonth = document.getElementById('selectMonth');
  if (selMonth) {
    selMonth.addEventListener('change', async (e) => {
      state.selectedMonth = Number(e.target.value) || 8;
      prewarmMuglaOverviewTiles();
      await runViewportAnalysisAndRefreshUI();
    });
  }

  const btnToggleEventsTab = document.getElementById('btnToggleEventsTab');
  if (btnToggleEventsTab) {
    btnToggleEventsTab.addEventListener('click', () => {
      const wasCompact = panels.isCompact();
      if (wasCompact) panels.setBottomMode('expanded');
      state.eventsTabOpen = wasCompact || !state.eventsTabOpen;
      updateEventsTabUI();
    });
  }

  const btnCloseEventsDrawer = document.getElementById('btnCloseEventsDrawer');
  if (btnCloseEventsDrawer) {
    btnCloseEventsDrawer.addEventListener('click', () => {
      state.eventsTabOpen = false;
      updateEventsTabUI();
    });
  }

  document.getElementById('btnToggleSwipe').addEventListener('click', () => {
    state.swipeActive = !state.swipeActive;
    prewarmMuglaOverviewTiles();
    updateSwipeUI();
  });

  const swipeDiv = document.getElementById('swipeDivider');
  swipeDiv.addEventListener('mousedown', (e) => {
    e.stopPropagation();
    e.preventDefault();
    state.isDraggingSwipe = true;
  });

  const btnBottomSwipe = document.getElementById('btnBottomSwipeToggle');
  if (btnBottomSwipe) {
    btnBottomSwipe.addEventListener('click', () => {
      state.swipeActive = !state.swipeActive;
      prewarmMuglaOverviewTiles();
      updateSwipeUI();
    });
  }

  let zoomDebounce = null;
  function triggerAutoViewportAfterZoom() {
    if (!state.autoFollowViewport || state.isDrawingPolygon || state.customPolygonRing || state.activeHotspotId) return;
    clearTimeout(zoomDebounce);
    zoomDebounce = setTimeout(() => {
      selectCurrentScreenViewportAndAnalyze();
    }, 280);
  }

  document.getElementById('btnZoomIn').addEventListener('click', () => {
    applyZoomChange(state.mapZoom + 1);
    triggerAutoViewportAfterZoom();
  });
  document.getElementById('btnZoomOut').addEventListener('click', () => {
    applyZoomChange(state.mapZoom - 1);
    triggerAutoViewportAfterZoom();
  });

  const viewport = document.getElementById('mapViewport');
  let lastWheelZoomTime = 0;

  viewport.addEventListener('wheel', (e) => {
    e.preventDefault();
    const now = performance.now();
    if (now - lastWheelZoomTime < 85) return;
    lastWheelZoomTime = now;
    const delta = e.deltaY < 0 ? 1 : -1;
    applyZoomChange(state.mapZoom + delta);
    triggerAutoViewportAfterZoom();
  });

  viewport.addEventListener('mousedown', (e) => {
    if (e.target.closest('.hotspot-map-pin')) return;
    const rect = viewport.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    if (state.swipeActive) {
      const dividerX = (rect.width * state.swipePercent) / 100;
      if (Math.abs(clickX - dividerX) <= 18) {
        state.isDraggingSwipe = true;
        return;
      }
    }
    if (state.isDrawingPolygon) return;
    state.isPanningMap = true;
    state.didDragMap = false;
    state.panStartScreen = { x: e.clientX, y: e.clientY };
    state.panStartCenter = { lat: state.mapCenterLat, lon: state.mapCenterLon };
  });

  window.addEventListener('mousemove', (e) => {
    const rect = viewport.getBoundingClientRect();
    if (state.isDraggingSwipe) {
      const pct = ((e.clientX - rect.left) / rect.width) * 100;
      state.swipePercent = Math.max(5, Math.min(95, pct));
      updateSwipeUI();
      return;
    }
    if (state.isDrawingPolygon) {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      if (x >= 0 && x <= rect.width && y >= 0 && y <= rect.height) {
        state.hoverLonLat = screenXYToLonLat(x, y, rect.width, rect.height);
        scheduleMapRender();
      }
      return;
    }
    if (state.isPanningMap && state.panStartScreen) {
      const dx = e.clientX - state.panStartScreen.x;
      const dy = e.clientY - state.panStartScreen.y;
      if (Math.hypot(dx, dy) > 6) state.didDragMap = true;
      const z = state.mapZoom;
      const startTx = lonToTileX(state.panStartCenter.lon, z);
      const startTy = latToTileY(state.panStartCenter.lat, z);
      state.mapCenterLon = tileXToLon(startTx - dx / 256, z);
      state.mapCenterLat = tileYToLat(startTy - dy / 256, z);
      scheduleMapRender();
    }
  });

  window.addEventListener('mouseup', async () => {
    const wasDraggingMap = state.isPanningMap && state.didDragMap;
    state.isDraggingSwipe = false;
    state.isPanningMap = false;

    if (wasDraggingMap && state.autoFollowViewport && !state.isDrawingPolygon && !state.customPolygonRing && !state.activeHotspotId) {
      await selectCurrentScreenViewportAndAnalyze();
    }
  });

  viewport.addEventListener('click', async (e) => {
    if (e.target.closest('.hotspot-map-pin')) return;
    if (state.didDragMap && !state.isDrawingPolygon) return;
    const rect = viewport.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const [lon, lat] = screenXYToLonLat(x, y, rect.width, rect.height);

    if (state.isDrawingPolygon) {
      if (state.drawnPoints.length >= 3) {
        const [fx, fy] = lonLatToScreenXY(state.drawnPoints[0][0], state.drawnPoints[0][1], rect.width, rect.height);
        if (Math.hypot(x - fx, y - fy) < 18) {
          await finishPolygonDrawing();
          panels.setDrawing(state.isDrawingPolygon);
          return;
        }
      }
      const lastPoint = state.drawnPoints.at(-1);
      if (lastPoint?.[0] === lon && lastPoint[1] === lat) return;
      state.drawnPoints.push([lon, lat]);
      updateDrawBannerStatus();
      scheduleMapRender();
      return;
    }

    state.activeHotspotId = null;
    state.selectedLon = lon;
    state.selectedLat = lat;
    state.selectedAreaHa = 0;
    state.selectedPlaceName = null;
    state.customPolygonRing = null;
    await runViewportAnalysisAndRefreshUI();
  });

  viewport.addEventListener('dblclick', async (e) => {
    if (state.isDrawingPolygon && state.drawnPoints.length >= 3) {
      e.preventDefault();
      await finishPolygonDrawing();
      panels.setDrawing(state.isDrawingPolygon);
    }
  });

  document.getElementById('btnDrawPolygon').addEventListener('click', () => {
    state.isDrawingPolygon = true;
    state.drawnPoints = [];
    state.hoverLonLat = null;
    panels.setDrawing(true);
    document.getElementById('drawModeBanner').style.display = 'flex';
    updateDrawBannerStatus();
    scheduleMapRender();
  });

  document.getElementById('btnUndoDraw').addEventListener('click', () => {
    state.drawnPoints.pop();
    updateDrawBannerStatus();
    scheduleMapRender();
  });

  document.getElementById('btnCancelDraw').addEventListener('click', () => {
    state.isDrawingPolygon = false;
    state.drawnPoints = [];
    state.hoverLonLat = null;
    document.getElementById('drawModeBanner').style.display = 'none';
    panels.setDrawing(false);
    scheduleMapRender();
  });

  document.getElementById('btnFinishDraw').addEventListener('click', async () => {
    await finishPolygonDrawing();
    panels.setDrawing(state.isDrawingPolygon);
  });

  const reportButton = document.getElementById('btnOpenReport');
  const generateReport = document.getElementById('btnGenerateReport');
  reportButton.addEventListener('click', () => {
    updateReportTarget();
    openToolbarPopover('reportOptions', reportButton);
  });
  generateReport.addEventListener('click', async () => {
    const context = activeAnalysisContext();
    const target = document.getElementById('reportTarget');
    const tab = window.open('about:blank', '_blank');
    generateReport.disabled = true;
    target.textContent = 'Generating report…';
    try {
      const res = await fetch('/api/v1/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(20_000),
        body: JSON.stringify({ analysis_context: context, role: state.selectedRole, report_type: 'environmental_municipal' })
      });
      const report = await res.json();
      if (!res.ok) throw new Error(report.error || 'The report could not be generated.');
      if (context.version !== analysisRequest) throw new Error('The active analysis changed. Generate the report for the new selection.');
      const url = `/api/v1/reports/${report.report_id}?format=html`;
      if (tab) {
        tab.opener = null;
        tab.location.replace(url);
        document.getElementById('reportOptions').hidePopover();
      } else {
        const link = document.createElement('a');
        link.href = url;
        link.target = '_blank';
        link.rel = 'noopener';
        link.textContent = 'Open generated report';
        target.replaceChildren(link);
        return;
      }
      updateReportTarget();
    } catch (error) {
      tab?.close();
      target.textContent = error.name === 'TimeoutError' ? 'Report generation timed out. Try again.' : error.message;
    } finally {
      generateReport.disabled = !studySelection;
    }
  });

  const btnStatusInfo = document.getElementById('btnGeoAiStatusInfo');
  document.getElementById('geoAiProvider').addEventListener('change', fetchAndRenderGeoAiStatus);
  const performanceMode = document.getElementById('geoAiPerformance');
  const idleTimeout = document.getElementById('geoAiIdleTimeout');
  try {
    const storedMode = localStorage.getItem('geoai.performance');
    const storedTimeout = localStorage.getItem('geoai.idle-minutes');
    if (storedMode === 'balanced') performanceMode.value = storedMode;
    if (['1', '3', '5'].includes(storedTimeout)) idleTimeout.value = storedTimeout;
  } catch { /* Controls remain usable without browser storage. */ }
  const configureIdle = () => configureBrowserGeoAiIdleTimeout(Number(idleTimeout.value), () => {
    if (document.getElementById('geoAiProvider').value === 'browser') {
      renderBrowserGeoAiStatus('Idle model released. Send a message to reload it from the browser cache.');
    }
  });
  configureIdle();
  idleTimeout.addEventListener('change', configureIdle);
  for (const [control, key] of [[performanceMode, 'geoai.performance'], [idleTimeout, 'geoai.idle-minutes']]) {
    control.addEventListener('change', () => {
      try { localStorage.setItem(key, control.value); } catch { /* Use the current selection for this page. */ }
    });
  }
  window.addEventListener('pagehide', () => releaseBrowserGeoAi(true));
  const infoBox = document.getElementById('geoAiEngineInfoBox');
  if (btnStatusInfo && infoBox) {
    btnStatusInfo.addEventListener('click', () => {
      const open = infoBox.style.display === 'none';
      infoBox.style.display = open ? 'block' : 'none';
      btnStatusInfo.setAttribute('aria-expanded', open);
    });
  }

  document.getElementById('roleSelect').addEventListener('change', (event) => {
    state.selectedRole = event.target.value;
  });

  document.querySelectorAll('.q-chip').forEach((chip) => {
    chip.addEventListener('click', async () => {
      const q = chip.getAttribute('data-q');
      await askReasoningGeoAi(q);
    });
  });

  document.getElementById('btnSendGeoAi').addEventListener('click', async () => {
    const inp = document.getElementById('geoAiInput');
    const q = inp.value.trim();
    if (!q || state.isAskingGeoAi) return;
    inp.value = '';
    await askReasoningGeoAi(q);
  });

  // Enter sends message, Shift+Enter inserts newline
  document.getElementById('geoAiInput').addEventListener('keydown', async (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      const q = e.currentTarget.value.trim();
      if (!q || state.isAskingGeoAi) return;
      e.currentTarget.value = '';
      await askReasoningGeoAi(q);
    }
  });

}

async function init() {
  renderModuleCards();
  renderInitialGeoAiGreeting();
  fetchAndRenderGeoAiStatus();
  bindEvents(bindWorkspacePanels(scheduleMapRender));
  renderTwoYearButtonsBar();
  prewarmMuglaOverviewTiles();
  updateSwipeUI();
  renderSatelliteMap();
  await runViewportAnalysisAndRefreshUI();
}

init();
