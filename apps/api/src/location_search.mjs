import fs from 'node:fs';
import { isPointInPolygonRing } from '../../../packages/analysis-engines/live_viewport_analyzer.mjs';

function loadData(file) {
  return JSON.parse(fs.readFileSync(new URL(`../../../data/${file}`, import.meta.url), 'utf8'));
}

const fold = (name) => name.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').replaceAll('ı', 'i').trim();
const districts = loadData('aoi/mugla_province_aoi_v1.geojson').features;
const { records } = loadData('catalog/mugla_geonames.json');
const shortName = (name) => name.replace(/ (?:İlçesi|Mahallesi|Köyü)$/iu, '');
const indexed = records.map(([id, original, lat, lon, kind, admin, aliases]) => {
  const name = shortName(original);
  return { id, name, lat, lon, kind, admin, terms: new Set([original, name, ...aliases].map(fold)) };
});
const districtNames = new Map(indexed.filter((p) => p.kind === 'ADM2').map((p) => [p.admin, p.name]));
const districtAt = (lon, lat) => districts.find((d) => isPointInPolygonRing(lon, lat, d.geometry.coordinates[0]));
const cache = new Map();

export async function searchMugla(query) {
  const normalized = fold(query).replace(/(?:,\s*|\s+)mugla(?:\s*,?\s*(?:turkiye|turkey))?$/, '');
  const coordinates = normalized.match(/^(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)$/);
  if (coordinates) {
    const [, lat, lon] = coordinates.map(Number);
    const district = districtAt(lon, lat);
    return district ? [{ name: `${lat}, ${lon} (${district.properties.name}, Muğla)`, lat, lon, zoom: 14 }] : [];
  }
  const canonical = indexed.filter((p) => fold(p.name) === normalized);
  const exact = canonical.length ? canonical : indexed.filter((p) => p.terms.has(normalized));
  const matches = exact.length ? exact : indexed.filter((p) => [...p.terms].some((name) => name.startsWith(normalized + ' ')));
  // A district and its namesake seat are one suggestion. Distinct districts remain separate.
  const seen = new Set();
  const local = matches.sort((a, b) => Number(b.kind === 'ADM2') - Number(a.kind === 'ADM2')).filter((p) => {
    const district = districtNames.get(p.admin);
    if (p.kind.startsWith('PPL') && district && fold(district) === fold(p.name) &&
        matches.some((candidate) => candidate.kind === 'ADM2' && candidate.admin === p.admin)) return false;
    const key = `${fold(p.name)}:${p.admin}:${p.kind}:${p.lat.toFixed(4)}:${p.lon.toFixed(4)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  if (local.length) return local.slice(0, 10).map((p) => ({
    name: [p.name, p.kind === 'ADM2' ? 'District' : p.kind === 'PRT' ? 'Port' : null, p.kind !== 'ADM2' ? districtNames.get(p.admin) : null, 'Muğla'].filter(Boolean).join(', '),
    lat: p.lat, lon: p.lon, zoom: p.kind === 'ADM2' || p.kind === 'ADM1' ? 10 : 14, source: 'GeoNames'
  }));

  const endpoint = process.env.MUGLA_GEOCODER_URL;
  if (!endpoint) return [];
  const saved = cache.get(normalized);
  if (saved?.until > Date.now()) return saved.results;
  const url = new URL(endpoint);
  url.search = new URLSearchParams({
    q: `${query}, Muğla`, countrycodes: 'tr', viewbox: '27.10,37.65,29.85,36.25',
    bounded: '1', limit: '8', format: 'jsonv2', 'accept-language': 'tr'
  });
  const response = await fetch(url, {
    headers: { 'User-Agent': 'MuglaGeoInsight-Search/2.0' }, signal: AbortSignal.timeout(3500)
  });
  if (!response.ok) throw new Error(`Nominatim returned HTTP ${response.status}`);
  const candidates = await response.json();
  if (!Array.isArray(candidates)) throw new Error('Nominatim returned an invalid search response');
  const results = candidates.map((p) => ({
    name: p.display_name, lat: Number(p.lat), lon: Number(p.lon), zoom: 14, source: 'OpenStreetMap'
  })).filter((p) => typeof p.name === 'string' && districtAt(p.lon, p.lat));
  if (cache.size >= 128) cache.delete(cache.keys().next().value);
  cache.set(normalized, { until: Date.now() + 300_000, results });
  return results;
}
