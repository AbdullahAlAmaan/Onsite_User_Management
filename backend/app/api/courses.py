from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, selectinload, joinedload
from sqlalchemy import func
from typing import List, Optional
from datetime import date, datetime, timedelta
from decimal import Decimal
import pandas as pd
import io
from app.db.base import get_db
from app.models.course import Course, CourseStatus
from app.models.enrollment import Enrollment
from app.models.course_mentor import CourseMentor
from app.models.mentor import Mentor
from app.models.course_comment import CourseComment
from app.models.course_draft import CourseDraft
from app.schemas.course import CourseCreate, CourseResponse, CourseUpdate, CourseCostUpdate
from app.schemas.course_mentor import CourseMentorCreate, CourseMentorResponse
from app.schemas.course_comment import CourseCommentCreate, CourseCommentResponse
from app.schemas.course_draft import CourseDraftCreate, CourseDraftUpdate, CourseDraftResponse

router = APIRouter()

@router.post("/", response_model=CourseResponse, status_code=201)
def create_course(course: CourseCreate, db: Session = Depends(get_db)):
    """Create a new course batch."""
    # Check for duplicate batch code within the same course name
    existing = db.query(Course).filter(
        Course.name == course.name,
        Course.batch_code == course.batch_code
    ).first()
    if existing:
        raise HTTPException(
            status_code=400, 
            detail=f"Batch code '{course.batch_code}' already exists for course '{course.name}'"
        )
    
    # Check for overlapping batches if needed
    if course.start_date:
        from sqlalchemy import or_
        end_date_check = course.end_date if course.end_date else date.today() + timedelta(days=365)
        overlapping = db.query(Course).filter(
            Course.name == course.name,
            Course.start_date <= end_date_check,
            or_(Course.end_date >= course.start_date, Course.end_date.is_(None))
        ).first()
        if overlapping:
            raise HTTPException(
                status_code=400, 
                detail="Overlapping batch exists for this course"
            )
    
    course_dict = course.dict()
    # Ensure status is set (default to DRAFT if not provided)
    if 'status' not in course_dict or course_dict['status'] is None:
        course_dict['status'] = CourseStatus.DRAFT
    
    db_course = Course(**course_dict)
    db.add(db_course)
    db.commit()
    db.refresh(db_course)
    
    # Load relationships for response
    db_course = db.query(Course).options(
        selectinload(Course.mentors).joinedload(CourseMentor.mentor),
        selectinload(Course.comments),
        selectinload(Course.draft)
    ).filter(Course.id == db_course.id).first()
    
    return CourseResponse.from_orm(db_course)

