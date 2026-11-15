import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { URL, fileURLToPath } from 'node:url';

import { MODULE_REGISTRY, runModuleAnalysis } from '../../../packages/analysis-engines/index.mjs';
import { randomUUID } from 'node:crypto';
import { reportContractForSelection, resolveReportSelection, selectedMapEvent } from './analysis_context.mjs';
import { searchMugla } from './location_search.mjs';
import { analyzeViewportByModule, findNearestMuglaPlace, isPointInPolygonRing, MODULE_HOTSPOTS_MUGLA } from '../../../packages/analysis-engines/live_viewport_analyzer.mjs';
import { EVIDENCE_LABELS } from '../../../packages/evidence-engine/index.mjs';
import { getStrategicSummary } from '../../../packages/evidence-engine/strategic_matrix.mjs';
import { USER_ROLES, RAG_KNOWLEDGE_BASE, executeGeoAIQuery, parseGeoAIIntent, getGeoAiGuardrails } from '../../../packages/geoai/index.mjs';
import { generateReasonedGeoAiResponse, getGeoAiSystemStatus, prepareGeoAiTurn, planGeoAiTurn } from '../../../packages/geoai/reasoning_assistant.mjs';
import { readDrawnAoi, mapPeriod, collectAoiEvidence } from '../../../packages/geoai/aoi_evidence.mjs';
import { REPORT_TYPES, generateReportPackage } from '../../../packages/reporting/index.mjs';
import { AOI_ERROR } from '../../web/public/english.js';
import {
  readUserSlots,
  writeUserSlots,
  generateCleanBlankContractsFromSlots,
  getBlankOrUserSlotContract
} from '../../../packages/data-connectors/data_ingestor.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');

// Load local .env file if present (never hardcode keys in source code)
try {
  const envFilePath = path.join(rootDir, '.env');
  if (fs.existsSync(envFilePath)) {
    const envLines = fs.readFileSync(envFilePath, 'utf-8').split(/\r?\n/);
    for (const line of envLines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const k = trimmed.slice(0, eqIdx).trim();
        const v = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
        if (k && !process.env[k]) process.env[k] = v;
      }
    }
  }
} catch {
  // ignore .env read errors
}

const aoiDir = path.join(rootDir, 'data', 'aoi');
const catalogFile = path.join(rootDir, 'data', 'catalog', 'mugla_stac_inventory_v1.json');
const webPublicDir = path.join(rootDir, 'apps', 'web', 'public');
const tileCacheDir = path.join(rootDir, '01_Eklenecek_Veriler_Buraya', 'harita_tile_onbellek');
fs.mkdirSync(tileCacheDir, { recursive: true });
// Remove any stale z=18 fallback tiles so historical years never use mismatched cached tiles
try {
  for (const f of fs.readdirSync(tileCacheDir)) {
    if (f.includes('_18_')) {
      fs.unlinkSync(path.join(tileCacheDir, f));
    }
  }
} catch {
  // ignore cleanup warning
}
const tileMemoryCache = new Map();

function publicReferenceAreas() {
  return Array.from(areasStore.values()).filter((area) => area.owner_user_id === 'system_public');
}

const muglaCubePath = path.join(
  rootDir,
  '01_Eklenecek_Veriler_Buraya',
  'nasa_space_apps_dancing_with_the_sars',
  'mugla_2018_2026_tam_il_veri_kupu.json'
);
let muglaCubeData = null;
try {
  if (fs.existsSync(muglaCubePath)) {
    muglaCubeData = JSON.parse(fs.readFileSync(muglaCubePath, 'utf-8'));
  }
} catch {
  muglaCubeData = null;
}

function resolveWaybackReleaseId(year, month) {
  const ymMap = muglaCubeData?.wayback_releases_by_year_month || {};
  const exact = ymMap[`${year}-${String(month).padStart(2, '0')}`];
  if (exact?.release_id) return exact.release_id;
  const sameYearKeys = Object.keys(ymMap).filter((k) => k.startsWith(`${year}-`)).sort();
  if (sameYearKeys.length > 0) return ymMap[sameYearKeys[Math.floor(sameYearKeys.length / 2)]].release_id;
  const fallbackByYear = {
    2018: '239',
    2019: '13161',
    2020: '119',
    2021: '26120',
    2022: '45441',
    2023: '64776',
    2024: '60013',
    2025: '58924',
    2026: '63116'
  };
  return fallbackByYear[year] || '63116';
}

// Load standardized GeoJSON AOIs & STAC Inventory
const muglaProvinceGeo = JSON.parse(fs.readFileSync(path.join(aoiDir, 'mugla_province_aoi_v1.geojson'), 'utf-8'));
const dalyanGeo = JSON.parse(fs.readFileSync(path.join(aoiDir, 'pilot_dalyan_wetland_aoi_v1.geojson'), 'utf-8'));
const bordubetGeo = JSON.parse(fs.readFileSync(path.join(aoiDir, 'pilot_bordubet_fire_aoi_v1.geojson'), 'utf-8'));
const otherModulesGeo = JSON.parse(fs.readFileSync(path.join(aoiDir, 'pilot_modules_aoi_v1.geojson'), 'utf-8'));
const stacInventory = JSON.parse(fs.readFileSync(catalogFile, 'utf-8'));

