from fastapi import APIRouter
from app.api import enrollments, courses, students, imports, completions, reports

api_router = APIRouter()

api_router.include_router(enrollments.router, prefix="/enrollments", tags=["enrollments"])
api_router.include_router(courses.router, prefix="/courses", tags=["courses"])
api_router.include_router(students.router, prefix="/students", tags=["students"])
api_router.include_router(imports.router, prefix="/imports", tags=["imports"])
api_router.include_router(completions.router, prefix="/completions", tags=["completions"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])

