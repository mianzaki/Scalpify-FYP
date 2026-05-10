from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request, Depends
from fastapi.responses import JSONResponse
from typing import Optional
import json
import logging
import time
import uuid
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

from app.core.config import get_settings
from app.core.exceptions import (
    InvalidFileTypeException,
    FileTooLargeException,
    GASPException
)
from app.core.supabase_client import supabase_client
from app.models.schemas import (
    AnalysisResponse, 
    ErrorResponse, 
    AnalysisOptions,
    HistoryResponse
)
from app.services.analysis_service import AnalysisService

router = APIRouter()
settings = get_settings()

# Initialize analysis service
analysis_service = AnalysisService()

def validate_upload_file(file: UploadFile) -> None:
    """Validate uploaded file"""
    # Check file size
    if hasattr(file, 'size') and file.size and file.size > settings.MAX_FILE_SIZE:
        raise FileTooLargeException(file.size, settings.MAX_FILE_SIZE)
    
    # Check content type
    if file.content_type not in settings.ALLOWED_MIME_TYPES:
        raise InvalidFileTypeException(
            file.content_type, 
            list(settings.ALLOWED_MIME_TYPES)
        )
    
    # Check file extension
    if file.filename:
        file_ext = '.' + file.filename.split('.')[-1].lower()
        if file_ext not in settings.ALLOWED_EXTENSIONS:
            raise InvalidFileTypeException(
                file_ext,
                list(settings.ALLOWED_EXTENSIONS)
            )

@router.post("/analyze", response_model=AnalysisResponse)
async def analyze_image(
    file: UploadFile = File(..., description="Image file (JPG, PNG, BMP)"),
    user_id: Optional[str] = Form(None, description="Optional user identifier"),
    height: Optional[int] = Form(512, ge=224, le=4096, description="Target image height in pixels (default: 512)"),
    width: Optional[int] = Form(512, ge=224, le=4096, description="Target image width in pixels (default: 512)"),
    options: Optional[str] = Form(default="", description="Analysis options as JSON string (optional, leave empty for defaults)"),
    request: Request = None
) -> AnalysisResponse:
    """
    Analyze a single image for baldness detection and measurement

    - **file**: Image file to analyze (JPG, PNG, BMP)
    - **user_id**: Optional user identifier for history tracking
    - **height**: Target image height in pixels for coordinate mapping (default: 512, min: 224, max: 4096)
    - **width**: Target image width in pixels for coordinate mapping (default: 512, min: 224, max: 4096)
    - **options**: Optional JSON string with analysis preferences

    Returns detailed analysis including:
    - Baldness ratio and severity classification
    - Area measurements in multiple units
    - Annotated visualization
    - Norwood scale classification
    - Coordinates mapped to specified height x width dimensions
    """
    
    start_time = time.time()
    session_id = None
    
    try:
        # Validate file
        validate_upload_file(file)
        
        # Parse options - handle all possible empty/null/default cases
        analysis_options = {}
        
        if options is not None:
            options_trimmed = options.strip()
            
            # Handle common default/placeholder values from Swagger UI
            if options_trimmed and options_trimmed not in ["string", "", "null", "undefined"]:
                try:
                    analysis_options = json.loads(options_trimmed)
                except json.JSONDecodeError as e:
                    raise HTTPException(400, f"Invalid JSON in options field. Expected valid JSON object or leave empty. Error: {str(e)}")
        
        # Get client info
        client_ip = request.client.host if request else None
        user_agent = request.headers.get("user-agent") if request else None
        
        # Create session in database
        session = await supabase_client.create_session(
            user_id=user_id,
            ip_address=client_ip,
            user_agent=user_agent
        )
        session_id = session["id"]
        
        # Read file contents
        contents = await file.read()
        
        # Validate file size after reading
        if len(contents) > settings.MAX_FILE_SIZE:
            raise FileTooLargeException(len(contents), settings.MAX_FILE_SIZE)
        
        # Add height and width to analysis options
        analysis_options['target_height'] = height
        analysis_options['target_width'] = width

        # Run analysis
        analysis_result = await analysis_service.process_full_analysis(
            contents,
            file.filename,
            analysis_options
        )
        
        # Upload 512x512 standardized original image to storage
        original_path = f"uploads/{session_id}/{file.filename}"
        original_url = None
        if analysis_result.get("original_image_path"):
            try:
                # Read the 512x512 standardized original image
                with open(analysis_result["original_image_path"], 'rb') as f:
                    standardized_original_contents = f.read()
                
                original_url = await supabase_client.upload_file(
                    standardized_original_contents,
                    original_path,
                    bucket=settings.STORAGE_BUCKET_UPLOADS,
                    content_type="image/jpeg"
                )
            except Exception as e:
                print(f"Warning: Could not upload standardized original image: {e}")
                # Fallback to original uploaded content
                original_url = await supabase_client.upload_file(
                    contents,
                    original_path,
                    bucket=settings.STORAGE_BUCKET_UPLOADS,
                    content_type=file.content_type
                )
        
        # Upload annotated image if available
        annotated_url = None
        if analysis_result.get("annotated_image_path"):
            try:
                # Read the annotated image file
                with open(analysis_result["annotated_image_path"], 'rb') as f:
                    annotated_contents = f.read()
                
                annotated_path = f"processed/{session_id}/annotated_{file.filename}"
                annotated_url = await supabase_client.upload_file(
                    annotated_contents,
                    annotated_path,
                    bucket=settings.STORAGE_BUCKET_PROCESSED,
                    content_type="image/jpeg"
                )
            except Exception as e:
                print(f"Warning: Could not upload annotated image: {e}")
        
        # Calculate total processing time
        processing_time_ms = (time.time() - start_time) * 1000
        
        # Prepare data for database
        analysis_result["filename"] = file.filename
        analysis_result["original_image_path"] = original_path
        analysis_result["annotated_image_path"] = annotated_path if annotated_url else None
        analysis_result["file_size"] = len(contents)
        analysis_result["mime_type"] = file.content_type
        
        # Save to database
        await supabase_client.save_analysis_result(session_id, analysis_result)
        
        # Update session status
        await supabase_client.update_session_status(
            session_id, 
            "completed", 
            int(processing_time_ms)
        )
        
        # Build response
        print("🔄 Building response data...")
        response_data = {
            "success": True,
            "status": "completed",
            "session_id": session_id,
            "timestamp": datetime.utcnow(),
            "processing_time_ms": processing_time_ms,
            
            "image_info": {
                "filename": file.filename,
                "file_size": len(contents),
                "mime_type": file.content_type,
                "dimensions": {
                    "width": width,
                    "height": height
                },
                "original_dimensions": {
                    "width": analysis_result["image_info"].get("original_dimensions", {}).get("width", analysis_result["image_info"]["dimensions"]["width"]),
                    "height": analysis_result["image_info"].get("original_dimensions", {}).get("height", analysis_result["image_info"]["dimensions"]["height"])
                },
                "standardized": True
            },
            
            "detection": analysis_result["detection"],
            "measurements": analysis_result["measurements"],
            "classification": analysis_result["classification"],
            "problem_severity": analysis_result.get("problem_severity"),
            "hair_health": analysis_result.get("hair_health"),
            "coordinates": analysis_result.get("coordinates"),
            
            "visualization": {
                "annotated_image_url": annotated_url,
                "thumbnail_url": None  # Could be implemented
            } if annotated_url else None,
            
            "files": {
                "original": {
                    "url": original_url,
                    "expires_at": (datetime.utcnow() + timedelta(hours=settings.FILE_EXPIRY_HOURS)).isoformat()
                },
                "annotated": {
                    "url": annotated_url,
                    "expires_at": (datetime.utcnow() + timedelta(hours=settings.FILE_EXPIRY_HOURS)).isoformat()
                } if annotated_url else None
            },
            
            "metadata": analysis_result["metadata"]
        }
        
        print("🔄 Creating AnalysisResponse...")
        try:
            response = AnalysisResponse(**response_data)
            print("✅ AnalysisResponse created successfully!")
            return response
        except Exception as e:
            print(f"❌ Failed to create AnalysisResponse: {e}")
            print(f"Response data: {response_data}")
            raise
        
    except GASPException as e:
        # Update session with error if it was created
        if session_id:
            await supabase_client.update_session_status(
                session_id, 
                "failed", 
                error_message=str(e.detail)
            )
        
        return JSONResponse(
            status_code=e.status_code,
            content={
                "success": False,
                "status": "error",
                "error": {
                    "code": e.error_code,
                    "message": e.detail,
                    "details": e.extra_data
                },
                "session_id": session_id,
                "timestamp": datetime.utcnow().isoformat()
            }
        )
        
    except Exception as e:
        # Log the real exception server-side; do NOT echo it to the client.
        logger.exception("Unhandled error in /analyze (session_id=%s)", session_id)
        if session_id:
            await supabase_client.update_session_status(
                session_id,
                "failed",
                error_message=str(e)
            )

        # In DEBUG, surface the message to make local debugging easier.
        client_message = (
            f"An unexpected error occurred: {str(e)}"
            if settings.DEBUG
            else "An unexpected error occurred. Please try again later."
        )
        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "status": "error",
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": client_message,
                    "details": {}
                },
                "session_id": session_id,
                "timestamp": datetime.utcnow().isoformat()
            }
        )

