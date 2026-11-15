/**
 * Muğla GeoInsight - Evidence, Quality Control & Deterministic Recommendation Engine
 * Implements PRD Section 7 & TDD Sections 7, 8, 12.
 *
 * Strictly separates:
 *  1) Measurement (Ölçüm - nicel uydu/sensör bulgusu)
 *  2) Scientific Interpretation (Bilimsel Yorum - fiziksel/çevresel bağlam ve alternatif açıklamalar)
 *  3) Recommendation (Öneri - saha incelemesi ve doğrulama adımları; kesin talimat/hüküm değildir)
 */

export const EVIDENCE_LABELS = {
  verified: {
    code: 'verified',
    tr_label: 'Doğrulanmış',
    badge_color: '#10b981',
    meaning: 'Ölçüm ve yöntem gerekli kalite kontrollerinden (bulut, mevsim, yörünge, geçerli piksel oranı) geçti.',
    ui_behavior: 'Sonuç, nicel metrikler, zaman serisi ve QC bilgileri tam olarak gösterilir.'
  },
  supported: {
    code: 'supported',
    tr_label: 'Destekleniyor',
    badge_color: '#3b82f6',
    meaning: 'Bulguyu destekleyen birden fazla bağımsız veri kaynağı (ör. Optik + SAR veya FIRMS + Optik) mevcut.',
    ui_behavior: 'Kaynaklar ve sensörler arası uyum/ayrışma açıkça listelenir.'
  },
  further_investigation_required: {
    code: 'further_investigation_required',
    tr_label: 'Ek İnceleme Gerekli',
    badge_color: '#f59e0b',
    meaning: 'Yüzey değişimi gözleniyor ancak fiziksel neden kesin değil veya çözünürlük/referans veri sınırı var.',
    ui_behavior: 'Olası açıklamalar, belirsizlik kaynakları ve saha doğrulama ihtiyacı belirtilir.'
  },
  insufficient_data: {
    code: 'insufficient_data',
    tr_label: 'Yetersiz Veri',
    badge_color: '#ef4444',
    meaning: 'Güvenilir bilimsel sonuç için uyumlu gözlem çifti, kalite eşiği veya zorunlu veri katmanı yeterli değil.',
    ui_behavior: 'Sahte analiz veya uydurma metrik üretilmez; eksik koşullar ve doğrulama planı açıklanır.'
  }
};

