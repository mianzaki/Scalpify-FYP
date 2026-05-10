from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum
import uuid

class AnalysisStatus(str, Enum):
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class SeverityLevel(str, Enum):
    MINIMAL = "Minimal"
    MILD = "Mild"
    MODERATE = "Moderate"
    SEVERE = "Severe"

class NorwoodScale(str, Enum):
    I = "I"
    I_II = "I-II"
    II = "II"
    III = "III"
    III_A = "III-A"
    III_IV = "III-IV"
    IV = "IV"
    IV_A = "IV-A"
    V = "V"
    V_VI = "V-VI"
    VI = "VI"
    VII = "VII"

# Request Models
class AnalysisOptions(BaseModel):
    save_annotated: bool = Field(default=True, description="Save annotated image")
    include_visualization: bool = Field(default=True, description="Include visualization data")
    measurement_units: List[str] = Field(default=["cm2", "inch2"], description="Measurement units to include")
    confidence_threshold: float = Field(default=0.4, ge=0.1, le=1.0, description="Detection confidence threshold")
    boundary_points_only: bool = Field(default=False, description="Return only boundary points for lightweight response")
    target_height: int = Field(default=512, ge=224, le=4096, description="Target image height in pixels for coordinate mapping")
    target_width: int = Field(default=512, ge=224, le=4096, description="Target image width in pixels for coordinate mapping")

    class Config:
        schema_extra = {
            "example": {
                "save_annotated": True,
                "include_visualization": True,
                "measurement_units": ["cm2", "inch2"],
                "confidence_threshold": 0.4,
                "boundary_points_only": False,
                "target_height": 512,
                "target_width": 512
            }
        }

# Response Models
class ImageInfo(BaseModel):
    filename: str
    file_size: int
    mime_type: str
    dimensions: Dict[str, int]  # {"width": 1920, "height": 1080}

class DetectionInfo(BaseModel):
    regions_detected: Dict[str, int]  # {"bald": 1, "hair": 1, "total": 2}
    confidence_scores: Dict[str, float]  # {"bald": 0.94, "hair": 0.89, "average": 0.915}
    quality_score: float = Field(ge=0, le=1)

class AreaMeasurements(BaseModel):
    pixels: Dict[str, int]  # {"bald": 128456, "hair": 356789, "total_head": 485245}
    cm2: Dict[str, float]   # {"bald": 52.4, "hair": 145.6, "total_head": 198.0}
    inch2: Dict[str, float] # {"bald": 8.12, "hair": 22.57, "total_head": 30.69}
    percentage: Dict[str, float]  # {"baldness_ratio": 26.5, "hair_coverage": 73.5}

class Classification(BaseModel):
    severity: SeverityLevel
    severity_score: int = Field(ge=0, le=4, description="Numeric severity (0-4)")
    norwood_scale: Optional[NorwoodScale] = None
    norwood_details: Optional[str] = None
    confidence: float = Field(ge=0, le=1)
    recommendations: List[str] = []

class VisualizationData(BaseModel):
    annotated_image_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    overlay_data: Optional[Dict[str, str]] = None  # Base64 encoded masks

class FileUrls(BaseModel):
    original: Dict[str, str]  # {"url": "...", "expires_at": "..."}
    annotated: Optional[Dict[str, str]] = None
    report_pdf: Optional[Dict[str, str]] = None

# Coordinate Models
class BoundaryPoint(BaseModel):
    x: int
    y: int
    curve_index: int = 0

class SegmentGeometry(BaseModel):
    area_pixels: float
    perimeter_pixels: float
    bounding_box: Dict[str, int]  # {"x": 100, "y": 200, "width": 150, "height": 120}
    centroid: Dict[str, float]    # {"x": 175.5, "y": 260.3}

class SegmentCoordinates(BaseModel):
    boundary_points: List[BoundaryPoint]
    simplified_boundary: List[BoundaryPoint]
    convex_hull: List[BoundaryPoint]
    geometry: SegmentGeometry

class CoordinateSpace(BaseModel):
    width: int
    height: int
    note: str

class CoordinateData(BaseModel):
    bald_segments: Optional[List[SegmentCoordinates]] = None
    hair_segments: Optional[List[SegmentCoordinates]] = None
    bald_boundary_points: Optional[List[BoundaryPoint]] = None  # For boundary_points_only mode
    hair_boundary_points: Optional[List[BoundaryPoint]] = None  # For boundary_points_only mode
    boundary_points_only: Optional[bool] = False
    coordinate_space: Optional[CoordinateSpace] = None
    summary: Optional[Dict[str, Any]] = None

class ProcessingMetadata(BaseModel):
    model_version: str
    api_version: str
    processing_device: str
    region: Optional[str] = None
    estimated_pixels_per_cm: Optional[float] = None

class ProblemSeverity(BaseModel):
    severity_percentage: float
    level: str
    urgency: str
    action_needed: str
    description: str
    factors_considered: Dict[str, Any]

