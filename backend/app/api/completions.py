from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import pandas as pd
import os
import aiofiles
from datetime import datetime
from app.db.base import get_db
from app.core.config import settings
from app.models.enrollment import Enrollment, CompletionStatus
from app.schemas.enrollment import CompletionUpload, CompletionBulkUpload

router = APIRouter()

@router.post("/upload", response_model=dict)
async def upload_completions(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload completion results via Excel/CSV."""
    # Validate file type
    if not file.filename.endswith(('.xlsx', '.xls', '.csv')):
        raise HTTPException(status_code=400, detail="File must be Excel or CSV format")
    
    # Save uploaded file temporarily
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    file_path = os.path.join(settings.UPLOAD_DIR, file.filename)
    
    async with aiofiles.open(file_path, 'wb') as out_file:
        content = await file.read()
        await out_file.write(content)
    
    try:
        # Parse file
        if file.filename.endswith('.csv'):
            df = pd.read_csv(file_path)
        else:
            df = pd.read_excel(file_path)
        
        # Normalize column names
        df.columns = df.columns.str.strip().str.lower().str.replace(' ', '_')
        
        results = {
            "processed": 0,
            "errors": []
        }
        
        # Process each row
        for idx, row in df.iterrows():
            try:
                # Extract data (adjust column names as needed)
                enrollment_id = int(row.get('enrollment_id', 0))
                score = float(row.get('score', 0)) if pd.notna(row.get('score')) else None
                attendance = float(row.get('attendance_percentage', 0)) if pd.notna(row.get('attendance_percentage')) else None
                status_str = str(row.get('completion_status', 'Completed')).strip()
                
                # Map status string to enum
                status_map = {
                    'completed': CompletionStatus.COMPLETED,
                    'failed': CompletionStatus.FAILED,
                    'in_progress': CompletionStatus.IN_PROGRESS,
                    'not_started': CompletionStatus.NOT_STARTED
                }
                completion_status = status_map.get(status_str.lower(), CompletionStatus.COMPLETED)
                
                # Update enrollment
                enrollment = db.query(Enrollment).filter(Enrollment.id == enrollment_id).first()
                if not enrollment:
                    results["errors"].append({
                        "row": idx + 2,  # +2 for header and 0-index
                        "error": f"Enrollment ID {enrollment_id} not found"
                    })
                    continue
                
                enrollment.score = score
                enrollment.attendance_percentage = attendance
                enrollment.completion_status = completion_status
                if completion_status == CompletionStatus.COMPLETED:
                    enrollment.completion_date = datetime.utcnow()
                
                results["processed"] += 1
                
            except Exception as e:
                results["errors"].append({
                    "row": idx + 2,
                    "error": str(e)
                })
        
        db.commit()
        
        return {
            "message": "Completion data uploaded successfully",
            "results": results
        }
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

@router.post("/bulk", response_model=dict)
def bulk_update_completions(
    completions: CompletionBulkUpload,
    db: Session = Depends(get_db)
):
    """Bulk update completion data via API."""
    results = {
        "processed": 0,
        "errors": []
    }
    
    for completion in completions.completions:
        try:
            enrollment = db.query(Enrollment).filter(
                Enrollment.id == completion.enrollment_id
            ).first()
            
            if not enrollment:
                results["errors"].append({
                    "enrollment_id": completion.enrollment_id,
                    "error": "Enrollment not found"
                })
                continue
            
            enrollment.score = completion.score
            enrollment.attendance_percentage = completion.attendance_percentage
            enrollment.completion_status = completion.completion_status
            
            if completion.completion_status == CompletionStatus.COMPLETED:
                enrollment.completion_date = datetime.utcnow()
            
            results["processed"] += 1
            
        except Exception as e:
            results["errors"].append({
                "enrollment_id": completion.enrollment_id,
                "error": str(e)
            })
    
    db.commit()
    return results

@router.put("/{enrollment_id}", response_model=dict)
def update_completion(
    enrollment_id: int,
    completion: CompletionUpload,
    db: Session = Depends(get_db)
):
    """Update completion data for a specific enrollment."""
    enrollment = db.query(Enrollment).filter(Enrollment.id == enrollment_id).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    
    enrollment.score = completion.score
    enrollment.attendance_percentage = completion.attendance_percentage
    enrollment.completion_status = completion.completion_status
    
    if completion.completion_status == CompletionStatus.COMPLETED:
        enrollment.completion_date = datetime.utcnow()
    
    db.commit()
    return {"message": "Completion updated successfully"}

