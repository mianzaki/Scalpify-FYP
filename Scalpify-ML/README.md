# GASP-AI: Advanced Baldness Analysis Microservices

[![Python 3.12](https://img.shields.io/badge/python-3.12-blue.svg)](https://www.python.org/downloads/release/python-3120/)
[![YOLOv11](https://img.shields.io/badge/YOLOv11-Segmentation-green.svg)](https://github.com/ultralytics/ultralytics)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104-009688.svg)](https://fastapi.tiangolo.com/)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

**GASP-AI** (Genetic Alopecia Severity Prediction using Artificial Intelligence) is a cutting-edge microservices-based computer vision system that uses YOLOv11 segmentation models to analyze and quantify baldness patterns in images. The system provides precise measurements of bald areas, hair journey tracking, and generates detailed analytical reports through a comprehensive REST API.

## 🚀 Features

### Core Functionality
- **Advanced Segmentation**: Uses YOLOv11 for precise hair and bald area detection
- **Multi-unit Measurements**: Calculates areas in pixels, cm², m², and square inches
- **Real-time Analysis**: Fast inference with detailed timing metrics
- **Hair Journey Tracking**: Monitor hair growth progress over time
- **Visual Annotations**: Generate annotated images with overlays and measurements
- **Supabase Integration**: Persistent data storage and retrieval

### Output Formats
- **Annotated Images**: Visual results with colored overlays and detailed measurements
- **JSON Reports**: Comprehensive data export with statistics and individual results
- **Hair Journey Reports**: Time-series analysis of hair growth patterns
- **Real-time API Responses**: RESTful endpoints for seamless integration

### Advanced Analytics
- **Baldness Classification**: Norwood Scale classification with confidence scores
- **Severity Analysis**: Comprehensive baldness assessment
- **Progress Tracking**: Monitor changes over time
- **Statistical Analysis**: Detailed metrics and comparative analysis
- **Coordinate Extraction**: Precise bald area boundary detection

## 📁 Project Structure

```
gasp-ai-microservices/
├── app.py                           # Main CLI application interface
├── api/                            # FastAPI REST API Microservice
│   ├── app/
│   │   ├── main.py                # FastAPI application entry point
│   │   ├── api/
│   │   │   └── v1/
│   │   │       ├── endpoints/     # API endpoints
│   │   │       │   ├── analysis.py    # Hair analysis endpoints
│   │   │       │   ├── health.py      # Health check endpoints
│   │   │       │   └── hair_journey.py # Hair journey tracking
│   │   │       └── router.py       # API router configuration
│   │   ├── core/                   # Core utilities and configuration
│   │   │   ├── config.py          # Environment configuration
│   │   │   ├── exceptions.py      # Custom exception handlers
│   │   │   └── supabase_client.py # Database connection
│   │   ├── models/                 # Data models and schemas
│   │   │   └── schemas.py         # Pydantic data models
│   │   ├── services/               # Business logic services
│   │   │   ├── analysis_service.py     # Core analysis service
│   │   │   └── hair_journey_service.py # Journey tracking service
│   │   └── utils/                  # Utility functions
│   │       └── coordinate_extractor.py # Coordinate extraction utility
│   └── migrations/                 # Database migrations
├── src/                            # Core analysis components
│   ├── components/
│   │   └── bald_area_calculation_service.py # YOLO-based analysis engine
│   └── utils/                      # Analysis utilities
│       ├── calculate_bald_area.py      # Area calculation script
│       └── yolov11_bald_segmentation_script.py # Segmentation script
├── model/                          # AI Models
│   ├── best.pt                     # YOLOv11 segmentation model
│   └── bald-classification-model/  # Classification model assets
├── scripts/                        # Deployment and utility scripts
│   ├── upload_models_to_supabase.py    # Model deployment script
│   └── download_models_from_supabase.py # Model retrieval script
├── test/                           # Test images and data
├── output/                         # Analysis results
├── requirements.txt                # Python dependencies
└── env/                           # Python virtual environment
```

## 🛠️ Installation

### Prerequisites
- Python 3.12 (recommended) or Python 3.8+
- CUDA-compatible GPU (optional, for faster inference)

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/gasp-ai-microservices.git
   cd gasp-ai-microservices
   ```

2. **Create and activate virtual environment**
   ```bash
   python3.12 -m venv env
   source env/bin/activate  # On Windows: env\\Scripts\\activate
   ```

3. **Install dependencies**
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

4. **Environment Configuration**
   ```bash
   # Create environment file (update with your credentials)
   cp .env.example .env
   nano .env  # Configure Supabase credentials and other settings
   ```

5. **Verify installation**
   ```bash
   python app.py --version
   # Test API health check
   uvicorn api.app.main:app --reload --port 8000 &
   curl http://localhost:8000/api/v1/health
   ```

### Model Setup
Place your trained YOLOv11 model file (`best.pt`) in the `model/` directory. The model should be trained to detect two classes:
- Class 0: `bald` - Bald/hairless areas
- Class 1: `hair` - Areas with hair coverage

## 🖥️ Usage

### REST API

The application provides a comprehensive REST API built with FastAPI for integration with other applications.

#### Starting the API Server
```bash
# Development mode with auto-reload
cd api
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Production mode
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4

# Using the root directory
uvicorn api.app.main:app --reload --host 0.0.0.0 --port 8000
```

#### API Endpoints

##### 1. Health Check
```bash
GET /api/v1/health
```
Returns server status and system information.

##### 2. Analyze Image
```bash
POST /api/v1/analyze
```
**Request:**
- `file`: Image file (multipart/form-data)
- `user_id`: Optional user identifier (form field)
- `save_annotated`: Optional boolean to save annotated image (form field)
- `include_coordinates`: Optional boolean to include bald area coordinates (form field)

**Example using cURL:**
```bash
curl -X POST "http://localhost:8000/api/v1/analyze" \
  -F "file=@path/to/image.jpg" \
  -F "user_id=user123" \
  -F "save_annotated=true" \
  -F "include_coordinates=true"
```

**Example using Python:**
```python
import requests

url = "http://localhost:8000/api/v1/analyze"
files = {"file": open("image.jpg", "rb")}
data = {"user_id": "user123"}

response = requests.post(url, files=files, data=data)
result = response.json()
print(f"Baldness ratio: {result['data']['percentages']['baldness_ratio']}%")
```

**Response Example:**
```json
{
  "success": true,
  "message": "Analysis completed successfully",
  "data": {
    "session_id": "uuid-here",
    "filename": "image.jpg",
    "analysis_results": {
      "baldness_ratio": 25.8,
      "hair_coverage": 74.2,
      "total_area_pixels": 348672,
      "bald_area_pixels": 89901,
      "hair_area_pixels": 258771
    },
    "measurements": {
      "areas_cm2": {
        "bald": 44.6,
        "hair": 128.5,
        "total_head": 173.1
      },
      "areas_inch2": {
        "bald": 6.9,
        "hair": 19.9,
        "total_head": 26.8
      }
    },
    "classification": {
      "severity_level": "Mild",
      "norwood_scale": "III",
      "confidence_score": 0.87
    },
    "coordinates": {
      "bald_areas": [[x1, y1], [x2, y2], ...],
      "hair_areas": [[x1, y1], [x2, y2], ...]
    },
    "annotated_image_path": "/tmp/annotated_uuid.jpg"
  },
  "metadata": {
    "processing_time_ms": 456.2,
    "model_version": "YOLOv11",
    "timestamp": "2024-01-15T10:30:00Z",
    "user_id": "user123"
  }
}
```

##### 3. Hair Journey Tracking
```bash
# Get hair journey for a user
GET /api/v1/hair-journey/{user_id}

# Create hair journey entry
POST /api/v1/hair-journey
```
Track and analyze hair growth progress over time.

##### 4. Batch Analysis
```bash
POST /api/v1/analyze/batch
```
Process multiple images in a single request for bulk analysis.

##### 5. Model Information
```bash
GET /api/v1/model/info
```
Get information about the current model and its capabilities.

#### API Documentation

Interactive API documentation is available when running in debug mode:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

### Command Line Interface

The main application provides several usage modes:

#### Basic Analysis
```bash
# Analyze all images in the test/ folder
python app.py

# Analyze images in a custom folder
python app.py --input my_images/

# Save results to a custom output folder
python app.py --output my_results/
```

#### Advanced Options
```bash
# Use a custom model
python app.py --model path/to/your/model.pt

# Load and display previous results
python app.py --load output/analysis_results.json

# Get help
python app.py --help
```

### Individual Scripts

#### Detailed Analysis with Visualizations
```bash
python src/utils/calculate_bald_area.py
```
Generates CSV, JSON, and visualization outputs in `analysis_output/`.

#### Basic Segmentation
```bash
python src/utils/yolov11_bald_segmentation_script.py
```
Simple segmentation with basic outputs in `output/`.

#### Model Management Scripts
```bash
# Upload models to Supabase storage
python scripts/upload_models_to_supabase.py

# Download models from Supabase storage
python scripts/download_models_from_supabase.py
```

## 📊 Output Examples

### Console Output
```
Processing: testing/image_173.jpg

0: 640x640 1 bald, 1 hair, 456.2ms
Speed: 152.1ms preprocess, 456.2ms inference, 45.6ms postprocess per image at shape (1, 3, 640, 640)
Saved: output/annotated_image_173.jpg
```

### Sample Analysis Results
```json
{
  "filename": "image_173.jpg",
  "percentages": {
    "baldness_ratio": 25.8,
    "hair_coverage": 74.2
  },
  "areas_cm2": {
    "bald": 44.6,
    "hair": 128.5,
    "total_head": 173.1
  },
  "areas_inch2": {
    "bald": 6.9,
    "hair": 19.9,
    "total_head": 26.8
  }
}
```

### Visual Annotations

The system generates annotated images showing:
- **Red overlay**: Bald areas
- **Green overlay**: Hair areas
- **Contour lines**: Precise boundaries
- **Measurement text**: Detailed statistics overlay
- **Color-coded baldness percentage**: Visual severity indicator

Sample output images are available in the `output/` folder and temporary directories for API responses.

## 📈 Analysis Metrics

### Primary Measurements
- **Baldness Ratio**: `(Bald Area / Total Head Area) × 100`
- **Hair Coverage**: `(Hair Area / Total Head Area) × 100`
- **Area Calculations**: Precise pixel-to-real-world conversions

### Real-World Conversions
- **Reference**: Average human head width (15 cm)
- **Pixel-to-CM**: Dynamic scaling based on detected head size
- **Multi-unit Output**: cm², m², and square inches

### Statistical Analysis
- Average, minimum, maximum values across datasets
- Standard deviation calculations
- Processing time metrics
- Comparative analysis tools

## 🔧 Configuration

### Model Parameters
- **IOU Threshold**: 0.4 (adjustable in code)
- **Confidence Threshold**: Default YOLO settings
- **Image Processing**: Auto-resize with aspect ratio preservation

### API Configuration
- Environment variables in `.env` file
- Supabase database configuration
- Model paths and device settings
- CORS and security settings

### Output Customization
- Modify overlay colors in analysis service
- Adjust confidence thresholds
- Configure measurement units and precision
- Customize coordinate extraction parameters

## 🧪 Testing and Validation

The system has been tested on a diverse dataset including:
- Various hair types and textures
- Different lighting conditions
- Multiple ethnicities and age groups
- Range of baldness severities (10.2% - 50.2%)
- Hair journey progression tracking

### Performance Metrics
- **Average Processing Time**: ~456ms per image
- **API Response Time**: Sub-second response for single image analysis
- **Accuracy**: High precision segmentation with YOLOv11
- **Scalability**: Microservices architecture supports concurrent requests
- **Database Performance**: Optimized Supabase queries for hair journey tracking

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Setup
```bash
# Install development dependencies (if available)
pip install -r requirements.txt

# Run the API in development mode
cd api
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Test the API endpoints
curl http://localhost:8000/api/v1/health
curl -X POST "http://localhost:8000/api/v1/analyze" -F "file=@test/image.jpg"
```

## 🚀 Deployment

### Production Deployment

1. **Server Setup (Ubuntu)**
   ```bash
   # Install system dependencies
   sudo apt update && sudo apt upgrade -y
   sudo apt install -y python3.12 python3.12-venv python3.12-dev python3-pip
   sudo apt install -y libgl1-mesa-dev libglib2.0-0t64 libsm6 libxext6 libxrender-dev libgomp1
   
   # Clone and setup
   git clone <your-repo-url>
   cd gasp-ai-microservices
   python3.12 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

2. **Environment Configuration**
   ```bash
   # Create production environment file
   cp .env.example .env
   nano .env  # Configure for production
   ```

3. **Systemd Service (Optional)**
   ```bash
   # Create service file
   sudo nano /etc/systemd/system/gaspai.service
   sudo systemctl daemon-reload
   sudo systemctl enable gaspai
   sudo systemctl start gaspai
   ```

4. **Nginx Reverse Proxy (Optional)**
   ```bash
   # Configure Nginx for API routing
   sudo apt install -y nginx
   # Configure virtual host for your domain
   ```

### Docker Deployment (Coming Soon)

```bash
# Build and run with Docker Compose
docker-compose up -d
```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📧 Support

For support, feature requests, or bug reports:
- Create an issue on GitHub
- Check the API documentation at `/docs` when running the server
- Review the configuration in `.env.example`

