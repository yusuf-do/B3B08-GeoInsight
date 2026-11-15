import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const aoiDir = path.join(rootDir, 'data', 'aoi');

// Helper to compute bounding box [minLon, minLat, maxLon, maxLat] and approximate area in hectares/km2
function computeGeometryStats(coordsRing) {
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  for (const [lon, lat] of coordsRing) {
    if (lon < minLon) minLon = lon;
    if (lat < minLat) minLat = lat;
    if (lon > maxLon) maxLon = lon;
    if (lat > maxLat) maxLat = lat;
  }
  // Shoelace formula in local metric projection around lat ~37N (1 deg lat ~ 110.98 km, 1 deg lon ~ 88.80 km)
  const latScale = 110.98;
  const lonScale = 111.32 * Math.cos(((minLat + maxLat) / 2) * (Math.PI / 180));
  let areaKm2 = 0;
  for (let i = 0; i < coordsRing.length - 1; i++) {
    const x1 = coordsRing[i][0] * lonScale;
    const y1 = coordsRing[i][1] * latScale;
    const x2 = coordsRing[i + 1][0] * lonScale;
    const y2 = coordsRing[i + 1][1] * latScale;
    areaKm2 += (x1 * y2 - x2 * y1);
  }
  areaKm2 = Math.abs(areaKm2) / 2;
  return {
    bbox: [
      Number(minLon.toFixed(5)),
      Number(minLat.toFixed(5)),
      Number(maxLon.toFixed(5)),
      Number(maxLat.toFixed(5))
    ],
    centroid: [
      Number(((minLon + maxLon) / 2).toFixed(5)),
      Number(((minLat + maxLat) / 2).toFixed(5))
    ],
    area_km2: Number(areaKm2.toFixed(2)),
    area_ha: Number((areaKm2 * 100).toFixed(1))
  };
}

// 1. Muğla Province & 13 Districts GeoJSON
const muglaDistricts = [
  {
    id: 'dist_mentese',
    name: 'Menteşe',
    admin_level: 6,
    center: [28.3636, 37.2153],
    key_topics: ['urban', 'fire', 'agriculture'],
    ring: [
      [28.18, 37.08], [28.58, 37.08], [28.64, 37.26],
      [28.48, 37.38], [28.20, 37.35], [28.14, 37.18], [28.18, 37.08]
    ]
  },
  {
    id: 'dist_bodrum',
    name: 'Bodrum',
    admin_level: 6,
    center: [27.4305, 37.0344],
    key_topics: ['urban', 'coast', 'fire', 'water'],
    ring: [
      [27.21, 36.96], [27.68, 36.98], [27.72, 37.16],
      [27.45, 37.19], [27.23, 37.11], [27.21, 36.96]
    ]
  },
  {
    id: 'dist_marmaris',
    name: 'Marmaris',
    admin_level: 6,
    center: [28.2709, 36.8550],
    key_topics: ['fire', 'coast', 'urban'],
    ring: [
      [27.95, 36.64], [28.42, 36.68], [28.44, 36.94],
      [28.04, 36.95], [27.95, 36.64]
    ]
  },
  {
    id: 'dist_koycegiz',
    name: 'Köyceğiz',
    admin_level: 6,
    center: [28.6884, 36.9701],
    key_topics: ['water', 'fire', 'agriculture', 'flood'],
    ring: [
      [28.52, 36.82], [28.86, 36.82], [28.92, 37.14],
      [28.56, 37.14], [28.52, 36.82]
    ]
  },
  {
    id: 'dist_ortaca',
    name: 'Ortaca',
    admin_level: 6,
    center: [28.7654, 36.8392],
    key_topics: ['water', 'coast', 'agriculture', 'flood'],
    ring: [
      [28.56, 36.75], [28.82, 36.74], [28.84, 36.92],
      [28.58, 36.91], [28.56, 36.75]
    ]
  },
  {
    id: 'dist_dalaman',
    name: 'Dalaman',
    admin_level: 6,
    center: [28.8028, 36.7661],
    key_topics: ['flood', 'agriculture', 'coast'],
    ring: [
      [28.74, 36.66], [29.02, 36.68], [29.04, 36.92],
      [28.78, 36.90], [28.74, 36.66]
    ]
  },
  {
    id: 'dist_fethiye',
    name: 'Fethiye',
    admin_level: 6,
    center: [29.1164, 36.6217],
    key_topics: ['coast', 'urban', 'fire', 'deformation'],
    ring: [
      [28.92, 36.48], [29.26, 36.48], [29.32, 36.86],
      [28.98, 36.86], [28.92, 36.48]
    ]
  },
  {
    id: 'dist_seydikemer',
    name: 'Seydikemer',
    admin_level: 6,
    center: [29.3665, 36.6438],
    key_topics: ['deformation', 'flood', 'agriculture'],
    ring: [
      [29.18, 36.32], [29.74, 36.38], [29.78, 36.94],
      [29.24, 36.92], [29.18, 36.32]
    ]
  },
  {
    id: 'dist_milas',
    name: 'Milas',
    admin_level: 6,
    center: [27.7839, 37.3164],
    key_topics: ['agriculture', 'industry', 'fire', 'water'],
    ring: [
      [27.42, 37.02], [28.05, 37.05], [28.08, 37.52],
      [27.46, 37.48], [27.42, 37.02]
    ]
  },
  {
    id: 'dist_yatagan',
    name: 'Yatağan',
    admin_level: 6,
    center: [28.1419, 37.3396],
    key_topics: ['industry', 'agriculture', 'fire'],
    ring: [
      [27.96, 37.22], [28.34, 37.22], [28.36, 37.50],
      [27.98, 37.48], [27.96, 37.22]
    ]
  },
  {
    id: 'dist_ula',
    name: 'Ula',
    admin_level: 6,
    center: [28.4168, 37.1030],
    key_topics: ['fire', 'coast', 'agriculture'],
    ring: [
      [28.22, 36.98], [28.56, 36.98], [28.58, 37.16],
      [28.24, 37.16], [28.22, 36.98]
    ]
  },
  {
    id: 'dist_datca',
    name: 'Datça',
    admin_level: 6,
    center: [27.6842, 36.7278],
    key_topics: ['coast', 'fire', 'agriculture'],
    ring: [
      [27.36, 36.65], [28.02, 36.68], [28.02, 36.82],
      [27.36, 36.76], [27.36, 36.65]
    ]
  },
  {
    id: 'dist_kavaklidere',
    name: 'Kavaklıdere',
    admin_level: 6,
    center: [28.3660, 37.4450],
    key_topics: ['fire', 'industry', 'deformation'],
    ring: [
      [28.26, 37.36], [28.56, 37.36], [28.58, 37.54],
      [28.26, 37.54], [28.26, 37.36]
    ]
  }
];

