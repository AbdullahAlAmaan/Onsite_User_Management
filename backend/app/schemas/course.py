from pydantic import BaseModel
from typing import Optional
from datetime import datetime, date

class CourseCreate(BaseModel):
    name: str
    batch_code: str
    description: Optional[str] = None
    start_date: date
    end_date: Optional[date] = None
    seat_limit: int
    prerequisite_course_id: Optional[int] = None

class CourseUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    seat_limit: Optional[int] = None
    prerequisite_course_id: Optional[int] = None

class CourseResponse(BaseModel):
    id: int
    name: str
    batch_code: str
    description: Optional[str]
    start_date: date
    end_date: Optional[date]
    seat_limit: int
    current_enrolled: int
    prerequisite_course_id: Optional[int]
    is_archived: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

