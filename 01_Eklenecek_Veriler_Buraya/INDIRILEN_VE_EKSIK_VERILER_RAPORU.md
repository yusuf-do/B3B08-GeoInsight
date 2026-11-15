# 📊 Muğla GeoInsight — İndirilen Gerçek Veriler ve Temin Edilemeyen (Eksik) Veriler Raporu

Bu rapor, açık erişimli uluslararası bilimsel kataloglardan **otomatik olarak bulunup indirilen gerçek verileri** ve **kimlik doğrulaması / kurum izni / saha ölçümü gerektirdiği için dışarıdan otomatik indirilemeyen verileri** (ve bunları nasıl temin edebileceğinizi) listeler.

---

## ✅ BÖLÜM 1: Otomatik Bulunup İndirilen ve Sisteme İşlenen Gerçek Veriler

Aşağıdaki veri setleri doğrudan canlı API'lerden sorgulanarak projeye indirilmiş ve `VERI_SABLONU_SLOTLAR.json` ile analiz sözleşmelerine bağlanmıştır:

1. **Sentinel-2 L2A Optik Uydu Arşivi ve Bulutsuz Sahne Eşleşmeleri (Element84 Earth Search STAC & AWS S3 COG):**
   - **Dosya:** `01_Eklenecek_Veriler_Buraya/uydu_katalog_listeleri/gercek_indirilen_uydu_katalogu.json`
   - **Muğla Geneli (2017–2026):** **15.322 gerçek L2A sahnesi** doğrulandı.
   - **Pilot 1 (Köyceğiz–Dalyan, Bulut $\le \%15$, 2021–2026):** **666 gerçek L2A sahnesi** ve doğrudan S3 Cloud-Optimized GeoTIFF (`TCI.tif`, `B08.tif`, `B11.tif`) bağlantıları indirildi.
   - **Pilot 2 (Marmaris–Bördübet, Bulut $\le \%15$, 2021–2026):** **1.181 gerçek L2A sahnesi** (Temmuz 2021 yangın öncesi, Ağustos 2021 yangın sonrası ve 2025/2026 toparlanma sahneleri dahil) indirildi.

2. **Landsat 8–9 Collection 2 Level-2 Arşivi (USGS / Element84 STAC):**
   - **Köyceğiz–Dalyan (`WRS-2 Path 179 Row 034/035` & `180/034`):** **1.099 sahne** (`LC09_L2SP_179035_...`, `LC08_L2SP_180034_...`).
   - **Marmaris–Bördübet:** **1.466 sahne** doğrulandı ve örnek granül kimlikleri kaydedildi.

3. **Sentinel-1A/B C-Bant SAR (`GRD` ve `SLC`) Arşivi (NASA CMR / ASF DataPool):**
   - **Köyceğiz–Dalyan (`SENTINEL-1A_DP_GRD_HIGH`):** Gerçek `S1A_IW_GRDH_1SDV_*` granül kimlikleri, yörünge numaraları (`Orbit 19978, 20080...`) ve ASF indirme adresleri (`https://datapool.asf.alaska.edu/GRD_HD/SA/...`) indirildi.
   - **Seydikemer Heyelan & Deformasyon (`SENTINEL-1A_SLC`):** Faz-2 InSAR analizleri için gerekli tek bakışlı kompleks (`S1A_IW_SLC__1SDV_*`) granül listesi ve toplam arşiv sayımı indirildi.

4. **MODIS Aktif Yangın / Termal Anomali Verisi (`MOD14A1` v061 — NASA LPCLOUD):**
   - **Marmaris–Bördübet Yangını (28 Temmuz – 4 Ağustos 2021):** Yangın haftasına ait gerçek **`MOD14A1.A2021209.h20v05.061.2021218012936`** (`G2598299580-LPCLOUD`) granülü ve Muğla geneli toplam MODIS termal granül sayısı indirildi.

5. **ECMWF ERA5-Land Gerçek İklim, Yağış, Evapotranspirasyon (`ET0`) ve Yüzey Toprak Nemi Zaman Serisi (2021–2025):**
   - **Dosya:** `01_Eklenecek_Veriler_Buraya/modul_analiz_sonuclari/gercek_era5_iklim_ve_toprak_nemi_2021_2025.json`
   - **Köyceğiz–Dalyan, Marmaris–Bördübet ve Milas** koordinatları için 2021–2025 dönemi günlük verilerden hesaplanan gerçek yıllık yağış toplamları (`mm`), referans buharlaşma (`ET0 mm`), maksimum sıcaklık ortalamaları (`°C`), 0–7 cm toprak nemi (`m³/m³`) ve en şiddetli günlük yağış tarihi (`27.11.2021 — 128,8 mm`) indirildi.

6. **GPM IMERG Günlük Yağış & NASA SMAP Toprak Nemi Arşiv Sayımları (NASA CMR):**
   - Muğla sınır kutusu için `GPM_3IMERGDF` ve `SPL3SMP_E` gerçek granül sayımları doğrulandı.

7. **OpenStreetMap Gerçek İdari Sınır Poligonları (`GeoJSON`):**
   - **Dosya:** `01_Eklenecek_Veriler_Buraya/aoi_poligonlari/gercek_osm_mugla_ve_pilot_ilceler.geojson`
   - Muğla il sınırı ve pilot ilçelerin (Köyceğiz, Ortaca, Marmaris, Milas, Dalaman, Seydikemer) gerçek OpenStreetMap çokgen geometrileri indirildi.

---

## ⚠️ BÖLÜM 2: Dışarıdan Otomatik İndirilemeyen Veriler ve Nasıl Temin Edileceği

