from sqlalchemy.orm import Session
from datetime import datetime, date
from typing import Tuple, Optional
from app.models.enrollment import Enrollment, EligibilityStatus
from app.models.course import Course
from app.models.student import Student

class EligibilityService:
    """Service for running eligibility checks on enrollments."""
    
    @staticmethod
    def check_prerequisite(db: Session, student_id: int, course_id: int) -> Tuple[bool, Optional[str]]:
        """
        Check if student has completed prerequisite course.
        Returns (is_eligible, reason_if_ineligible)
        """
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course or not course.prerequisite_course_id:
            return True, None
        
        # Check if student has completed the prerequisite
        prerequisite_enrollment = db.query(Enrollment).filter(
            Enrollment.student_id == student_id,
            Enrollment.course_id == course.prerequisite_course_id,
            Enrollment.completion_status == "Completed"
        ).first()
        
        if not prerequisite_enrollment:
            prerequisite_course = db.query(Course).filter(
                Course.id == course.prerequisite_course_id
            ).first()
            return False, f"Missing prerequisite: {prerequisite_course.name if prerequisite_course else 'Unknown'}"
        
        return True, None
    
    @staticmethod
    def check_duplicate(db: Session, student_id: int, course_id: int) -> Tuple[bool, Optional[str]]:
        """
        Check if student is already enrolled in this course.
        Returns (is_eligible, reason_if_ineligible)
        """
        existing_enrollment = db.query(Enrollment).filter(
            Enrollment.student_id == student_id,
            Enrollment.course_id == course_id,
            Enrollment.approval_status.in_(["Pending", "Approved"])
        ).first()
        
        if existing_enrollment:
            course = db.query(Course).filter(Course.id == course_id).first()
            return False, f"Already enrolled in {course.name if course else 'this course'}"
        
        return True, None
    
    @staticmethod
    def check_annual_limit(db: Session, student_id: int, course_id: int) -> Tuple[bool, Optional[str]]:
        """
        Check if student has already taken another physical course this year.
        Returns (is_eligible, reason_if_ineligible)
        """
        current_year = date.today().year
        
        # Get all completed enrollments for this student in the current year
        completed_this_year = db.query(Enrollment).join(Course).filter(
            Enrollment.student_id == student_id,
            Enrollment.completion_status == "Completed",
            Enrollment.completion_date.isnot(None)
        ).all()
        
        # Check if any completion is in the current year
        for enrollment in completed_this_year:
            if enrollment.completion_date and enrollment.completion_date.year == current_year:
                # Check if it's a different course
                if enrollment.course_id != course_id:
                    course = db.query(Course).filter(Course.id == enrollment.course_id).first()
                    return False, f"Already completed another physical course this year: {course.name if course else 'Unknown'}"
        
        return True, None
    
    @staticmethod
    def run_all_checks(db: Session, student_id: int, course_id: int) -> Tuple[EligibilityStatus, Optional[str]]:
        """
        Run all three eligibility checks and return the final status.
        Returns (eligibility_status, reason)
        """
        # Check prerequisite
        eligible, reason = EligibilityService.check_prerequisite(db, student_id, course_id)
        if not eligible:
            return EligibilityStatus.INELIGIBLE_PREREQUISITE, reason
        
        # Check duplicate
        eligible, reason = EligibilityService.check_duplicate(db, student_id, course_id)
        if not eligible:
            return EligibilityStatus.INELIGIBLE_DUPLICATE, reason
        
        # Check annual limit
        eligible, reason = EligibilityService.check_annual_limit(db, student_id, course_id)
        if not eligible:
            return EligibilityStatus.INELIGIBLE_ANNUAL_LIMIT, reason
        
        # All checks passed
        return EligibilityStatus.ELIGIBLE, None