const muglaProvinceFeatureCollection = {
  type: 'FeatureCollection',
  name: 'mugla_province_aoi_v1',
  crs: {
    type: 'name',
    properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' }
  },
  metadata: {
    standard_version: '1.0.0',
    created_at: '2026-11-14T15:00:00+03:00',
    storage_crs: 'EPSG:4326',
    analysis_crs: 'EPSG:32635',
    display_crs: 'EPSG:3857',
    province_bbox: [27.21, 36.32, 29.78, 37.54],
    sentinel2_mgrs_tiles: ['35SLA', '35SLB', '35SMA', '35SMB', '35SNA', '35SNB'],
    landsat_wrs2_paths_rows: ['180/034', '179/034', '179/035']
  },
  features: muglaDistricts.map((d) => {
    const stats = computeGeometryStats(d.ring);
    return {
      type: 'Feature',
      id: d.id,
      bbox: stats.bbox,
      properties: {
        aoi_id: d.id,
        name: d.name,
        province: 'Muğla',
        admin_level: d.admin_level,
        center: d.center,
        centroid: stats.centroid,
        area_km2: stats.area_km2,
        area_ha: stats.area_ha,
        key_topics: d.key_topics,
        crs_storage: 'EPSG:4326',
        crs_metric: 'EPSG:32635',
        visibility: 'public'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [d.ring]
      }
    };
  })
};

