/**
 * Muğla GeoInsight - Tool-Grounded GeoAI Assistant Engine
 * Implements TDD Section 11:
 *  1) Intent Parser
 *  2) Clarification Check
 *  3) Tool Planner
 *  4) Authorized Tool Execution
 *  5) Evidence Layer (separates Measurement, Interpretation, Recommendation, Uncertainties)
 *  6) Role-Aware Response Composer
 */

export const USER_ROLES = {
  researcher: {
    id: 'researcher',
    name_tr: 'Bilim İnsanı / Araştırmacı',
    tone: 'Akademik, metodolojik, sensör/yörünge/indeks formülü ve QC bayraklarını tam detayla sunan teknik dil.',
    default_report_type: 'scientific'
  },
  municipality: {
    id: 'municipality',
    name_tr: 'Yerel Yönetim / Kamu Kurumu',
    tone: 'Bölgesel planlama, etkilenen hektar büyüklüğü, zamansal eğilim, belirsizlik ve saha doğrulama adımlarına odaklanan yönetsel dil.',
    default_report_type: 'environmental_municipal'
  },
  investor: {
    id: 'investor',
    name_tr: 'Yatırımcı / İşletme',
    tone: 'Çevresel ve fiziksel ön değerlendirme odaklı; hukuki uygunluk, imar veya yatırım getirisi hükmü içermediğini açıkça belirten dil.',
    default_report_type: 'investment_screening'
  },
  farmer: {
    id: 'farmer',
    name_tr: 'Çiftçi / Tarımsal Üretici',
    tone: 'Tarla ve bitki gelişim göstergelerini yağış ve sıcaklık bağlamıyla sade açıklayan, ziraat uzmanı saha kontrolünü vurgulayan anlaşılır dil.',
    default_report_type: 'agricultural'
  },
  citizen: {
    id: 'citizen',
    name_tr: 'Genel Kullanıcı / Vatandaş',
    tone: 'Yaşadığı bölgedeki değişimi önce/sonra bulgularıyla sade, şeffaf ve panik/kesin hüküm yaratmadan anlatan bilgilendirici dil.',
    default_report_type: 'environmental_municipal'
  },
  executive: {
    id: 'executive',
    name_tr: 'Kamu Yöneticisi / Stratejik Karar Alıcı',
    tone: 'İlçe/havza karşılaştırması, veri/izleme boşlukları ve saha inceleme önceliklerini özetleyen stratejik karar destek dili.',
    default_report_type: 'strategic_executive'
  }
};