class HairHealth(BaseModel):
    health_percentage: float
    grade: str
    status: str
    recommendation: str
    risk_level: str
    detailed_metrics: Dict[str, Any]
    health_indicators: Dict[str, Any]

class AnalysisResponse(BaseModel):
    success: bool
    status: AnalysisStatus
    session_id: uuid.UUID
    timestamp: datetime
    processing_time_ms: float
    
    image_info: ImageInfo
    detection: DetectionInfo
    measurements: AreaMeasurements
    classification: Classification
    problem_severity: Optional[ProblemSeverity] = None
    hair_health: Optional[HairHealth] = None
    coordinates: Optional[CoordinateData] = None
    visualization: Optional[VisualizationData] = None
    files: Optional[FileUrls] = None
    metadata: ProcessingMetadata
    
    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "status": "completed",
                "session_id": "550e8400-e29b-41d4-a716-446655440000",
                "timestamp": "2025-01-24T14:30:45.123Z",
                "processing_time_ms": 1247.5,
                "image_info": {
                    "filename": "patient_photo.jpg",
                    "file_size": 2457600,
                    "mime_type": "image/jpeg",
                    "dimensions": {"width": 1920, "height": 1080}
                },
                "detection": {
                    "regions_detected": {"bald": 1, "hair": 1, "total": 2},
                    "confidence_scores": {"bald": 0.94, "hair": 0.89, "average": 0.915},
                    "quality_score": 0.87
                },
                "measurements": {
                    "pixels": {"bald": 128456, "hair": 356789, "total_head": 485245},
                    "cm2": {"bald": 52.4, "hair": 145.6, "total_head": 198.0},
                    "inch2": {"bald": 8.12, "hair": 22.57, "total_head": 30.69},
                    "percentage": {"baldness_ratio": 26.5, "hair_coverage": 73.5}
                },
                "classification": {
                    "severity": "Mild",
                    "severity_score": 2,
                    "norwood_scale": "III",
                    "confidence": 0.89,
                    "recommendations": ["Early stage detected", "Monitor progress"]
                }
            }
        }

# Error Response Models
class ErrorDetail(BaseModel):
    code: str
    message: str
    details: Optional[Dict[str, Any]] = None

class ErrorResponse(BaseModel):
    success: bool = False
    status: str = "error"
    error: ErrorDetail
    session_id: Optional[uuid.UUID] = None
    timestamp: datetime

# History Models
class AnalysisHistoryItem(BaseModel):
    session_id: uuid.UUID
    created_at: datetime
    filename: str
    baldness_ratio: float
    severity: SeverityLevel
    norwood_scale: Optional[NorwoodScale] = None
    annotated_image_url: Optional[str] = None

class ProgressionData(BaseModel):
    current_baldness: float
    initial_baldness: float
    change_percentage: float
    trend: str  # "stable", "improving", "worsening", "gradual_increase"
    months_tracked: int

class HistoryResponse(BaseModel):
    success: bool
    user_id: str
    total_analyses: int
    results: List[AnalysisHistoryItem]
    progression: Optional[ProgressionData] = None

# Batch Analysis Models
class BatchAnalysisItem(BaseModel):
    filename: str
    session_id: uuid.UUID
    status: AnalysisStatus
    baldness_ratio: Optional[float] = None
    severity: Optional[SeverityLevel] = None
    norwood_scale: Optional[NorwoodScale] = None
    annotated_url: Optional[str] = None
    error_message: Optional[str] = None

class BatchSummary(BaseModel):
    average_baldness: float
    severity_distribution: Dict[str, int]
    processing_stats: Dict[str, float]

class BatchAnalysisResponse(BaseModel):
    success: bool
    batch_id: str
    total_images: int
    processed: int
    failed: int
    total_processing_time_ms: float
    results: List[BatchAnalysisItem]
    summary: Optional[BatchSummary] = None
    download_links: Optional[Dict[str, str]] = None

# Health Check Models
class HealthResponse(BaseModel):
    status: str
    version: str
    timestamp: datetime
    database_status: str
    storage_status: str
    model_status: str

class ModelInfo(BaseModel):
    name: str
    version: str
    classes: Dict[int, str]
    input_size: List[int]
    confidence_threshold: float
    iou_threshold: float

# Hair Journey Generation Models
class HairJourneyStatus(str, Enum):
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class HairJourneyOptions(BaseModel):
    iterations: int = Field(default=5, ge=1, le=20, description="Number of inpainting iterations")
    save_intermediate: bool = Field(default=True, description="Save intermediate results")
    quality_mode: str = Field(default="balanced", description="Quality mode: fast, balanced, high")
    
    class Config:
        schema_extra = {
            "example": {
                "iterations": 10,
                "save_intermediate": True,
                "quality_mode": "balanced"
            }
        }

class IterationResult(BaseModel):
    iteration_number: int
    image_url: str
    mask_url: Optional[str] = None  # Optional since Qwen Edit Plus doesn't use masks
    processing_time_ms: float
    timestamp: datetime

