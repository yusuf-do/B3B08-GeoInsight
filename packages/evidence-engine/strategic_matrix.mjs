/**
 * Muğla GeoInsight - 13 District Strategic Multi-Indicator & Monitoring Gap Matrix
 * Implements PRD Section 3 (Kamu Yöneticileri: İlçe karşılaştırması, izleme boşlukları, çoklu gösterge görünümü)
 * and PRD Section 8 (Bölgesel Stratejik Durum Raporu).
 */

export const MUGLA_STRATEGIC_DISTRICT_MATRIX = [
  {
    district_id: 'dist_marmaris',
    district_name: 'Marmaris',
    priority_rank: 1,
    priority_tier: 'P0 - Kritik Ekosistem ve Kıyı İzleme',
    primary_modules: ['fire', 'coast', 'urban'],
    secap_2050_focus: 'Orman yangını sonrası ekosistem restorasyonu, kıyı turizm baskısı ve aşırı sıcaklık dalgaları',
    verified_satellite_coverage_pct: 96.5,
    indicators: {
      cumulative_burned_area_2021_2026_ha: 8942.8,
      postfire_ndvi_recovery_pct: 75.8,
      slow_recovery_steep_slope_ha: 2452.6,
      builtup_surface_change_2021_2026_pct: +6.4
    },
    monitoring_gaps: [
      'OGM saha ağaçlandırma başarı poligonları ile uydu NDVI serisinin parsel bazında eşleştirilmesi (Kurumsal protokol bekliyor)',
      'Dik yamaçlarda yangın sonrası yağış kaynaklı sığ heyelan/erozyon saha kalibrasyonu'
    ],
    recommended_action_tr: 'Bördübet–Hisarönü dik sırt kuşağında (2.452,6 ha) OGM ve Muğla BB işbirliğiyle saha erozyon/fidan tutma denetimi.'
  },
  {
    district_id: 'dist_koycegiz',
    district_name: 'Köyceğiz',
    priority_rank: 2,
    priority_tier: 'P0 - Kritik Sulak Alan ve Su Bütçesi İzleme',
    primary_modules: ['water', 'fire', 'flood', 'agriculture'],
    secap_2050_focus: 'Köyceğiz Gölü ve sulak alan su bütçesi, yaz kuraklığı ve havza yangın etkisi',
    verified_satellite_coverage_pct: 95.8,
    indicators: {
      summer_open_water_change_2021_2026_ha: -186.4,
      wet_reedbed_change_ha: -112.0,
      precip_anomaly_pct: -14.2,
      summer_temp_anomaly_c: +1.65
    },
    monitoring_gaps: [
      'Göl içi sürekli su seviyesi (limnigraf) ve yeraltı suyu gözlem kuyusu serilerinin uydu MNDWI serisine bağlanması'
    ],
    recommended_action_tr: 'Köyceğiz Gölü güney çıkışı ve besleyici derelerde DSİ/MUSKİ debi ve limnigraf doğrulaması.'
  },
  {
    district_id: 'dist_ortaca',
    district_name: 'Ortaca',
    priority_rank: 3,
    priority_tier: 'P0 - Kritik Lagün, Kıyı Kordonu ve Tarım İzleme',
    primary_modules: ['water', 'coast', 'agriculture', 'flood'],
    secap_2050_focus: 'Dalyan Deltası–Sülüngür–İztuzu lagün tuzluluk dengesi ve kıyı kordonu morfolojisi',
    verified_satellite_coverage_pct: 96.2,
    indicators: {
      summer_open_water_change_2021_2026_ha: -127.8,
      wet_reedbed_change_ha: -80.7,
      iztuzu_beach_seasonal_shift_m: -4.2,
      agricultural_ndmi_anomaly_pct: -8.4
    },
    monitoring_gaps: [
      'İztuzu dar kıyı şeridinde anlık gelgit/dalga kırılması etkisini gidermek için RTK-GNSS saha kıyı profili serisi',
      'Sazlık kanopisi altında su tuzluluğu/iletkenlik sensör ağı'
    ],
    recommended_action_tr: 'Dalyan Kanalı–Sülüngür–İztuzu hattında mevsimsel su seviyesi, tuzluluk ve kıyı profili saha kampanyası.'
  },
  {
    district_id: 'dist_bodrum',
    district_name: 'Bodrum',
    priority_rank: 4,
    priority_tier: 'P1 - Yüksek Kentsel Yayılma, Su Stresi ve Kıyı İzleme',
    primary_modules: ['urban', 'coast', 'water', 'fire'],
    secap_2050_focus: 'Kentsel ısı adası, geçirimsiz yüzey artışı, su kaynakları stresi ve kıyı baskısı',
    verified_satellite_coverage_pct: 94.0,
    indicators: {
      builtup_impervious_expansion_2021_2026_ha: +418.5,
      builtup_change_pct: +9.8,
      mumcular_geyik_dam_surface_change_pct: -18.4,
      wildfire_affected_2021_2026_ha: 3120.0
    },
    monitoring_gaps: [
      'TUCBS ve Muğla BB CBS MAKS/imar sınırları ile 10m uydu geçirimsiz yüzey katmanının kurumsal entegrasyonu'
    ],
    recommended_action_tr: 'Geçirimsiz yüzey artışı yüksek alt havzalarda yağmur suyu drenaj ve baraj havzası koruma incelemesi.'
  },
  {
    district_id: 'dist_milas',
    district_name: 'Milas',
    priority_rank: 5,
    priority_tier: 'P1 - Tarım/Zeytinlik Kuraklık, Yangın ve Maden/Enerji İzleme',
    primary_modules: ['agriculture', 'industry', 'fire', 'water'],
    secap_2050_focus: 'Zeytinlik ve tarım alanlarında kuraklık stresi, açık ocak rehabilitasyonu ve sulak alan (Bafa/Tuzla) korunumu',
    verified_satellite_coverage_pct: 94.6,
    indicators: {
      olive_agri_ndvi_anomaly_pct: -9.6,
      surface_mining_bare_soil_change_ha: +246.0,
      rehabilitated_vegetation_area_ha: +84.5
    },
    monitoring_gaps: [
      '9 km SMAP/ERA5 toprak nemi verisini destekleyecek yerel tarımsal meteoroloji istasyonu kalibrasyonu',
      'MAPEG ruhsat ve rehabilitasyon sınırlarının kurumsal izinle doğrulanması'
    ],
    recommended_action_tr: 'Selimiye–Beçin ovasında tarımsal kuraklık saha kontrolü ve maden rehabilitasyon sahalarında bitki tutma izlemesi.'
  },
  {
    district_id: 'dist_seydikemer',
    district_name: 'Seydikemer',
    priority_rank: 6,
    priority_tier: 'P1 - Yamaç Hareketi (InSAR), Taşkın ve Tarım İzleme',
    primary_modules: ['deformation', 'flood', 'agriculture'],
    secap_2050_focus: 'Eşen Çayı havzası taşkın yönetimi ve dik yamaç kütle hareketleri',
    verified_satellite_coverage_pct: 82.4,
    indicators: {
      s1_slc_coherent_slope_los_mm_yr: -6.8,
      nisar_lband_coherence_mean: 0.74,
      esen_floodplain_ponding_ha: 390.0
    },
    monitoring_gaps: [
      'C-bant InSAR dekorrelasyonu nedeniyle 2026-2027 NISAR L-band GUNW serisi birikimi ve yerel sabit GNSS istasyonu eksikliği',
      'MTA 1:25.000 heyelan envanteri vektör paylaşım protokolü'
    ],
    recommended_action_tr: 'Eşen vadisi yamaçlarında GNSS/inklinometre referans noktası kurulumu ve NISAR L-band zaman serisi takibi.'
  },
  {
    district_id: 'dist_dalaman',
    district_name: 'Dalaman',
    priority_rank: 7,
    priority_tier: 'P1 - Taşkın Ovası ve Kıyı/Tarım İzleme',
    primary_modules: ['flood', 'agriculture', 'coast'],
    secap_2050_focus: 'Dalaman ve Tersakan Çayı taşkın riski, ekstrem yağışlar ve tarımsal drenaj',
    verified_satellite_coverage_pct: 93.5,
    indicators: {
      winter_event_flood_mask_ha: 684.5,
      max_72h_precip_mm: 148.0,
      low_slope_susceptible_ha: 4820.0
    },
    monitoring_gaps: [
      'Copernicus DEM (30m DSM) yerine taşkın hidrolik modeli için yüksek çözünürlüklü LiDAR/İHA DTM ve kanal kesit verisi'
    ],
    recommended_action_tr: 'Alçak kotlu tarım arazilerinde DSİ ve MUSKİ drenaj kanalı kapasite ve saha su izi doğrulaması.'
  },
  {
    district_id: 'dist_yatagan',
    district_name: 'Yatağan',
    priority_rank: 8,
    priority_tier: 'P1 - Madencilik/Enerji Arazi Dönüşümü ve Orman İzleme',
    primary_modules: ['industry', 'fire', 'agriculture'],
    secap_2050_focus: 'Açık ocak sahaları rehabilitasyonu, arazi örtüsü dönüşümü ve ısı/kuraklık stresi',
    verified_satellite_coverage_pct: 93.8,
    indicators: {
      bare_surface_bsi_expansion_2021_2026_ha: +312.4,
      reclaimed_green_cover_ha: +118.2
    },
    monitoring_gaps: [
      'MAPEG ve ÇŞİDB doğaya yeniden kazandırma (rehabilitasyon) proje poligonlarının CBS entegrasyonu'
    ],
    recommended_action_tr: 'Açık ocak çevresi rehabilitasyon parsellerinde çok yıllı NDVI/BSI gelişiminin saha denetimiyle eşleştirilmesi.'
  },
  {
    district_id: 'dist_fethiye',
    district_name: 'Fethiye',
    priority_rank: 9,
    priority_tier: 'P1 - Kıyı, Kentsel Büyüme ve Körfez Sığlaşma İzleme',
    primary_modules: ['coast', 'urban', 'water', 'deformation'],
    secap_2050_focus: 'Fethiye Körfezi sedimentasyon/sığlaşma, Çalış kıyı çizgisi ve kentsel yayılma',
    verified_satellite_coverage_pct: 92.9,
    indicators: {
      builtup_expansion_2021_2026_ha: +284.0,
      calis_shoreline_seasonal_oscillation_m: -3.5
    },
    monitoring_gaps: [
      'Fethiye Körfezi içi bulanıklık (turbidity) ve batimetri saha ölçümlerinin optik su indeksleriyle kalibrasyonu'
    ],
    recommended_action_tr: 'Körfez içi sediment girişi ve Çalış kıyı kordonu için kıyı mühendisliği saha izlemesi.'
  },
  {
    district_id: 'dist_mentese',
    district_name: 'Menteşe',
    priority_rank: 10,
    priority_tier: 'P2 - Kentsel Gelişim, Karstik Polye Taşkını ve Orman İzleme',
    primary_modules: ['urban', 'flood', 'fire', 'agriculture'],
    secap_2050_focus: 'Muğla Polyesi kış su birikimi, kentsel gelişim ve çevre orman yangını korunumu',
    verified_satellite_coverage_pct: 94.1,
    indicators: {
      builtup_expansion_2021_2026_ha: +192.0,
      karstic_polje_winter_ponding_ha: 340.0
    },
    monitoring_gaps: [
      'Karstik düden deşarj kapasitesi ve MUSKİ yağmur suyu şebeke model verisi'
    ],
    recommended_action_tr: 'Düğerek ve Kötekli gelişim akslarında geçirimsiz yüzey ve yağmur suyu drenaj incelemesi.'
  },
  {
    district_id: 'dist_datca',
    district_name: 'Datça',
    priority_rank: 11,
    priority_tier: 'P2 - Kıyı Ekosistemi, Kuraklık ve Yangın Korunumu',
    primary_modules: ['coast', 'fire', 'agriculture'],
    secap_2050_focus: 'Yarımada su kısıtı, badem/zeytin kuraklık etkisi ve kıyı kumul korunumu',
    verified_satellite_coverage_pct: 95.0,
    indicators: {
      summer_ndmi_moisture_anomaly_pct: -11.2,
      coastal_water_clarity_index: 0.88
    },
    monitoring_gaps: [
      'Dar koylarda 10m optik çözünürlüğü tamamlayacak İHA ortofoto kıyı serisi'
    ],
    recommended_action_tr: 'Tarımsal kuraklık stresi ve yangın emniyet şeritleri için mevsim öncesi NDMI takibi.'
  },
  {
    district_id: 'dist_ula',
    district_name: 'Ula',
    priority_rank: 12,
    priority_tier: 'P2 - Akyaka/Gökova Sulak Alanı, Orman ve Tarım İzleme',
    primary_modules: ['water', 'fire', 'coast', 'agriculture'],
    secap_2050_focus: 'Kadın Azmağı ve Gökova Özel Çevre Koruma Bölgesi kıyı-sulak alan dengesi',
    verified_satellite_coverage_pct: 94.4,
    indicators: {
      gokova_wetland_ndwi_stability: 0.405,
      post_2021_forest_recovery_pct: 72.4
    },
    monitoring_gaps: [
      'Azmak su sıcaklığı ve debi sensör verisinin uydu serisiyle entegrasyonu'
    ],
    recommended_action_tr: 'Gökova kıyı sulak alanı ve yangın sonrası gençleştirme sahalarında periyodik izleme.'
  },
  {
    district_id: 'dist_kavaklidere',
    district_name: 'Kavaklıdere',
    priority_rank: 13,
    priority_tier: 'P2 - Orman Ekosistemi ve Mermer/Maden Yüzey İzleme',
    primary_modules: ['fire', 'industry', 'deformation'],
    secap_2050_focus: 'Yüksek rakım orman ekosistemi ve taş/mermer ocakları yüzey rehabilitasyonu',
    verified_satellite_coverage_pct: 91.2,
    indicators: {
      quarry_bare_rock_change_2021_2026_ha: +68.5,
      forest_canopy_ndvi_mean: 0.612
    },
    monitoring_gaps: [
      'Kış kar örtüsü ve bulutluluk nedeniyle Aralık-Mart optik veri boşlukları'
    ],
    recommended_action_tr: 'Ocak sahaları çevresinde orman sınırı ve rehabilitasyon takibi.'
  }
];

export function getStrategicSummary() {
  return {
    generated_at: '2026-11-14T15:35:00+03:00',
    total_districts: MUGLA_STRATEGIC_DISTRICT_MATRIX.length,
    secap_alignment: 'Muğla Büyükşehir Belediyesi 2025–2050 SECAP İklim Kırılganlık ve Uyum Eylem Planı',
    top_priority_districts: MUGLA_STRATEGIC_DISTRICT_MATRIX.slice(0, 5).map((d) => ({
      district_name: d.district_name,
      priority_tier: d.priority_tier,
      recommended_action_tr: d.recommended_action_tr
    })),
    districts: MUGLA_STRATEGIC_DISTRICT_MATRIX
  };
}
