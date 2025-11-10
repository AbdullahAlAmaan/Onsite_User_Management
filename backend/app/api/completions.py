from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
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
    course_id: int = Query(..., description="ID of the course for these scores"),
    db: Session = Depends(get_db)
):
    """Upload completion results via Excel/CSV. Matches students by employee_id or email."""
    # Validate file type
    if not file.filename.endswith(('.xlsx', '.xls', '.csv')):
        raise HTTPException(status_code=400, detail="File must be Excel or CSV format")
    
    # Save uploaded file temporarily
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    file_path = os.path.join(settings.UPLOAD_DIR, f"{timestamp}_{file.filename}")
    
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
        
        # Get course
        from app.models.course import Course
        from app.models.student import Student
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise HTTPException(status_code=404, detail=f"Course with ID {course_id} not found")
        
        results = {
            "processed": 0,
            "not_found": 0,
            "errors": []
        }
        
        # Process each row
        for idx, row in df.iterrows():
            try:
                # Extract data - match by employee_id or email
                employee_id = str(row.get('employee_id', '')).strip() if pd.notna(row.get('employee_id')) else None
                email = str(row.get('email', '')).strip() if pd.notna(row.get('email')) else None
                
                if not employee_id and not email:
                    results["errors"].append({
                        "row": idx + 2,
                        "error": "Missing employee_id or email"
                    })
                    continue
                
                # Find student
                student = None
                if employee_id:
                    student = db.query(Student).filter(Student.employee_id == employee_id).first()
                if not student and email:
                    student = db.query(Student).filter(Student.email == email).first()
                
                if not student:
                    results["not_found"] += 1
                    results["errors"].append({
                        "row": idx + 2,
                        "error": f"Student not found (employee_id: {employee_id}, email: {email})"
                    })
                    continue
                
                # Find enrollment for this student and course
                enrollment = db.query(Enrollment).filter(
                    Enrollment.student_id == student.id,
                    Enrollment.course_id == course_id
                ).first()
                
                if not enrollment:
                    results["errors"].append({
                        "row": idx + 2,
                        "error": f"Enrollment not found for {student.name} in {course.name}"
                    })
                    continue
                
                # Extract score and assessment data
                score = None
                if pd.notna(row.get('score')):
                    try:
                        score = float(row.get('score'))
                    except:
                        pass
                
                attendance = None
                if pd.notna(row.get('attendance_percentage')):
                    try:
                        attendance = float(row.get('attendance_percentage'))
                    except:
                        pass
                
                status_str = str(row.get('completion_status', 'Completed')).strip() if pd.notna(row.get('completion_status')) else 'Completed'
                
                # Map status string to enum
                status_map = {
                    'completed': CompletionStatus.COMPLETED,
                    'failed': CompletionStatus.FAILED,
                    'in_progress': CompletionStatus.IN_PROGRESS,
                    'not_started': CompletionStatus.NOT_STARTED
                }
                completion_status = status_map.get(status_str.lower(), CompletionStatus.COMPLETED)
                
                # Update enrollment
                enrollment.score = score
                enrollment.attendance_percentage = attendance
                enrollment.completion_status = completion_status
                if completion_status == CompletionStatus.COMPLETED and not enrollment.completion_date:
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
        
    except HTTPException:
        raise
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

