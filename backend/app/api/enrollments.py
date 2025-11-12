from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
from app.db.base import get_db
from app.models.enrollment import Enrollment, ApprovalStatus
from app.models.course import Course
from app.schemas.enrollment import EnrollmentResponse, EnrollmentApproval, EnrollmentBulkApproval, EnrollmentCreate
from app.services.eligibility_service import EligibilityService
from app.models.enrollment import EligibilityStatus

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
        # Validate eligibility_status against enum values
        try:
            EligibilityStatus(eligibility_status)
            query = query.filter(Enrollment.eligibility_status == eligibility_status)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid eligibility_status value")
    if approval_status:
        # Validate approval_status against enum values
        try:
            ApprovalStatus(approval_status)
            query = query.filter(Enrollment.approval_status == approval_status)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid approval_status value")
    if sbu:
        from app.models.student import Student
        from app.core.validation import validate_sbu
        try:
            validated_sbu = validate_sbu(sbu)
            query = query.join(Student).filter(Student.sbu == validated_sbu)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
    
    enrollments = query.offset(skip).limit(limit).all()
    
    # Enrich with related data and calculate overall completion rate
    from app.models.enrollment import CompletionStatus
    result = []
    for enrollment in enrollments:
        enrollment_dict = EnrollmentResponse.from_orm(enrollment).dict()
        enrollment_dict['student_name'] = enrollment.student.name
        enrollment_dict['student_email'] = enrollment.student.email
        enrollment_dict['student_sbu'] = enrollment.student.sbu.value
        enrollment_dict['student_employee_id'] = enrollment.student.employee_id
        enrollment_dict['student_designation'] = enrollment.student.designation
        enrollment_dict['student_experience_years'] = enrollment.student.experience_years
        enrollment_dict['course_name'] = enrollment.course_name or (enrollment.course.name if enrollment.course else None)
        enrollment_dict['batch_code'] = enrollment.batch_code or (enrollment.course.batch_code if enrollment.course else None)
        enrollment_dict['course_description'] = enrollment.course.description if enrollment.course else None
        
        # Calculate overall completion rate for this student across all courses
        # Only count courses that have a final outcome (completed, failed, or withdrawn)
        # Exclude: pending approvals, not started, in progress, and rejected (admin's decision)
        all_student_enrollments = db.query(Enrollment).filter(
            Enrollment.student_id == enrollment.student_id
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
        
        enrollment_dict['overall_completion_rate'] = round(overall_completion_rate, 1)
        enrollment_dict['total_courses_assigned'] = total_courses
        enrollment_dict['completed_courses'] = completed_courses
        
        # Create response with all fields
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
        enrollment_dict['student_employee_id'] = enrollment.student.employee_id
        enrollment_dict['student_designation'] = enrollment.student.designation
        enrollment_dict['student_experience_years'] = enrollment.student.experience_years
        enrollment_dict['course_name'] = enrollment.course_name or (enrollment.course.name if enrollment.course else None)
        enrollment_dict['batch_code'] = enrollment.batch_code or (enrollment.course.batch_code if enrollment.course else None)
        enrollment_dict['course_description'] = enrollment.course.description if enrollment.course else None
        result.append(EnrollmentResponse(**enrollment_dict))
    
    return result

@router.post("/approve", response_model=EnrollmentResponse)
def approve_enrollment(
    approval: EnrollmentApproval,
    approved_by: str = Query(..., description="Admin name"),
    db: Session = Depends(get_db)
):
    """Approve or reject a single enrollment."""
    enrollment = db.query(Enrollment).filter(Enrollment.id == approval.enrollment_id).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    
    if approval.approved:
        # Allow approving even if ineligible (admin can override eligibility checks)
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
    enrollment_dict['student_employee_id'] = enrollment.student.employee_id
    enrollment_dict['student_designation'] = enrollment.student.designation
    enrollment_dict['student_experience_years'] = enrollment.student.experience_years
    enrollment_dict['course_name'] = enrollment.course.name
    enrollment_dict['batch_code'] = enrollment.course.batch_code
    enrollment_dict['course_description'] = enrollment.course.description
    
    return EnrollmentResponse(**enrollment_dict)

@router.post("/approve/bulk", response_model=dict)
def bulk_approve_enrollments(
    bulk_approval: EnrollmentBulkApproval,
    approved_by: str = Query(..., description="Admin name"),
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

@router.post("/{enrollment_id}/withdraw", response_model=EnrollmentResponse)
def withdraw_enrollment(
    enrollment_id: int,
    withdrawal_reason: str = Query(..., description="Reason for withdrawal"),
    withdrawn_by: str = Query(..., description="Admin name"),
    db: Session = Depends(get_db)
):
    """Withdraw a student from a course (e.g., for misbehavior)."""
    enrollment = db.query(Enrollment).filter(Enrollment.id == enrollment_id).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    
    # Check if already withdrawn
    if enrollment.approval_status == ApprovalStatus.WITHDRAWN:
        raise HTTPException(status_code=400, detail="Enrollment already withdrawn")
    
    # Only allow withdrawal if approved (enrolled)
    if enrollment.approval_status != ApprovalStatus.APPROVED:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot withdraw enrollment with status: {enrollment.approval_status}"
        )
    
    # Update enrollment status
    enrollment.approval_status = ApprovalStatus.WITHDRAWN
    enrollment.rejection_reason = withdrawal_reason
    enrollment.approved_by = withdrawn_by  # Store who withdrew
    enrollment.approved_at = datetime.utcnow()
    
    # Free up the seat
    course = db.query(Course).filter(Course.id == enrollment.course_id).first()
    if course.current_enrolled > 0:
        course.current_enrolled -= 1
    
    db.commit()
    db.refresh(enrollment)
    
    enrollment_dict = EnrollmentResponse.from_orm(enrollment).dict()
    enrollment_dict['student_name'] = enrollment.student.name
    enrollment_dict['student_email'] = enrollment.student.email
    enrollment_dict['student_sbu'] = enrollment.student.sbu.value
    enrollment_dict['student_employee_id'] = enrollment.student.employee_id
    enrollment_dict['student_designation'] = enrollment.student.designation
    enrollment_dict['student_experience_years'] = enrollment.student.experience_years
    enrollment_dict['course_name'] = enrollment.course.name
    enrollment_dict['batch_code'] = enrollment.course.batch_code
    enrollment_dict['course_description'] = enrollment.course.description
    
    return EnrollmentResponse(**enrollment_dict)

@router.post("/{enrollment_id}/reapprove", response_model=EnrollmentResponse)
def reapprove_enrollment(
    enrollment_id: int,
    approved_by: str = Query(..., description="Admin name"),
    db: Session = Depends(get_db)
):
    """Reapprove a previously withdrawn enrollment."""
    enrollment = db.query(Enrollment).filter(Enrollment.id == enrollment_id).first()
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")
    
    # Only allow reapproval if withdrawn
    if enrollment.approval_status != ApprovalStatus.WITHDRAWN:
        raise HTTPException(
            status_code=400, 
            detail=f"Cannot reapprove enrollment with status: {enrollment.approval_status}. Only withdrawn enrollments can be reapproved."
        )
    
    # Allow reapproving even if ineligible (admin can override eligibility checks)
    # The eligibility_reason will still show why they're ineligible
    
    # Check seat availability
    course = db.query(Course).filter(Course.id == enrollment.course_id).first()
    if course.current_enrolled >= course.seat_limit:
        raise HTTPException(status_code=400, detail="No available seats")
    
    # Reapprove enrollment
    enrollment.approval_status = ApprovalStatus.APPROVED
    enrollment.approved_by = approved_by
    enrollment.approved_at = datetime.utcnow()
    enrollment.rejection_reason = None  # Clear withdrawal reason
    
    # Update seat count
    course.current_enrolled += 1
    
    db.commit()
    db.refresh(enrollment)
    
    enrollment_dict = EnrollmentResponse.from_orm(enrollment).dict()
    enrollment_dict['student_name'] = enrollment.student.name
    enrollment_dict['student_email'] = enrollment.student.email
    enrollment_dict['student_sbu'] = enrollment.student.sbu.value
    enrollment_dict['student_employee_id'] = enrollment.student.employee_id
    enrollment_dict['student_designation'] = enrollment.student.designation
    enrollment_dict['student_experience_years'] = enrollment.student.experience_years
    enrollment_dict['course_name'] = enrollment.course.name
    enrollment_dict['batch_code'] = enrollment.course.batch_code
    enrollment_dict['course_description'] = enrollment.course.description
    
    return EnrollmentResponse(**enrollment_dict)

@router.post("/", response_model=EnrollmentResponse, status_code=201)
def create_enrollment(
    enrollment_data: EnrollmentCreate,
    db: Session = Depends(get_db)
):
    """Manually create a new enrollment for a student in a course."""
    from app.models.student import Student
    
    # Check if student exists
    student = db.query(Student).filter(Student.id == enrollment_data.student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    # Check if course exists
    course = db.query(Course).filter(Course.id == enrollment_data.course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Check if enrollment already exists
    existing = db.query(Enrollment).filter(
        Enrollment.student_id == enrollment_data.student_id,
        Enrollment.course_id == enrollment_data.course_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail=f"Enrollment already exists for {student.name} in {course.name}")
    
    # Run eligibility checks
    eligibility_status, reason = EligibilityService.run_all_checks(
        db, enrollment_data.student_id, enrollment_data.course_id
    )
    
    # For manual enrollment, auto-approve if eligible and seats available
    # If ineligible, set to PENDING so admin can still manually approve if needed
    if eligibility_status == EligibilityStatus.ELIGIBLE:
        # Check seat availability before auto-approving
        if course.current_enrolled >= course.seat_limit:
            # No seats available, set to PENDING
            approval_status = ApprovalStatus.PENDING
            approved_by = None
            approved_at = None
        else:
            # Auto-approve manual enrollment
            approval_status = ApprovalStatus.APPROVED
            approved_by = "Admin (Manual Enrollment)"
            approved_at = datetime.utcnow()
            
            # Update seat count
            course.current_enrolled += 1
    else:
        # Not eligible, set to PENDING so admin can manually approve if needed
        # The eligibility_reason will show why they're ineligible
        approval_status = ApprovalStatus.PENDING
        approved_by = None
        approved_at = None
    
    # Create enrollment
    enrollment = Enrollment(
        student_id=enrollment_data.student_id,
        course_id=enrollment_data.course_id,
        course_name=course.name,  # Store course name for history preservation
        batch_code=course.batch_code,  # Store batch code for history preservation
        eligibility_status=eligibility_status,
        eligibility_reason=reason,
        eligibility_checked_at=datetime.utcnow(),
        approval_status=approval_status,
        approved_by=approved_by,
        approved_at=approved_at
    )
    
    db.add(enrollment)
    db.commit()
    db.refresh(enrollment)
    
    enrollment_dict = EnrollmentResponse.from_orm(enrollment).dict()
    enrollment_dict['student_name'] = enrollment.student.name
    enrollment_dict['student_email'] = enrollment.student.email
    enrollment_dict['student_sbu'] = enrollment.student.sbu.value
    enrollment_dict['student_employee_id'] = enrollment.student.employee_id
    enrollment_dict['student_designation'] = enrollment.student.designation
    enrollment_dict['student_experience_years'] = enrollment.student.experience_years
    enrollment_dict['course_name'] = enrollment.course.name
    enrollment_dict['batch_code'] = enrollment.course.batch_code
    enrollment_dict['course_description'] = enrollment.course.description
    
    return EnrollmentResponse(**enrollment_dict)

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
    enrollment_dict['student_employee_id'] = enrollment.student.employee_id
    enrollment_dict['student_designation'] = enrollment.student.designation
    enrollment_dict['student_experience_years'] = enrollment.student.experience_years
    enrollment_dict['course_name'] = enrollment.course.name
    enrollment_dict['batch_code'] = enrollment.course.batch_code
    enrollment_dict['course_description'] = enrollment.course.description
    
    return EnrollmentResponse(**enrollment_dict)

