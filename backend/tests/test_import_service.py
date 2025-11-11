#!/usr/bin/env python3
"""Test import service for Excel/CSV processing."""

import sys
import os
import tempfile
import pandas as pd
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.db.base import SessionLocal
from app.models.course import Course
from app.models.student import Student
from app.models.enrollment import Enrollment, EligibilityStatus, ApprovalStatus
from app.services.import_service import ImportService
from datetime import date, timedelta
import time

def test_parse_excel():
    """Test Excel file parsing."""
    print("\n" + "=" * 60)
    print("TEST: Parse Excel File")
    print("=" * 60)
    
    # Create test Excel file
    test_data = {
        'employee_id': ['EMP001', 'EMP002', 'EMP003'],
        'name': ['John Doe', 'Jane Smith', 'Bob Johnson'],
        'email': ['john@example.com', 'jane@example.com', 'bob@example.com'],
        'sbu': ['IT', 'HR', 'Finance'],
        'designation': ['Developer', 'Manager', 'Analyst']
    }
    df = pd.DataFrame(test_data)
    
    with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as tmp_file:
        df.to_excel(tmp_file.name, index=False)
        tmp_path = tmp_file.name
    
    try:
        records = ImportService.parse_excel(tmp_path)
        
        print(f"✓ Parsed {len(records)} records")
        
        if len(records) == 3:
            print(f"  - Record 1: {records[0]}")
            print(f"  - Record 2: {records[1]}")
            print(f"  - Record 3: {records[2]}")
            
            # Verify data
            if (records[0]['employee_id'] == 'EMP001' and
                records[1]['name'] == 'Jane Smith' and
                records[2]['email'] == 'bob@example.com'):
                print("\n✓ PASS: Excel parsing works correctly")
                return True
            else:
                print("\n✗ FAIL: Data mismatch")
                return False
        else:
            print(f"\n✗ FAIL: Expected 3 records, got {len(records)}")
            return False
    except Exception as e:
        print(f"\n✗ FAIL: Error parsing Excel: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        os.unlink(tmp_path)

def test_parse_csv():
    """Test CSV file parsing."""
    print("\n" + "=" * 60)
    print("TEST: Parse CSV File")
    print("=" * 60)
    
    # Create test CSV file
    test_data = {
        'employee_id': ['EMP004', 'EMP005'],
        'name': ['Alice Brown', 'Charlie Wilson'],
        'email': ['alice@example.com', 'charlie@example.com'],
        'sbu': ['Operations', 'Sales'],
        'designation': ['Coordinator', 'Executive']
    }
    df = pd.DataFrame(test_data)
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as tmp_file:
        df.to_csv(tmp_file.name, index=False)
        tmp_path = tmp_file.name
    
    try:
        records = ImportService.parse_csv(tmp_path)
        
        print(f"✓ Parsed {len(records)} records")
        
        if len(records) == 2:
            print(f"  - Record 1: {records[0]}")
            print(f"  - Record 2: {records[1]}")
            
            # Verify data
            if (records[0]['employee_id'] == 'EMP004' and
                records[1]['name'] == 'Charlie Wilson'):
                print("\n✓ PASS: CSV parsing works correctly")
                return True
            else:
                print("\n✗ FAIL: Data mismatch")
                return False
        else:
            print(f"\n✗ FAIL: Expected 2 records, got {len(records)}")
            return False
    except Exception as e:
        print(f"\n✗ FAIL: Error parsing CSV: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        os.unlink(tmp_path)

def test_process_incoming_enrollments():
    """Test processing incoming enrollments."""
    print("\n" + "=" * 60)
    print("TEST: Process Incoming Enrollments")
    print("=" * 60)
    
    db = SessionLocal()
    try:
        # Create test course
        timestamp = int(time.time() * 1000)
        course = Course(
            name=f"Test Course Import {timestamp}",
            batch_code=f"IMPORT-{timestamp}",
            description="Test course for import",
            start_date=date.today(),
            end_date=date.today() + timedelta(days=30),
            seat_limit=50,
            current_enrolled=0,
            total_classes_offered=10,
            is_archived=False
        )
        db.add(course)
        db.commit()
        db.refresh(course)
        
        # Create test student
        student = Student(
            employee_id=f"TEST-IMPORT-{timestamp}",
            name="Test Student Import",
            email=f"testimport{timestamp}@example.com",
            sbu="IT",
            designation="Developer"
        )
        db.add(student)
        db.commit()
        db.refresh(student)
        
        # Create records list (simulating parsed Excel/CSV data)
        records = [{
            'employee_id': student.employee_id,
            'name': student.name,
            'email': student.email,
            'sbu': student.sbu,
            'designation': student.designation
        }]
        
        # Process the incoming enrollment
        result = ImportService.process_incoming_enrollments(
            db, 
            records=records,
            course_id=course.id
        )
        
        print(f"✓ Processed enrollments: {result.get('processed', 0)}")
        print(f"  - Created: {result.get('created', 0)}")
        print(f"  - Updated: {result.get('updated', 0)}")
        print(f"  - Errors: {result.get('errors', 0)}")
        
        # Check if enrollment was created
        enrollment = db.query(Enrollment).filter(
            Enrollment.student_id == student.id,
            Enrollment.course_id == course.id
        ).first()
        
        if enrollment:
            print(f"✓ Enrollment created: {enrollment.id}")
            print(f"  - Eligibility: {enrollment.eligibility_status.value}")
            print("\n✓ PASS: Process incoming enrollments works correctly")
            return True, enrollment.id, course.id, student.id
        else:
            print("\n✗ FAIL: Enrollment not created")
            return False, None, course.id, student.id
    except Exception as e:
        db.rollback()
        print(f"\n✗ FAIL: Error processing enrollments: {e}")
        import traceback
        traceback.print_exc()
        return False, None, None, None
    finally:
        db.close()

def test_column_name_normalization():
    """Test column name normalization (handles variations)."""
    print("\n" + "=" * 60)
    print("TEST: Column Name Normalization")
    print("=" * 60)
    
    # Create Excel with different column name variations
    test_data = {
        'Employee ID': ['EMP006'],  # Space instead of underscore
        'Name': ['Test User'],
        'Email': ['test@example.com'],
        'SBU': ['IT'],
        'Designation': ['Developer']
    }
    df = pd.DataFrame(test_data)
    
    with tempfile.NamedTemporaryFile(suffix='.xlsx', delete=False) as tmp_file:
        df.to_excel(tmp_file.name, index=False)
        tmp_path = tmp_file.name
    
    try:
        records = ImportService.parse_excel(tmp_path)
        
        print(f"✓ Parsed {len(records)} records")
        
        if len(records) > 0:
            record = records[0]
            print(f"  - Record: {record}")
            
            # Check if column names were normalized
            if 'employee_id' in record and 'name' in record:
                print("\n✓ PASS: Column name normalization works correctly")
                return True
            else:
                print(f"\n✗ FAIL: Column names not normalized: {record.keys()}")
                return False
        else:
            print("\n✗ FAIL: No records parsed")
            return False
    except Exception as e:
        print(f"\n✗ FAIL: Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        os.unlink(tmp_path)

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
            from app.models.enrollment import IncomingEnrollment
            db.query(IncomingEnrollment).filter(IncomingEnrollment.batch_code.like(f"IMPORT-%")).delete()
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
    """Run all import service tests."""
    print("=" * 60)
    print("IMPORT SERVICE TESTS")
    print("=" * 60)
    
    results = []
    enrollment_id = None
    course_id = None
    student_id = None
    
    # Test 1: Parse Excel
    results.append(test_parse_excel())
    
    # Test 2: Parse CSV
    results.append(test_parse_csv())
    
    # Test 3: Process incoming enrollments
    success, e_id, c_id, s_id = test_process_incoming_enrollments()
    results.append(success)
    if e_id:
        enrollment_id = e_id
    if c_id:
        course_id = c_id
    if s_id:
        student_id = s_id
    
    # Test 4: Column name normalization
    results.append(test_column_name_normalization())
    
    # Cleanup
    cleanup_test_data(enrollment_id, course_id, student_id)
    
    print("\n" + "=" * 60)
    if all(results):
        print("✓ ALL IMPORT SERVICE TESTS PASSED")
        return True
    else:
        print("✗ SOME IMPORT SERVICE TESTS FAILED")
        return False
    print("=" * 60)

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

