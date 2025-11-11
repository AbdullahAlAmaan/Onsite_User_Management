#!/usr/bin/env python3
"""Test enrollment management features."""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.base import SessionLocal
from app.models.course import Course
from app.models.enrollment import Enrollment, ApprovalStatus, CompletionStatus, EligibilityStatus
from app.models.student import Student
from datetime import date, timedelta

def test_create_enrollment():
    """Test creating a new enrollment."""
    print("\n" + "=" * 60)
    print("TEST: Create Enrollment")
    print("=" * 60)
    
    db = SessionLocal()
    try:
        # Create test course
        test_course = Course(
            name="Test Course - Enrollment",
            batch_code=f"TEST-ENR-{int(date.today().strftime('%Y%m%d%H%M%S'))}",
            description="Test course for enrollment tests",
            start_date=date.today(),
            end_date=date.today() + timedelta(days=30),
            seat_limit=50,
            current_enrolled=0,
            total_classes_offered=10,
            is_archived=False
        )
        db.add(test_course)
        db.commit()
        db.refresh(test_course)
        
        # Create or get test student
        student = db.query(Student).filter(Student.employee_id == "TEST-ENR-001").first()
        if not student:
            student = Student(
                employee_id="TEST-ENR-001",
                name="Test Student ENR",
                email="testenr@example.com",
                sbu="IT",
                designation="Developer"
            )
            db.add(student)
            db.commit()
            db.refresh(student)
        
        # Create enrollment
        enrollment = Enrollment(
            student_id=student.id,
            course_id=test_course.id,
            course_name=test_course.name,
            batch_code=test_course.batch_code,
            eligibility_status=EligibilityStatus.ELIGIBLE,
            approval_status=ApprovalStatus.PENDING,
            completion_status=CompletionStatus.NOT_STARTED
        )
        db.add(enrollment)
        db.commit()
        db.refresh(enrollment)
        
        print(f"✓ Enrollment created: {enrollment.id}")
        print(f"  - Student: {student.name} ({student.employee_id})")
        print(f"  - Course: {test_course.name}")
        print(f"  - Status: {enrollment.approval_status}")
        
        # Verify enrollment exists
        found_enrollment = db.query(Enrollment).filter(Enrollment.id == enrollment.id).first()
        if found_enrollment and found_enrollment.student_id == student.id:
            print("\n✓ PASS: Enrollment creation works correctly")
            return True, enrollment.id, test_course.id, student.id
        else:
            print("\n✗ FAIL: Enrollment not found after creation")
            return False, None, None, None
    except Exception as e:
        db.rollback()
        print(f"\n✗ FAIL: Error creating enrollment: {e}")
        import traceback
        traceback.print_exc()
        return False, None, None, None
    finally:
        db.close()

