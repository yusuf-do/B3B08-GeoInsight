"""
Muğla GeoInsight - Python FastAPI Reference Service (TDD Section 3 & Section 10)
Provides the Python FastAPI counterpart to apps/api/src/server.mjs for environments
running Python + GDAL/Rasterio + PostGIS + Celery.
"""
from datetime import datetime
from typing import Dict, List, Optional
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(
    title="Muğla GeoInsight API",
    version="0.2.0",
    description="Coğrafi istihbarat, çevresel izleme ve karar destek platformu REST API"
)


class PeriodFilter(BaseModel):
    start: str = Field(default="2021-01-01")
    end: str = Field(default="2026-11-14")


class CatalogSearchRequest(BaseModel):
    aoi_id: str
    module: str
    period: PeriodFilter
    max_cloud_cover: Optional[float] = 20.0


class AnalysisJobRequest(BaseModel):
    aoi_id: str
    module: str
    period: PeriodFilter
    options: Optional[Dict] = None


class AssistantQueryRequest(BaseModel):
    query: str
    aoi_id: Optional[str] = "aoi_dalyan_wetland"
    module: Optional[str] = "water"
    role: str = "researcher"


@app.get("/api/v1/health")
def health_check():
    return {
        "status": "ok",
        "service": "mugla-geoinsight-fastapi",
        "crs_standard": {"storage": "EPSG:4326", "metric": "EPSG:32635", "web": "EPSG:3857"},
        "timestamp": datetime.utcnow().isoformat() + "Z"
    }
