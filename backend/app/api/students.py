from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.db.base import get_db
from app.models.student import Student
from app.schemas.student import StudentCreate, StudentResponse

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
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """Get all students with optional filters."""
    from app.core.validation import validate_sbu
    
    query = db.query(Student)
    
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
    skip: int = Query(0, ge=0),
    limit: int = Query(1000, ge=1, le=10000),
    db: Session = Depends(get_db)
):
    """Get all students with their complete course history and attendance data."""
    from app.models.enrollment import Enrollment, CompletionStatus
    from sqlalchemy.orm import joinedload
    
    from app.core.validation import validate_sbu
    
    query = db.query(Student)
    
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

