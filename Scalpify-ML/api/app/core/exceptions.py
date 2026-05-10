from fastapi import HTTPException, status
from typing import Any, Dict, Optional

class GASPException(HTTPException):
    """Base exception for GASP-AI API"""
    def __init__(
        self,
        status_code: int,
        detail: str,
        error_code: str,
        headers: Optional[Dict[str, str]] = None,
        extra_data: Optional[Dict[str, Any]] = None
    ):
        super().__init__(status_code=status_code, detail=detail, headers=headers)
        self.error_code = error_code
        self.extra_data = extra_data or {}

class InvalidFileTypeException(GASPException):
    def __init__(self, received_type: str, allowed_types: list[str]):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File type not supported",
            error_code="INVALID_FILE_TYPE",
            extra_data={
                "received_type": received_type,
                "allowed_types": allowed_types
            }
        )

class FileTooLargeException(GASPException):
    def __init__(self, file_size: int, max_size: int):
        super().__init__(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds maximum limit",
            error_code="FILE_TOO_LARGE",
            extra_data={
                "file_size": file_size,
                "max_size": max_size
            }
        )

class ImageProcessingException(GASPException):
    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail,
            error_code="IMAGE_PROCESSING_ERROR"
        )

class DetectionFailedException(GASPException):
    def __init__(self, reason: str = "No scalp/head region detected"):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=reason,
            error_code="DETECTION_FAILED",
            extra_data={
                "suggestion": "Please ensure the image clearly shows the head/scalp area"
            }
        )

class AnalysisFailedException(GASPException):
    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Analysis failed: {detail}",
            error_code="ANALYSIS_FAILED"
        )

class RateLimitExceededException(GASPException):
    def __init__(self, limit: int, window: int, retry_after: int):
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please try again later.",
            error_code="RATE_LIMIT_EXCEEDED",
            extra_data={
                "limit": limit,
                "window": f"{window} seconds",
                "retry_after": retry_after
            },
            headers={"Retry-After": str(retry_after)}
        )