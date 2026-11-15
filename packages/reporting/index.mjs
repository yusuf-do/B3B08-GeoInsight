/**
 * Muğla GeoInsight - Advanced Geospatial Report & Export Engine
 * Implements PRD Section 8 (5 Report Types), PRD Section 10 (#7 PDF sections),
 * and PRD Section 11 (Coordinate Privacy Masking).
 */

import { RAG_KNOWLEDGE_BASE } from '../geoai/index.mjs';
import { REPORT_TITLES, REPORT_STUDIES, REPORT_RULES } from './english.mjs';

export const REPORT_TYPES = {
  scientific: {
    id: 'scientific',
    title_tr: 'Bilimsel Araştırma Raporu',
    target_audience_tr: 'Akademisyen / Araştırmacı',
    focus_tr: 'Çalışma alanı, sensör/granül listesi, CRS/yöntem denklemleri, nicel bulgular, kontrol parseli/kalite kontrolü, bilimsel yorum, belirsizlikler ve kaynakça.'
  },
  environmental_municipal: {
    id: 'environmental_municipal',
    title_tr: 'Çevresel Durum ve Yönetsel Değerlendirme Raporu',
    target_audience_tr: 'Belediye / Kamu Kurumu (Muğla BB, MUSKİ, İl Müdürlükleri)',
    focus_tr: 'Etkilenen alan büyüklüğü (ha), değişimin zamansal seyri, doğal alan/altyapı ilişkisi, veri eksikleri ve saha inceleme önerileri.'
  },
  agricultural: {
    id: 'agricultural',
    title_tr: 'Tarımsal Alan ve Bitki Göstergeleri Analiz Raporu',
    target_audience_tr: 'Çiftçi / Tarım Uzmanı / Kooperatif',
    focus_tr: 'Parsel bitki canlılık ve nem indeksleri (NDVI/NDMI), bölgesel yağış/sıcaklık bağlamı ve ziraat mühendisi saha doğrulama ihtiyacı.'
  },
  investment_screening: {
    id: 'investment_screening',
    title_tr: 'Çevresel ve Fiziksel Yatırım Ön Değerlendirme Raporu',
    target_audience_tr: 'Yatırımcı / İşletme',
    focus_tr: 'Fiziksel/çevresel yüzey değişim göstergeleri ve doğal tehlike bağlamı (Hukuki imar görüşü, yapı güvenliği veya finansal getiri raporu değildir).'
  },
  strategic_executive: {
    id: 'strategic_executive',
    title_tr: 'Bölgesel Stratejik Durum ve İzleme Öncelikleri Raporu',
    target_audience_tr: 'Kamu Yöneticisi / Stratejik Karar Alıcı',
    focus_tr: 'Pilot bölgeler karşılaştırması, veri/izleme boşlukları, kanıt durumları ve kurumsal saha inceleme öncelikleri.'
  }
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[ch]);
}

function formatBbox(bbox, maskCoordinates) {
  if (!bbox || bbox.length !== 4) return 'Not specified';
  if (maskCoordinates) {
    return '[PRIVATE PARCEL COORDINATES WITHHELD — district or catchment only]';
  }
  return `[${bbox.map((n) => Number(n).toFixed(4)).join(', ')}] (WGS84 / EPSG:4326)`;
}

