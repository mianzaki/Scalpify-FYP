from ultralytics import YOLO
import glob
import cv2
import os
from pathlib import Path

# Create output directory if it doesn't exist
output_dir = Path('output')
output_dir.mkdir(exist_ok=True)

# Load the model
model = YOLO("model/best.pt")

# Get all images from testing directory
image_extensions = ['*.jpg', '*.jpeg', '*.png', '*.bmp']
test_images = []
for ext in image_extensions:
    test_images.extend(glob.glob(f'testing/{ext}'))

print(f"Found {len(test_images)} images to process")

# Process each image
for image_path in test_images:
    print(f"Processing: {image_path}")
    
    # Read the image
    img = cv2.imread(image_path)
    
    # Run prediction
    results = model.predict(img, iou=0.4)
    
    # Get the output image with predictions
    output_img = results[0].plot()
    
    # Save the output image
    base_name = os.path.basename(image_path)
    output_path = output_dir / f"segmented_{base_name}"
    cv2.imwrite(str(output_path), output_img)
    
    print(f"Saved: {output_path}")

print(f"\nProcessing complete! All outputs saved to '{output_dir}' directory.")



