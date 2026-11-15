import { createHash } from 'node:crypto';
import { MODULE_HOTSPOTS_MUGLA, MODULE_THEMES, findNearestMuglaPlace, isPointInPolygonRing } from '../analysis-engines/live_viewport_analyzer.mjs';

const samePoint = ([ax, ay], [bx, by]) => ax === bx && ay === by;
const cross = ([ax, ay], [bx, by], [cx, cy]) => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
const edges = (ring) => ring.slice(0, -1).map((point, i) => [point, ring[i + 1]]);
const contains = (a, b, p) => p[0] >= Math.min(a[0], b[0]) && p[0] <= Math.max(a[0], b[0]) &&
  p[1] >= Math.min(a[1], b[1]) && p[1] <= Math.max(a[1], b[1]);

function segmentsMeet(a, b, c, d) {
  const abC = cross(a, b, c), abD = cross(a, b, d), cdA = cross(c, d, a), cdB = cross(c, d, b);
  return (abC * abD < 0 && cdA * cdB < 0) || (abC === 0 && contains(a, b, c)) ||
    (abD === 0 && contains(a, b, d)) || (cdA === 0 && contains(c, d, a)) || (cdB === 0 && contains(c, d, b));
}

function ringsMeet(ring, other) {
  return isPointInPolygonRing(...ring[0], other) || isPointInPolygonRing(...other[0], ring) ||
    edges(ring).some(([a, b]) => edges(other).some(([c, d]) => segmentsMeet(a, b, c, d)));
}

// WGS84 / UTM zone 35N, using the transverse Mercator series near 27°E.
function toUtm35([lon, lat]) {
  const radians = Math.PI / 180;
  const phi = lat * radians;
  const a = 6378137;
  const e2 = 0.0066943799901413165;
  const e4 = e2 ** 2, e6 = e2 ** 3;
  const sin = Math.sin(phi), cos = Math.cos(phi), tan = Math.tan(phi);
  const n = a / Math.sqrt(1 - e2 * sin ** 2);
  const t = tan ** 2, ep2 = e2 / (1 - e2), c = ep2 * cos ** 2;
  const w = (lon - 27) * radians * cos;
  const m = a * ((1 - e2 / 4 - 3 * e4 / 64 - 5 * e6 / 256) * phi
    - (3 * e2 / 8 + 3 * e4 / 32 + 45 * e6 / 1024) * Math.sin(2 * phi)
    + (15 * e4 / 256 + 45 * e6 / 1024) * Math.sin(4 * phi) - 35 * e6 / 3072 * Math.sin(6 * phi));
  const x = 500000 + 0.9996 * n * (w + (1 - t + c) * w ** 3 / 6 + (5 - 18 * t + t ** 2 + 72 * c - 58 * ep2) * w ** 5 / 120);
  const y = 0.9996 * (m + n * tan * (w ** 2 / 2 + (5 - t + 9 * c + 4 * c ** 2) * w ** 4 / 24
    + (61 - 58 * t + t ** 2 + 600 * c - 330 * ep2) * w ** 6 / 720));
  return [x, y];
}

