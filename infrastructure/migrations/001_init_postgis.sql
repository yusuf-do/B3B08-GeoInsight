-- Muğla GeoInsight - PostgreSQL 16 + PostGIS 3.4 + pgvector Database Schema
-- Implements TDD Section 6 (12 Core Tables) & ADR-001 (EPSG:4326 Storage / EPSG:32635 Metric Analysis)

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Organizations
CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    organization_type VARCHAR(64) NOT NULL CHECK (organization_type IN ('university', 'municipality', 'public_agency', 'enterprise', 'cooperative', 'individual')),
    data_sharing_tier VARCHAR(64) DEFAULT 'open_only',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Users (RBAC for 6 PRD Personas)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(64) NOT NULL CHECK (role IN ('researcher', 'municipality', 'investor', 'farmer', 'citizen', 'executive', 'admin')),
    organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Locations (Muğla Province, 13 Districts, Neighborhoods)
CREATE TABLE IF NOT EXISTS locations (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    admin_level INTEGER NOT NULL,
    geom GEOMETRY(MultiPolygon, 4326) NOT NULL,
    centroid GEOMETRY(Point, 4326),
    area_ha NUMERIC(12, 2) GENERATED ALWAYS AS (ST_Area(ST_Transform(geom, 32635)) / 10000.0) STORED
);
CREATE INDEX IF NOT EXISTS idx_locations_geom ON locations USING GIST (geom);

-- 4. Areas of Interest (Pilot AOIs & User Custom Polygons - Private by default per PRD Section 11)
CREATE TABLE IF NOT EXISTS areas_of_interest (
    id VARCHAR(64) PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    module VARCHAR(64),
    visibility VARCHAR(32) NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'organization', 'public')),
    geom GEOMETRY(Polygon, 4326) NOT NULL,
    bbox JSONB NOT NULL,
    area_ha NUMERIC(12, 2) GENERATED ALWAYS AS (ST_Area(ST_Transform(geom, 32635)) / 10000.0) STORED,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_aoi_geom ON areas_of_interest USING GIST (geom);

-- 5. Datasets (Catalog & License Registry)
CREATE TABLE IF NOT EXISTS datasets (
    id VARCHAR(64) PRIMARY KEY,
    provider VARCHAR(128) NOT NULL,
    collection VARCHAR(128) NOT NULL,
    product_type VARCHAR(128) NOT NULL,
    spatial_resolution_m NUMERIC(10, 2),
    temporal_coverage_start DATE,
    license VARCHAR(255) NOT NULL,
    redistribution_allowed BOOLEAN NOT NULL DEFAULT FALSE,
    attribution_text TEXT NOT NULL
);

-- 6. Satellite & Environmental Acquisitions (STAC Granules)
CREATE TABLE IF NOT EXISTS acquisitions (
    id VARCHAR(64) PRIMARY KEY,
    dataset_id VARCHAR(64) NOT NULL REFERENCES datasets(id),
    external_product_id VARCHAR(255) UNIQUE NOT NULL,
    observed_at TIMESTAMPTZ NOT NULL,
    footprint GEOMETRY(Polygon, 4326),
    mgrs_tile VARCHAR(16),
    polarization VARCHAR(32),
    orbit INTEGER,
    orbit_direction VARCHAR(16),
    cloud_cover_pct NUMERIC(5, 2),
    maturity VARCHAR(64) NOT NULL,
    checksum_sha256 VARCHAR(64) NOT NULL,
    qc_passed BOOLEAN NOT NULL DEFAULT TRUE,
    qc_flags JSONB NOT NULL DEFAULT '[]'::jsonb,
    storage_uri TEXT
);
CREATE INDEX IF NOT EXISTS idx_acquisitions_observed_at ON acquisitions (observed_at);
CREATE INDEX IF NOT EXISTS idx_acquisitions_footprint ON acquisitions USING GIST (footprint);

-- 7. Asynchronous Analysis Jobs
CREATE TABLE IF NOT EXISTS analysis_jobs (
    id VARCHAR(64) PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    aoi_id VARCHAR(64) NOT NULL REFERENCES areas_of_interest(id) ON DELETE CASCADE,
    module VARCHAR(64) NOT NULL CHECK (module IN ('fire', 'water', 'deformation', 'coast', 'agriculture', 'flood', 'industry', 'urban')),
    parameters JSONB NOT NULL,
    status VARCHAR(32) NOT NULL CHECK (status IN ('queued', 'validating_qc', 'processing', 'evaluating_evidence', 'completed', 'blocked_qc', 'failed')),
    error_code VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 8. Standard Analysis Results (TDD Section 7 Contract)
CREATE TABLE IF NOT EXISTS analysis_results (
    id VARCHAR(64) PRIMARY KEY,
    job_id VARCHAR(64) UNIQUE NOT NULL REFERENCES analysis_jobs(id) ON DELETE CASCADE,
    result_json JSONB NOT NULL,
    confidence VARCHAR(128) NOT NULL,
    evidence_status VARCHAR(64) NOT NULL CHECK (evidence_status IN ('verified', 'supported', 'further_investigation_required', 'insufficient_data')),
    pipeline_version VARCHAR(32) NOT NULL DEFAULT 'mgi-engine-0.2.0',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Derived COG Raster & Vector Layers
CREATE TABLE IF NOT EXISTS raster_layers (
    id VARCHAR(64) PRIMARY KEY,
    result_id VARCHAR(64) NOT NULL REFERENCES analysis_results(id) ON DELETE CASCADE,
    uri TEXT NOT NULL,
    bbox JSONB NOT NULL,
    crs VARCHAR(32) NOT NULL DEFAULT 'EPSG:32635',
    statistics JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 10. Scientific & Institutional RAG Sources
CREATE TABLE IF NOT EXISTS sources (
    id VARCHAR(64) PRIMARY KEY,
    source_type VARCHAR(64) NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL,
    citation TEXT NOT NULL,
    embedding VECTOR(768)
);

-- 11. Deterministic Evidence-Bound Recommendations
CREATE TABLE IF NOT EXISTS recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    result_id VARCHAR(64) NOT NULL REFERENCES analysis_results(id) ON DELETE CASCADE,
    rule_id VARCHAR(64) NOT NULL,
    evidence JSONB NOT NULL,
    confidence VARCHAR(64) NOT NULL,
    non_claim_disclaimer TEXT NOT NULL
);

-- 12. Generated Reports
CREATE TABLE IF NOT EXISTS reports (
    id VARCHAR(64) PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    result_id VARCHAR(64) NOT NULL REFERENCES analysis_results(id) ON DELETE CASCADE,
    report_type VARCHAR(64) NOT NULL CHECK (report_type IN ('scientific', 'environmental_municipal', 'agricultural', 'investment_screening', 'strategic_executive')),
    mask_coordinates BOOLEAN NOT NULL DEFAULT FALSE,
    uri TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
