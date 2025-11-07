from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from app.models.student import SBU

class StudentCreate(BaseModel):
    employee_id: str
    name: str
    email: EmailStr
    sbu: SBU
    designation: Optional[str] = None
    experience_years: int = 0

class StudentResponse(BaseModel):
    id: int
    employee_id: str
    name: str
    email: str
    sbu: SBU
    designation: Optional[str]
    experience_years: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