export const DETERMINISTIC_RULES = [
  {
    rule_id: 'RULE-WATER-001',
    module: 'water',
    condition_name: 'Sulak alan veya açık su yüzeyinde daralma gözlemi',
    additional_checks: ['GPM IMERG yağış anomalisi', 'ERA5-Land buharlaşma/sıcaklık', 'Mevsimsel eşleşme (Ağustos-Ağustos)', 'Sazlık ve su altı bitki örtüsü piksel karışımı'],
    recommendation_tr: 'Dalyan Kanalı ve Sülüngür Gölü kıyı şeridinde su seviyesi (limnigraf) ve tuzluluk/iletkenlik saha ölçümü yapılması; MUSKİ ve DSİ yerel akım verileriyle birlikte hidrolojik su bütçesi incelemesi başlatılması önerilir.',
    non_claim_warning: 'Uydu su maskesi su derinliğini veya yeraltı suyu çekilmesini doğrudan ölçmez; daralmanın nedeni tek başına iklim veya insan müdahalesine bağlanamaz.'
  },
  {
    rule_id: 'RULE-FIRE-001',
    module: 'fire',
    condition_name: 'Yangın sonrası yüksek dNBR yanma şiddeti ve kısmi NDVI toparlanma eğilimi',
    additional_checks: ['Sentinel-2 dNBR sınıfları', 'NASA FIRMS VIIRS termal anomali zaman çizgisi', 'Yanmamış kontrol parseli (Bördübet Batı) NDVI karşılaştırması', 'Eğim ve bakı (Copernicus DEM)'],
    recommendation_tr: 'Yüksek yanma şiddeti (dNBR > 0.44) gösteren ve 4. yıl sonunda NDVI toparlanması kontrol parselinin gerisinde kalan dik yamaçlarda OGM saha ekipleriyle erozyon kontrolü ve doğal gençleşme/fidan tutma saha doğrulaması yapılması önerilir.',
    non_claim_warning: 'Spektral NDVI artışı tek başına ağaç katmanı (kızılçam) restorasyonu anlamına gelmez; maki/otsu örtü gelişimi ile fidan gelişimi saha gözlemiyle ayrıştırılmalıdır.'
  },
  {
    rule_id: 'RULE-AGRI-001',
    module: 'agriculture',
    condition_name: 'Tarımsal parselde bitki indeksi (NDVI/NDMI) gerilemesi ve bölgesel kuraklık bağlamı',
    additional_checks: ['10m Sentinel-2 parsel içi NDVI/NDMI serisi', '9km SMAP toprak nemi ve ERA5-Land sıcaklık bağlamı', 'Parsel sınır ve ürün türü doğrulaması'],
    recommendation_tr: 'Parsel ölçeğinde yaprak su stresi ve toprak nemi için ziraat mühendisi / toprak uzmanı saha kontrolü yapılması önerilir.',
    non_claim_warning: 'NDVI/NDMI doğrudan ürün verimi (kg/da) veya bitki hastalığı teşhisi değildir; 9 km SMAP/ERA5 verisi tarla içi sulama kararı için tek başına kullanılamaz.'
  },
  {
    rule_id: 'RULE-FLOOD-001',
    module: 'flood',
    condition_name: 'Yağış olayı sonrası SAR geri saçılım düşüşü ve su yayılım anomalisi',
    additional_checks: ['Olay öncesi/sonrası aynı iz (track) Sentinel-1 GRD', 'GPM IMERG 24-72 saatlik yağış birikimi', 'Copernicus DEM alçak kot ve eğim maskesi'],
    recommendation_tr: 'Taşkın yayılım sınırı tespit edilen alçak kotlu kesimlerde DSİ ve MUSKİ drenaj/hidrolik model doğrulaması ve saha su izi (high-water mark) kontrolü önerilir.',
    non_claim_warning: 'SAR su maskesi taşkın su derinliğini, akış hızını veya bina içi hasarı ölçmez; 2B/3B hidrolik model yerine geçmez.'
  },
  {
    rule_id: 'RULE-DEFORM-001',
    module: 'deformation',
    condition_name: 'Yamaç veya zeminde LOS deformasyon inceleme talebi',
    additional_checks: ['Sentinel-1 SLC / NISAR GUNW interferometrik coherence (>= 0.45)', 'Atmosferik faz gecikmesi', 'MTA heyelan envanteri ve GNSS referans istasyonu'],
    recommendation_tr: 'Yeterli SLC coherence ve yörünge çifti doğrulandıktan sonra jeodezik (GNSS/Total Station) ve jeoteknik (inklinometre) saha ölçümleriyle doğrulama yapılması önerilir.',
    non_claim_warning: 'GRD genlik verisiyle interferometri yapılamaz. Uydu LOS (bakış doğrultusu) hareketi tek başına bina/yapı güvenliği hükmü vermez.'
  },
  {
    rule_id: 'RULE-COAST-001',
    module: 'coast',
    condition_name: 'Kıyı çizgisi ve kumsal/kumul şeridi değişim talebi',
    additional_checks: ['Aynı mevsim ve düşük dalga/gelgit koşullu Sentinel-2 sahneleri', 'Copernicus Marine dalga yüksekliği (Hs) bağlamı', 'Su-kum spektral sınır kalibrasyonu'],
    recommendation_tr: 'Kıyı çizgisi kayması gözlenen alt kesimlerde kıyı mühendisliği saha profili ve RTK-GNSS kıyı kenar ölçümü yapılması önerilir.',
    non_claim_warning: '10m-30m optik piksel çözünürlüğü anlık gelgit ve dalga kırılmasından etkilenir; resmî Kıyı Kenar Çizgisi tespiti değildir.'
  },
  {
    rule_id: 'RULE-INDUSTRY-001',
    module: 'industry',
    condition_name: 'Açık ocak ve enerji sahası çevresinde arazi örtüsü değişimi',
    additional_checks: ['Çok yıllı yaz kompoziti Sentinel-2 / Landsat yüzey yansıtması', 'MTA/MAPEG ve Muğla BB CBS kurumsal katman izin kontrolü'],
    recommendation_tr: 'Yüzey örtüsü değişimi saptanan alanların resmî ruhsat sınırları ve rehabilitasyon planlarıyla yetkili kurumlarca karşılaştırılması önerilir.',
    non_claim_warning: 'Uydu görüntüsündeki arazi örtüsü değişimi tek başına ruhsat/izin uygunluğu veya hukuki ihlal kanıtı değildir.'
  },
  {
    rule_id: 'RULE-URBAN-001',
    module: 'urban',
    condition_name: 'Yerleşim alanı genişlemesi ve yapılaşmış yüzey artışı',
    additional_checks: ['Sentinel-2 NDBI/NDVI yıllık kompozitleri', 'Sentinel-1 çift polarizasyon geri saçılım değişimi', 'TUCBS / Muğla BB CBS imar ve MAKS katmanı'],
    recommendation_tr: 'Yapılaşmış yüzey artışı gözlenen alt bölgelerde belediye imar ve planlama birimlerince yüksek çözünürlüklü ortofoto ve saha kontrolü yapılması önerilir.',
    non_claim_warning: 'Uydu spektral/radar sınıflandırması tekil bina ruhsatı, parsel sınırı veya imar hukuki statüsü belirlemez.'
  }
];