@router.get("/", response_model=List[CourseResponse])
def get_courses(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db)
):
    """Get all courses."""
    try:
        # Try to load courses with mentors relationship
        # If that fails, fall back to loading mentors separately
        from sqlalchemy.orm import selectinload, joinedload
        
        try:
            query = db.query(Course).options(
                selectinload(Course.mentors).joinedload(CourseMentor.mentor)
            )
            courses = query.order_by(Course.start_date.desc()).offset(skip).limit(limit).all()
        except Exception as load_error:
            # Fallback: load courses without eager loading
            print(f"Warning: Failed to eager load mentors: {load_error}")
            courses = db.query(Course).order_by(Course.start_date.desc()).offset(skip).limit(limit).all()
        
        # Load mentors, comments, and drafts separately if not already loaded
        course_ids = [c.id for c in courses]
        course_mentors_map = {}
        course_comments_map = {}
        course_drafts_map = {}
        
        if course_ids:
            # Load mentors
            course_mentors = db.query(CourseMentor).filter(
                CourseMentor.course_id.in_(course_ids)
            ).options(joinedload(CourseMentor.mentor)).all()
            for cm in course_mentors:
                if cm.course_id not in course_mentors_map:
                    course_mentors_map[cm.course_id] = []
                course_mentors_map[cm.course_id].append(cm)
            
            # Load comments
            comments = db.query(CourseComment).filter(
                CourseComment.course_id.in_(course_ids)
            ).order_by(CourseComment.created_at.desc()).all()
            for comment in comments:
                if comment.course_id not in course_comments_map:
                    course_comments_map[comment.course_id] = []
                course_comments_map[comment.course_id].append(comment)
            
            # Load drafts
            drafts = db.query(CourseDraft).filter(
                CourseDraft.course_id.in_(course_ids)
            ).all()
            for draft in drafts:
                course_drafts_map[draft.course_id] = draft
        
        # Build response with mentors properly loaded
        result = []
        for course in courses:
            try:
                # Get mentors for this course
                course_mentors_list = course_mentors_map.get(course.id, [])
                if not course_mentors_list and hasattr(course, 'mentors') and course.mentors:
                    course_mentors_list = course.mentors
                
                # Calculate total training cost for this course
                total_mentor_cost = sum(float(cm.amount_paid) for cm in course_mentors_list) if course_mentors_list else 0.0
                total_training_cost = float(course.food_cost) + float(course.other_cost) + total_mentor_cost
                
                # Serialize mentors safely
                mentors_list = []
                for cm in course_mentors_list:
                    try:
                        mentors_list.append(CourseMentorResponse.from_orm(cm))
                    except Exception as e:
                        # Skip mentor if serialization fails
                        print(f"Warning: Failed to serialize mentor {cm.id}: {str(e)}")
                        import traceback
                        traceback.print_exc()
                        continue
                
                # Construct response manually to avoid lazy loading issues
                # Convert Numeric to Decimal properly
                food_cost_decimal = Decimal(str(course.food_cost)) if course.food_cost is not None else Decimal('0')
                other_cost_decimal = Decimal(str(course.other_cost)) if course.other_cost is not None else Decimal('0')
                
                # Get comments and draft for this course
                comments_list = course_comments_map.get(course.id, [])
                if not comments_list and hasattr(course, 'comments') and course.comments:
                    comments_list = course.comments
                
                draft_obj = course_drafts_map.get(course.id)
                if not draft_obj and hasattr(course, 'draft') and course.draft:
                    draft_obj = course.draft
                
                course_dict = {
                    'id': course.id,
                    'name': course.name,
                    'batch_code': course.batch_code,
                    'description': course.description,
                    'start_date': course.start_date,
                    'end_date': course.end_date,
                    'seat_limit': course.seat_limit,
                    'current_enrolled': course.current_enrolled or 0,
                    'total_classes_offered': course.total_classes_offered,
                    'prerequisite_course_id': course.prerequisite_course_id,
                    'is_archived': course.is_archived if course.is_archived is not None else False,
                    'status': course.status if hasattr(course, 'status') and course.status else CourseStatus.DRAFT,
                    'food_cost': food_cost_decimal,
                    'other_cost': other_cost_decimal,
                    'total_training_cost': Decimal(str(total_training_cost)),
                    'mentors': mentors_list if mentors_list else None,
                    'comments': [CourseCommentResponse.from_orm(c) for c in comments_list] if comments_list else None,
                    'draft': CourseDraftResponse.from_orm(draft_obj) if draft_obj else None,
                    'created_at': course.created_at,
                    'updated_at': course.updated_at,
                }
                result.append(CourseResponse(**course_dict))
            except Exception as e:
                # Skip course if serialization fails
                print(f"Warning: Failed to serialize course {course.id}: {str(e)}")
                import traceback
                traceback.print_exc()
                continue
        
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Error fetching courses: {str(e)}")

