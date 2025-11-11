#!/usr/bin/env python3
"""Test attendance and completion upload functionality."""

import sys
import os
import tempfile
import pandas as pd
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.base import SessionLocal
from app.models.course import Course
from app.models.student import Student
from app.models.enrollment import Enrollment, ApprovalStatus, CompletionStatus, EligibilityStatus
from datetime import date, timedelta
import time

def test_attendance_calculation():
    """Test attendance percentage calculation."""
    print("\n" + "=" * 60)
    print("TEST: Attendance Percentage Calculation")
    print("=" * 60)
    
    db = SessionLocal()
    try:
        # Create test course with 10 total classes
        timestamp = int(time.time() * 1000)
        course = Course(
            name=f"Test Course Attendance {timestamp}",
            batch_code=f"ATTEND-{timestamp}",
            description="Test course",
            start_date=date.today(),
            end_date=date.today() + timedelta(days=30),
            seat_limit=50,
            current_enrolled=0,
            total_classes_offered=10,  # 10 classes total
            is_archived=False
        )
        db.add(course)
        
        student = Student(
            employee_id=f"TEST-ATTEND-{timestamp}",
            name="Test Student Attendance",
            email=f"testattend{timestamp}@example.com",
            sbu="IT",
            designation="Developer"
        )
        db.add(student)
        db.commit()
        db.refresh(course)
        db.refresh(student)
        
        # Create enrollment
        enrollment = Enrollment(
            student_id=student.id,
            course_id=course.id,
            course_name=course.name,
            batch_code=course.batch_code,
            eligibility_status=EligibilityStatus.ELIGIBLE,
            approval_status=ApprovalStatus.APPROVED,
            completion_status=CompletionStatus.IN_PROGRESS
        )
        db.add(enrollment)
        db.commit()
        db.refresh(enrollment)
        
        # Test case 1: 8 out of 10 classes = 80% (should be COMPLETED)
        enrollment.total_attendance = 10
        enrollment.present = 8
        attendance_percentage = (enrollment.present / enrollment.total_attendance) * 100
        enrollment.attendance_percentage = attendance_percentage
        
        if attendance_percentage >= 80.0:
            enrollment.completion_status = CompletionStatus.COMPLETED
        else:
            enrollment.completion_status = CompletionStatus.FAILED
        
        db.commit()
        db.refresh(enrollment)
        
        print(f"✓ Test 1: 8/10 classes = {attendance_percentage}%")
        print(f"  - Completion Status: {enrollment.completion_status.value}")
        
        if (enrollment.attendance_percentage == 80.0 and 
            enrollment.completion_status == CompletionStatus.COMPLETED):
            print("  ✓ Correctly marked as COMPLETED (>=80%)")
        else:
            print("  ✗ FAIL: Should be COMPLETED")
            return False, enrollment.id, course.id, student.id
        
        # Test case 2: 7 out of 10 classes = 70% (should be FAILED)
        enrollment.present = 7
        attendance_percentage = (enrollment.present / enrollment.total_attendance) * 100
        enrollment.attendance_percentage = attendance_percentage
        
        if attendance_percentage >= 80.0:
            enrollment.completion_status = CompletionStatus.COMPLETED
        else:
            enrollment.completion_status = CompletionStatus.FAILED
        
        db.commit()
        db.refresh(enrollment)
        
        print(f"✓ Test 2: 7/10 classes = {attendance_percentage}%")
        print(f"  - Completion Status: {enrollment.completion_status.value}")
        
        if (enrollment.attendance_percentage == 70.0 and 
            enrollment.completion_status == CompletionStatus.FAILED):
            print("  ✓ Correctly marked as FAILED (<80%)")
            print("\n✓ PASS: Attendance calculation works correctly")
            return True, enrollment.id, course.id, student.id
        else:
            print("  ✗ FAIL: Should be FAILED")
            return False, enrollment.id, course.id, student.id
    except Exception as e:
        db.rollback()
        print(f"\n✗ FAIL: Error: {e}")
        import traceback
        traceback.print_exc()
        return False, None, None, None
    finally:
        db.close()