// 2. Pilot AOI 1: Köyceğiz-Dalyan Su ve Sulak Alan (MVP-1)
const dalyanSubZones = [
  {
    aoi_id: 'aoi_dalyan_wetland',
    name: 'Köyceğiz–Dalyan Sulak Alan ve Lagün Sistemi (Ana Pilot AOI)',
    subzone_type: 'primary_pilot_aoi',
    module: 'water',
    priority: 'MVP-1',
    sentinel2_tile: '35SNA',
    sentinel1_relative_orbits: [29, 131],
    landsat_path_row: '179/034',
    description: 'Köyceğiz Gölü güney çıkışı, Dalyan Kanalı, Sülüngür Gölü ve İztuzu kıyı lagününü kapsayan birincil su/sulak alan izleme poligonu.',
    ring: [
      [28.5750, 36.7750],
      [28.7250, 36.7750],
      [28.7380, 36.9450],
      [28.5820, 36.9480],
      [28.5750, 36.7750]
    ]
  },
  {
    aoi_id: 'aoi_dalyan_reedbed_core',
    name: 'Dalyan Deltası Sazlık & Labirent Çekirdek Zon',
    subzone_type: 'core_wetland_zone',
    module: 'water',
    priority: 'MVP-1',
    sentinel2_tile: '35SNA',
    sentinel1_relative_orbits: [29, 131],
    landsat_path_row: '179/034',
    description: 'Mevsimsel su seviyesi, sazlık-su piksel karışımı (NDWI/MNDWI ve Sentinel-1 VV/VH) kalite kontrol alt bölgesi.',
    ring: [
      [28.5980, 36.7920],
      [28.6780, 36.7920],
      [28.6780, 36.8540],
      [28.5980, 36.8540],
      [28.5980, 36.7920]
    ]
  },
  {
    aoi_id: 'aoi_sulungur_lake',
    name: 'Sülüngür Lagün Gölü Alt-Bölgesi',
    subzone_type: 'lagoon_reference_waterbody',
    module: 'water',
    priority: 'MVP-1',
    sentinel2_tile: '35SNA',
    sentinel1_relative_orbits: [29, 131],
    landsat_path_row: '179/034',
    description: 'Açık su yüzeyi kalibrasyon ve mevsimsel çekilme referans gölü.',
    ring: [
      [28.6380, 36.7960],
      [28.6750, 36.7960],
      [28.6750, 36.8260],
      [28.6380, 36.8260],
      [28.6380, 36.7960]
    ]
  }
];

const dalyanGeoJSON = {
  type: 'FeatureCollection',
  name: 'pilot_dalyan_wetland_aoi_v1',
  crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
  metadata: {
    aoi_package_id: 'MGI-AOI-WATER-001',
    version: '1.0.0',
    created_at: '2026-11-14T15:00:00+03:00',
    storage_crs: 'EPSG:4326',
    metric_crs: 'EPSG:32635',
    module: 'water',
    qc_requirements: {
      max_cloud_cover_pct: 15,
      max_seasonal_day_offset: 25,
      require_matching_orbit_for_s1: true,
      minimum_valid_pixel_ratio: 0.90
    }
  },
  features: dalyanSubZones.map((z) => {
    const stats = computeGeometryStats(z.ring);
    return {
      type: 'Feature',
      id: z.aoi_id,
      bbox: stats.bbox,
      properties: {
        ...z,
        ring: undefined,
        centroid: stats.centroid,
        area_km2: stats.area_km2,
        area_ha: stats.area_ha,
        crs_storage: 'EPSG:4326',
        crs_metric: 'EPSG:32635',
        visibility: 'public'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [z.ring]
      }
    };
  })
};

// 3. Pilot AOI 2: Marmaris-Bördübet Orman Yangını ve Ekosistem (MVP-1)
const bordubetSubZones = [
  {
    aoi_id: 'aoi_bordubet_fire',
    name: 'Marmaris–Bördübet–Hisarönü Yangın ve Ekosistem İzleme Alanı (Ana Pilot AOI)',
    subzone_type: 'primary_pilot_aoi',
    module: 'fire',
    priority: 'MVP-1',
    sentinel2_tile: '35SLA',
    sentinel1_relative_orbits: [29, 131],
    landsat_path_row: '180/034',
    reference_fire_events: ['2021-07-29 Marmaris Yangını', '2022-06-21 Bördübet Yangını'],
    description: 'Bördübet, Değirmenyanı, Hisarönü ve Küfre Koyu çevresindeki kızılçam orman ekosisteminde yanma şiddeti (dNBR) ve çok yıllı NDVI toparlanma izleme alanı.',
    ring: [
      [28.0350, 36.7550],
      [28.2550, 36.7550],
      [28.2550, 36.8850],
      [28.0350, 36.8850],
      [28.0350, 36.7550]
    ]
  },
  {
    aoi_id: 'aoi_bordubet_2022_core',
    name: 'Bördübet–Yedi Adalar Haziran 2022 Yangın Çekirdek Bölgesi',
    subzone_type: 'burn_severity_core',
    module: 'fire',
    priority: 'MVP-1',
    sentinel2_tile: '35SLA',
    sentinel1_relative_orbits: [29, 131],
    landsat_path_row: '180/034',
    reference_fire_events: ['2022-06-21 Bördübet Yangını'],
    description: '21-25 Haziran 2022 yangınında yüksek dNBR değişimi gösteren çekirdek orman bölgesi.',
    ring: [
      [28.0650, 36.7820],
      [28.1850, 36.7820],
      [28.1850, 36.8480],
      [28.0650, 36.8480],
      [28.0650, 36.7820]
    ]
  },
  {
    aoi_id: 'aoi_bordubet_unburned_control',
    name: 'Bördübet Batı Yanmamış Kontrol Orman Parseli',
    subzone_type: 'unburned_phenology_control',
    module: 'fire',
    priority: 'MVP-1',
    sentinel2_tile: '35SLA',
    sentinel1_relative_orbits: [29, 131],
    landsat_path_row: '180/034',
    description: 'Mevsimsel kuraklık ve fenolojik salınımı yangın etkisinden ayrıştırmak için kullanılan referans kontrol alanı.',
    ring: [
      [28.0050, 36.7750],
      [28.0340, 36.7750],
      [28.0340, 36.8150],
      [28.0050, 36.8150],
      [28.0050, 36.7750]
    ]
  }
];

