from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_client import make_asgi_app
import logging

from api.routes import auth, medicines, stock, orders
from core.config import settings
from core.monitoring import setup_metrics

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Medicine Availability System",
    description="Real-time medicine availability and emergency delivery system",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Setup monitoring
setup_metrics(app)

# Include API routes
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(medicines.router, prefix="/api/medicines", tags=["Medicines"])
app.include_router(stock.router, prefix="/api/stock", tags=["Stock Management"])
app.include_router(orders.router, prefix="/api/orders", tags=["Orders"])

# Prometheus metrics endpoint
metrics_app = make_asgi_app()
app.mount("/metrics", metrics_app)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Medicine Availability System",
        "version": "1.0.0"
    }


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    logger.info("Starting Medicine Availability System...")
    # Add any startup tasks here (e.g., connecting to databases)


@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down Medicine Availability System...")
    # Add any cleanup tasks here
