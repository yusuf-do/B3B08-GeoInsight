export const REPORT_TITLES = {
  scientific: ['Scientific Research Report', 'Researchers and academic institutions'],
  environmental_municipal: ['Environmental Status and Municipal Assessment', 'Municipalities and public agencies, including Muğla Metropolitan Municipality and MUSKİ'],
  agricultural: ['Agricultural Land and Vegetation Indicators', 'Growers, agronomists and cooperatives'],
  investment_screening: ['Environmental and Physical Investment Screening', 'Investors and businesses'],
  strategic_executive: ['Regional Outlook and Monitoring Priorities', 'Public administrators and strategic decision-makers']
};

export const REPORT_STUDIES = {
  dual_sensor_optical_mndwi_and_sar_backscatter_water_extent: {
    area: 'Köyceğiz–Dalyan reference area',
    confidence: 'High · 96.4% agreement between optical and C-band SAR results',
    measurement: 'In the 25,951.3 ha Köyceğiz–Dalyan pilot area, Sentinel-2 L2A MNDWI measured 2,948.4 ha of open water on 14 August 2021 and 2,634.2 ha on 18 August 2026 (−314.2 ha; −10.66%). An independent Sentinel-1 C-band SAR water mask (Track 29, ascending) fell from 2,912.0 ha to 2,610.8 ha (−301.2 ha), supporting the optical result with 96.4% agreement.',
    interpretation: 'Open water declined by 314.2 ha and wet reedbeds by 192.7 ha. Losses were concentrated in the northwestern Dalyan Delta reedbed transition and on the eastern shore of Sülüngür Lake. ERA5-Land and GPM IMERG indicate a regional precipitation anomaly of −14.2% and a 1.65 °C rise in mean summer temperature from 2021 to 2026. A November 2026 NISAR L-band GCOV observation mapped 1,240.5 ha of wet reedbed beneath the canopy, indicating that some water remained.',
    limitations: ['10–20 m Sentinel-2 indices cannot directly detect shallow water beneath dense Phragmites australis.', 'Cloud cover reached 68.4% in the optical scene on 15 January 2026. Winter inundation could be tracked only with Sentinel-1 SAR.', 'Validated NISAR L2 GCOV products are available only after 21 October 2026 and cannot support the 2021–2025 time series.', 'Satellite surface-area measurements do not measure water depth or groundwater levels.']
  },
  optical_nbr_dnbr_severity_and_phenology_controlled_ndvi_recovery: {
    area: 'Marmaris–Bördübet reference area',
    confidence: 'High · four independent sensors or data sources and an unburned control plot',
    measurement: 'In the 28,285.1 ha Marmaris–Bördübet pilot area, the July 2021 (5,410.5 ha) and June 2022 (3,532.3 ha) fires affected 8,942.8 ha at dNBR ≥ 0.10. Mean pre-fire NDVI (20 July 2021) was 0.648. It dropped to 0.246 in July 2022 and rose to 0.486 by July 2026, equivalent to 75.8% of the unburned control plot.',
    interpretation: 'In the unburned Bördübet West control plot, July NDVI stayed within 0.628–0.652 from 2021 to 2026, supporting the interpretation that the increase from 0.246 to 0.486 reflects vegetation recovery. Optical NDVI and NBR cannot establish that the Turkish pine canopy has recovered. Use field observations to distinguish shrub regrowth from seedling growth.',
    limitations: ['The 614 NASA FIRMS MODIS/VIIRS hotspots are thermal anomaly centers at 375 m–1 km resolution. They do not delineate a precise burn perimeter.', 'dNBR and NDVI are spectral indices. They do not directly measure seedling height or species composition.', 'Official forestry damage assessment polygons require institutional permission and field validation.']
  },
  sentinel2_ndvi_ndmi_with_coarse_climate_context: {
    area: 'Milas–Selimiye agricultural reference area', confidence: 'Medium · 10 m parcel observations and 9 km regional climate context',
    measurement: 'In Milas–Selimiye, mean July 2026 NDVI was 0.442 (−9.6% compared with the 2021–2025 mean) and canopy NDMI was 0.118. NDMI fell below 0.12 across 3,420.5 ha of olive groves and farmland.',
    interpretation: 'The decline in NDMI and NDVI is consistent with summer drought and a 1.65 °C temperature anomaly. Pruning, tillage and crop rotation can also change reflectance.',
    limitations: ['SMAP (9 km), ERA5-Land (~9 km) and GPM IMERG (~10 km) describe regional meteorology at coarser than parcel resolution.', 'The indices do not directly estimate crop yields or diagnose disease. Use TÜİK for official crop statistics.']
  },
  sentinel1_grd_change_detection_and_dem_lowland_mask: {
    area: 'Dalaman–Ortaca floodplain', confidence: 'Medium · SAR detected water extent; local hydraulic validation required',
    measurement: 'During extreme winter rainfall on the Dalaman–Ortaca floodplain (148 mm over 72 hours in GPM IMERG), a decrease in Sentinel-1 VV backscatter detected 684.5 ha of temporary surface water.',
    interpretation: 'Observed water collected on low-lying agricultural land with slopes below 5 degrees in Copernicus DEM GLO-30. Shallow water and saturated soil can produce similar specular responses in C-band radar.',
    limitations: ['Sentinel-1 SAR water masks do not measure flood depth or velocity.', 'GLO-30 is a digital surface model. Channel cross-sections and hydraulic modeling require a higher-resolution terrain model and MUSKİ/DSİ infrastructure data.']
  },
  wave_filtered_sentinel2_mndwi_subpixel_waterline: {
    area: 'İztuzu and the Dalyan inlet', confidence: 'Medium · low-energy August imagery pairs; RTK-GNSS validation required',
    measurement: 'In low-wave-energy August observations (Hs ≤ 0.31 m), exposed beach and dune area on the İztuzu barrier fell from 142.8 ha in 2021 to 136.4 ha in 2026, an apparent loss of 6.4 ha. The Dalyan inlet channel shifted +11.5 m.',
    interpretation: 'The sand spit at the Dalyan inlet moves naturally with longshore currents and lagoon discharge. At the 10 m pixel scale, the mean −4.2 m water–sand line change may also reflect barometric water-level variations and microtidal effects (±25 cm).',
    limitations: ['The 10 m Sentinel-2 water–sand boundary is neither an engineering-grade RTK-GNSS profile nor a statutory shoreline boundary under Coastal Law No. 3621.', 'Copernicus Marine wave data (~20 km offshore grid) do not directly resolve wave refraction inside bays.']
  },
  sentinel2_bare_soil_index_bsi_and_ndvi_reclamation: {
    area: 'Yatağan–Milas mining reference area', confidence: 'High · physical land-cover change verified; institutional records required for permit review',
    measurement: 'Across Yatağan–Milas from 2021 to 2026, high-BSI (≥ 0.14) excavation and dumping surfaces expanded by 312.4 ha. NDVI increases on old mine benches indicated 118.2 ha of revegetation or rehabilitation.',
    interpretation: 'BSI and NDVI changes quantify physical land-cover change and greening in rehabilitation plots.',
    limitations: ['Satellite land-cover change does not establish mining permit boundaries, compliance or a legal violation.', 'Use authorized institutional protocols to verify official MAPEG and Muğla GIS permit and rehabilitation layers.']
  },
  sentinel2_ndbi_and_s1_dualpol_backscatter_urban_mask: {
    area: 'Bodrum Peninsula reference area', confidence: 'Medium–high · 93.0% optical NDBI and radar double-bounce agreement',
    measurement: 'Impervious and built-up surfaces on the Bodrum Peninsula increased from 4,265.0 ha in 2021 to 4,683.5 ha in 2026 (+418.5 ha; +9.81%). Sentinel-1 backscatter also supported 389.2 ha of the increase.',
    interpretation: 'More impervious surface may increase urban heat and storm runoff. Stone terraces, roads, solar panels and greenhouses can produce similar spectral responses at 10 m resolution.',
    limitations: ['10–30 m satellite classifications do not determine building permits, parcel ownership or legal zoning status.', 'Compare official plans and MAKS building records using authorized Muğla and TUCBS GIS layers.']
  },
  deformation_slc_nisar_coherence_and_gnss_qc_gate: {
    area: 'Ground deformation reference area', confidence: 'Not assessed · local GNSS reference and coherence criteria remain unmet',
    measurement: 'The analysis reviewed Sentinel-1 SLC (Track 131, descending) and November 2026 NISAR L2 GUNW (Track 118, ascending). Mean C-band coherence on wooded slopes was 0.34, below the acceptance threshold of 0.45. A permanent local GNSS reference was unavailable, so no definitive deformation area was calculated.',
    interpretation: 'The first NISAR L-band GUNW interferogram after 21 October 2026 (24 cm wavelength) showed coherence rising to 0.74 on wooded slopes. A single 12-day pair without local GNSS cannot establish a millimetric slope velocity or confirm a landslide.',
    limitations: ['Sentinel-1 GRD amplitude is unsuitable for interferometry. Use complex phase products such as SLC or NISAR GUNW/RSLC.', 'Satellite line-of-sight motion is not a 3D vector. Assess structural or slope safety using field GNSS or inclinometer data.', 'Access to the 1:25,000 MTA landslide inventory requires an institutional agreement.']
  }
};

