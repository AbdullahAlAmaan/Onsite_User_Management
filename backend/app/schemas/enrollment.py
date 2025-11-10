from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.models.enrollment import EligibilityStatus, ApprovalStatus, CompletionStatus

class EnrollmentResponse(BaseModel):
    id: int
    student_id: int
    course_id: int
    eligibility_status: EligibilityStatus
    eligibility_reason: Optional[str]
    eligibility_checked_at: Optional[datetime]
    approval_status: ApprovalStatus
    approved_by: Optional[str]
    approved_at: Optional[datetime]
    rejection_reason: Optional[str]
    completion_status: CompletionStatus
    score: Optional[float]
    attendance_percentage: Optional[float]
    completion_date: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    
    # Related data
    student_name: Optional[str] = None
    student_email: Optional[str] = None
    student_sbu: Optional[str] = None
    student_employee_id: Optional[str] = None
    student_designation: Optional[str] = None
    student_experience_years: Optional[int] = None
    course_name: Optional[str] = None
    batch_code: Optional[str] = None
    
    class Config:
        from_attributes = True

class EnrollmentApproval(BaseModel):
    enrollment_id: int
    approved: bool
    rejection_reason: Optional[str] = None

class EnrollmentBulkApproval(BaseModel):
    enrollment_ids: List[int]
    approved: bool

class CompletionUpload(BaseModel):
    enrollment_id: int
    score: Optional[float] = None
    attendance_percentage: Optional[float] = None
    completion_status: CompletionStatus

class CompletionBulkUpload(BaseModel):
    completions: List[CompletionUpload]

