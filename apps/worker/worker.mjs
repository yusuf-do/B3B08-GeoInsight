/**
 * Muğla GeoInsight - Asynchronous Background Job Worker (apps/worker/worker.mjs)
 * Implements TDD Section 3 & Section 10: Decouples heavy satellite ETL, COG generation,
 * SAR backscatter / optical index processing, and PDF report rendering from HTTP requests.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { MODULE_REGISTRY, runModuleAnalysis } from '../../packages/analysis-engines/index.mjs';
import { REPORT_TYPES, generateReportPackage } from '../../packages/reporting/index.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const aoiDir = path.join(rootDir, 'data', 'aoi');
const catalogFile = path.join(rootDir, 'data', 'catalog', 'mugla_stac_inventory_v1.json');
const resultsDir = path.join(rootDir, 'data', 'results');
const reportsOutDir = path.join(rootDir, 'deliverables', 'reports');

export async function runBatchWorkerPipeline() {
  fs.mkdirSync(resultsDir, { recursive: true });
  fs.mkdirSync(reportsOutDir, { recursive: true });

  const dalyanGeo = JSON.parse(fs.readFileSync(path.join(aoiDir, 'pilot_dalyan_wetland_aoi_v1.geojson'), 'utf-8'));
  const bordubetGeo = JSON.parse(fs.readFileSync(path.join(aoiDir, 'pilot_bordubet_fire_aoi_v1.geojson'), 'utf-8'));
  const otherGeo = JSON.parse(fs.readFileSync(path.join(aoiDir, 'pilot_modules_aoi_v1.geojson'), 'utf-8'));
  const inventory = JSON.parse(fs.readFileSync(catalogFile, 'utf-8'));

  const allFeatures = [...dalyanGeo.features, ...bordubetGeo.features, ...otherGeo.features];
  const aoiMap = new Map(
    allFeatures.map((f) => [
      f.properties.aoi_id,
      {
        aoi_id: f.properties.aoi_id,
        name: f.properties.name,
        module: f.properties.module,
        bbox: f.bbox,
        centroid: f.properties.centroid,
        area_ha: f.properties.area_ha,
        area_km2: f.properties.area_km2
      }
    ])
  );

  const summaryLog = [];

  // 1. Run all 8 Environmental Intelligence Module Engines and persist Standard Result Contracts
  for (const mod of MODULE_REGISTRY) {
    const aoi = aoiMap.get(mod.default_aoi_id);
    const jobId = `worker_job_${mod.id}_20261114`;
    const contract = runModuleAnalysis({
      job_id: jobId,
      aoi,
      module: mod.id,
      period: { start: '2021-01-01', end: '2026-11-14' },
      inventory
    });

    const contractPath = path.join(resultsDir, `contract_${mod.id}_${aoi.aoi_id}.json`);
    fs.writeFileSync(contractPath, JSON.stringify(contract, null, 2));

    // Export time series CSV if present
    if (contract.result.time_series && contract.result.time_series.length > 0) {
      const keys = Object.keys(contract.result.time_series[0]);
      const csv =
        keys.join(',') +
        '\n' +
        contract.result.time_series.map((r) => keys.map((k) => r[k] ?? '').join(',')).join('\n');
      fs.writeFileSync(path.join(resultsDir, `timeseries_${mod.id}_${aoi.aoi_id}.csv`), csv);
    }

    // Export derived spatial change layers GeoJSON if present
    if (contract.result.spatial_layers && contract.result.spatial_layers.length > 0) {
      const geojsonOut = {
        type: 'FeatureCollection',
        name: `derived_${mod.id}_${aoi.aoi_id}`,
        crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
        features: contract.result.spatial_layers.flatMap((l) => l.geojson.features)
      };
      fs.writeFileSync(
        path.join(resultsDir, `derived_layers_${mod.id}_${aoi.aoi_id}.geojson`),
        JSON.stringify(geojsonOut, null, 2)
      );
    }

    summaryLog.push({
      module: mod.id,
      aoi_id: aoi.aoi_id,
      evidence_status: contract.quality.evidence_status,
      evidence_label_tr: contract.quality.evidence_label_tr,
      observations_count: contract.observations.length
    });
  }

  // 2. Generate all 5 PRD Section 8 Role-Based Reports (HTML/PDF-ready + CSV)
  const reportJobs = [
    { report_type: 'scientific', module: 'fire', aoi_id: 'aoi_bordubet_fire', role: 'researcher', mask: false },
    { report_type: 'environmental_municipal', module: 'water', aoi_id: 'aoi_dalyan_wetland', role: 'municipality', mask: false },
    { report_type: 'agricultural', module: 'agriculture', aoi_id: 'aoi_milas_agriculture', role: 'farmer', mask: true },
    { report_type: 'investment_screening', module: 'water', aoi_id: 'aoi_dalyan_wetland', role: 'investor', mask: true },
    { report_type: 'strategic_executive', module: 'fire', aoi_id: 'aoi_bordubet_fire', role: 'executive', mask: false }
  ];

  for (const rj of reportJobs) {
    const contract = JSON.parse(
      fs.readFileSync(path.join(resultsDir, `contract_${rj.module}_${rj.aoi_id}.json`), 'utf-8')
    );
    const reportId = `MGI_REPORT_${rj.report_type.toUpperCase()}_${rj.module.toUpperCase()}_v02`;
    const pkg = generateReportPackage({
      report_id: reportId,
      report_type: rj.report_type,
      analysis_contract: contract,
      mask_coordinates: rj.mask,
      requested_by_role: rj.role
    });
    fs.writeFileSync(path.join(reportsOutDir, `${reportId}.html`), pkg.html_content, 'utf-8');
    fs.writeFileSync(path.join(reportsOutDir, `${reportId}.json`), JSON.stringify(pkg, null, 2), 'utf-8');
  }

  fs.writeFileSync(path.join(resultsDir, 'worker_batch_summary.json'), JSON.stringify(summaryLog, null, 2));
  return summaryLog;
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  runBatchWorkerPipeline().then((log) => {
    console.log('Worker batch pipeline finished processing all 8 modules and 5 report templates:');
    console.table(log);
  });
}
