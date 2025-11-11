#!/usr/bin/env python3
"""Test API endpoints with HTTP requests."""

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

client = TestClient(app)

def get_auth_headers():
    """Get authentication headers for API requests."""
    email = getattr(settings, 'ADMIN_EMAIL', 'test@example.com')
    token = create_access_token(email)
    return {"Authorization": f"Bearer {token}"}

def test_login_endpoint():
    """Test login endpoint."""
    print("\n" + "=" * 60)
    print("TEST: Login Endpoint")
    print("=" * 60)
    
    email = getattr(settings, 'ADMIN_EMAIL', '')
    password = getattr(settings, 'ADMIN_PASSWORD', '')
    
    if not email or not password:
        print("✗ SKIP: Admin credentials not configured")
        return False
    
    # Test successful login
    response = client.post("/api/v1/auth/login", json={
        "email": email,
        "password": password
    })
    
    print(f"✓ Login response status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        if "access_token" in data and "token_type" in data:
            print(f"✓ Token received: {data['token_type']}")
            print("\n✓ PASS: Login endpoint works correctly")
            return True
        else:
            print(f"✗ FAIL: Missing token in response: {data}")
            return False
    else:
        print(f"✗ FAIL: Login failed with status {response.status_code}: {response.text}")
        return False

def test_get_current_user():
    """Test get current user endpoint."""
    print("\n" + "=" * 60)
    print("TEST: Get Current User Endpoint")
    print("=" * 60)
    
    headers = get_auth_headers()
    response = client.get("/api/v1/auth/me", headers=headers)
    
    print(f"✓ Response status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ User data: {data}")
        if ("email" in data or "sub" in data) and "role" in data:
            print("\n✓ PASS: Get current user endpoint works correctly")
            return True
        else:
            print(f"✗ FAIL: Missing user data in response")
            return False
    else:
        print(f"✗ FAIL: Request failed with status {response.status_code}: {response.text}")
        return False

def test_create_course_endpoint():
    """Test create course endpoint."""
    print("\n" + "=" * 60)
    print("TEST: Create Course Endpoint")
    print("=" * 60)
    
    headers = get_auth_headers()
    import time
    timestamp = int(time.time() * 1000)  # Use milliseconds for uniqueness
    course_data = {
        "name": f"Test Course API {timestamp}",  # Unique name to avoid overlap
        "batch_code": f"TEST-API-{timestamp}",
        "description": "Test course via API",
        "start_date": str(date.today()),
        "end_date": str(date.today() + timedelta(days=30)),
        "seat_limit": 50,
        "total_classes_offered": 10
    }
    
    response = client.post("/api/v1/courses/", json=course_data, headers=headers)
    
    print(f"✓ Response status: {response.status_code}")
    
    if response.status_code == 201:
        data = response.json()
        print(f"✓ Course created: {data.get('name')} (ID: {data.get('id')})")
        if data.get('id'):
            print("\n✓ PASS: Create course endpoint works correctly")
            return True, data.get('id')
        else:
            print("\n✗ FAIL: Course ID missing in response")
            return False, None
    else:
        print(f"✗ FAIL: Request failed with status {response.status_code}: {response.text}")
        return False, None

def test_get_courses_endpoint(course_id):
    """Test get courses endpoint."""
    print("\n" + "=" * 60)
    print("TEST: Get Courses Endpoint")
    print("=" * 60)
    
    headers = get_auth_headers()
    response = client.get("/api/v1/courses/", headers=headers)
    
    print(f"✓ Response status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Retrieved {len(data)} courses")
        if isinstance(data, list):
            print("\n✓ PASS: Get courses endpoint works correctly")
            return True
        else:
            print("\n✗ FAIL: Response is not a list")
            return False
    else:
        print(f"✗ FAIL: Request failed with status {response.status_code}: {response.text}")
        return False

def test_get_course_endpoint(course_id):
    """Test get single course endpoint."""
    print("\n" + "=" * 60)
    print("TEST: Get Course Endpoint")
    print("=" * 60)
    
    if not course_id:
        print("✗ SKIP: No course ID provided")
        return False
    
    headers = get_auth_headers()
    response = client.get(f"/api/v1/courses/{course_id}", headers=headers)
    
    print(f"✓ Response status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Course retrieved: {data.get('name')}")
        if data.get('id') == course_id:
            print("\n✓ PASS: Get course endpoint works correctly")
            return True
        else:
            print("\n✗ FAIL: Course ID mismatch")
            return False
    else:
        print(f"✗ FAIL: Request failed with status {response.status_code}: {response.text}")
        return False

def test_create_student_endpoint():
    """Test create student endpoint."""
    print("\n" + "=" * 60)
    print("TEST: Create Student Endpoint")
    print("=" * 60)
    
    headers = get_auth_headers()
    import time
    timestamp = int(time.time() * 1000)  # Use milliseconds for uniqueness
    student_data = {
        "employee_id": f"TEST-API-{timestamp}",
        "name": "Test Student API",
        "email": f"testapi{timestamp}@example.com",
        "sbu": "IT",
        "designation": "Developer"
    }
    
    response = client.post("/api/v1/students/", json=student_data, headers=headers)
    
    print(f"✓ Response status: {response.status_code}")
    
    if response.status_code == 201:
        data = response.json()
        print(f"✓ Student created: {data.get('name')} (ID: {data.get('id')})")
        if data.get('id'):
            print("\n✓ PASS: Create student endpoint works correctly")
            return True, data.get('id')
        else:
            print("\n✗ FAIL: Student ID missing in response")
            return False, None
    else:
        print(f"✗ FAIL: Request failed with status {response.status_code}: {response.text}")
        return False, None

def test_get_enrollments_endpoint():
    """Test get enrollments endpoint."""
    print("\n" + "=" * 60)
    print("TEST: Get Enrollments Endpoint")
    print("=" * 60)
    
    headers = get_auth_headers()
    response = client.get("/api/v1/enrollments/", headers=headers)
    
    print(f"✓ Response status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        print(f"✓ Retrieved {len(data)} enrollments")
        if isinstance(data, list):
            print("\n✓ PASS: Get enrollments endpoint works correctly")
            return True
        else:
            print("\n✗ FAIL: Response is not a list")
            return False
    else:
        print(f"✗ FAIL: Request failed with status {response.status_code}: {response.text}")
        return False

def test_unauthorized_access():
    """Test that endpoints require authentication."""
    print("\n" + "=" * 60)
    print("TEST: Unauthorized Access Protection")
    print("=" * 60)
    
    # Try to access protected endpoint without auth
    response = client.get("/api/v1/courses/")
    
    print(f"✓ Response status: {response.status_code}")
    
    if response.status_code == 403:
        print("\n✓ PASS: Unauthorized access correctly blocked")
        return True
    else:
        print(f"\n✗ FAIL: Expected 403, got {response.status_code}")
        return False

def cleanup_test_data(course_id, student_id):
    """Clean up test data."""
    print("\n" + "=" * 60)
    print("CLEANUP: Removing test data")
    print("=" * 60)
    
    db = SessionLocal()
    try:
        if student_id:
            db.query(Enrollment).filter(Enrollment.student_id == student_id).delete()
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
    """Run all API endpoint tests."""
    print("=" * 60)
    print("API ENDPOINT TESTS")
    print("=" * 60)
    
    results = []
    course_id = None
    student_id = None
    
    # Test 1: Login
    results.append(test_login_endpoint())
    
    # Test 2: Get current user
    results.append(test_get_current_user())
    
    # Test 3: Unauthorized access
    results.append(test_unauthorized_access())
    
    # Test 4: Create course
    success, course_id = test_create_course_endpoint()
    results.append(success)
    
    if course_id:
        # Test 5: Get courses
        results.append(test_get_courses_endpoint(course_id))
        
        # Test 6: Get single course
        results.append(test_get_course_endpoint(course_id))
    
    # Test 7: Create student
    success, student_id = test_create_student_endpoint()
    results.append(success)
    
    # Test 8: Get enrollments
    results.append(test_get_enrollments_endpoint())
    
    # Cleanup
    cleanup_test_data(course_id, student_id)
    
    print("\n" + "=" * 60)
    if all(results):
        print("✓ ALL API ENDPOINT TESTS PASSED")
        return True
    else:
        print("✗ SOME API ENDPOINT TESTS FAILED")
        return False
    print("=" * 60)

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

