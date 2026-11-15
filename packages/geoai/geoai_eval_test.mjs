import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { executeGeoAIQuery, USER_ROLES } from './index.mjs';
import { generateReasonedGeoAiResponse, planGeoAiTurn, prepareGeoAiTurn } from './reasoning_assistant.mjs';
import { collectAoiEvidence, mapPeriod, readDrawnAoi } from './aoi_evidence.mjs';
import { getGeoAiSystemStatus, requestGeoAiCompletion } from './llm_provider.mjs';
import { browserGeoAiDefinition, browserGeoAiLanguage, hasUnsupportedGeoAiImpact, hasUnsupportedGeoAiMeasurement } from '../../apps/web/public/geoai-local.js';
import { runModuleAnalysis, MODULE_REGISTRY } from '../analysis-engines/index.mjs';
import { runAutomatedQCValidation } from '../evidence-engine/qc_validator.mjs';
import {
  RBAC_PERMISSIONS,
  checkAoiAccess,
  validateGeometryLimits,
  maskSensitiveCoordinatesInLog,
  generateSignedObjectUrl
} from '../geospatial-common/security_audit.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const inventory = JSON.parse(
  fs.readFileSync(path.join(rootDir, 'data', 'catalog', 'mugla_stac_inventory_v1.json'), 'utf-8')
);
const licenseRegistry = JSON.parse(
  fs.readFileSync(path.join(rootDir, 'data', 'catalog', 'license_and_institutional_registry_v1.json'), 'utf-8')
);

const sampleAois = MODULE_REGISTRY.map((m) => ({
  aoi_id: m.default_aoi_id,
  name: `${m.name_tr} Pilot AOI`,
  module: m.id,
  bbox: [28.0, 36.7, 28.8, 37.3],
  area_ha: 25000.0
}));

console.log('Running GeoAI Hallucination, Citation, QC & Security Evaluation Suite (TDD Sections 13 & 14)...');

// 1. Evaluate GeoAI across all 6 User Personas and all 8 Modules
for (const roleKey of Object.keys(USER_ROLES)) {
  for (const mod of MODULE_REGISTRY) {
    const res = executeGeoAIQuery({
      query: `${mod.name_tr} alanında son durum nedir?`,
      selectedAoiId: mod.default_aoi_id,
      selectedModule: mod.id,
      selectedRole: roleKey,
      aoiCatalog: sampleAois,
      inventory,
      runAnalysisFn: runModuleAnalysis
    });

    assert.equal(res.tool_calls.length, 3, `GeoAI must invoke 3 tools for role=${roleKey}, module=${mod.id}`);
    assert.ok(res.structured_response.citations.length > 0, `GeoAI must cite sources for module=${mod.id}`);
    assert.ok(res.structured_response.measurement_section.length > 20);
    assert.ok(res.structured_response.scientific_interpretation_section.length > 20);
  }
}
console.log('✓ [GEOAI-01] All 48 Role x Module combinations (6 roles x 8 modules) verified for tool calling & citations.');

// 2. Verify Zero Fabrication on Deformation Module
const defQuery = executeGeoAIQuery({
  query: 'Seydikemer yamaçlarında heyelan deformasyon alanı kaç hektardır?',
  selectedAoiId: 'aoi_seydikemer_landslide',
  selectedModule: 'deformation',
  selectedRole: 'researcher',
  aoiCatalog: sampleAois,
  inventory,
  runAnalysisFn: runModuleAnalysis
});
assert.equal(defQuery.analysis_contract.quality.evidence_status, 'insufficient_data');
assert.equal(defQuery.analysis_contract.result.metrics.change_area_hectares, null);
console.log('✓ [GEOAI-02] Zero fabrication verified: Deformation module returns null area & insufficient_data when GNSS is unverified.');

// 3. Verify Automated QC Validator Rules (Work Package #11)
const qcGRDDeform = runAutomatedQCValidation({
  module: 'deformation',
  observations: [{ product_type: 'IW_GRDH_1S', crs: 'EPSG:32635', observed_at: '2026-08-17T00:00:00Z' }]
});
assert.equal(qcGRDDeform.passed, false);
assert.ok(qcGRDDeform.flags.includes('QC_BLOCK_GRD_CANNOT_RUN_INSAR'));
console.log('✓ [QC-01] Automated QC validator blocks GRD products from InSAR deformation workflows.');

// 4. Verify RBAC Private AOI Ownership & Coordinate Log Masking (TDD Section 13)
const privateParcel = {
  aoi_id: 'aoi_custom_farmer_1',
  visibility: 'private',
  owner_user_id: 'farmer_user_42'
};
assert.equal(checkAoiAccess({ aoi: privateParcel, requestingUserId: 'farmer_user_42', requestingRole: 'farmer' }).allowed, true);
assert.equal(checkAoiAccess({ aoi: privateParcel, requestingUserId: 'other_user_99', requestingRole: 'investor' }).allowed, false);

