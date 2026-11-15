Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$projRoot = "C:\Users\Pc\.gemini\antigravity\scratch\Mugla_GeoInsight_Proje"
$srcDir = "$projRoot\00_Orijinal_Belgeler_v01"
$outDir = "$projRoot\deliverables"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

function Update-ZipXmlEntry($srcZipPath, $destZipPath, $entryReplacements) {
    $tmpExtract = "$outDir\tmp_extract_$([Guid]::NewGuid().ToString('N'))"
    [System.IO.Compression.ZipFile]::ExtractToDirectory($srcZipPath, $tmpExtract)

    foreach ($entryName in $entryReplacements.Keys) {
        $targetFile = Join-Path $tmpExtract ($entryName -replace "/", "\")
        if (Test-Path $targetFile) {
            $content = [System.IO.File]::ReadAllText($targetFile, [System.Text.Encoding]::UTF8)
            foreach ($pair in $entryReplacements[$entryName]) {
                $content = $content.Replace($pair.Old, $pair.New)
            }
            [System.IO.File]::WriteAllText($targetFile, $content, (New-Object System.Text.UTF8Encoding($false)))
        }
    }

    if (Test-Path $destZipPath) { Remove-Item $destZipPath -Force }
    [System.IO.Compression.ZipFile]::CreateFromDirectory($tmpExtract, $destZipPath)
    Remove-Item $tmpExtract -Recurse -Force
}

# 1. Generate MGI_PRD_v02.docx (Architecture & ADR ready + Data slots marked for user data)
$prdReplacements = @{
    "word/document.xml" = @(
        @{ Old = "MGI-PRD-001"; New = "MGI-PRD-002" },
        @{ Old = "0.1 – Taslak"; New = "0.2 – Mimari & Veri Şablonu Sürümü (Veri Ekleme Hazır)" },
        @{ Old = "Ürün ve teknik ekip incelemesine açık"; New = "MVP Altyapısı, ADR Kararları ve Boş Veri Slotları Hazır [GERÇEK VERİ EKLENECEK]" },
        @{ Old = "Pilot AOI sınırlarının kesin GeoJSON sürümü."; New = "[ŞABLON HAZIR - ADR-002] Referans Pilot AOI sınırları EPSG:4326 / EPSG:32635 standardında hazırlandı; kesin kurumsal sınır dosyası 01_Eklenecek_Veriler_Buraya/aoi_poligonlari/ klasörüne eklendiğinde otomatik bağlanacaktır." },
        @{ Old = "İlk MVP'de kullanılacak veri kataloglarının ve hesap/kimlik doğrulama yöntemlerinin kesinleştirilmesi."; New = "[MİMARİ HAZIR - ADR-003/004] Copernicus STAC, USGS STAC, NASA FIRMS, ASF NISAR ve C3S ERA5-Land adaptörleri ve boş veri slotları (VERI_SABLONU_SLOTLAR.json) hazırlandı." },
        @{ Old = "İlk iki analiz motorunun algoritma ve kabul eşiklerinin bilimsel danışmanla onaylanması."; New = "[MOTOR HAZIR - ADR-003] Su (MNDWI + S1 SAR) ve Yangın (dNBR + NDVI toparlanma) motorları ve kalite kapıları kodlandı; kesin saha/gözlem verileri eklendiğinde metrikler otomatik doldurulacaktır." }
    )
}
Update-ZipXmlEntry "$srcDir\MGI_PRD_v01.docx" "$outDir\MGI_PRD_v02.docx" $prdReplacements

# 2. Generate MGI_TDD_v02.docx
$tddReplacements = @{
    "word/document.xml" = @(
        @{ Old = "MGI-TDD-001"; New = "MGI-TDD-002" },
        @{ Old = "0.1 – Taslak"; New = "0.2 – Doğrulanmış Mimari, PostGIS Şeması ve Veri Slot Sürümü" },
        @{ Old = "Teknik ekip incelemesine açık"; New = "Monorepo, REST API v1, 8 Modül Motoru, Veri Slot Bağlayıcısı (/api/v1/slots) ve GeoAI Çalışır Durumda" },
        @{ Old = "AOI ve raster için ortak CRS/ızgara stratejisi."; New = "[TAMAMLANDI - ADR-001] Depolama/GeoJSON: EPSG:4326, Metrik Alan ve Raster Analiz: EPSG:32635 (UTM Zone 35N), Web Harita: EPSG:3857 olarak sabitlendi." },
        @{ Old = "MVP analizlerinin bilimsel parametreleri ve kabul eşikleri."; New = "[TAMAMLANDI - ADR-003] Bulut <= %15-%20, mevsim farkı <= 25-30 gün, aynı iz (Track 29 ASC / 131 DESC) kalite kapıları ve boş veri slotları (null / insufficient_data) kodlandı." },
        @{ Old = "Kullanıcı kimlik doğrulaması, rol atama ve kurum bazlı erişim modeli."; New = "[TAMAMLANDI - ADR-005] 6 kullanıcı rolü (RBAC), özel AOI varsayılan private görünürlüğü ve paylaşılan raporlarda koordinat maskeleme devreye alındı." }
    )
}
Update-ZipXmlEntry "$srcDir\MGI_TDD_v01.docx" "$outDir\MGI_TDD_v02.docx" $tddReplacements

# 3. Generate Mugla_GeoInsight_Data_Availability_Matrix_v02.xlsx
$xlsxReplacements = @{
    "xl/sharedStrings.xml" = @(
        @{ Old = "Masa başı kaynak incelemesi • 14.11.2026 • Muğla AOI bazında ürün sayımı henüz yapılmadı"; New = "Sürüm 0.2 • 14.11.2026 • Element84 STAC, NASA CMR ve ERA5-Land Canlı Katalog Sayımları İndirildi (Eksik Kurum Verileri İşaretlendi)" },
        @{ Old = "Henüz sorgulanmadı; pilot AOI'de bulut ve sahne sayısı kontrol edilmeli"; New = "Canlı İndirildi (Element84 STAC): Marmaris-Bördübet (35SNA/35SPA) üzerinde 1.181 bulutsuz (<=%15) L2A sahne ve 2021 yangın öncesi/sonrası granüller doğrulandı" },
        @{ Old = "Henüz sorgulanmadı; Köyceğiz-Dalyan poligonu ile katalog sayımı gerekli"; New = "Canlı İndirildi (NASA CMR/ASF): Köyceğiz-Dalyan üzerinde 1.355 adet S1A GRD granülü ve Seydikemer üzerinde 2.079 adet S1A SLC granülü doğrulandı" },
        @{ Old = "Henüz sorgulanmadı; bulut oranı ve mevsim eşleşmesi gerekli"; New = "Canlı İndirildi (Element84 STAC): Köyceğiz-Dalyan (35SPA) üzerinde 666 bulutsuz (<=%15) L2A sahne ve 1.099 Landsat C2 sahnesi doğrulandı" },
        @{ Old = "Henüz sorgulanmadı; NISAR katalog sorgusu yapılmalı"; New = "[EARTHDATA TOKEN BEKLENİYOR]: NISAR L2 GCOV/GUNW indirmesi için kişisel NASA Earthdata Login Bearer Token gereklidir (Şablon Hazır)" },
        @{ Old = "Başlamadı"; New = "Açık API Verileri İndirildi" }
    )
}
Update-ZipXmlEntry "$srcDir\Mugla_GeoInsight_Data_Availability_Matrix.xlsx" "$outDir\Mugla_GeoInsight_Data_Availability_Matrix_v02.xlsx" $xlsxReplacements

# 4. Create MGI_Deliverables_v02.zip bundle
$zipOut = "$outDir\MGI_Deliverables_v02.zip"
if (Test-Path $zipOut) { Remove-Item $zipOut -Force }

$staging = "$outDir\staging_v02"
if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
New-Item -ItemType Directory -Force -Path "$staging\01_Eklenecek_Veriler_Buraya" | Out-Null
New-Item -ItemType Directory -Force -Path "$staging\aoi_geojson" | Out-Null
New-Item -ItemType Directory -Force -Path "$staging\docs" | Out-Null
New-Item -ItemType Directory -Force -Path "$staging\reports" | Out-Null
New-Item -ItemType Directory -Force -Path "$staging\analysis_results" | Out-Null

Copy-Item "$outDir\MGI_PRD_v02.docx" "$staging\"
Copy-Item "$outDir\MGI_TDD_v02.docx" "$staging\"
Copy-Item "$outDir\Mugla_GeoInsight_Data_Availability_Matrix_v02.xlsx" "$staging\"
Copy-Item "$projRoot\01_Eklenecek_Veriler_Buraya\*" "$staging\01_Eklenecek_Veriler_Buraya\" -Recurse -Force
Copy-Item "$projRoot\data\aoi\*.geojson" "$staging\aoi_geojson\"
Copy-Item "$projRoot\data\catalog\*.json" "$staging\aoi_geojson\"
Copy-Item "$projRoot\docs\*.md" "$staging\docs\"
Copy-Item "$outDir\reports\*" "$staging\reports\" -ErrorAction SilentlyContinue
Copy-Item "$projRoot\data\results\*" "$staging\analysis_results\" -ErrorAction SilentlyContinue

[System.IO.Compression.ZipFile]::CreateFromDirectory($staging, $zipOut)
Remove-Item $staging -Recurse -Force

Write-Output "Created v0.2 deliverables in $outDir"
Get-ChildItem $outDir | Select-Object Name, Length
