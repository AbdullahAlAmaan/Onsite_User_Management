from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from contextlib import asynccontextmanager
import traceback
from app.core.config import settings
from app.api import api_router
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
import logging

logger = logging.getLogger(__name__)

# Global scheduler instance
scheduler = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan - startup and shutdown."""
    # Startup
    global scheduler
    if settings.SMTP_ENABLED and settings.ADMIN_EMAIL:
        try:
            from app.services.reminder_service import ReminderService
            
            # Create and start scheduler
            scheduler = BackgroundScheduler()
            
            # Schedule reminder check to run every minute
            scheduler.add_job(
                ReminderService.check_and_send_reminders,
                trigger=IntervalTrigger(minutes=1),
                id='class_reminder_check',
                name='Check and send class reminders',
                replace_existing=True
            )
            
            scheduler.start()
            logger.info("Scheduler started - class reminders will be checked every minute")
        except Exception as e:
            logger.error(f"Failed to start scheduler: {str(e)}")
    else:
        logger.info("Scheduler not started - email service not enabled or ADMIN_EMAIL not configured")
    
    yield
    
    # Shutdown
    if scheduler and scheduler.running:
        scheduler.shutdown()
        logger.info("Scheduler stopped")

app = FastAPI(
    title="Physical Course Enrollment Management System",
    description="Automated enrollment management with eligibility checks and instructor approvals",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware - restrict to specific origins and methods
# Ensure CORS_ORIGINS is a list
cors_origins = settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else ["http://localhost:3000", "http://localhost:5173"]

# Add CORS middleware - must be added before other middleware
# For development, allow all methods and headers to avoid CORS issues
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
    expose_headers=["Content-Type", "Authorization"],
    max_age=3600,  # Cache preflight requests for 1 hour
)

# Exception handler to ensure CORS headers on errors
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Handle all exceptions and ensure CORS headers are present."""
    origin = request.headers.get("origin")
    headers = {}
    if origin and origin in cors_origins:
        headers = {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept, Origin",
        }
    
    # Log the error for debugging
    print(f"Error: {str(exc)}")
    print(traceback.format_exc())
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error", "error": str(exc) if settings.DEBUG else "An error occurred"},
        headers=headers
    )

@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle HTTP exceptions and ensure CORS headers."""
    origin = request.headers.get("origin")
    headers = {}
    if origin and origin in cors_origins:
        headers = {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS, HEAD",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With, Accept, Origin",
        }
    
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
        headers=headers
    )

# Include API routes
app.include_router(api_router, prefix="/api/v1")

@app.get("/")
async def root():
    return {
        "message": "Physical Course Enrollment Management System API",
        "version": "1.0.0",
        "docs": "/docs"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

