from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime, timedelta
import pandas as pd
import io
from app.db.base import get_db
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.schemas.course import CourseCreate, CourseResponse, CourseUpdate

router = APIRouter()

@router.post("/", response_model=CourseResponse, status_code=201)
def create_course(course: CourseCreate, db: Session = Depends(get_db)):
    """Create a new course batch."""
    # Check for duplicate batch code within the same course name
    existing = db.query(Course).filter(
        Course.name == course.name,
        Course.batch_code == course.batch_code
    ).first()
    if existing:
        raise HTTPException(
            status_code=400, 
            detail=f"Batch code '{course.batch_code}' already exists for course '{course.name}'"
        )
    
    # Check for overlapping batches if needed
    if course.start_date:
        from sqlalchemy import or_
        end_date_check = course.end_date if course.end_date else date.today() + timedelta(days=365)
        overlapping = db.query(Course).filter(
            Course.name == course.name,
            Course.is_archived == False,
            Course.start_date <= end_date_check,
            or_(Course.end_date >= course.start_date, Course.end_date.is_(None))
        ).first()
        if overlapping:
            raise HTTPException(
                status_code=400, 
                detail="Overlapping batch exists for this course"
            )
    
    db_course = Course(**course.dict())
    db.add(db_course)
    db.commit()
    db.refresh(db_course)
    return CourseResponse.from_orm(db_course)

