/**
 * Muğla GeoInsight - Source Catalog Adapters & License/QC Contract Layer
 * Implements TDD Section 4.1 (8 Independent Source Adapters) & Section 4.2 (ETL Steps).
 */
import crypto from 'node:crypto';

export class BaseCatalogAdapter {
  constructor({ id, provider, defaultLicense, requiresInstitutionalPermit = false }) {
    this.id = id;
    this.provider = provider;
    this.defaultLicense = defaultLicense;
    this.requiresInstitutionalPermit = requiresInstitutionalPermit;
  }

  validateParameters({ aoi, period }) {
    if (!aoi || !Array.isArray(aoi.bbox) || aoi.bbox.length !== 4) {
      throw new Error(`[${this.id}] Invalid AOI geometry/bbox`);
    }
    const [minLon, minLat, maxLon, maxLat] = aoi.bbox;
    if (minLon < 26.5 || maxLon > 30.5 || minLat < 35.8 || maxLat > 38.0) {
      throw new Error(`[${this.id}] AOI bbox outside Muğla regional bounds (UTM Zone 35N)`);
    }
    if (!period || !period.start || !period.end || period.start > period.end) {
      throw new Error(`[${this.id}] Invalid date range: ${JSON.stringify(period)}`);
    }
    return true;
  }

  normalizeRecord(rawItem) {
    return {
      adapter_id: this.id,
      provider: this.provider,
      external_product_id: rawItem.external_product_id,
      sensor: rawItem.sensor,
      collection: rawItem.collection,
      observed_at: rawItem.observed_at,
      mgrs_tile: rawItem.mgrs_tile || null,
      orbit: rawItem.orbit || null,
      orbit_direction: rawItem.orbit_direction || null,
      polarization: rawItem.polarization || null,
      cloud_cover_pct: rawItem.cloud_cover_pct ?? 0,
      resolution_m: rawItem.resolution_m,
      crs: rawItem.crs || 'EPSG:32635',
      maturity: rawItem.maturity || 'PUBLISHED_VALIDATED',
      license: rawItem.license || this.defaultLicense,
      requires_institutional_permit: this.requiresInstitutionalPermit,
      checksum_sha256:
        rawItem.checksum_sha256 ||
        crypto.createHash('sha256').update(rawItem.external_product_id).digest('hex').slice(0, 16),
      qc_passed: Boolean(rawItem.qc_passed),
      qc_flags: Array.isArray(rawItem.qc_flags) ? rawItem.qc_flags : []
    };
  }
}

export class CopernicusCDSEAdapter extends BaseCatalogAdapter {
  constructor() {
    super({
      id: 'adapter_copernicus_cdse',
      provider: 'Copernicus Data Space Ecosystem (STAC / OData)',
      defaultLicense: 'Copernicus Open Access License (CC-BY-4.0 equivalent attribution)',
      requiresInstitutionalPermit: false
    });
  }

  evaluateCompatibilityPair(sceneBefore, sceneAfter, { maxCloudPct = 15, maxSeasonalDays = 25 } = {}) {
    const flags = [];
    let compatible = true;

    const family1 = sceneBefore.sensor.replace(/[ABC]\b/g, '').trim();
    const family2 = sceneAfter.sensor.replace(/[ABC]\b/g, '').trim();
    if (family1 !== family2) {
      compatible = false;
      flags.push('SENSOR_FAMILY_MISMATCH');
    }
    if (sceneBefore.mgrs_tile !== sceneAfter.mgrs_tile) {
      compatible = false;
      flags.push('MGRS_TILE_MISMATCH');
    }
    if (sceneBefore.polarization !== sceneAfter.polarization || sceneBefore.orbit !== sceneAfter.orbit) {
      compatible = false;
      flags.push('ORBIT_OR_POLARIZATION_MISMATCH');
    }
    if ((sceneBefore.cloud_cover_pct || 0) > maxCloudPct || (sceneAfter.cloud_cover_pct || 0) > maxCloudPct) {
      compatible = false;
      flags.push('CLOUD_THRESHOLD_EXCEEDED');
    }

    const d1 = new Date(sceneBefore.observed_at);
    const d2 = new Date(sceneAfter.observed_at);
    const doy1 = Math.floor((d1 - new Date(d1.getUTCFullYear(), 0, 0)) / 86400000);
    const doy2 = Math.floor((d2 - new Date(d2.getUTCFullYear(), 0, 0)) / 86400000);
    const seasonalDiff = Math.min(Math.abs(doy1 - doy2), 365 - Math.abs(doy1 - doy2));
    if (seasonalDiff > maxSeasonalDays) {
      compatible = false;
      flags.push(`SEASONAL_OFFSET_${seasonalDiff}D_EXCEEDS_${maxSeasonalDays}D`);
    } else {
      flags.push(`SEASONAL_MATCH_${seasonalDiff}D`);
    }

    return { compatible, seasonal_day_offset: seasonalDiff, flags };
  }
}

