from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request
from fastapi.responses import JSONResponse
from typing import Optional
import time
import uuid
from datetime import datetime

from app.core.config import get_settings
from app.core.exceptions import (
    InvalidFileTypeException,
    FileTooLargeException,
    GASPException
)
from app.core.supabase_client import supabase_client
from app.models.schemas import (
    FacialRecognitionResponse,
    ErrorResponse
)
from app.services.facial_recognition_service import FacialRecognitionService

router = APIRouter()
settings = get_settings()

# Initialize facial recognition service
facial_recognition_service = FacialRecognitionService()


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


@router.post("/facial-recognition", response_model=FacialRecognitionResponse)
async def facial_recognition(
    file: UploadFile = File(..., description="Image file (JPG, PNG, BMP)"),
    user_id: Optional[str] = Form(None, description="Optional user identifier"),
    height: Optional[int] = Form(512, ge=224, le=4096, description="Target image height in pixels (default: 512)"),
    width: Optional[int] = Form(512, ge=224, le=4096, description="Target image width in pixels (default: 512)"),
    request: Request = None
) -> FacialRecognitionResponse:
    """
    Perform facial recognition using AWS Rekognition

    - **file**: Image file to analyze (JPG, PNG, BMP)
    - **user_id**: Optional user identifier for history tracking
    - **height**: Target image height in pixels for coordinate mapping (default: 512, min: 224, max: 4096)
    - **width**: Target image width in pixels for coordinate mapping (default: 512, min: 224, max: 4096)

    Returns detailed facial recognition results including:
    - Face count and bounding boxes
    - Facial landmarks (eyes, nose, mouth, etc.) with coordinates
    - Facial attributes (age range, gender, emotions, pose, quality)
    - Coordinates mapped to specified height x width dimensions
    """

    start_time = time.time()
    session_id = None

    try:
        # Validate file
        validate_upload_file(file)

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

        # Run facial recognition
        recognition_result = await facial_recognition_service.process_facial_recognition(
            contents,
            file.filename,
            target_width=width,
            target_height=height
        )

        # Calculate total processing time
        processing_time_ms = (time.time() - start_time) * 1000

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
            "aws_processing_time_ms": recognition_result["aws_processing_time_ms"],
            "face_count": recognition_result["face_count"],
            "faces": recognition_result["faces"],
            "image_info": recognition_result["image_info"]
        }

        print("🔄 Creating FacialRecognitionResponse...")
        try:
            response = FacialRecognitionResponse(**response_data)
            print("✅ FacialRecognitionResponse created successfully!")
            return response
        except Exception as e:
            print(f"❌ Failed to create FacialRecognitionResponse: {e}")
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
        # Update session with error if it was created
        if session_id:
            await supabase_client.update_session_status(
                session_id,
                "failed",
                error_message=str(e)
            )

        return JSONResponse(
            status_code=500,
            content={
                "success": False,
                "status": "error",
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": f"An unexpected error occurred: {str(e)}",
                    "details": {}
                },
                "session_id": session_id,
                "timestamp": datetime.utcnow().isoformat()
            }
        )


@router.get("/facial-recognition/{session_id}")
async def get_facial_recognition_result(session_id: str):
    """
    Get facial recognition result by session ID
    """
    try:
        result = await supabase_client.get_analysis_result(session_id)

        if not result:
            raise HTTPException(404, f"Facial recognition not found for session: {session_id}")

        return {
            "success": True,
            "result": result
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Failed to retrieve facial recognition result: {str(e)}")
