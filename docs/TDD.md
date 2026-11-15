# MUĞLA GEOINSIGHT — Technical Design Document (TDD v0.2)

| Alan | Bilgi |
| :--- | :--- |
| **Belge Kodu** | `MGI-TDD-002` |
| **Sürüm** | `0.2 – Uygulama, PostGIS Şeması ve ADR Sürümü` |
| **Tarih** | `14 Kasım 2026` |
| **Durum** | `Uçtan Uca MVP Çalışır Durumda (E2E Testleri Geçti)` |

## 1. Mimari Akış
`Veri Kaynakları (Sentinel-1/2, Landsat, NISAR, FIRMS, ERA5/GPM/SMAP)` ➔ `STAC Katalog & Kalite Kontrol (QC Gate)` ➔ `Jeo-Uzamsal Veri Katmanı (PostGIS + GeoJSON/COG, EPSG:4326 / EPSG:32635)` ➔ `8 Modüler Analiz Motoru` ➔ `Kanıt ve Deterministik Karar Motoru` ➔ `Araç Çağıran GeoAI & Rol Bazlı Raporlama` ➔ `İnteraktif Web Harita Platformu`.

## 2. Gerçekleştirilen Repository Yapısı
```text
mugla-geoinsight/
├── apps/
│   ├── web/public/             # İnteraktif Muğla Haritası, Önce/Sonra, Zaman Serisi, GeoAI & Rapor Arayüzü
│   ├── api/src/                # Node.js REST API v1 Sunucusu & E2E Kabul Test Paketi (smoke_test.mjs)
│   └── api-fastapi/            # Python FastAPI Referans Servisi (main.py)
├── packages/
│   ├── geospatial-common/      # AOI GeoJSON Üretici ve EPSG:4326 <-> EPSG:32635 Metrik Hesaplama
│   ├── data-connectors/        # STAC / Katalog Doğrulayıcı ve Muğla Granül Envanteri
│   ├── analysis-engines/       # 8 Çevresel İstihbarat Modülü (Su, Yangın, Tarım, Taşkın + 4 Faz-2 QC Kapısı)
│   ├── evidence-engine/        # Standart Sonuç Sözleşmesi, 4 Kanıt Etiketi ve Deterministik Öneri Kuralları
│   ├── geoai/                  # Intent Parser, Tool Planner, Araç Çağrısı, Guardrail ve Rol Bazlı Yanıt
│   └── reporting/              # 5 Rapor Şablonu (HTML/PDF), Koordinat Maskeleme, CSV ve GeoJSON Dışa Aktarma
├── data/
│   ├── aoi/                    # Sürümlenmiş Muğla 13 İlçe ve Pilot AOI GeoJSON Dosyaları
│   └── catalog/                # Doğrulanmış STAC Granül Envanteri (mugla_stac_inventory_v1.json)
├── infrastructure/
│   ├── migrations/             # PostgreSQL 16 + PostGIS 3.4 + pgvector 12 Tablolu Şema (001_init_postgis.sql)
│   └── docker/                 # PostGIS, Redis, TiTiler ve Uygulama Konteyner Orkestrasyonu
├── docs/                       # PRD.md, TDD.md, DATA_AVAILABILITY.md, ADR.md
└── deliverables/               # Güncellenmiş v0.2 Word (.docx), Excel (.xlsx) ve ZIP Teslimat Paketi
```

## 3. REST API v1 Uç Noktaları
- `GET /api/v1/bootstrap`: 13 ilçe GeoJSON, pilot AOI listesi, 8 modül kaydı, 6 kullanıcı rolü ve 5 rapor şablonu.
- `POST /api/v1/catalog/search`: AOI, tarih aralığı, modül ve bulut eşiğine göre STAC granül araması ve QC istatistikleri.
- `GET /api/v1/areas` & `POST /api/v1/areas` & `DELETE /api/v1/areas/:id`: Pilot AOI listeleme ve kullanıcı özel poligon (`private`) oluşturma/silme.
- `POST /api/v1/analyses` & `GET /api/v1/analyses` & `GET /api/v1/analyses/:job_id` & `DELETE /api/v1/analyses/:job_id`: Asenkron analiz iş kuyruğu ve geçmiş yönetimi.
- `GET /api/v1/results/:result_id`: Standart Analiz Sonuç Sözleşmesi (`contract_version: "0.2.0"`).
- `GET /api/v1/layers/:id/tiles/:z/:x/:y`: Harita katmanı tile sunumu.
- `POST /api/v1/assistant/query`: Araç çağıran, kaynak gösteren ve kapsam dışı iddiaları engelleyen GeoAI sorgu uç noktası.
- `POST /api/v1/reports` & `GET /api/v1/reports/:id`: 5 rapor türünde (koordinat gizliliği seçenekli) PDF/HTML ve CSV rapor üretimi.
