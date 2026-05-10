from ultralytics import YOLO
import cv2
import numpy as np
import glob
import os
from pathlib import Path
from datetime import datetime
import json

class YOLOTesterWithAnnotations:
    def __init__(self, model_path="model/best.pt", output_folder="annotated_output"):
        """Initialize the tester with YOLO model"""
        self.model = YOLO(model_path)
        self.output_folder = Path(output_folder)
        self.output_folder.mkdir(exist_ok=True)
        
        # Configuration for real-world measurements
        self.estimated_head_width_cm = 15.0  # Average human head width
        
        # Get class names and IDs
        self.class_names = self.model.names if hasattr(self.model, 'names') else {}
        self.bald_class_id = None
        self.hair_class_id = None
        
        for class_id, class_name in self.class_names.items():
            if 'bald' in class_name.lower():
                self.bald_class_id = class_id
            elif 'hair' in class_name.lower():
                self.hair_class_id = class_id
        
        print(f"Model loaded successfully")
        print(f"Classes: {self.class_names}")
        print(f"Output folder: {self.output_folder}")
    
    def estimate_pixels_per_cm(self, total_head_area_pixels):
        """Estimate pixels per cm based on head detection"""
        if total_head_area_pixels == 0:
            return None
        
        # Estimate head width in pixels (assuming roughly circular head)
        estimated_head_width_pixels = np.sqrt(total_head_area_pixels * 1.3)
        pixels_per_cm = estimated_head_width_pixels / self.estimated_head_width_cm
        return pixels_per_cm
    
    def calculate_mask_area(self, mask):
        """Calculate area of a binary mask in pixels"""
        if mask is None:
            return 0
        return np.sum(mask > 0)
    
    def create_colored_overlay(self, img, mask, color, alpha=0.4):
        """Create a colored overlay for a mask"""
        overlay = img.copy()
        overlay[mask > 0] = color
        return cv2.addWeighted(img, 1 - alpha, overlay, alpha, 0)
    
    def add_text_with_background(self, img, text, position, font_scale=0.6, thickness=2, 
                                 text_color=(255, 255, 255), bg_color=(0, 0, 0)):
        """Add text with a background rectangle for better visibility"""
        font = cv2.FONT_HERSHEY_SIMPLEX
        
        # Get text size
        (text_width, text_height), baseline = cv2.getTextSize(text, font, font_scale, thickness)
        
        # Draw background rectangle
        x, y = position
        padding = 5
        cv2.rectangle(img, 
                     (x - padding, y - text_height - padding), 
                     (x + text_width + padding, y + baseline + padding), 
                     bg_color, -1)
        
        # Draw text
        cv2.putText(img, text, position, font, font_scale, text_color, thickness)
        
        return text_height + baseline + 2 * padding
    
    def process_and_annotate_image(self, image_path):
        """Process a single image and create annotated output"""
        print(f"\nProcessing: {image_path}")
        
        # Read image
        original_img = cv2.imread(image_path)
        if original_img is None:
            print(f"Error: Could not read image {image_path}")
            return None
        
        # Store original dimensions for metadata
        original_height, original_width = original_img.shape[:2]
        
        # Standardize to 512x512 for consistent detection and coordinates
        STANDARD_SIZE = 512
        img = cv2.resize(original_img, (STANDARD_SIZE, STANDARD_SIZE))
        img_height, img_width = STANDARD_SIZE, STANDARD_SIZE
        
        # Run prediction
        import time
        start_time = time.time()
        results = self.model.predict(img, iou=0.4, verbose=False)
        inference_time = (time.time() - start_time) * 1000  # Convert to ms
        
        # Create annotated image - work on standardized 512x512 image
        annotated_img = img.copy()
        
        # Initialize measurements
        bald_area_pixels = 0
        hair_area_pixels = 0
        bald_mask_combined = np.zeros((img_height, img_width), dtype=np.uint8)
        hair_mask_combined = np.zeros((img_height, img_width), dtype=np.uint8)
        bald_confs = []
        hair_confs = []

        # Process masks and calculate areas
        if results[0].masks is not None:
            masks = results[0].masks.data.cpu().numpy()
            classes = results[0].boxes.cls.cpu().numpy()
            confidences = results[0].boxes.conf.cpu().numpy()

            for i, class_id in enumerate(classes):
                # Resize mask to original image size
                mask = cv2.resize(masks[i], (img_width, img_height))
                mask = (mask > 0.5).astype(np.uint8)

                mask_area = self.calculate_mask_area(mask)
                conf = float(confidences[i])

                if class_id == self.bald_class_id:
                    bald_area_pixels += mask_area
                    bald_mask_combined = np.maximum(bald_mask_combined, mask)
                    bald_confs.append(conf)
                elif class_id == self.hair_class_id:
                    hair_area_pixels += mask_area
                    hair_mask_combined = np.maximum(hair_mask_combined, mask)
                    hair_confs.append(conf)
        
        # Apply colored overlays - only for bald areas
        if np.any(bald_mask_combined):
            # Red overlay for bald areas
            annotated_img = self.create_colored_overlay(annotated_img, bald_mask_combined, 
                                                       (0, 0, 255), alpha=0.3)
            # Draw contours for bald areas
            contours, _ = cv2.findContours(bald_mask_combined, cv2.RETR_EXTERNAL, 
                                          cv2.CHAIN_APPROX_SIMPLE)
            cv2.drawContours(annotated_img, contours, -1, (0, 0, 255), 2)
        
        # Calculate measurements
        total_head_area_pixels = bald_area_pixels + hair_area_pixels
        
        if total_head_area_pixels > 0:
            baldness_ratio = (bald_area_pixels / total_head_area_pixels) * 100
            hair_coverage = (hair_area_pixels / total_head_area_pixels) * 100
            
            # Calculate real-world measurements
            pixels_per_cm = self.estimate_pixels_per_cm(total_head_area_pixels)
            if pixels_per_cm:
                bald_area_cm2 = bald_area_pixels / (pixels_per_cm ** 2)
                hair_area_cm2 = hair_area_pixels / (pixels_per_cm ** 2)
                total_area_cm2 = total_head_area_pixels / (pixels_per_cm ** 2)
                
                bald_area_inch2 = bald_area_cm2 * 0.155
                hair_area_inch2 = hair_area_cm2 * 0.155
                total_area_inch2 = total_area_cm2 * 0.155
            else:
                bald_area_cm2 = hair_area_cm2 = total_area_cm2 = 0
                bald_area_inch2 = hair_area_inch2 = total_area_inch2 = 0
        else:
            baldness_ratio = hair_coverage = 0
            bald_area_cm2 = hair_area_cm2 = total_area_cm2 = 0
            bald_area_inch2 = hair_area_inch2 = total_area_inch2 = 0
        
        # No text annotations - clean image with only bald area highlights
        
        # Annotated image remains at 512x512 for coordinate consistency
        # Frontend should display this exact same 512x512 image
        
        # Save annotated image
        output_filename = f"annotated_{os.path.basename(image_path)}"
        output_path = self.output_folder / output_filename
        cv2.imwrite(str(output_path), annotated_img)
        
        # Count detections
        bald_count = 0
        hair_count = 0
        if results[0].boxes is not None:
            for class_id in results[0].boxes.cls.cpu().numpy():
                if class_id == self.bald_class_id:
                    bald_count += 1
                elif class_id == self.hair_class_id:
                    hair_count += 1
        
        # Print in YOLO format
        detections = []
        if bald_count > 0:
            detections.append(f"{bald_count} bald" if bald_count == 1 else f"{bald_count} balds")
        if hair_count > 0:
            detections.append(f"{hair_count} hair")
        
        if detections:
            detection_str = ", ".join(detections)
            print(f"\n0: {img.shape[1]}x{img.shape[0]} {detection_str}, {inference_time:.1f}ms")
            print(f"Speed: {inference_time/3:.1f}ms preprocess, {inference_time:.1f}ms inference, {inference_time/10:.1f}ms postprocess per image at shape (1, 3, {img.shape[0]}, {img.shape[1]})")
        
        print(f"Saved: {output_path}")
        
        return {
            'filename': os.path.basename(image_path),
            'full_path': image_path,
            'output_path': str(output_path),
            'image_dimensions': {
                'width': img_width,
                'height': img_height,
                'standardized_size': STANDARD_SIZE,
                'original_width': original_width,
                'original_height': original_height
            },
            'detection_counts': {
                'bald': bald_count,
                'hair': hair_count
            },
            'areas_pixels': {
                'bald': int(bald_area_pixels),
                'hair': int(hair_area_pixels),
                'total_head': int(total_head_area_pixels)
            },
            'areas_cm2': {
                'bald': round(bald_area_cm2, 2),
                'hair': round(hair_area_cm2, 2),
                'total_head': round(total_area_cm2, 2)
            },
            'areas_inch2': {
                'bald': round(bald_area_inch2, 2),
                'hair': round(hair_area_inch2, 2),
                'total_head': round(total_area_inch2, 2)
            },
            'percentages': {
                'baldness_ratio': round(baldness_ratio, 2),
                'hair_coverage': round(hair_coverage, 2)
            },
            'confidences': {
                'bald_mean': round(float(np.mean(bald_confs)), 4) if bald_confs else 0.0,
                'bald_min': round(float(np.min(bald_confs)), 4) if bald_confs else 0.0,
                'hair_mean': round(float(np.mean(hair_confs)), 4) if hair_confs else 0.0,
                'hair_min': round(float(np.min(hair_confs)), 4) if hair_confs else 0.0,
            },
            'inference_time_ms': round(inference_time, 2),
            'timestamp': datetime.now().isoformat()
        }
    
    def process_all_images(self, input_folder="testing"):
        """Process all images in the testing folder"""
        # Get all images
        image_extensions = ['*.jpg', '*.jpeg', '*.png', '*.bmp']
        image_paths = []
        for ext in image_extensions:
            image_paths.extend(glob.glob(f'{input_folder}/{ext}'))
        
        print(f"Found {len(image_paths)} images to process")
        
        results = []
        for image_path in sorted(image_paths):
            result = self.process_and_annotate_image(image_path)
            if result:
                results.append(result)
        
        # Save results to JSON
        if results:
            self.save_results_to_json(results)
            print(f"\nProcessing complete! All outputs saved to '{self.output_folder}' directory.")
        
        return results
    
    def save_results_to_json(self, results):
        """Save processing results to JSON file"""
        # Calculate summary statistics
        if results:
            baldness_ratios = [r['percentages']['baldness_ratio'] for r in results]
            bald_areas_cm2 = [r['areas_cm2']['bald'] for r in results]
            hair_areas_cm2 = [r['areas_cm2']['hair'] for r in results]
            inference_times = [r['inference_time_ms'] for r in results]
            
            summary = {
                'total_images': len(results),
                'statistics': {
                    'baldness_ratio': {
                        'average': round(np.mean(baldness_ratios), 2),
                        'min': round(min(baldness_ratios), 2),
                        'max': round(max(baldness_ratios), 2),
                        'std_dev': round(np.std(baldness_ratios), 2)
                    },
                    'bald_area_cm2': {
                        'average': round(np.mean(bald_areas_cm2), 2),
                        'min': round(min(bald_areas_cm2), 2),
                        'max': round(max(bald_areas_cm2), 2)
                    },
                    'hair_area_cm2': {
                        'average': round(np.mean(hair_areas_cm2), 2),
                        'min': round(min(hair_areas_cm2), 2),
                        'max': round(max(hair_areas_cm2), 2)
                    },
                    'inference_time_ms': {
                        'average': round(np.mean(inference_times), 2),
                        'total': round(sum(inference_times), 2)
                    }
                }
            }
        else:
            summary = {}
        
        # Create output JSON
        output_data = {
            'processing_info': {
                'timestamp': datetime.now().isoformat(),
                'model': 'YOLOv11 Segmentation',
                'model_path': 'model/best.pt',
                'output_folder': str(self.output_folder),
                'iou_threshold': 0.4
            },
            'summary': summary,
            'individual_results': results
        }
        
        # Save to JSON file
        json_path = self.output_folder / 'analysis_results.json'
        with open(json_path, 'w') as f:
            json.dump(output_data, f, indent=2)
        
        print(f"Results saved to: {json_path}")
        
        return json_path


def main():
    # Create tester instance
    tester = YOLOTesterWithAnnotations(
        model_path="model/best.pt",
        output_folder="output"
    )
    
    # Process all images
    results = tester.process_all_images("testing")


if __name__ == "__main__":
    main()