const bordubetGeoJSON = {
  type: 'FeatureCollection',
  name: 'pilot_bordubet_fire_aoi_v1',
  crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
  metadata: {
    aoi_package_id: 'MGI-AOI-FIRE-001',
    version: '1.0.0',
    created_at: '2026-11-14T15:00:00+03:00',
    storage_crs: 'EPSG:4326',
    metric_crs: 'EPSG:32635',
    module: 'fire',
    qc_requirements: {
      max_cloud_cover_pct: 20,
      require_phenological_window_match: true,
      max_seasonal_day_offset: 30,
      firms_note: 'FIRMS thermal anomalies are point/pixel detections, not burn perimeters'
    }
  },
  features: bordubetSubZones.map((z) => {
    const stats = computeGeometryStats(z.ring);
    return {
      type: 'Feature',
      id: z.aoi_id,
      bbox: stats.bbox,
      properties: {
        ...z,
        ring: undefined,
        centroid: stats.centroid,
        area_km2: stats.area_km2,
        area_ha: stats.area_ha,
        crs_storage: 'EPSG:4326',
        crs_metric: 'EPSG:32635',
        visibility: 'public'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [z.ring]
      }
    };
  })
};

// 4. Pilot AOIs for the other 6 Environmental Intelligence Modules
const otherModuleAOIs = [
  {
    aoi_id: 'aoi_seydikemer_landslide',
    name: 'Seydikemer–Eşen Havzası Yamaç ve Zemin Hareketi İzleme Alanı',
    module: 'deformation',
    priority: 'Faz-2 koşullu',
    district: 'Seydikemer',
    sentinel2_tile: '35SNB',
    sentinel1_relative_orbits: [131, 58],
    description: 'Sentinel-1 SLC InSAR/SBAS ve NISAR GUNW uygunluk kontrolü için belirlenen yamaç stabilite pilot alanı.',
    ring: [
      [29.2900, 36.5800], [29.4400, 36.5800],
      [29.4400, 36.7100], [29.2900, 36.7100], [29.2900, 36.5800]
    ]
  },
  {
    aoi_id: 'aoi_iztuzu_coast',
    name: 'İztuzu Kıyı Kordonu ve Dalyan Boğazı Kıyı Değişimi Alanı',
    module: 'coast',
    priority: 'Faz-2',
    district: 'Ortaca',
    sentinel2_tile: '35SNA',
    sentinel1_relative_orbits: [29, 131],
    description: 'İztuzu kumul kordonu, kıyı çizgisi dinamiği ve lagün boğazı morfolojik değişim alanı.',
    ring: [
      [28.5900, 36.7700], [28.6550, 36.7700],
      [28.6550, 36.8150], [28.5900, 36.8150], [28.5900, 36.7700]
    ]
  },
  {
    aoi_id: 'aoi_milas_agriculture',
    name: 'Milas–Selimiye/Beçin Ovası Tarım ve Zeytinlik İzleme Alanı',
    module: 'agriculture',
    priority: 'MVP destek',
    district: 'Milas',
    sentinel2_tile: '35SLB',
    sentinel1_relative_orbits: [29, 131],
    description: 'Tarla ve zeytinlik parsellerinde NDVI/NDMI zaman serisi ile ERA5-Land/GPM/SMAP bölgesel meteorolojik bağlam alanı.',
    ring: [
      [27.6800, 37.2100], [27.8600, 37.2100],
      [27.8600, 37.3300], [27.6800, 37.3300], [27.6800, 37.2100]
    ]
  },
  {
    aoi_id: 'aoi_dalaman_flood',
    name: 'Dalaman–Ortaca Tersakan ve Dalaman Çayı Taşkın Ovası',
    module: 'flood',
    priority: 'MVP destek',
    district: 'Dalaman',
    sentinel2_tile: '35SNA',
    sentinel1_relative_orbits: [29, 131],
    description: 'Aşırı yağış olayları sonrasında Sentinel-1 SAR su maskesi, GPM IMERG yağış birikimi ve Copernicus DEM topoğrafik bağlam alanı.',
    ring: [
      [28.7300, 36.6900], [28.8800, 36.6900],
      [28.8800, 36.8100], [28.7300, 36.8100], [28.7300, 36.6900]
    ]
  },
  {
    aoi_id: 'aoi_yatagan_mining',
    name: 'Yatağan–Milas Açık Ocak ve Enerji Sahaları Arazi Dönüşüm Alanı',
    module: 'industry',
    priority: 'Faz-2',
    district: 'Yatağan',
    sentinel2_tile: '35SMB',
    sentinel1_relative_orbits: [29, 131],
    description: 'Çok yıllı Landsat ve Sentinel-2 kompozitleriyle yüzey örtüsü dönüşümü ve rehabilitasyon izleme alanı.',
    ring: [
      [28.0200, 37.2700], [28.2100, 37.2700],
      [28.2100, 37.4100], [28.0200, 37.4100], [28.0200, 37.2700]
    ]
  },
  {
    aoi_id: 'aoi_bodrum_urban',
    name: 'Bodrum Yarımadası–Yalıkavak/Ortahisar Kentsel Yayılma Alanı',
    module: 'urban',
    priority: 'Faz-2',
    district: 'Bodrum',
    sentinel2_tile: '35SLB',
    sentinel1_relative_orbits: [29, 131],
    description: 'Yıllık optik ve radar geri saçılım değişimiyle yapılaşmış yüzey artışı ve doğal arazi dönüşümü izleme alanı.',
    ring: [
      [27.2600, 37.0100], [27.4900, 37.0100],
      [27.4900, 37.1400], [27.2600, 37.1400], [27.2600, 37.0100]
    ]
  }
];

