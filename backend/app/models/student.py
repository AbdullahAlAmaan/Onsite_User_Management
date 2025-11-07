from sqlalchemy import Column, Integer, String, DateTime, Enum
from sqlalchemy.orm import relationship
from app.db.base import Base
import enum
from datetime import datetime

class SBU(str, enum.Enum):
    """Strategic Business Unit enum."""
    IT = "IT"
    HR = "HR"
    FINANCE = "Finance"
    OPERATIONS = "Operations"
    SALES = "Sales"
    MARKETING = "Marketing"
    OTHER = "Other"

class Student(Base):
    __tablename__ = "students"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    sbu = Column(Enum(SBU), nullable=False)
    designation = Column(String, nullable=True)
    experience_years = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    enrollments = relationship("Enrollment", back_populates="student", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Student(id={self.id}, employee_id={self.employee_id}, name={self.name})>"

