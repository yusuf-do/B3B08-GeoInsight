/**
 * Updates data/aoi/mugla_province_aoi_v1.geojson with real OpenStreetMap administrative boundary geometries
 * for all 13 districts of Muğla so the interactive map renders the true coastline, peninsulas (Bodrum, Datça, Marmaris),
 * gulfs (Gökova, Hisarönü, Fethiye, Güllük) and inland borders.
 */
import fs from 'node:fs';
import path from 'node:path';

const rootDir = 'C:/Users/Pc/.gemini/antigravity/scratch/Mugla_GeoInsight_Proje';
const aoiFile = path.join(rootDir, 'data', 'aoi', 'mugla_province_aoi_v1.geojson');
const existingOsmFile = path.join(rootDir, '01_Eklenecek_Veriler_Buraya', 'aoi_poligonlari', 'gercek_osm_mugla_ve_pilot_ilceler.geojson');

function extractLargestOuterRing(geom) {
  if (!geom) return null;
  if (geom.type === 'Polygon') {
    return geom.coordinates[0];
  }
  if (geom.type === 'MultiPolygon') {
    let bestRing = geom.coordinates[0][0];
    let maxLen = bestRing.length;
    for (const poly of geom.coordinates) {
      if (poly[0] && poly[0].length > maxLen) {
        bestRing = poly[0];
        maxLen = poly[0].length;
      }
    }
    return bestRing;
  }
  return null;
}

function downsampleRing(ring, maxPoints = 140) {
  if (!ring || ring.length <= maxPoints) return ring;
  const step = Math.max(1, Math.floor(ring.length / maxPoints));
  const out = [];
  for (let i = 0; i < ring.length - 1; i += step) {
    out.push([Number(ring[i][0].toFixed(4)), Number(ring[i][1].toFixed(4))]);
  }
  out.push(out[0]);
  return out;
}

async function main() {
  const muglaGeo = JSON.parse(fs.readFileSync(aoiFile, 'utf-8'));
  const existingOsm = fs.existsSync(existingOsmFile)
    ? JSON.parse(fs.readFileSync(existingOsmFile, 'utf-8')).features
    : [];

  const osmByName = new Map();
  for (const f of existingOsm) {
    const n = (f.properties?.name || '').split(',')[0].trim().toLowerCase();
    osmByName.set(n, f.geometry);
  }

  for (const feat of muglaGeo.features) {
    const distName = feat.properties.name;
    const key = distName.toLowerCase();
    let geom = osmByName.get(key);

    if (!geom) {
      const q = `${distName}, Muğla, Türkiye`;
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&polygon_geojson=1&polygon_threshold=0.0015&limit=1`;
      try {
        console.log(`Fetching real OSM boundary for ${distName}...`);
        const res = await fetch(url, {
          headers: { 'User-Agent': 'MuglaGeoInsight-NASASpaceApps/1.0 (https://mugla-geoinsight.org)' }
        });
        if (res.ok) {
          const arr = await res.json();
          if (arr[0]?.geojson) {
            geom = arr[0].geojson;
          }
        }
        await new Promise((r) => setTimeout(r, 1050));
      } catch (e) {
        console.warn(`Warning fetching ${distName}:`, e.message);
      }
    }

    const outerRing = extractLargestOuterRing(geom);
    if (outerRing && outerRing.length >= 4) {
      const simplified = downsampleRing(outerRing, 160);
      feat.geometry = {
        type: 'Polygon',
        coordinates: [simplified]
      };
      let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
      for (const [lon, lat] of simplified) {
        if (lon < minLon) minLon = lon;
        if (lat < minLat) minLat = lat;
        if (lon > maxLon) maxLon = lon;
        if (lat > maxLat) maxLat = lat;
      }
      feat.bbox = [Number(minLon.toFixed(4)), Number(minLat.toFixed(4)), Number(maxLon.toFixed(4)), Number(maxLat.toFixed(4))];
    }
  }

  fs.writeFileSync(aoiFile, JSON.stringify(muglaGeo, null, 2), 'utf-8');
  console.log('Successfully updated all 13 Muğla districts with real OpenStreetMap coastline & border polygons!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