export function evaluateDeterministicRecommendations(moduleName, evidenceStatus, metrics) {
  const matchingRules = DETERMINISTIC_RULES.filter((r) => r.module === moduleName);
  return matchingRules.map((rule) => ({
    rule_id: rule.rule_id,
    rule_version: '1.0.0',
    condition_triggered: rule.condition_name,
    evidence_status: evidenceStatus,
    evidence_label_tr: EVIDENCE_LABELS[evidenceStatus]?.tr_label || evidenceStatus,
    additional_checks_required: rule.additional_checks,
    recommendation_text: rule.recommendation_tr,
    non_claim_disclaimer: rule.non_claim_warning,
    supporting_metrics_keys: Object.keys(metrics || {})
  }));
}

export function buildStandardResultContract({
  job_id,
  aoi,
  module,
  topic,
  period,
  observations,
  method,
  metrics,
  direction,
  time_series,
  spatial_layers,
  before_after,
  evidence_status,
  confidence,
  qc_flags,
  measurement_summary_tr,
  scientific_interpretation_tr,
  limitations_tr
}) {
  const recommendations = evaluateDeterministicRecommendations(module, evidence_status, metrics);
  const labelInfo = EVIDENCE_LABELS[evidence_status] || EVIDENCE_LABELS.insufficient_data;

  return {
    contract_version: '0.2.0',
    area: {
      aoi_id: aoi.aoi_id,
      name: aoi.name,
      bbox: aoi.bbox,
      area_ha: aoi.area_ha,
      crs_storage: 'EPSG:4326',
      crs_analysis: 'EPSG:32635'
    },
    module,
    topic,
    period,
    observations: observations.map((obs) => ({
      acquisition_id: obs.id,
      provider: obs.provider,
      sensor: obs.sensor,
      product: obs.product_type,
      product_id: obs.external_product_id,
      observed_at: obs.observed_at,
      mgrs_tile: obs.mgrs_tile,
      orbit: obs.orbit,
      orbit_direction: obs.orbit_direction,
      polarization: obs.polarization,
      cloud_cover_pct: obs.cloud_cover_pct,
      resolution_m: obs.resolution_m,
      checksum_sha256: obs.checksum_sha256,
      license: obs.license,
      qc_passed: obs.qc_passed,
      qc_flags: obs.qc_flags
    })),
    method,
    result: {
      metrics,
      direction,
      time_series: time_series || [],
      before_after: before_after || null,
      spatial_layers: spatial_layers || []
    },
    separation_of_concerns: {
      measurement_tr: measurement_summary_tr,
      scientific_interpretation_tr: scientific_interpretation_tr,
      recommendations
    },
    quality: {
      evidence_status: labelInfo.code,
      evidence_label_tr: labelInfo.tr_label,
      evidence_badge_color: labelInfo.badge_color,
      evidence_meaning_tr: labelInfo.meaning,
      confidence,
      qc_flags,
      disclaimer_tr: 'Bu etiket proje içi bilimsel kalite/kanıt durumunu gösterir; NASA, ESA veya başka bir kurumun resmî sınıflandırması ya da hukuki/mühendislik kesin hükmü değildir.'
    },
    limitations: limitations_tr,
    provenance: {
      job_id,
      created_at: new Date().toISOString(),
      reproducible_pipeline_version: 'mgi-engine-0.2.0'
    }
  };
}
