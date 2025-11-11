#!/usr/bin/env python3
"""Test enrollment API endpoints (approve, withdraw, reapprove, etc.)."""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from app.main import app
from app.db.base import SessionLocal
from app.models.course import Course
from app.models.student import Student
from app.models.enrollment import Enrollment, ApprovalStatus, CompletionStatus, EligibilityStatus
from app.core.auth import create_access_token
from app.core.config import settings
from datetime import date, timedelta
import time

client = TestClient(app)

def get_auth_headers():
    """Get authentication headers for API requests."""
    email = getattr(settings, 'ADMIN_EMAIL', 'test@example.com')
    token = create_access_token(email)
    return {"Authorization": f"Bearer {token}"}

def test_approve_enrollment_endpoint():
    """Test approve enrollment endpoint."""
    print("\n" + "=" * 60)
    print("TEST: Approve Enrollment Endpoint")
    print("=" * 60)
    
    db = SessionLocal()
    headers = get_auth_headers()
    
    try:
        # Create test data
        timestamp = int(time.time() * 1000)
        course = Course(
            name=f"Test Course Approve {timestamp}",
            batch_code=f"APPROVE-{timestamp}",
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
            employee_id=f"TEST-APPROVE-{timestamp}",
            name="Test Student Approve",
            email=f"testapprove{timestamp}@example.com",
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
            approval_status=ApprovalStatus.PENDING,
            completion_status=CompletionStatus.NOT_STARTED
        )
        db.add(enrollment)
        db.commit()
        db.refresh(enrollment)
        
        # Test approve
        response = client.post(
            "/api/v1/enrollments/approve",
            json={
                "enrollment_id": enrollment.id,
                "approved": True
            },
            headers=headers,
            params={"approved_by": "test_admin"}
        )
        
        print(f"✓ Response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Enrollment approved: {data.get('approval_status')}")
            if data.get('approval_status') == "Approved":
                print("\n✓ PASS: Approve enrollment endpoint works correctly")
                return True, enrollment.id, course.id, student.id
            else:
                print(f"\n✗ FAIL: Expected Approved, got {data.get('approval_status')}")
                return False, enrollment.id, course.id, student.id
        else:
            print(f"✗ FAIL: Request failed with status {response.status_code}: {response.text}")
            return False, enrollment.id, course.id, student.id
    except Exception as e:
        db.rollback()
        print(f"✗ FAIL: Error: {e}")
        import traceback
        traceback.print_exc()
        return False, None, None, None
    finally:
        db.close()

def test_reject_enrollment_endpoint():
    """Test reject enrollment endpoint."""
    print("\n" + "=" * 60)
    print("TEST: Reject Enrollment Endpoint")
    print("=" * 60)
    
    db = SessionLocal()
    headers = get_auth_headers()
    
    try:
        # Create test data
        timestamp = int(time.time() * 1000)
        course = Course(
            name=f"Test Course Reject {timestamp}",
            batch_code=f"REJECT-{timestamp}",
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
            employee_id=f"TEST-REJECT-{timestamp}",
            name="Test Student Reject",
            email=f"testreject{timestamp}@example.com",
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
            approval_status=ApprovalStatus.PENDING,
            completion_status=CompletionStatus.NOT_STARTED
        )
        db.add(enrollment)
        db.commit()
        db.refresh(enrollment)
        
        # Test reject
        response = client.post(
            "/api/v1/enrollments/approve",
            json={
                "enrollment_id": enrollment.id,
                "approved": False,
                "rejection_reason": "Test rejection"
            },
            headers=headers,
            params={"approved_by": "test_admin"}
        )
        
        print(f"✓ Response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Enrollment rejected: {data.get('approval_status')}")
            if data.get('approval_status') == "Rejected":
                print("\n✓ PASS: Reject enrollment endpoint works correctly")
                return True, enrollment.id, course.id, student.id
            else:
                print(f"\n✗ FAIL: Expected Rejected, got {data.get('approval_status')}")
                return False, enrollment.id, course.id, student.id
        else:
            print(f"✗ FAIL: Request failed with status {response.status_code}: {response.text}")
            return False, enrollment.id, course.id, student.id
    except Exception as e:
        db.rollback()
        print(f"✗ FAIL: Error: {e}")
        import traceback
        traceback.print_exc()
        return False, None, None, None
    finally:
        db.close()

