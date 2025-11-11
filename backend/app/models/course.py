from sqlalchemy import Column, Integer, String, DateTime, Date, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base
from datetime import datetime, date

class Course(Base):
    __tablename__ = "courses"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False, index=True)
    batch_code = Column(String, unique=True, index=True, nullable=False)
    description = Column(String, nullable=True)
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    seat_limit = Column(Integer, nullable=False, default=0)
    current_enrolled = Column(Integer, default=0)
    total_classes_offered = Column(Integer, nullable=True)
    prerequisite_course_id = Column(Integer, ForeignKey("courses.id"), nullable=True)
    is_archived = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    enrollments = relationship("Enrollment", back_populates="course")  # No cascade - preserve enrollments when course is deleted
    prerequisite = relationship("Course", remote_side=[id], backref="dependent_courses")
    
    def __repr__(self):
        return f"<Course(id={self.id}, name={self.name}, batch_code={self.batch_code})>"