@router.get("/{course_id}", response_model=CourseResponse)
def get_course(course_id: int, db: Session = Depends(get_db)):
    """Get a specific course by ID with mentors, comments, draft, and total training cost."""
    course = db.query(Course).options(
        selectinload(Course.mentors).joinedload(CourseMentor.mentor),
        selectinload(Course.comments),
        selectinload(Course.draft)
    ).filter(Course.id == course_id).first()
    
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Get mentor assignments (use loaded relationship or query)
    course_mentors = course.mentors if course.mentors else []
    if not course_mentors:
        course_mentors = db.query(CourseMentor).filter(
            CourseMentor.course_id == course_id
        ).options(joinedload(CourseMentor.mentor)).all()
    
    # Calculate total mentor costs
    total_mentor_cost = sum(float(cm.amount_paid) for cm in course_mentors) if course_mentors else 0.0
    
    # Calculate total training cost
    total_training_cost = float(course.food_cost) + float(course.other_cost) + total_mentor_cost
    
    # Build response with all data
    course_dict = {
        'id': course.id,
        'name': course.name,
        'batch_code': course.batch_code,
        'description': course.description,
        'start_date': course.start_date,
        'end_date': course.end_date,
        'seat_limit': course.seat_limit,
        'current_enrolled': course.current_enrolled or 0,
        'total_classes_offered': course.total_classes_offered,
        'prerequisite_course_id': course.prerequisite_course_id,
        'is_archived': course.is_archived if course.is_archived is not None else False,
        'status': course.status if hasattr(course, 'status') and course.status else CourseStatus.DRAFT,
        'food_cost': Decimal(str(course.food_cost)) if course.food_cost is not None else Decimal('0'),
        'other_cost': Decimal(str(course.other_cost)) if course.other_cost is not None else Decimal('0'),
        'total_training_cost': Decimal(str(total_training_cost)),
        'mentors': [CourseMentorResponse.from_orm(cm) for cm in course_mentors] if course_mentors else None,
        'comments': [CourseCommentResponse.from_orm(c) for c in course.comments] if course.comments else None,
        'draft': CourseDraftResponse.from_orm(course.draft) if course.draft else None,
        'created_at': course.created_at,
        'updated_at': course.updated_at,
    }
    
    return CourseResponse(**course_dict)

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
    
    # Check for duplicate batch code within the same course name if name or batch_code is being updated
    if 'name' in update_data or 'batch_code' in update_data:
        new_name = update_data.get('name', course.name)
        new_batch_code = update_data.get('batch_code', course.batch_code)
        
        existing = db.query(Course).filter(
            Course.id != course_id,  # Exclude current course
            Course.name == new_name,
            Course.batch_code == new_batch_code
        ).first()
        
        if existing:
            raise HTTPException(
                status_code=400,
                detail=f"Batch code '{new_batch_code}' already exists for course '{new_name}'"
            )
    
    for field, value in update_data.items():
        setattr(course, field, value)
    
    db.commit()
    db.refresh(course)
    return CourseResponse.from_orm(course)

@router.delete("/{course_id}", status_code=204)
def delete_course(course_id: int, db: Session = Depends(get_db)):
    """Permanently delete a course from the database. This action cannot be undone.
    Related enrollments will be preserved with course_id set to NULL to maintain user history."""
    from app.models.enrollment import Enrollment
    
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Preserve enrollments by setting course_id to NULL and storing course info
    # This maintains user history even after course deletion
    enrollments = db.query(Enrollment).filter(Enrollment.course_id == course_id).all()
    for enrollment in enrollments:
        # Store course info before removing the reference
        if not enrollment.course_name:
            enrollment.course_name = course.name
        if not enrollment.batch_code:
            enrollment.batch_code = course.batch_code
        enrollment.course_id = None
    
    # Permanently delete the course
    db.delete(course)
    db.commit()
    return None

@router.put("/{course_id}/costs", response_model=CourseResponse)
def update_course_costs(
    course_id: int,
    cost_update: CourseCostUpdate,
    db: Session = Depends(get_db)
):
    """Update food_cost and other_cost for a course."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if cost_update.food_cost is not None:
        course.food_cost = cost_update.food_cost
    if cost_update.other_cost is not None:
        course.other_cost = cost_update.other_cost
    
    db.commit()
    db.refresh(course)
    
    # Return with mentors and total cost
    return get_course(course_id, db)

@router.post("/{course_id}/mentors", response_model=CourseMentorResponse, status_code=201)
def assign_mentor_to_course(
    course_id: int,
    assignment: CourseMentorCreate,
    db: Session = Depends(get_db)
):
    """Assign a mentor to a course. If assignment exists, update hours and amount."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    mentor = db.query(Mentor).filter(Mentor.id == assignment.mentor_id).first()
    if not mentor:
        raise HTTPException(status_code=404, detail="Mentor not found")
    
    # Check if assignment already exists
    existing = db.query(CourseMentor).filter(
        CourseMentor.course_id == course_id,
        CourseMentor.mentor_id == assignment.mentor_id
    ).first()
    
    if existing:
        # Update existing assignment
        existing.hours_taught = assignment.hours_taught
        existing.amount_paid = assignment.amount_paid
        db.commit()
        db.refresh(existing)
        return CourseMentorResponse.from_orm(existing)
    else:
        # Create new assignment
        db_assignment = CourseMentor(
            course_id=course_id,
            mentor_id=assignment.mentor_id,
            hours_taught=assignment.hours_taught,
            amount_paid=assignment.amount_paid
        )
        db.add(db_assignment)
        db.commit()
        db.refresh(db_assignment)
        return CourseMentorResponse.from_orm(db_assignment)

