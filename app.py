"""
GASP-AI Baldness Analysis Application

This application uses YOLOv11 segmentation model to analyze baldness in images.
It processes images from the testing folder and generates annotated outputs with
detailed measurements and analysis.
"""

import sys
import os
from pathlib import Path
import argparse
import json

# Add current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from src.components.bald_area_calculation_service import YOLOTesterWithAnnotations

class GASPAnalysisApp:
    def __init__(self):
        """Initialize the GASP Analysis Application"""
        self.app_name = "GASP-AI Baldness Analysis"
        self.version = "1.0.0"
        
    def print_banner(self):
        """Print application banner"""
        banner = f"""
{'='*60}
{self.app_name.center(60)}
{'Version ' + self.version.center(60)}
{'='*60}
Advanced YOLOv11-based baldness analysis and measurement tool
{'='*60}
        """
        print(banner)
    
    def run_analysis(self, input_folder="testing", output_folder="output", model_path="model/best.pt"):
        """Run the complete baldness analysis pipeline"""
        
        # Check if required files exist
        if not Path(model_path).exists():
            print(f"❌ Error: Model file not found at {model_path}")
            return False
            
        if not Path(input_folder).exists():
            print(f"❌ Error: Input folder not found at {input_folder}")
            return False
        
        print(f"📁 Input folder: {input_folder}")
        print(f"📁 Output folder: {output_folder}")
        print(f"🤖 Model: {model_path}")
        print(f"{'='*60}")
        
        try:
            # Initialize the analyzer
            tester = YOLOTesterWithAnnotations(
                model_path=model_path,
                output_folder=output_folder
            )
            
            # Run the analysis
            results = tester.process_all_images(input_folder)
            
            if results:
                # Display summary
                self.display_summary(results, output_folder)
                return True
            else:
                print("❌ No images were processed successfully")
                return False
                
        except Exception as e:
            print(f"❌ Error during analysis: {e}")
            return False
    
    def run_single_image_analysis(self, image_path, output_folder="output", model_path="model/best.pt"):
        """Analyze a single image"""
        
        # Check if required files exist
        if not Path(model_path).exists():
            print(f"❌ Error: Model file not found at {model_path}")
            return False
            
        if not Path(image_path).exists():
            print(f"❌ Error: Image file not found at {image_path}")
            return False
        
        print(f"🖼️  Image: {image_path}")
        print(f"📁 Output folder: {output_folder}")
        print(f"🤖 Model: {model_path}")
        print(f"{'='*60}")
        
        try:
            # Initialize the analyzer
            tester = YOLOTesterWithAnnotations(
                model_path=model_path,
                output_folder=output_folder
            )
            
            # Process single image
            result = tester.process_and_annotate_image(image_path)
            
            if result:
                # Display single image results
                self.display_single_result(result, output_folder)
                
                # Save single result to JSON
                results = [result]
                tester.save_results_to_json(results)
                return True
            else:
                print("❌ Image was not processed successfully")
                return False
                
        except Exception as e:
            print(f"❌ Error during analysis: {e}")
            return False
    
    def display_single_result(self, result, output_folder):
        """Display single image analysis result"""
        print(f"\n{'='*60}")
        print("🔍 SINGLE IMAGE ANALYSIS")
        print(f"{'='*60}")
        print(f"📁 File: {result['filename']}")
        print(f"📏 Dimensions: {result['image_dimensions']['width']}x{result['image_dimensions']['height']}")
        print(f"⏱️  Processing time: {result['inference_time_ms']:.1f} ms")
        
        print(f"\n🔴 Detection Counts:")
        print(f"   Bald regions: {result['detection_counts']['bald']}")
        print(f"   Hair regions: {result['detection_counts']['hair']}")
        
        print(f"\n🧠 Baldness Analysis:")
        print(f"   Baldness ratio: {result['percentages']['baldness_ratio']:.1f}%")
        print(f"   Hair coverage: {result['percentages']['hair_coverage']:.1f}%")
        
        print(f"\n📏 Area Measurements:")
        print(f"   Bald area: {result['areas_cm2']['bald']:.1f} cm² ({result['areas_inch2']['bald']:.1f} in²)")
        print(f"   Hair area: {result['areas_cm2']['hair']:.1f} cm² ({result['areas_inch2']['hair']:.1f} in²)")
        print(f"   Total head: {result['areas_cm2']['total_head']:.1f} cm² ({result['areas_inch2']['total_head']:.1f} in²)")
        
        print(f"\n📂 Output Files:")
        print(f"   🖼️  Annotated image: {result['output_path']}")
        print(f"   📋 Analysis data: {output_folder}/analysis_results.json")
        
        # Baldness severity classification
        baldness_ratio = result['percentages']['baldness_ratio']
        if baldness_ratio < 15:
            severity = "Minimal (Norwood I-II)"
            emoji = "✅"
        elif baldness_ratio < 30:
            severity = "Mild (Norwood III-IV)"
            emoji = "⚠️"
        elif baldness_ratio < 50:
            severity = "Moderate (Norwood V-VI)"
            emoji = "🔶"
        else:
            severity = "Severe (Norwood VII+)"
            emoji = "🔴"
        
        print(f"\n{emoji} Baldness Severity: {severity}")
        
        print(f"{'='*60}")
        print("✨ Analysis complete! Check the output folder for detailed results.")
        print(f"{'='*60}")
    
    def display_summary(self, results, output_folder):
        """Display analysis summary"""
        if not results:
            return
        
        # Calculate summary statistics
        baldness_ratios = [r['percentages']['baldness_ratio'] for r in results]
        bald_areas_cm2 = [r['areas_cm2']['bald'] for r in results]
        total_time = sum([r['inference_time_ms'] for r in results])
        
        print(f"\n{'='*60}")
        print("📊 ANALYSIS SUMMARY")
        print(f"{'='*60}")
        print(f"✅ Images processed: {len(results)}")
        print(f"⏱️  Total processing time: {total_time/1000:.1f} seconds")
        print(f"⚡ Average time per image: {total_time/len(results):.1f} ms")
        
        print(f"\n🧠 Baldness Statistics:")
        print(f"   Average: {sum(baldness_ratios)/len(baldness_ratios):.1f}%")
        print(f"   Range: {min(baldness_ratios):.1f}% - {max(baldness_ratios):.1f}%")
        
        print(f"\n📏 Area Statistics (cm²):")
        print(f"   Average bald area: {sum(bald_areas_cm2)/len(bald_areas_cm2):.1f} cm²")
        print(f"   Range: {min(bald_areas_cm2):.1f} - {max(bald_areas_cm2):.1f} cm²")
        
        print(f"\n📂 Output Files:")
        print(f"   📊 Annotated images: {output_folder}/")
        print(f"   📋 Detailed results: {output_folder}/analysis_results.json")
        
        # Show most/least bald images
        results_sorted = sorted(results, key=lambda x: x['percentages']['baldness_ratio'])
        print(f"\n🏆 Analysis Extremes:")
        print(f"   Least bald: {results_sorted[0]['filename']} ({results_sorted[0]['percentages']['baldness_ratio']:.1f}%)")
        print(f"   Most bald: {results_sorted[-1]['filename']} ({results_sorted[-1]['percentages']['baldness_ratio']:.1f}%)")
        
        print(f"{'='*60}")
        print("✨ Analysis complete! Check the output folder for detailed results.")
        print(f"{'='*60}")
    
    def load_and_display_results(self, json_path):
        """Load and display results from JSON file"""
        try:
            with open(json_path, 'r') as f:
                data = json.load(f)
            
            print(f"\n📋 Loading results from: {json_path}")
            
            if 'summary' in data and 'statistics' in data['summary']:
                stats = data['summary']['statistics']
                print(f"\n📊 LOADED ANALYSIS RESULTS")
                print(f"{'='*50}")
                print(f"Total images: {data['summary']['total_images']}")
                print(f"Average baldness: {stats['baldness_ratio']['average']:.1f}%")
                print(f"Baldness range: {stats['baldness_ratio']['min']:.1f}% - {stats['baldness_ratio']['max']:.1f}%")
                print(f"Average bald area: {stats['bald_area_cm2']['average']:.1f} cm²")
                print(f"Total processing time: {stats['inference_time_ms']['total']/1000:.1f} seconds")
                
                # Show individual results
                if 'individual_results' in data:
                    print(f"\n📋 Individual Results:")
                    for result in data['individual_results'][:5]:  # Show first 5
                        print(f"   {result['filename']}: {result['percentages']['baldness_ratio']:.1f}% bald")
                    
                    if len(data['individual_results']) > 5:
                        print(f"   ... and {len(data['individual_results']) - 5} more images")
                
                print(f"{'='*50}")
            
            return True
            
        except FileNotFoundError:
            print(f"❌ Results file not found: {json_path}")
            return False
        except json.JSONDecodeError:
            print(f"❌ Invalid JSON file: {json_path}")
            return False
        except Exception as e:
            print(f"❌ Error loading results: {e}")
            return False


