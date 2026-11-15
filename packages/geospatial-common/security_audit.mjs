/**
 * Muğla GeoInsight - Security, Privacy, RBAC, Coordinate Masking & Signed URL Layer
 * Implements PRD Section 11 & TDD Section 13.
 */
import crypto from 'node:crypto';

export const RBAC_PERMISSIONS = {
  researcher: {
    can_draw_private_aoi: true,
    can_view_raw_granule_ids: true,
    can_export_geojson_csv: true,
    can_access_institutional_layers: false,
    allowed_report_types: ['scientific', 'environmental_municipal', 'agricultural']
  },
  municipality: {
    can_draw_private_aoi: true,
    can_view_raw_granule_ids: true,
    can_export_geojson_csv: true,
    can_access_institutional_layers: true,
    allowed_report_types: ['environmental_municipal', 'strategic_executive', 'scientific']
  },
  investor: {
    can_draw_private_aoi: true,
    can_view_raw_granule_ids: false,
    can_export_geojson_csv: true,
    can_access_institutional_layers: false,
    allowed_report_types: ['investment_screening']
  },
  farmer: {
    can_draw_private_aoi: true,
    can_view_raw_granule_ids: false,
    can_export_geojson_csv: true,
    can_access_institutional_layers: false,
    allowed_report_types: ['agricultural']
  },
  citizen: {
    can_draw_private_aoi: true,
    can_view_raw_granule_ids: false,
    can_export_geojson_csv: false,
    can_access_institutional_layers: false,
    allowed_report_types: ['environmental_municipal']
  },
  executive: {
    can_draw_private_aoi: true,
    can_view_raw_granule_ids: true,
    can_export_geojson_csv: true,
    can_access_institutional_layers: true,
    allowed_report_types: ['strategic_executive', 'environmental_municipal', 'scientific']
  }
};

export function checkAoiAccess({ aoi, requestingUserId, requestingRole }) {
  if (!aoi) return { allowed: false, reason: 'AOI_NOT_FOUND' };
  if (aoi.visibility === 'public') return { allowed: true, reason: 'PUBLIC_AOI' };
  if (aoi.owner_user_id === requestingUserId) return { allowed: true, reason: 'OWNER_MATCH' };
  if (aoi.visibility === 'organization' && (requestingRole === 'municipality' || requestingRole === 'executive')) {
    return { allowed: true, reason: 'ORG_TENANT_MATCH' };
  }
  return { allowed: false, reason: 'PRIVATE_AOI_OWNERSHIP_REQUIRED' };
}

export function validateGeometryLimits(ring) {
  if (!Array.isArray(ring) || ring.length < 4) {
    return { valid: false, error: 'INVALID_RING_MIN_VERTICES' };
  }
  if (ring.length > 2500) {
    return { valid: false, error: 'GEOMETRY_COMPLEXITY_EXCEEDED_MAX_2500_VERTICES' };
  }
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    return { valid: false, error: 'POLYGON_RING_NOT_CLOSED' };
  }
  return { valid: true, vertex_count: ring.length };
}

export function maskSensitiveCoordinatesInLog(logPayload) {
  const str = typeof logPayload === 'string' ? logPayload : JSON.stringify(logPayload);
  // Mask floating-point coordinates with 4+ decimals (e.g., 28.64512 -> 28.XX***)
  return str.replace(/\b(2[789]|3[67])\.(\d{2})\d{2,}\b/g, '$1.$2***');
}

export function generateSignedObjectUrl({ objectPath, expiresInSeconds = 900, secret = 'mgi-storage-signing-key' }) {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const sig = crypto
    .createHmac('sha256', secret)
    .update(`${objectPath}:${expiresAt}`)
    .digest('hex')
    .slice(0, 24);
  return `https://storage.mugla-geoinsight.local/${objectPath.replace(/^\/+/, '')}?expires=${expiresAt}&sig=${sig}`;
}
