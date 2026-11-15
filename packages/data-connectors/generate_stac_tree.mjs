/**
 * Muğla GeoInsight - STAC 1.0.0 Catalog Tree & TDD Section 5 Storage Layout Generator
 * Implements TDD Section 5:
 *  - storage/raw/{source}/{collection}/{year}/{product_id}/{processing_version}/
 *  - storage/intermediate/
 *  - storage/derived/
 *  - storage/reports/
 *  - storage/catalog/ (STAC 1.0.0 Catalog, Collections & Item JSONs)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const inventoryFile = path.join(rootDir, 'data', 'catalog', 'mugla_stac_inventory_v1.json');
const storageRoot = path.join(rootDir, 'storage');

const inventory = JSON.parse(fs.readFileSync(inventoryFile, 'utf-8'));

for (const sub of ['raw', 'intermediate', 'derived', 'reports', 'catalog/items']) {
  fs.mkdirSync(path.join(storageRoot, sub), { recursive: true });
}

const stacItemsLinks = [];

for (const acq of inventory.acquisitions) {
  const year = acq.observed_at.slice(0, 4);
  const sourceSlug = acq.provider.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const colSlug = acq.collection.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const procVersion = 'v1.0.0';

  // TDD Section 5 path convention: /{source}/{collection}/{year}/{product_id}/{processing_version}/
  const rawRelPath = `${sourceSlug}/${colSlug}/${year}/${acq.stac_item_id}/${procVersion}`;
  const rawDir = path.join(storageRoot, 'raw', rawRelPath);
  fs.mkdirSync(rawDir, { recursive: true });

  // Write acquisition provenance manifest in raw/
  fs.writeFileSync(
    path.join(rawDir, 'manifest_provenance.json'),
    JSON.stringify(
      {
        acquisition_id: acq.id,
        external_product_id: acq.external_product_id,
        checksum_sha256: acq.checksum_sha256,
        license: acq.license,
        ingested_at: '2026-11-14T15:45:00+03:00',
        processing_version: procVersion
      },
      null,
      2
    )
  );

  // Build STAC 1.0.0 Item JSON in storage/catalog/items/
  const stacItem = {
    stac_version: '1.0.0',
    stac_extensions: [
      'https://stac-extensions.github.io/eo/v1.1.0/schema.json',
      'https://stac-extensions.github.io/sar/v1.0.0/schema.json',
      'https://stac-extensions.github.io/projection/v1.1.0/schema.json'
    ],
    type: 'Feature',
    id: acq.stac_item_id,
    collection: acq.collection,
    bbox: [27.21, 36.32, 29.78, 37.54],
    geometry: {
      type: 'Polygon',
      coordinates: [[[27.21, 36.32], [29.78, 36.32], [29.78, 37.54], [27.21, 37.54], [27.21, 36.32]]]
    },
    properties: {
      datetime: acq.observed_at,
      platform: acq.sensor,
      'eo:cloud_cover': acq.cloud_cover_pct ?? 0,
      'proj:epsg': acq.crs === 'EPSG:32635' ? 32635 : 4326,
      'sar:polarizations': acq.polarization ? acq.polarization.split('+') : undefined,
      'sat:relative_orbit': acq.orbit || undefined,
      'sat:orbit_state': acq.orbit_direction ? acq.orbit_direction.toLowerCase() : undefined,
      'mgi:aoi_ids': acq.aoi_ids,
      'mgi:qc_passed': acq.qc_passed,
      'mgi:qc_flags': acq.qc_flags,
      'mgi:checksum_sha256': acq.checksum_sha256,
      license: acq.license
    },
    links: [
      { rel: 'root', href: '../catalog.json', type: 'application/json' },
      { rel: 'parent', href: '../catalog.json', type: 'application/json' }
    ],
    assets: {
      raw_manifest: {
        href: `../../raw/${rawRelPath}/manifest_provenance.json`,
        type: 'application/json',
        title: 'Raw Product Provenance & Checksum Manifest',
        roles: ['metadata']
      }
    }
  };

  const itemFilename = `${acq.stac_item_id}.json`;
  fs.writeFileSync(path.join(storageRoot, 'catalog', 'items', itemFilename), JSON.stringify(stacItem, null, 2));
  stacItemsLinks.push({
    rel: 'item',
    href: `./items/${itemFilename}`,
    type: 'application/geo+json',
    title: `${acq.sensor} (${acq.observed_at.slice(0, 10)})`
  });
}

const rootCatalogJson = {
  stac_version: '1.0.0',
  type: 'Catalog',
  id: 'mugla-geoinsight-stac-catalog',
  title: 'Muğla GeoInsight Doğrulanmış Uydu ve Çevresel Veri Kataloğu',
  description: 'Muğla 13 ilçe ve 8 araştırma modülü için kalite kontrolünden (QC) geçmiş STAC 1.0.0 veri kataloğu.',
  links: [
    { rel: 'root', href: './catalog.json', type: 'application/json' },
    ...stacItemsLinks
  ]
};

fs.writeFileSync(path.join(storageRoot, 'catalog', 'catalog.json'), JSON.stringify(rootCatalogJson, null, 2));
console.log(`Generated STAC 1.0.0 Catalog and TDD Section 5 storage tree with ${stacItemsLinks.length} items in ${storageRoot}`);
