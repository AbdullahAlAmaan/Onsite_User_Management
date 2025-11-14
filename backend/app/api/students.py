from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import os
import aiofiles
from datetime import datetime
import pandas as pd
import io
from app.db.base import get_db
from app.models.student import Student
from app.schemas.student import StudentCreate, StudentResponse
from app.core.file_utils import sanitize_filename, validate_file_extension, validate_file_size, get_safe_file_path
from app.services.import_service import ImportService

router = APIRouter()

@router.post("/", response_model=StudentResponse, status_code=201)
def create_student(student: StudentCreate, db: Session = Depends(get_db)):
    """Create a new student."""
    existing = db.query(Student).filter(Student.employee_id == student.employee_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Student with this employee ID already exists")
    
    db_student = Student(**student.dict())
    db.add(db_student)
    db.commit()
    db.refresh(db_student)
    return StudentResponse.from_orm(db_student)

@router.get("/", response_model=List[StudentResponse])
def get_students(
    sbu: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(True, description="Filter by active status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """Get all students with optional filters."""
    from app.core.validation import validate_sbu
    
    query = db.query(Student)
    
    # Filter by active status
    query = query.filter(Student.is_active == is_active)
    
    if sbu:
        try:
            validated_sbu = validate_sbu(sbu)
            query = query.filter(Student.sbu == validated_sbu)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
    
    # Sort by employee_id (ascending)
    students = query.order_by(Student.employee_id.asc()).offset(skip).limit(limit).all()
    return [StudentResponse.from_orm(student) for student in students]

@router.get("/{student_id}", response_model=StudentResponse)
def get_student(student_id: int, db: Session = Depends(get_db)):
    """Get a specific student by ID."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return StudentResponse.from_orm(student)

@router.get("/{student_id}/enrollments", response_model=dict)
def get_student_enrollments(student_id: int, db: Session = Depends(get_db)):
    """Get all enrollments for a specific student with full course details and overall completion rate."""
    from app.models.enrollment import Enrollment, ApprovalStatus, CompletionStatus
    from app.schemas.enrollment import EnrollmentResponse
    
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    enrollments = db.query(Enrollment).filter(Enrollment.student_id == student_id).order_by(Enrollment.created_at.desc()).all()
    
    # Calculate overall completion rate (same logic as in enrollments API)
    all_student_enrollments = db.query(Enrollment).filter(
        Enrollment.student_id == student_id
    ).all()
    
    # Filter enrollments to only include those that count toward completion rate:
    # - COMPLETED or FAILED courses (completion_status) that are APPROVED
    # - WITHDRAWN courses (approval_status) - these should be included as they have a reason
    # Exclude: PENDING approvals, NOT_STARTED, IN_PROGRESS, REJECTED
    relevant_enrollments = [
        e for e in all_student_enrollments
        if (
            # Include withdrawn courses (they have a reason attached, count as not completed)
            (e.approval_status == ApprovalStatus.WITHDRAWN)
            # OR include completed/failed courses that are approved (not pending/rejected)
            or (
                e.approval_status == ApprovalStatus.APPROVED
                and e.completion_status in [CompletionStatus.COMPLETED, CompletionStatus.FAILED]
            )
        )
        # Exclude rejected enrollments (admin's decision, not student's fault)
        and e.approval_status != ApprovalStatus.REJECTED
    ]
    
    total_courses = len(relevant_enrollments)
    # Only COMPLETED courses count as completed (withdrawn and failed count as not completed)
    completed_courses = sum(1 for e in relevant_enrollments if e.completion_status == CompletionStatus.COMPLETED)
    
    if total_courses > 0:
        overall_completion_rate = (completed_courses / total_courses) * 100
    else:
        overall_completion_rate = 0.0
    
    result_enrollments = []
    for enrollment in enrollments:
        enrollment_dict = EnrollmentResponse.from_orm(enrollment).dict()
        enrollment_dict['student_name'] = enrollment.student.name
        enrollment_dict['student_email'] = enrollment.student.email
        enrollment_dict['student_sbu'] = enrollment.student.sbu.value
        enrollment_dict['student_employee_id'] = enrollment.student.employee_id
        enrollment_dict['student_designation'] = enrollment.student.designation
        enrollment_dict['student_experience_years'] = enrollment.student.experience_years
        # Use stored course info (preserved even if course is deleted)
        enrollment_dict['course_name'] = enrollment.course_name or (enrollment.course.name if enrollment.course else None)
        enrollment_dict['batch_code'] = enrollment.batch_code or (enrollment.course.batch_code if enrollment.course else None)
        enrollment_dict['attendance_percentage'] = enrollment.attendance_percentage
        enrollment_dict['total_attendance'] = enrollment.total_attendance
        enrollment_dict['present'] = enrollment.present
        enrollment_dict['attendance_status'] = enrollment.attendance_status
        enrollment_dict['course_start_date'] = enrollment.course.start_date.isoformat() if enrollment.course and enrollment.course.start_date else None
        enrollment_dict['course_end_date'] = enrollment.course.end_date.isoformat() if enrollment.course and enrollment.course.end_date else None
        enrollment_dict['completion_date'] = enrollment.completion_date.isoformat() if enrollment.completion_date else None
        result_enrollments.append(enrollment_dict)
    
    return {
        'enrollments': result_enrollments,
        'overall_completion_rate': round(overall_completion_rate, 1),
        'total_courses_assigned': total_courses,
        'completed_courses': completed_courses
    }

@router.get("/all/with-courses", response_model=List[dict])
def get_all_students_with_courses(
    sbu: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(True, description="Filter by active status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(1000, ge=1, le=10000),
    db: Session = Depends(get_db)
):
    """Get all students with their complete course history and attendance data."""
    from app.models.enrollment import Enrollment, CompletionStatus
    from sqlalchemy.orm import joinedload
    
    from app.core.validation import validate_sbu
    
    query = db.query(Student)
    
    # Filter by active status
    query = query.filter(Student.is_active == is_active)
    
    if sbu:
        try:
            validated_sbu = validate_sbu(sbu)
            query = query.filter(Student.sbu == validated_sbu)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
    
    # Sort by employee_id (ascending) - EMP001, EMP002, EMP003, etc.
    students = query.order_by(Student.employee_id.asc()).offset(skip).limit(limit).all()
    
    result = []
    for student in students:
        enrollments = db.query(Enrollment).options(joinedload(Enrollment.course)).filter(Enrollment.student_id == student.id).order_by(Enrollment.created_at.desc()).all()
        
        student_dict = StudentResponse.from_orm(student).dict()
        student_dict['enrollments'] = []
        student_dict['total_courses'] = len(enrollments)
        student_dict['completed_courses'] = len([e for e in enrollments if e.completion_status == CompletionStatus.COMPLETED])
        student_dict['never_taken_course'] = len(enrollments) == 0
        
        for enrollment in enrollments:
            # Use stored course info if available, otherwise fall back to course relationship
            # This preserves history even when course is deleted
            course_name = enrollment.course_name or (enrollment.course.name if enrollment.course else None)
            batch_code = enrollment.batch_code or (enrollment.course.batch_code if enrollment.course else None)
            
            enrollment_dict = {
                'id': enrollment.id,
                'course_name': course_name,
                'batch_code': batch_code,
                'approval_status': enrollment.approval_status.value if enrollment.approval_status else None,
                'completion_status': enrollment.completion_status.value if enrollment.completion_status else None,
                'eligibility_status': enrollment.eligibility_status.value if enrollment.eligibility_status else None,
                'score': enrollment.score,
                'attendance_percentage': enrollment.attendance_percentage,
                'total_attendance': enrollment.total_attendance,
                'present': enrollment.present,
                'attendance_status': enrollment.attendance_status,
                'course_start_date': enrollment.course.start_date.isoformat() if enrollment.course and enrollment.course.start_date else None,
                'course_end_date': enrollment.course.end_date.isoformat() if enrollment.course and enrollment.course.end_date else None,
                'created_at': enrollment.created_at.isoformat() if enrollment.created_at else None,
            }
            student_dict['enrollments'].append(enrollment_dict)
        
        result.append(student_dict)
    
    return result

@router.post("/import/excel")
async def import_employees_excel(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload and process Excel file with employee data."""
    # Validate and sanitize filename
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required")
    
    validate_file_extension(file.filename)
    safe_filename = sanitize_filename(file.filename)
    
    # Read file content to check size
    content = await file.read()
    validate_file_size(len(content))
    
    # Reset file pointer
    await file.seek(0)
    
    # Save uploaded file temporarily with safe path
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    timestamped_filename = f"{timestamp}_{safe_filename}"
    file_path = get_safe_file_path(timestamped_filename)
    
    async with aiofiles.open(file_path, 'wb') as out_file:
        content = await file.read()
        await out_file.write(content)
    
    try:
        # Parse and process
        records = ImportService.parse_employee_excel(file_path)
        results = ImportService.process_employee_imports(db, records)
        
        return {
            "message": "File processed successfully",
            "results": results
        }
    except HTTPException:
        raise
    except Exception as e:
        # Don't expose internal error details
        raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")
    finally:
        # Clean up local file
        if os.path.exists(file_path):
            os.remove(file_path)

@router.post("/import/csv")
async def import_employees_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """Upload and process CSV file with employee data."""
    # Validate and sanitize filename
    if not file.filename:
        raise HTTPException(status_code=400, detail="Filename is required")
    
    validate_file_extension(file.filename)
    safe_filename = sanitize_filename(file.filename)
    
    # Read file content to check size
    content = await file.read()
    validate_file_size(len(content))
    
    # Reset file pointer
    await file.seek(0)
    
    # Save uploaded file temporarily with safe path
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    timestamped_filename = f"{timestamp}_{safe_filename}"
    file_path = get_safe_file_path(timestamped_filename)
    
    async with aiofiles.open(file_path, 'wb') as out_file:
        content = await file.read()
        await out_file.write(content)
    
    try:
        records = ImportService.parse_employee_csv(file_path)
        results = ImportService.process_employee_imports(db, records)
        
        return {
            "message": "File processed successfully",
            "results": results
        }
    except HTTPException:
        raise
    except Exception as e:
        # Don't expose internal error details
        raise HTTPException(status_code=400, detail=f"Error processing file: {str(e)}")
    finally:
        # Clean up local file
        if os.path.exists(file_path):
            os.remove(file_path)

@router.post("/{student_id}/remove")
def remove_student(
    student_id: int,
    db: Session = Depends(get_db)
):
    """Remove a student (mark as inactive). Preserves all course history and enrollments."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    if not student.is_active:
        raise HTTPException(status_code=400, detail="Student is already removed")
    
    # Mark as inactive instead of deleting
    student.is_active = False
    db.commit()
    db.refresh(student)
    
    return {
        "message": "Student removed successfully",
        "student_id": student.id,
        "employee_id": student.employee_id,
        "name": student.name
    }

@router.post("/{student_id}/restore")
def restore_student(
    student_id: int,
    db: Session = Depends(get_db)
):
    """Restore a previously removed student (mark as active again)."""
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    if student.is_active:
        raise HTTPException(status_code=400, detail="Student is already active")
    
    # Mark as active again
    student.is_active = True
    db.commit()
    db.refresh(student)
    
    return {
        "message": "Student restored successfully",
        "student_id": student.id,
        "employee_id": student.employee_id,
        "name": student.name
    }

@router.get("/count")
def get_student_count(
    is_active: Optional[bool] = Query(True, description="Filter by active status"),
    sbu: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Get count of students."""
    from app.core.validation import validate_sbu
    
    query = db.query(Student)
    query = query.filter(Student.is_active == is_active)
    
    if sbu:
        try:
            validated_sbu = validate_sbu(sbu)
            query = query.filter(Student.sbu == validated_sbu)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
    
    count = query.count()
    return {"count": count, "is_active": is_active}

@router.get("/report/overall")
def generate_overall_report(db: Session = Depends(get_db)):
    """Generate an Excel report with all employee enrollment history (active employees only)."""
    try:
        from app.models.enrollment import Enrollment, ApprovalStatus, CompletionStatus, EligibilityStatus
        from app.models.course import Course
        from app.services.eligibility_service import EligibilityService
        
        # Get all active students
        active_students = db.query(Student).filter(Student.is_active == True).all()
        
        # Prepare data for Excel - one row per enrollment
        report_data = []
        
        for student in active_students:
            # Get all enrollments for this student
            enrollments = db.query(Enrollment).filter(
                Enrollment.student_id == student.id
            ).all()
            
            # If student has no enrollments, add one row with "No courses taken yet"
            if not enrollments:
                report_data.append({
                    'bsid': student.employee_id or '',
                    'name': student.name or '',
                    'email': student.email or '',
                    'sbu': student.sbu.value if student.sbu else '',
                    'designation': student.designation or '',
                    'course_name': 'No courses taken yet',
                    'batch_code': 'N/A',
                    'attendance': 'N/A',
                    'score': 'N/A',
                    'completion_status': 'N/A',
                    'approval_date': 'N/A',
                    'completion_date': 'N/A',
                    'withdrawn': 'N/A',
                })
                continue
            
            for enrollment in enrollments:
                # Get course name and batch code (use denormalized values if available)
                course_name = enrollment.course_name or (enrollment.course.name if enrollment.course else '')
                batch_code = enrollment.batch_code or (enrollment.course.batch_code if enrollment.course else '')
                
                # Get attendance as percentage (present/total_attendance * 100)
                attendance = ''
                if enrollment.total_attendance and enrollment.total_attendance > 0 and enrollment.present is not None:
                    attendance_percentage = (enrollment.present / enrollment.total_attendance * 100)
                    attendance = f"{attendance_percentage:.1f}%"
                elif enrollment.attendance_percentage is not None:
                    attendance = f"{enrollment.attendance_percentage:.1f}%"
                elif enrollment.attendance_status:
                    attendance = enrollment.attendance_status
                else:
                    attendance = ''
                
                # Get score as percentage
                score = ''
                if enrollment.score is not None:
                    score = f"{enrollment.score}%"
                else:
                    score = ''
                
                # Get completion status (map to required values: COMPLETED, FAILED, WITHDRAWN, PENDING, INELIGIBLE)
                if enrollment.approval_status == ApprovalStatus.WITHDRAWN:
                    completion_status = 'WITHDRAWN'
                elif enrollment.eligibility_status in [EligibilityStatus.INELIGIBLE_PREREQUISITE, EligibilityStatus.INELIGIBLE_DUPLICATE, EligibilityStatus.INELIGIBLE_ANNUAL_LIMIT]:
                    completion_status = 'INELIGIBLE'
                elif enrollment.approval_status == ApprovalStatus.PENDING:
                    completion_status = 'PENDING'
                elif enrollment.completion_status == CompletionStatus.COMPLETED:
                    completion_status = 'COMPLETED'
                elif enrollment.completion_status == CompletionStatus.FAILED:
                    completion_status = 'FAILED'
                else:
                    completion_status = 'PENDING'  # Default for NOT_STARTED, IN_PROGRESS, etc.
                
                # Get approval date (format as YYYY-MM-DD)
                approval_date = ''
                if enrollment.approved_at:
                    approval_date = enrollment.approved_at.strftime('%Y-%m-%d')
                
                # Get completion date (format as YYYY-MM-DD)
                completion_date = ''
                if enrollment.completion_date:
                    completion_date = enrollment.completion_date.strftime('%Y-%m-%d')
                
                # Check if withdrawn
                withdrawn = enrollment.approval_status == ApprovalStatus.WITHDRAWN
                
                report_data.append({
                    'bsid': student.employee_id or '',
                    'name': student.name or '',
                    'email': student.email or '',
                    'sbu': student.sbu.value if student.sbu else '',
                    'designation': student.designation or '',
                    'course_name': course_name,
                    'batch_code': batch_code,
                    'attendance': attendance,
                    'score': score,
                    'completion_status': completion_status,
                    'approval_date': approval_date,
                    'completion_date': completion_date,
                    'withdrawn': 'TRUE' if withdrawn else 'FALSE',
                })
        
        # Create DataFrame
        df = pd.DataFrame(report_data)
        
        # If no enrollments, create empty DataFrame with columns
        if df.empty:
            df = pd.DataFrame(columns=[
                'bsid', 'name', 'email', 'sbu', 'designation',
                'course_name', 'batch_code', 'attendance', 'score',
                'completion_status', 'approval_date', 'completion_date',
                'withdrawn'
            ])
        else:
            # Sort by bsid ascending, then approval_date descending
            # Convert approval_date to datetime for proper sorting, handling empty strings
            df['approval_date_sort'] = pd.to_datetime(df['approval_date'], errors='coerce')
            df = df.sort_values(
                by=['bsid', 'approval_date_sort'],
                ascending=[True, False],
                na_position='last'
            )
            # Drop the temporary sort column
            df = df.drop(columns=['approval_date_sort'])
            # Reset index
            df = df.reset_index(drop=True)
        
        # Create Excel file in memory
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='Training History', index=False)
            
            # Auto-adjust column widths
            worksheet = writer.sheets['Training History']
            from openpyxl.utils import get_column_letter
            for idx, col in enumerate(df.columns):
                max_length = max(
                    df[col].astype(str).map(len).max() if not df.empty else 0,
                    len(str(col))
                )
                column_letter = get_column_letter(idx + 1)
                worksheet.column_dimensions[column_letter].width = min(max_length + 2, 50)
        
        output.seek(0)
        
        # Generate filename with timestamp
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"training_history_report_{timestamp}.xlsx"
        
        # Read the content
        file_content = output.read()
        output.close()
        
        return StreamingResponse(
            io.BytesIO(file_content),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        import traceback
        error_details = traceback.format_exc()
        print(f"Error generating overall report: {error_details}")
        raise HTTPException(status_code=500, detail=f"Error generating report: {str(e)}")