@router.delete("/{course_id}/mentors/{course_mentor_id}", status_code=204)
def remove_course_mentor(
    course_id: int,
    course_mentor_id: int,
    db: Session = Depends(get_db)
):
    """Remove a mentor assignment from a course."""
    assignment = db.query(CourseMentor).filter(
        CourseMentor.id == course_mentor_id,
        CourseMentor.course_id == course_id
    ).first()
    
    if not assignment:
        raise HTTPException(status_code=404, detail="Mentor assignment not found")
    
    db.delete(assignment)
    db.commit()
    return None

@router.get("/{course_id}/report")
def generate_course_report(course_id: int, db: Session = Depends(get_db)):
    """Generate an Excel report for a course with enrolled students data (Approved and Withdrawn only, excluding Rejected)."""
    from app.models.student import Student
    from app.models.enrollment import CompletionStatus, ApprovalStatus
    
    # Get course
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Get only approved and withdrawn enrollments (exclude rejected and pending)
    enrollments = db.query(Enrollment).filter(
        Enrollment.course_id == course_id,
        Enrollment.approval_status.in_([ApprovalStatus.APPROVED, ApprovalStatus.WITHDRAWN])
    ).all()
    
    # Prepare data for Excel
    report_data = []
    for enrollment in enrollments:
        student = db.query(Student).filter(Student.id == enrollment.student_id).first()
        if not student:
            continue
        
        # Calculate attendance percentage
        attendance_percentage = None
        attendance_display = '-'
        if enrollment.total_attendance and enrollment.total_attendance > 0:
            if enrollment.present is not None:
                attendance_percentage = (enrollment.present / enrollment.total_attendance * 100)
                attendance_display = f"{attendance_percentage:.1f}%"
        elif enrollment.attendance_percentage is not None:
            # Use stored attendance_percentage if available
            attendance_percentage = enrollment.attendance_percentage
            attendance_display = f"{attendance_percentage:.1f}%"
        elif enrollment.attendance_status:
            attendance_display = enrollment.attendance_status
        
        # Calculate overall completion rate for this student
        all_student_enrollments = db.query(Enrollment).filter(
            Enrollment.student_id == enrollment.student_id,
            Enrollment.approval_status.in_([ApprovalStatus.APPROVED, ApprovalStatus.WITHDRAWN])
        ).all()
        
        # Count relevant enrollments (completed, failed, or withdrawn)
        relevant_enrollments = [
            e for e in all_student_enrollments
            if (
                (e.approval_status == ApprovalStatus.WITHDRAWN) or
                (e.approval_status == ApprovalStatus.APPROVED and 
                 e.completion_status in [CompletionStatus.COMPLETED, CompletionStatus.FAILED])
            )
        ]
        
        total_courses = len(relevant_enrollments)
        completed_courses = sum(1 for e in relevant_enrollments if e.completion_status == CompletionStatus.COMPLETED)
        overall_completion_rate = (completed_courses / total_courses * 100) if total_courses > 0 else 0.0
        
        report_data.append({
            'Employee ID': student.employee_id,
            'Name': student.name,
            'Email': student.email,
            'SBU': student.sbu.value if student.sbu else '',
            'Designation': student.designation or '',
            'Approval Status': enrollment.approval_status.value if enrollment.approval_status else '',
            'Completion Status': enrollment.completion_status.value if enrollment.completion_status else '',
            'Total Classes': enrollment.total_attendance or 0,
            'Classes Attended': enrollment.present or 0,
            'Attendance': attendance_display,
            'Score': enrollment.score if enrollment.score is not None else '-',
            'Total Courses Assigned': total_courses,
            'Completed Courses': completed_courses,
            'Overall Completion Rate': f"{overall_completion_rate:.1f}%",
            'Enrollment Date': enrollment.created_at.strftime('%Y-%m-%d %H:%M:%S') if enrollment.created_at else '',
            'Approval Date': enrollment.approved_at.strftime('%Y-%m-%d %H:%M:%S') if enrollment.approved_at and enrollment.approval_status == ApprovalStatus.APPROVED else '',
            'Withdrawal Date': enrollment.updated_at.strftime('%Y-%m-%d %H:%M:%S') if enrollment.approval_status == ApprovalStatus.WITHDRAWN and enrollment.updated_at else '',
            'Withdrawal Reason': enrollment.rejection_reason if enrollment.approval_status == ApprovalStatus.WITHDRAWN else '',
        })
    
    # Create DataFrame
    df = pd.DataFrame(report_data)
    
    # If no enrollments, create empty DataFrame with columns
    if df.empty:
        df = pd.DataFrame(columns=[
            'Employee ID', 'Name', 'Email', 'SBU', 'Designation',
            'Approval Status', 'Completion Status', 'Total Classes', 'Classes Attended',
            'Attendance', 'Score', 'Total Courses Assigned', 'Completed Courses',
            'Overall Completion Rate', 'Enrollment Date', 'Approval Date',
            'Withdrawal Date', 'Withdrawal Reason'
        ])
    
    # Create Excel file in memory
    output = io.BytesIO()
    with pd.ExcelWriter(output, engine='openpyxl') as writer:
        df.to_excel(writer, sheet_name='Enrollments', index=False)
        
        # Auto-adjust column widths
        worksheet = writer.sheets['Enrollments']
        from openpyxl.utils import get_column_letter
        for idx, col in enumerate(df.columns):
            max_length = max(
                df[col].astype(str).map(len).max() if not df.empty else 0,
                len(str(col))
            )
            column_letter = get_column_letter(idx + 1)
            worksheet.column_dimensions[column_letter].width = min(max_length + 2, 50)
    
    output.seek(0)
    
    # Generate filename
    safe_course_name = "".join(c for c in course.name if c.isalnum() or c in (' ', '-', '_')).strip()
    safe_batch_code = "".join(c for c in course.batch_code if c.isalnum() or c in (' ', '-', '_')).strip()
    filename = f"{safe_course_name}_{safe_batch_code}_Report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
    
    return StreamingResponse(
        io.BytesIO(output.read()),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# ========== COMMENT ENDPOINTS ==========

@router.post("/{course_id}/comments", response_model=CourseCommentResponse, status_code=201)
def add_comment(
    course_id: int,
    comment_data: CourseCommentCreate,
    db: Session = Depends(get_db)
):
    """Add a comment/update to a course (especially useful for planning courses)."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    comment = CourseComment(
        course_id=course_id,
        comment=comment_data.comment,
        created_by=comment_data.created_by
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    
    return CourseCommentResponse.from_orm(comment)

@router.get("/{course_id}/comments", response_model=List[CourseCommentResponse])
def get_comments(course_id: int, db: Session = Depends(get_db)):
    """Get all comments for a course."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    comments = db.query(CourseComment).filter(
        CourseComment.course_id == course_id
    ).order_by(CourseComment.created_at.desc()).all()
    
    return [CourseCommentResponse.from_orm(c) for c in comments]

