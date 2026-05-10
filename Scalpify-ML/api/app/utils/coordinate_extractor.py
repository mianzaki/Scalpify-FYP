"""
Coordinate extraction utilities for bald segment analysis
Extracts boundary points, contours, and geometric data from segmentation masks
"""

import cv2
import numpy as np
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass


@dataclass
class BoundaryPoint:
    """Represents a single boundary point"""
    x: int
    y: int
    curve_index: int = 0  # Which contour/curve this point belongs to


@dataclass
class SegmentGeometry:
    """Complete geometric information for a segment"""
    boundary_points: List[BoundaryPoint]
    contour_area: float
    bounding_box: Dict[str, int]  # x, y, width, height
    centroid: Dict[str, float]    # x, y
    perimeter: float
    convex_hull: List[BoundaryPoint]
    simplified_boundary: List[BoundaryPoint]  # Simplified contour for fewer points


class CoordinateExtractor:
    """Extract coordinates and geometric data from segmentation masks"""
    
    def __init__(self):
        self.min_contour_area = 100  # Minimum area to consider a valid segment
        self.epsilon_factor = 0.02   # For contour approximation (reduces points)
        
    def extract_contours(self, mask: np.ndarray) -> List[np.ndarray]:
        """Extract contours from binary mask"""
        if mask is None or not np.any(mask):
            return []
        
        # Ensure mask is binary
        binary_mask = (mask > 0.5).astype(np.uint8)
        
        # Find contours
        contours, _ = cv2.findContours(
            binary_mask, 
            cv2.RETR_EXTERNAL, 
            cv2.CHAIN_APPROX_SIMPLE
        )
        
        # Filter small contours
        valid_contours = [
            contour for contour in contours 
            if cv2.contourArea(contour) >= self.min_contour_area
        ]
        
        return valid_contours
    
    def contour_to_boundary_points(self, contour: np.ndarray, curve_index: int = 0) -> List[BoundaryPoint]:
        """Convert OpenCV contour to list of BoundaryPoint objects"""
        boundary_points = []
        
        for point in contour:
            x, y = point[0]  # OpenCV contour format: [[[x, y]]]
            boundary_points.append(BoundaryPoint(
                x=int(x), 
                y=int(y), 
                curve_index=curve_index
            ))
            
        return boundary_points
    
    def simplify_contour(self, contour: np.ndarray, epsilon_factor: Optional[float] = None) -> np.ndarray:
        """Simplify contour to reduce number of points while preserving shape"""
        if epsilon_factor is None:
            epsilon_factor = self.epsilon_factor
            
        # Calculate epsilon as percentage of perimeter
        epsilon = epsilon_factor * cv2.arcLength(contour, True)
        
        # Apply Douglas-Peucker algorithm
        simplified = cv2.approxPolyDP(contour, epsilon, True)
        
        return simplified
    
    def get_bounding_box(self, contour: np.ndarray) -> Dict[str, int]:
        """Get bounding rectangle of contour"""
        x, y, w, h = cv2.boundingRect(contour)
        return {
            "x": int(x),
            "y": int(y), 
            "width": int(w),
            "height": int(h)
        }
    
    def get_centroid(self, contour: np.ndarray) -> Dict[str, float]:
        """Calculate centroid of contour"""
        moments = cv2.moments(contour)
        
        if moments['m00'] != 0:
            cx = moments['m10'] / moments['m00']
            cy = moments['m01'] / moments['m00']
        else:
            # Fallback to bounding box center
            x, y, w, h = cv2.boundingRect(contour)
            cx = x + w / 2
            cy = y + h / 2
            
        return {
            "x": float(cx),
            "y": float(cy)
        }
    
    def get_convex_hull(self, contour: np.ndarray, curve_index: int = 0) -> List[BoundaryPoint]:
        """Get convex hull points of contour"""
        hull = cv2.convexHull(contour)
        return self.contour_to_boundary_points(hull, curve_index)
    
    def extract_segment_geometry(self, mask: np.ndarray, segment_type: str = "bald") -> List[SegmentGeometry]:
        """Extract complete geometric information for all segments in mask"""
        contours = self.extract_contours(mask)
        segments = []
        
        for i, contour in enumerate(contours):
            # Basic measurements
            area = cv2.contourArea(contour)
            perimeter = cv2.arcLength(contour, True)
            
            # Boundary points (full contour)
            boundary_points = self.contour_to_boundary_points(contour, curve_index=i)
            
            # Simplified boundary (fewer points)
            simplified_contour = self.simplify_contour(contour)
            simplified_boundary = self.contour_to_boundary_points(simplified_contour, curve_index=i)
            
            # Geometric properties
            bounding_box = self.get_bounding_box(contour)
            centroid = self.get_centroid(contour)
            convex_hull = self.get_convex_hull(contour, curve_index=i)
            
            segment = SegmentGeometry(
                boundary_points=boundary_points,
                contour_area=area,
                bounding_box=bounding_box,
                centroid=centroid,
                perimeter=perimeter,
                convex_hull=convex_hull,
                simplified_boundary=simplified_boundary
            )
            
            segments.append(segment)
        
        return segments
    
    def extract_coordinates_data(self, bald_mask: np.ndarray, hair_mask: np.ndarray = None) -> Dict[str, Any]:
        """Extract complete coordinate data for API response"""
        
        # Extract bald segment coordinates
        bald_segments = self.extract_segment_geometry(bald_mask, "bald")
        
        # Extract hair segment coordinates (optional)
        hair_segments = []
        if hair_mask is not None:
            hair_segments = self.extract_segment_geometry(hair_mask, "hair")
        
        # Convert segments to JSON-serializable format
        def segment_to_dict(segment: SegmentGeometry) -> Dict[str, Any]:
            return {
                "boundary_points": [
                    {"x": p.x, "y": p.y, "curve_index": p.curve_index} 
                    for p in segment.boundary_points
                ],
                "simplified_boundary": [
                    {"x": p.x, "y": p.y, "curve_index": p.curve_index} 
                    for p in segment.simplified_boundary
                ],
                "convex_hull": [
                    {"x": p.x, "y": p.y, "curve_index": p.curve_index} 
                    for p in segment.convex_hull
                ],
                "geometry": {
                    "area_pixels": segment.contour_area,
                    "perimeter_pixels": segment.perimeter,
                    "bounding_box": segment.bounding_box,
                    "centroid": segment.centroid
                }
            }
        
        coordinate_data = {
            "bald_segments": [segment_to_dict(seg) for seg in bald_segments],
            "hair_segments": [segment_to_dict(seg) for seg in hair_segments],
            "summary": {
                "total_bald_segments": len(bald_segments),
                "total_hair_segments": len(hair_segments),
                "largest_bald_area": max([s.contour_area for s in bald_segments]) if bald_segments else 0,
                "total_boundary_points": sum([len(s.boundary_points) for s in bald_segments]),
                "total_simplified_points": sum([len(s.simplified_boundary) for s in bald_segments])
            }
        }
        
        return coordinate_data
    
    def get_boundary_points_only(self, mask: np.ndarray, simplified: bool = True) -> List[Dict[str, Any]]:
        """Extract only boundary points (for lightweight response)"""
        contours = self.extract_contours(mask)
        all_points = []
        
        for i, contour in enumerate(contours):
            if simplified:
                contour = self.simplify_contour(contour)
            
            points = self.contour_to_boundary_points(contour, curve_index=i)
            all_points.extend([
                {"x": p.x, "y": p.y, "curve_index": p.curve_index} 
                for p in points
            ])
        
        return all_points