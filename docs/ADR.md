# Muğla GeoInsight — Mimari ve Bilimsel Karar Kayıtları (ADR v0.2)

Bu belge, `MGI-PRD-001` (Bölüm 14: Açık Kararlar), `MGI-TDD-001` (Bölüm 17: Açık Teknik Kararlar) ve `Mugla_GeoInsight_Data_Availability_Matrix.xlsx` (Doğrulama Planı İş Paketi #12) kapsamında açık bırakılan ürün, veri ve mimari kararları kesinleştirir.

---

## ADR-001: Ortak Koordinat Referans Sistemi (CRS) ve Referans Izgara Stratejisi
- **Durum:** Onaylandı (14.11.2026 — Sürüm 0.2)
- **Bağlam:** Muğla ili `27.21°D – 29.78°D` boylamları ve `36.32°K – 37.54°K` enlemleri arasında yer almakta olup tamamıyla **UTM Zone 35N** dilimi içindedir. Farklı sensörlerin (Sentinel-2 MGRS karoları, Sentinel-1 GRD/SLC, Landsat WRS-2, NISAR GCOV ve ERA5/GPM iklim ızgaraları) alan hesabı ve piksel çakıştırmasında projeksiyon kaynaklı alan bozulmalarını önlemek gerekir.
- **Karar:**
  1. **Vektör Depolama ve API Sözleşmesi (`Storage & GeoJSON CRS`):** `EPSG:4326` (WGS 84 coğrafi koordinatlar).
  2. **Metrik Alan Hesabı ve Raster Analiz Izgarası (`Analysis CRS`):** `EPSG:32635` (WGS 84 / UTM Zone 35N). Tüm hektar (`ha`) ve kilometrekare (`km²`) metrikleri `EPSG:32635` düzleminde hesaplanır.
  3. **Web Harita Gösterimi (`Display Tile CRS`):** `EPSG:3857` (Web Mercator).
  4. **Standart Muğla Sentinel-2 MGRS Karoları:** `35SLA` (Marmaris–Bördübet–Datça), `35SLB` (Bodrum–Milas), `35SMA` (Ula–Köyceğiz batısı), `35SMB` (Menteşe–Yatağan), `35SNA` (Köyceğiz–Dalyan–Ortaca–Dalaman–Fethiye), `35SNB` (Seydikemer–Kavaklıdere).

---

## ADR-002: Pilot AOI Sınırlarının Sürümlenmiş GeoJSON Standardı
- **Durum:** Onaylandı (14.11.2026 — Sürüm 0.2)
- **Karar:** Pilot analiz alanları `data/aoi/` altında sürümlenmiş GeoJSON (`v1.0.0`) olarak sabitlenmiştir:
  1. **Pilot 1 — Köyceğiz–Dalyan Su ve Sulak Alan (`aoi_dalyan_wetland`):** `25.951,3 ha` ana poligon + Dalyan Sazlık Çekirdek Zon (`4.303,2 ha`) + Sülüngür Lagün Gölü (`1.095,8 ha`).
  2. **Pilot 2 — Marmaris–Bördübet Orman Yangını ve Ekosistem (`aoi_bordubet_fire`):** `28.285,1 ha` ana poligon + Haziran 2022 Bördübet Yangın Çekirdeği (`7.832,5 ha`) + Bördübet Batı Yanmamış Kontrol Parseli (`1.273,4 ha`).
  3. **Diğer 6 Modül Pilot AOI'leri:** Seydikemer Heyelan (`aoi_seydikemer_landslide`), İztuzu Kıyı (`aoi_iztuzu_coast`), Milas Tarım (`aoi_milas_agriculture`), Dalaman Taşkın (`aoi_dalaman_flood`), Yatağan Maden/Enerji (`aoi_yatagan_mining`), Bodrum Kentsel Yayılma (`aoi_bodrum_urban`).

---

## ADR-003: İlk İki MVP Analiz Motorunun Bilimsel Parametreleri ve Kalite Kapıları (QC Gates)
- **Durum:** Onaylandı (14.11.2026 — Sürüm 0.2)
- **Karar:**
  1. **Su ve Sulak Alan Motoru (`water_engine`):**
     - **Optik İndeks:** Sentinel-2 L2A `MNDWI = (B03 - B11) / (B03 + B11)` ve `NDWI = (B03 - B08) / (B03 + B08)`. Açık su eşiği `MNDWI >= 0.18`.
     - **Radar Doğrulama:** Sentinel-1 IW GRD (`Track 29 Ascending`, `VV+VH`), radyometrik arazi düzeltmeli $\gamma^0$, açık su eşiği `VV <= -16.8 dB`.
     - **Zorunlu QC Koşulu:** Karşılaştırılan optik görüntülerde AOI içi bulut oranı `<= %15`, mevsimsel gün farkı `<= 25 gün`, geçerli piksel oranı `>= 0.90`. Bulut oranı `>%25` olan kış sahneleri (ör. `15.01.2026`, `%68,4` bulut) optik trendden otomatik elenir ve yalnızca SAR su maskesiyle raporlanır.
  2. **Orman Yangını ve Ekosistem Motoru (`fire_engine`):**
     - **Optik Yanma Şiddeti:** `NBR = (B08 - B12) / (B08 + B12)` ve `dNBR = NBR_öncesi - NBR_sonrası`. USGS eşikleri: Düşük (`0.10–0.27`), Orta-Düşük (`0.27–0.44`), Orta-Yüksek (`0.44–0.66`), Yüksek (`>= 0.66`).
     - **Toparlanma Kontrolü:** Yanmış alan içindeki `NDVI` serisi, aynı tarihteki **Yanmamış Kontrol Parseli (`aoi_bordubet_unburned_control`)** ile normalize edilerek mevsimsel kuraklık etkisi yangın sonrası toparlanmadan ayrıştırılır.
     - **Sensör Ayrımı Kuralı:** NASA FIRMS VIIRS 375m sıcak noktaları yalnızca olay zaman çizelgesi için kullanılır; yanmış alan poligonu olarak sunulmaz. Sentinel-1 VH/VV radar değişimi optik dNBR ile tek bir uydurma metrikte birleştirilmez.

---

## ADR-004: NISAR, İklim Izgaraları ve Faz-2 Modüllerinin Sınır Kuralları
- **Durum:** Onaylandı (14.11.2026 — Sürüm 0.2)
- **Karar:**
  1. **NISAR Zaman Sınırı:** NASA-ISRO NISAR `VALIDATED L0–L2` ürünleri `06.11.2026` tarihinde yayımlanmış olup yalnızca `21.10.2026` ve sonrası gözlemleri kapsar. `2018–2025` tarihsel analizlerinde NISAR kullanılamaz; sistem bu yöndeki sorgularda otomatik uyarı (`NISAR Zaman Kapsamı Guardrail`) üretir.
  2. **Çözünürlük Ayrımı (Tarım & Taşkın):** `SMAP (9 km)`, `ERA5-Land (~9 km)` ve `GPM IMERG (~10 km)` ürünleri 10m Sentinel-2 parsel ölçümleriyle aynı ölçekteymiş gibi gösterilmez; yalnızca bölgesel meteorolojik bağlam olarak etiketlenir.
  3. **Faz-2 Kalite Kapısı (`insufficient_data`):** Zemin hareketleri (`deformation`) modülünde `GRD` verisiyle interferometri yapılması teknik olarak engellenmiştir (`QC_BLOCK_GRD_CANNOT_RUN_INSAR`). SLC/GUNW coherence ve saha GNSS verisi veya kurumsal izin katmanları (MTA, MAPEG, Muğla BB CBS, TUCBS) doğrulanmadan sahte metrik üretilmez.

---

## ADR-005: Kullanıcı Gizliliği, RBAC ve Koordinat Maskeleme
- **Durum:** Onaylandı (14.11.2026 — Sürüm 0.2)
- **Karar:**
  - Kullanıcı tarafından harita üzerinde çizilen özel AOI poligonları varsayılan olarak `visibility: "private"` olarak kaydedilir.
  - Rapor üretiminde (`POST /api/v1/reports`) `mask_coordinates: true` seçeneği ile paylaşılan raporlarda parsel/yatırım alanı köşe koordinatları gizlenerek yalnızca ilçe/havza düzeyinde çıktı üretilir.
