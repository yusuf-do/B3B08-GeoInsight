# Muğla GeoInsight (v0.2 MVP)
**Çok Kullanıcılı Coğrafi İstihbarat, Çevresel İzleme ve Karar Destek Platformu**

> *Bir konum. Farklı araştırma alanları. Farklı kullanıcılar. Tek bir bilimsel veri altyapısı.*

## Hızlı Başlangıç

```powershell
# GeoAI tarayıcı çalışma zamanını kilitli sürümden kur
npm ci

# 1. E2E Kabul ve Kalite Testlerini Çalıştır
node apps/api/src/smoke_test.mjs

# 2. Web Harita Platformu ve REST API v1 Sunucusunu Başlat (Varsayılan Port: 4080)
node apps/api/src/server.mjs
```

Tarayıcınızda `http://127.0.0.1:4080` adresini açarak Muğla İnteraktif Haritası, 8 Çevresel İstihbarat Modülü, Önce/Sonra Karşılaştırma Ekranı, Araç Çağıran GeoAI Asistanı ve Rol Bazlı PDF/CSV/GeoJSON Raporlama arayüzünü kullanabilirsiniz.

### GeoAI · Local Browser AI

Send a message in GeoAI to start [Qwen3-0.6B](https://huggingface.co/Qwen/Qwen3-0.6B)
(Apache 2.0) through [Transformers.js](https://huggingface.co/docs/transformers.js/en/index).
The first use downloads about 580 MB on WebGPU or 630 MB on the CPU using [quantized ONNX weights and tokenizer files](https://huggingface.co/onnx-community/Qwen3-0.6B-ONNX/tree/79346d370dfae34801d26993fda9ae2372900fd0).
The browser caches the files for this site origin. Private sessions, storage eviction, or a different origin can require a new download.

Use a current 64-bit desktop Chrome or Edge on localhost (or HTTPS). The worker tries WebGPU on an adapter with 16-bit shader support and checks the model output before use. If WebGPU fails, WebAssembly can load the CPU variant, which may require its own download. Allow roughly 1.5–3 GB of available memory for the tab and model as a planning estimate, especially during first load. CPU latency and available memory vary by device. Other browsers and phones may have different GPU and storage limits. The compact model can miss instructions or give weak explanations. Use the labeled GIS evidence for scientific results.

Local Browser AI uses no API key. It consults the same-origin GIS API and generates text on the device. You can opt in to the configured server model from the GeoAI status drawer. For Gemini, set `GEOAI_LLM_PROVIDER=gemini` and `GEMINI_API_KEY` in the gitignored root `.env`. This mode can send the current request and relevant context to Google. The two modes keep their conversation context separate. Browser mode never switches to the server model on failure.

The GeoAI status drawer includes **Eco** and **Balanced**. Eco is the default, with a 384-token input budget and a 256-token reply ceiling. Balanced allows 768 input tokens and up to 384 new tokens. The model aims to finish at a sentence boundary well before the ceiling. GPU utilization can still be high while a reply is being generated.

General replies appear as the model writes them. The assistant holds GIS explanations until it checks their measurements against the evidence. When the requested area or period lacks verified observations, the evidence card explains the gap.

The browser releases the idle model after three minutes by default. Change the interval to one or five minutes in the same drawer. The next message reloads the model from the browser cache. Stopping a generation tries to keep the loaded session available for the next request.

GitHub Pages serves static files. Run the Node backend to use the full GeoInsight application with its GIS API and GeoAI runtime. The model weights and local credentials stay out of Git.

## Proje Çıktıları ve Belgeler
- **Standart AOI GeoJSON Paketi:** `data/aoi/` (`mugla_province_aoi_v1.geojson`, `pilot_dalyan_wetland_aoi_v1.geojson`, `pilot_bordubet_fire_aoi_v1.geojson`, `pilot_modules_aoi_v1.geojson`)
- **Doğrulanmış STAC Katalog Envanteri:** `data/catalog/mugla_stac_inventory_v1.json`
- **Mimari ve Bilimsel Karar Kayıtları (ADR):** `docs/ADR.md`
- **Güncellenmiş v0.2 Teslimat Paketi (Word/Excel/ZIP):** `deliverables/MGI_Deliverables_v02.zip` (`MGI_PRD_v02.docx`, `MGI_TDD_v02.docx`, `Mugla_GeoInsight_Data_Availability_Matrix_v02.xlsx`)
