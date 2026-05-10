#!/usr/bin/env python3
"""Download models from AWS S3 Storage

This script downloads your trained models from AWS S3 to your
production server. Run this during deployment or server startup.

Usage:
    python scripts/download_models_from_supabase.py

Environment Variables:
    AWS_ACCESS_KEY_ID: Your AWS access key ID
    AWS_SECRET_ACCESS_KEY: Your AWS secret access key
    AWS_REGION: AWS region (default: ap-south-1 for Mumbai)
    AWS_S3_BUCKET: S3 bucket name (default: gasp-ai-models)
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

# Load environment variables
load_dotenv(project_root / ".env")

try:
    import boto3
    from botocore.exceptions import ClientError, NoCredentialsError
except ImportError:
    print("❌ Boto3 not installed. Install with: pip install boto3")
    sys.exit(1)

# AWS S3 configuration
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION", "ap-south-1")  # Default to Mumbai
AWS_S3_BUCKET = os.getenv("AWS_S3_BUCKET", "gasp-ai-models")

if not AWS_ACCESS_KEY_ID or not AWS_SECRET_ACCESS_KEY:
    print("❌ Missing AWS credentials in .env file")
    print("   Required: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY")
    print("   Optional: AWS_REGION (default: ap-south-1), AWS_S3_BUCKET (default: gasp-ai-models)")
    sys.exit(1)

# Initialize S3 client
try:
    s3_client = boto3.client(
        's3',
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
        region_name=AWS_REGION
    )
except Exception as e:
    print(f"❌ Failed to initialize S3 client: {e}")
    sys.exit(1)

def download_file(s3_key, local_path, expected_size_mb=None):
    """Download a single file from AWS S3"""
    try:
        print(f"📥 Downloading {s3_key} to {local_path}...")

        # Create local directory if it doesn't exist
        local_dir = os.path.dirname(local_path)
        if local_dir:
            os.makedirs(local_dir, exist_ok=True)

        # Skip if file already exists and has correct size
        if os.path.exists(local_path):
            if expected_size_mb:
                current_size_mb = os.path.getsize(local_path) / (1024 * 1024)
                if abs(current_size_mb - expected_size_mb) < 0.1:  # Within 100KB
                    print(f"✅ File already exists with correct size: {local_path}")
                    return True
            else:
                print(f"ℹ️  File already exists: {local_path}")
                response = input("   Overwrite? (y/N): ")
                if response.lower() != 'y':
                    return True

        # Get file metadata from S3
        try:
            head_response = s3_client.head_object(Bucket=AWS_S3_BUCKET, Key=s3_key)
            total_size = head_response['ContentLength']
            total_size_mb = total_size / (1024 * 1024)
            print(f"   File size: {total_size_mb:.1f} MB")
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                print(f"❌ File not found in S3: {s3_key}")
                return False
            else:
                print(f"❌ Failed to get file metadata: {e}")
                return False

        # Download file with progress callback
        downloaded = 0

        def progress_callback(bytes_amount):
            nonlocal downloaded
            downloaded += bytes_amount
            if total_size > 10 * 1024 * 1024:  # Show progress for files > 10MB
                progress = (downloaded / total_size) * 100
                print(f"   Progress: {progress:.1f}%", end='\r')

        # Download from S3
        s3_client.download_file(
            AWS_S3_BUCKET,
            s3_key,
            local_path,
            Callback=progress_callback
        )

        if total_size > 10 * 1024 * 1024:
            print()  # New line after progress

        # Verify file size
        actual_size = os.path.getsize(local_path)
        actual_size_mb = actual_size / (1024 * 1024)

        if expected_size_mb and abs(actual_size_mb - expected_size_mb) > 1.0:
            print(f"⚠️  Warning: Expected {expected_size_mb:.1f}MB but got {actual_size_mb:.1f}MB")

        print(f"✅ Downloaded: {local_path} ({actual_size_mb:.1f} MB)")
        return True

    except NoCredentialsError:
        print(f"❌ AWS credentials not found or invalid")
        return False
    except ClientError as e:
        print(f"❌ AWS S3 error: {e}")
        if os.path.exists(local_path):
            os.remove(local_path)  # Clean up partial download
        return False
    except Exception as e:
        print(f"❌ Failed to download {s3_key}: {e}")
        if os.path.exists(local_path):
            os.remove(local_path)  # Clean up partial download
        return False

def main():
    """Main download process"""
    print("🚀 Starting model download from AWS S3...")
    print(f"   Project: {project_root}")
    print(f"   S3 Bucket: {AWS_S3_BUCKET}")
    print(f"   Region: {AWS_REGION}")
    print()

    # Define models to download with expected sizes (from S3)
    models_to_download = [
        # (s3_key, local_path, expected_size_mb)
        ("best.pt", "model/best.pt", 19.6),
        ("selfie_model.pt", "model/selfie_model.pt", 5.7),
        ("bald_back_model.pt", "model/bald_back_model.pt", 38.9),
    ]

    successful_downloads = 0
    total_downloads = len(models_to_download)

    for s3_key, local_path, expected_size_mb in models_to_download:
        full_local_path = project_root / local_path

        print(f"\n📄 Downloading file: {s3_key}")
        if download_file(s3_key, str(full_local_path), expected_size_mb):
            successful_downloads += 1

    # Summary
    print(f"\n📊 Download Summary:")
    print(f"   Successful: {successful_downloads}/{total_downloads}")
    print(f"   Failed: {total_downloads - successful_downloads}")

    if successful_downloads == total_downloads:
        print("🎉 All models downloaded successfully!")
        print("\n💡 Your API server can now load the models from:")
        for _, local_path, _ in models_to_download:
            print(f"   - {local_path}")
    else:
        print("⚠️  Some downloads failed. Check the error messages above.")
        sys.exit(1)

if __name__ == "__main__":
    main()