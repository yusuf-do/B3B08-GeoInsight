/**
 * Muğla GeoInsight - Dynamic User Data Ingestor & Slot Binder
 * Keeps all data-dependent slots (scene counts, granule IDs, metrics, time-series,
 * AOI boundaries, institutional permissions) cleanly blank (null / [VERİ BEKLENİYOR])
 * until the user provides/uploads the real datasets, then binds them into:
 *   1) Standard Analysis Result Contracts (data/results/*.json)
 *   2) STAC Inventory (data/catalog/mugla_stac_inventory_v1.json)
 *   3) Web Platform & REST API v1
 *   4) Word/Excel Deliverables & PDF Reports
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODULE_REGISTRY } from '../analysis-engines/index.mjs';
import { buildStandardResultContract } from '../evidence-engine/index.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const primarySlotsPath = path.join(rootDir, '01_Eklenecek_Veriler_Buraya', 'VERI_SABLONU_SLOTLAR.json');
const fallbackSlotsPath = path.join(rootDir, 'data', 'incoming', 'template_user_data_slots.json');
const resultsDir = path.join(rootDir, 'data', 'results');

export function readUserSlots() {
  const target = fs.existsSync(primarySlotsPath) ? primarySlotsPath : fallbackSlotsPath;
  return JSON.parse(fs.readFileSync(target, 'utf-8'));
}

export function writeUserSlots(updatedSlots) {
  fs.mkdirSync(path.dirname(primarySlotsPath), { recursive: true });
  fs.mkdirSync(path.dirname(fallbackSlotsPath), { recursive: true });
  const serialized = JSON.stringify(updatedSlots, null, 2);
  fs.writeFileSync(primarySlotsPath, serialized, 'utf-8');
  fs.writeFileSync(fallbackSlotsPath, serialized, 'utf-8');
  generateCleanBlankContractsFromSlots();
  return updatedSlots;
}

export function generateCleanBlankContractsFromSlots() {
  const slots = readUserSlots();
  fs.mkdirSync(resultsDir, { recursive: true });

  const blankSummary = [];

  for (const mod of MODULE_REGISTRY) {
    const mSlot = slots.module_analysis_slots[mod.id] || {};
    const hasUserData = Object.entries(mSlot).some(
      ([k, v]) =>
        k !== 'evidence_status' &&
        v !== null &&
        v !== 'insufficient_data' &&
        (!Array.isArray(v) || v.length > 0)
    );

    const metricsObj = {};
    for (const [k, v] of Object.entries(mSlot)) {
      if (k !== 'time_series' && k !== 'evidence_status' && k !== 'period_start' && k !== 'period_end') {
        metricsObj[k] = v; // null until user uploads data
      }
    }

    const contract = buildStandardResultContract({
      job_id: `slot_job_${mod.id}`,
      aoi: {
        aoi_id: mod.default_aoi_id,
        name: `${mod.name_tr} AOI [Sınır/Veri Bekleniyor]`,
        bbox: null,
        area_ha: null
      },
      module: mod.id,
      topic: `${mod.id}_analysis`,
      period: {
        start: mSlot.period_start || '[BAŞLANGIÇ TARİHİ BEKLENİYOR]',
        end: mSlot.period_end || '[BİTİŞ TARİHİ BEKLENİYOR]'
      },
      observations: [],
      method: {
        name: `${mod.id}_standard_pipeline`,
        version: '0.2.0-template',
        crs_metric: 'EPSG:32635',
        parameters: { status: hasUserData ? 'USER_DATA_LOADED' : 'WAITING_FOR_USER_DATA' }
      },
      metrics: metricsObj,
      direction: hasUserData ? 'computed_from_user_data' : 'undetermined',
      time_series: mSlot.time_series || [],
      spatial_layers: [],
      before_after: null,
      evidence_status: mSlot.evidence_status || (hasUserData ? 'supported' : 'insufficient_data'),
      confidence: hasUserData ? 'assessed' : 'not_assessed (Gerçek veri yüklemesi bekleniyor)',
      qc_flags: [hasUserData ? 'USER_DATA_INGESTED' : 'WAITING_FOR_USER_DATA_UPLOAD'],
      measurement_summary_tr: hasUserData
        ? `Kullanıcı tarafından yüklenen gerçek veri seti işlendi (${Object.keys(metricsObj).filter((k) => metricsObj[k] !== null).length} metrik dolu).`
        : '[VERİ BEKLENİYOR — Gerçek uydu/saha verisi yüklendiğinde nicel ölçüm özeti bu alana otomatik yazılacaktır.]',
      scientific_interpretation_tr: hasUserData
        ? 'Kullanıcı verisi doğrultusunda bilimsel yorum katmanı güncellenmiştir.'
        : '[VERİ BEKLENİYOR — Gözlem ve meteorolojik/çevresel bağlam verileri eklendiğinde bilimsel yorum bu alana eklenecektir.]',
      limitations_tr: [
        'Gerçek katalog sorgusu ve kullanıcı veri seti henüz yüklenmemiştir; PRD Bölüm 2 gereği veri yüklenene kadar tüm metrik alanları boş (null) bırakılmıştır.'
      ]
    });

    fs.writeFileSync(
      path.join(resultsDir, `blank_slot_contract_${mod.id}.json`),
      JSON.stringify(contract, null, 2),
      'utf-8'
    );

    blankSummary.push({
      module: mod.id,
      status: hasUserData ? 'USER_DATA_LOADED' : slots.status,
      empty_metric_slots: Object.keys(metricsObj).filter((k) => metricsObj[k] === null),
      filled_metric_slots: Object.keys(metricsObj).filter((k) => metricsObj[k] !== null),
      evidence_status: contract.quality.evidence_status
    });
  }

  return blankSummary;
}

export function getBlankOrUserSlotContract(moduleId) {
  const file = path.join(resultsDir, `blank_slot_contract_${moduleId}.json`);
  if (!fs.existsSync(file)) {
    generateCleanBlankContractsFromSlots();
  }
  return JSON.parse(fs.readFileSync(file, 'utf-8'));
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  const res = generateCleanBlankContractsFromSlots();
  console.log('Generated clean blank slot contracts waiting for user data:');
  console.table(res);
}
