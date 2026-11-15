# Muğla GeoInsight — Hackathon & Jüri Canlı Demo Senaryosu (TDD Aşama 8)

Bu rehber, Muğla GeoInsight platformunun jüri ve teknik ekip sunumunda **5 dakikada uçtan uca tüm kabul ölçütlerini (`AC-01` – `AC-07`)** sergilemek için hazırlanmıştır.

---

## Adım 1: Harita Merkezli Keşif ve Özel AOI Çizimi (`AC-01`, `FR-01`, `FR-02`)
1. `http://127.0.0.1:4080` adresini açın.
2. Üst bardan **Muğla 13 İlçe** ve **8 Pilot Araştırma Alanı** arasında geçiş yapın.
3. **"✏️ Özel AOI Çiz"** butonuna tıklayarak harita üzerinde bir tarla/parsel poligonu çizin ve kaydedin.
   - **Vurgulanacak İlke:** Çizilen parsel varsayılan olarak `Özel (private)` statüsündedir ve alanı otomatik olarak `EPSG:32635` (UTM Zone 35N) düzleminde hektar (`ha`) cinsinden hesaplanır.

---

## Adım 2: Pilot 1 — Köyceğiz–Dalyan Su ve Sulak Alan Analizi (`AC-03`, `AC-04`, `AC-05`)
1. Sol panelden **"Su, Göl ve Sulak Alan"** modülünü seçin.
2. **STAC Katalog ve Granül Listesi:** `35SNA` karosunda `14.08.2021` (Sentinel-2A, `%1,8` bulut) ve `18.08.2026` (Sentinel-2C, `%2,1` bulut) gözlemlerinin yalnızca **4 gün mevsim farkıyla** eşleştiğini; `%68,4` bulutlu kış sahnesinin (`15.01.2026`) ise otomatik QC kapısıyla optik trendden elenip Sentinel-1 SAR ile tamamlandığını gösterin.
3. **Önce / Sonra Karşılaştırması:** `Yan Yana`, `Kaydırmalı (Swipe)` ve `Üst Üste` modları arasında geçiş yaparak **-314,2 ha (-%10,66)** açık su daralmasını ve Sentinel-1 C-SAR (`Track 29 ASC`) ile **%96,4** uyumu (`Destekleniyor / supported`) gösterin.

---

## Adım 3: Pilot 2 — Marmaris–Bördübet Orman Yangını ve Ekosistem (`AC-04`, `AC-05`)
1. Sol panelden **"Orman Yangını ve Ekosistem"** modülünü seçin.
2. 2021 (`5.410,5 ha`) ve 2022 (`3.532,3 ha`) yangınlarında toplam **8.942,8 ha** dNBR yanma şiddeti haritasını ve 2026 Temmuz itibarıyla **Yanmamış Kontrol Parseline (`aoi_bordubet_unburned_control`)** göre **%75,8 spektral NDVI geri kazanımını** (`Doğrulanmış / verified`) gösterin.
3. **Vurgulanacak Bilimsel Kural:** NASA FIRMS VIIRS 375m kayıtları (`614` sıcak nokta) yalnızca olay zaman çizelgesi içindir; yanmış alan poligonu olarak kullanılmaz.

---

## Adım 4: Bilimsel Kalite Kapısı — Sıfır Uydurma Sonuç (`AC-02`)
1. Sol panelden **"Zemin Hareketleri ve Heyelan (Seydikemer)"** modülünü seçin.
2. Sistemin `GRD` verisiyle InSAR yapmayı reddettiğini (`QC_BLOCK_GRD_CANNOT_RUN_INSAR`), C-bant orman coherence değerinin `0.34 (< 0.45)` kaldığını, Kasım 2026 **NISAR L2 GUNW** coherence değerini (`0.74`) raporladığını ancak yerel GNSS referansı olmadan sahte deformasyon alanı üretmediğini (`change_area_hectares: null`, `Yetersiz Veri / insufficient_data`) gösterin.

---

## Adım 5: Araç Çağıran GeoAI Guardrail Testi ve Rol Bazlı PDF Raporlama (`AC-06`, `AC-07`)
1. Sağ paneldeki **GeoAI Asistanı** sekmesinde:
   - *"NISAR uydusu ile 2020-2022 yılları arasındaki tarihsel değişimi analiz edebilir miyiz?"* ve
   - *"Seydikemer'de Sentinel-1 GRD verisiyle bina yapı güvenliği ve imar uygunluğu kararı verebilir misiniz?"*
   sorularına tıklayarak **Araç Çağrı İzini (`Tool Execution Trace`)** ve devreye giren **Kapsam Sınırı / NISAR Zaman Kapsamı Uyarılarını** gösterin.
2. **Rapor & İndir** sekmesine geçin, **"Paylaşılan raporda özel parsel koordinatlarını gizle"** kutusunu işaretleyin ve **"📑 PDF / Yazdırılabilir Rapor Oluştur ve Aç"** butonuna tıklayarak 8 bölümlü resmî raporu üretin.
