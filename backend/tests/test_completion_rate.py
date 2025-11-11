#!/usr/bin/env python3
"""Test overall completion rate calculation features."""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.base import SessionLocal
from app.models.course import Course
from app.models.enrollment import Enrollment, ApprovalStatus, CompletionStatus, EligibilityStatus
from app.models.student import Student
from datetime import date, timedelta
from sqlalchemy import func

def test_overall_completion_rate_calculation():
    """Test overall completion rate calculation for a student."""
    print("\n" + "=" * 60)
    print("TEST: Overall Completion Rate Calculation")
    print("=" * 60)
    
    db = SessionLocal()
    try:
        # Create test student
        student = db.query(Student).filter(Student.employee_id == "TEST-CR-001").first()
        if not student:
            student = Student(
                employee_id="TEST-CR-001",
                name="Test Student CR",
                email="testcr@example.com",
                sbu="IT",
                designation="Developer"
            )
            db.add(student)
            db.commit()
            db.refresh(student)
        
        # Create 4 test courses
        courses = []
        for i in range(4):
            course = Course(
                name=f"Test Course CR {i+1}",
                batch_code=f"TEST-CR-{i+1}-{int(date.today().strftime('%Y%m%d%H%M%S'))}",
                description=f"Test course {i+1}",
                start_date=date.today(),
                end_date=date.today() + timedelta(days=30),
                seat_limit=50,
                current_enrolled=0,
                total_classes_offered=10,
                is_archived=False
            )
            db.add(course)
            courses.append(course)
        db.commit()
        
        # Create enrollments with different completion statuses
        # Course 1: COMPLETED (80% attendance)
        enrollment1 = Enrollment(
            student_id=student.id,
            course_id=courses[0].id,
            course_name=courses[0].name,
            batch_code=courses[0].batch_code,
            eligibility_status=EligibilityStatus.ELIGIBLE,
            approval_status=ApprovalStatus.APPROVED,
            completion_status=CompletionStatus.COMPLETED,
            total_attendance=10,
            present=8,
            attendance_percentage=80.0
        )
        db.add(enrollment1)
        
        # Course 2: COMPLETED (90% attendance)
        enrollment2 = Enrollment(
            student_id=student.id,
            course_id=courses[1].id,
            course_name=courses[1].name,
            batch_code=courses[1].batch_code,
            eligibility_status=EligibilityStatus.ELIGIBLE,
            approval_status=ApprovalStatus.APPROVED,
            completion_status=CompletionStatus.COMPLETED,
            total_attendance=10,
            present=9,
            attendance_percentage=90.0
        )
        db.add(enrollment2)
        
        # Course 3: FAILED (70% attendance - below 80% threshold)
        enrollment3 = Enrollment(
            student_id=student.id,
            course_id=courses[2].id,
            course_name=courses[2].name,
            batch_code=courses[2].batch_code,
            eligibility_status=EligibilityStatus.ELIGIBLE,
            approval_status=ApprovalStatus.APPROVED,
            completion_status=CompletionStatus.FAILED,
            total_attendance=10,
            present=7,
            attendance_percentage=70.0
        )
        db.add(enrollment3)
        
        # Course 4: IN_PROGRESS (not completed yet)
        enrollment4 = Enrollment(
            student_id=student.id,
            course_id=courses[3].id,
            course_name=courses[3].name,
            batch_code=courses[3].batch_code,
            eligibility_status=EligibilityStatus.ELIGIBLE,
            approval_status=ApprovalStatus.APPROVED,
            completion_status=CompletionStatus.IN_PROGRESS,
            total_attendance=10,
            present=5,
            attendance_percentage=50.0
        )
        db.add(enrollment4)
        
        db.commit()
        
        # Calculate overall completion rate
        # Only count APPROVED enrollments
        # Completed = 2, Total = 4, Rate = 50%
        approved_enrollments = db.query(Enrollment).filter(
            Enrollment.student_id == student.id,
            Enrollment.approval_status == ApprovalStatus.APPROVED
        ).all()
        
        total_courses = len(approved_enrollments)
        completed_courses = sum(1 for e in approved_enrollments if e.completion_status == CompletionStatus.COMPLETED)
        overall_completion_rate = (completed_courses / total_courses * 100) if total_courses > 0 else 0.0
        
        print(f"✓ Student: {student.name} ({student.employee_id})")
        print(f"  - Total Courses: {total_courses}")
        print(f"  - Completed Courses: {completed_courses}")
        print(f"  - Overall Completion Rate: {overall_completion_rate:.1f}%")
        
        # Expected: 2 completed out of 4 = 50%
        if total_courses == 4 and completed_courses == 2 and overall_completion_rate == 50.0:
            print("\n✓ PASS: Overall completion rate calculation works correctly")
            return True, student.id, [c.id for c in courses]
        else:
            print(f"\n✗ FAIL: Expected 4 courses, 2 completed, 50% rate. Got {total_courses}, {completed_courses}, {overall_completion_rate:.1f}%")
            return False, student.id, [c.id for c in courses]
    except Exception as e:
        db.rollback()
        print(f"\n✗ FAIL: Error calculating completion rate: {e}")
        import traceback
        traceback.print_exc()
        return False, None, []
    finally:
        db.close()

