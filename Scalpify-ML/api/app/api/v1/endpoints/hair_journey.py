from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Form
from fastapi.responses import JSONResponse
from typing import Optional
import uuid
import tempfile
import os
import time
from datetime import datetime

from app.models.schemas import (
    HairJourneyOptions, HairJourneyResponse, HairJourneyStatus,
    HairJourneyHistoryResponse, ErrorResponse, ErrorDetail
)
from app.services.hair_journey_service import hair_journey_service
from app.core.config import get_settings

router = APIRouter()
settings = get_settings()

@router.post("/hair-journey/generate", response_model=HairJourneyResponse)
async def generate_hair_journey(
    image: UploadFile = File(..., description="Input image for hair journey generation")
):
    """
    Generate hair journey visualization showing progressive FUE hair transplant stages

    - **image**: Input image (JPG, PNG, BMP supported)

    Returns a 4-stage hair journey timeline: 15 days, 1 month, 3 months, and
    4 months post-FUE transplant.
    """
    # Check if hair journey service is available
    if not hair_journey_service.enabled:
        raise HTTPException(
            status_code=503,
            detail="Hair journey service not available - REPLICATE_API_TOKEN not configured"
        )

    session_id = uuid.uuid4()
    start_time = time.time()

    try:
        # Validate file
        if not image.content_type or not image.content_type.startswith('image/'):
            raise HTTPException(
                status_code=400,
                detail="Invalid file type. Please upload an image file."
            )
        
        # Check file size
        contents = await image.read()
        if len(contents) > settings.MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Maximum size is {settings.MAX_FILE_SIZE // 1024 // 1024}MB"
            )
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{image.filename.split('.')[-1]}") as tmp_file:
            tmp_file.write(contents)
            tmp_path = tmp_file.name
        
        try:
            # Create options with fixed parameters for 4-stage FUE journey
            options = HairJourneyOptions(
                iterations=6,  # 15d, 1mo, 3mo, 4mo, 6mo, 8mo
                save_intermediate=True,
                quality_mode="balanced"
            )

            # Generate hair journey
            result = await hair_journey_service.generate_hair_journey(
                image_path=tmp_path,
                options=options,
                session_id=session_id
            )
            
            processing_time = (time.time() - start_time) * 1000
            
            return HairJourneyResponse(
                success=True,
                status=HairJourneyStatus.COMPLETED,
                session_id=session_id,
                timestamp=datetime.utcnow(),
                processing_time_ms=processing_time,
                result=result
            )
            
        finally:
            # Clean up temporary file
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)
    
    except HTTPException:
        raise
    except Exception as e:
        processing_time = (time.time() - start_time) * 1000
        
        error_response = HairJourneyResponse(
            success=False,
            status=HairJourneyStatus.FAILED,
            session_id=session_id,
            timestamp=datetime.utcnow(),
            processing_time_ms=processing_time,
            error_message=f"Hair journey generation failed: {str(e)}"
        )

        return JSONResponse(
            status_code=500,
            content=error_response.model_dump(mode='json')  # mode='json' converts UUID to string
        )

@router.get("/hair-journey/history", response_model=HairJourneyHistoryResponse)
async def get_hair_journey_history(
    user_id: str,
    limit: Optional[int] = 20
):
    """
    Get hair journey generation history for a user
    
    - **user_id**: User identifier
    - **limit**: Maximum number of results to return (default: 20)
    
    Returns list of previous hair journey sessions
    """
    try:
        history = await hair_journey_service.get_history(user_id=user_id, limit=limit)
        
        # Convert to response format
        history_items = []
        for item in history:
            history_items.append({
                "session_id": item.get("id"),
                "created_at": datetime.fromisoformat(item.get("created_at", "")),
                "original_filename": f"session_{item.get('id', '')[:8]}.jpg",
                "iterations_count": item.get("iterations_count", 0),
                "view_type": item.get("view_type", "unknown"),
                "final_result_url": item.get("final_result_url", ""),
                "processing_time_ms": item.get("processing_time_ms", 0.0)
            })
        
        return HairJourneyHistoryResponse(
            success=True,
            user_id=user_id,
            total_sessions=len(history_items),
            results=history_items
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch history: {str(e)}"
        )

@router.get("/hair-journey/session/{session_id}")
async def get_hair_journey_session(session_id: str):
    """
    Get details of a specific hair journey session
    
    - **session_id**: Session UUID
    
    Returns complete session details including all iteration results
    """
    try:
        if not hair_journey_service.supabase.enabled:
            raise HTTPException(
                status_code=503,
                detail="Database not available"
            )
            
        response = hair_journey_service.supabase.client.table("hair_journey_sessions")\
            .select("*")\
            .eq("id", session_id)\
            .single()\
            .execute()
        
        if not response.data:
            raise HTTPException(
                status_code=404,
                detail="Session not found"
            )
        
        return {
            "success": True,
            "session": response.data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch session: {str(e)}"
        )

@router.delete("/hair-journey/session/{session_id}")
async def delete_hair_journey_session(session_id: str):
    """
    Delete a hair journey session and associated files
    
    - **session_id**: Session UUID to delete
    
    Returns success status
    """
    try:
        if not hair_journey_service.supabase.enabled:
            raise HTTPException(
                status_code=503,
                detail="Database not available"
            )
            
        # Delete from database
        response = hair_journey_service.supabase.client.table("hair_journey_sessions")\
            .delete()\
            .eq("id", session_id)\
            .execute()
        
        if not response.data:
            raise HTTPException(
                status_code=404,
                detail="Session not found"
            )
        
        # TODO: Delete associated files from Supabase storage
        # This would require listing and deleting all files in the session folder
        
        return {
            "success": True,
            "message": "Session deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete session: {str(e)}"
        )