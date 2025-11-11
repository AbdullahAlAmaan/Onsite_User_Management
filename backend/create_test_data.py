#!/usr/bin/env python3
"""
Script to create test data for completion rate testing.
Creates 4 courses and assigns students with different completion rates.
"""
import sys
import os
from datetime import date, datetime, timedelta

# Add the backend directory to the path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.base import SessionLocal
from app.models.course import Course
from app.models.student import Student
from app.models.enrollment import Enrollment, ApprovalStatus, CompletionStatus, EligibilityStatus
from app.services.eligibility_service import EligibilityService

def create_test_data():
    db = SessionLocal()
    try:
        # Create 4 test courses
        courses = []
        for i in range(1, 5):
            course = Course(
                name=f"Test Course {i}",
                batch_code=f"TEST{i:03d}",
                description=f"Test course {i} for completion rate testing",
                start_date=date.today() - timedelta(days=30),
                end_date=date.today() + timedelta(days=30),
                seat_limit=50,
                current_enrolled=0,
                total_classes_offered=10,
                is_archived=False
            )
            db.add(course)
            courses.append(course)
        
        db.commit()
        for course in courses:
            db.refresh(course)
        
        print(f"Created {len(courses)} courses")
        
        # Find or create test students
        student1 = db.query(Student).filter(Student.employee_id == "TEST001").first()
        if not student1:
            student1 = Student(
                employee_id="TEST001",
                name="Test Student 1",
                email="test1@example.com",
                sbu="IT",
                designation="Developer"
            )
            db.add(student1)
            db.commit()
            db.refresh(student1)
        
        student2 = db.query(Student).filter(Student.employee_id == "TEST002").first()
        if not student2:
            student2 = Student(
                employee_id="TEST002",
                name="Test Student 2",
                email="test2@example.com",
                sbu="IT",
                designation="Developer"
            )
            db.add(student2)
            db.commit()
            db.refresh(student2)
        
        print(f"Found/created test students: {student1.name}, {student2.name}")
        
        # Student 1: Assign to all 4 courses, complete 3, fail 1 (75% completion)
        for i, course in enumerate(courses):
            enrollment = db.query(Enrollment).filter(
                Enrollment.student_id == student1.id,
                Enrollment.course_id == course.id
            ).first()
            
            if not enrollment:
                enrollment = Enrollment(
                    student_id=student1.id,
                    course_id=course.id,
                    eligibility_status=EligibilityStatus.ELIGIBLE,
                    approval_status=ApprovalStatus.APPROVED,
                    approved_by="Test Script",
                    approved_at=datetime.utcnow(),
                    completion_status=CompletionStatus.COMPLETED if i < 3 else CompletionStatus.FAILED,
                    score=85.0 if i < 3 else 50.0,
                    attendance_percentage=85.0 if i < 3 else 60.0,
                    total_attendance=10,
                    present=9 if i < 3 else 6,
                    attendance_status="Pass" if i < 3 else "Fail",
                    completion_date=datetime.utcnow() if i < 3 else None
                )
                db.add(enrollment)
                course.current_enrolled += 1
            else:
                # Update existing enrollment
                enrollment.completion_status = CompletionStatus.COMPLETED if i < 3 else CompletionStatus.FAILED
                enrollment.score = 85.0 if i < 3 else 50.0
                enrollment.attendance_percentage = 85.0 if i < 3 else 60.0
                enrollment.total_attendance = 10
                enrollment.present = 9 if i < 3 else 6
                enrollment.attendance_status = "Pass" if i < 3 else "Fail"
                enrollment.completion_date = datetime.utcnow() if i < 3 else None
        
        # Student 2: Assign to all 4 courses, complete 1, fail 3 (25% completion)
        for i, course in enumerate(courses):
            enrollment = db.query(Enrollment).filter(
                Enrollment.student_id == student2.id,
                Enrollment.course_id == course.id
            ).first()
            
            if not enrollment:
                enrollment = Enrollment(
                    student_id=student2.id,
                    course_id=course.id,
                    eligibility_status=EligibilityStatus.ELIGIBLE,
                    approval_status=ApprovalStatus.APPROVED,
                    approved_by="Test Script",
                    approved_at=datetime.utcnow(),
                    completion_status=CompletionStatus.COMPLETED if i == 0 else CompletionStatus.FAILED,
                    score=90.0 if i == 0 else 40.0,
                    attendance_percentage=90.0 if i == 0 else 50.0,
                    total_attendance=10,
                    present=9 if i == 0 else 5,
                    attendance_status="Pass" if i == 0 else "Fail",
                    completion_date=datetime.utcnow() if i == 0 else None
                )
                db.add(enrollment)
                course.current_enrolled += 1
            else:
                # Update existing enrollment
                enrollment.completion_status = CompletionStatus.COMPLETED if i == 0 else CompletionStatus.FAILED
                enrollment.score = 90.0 if i == 0 else 40.0
                enrollment.attendance_percentage = 90.0 if i == 0 else 50.0
                enrollment.total_attendance = 10
                enrollment.present = 9 if i == 0 else 5
                enrollment.attendance_status = "Pass" if i == 0 else "Fail"
                enrollment.completion_date = datetime.utcnow() if i == 0 else None
        
        db.commit()
        
        print("\n✅ Test data created successfully!")
        print(f"\nStudent 1 ({student1.name}):")
        print(f"  - Assigned to {len(courses)} courses")
        print(f"  - Completed: 3, Failed: 1")
        print(f"  - Overall completion rate: 75% (should be GREEN)")
        
        print(f"\nStudent 2 ({student2.name}):")
        print(f"  - Assigned to {len(courses)} courses")
        print(f"  - Completed: 1, Failed: 3")
        print(f"  - Overall completion rate: 25% (should be RED)")
        
    except Exception as e:
        db.rollback()
        print(f"❌ Error creating test data: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    create_test_data()