// In-memory stores (mirroring PostgreSQL/PostGIS schema in TDD Section 6)
const areasStore = new Map();
const jobsStore = new Map();
const resultsStore = new Map();
const reportsStore = new Map();

function seedInitialData() {
  const allFeatures = [
    ...dalyanGeo.features,
    ...bordubetGeo.features,
    ...otherModulesGeo.features
  ];
  for (const feat of allFeatures) {
    areasStore.set(feat.properties.aoi_id, {
      aoi_id: feat.properties.aoi_id,
      name: feat.properties.name,
      module: feat.properties.module,
      priority: feat.properties.priority,
      bbox: feat.bbox,
      centroid: feat.properties.centroid,
      area_ha: feat.properties.area_ha,
      area_km2: feat.properties.area_km2,
      crs_storage: 'EPSG:4326',
      crs_metric: 'EPSG:32635',
      visibility: feat.properties.visibility || 'public',
      owner_user_id: 'system_public',
      description: feat.properties.description || '',
      geometry: feat.geometry
    });
  }

  // Pre-compute initial reference jobs for the two MVP-1 pilot workflows + support modules
  const initialRuns = [
    { aoi_id: 'aoi_dalyan_wetland', module: 'water', period: { start: '2021-01-01', end: '2026-11-14' } },
    { aoi_id: 'aoi_bordubet_fire', module: 'fire', period: { start: '2021-01-01', end: '2026-11-14' } },
    { aoi_id: 'aoi_milas_agriculture', module: 'agriculture', period: { start: '2021-01-01', end: '2026-11-14' } },
    { aoi_id: 'aoi_dalaman_flood', module: 'flood', period: { start: '2021-01-01', end: '2026-11-14' } },
    { aoi_id: 'aoi_seydikemer_landslide', module: 'deformation', period: { start: '2021-01-01', end: '2026-11-14' } }
  ];

  for (const item of initialRuns) {
    const jobId = `job_seed_${item.module}_001`;
    const resultId = `res_seed_${item.module}_001`;
    const aoi = areasStore.get(item.aoi_id);
    const contract = runModuleAnalysis({
      job_id: jobId,
      aoi,
      module: item.module,
      period: item.period,
      inventory: stacInventory
    });
    contract.result_id = resultId;
    resultsStore.set(resultId, contract);
    jobsStore.set(jobId, {
      job_id: jobId,
      result_id: resultId,
      user_id: 'demo_user',
      aoi_id: item.aoi_id,
      aoi_name: aoi.name,
      module: item.module,
      period: item.period,
      status: 'completed',
      evidence_status: contract.quality.evidence_status,
      evidence_label_tr: contract.quality.evidence_label_tr,
      created_at: contract.provenance.created_at,
      completed_at: contract.provenance.created_at
    });
  }
}

seedInitialData();

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(payload, null, 2));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 2 * 1024 * 1024) {
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function computePolygonStatsFromRing(ring) {
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  for (const [lon, lat] of ring) {
    if (lon < minLon) minLon = lon;
    if (lat < minLat) minLat = lat;
    if (lon > maxLon) maxLon = lon;
    if (lat > maxLat) maxLat = lat;
  }
  const latScale = 110.98;
  const lonScale = 111.32 * Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180));
  let areaKm2 = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    const x1 = ring[i][0] * lonScale;
    const y1 = ring[i][1] * latScale;
    const x2 = ring[i + 1][0] * lonScale;
    const y2 = ring[i + 1][1] * latScale;
    areaKm2 += (x1 * y2 - x2 * y1);
  }
  areaKm2 = Math.abs(areaKm2) / 2;
  return {
    bbox: [Number(minLon.toFixed(5)), Number(minLat.toFixed(5)), Number(maxLon.toFixed(5)), Number(maxLat.toFixed(5))],
    centroid: [Number(((minLon + maxLon) / 2).toFixed(5)), Number(((minLat + maxLat) / 2).toFixed(5))],
    area_km2: Number(areaKm2.toFixed(2)),
    area_ha: Number((areaKm2 * 100).toFixed(1))
  };
}

