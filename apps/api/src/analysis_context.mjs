import { createHash } from 'node:crypto';
import { MODULE_HOTSPOTS_MUGLA } from '../../../packages/analysis-engines/live_viewport_analyzer.mjs';
import { collectAoiEvidence, mapPeriod, readDrawnAoi } from '../../../packages/geoai/aoi_evidence.mjs';
import { AOI_ERROR, MODULE_COPY, englishLabel, englishPlace, evidenceLimit } from '../../web/public/english.js';

export function selectedMapEvent(context) {
  return MODULE_HOTSPOTS_MUGLA[context.module_code]?.find((event) => event.id === context.hotspot_id);
}

export function resolveReportSelection(context) {
  const module = context.module_code;
  if (!Object.hasOwn(MODULE_HOTSPOTS_MUGLA, module)) throw new Error('Choose a valid research module.');
  const drawn = context.source === 'drawn';
  const event = context.source === 'event' ? selectedMapEvent(context) : null;
  if (!drawn && (!event || event.verification_status !== 'VERIFIED_EVENT' || !event.polygon_ring)) {
    throw new Error('Select a verified event or draw an area before generating a report.');
  }
  let period, shape;
  try {
    period = mapPeriod(context.left_year, context.right_year, context.selected_month);
    shape = readDrawnAoi(drawn ? context.drawn_aoi : {
      crs: 'EPSG:4326', geometry: { type: 'Polygon', coordinates: [event.polygon_ring] }
    });
  } catch (error) {
    throw new Error(AOI_ERROR[error.message] || 'The selected area or comparison period is invalid.');
  }
  const resultId = 'map_' + createHash('sha256').update(JSON.stringify([event?.id || shape.aoi_id, module, period, shape.geometry])).digest('hex').slice(0, 16);
  return { module, drawn, event, period, shape, resultId };
}

export function reportContractForSelection(context, inventory, referenceAreas) {
  const { module, drawn, event, period, shape, resultId } = resolveReportSelection(context);
  const evidence = collectAoiEvidence({ aoi: shape, module, period, inventory, referenceAreas });
  const area = {
    aoi_id: event?.id || shape.aoi_id,
    name: event ? englishPlace(event.name, event.id) : englishPlace(shape.name),
    area_ha: event?.area_ha ?? shape.area_ha,
    bbox: shape.bbox, geometry: shape.geometry, crs_storage: shape.crs, crs_analysis: shape.area_crs
  };
  const withinPeriod = event && event.start_date <= period.end && event.end_date >= period.start;
  const eventMetrics = event?.verified_metrics || {};
  const metrics = withinPeriod ? Object.fromEntries(Object.entries(eventMetrics).filter(([, value]) => Number.isFinite(value))) : {};
  const timeSeries = [...new Set(period.years)].filter((year) => Number.isFinite(eventMetrics.ndvi_by_year?.[year]))
    .map((year) => ({ year, NDVI: eventMetrics.ndvi_by_year[year] }));
  const quality = drawn ? evidence.quality : event.verification_status;
  return {
    area, period, module, topic: MODULE_COPY[module][0],
    method: { name: drawn ? 'drawn_aoi_catalog_and_reference_overlay' : 'verified_event_catalog', version: '1' },
    provenance: { job_id: resultId, reproducible_pipeline_version: '1' },
    quality: {
      evidence_status: quality, evidence_badge_color: event ? '#3b7566' : '#52616c',
      confidence: event ? 'Verified reference record' : 'No processed pixel measurements'
    },
    result: { metrics, time_series: timeSeries },
    observations: evidence.acquisitions.map((item) => ({
      observed_at: item.date, sensor: item.sensor, product_id: item.id, provider: item.provider, qc_passed: item.qc_passed
    })),
    separation_of_concerns: { recommendations: [] },
    map_selection: {
      source: drawn ? 'Drawn area' : 'Selected event',
      result_id: resultId, version: context.version,
      before: `${context.left_year}-${String(period.month).padStart(2, '0')}`,
      after: `${context.right_year}-${String(period.month).padStart(2, '0')}`,
      event_id: event?.id ?? null, center: event ? [event.lon, event.lat] : shape.center,
      source_text: event ? englishLabel(event.data_source) : 'Muğla GeoInsight reference-event inventory and satellite catalog',
      measurement: drawn ? 'Pixel-level measurements are unavailable for this drawn area.'
        : withinPeriod ? 'Measurements below are for the selected reference event. Annual NDVI observations, where available, correspond to the selected years.'
          : 'The selected comparison dates do not include the event. Event-wide measurements are omitted.',
      interpretation: event ? `Reference event dates: ${event.start_date} to ${event.end_date}.`
        : evidence.records.length ? 'The drawn boundary intersects the reference records below. Catalog coverage alone cannot establish environmental change within the polygon.'
          : 'No reference event intersects this polygon during the selected period.',
      limitations: drawn ? 'An intersection does not measure affected hectares or index change inside the drawn boundary. Processed imagery and quality masks are required for those measurements.'
        : evidenceLimit(module, event.verification_status),
      references: drawn ? evidence.records.map((record) => ({
        name: englishPlace(record.name, record.id), start: record.start, end: record.end, source: englishLabel(record.source)
      })) : []
    }
  };
}