export const RAG_KNOWLEDGE_BASE = [
  {
    source_id: 'SRC-COPERNICUS-S2',
    title: 'ESA Copernicus Sentinel-2 MSI Level-2A Product Specification',
    citation: 'ESA (2024). Sentinel-2 User Handbook & L2A Surface Reflectance Processing Baseline 05.11.',
    url: 'https://dataspace.copernicus.eu/analyse/apis',
    topics: ['water', 'fire', 'agriculture', 'coast', 'industry', 'urban'],
    summary: '10m (B02, B03, B04, B08) ve 20m (B8A, B11, B12) yüzey yansıtması; MNDWI ve NBR/dNBR hesaplarında bulut maskesi (SCL) ve aynı mevsim eşleşmesi zorunludur.'
  },
  {
    source_id: 'SRC-COPERNICUS-S1',
    title: 'ESA Sentinel-1 C-SAR GRD & SLC Product Guide',
    citation: 'ESA (2024). Sentinel-1 SAR Technical Guide: GRD Backscatter vs SLC Interferometry.',
    url: 'https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_S1_GRD',
    topics: ['water', 'flood', 'deformation', 'fire', 'urban'],
    summary: 'GRD ürünleri yalnızca genlik/geri saçılım (VV/VH dB) içerir ve su maskesi veya yapısal değişim için kullanılır; InSAR deformasyon analizi için faz bilgisi içeren SLC ürünleri şarttır.'
  },
  {
    source_id: 'SRC-NASA-NISAR',
    title: 'NASA-ISRO SAR (NISAR) L-Band Data Availability & Product Overview',
    citation: 'NASA ASF DAAC (06.11.2026). NISAR Validated L0-L2 Products Release Note.',
    url: 'https://nisar-docs.asf.alaska.edu/availability-overview/',
    topics: ['water', 'deformation', 'agriculture'],
    summary: '06.11.2026 tarihinde yayımlanan VALIDATED L-band L0–L2 (GCOV, GUNW, RSLC) ürünleri 21.10.2026 ve sonrası gözlemleri kapsar. Tarihsel 2018–2025 analizi için kullanılamaz; VALIDATED Level-3 SME2 toprak nemi ürünü henüz mevcut değildir.'
  },
  {
    source_id: 'SRC-NASA-FIRMS',
    title: 'NASA FIRMS MODIS C6.1 & VIIRS 375m Active Fire Documentation',
    citation: 'NASA LANCE FIRMS (2026). Active Fire / Thermal Anomalies User Guide.',
    url: 'https://firms.modaps.eosdis.nasa.gov/content/active_fire/',
    topics: ['fire'],
    summary: 'VIIRS 375m ve MODIS 1km verileri uydu geçiş anındaki aktif termal anomali merkezlerini verir; doğrudan yanmış alan sınırı (perimetre) olarak kullanılamaz.'
  },
  {
    source_id: 'SRC-CLIMATE-GRIDS',
    title: 'Copernicus ERA5-Land, NASA GPM IMERG V07 & SMAP Enhanced 9km',
    citation: 'ECMWF C3S & NASA GES DISC / NSIDC (2026). Regional Hydro-Meteorological Datasets.',
    url: 'https://climate.copernicus.eu/climate-reanalysis',
    topics: ['water', 'agriculture', 'flood'],
    summary: 'ERA5-Land (~9 km), SMAP (9 km) ve GPM IMERG (~10 km) bölgesel iklim ve yağış bağlamı sağlar; tarla parseli çözünürlüğünde değildir ve yer istasyonu ölçümü yerine geçmez.'
  },
  {
    source_id: 'SRC-MUGLA-SECAP',
    title: 'Muğla Büyükşehir Belediyesi 2025–2050 Sürdürülebilir Enerji ve İklim Eylem Planı (SECAP) & CBS Portalı',
    citation: 'Muğla BB (2025). SECAP 2050 & Muğla CBS Uygulama Envanteri.',
    url: 'https://iklim.mugla.bel.tr/Secap_2050',
    topics: ['water', 'fire', 'flood', 'urban', 'coast', 'agriculture'],
    summary: 'Muğla için yerel iklim kırılganlığı ve uyum politikası bağlamı sağlar. CBS portalındaki kurumsal katmanların (MUSKİ, İmar, 3B İHA) açık API ile toplu indirme izni ayrıca kurumsal protokole tabidir.'
  },
  {
    source_id: 'SRC-NASA-SPACEAPPS-SAR',
    title: 'NASA Space Apps Challenge: Dancing with the SARs — Multi-Frequency SAR & OPERA Fusion',
    citation: 'NASA ESDIS, ASF Vertex, JPL OPERA, CSA (RADARSAT-1/RCM) & CONAE (SAOCOM) (2026). Dancing with the SARs Official Resource Guide.',
    url: 'https://www.spaceappschallenge.org/2026/challenges/dancing-with-the-sars/?tab=resources',
    topics: ['water', 'fire', 'agriculture', 'flood', 'deformation', 'coast', 'industry', 'urban'],
    summary: 'C-bant (~5.6 cm: Sentinel-1, CSA RADARSAT-1/RCM, OPERA L2 RTC-S1 & L3 DSWX-S1) ve L-bant (~24 cm: NASA/ISRO NISAR, JAXA ALOS PALSAR, CONAE SAOCOM, NASA JPL UAVSAR) çoklu frekans ve polarimetrik SAR füzyonu. Köyceğiz-Dalyan için 3.192 OPERA RTC-S1 ve 1.266 OPERA DSWX-S1 granülü, Marmaris-Bördübet için 1.880 VIIRS yangın granülü doğrulandı.'
  },
  {
    source_id: 'SRC-CSA-CONAE-PARTNERS',
    title: 'CSA RADARSAT-1 / RCM & CONAE SAOCOM Partner SAR Missions + NASA ARSET / StoryMaps',
    citation: 'Canadian Space Agency (CSA), CONAE Argentina & NASA ARSET (2026). Multi-Agency SAR Applications.',
    url: 'https://github.com/asc-csa/Synthetic_Aperture_Radar_Tutorial',
    topics: ['water', 'coast', 'flood', 'agriculture', 'fire', 'deformation'],
    summary: 'CSA RADARSAT-1/RCM C-bant deniz/kıyı/sulak alan izleme iş akışı ile CONAE SAOCOM 1A/1B L-bant tam polarimetrik toprak nemi ve orman biyokütle penetrasyonu metodolojilerini NASA ARSET ve NISAR StoryMaps standartlarıyla birleştirir.'
  }
];

