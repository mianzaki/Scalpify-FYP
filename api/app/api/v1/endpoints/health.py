from fastapi import APIRouter, HTTPException
from datetime import datetime
import asyncio
import os

from app.core.config import get_settings
from app.core.supabase_client import supabase_client
from app.models.schemas import HealthResponse, ModelInfo
from app.services.analysis_service import AnalysisService

router = APIRouter()
settings = get_settings()

@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Health check endpoint to verify system status
    
    Returns status of:
    - API service
    - Database connection
    - Storage connection  
    - ML model loading
    """
    
    # Check database
    database_status = "healthy"
    try:
        # Simple database check
        supabase_client.client.table("analysis_sessions").select("id").limit(1).execute()
    except Exception as e:
        database_status = f"error: {str(e)}"
    
    # Check storage
    storage_status = "healthy"
    try:
        # Test storage access
        buckets = supabase_client.client.storage.list_buckets()
        if not buckets:
            storage_status = "warning: no buckets found"
    except Exception as e:
        storage_status = f"error: {str(e)}"
    
    # Check model
    model_status = "healthy"
    try:
        # Test model loading
        analysis_service = AnalysisService()
        model_info = analysis_service.get_model_info()
        if "error" in model_info:
            model_status = model_info["error"]
    except Exception as e:
        model_status = f"error: {str(e)}"
    
    # Determine overall status
    # NOTE: previous version did `"error" in [list]` which checks list membership
    # of the literal string, so it never matched. Use substring check instead.
    statuses = [database_status, storage_status, model_status]
    overall_status = "healthy"
    if any("error" in s for s in statuses):
        overall_status = "unhealthy"
    elif any("warning" in s for s in statuses):
        overall_status = "degraded"
    
    return HealthResponse(
        status=overall_status,
        version=settings.VERSION,
        timestamp=datetime.utcnow(),
        database_status=database_status,
        storage_status=storage_status,
        model_status=model_status
    )

@router.get("/model/info", response_model=ModelInfo)
async def get_model_info():
    """
    Get information about the loaded ML model
    """
    try:
        analysis_service = AnalysisService()
        model_info = analysis_service.get_model_info()
        
        if "error" in model_info:
            raise HTTPException(500, model_info["error"])
        
        return ModelInfo(**model_info)
        
    except Exception as e:
        raise HTTPException(500, f"Failed to get model info: {str(e)}")

@router.get("/ping")
async def ping():
    """
    Simple ping endpoint for basic connectivity test
    """
    return {
        "message": "pong",
        "timestamp": datetime.utcnow().isoformat(),
        "version": settings.VERSION
    }

@router.get("/ready")
async def readiness_probe():
    """
    Kubernetes readiness probe endpoint
    """
    try:
        # Quick checks for critical components
        tasks = [
            _check_database(),
            _check_model()
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Check if any failed
        for result in results:
            if isinstance(result, Exception):
                raise HTTPException(503, f"Service not ready: {str(result)}")
        
        return {"status": "ready"}
        
    except Exception as e:
        raise HTTPException(503, f"Service not ready: {str(e)}")

@router.get("/live")  
async def liveness_probe():
    """
    Kubernetes liveness probe endpoint
    """
    return {"status": "alive"}

# Helper functions for health checks
async def _check_database():
    """Quick database connectivity check"""
    try:
        result = supabase_client.client.table("analysis_sessions").select("id").limit(1).execute()
        return True
    except Exception as e:
        raise Exception(f"Database check failed: {str(e)}")

async def _check_model():
    """Quick model loading check"""
    try:
        # Check if model file exists
        if not os.path.exists(settings.MODEL_PATH):
            raise Exception(f"Model file not found: {settings.MODEL_PATH}")
        return True
    except Exception as e:
        raise Exception(f"Model check failed: {str(e)}")