# ========== DRAFT ENDPOINTS ==========

@router.post("/{course_id}/draft", response_model=CourseDraftResponse, status_code=201)
@router.put("/{course_id}/draft", response_model=CourseDraftResponse)
def save_draft(
    course_id: int,
    draft_data: CourseDraftCreate,
    db: Session = Depends(get_db)
):
    """Save or update draft data for a planning course (temporary mentor assignments, costs, etc.)."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    # Only allow drafts for draft/planning courses
    if course.status != CourseStatus.DRAFT:
        raise HTTPException(
            status_code=400,
            detail="Draft data can only be saved for courses in draft/planning status"
        )
    
    # Check if draft exists
    existing_draft = db.query(CourseDraft).filter(CourseDraft.course_id == course_id).first()
    
    # Prepare draft data
    draft_dict = draft_data.dict(exclude_unset=True)
    
    # Convert mentor assignments to JSON-serializable format
    if 'mentor_assignments' in draft_dict and draft_dict['mentor_assignments']:
        mentor_assignments_json = [
            {
                'mentor_id': ma['mentor_id'],
                'hours_taught': float(ma['hours_taught']),
                'amount_paid': float(ma['amount_paid'])
            }
            for ma in draft_dict['mentor_assignments']
        ]
        draft_dict['mentor_assignments'] = mentor_assignments_json
    
    if existing_draft:
        # Update existing draft
        for key, value in draft_dict.items():
            setattr(existing_draft, key, value)
        existing_draft.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(existing_draft)
        return CourseDraftResponse.from_orm(existing_draft)
    else:
        # Create new draft
        new_draft = CourseDraft(course_id=course_id, **draft_dict)
        db.add(new_draft)
        db.commit()
        db.refresh(new_draft)
        return CourseDraftResponse.from_orm(new_draft)

@router.get("/{course_id}/draft", response_model=CourseDraftResponse)
def get_draft(course_id: int, db: Session = Depends(get_db)):
    """Get draft data for a course."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    draft = db.query(CourseDraft).filter(CourseDraft.course_id == course_id).first()
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    
    return CourseDraftResponse.from_orm(draft)

