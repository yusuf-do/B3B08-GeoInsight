# Muğla GeoInsight — Veri Ekleme ve Boş Alanları Doldurma Rehberi

Projeniz yeni oluşturulan **`C:\Users\Pc\.gemini\antigravity\scratch\Mugla_GeoInsight_Proje`** klasörüne taşınmış ve düzenlenmiştir.

## Klasör Yapısı (Verileriniz İçin Ayrılan Boş Alanlar)

1. **`01_Eklenecek_Veriler_Buraya/VERI_SABLONU_SLOTLAR.json`**
   - Tüm 8 araştırma modülü (`water`, `fire`, `agriculture`, `flood`, `deformation`, `coast`, `industry`, `urban`), katalog sahne sayıları ve kurumsal katmanlar için boş (`null` / `[]`) bırakılmış ana veri şablonudur.
2. **`01_Eklenecek_Veriler_Buraya/aoi_poligonlari/`**
   - Kesinleşmiş Muğla il/ilçe, Köyceğiz–Dalyan, Marmaris–Bördübet veya diğer çalışma alanı `.geojson` / `.shp` / `.kml` dosyalarınızı buraya bırakabilirsiniz.
3. **`01_Eklenecek_Veriler_Buraya/uydu_katalog_listeleri/`**
   - Copernicus (Sentinel-1/2), USGS (Landsat), NASA FIRMS, ASF (NISAR) veya iklim ızgarası (`GPM`, `ERA5-Land`, `SMAP`) sahne listelerinizi (`.csv`, `.xlsx`, `.json`) buraya bırakabilirsiniz.
4. **`01_Eklenecek_Veriler_Buraya/modul_analiz_sonuclari/`**
   - Elde ettiğiniz gerçek alan metriklerini, zaman serisi tablolarını veya raster istatistiklerini buraya ekleyebilirsiniz.
5. **`01_Eklenecek_Veriler_Buraya/kurumsal_cbs_verileri/`**
   - Muğla BB CBS, MUSKİ, DSİ, OGM, MTA/MAPEG veya TUCBS'den temin edilen katman/izin bilgilerini buraya ekleyebilirsiniz.
6. **`data/results/blank_slot_contract_*.json`**
   - 8 modülün tamamı için metrikleri boş (`null`) bırakılmış Standart Analiz Sonuç Sözleşmesi dosyalarıdır.
