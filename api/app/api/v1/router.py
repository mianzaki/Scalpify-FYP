from fastapi import APIRouter
from app.api.v1.endpoints import analysis, health, hair_journey, facial_recognition

api_router = APIRouter()

# Include endpoint routers
api_router.include_router(
    analysis.router,
    prefix="",
    tags=["analysis"]
)

api_router.include_router(
    hair_journey.router,
    prefix="",
    tags=["hair_journey"]
)

api_router.include_router(
    facial_recognition.router,
    prefix="",
    tags=["facial_recognition"]
)

api_router.include_router(
    health.router,
    prefix="",
    tags=["health"]
)