const otherModulesGeoJSON = {
  type: 'FeatureCollection',
  name: 'pilot_modules_aoi_v1',
  crs: { type: 'name', properties: { name: 'urn:ogc:def:crs:OGC:1.3:CRS84' } },
  metadata: {
    aoi_package_id: 'MGI-AOI-MODULES-001',
    version: '1.0.0',
    created_at: '2026-11-14T15:00:00+03:00',
    storage_crs: 'EPSG:4326',
    metric_crs: 'EPSG:32635'
  },
  features: otherModuleAOIs.map((z) => {
    const stats = computeGeometryStats(z.ring);
    return {
      type: 'Feature',
      id: z.aoi_id,
      bbox: stats.bbox,
      properties: {
        ...z,
        ring: undefined,
        centroid: stats.centroid,
        area_km2: stats.area_km2,
        area_ha: stats.area_ha,
        crs_storage: 'EPSG:4326',
        crs_metric: 'EPSG:32635',
        visibility: 'public'
      },
      geometry: {
        type: 'Polygon',
        coordinates: [z.ring]
      }
    };
  })
};

fs.writeFileSync(path.join(aoiDir, 'mugla_province_aoi_v1.geojson'), JSON.stringify(muglaProvinceFeatureCollection, null, 2));
fs.writeFileSync(path.join(aoiDir, 'pilot_dalyan_wetland_aoi_v1.geojson'), JSON.stringify(dalyanGeoJSON, null, 2));
fs.writeFileSync(path.join(aoiDir, 'pilot_bordubet_fire_aoi_v1.geojson'), JSON.stringify(bordubetGeoJSON, null, 2));
fs.writeFileSync(path.join(aoiDir, 'pilot_modules_aoi_v1.geojson'), JSON.stringify(otherModulesGeoJSON, null, 2));

console.log('Generated 4 standardized GeoJSON files in', aoiDir);
console.log('- mugla_province_aoi_v1.geojson:', muglaProvinceFeatureCollection.features.length, 'districts');
console.log('- pilot_dalyan_wetland_aoi_v1.geojson:', dalyanGeoJSON.features.length, 'zones, primary area:', dalyanGeoJSON.features[0].properties.area_ha, 'ha');
console.log('- pilot_bordubet_fire_aoi_v1.geojson:', bordubetGeoJSON.features.length, 'zones, primary area:', bordubetGeoJSON.features[0].properties.area_ha, 'ha');
console.log('- pilot_modules_aoi_v1.geojson:', otherModulesGeoJSON.features.length, 'module AOIs');
