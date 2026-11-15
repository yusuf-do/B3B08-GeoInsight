# MUĞLA GEOINSIGHT — Product Requirements Document (PRD v0.2)

| Alan | Bilgi |
| :--- | :--- |
| **Belge Kodu** | `MGI-PRD-002` |
| **Sürüm** | `0.2 – Doğrulanmış MVP ve ADR Sürümü` |
| **Tarih** | `14 Kasım 2026` |
| **Durum** | `MVP Uygulaması ve Pilot AOI Doğrulaması Tamamlandı` |

## 1. Ürün Vizyonu ve Vaadi
Muğla'nın doğal ve insan kaynaklı yüzey değişimlerini farklı uydu ve çevresel veri kaynaklarıyla izlemek; bilimsel bulguları araştırmacılar, yerel yönetimler, kamu yöneticileri, yatırımcılar, çiftçiler, işletmeler ve vatandaşlar için anlaşılır ve izlenebilir bilgi ürünlerine dönüştürmek.

> **Ürün Vaadi:** *Bir konum. Farklı araştırma alanları. Farklı kullanıcılar. Tek bir veri altyapısı.*

## 2. Temel Ürün İlkeleri
1. **Harita ve Veri Altyapısı Birincildir:** Platformun merkezi sohbet botu değil, interaktif Muğla haritası ve arkasındaki bilimsel veri altyapısıdır. GeoAI, analiz sonuçlarını açıklayan ve sorgulayan yardımcı katmandır.
2. **Tek Doğrulanmış Veri Temeli, Rol Bazlı Sunum:** Her kullanıcı aynı doğrulanmış standart analiz sonuç sözleşmesinden yararlanır; sunum dili, ayrıntı düzeyi ve rapor şablonu 6 kullanıcı rolüne göre değişir.
3. **Tam İzlenebilirlik (Provenance):** Her sonuç veri kaynağına, gözlem tarihine, granül ID'sine, MGRS karo / yörünge bilgisine, yönteme ve kalite kontrol (`QC`) bayraklarına bağlanır.
4. **Ölçüm, Bilimsel Yorum ve Öneri Ayrımı:** Nicel uydu ölçümü (`Measurement`), fiziksel/çevresel yorum (`Scientific Interpretation`) ve deterministik saha önerisi (`Recommendation`) arayüzde ve raporlarda ayrı bölümler halinde sunulur.
5. **Sıfır Uydurma Sonuç (`Zero Fabrication`):** Veri veya kalite koşulları yetersizse sistem sahte metrik üretmez; `Yetersiz Veri (insufficient_data)` veya `Ek İnceleme Gerekli (further_investigation_required)` durumunu eksik koşullarla birlikte gösterir.
6. **Hukuki ve Mühendislik Sınır:** Platform hukuki uygunluk, imar/ruhsat ihlali, tekil yapı güvenliği, yatırım getirisi, kesin tarımsal rekolte veya afet kesinliği hakkında uydu verisinden tek başına hüküm vermez.

## 3. Sürüm 0.2'de Tamamlanan Açık Kararlar (Bölüm 14 Kapanışı)
- **Pilot AOI GeoJSON Standardı:** Muğla 13 ilçe sınırı (`mugla_province_aoi_v1.geojson`), Köyceğiz–Dalyan (`pilot_dalyan_wetland_aoi_v1.geojson`, `25.951,3 ha`), Marmaris–Bördübet (`pilot_bordubet_fire_aoi_v1.geojson`, `28.285,1 ha`) ve diğer 6 modül AOI'si `EPSG:4326` depolama ve `EPSG:32635` (UTM 35N) metrik analiz standardıyla üretilmiştir.
- **Pilot 1 (Köyceğiz–Dalyan Su/Sulak Alan):** 2021–2026 Ağustos dönemi açık su yüzeyinde `-314,2 ha (-%10,66)` daralma (`2.948,4 ha -> 2.634,2 ha`) Sentinel-2 L2A MNDWI ve Sentinel-1 GRD (`Track 29 ASC`) ile `%96,4` uyumla doğrulanmıştır (`Destekleniyor / supported`).
- **Pilot 2 (Marmaris–Bördübet Yangın/Ekosistem):** 2021 (`5.410,5 ha`) ve 2022 (`3.532,3 ha`) yangınlarında toplam `8.942,8 ha` kümülatif etki alanı ve Temmuz 2026 itibarıyla yanmamış kontrol parseline kıyasla `%75,8` spektral NDVI geri kazanımı (`6.490,2 ha` kuvvetli toparlanma, `2.452,6 ha` yavaş toparlanan dik sırtlar) doğrulanmıştır (`Doğrulanmış / verified`).
