from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
import time
import uuid
from contextlib import asynccontextmanager

from app.core.config import get_settings
from app.core.exceptions import GASPException
from app.api.v1.router import api_router

settings = get_settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan events for startup and shutdown"""
    # Startup
    print(f"🚀 Starting {settings.APP_NAME} v{settings.VERSION}")
    print(f"🔧 Debug mode: {settings.DEBUG}")
    
    yield
    
    # Shutdown
    print(f"🛑 Shutting down {settings.APP_NAME}")

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="""
    # GASP-AI: Advanced Baldness Analysis System
    
    A cutting-edge computer vision system that uses YOLOv11 segmentation models to analyze 
    and quantify baldness patterns in images.
    
    ## Features
    
    * **Precise Segmentation**: YOLOv11-based hair/bald area detection
    * **Multi-unit Measurements**: Results in pixels, cm², and square inches  
    * **Severity Classification**: Norwood scale classification with recommendations
    * **Visual Annotations**: Annotated images with overlays and measurements
    * **History Tracking**: Track analysis over time with progression analysis
    * **Real-time Processing**: Fast inference with detailed timing metrics
    
    ## Supported Formats
    
    * **Image Types**: JPG, PNG, BMP
    * **Max File Size**: 10MB
    * **Min Resolution**: 224x224 pixels
    * **Max Resolution**: 4096x4096 pixels
    
    ## Authentication
    
    Currently open API. Authentication can be added for production use.
    """,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Add trusted host middleware for production
if not settings.DEBUG:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.ALLOWED_HOSTS
    )

# Request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """Add processing time header to responses"""
    start_time = time.time()
    
    # Add request ID for tracing
    request_id = str(uuid.uuid4())
    request.state.request_id = request_id
    
    response = await call_next(request)
    
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    response.headers["X-Request-ID"] = request_id
    
    return response

# Exception handlers
@app.exception_handler(GASPException)
async def gasp_exception_handler(request: Request, exc: GASPException):
    """Handle custom GASP exceptions"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "status": "error",
            "error": {
                "code": exc.error_code,
                "message": exc.detail,
                "details": exc.extra_data
            },
            "request_id": getattr(request.state, "request_id", None),
            "timestamp": time.time()
        },
        headers=exc.headers
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle validation errors"""
    return JSONResponse(
        status_code=422,
        content={
            "success": False,
            "status": "error",
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Request validation failed",
                "details": {
                    "errors": exc.errors()
                }
            },
            "request_id": getattr(request.state, "request_id", None),
            "timestamp": time.time()
        }
    )

@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    """Handle 404 errors"""
    return JSONResponse(
        status_code=404,
        content={
            "success": False,
            "status": "error",
            "error": {
                "code": "NOT_FOUND", 
                "message": f"Endpoint not found: {request.url.path}",
                "details": {
                    "available_endpoints": [
                        "/api/v1/analyze",
                        "/api/v1/health",
                        "/api/v1/model/info",
                        "/api/v1/hair-journey/generate",
                        "/api/v1/hair-journey/history",
                        "/docs"
                    ]
                }
            },
            "request_id": getattr(request.state, "request_id", None),
            "timestamp": time.time()
        }
    )

# Include API router
app.include_router(api_router, prefix=settings.API_V1_STR)

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": f"Welcome to {settings.APP_NAME}",
        "version": settings.VERSION,
        "description": "Advanced baldness analysis using computer vision",
        "endpoints": {
            "analyze": f"{settings.API_V1_STR}/analyze",
            "health": f"{settings.API_V1_STR}/health",
            "documentation": "/docs" if settings.DEBUG else "Contact admin for docs"
        },
        "status": "operational"
    }

# Development server info
if __name__ == "__main__":
    import uvicorn
    
    print(f"🔥 Starting development server...")
    print(f"📝 API Documentation: http://localhost:8000/docs")
    print(f"🧪 Health Check: http://localhost:8000/api/v1/health")
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info" if settings.DEBUG else "warning"
    )