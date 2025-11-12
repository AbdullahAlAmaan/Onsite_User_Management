import pandas as pd
from sqlalchemy.orm import Session
from typing import List, Dict, Optional
from datetime import datetime
from app.models.enrollment import IncomingEnrollment
from app.models.student import Student, SBU
from app.models.course import Course
from app.services.eligibility_service import EligibilityService
from app.models.enrollment import Enrollment, EligibilityStatus, ApprovalStatus
import json

class ImportService:
    """Service for importing enrollment data from Microsoft Forms or Excel."""
    
    @staticmethod
    def parse_excel(file_path: str) -> List[Dict]:
        """Parse Excel file and return list of enrollment records (for interest submissions)."""
        try:
            df = pd.read_excel(file_path)
            # Normalize column names (handle variations)
            df.columns = df.columns.str.strip().str.lower().str.replace(' ', '_')
            
            records = []
            for _, row in df.iterrows():
                record = {
                    'employee_id': str(row.get('employee_id', '')).strip(),
                    'name': str(row.get('name', '')).strip(),
                    'email': str(row.get('email', '')).strip(),
                    'sbu': str(row.get('sbu', '')).strip() if pd.notna(row.get('sbu')) else '',
                    'designation': str(row.get('designation', '')).strip() if pd.notna(row.get('designation')) else '',
                }
                records.append(record)
            
            return records
        except Exception as e:
            raise ValueError(f"Error parsing Excel file: {str(e)}")
    
    @staticmethod
    def parse_csv(file_path: str) -> List[Dict]:
        """Parse CSV file and return list of enrollment records (for interest submissions)."""
        try:
            df = pd.read_csv(file_path)
            df.columns = df.columns.str.strip().str.lower().str.replace(' ', '_')
            
            records = []
            for _, row in df.iterrows():
                record = {
                    'employee_id': str(row.get('employee_id', '')).strip(),
                    'name': str(row.get('name', '')).strip(),
                    'email': str(row.get('email', '')).strip(),
                    'sbu': str(row.get('sbu', '')).strip() if pd.notna(row.get('sbu')) else '',
                    'designation': str(row.get('designation', '')).strip() if pd.notna(row.get('designation')) else '',
                }
                records.append(record)
            
            return records
        except Exception as e:
            raise ValueError(f"Error parsing CSV file: {str(e)}")
    
    @staticmethod
    def create_or_get_student(db: Session, employee_id: str, name: str, email: str, 
                             sbu: str, designation: Optional[str] = None) -> Student:
        """Create or get existing student record."""
        student = db.query(Student).filter(Student.employee_id == employee_id).first()
        
        if not student:
            # Map SBU string to enum
            try:
                sbu_enum = SBU[sbu.upper()] if sbu.upper() in [e.name for e in SBU] else SBU.OTHER
            except:
                sbu_enum = SBU.OTHER
            
            student = Student(
                employee_id=employee_id,
                name=name,
                email=email,
                sbu=sbu_enum,
                designation=designation
            )
            db.add(student)
            db.flush()
        else:
            # Update existing student info if needed
            if student.name != name:
                student.name = name
            if student.email != email:
                student.email = email
            if student.designation != designation:
                student.designation = designation
        
        return student
    
    @staticmethod
    def get_course_by_batch_code(db: Session, batch_code: str, course_name: Optional[str] = None) -> Optional[Course]:
        """
        Get course by batch code. If course_name is provided, matches both.
        If course_name is not provided, returns the first match (for backward compatibility).
        """
        query = db.query(Course).filter(Course.batch_code == batch_code)
        if course_name:
            query = query.filter(Course.name == course_name)
        return query.first()
    
    @staticmethod
    def find_student_by_employee_id_or_email(db: Session, employee_id: str, email: str) -> Optional[Student]:
        """Find existing student by employee_id or email."""
        student = db.query(Student).filter(Student.employee_id == employee_id).first()
        if not student:
            student = db.query(Student).filter(Student.email == email).first()
        return student
    
    @staticmethod
    def process_incoming_enrollments(db: Session, records: List[Dict], course_id: int) -> Dict:
        """
        Process incoming enrollment records for a specific course:
        1. Store in incoming_enrollments table
        2. Find existing students (by employee_id or email) - don't create new ones
        3. Run eligibility checks
        4. Create enrollment records
        """
        # Get the course
        course = db.query(Course).filter(Course.id == course_id).first()
        if not course:
            raise ValueError(f"Course with ID {course_id} not found")
        
        results = {
            'total': len(records),
            'processed': 0,
            'errors': [],
            'eligible': 0,
            'ineligible': 0,
            'not_found': 0
        }
        
        for record in records:
            try:
                # Validate required fields
                if not all([record.get('employee_id'), record.get('name'), record.get('email')]):
                    results['errors'].append({
                        'record': record,
                        'error': 'Missing required fields (employee_id, name, email)'
                    })
                    continue
                
                # Find existing student (don't create new ones)
                student = ImportService.find_student_by_employee_id_or_email(
                    db, 
                    record['employee_id'],
                    record['email']
                )
                
                if not student:
                    results['errors'].append({
                        'record': record,
                        'error': f"Employee not found in database (employee_id: {record['employee_id']}, email: {record['email']})"
                    })
                    results['not_found'] += 1
                    continue
                
                # Store in incoming_enrollments
                incoming = IncomingEnrollment(
                    employee_id=record['employee_id'],
                    name=record['name'],
                    email=record['email'],
                    sbu=record.get('sbu'),
                    designation=record.get('designation'),
                    course_name=course.name,
                    batch_code=course.batch_code,
                    raw_data=json.dumps(record)
                )
                db.add(incoming)
                db.flush()
                
                # Check if enrollment already exists
                existing_enrollment = db.query(Enrollment).filter(
                    Enrollment.student_id == student.id,
                    Enrollment.course_id == course.id
                ).first()
                
                if existing_enrollment:
                    results['errors'].append({
                        'record': record,
                        'error': f"Enrollment already exists for {student.name} in {course.name}"
                    })
                    incoming.processed = True
                    incoming.processed_at = datetime.utcnow()
                    continue
                
                # Run eligibility checks
                eligibility_status, reason = EligibilityService.run_all_checks(
                    db, student.id, course.id
                )
                
                # Create enrollment record
                enrollment = Enrollment(
                    student_id=student.id,
                    course_id=course.id,
                    course_name=course.name,  # Store course name for history preservation
                    batch_code=course.batch_code,  # Store batch code for history preservation
                    eligibility_status=eligibility_status,
                    eligibility_reason=reason,
                    eligibility_checked_at=datetime.utcnow(),
                    approval_status=ApprovalStatus.PENDING if eligibility_status == EligibilityStatus.ELIGIBLE else ApprovalStatus.REJECTED,
                    incoming_enrollment_id=incoming.id
                )
                db.add(enrollment)
                
                # Mark incoming as processed
                incoming.processed = True
                incoming.processed_at = datetime.utcnow()
                
                results['processed'] += 1
                if eligibility_status == EligibilityStatus.ELIGIBLE:
                    results['eligible'] += 1
                else:
                    results['ineligible'] += 1
                
            except Exception as e:
                results['errors'].append({
                    'record': record,
                    'error': str(e)
                })
        
        db.commit()
        return results

