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
        """Parse Excel file and return list of enrollment records."""
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
                    'sbu': str(row.get('sbu', '')).strip(),
                    'designation': str(row.get('designation', '')).strip(),
                    'course_name': str(row.get('course_name', '')).strip(),
                    'batch_code': str(row.get('batch_code', '')).strip(),
                }
                records.append(record)
            
            return records
        except Exception as e:
            raise ValueError(f"Error parsing Excel file: {str(e)}")
    
    @staticmethod
    def parse_csv(file_path: str) -> List[Dict]:
        """Parse CSV file and return list of enrollment records."""
        try:
            df = pd.read_csv(file_path)
            df.columns = df.columns.str.strip().str.lower().str.replace(' ', '_')
            
            records = []
            for _, row in df.iterrows():
                record = {
                    'employee_id': str(row.get('employee_id', '')).strip(),
                    'name': str(row.get('name', '')).strip(),
                    'email': str(row.get('email', '')).strip(),
                    'sbu': str(row.get('sbu', '')).strip(),
                    'designation': str(row.get('designation', '')).strip(),
                    'course_name': str(row.get('course_name', '')).strip(),
                    'batch_code': str(row.get('batch_code', '')).strip(),
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
    def get_course_by_batch_code(db: Session, batch_code: str) -> Optional[Course]:
        """Get course by batch code."""
        return db.query(Course).filter(Course.batch_code == batch_code).first()
    
    @staticmethod
    def process_incoming_enrollments(db: Session, records: List[Dict]) -> Dict:
        """
        Process incoming enrollment records:
        1. Store in incoming_enrollments table
        2. Create/update students
        3. Run eligibility checks
        4. Create enrollment records
        """
        results = {
            'total': len(records),
            'processed': 0,
            'errors': [],
            'eligible': 0,
            'ineligible': 0
        }
        
        for record in records:
            try:
                # Validate required fields
                if not all([record.get('employee_id'), record.get('name'), 
                           record.get('email'), record.get('course_name'), 
                           record.get('batch_code')]):
                    results['errors'].append({
                        'record': record,
                        'error': 'Missing required fields'
                    })
                    continue
                
                # Store in incoming_enrollments
                incoming = IncomingEnrollment(
                    employee_id=record['employee_id'],
                    name=record['name'],
                    email=record['email'],
                    sbu=record.get('sbu'),
                    designation=record.get('designation'),
                    course_name=record['course_name'],
                    batch_code=record['batch_code'],
                    raw_data=json.dumps(record)
                )
                db.add(incoming)
                db.flush()
                
                # Get or create student
                student = ImportService.create_or_get_student(
                    db, 
                    record['employee_id'],
                    record['name'],
                    record['email'],
                    record.get('sbu', 'OTHER'),
                    record.get('designation')
                )
                
                # Get course
                course = ImportService.get_course_by_batch_code(db, record['batch_code'])
                if not course:
                    results['errors'].append({
                        'record': record,
                        'error': f"Course with batch code '{record['batch_code']}' not found"
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

