from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime, date
from app.models.student import SBU

class StudentCreate(BaseModel):
    employee_id: str
    name: str
    email: EmailStr
    sbu: SBU
    designation: Optional[str] = None
    experience_years: int = 0
    career_start_date: Optional[date] = None
    bs_joining_date: Optional[date] = None

class StudentResponse(BaseModel):
    id: int
    employee_id: str
    name: str
    email: str
    sbu: SBU
    designation: Optional[str]
    experience_years: int
    career_start_date: Optional[date] = None
    bs_joining_date: Optional[date] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