Aşağıdaki veriler **kişisel API anahtarı**, **kurumsal resmi protokol** veya **yüksek hacimli (GB düzeyinde) ham GeoTIFF piksel kesimi** gerektirdiği için açık API'lerden doğrudan çekilememiştir ve `VERI_SABLONU_SLOTLAR.json` içinde bilerek `null` bırakılmıştır:

### 1. NASA Earthdata Login / Kişisel API Anahtarı Gerektiren Veriler (Ücretsiz Kayıtla Siz İndirebilirsiniz)
| Eksik Veri | Neden Otomatik İndirilemedi? | Nasıl Temin Edebilirsiniz? | İndirince Nereye Koymalısınız? |
| :--- | :--- | :--- | :--- |
| **NASA FIRMS VIIRS 375m Noktasal Yangın CSV Tablosu** | NASA FIRMS API noktasal CSV indirmek için kişisel `MAP_KEY` zorunluluğu uygular. | 1. [firms.modaps.eosdis.nasa.gov/api/map_key](https://firms.modaps.eosdis.nasa.gov/api/map_key/) adresinden ücretsiz e-posta ile `MAP_KEY` alın veya [FIRMS Archive Download](https://firms.modaps.eosdis.nasa.gov/download/) sayfasından Muğla poligonunu seçip 2021–2026 VIIRS CSV dosyasını indirin. | `01_Eklenecek_Veriler_Buraya/uydu_katalog_listeleri/` |
| **NISAR L-Bant (`L2_GCOV`, `L2_GUNW`) Ham HDF5 Granülleri** | ASF Vertex üzerinde NISAR L2 dosyalarını indirmek için kişisel **NASA Earthdata Login** Bearer Token gereklidir. | [search.asf.alaska.edu](https://search.asf.alaska.edu/) adresine ücretsiz NASA Earthdata hesabınızla giriş yapıp Dataset = `NISAR` ve Muğla poligonunu seçerek meta veri veya HDF5 dosyasını indirin. | `01_Eklenecek_Veriler_Buraya/uydu_katalog_listeleri/` |

### 2. Ham Uydu Görüntülerinden (GeoTIFF) Piksel Bazlı Hektar Hesabı (İsteğe Bağlı Yerel GDAL/Python İşlemi)
- **Durum:** Katalogdaki gerçek Sentinel-2 L2A sahnelerinin (`TCI.tif`, `B03.tif`, `B08.tif`, `B11.tif`, `B12.tif`) doğrudan AWS S3 indirme bağlantıları (`https://sentinel-cogs.s3.us-west-2.amazonaws.com/...`) `gercek_indirilen_uydu_katalogu.json` dosyasına kaydedildi.
- **Neden Hektar Alanları (`baseline_open_water_ha`, `burned_area_ha`) Boş Bırakıldı?** Her bir 10m Sentinel-2 bandı yaklaşık 120–180 MB boyutundadır ve bilgisayarınızda Python/GDAL kurulu olmadığı (Windows Store kısayolu olduğu) için sahte rakam üretmek yerine piksel alan metrikleri `null` bırakıldı.
- **Nasıl Doldurulur?** QGIS veya Google Earth Engine / Python ortamında `gercek_indirilen_uydu_katalogu.json` içindeki `cog_nir_url` ve `cog_swir16_url` bağlantılarını açıp AOI poligonu ile keserek elde ettiğiniz hektar değerini `VERI_SABLONU_SLOTLAR.json` dosyasına (veya Web arayüzündeki **📥 Veri Slotları** sekmesine) yazabilirsiniz.

### 3. Kurumsal Resmi Yazışma / Protokol Gerektiren Yerel Veriler (İnternette Açık Olmayanlar)
Bu veriler hiçbir açık internet kaynağında bulunmaz; ilgili kamu kurumlarından resmi yazı veya protokol ile talep edilmelidir:
1. **Muğla Büyükşehir Belediyesi (CBS Şube Müdürlüğü) & MUSKİ:**
   - **İstenecek Veri:** Köyceğiz Gölü ve Dalyan Kanalı su seviyesi/debi istasyon ölçümleri, içme suyu havza sınırları, 1/25.000 nazım imar planı sınırları (`GeoJSON` / `Shapefile`).
2. **Orman Genel Müdürlüğü (Muğla Orman Bölge Müdürlüğü):**
   - **İstenecek Veri:** 2021 Marmaris–Bördübet ve Köyceğiz yangınlarının **resmi kesinleşmiş yangın çevresi (burn perimeter) poligonları** ve ağaçlandırma/gençleştirme müdahale parselleri (`Shapefile` / `GeoPackage`).
3. **DSİ 21. Bölge Müdürlüğü (Aydın/Muğla):**
   - **İstenecek Veri:** Dalaman Çayı, Eşen Çayı ve Sarıçay taşkın tekerrür haritaları ve akım gözlem istasyonu (AGİ) serileri.
4. **AFAD / Harita Genel Müdürlüğü (TUSAGA-Aktif) / MTA:**
   - **İstenecek Veri:** Seydikemer ve Fethiye çevresi sabit GNSS istasyon hız vektörleri (InSAR kalibrasyonu için zorunlu) ve MTA 1/25.000 diri fay / heyelan envanteri.
5. **MAPEG & Çevre, Şehircilik ve İklim Değişikliği Bakanlığı (TUCBS):**
   - **İstenecek Veri:** Yatağan ve Milas maden ruhsat sınırları ve rehabilitasyon sahası poligonları.
