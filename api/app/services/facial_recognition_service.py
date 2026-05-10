"""
Facial Recognition Service using AWS Rekognition
Detects facial features and landmarks, returns coordinates mapped to specified dimensions
"""
import boto3
import io
import time
from typing import Dict, List, Optional, Tuple
from PIL import Image
from botocore.exceptions import ClientError, NoCredentialsError
from app.core.config import get_settings

settings = get_settings()


class FacialRecognitionService:
    """Service for facial recognition using AWS Rekognition"""

    def __init__(self):
        """Initialize AWS Rekognition client"""
        try:
            self.rekognition_client = boto3.client(
                'rekognition',
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
                region_name=settings.AWS_REGION
            )
            print("✅ AWS Rekognition client initialized")
        except (NoCredentialsError, ClientError) as e:
            print(f"❌ Failed to initialize AWS Rekognition client: {e}")
            raise

    def standardize_image(self, image_bytes: bytes, target_size: Tuple[int, int] = (512, 512)) -> Tuple[Image.Image, bytes]:
        """
        Standardize image to target size while maintaining aspect ratio

        Args:
            image_bytes: Raw image bytes
            target_size: Target (width, height) for standardization

        Returns:
            Tuple of (PIL Image, standardized image bytes)
        """
        try:
            # Open image
            img = Image.open(io.BytesIO(image_bytes))

            # Convert to RGB if needed
            if img.mode != 'RGB':
                img = img.convert('RGB')

            # Get original dimensions
            original_width, original_height = img.size

            # Calculate aspect ratio
            aspect_ratio = original_width / original_height
            target_width, target_height = target_size

            # Resize to fit within target size while maintaining aspect ratio
            if aspect_ratio > 1:  # Landscape
                new_width = target_width
                new_height = int(target_width / aspect_ratio)
            else:  # Portrait or square
                new_height = target_height
                new_width = int(target_height * aspect_ratio)

            # Resize image
            img_resized = img.resize((new_width, new_height), Image.Resampling.LANCZOS)

            # Create canvas with target size and paste resized image centered
            canvas = Image.new('RGB', target_size, (255, 255, 255))
            x_offset = (target_width - new_width) // 2
            y_offset = (target_height - new_height) // 2
            canvas.paste(img_resized, (x_offset, y_offset))

            # Convert to bytes
            buffer = io.BytesIO()
            canvas.save(buffer, format='JPEG', quality=95)
            standardized_bytes = buffer.getvalue()

            return canvas, standardized_bytes

        except Exception as e:
            print(f"❌ Error standardizing image: {e}")
            raise

    def detect_faces_and_landmarks(self, image_bytes: bytes) -> Dict:
        """
        Detect faces and facial landmarks using AWS Rekognition

        Args:
            image_bytes: Image bytes to analyze

        Returns:
            Dictionary with face details and landmarks
        """
        try:
            start_time = time.time()

            # Call AWS Rekognition DetectFaces API
            response = self.rekognition_client.detect_faces(
                Image={'Bytes': image_bytes},
                Attributes=['ALL']  # Get all facial attributes including landmarks
            )

            processing_time = (time.time() - start_time) * 1000

            print(f"✅ AWS Rekognition completed in {processing_time:.2f}ms")
            print(f"📊 Detected {len(response['FaceDetails'])} face(s)")

            return {
                'face_details': response['FaceDetails'],
                'processing_time_ms': processing_time,
                'face_count': len(response['FaceDetails'])
            }

        except ClientError as e:
            print(f"❌ AWS Rekognition error: {e}")
            raise
        except Exception as e:
            print(f"❌ Unexpected error in face detection: {e}")
            raise

    def map_coordinates_to_dimensions(
        self,
        landmarks: List[Dict],
        source_width: int,
        source_height: int,
        target_width: int,
        target_height: int
    ) -> List[Dict]:
        """
        Map landmark coordinates from source dimensions to target dimensions

        Args:
            landmarks: List of landmark dictionaries with X, Y values (0-1 range)
            source_width: Source image width
            source_height: Source image height
            target_width: Target width for coordinate mapping
            target_height: Target height for coordinate mapping

        Returns:
            List of landmarks with coordinates in target dimensions
        """
        mapped_landmarks = []

        for landmark in landmarks:
            # AWS Rekognition returns X, Y as ratios (0-1)
            x_ratio = landmark['X']
            y_ratio = landmark['Y']

            # Map to target dimensions
            x = int(x_ratio * target_width)
            y = int(y_ratio * target_height)

            # Ensure within bounds
            x = max(0, min(x, target_width - 1))
            y = max(0, min(y, target_height - 1))

            mapped_landmarks.append({
                'type': landmark['Type'],
                'x': x,
                'y': y,
                'x_ratio': x_ratio,
                'y_ratio': y_ratio
            })

        return mapped_landmarks

    async def process_facial_recognition(
        self,
        image_bytes: bytes,
        filename: str,
        target_width: int = 512,
        target_height: int = 512
    ) -> Dict:
        """
        Process full facial recognition pipeline

        Args:
            image_bytes: Raw image bytes
            filename: Original filename
            target_width: Target width for coordinate mapping
            target_height: Target height for coordinate mapping

        Returns:
            Dictionary with facial recognition results
        """
        start_time = time.time()

        try:
            print(f"\n{'='*60}")
            print(f"🔍 Starting Facial Recognition")
            print(f"   File: {filename}")
            print(f"   Target dimensions: {target_width}x{target_height}")
            print(f"{'='*60}\n")

            # Step 1: Standardize image
            print("📐 Standardizing image...")
            standardized_image, standardized_bytes = self.standardize_image(
                image_bytes,
                (target_width, target_height)
            )
            std_width, std_height = standardized_image.size

            # Step 2: Detect faces and landmarks
            print("🎯 Detecting faces and landmarks...")
            detection_result = self.detect_faces_and_landmarks(standardized_bytes)

            # Step 3: Process each detected face
            faces_data = []
            for idx, face_detail in enumerate(detection_result['face_details']):
                print(f"\n👤 Processing face {idx + 1}")

                # Get bounding box
                bbox = face_detail['BoundingBox']
                bbox_mapped = {
                    'left': int(bbox['Left'] * target_width),
                    'top': int(bbox['Top'] * target_height),
                    'width': int(bbox['Width'] * target_width),
                    'height': int(bbox['Height'] * target_height)
                }

                # Map landmarks to target dimensions
                landmarks = self.map_coordinates_to_dimensions(
                    face_detail['Landmarks'],
                    std_width,
                    std_height,
                    target_width,
                    target_height
                )

                # Get facial attributes
                attributes = {
                    'confidence': face_detail['Confidence'],
                    'age_range': face_detail.get('AgeRange', {}),
                    'gender': face_detail.get('Gender', {}),
                    'emotions': face_detail.get('Emotions', []),
                    'pose': face_detail.get('Pose', {}),
                    'quality': face_detail.get('Quality', {}),
                    'smile': face_detail.get('Smile', {}),
                    'eyeglasses': face_detail.get('Eyeglasses', {}),
                    'sunglasses': face_detail.get('Sunglasses', {}),
                    'beard': face_detail.get('Beard', {}),
                    'mustache': face_detail.get('Mustache', {}),
                    'eyes_open': face_detail.get('EyesOpen', {}),
                    'mouth_open': face_detail.get('MouthOpen', {})
                }

                face_data = {
                    'face_id': idx + 1,
                    'bounding_box': bbox_mapped,
                    'landmarks': landmarks,
                    'attributes': attributes
                }

                faces_data.append(face_data)

                print(f"   ✅ Found {len(landmarks)} landmarks")
                print(f"   📊 Confidence: {face_detail['Confidence']:.2f}%")

            # Calculate total processing time
            total_time = (time.time() - start_time) * 1000

            result = {
                'success': True,
                'face_count': detection_result['face_count'],
                'faces': faces_data,
                'image_info': {
                    'filename': filename,
                    'dimensions': {
                        'width': target_width,
                        'height': target_height
                    },
                    'original_dimensions': {
                        'width': std_width,
                        'height': std_height
                    }
                },
                'processing_time_ms': total_time,
                'aws_processing_time_ms': detection_result['processing_time_ms']
            }

            print(f"\n{'='*60}")
            print(f"✅ Facial Recognition Completed")
            print(f"   Total time: {total_time:.2f}ms")
            print(f"   AWS Rekognition time: {detection_result['processing_time_ms']:.2f}ms")
            print(f"   Faces detected: {detection_result['face_count']}")
            print(f"{'='*60}\n")

            return result

        except Exception as e:
            print(f"❌ Error in facial recognition: {e}")
            raise