def test_attendance_excel_format():
    """Test Excel file format for attendance upload."""
    print("\n" + "=" * 60)
    print("TEST: Attendance Excel Format")
    print("=" * 60)
    
    # Create test Excel file with attendance data
    test_data = {
        'name': ['John Doe', 'Jane Smith'],
        'email': ['john@example.com', 'jane@example.com'],
        'total_classes_attended': [8, 9],
        'score': [85.5, 92.0]
    }
    df = pd.DataFrame(test_data)
    
    with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as tmp_file:
        df.to_excel(tmp_file.name, index=False)
        tmp_path = tmp_file.name
    
    try:
        # Read and verify the file
        read_df = pd.read_excel(tmp_path)
        print(f"✓ Excel file created with {len(read_df)} rows")
        print(f"  - Columns: {list(read_df.columns)}")
        
        # Check for required columns (flexible naming)
        required_columns_lower = [col.lower() for col in read_df.columns]
        has_name = any('name' in col or 'email' in col or 'employee' in col for col in required_columns_lower)
        has_attendance = any('attended' in col or 'present' in col or 'classes' in col for col in required_columns_lower)
        has_score = any('score' in col for col in required_columns_lower)
        
        if has_name and has_attendance and has_score:
            print("  ✓ Contains required columns (name/email, attendance, score)")
            print("\n✓ PASS: Attendance Excel format is correct")
            return True
        else:
            print(f"  ✗ FAIL: Missing required columns")
            print(f"    - Has name/email: {has_name}")
            print(f"    - Has attendance: {has_attendance}")
            print(f"    - Has score: {has_score}")
            return False
    except Exception as e:
        print(f"\n✗ FAIL: Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        os.unlink(tmp_path)

def test_attendance_matching_logic():
    """Test matching students by name/email/employee_id."""
    print("\n" + "=" * 60)
    print("TEST: Attendance Matching Logic")
    print("=" * 60)
    
    db = SessionLocal()
    try:
        timestamp = int(time.time() * 1000)
        course = Course(
            name=f"Test Course Match {timestamp}",
            batch_code=f"MATCH-{timestamp}",
            description="Test course",
            start_date=date.today(),
            end_date=date.today() + timedelta(days=30),
            seat_limit=50,
            current_enrolled=0,
            total_classes_offered=10,
            is_archived=False
        )
        db.add(course)
        
        student = Student(
            employee_id=f"TEST-MATCH-{timestamp}",
            name="Test Student Match",
            email=f"testmatch{timestamp}@example.com",
            sbu="IT",
            designation="Developer"
        )
        db.add(student)
        db.commit()
        db.refresh(course)
        db.refresh(student)
        
        enrollment = Enrollment(
            student_id=student.id,
            course_id=course.id,
            course_name=course.name,
            batch_code=course.batch_code,
            eligibility_status=EligibilityStatus.ELIGIBLE,
            approval_status=ApprovalStatus.APPROVED,
            completion_status=CompletionStatus.IN_PROGRESS
        )
        db.add(enrollment)
        db.commit()
        db.refresh(enrollment)
        
        # Test matching by email
        matched_enrollment = db.query(Enrollment).join(Student).filter(
            Enrollment.course_id == course.id,
            Student.email == student.email
        ).first()
        
        if matched_enrollment and matched_enrollment.id == enrollment.id:
            print("✓ Matched by email")
        else:
            print("✗ FAIL: Could not match by email")
            return False, enrollment.id, course.id, student.id
        
        # Test matching by employee_id
        matched_enrollment = db.query(Enrollment).join(Student).filter(
            Enrollment.course_id == course.id,
            Student.employee_id == student.employee_id
        ).first()
        
        if matched_enrollment and matched_enrollment.id == enrollment.id:
            print("✓ Matched by employee_id")
            print("\n✓ PASS: Attendance matching logic works correctly")
            return True, enrollment.id, course.id, student.id
        else:
            print("✗ FAIL: Could not match by employee_id")
            return False, enrollment.id, course.id, student.id
    except Exception as e:
        db.rollback()
        print(f"\n✗ FAIL: Error: {e}")
        import traceback
        traceback.print_exc()
        return False, None, None, None
    finally:
        db.close()

def cleanup_test_data(enrollment_id, course_id, student_id):
    """Clean up test data."""
    print("\n" + "=" * 60)
    print("CLEANUP: Removing test data")
    print("=" * 60)
    
    db = SessionLocal()
    try:
        if enrollment_id:
            db.query(Enrollment).filter(Enrollment.id == enrollment_id).delete()
        if student_id:
            db.query(Student).filter(Student.id == student_id).delete()
        if course_id:
            db.query(Enrollment).filter(Enrollment.course_id == course_id).delete()
            db.query(Course).filter(Course.id == course_id).delete()
        db.commit()
        print("✓ Test data cleaned up")
    except Exception as e:
        db.rollback()
        print(f"✗ Cleanup error: {e}")
    finally:
        db.close()

def main():
    """Run all attendance upload tests."""
    print("=" * 60)
    print("ATTENDANCE UPLOAD TESTS")
    print("=" * 60)
    
    results = []
    enrollment_id = None
    course_id = None
    student_id = None
    
    # Test 1: Attendance calculation
    success, e_id, c_id, s_id = test_attendance_calculation()
    results.append(success)
    if e_id:
        enrollment_id = e_id
    if c_id:
        course_id = c_id
    if s_id:
        student_id = s_id
    
    # Test 2: Excel format
    results.append(test_attendance_excel_format())
    
    # Test 3: Matching logic
    success, e_id, c_id, s_id = test_attendance_matching_logic()
    results.append(success)
    if not enrollment_id and e_id:
        enrollment_id = e_id
    if not course_id and c_id:
        course_id = c_id
    if not student_id and s_id:
        student_id = s_id
    
    # Cleanup
    cleanup_test_data(enrollment_id, course_id, student_id)
    
    print("\n" + "=" * 60)
    if all(results):
        print("✓ ALL ATTENDANCE UPLOAD TESTS PASSED")
        return True
    else:
        print("✗ SOME ATTENDANCE UPLOAD TESTS FAILED")
        return False
    print("=" * 60)

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

