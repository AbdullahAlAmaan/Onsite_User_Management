from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import date, datetime, timedelta
from app.db.base import get_db
from app.models.course import Course
from app.schemas.course import CourseCreate, CourseResponse, CourseUpdate

router = APIRouter()

@router.post("/", response_model=CourseResponse, status_code=201)
def create_course(course: CourseCreate, db: Session = Depends(get_db)):
    """Create a new course batch."""
    # Check for duplicate batch code
    existing = db.query(Course).filter(Course.batch_code == course.batch_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Batch code already exists")
    
    # Check for overlapping batches if needed
    if course.start_date:
        overlapping = db.query(Course).filter(
            Course.name == course.name,
            Course.is_archived == False,
            Course.start_date <= course.end_date if course.end_date else date.today() + timedelta(days=365),
            Course.end_date >= course.start_date if course.end_date else date.today()
        ).first()
        if overlapping:
            raise HTTPException(
                status_code=400, 
                detail="Overlapping batch exists for this course"
            )
    
    db_course = Course(**course.dict())
    db.add(db_course)
    db.commit()
    db.refresh(db_course)
    return CourseResponse.from_orm(db_course)

@router.get("/", response_model=List[CourseResponse])
def get_courses(
    archived: Optional[bool] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """Get all courses with optional filters."""
    query = db.query(Course)
    
    if archived is not None:
        query = query.filter(Course.is_archived == archived)
    else:
        query = query.filter(Course.is_archived == False)
    
    courses = query.order_by(Course.start_date.desc()).offset(skip).limit(limit).all()
    return [CourseResponse.from_orm(course) for course in courses]

@router.get("/{course_id}", response_model=CourseResponse)
def get_course(course_id: int, db: Session = Depends(get_db)):
    """Get a specific course by ID."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    return CourseResponse.from_orm(course)

@router.put("/{course_id}", response_model=CourseResponse)
def update_course(
    course_id: int, 
    course_update: CourseUpdate, 
    db: Session = Depends(get_db)
):
    """Update a course."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    update_data = course_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(course, field, value)
    
    db.commit()
    db.refresh(course)
    return CourseResponse.from_orm(course)

@router.delete("/{course_id}", status_code=204)
def delete_course(course_id: int, db: Session = Depends(get_db)):
    """Delete a course (soft delete by archiving)."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    course.is_archived = True
    db.commit()
    return None

@router.post("/{course_id}/archive", response_model=CourseResponse)
def archive_course(course_id: int, db: Session = Depends(get_db)):
    """Manually archive a course."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    course.is_archived = True
    db.commit()
    db.refresh(course)
    return CourseResponse.from_orm(course)

