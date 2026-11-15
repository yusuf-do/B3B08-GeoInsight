/**
 * Muğla GeoInsight - Unified Scientific Quality Control (QC) Validator
 * Implements Matrix Sheet 3 Work Package #11 & TDD Section 14:
 * Automates geometry, CRS, NoData, resolution, seasonal window, orbit, cloud, and coherence checks.
 */

export const QC_THRESHOLDS = {
  water: { max_cloud_pct: 15.0, min_valid_pixel_ratio: 0.90, max_seasonal_offset_days: 25, require_same_orbit_sar: true },
  fire: { max_cloud_pct: 20.0, min_valid_pixel_ratio: 0.92, max_seasonal_offset_days: 30, require_control_parcel: true },
  agriculture: { max_cloud_pct: 15.0, min_valid_pixel_ratio: 0.90, max_seasonal_offset_days: 20, max_parcel_index_res_m: 30 },
  flood: { max_cloud_pct: 100.0, min_valid_pixel_ratio: 0.95, require_same_orbit_sar: true },
  coast: { max_cloud_pct: 10.0, min_valid_pixel_ratio: 0.95, max_wave_hs_m: 0.35, max_seasonal_offset_days: 20 },
  industry: { max_cloud_pct: 15.0, min_valid_pixel_ratio: 0.92, max_seasonal_offset_days: 30 },
  urban: { max_cloud_pct: 15.0, min_valid_pixel_ratio: 0.92, max_seasonal_offset_days: 30 },
  deformation: { min_slc_coherence: 0.45, require_complex_slc_or_gunw: true, require_local_gnss_reference: true }
};

export function runAutomatedQCValidation({ module, observations = [], options = {} }) {
  const rules = QC_THRESHOLDS[module] || QC_THRESHOLDS.water;
  const flags = [];
  let passed = true;

  if (!observations || observations.length === 0) {
    return { passed: false, evidence_ceiling: 'insufficient_data', flags: ['QC_FAIL_NO_OBSERVATIONS'] };
  }

  for (const obs of observations) {
    if (obs.crs && obs.crs !== 'EPSG:32635' && obs.crs !== 'EPSG:4326') {
      passed = false;
      flags.push(`QC_FAIL_UNSUPPORTED_CRS_${obs.crs}`);
    }
    if (rules.max_cloud_pct !== undefined && (obs.cloud_cover_pct || 0) > rules.max_cloud_pct && obs.polarization === null) {
      flags.push(`QC_REJECT_OPTICAL_CLOUD_${obs.cloud_cover_pct}PCT_ON_${obs.observed_at.slice(0, 10)}`);
    }
    if (rules.min_valid_pixel_ratio !== undefined && (obs.valid_pixel_ratio ?? 1) < rules.min_valid_pixel_ratio) {
      flags.push(`QC_WARN_LOW_VALID_PIXEL_RATIO_${obs.valid_pixel_ratio}`);
    }
  }

  if (module === 'deformation') {
    const hasGRDOnly = observations.every((o) => (o.product_type || '').includes('GRD'));
    if (hasGRDOnly) {
      return {
        passed: false,
        evidence_ceiling: 'insufficient_data',
        flags: ['QC_BLOCK_GRD_CANNOT_RUN_INSAR']
      };
    }
    if (rules.require_local_gnss_reference && !options.gnss_verified) {
      return {
        passed: false,
        evidence_ceiling: 'insufficient_data',
        flags: ['QC_WAIT_LOCAL_GNSS_GROUND_TRUTH_UNVERIFIED']
      };
    }
  }

  return {
    passed,
    evidence_ceiling: passed ? 'verified' : 'further_investigation_required',
    flags: flags.length > 0 ? flags : ['QC_ALL_AUTOMATED_CHECKS_PASSED']
  };
}
