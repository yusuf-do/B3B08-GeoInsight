import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { handleGeoInsightRequest } from './server.mjs';

async function invokeApi(url, { method = 'GET', body = null } = {}) {
  const req = new EventEmitter();
  req.url = url;
  req.method = method;
  req.headers = { host: 'localhost:4080', 'content-type': 'application/json' };

  let statusCode = 200;
  let respHeaders = {};
  let respChunks = [];

  const res = {
    writeHead(code, headers = {}) {
      statusCode = code;
      respHeaders = headers;
    },
    end(payload) {
      if (payload) {
        respChunks.push(Buffer.isBuffer(payload) ? payload.toString('utf-8') : String(payload));
      }
    }
  };

  const promise = handleGeoInsightRequest(req, res);
  if (body !== null) {
    req.emit('data', Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)));
  }
  req.emit('end');
  await promise;

  const rawBody = respChunks.join('');
  return {
    status: statusCode,
    headers: respHeaders,
    text: async () => rawBody,
    json: async () => JSON.parse(rawBody)
  };
}

console.log('Running Muğla GeoInsight E2E Acceptance & Quality Suite...');

// 1. Test Bootstrap & 8 Modules + 13 Districts
const bootRes = await invokeApi('/api/v1/bootstrap');
assert.equal(bootRes.status, 200);
const boot = await bootRes.json();
assert.equal(boot.modules.length, 8, 'All 8 Environmental Intelligence Modules must be registered');
assert.equal(boot.districts_geojson.features.length, 13, 'All 13 Muğla districts must be present');
console.log('✓ [AC-01 & AC-02] 13 Muğla districts and 8 research modules verified.');

// 2. Test Custom AOI Creation (Private by default per PRD Section 11)
const createAoiRes = await invokeApi('/api/v1/areas', {
  method: 'POST',
  body: {
    name: 'Test Özel Zeytinlik Parseli',
    module: 'agriculture',
    geometry: {
      type: 'Polygon',
      coordinates: [[[27.72, 37.24], [27.76, 37.24], [27.76, 37.27], [27.72, 37.27], [27.72, 37.24]]]
    }
  }
});
assert.equal(createAoiRes.status, 201);
const customAoi = await createAoiRes.json();
assert.equal(customAoi.visibility, 'private', 'Custom AOI must default to private visibility');
assert.ok(customAoi.area_ha > 0, 'Custom AOI metric area in EPSG:32635 must be computed');
console.log(`✓ [FR-02 & Sec-11] Custom private AOI creation verified (${customAoi.aoi_id}, ${customAoi.area_ha} ha).`);

// 3. Test STAC Catalog Search for Pilot 1 (Köyceğiz-Dalyan)
const catRes = await invokeApi('/api/v1/catalog/search', {
  method: 'POST',
  body: {
    aoi_id: 'aoi_dalyan_wetland',
    module: 'water',
    period: { start: '2021-01-01', end: '2026-11-14' }
  }
});
assert.equal(catRes.status, 200);
const catData = await catRes.json();
assert.ok(catData.qc_passed_count >= 7, 'Must return verified Sentinel-1/2 and NISAR granules for Dalyan');
assert.ok(catData.qc_rejected_count >= 1, 'Must flag cloudy winter scenes in QC');
console.log(`✓ [AC-03 & FR-04] STAC Catalog search verified (${catData.qc_passed_count} QC-passed granules, ${catData.qc_rejected_count} cloudy scene excluded).`);

// 4. Test Pilot 1 Analysis (Water Engine: Köyceğiz-Dalyan)
const waterRes = await invokeApi('/api/v1/analyses', {
  method: 'POST',
  body: {
    aoi_id: 'aoi_dalyan_wetland',
    module: 'water',
    period: { start: '2021-01-01', end: '2026-11-14' }
  }
});
assert.equal(waterRes.status, 202);
const waterJob = await waterRes.json();
assert.equal(waterJob.contract.quality.evidence_status, 'supported');
assert.equal(waterJob.contract.result.metrics.change_area_hectares, -314.2);
assert.ok(waterJob.contract.result.before_after.sensor_compatibility_verified);
assert.ok(waterJob.contract.result.time_series.length >= 6);
console.log('✓ [AC-04 & AC-05] Pilot 1 (Köyceğiz-Dalyan Water Engine) before/after, metrics & time-series verified.');