export function generateReportPackage({
  report_id,
  report_type = 'scientific',
  analysis_contract,
  mask_coordinates = false,
  requested_by_role = 'researcher'
}) {
  const rType = REPORT_TYPES[report_type] || REPORT_TYPES.scientific;
  const c = analysis_contract;
  const selection = c.map_selection;
  const [title, audience] = REPORT_TITLES[rType.id];
  const study = REPORT_STUDIES[c.method.name];
  const status = c.quality.evidence_status.replaceAll('_', ' ');
  const disclaimer = 'These labels reflect project-level evidence quality. They are not official classifications or legal or engineering determinations.';
  const areaName = study && c.area.aoi_id.startsWith('aoi_') && !c.area.aoi_id.startsWith('aoi_custom_')
    ? study.area : c.area.name;
  const createdAt = new Date().toISOString();
  const sources = RAG_KNOWLEDGE_BASE.filter((s) => s.topics.includes(c.module));

  const metricsRows = Object.entries(c.result.metrics || {})
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 10px;border:1px solid #cbd5e1;font-family:monospace;">${k}</td><td style="padding:6px 10px;border:1px solid #cbd5e1;font-weight:600;">${v === null ? 'Not calculated (data or quality constraint)' : v}</td></tr>`
    )
    .join('');

  const obsRows = (c.observations || [])
    .map(
      (o) =>
        `<tr>
          <td style="padding:6px 8px;border:1px solid #cbd5e1;">${o.observed_at.slice(0, 10)}</td>
          <td style="padding:6px 8px;border:1px solid #cbd5e1;">${escapeHtml([o.provider, o.sensor].filter(Boolean).join(' · '))}</td>
          <td style="padding:6px 8px;border:1px solid #cbd5e1;font-family:monospace;font-size:11px;">${o.product_id}</td>
          <td style="padding:6px 8px;border:1px solid #cbd5e1;">${o.mgrs_tile || '-'} / ${o.orbit || '-'}</td>
          <td style="padding:6px 8px;border:1px solid #cbd5e1;">${o.cloud_cover_pct == null ? 'Not reported' : o.cloud_cover_pct + '%'}</td>
          <td style="padding:6px 8px;border:1px solid #cbd5e1;">${o.qc_passed ? 'Passed' : 'Excluded'}</td>
        </tr>`
    )
    .join('');

  const tsRows = (c.result.time_series || [])
    .map((row) => {
      const vals = Object.entries(row)
        .map(([k, v]) => `${k}: <b>${v ?? 'N/A'}</b>`)
        .join(' | ');
      return `<li>${vals}</li>`;
    })
    .join('');

  const printableHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title} — ${escapeHtml(areaName)}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; margin: 32px; line-height: 1.55; }
    .header { border-bottom: 3px solid #0284c7; padding-bottom: 14px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-weight: 700; font-size: 12px; color: #fff; background: ${c.quality.evidence_badge_color}; }
    h1 { font-size: 22px; margin: 0 0 6px 0; color: #0f172a; }
    h2 { font-size: 16px; margin-top: 22px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; color: #0369a1; }
    table { border-collapse: collapse; width: 100%; margin-top: 8px; font-size: 13px; }
    th { background: #f1f5f9; text-align: left; padding: 8px 10px; border: 1px solid #cbd5e1; }
    .box { background: #f8fafc; border-left: 4px solid #0284c7; padding: 12px 16px; margin: 12px 0; border-radius: 4px; }
    .warn-box { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 12px 0; border-radius: 4px; }
    .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #cbd5e1; font-size: 11px; color: #64748b; }
    @media print { .no-print { display: none; } body { margin: 12mm; } }
  </style>
</head>
<body>
  <div class="no-print" style="margin-bottom:16px;text-align:right;">
    <button onclick="window.print()" style="background:#0284c7;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-weight:600;">Print / Save as PDF (Ctrl+P)</button>
  </div>
  <div class="header">
    <div>
      <div style="font-size:12px;font-weight:700;color:#0284c7;letter-spacing:0.06em;">MUĞLA GEOINSIGHT · DECISION SUPPORT AND GEOSPATIAL INTELLIGENCE</div>
      <h1>${title}</h1>
      <div style="font-size:13px;color:#475569;">Audience: <b>${audience}</b> | Report ID: <code>${report_id}</code> | Generated: ${createdAt}</div>
    </div>
    <div style="text-align:right;">
      <span class="badge">Evidence status: ${status}</span>
      <div style="font-size:11px;color:#64748b;margin-top:4px;">Analysis job ID: ${c.provenance.job_id}</div>
    </div>
  </div>

  <h2>1. Area of Interest and Study Period</h2>
  <table>
    <tr><th>Study Area</th><td>${escapeHtml(areaName)} (<code>${c.area.aoi_id}</code>)</td><th>Analysis Module</th><td>${c.module.toUpperCase()} (${c.topic})</td></tr>
    <tr><th>Area</th><td>${c.area.area_ha} ha</td><th>Study Period</th><td>${c.period.start} — ${c.period.end}</td></tr>
    <tr><th>Bounding Box</th><td>${formatBbox(c.area.bbox, mask_coordinates)}</td><th>Coordinate Reference Systems</th><td>Storage: ${c.area.crs_storage} / Analysis: ${c.area.crs_analysis}</td></tr>
  </table>
  ${selection ? `<p><b>Selection:</b> ${selection.source}${selection.event_id ? ` · <code>${selection.event_id}</code>` : ''} · <b>Center (lon, lat):</b> ${mask_coordinates ? 'Withheld' : selection.center.join(', ')}<br><b>Before:</b> ${selection.before} · <b>After:</b> ${selection.after}</p>
  ${!mask_coordinates ? `<details><summary>Boundary geometry (GeoJSON)</summary><pre style="white-space:pre-wrap">${escapeHtml(JSON.stringify(c.area.geometry))}</pre></details>` : ''}` : ''}

  <h2>2. Data Sources and Observation Granules</h2>
  ${selection ? `<p>${escapeHtml(selection.source_text)}. Listed products come from intersecting catalog areas. Coverage of every pixel has not been verified.</p>` : ''}
  <table>
    <thead>
      <tr><th>Date</th><th>Sensor</th><th>Granule / Product ID</th><th>Tile / Orbit</th><th>Cloud Cover</th><th>QC Status</th></tr>
    </thead>
    <tbody>
      ${obsRows || '<tr><td colspan="6" style="padding:8px;">No verified granules were found for this module and period.</td></tr>'}
    </tbody>
  </table>

  <h2>3. Method and Quality Control</h2>
  <div class="box">
    <div><b>Method:</b> <code>${c.method.name}</code> (Version: ${c.method.version})</div>
    <div><b>Confidence:</b> ${study?.confidence || c.quality.confidence.split('(')[0].trim().replaceAll('_', ' ')}</div>
    <div><b>QC Flags:</b> <code>${(c.quality.qc_flags || []).join(', ')}</code></div>
  </div>

  <h2>4. Quantitative Findings</h2>
  <div class="box">
    <b>Measurement summary:</b> ${selection?.measurement || study?.measurement || 'See the result metrics and quality flags below. Values left unset have not been calculated.'}
  </div>
  <table>
    <thead><tr><th>Indicator / Metric</th><th>Value</th></tr></thead>
    <tbody>${metricsRows || '<tr><td colspan="2">No applicable measurements.</td></tr>'}</tbody>
  </table>
  ${tsRows ? `<h3 style="font-size:14px;margin-top:14px;">Time Series Summary</h3><ul style="font-size:12px;">${tsRows}</ul>` : ''}

  <h2>5. Scientific Interpretation</h2>
  <div class="box">
    ${selection?.interpretation || study?.interpretation || 'Check the data coverage and quality flags before interpreting the reported indicators.'}
  </div>
  ${selection?.references.length ? `<ul>${selection.references.map((record) => `<li>${escapeHtml(record.name)} (${record.start} to ${record.end}). ${escapeHtml(record.source)}.</li>`).join('')}</ul>` : ''}

  <h2>6. Recommendations and Field Validation</h2>
  ${(c.separation_of_concerns.recommendations || [])
    .map(
      (r) => `<div class="warn-box">
        <div><b>Rule ID:</b> <code>${r.rule_id}</code> (${REPORT_RULES[r.rule_id]?.[0] || 'Quality review'})</div>
        <div style="margin-top:4px;"><b>Recommendation:</b> ${REPORT_RULES[r.rule_id]?.[1] || 'Review the data and validate findings in the field.'}</div>
        <div style="margin-top:4px;font-size:12px;color:#92400e;"><b>Scope:</b> ${REPORT_RULES[r.rule_id]?.[2] || disclaimer}</div>
      </div>`
    )
    .join('')}

  <h2>7. Uncertainty and Limitations</h2>
  <ul>
    ${(selection ? [selection.limitations] : study?.limitations || ['Check observation coverage and quality flags.']).map((l) => `<li>${l}</li>`).join('')}
  </ul>
  <p style="font-size:12px;color:#475569;"><b>Scope of this report:</b> ${disclaimer} Satellite data alone cannot establish legal or zoning compliance, structural safety, investment returns or exact crop yields.</p>

  <h2>8. Sources and Method References</h2>
  <ul>
    ${sources.map((s) => `<li><b>${s.source_id === 'SRC-MUGLA-SECAP' ? 'Muğla Sustainable Energy and Climate Action Plan (2025–2050) and GIS Portal' : s.title}:</b> ${s.source_id === 'SRC-MUGLA-SECAP' ? 'Muğla Metropolitan Municipality (2025). SECAP 2050 and GIS Inventory.' : s.citation} — <a href="${s.url}">${s.url}</a></li>`).join('')}
  </ul>

  <div class="footer">
    Muğla GeoInsight (version 0.2) • Reproducible pipeline: ${c.provenance.reproducible_pipeline_version} • Report type: ${rType.id}
  </div>
</body>
</html>`;

  // Generate CSV export for time series
  let csvContent = 'date,module,aoi_id,metric_data\n';
  if (c.result.time_series && c.result.time_series.length > 0) {
    const keys = Object.keys(c.result.time_series[0]);
    csvContent = keys.join(',') + '\n' +
      c.result.time_series.map((row) => keys.map((k) => row[k] ?? '').join(',')).join('\n');
  }

  return {
    report_id,
    report_type: rType.id,
    title,
    target_audience: audience,
    title_tr: rType.title_tr,
    target_audience_tr: rType.target_audience_tr,
    created_at: createdAt,
    aoi_id: c.area.aoi_id,
    aoi_name: c.area.name,
    module: c.module,
    ...(selection ? { result_id: selection.result_id, selection_source: selection.source, event_id: selection.event_id, context_version: selection.version, period: c.period } : {}),
    evidence_status: c.quality.evidence_status,
    mask_coordinates,
    requested_by_role,
    sections_included: [
      'calisma_alani_ve_donem',
      'veri_kaynaklari_ve_granuller',
      'yontem_ve_qc',
      'nicel_bulgular_olcum',
      'bilimsel_yorum',
      'kanita_dayali_oneriler',
      'belirsizlikler_ve_kisitlar',
      'kaynakca'
    ],
    html_content: printableHtml,
    csv_export: csvContent
  };
}
