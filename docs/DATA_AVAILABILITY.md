# MUĞLA GEOINSIGHT — Veri Bulunabilirlik ve AOI Doğrulama Özeti (v0.2)

Bu belge, `Mugla_GeoInsight_Data_Availability_Matrix_v02.xlsx` içinde yer alan 39 veri/modül kaydının ve 12 doğrulama iş paketinin **14.11.2026 (Sürüm 0.2)** itibarıyla güncellenmiş durumunu özetler.

## 1. Özet Göstergeler (v0.1 ➔ v0.2 Güncellemesi)
| Gösterge | v0.1 Değeri | v0.2 Değeri | Açıklama |
| :--- | :---: | :---: | :--- |
| **Toplam kaynak/modül kaydı** | 39 | **39** | 8 araştırma alanı + ortak altyapı kaynakları |
| **Açık katalog / API** | 0 (Sorgulanmadı) | **26** | Copernicus CDSE, USGS STAC, NASA FIRMS/GPM/SMAP/NISAR, C3S ERA5-Land, Copernicus Marine |
| **Kurumsal erişim / izin gerektiren** | 0 (Sorgulanmadı) | **13** | Muğla BB CBS, MUSKİ, OGM, MTA, MAPEG, TUCBS, DSİ/USBS, Saha GNSS |
| **Muğla mekânsal doğrulaması tamamlanan** | 0 | **18** | Pilot AOI poligonları (`35SNA`, `35SLA`, `35SLB`, `35SMB`, `35SNB`) ve açık katalog granülleri doğrulandı |

## 2. Pilot AOI Bazında Doğrulanmış Katalog Kapsamı

### 2.1 Köyceğiz–Dalyan Su ve Sulak Alan Pilot AOI (`aoi_dalyan_wetland` — 25.951,3 ha)
- **Sentinel-2 MSI L2A (`Tile 35SNA`, `Orbit 7 DESC`):** 2015–2026 döneminde **742 sahne**; yaz kurak dönem bulutsuz (`<=%15`) **168 sahne**. Referans çift: `14.08.2021` (`%1,8` bulut) ve `18.08.2026` (`%2,1` bulut).
- **Sentinel-1 C-SAR GRD (`Track 29 ASC` & `Track 131 DESC`):** 2014–2026 döneminde **618 sahne**. Referans çift: `15.08.2021` ve `17.08.2026`.
- **Landsat Collection 2 L2 SR (`WRS-2 179/034`):** 1984–2026 döneminde **496 sahne**.
- **NASA-ISRO NISAR (`Track 118 ASC`, `L2 GCOV`):** `21.10.2026` sonrası geçerli dönemde **2 doğrulanmış granül** (ör. `03.11.2026`).

### 2.2 Marmaris–Bördübet Orman Yangını ve Ekosistem Pilot AOI (`aoi_bordubet_fire` — 28.285,1 ha)
- **Sentinel-2 MSI L2A (`Tile 35SLA`, `Orbit 50 DESC`):** 2015–2026 döneminde **756 sahne**; yaz dönemi bulutsuz **184 sahne**. Referans seri: `20.07.2021` (yangın öncesi), `19.08.2021` (2021 yangını sonrası), `05.07.2022` (2022 Bördübet yangını sonrası), `19.07.2024` (Yıl +2), `24.07.2026` (Yıl +4).
- **NASA FIRMS MODIS & VIIRS 375m:** 2021 Marmaris yangınında **418 sıcak nokta**, 2022 Bördübet yangınında **196 sıcak nokta** (toplam **614 aktif termal anomali kaydı**).
- **Sentinel-1 C-SAR GRD (`Track 131 DESC`):** 2014–2026 döneminde **624 sahne**.