export function parseGeoAIIntent({ query, selectedAoiId, selectedModule, selectedRole, period }) {
  const q = (query || '').toLowerCase();

  let detectedModule = selectedModule || null;
  if (q.includes('dalyan') || q.includes('köyceğiz') || q.includes('koycegiz') || q.includes('sulak') || q.includes('sülüngür') || q.includes('göl') || q.includes('su yüzeyi')) {
    detectedModule = 'water';
  } else if (q.includes('bördübet') || q.includes('bordubet') || q.includes('marmaris') || q.includes('yangın') || q.includes('yangin') || q.includes('dnbr') || q.includes('firms')) {
    detectedModule = 'fire';
  } else if (q.includes('heyelan') || q.includes('deformasyon') || q.includes('insar') || q.includes('seydikemer') || q.includes('zemin')) {
    detectedModule = 'deformation';
  } else if (q.includes('tarım') || q.includes('tarla') || q.includes('zeytin') || q.includes('milas') || q.includes('smap') || q.includes('verim')) {
    detectedModule = 'agriculture';
  } else if (q.includes('taşkın') || q.includes('taskin') || q.includes('sel') || q.includes('dalaman')) {
    detectedModule = 'flood';
  } else if (q.includes('kıyı') || q.includes('kiyi') || q.includes('iztuzu') || q.includes('plaj') || q.includes('kumul')) {
    detectedModule = 'coast';
  } else if (q.includes('maden') || q.includes('yatağan') || q.includes('yatagan') || q.includes('ocak')) {
    detectedModule = 'industry';
  } else if (q.includes('şehir') || q.includes('yapılaşma') || q.includes('imar') || q.includes('bodrum')) {
    detectedModule = 'urban';
  }

  let detectedAoiId = selectedAoiId || null;
  if (q.includes('dalyan') || q.includes('köyceğiz')) detectedAoiId = 'aoi_dalyan_wetland';
  else if (q.includes('bördübet') || q.includes('marmaris')) detectedAoiId = 'aoi_bordubet_fire';
  else if (q.includes('seydikemer')) detectedAoiId = 'aoi_seydikemer_landslide';
  else if (q.includes('iztuzu')) detectedAoiId = 'aoi_iztuzu_coast';
  else if (q.includes('milas')) detectedAoiId = 'aoi_milas_agriculture';
  else if (q.includes('dalaman')) detectedAoiId = 'aoi_dalaman_flood';
  else if (q.includes('yatağan')) detectedAoiId = 'aoi_yatagan_mining';
  else if (q.includes('bodrum')) detectedAoiId = 'aoi_bodrum_urban';

  // Detect prohibited / out-of-bounds legal, structural safety, financial return, or yield guarantee questions
  const asksProhibitedClaim =
    q.includes('bina sağlam mı') ||
    q.includes('yapı güvenliği') ||
    q.includes('ruhsat ihlali') ||
    q.includes('kaçak yapı') ||
    q.includes('imar uygun') ||
    q.includes('yatırım getirisi') ||
    q.includes('kaç ton verim') ||
    q.includes('kesin neden');

  const asksNisarHistory = q.includes('nisar') && (q.includes('2018') || q.includes('2020') || q.includes('2021') || q.includes('2022') || q.includes('geçmiş'));

  return {
    raw_query: query,
    module: detectedModule || 'water',
    aoi_id: detectedAoiId || (detectedModule === 'fire' ? 'aoi_bordubet_fire' : 'aoi_dalyan_wetland'),
    role: USER_ROLES[selectedRole] ? selectedRole : 'researcher',
    period: period || { start: '2021-01-01', end: '2026-11-14' },
    flags: {
      asksProhibitedClaim,
      asksNisarHistory
    }
  };
}

