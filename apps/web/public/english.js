export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const UI = {
  welcome: 'Hi! Ask about the selected area, compare imagery dates, or explore an environmental topic.',
  thinking: 'Preparing a response…',
  requestFailed: 'The GeoAI request could not be processed.',
  invalidReply: 'GeoAI returned an invalid response.',
  timedOut: 'GeoAI took too long to respond. Your message is ready to retry.',
  retry: 'Unable to retrieve a response.',
  drawnArea: 'Drawn study area',
  verified: 'Verified event',
  expandMap: 'Expand Map',
  restoreLayout: 'Restore Panel Layout'
};

export const MODULE_COPY = {
  water_wetland: ['Water & Wetlands', 'Surface water and wetland hydrology', 'Compare water extent and wetland conditions across matched seasons. Validate shoreline changes in the field.'],
  wildfire_ecosystem: ['Wildfire & Ecosystem', 'Burn severity (dNBR) and vegetation recovery', 'Monitor vegetation recovery and verify erosion risk on steep, severely burned slopes in the field.'],
  ground_deformation_landslide: ['Ground Deformation & Landslides', 'Sentinel-1 InSAR line-of-sight displacement', 'Verify preliminary line-of-sight displacement with GNSS and field measurements.'],
  coastal_change: ['Coastal Change', 'Shoreline position and lagoon sedimentation', 'Check shoreline changes against tide, wave conditions and field surveys.'],
  agriculture_vegetation: ['Agriculture & Vegetation', 'NDVI and ERA5 drought indicators', 'Use field observations to verify vegetation stress and inform irrigation planning.'],
  flood_inundation: ['Flood Risk', 'Flood susceptibility and SAR water detection', 'Confirm susceptibility in the field and check drainage, rainfall and local topography.'],
  mining_land_conversion: ['Mining & Land-Use Change', 'Surface excavation and rehabilitation', 'Verify excavation and rehabilitation in the field and check the applicable site records.'],
  urban_sprawl_hermitage: ['Urbanization Pressure', 'Impervious surfaces and coastal development', 'Check detected land-cover changes against municipal planning and protected-area records.']
};

export const EVENT_NAMES = {
  fire_marmaris_icmeler_2021: 'Marmaris — Armutalan, İçmeler, Turunç & Hisarönü Wildfire',
  fire_bordubet_2022: 'Marmaris — Bördübet Wildfire',
  fire_milas_cokertme_2021: 'Milas — Çökertme Wildfire',
  fire_koycegiz_agla_2021: 'Köyceğiz — Ağla Wildfire',
  fire_kavaklidere_mentese_2021: 'Kavaklıdere–Menteşe Wildfire',
  fire_datca_mesudiye_2022: 'Datça — Mesudiye Wildfire',
  water_dalyan_sulungur: 'Dalyan — Sülüngür Lake',
  water_mumcular_baraji: 'Mumcular Reservoir',
  water_geyik_baraji: 'Geyik Reservoir',
  water_bafa_golu: 'Lake Bafa',
  mine_ikizkoy_akbelen: 'İkizköy — Akbelen Mining Area',
  mine_yatagan_eskihisar: 'Yatağan — Eskihisar Mining Area',
  mine_milas_husamlar: 'Milas — Hüsamlar Mining Area',
  mine_kavaklidere_mermer: 'Kavaklıdere Marble Quarries',
  flood_dalaman_tersakan: 'Dalaman — Tersakan Flood Susceptibility Corridor',
  flood_esen_ovasi: 'Eşen Plain Flood Susceptibility Corridor',
  flood_milas_saricay: 'Milas — Sarıçay Flood Susceptibility Corridor',
  def_yatagan_pasa: 'Yatağan — Mine Waste Slopes',
  def_seydikemer_esen: 'Seydikemer — Eşen Slopes',
  def_sakar_gokova: 'Gökova — Sakar Pass',
  coast_iztuzu_dalyan: 'İztuzu–Dalyan Shoreline',
  coast_oludeniz_kumburnu: 'Ölüdeniz — Kumburnu Shoreline',
  coast_fethiye_calis: 'Fethiye — Çalış Shoreline',
  agri_milas_selimiye: 'Milas — Selimiye Agricultural Area',
  agri_seydikemer_kumluova: 'Seydikemer — Kumluova Agricultural Area',
  agri_ortaca_dalaman: 'Ortaca–Dalaman Agricultural Area',
  urban_bodrum_yalikavak: 'Bodrum — Yalıkavak Urban Growth',
  urban_fethiye_ovacik: 'Fethiye — Ovacık Urban Growth',
  urban_mentese_kotekli: 'Menteşe — Kötekli Urban Growth'
};

