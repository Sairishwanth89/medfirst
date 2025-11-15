from prometheus_client import Counter, Histogram, Gauge
from fastapi import FastAPI, Request
import time
import logging

logger = logging.getLogger(__name__)

# Define Prometheus metrics
request_count = Counter(
    "http_requests_total",
    "Total HTTP requests",
    ["method", "endpoint", "status"]
)

request_duration = Histogram(
    "http_request_duration_seconds",
    "HTTP request duration in seconds",
    ["method", "endpoint"]
)

active_users = Gauge(
    "active_users_total",
    "Number of active users"
)

medicine_search_count = Counter(
    "medicine_searches_total",
    "Total medicine searches",
    ["city"]
)

order_count = Counter(
    "orders_total",
    "Total orders placed",
    ["status"]
)

stock_updates = Counter(
    "stock_updates_total",
    "Total stock updates",
    ["action"]
)

cache_hits = Counter(
    "cache_hits_total",
    "Total cache hits",
    ["cache_type"]
)

cache_misses = Counter(
    "cache_misses_total",
    "Total cache misses",
    ["cache_type"]
)


def setup_metrics(app: FastAPI):
    """
    Setup Prometheus metrics middleware
    
    Args:
        app: FastAPI application instance
    """
    
    @app.middleware("http")
    async def prometheus_middleware(request: Request, call_next):
        """Middleware to collect metrics"""
        start_time = time.time()
        
        # Process request
        response = await call_next(request)
        
        # Calculate duration
        duration = time.time() - start_time
        
        # Extract endpoint info
        method = request.method
        endpoint = request.url.path
        status = response.status_code
        
        # Record metrics
        request_count.labels(method=method, endpoint=endpoint, status=status).inc()
        request_duration.labels(method=method, endpoint=endpoint).observe(duration)
        
        # Add custom header with request duration
        response.headers["X-Process-Time"] = str(duration)
        
        return response
    
    logger.info("Prometheus metrics middleware configured")


def track_medicine_search(city: str = "unknown"):
    """Track medicine search event"""
    medicine_search_count.labels(city=city).inc()


def track_order(status: str):
    """Track order event"""
    order_count.labels(status=status).inc()


def track_stock_update(action: str):
    """Track stock update event"""
    stock_updates.labels(action=action).inc()


def track_cache_hit(cache_type: str):
    """Track cache hit"""
    cache_hits.labels(cache_type=cache_type).inc()


def track_cache_miss(cache_type: str):
    """Track cache miss"""
    cache_misses.labels(cache_type=cache_type).inc()
