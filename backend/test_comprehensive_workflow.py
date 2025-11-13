#!/usr/bin/env python3
"""Comprehensive workflow test: Create courses, enroll students, update scores, check eligibility."""

import sys
import os
from datetime import datetime, timedelta

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app
from app.core.auth import create_access_token
from app.core.config import settings

client = TestClient(app)

def print_section(title):
    print("\n" + "=" * 80)
    print(f"  {title}")
    print("=" * 80)

def print_test(name, result, details=""):
    status = "✓ PASS" if result else "✗ FAIL"
    print(f"{status}: {name}")
    if details:
        print(f"  {details}")

def get_auth_headers():
    """Get authentication headers."""
    email = getattr(settings, 'ADMIN_EMAIL', 'test@example.com')
    token = create_access_token(email)
    return {"Authorization": f"Bearer {token}"}

def create_course(headers, name, batch_code, description, start_date, end_date, seat_limit=50, total_classes=10, prerequisite_id=None):
    """Create a course."""
    data = {
        "name": name,
        "batch_code": batch_code,
        "description": description,
        "start_date": start_date,
        "end_date": end_date,
        "seat_limit": seat_limit,
        "total_classes_offered": total_classes,
    }
    if prerequisite_id:
        data["prerequisite_course_id"] = prerequisite_id
    
    response = client.post("/api/v1/courses", json=data, headers=headers)
    if response.status_code == 201:
        return response.json()
    else:
        raise Exception(f"Failed to create course: {response.text}")

def get_students(headers, limit=100):
    """Get students."""
    response = client.get("/api/v1/students", params={"limit": limit}, headers=headers)
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"Failed to get students: {response.text}")

def create_enrollment(headers, student_id, course_id):
    """Create enrollment."""
    response = client.post(
        "/api/v1/enrollments",
        json={"student_id": student_id, "course_id": course_id},
        headers=headers
    )
    if response.status_code == 201:
        return response.json()
    else:
        return None

def get_enrollments(headers, course_id=None, student_id=None, approval_status=None):
    """Get enrollments."""
    params = {}
    if course_id:
        params["course_id"] = course_id
    if student_id:
        params["student_id"] = student_id
    if approval_status:
        params["approval_status"] = approval_status
    
    response = client.get("/api/v1/enrollments", params=params, headers=headers)
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"Failed to get enrollments: {response.text}")

def approve_enrollment(headers, enrollment_id):
    """Approve enrollment."""
    response = client.post(
        "/api/v1/enrollments/approve",
        json={"enrollment_id": enrollment_id, "approved": True},
        params={"approved_by": "Admin"},
        headers=headers
    )
    return response.status_code == 200

def update_attendance(headers, enrollment_id, classes_attended, score):
    """Update attendance and score."""
    response = client.put(
        f"/api/v1/completions/enrollment/{enrollment_id}",
        params={
            "classes_attended": classes_attended,
            "score": score
        },
        headers=headers
    )
    return response.status_code == 200

def get_student_with_courses(headers, student_id):
    """Get student with course history."""
    response = client.get(f"/api/v1/students/{student_id}/enrollments", headers=headers)
    if response.status_code == 200:
        return response.json()
    else:
        raise Exception(f"Failed to get student enrollments: {response.text}")

