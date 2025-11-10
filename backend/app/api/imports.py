from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from typing import Optional
import os
import aiofiles
from datetime import datetime
from app.db.base import get_db
from app.core.config import settings
from app.services.import_service import ImportService
from app.services.azure_storage_service import AzureStorageService

router = APIRouter()

@router.post("/excel")
async def upload_excel(
    file: UploadFile = File(...),
    course_id: int = Query(..., description="ID of the course to enroll students in"),
    db: Session = Depends(get_db)
):
    """Upload and process Excel file with enrollment data."""
    # Validate file type
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="File must be Excel format (.xlsx or .xls)")
    
    # Save uploaded file temporarily
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    file_path = os.path.join(settings.UPLOAD_DIR, f"{timestamp}_{file.filename}")
    
    async with aiofiles.open(file_path, 'wb') as out_file:
        content = await file.read()
        await out_file.write(content)
    
    # Upload to Azure Blob Storage if configured
    blob_url = None
    storage_service = AzureStorageService()
    if storage_service.blob_service_client:
        blob_name = f"imports/{timestamp}_{file.filename}"
        blob_url = storage_service.upload_file(file_path, blob_name)
    
    try:
        # Parse and process
        records = ImportService.parse_excel(file_path)
        results = ImportService.process_incoming_enrollments(db, records, course_id)
        
        return {
            "message": "File processed successfully",
            "results": results,
            "blob_url": blob_url
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")
    finally:
        # Clean up local file
        if os.path.exists(file_path):
            os.remove(file_path)

@router.post("/csv")
async def upload_csv(
    file: UploadFile = File(...),
    course_id: int = Query(..., description="ID of the course to enroll students in"),
    db: Session = Depends(get_db)
):
    """Upload and process CSV file with enrollment data."""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="File must be CSV format")
    
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    file_path = os.path.join(settings.UPLOAD_DIR, f"{timestamp}_{file.filename}")
    
    async with aiofiles.open(file_path, 'wb') as out_file:
        content = await file.read()
        await out_file.write(content)
    
    # Upload to Azure Blob Storage if configured
    blob_url = None
    storage_service = AzureStorageService()
    if storage_service.blob_service_client:
        blob_name = f"imports/{timestamp}_{file.filename}"
        blob_url = storage_service.upload_file(file_path, blob_name)
    
    try:
        records = ImportService.parse_csv(file_path)
        results = ImportService.process_incoming_enrollments(db, records, course_id)
        
        return {
            "message": "File processed successfully",
            "results": results,
            "blob_url": blob_url
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

@router.get("/sync-status")
async def get_sync_status(db: Session = Depends(get_db)):
    """Get last sync status and statistics."""
    from app.models.enrollment import IncomingEnrollment
    from sqlalchemy import func
    
    last_sync = db.query(func.max(IncomingEnrollment.submitted_at)).scalar()
    total_pending = db.query(IncomingEnrollment).filter(
        IncomingEnrollment.processed == False
    ).count()
    
    return {
        "last_synced": last_sync.isoformat() if last_sync else None,
        "pending_processing": total_pending
    }