def main():
    """Main application entry point"""
    parser = argparse.ArgumentParser(
        description="GASP-AI Baldness Analysis Application",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python app.py                          # Analyze images in 'testing' folder
  python app.py --input my_images        # Analyze images in 'my_images' folder
  python app.py --output my_results      # Save results to 'my_results' folder
  python app.py --image photo.jpg        # Analyze a single image
  python app.py --load output/analysis_results.json  # Load and display previous results
        """
    )
    
    parser.add_argument(
        '--input', '-i',
        default='testing',
        help='Input folder containing images to analyze (default: testing)'
    )
    
    parser.add_argument(
        '--output', '-o',
        default='output',
        help='Output folder for results (default: output)'
    )
    
    parser.add_argument(
        '--model', '-m',
        default='model/best.pt',
        help='Path to YOLO model file (default: model/best.pt)'
    )
    
    parser.add_argument(
        '--load', '-l',
        help='Load and display results from JSON file'
    )
    
    parser.add_argument(
        '--image',
        help='Analyze a single image file instead of a folder'
    )
    
    parser.add_argument(
        '--version', '-v',
        action='version',
        version='GASP-AI v1.0.0'
    )
    
    args = parser.parse_args()
    
    # Initialize the application
    app = GASPAnalysisApp()
    app.print_banner()
    
    # Handle different modes
    if args.load:
        # Load and display existing results
        success = app.load_and_display_results(args.load)
        sys.exit(0 if success else 1)
    elif args.image:
        # Analyze single image
        success = app.run_single_image_analysis(
            image_path=args.image,
            output_folder=args.output,
            model_path=args.model
        )
        sys.exit(0 if success else 1)
    else:
        # Run new analysis on folder
        success = app.run_analysis(
            input_folder=args.input,
            output_folder=args.output,
            model_path=args.model
        )
        sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