export async function handleGeoInsightRequest(req, res) {
    const parsedUrl = new URL(req.url, `http://${req.headers?.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      });
      return res.end();
    }

    try {
      // 1. Metadata & Bootstrap API
      if (pathname === '/api/v1/bootstrap' && req.method === 'GET') {
        return sendJson(res, 200, {
          platform: 'Muğla GeoInsight',
          version: '0.2.0',
          project_directory: rootDir,
          user_data_drop_directory: path.join(rootDir, '01_Eklenecek_Veriler_Buraya'),
          crs_standard: {
            storage: 'EPSG:4326',
            analysis: 'EPSG:32635 (WGS 84 / UTM zone 35N)',
            display: 'EPSG:3857'
          },
          modules: MODULE_REGISTRY,
          evidence_labels: EVIDENCE_LABELS,
          roles: USER_ROLES,
          report_types: REPORT_TYPES,
          districts_geojson: muglaProvinceGeo,
          areas: Array.from(areasStore.values()),
          verification_summary: stacInventory.verification_summary,
          strategic_summary: getStrategicSummary(),
          geoai_status: getGeoAiSystemStatus(),
          user_slots: readUserSlots(),
          recent_jobs: Array.from(jobsStore.values()).reverse()
        });
      }

      if (pathname === '/api/v1/assistant/status' && req.method === 'GET') {
        return sendJson(res, 200, getGeoAiSystemStatus());
      }

      // 1b. User Data Slots API (GET & POST /api/v1/slots)
      if (pathname === '/api/v1/slots' && req.method === 'GET') {
        const slots = readUserSlots();
        const summary = generateCleanBlankContractsFromSlots();
        return sendJson(res, 200, {
          slots_file: path.join(rootDir, '01_Eklenecek_Veriler_Buraya', 'VERI_SABLONU_SLOTLAR.json'),
          slots,
          modules_summary: summary
        });
      }

      if (pathname === '/api/v1/slots' && req.method === 'POST') {
        const body = await parseBody(req);
        const currentSlots = readUserSlots();
        if (body.module && body.module_patch && currentSlots.module_analysis_slots[body.module]) {
          Object.assign(currentSlots.module_analysis_slots[body.module], body.module_patch);
        } else if (body.slots) {
          Object.assign(currentSlots, body.slots);
        }
        const saved = writeUserSlots(currentSlots);
        const summary = generateCleanBlankContractsFromSlots();
        return sendJson(res, 200, {
          updated: true,
          slots: saved,
          modules_summary: summary
        });
      }

      if (pathname === '/api/v1/strategic/districts' && req.method === 'GET') {
        return sendJson(res, 200, getStrategicSummary());
      }

      // 2. TDD Endpoint: POST /api/v1/catalog/search
      if (pathname === '/api/v1/catalog/search' && req.method === 'POST') {
        const body = await parseBody(req);
        const { aoi_id, module, period, max_cloud_cover } = body;
        const startYear = Number((period?.start || '2014-01-01').slice(0, 4));
        const endYear = Number((period?.end || '2026-12-31').slice(0, 4));
        const cloudLimit = max_cloud_cover !== undefined ? Number(max_cloud_cover) : 100;

        const matched = (stacInventory.acquisitions || []).filter((acq) => {
          const y = Number(acq.observed_at.slice(0, 4));
          if (y < startYear || y > endYear) return false;
          if ((acq.cloud_cover_pct || 0) > cloudLimit) return false;
          if (aoi_id && acq.aoi_ids.includes(aoi_id)) return true;
          if (module === 'water' && acq.aoi_ids.includes('aoi_dalyan_wetland')) return true;
          if (module === 'fire' && acq.aoi_ids.includes('aoi_bordubet_fire')) return true;
          if (module === 'agriculture' && acq.aoi_ids.includes('aoi_milas_agriculture')) return true;
          if (module === 'flood' && acq.aoi_ids.includes('aoi_dalaman_flood')) return true;
          return !aoi_id;
        });

        const qcPassedCount = matched.filter((m) => m.qc_passed).length;
        const rejectedCount = matched.length - qcPassedCount;

        return sendJson(res, 200, {
          query: { aoi_id, module, period, max_cloud_cover: cloudLimit },
          total_found: matched.length,
          qc_passed_count: qcPassedCount,
          qc_rejected_count: rejectedCount,
          aoi_inventory_summary: stacInventory.verification_summary.aois[aoi_id] || null,
          acquisitions: matched
        });
      }

      // 3. TDD Endpoint: GET & POST /api/v1/areas (AOI Management with Private default)
      if (pathname === '/api/v1/areas' && req.method === 'GET') {
        return sendJson(res, 200, {
          total: areasStore.size,
          areas: Array.from(areasStore.values())
        });
      }

      if (pathname === '/api/v1/areas' && req.method === 'POST') {
        const body = await parseBody(req);
        const coords = body.geometry?.coordinates?.[0];
        if (!Array.isArray(coords) || coords.length < 4) {
          return sendJson(res, 400, { error: 'Geçerli bir kapalı poligon geometrisi (en az 3 köşe) gereklidir.' });
        }
        const stats = computePolygonStatsFromRing(coords);
        const aoiId = `aoi_custom_${Date.now()}`;
        const newAoi = {
          aoi_id: aoiId,
          name: body.name || `Kullanıcı Özel AOI (${stats.area_ha} ha)`,
          module: body.module || 'water',
          priority: 'Kullanıcı Özel Poligonu',
          bbox: stats.bbox,
          centroid: stats.centroid,
          area_ha: stats.area_ha,
          area_km2: stats.area_km2,
          crs_storage: 'EPSG:4326',
          crs_metric: 'EPSG:32635',
          visibility: body.visibility || 'private', // Default private per PRD Section 11
          owner_user_id: body.user_id || 'current_user',
          description: body.description || 'Kullanıcı tarafından harita üzerinde çizilen özel inceleme poligonu.',
          geometry: {
            type: 'Polygon',
            coordinates: [coords]
          }
        };
        areasStore.set(aoiId, newAoi);
        return sendJson(res, 201, newAoi);
      }

      if (pathname.startsWith('/api/v1/areas/') && req.method === 'DELETE') {
        const aoiId = pathname.split('/').pop();
        if (!aoiId.startsWith('aoi_custom_')) {
          return sendJson(res, 403, { error: 'Sistem referans pilot AOI poligonları silinemez; yalnızca kullanıcı özel AOI poligonları silinebilir.' });
        }
        areasStore.delete(aoiId);
        return sendJson(res, 200, { deleted: true, aoi_id: aoiId });
      }

      // 4. TDD Endpoint: POST & GET /api/v1/analyses (Asynchronous Analysis Job Queue)
      if (pathname === '/api/v1/analyses' && req.method === 'GET') {
        return sendJson(res, 200, {
          jobs: Array.from(jobsStore.values()).reverse()
        });
      }

      if (pathname === '/api/v1/analyses' && req.method === 'POST') {
        const body = await parseBody(req);
        const moduleName = body.module || 'water';
        const aoiId = body.aoi_id || (moduleName === 'fire' ? 'aoi_bordubet_fire' : 'aoi_dalyan_wetland');
        const aoi = areasStore.get(aoiId) || areasStore.get('aoi_dalyan_wetland');
        const period = body.period || { start: '2021-01-01', end: '2026-11-14' };

        const jobId = `job_${moduleName}_${Date.now()}`;
        const resultId = `res_${moduleName}_${Date.now()}`;

        const contract =
          body.mode === 'slots'
            ? getBlankOrUserSlotContract(moduleName)
            : runModuleAnalysis({
                job_id: jobId,
                aoi,
                module: moduleName,
                period,
                options: body.options || {},
                inventory: stacInventory
              });
        contract.result_id = resultId;

        const jobRecord = {
          job_id: jobId,
          result_id: resultId,
          user_id: body.user_id || 'current_user',
          aoi_id: aoi.aoi_id,
          aoi_name: aoi.name,
          module: moduleName,
          period,
          status: 'completed',
          evidence_status: contract.quality.evidence_status,
          evidence_label_tr: contract.quality.evidence_label_tr,
          created_at: contract.provenance.created_at,
          completed_at: new Date().toISOString()
        };

        resultsStore.set(resultId, contract);
        jobsStore.set(jobId, jobRecord);

        // Return 202 Accepted with job_id and immediate contract for responsive UI
        return sendJson(res, 202, {
          job_id: jobId,
          result_id: resultId,
          status: 'completed',
          job: jobRecord,
          contract
        });
      }

      // GET or DELETE /api/v1/analyses/:job_id (PRD FR-14: Analysis history view & deletion)
      if (pathname.startsWith('/api/v1/analyses/')) {
        const jobId = pathname.split('/').pop();
        if (req.method === 'GET') {
          const job = jobsStore.get(jobId);
          if (!job) return sendJson(res, 404, { error: 'Analiz işi bulunamadı.' });
          const contract = resultsStore.get(job.result_id);
          return sendJson(res, 200, { job, contract });
        }
        if (req.method === 'DELETE') {
          const job = jobsStore.get(jobId);
          if (!job) return sendJson(res, 404, { error: 'Analiz işi bulunamadı.' });
          resultsStore.delete(job.result_id);
          jobsStore.delete(jobId);
          return sendJson(res, 200, { deleted: true, job_id: jobId });
        }
      }

      // 5. TDD Endpoint: GET /api/v1/results/:result_id
      if (pathname.startsWith('/api/v1/results/') && req.method === 'GET') {
        const resultId = pathname.split('/').pop();
        const contract = resultsStore.get(resultId);
        if (!contract) return sendJson(res, 404, { error: 'Sonuç kaydı bulunamadı.' });
        return sendJson(res, 200, contract);
      }

      // 6. TDD Endpoint: GET /api/v1/layers/:id/tiles/:z/:x/:y (Dynamic SVG tile renderer for raster overlays)
      if (pathname.startsWith('/api/v1/layers/') && pathname.includes('/tiles/') && req.method === 'GET') {
        const parts = pathname.split('/');
        const layerId = parts[4];
        const svgTile = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256">
          <rect width="256" height="256" fill="rgba(14,165,233,0.12)" stroke="rgba(14,165,233,0.35)" stroke-width="1"/>
          <text x="12" y="24" font-family="monospace" font-size="10" fill="#0369a1">${layerId}</text>
        </svg>`;
        res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Access-Control-Allow-Origin': '*' });
        return res.end(svgTile);
      }

      // 6a. High-Speed Cached Satellite & Dated Historical Tile Proxy (2018-2026 by Year & Month + Labels)
      if (pathname.startsWith('/api/v1/map-tiles/') && req.method === 'GET') {
        const parts = pathname.split('/');
        const tileType = parts[4]; // 'sat', 'hist2018', 'labels', or 'dated'
        let cacheKey = '';
        const candidateUrls = [];

        if (tileType === 'dated') {
          const yr = Number(parts[5] || 2026);
          const mo = Number(parts[6] || 8);
          const z = Number(parts[7] || 12);
          const y = parts[8];
          const x = parts[9];
          const mode = (parsedUrl.searchParams.get('mode') || 'wayback').toLowerCase();
          const relId = resolveWaybackReleaseId(yr, mo);
          cacheKey = `dated_v4_${mode}_${yr}_${mo}_${z}_${y}_${x}`;
          if (mode === 's2') {
            if (z <= 14) {
              const eoxYr = Math.min(2024, Math.max(2018, yr));
              candidateUrls.push(`https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-${eoxYr}_3857/default/g/${z}/${y}/${x}.jpg`);
            }
          } else {
            // Wayback historical archive (native up to z=17 across all Muğla releases)
            candidateUrls.push(
              `https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/${relId}/${z}/${y}/${x}`
            );
            if (yr >= 2026) {
              candidateUrls.push(`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`);
            }
          }
        } else {
          const z = parts[5];
          const y = parts[6];
          const x = parts[7];
          cacheKey = `${tileType}_${z}_${y}_${x}`;
          if (tileType === 'labels') {
            candidateUrls.push(
              `https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/${z}/${y}/${x}`
            );
          } else if (tileType === 'hist2018') {
            const relId = resolveWaybackReleaseId(2018, 8);
            candidateUrls.push(
              `https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/${relId}/${z}/${y}/${x}`
            );
            candidateUrls.push(`https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2018_3857/default/g/${z}/${y}/${x}.jpg`);
            candidateUrls.push(`https://clarity.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`);
          } else {
            candidateUrls.push(`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`);
          }
        }

        // 1. Check In-Memory Cache (0ms)
        if (tileMemoryCache.has(cacheKey)) {
          const cached = tileMemoryCache.get(cacheKey);
          res.writeHead(200, {
            'Content-Type': cached.contentType,
            'Cache-Control': 'public, max-age=604800, immutable',
            'Access-Control-Allow-Origin': '*'
          });
          return res.end(cached.buf);
        }

        // 2. Check Disk Cache (1ms)
        const ext = tileType === 'labels' ? '.png' : '.jpg';
        const diskFile = path.join(tileCacheDir, `${cacheKey}${ext}`);
        if (fs.existsSync(diskFile)) {
          try {
            const buf = fs.readFileSync(diskFile);
            const contentType = tileType === 'labels' ? 'image/png' : 'image/jpeg';
            if (tileMemoryCache.size < 2500) tileMemoryCache.set(cacheKey, { buf, contentType });
            res.writeHead(200, {
              'Content-Type': contentType,
              'Cache-Control': 'public, max-age=604800, immutable',
              'Access-Control-Allow-Origin': '*'
            });
            return res.end(buf);
          } catch {
            // proceed to fetch
          }
        }

        // 3. Fetch from upstream candidate URLs
        for (const upstreamUrl of candidateUrls) {
          try {
            const tileRes = await fetch(upstreamUrl, {
              headers: { 'User-Agent': 'MuglaGeoInsight-MapProxy/2.0' },
              signal: AbortSignal.timeout(4500)
            });
            if (tileRes.ok) {
              const buf = Buffer.from(await tileRes.arrayBuffer());
              if (buf.length > 400) {
                const contentType = tileRes.headers.get('content-type') || (tileType === 'labels' ? 'image/png' : 'image/jpeg');
                if (tileMemoryCache.size < 2500) tileMemoryCache.set(cacheKey, { buf, contentType });
                try {
                  fs.writeFileSync(diskFile, buf);
                } catch {
                  // ignore disk cache write warning
                }
                res.writeHead(200, {
                  'Content-Type': contentType,
                  'Cache-Control': 'public, max-age=604800, immutable',
                  'Access-Control-Allow-Origin': '*'
                });
                return res.end(buf);
              }
            }
          } catch {
            // try next candidate
          }
        }

        // Return 404 (NEVER a fake 200 dark SVG!) so the frontend uses native parent zoom or explicit fallback
        res.writeHead(404, {
          'Content-Type': 'application/json; charset=utf-8',
          'Access-Control-Allow-Origin': '*'
        });
        return res.end(JSON.stringify({ error: 'Tile not available at this zoom level' }));
      }

      // 6b. Live Viewport & Clicked-Area Dynamic Analyzer (2018-2026 across all Muğla)
      if (pathname === '/api/v1/viewport/analyze' && req.method === 'POST') {
        const input = await parseBody(req);
        const context = input.analysis_context;
        const body = context ? { ...context, match_nearby_event: false, bbox: input.bbox } : input;
        const viewportResult = await analyzeViewportByModule({
          lat: Number(body.lat ?? 36.818),
          lon: Number(body.lon ?? 28.215),
          area_ha: Number(body.area_ha ?? 9420.0),
          place_name: body.place_name || null,
          hotspot_id: body.hotspot_id || null,
          match_nearby_event: body.match_nearby_event !== false,
          bbox: body.bbox || null,
          module_code: body.module_code || body.module || 'wildfire_ecosystem',
          left_year: Number(body.left_year ?? body.start_year ?? 2020),
          right_year: Number(body.right_year ?? body.selected_year ?? body.end_year ?? 2022),
          selected_year: Number(body.selected_year ?? body.right_year ?? 2022),
          selected_month: Number(body.selected_month ?? 8)
        });
        if (context && context.source !== 'viewport') {
          try {
            const { event, shape, resultId } = resolveReportSelection(context);
            viewportResult.selection = {
              aoi_id: event?.id || shape.aoi_id, result_id: resultId,
              verification_status: event?.verification_status || 'UNVERIFIED_CUSTOM_AREA',
              data_sources: event ? [event.data_source] : []
            };
          } catch (error) {
            viewportResult.selection_error = error.message;
          }
        }
        return sendJson(res, 200, viewportResult);
      }

      // 6c. Search ANY location/village/neighborhood/coordinate in Muğla
      if (pathname === '/api/v1/search-location' && req.method === 'GET') {
        const q = (parsedUrl.searchParams.get('q') || '').trim();
        if (!q) return sendJson(res, 200, { results: [] });
        if (q.length > 150) return sendJson(res, 400, { error: 'Enter a place name or coordinates under 150 characters.' });
        try {
          return sendJson(res, 200, { results: await searchMugla(q) });
        } catch (error) {
          console.warn('Location geocoder unavailable:', error.message, error.cause?.code || '');
          return sendJson(res, 503, { error: 'The online location service is unavailable. Try again or enter latitude, longitude.' });
        }
      }

      // 7. TDD Endpoint: POST /api/v1/assistant/query (Tool-calling + Reasoning GeoAI Assistant)
      if (pathname === '/api/v1/assistant/query' && req.method === 'POST') {
        const body = await parseBody(req);
        if (typeof body?.query !== 'string' || !body.query.trim() || body.query.length > 2000) {
          return sendJson(res, 400, { error: 'Enter a question between 1 and 2,000 characters.' });
        }
        const localBrowser = body.local_browser === true;
        const context = body.analysis_context;
        if (context) {
          const event = context.source === 'event' ? selectedMapEvent(context) : null;
          Object.assign(body, {
            module_code: context.module_code, hotspot_id: event?.id,
            lat: event?.lat ?? context.lat, lon: event?.lon ?? context.lon,
            area_ha: event?.area_ha ?? context.area_ha, place_name: event?.name ?? context.place_name,
            left_year: context.left_year, right_year: context.right_year, selected_month: context.selected_month,
            drawn_aoi: context.source === 'drawn' ? context.drawn_aoi : null
          });
          if (!body.use_previous_area && !localBrowser) body.topic_context = null;
        }
        let turn = prepareGeoAiTurn({
          question: body.query,
          module_code: body.module_code || body.module || body.viewport_analysis?.module_code,
          chat_history: body.chat_history,
          topic_context: body.topic_context,
          hasDrawnArea: Boolean(body.drawn_aoi),
          language: body.language
        });
        const guardrails = getGeoAiGuardrails(parseGeoAIIntent({ query: turn.text }).flags);
        if (!localBrowser && body.context_only && !guardrails.length) turn = await planGeoAiTurn(turn, Boolean(body.drawn_aoi));
        if (context?.source === 'drawn' && turn.locationQuestion) {
          turn = { ...turn, answer: turn.language === 'tr' ? 'Haritada çizdiğin alan seçili.' : 'The drawn area is the current analysis selection.' };
        }
        const analytical = ['analysis', 'comparison'].includes(turn.intent);
        const geoAiResponse = { status: 'OK', tool_calls: [] };
        const previousAoi = turn.followUp ? body.topic_context?.drawn_aoi : null;
        const drawn = analytical && !turn.locationQuestion && !turn.hotspot ? previousAoi || body.drawn_aoi : null;
        if (turn.asksDrawnArea && !turn.locationQuestion && !drawn && !guardrails.length) {
          turn = { ...turn, answer: turn.language === 'tr' ? 'Haritada tamamlanmış bir çizim yok. Analiz için bir alan çiz veya seç.' : 'Draw or select an area on the map first, then ask me to analyze it.' };
        }
        if (analytical && !body.context_only && !drawn && !turn.answer) {
          Object.assign(geoAiResponse, executeGeoAIQuery({
            query: turn.text,
            selectedAoiId: body.aoi_id,
            selectedModule: body.module,
            selectedRole: body.role || 'citizen',
            period: body.period,
            aoiCatalog: Array.from(areasStore.values()),
            inventory: stacInventory,
            runAnalysisFn: runModuleAnalysis
          }));
        }

        let viewport = null;
        if (analytical && !turn.answer && !guardrails.length && turn.years.every((year) => year >= 2018 && year <= 2026)) {
          const legacyViewport = body.viewport_analysis;
          const selectedAoi = areasStore.get(body.aoi_id);
          const hotspot = turn.hotspot;
          const [askedLeft, askedRight = askedLeft] = turn.years.length === 1 ||
            (turn.years.length === 2 && turn.intent === 'comparison') ? turn.years : [];
          const previousPeriod = previousAoi ? body.topic_context?.period : null;
          const leftYear = askedLeft ?? previousPeriod?.years?.[0] ?? body.left_year ?? legacyViewport?.comparison?.left_year ?? 2020;
          const rightYear = askedRight ?? previousPeriod?.years?.[1] ?? body.right_year ?? body.selected_year ?? legacyViewport?.comparison?.right_year ?? 2022;
          const month = previousPeriod?.month ?? body.selected_month ?? legacyViewport?.comparison?.selected_month ?? 8;
          if (drawn) {
            let aoi, period;
            try {
              aoi = readDrawnAoi(drawn);
              period = mapPeriod(leftYear, rightYear, month);
            } catch (error) {
              return sendJson(res, 400, { error: turn.language === 'en' ? AOI_ERROR[error.message] || 'Invalid study area.' : error.message, code: 'INVALID_AOI' });
            }
            geoAiResponse.aoi_analysis = collectAoiEvidence({
              aoi, period, module: turn.module, inventory: stacInventory,
              referenceAreas: publicReferenceAreas()
            });
            geoAiResponse.tool_calls.push({ tool_name: 'analysis.inspect_drawn_aoi', status: 'SUCCESS', arguments: { aoi_id: aoi.aoi_id, module: turn.module, period } });
          } else {
            const selection = {
            lat: Number(hotspot?.lat ?? body.lat ?? legacyViewport?.area?.lat ?? selectedAoi?.centroid?.[1] ?? 36.818),
            lon: Number(hotspot?.lon ?? body.lon ?? legacyViewport?.area?.lon ?? selectedAoi?.centroid?.[0] ?? 28.215),
            area_ha: Number(hotspot?.area_ha ?? body.area_ha ?? legacyViewport?.area?.area_ha ?? selectedAoi?.area_ha ?? 9420),
            place_name: hotspot?.name || body.place_name || legacyViewport?.area?.name || selectedAoi?.name || null,
            hotspot_id: hotspot?.id || body.hotspot_id || legacyViewport?.provenance?.event_id || null,
            module_code: turn.module,
            left_year: Number(leftYear), right_year: Number(rightYear), selected_month: Number(month)
            };
            if (!Number.isFinite(selection.lat) || !Number.isFinite(selection.lon)) return sendJson(res, 400, { error: 'The map coordinates are invalid.' });
            if (body.context_only) {
              const events = MODULE_HOTSPOTS_MUGLA[turn.module] || [];
              const selectedEvent = events.find((event) => event.id === selection.hotspot_id) ||
                (!context && events.find((event) => isPointInPolygonRing(selection.lon, selection.lat, event.polygon_ring)));
              const inRequestedYear = !askedLeft || turn.intent === 'comparison' || turn.locationQuestion || turn.recovery ||
                (selectedEvent && Number(selectedEvent.start_date.slice(0, 4)) <= askedLeft && Number(selectedEvent.end_date.slice(0, 4)) >= askedRight);
              if (selectedEvent && inRequestedYear) selection.hotspot_id = selectedEvent.id;
              else {
                viewport = {
                  module_code: turn.module,
                  area: { name: selection.place_name || `${findNearestMuglaPlace(selection.lat, selection.lon).name} çevresindeki seçili nokta` },
                  provenance: { verification_status: 'UNVERIFIED_CUSTOM_AREA', uncertainty_limitations: 'Seçilen nokta ve dönem için olay veya piksel ölçümü doğrulanamadı.' },
                  comparison: { left_year: selection.left_year, right_year: selection.right_year, month_name_tr: new Intl.DateTimeFormat('tr-TR', { month: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2020, selection.selected_month - 1, 1))) }
                };
              }
            }
            if (!viewport) viewport = await analyzeViewportByModule(selection);
            if (body.context_only) geoAiResponse.tool_calls.push({ tool_name: 'analysis.inspect_map_selection', status: 'SUCCESS', arguments: { module: turn.module, event_id: viewport.provenance?.event_id || null } });
          }
        }

        geoAiResponse.reasoned_chat = await generateReasonedGeoAiResponse({
          turn,
          guardrails,
          viewport_analysis: viewport,
          aoiAnalysis: geoAiResponse.aoi_analysis,
          map_context: body.map_context,
          activeSelection: context?.place_name,
          role: body.role || 'citizen',
          localBrowser,
        });

        res.setHeader?.('Cache-Control', 'no-store');
        return sendJson(res, 200, geoAiResponse);
      }

      // 8. TDD Endpoint: POST & GET /api/v1/reports (Role-based PDF/HTML, CSV, GeoJSON reporting)
      if (pathname === '/api/v1/reports' && req.method === 'POST') {
        const body = await parseBody(req);
        const resultId = body.result_id;
        let contract = resultId ? resultsStore.get(resultId) : null;
        if (body.analysis_context) {
          try {
            contract = reportContractForSelection(body.analysis_context, stacInventory, publicReferenceAreas());
            if (body.analysis_context.result_id && contract.provenance.job_id !== body.analysis_context.result_id) {
              return sendJson(res, 409, { error: 'The analysis context has changed. Update the selection and generate the report again.' });
            }
          } catch (error) {
            return sendJson(res, 400, { error: error.message });
          }
        }
        if (!contract) return sendJson(res, resultId ? 404 : 400, {
          error: resultId ? 'The requested analysis result could not be found.' : 'Select a verified event or draw an area before generating a report.'
        });
        const reportId = `rep_${randomUUID()}`;
        const pkg = generateReportPackage({
          report_id: reportId,
          report_type: body.report_type || 'scientific',
          analysis_contract: contract,
          mask_coordinates: Boolean(body.mask_coordinates),
          requested_by_role: body.role || 'researcher'
        });
        reportsStore.set(reportId, pkg);
        return sendJson(res, 201, pkg);
      }

      if (pathname.startsWith('/api/v1/reports/') && req.method === 'GET') {
        const parts = pathname.split('/');
        const reportId = parts[4];
        const format = parsedUrl.searchParams.get('format') || 'json';
        const pkg = reportsStore.get(reportId);
        if (!pkg) return sendJson(res, 404, { error: 'Report not found.' });
        if (format === 'html') {
          res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
          return res.end(pkg.html_content);
        }
        if (format === 'csv') {
          res.writeHead(200, {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${reportId}.csv"`
          });
          return res.end(pkg.csv_export);
        }
        return sendJson(res, 200, pkg);
      }

      const browserRuntime = {
        '/geoai-runtime/transformers.min.js': 'application/javascript; charset=utf-8',
        '/geoai-runtime/ort-wasm-simd-threaded.jsep.mjs': 'application/javascript; charset=utf-8',
        '/geoai-runtime/ort-wasm-simd-threaded.jsep.wasm': 'application/wasm'
      };
      if (req.method === 'GET' && Object.hasOwn(browserRuntime, pathname)) {
        const asset = path.join(rootDir, 'node_modules', '@huggingface', 'transformers', 'dist', path.basename(pathname));
        if (!fs.existsSync(asset)) return sendJson(res, 503, { error: 'Run npm ci to install the GeoAI browser runtime.' });
        res.writeHead(200, { 'Content-Type': browserRuntime[pathname], 'Content-Length': fs.statSync(asset).size });
        return fs.createReadStream(asset).pipe(res);
      }

      // 9. Serve Static Web Application Files from apps/web/public
      let filePath = path.join(webPublicDir, pathname === '/' ? 'index.html' : pathname);
      if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
        const ext = path.extname(filePath).toLowerCase();
        const mimeMap = {
          '.html': 'text/html; charset=utf-8',
          '.css': 'text/css; charset=utf-8',
          '.js': 'application/javascript; charset=utf-8',
          '.json': 'application/json; charset=utf-8',
          '.geojson': 'application/geo+json; charset=utf-8',
          '.svg': 'image/svg+xml'
        };
        res.writeHead(200, {
          'Content-Type': mimeMap[ext] || 'text/plain; charset=utf-8',
          'Cache-Control': 'no-cache'
        });
        return res.end(fs.readFileSync(filePath));
      }

      return sendJson(res, 404, { error: `Endpoint veya dosya bulunamadı: ${pathname}` });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
}

export function createGeoInsightServer() {
  return http.createServer(handleGeoInsightRequest);
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  const port = Number(process.env.PORT || 4080);
  const server = createGeoInsightServer();
  server.listen(port, '127.0.0.1', () => {
    console.log(`Muğla GeoInsight Platform (Web + REST API v1) listening on http://127.0.0.1:${port}`);
  });
}
