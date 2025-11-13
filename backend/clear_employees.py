"""Script to clear all employees from the database."""
import sys
from sqlalchemy.orm import Session
from app.db.base import SessionLocal, engine
from app.models.student import Student
from app.models.enrollment import Enrollment

def clear_all_employees():
    """Delete all employees from the database."""
    db: Session = SessionLocal()
    try:
        # Count before deletion
        count = db.query(Student).count()
        print(f"Found {count} employees in database")
        
        if count == 0:
            print("No employees to delete.")
            return
        
        # Delete all enrollments first (to avoid foreign key issues)
        enrollments_count = db.query(Enrollment).count()
        print(f"Found {enrollments_count} enrollments")
        
        if enrollments_count > 0:
            db.query(Enrollment).delete()
            print(f"Deleted {enrollments_count} enrollments")
        
        # Delete all students
        deleted = db.query(Student).delete()
        db.commit()
        
        print(f"Successfully deleted {deleted} employees")
        print("Database cleared. Ready for new import.")
        
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        sys.exit(1)
    finally:
        db.close()

if __name__ == "__main__":
    print("WARNING: This will delete ALL employees and their enrollments!")
    response = input("Are you sure you want to continue? (yes/no): ")
    if response.lower() == 'yes':
        clear_all_employees()
    else:
        print("Operation cancelled.")