@router.get("/", response_model=List[CourseResponse])
def get_courses(
    archived: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """Get all courses with optional filters. Automatically archives courses past their end_date."""
    # Auto-archive courses that have ended
    today = date.today()
    courses_to_archive = db.query(Course).filter(
        Course.is_archived == False,
        Course.end_date.isnot(None),
        Course.end_date < today
    ).all()
    
    for course in courses_to_archive:
        course.is_archived = True
    
    if courses_to_archive:
        db.commit()
    
    # Now fetch courses based on filter
    query = db.query(Course)
    
    if archived is not None:
        query = query.filter(Course.is_archived == archived)
    else:
        query = query.filter(Course.is_archived == False)
    
    courses = query.order_by(Course.start_date.desc()).offset(skip).limit(limit).all()
    return [CourseResponse.from_orm(course) for course in courses]

@router.get("/{course_id}", response_model=CourseResponse)
def get_course(course_id: int, db: Session = Depends(get_db)):
    """Get a specific course by ID."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return CourseResponse.from_orm(course)

@router.put("/{course_id}", response_model=CourseResponse)
def update_course(
    course_id: int, 
    course_update: CourseUpdate, 
    db: Session = Depends(get_db)
):
    """Update a course."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    update_data = course_update.dict(exclude_unset=True)
    
    # Check for duplicate batch code within the same course name if name or batch_code is being updated
    if 'name' in update_data or 'batch_code' in update_data:
        new_name = update_data.get('name', course.name)
        new_batch_code = update_data.get('batch_code', course.batch_code)
        
        existing = db.query(Course).filter(
            Course.id != course_id,  # Exclude current course
            Course.name == new_name,
            Course.batch_code == new_batch_code
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Batch code '{new_batch_code}' already exists for course '{new_name}'"
            )
    
    for field, value in update_data.items():
        setattr(course, field, value)
    
    db.commit()
    db.refresh(course)
    return CourseResponse.from_orm(course)

@router.delete("/{course_id}", status_code=204)
def delete_course(course_id: int, db: Session = Depends(get_db)):
    """Permanently delete a course from the database. This action cannot be undone.
    Related enrollments will be preserved with course_id set to NULL to maintain user history."""
    from app.models.enrollment import Enrollment
    
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Preserve enrollments by setting course_id to NULL and storing course info
    # This maintains user history even after course deletion
    enrollments = db.query(Enrollment).filter(Enrollment.course_id == course_id).all()
    for enrollment in enrollments:
        # Store course info before removing the reference
        if not enrollment.course_name:
            enrollment.course_name = course.name
        if not enrollment.batch_code:
            enrollment.batch_code = course.batch_code
        enrollment.course_id = None
    
    # Permanently delete the course
    db.delete(course)
    db.commit()
    return None

@router.post("/{course_id}/archive", response_model=CourseResponse)
def archive_course(course_id: int, db: Session = Depends(get_db)):
    """Manually archive a course."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    course.is_archived = True
    db.commit()
    db.refresh(course)
    return CourseResponse.from_orm(course)

@router.get("/{course_id}/report")
def generate_course_report(course_id: int, db: Session = Depends(get_db)):
    """Generate an Excel report for a course with enrolled students data (Approved and Withdrawn only, excluding Rejected)."""
    from app.models.student import Student
    from app.models.enrollment import CompletionStatus, ApprovalStatus
    
    # Get course
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Get only approved and withdrawn enrollments (exclude rejected and pending)
    enrollments = db.query(Enrollment).filter(
        Enrollment.course_id == course_id,
        Enrollment.approval_status.in_([ApprovalStatus.APPROVED, ApprovalStatus.WITHDRAWN])
    ).all()
    
    # Prepare data for Excel
    report_data = []
    for enrollment in enrollments:
        student = db.query(Student).filter(Student.id == enrollment.student_id).first()
        if not student:
            continue
        
        # Calculate attendance percentage
        attendance_percentage = None
        attendance_display = '-'
        if enrollment.total_attendance and enrollment.total_attendance > 0:
            if enrollment.present is not None:
                attendance_percentage = (enrollment.present / enrollment.total_attendance * 100)
                attendance_display = f"{attendance_percentage:.1f}%"
        elif enrollment.attendance_percentage is not None:
            # Use stored attendance_percentage if available
            attendance_percentage = enrollment.attendance_percentage
            attendance_display = f"{attendance_percentage:.1f}%"
        elif enrollment.attendance_status:
            attendance_display = enrollment.attendance_status
        
        # Calculate overall completion rate for this student
        all_student_enrollments = db.query(Enrollment).filter(
            Enrollment.student_id == enrollment.student_id,
            Enrollment.approval_status.in_([ApprovalStatus.APPROVED, ApprovalStatus.WITHDRAWN])
        ).all()
        
        # Count relevant enrollments (completed, failed, or withdrawn)
        relevant_enrollments = [
            e for e in all_student_enrollments
            if (
                (e.approval_status == ApprovalStatus.WITHDRAWN) or
                (e.approval_status == ApprovalStatus.APPROVED and 
                 e.completion_status in [CompletionStatus.COMPLETED, CompletionStatus.FAILED])
            )
        ]
        
        total_courses = len(relevant_enrollments)
        completed_courses = sum(1 for e in relevant_enrollments if e.completion_status == CompletionStatus.COMPLETED)
        overall_completion_rate = (completed_courses / total_courses * 100) if total_courses > 0 else 0.0
        
        report_data.append({
            'Employee ID': student.employee_id,
            'Name': student.name,
            'Email': student.email,
            'SBU': student.sbu.value if student.sbu else '',
            'Designation': student.designation or '',
            'Approval Status': enrollment.approval_status.value if enrollment.approval_status else '',
            'Completion Status': enrollment.completion_status.value if enrollment.completion_status else '',
            'Total Classes': enrollment.total_attendance or 0,
            'Classes Attended': enrollment.present or 0,
            'Attendance': attendance_display,
            'Score': enrollment.score if enrollment.score is not None else '-',
            'Total Courses Assigned': total_courses,
            'Completed Courses': completed_courses,
            'Overall Completion Rate': f"{overall_completion_rate:.1f}%",
            'Enrollment Date': enrollment.created_at.strftime('%Y-%m-%d %H:%M:%S') if enrollment.created_at else '',
            'Approval Date': enrollment.approved_at.strftime('%Y-%m-%d %H:%M:%S') if enrollment.approved_at and enrollment.approval_status == ApprovalStatus.APPROVED else '',
            'Withdrawal Date': enrollment.updated_at.strftime('%Y-%m-%d %H:%M:%S') if enrollment.approval_status == ApprovalStatus.WITHDRAWN and enrollment.updated_at else '',
            'Withdrawal Reason': enrollment.rejection_reason if enrollment.approval_status == ApprovalStatus.WITHDRAWN else '',
        })
    
    # Create DataFrame
    df = pd.DataFrame(report_data)
    
    # If no enrollments, create empty DataFrame with columns
    if df.empty:
        df = pd.DataFrame(columns=[
            'Employee ID', 'Name', 'Email', 'SBU', 'Designation',
            'Approval Status', 'Completion Status', 'Total Classes', 'Classes Attended',
            'Attendance', 'Score', 'Total Courses Assigned', 'Completed Courses',
            'Overall Completion Rate', 'Enrollment Date', 'Approval Date',
            'Withdrawal Date', 'Withdrawal Reason'
        ])
    
    # Create Excel file in memory
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Enrollments', index=False)
        
        # Auto-adjust column widths
        worksheet = writer.sheets['Enrollments']
        from openpyxl.utils import get_column_letter
        for idx, col in enumerate(df.columns):
            max_length = max(
                df[col].astype(str).map(len).max() if not df.empty else 0,
                len(str(col))
            )
            column_letter = get_column_letter(idx + 1)
            worksheet.column_dimensions[column_letter].width = min(max_length + 2, 50)
    
    output.seek(0)
    
    # Generate filename
    safe_course_name = "".join(c for c in course.name if c.isalnum() or c in (' ', '-', '_')).strip()
    safe_batch_code = "".join(c for c in course.batch_code if c.isalnum() or c in (' ', '-', '_')).strip()
    filename = f"{safe_course_name}_{safe_batch_code}_Report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    
    return StreamingResponse(
        io.BytesIO(output.read()),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