const rawLog = 'User queried private parcel at lon=28.64589, lat=36.84219 in Ortaca';
const maskedLog = maskSensitiveCoordinatesInLog(rawLog);
assert.ok(!maskedLog.includes('28.64589') && maskedLog.includes('28.64***'), 'Coordinates in logs must be masked');

const signedUrl = generateSignedObjectUrl({ objectPath: 'derived/sentinel2/2026/dalyan_mndwi_cog.tif' });
assert.ok(signedUrl.includes('?expires=') && signedUrl.includes('&sig='));
console.log('✓ [SEC-01] RBAC private AOI isolation, coordinate log masking, and signed COG URLs verified.');

// 5. Verify License Registry & Institutional Sharing Table (Work Packages #9 & #10)
assert.equal(licenseRegistry.work_package_10_license_registry.length, 6);
assert.equal(licenseRegistry.work_package_09_institutional_sharing_table.length, 5);
console.log('✓ [GOV-01] License registry (WP #10) and Institutional sharing table (WP #9) verified.');

// Acknowledgements skip the provider, and revisions keep grouped Turkish numbers intact.
const originalFetch = globalThis.fetch;
const originalProvider = process.env.GEOAI_LLM_PROVIDER;
const originalKey = process.env.OPENAI_API_KEY;
const originalModel = process.env.LLM_MODEL;
try {
  process.env.GEOAI_LLM_PROVIDER = 'openai';
  process.env.OPENAI_API_KEY = 'local-test-key';
  const previous = { role: 'assistant', intent: 'analysis', content: 'Bördübet yangınının etki alanı 4.350 ha. Sınır belirsizliği ±%3.8.' };
  const topic = { module_code: 'wildfire_ecosystem', hotspot_id: 'fire_bordubet_2022' };
  const prior = [{ role: 'user', intent: 'analysis', content: 'Bördübet yangınını anlat.' }, previous];
  const requests = [];
  globalThis.fetch = async (_url, request) => {
    requests.push(JSON.parse(request.body));
    return Response.json({ choices: [{ message: { content: 'Modelden gelen yanıt.' } }] });
  };
  const browserTurn = await generateReasonedGeoAiResponse({ question: 'What is a watershed?', localBrowser: true });
  assert.equal(browserTurn.intent, 'information');
  assert.equal(browserTurn.markdown_answer, undefined);
  assert.equal(requests.length, 0, 'Browser mode must not send a prompt to the configured model');
  assert.equal(browserGeoAiLanguage('Havza ne demek?'), 'tr');
  assert.equal(browserGeoAiLanguage('What happened near Köyceğiz?', 'tr'), 'en');
  assert.match(browserGeoAiDefinition('Havza ne demek?', 'tr'), /aynı çıkış noktasına/);
  const areaTurn = prepareGeoAiTurn({ question: 'How much area was affected?', language: 'en', topic_context: topic });
  assert.equal(areaTurn.intent, 'analysis');
  assert.equal(areaTurn.hotspot.id, topic.hotspot_id);
  const hereTurn = prepareGeoAiTurn({ question: 'What happened here?', language: 'en', topic_context: topic });
  assert.equal(hereTurn.currentMap, true);
  assert.equal(hereTurn.hotspot, null);
  const missingTurn = prepareGeoAiTurn({ question: 'What changed here between 2017 and 2022?', language: 'en' });
  const missing = await generateReasonedGeoAiResponse({ turn: missingTurn, localBrowser: true });
  assert.equal(missing.browser_context.evidence_only, true);
  assert.match(missing.evidence_markdown, /2018–2026/);
  const ack = await generateReasonedGeoAiResponse({ question: 'Tamamdır!', chat_history: [previous] });
  assert.equal(ack.intent, 'social');
  assert.equal(ack.is_real_llm, true);
  assert.equal(requests[0].tools, undefined);

  for (const question of ['ne yapalım gelecek için', 'gelecek için ne yapmak lazım', 'Orman yangınlarını azaltmak için neler yapılabilir?', 'Bunlardan en önemlisi hangisi?']) {
    const turn = prepareGeoAiTurn({ question, topic_context: topic, chat_history: prior });
    assert.equal(turn.intent, 'information', question);
    const result = await generateReasonedGeoAiResponse({ turn: await planGeoAiTurn(turn, false) });
    const payload = requests.at(-1);
    assert.equal(result.is_real_llm, true);
    assert.equal(payload.tools, undefined);
    assert.match(payload.messages[0].content, /Bördübet/);
    assert.deepEqual(payload.messages.slice(1, 3), prior.map(({ role, content }) => ({ role, content })));
    assert.equal(payload.messages.at(-1).content, question);
  }

  let failedRequests = 0;
  globalThis.fetch = async () => {
    failedRequests++;
    return new Response(null, { status: 429, headers: { 'Retry-After': '60' } });
  };

  const followUp = prepareGeoAiTurn({ question: 'Peki ne kadar alan etkilenmiş?', module_code: 'water', topic_context: topic });
  assert.equal(followUp.hotspot.id, topic.hotspot_id);
  assert.equal(followUp.module, topic.module_code);
  const clarify = await generateReasonedGeoAiResponse({ question: 'Biraz daha açıklar mısın?', chat_history: [previous] });
  assert.equal(clarify.intent, 'clarify');
  assert.equal(clarify.response_status, 'unavailable');
  assert.doesNotMatch(clarify.markdown_answer, /4\.350 ha/);
  assert.match(clarify.markdown_answer, /kota sınırına/);
  assert.equal(clarify.is_real_llm, false);
  assert.match(clarify.llm_error, /HTTP 429/);

  await requestGeoAiCompletion({ instructions: 'Test', question: 'Test', history: [], maxTokens: 100 });
  assert.equal(failedRequests, 1, 'A rate-limited provider must respect Retry-After');
  assert.equal(getGeoAiSystemStatus().llm_connected, false);
  process.env.LLM_MODEL = 'billing-test-model';
  globalThis.fetch = async () => new Response(null, { status: 402 });
  const billing = await generateReasonedGeoAiResponse({ question: 'Merhaba' });
  assert.equal(billing.response_status, 'unavailable');
  assert.match(billing.markdown_answer, /bakiye|ücretli/);
  process.env.LLM_MODEL = 'routing-test-model';
  globalThis.fetch = async (_url, request) => {
    const payload = JSON.parse(request.body);
    assert.equal(payload.tools[0].function.name, 'inspect_selected_map');
    return Response.json({ choices: [{ message: { tool_calls: [{ function: {
      name: 'inspect_selected_map', arguments: JSON.stringify({ operation: 'analysis', module: 'flood' })
    } }] } }] });
  };
  const planned = await planGeoAiTurn(prepareGeoAiTurn({ question: 'Peki ya su?' }), true);
  assert.equal(planned.intent, 'analysis');
  assert.equal(planned.module, 'flood_inundation');
} finally {
  globalThis.fetch = originalFetch;
  if (originalProvider === undefined) delete process.env.GEOAI_LLM_PROVIDER;
  else process.env.GEOAI_LLM_PROVIDER = originalProvider;
  if (originalKey === undefined) delete process.env.OPENAI_API_KEY;
  else process.env.OPENAI_API_KEY = originalKey;
  if (originalModel === undefined) delete process.env.LLM_MODEL;
  else process.env.LLM_MODEL = originalModel;
}
const wildfireRecord = '9.420 ha Burned Forest Perimeter Area. dNBR: 0.68.';
assert.equal(hasUnsupportedGeoAiMeasurement('The reference event covered 9,420 hectares, with a dNBR of 0.68.', wildfireRecord), false);
assert.equal(hasUnsupportedGeoAiMeasurement('The wildfire burned 10,000 hectares.', wildfireRecord), true);
assert.equal(hasUnsupportedGeoAiMeasurement('NDVI was 0.68.', wildfireRecord), true);
assert.equal(hasUnsupportedGeoAiImpact('Bu değişimler ekonomik ve sosyal olarak önemli bir etkili olmuştur.', wildfireRecord), true);
assert.equal(hasUnsupportedGeoAiImpact('The record does not establish economic losses.', wildfireRecord), false);
console.log('✓ [GEOAI-03] Model chat, browser-mode privacy, measurement checks and provider errors verified.');

