import sys
import os
import uuid
import time
import io
import json
from typing import Dict, Any, Optional, Tuple
from pathlib import Path

# Add parent directories to path to import YOLO service
project_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
sys.path.append(project_root)

from PIL import Image
import cv2
import numpy as np
from datetime import datetime

from app.core.config import get_settings
from app.core.exceptions import (
    ImageProcessingException, 
    DetectionFailedException, 
    AnalysisFailedException
)
from src.components.bald_area_calculation_service import YOLOTesterWithAnnotations
from app.utils.coordinate_extractor import CoordinateExtractor

settings = get_settings()

class AnalysisService:
    def __init__(self):
        self.model_path = settings.MODEL_PATH
        self.confidence_threshold = settings.CONFIDENCE_THRESHOLD
        self.iou_threshold = settings.IOU_THRESHOLD
        self._yolo_service = None
        self.coordinate_extractor = CoordinateExtractor()
        
    def _get_yolo_service(self):
        """Lazy load YOLO service"""
        if self._yolo_service is None:
            try:
                # Create a temporary output folder for the YOLO service
                temp_output = f"/tmp/gasp_analysis_{uuid.uuid4().hex[:8]}"
                os.makedirs(temp_output, exist_ok=True)
                
                # Convert relative model path to absolute
                if not os.path.isabs(self.model_path):
                    model_path = os.path.join(os.getcwd(), self.model_path)
                else:
                    model_path = self.model_path
                
                print(f"🔍 Loading YOLO model from: {model_path}")
                print(f"📁 Model exists: {os.path.exists(model_path)}")
                
                if not os.path.exists(model_path):
                    raise FileNotFoundError(f"YOLO model not found at: {model_path}")
                
                self._yolo_service = YOLOTesterWithAnnotations(
                    model_path=model_path,
                    output_folder=temp_output
                )
                print("✅ YOLO model loaded successfully")
            except Exception as e:
                print(f"❌ Failed to load YOLO model: {str(e)}")
                raise AnalysisFailedException(f"Failed to initialize YOLO model: {str(e)}")
        return self._yolo_service
    
    def _assess_image_quality(self, image: Image.Image) -> Dict[str, Any]:
        """
        Score brightness/contrast/sharpness so callers can tell when a photo
        is too poor to trust. Returns metrics + a 0-1 overall score.
        Sharpness uses Laplacian variance; values <100 are typically blurry.
        """
        gray = np.array(image.convert("L"))
        brightness = float(gray.mean())
        contrast = float(gray.std())
        sharpness = float(cv2.Laplacian(gray, cv2.CV_64F).var())

        def _score(value, good_range):
            lo, hi = good_range
            if lo <= value <= hi:
                return 1.0
            if value < lo:
                return max(0.0, value / lo)
            return max(0.0, 1.0 - (value - hi) / hi)

        brightness_score = _score(brightness, (60, 200))
        contrast_score = min(1.0, contrast / 50.0)
        sharpness_score = min(1.0, sharpness / 200.0)
        overall = round((brightness_score + contrast_score + sharpness_score) / 3, 4)

        issues = []
        hard_fail = False
        if brightness < 20:
            issues.append("image is too dark")
            hard_fail = True
        elif brightness > 240:
            issues.append("image is overexposed")
            hard_fail = True
        if contrast < 10:
            issues.append("image has very low contrast")
        if sharpness < 20:
            issues.append("image looks blurry")
            hard_fail = True

        return {
            "brightness": round(brightness, 2),
            "contrast": round(contrast, 2),
            "sharpness": round(sharpness, 2),
            "overall": overall,
            "issues": issues,
            "acceptable": overall >= 0.2 and not hard_fail,
        }

    async def validate_image(self, image_bytes: bytes, filename: str) -> Tuple[Image.Image, Dict[str, Any]]:
        """Validate and process uploaded image"""
        try:
            # Open image
            image = Image.open(io.BytesIO(image_bytes))

            # Get image info
            image_info = {
                "filename": filename,
                "file_size": len(image_bytes),
                "mime_type": f"image/{image.format.lower() if image.format else 'unknown'}",
                "dimensions": {
                    "width": image.width,
                    "height": image.height
                }
            }

            # Validate dimensions
            if (image.width < settings.MIN_IMAGE_SIZE[0] or
                image.height < settings.MIN_IMAGE_SIZE[1]):
                raise ImageProcessingException(
                    f"Image too small. Minimum size: {settings.MIN_IMAGE_SIZE[0]}x{settings.MIN_IMAGE_SIZE[1]}"
                )

            if (image.width > settings.MAX_IMAGE_SIZE[0] or
                image.height > settings.MAX_IMAGE_SIZE[1]):
                raise ImageProcessingException(
                    f"Image too large. Maximum size: {settings.MAX_IMAGE_SIZE[0]}x{settings.MAX_IMAGE_SIZE[1]}"
                )

            # Convert to RGB if needed
            if image.mode != 'RGB':
                image = image.convert('RGB')

            # Quality gate: reject obviously bad photos (blurry / too dark / overexposed)
            quality = self._assess_image_quality(image)
            image_info["quality"] = quality
            if not quality["acceptable"]:
                raise ImageProcessingException(
                    "Photo quality too low for reliable analysis: "
                    + "; ".join(quality["issues"])
                    + ". Please retake in good lighting and hold the camera steady."
                )

            return image, image_info

        except Exception as e:
            if isinstance(e, ImageProcessingException):
                raise
            raise ImageProcessingException(f"Invalid image file: {str(e)}")
    
    def _classify_severity(self, baldness_ratio: float) -> Dict[str, Any]:
        """Classify baldness severity based on ratio"""
        if baldness_ratio < 15:
            return {
                "severity": "Minimal",
                "severity_score": 1,
                "norwood_scale": "I-II",
                "norwood_details": "No significant hair loss or minimal recession",
                "recommendations": [
                    "No treatment necessary at this stage",
                    "Monitor for future changes",
                    "Maintain healthy scalp care routine"
                ]
            }
        elif baldness_ratio < 30:
            return {
                "severity": "Mild",
                "severity_score": 2,
                "norwood_scale": "III-IV",
                "norwood_details": "Moderate frontal and temporal recession",
                "recommendations": [
                    "Early stage hair loss detected",
                    "Consider preventive treatments",
                    "Consult with a hair specialist",
                    "Monitor progression every 3-6 months"
                ]
            }
        elif baldness_ratio < 50:
            return {
                "severity": "Moderate",
                "severity_score": 3,
                "norwood_scale": "V-VI",
                "norwood_details": "Significant crown and frontal baldness",
                "recommendations": [
                    "Established hair loss pattern",
                    "Treatment options: medication, transplant",
                    "Professional consultation recommended",
                    "Regular monitoring advised"
                ]
            }
        else:
            return {
                "severity": "Severe",
                "severity_score": 4,
                "norwood_scale": "VII",
                "norwood_details": "Advanced hair loss with minimal remaining hair",
                "recommendations": [
                    "Advanced stage hair loss",
                    "Transplant may be the best option",
                    "Consult hair restoration specialist",
                    "Consider scalp micropigmentation"
                ]
            }
    
    def _calculate_problem_severity(self, baldness_ratio: float, hair_coverage: float) -> Dict[str, Any]:
        """Calculate comprehensive problem severity assessment"""
        
        # Base severity score (0-100)
        base_score = baldness_ratio
        
        # Adjust for hair coverage quality
        hair_quality_factor = 1.0
        if hair_coverage < 30:
            hair_quality_factor = 1.3  # Increase severity if very low hair coverage
        elif hair_coverage < 50:
            hair_quality_factor = 1.15
        elif hair_coverage > 80:
            hair_quality_factor = 0.9  # Decrease severity if good coverage
        
        adjusted_score = min(100, base_score * hair_quality_factor)
        
        # Determine severity level and urgency
        if adjusted_score < 15:
            level = "Minimal"
            urgency = "Low"
            action_needed = "Monitor annually"
            description = "Very mild hair loss with minimal concern"
        elif adjusted_score < 25:
            level = "Mild"
            urgency = "Low"
            action_needed = "Monitor every 6 months"
            description = "Early stage hair loss, preventive measures recommended"
        elif adjusted_score < 40:
            level = "Moderate"
            urgency = "Medium"
            action_needed = "Consult specialist within 3 months"
            description = "Noticeable hair loss, active treatment should be considered"
        elif adjusted_score < 60:
            level = "Severe"
            urgency = "High"
            action_needed = "Seek immediate specialist consultation"
            description = "Significant hair loss requiring prompt intervention"
        else:
            level = "Critical"
            urgency = "Very High"
            action_needed = "Urgent specialist consultation required"
            description = "Advanced hair loss, immediate treatment necessary"
        
        return {
            "severity_percentage": round(adjusted_score, 1),
            "level": level,
            "urgency": urgency,
            "action_needed": action_needed,
            "description": description,
            "factors_considered": {
                "baldness_ratio_percentage": round(baldness_ratio, 1),
                "hair_coverage_percentage": round(hair_coverage, 1),
                "adjustment_factor": hair_quality_factor
            }
        }
    
    def _calculate_hair_health(self, baldness_ratio: float, hair_coverage: float, result: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate comprehensive hair health assessment"""
        
        # Base health score (inverted baldness ratio)
        coverage_score = max(0, 100 - baldness_ratio)
        
        # Hair density assessment
        total_head_area = result.get('areas_pixels', {}).get('total_head', 1)
        hair_area = result.get('areas_pixels', {}).get('hair', 0)
        hair_density = (hair_area / total_head_area * 100) if total_head_area > 0 else 0
        
        # Overall health score (weighted average)
        health_score = (coverage_score * 0.6 + hair_density * 0.4)
        
        # Determine health grade and status
        if health_score >= 85:
            grade = "Excellent"
            status = "Healthy"
            recommendation = "Maintain current hair care routine"
            risk_level = "Very Low"
        elif health_score >= 70:
            grade = "Good"
            status = "Healthy with minor concerns"
            recommendation = "Consider preventive treatments"
            risk_level = "Low"
        elif health_score >= 55:
            grade = "Fair"
            status = "Moderate hair thinning"
            recommendation = "Start active hair care regimen"
            risk_level = "Medium"
        elif health_score >= 40:
            grade = "Poor"
            status = "Significant hair loss"
            recommendation = "Seek professional treatment"
            risk_level = "High"
        else:
            grade = "Critical"
            status = "Severe hair loss"
            recommendation = "Urgent medical intervention needed"
            risk_level = "Very High"
        
        # Hair thickness assessment based on coverage vs area ratio
        thickness_ratio = hair_coverage / max(1, hair_density) if hair_density > 0 else 0
        if thickness_ratio > 1.2:
            thickness = "Thick"
        elif thickness_ratio > 0.9:
            thickness = "Normal"
        elif thickness_ratio > 0.6:
            thickness = "Thin"
        else:
            thickness = "Very Thin"
        
        return {
            "health_percentage": round(health_score, 1),
            "grade": grade,
            "status": status,
            "recommendation": recommendation,
            "risk_level": risk_level,
            "detailed_metrics": {
                "coverage_percentage": round(hair_coverage, 1),
                "density_percentage": round(hair_density, 1),
                "thickness": thickness,
                "thickness_ratio": round(thickness_ratio, 2)
            },
            "health_indicators": {
                "scalp_coverage": "Good" if hair_coverage > 70 else "Moderate" if hair_coverage > 50 else "Poor",
                "hair_distribution": "Even" if hair_density > 60 else "Uneven",
                "overall_condition": grade
            }
        }
    
    async def analyze_image(
        self,
        image: Image.Image,
        image_info: Dict[str, Any],
        options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Run analysis on validated image"""
        start_time = time.time()

        try:
            # Get YOLO service
            print(f"🔄 Starting analysis for image: {image_info.get('filename')}")
            yolo_service = self._get_yolo_service()

            # Get target dimensions from options (defaults to 512 if not provided)
            target_width = options.get('target_width', 512) if options else 512
            target_height = options.get('target_height', 512) if options else 512

            print(f"🔄 Processing image with target dimensions: {target_width}x{target_height}")

            original_width, original_height = image.size

            # Convert to target dimensions (user-specified or default 512x512)
            standardized_image = image.resize((target_width, target_height), Image.LANCZOS)
            image_np = np.array(standardized_image)
            
            # Create temporary files for processing
            temp_filename = f"temp_{uuid.uuid4().hex[:8]}.jpg"
            temp_path = f"/tmp/{temp_filename}"
            standardized_original_path = f"/tmp/standardized_original_{uuid.uuid4().hex[:8]}.jpg"
            
            # Save standardized image temporarily for YOLO processing
            standardized_image.save(temp_path, 'JPEG', quality=95)
            # Also save the standardized original for API response
            standardized_image.save(standardized_original_path, 'JPEG', quality=95)
            
            try:
                # Process with YOLO service
                # Note: This uses the existing analysis logic but we'll extract the data
                result = yolo_service.process_and_annotate_image(temp_path)
                
                if not result:
                    raise DetectionFailedException("No analysis results returned")
                
                # Extract coordinates from segmentation masks
                coordinate_data = None
                try:
                    # Use target dimensions for coordinate space
                    standardized_image_resized = cv2.resize(image_np, (target_width, target_height))

                    # Run YOLO prediction on resized image to get masks
                    yolo_results = yolo_service.model.predict(standardized_image_resized, iou=0.4, verbose=False)
                    if yolo_results[0].masks is not None:
                        masks = yolo_results[0].masks.data.cpu().numpy()
                        classes = yolo_results[0].boxes.cls.cpu().numpy()

                        # Create masks at target resolution
                        bald_mask_combined = np.zeros((target_height, target_width), dtype=np.uint8)
                        hair_mask_combined = np.zeros((target_height, target_width), dtype=np.uint8)

                        for i, class_id in enumerate(classes):
                            # Resize mask to target dimensions
                            mask = cv2.resize(masks[i], (target_width, target_height))
                            mask = (mask > 0.5).astype(np.uint8)

                            if class_id == yolo_service.bald_class_id:
                                bald_mask_combined = np.maximum(bald_mask_combined, mask)
                            elif class_id == yolo_service.hair_class_id:
                                hair_mask_combined = np.maximum(hair_mask_combined, mask)

                        # Extract coordinate data using our coordinate extractor
                        # Check if user requested boundary points only
                        boundary_only = options and options.get('boundary_points_only', False)

                        if boundary_only:
                            bald_boundary_points = self.coordinate_extractor.get_boundary_points_only(
                                bald_mask_combined, simplified=True
                            )
                            hair_boundary_points = self.coordinate_extractor.get_boundary_points_only(
                                hair_mask_combined, simplified=True
                            )
                            coordinate_data = {
                                "bald_boundary_points": bald_boundary_points,
                                "hair_boundary_points": hair_boundary_points,
                                "boundary_points_only": True,
                                "coordinate_space": {
                                    "width": target_width,
                                    "height": target_height,
                                    "note": f"All coordinates are relative to {target_width}x{target_height} image"
                                }
                            }
                        else:
                            coord_result = self.coordinate_extractor.extract_coordinates_data(
                                bald_mask_combined, hair_mask_combined
                            )
                            # Add coordinate space info
                            coord_result["coordinate_space"] = {
                                "width": target_width,
                                "height": target_height,
                                "note": f"All coordinates are relative to {target_width}x{target_height} image"
                            }
                            coordinate_data = coord_result
                except Exception as e:
                    print(f"Warning: Failed to extract coordinates: {str(e)}")
                    coordinate_data = None
                
                # Calculate processing time
                processing_time_ms = (time.time() - start_time) * 1000
                
                # Extract areas and measurements
                areas_cm2 = result.get('areas_cm2', {})
                areas_inch2 = result.get('areas_inch2', {})
                areas_pixels = result.get('areas_pixels', {})
                percentages = result.get('percentages', {})
                
                # Validate that we have the minimum required data
                if not areas_pixels or not percentages:
                    raise DetectionFailedException("Failed to detect scalp regions")
                
                baldness_ratio = percentages.get('baldness_ratio', 0)
                
                # Real per-class confidence from YOLO (replaces previous hardcoded 0.85)
                yolo_confs = result.get('confidences', {}) or {}
                bald_conf = yolo_confs.get('bald_mean', 0.0)
                hair_conf = yolo_confs.get('hair_mean', 0.0)
                # Weight by detected area so the "average" reflects what we're reporting on
                total_px = areas_pixels.get('bald', 0) + areas_pixels.get('hair', 0)
                if total_px > 0:
                    avg_conf = (
                        bald_conf * areas_pixels.get('bald', 0)
                        + hair_conf * areas_pixels.get('hair', 0)
                    ) / total_px
                else:
                    avg_conf = 0.0

                # Get classification (uses real model confidence, not a constant)
                classification = self._classify_severity(baldness_ratio)
                classification['confidence'] = round(avg_conf, 4)
                
                # Calculate Problem Severity and Hair Health
                hair_coverage = percentages.get('hair_coverage', 0)
                problem_severity = self._calculate_problem_severity(baldness_ratio, hair_coverage)
                hair_health = self._calculate_hair_health(baldness_ratio, hair_coverage, result)
                
                # Build comprehensive result
                analysis_result = {
                    # Basic info
                    "session_id": str(uuid.uuid4()),
                    "timestamp": datetime.utcnow(),
                    "processing_time_ms": processing_time_ms,
                    "status": "completed",
                    
                    # Image information
                    "image_info": image_info,
                    
                    # Detection information (real per-class YOLO confidence)
                    "detection": {
                        "regions_detected": {
                            "bald": result.get('detection_counts', {}).get('bald', 0),
                            "hair": result.get('detection_counts', {}).get('hair', 0),
                            "total": (result.get('detection_counts', {}).get('bald', 0) +
                                    result.get('detection_counts', {}).get('hair', 0))
                        },
                        "confidence_scores": {
                            "bald": round(bald_conf, 4),
                            "hair": round(hair_conf, 4),
                            "bald_min": round(yolo_confs.get('bald_min', 0.0), 4),
                            "hair_min": round(yolo_confs.get('hair_min', 0.0), 4),
                            "average": round(avg_conf, 4),
                        },
                        "quality_score": round(image_info.get("quality", {}).get("overall", 0.0), 4)
                    },
                    
                    # Measurements
                    "measurements": {
                        "pixels": {
                            "bald": areas_pixels.get('bald', 0),
                            "hair": areas_pixels.get('hair', 0),
                            "total_head": areas_pixels.get('total_head', 0)
                        },
                        "cm2": {
                            "bald": areas_cm2.get('bald', 0),
                            "hair": areas_cm2.get('hair', 0),
                            "total_head": areas_cm2.get('total_head', 0)
                        },
                        "inch2": {
                            "bald": areas_inch2.get('bald', 0),
                            "hair": areas_inch2.get('hair', 0),
                            "total_head": areas_inch2.get('total_head', 0)
                        },
                        "percentage": {
                            "baldness_ratio": baldness_ratio,
                            "hair_coverage": percentages.get('hair_coverage', 0)
                        }
                    },
                    
                    # Classification
                    "classification": classification,
                    
                    # Problem Severity and Hair Health Analysis
                    "problem_severity": problem_severity,
                    "hair_health": hair_health,
                    
                    # Metadata
                    "metadata": {
                        "model_version": "yolov11-segmentation-v1.0",
                        "api_version": settings.VERSION,
                        "processing_device": "cpu",  # Could be detected
                        "estimated_pixels_per_cm": result.get('estimated_pixels_per_cm')
                    },
                    
                    # File paths - both standardized to 512x512
                    "original_image_path": standardized_original_path,
                    "annotated_image_path": result.get('output_path'),
                    
                    # Coordinate data for bald segments
                    "coordinates": coordinate_data,
                    
                    # Raw result for debugging (optional)
                    "_raw_result": result if settings.DEBUG else None
                }
                
                return analysis_result
                
            finally:
                # Clean up temporary file
                if os.path.exists(temp_path):
                    os.remove(temp_path)
                
        except Exception as e:
            processing_time_ms = (time.time() - start_time) * 1000
            
            if isinstance(e, (DetectionFailedException, ImageProcessingException)):
                raise
            
            raise AnalysisFailedException(f"Analysis processing error: {str(e)}")
    
    async def process_full_analysis(
        self, 
        image_bytes: bytes, 
        filename: str,
        options: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Complete analysis pipeline from bytes to result"""
        
        # Validate image
        image, image_info = await self.validate_image(image_bytes, filename)
        
        # Run analysis
        result = await self.analyze_image(image, image_info, options)
        
        return result
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the loaded model"""
        try:
            yolo_service = self._get_yolo_service()
            return {
                "name": "YOLOv11 Segmentation",
                "version": "1.0",
                "classes": yolo_service.class_names,
                "input_size": [640, 640],  # Standard YOLO input
                "confidence_threshold": self.confidence_threshold,
                "iou_threshold": self.iou_threshold
            }
        except Exception as e:
            return {
                "error": f"Model not loaded: {str(e)}"
            }