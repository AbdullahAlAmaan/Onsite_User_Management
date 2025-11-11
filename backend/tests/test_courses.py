#!/usr/bin/env python3
"""Test course management features."""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.base import SessionLocal
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.student import Student
from datetime import datetime, timedelta, timezone
from sqlalchemy import func

def test_create_course():
    """Test creating a new course."""
    print("\n" + "=" * 60)
    print("TEST: Create Course")
    print("=" * 60)
    
    db = SessionLocal()
    try:
        # Create test course
        from datetime import date
        test_course = Course(
            name="Test Course - Course Management",
            batch_code=f"TEST-CM-{int(datetime.now().timestamp())}",
            description="Test course for course management tests",
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
        
        print(f"✓ Course created: {test_course.name} (ID: {test_course.id})")
        print(f"  - Batch Code: {test_course.batch_code}")
        print(f"  - Total Classes: {test_course.total_classes_offered}")
        print(f"  - Seat Limit: {test_course.seat_limit}")
        
        # Verify course exists
        found_course = db.query(Course).filter(Course.id == test_course.id).first()
        if found_course and found_course.name == test_course.name:
            print("\n✓ PASS: Course creation works correctly")
            return True, test_course.id
        else:
            print("\n✗ FAIL: Course not found after creation")
            return False, None
    except Exception as e:
        db.rollback()
        print(f"\n✗ FAIL: Error creating course: {e}")
        import traceback
        traceback.print_exc()
        return False, None
    finally:
        db.close()

def test_update_course(course_id):
    """Test updating a course."""
    print("\n" + "=" * 60)
    print("TEST: Update Course")
    print("=" * 60)
    
    if not course_id:
        print("✗ SKIP: No course ID provided")
        return False
    
    db = SessionLocal()
    try:
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            print("✗ FAIL: Course not found")
            return False
        
        original_name = course.name
        new_name = f"Updated {original_name}"
        course.name = new_name
        course.description = "Updated description"
        course.total_classes_offered = 15
        db.commit()
        db.refresh(course)
        
        print(f"✓ Course updated: {course.name}")
        print(f"  - Description: {course.description}")
        print(f"  - Total Classes: {course.total_classes_offered}")
        
        if course.name == new_name and course.total_classes_offered == 15:
            print("\n✓ PASS: Course update works correctly")
            return True
        else:
            print("\n✗ FAIL: Course update failed")
            return False
    except Exception as e:
        db.rollback()
        print(f"\n✗ FAIL: Error updating course: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

def test_archive_course(course_id):
    """Test archiving a course."""
    print("\n" + "=" * 60)
    print("TEST: Archive Course")
    print("=" * 60)
    
    if not course_id:
        print("✗ SKIP: No course ID provided")
        return False
    
    db = SessionLocal()
    try:
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            print("✗ FAIL: Course not found")
            return False
        
        course.is_archived = True
        db.commit()
        db.refresh(course)
        
        print(f"✓ Course archived: {course.name}")
        print(f"  - Is Archived: {course.is_archived}")
        
        if course.is_archived:
            print("\n✓ PASS: Course archiving works correctly")
            return True
        else:
            print("\n✗ FAIL: Course archiving failed")
            return False
    except Exception as e:
        db.rollback()
        print(f"\n✗ FAIL: Error archiving course: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

def test_delete_course_preserves_enrollments(course_id):
    """Test that deleting a course preserves enrollment history."""
    print("\n" + "=" * 60)
    print("TEST: Delete Course Preserves Enrollments")
    print("=" * 60)
    
    if not course_id:
        print("✗ SKIP: No course ID provided")
        return False
    
    db = SessionLocal()
    try:
        # First, create a student and enrollment for this course
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            print("✗ FAIL: Course not found")
            return False
        
        # Create or get test student
        student = db.query(Student).filter(Student.employee_id == "TEST-CM-001").first()
        if not student:
            student = Student(
                employee_id="TEST-CM-001",
                name="Test Student CM",
                email="testcm@example.com",
                sbu="IT",
                designation="Developer"
            )
            db.add(student)
            db.commit()
            db.refresh(student)
        
        # Create enrollment
        enrollment = Enrollment(
            student_id=student.id,
            course_id=course.id,
            course_name=course.name,
            batch_code=course.batch_code,
            eligibility_status="ELIGIBLE",
            approval_status="APPROVED",
            completion_status="IN_PROGRESS"
        )
        db.add(enrollment)
        db.commit()
        db.refresh(enrollment)
        
        enrollment_id = enrollment.id
        course_name = course.name
        batch_code = course.batch_code
        
        print(f"✓ Created enrollment: {enrollment_id}")
        print(f"  - Course Name: {course_name}")
        print(f"  - Batch Code: {batch_code}")
        
        # Delete the course
        db.delete(course)
        db.commit()
        
        # Verify course is deleted
        deleted_course = db.query(Course).filter(Course.id == course_id).first()
        if deleted_course:
            print("✗ FAIL: Course still exists after deletion")
            return False
        
        # Verify enrollment still exists with preserved data
        preserved_enrollment = db.query(Enrollment).filter(Enrollment.id == enrollment_id).first()
        if not preserved_enrollment:
            print("✗ FAIL: Enrollment was deleted with course")
            return False
        
        print(f"✓ Enrollment preserved: {preserved_enrollment.id}")
        print(f"  - Course ID: {preserved_enrollment.course_id} (should be None)")
        print(f"  - Course Name: {preserved_enrollment.course_name}")
        print(f"  - Batch Code: {preserved_enrollment.batch_code}")
        
        if (preserved_enrollment.course_id is None and 
            preserved_enrollment.course_name == course_name and
            preserved_enrollment.batch_code == batch_code):
            print("\n✓ PASS: Course deletion preserves enrollment history")
            return True
        else:
            print("\n✗ FAIL: Enrollment history not preserved correctly")
            return False
    except Exception as e:
        db.rollback()
        print(f"\n✗ FAIL: Error in delete test: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        db.close()

def cleanup_test_data():
    """Clean up test data."""
    print("\n" + "=" * 60)
    print("CLEANUP: Removing test data")
    print("=" * 60)
    
    db = SessionLocal()
    try:
        # Delete test enrollments
        db.query(Enrollment).filter(Enrollment.batch_code.like("TEST-CM-%")).delete()
        # Delete test students
        db.query(Student).filter(Student.employee_id == "TEST-CM-001").delete()
        # Delete test courses
        db.query(Course).filter(Course.batch_code.like("TEST-CM-%")).delete()
        db.commit()
        print("✓ Test data cleaned up")
    except Exception as e:
        db.rollback()
        print(f"✗ Cleanup error: {e}")
    finally:
        db.close()

def main():
    """Run all course management tests."""
    print("=" * 60)
    print("COURSE MANAGEMENT TESTS")
    print("=" * 60)
    
    results = []
    course_id = None
    
    # Test 1: Create course
    success, course_id = test_create_course()
    results.append(success)
    
    if course_id:
        # Test 2: Update course
        results.append(test_update_course(course_id))
        
        # Test 3: Archive course
        results.append(test_archive_course(course_id))
        
        # Test 4: Delete course preserves enrollments
        results.append(test_delete_course_preserves_enrollments(course_id))
    
    # Cleanup
    cleanup_test_data()
    
    print("\n" + "=" * 60)
    if all(results):
        print("✓ ALL COURSE MANAGEMENT TESTS PASSED")
        return True
    else:
        print("✗ SOME COURSE MANAGEMENT TESTS FAILED")
        return False
    print("=" * 60)

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