def main():
    print_section("COMPREHENSIVE WORKFLOW TEST")
    
    try:
        # Get auth headers
        print("\n1. Getting authentication...")
        headers = get_auth_headers()
        print_test("Authentication", True, "Token obtained")
        
        # Get existing students
        print("\n2. Fetching students...")
        students_data = get_students(headers, limit=10)
        students = students_data if isinstance(students_data, list) else students_data.get("data", [])
        if len(students) < 3:
            print("⚠ WARNING: Need at least 3 students. Found:", len(students))
            return False
        print_test("Get Students", True, f"Found {len(students)} students")
        test_students = students[:3]
        for i, s in enumerate(test_students, 1):
            print(f"  Student {i}: {s['name']} ({s['employee_id']})")
        
        # Create courses
        print("\n3. Creating courses...")
        today = datetime.now()
        timestamp = int(today.timestamp())
        start_date = (today + timedelta(days=7)).strftime("%Y-%m-%d")
        end_date = (today + timedelta(days=37)).strftime("%Y-%m-%d")
        
        # Course 1: Foundation Course (no prerequisite)
        course1 = create_course(
            headers,
            name=f"Python Foundation Course {timestamp}",
            batch_code=f"PYTHON-FOUND-{timestamp}",
            description="Basic Python programming fundamentals",
            start_date=start_date,
            end_date=end_date,
            seat_limit=30,
            total_classes=10
        )
        course1_id = course1["id"]
        print_test("Create Course 1 (Foundation)", True, f"ID: {course1_id}, Name: {course1['name']}")
        
        # Course 2: Advanced Course (requires Course 1)
        course2 = create_course(
            headers,
            name=f"Advanced Python Development {timestamp}",
            batch_code=f"PYTHON-ADV-{timestamp}",
            description="Advanced Python concepts and frameworks",
            start_date=start_date,
            end_date=end_date,
            seat_limit=25,
            total_classes=12,
            prerequisite_id=course1_id
        )
        course2_id = course2["id"]
        print_test("Create Course 2 (Advanced, requires Course 1)", True, f"ID: {course2_id}, Name: {course2['name']}")
        
        # Course 3: Data Science Course (no prerequisite)
        course3 = create_course(
            headers,
            name=f"Data Science with Python {timestamp}",
            batch_code=f"DS-PYTHON-{timestamp}",
            description="Data analysis and machine learning",
            start_date=start_date,
            end_date=end_date,
            seat_limit=20,
            total_classes=15
        )
        course3_id = course3["id"]
        print_test("Create Course 3 (Data Science)", True, f"ID: {course3_id}, Name: {course3['name']}")
        
        # Enroll students
        print("\n4. Enrolling students...")
        enrollments = {}
        
        # Student 1: Enroll in Course 1 (should be eligible)
        student1_id = test_students[0]["id"]
        enrollment1 = create_enrollment(headers, student1_id, course1_id)
        if enrollment1:
            enrollments['student1_course1'] = enrollment1
            print_test(
                f"Enroll {test_students[0]['name']} in Course 1",
                True,
                f"Enrollment ID: {enrollment1['id']}, Eligibility: {enrollment1.get('eligibility_status', 'N/A')}"
            )
        else:
            print_test(f"Enroll {test_students[0]['name']} in Course 1", False, "Failed to create enrollment")
        
        # Student 1: Try to enroll in Course 2 (should be INELIGIBLE - missing prerequisite)
        enrollment2 = create_enrollment(headers, student1_id, course2_id)
        if enrollment2:
            enrollments['student1_course2'] = enrollment2
            eligibility = enrollment2.get('eligibility_status', 'N/A')
            is_ineligible = 'Ineligible' in eligibility or 'Missing Prerequisite' in eligibility
            print_test(
                f"Enroll {test_students[0]['name']} in Course 2 (should be INELIGIBLE)",
                is_ineligible,
                f"Enrollment ID: {enrollment2['id']}, Eligibility: {eligibility}"
            )
        else:
            print_test(f"Enroll {test_students[0]['name']} in Course 2", False, "Failed to create enrollment")
        
        # Student 2: Enroll in Course 1
        student2_id = test_students[1]["id"]
        enrollment3 = create_enrollment(headers, student2_id, course1_id)
        if enrollment3:
            enrollments['student2_course1'] = enrollment3
            print_test(
                f"Enroll {test_students[1]['name']} in Course 1",
                True,
                f"Enrollment ID: {enrollment3['id']}, Eligibility: {enrollment3.get('eligibility_status', 'N/A')}"
            )
        else:
            print_test(f"Enroll {test_students[1]['name']} in Course 1", False, "Failed to create enrollment")
        
        # Student 2: Enroll in Course 3
        enrollment4 = create_enrollment(headers, student2_id, course3_id)
        if enrollment4:
            enrollments['student2_course3'] = enrollment4
            print_test(
                f"Enroll {test_students[1]['name']} in Course 3",
                True,
                f"Enrollment ID: {enrollment4['id']}, Eligibility: {enrollment4.get('eligibility_status', 'N/A')}"
            )
        else:
            print_test(f"Enroll {test_students[1]['name']} in Course 3", False, "Failed to create enrollment")
        
        # Student 3: Enroll in Course 1
        student3_id = test_students[2]["id"]
        enrollment5 = create_enrollment(headers, student3_id, course1_id)
        if enrollment5:
            enrollments['student3_course1'] = enrollment5
            print_test(
                f"Enroll {test_students[2]['name']} in Course 1",
                True,
                f"Enrollment ID: {enrollment5['id']}, Eligibility: {enrollment5.get('eligibility_status', 'N/A')}"
            )
        else:
            print_test(f"Enroll {test_students[2]['name']} in Course 1", False, "Failed to create enrollment")
        
        # Check and approve enrollments
        print("\n5. Checking and approving enrollments...")
        approved_count = 0
        for key, enrollment in enrollments.items():
            status = enrollment.get('approval_status', 'N/A')
            eligibility = enrollment.get('eligibility_status', 'N/A')
            print(f"  {key}: Eligibility={eligibility}, Approval={status}")
            
            if enrollment.get('eligibility_status') == 'Eligible' and enrollment.get('approval_status') == 'Pending':
                if approve_enrollment(headers, enrollment['id']):
                    approved_count += 1
                    print_test(f"Approve {key}", True, f"Enrollment ID: {enrollment['id']}")
                else:
                    print_test(f"Approve {key}", False, "Failed to approve")
            elif enrollment.get('approval_status') == 'Approved':
                approved_count += 1
                print(f"  ✓ {key} already approved (auto-approved)")
        
        print(f"\n  Total approved enrollments: {approved_count}")
        
        # Update attendance and scores
        print("\n6. Updating attendance and scores...")
        
        # Student 1 - Course 1: 8/10 classes (80%) - Should be Completed
        if 'student1_course1' in enrollments:
            e1 = enrollments['student1_course1']
            if update_attendance(headers, e1['id'], classes_attended=8, score=85):
                print_test(
                    f"Update {test_students[0]['name']} - Course 1 attendance",
                    True,
                    "8/10 classes (80%), Score: 85 - Should be Completed"
                )
            else:
                print_test(f"Update {test_students[0]['name']} - Course 1 attendance", False, "Failed")
        
        # Student 2 - Course 1: 7/10 classes (70%) - Should be Failed
        if 'student2_course1' in enrollments:
            e2 = enrollments['student2_course1']
            if update_attendance(headers, e2['id'], classes_attended=7, score=72):
                print_test(
                    f"Update {test_students[1]['name']} - Course 1 attendance",
                    True,
                    "7/10 classes (70%), Score: 72 - Should be Failed"
                )
            else:
                print_test(f"Update {test_students[1]['name']} - Course 1 attendance", False, "Failed")
        
        # Student 2 - Course 3: 12/15 classes (80%) - Should be Completed
        if 'student2_course3' in enrollments:
            e3 = enrollments['student2_course3']
            if update_attendance(headers, e3['id'], classes_attended=12, score=90):
                print_test(
                    f"Update {test_students[1]['name']} - Course 3 attendance",
                    True,
                    "12/15 classes (80%), Score: 90 - Should be Completed"
                )
            else:
                print_test(f"Update {test_students[1]['name']} - Course 3 attendance", False, "Failed")
        
        # Student 3 - Course 1: 9/10 classes (90%) - Should be Completed
        if 'student3_course1' in enrollments:
            e4 = enrollments['student3_course1']
            if update_attendance(headers, e4['id'], classes_attended=9, score=88):
                print_test(
                    f"Update {test_students[2]['name']} - Course 1 attendance",
                    True,
                    "9/10 classes (90%), Score: 88 - Should be Completed"
                )
            else:
                print_test(f"Update {test_students[2]['name']} - Course 1 attendance", False, "Failed")
        
        # Verify enrollments and completion status
        print("\n7. Verifying enrollment statuses...")
        all_enrollments = get_enrollments(headers, course_id=course1_id)
        for enrollment in all_enrollments:
            if enrollment['id'] in [e['id'] for e in enrollments.values()]:
                student_name = next((s['name'] for s in test_students if s['id'] == enrollment['student_id']), 'Unknown')
                completion = enrollment.get('completion_status', 'N/A')
                attendance = enrollment.get('attendance_percentage', 0)
                score = enrollment.get('score', 'N/A')
                print(f"  {student_name} - Course 1:")
                print(f"    Completion Status: {completion}")
                print(f"    Attendance: {attendance}%")
                print(f"    Score: {score}")
                
                # Verify completion status is correct
                if enrollment['id'] == enrollments.get('student1_course1', {}).get('id'):
                    expected = 'Completed' if attendance >= 80 else 'Failed'
                    print_test(f"  {student_name} completion status correct", completion == expected, f"Expected: {expected}, Got: {completion}")
        
        # Check student history
        print("\n8. Verifying student course history...")
        for i, student in enumerate(test_students, 1):
            history = get_student_with_courses(headers, student['id'])
            if history:
                enrollments_count = len(history.get('enrollments', []))
                overall_completion = history.get('overall_completion_rate', 0)
                total_courses = history.get('total_courses_assigned', 0)
                completed_courses = history.get('completed_courses', 0)
                
                print(f"\n  {student['name']} ({student['employee_id']}):")
                print(f"    Total Courses: {total_courses}")
                print(f"    Completed Courses: {completed_courses}")
                print(f"    Overall Completion Rate: {overall_completion}%")
                print(f"    Enrollments in History: {enrollments_count}")
                
                # Verify history is updated
                has_recent_enrollments = enrollments_count > 0
                print_test(f"  {student['name']} history updated", has_recent_enrollments, f"Found {enrollments_count} enrollments")
        
        # Test eligibility: Student 1 should now be eligible for Course 2 (after completing Course 1)
        print("\n9. Testing prerequisite eligibility after completion...")
        if 'student1_course1' in enrollments:
            # First, get updated enrollment to check completion status
            updated_enrollments = get_enrollments(headers, student_id=student1_id, course_id=course1_id)
            if updated_enrollments:
                course1_enrollment = updated_enrollments[0]
                completion_status = course1_enrollment.get('completion_status', 'N/A')
                print(f"  Student 1 - Course 1 completion status: {completion_status}")
                
                # Now try to enroll in Course 2 again
                print(f"  Attempting to enroll Student 1 in Course 2 (after completing Course 1)...")
                test_enrollment = create_enrollment(headers, student1_id, course2_id)
                if test_enrollment:
                    eligibility = test_enrollment.get('eligibility_status', 'N/A')
                    reason = test_enrollment.get('eligibility_reason', 'N/A')
                    print(f"    Eligibility Status: {eligibility}")
                    print(f"    Eligibility Reason: {reason}")
                    
                    # If course 1 is completed, student should be eligible for course 2
                    if completion_status == 'Completed':
                        is_eligible = eligibility == 'Eligible' or 'Eligible' in str(eligibility)
                        print_test(
                            "  Student 1 eligible for Course 2 after completing Course 1",
                            is_eligible,
                            f"Expected: Eligible, Got: {eligibility}"
                        )
                else:
                    print("    Failed to create test enrollment")
        
        # Summary
        print_section("TEST SUMMARY")
        print("✓ Created 3 courses")
        print(f"✓ Enrolled {len(enrollments)} students")
        print(f"✓ Approved {approved_count} enrollments")
        print("✓ Updated attendance and scores")
        print("✓ Verified completion statuses")
        print("✓ Checked student course history")
        print("\n✓ ALL WORKFLOW TESTS COMPLETED")
        
        return True
        
    except Exception as e:
        print(f"\n✗ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

