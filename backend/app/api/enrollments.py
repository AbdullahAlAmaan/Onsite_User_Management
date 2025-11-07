from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.db.base import get_db
from app.models.enrollment import Enrollment, ApprovalStatus
from app.models.course import Course
from app.schemas.enrollment import EnrollmentResponse, EnrollmentApproval, EnrollmentBulkApproval
from app.services.eligibility_service import EligibilityService

router = APIRouter()

@router.get("/", response_model=List[EnrollmentResponse])
def get_enrollments(
    course_id: Optional[int] = Query(None),
    student_id: Optional[int] = Query(None),
    eligibility_status: Optional[str] = Query(None),
    approval_status: Optional[str] = Query(None),
    sbu: Optional[str] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """Get enrollments with optional filters."""
    query = db.query(Enrollment)
    
    if course_id:
        query = query.filter(Enrollment.course_id == course_id)
    if student_id:
        query = query.filter(Enrollment.student_id == student_id)
    if eligibility_status:
        query = query.filter(Enrollment.eligibility_status == eligibility_status)
    if approval_status:
        query = query.filter(Enrollment.approval_status == approval_status)
    if sbu:
        from app.models.student import Student
        query = query.join(Student).filter(Student.sbu == sbu)
    
    enrollments = query.offset(skip).limit(limit).all()
    
    # Enrich with related data
    result = []
    for enrollment in enrollments:
        enrollment_dict = EnrollmentResponse.from_orm(enrollment).dict()
        enrollment_dict['student_name'] = enrollment.student.name
        enrollment_dict['student_email'] = enrollment.student.email
        enrollment_dict['student_sbu'] = enrollment.student.sbu.value
        enrollment_dict['course_name'] = enrollment.course.name
        enrollment_dict['batch_code'] = enrollment.course.batch_code
        result.append(EnrollmentResponse(**enrollment_dict))
    
    return result

@router.get("/eligible", response_model=List[EnrollmentResponse])
def get_eligible_enrollments(
    course_id: Optional[int] = Query(None),
    sbu: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Get eligible enrollments pending approval."""
    query = db.query(Enrollment).filter(
        Enrollment.eligibility_status == "Eligible",
        Enrollment.approval_status == ApprovalStatus.PENDING
    )
    
    if course_id:
        query = query.filter(Enrollment.course_id == course_id)
    if sbu:
        from app.models.student import Student
        query = query.join(Student).filter(Student.sbu == sbu)
    
    enrollments = query.all()
    
    result = []
    for enrollment in enrollments:
        enrollment_dict = EnrollmentResponse.from_orm(enrollment).dict()
        enrollment_dict['student_name'] = enrollment.student.name
        enrollment_dict['student_email'] = enrollment.student.email
        enrollment_dict['student_sbu'] = enrollment.student.sbu.value
        enrollment_dict['course_name'] = enrollment.course.name
        enrollment_dict['batch_code'] = enrollment.course.batch_code
        result.append(EnrollmentResponse(**enrollment_dict))
    
    return result

@router.post("/approve", response_model=EnrollmentResponse)
def approve_enrollment(
    approval: EnrollmentApproval,
    approved_by: str = Query(..., description="Instructor/Admin name"),
    db: Session = Depends(get_db)
):
    """Approve or reject a single enrollment."""
    enrollment = db.query(Enrollment).filter(Enrollment.id == approval.enrollment_id).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    
    if enrollment.eligibility_status != "Eligible":
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot approve enrollment with status: {enrollment.eligibility_status}"
        )
    
    if approval.approved:
        # Check seat availability
        course = db.query(Course).filter(Course.id == enrollment.course_id).first()
        if course.current_enrolled >= course.seat_limit:
            raise HTTPException(status_code=400, detail="No available seats")
        
        enrollment.approval_status = ApprovalStatus.APPROVED
        enrollment.approved_by = approved_by
        enrollment.approved_at = datetime.utcnow()
        
        # Update seat count
        course.current_enrolled += 1
    else:
        enrollment.approval_status = ApprovalStatus.REJECTED
        enrollment.rejection_reason = approval.rejection_reason
    
    db.commit()
    db.refresh(enrollment)
    
    enrollment_dict = EnrollmentResponse.from_orm(enrollment).dict()
    enrollment_dict['student_name'] = enrollment.student.name
    enrollment_dict['student_email'] = enrollment.student.email
    enrollment_dict['student_sbu'] = enrollment.student.sbu.value
    enrollment_dict['course_name'] = enrollment.course.name
    enrollment_dict['batch_code'] = enrollment.course.batch_code
    
    return EnrollmentResponse(**enrollment_dict)

@router.post("/approve/bulk", response_model=dict)
def bulk_approve_enrollments(
    bulk_approval: EnrollmentBulkApproval,
    approved_by: str = Query(..., description="Instructor/Admin name"),
    db: Session = Depends(get_db)
):
    """Bulk approve multiple enrollments."""
    enrollments = db.query(Enrollment).filter(
        Enrollment.id.in_(bulk_approval.enrollment_ids)
    ).all()
    
    if len(enrollments) != len(bulk_approval.enrollment_ids):
        raise HTTPException(status_code=404, detail="Some enrollments not found")
    
    results = {"approved": 0, "rejected": 0, "errors": []}
    
    for enrollment in enrollments:
        try:
            if enrollment.eligibility_status != "Eligible":
                results["errors"].append({
                    "enrollment_id": enrollment.id,
                    "error": f"Not eligible: {enrollment.eligibility_status}"
                })
                continue
            
            if bulk_approval.approved:
                course = db.query(Course).filter(Course.id == enrollment.course_id).first()
                if course.current_enrolled >= course.seat_limit:
                    results["errors"].append({
                        "enrollment_id": enrollment.id,
                        "error": "No available seats"
                    })
                    continue
                
                enrollment.approval_status = ApprovalStatus.APPROVED
                enrollment.approved_by = approved_by
                enrollment.approved_at = datetime.utcnow()
                course.current_enrolled += 1
                results["approved"] += 1
            else:
                enrollment.approval_status = ApprovalStatus.REJECTED
                results["rejected"] += 1
        except Exception as e:
            results["errors"].append({
                "enrollment_id": enrollment.id,
                "error": str(e)
            })
    
    db.commit()
    return results

@router.get("/{enrollment_id}", response_model=EnrollmentResponse)
def get_enrollment(enrollment_id: int, db: Session = Depends(get_db)):
    """Get a specific enrollment by ID."""
    enrollment = db.query(Enrollment).filter(Enrollment.id == enrollment_id).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    
    enrollment_dict = EnrollmentResponse.from_orm(enrollment).dict()
    enrollment_dict['student_name'] = enrollment.student.name
    enrollment_dict['student_email'] = enrollment.student.email
    enrollment_dict['student_sbu'] = enrollment.student.sbu.value
    enrollment_dict['course_name'] = enrollment.course.name
    enrollment_dict['batch_code'] = enrollment.course.batch_code
    
    return EnrollmentResponse(**enrollment_dict)