export const VERIFICATION = {
  VERIFIED_EVENT: 'Verified event',
  VERIFIED_EVENT_PERIMETER: 'Verified event perimeter',
  HAZARD_SUSCEPTIBILITY_CORRIDOR: 'Susceptibility corridor',
  SUSCEPTIBILITY_CORRIDOR: 'Susceptibility corridor',
  UNVERIFIED_CUSTOM_AREA: 'Custom area · no verified event'
};

const PHRASES = {
  'Doğrulanmış Poligon Alanı': 'Verified Polygon Area', 'Seçili İnceleme Alanı': 'Selected Study Area',
  'Karşılaştırılan Dönem': 'Comparison Period', 'Birincil Sensör & Yöntem': 'Primary Sensor & Method',
  'Bölgesel STAC Uydu Arşivi': 'Regional STAC Imagery Archive',
  'Doğrulanmış Yanma Alanı': 'Verified Burned Area', 'Yanma Şiddeti': 'Burn Severity',
  'NDVI Değişimi': 'NDVI Change', 'Termal Odak': 'Thermal Anomaly', 'Termal Anomali': 'Thermal Anomaly',
  'Aktif Termal': 'Active Thermal', 'Toparlanma': 'Recovery', 'Yüksek Şiddet': 'High Severity',
  'Yüksek:': 'High:', 'Hektar': 'ha', ' Yıl': ' years', ' Sahne': ' scenes', 'Optik': 'Optical',
  'Doğrulanmış Açık Su Değişimi': 'Verified Open-Water Change',
  'Sentinel-2 MNDWI Ortalaması': 'Mean Sentinel-2 MNDWI',
  'Geri Saçılım': 'Backscatter', 'Su/Sazlık Sınırı': 'Water–Reed Margin', 'Durgun Su Maskesi': 'Still-Water Mask',
  'Doğrulanmış Dekapaj Genişlemesi': 'Verified Excavation Expansion', 'BSI Çıplak Toprak İndeksi': 'Bare Soil Index (BSI)',
  'Pasa Şev Oturma Eğilimi': 'Mine Waste Slope Settlement Trend', 'Açık Kazı Yüzeyi': 'Exposed Excavation Surface',
  'Rehabilitasyon Oranı': 'Rehabilitation Rate', 'İzleme Alanı': 'Monitoring Area',
  'Taşkın Duyarlılık Koridoru': 'Flood Susceptibility Corridor', 'Kış Geçici Su Birikim İzi': 'Winter Temporary Ponding Footprint',
  'Pik Yağış': 'Peak Rainfall', 'DEM < %2 Eğim': 'DEM slope < 2%', ' saat': ' hours',
  'Doğrulama Durumu': 'Verification Status', 'Duyarlılık Koridoru': 'Susceptibility Corridor', 'Ön Bulgu': 'Preliminary Finding',
  'LOS Deformasyon Eğilimi': 'LOS Deformation Trend', 'Ortalama InSAR Koherans': 'Mean InSAR Coherence',
  'Ortalama Yamaç Eğimi': 'Mean Slope Gradient', 'C-Bant': 'C-band', 'Saha GNSS/İnklinometre Gerekli': 'Field GNSS or Inclinometer Data Required',
  'Net Kıyı Çizgisi Değişimi': 'Net Shoreline Change', 'Kıyı Su Bulanıklığı': 'Coastal Water Turbidity',
  'Kara/Su Kontrastı': 'Land–Water Contrast', 'Önerilen Altlık Çözünürlüğü': 'Suggested Basemap Resolution', 'İHA Ortofoto': 'UAV Orthophoto',
  'Ortalama Kanopi NDVI': 'Mean Canopy NDVI', 'NDMI Kanopi Nem Değişimi': 'Canopy Moisture Change (NDMI)', 'Yaz Kuraklık Stresi': 'Summer Drought Stress',
  'Toprak Nemi': 'Soil Moisture', 'Buharlaşma': 'Evaporation',
  'Geçirimsiz Yüzey Artışı': 'Impervious Surface Increase', 'Ortalama NDBI Yapı İndeksi': 'Mean Built-up Index (NDBI)',
  'En Yüksek Görsel Doğrulama': 'Highest-Resolution Visual Check', 'Planlama & Sit Durumu': 'Planning & Protected-Area Status',
  'Tampon Kuşak Denetimi Gerekli': 'Check the Buffer Zone', 'Analiz Doğrulama Durumu': 'Analysis Verification Status',
  'Özel Alan (Ham Bant İşlenmedi)': 'Custom area (raw bands not processed)',
  'Maks. Sıcaklık': 'Maximum Temperature', 'Yıllık Yağış': 'Annual Rainfall', 'Yağış': 'Rainfall',
  'Kümülatif Dekapaj': 'Cumulative Excavation', 'Kümülatif LOS Eğilimi': 'Cumulative LOS Trend',
  'Kıyı Çizgisi': 'Shoreline', 'Geçirimsiz Yüzey': 'Impervious Surface', 'Yangın Yılı': 'Fire Year',
  'Veri Kaynağı': 'Data source', 'Yanma İzi': 'Burn Scar', 'Hidroklimatoloji': 'Hydroclimatology',
  'Jeolojik Duyarlılık': 'Geological Susceptibility', 'Akdeniz Dalga Modeli': 'Mediterranean Wave Model',
  'Alüvyal Koridor': 'Alluvial Corridor', 'Yüksek Çözünürlüklü Tarihsel Mozaik': 'High-Resolution Historical Mosaic',
  'Kare:': 'Tile:', ' öncesi': ' before', ' sonrası': ' after', 'Erişim:': 'Accessed:',
  'Zarflama Alanı': 'Perimeter Area', 'Yanmış Orman Alanı': 'Burned Forest Area', 'Yanmış Orman': 'Burned Forest',
  ' civarında': ' vicinity', ' Çevresinde': ' vicinity', ' çevresinde çizilen alan': ' drawn study area',
  ' çevresindeki seçili nokta': ' selected point', ' Çevresi': ' vicinity',
  'Ocak': 'January', 'Şubat': 'February', 'Mart': 'March', 'Nisan': 'April', 'Mayıs': 'May', 'Haziran': 'June',
  'Temmuz': 'July', 'Ağustos': 'August', 'Eylül': 'September', 'Ekim': 'October', 'Kasım': 'November', 'Aralık': 'December',
  'mm/yıl': 'mm/year',
  'NBR_öncesi': 'NBR_before', 'NBR_sonrası': 'NBR_after', 'Muğla OBM Kayıtları': 'Muğla Regional Forestry Records',
  'Zeytinlik Kuşağı': 'Olive-Grove Belt', 'Yanmış Dağlık Orman': 'Burned Mountain Forest',
  'Yaz Açık Su Daralması': 'Summer Open-Water Contraction', 'az bulutlu sahne': 'low-cloud scenes', ' granül': ' granules',
  'Göl Aynası Daralması': 'Water Surface Contraction', 'Kıyı İzi': 'Shoreline Footprint', 'Havza Bağlamı': 'Catchment Context',
  'Rezervuar Göl Yüzeyi Daralması': 'Reservoir Surface Contraction', 'Doğu Sığlık Su Daralması': 'Eastern Shallows Water Loss', 'Alg/Klorofil Artışı': 'Algae and Chlorophyll Increase',
  'Açık Ocak': 'Open-Pit Mine', 'Çıplak Toprak Artışı': 'Bare Soil Increase', 'Dekapaj/Pasa Değişimi': 'Excavation and Waste Change',
  'Mermer Aynası & Pasa Genişlemesi': 'Marble Face and Waste Expansion', 'Su İzi': 'Water Footprint', 'Kış Pik': 'Winter Peak',
  'Düşüşü': 'Decrease', 'Topoğrafik Islaklık İndeksi': 'Topographic Wetness Index', 'Taşkın Koridoru': 'Flood Corridor', 'Kış Su Birikimi': 'Winter Ponding',
  'Oturma Eğilimi': 'Settlement Trend', 'Koherans': 'Coherence', 'Faz Farkı': 'Phase Difference', 'Yamaç Eğim Duyarlılığı': 'Slope Susceptibility',
  'Yamaç LOS Eğilimi': 'Slope LOS Trend', 'Eğim': 'Slope', 'örnek granules': 'sample granules', 'örnek granül': 'sample granules',
  'Kaya Düşmesi & Şev Duyarlılığı': 'Rockfall and Slope Susceptibility', 'Yüksek': 'High',
  'Yüksek Çözünürlüklü Kıyı Arşivi': 'High-Resolution Coastal Archive', 'Dinamik Boğaz Kum Dili': 'Dynamic Inlet Sand Spit',
  'İzleme': 'Monitoring', 'Su/Kara Sınırı': 'Land–Water Boundary', 'Gelgit/Dalga': 'Tide/Wave', 'Filtreli': 'Filtered', ' Farkı': ' Difference',
  'Kıyı Dinamiği': 'Coastal Dynamics', 'Bulanıklık': 'Turbidity', 'Kumsal Daralma Eğilimi': 'Beach Contraction Trend',
  'gerçek iklim serisi': 'climate series', 'Örtü Altı Sera Yoğunlaşması': 'Greenhouse Intensification', 'Çift-Pol': 'Dual-Pol',
  'Çift Sıçrama (Double-Bounce) Yapı İndeksi': 'Double-Bounce Built-up Index', 'Yapılaşma Yoğunlaşması': 'Built-up Intensification',
  'Tampon': 'Buffer', ' Alanı': ' Area', 'NDVI Fark Analizi': 'NDVI Difference Analysis', ' Ölçüm': ' Measurement',
  'Doğrulanmamış Özel İnceleme Alanı': 'Unverified Custom Study Area', 'Doğrulanmış': 'Verified',
  'Kaymakamlığı': 'District Governorate', ' Mahallesi': ' Neighborhood', ' Köyü': ' Village',
  'Havza': 'Catchment', 'Su Birikimi': 'Ponding'
};

