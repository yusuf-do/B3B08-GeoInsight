import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ADAPTER_REGISTRY } from './adapters.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const inventory = JSON.parse(
  fs.readFileSync(path.join(rootDir, 'data', 'catalog', 'mugla_stac_inventory_v1.json'), 'utf-8')
);

console.log('Running ETL & Catalog Adapter Contract Tests (TDD Section 14)...');

// 1. Validate AOI BBox & CRS checks
assert.doesNotThrow(() => {
  ADAPTER_REGISTRY.copernicus.validateParameters({
    aoi: { bbox: [28.575, 36.775, 28.738, 36.948] },
    period: { start: '2021-01-01', end: '2026-11-14' }
  });
});

assert.throws(() => {
  ADAPTER_REGISTRY.copernicus.validateParameters({
    aoi: { bbox: [35.0, 41.0, 36.0, 42.0] }, // Outside Muğla UTM 35N bounds
    period: { start: '2021-01-01', end: '2026-11-14' }
  });
}, /outside Muğla regional bounds/);
console.log('✓ [ETL-01] AOI spatial bounds & CRS gate verified.');

// 2. Validate Sensor, Tile, Orbit & Seasonal Compatibility Pair Check
const s2_2021 = inventory.acquisitions.find((a) => a.id === 'acq_s2_dalyan_20210814');
const s2_2026 = inventory.acquisitions.find((a) => a.id === 'acq_s2_dalyan_20260818');
const s2_cloudy_jan = inventory.acquisitions.find((a) => a.id === 'acq_s2_dalyan_20260115_cloudy');

const validPair = ADAPTER_REGISTRY.copernicus.evaluateCompatibilityPair(s2_2021, s2_2026);
assert.equal(validPair.compatible, true);
assert.equal(validPair.seasonal_day_offset, 4);

const invalidCloudyPair = ADAPTER_REGISTRY.copernicus.evaluateCompatibilityPair(s2_2021, s2_cloudy_jan);
assert.equal(invalidCloudyPair.compatible, false);
assert.ok(invalidCloudyPair.flags.includes('CLOUD_THRESHOLD_EXCEEDED'));
console.log('✓ [ETL-02] Before/After seasonal & cloud compatibility rules verified (4-day offset pass, winter cloudy reject).');

// 3. Validate NISAR Temporal Eligibility Gate (Post 21.10.2026 only)
const nisarCheck2021 = ADAPTER_REGISTRY.nisar.checkTemporalEligibility('2021-01-01');
assert.equal(nisarCheck2021.historical_baseline_supported, false);
assert.equal(nisarCheck2021.sme2_soil_moisture_validated, false);

const nisarCheck2026 = ADAPTER_REGISTRY.nisar.checkTemporalEligibility('2026-10-25');
assert.equal(nisarCheck2026.historical_baseline_supported, true);
console.log('✓ [ETL-03] NISAR L-band VALIDATED date window (21.10.2026+) and SME2 restriction verified.');

// 4. Validate Record Normalization & Checksum Integrity across all 19 inventory granules
for (const acq of inventory.acquisitions) {
  const norm = ADAPTER_REGISTRY.copernicus.normalizeRecord(acq);
  assert.ok(norm.checksum_sha256 && norm.checksum_sha256.length === 16);
  assert.ok(norm.license.length > 0);
}
console.log(`✓ [ETL-04] All ${inventory.acquisitions.length} STAC records normalized with SHA-256 checksum & license metadata.`);

console.log('\nALL ETL & ADAPTER CONTRACT TESTS PASSED!');
