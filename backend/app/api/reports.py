from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
import pandas as pd
import io
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter, A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from app.db.base import get_db
from app.models.enrollment import Enrollment, EligibilityStatus, ApprovalStatus, CompletionStatus
from app.models.course import Course
from app.models.student import Student

router = APIRouter()

@router.get("/summary")
def get_summary_report(
    course_id: Optional[int] = Query(None),
    sbu: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Get summary report with KPIs."""
    query = db.query(Enrollment)
    
    if course_id:
        query = query.filter(Enrollment.course_id == course_id)
    if sbu:
        query = query.join(Student).filter(Student.sbu == sbu)
    
    enrollments = query.all()
    
    total = len(enrollments)
    eligible = len([e for e in enrollments if e.eligibility_status == EligibilityStatus.ELIGIBLE])
    approved = len([e for e in enrollments if e.approval_status == ApprovalStatus.APPROVED])
    completed = len([e for e in enrollments if e.completion_status == CompletionStatus.COMPLETED])
    
    eligibility_rate = (eligible / total * 100) if total > 0 else 0
    approval_rate = (approved / eligible * 100) if eligible > 0 else 0
    completion_rate = (completed / approved * 100) if approved > 0 else 0
    
    # Calculate average approval time
    approved_enrollments = [e for e in enrollments if e.approved_at and e.eligibility_checked_at]
    avg_approval_time = None
    if approved_enrollments:
        times = [(e.approved_at - e.eligibility_checked_at).total_seconds() / 3600 
                for e in approved_enrollments]
        avg_approval_time = sum(times) / len(times)
    
    return {
        "total_applicants": total,
        "eligible": eligible,
        "ineligible": total - eligible,
        "approved": approved,
        "pending_approval": len([e for e in enrollments if e.approval_status == ApprovalStatus.PENDING]),
        "completed": completed,
        "eligibility_rate": round(eligibility_rate, 2),
        "approval_rate": round(approval_rate, 2),
        "completion_rate": round(completion_rate, 2),
        "avg_approval_time_hours": round(avg_approval_time, 2) if avg_approval_time else None
    }

@router.get("/export/csv")
def export_csv(
    course_id: Optional[int] = Query(None),
    sbu: Optional[str] = Query(None),
    format: str = Query("enrollments", regex="^(enrollments|courses|students)$"),
    db: Session = Depends(get_db)
):
    """Export data to CSV."""
    if format == "enrollments":
        query = db.query(Enrollment).join(Student).join(Course)
        if course_id:
            query = query.filter(Enrollment.course_id == course_id)
        if sbu:
            query = query.filter(Student.sbu == sbu)
        
        enrollments = query.all()
        
        data = []
        for e in enrollments:
            data.append({
                "Enrollment ID": e.id,
                "Employee ID": e.student.employee_id,
                "Student Name": e.student.name,
                "Email": e.student.email,
                "SBU": e.student.sbu.value,
                "Course Name": e.course.name,
                "Batch Code": e.course.batch_code,
                "Eligibility Status": e.eligibility_status.value,
                "Approval Status": e.approval_status.value,
                "Completion Status": e.completion_status.value,
                "Score": e.score,
                "Attendance %": e.attendance_percentage,
                "Created At": e.created_at.isoformat() if e.created_at else None
            })
        
        df = pd.DataFrame(data)
    
    elif format == "courses":
        courses = db.query(Course).filter(Course.is_archived == False).all()
        data = [{
            "Course ID": c.id,
            "Name": c.name,
            "Batch Code": c.batch_code,
            "Start Date": c.start_date.isoformat() if c.start_date else None,
            "End Date": c.end_date.isoformat() if c.end_date else None,
            "Seat Limit": c.seat_limit,
            "Current Enrolled": c.current_enrolled,
            "Available Seats": c.seat_limit - c.current_enrolled
        } for c in courses]
        df = pd.DataFrame(data)
    
    else:  # students
        query = db.query(Student)
        if sbu:
            query = query.filter(Student.sbu == sbu)
        students = query.all()
        data = [{
            "Student ID": s.id,
            "Employee ID": s.employee_id,
            "Name": s.name,
            "Email": s.email,
            "SBU": s.sbu.value,
            "Designation": s.designation
        } for s in students]
        df = pd.DataFrame(data)
    
    # Convert to CSV
    output = io.StringIO()
    df.to_csv(output, index=False)
    output.seek(0)
    
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={format}_{datetime.now().strftime('%Y%m%d')}.csv"}
    )

@router.get("/export/pdf")
def export_pdf(
    course_id: Optional[int] = Query(None),
    sbu: Optional[str] = Query(None),
    format: str = Query("enrollments", regex="^(enrollments|courses|summary)$"),
    db: Session = Depends(get_db)
):
    """Export data to PDF."""
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    story = []
    styles = getSampleStyleSheet()
    
    # Title
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=18,
        textColor=colors.HexColor('#1a237e'),
        spaceAfter=30,
        alignment=1  # Center
    )
    
    title = Paragraph("Physical Course Enrollment Report", title_style)
    story.append(title)
    story.append(Spacer(1, 0.2*inch))
    
    # Date
    date_style = ParagraphStyle(
        'DateStyle',
        parent=styles['Normal'],
        fontSize=10,
        alignment=1
    )
    date_text = Paragraph(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", date_style)
    story.append(date_text)
    story.append(Spacer(1, 0.3*inch))
    
    if format == "enrollments":
        query = db.query(Enrollment).join(Student).join(Course)
        if course_id:
            query = query.filter(Enrollment.course_id == course_id)
        if sbu:
            query = query.filter(Student.sbu == sbu)
        
        enrollments = query.all()
        
        # Table data
        data = [["Employee ID", "Name", "Course", "Eligibility", "Approval", "Completion"]]
        
        for e in enrollments:
            data.append([
                e.student.employee_id,
                e.student.name[:30],  # Truncate long names
                e.course.name[:25],
                e.eligibility_status.value[:20],
                e.approval_status.value[:15],
                e.completion_status.value[:15]
            ])
        
        table = Table(data, colWidths=[1*inch, 1.5*inch, 1.5*inch, 1*inch, 1*inch, 1*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a237e')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
        ]))
        story.append(table)
    
    elif format == "courses":
        courses = db.query(Course).filter(Course.is_archived == False).all()
        
        data = [["Course Name", "Batch Code", "Start Date", "Seats", "Enrolled", "Available"]]
        
        for c in courses:
            data.append([
                c.name[:30],
                c.batch_code,
                c.start_date.strftime('%Y-%m-%d') if c.start_date else "N/A",
                str(c.seat_limit),
                str(c.current_enrolled),
                str(c.seat_limit - c.current_enrolled)
            ])
        
        table = Table(data, colWidths=[2*inch, 1*inch, 1*inch, 0.8*inch, 0.8*inch, 0.8*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a237e')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
        ]))
        story.append(table)
    
    else:  # summary
        query = db.query(Enrollment)
        if course_id:
            query = query.filter(Enrollment.course_id == course_id)
        if sbu:
            query = query.join(Student).filter(Student.sbu == sbu)
        
        enrollments = query.all()
        total = len(enrollments)
        eligible = len([e for e in enrollments if e.eligibility_status == EligibilityStatus.ELIGIBLE])
        approved = len([e for e in enrollments if e.approval_status == ApprovalStatus.APPROVED])
        completed = len([e for e in enrollments if e.completion_status == CompletionStatus.COMPLETED])
        
        summary_data = [
            ["Metric", "Value"],
            ["Total Applicants", str(total)],
            ["Eligible", str(eligible)],
            ["Ineligible", str(total - eligible)],
            ["Approved", str(approved)],
            ["Pending Approval", str(len([e for e in enrollments if e.approval_status == ApprovalStatus.PENDING]))],
            ["Completed", str(completed)],
            ["Eligibility Rate", f"{(eligible / total * 100) if total > 0 else 0:.2f}%"],
            ["Approval Rate", f"{(approved / eligible * 100) if eligible > 0 else 0:.2f}%"],
            ["Completion Rate", f"{(completed / approved * 100) if approved > 0 else 0:.2f}%"]
        ]
        
        table = Table(summary_data, colWidths=[3*inch, 2*inch])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#1a237e')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 12),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
        ]))
        story.append(table)
    
    doc.build(story)
    buffer.seek(0)
    
    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={format}_report_{datetime.now().strftime('%Y%m%d')}.pdf"}
    )

@router.get("/dashboard/kpis")
def get_dashboard_kpis(db: Session = Depends(get_db)):
    """Get real-time dashboard KPIs."""
    total_enrollments = db.query(Enrollment).count()
    eligible_pending = db.query(Enrollment).filter(
        Enrollment.eligibility_status == EligibilityStatus.ELIGIBLE,
        Enrollment.approval_status == ApprovalStatus.PENDING
    ).count()
    
    active_courses = db.query(Course).filter(Course.is_archived == False).count()
    total_seats_available = db.query(func.sum(Course.seat_limit - Course.current_enrolled)).filter(
        Course.is_archived == False
    ).scalar() or 0
    
    completed_this_month = db.query(Enrollment).filter(
        Enrollment.completion_status == CompletionStatus.COMPLETED,
        func.extract('month', Enrollment.completion_date) == datetime.now().month,
        func.extract('year', Enrollment.completion_date) == datetime.now().year
    ).count()
    
    return {
        "total_enrollments": total_enrollments,
        "eligible_pending_approval": eligible_pending,
        "active_courses": active_courses,
        "total_seats_available": int(total_seats_available),
        "completed_this_month": completed_this_month
    }

