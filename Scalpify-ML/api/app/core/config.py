from pydantic_settings import BaseSettings
from typing import Set, Optional
from functools import lru_cache
import os

class Settings(BaseSettings):
    # App settings
    APP_NAME: str = "GASP-AI API"
    VERSION: str = "1.0.0"
    DEBUG: bool = True
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    ENABLE_DOCS: bool = True
    ENABLE_PROFILING: bool = False
    
    # CORS settings
    ALLOWED_HOSTS: list[str] = ["*"]  # Configure for production
    CORS_ORIGINS: list[str] = ["*"]   # Configure for production
    
    # Supabase settings (optional for development)
    SUPABASE_URL: Optional[str] = None
    SUPABASE_ANON_KEY: Optional[str] = None
    SUPABASE_SERVICE_KEY: Optional[str] = None
    
    # File upload settings
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_EXTENSIONS: Set[str] = {".jpg", ".jpeg", ".png", ".bmp"}
    ALLOWED_MIME_TYPES: Set[str] = {
        "image/jpeg", 
        "image/jpg", 
        "image/png", 
        "image/bmp"
    }
    
    # Image processing settings
    MIN_IMAGE_SIZE: tuple[int, int] = (224, 224)
    MAX_IMAGE_SIZE: tuple[int, int] = (4096, 4096)
    
    # ML Model settings
    MODEL_PATH: str = "../model/best.pt"
    CONFIDENCE_THRESHOLD: float = 0.4
    IOU_THRESHOLD: float = 0.4
    
    # Storage settings
    STORAGE_BUCKET_UPLOADS: str = "uploads"
    STORAGE_BUCKET_PROCESSED: str = "processed"
    FILE_EXPIRY_HOURS: int = 24
    
    # Rate limiting
    RATE_LIMIT_REQUESTS: int = 10
    RATE_LIMIT_WINDOW: int = 60  # seconds
    
    # Security
    SECRET_KEY: Optional[str] = None
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    ENABLE_API_KEY_AUTH: bool = False
    
    # AWS settings
    AWS_REGION: Optional[str] = "us-east-1"
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_S3_BUCKET: Optional[str] = "gasp-ai-models"
    
    # Debug settings
    DEBUG_RESPONSES: bool = False
    
    # Replicate API settings
    REPLICATE_API_TOKEN: Optional[str] = None

    # OpenAI settings (powers the in-app Scalpify chat assistant)
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_CHAT_MODEL: str = "gpt-4o-mini"
    
    # Server settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 2
    
    # Supabase table settings
    SUPABASE_SESSIONS_TABLE: str = "analysis_sessions"
    SUPABASE_RESULTS_TABLE: str = "analysis_results"
    
    # ML settings
    DEVICE: str = "cpu"
    MODEL_CONFIDENCE: float = 0.25
    MODEL_IOU: float = 0.4
    
    # Storage directories
    UPLOAD_DIR: str = "../uploads"
    OUTPUT_DIR: str = "../output"
    MAX_STORAGE_PER_USER: int = 100
    
    # Logging
    LOG_LEVEL: str = "INFO"
    
    # Metrics and caching
    ENABLE_METRICS: bool = True
    CACHE_TTL: int = 3600
    
    # Email settings
    SMTP_PORT: int = 587
    SMTP_TLS: bool = True
    FROM_EMAIL: str = "noreply@your-domain.com"
    
    # Rate limiting
    RATE_LIMIT_PER_MINUTE: int = 30
    MAX_CONCURRENT_REQUESTS: int = 5
    
    # JWT settings
    JWT_SECRET_KEY: str = "your-super-secret-jwt-key-here"
    JWT_EXPIRATION_HOURS: int = 24
    
    class Config:
        env_file = "../.env"  # Look for .env in parent directory
        case_sensitive = True

@lru_cache()
def get_settings():
    return Settings()