@router.get("/analysis/{session_id}")
async def get_analysis_result(session_id: str):
    """
    Get analysis result by session ID
    """
    try:
        result = await supabase_client.get_analysis_result(session_id)
        
        if not result:
            raise HTTPException(404, f"Analysis not found for session: {session_id}")
        
        return {
            "success": True,
            "result": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to retrieve analysis: {str(e)}")

@router.get("/history", response_model=HistoryResponse)
async def get_analysis_history(
    user_id: str,
    limit: int = 10
):
    """
    Get user's analysis history
    
    - **user_id**: User identifier
    - **limit**: Number of results to return (default: 10, max: 50)
    """
    try:
        if limit > 50:
            limit = 50
            
        history = await supabase_client.get_user_history(user_id, limit)
        
        # Process history data
        results = []
        baldness_values = []
        
        for item in history:
            if item.get('baldness_ratio'):
                baldness_values.append(item['baldness_ratio'])
            
            results.append({
                "session_id": item['session_id'],
                "created_at": item['created_at'],
                "filename": item['filename'] or "unknown.jpg",
                "baldness_ratio": float(item.get('baldness_ratio') or 0),
                "severity": item.get('severity') or "Unknown",
                "norwood_scale": item.get('norwood_scale'),
                "annotated_image_url": None  # Could be constructed from path
            })
        
        # Calculate progression if we have multiple data points
        progression = None
        if len(baldness_values) >= 2:
            current = baldness_values[0]  # Most recent
            initial = baldness_values[-1]  # Oldest
            change = current - initial
            
            progression = {
                "current_baldness": current,
                "initial_baldness": initial,
                "change_percentage": change,
                "trend": "stable" if abs(change) < 2 else ("worsening" if change > 0 else "improving"),
                "months_tracked": len(baldness_values)
            }
        
        return HistoryResponse(
            success=True,
            user_id=user_id,
            total_analyses=len(results),
            results=results,
            progression=progression
        )
        
    except Exception as e:
        raise HTTPException(500, f"Failed to retrieve history: {str(e)}")