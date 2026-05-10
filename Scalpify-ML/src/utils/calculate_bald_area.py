from ultralytics import YOLO
import cv2
import numpy as np
import glob
import os
from pathlib import Path
import json
import csv
from datetime import datetime

class BaldAreaCalculator:
    def __init__(self, model_path="model/best.pt", pixels_per_cm=None):
        """Initialize the calculator with YOLO model
        
        Args:
            model_path: Path to YOLO model
            pixels_per_cm: Pixels per centimeter for real-world measurements.
                          If None, uses average human head width (15cm) estimation
        """
        self.model = YOLO(model_path)
        self.results_data = []
        
        # Set conversion factor
        # Average human head width is approximately 15cm
        # We'll estimate this based on detected head width in pixels
        self.pixels_per_cm = pixels_per_cm
        self.estimated_head_width_cm = 15.0  # Average human head width
        
        # Get class names from model
        self.class_names = self.model.names if hasattr(self.model, 'names') else {}
        print(f"Model classes: {self.class_names}")
        
        # Find class IDs for bald and hair
        self.bald_class_id = None
        self.hair_class_id = None
        
        for class_id, class_name in self.class_names.items():
            if 'bald' in class_name.lower():
                self.bald_class_id = class_id
            elif 'hair' in class_name.lower():
                self.hair_class_id = class_id
        
        print(f"Bald class ID: {self.bald_class_id}, Hair class ID: {self.hair_class_id}")
    
    def calculate_mask_area(self, mask):
        """Calculate area of a binary mask in pixels"""
        if mask is None:
            return 0
        return np.sum(mask > 0)
    
    def estimate_pixels_per_cm(self, total_head_area_pixels, img_width, img_height):
        """Estimate pixels per cm based on head detection"""
        if total_head_area_pixels == 0:
            return None
        
        # Estimate head width in pixels (assuming roughly circular head)
        estimated_head_width_pixels = np.sqrt(total_head_area_pixels * 1.3)  # 1.3 factor for elliptical shape
        
        # Calculate pixels per cm
        pixels_per_cm = estimated_head_width_pixels / self.estimated_head_width_cm
        return pixels_per_cm
    
    def convert_pixels_to_real_world(self, area_pixels, pixels_per_cm):
        """Convert pixel area to real-world measurements"""
        if pixels_per_cm is None or pixels_per_cm == 0:
            return {
                'area_cm2': None,
                'area_m2': None,
                'area_inch2': None
            }
        
        # Convert to cm²
        area_cm2 = area_pixels / (pixels_per_cm ** 2)
        
        # Convert to other units
        area_m2 = area_cm2 / 10000  # 1 m² = 10,000 cm²
        area_inch2 = area_cm2 * 0.155  # 1 cm² = 0.155 inch²
        
        return {
            'area_cm2': round(area_cm2, 2),
            'area_m2': round(area_m2, 6),
            'area_inch2': round(area_inch2, 2)
        }
    
    def process_image(self, image_path):
        """Process a single image and extract bald area measurements"""
        print(f"\nProcessing: {image_path}")
        
        # Read image
        img = cv2.imread(image_path)
        if img is None:
            print(f"Error: Could not read image {image_path}")
            return None
        
        img_height, img_width = img.shape[:2]
        total_pixels = img_height * img_width
        
        # Run prediction
        results = self.model.predict(img, iou=0.4, verbose=False)
        
        # Initialize measurement variables
        bald_area_pixels = 0
        hair_area_pixels = 0
        total_head_area_pixels = 0
        
        # Extract masks and calculate areas
        if results[0].masks is not None:
            masks = results[0].masks.data.cpu().numpy()
            classes = results[0].boxes.cls.cpu().numpy()
            
            for i, class_id in enumerate(classes):
                # Resize mask to original image size
                mask = cv2.resize(masks[i], (img_width, img_height))
                mask = (mask > 0.5).astype(np.uint8)
                
                mask_area = self.calculate_mask_area(mask)
                
                if class_id == self.bald_class_id:
                    bald_area_pixels += mask_area
                elif class_id == self.hair_class_id:
                    hair_area_pixels += mask_area
        
        # Calculate total head area (bald + hair)
        total_head_area_pixels = bald_area_pixels + hair_area_pixels
        
        # Calculate percentages
        bald_percentage_of_image = (bald_area_pixels / total_pixels) * 100 if total_pixels > 0 else 0
        hair_percentage_of_image = (hair_area_pixels / total_pixels) * 100 if total_pixels > 0 else 0
        
        # Calculate baldness ratio (bald area / total head area)
        baldness_ratio = (bald_area_pixels / total_head_area_pixels) * 100 if total_head_area_pixels > 0 else 0
        hair_coverage = (hair_area_pixels / total_head_area_pixels) * 100 if total_head_area_pixels > 0 else 0
        
        # Estimate pixels per cm if not provided
        if self.pixels_per_cm is None:
            pixels_per_cm = self.estimate_pixels_per_cm(total_head_area_pixels, img_width, img_height)
        else:
            pixels_per_cm = self.pixels_per_cm
        
        # Convert to real-world measurements
        bald_measurements = self.convert_pixels_to_real_world(bald_area_pixels, pixels_per_cm)
        hair_measurements = self.convert_pixels_to_real_world(hair_area_pixels, pixels_per_cm)
        total_measurements = self.convert_pixels_to_real_world(total_head_area_pixels, pixels_per_cm)
        
        result = {
            'filename': os.path.basename(image_path),
            'image_width': int(img_width),
            'image_height': int(img_height),
            'total_pixels': int(total_pixels),
            'bald_area_pixels': int(bald_area_pixels),
            'hair_area_pixels': int(hair_area_pixels),
            'total_head_area_pixels': int(total_head_area_pixels),
            'bald_area_cm2': bald_measurements['area_cm2'],
            'bald_area_m2': bald_measurements['area_m2'],
            'bald_area_inch2': bald_measurements['area_inch2'],
            'hair_area_cm2': hair_measurements['area_cm2'],
            'hair_area_m2': hair_measurements['area_m2'],
            'hair_area_inch2': hair_measurements['area_inch2'],
            'total_head_area_cm2': total_measurements['area_cm2'],
            'total_head_area_m2': total_measurements['area_m2'],
            'total_head_area_inch2': total_measurements['area_inch2'],
            'bald_percentage_of_image': float(round(bald_percentage_of_image, 2)),
            'hair_percentage_of_image': float(round(hair_percentage_of_image, 2)),
            'baldness_ratio': float(round(baldness_ratio, 2)),
            'hair_coverage': float(round(hair_coverage, 2)),
            'estimated_pixels_per_cm': float(round(pixels_per_cm, 2)) if pixels_per_cm else None
        }
        
        print(f"  Bald area: {bald_area_pixels:,} pixels ({baldness_ratio:.1f}% of head)")
        if bald_measurements['area_cm2']:
            print(f"           {bald_measurements['area_cm2']} cm² | {bald_measurements['area_inch2']} inch²")
        print(f"  Hair area: {hair_area_pixels:,} pixels ({hair_coverage:.1f}% of head)")
        if hair_measurements['area_cm2']:
            print(f"           {hair_measurements['area_cm2']} cm² | {hair_measurements['area_inch2']} inch²")
        print(f"  Total head area: {total_head_area_pixels:,} pixels")
        if total_measurements['area_cm2']:
            print(f"                  {total_measurements['area_cm2']} cm² | {total_measurements['area_inch2']} inch²")
        
        return result
    
    def create_visualization(self, image_path, result):
        """Create visualization with area measurements overlay"""
        img = cv2.imread(image_path)
        if img is None:
            return None
        
        # Run prediction again to get masks for visualization
        results = self.model.predict(img, iou=0.4, verbose=False)
        
        # Create visualization with masks
        vis_img = img.copy()
        
        if results[0].masks is not None:
            masks = results[0].masks.data.cpu().numpy()
            classes = results[0].boxes.cls.cpu().numpy()
            
            for i, class_id in enumerate(classes):
                mask = cv2.resize(masks[i], (img.shape[1], img.shape[0]))
                mask = (mask > 0.5).astype(np.uint8)
                
                if class_id == self.bald_class_id:
                    # Red overlay for bald areas
                    vis_img[mask > 0] = vis_img[mask > 0] * 0.5 + np.array([0, 0, 255]) * 0.5
                elif class_id == self.hair_class_id:
                    # Green overlay for hair areas
                    vis_img[mask > 0] = vis_img[mask > 0] * 0.5 + np.array([0, 255, 0]) * 0.5
        
        # Add text overlay with measurements
        font = cv2.FONT_HERSHEY_SIMPLEX
        y_offset = 30
        
        cv2.putText(vis_img, f"Baldness: {result['baldness_ratio']:.1f}%", 
                   (10, y_offset), font, 0.7, (255, 255, 255), 2)
        cv2.putText(vis_img, f"Hair Coverage: {result['hair_coverage']:.1f}%", 
                   (10, y_offset + 30), font, 0.7, (255, 255, 255), 2)
        cv2.putText(vis_img, f"Bald Area: {result['bald_area_pixels']:,} px", 
                   (10, y_offset + 60), font, 0.7, (255, 255, 255), 2)
        
        if result.get('bald_area_cm2'):
            cv2.putText(vis_img, f"Bald: {result['bald_area_cm2']} cm2 | {result['bald_area_inch2']} in2", 
                       (10, y_offset + 90), font, 0.6, (255, 255, 255), 2)
        
        return vis_img
    
    def process_all_images(self, input_folder="testing"):
        """Process all images in the input folder"""
        # Get all images
        image_extensions = ['*.jpg', '*.jpeg', '*.png', '*.bmp']
        image_paths = []
        for ext in image_extensions:
            image_paths.extend(glob.glob(f'{input_folder}/{ext}'))
        
        print(f"Found {len(image_paths)} images to process")
        
        # Process each image
        for image_path in image_paths:
            result = self.process_image(image_path)
            if result:
                self.results_data.append(result)
        
        return self.results_data
    
    def save_results_to_csv(self, output_file="bald_area_results.csv"):
        """Save results to CSV file"""
        if not self.results_data:
            print("No results to save")
            return
        
        keys = self.results_data[0].keys()
        
        with open(output_file, 'w', newline='') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=keys)
            writer.writeheader()
            writer.writerows(self.results_data)
        
        print(f"\nResults saved to {output_file}")
    
    def save_results_to_json(self, output_file="bald_area_results.json"):
        """Save results to JSON file"""
        if not self.results_data:
            print("No results to save")
            return
        
        # Calculate summary statistics
        summary = self.calculate_summary_statistics()
        
        output_data = {
            'timestamp': datetime.now().isoformat(),
            'total_images': len(self.results_data),
            'summary': summary,
            'individual_results': self.results_data
        }
        
        with open(output_file, 'w') as jsonfile:
            json.dump(output_data, jsonfile, indent=2)
        
        print(f"Results saved to {output_file}")
    
    def calculate_summary_statistics(self):
        """Calculate summary statistics across all images"""
        if not self.results_data:
            return {}
        
        baldness_ratios = [r['baldness_ratio'] for r in self.results_data]
        bald_areas = [r['bald_area_pixels'] for r in self.results_data]
        hair_areas = [r['hair_area_pixels'] for r in self.results_data]
        
        # Get real-world measurements if available
        bald_areas_cm2 = [r['bald_area_cm2'] for r in self.results_data if r.get('bald_area_cm2')]
        hair_areas_cm2 = [r['hair_area_cm2'] for r in self.results_data if r.get('hair_area_cm2')]
        
        summary = {
            'average_baldness_ratio': float(round(np.mean(baldness_ratios), 2)),
            'min_baldness_ratio': float(round(min(baldness_ratios), 2)),
            'max_baldness_ratio': float(round(max(baldness_ratios), 2)),
            'std_baldness_ratio': float(round(np.std(baldness_ratios), 2)),
            'average_bald_area_pixels': int(np.mean(bald_areas)),
            'average_hair_area_pixels': int(np.mean(hair_areas)),
            'total_bald_area_pixels': int(sum(bald_areas)),
            'total_hair_area_pixels': int(sum(hair_areas))
        }
        
        # Add real-world measurements if available
        if bald_areas_cm2:
            summary['average_bald_area_cm2'] = float(round(np.mean(bald_areas_cm2), 2))
            summary['average_bald_area_inch2'] = float(round(np.mean(bald_areas_cm2) * 0.155, 2))
        
        if hair_areas_cm2:
            summary['average_hair_area_cm2'] = float(round(np.mean(hair_areas_cm2), 2))
            summary['average_hair_area_inch2'] = float(round(np.mean(hair_areas_cm2) * 0.155, 2))
        
        return summary
    
    def create_visualizations(self, input_folder="testing", output_folder="analysis_output"):
        """Create visualizations with measurements for all images"""
        Path(output_folder).mkdir(exist_ok=True)
        
        image_extensions = ['*.jpg', '*.jpeg', '*.png', '*.bmp']
        image_paths = []
        for ext in image_extensions:
            image_paths.extend(glob.glob(f'{input_folder}/{ext}'))
        
        for image_path in image_paths:
            # Find corresponding result
            filename = os.path.basename(image_path)
            result = next((r for r in self.results_data if r['filename'] == filename), None)
            
            if result:
                vis_img = self.create_visualization(image_path, result)
                if vis_img is not None:
                    output_path = f"{output_folder}/analysis_{filename}"
                    cv2.imwrite(output_path, vis_img)
                    print(f"Saved visualization: {output_path}")
    
    def print_summary(self):
        """Print summary statistics"""
        if not self.results_data:
            print("No results to summarize")
            return
        
        summary = self.calculate_summary_statistics()
        
        print("\n" + "="*60)
        print("SUMMARY STATISTICS")
        print("="*60)
        print(f"Total images analyzed: {len(self.results_data)}")
        print(f"\nBaldness Ratios:")
        print(f"  Average: {summary['average_baldness_ratio']}%")
        print(f"  Min: {summary['min_baldness_ratio']}%")
        print(f"  Max: {summary['max_baldness_ratio']}%")
        print(f"  Std Dev: {summary['std_baldness_ratio']}%")
        
        print(f"\nAverage Areas (Pixels):")
        print(f"  Bald area: {summary['average_bald_area_pixels']:,} pixels")
        print(f"  Hair area: {summary['average_hair_area_pixels']:,} pixels")
        
        if 'average_bald_area_cm2' in summary:
            print(f"\nAverage Areas (Real-world):")
            print(f"  Bald area: {summary['average_bald_area_cm2']} cm² | {summary['average_bald_area_inch2']} inch²")
            print(f"  Hair area: {summary['average_hair_area_cm2']} cm² | {summary['average_hair_area_inch2']} inch²")
        
        print("="*60)


def main():
    # Initialize calculator
    calculator = BaldAreaCalculator("model/best.pt")
    
    # Process all images
    calculator.process_all_images("testing")
    
    # Save results
    calculator.save_results_to_csv("bald_area_results.csv")
    calculator.save_results_to_json("bald_area_results.json")
    
    # Create visualizations
    calculator.create_visualizations("testing", "analysis_output")
    
    # Print summary
    calculator.print_summary()


if __name__ == "__main__":
    main()