def test_approve_enrollment(enrollment_id):
    """Test approving an enrollment."""
    print("\n" + "=" * 60)
    print("TEST: Approve Enrollment")
    print("=" * 60)
    
    if not enrollment_id:
        print("✗ SKIP: No enrollment ID provided")
        return False
    
    db = SessionLocal()
    try:
        enrollment = db.query(Enrollment).filter(Enrollment.id == enrollment_id).first()
        if not enrollment:
            print("✗ FAIL: Enrollment not found")
            return False
        
        enrollment.approval_status = ApprovalStatus.APPROVED
        enrollment.completion_status = CompletionStatus.IN_PROGRESS
        db.commit()
        db.refresh(enrollment)
        
        print(f"✓ Enrollment approved: {enrollment.id}")
        print(f"  - Approval Status: {enrollment.approval_status}")
        print(f"  - Completion Status: {enrollment.completion_status}")
        
        if enrollment.approval_status == ApprovalStatus.APPROVED:
            print("\n✓ PASS: Enrollment approval works correctly")
            return True
        else:
            print("\n✗ FAIL: Enrollment approval failed")
            return False
    except Exception as e:
        db.rollback()
        print(f"\n✗ FAIL: Error approving enrollment: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

def test_withdraw_enrollment(enrollment_id):
    """Test withdrawing an enrollment."""
    print("\n" + "=" * 60)
    print("TEST: Withdraw Enrollment")
    print("=" * 60)
    
    if not enrollment_id:
        print("✗ SKIP: No enrollment ID provided")
        return False
    
    db = SessionLocal()
    try:
        enrollment = db.query(Enrollment).filter(Enrollment.id == enrollment_id).first()
        if not enrollment:
            print("✗ FAIL: Enrollment not found")
            return False
        
        enrollment.approval_status = ApprovalStatus.WITHDRAWN
        db.commit()
        db.refresh(enrollment)
        
        print(f"✓ Enrollment withdrawn: {enrollment.id}")
        print(f"  - Approval Status: {enrollment.approval_status}")
        
        if enrollment.approval_status == ApprovalStatus.WITHDRAWN:
            print("\n✓ PASS: Enrollment withdrawal works correctly")
            return True
        else:
            print("\n✗ FAIL: Enrollment withdrawal failed")
            return False
    except Exception as e:
        db.rollback()
        print(f"\n✗ FAIL: Error withdrawing enrollment: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

def test_reapprove_enrollment(enrollment_id):
    """Test reapproving a withdrawn enrollment."""
    print("\n" + "=" * 60)
    print("TEST: Reapprove Enrollment")
    print("=" * 60)
    
    if not enrollment_id:
        print("✗ SKIP: No enrollment ID provided")
        return False
    
    db = SessionLocal()
    try:
        enrollment = db.query(Enrollment).filter(Enrollment.id == enrollment_id).first()
        if not enrollment:
            print("✗ FAIL: Enrollment not found")
            return False
        
        # Verify it's currently withdrawn
        if enrollment.approval_status != ApprovalStatus.WITHDRAWN:
            print(f"✗ SKIP: Enrollment is not withdrawn (status: {enrollment.approval_status})")
            return False
        
        # Reapprove
        enrollment.approval_status = ApprovalStatus.APPROVED
        enrollment.completion_status = CompletionStatus.IN_PROGRESS
        db.commit()
        db.refresh(enrollment)
        
        print(f"✓ Enrollment reapproved: {enrollment.id}")
        print(f"  - Approval Status: {enrollment.approval_status}")
        print(f"  - Completion Status: {enrollment.completion_status}")
        
        if enrollment.approval_status == ApprovalStatus.APPROVED:
            print("\n✓ PASS: Enrollment reapproval works correctly")
            return True
        else:
            print("\n✗ FAIL: Enrollment reapproval failed")
            return False
    except Exception as e:
        db.rollback()
        print(f"\n✗ FAIL: Error reapproving enrollment: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

def test_update_attendance(enrollment_id):
    """Test updating attendance for an enrollment."""
    print("\n" + "=" * 60)
    print("TEST: Update Attendance")
    print("=" * 60)
    
    if not enrollment_id:
        print("✗ SKIP: No enrollment ID provided")
        return False
    
    db = SessionLocal()
    try:
        enrollment = db.query(Enrollment).filter(Enrollment.id == enrollment_id).first()
        if not enrollment:
            print("✗ FAIL: Enrollment not found")
            return False
        
        # Update attendance (8 out of 10 classes = 80%)
        enrollment.total_attendance = 10
        enrollment.present = 8
        enrollment.attendance_percentage = 80.0
        enrollment.completion_status = CompletionStatus.COMPLETED  # 80% threshold
        db.commit()
        db.refresh(enrollment)
        
        print(f"✓ Attendance updated: {enrollment.id}")
        print(f"  - Total: {enrollment.total_attendance}")
        print(f"  - Present: {enrollment.present}")
        print(f"  - Percentage: {enrollment.attendance_percentage}%")
        print(f"  - Completion Status: {enrollment.completion_status}")
        
        if (enrollment.attendance_percentage == 80.0 and 
            enrollment.completion_status == CompletionStatus.COMPLETED):
            print("\n✓ PASS: Attendance update works correctly")
            return True
        else:
            print("\n✗ FAIL: Attendance update failed")
            return False
    except Exception as e:
        db.rollback()
        print(f"\n✗ FAIL: Error updating attendance: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

def cleanup_test_data(course_id, student_id):
    """Clean up test data."""
    print("\n" + "=" * 60)
    print("CLEANUP: Removing test data")
    print("=" * 60)
    
    db = SessionLocal()
    try:
        # Delete test enrollments
        if course_id:
            db.query(Enrollment).filter(Enrollment.course_id == course_id).delete()
        # Delete test students
        if student_id:
            db.query(Student).filter(Student.id == student_id).delete()
        # Delete test courses
        if course_id:
            db.query(Course).filter(Course.id == course_id).delete()
        db.commit()
        print("✓ Test data cleaned up")
    except Exception as e:
        db.rollback()
        print(f"✗ Cleanup error: {e}")
    finally:
        db.close()

def main():
    """Run all enrollment management tests."""
    print("=" * 60)
    print("ENROLLMENT MANAGEMENT TESTS")
    print("=" * 60)
    
    results = []
    enrollment_id = None
    course_id = None
    student_id = None
    
    # Test 1: Create enrollment
    success, enrollment_id, course_id, student_id = test_create_enrollment()
    results.append(success)
    
    if enrollment_id:
        # Test 2: Approve enrollment
        results.append(test_approve_enrollment(enrollment_id))
        
        # Test 3: Withdraw enrollment
        results.append(test_withdraw_enrollment(enrollment_id))
        
        # Test 4: Reapprove enrollment
        results.append(test_reapprove_enrollment(enrollment_id))
        
        # Test 5: Update attendance
        results.append(test_update_attendance(enrollment_id))
    
    # Cleanup
    cleanup_test_data(course_id, student_id)
    
    print("\n" + "=" * 60)
    if all(results):
        print("✓ ALL ENROLLMENT MANAGEMENT TESTS PASSED")
        return True
    else:
        print("✗ SOME ENROLLMENT MANAGEMENT TESTS FAILED")
        return False
    print("=" * 60)

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

