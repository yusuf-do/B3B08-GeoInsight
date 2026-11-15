# Muğla GeoInsight — Veri Yönetişimi, Lisans Sicili, Kurumsal İzinler ve Otomatik QC Standardı (v1.0)

Bu belge, `Mugla_GeoInsight_Data_Availability_Matrix.xlsx` **Doğrulama Planı İş Paketleri #9, #10 ve #11** ile `TDD Bölüm 13 & 14` gereksinimlerini karşılayan veri yönetişimi, lisans sicili, kurumsal erişim ayrımı ve otomatik kalite kontrol (`QC`) kurallarını tanımlar.

---

## 1. Veri Lisans Sicili (İş Paketi #10)
Tüm açık uydu ve iklim veri kaynakları `data/catalog/license_and_institutional_registry_v1.json` dosyasında makinece okunabilir biçimde kayıt altına alınmıştır:
- **Copernicus Sentinel-1 & Sentinel-2 (CDSE):** Ticari ve araştırma kullanımına açık; türetilmiş ürünlerde *"Contains modified Copernicus Sentinel data [2021–2026], processed by Muğla GeoInsight"* atfı zorunludur.
- **USGS Landsat Collection 2 Level-2:** ABD Kamu Malı (`Public Domain`); kısıtsız türetilmiş ürün ve rapor paylaşımı.
- **NASA-ISRO NISAR (`VALIDATED L0–L2`):** NASA Earthdata Açık Veri Politikası; yalnızca `21.10.2026` ve sonrası gözlemler için geçerlidir (`SME2` toprak nemi ürünü henüz `VALIDATED` değildir).
- **NASA FIRMS & GPM IMERG & SMAP & Copernicus ERA5-Land:** Açık veri; çözünürlük sınırı (`9–10 km` ızgara vs parsel ölçeği) ve model yeniden analizi (`reanalysis`) ile yer istasyonu ölçümü farkı her çıktıda belirtilir.

---

## 2. Kurumsal Veri Paylaşım ve İzin Tablosu (İş Paketi #9)
Web harita portallarında (Muğla BB CBS, MTA Yerbilimleri, USBS, TUCBS) bir katmanın ekranda görünmesi, o verinin açık API ile indirilebileceği veya yeniden dağıtılabileceği anlamına gelmez:
1. **Muğla BB CBS & MUSKİ:** İmar, MAKS, yağmur suyu/drenaj ve 3B İHA verileri `municipality_internal` kiracı (`tenant`) kapsamındadır; ham vektörlerin yeniden dağıtımı kapalıdır (`redistribution_allowed: false`).
2. **OGM (Orman Genel Müdürlüğü):** İl bazlı yangın istatistikleri açık kaynak olup, saha ağaçlandırma/hasar tespit poligonları kurumsal doğrulama katmanıdır.
3. **MTA & MAPEG:** 1:25.000 heyelan envanteri ve maden ruhsat sınırları kurumsal izne tabidir; platform uydu verisinden ruhsat/imar uygunluğu veya hukuki ihlal hükmü üretmez (`RULE-INDUSTRY-001`, `RULE-URBAN-001`).

---

## 3. Otomatik Kalite Kontrol (QC) Şeması ve Kabul Eşikleri (İş Paketi #11)
`packages/evidence-engine/qc_validator.mjs` tarafından her analiz öncesinde çalıştırılan deterministik eşikler:

| Modül | Maks. Optik Bulut | Min. Geçerli Piksel | Maks. Mevsim Farkı | Özel Sensör / Fiziksel Kalite Kuralı |
| :--- | :---: | :---: | :---: | :--- |
| **Su ve Sulak Alan** (`water`) | `<= %15` | `>= 0.90` | `<= 25 gün` | Sentinel-1 için aynı iz (`Track 29 ASC`); kış bulutlu sahnelerde SAR yedeklemesi. |
| **Orman Yangını** (`fire`) | `<= %20` | `>= 0.92` | `<= 30 gün` | Aktif duman örtüsü elenir; yanmamış kontrol parseli (`aoi_bordubet_unburned_control`) ile NDVI normalizasyonu şarttır. |
| **Tarım ve Bitki** (`agriculture`) | `<= %15` | `>= 0.90` | `<= 20 gün` | Parsel indeksi `<= 30m` optikten; `9 km` SMAP/ERA5 yalnızca bölgesel bağlam olarak ayrılır. |
| **Sel ve Taşkın** (`flood`) | `SAR Bağımsız` | `>= 0.95` | `Olay Çifti` | Olay öncesi/sonrası aynı iz (`Track 29 ASC`) ve DEM eğim `< 5°` maskesi. |
| **Kıyı Değişimi** (`coast`) | `<= %10` | `>= 0.95` | `<= 20 gün` | Copernicus Marine anlamlı dalga yüksekliği $H_s \le 0.35\text{ m}$ sakin deniz şartı. |
| **Zemin Hareketi** (`deformation`) | `SAR Bağımsız` | `Coherence >= 0.45` | `Aynı Track SLC` | `GRD` ile InSAR bloklanır; yerel sabit GNSS referansı olmadan kesin alan üretilmez (`null`). |
