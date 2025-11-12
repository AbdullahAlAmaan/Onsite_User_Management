#!/usr/bin/env python3
"""Create employees with EMP001, EMP002, etc. format with random names."""

import sys
import os
import random
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.db.base import SessionLocal
from app.models.student import Student, SBU

# Random first and last names
FIRST_NAMES = [
    "James", "Mary", "John", "Patricia", "Robert", "Jennifer", "Michael", "Linda",
    "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica",
    "Thomas", "Sarah", "Charles", "Karen", "Christopher", "Nancy", "Daniel", "Lisa",
    "Matthew", "Betty", "Anthony", "Margaret", "Mark", "Sandra", "Donald", "Ashley",
    "Steven", "Kimberly", "Paul", "Emily", "Andrew", "Donna", "Joshua", "Michelle",
    "Kenneth", "Dorothy", "Kevin", "Carol", "Brian", "Amanda", "George", "Melissa",
    "Edward", "Deborah", "Ronald", "Stephanie", "Timothy", "Rebecca", "Jason", "Sharon",
    "Jeffrey", "Laura", "Ryan", "Cynthia", "Jacob", "Kathleen", "Gary", "Amy",
    "Nicholas", "Angela", "Eric", "Shirley", "Jonathan", "Anna", "Stephen", "Brenda",
    "Larry", "Pamela", "Justin", "Emma", "Scott", "Nicole", "Brandon", "Helen",
    "Benjamin", "Samantha", "Samuel", "Katherine", "Frank", "Christine", "Gregory", "Debra",
    "Raymond", "Rachel", "Alexander", "Carolyn", "Patrick", "Janet", "Jack", "Virginia",
    "Dennis", "Maria", "Jerry", "Heather", "Tyler", "Diane", "Aaron", "Julie"
]

LAST_NAMES = [
    "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis",
    "Rodriguez", "Martinez", "Hernandez", "Lopez", "Wilson", "Anderson", "Thomas", "Taylor",
    "Moore", "Jackson", "Martin", "Lee", "Thompson", "White", "Harris", "Sanchez",
    "Clark", "Ramirez", "Lewis", "Robinson", "Walker", "Young", "Allen", "King",
    "Wright", "Scott", "Torres", "Nguyen", "Hill", "Flores", "Green", "Adams",
    "Nelson", "Baker", "Hall", "Rivera", "Campbell", "Mitchell", "Carter", "Roberts",
    "Gomez", "Phillips", "Evans", "Turner", "Diaz", "Parker", "Cruz", "Edwards",
    "Collins", "Reyes", "Stewart", "Morris", "Morales", "Murphy", "Cook", "Rogers",
    "Gutierrez", "Ortiz", "Morgan", "Cooper", "Peterson", "Bailey", "Reed", "Kelly",
    "Howard", "Ramos", "Kim", "Cox", "Ward", "Richardson", "Watson", "Brooks",
    "Chavez", "Wood", "James", "Bennett", "Gray", "Mendoza", "Ruiz", "Hughes",
    "Price", "Alvarez", "Castillo", "Sanders", "Patel", "Myers", "Long", "Ross"
]

SBU_OPTIONS = ["IT", "HR", "Finance", "Operations", "Sales", "Marketing"]
DESIGNATIONS = [
    "Developer", "Manager", "Analyst", "Coordinator", "Executive", "Director",
    "Specialist", "Consultant", "Engineer", "Administrator", "Supervisor", "Lead"
]

def create_employees(total_count=100):
    """Create employees with EMP001, EMP002, etc. format."""
    db = SessionLocal()
    try:
        # Check existing employees
        existing_employees = db.query(Student).filter(
            Student.employee_id.like('EMP%')
        ).order_by(Student.employee_id).all()
        
        existing_count = len(existing_employees)
        print(f"Found {existing_count} existing employees with EMP prefix")
        
        if existing_count >= total_count:
            print(f"Already have {existing_count} employees. Target is {total_count}.")
            return
        
        # Find the highest EMP number
        max_emp_num = 0
        for emp in existing_employees:
            try:
                num = int(emp.employee_id.replace('EMP', ''))
                max_emp_num = max(max_emp_num, num)
            except ValueError:
                pass
        
        # Create employees from max_emp_num + 1 to total_count
        employees_to_create = total_count - existing_count
        print(f"\nCreating {employees_to_create} new employees...")
        
        created = 0
        for i in range(1, employees_to_create + 1):
            emp_num = max_emp_num + i
            employee_id = f"EMP{emp_num:03d}"
            
            # Check if already exists
            existing = db.query(Student).filter(Student.employee_id == employee_id).first()
            if existing:
                print(f"  ⚠ Skipping {employee_id} - already exists")
                continue
            
            # Generate random name
            first_name = random.choice(FIRST_NAMES)
            last_name = random.choice(LAST_NAMES)
            full_name = f"{first_name} {last_name}"
            email = f"{first_name.lower()}.{last_name.lower()}{emp_num}@company.com"
            
            # Random SBU and designation
            sbu = random.choice(SBU_OPTIONS)
            designation = random.choice(DESIGNATIONS)
            experience_years = random.randint(0, 15)
            
            student = Student(
                employee_id=employee_id,
                name=full_name,
                email=email,
                sbu=SBU[sbu.upper()] if sbu.upper() in [e.name for e in SBU] else SBU.OTHER,
                designation=designation,
                experience_years=experience_years
            )
            
            db.add(student)
            created += 1
            
            if created % 10 == 0:
                db.commit()
                print(f"  ✓ Created {created}/{employees_to_create} employees...")
        
        db.commit()
        
        # Verify final count
        final_count = db.query(Student).filter(Student.employee_id.like('EMP%')).count()
        print(f"\n✅ Successfully created {created} employees")
        print(f"✅ Total EMP employees: {final_count}")
        
    except Exception as e:
        db.rollback()
        print(f"\n❌ Error creating employees: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    print("=" * 60)
    print("CREATE EMPLOYEES")
    print("=" * 60)
    print("\nThis will create employees with EMP001, EMP002, etc. format")
    print("with random names, up to 100 total employees.\n")
    create_employees(100)