export class ASFNISARAdapter extends BaseCatalogAdapter {
  constructor() {
    super({
      id: 'adapter_asf_nisar',
      provider: 'NASA / ASF DAAC (NISAR L-Band)',
      defaultLicense: 'NASA Earthdata Open Data Policy',
      requiresInstitutionalPermit: false
    });
    this.validatedStartDate = '2026-10-21';
    this.releaseDate = '2026-11-06';
  }

  checkTemporalEligibility(periodStart) {
    if (periodStart < this.validatedStartDate) {
      return {
        historical_baseline_supported: false,
        validated_from: this.validatedStartDate,
        sme2_soil_moisture_validated: false,
        warning_tr:
          'NISAR VALIDATED L0-L2 ürünleri yalnızca 21.10.2026 ve sonrası gözlemleri kapsar (Yayın: 06.11.2026). 2018-2025 tarihsel serisi için Sentinel-1/2 veya Landsat kullanılmalıdır.'
      };
    }
    return {
      historical_baseline_supported: true,
      validated_from: this.validatedStartDate,
      sme2_soil_moisture_validated: false,
      warning_tr: null
    };
  }
}

export class USGSStacAdapter extends BaseCatalogAdapter {
  constructor() {
    super({
      id: 'adapter_usgs_landsat',
      provider: 'USGS EarthExplorer / Landsat Collection 2 Level-2 STAC',
      defaultLicense: 'USGS Public Domain',
      requiresInstitutionalPermit: false
    });
  }
}

export class NASAFIRMSAdapter extends BaseCatalogAdapter {
  constructor() {
    super({
      id: 'adapter_nasa_firms',
      provider: 'NASA LANCE / FIRMS (MODIS C6.1 & VIIRS 375m)',
      defaultLicense: 'NASA Earthdata Open Data Policy',
      requiresInstitutionalPermit: false
    });
  }
}

export class ClimateGridAdapter extends BaseCatalogAdapter {
  constructor() {
    super({
      id: 'adapter_climate_grids',
      provider: 'Copernicus C3S ERA5-Land + NASA GPM IMERG V07 + NSIDC SMAP',
      defaultLicense: 'Copernicus C3S & NASA Open Data',
      requiresInstitutionalPermit: false
    });
  }
}

export class InstitutionalGISAdapter extends BaseCatalogAdapter {
  constructor() {
    super({
      id: 'adapter_mugla_institutional_gis',
      provider: 'Muğla BB CBS / MUSKİ / OGM / MTA / MAPEG / TUCBS / USBS',
      defaultLicense: 'Kurumsal Veri Paylaşım Protokolü ve İzin Tablosuna Tabi',
      requiresInstitutionalPermit: true
    });
  }
}

export const ADAPTER_REGISTRY = {
  copernicus: new CopernicusCDSEAdapter(),
  nisar: new ASFNISARAdapter(),
  usgs: new USGSStacAdapter(),
  firms: new NASAFIRMSAdapter(),
  climate: new ClimateGridAdapter(),
  institutional: new InstitutionalGISAdapter()
};