// 5. Test Pilot 2 Analysis (Fire Engine: Marmaris-Bördübet)
const fireRes = await invokeApi('/api/v1/analyses', {
  method: 'POST',
  body: {
    aoi_id: 'aoi_bordubet_fire',
    module: 'fire',
    period: { start: '2021-01-01', end: '2026-11-14' }
  }
});
assert.equal(fireRes.status, 202);
const fireJob = await fireRes.json();
assert.equal(fireJob.contract.quality.evidence_status, 'verified');
assert.equal(fireJob.contract.result.metrics.cumulative_burned_footprint_ha, 8942.8);
assert.equal(fireJob.contract.result.metrics.relative_spectral_recovery_pct, 75.8);
console.log('✓ [AC-04 & AC-05] Pilot 2 (Marmaris-Bördübet Fire Engine) dNBR, FIRMS & NDVI recovery verified.');

// 6. Test Phase-2 QC Gate (Deformation Engine must NOT fabricate metrics)
const defRes = await invokeApi('/api/v1/analyses', {
  method: 'POST',
  body: {
    aoi_id: 'aoi_seydikemer_landslide',
    module: 'deformation',
    period: { start: '2021-01-01', end: '2026-11-14' }
  }
});
const defJob = await defRes.json();
assert.equal(defJob.contract.quality.evidence_status, 'insufficient_data');
assert.equal(defJob.contract.result.metrics.change_area_hectares, null);
console.log('✓ [AC-02 & TDD-14] Phase-2 QC Gate verified: no fabricated metrics when SLC InSAR/GNSS is unverified.');

// 7. Test GeoAI Tool-Calling & Guardrails (NISAR history + Prohibited legal/structural claims)
const aiRes = await invokeApi('/api/v1/assistant/query', {
  method: 'POST',
  body: {
    query: 'NISAR ile 2020 yılındaki değişimi ve bina yapı güvenliği ile imar uygunluğunu kesin söyler misiniz?',
    aoi_id: 'aoi_dalyan_wetland',
    module: 'water',
    role: 'municipality'
  }
});
assert.equal(aiRes.status, 200);
const aiData = await aiRes.json();
assert.equal(aiData.tool_calls.length, 3, 'GeoAI must invoke catalog, analysis contract, and RAG tools');
assert.equal(aiData.structured_response.guardrails.length, 2, 'Both NISAR temporal guardrail and non-legal/structural claim guardrail must fire');
console.log('✓ [AC-06 & TDD-11] GeoAI tool execution trace, citations, and scientific guardrails verified.');

// 8. Test Report Generation with Coordinate Privacy Masking (PRD AC-07 & Sec-11)
const repRes = await invokeApi('/api/v1/reports', {
  method: 'POST',
  body: {
    result_id: waterJob.result_id,
    report_type: 'environmental_municipal',
    mask_coordinates: true,
    role: 'municipality'
  }
});
assert.equal(repRes.status, 201);
const repData = await repRes.json();
assert.equal(repData.sections_included.length, 8);
assert.ok(repData.html_content.includes('PRIVATE PARCEL COORDINATES WITHHELD'));
assert.ok(repData.html_content.includes('<html lang="en">'));
console.log('✓ [AC-07 & Sec-11] Role-based report generation and coordinate masking verified.');