const phrasePattern = new RegExp(Object.keys(PHRASES).sort((a, b) => b.length - a.length)
  .map((phrase) => phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'gu');

export function englishLabel(value) {
  return String(value ?? '').replace(phrasePattern, (phrase) => PHRASES[phrase]);
}

export function englishPlace(name, eventId) {
  return EVENT_NAMES[eventId] || englishLabel(name);
}

export function eventKind(module, verified) {
  if (!verified) return 'Custom study area';
  if (module === 'wildfire_ecosystem') return 'Wildfire burn perimeter';
  if (module === 'flood_inundation') return 'Flood susceptibility corridor';
  return MODULE_COPY[module]?.[0] || 'Reference event';
}

export const AOI_ERROR = {
  'Çizimi EPSG:4326 boylam/enlem sıralı tek halkalı GeoJSON poligonu olarak gönderin.': 'Use a single-ring GeoJSON polygon in EPSG:4326 with longitude, latitude coordinates.',
  'Poligon 3–500 geçerli köşe içermeli ve Muğla analiz bölgesinin UTM 35N koordinat aralığında olmalı.': 'The polygon must have 3–500 valid vertices within the Muğla analysis region (UTM 35N).',
  'Poligon kapalı olmalı ve ardışık köşeler birbirinden farklı olmalı.': 'The polygon must be closed and consecutive vertices must be distinct. Redraw the area and try again.',
  'Poligon kenarları kendi içinde kesişiyor.': 'The polygon crosses itself. Redraw it without intersecting edges.',
  'Çizilen poligonun yüzölçümü en az 1 m² olmalı.': 'The polygon must cover at least 1 m².',
  'Harita dönemi için 2018–2026 arasında iki yıl ve geçerli bir ay seçin.': 'Choose two years from 2018–2026 and a valid comparison month.'
};

export function evidenceLimit(module, status) {
  if (status === 'UNVERIFIED_CUSTOM_AREA') return 'The selected area has no verified event or processed pixel-level measurement. Regional climate and catalog context do not establish local change.';
  if (module === 'wildfire_ecosystem') return 'Satellite evidence can identify burn extent and severity. It does not establish the ignition cause. Terrain shadows and sensor resolution affect the perimeter.';
  if (module === 'flood_inundation') return 'Susceptibility corridors and seasonal ponding are indicators. They do not establish the boundary or depth of a specific flood.';
  if (module === 'ground_deformation_landslide') return 'InSAR measures line-of-sight displacement. Confirm preliminary findings with field data before drawing conclusions about slope stability.';
  if (module === 'coastal_change') return 'Wave conditions, tides and image resolution can affect the apparent shoreline position.';
  return 'Consider sensor resolution, observation dates and local conditions when interpreting these indicators. Field validation may be needed.';
}

export function viewportFindings(data) {
  const provenance = data.provenance;
  const limit = evidenceLimit(data.module_code, provenance?.verification_status);
  if (!provenance?.event_id) return limit;
  const name = englishPlace(data.area.name, provenance.event_id);
  const primary = data.row2_metrics?.[0];
  const finding = primary ? ` ${englishLabel(primary.label)}: ${englishLabel(primary.value)}.` : '';
  return `${name} (${provenance.start_date} to ${provenance.end_date}).${finding} ${limit}`;
}
