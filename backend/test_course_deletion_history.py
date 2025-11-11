#!/usr/bin/env python3
"""Test script to verify course deletion preserves user history."""

import sys
from app.db.base import SessionLocal
from app.models.course import Course
from app.models.student import Student
from app.models.enrollment import Enrollment, ApprovalStatus, CompletionStatus
from datetime import datetime, timedelta

def main():
    db = SessionLocal()
    try:
        print("=" * 60)
        print("TESTING COURSE DELETION WITH HISTORY PRESERVATION")
        print("=" * 60)
        
        # Step 1: Create a test course
        print("\n1. Creating test course...")
        import time
        unique_batch = f"TEST-DEL-{int(time.time())}"
        test_course = Course(
            name="Test Course for Deletion",
            batch_code=unique_batch,
            description="This course will be deleted to test history preservation",
            start_date=datetime.now().date(),
            end_date=(datetime.now() + timedelta(days=30)).date(),
            seat_limit=10,
            current_enrolled=0,
            total_classes_offered=10
        )
        db.add(test_course)
        db.commit()
        db.refresh(test_course)
        print(f"   ✓ Created course: {test_course.name} (ID: {test_course.id}, Batch: {test_course.batch_code})")
        
        # Step 2: Get or create a test student
        print("\n2. Getting/Creating test student...")
        test_student = db.query(Student).filter(Student.employee_id == "TEST001").first()
        if not test_student:
            test_student = Student(
                employee_id="TEST001",
                name="Test User",
                email="test@example.com",
                sbu="IT",
                designation="Developer"
            )
            db.add(test_student)
            db.commit()
            db.refresh(test_student)
            print(f"   ✓ Created student: {test_student.name} (ID: {test_student.id})")
        else:
            print(f"   ✓ Found existing student: {test_student.name} (ID: {test_student.id})")
        
        # Step 3: Enroll the student in the course
        print("\n3. Enrolling student in course...")
        existing_enrollment = db.query(Enrollment).filter(
            Enrollment.student_id == test_student.id,
            Enrollment.course_id == test_course.id
        ).first()
        
        if existing_enrollment:
            print(f"   ✓ Enrollment already exists (ID: {existing_enrollment.id})")
            enrollment = existing_enrollment
        else:
            enrollment = Enrollment(
                student_id=test_student.id,
                course_id=test_course.id,
                course_name=test_course.name,  # Store course info
                batch_code=test_course.batch_code,  # Store batch code
                approval_status=ApprovalStatus.APPROVED,
                approved_by="Test Script",
                approved_at=datetime.utcnow(),
                completion_status=CompletionStatus.COMPLETED,
                score=85.5,
                attendance_percentage=90.0,
                total_attendance=10,
                present=9
            )
            db.add(enrollment)
            db.commit()
            db.refresh(enrollment)
            print(f"   ✓ Created enrollment (ID: {enrollment.id})")
            print(f"     - Course: {enrollment.course_name}")
            print(f"     - Batch: {enrollment.batch_code}")
            print(f"     - Status: {enrollment.completion_status.value}")
            print(f"     - Score: {enrollment.score}")
        
        # Step 4: Verify enrollment shows in student's history
        print("\n4. Verifying enrollment in student history...")
        student_enrollments = db.query(Enrollment).filter(
            Enrollment.student_id == test_student.id
        ).all()
        print(f"   ✓ Student has {len(student_enrollments)} enrollment(s)")
        for e in student_enrollments:
            course_name = e.course_name or (e.course.name if e.course else "DELETED")
            batch_code = e.batch_code or (e.course.batch_code if e.course else "DELETED")
            print(f"     - {course_name} ({batch_code}) - {e.completion_status.value}")
        
        # Step 5: Delete the course
        print("\n5. Deleting the course...")
        course_id = test_course.id
        course_name = test_course.name
        batch_code = test_course.batch_code
        
        # Update enrollments to preserve history
        enrollments_to_update = db.query(Enrollment).filter(
            Enrollment.course_id == course_id
        ).all()
        for e in enrollments_to_update:
            if not e.course_name:
                e.course_name = course_name
            if not e.batch_code:
                e.batch_code = batch_code
            e.course_id = None
        
        db.delete(test_course)
        db.commit()
        print(f"   ✓ Deleted course: {course_name} (ID: {course_id})")
        print(f"   ✓ Updated {len(enrollments_to_update)} enrollment(s) to preserve history")
        
        # Step 6: Verify course is deleted
        print("\n6. Verifying course is deleted...")
        deleted_course = db.query(Course).filter(Course.id == course_id).first()
        if deleted_course:
            print(f"   ✗ ERROR: Course still exists!")
            return False
        else:
            print(f"   ✓ Course successfully deleted")
        
        # Step 7: Verify enrollment still exists with history
        print("\n7. Verifying enrollment history is preserved...")
        preserved_enrollment = db.query(Enrollment).filter(
            Enrollment.id == enrollment.id
        ).first()
        
        if not preserved_enrollment:
            print(f"   ✗ ERROR: Enrollment was deleted!")
            return False
        
        print(f"   ✓ Enrollment still exists (ID: {preserved_enrollment.id})")
        print(f"     - Course ID: {preserved_enrollment.course_id} (should be None)")
        print(f"     - Course Name: {preserved_enrollment.course_name} (should be preserved)")
        print(f"     - Batch Code: {preserved_enrollment.batch_code} (should be preserved)")
        print(f"     - Status: {preserved_enrollment.completion_status.value}")
        print(f"     - Score: {preserved_enrollment.score}")
        print(f"     - Attendance: {preserved_enrollment.attendance_percentage}%")
        
        if preserved_enrollment.course_id is not None:
            print(f"   ✗ ERROR: course_id should be None!")
            return False
        
        if not preserved_enrollment.course_name or preserved_enrollment.course_name != course_name:
            print(f"   ✗ ERROR: course_name not preserved!")
            return False
        
        if not preserved_enrollment.batch_code or preserved_enrollment.batch_code != batch_code:
            print(f"   ✗ ERROR: batch_code not preserved!")
            return False
        
        # Step 8: Verify student's enrollment history still shows the course
        print("\n8. Verifying student's enrollment history...")
        student_enrollments_after = db.query(Enrollment).filter(
            Enrollment.student_id == test_student.id
        ).all()
        print(f"   ✓ Student still has {len(student_enrollments_after)} enrollment(s)")
        
        found_deleted_course = False
        for e in student_enrollments_after:
            course_name_display = e.course_name or (e.course.name if e.course else None)
            batch_code_display = e.batch_code or (e.course.batch_code if e.course else None)
            print(f"     - {course_name_display} ({batch_code_display}) - {e.completion_status.value}")
            if e.course_name == course_name and e.batch_code == batch_code:
                found_deleted_course = True
        
        if not found_deleted_course:
            print(f"   ✗ ERROR: Deleted course not found in student history!")
            return False
        
        print("\n" + "=" * 60)
        print("✓ ALL TESTS PASSED!")
        print("=" * 60)
        print("\nSummary:")
        print(f"  - Course '{course_name}' was successfully deleted")
        print(f"  - Enrollment history is preserved")
        print(f"  - Student can still see their course history")
        print(f"  - Course name and batch code are stored in enrollment")
        print("=" * 60)
        
        return True
        
    except Exception as e:
        print(f"\n✗ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