export function readDrawnAoi(input) {
  if (input?.crs !== 'EPSG:4326' || input.geometry?.type !== 'Polygon' || input.geometry.coordinates?.length !== 1) {
    throw new Error('Çizimi EPSG:4326 boylam/enlem sıralı tek halkalı GeoJSON poligonu olarak gönderin.');
  }
  const ring = input.geometry.coordinates[0];
  if (!Array.isArray(ring) || ring.length < 4 || ring.length > 501 || !ring.every((p) =>
    Array.isArray(p) && p.length === 2 && p.every(Number.isFinite) && p[0] >= 24 && p[0] <= 30 && p[1] >= 35 && p[1] <= 39)) {
    throw new Error('Poligon 3–500 geçerli köşe içermeli ve Muğla analiz bölgesinin UTM 35N koordinat aralığında olmalı.');
  }
  const boundary = edges(ring);
  if (!samePoint(ring[0], ring.at(-1)) || boundary.some(([a, b]) => samePoint(a, b))) {
    throw new Error('Poligon kapalı olmalı ve ardışık köşeler birbirinden farklı olmalı.');
  }
  for (let i = 0; i < boundary.length; i++) {
    for (let j = i + 2; j < boundary.length; j++) {
      if (i === 0 && j === boundary.length - 1) continue;
      if (segmentsMeet(...boundary[i], ...boundary[j])) throw new Error('Poligon kenarları kendi içinde kesişiyor.');
    }
  }
  const projected = ring.map(toUtm35);
  const origin = projected[0];
  const area = Math.abs(edges(projected).reduce((sum, [a, b]) => sum + cross(origin, a, b), 0)) / 2;
  if (area < 1) throw new Error('Çizilen poligonun yüzölçümü en az 1 m² olmalı.');
  const xs = ring.map(([x]) => x), ys = ring.map(([, y]) => y);
  const bbox = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
  const center = [(bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2];
  const nearest = findNearestMuglaPlace(center[1], center[0]);
  return {
    aoi_id: `drawn_${createHash('sha256').update(JSON.stringify(ring)).digest('hex').slice(0, 16)}`,
    geometry: input.geometry, crs: 'EPSG:4326', area_crs: 'EPSG:32635', bbox, center,
    area_ha: Number((area / 10000).toFixed(4)), name: `${nearest.name} çevresinde çizilen alan`
  };
}

export function mapPeriod(left, right, month) {
  const years = [left, right].map(Number).sort((a, b) => a - b);
  const selectedMonth = Number(month);
  if (!years.every((year) => Number.isInteger(year) && year >= 2018 && year <= 2026) ||
      !Number.isInteger(selectedMonth) || selectedMonth < 1 || selectedMonth > 12) {
    throw new Error('Harita dönemi için 2018–2026 arasında iki yıl ve geçerli bir ay seçin.');
  }
  const mm = String(selectedMonth).padStart(2, '0');
  return { start: `${years[0]}-${mm}-01`, end: `${years[1]}-${mm}-${new Date(Date.UTC(years[1], selectedMonth, 0)).getUTCDate()}`, years, month: selectedMonth };
}

export function collectAoiEvidence({ aoi, module, period, inventory, referenceAreas }) {
  const ring = aoi.geometry.coordinates[0];
  const records = (MODULE_HOTSPOTS_MUGLA[module] || []).filter((event) =>
    event.start_date <= period.end && event.end_date >= period.start && Array.isArray(event.polygon_ring) && ringsMeet(ring, event.polygon_ring)
  ).map((event) => ({ id: event.id, name: event.name, start: event.start_date, end: event.end_date,
    type: event.event_type, quality: event.verification_status, source: event.data_source, uncertainty: event.uncertainty_limitations,
    ...(module === 'wildfire_ecosystem' && event.verification_status === 'VERIFIED_EVENT' ? {
      reference_dnbr: event.verified_metrics?.dnbr_mean ?? null,
      reference_burned_ha: event.verified_metrics?.burned_forest_ha ?? null
    } : {}) }));
  const referenceIds = new Set(referenceAreas.filter((area) => area.geometry?.type === 'Polygon' &&
    area.geometry.coordinates.length === 1 && ringsMeet(ring, area.geometry.coordinates[0])).map((area) => area.aoi_id));
  const acquisitions = inventory.acquisitions.filter((item) => item.observed_at.slice(0, 10) >= period.start &&
    item.observed_at.slice(0, 10) <= period.end && item.aoi_ids.some((id) => referenceIds.has(id))).map((item) => ({
    id: item.stac_item_id, date: item.observed_at.slice(0, 10), sensor: item.sensor, provider: item.provider, qc_passed: item.qc_passed
  }));
  return { aoi, module, analysis_type: MODULE_THEMES[module].title_tr, period, records, acquisitions,
    quality: records.length ? 'reference_overlap' : 'insufficient_data', pixel_metrics: null,
    missing: ['AOI içinde işlenmiş raster bantları ve eşleşen kalite maskeleri'],
    uncertainty: 'Kesişim veya sınır teması referans olayla mekânsal ilişki gösterir. AOI içindeki yanmış alanı ya da indeks değişimini ölçmez.' };
}