export const REPORT_RULES = {
  'RULE-WATER-001': ['Observed wetland or surface water contraction', 'Measure water level, salinity and conductivity along the Dalyan Channel and Sülüngür Lake. Review the water budget using local MUSKİ and DSİ flow records.', 'Satellite water masks cannot directly measure depth or groundwater decline or distinguish climate from human causes.'],
  'RULE-FIRE-001': ['High burn severity and partial NDVI recovery', 'Where steep slopes have dNBR > 0.44 and recovery still trails the control plot after four years, coordinate erosion control and check natural regeneration and seedling survival with forestry field teams.', 'Distinguish shrub and herbaceous regrowth from Turkish pine recovery with field observations.'],
  'RULE-AGRI-001': ['Declining parcel indices and regional drought context', 'Ask an agronomist or soil specialist to verify leaf water stress and soil moisture at parcel scale.', 'NDVI and NDMI do not measure yield or diagnose disease. Regional SMAP and ERA5 records alone are insufficient for parcel irrigation decisions.'],
  'RULE-FLOOD-001': ['Lower SAR backscatter and anomalous water extent after rain', 'Ask DSİ and MUSKİ to validate hydraulic models, drainage and high-water marks in affected lowlands.', 'SAR water masks do not measure depth, velocity, or building damage and cannot replace hydraulic modeling.'],
  'RULE-DEFORM-001': ['Slope or ground displacement review', 'Verify SLC coherence and orbital compatibility, then validate displacement with GNSS, total station and geotechnical inclinometer observations.', 'GRD amplitude cannot support interferometry. LOS displacement alone does not establish structural safety.'],
  'RULE-COAST-001': ['Shoreline and beach or dune change', 'Survey coastal profiles and use RTK-GNSS to check areas with detected shoreline shift.', 'Optical observations at 10–30 m resolution are affected by tides and breaking waves. They do not define the statutory shoreline.'],
  'RULE-INDUSTRY-001': ['Land-cover change near mines and energy sites', 'Ask the relevant agencies to compare detected changes with official permit boundaries and rehabilitation plans.', 'Satellite land-cover change does not establish compliance or a legal violation.'],
  'RULE-URBAN-001': ['Settlement expansion and increased built surfaces', 'Request municipal review using higher-resolution orthophotos and field checks in areas with detected development.', 'Satellite classification does not establish individual building permits, parcel boundaries or legal zoning.']
};