def test_withdraw_enrollment_endpoint():
    """Test withdraw enrollment endpoint."""
    print("\n" + "=" * 60)
    print("TEST: Withdraw Enrollment Endpoint")
    print("=" * 60)
    
    db = SessionLocal()
    headers = get_auth_headers()
    
    try:
        # Create test data
        timestamp = int(time.time() * 1000)
        course = Course(
            name=f"Test Course Withdraw {timestamp}",
            batch_code=f"WITHDRAW-{timestamp}",
            description="Test course",
            start_date=date.today(),
            end_date=date.today() + timedelta(days=30),
            seat_limit=50,
            current_enrolled=1,
            total_classes_offered=10,
            is_archived=False
        )
        db.add(course)
        
        student = Student(
            employee_id=f"TEST-WITHDRAW-{timestamp}",
            name="Test Student Withdraw",
            email=f"testwithdraw{timestamp}@example.com",
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
        
        # Test withdraw
        response = client.post(
            f"/api/v1/enrollments/{enrollment.id}/withdraw",
            headers=headers,
            params={
                "withdrawal_reason": "Test withdrawal",
                "withdrawn_by": "test_admin"
            }
        )
        
        print(f"✓ Response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Enrollment withdrawn: {data.get('approval_status')}")
            if data.get('approval_status') == "Withdrawn":
                print("\n✓ PASS: Withdraw enrollment endpoint works correctly")
                return True, enrollment.id, course.id, student.id
            else:
                print(f"\n✗ FAIL: Expected Withdrawn, got {data.get('approval_status')}")
                return False, enrollment.id, course.id, student.id
        else:
            print(f"✗ FAIL: Request failed with status {response.status_code}: {response.text}")
            return False, enrollment.id, course.id, student.id
    except Exception as e:
        db.rollback()
        print(f"✗ FAIL: Error: {e}")
        import traceback
        traceback.print_exc()
        return False, None, None, None
    finally:
        db.close()

def test_reapprove_enrollment_endpoint():
    """Test reapprove enrollment endpoint."""
    print("\n" + "=" * 60)
    print("TEST: Reapprove Enrollment Endpoint")
    print("=" * 60)
    
    db = SessionLocal()
    headers = get_auth_headers()
    
    try:
        # Create test data
        timestamp = int(time.time() * 1000)
        course = Course(
            name=f"Test Course Reapprove {timestamp}",
            batch_code=f"REAPPROVE-{timestamp}",
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
            employee_id=f"TEST-REAPPROVE-{timestamp}",
            name="Test Student Reapprove",
            email=f"testreapprove{timestamp}@example.com",
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
            approval_status=ApprovalStatus.WITHDRAWN,
            completion_status=CompletionStatus.NOT_STARTED
        )
        db.add(enrollment)
        db.commit()
        db.refresh(enrollment)
        
        # Test reapprove
        response = client.post(
            f"/api/v1/enrollments/{enrollment.id}/reapprove",
            headers=headers,
            params={"approved_by": "test_admin"}
        )
        
        print(f"✓ Response status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"✓ Enrollment reapproved: {data.get('approval_status')}")
            if data.get('approval_status') == "Approved":
                print("\n✓ PASS: Reapprove enrollment endpoint works correctly")
                return True, enrollment.id, course.id, student.id
            else:
                print(f"\n✗ FAIL: Expected Approved, got {data.get('approval_status')}")
                return False, enrollment.id, course.id, student.id
        else:
            print(f"✗ FAIL: Request failed with status {response.status_code}: {response.text}")
            return False, enrollment.id, course.id, student.id
    except Exception as e:
        db.rollback()
        print(f"✗ FAIL: Error: {e}")
        import traceback
        traceback.print_exc()
        return False, None, None, None
    finally:
        db.close()

def test_get_eligible_enrollments_endpoint():
    """Test get eligible enrollments endpoint."""
    print("\n" + "=" * 60)
    print("TEST: Get Eligible Enrollments Endpoint")
    print("=" * 60)
    
    headers = get_auth_headers()
    response = client.get("/api/v1/enrollments/eligible", headers=headers)
    
    print(f"✓ Response status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Retrieved {len(data)} eligible enrollments")
        if isinstance(data, list):
            print("\n✓ PASS: Get eligible enrollments endpoint works correctly")
            return True
        else:
            print("\n✗ FAIL: Response is not a list")
            return False
    else:
        print(f"✗ FAIL: Request failed with status {response.status_code}: {response.text}")
        return False

def cleanup_test_data(enrollment_ids, course_ids, student_ids):
    """Clean up test data."""
    print("\n" + "=" * 60)
    print("CLEANUP: Removing test data")
    print("=" * 60)
    
    db = SessionLocal()
    try:
        if enrollment_ids:
            for enrollment_id in enrollment_ids:
                if enrollment_id:
                    db.query(Enrollment).filter(Enrollment.id == enrollment_id).delete()
        if student_ids:
            for student_id in student_ids:
                if student_id:
                    db.query(Student).filter(Student.id == student_id).delete()
        if course_ids:
            for course_id in course_ids:
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
    """Run all enrollment API endpoint tests."""
    print("=" * 60)
    print("ENROLLMENT API ENDPOINT TESTS")
    print("=" * 60)
    
    results = []
    enrollment_ids = []
    course_ids = []
    student_ids = []
    
    # Test 1: Approve enrollment
    success, e_id, c_id, s_id = test_approve_enrollment_endpoint()
    results.append(success)
    if e_id:
        enrollment_ids.append(e_id)
    if c_id:
        course_ids.append(c_id)
    if s_id:
        student_ids.append(s_id)
    
    # Test 2: Reject enrollment
    success, e_id, c_id, s_id = test_reject_enrollment_endpoint()
    results.append(success)
    if e_id:
        enrollment_ids.append(e_id)
    if c_id:
        course_ids.append(c_id)
    if s_id:
        student_ids.append(s_id)
    
    # Test 3: Withdraw enrollment
    success, e_id, c_id, s_id = test_withdraw_enrollment_endpoint()
    results.append(success)
    if e_id:
        enrollment_ids.append(e_id)
    if c_id:
        course_ids.append(c_id)
    if s_id:
        student_ids.append(s_id)
    
    # Test 4: Reapprove enrollment
    success, e_id, c_id, s_id = test_reapprove_enrollment_endpoint()
    results.append(success)
    if e_id:
        enrollment_ids.append(e_id)
    if c_id:
        course_ids.append(c_id)
    if s_id:
        student_ids.append(s_id)
    
    # Test 5: Get eligible enrollments
    results.append(test_get_eligible_enrollments_endpoint())
    
    # Cleanup
    cleanup_test_data(enrollment_ids, course_ids, student_ids)
    
    print("\n" + "=" * 60)
    if all(results):
        print("✓ ALL ENROLLMENT API ENDPOINT TESTS PASSED")
        return True
    else:
        print("✗ SOME ENROLLMENT API ENDPOINT TESTS FAILED")
        return False
    print("=" * 60)

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