class HairJourneyResult(BaseModel):
    session_id: uuid.UUID
    original_image_url: str
    final_result_url: str
    iterations: List[IterationResult]
    total_processing_time_ms: float
    view_type: str  # "front" or "back"
    
class HairJourneyResponse(BaseModel):
    success: bool
    status: HairJourneyStatus
    session_id: uuid.UUID
    timestamp: datetime
    processing_time_ms: float
    
    result: Optional[HairJourneyResult] = None
    error_message: Optional[str] = None
    
    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "status": "completed",
                "session_id": "550e8400-e29b-41d4-a716-446655440001",
                "timestamp": "2025-01-24T15:30:45.123Z",
                "processing_time_ms": 25000.5,
                "result": {
                    "session_id": "550e8400-e29b-41d4-a716-446655440001",
                    "original_image_url": "https://supabase.co/storage/.../original.jpg",
                    "final_result_url": "https://supabase.co/storage/.../final_result.jpg",
                    "iterations": [
                        {
                            "iteration_number": 1,
                            "image_url": "https://supabase.co/storage/.../iter_1.jpg",
                            "mask_url": "https://supabase.co/storage/.../mask_1.jpg",
                            "processing_time_ms": 2500.0,
                            "timestamp": "2025-01-24T15:30:47.123Z"
                        }
                    ],
                    "total_processing_time_ms": 25000.5,
                    "view_type": "front"
                }
            }
        }

class HairJourneyHistoryItem(BaseModel):
    session_id: uuid.UUID
    created_at: datetime
    original_filename: str
    iterations_count: int
    view_type: str
    final_result_url: str
    processing_time_ms: float

class HairJourneyHistoryResponse(BaseModel):
    success: bool
    user_id: str
    total_sessions: int
    results: List[HairJourneyHistoryItem]

# Facial Recognition Models
class FacialLandmark(BaseModel):
    type: str
    x: int
    y: int
    x_ratio: float
    y_ratio: float

class FaceBoundingBox(BaseModel):
    left: int
    top: int
    width: int
    height: int

class EmotionData(BaseModel):
    Type: str
    Confidence: float

class PoseData(BaseModel):
    Roll: Optional[float] = None
    Yaw: Optional[float] = None
    Pitch: Optional[float] = None

class QualityData(BaseModel):
    Brightness: Optional[float] = None
    Sharpness: Optional[float] = None

class AttributeData(BaseModel):
    Value: Optional[bool] = None
    Confidence: Optional[float] = None

class GenderData(BaseModel):
    Value: Optional[str] = None
    Confidence: Optional[float] = None

class AgeRangeData(BaseModel):
    Low: Optional[int] = None
    High: Optional[int] = None

class FaceAttributes(BaseModel):
    confidence: float
    age_range: Optional[AgeRangeData] = None
    gender: Optional[GenderData] = None
    emotions: Optional[List[EmotionData]] = None
    pose: Optional[PoseData] = None
    quality: Optional[QualityData] = None
    smile: Optional[AttributeData] = None
    eyeglasses: Optional[AttributeData] = None
    sunglasses: Optional[AttributeData] = None
    beard: Optional[AttributeData] = None
    mustache: Optional[AttributeData] = None
    eyes_open: Optional[AttributeData] = None
    mouth_open: Optional[AttributeData] = None

class FaceData(BaseModel):
    face_id: int
    bounding_box: FaceBoundingBox
    landmarks: List[FacialLandmark]
    attributes: FaceAttributes

class FacialRecognitionImageInfo(BaseModel):
    filename: str
    dimensions: Dict[str, int]
    original_dimensions: Dict[str, int]

class FacialRecognitionResponse(BaseModel):
    success: bool
    status: str
    session_id: uuid.UUID
    timestamp: datetime
    processing_time_ms: float
    aws_processing_time_ms: float

    face_count: int
    faces: List[FaceData]
    image_info: FacialRecognitionImageInfo

    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "status": "completed",
                "session_id": "550e8400-e29b-41d4-a716-446655440000",
                "timestamp": "2025-01-24T14:30:45.123Z",
                "processing_time_ms": 1247.5,
                "aws_processing_time_ms": 850.2,
                "face_count": 1,
                "faces": [
                    {
                        "face_id": 1,
                        "bounding_box": {
                            "left": 120,
                            "top": 80,
                            "width": 200,
                            "height": 250
                        },
                        "landmarks": [
                            {
                                "type": "eyeLeft",
                                "x": 180,
                                "y": 150,
                                "x_ratio": 0.352,
                                "y_ratio": 0.293
                            }
                        ],
                        "attributes": {
                            "confidence": 99.95,
                            "age_range": {"Low": 25, "High": 35},
                            "gender": {"Value": "Male", "Confidence": 98.5}
                        }
                    }
                ],
                "image_info": {
                    "filename": "patient_photo.jpg",
                    "dimensions": {"width": 512, "height": 512},
                    "original_dimensions": {"width": 512, "height": 512}
                }
            }
        }