def test_completion_rate_color_coding():
    """Test completion rate color coding thresholds."""
    print("\n" + "=" * 60)
    print("TEST: Completion Rate Color Coding")
    print("=" * 60)
    
    test_cases = [
        (75.0, "green"),   # >= 75% = green
        (60.0, "orange"),  # 60-75% = orange
        (50.0, "red"),     # < 60% = red
        (100.0, "green"),  # 100% = green
        (74.9, "orange"),  # Just below 75% = orange
        (59.9, "red"),     # Just below 60% = red
    ]
    
    def get_color_code(rate):
        """Determine color code based on completion rate."""
        if rate >= 75.0:
            return "green"
        elif rate >= 60.0:
            return "orange"
        else:
            return "red"
    
    all_passed = True
    for rate, expected_color in test_cases:
        color = get_color_code(rate)
        if color == expected_color:
            print(f"  ✓ {rate:.1f}% -> {color} (as expected)")
        else:
            print(f"  ✗ {rate:.1f}% -> {color} (expected {expected_color})")
            all_passed = False
    
    if all_passed:
        print("\n✓ PASS: Completion rate color coding works correctly")
        return True
    else:
        print("\n✗ FAIL: Completion rate color coding has issues")
        return False

def test_completion_rate_with_no_courses():
    """Test completion rate calculation when student has no courses."""
    print("\n" + "=" * 60)
    print("TEST: Completion Rate with No Courses")
    print("=" * 60)
    
    db = SessionLocal()
    try:
        # Create test student with no enrollments
        student = db.query(Student).filter(Student.employee_id == "TEST-CR-002").first()
        if not student:
            student = Student(
                employee_id="TEST-CR-002",
                name="Test Student CR No Courses",
                email="testcr2@example.com",
                sbu="IT",
                designation="Developer"
            )
            db.add(student)
            db.commit()
            db.refresh(student)
        
        # Calculate completion rate
        approved_enrollments = db.query(Enrollment).filter(
            Enrollment.student_id == student.id,
            Enrollment.approval_status == ApprovalStatus.APPROVED
        ).all()
        
        total_courses = len(approved_enrollments)
        completed_courses = sum(1 for e in approved_enrollments if e.completion_status == CompletionStatus.COMPLETED)
        overall_completion_rate = (completed_courses / total_courses * 100) if total_courses > 0 else 0.0
        
        print(f"✓ Student: {student.name} ({student.employee_id})")
        print(f"  - Total Courses: {total_courses}")
        print(f"  - Completed Courses: {completed_courses}")
        print(f"  - Overall Completion Rate: {overall_completion_rate:.1f}%")
        
        if total_courses == 0 and overall_completion_rate == 0.0:
            print("\n✓ PASS: Completion rate with no courses works correctly")
            return True, student.id
        else:
            print(f"\n✗ FAIL: Expected 0 courses, 0% rate. Got {total_courses}, {overall_completion_rate:.1f}%")
            return False, student.id
    except Exception as e:
        db.rollback()
        print(f"\n✗ FAIL: Error calculating completion rate: {e}")
        import traceback
        traceback.print_exc()
        return False, None
    finally:
        db.close()

def cleanup_test_data(student_ids, course_ids):
    """Clean up test data."""
    print("\n" + "=" * 60)
    print("CLEANUP: Removing test data")
    print("=" * 60)
    
    db = SessionLocal()
    try:
        # Delete test enrollments
        if student_ids:
            for student_id in student_ids:
                db.query(Enrollment).filter(Enrollment.student_id == student_id).delete()
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
    """Run all completion rate tests."""
    print("=" * 60)
    print("COMPLETION RATE TESTS")
    print("=" * 60)
    
    results = []
    student_ids = []
    course_ids = []
    
    # Test 1: Overall completion rate calculation
    success, student_id, course_id_list = test_overall_completion_rate_calculation()
    results.append(success)
    if student_id:
        student_ids.append(student_id)
    if course_id_list:
        course_ids.extend(course_id_list)
    
    # Test 2: Color coding
    results.append(test_completion_rate_color_coding())
    
    # Test 3: No courses
    success, student_id = test_completion_rate_with_no_courses()
    results.append(success)
    if student_id:
        student_ids.append(student_id)
    
    # Cleanup
    cleanup_test_data(student_ids, course_ids)
    
    print("\n" + "=" * 60)
    if all(results):
        print("✓ ALL COMPLETION RATE TESTS PASSED")
        return True
    else:
        print("✗ SOME COMPLETION RATE TESTS FAILED")
        return False
    print("=" * 60)

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