const ring = [[28.20, 36.80], [28.22, 36.80], [28.22, 36.82], [28.20, 36.82], [28.20, 36.80]];
const drawing = { crs: 'EPSG:4326', geometry: { type: 'Polygon', coordinates: [ring] } };
const drawn = readDrawnAoi(drawing);
assert.ok(drawn.area_ha > 390 && drawn.area_ha < 404);
assert.equal(drawn.area_crs, 'EPSG:32635');
assert.throws(() => readDrawnAoi({ ...drawing, crs: 'EPSG:3857' }), /EPSG:4326/);
assert.throws(() => readDrawnAoi({ ...drawing, geometry: { type: 'Polygon', coordinates: [[ring[0], ring[2], ring[1], ring[3], ring[0]]] } }), /kesişiyor/);
const inputs = { aoi: drawn, module: 'wildfire_ecosystem', inventory, referenceAreas: [] };
const matching = collectAoiEvidence({ ...inputs, period: mapPeriod(2020, 2022, 8) });
assert.ok(matching.records.some((item) => item.id === 'fire_marmaris_icmeler_2021'));
assert.equal(matching.pixel_metrics, null);
assert.equal(collectAoiEvidence({ ...inputs, period: mapPeriod(2018, 2019, 8) }).records.length, 0);
for (const question of ['Çizdiğim bölgeyi analiz et.', 'Burayı incele.', 'Şu alanı analiz et.', 'Çizdiğim yerde ne olmuş?']) {
  assert.equal(prepareGeoAiTurn({ question }).intent, 'analysis', question);
}
assert.equal(prepareGeoAiTurn({ question: 'Marmaris’te çizdiğim alanı incele.', hasDrawnArea: true }).hotspot, null);
console.log('✓ [GEOAI-04] Drawn AOI validation, projected area, period and actual reference-polygon matching verified.');

console.log('\nALL GEOAI, QC, SECURITY & GOVERNANCE EVALUATION TESTS PASSED!');