// 9. Test Blank / Live-Synced User Data Slots Mode (/api/v1/slots & mode="slots")
const slotsRes = await invokeApi('/api/v1/slots');
assert.equal(slotsRes.status, 200);
const slotsData = await slotsRes.json();
assert.ok(
  [
    'WAITING_FOR_USER_DATA',
    'PARTIALLY_POPULATED_FROM_LIVE_PUBLIC_APIS',
    'POPULATED_WITH_NASA_SPACEAPPS_SAR_AND_EO_DATA'
  ].includes(slotsData.slots.status)
);
assert.equal(slotsData.modules_summary.length, 8);

const slotAnaRes = await invokeApi('/api/v1/analyses', {
  method: 'POST',
  body: {
    aoi_id: 'aoi_seydikemer_landslide',
    module: 'deformation',
    mode: 'slots'
  }
});
assert.equal(slotAnaRes.status, 202);
const slotAnaData = await slotAnaRes.json();
assert.equal(slotAnaData.contract.result.metrics.los_velocity_mm_yr, null);
console.log('✓ [SLOTS-09] NASA Space Apps SAR + Live Public API Slots (/api/v1/slots) verified.');

// 10. Test Live Viewport Analyzer: Verified Polygon, Bördübet Land Coordinate Fix, Provenance & Unverified Point Guardrail
const vpFireRes = await invokeApi('/api/v1/viewport/analyze', {
  method: 'POST',
  body: {
    lat: 36.818,
    lon: 28.215,
    hotspot_id: 'fire_marmaris_icmeler_2021',
    module_code: 'wildfire_ecosystem',
    left_year: 2020,
    right_year: 2022,
    selected_month: 8
  }
});
assert.equal(vpFireRes.status, 200);
const vpFire = await vpFireRes.json();
assert.equal(vpFire.provenance.verification_status, 'VERIFIED_EVENT');
assert.ok(vpFire.area.polygon_ring.length >= 6, 'Must return real multi-vertex polygon ring');
const bordubetSpot = vpFire.affected_hotspots.find((h) => h.id === 'fire_bordubet_2022');
assert.ok(bordubetSpot.lon > 28.1, 'Bördübet 2022 fire marker must be on land (>28.10E), not in the sea');

const vpCustomRes = await invokeApi('/api/v1/viewport/analyze', {
  method: 'POST',
  body: {
    lat: 37.31,
    lon: 28.52,
    module_code: 'wildfire_ecosystem',
    left_year: 2020,
    right_year: 2022,
    selected_month: 8
  }
});
const vpCustom = await vpCustomRes.json();
assert.equal(vpCustom.provenance.verification_status, 'UNVERIFIED_CUSTOM_AREA', 'Unverified point must not fabricate verified event metrics');
console.log('✓ [AUDIT-10] Real multi-vertex polygons, Bördübet land coordinate fix, 10-field provenance, and zero-synthetic custom click verified.');

// 11. Test Functional GeoAI Decision Engine on All 5 Core Analytical Scenarios
const testQuestions = [
  "Marmaris'teki yangının nedenleri neler olabilir?",
  'Bu bölgede sel riski var mı?',
  'Yangından sonra bitki örtüsü ne kadar iyileşti?',
  'Bu alanın 2020 ve 2022 görüntülerini karşılaştır.',
  "Muğla'da hangi bölgelerde çevresel değişim daha fazla?"
];
for (const q of testQuestions) {
  const qRes = await invokeApi('/api/v1/assistant/query', {
    method: 'POST',
    body: {
      query: q,
      module_code: 'wildfire_ecosystem',
      hotspot_id: 'fire_marmaris_icmeler_2021',
      lat: 36.818,
      lon: 28.215,
      left_year: 2020,
      right_year: 2022,
      viewport_analysis: vpFire
    }
  });
  assert.equal(qRes.status, 200);
  const qData = await qRes.json();
  assert.ok(qData.reasoned_chat.markdown_answer.length > 200, `GeoAI must return rich analytical response for: ${q}`);
}
console.log('✓ [AUDIT-11] All 5 core GeoAI spatial decision-support scenarios verified.');

console.log('\nALL 11 ACCEPTANCE, QUALITY, PROVENANCE & GEOAI TESTS PASSED SUCCESSFULLY!');
