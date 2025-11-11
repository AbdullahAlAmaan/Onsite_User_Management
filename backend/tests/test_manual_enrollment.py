#!/usr/bin/env python3
"""Test manual enrollment and auto-approval features."""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.base import SessionLocal
from app.models.course import Course
from app.models.enrollment import Enrollment, ApprovalStatus, CompletionStatus, EligibilityStatus
from app.models.student import Student
from datetime import date, timedelta

def test_manual_enrollment_auto_approve_eligible():
    """Test that manual enrollment auto-approves if student is eligible."""
    print("\n" + "=" * 60)
    print("TEST: Manual Enrollment Auto-Approve (Eligible)")
    print("=" * 60)
    
    db = SessionLocal()
    try:
        # Create test course with available seats
        test_course = Course(
            name="Test Course - Manual Enrollment",
            batch_code=f"TEST-ME-{int(date.today().strftime('%Y%m%d%H%M%S'))}",
            description="Test course for manual enrollment",
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
        student = db.query(Student).filter(Student.employee_id == "TEST-ME-001").first()
        if not student:
            student = Student(
                employee_id="TEST-ME-001",
                name="Test Student ME",
                email="testme@example.com",
                sbu="IT",
                designation="Developer"
            )
            db.add(student)
            db.commit()
            db.refresh(student)
        
        # Create manual enrollment (eligible, seats available)
        enrollment = Enrollment(
            student_id=student.id,
            course_id=test_course.id,
            course_name=test_course.name,
            batch_code=test_course.batch_code,
            eligibility_status=EligibilityStatus.ELIGIBLE,
            approval_status=ApprovalStatus.APPROVED,  # Auto-approved
            completion_status=CompletionStatus.NOT_STARTED
        )
        db.add(enrollment)
        
        # Update course enrollment count
        test_course.current_enrolled += 1
        db.commit()
        db.refresh(enrollment)
        db.refresh(test_course)
        
        print(f"✓ Enrollment created: {enrollment.id}")
        print(f"  - Student: {student.name} ({student.employee_id})")
        print(f"  - Course: {test_course.name}")
        print(f"  - Eligibility: {enrollment.eligibility_status.value}")
        print(f"  - Approval Status: {enrollment.approval_status.value}")
        print(f"  - Course Enrolled Count: {test_course.current_enrolled}")
        
        if (enrollment.approval_status == ApprovalStatus.APPROVED and 
            test_course.current_enrolled == 1):
            print("\n✓ PASS: Manual enrollment auto-approval works correctly")
            return True, enrollment.id, test_course.id, student.id
        else:
            print("\n✗ FAIL: Manual enrollment auto-approval failed")
            return False, None, test_course.id, student.id
    except Exception as e:
        db.rollback()
        print(f"\n✗ FAIL: Error creating manual enrollment: {e}")
        import traceback
        traceback.print_exc()
        return False, None, None, None
    finally:
        db.close()

def test_manual_enrollment_not_eligible():
    """Test that manual enrollment doesn't auto-approve if student is not eligible."""
    print("\n" + "=" * 60)
    print("TEST: Manual Enrollment (Not Eligible)")
    print("=" * 60)
    
    db = SessionLocal()
    try:
        # Create test course
        test_course = Course(
            name="Test Course - Manual Enrollment 2",
            batch_code=f"TEST-ME2-{int(date.today().strftime('%Y%m%d%H%M%S'))}",
            description="Test course for manual enrollment 2",
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
        student = db.query(Student).filter(Student.employee_id == "TEST-ME-002").first()
        if not student:
            student = Student(
                employee_id="TEST-ME-002",
                name="Test Student ME 2",
                email="testme2@example.com",
                sbu="IT",
                designation="Developer"
            )
            db.add(student)
            db.commit()
            db.refresh(student)
        
        # Create manual enrollment (not eligible - should remain PENDING)
        enrollment = Enrollment(
            student_id=student.id,
            course_id=test_course.id,
            course_name=test_course.name,
            batch_code=test_course.batch_code,
            eligibility_status=EligibilityStatus.INELIGIBLE_DUPLICATE,
            approval_status=ApprovalStatus.PENDING,  # Not auto-approved
            completion_status=CompletionStatus.NOT_STARTED,
            eligibility_reason="Already taken this course"
        )
        db.add(enrollment)
        db.commit()
        db.refresh(enrollment)
        
        print(f"✓ Enrollment created: {enrollment.id}")
        print(f"  - Student: {student.name} ({student.employee_id})")
        print(f"  - Course: {test_course.name}")
        print(f"  - Eligibility: {enrollment.eligibility_status.value}")
        print(f"  - Approval Status: {enrollment.approval_status.value}")
        
        if enrollment.approval_status == ApprovalStatus.PENDING:
            print("\n✓ PASS: Manual enrollment correctly stays pending when not eligible")
            return True, enrollment.id, test_course.id, student.id
        else:
            print("\n✗ FAIL: Manual enrollment should remain pending when not eligible")
            return False, None, test_course.id, student.id
    except Exception as e:
        db.rollback()
        print(f"\n✗ FAIL: Error creating manual enrollment: {e}")
        import traceback
        traceback.print_exc()
        return False, None, None, None
    finally:
        db.close()

def test_manual_enrollment_seat_limit():
    """Test that manual enrollment doesn't auto-approve if course is full."""
    print("\n" + "=" * 60)
    print("TEST: Manual Enrollment (Seat Limit)")
    print("=" * 60)
    
    db = SessionLocal()
    try:
        # Create test course with no available seats
        test_course = Course(
            name="Test Course - Manual Enrollment 3",
            batch_code=f"TEST-ME3-{int(date.today().strftime('%Y%m%d%H%M%S'))}",
            description="Test course for manual enrollment 3",
            start_date=date.today(),
            end_date=date.today() + timedelta(days=30),
            seat_limit=1,
            current_enrolled=1,  # Already full
            total_classes_offered=10,
            is_archived=False
        )
        db.add(test_course)
        db.commit()
        db.refresh(test_course)
        
        # Create or get test student
        student = db.query(Student).filter(Student.employee_id == "TEST-ME-003").first()
        if not student:
            student = Student(
                employee_id="TEST-ME-003",
                name="Test Student ME 3",
                email="testme3@example.com",
                sbu="IT",
                designation="Developer"
            )
            db.add(student)
            db.commit()
            db.refresh(student)
        
        # Create manual enrollment (eligible but no seats - should remain PENDING)
        enrollment = Enrollment(
            student_id=student.id,
            course_id=test_course.id,
            course_name=test_course.name,
            batch_code=test_course.batch_code,
            eligibility_status=EligibilityStatus.ELIGIBLE,
            approval_status=ApprovalStatus.PENDING,  # Not auto-approved (no seats)
            completion_status=CompletionStatus.NOT_STARTED
        )
        db.add(enrollment)
        db.commit()
        db.refresh(enrollment)
        
        print(f"✓ Enrollment created: {enrollment.id}")
        print(f"  - Student: {student.name} ({student.employee_id})")
        print(f"  - Course: {test_course.name}")
        print(f"  - Seat Limit: {test_course.seat_limit}")
        print(f"  - Current Enrolled: {test_course.current_enrolled}")
        print(f"  - Eligibility: {enrollment.eligibility_status.value}")
        print(f"  - Approval Status: {enrollment.approval_status.value}")
        
        if enrollment.approval_status == ApprovalStatus.PENDING:
            print("\n✓ PASS: Manual enrollment correctly stays pending when course is full")
            return True, enrollment.id, test_course.id, student.id
        else:
            print("\n✗ FAIL: Manual enrollment should remain pending when course is full")
            return False, None, test_course.id, student.id
    except Exception as e:
        db.rollback()
        print(f"\n✗ FAIL: Error creating manual enrollment: {e}")
        import traceback
        traceback.print_exc()
        return False, None, None, None
    finally:
        db.close()

def cleanup_test_data(enrollment_ids, course_ids, student_ids):
    """Clean up test data."""
    print("\n" + "=" * 60)
    print("CLEANUP: Removing test data")
    print("=" * 60)
    
    db = SessionLocal()
    try:
        # Delete test enrollments
        if enrollment_ids:
            for enrollment_id in enrollment_ids:
                db.query(Enrollment).filter(Enrollment.id == enrollment_id).delete()
        # Delete test students
        if student_ids:
            for student_id in student_ids:
                db.query(Student).filter(Student.id == student_id).delete()
        # Delete test courses
        if course_ids:
            for course_id in course_ids:
                db.query(Course).filter(Course.id == course_id).delete()
        db.commit()
        print("✓ Test data cleaned up")
    except Exception as e:
        db.rollback()
        print(f"✗ Cleanup error: {e}")
    finally:
        db.close()

def main():
    """Run all manual enrollment tests."""
    print("=" * 60)
    print("MANUAL ENROLLMENT TESTS")
    print("=" * 60)
    
    results = []
    enrollment_ids = []
    course_ids = []
    student_ids = []
    
    # Test 1: Auto-approve eligible student
    success, enrollment_id, course_id, student_id = test_manual_enrollment_auto_approve_eligible()
    results.append(success)
    if enrollment_id:
        enrollment_ids.append(enrollment_id)
    if course_id:
        course_ids.append(course_id)
    if student_id:
        student_ids.append(student_id)
    
    # Test 2: Not eligible
    success, enrollment_id, course_id, student_id = test_manual_enrollment_not_eligible()
    results.append(success)
    if enrollment_id:
        enrollment_ids.append(enrollment_id)
    if course_id:
        course_ids.append(course_id)
    if student_id:
        student_ids.append(student_id)
    
    # Test 3: Seat limit
    success, enrollment_id, course_id, student_id = test_manual_enrollment_seat_limit()
    results.append(success)
    if enrollment_id:
        enrollment_ids.append(enrollment_id)
    if course_id:
        course_ids.append(course_id)
    if student_id:
        student_ids.append(student_id)
    
    # Cleanup
    cleanup_test_data(enrollment_ids, course_ids, student_ids)
    
    print("\n" + "=" * 60)
    if all(results):
        print("✓ ALL MANUAL ENROLLMENT TESTS PASSED")
        return True
    else:
        print("✗ SOME MANUAL ENROLLMENT TESTS FAILED")
        return False
    print("=" * 60)

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