export function getGeoAiGuardrails({ asksProhibitedClaim, asksNisarHistory }) {
  const warnings = [];
  if (asksProhibitedClaim) {
    warnings.push('KAPSAM SINIRI UYARISI (PRD İlke 2.6): Muğla GeoInsight uydu verisinden tek başına hukuki uygunluk, ruhsat/imar ihlali, tekil bina/yapı güvenliği, kesin tarımsal rekolte veya finansal yatırım getirisi hükmü vermez.');
  }
  if (asksNisarHistory) {
    warnings.push('NISAR ZAMAN KAPSAMI UYARISI (Veri Matrisi Karar #3): NASA-ISRO NISAR VALIDATED L0–L2 ürünleri 06.11.2026 tarihinde yayımlanmış olup yalnızca 21.10.2026 ve sonrası gözlemleri kapsar. 2018–2025 tarihsel analizi için Sentinel-1 C-SAR ve Sentinel-2/Landsat arşivleri kullanılmaktadır.');
  }
  return warnings;
}

export function executeGeoAIQuery({
  query,
  selectedAoiId,
  selectedModule,
  selectedRole = 'researcher',
  period,
  aoiCatalog,
  inventory,
  runAnalysisFn
}) {
  const intent = parseGeoAIIntent({ query, selectedAoiId, selectedModule, selectedRole, period });
  const roleInfo = USER_ROLES[intent.role] || USER_ROLES.researcher;
  const aoiObj = aoiCatalog.find((a) => a.aoi_id === intent.aoi_id) || aoiCatalog[0];

  // Tool Execution Trace (TDD Section 11: Tool planner + Tool execution)
  const toolCalls = [];

  // Tool 1: Catalog Search
  const catalogMatches = (inventory.acquisitions || []).filter(
    (acq) => acq.aoi_ids.includes(aoiObj.aoi_id)
  );
  toolCalls.push({
    tool_name: 'catalog.search_acquisitions',
    arguments: { aoi_id: aoiObj.aoi_id, module: intent.module, period: intent.period },
    status: 'SUCCESS',
    summary: `${catalogMatches.length} doğrulanmış referans granül bulundu (QC geçen: ${catalogMatches.filter((c) => c.qc_passed).length}).`
  });

  // Tool 2: Execute / Retrieve Standard Analysis Contract
  const analysisResult = runAnalysisFn({
    job_id: `geoai_inline_${Date.now()}`,
    aoi: aoiObj,
    module: intent.module,
    period: intent.period,
    inventory
  });
  toolCalls.push({
    tool_name: 'analysis.get_standard_contract',
    arguments: { aoi_id: aoiObj.aoi_id, module: intent.module, crs: 'EPSG:32635' },
    status: 'SUCCESS',
    summary: `Kanıt durumu: ${analysisResult.quality.evidence_label_tr} (${analysisResult.quality.evidence_status}), Yön: ${analysisResult.result.direction}`
  });

  // Tool 3: RAG Scientific & Institutional Source Retrieval
  const relevantSources = RAG_KNOWLEDGE_BASE.filter((s) => s.topics.includes(intent.module));
  toolCalls.push({
    tool_name: 'rag.retrieve_verified_sources',
    arguments: { topic: intent.module },
    status: 'SUCCESS',
    summary: `${relevantSources.length} bilimsel/kurumsal metodoloji kaynağı eşleştirildi.`
  });

  // Compose response strictly separating Measurement, Interpretation, Uncertainties, and Recommendations
  const guardrailsTriggered = getGeoAiGuardrails(intent.flags);

  const roleHeader = `[Rol Görünümü: ${roleInfo.name_tr}] — Konum: ${aoiObj.name} (${aoiObj.area_ha} ha, Analiz CRS: EPSG:32635)`;
  const evidenceBadge = `${analysisResult.quality.evidence_label_tr} (${analysisResult.quality.evidence_status})`;

  const answerSections = {
    role_header: roleHeader,
    evidence_status: evidenceBadge,
    guardrails: guardrailsTriggered,
    measurement_section: analysisResult.separation_of_concerns.measurement_tr,
    scientific_interpretation_section: analysisResult.separation_of_concerns.scientific_interpretation_tr,
    limitations_and_missing_data: analysisResult.limitations,
    recommendations: analysisResult.separation_of_concerns.recommendations,
    citations: [
      ...analysisResult.observations.slice(0, 5).map((o) => ({
        type: 'satellite_granule',
        id: o.product_id,
        sensor: o.sensor,
        date: o.observed_at.slice(0, 10),
        qc: o.qc_passed ? 'QC_PASS' : 'QC_REJECTED'
      })),
      ...relevantSources.map((s) => ({
        type: 'methodology_reference',
        id: s.source_id,
        title: s.title,
        citation: s.citation,
        url: s.url
      }))
    ]
  };

  const formattedMarkdown = [
    `### ${roleHeader}`,
    `**Kanıt ve Kalite Durumu:** \`${evidenceBadge}\` | **Güven Düzeyi:** ${analysisResult.quality.confidence}`,
    ...(guardrailsTriggered.length > 0 ? guardrailsTriggered.map((g) => `> ⚠️ **${g}**`) : []),
    `#### 1. Doğrulanmış Ölçüm (Measurement)`,
    analysisResult.separation_of_concerns.measurement_tr,
    `#### 2. Bilimsel Yorum ve Çevresel Bağlam (Interpretation)`,
    analysisResult.separation_of_concerns.scientific_interpretation_tr,
    `#### 3. Belirsizlikler ve Veri Kısıtları (Limitations)`,
    ...analysisResult.limitations.map((l) => `- ${l}`),
    `#### 4. Kanıta Dayalı Saha Önerisi (Recommendation)`,
    ...analysisResult.separation_of_concerns.recommendations.map(
      (r) => `- **[${r.rule_id}]** ${r.recommendation_text} _(${r.non_claim_disclaimer})_`
    ),
    `#### 5. Kullanılan Gözlem Granülleri ve Kaynakça`,
    ...answerSections.citations.map((c) =>
      c.type === 'satellite_granule'
        ? `- **Uydu Granülü:** \`${c.id}\` (${c.sensor}, Tarih: ${c.date}, Durum: ${c.qc})`
        : `- **Referans:** ${c.citation} (${c.url})`
    )
  ].join('\n\n');

  return {
    intent,
    tool_calls: toolCalls,
    analysis_contract: analysisResult,
    structured_response: answerSections,
    markdown: formattedMarkdown
  };
}