# ========== APPROVAL ENDPOINT ==========

@router.post("/{course_id}/approve", response_model=CourseResponse)
def approve_course(
    course_id: int,
    approved_by: str = Query(..., description="Admin name who approved"),
    db: Session = Depends(get_db)
):
    """Approve a planning course - moves it to ongoing status and saves draft data as official."""
    course = db.query(Course).options(
        selectinload(Course.draft)
    ).filter(Course.id == course_id).first()
    
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    
    if course.status != CourseStatus.DRAFT:
        raise HTTPException(
            status_code=400,
            detail=f"Only draft courses can be approved. Current status: {course.status.value}"
        )
    
    # Get draft data
    draft = course.draft
    
    # If draft exists, apply it to the course
    if draft:
        # Update course costs from draft
        if draft.food_cost is not None:
            course.food_cost = draft.food_cost
        if draft.other_cost is not None:
            course.other_cost = draft.other_cost
        
        # Assign mentors from draft (create CourseMentor records)
        if draft.mentor_assignments:
            for mentor_assignment in draft.mentor_assignments:
                mentor_id = mentor_assignment.get('mentor_id')
                hours_taught = Decimal(str(mentor_assignment.get('hours_taught', 0)))
                amount_paid = Decimal(str(mentor_assignment.get('amount_paid', 0)))
                
                # Check if mentor assignment already exists
                existing = db.query(CourseMentor).filter(
                    CourseMentor.course_id == course_id,
                    CourseMentor.mentor_id == mentor_id
                ).first()
                
                if existing:
                    # Update existing
                    existing.hours_taught = hours_taught
                    existing.amount_paid = amount_paid
                else:
                    # Create new
                    course_mentor = CourseMentor(
                        course_id=course_id,
                        mentor_id=mentor_id,
                        hours_taught=hours_taught,
                        amount_paid=amount_paid
                    )
                    db.add(course_mentor)
        
        # Delete draft after applying
        db.delete(draft)
    
    # Change status to ONGOING
    course.status = CourseStatus.ONGOING
    course.updated_at = datetime.utcnow()
    
    # Add approval comment
    approval_comment = CourseComment(
        course_id=course_id,
        comment=f"Course approved by {approved_by}",
        created_by=approved_by
    )
    db.add(approval_comment)
    
    db.commit()
    db.refresh(course)
    
    # Reload with all relationships
    course = db.query(Course).options(
        selectinload(Course.mentors).joinedload(CourseMentor.mentor),
        selectinload(Course.comments),
        selectinload(Course.draft)
    ).filter(Course.id == course_id).first()
    
    # Build response
    course_mentors = course.mentors if course.mentors else []
    total_mentor_cost = sum(float(cm.amount_paid) for cm in course_mentors) if course_mentors else 0.0
    total_training_cost = float(course.food_cost) + float(course.other_cost) + total_mentor_cost
    
    course_dict = {
        'id': course.id,
        'name': course.name,
        'batch_code': course.batch_code,
        'description': course.description,
        'start_date': course.start_date,
        'end_date': course.end_date,
        'seat_limit': course.seat_limit,
        'current_enrolled': course.current_enrolled or 0,
        'total_classes_offered': course.total_classes_offered,
        'prerequisite_course_id': course.prerequisite_course_id,
        'is_archived': course.is_archived if course.is_archived is not None else False,
        'status': course.status,
        'food_cost': Decimal(str(course.food_cost)) if course.food_cost is not None else Decimal('0'),
        'other_cost': Decimal(str(course.other_cost)) if course.other_cost is not None else Decimal('0'),
        'total_training_cost': Decimal(str(total_training_cost)),
        'mentors': [CourseMentorResponse.from_orm(cm) for cm in course_mentors] if course_mentors else None,
        'comments': [CourseCommentResponse.from_orm(c) for c in course.comments] if course.comments else None,
        'draft': None,  # Draft is deleted after approval
        'created_at': course.created_at,
        'updated_at': course.updated_at,
    }
    
    return CourseResponse(**course_dict)

