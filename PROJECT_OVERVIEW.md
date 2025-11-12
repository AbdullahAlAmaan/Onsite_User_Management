# Project Overview - Onsite User Management System

## 📊 Database Structure

### Database: PostgreSQL (`enrollment_db`)

**Total Tables: 3**

#### 1. **`students`** Table
**Purpose:** Stores employee/student information

**Columns:**
- `id` (Integer, Primary Key)
- `employee_id` (String, Unique, Indexed) - e.g., "EMP001"
- `name` (String)
- `email` (String, Unique, Indexed)
- `sbu` (Enum: IT, HR, Finance, Operations, Sales, Marketing, Other)
- `designation` (String, Nullable)
- `experience_years` (Integer, Default: 0)
- `created_at` (DateTime)
- `updated_at` (DateTime)

**Relationships:**
- One-to-Many with `enrollments` (cascade delete)

---

#### 2. **`courses`** Table
**Purpose:** Stores course/batch information

**Columns:**
- `id` (Integer, Primary Key)
- `name` (String, Indexed) - Course name
- `batch_code` (String, Unique, Indexed) - Unique batch identifier
- `description` (String, Nullable)
- `start_date` (Date)
- `end_date` (Date, Nullable)
- `seat_limit` (Integer, Default: 0)
- `current_enrolled` (Integer, Default: 0)
- `total_classes_offered` (Integer, Nullable) - Used for attendance calculation
- `prerequisite_course_id` (Integer, Foreign Key to courses.id, Nullable)
- `is_archived` (Boolean, Default: False)
- `created_at` (DateTime)
- `updated_at` (DateTime)

**Relationships:**
- One-to-Many with `enrollments` (NO cascade - preserves enrollments when course deleted)
- Self-referential for prerequisites

---

#### 3. **`enrollments`** Table
**Purpose:** Main enrollment records with eligibility, approval, and completion tracking

**Columns:**
- `id` (Integer, Primary Key)
- `student_id` (Integer, Foreign Key to students.id, Indexed)
- `course_id` (Integer, Foreign Key to courses.id, Nullable, Indexed) - Nullable to preserve history
- `course_name` (String, Nullable) - **Denormalized** - preserved when course deleted
- `batch_code` (String, Nullable) - **Denormalized** - preserved when course deleted

**Eligibility Fields:**
- `eligibility_status` (Enum: Pending, Eligible, Ineligible_Prerequisite, Ineligible_Duplicate, Ineligible_Annual_Limit)
- `eligibility_reason` (String, Nullable)
- `eligibility_checked_at` (DateTime, Nullable)

**Approval Fields:**
- `approval_status` (Enum: Pending, Approved, Rejected, Withdrawn)
- `approved_by` (String, Nullable)
- `approved_at` (DateTime, Nullable)
- `rejection_reason` (String, Nullable)

**Completion Fields:**
- `completion_status` (Enum: Not_Started, In_Progress, Completed, Failed)
- `score` (Float, Nullable)
- `attendance_percentage` (Float, Nullable)
- `total_attendance` (Integer, Nullable)
- `present` (Integer, Nullable)
- `attendance_status` (String, Nullable) - e.g., "8/10"
- `completion_date` (DateTime, Nullable)

**Audit Fields:**
- `created_at` (DateTime)
- `updated_at` (DateTime)
- `incoming_enrollment_id` (Integer, Foreign Key, Nullable)

**Relationships:**
- Many-to-One with `students`
- Many-to-One with `courses` (nullable)

---

#### 4. **`incoming_enrollments`** Table (Staging)
**Purpose:** Temporary storage for raw form submissions before processing

**Columns:**
- `id` (Integer, Primary Key)
- `employee_id` (String, Indexed)
- `name` (String)
- `email` (String)
- `sbu` (String, Nullable)
- `designation` (String, Nullable)
- `course_name` (String)
- `batch_code` (String)
- `submitted_at` (DateTime)
- `processed` (Boolean, Default: False)
- `processed_at` (DateTime, Nullable)
- `raw_data` (Text, Nullable) - JSON storage

---

## 📁 Project Structure

### Root Directory
```
Onsite_User_Management/
├── backend/          # Python FastAPI backend
├── frontend/         # React frontend
├── README.md         # Main documentation
├── ARCHITECTURE.md   # Architecture documentation
├── SECURITY_AUDIT.md # Security audit report
└── *.xlsx            # Sample Excel files
```

---

## 🔧 Backend Structure (`/backend`)

### **`/app`** - Main Application Code

#### **`/app/main.py`**
- FastAPI application entry point
- CORS middleware configuration
- API router registration
- Health check endpoint (`/health`)

#### **`/app/db/base.py`**
- SQLAlchemy engine configuration
- Database connection pooling (pool_size=10, max_overflow=20)
- Session management (`SessionLocal`, `get_db`)
- Base model class

#### **`/app/models/`** - Database Models
- **`student.py`** - Student model and SBU enum
- **`course.py`** - Course model
- **`enrollment.py`** - Enrollment and IncomingEnrollment models, status enums

#### **`/app/schemas/`** - Pydantic Schemas (API Request/Response)
- **`student.py`** - StudentCreate, StudentResponse
- **`course.py`** - CourseCreate, CourseResponse
- **`enrollment.py`** - EnrollmentResponse, EnrollmentApproval, etc.

#### **`/app/api/`** - API Endpoints (Routers)
- **`auth.py`** - Authentication endpoints
  - `POST /auth/login` - Admin login
  - `GET /auth/me` - Get current user

- **`students.py`** - Student management
  - `POST /students` - Create student
  - `GET /students` - List students (with filters)
  - `GET /students/{id}` - Get single student
  - `GET /students/{id}/enrollments` - Get student's enrollments
  - `GET /students/all/with-courses` - Get all students with course history

- **`courses.py`** - Course management
  - `POST /courses` - Create course
  - `GET /courses` - List courses (with filters)
  - `GET /courses/{id}` - Get single course
  - `PUT /courses/{id}` - Update course
  - `DELETE /courses/{id}` - Delete course permanently
  - `POST /courses/{id}/archive` - Archive course

- **`enrollments.py`** - Enrollment management
  - `GET /enrollments` - List enrollments (with filters, pagination)
  - `GET /enrollments/eligible` - Get eligible pending enrollments
  - `GET /enrollments/{id}` - Get single enrollment
  - `POST /enrollments` - Create enrollment (manual)
  - `POST /enrollments/approve` - Approve/reject enrollment
  - `POST /enrollments/approve/bulk` - Bulk approve
  - `POST /enrollments/{id}/withdraw` - Withdraw enrollment
  - `POST /enrollments/{id}/reapprove` - Reapprove withdrawn enrollment

- **`imports.py`** - Data import
  - `POST /imports/excel` - Upload Excel enrollment file
  - `POST /imports/csv` - Upload CSV enrollment file
  - `GET /imports/sync-status` - Get sync status

- **`completions.py`** - Completion/Attendance tracking
  - `POST /completions/upload` - Upload completion results
  - `POST /completions/bulk` - Bulk update completions
  - `PUT /completions/{id}` - Update single completion
  - `POST /completions/attendance/upload` - Upload attendance & scores

#### **`/app/services/`** - Business Logic Services
- **`eligibility_service.py`** - Eligibility checking logic
  - `check_prerequisite()` - Check if student completed prerequisite
  - `check_duplicate()` - Check if student already enrolled
  - `check_annual_limit()` - Check annual course limit (typically 3)

- **`import_service.py`** - Import processing logic
  - `parse_excel()` - Parse Excel files
  - `parse_csv()` - Parse CSV files
  - `process_incoming_enrollments()` - Process enrollment records
  - `create_or_get_student()` - Student creation/lookup
  - `find_student_by_employee_id_or_email()` - Student matching

#### **`/app/core/`** - Core Utilities
- **`config.py`** - Application settings (from .env)
  - Database URL
  - Security keys (JWT secret, algorithm)
  - CORS origins
  - File upload limits (10MB)
  - Admin credentials

- **`auth.py`** - Authentication utilities
  - `verify_admin_credentials()` - Password verification (constant-time)
  - `create_access_token()` - JWT token creation
  - `verify_token()` - JWT token verification
  - `get_current_admin()` - Dependency for protected routes

- **`security.py`** - Security utilities
  - Password hashing
  - JWT encoding/decoding

- **`file_utils.py`** - File upload security
  - `sanitize_filename()` - Prevent path traversal
  - `validate_file_extension()` - Allow only .xlsx, .xls, .csv
  - `validate_file_size()` - Enforce 10MB limit
  - `get_safe_file_path()` - Generate safe file paths

- **`validation.py`** - Input validation
  - `validate_sbu()` - Validate SBU against allowed list
  - `validate_string_input()` - String sanitization
  - `validate_email()` - Email format validation
  - `validate_employee_id()` - Employee ID format validation
  - `sanitize_sql_like_pattern()` - SQL injection prevention

- **`rate_limit.py`** - Rate limiting (in-memory, use Redis in production)
  - `rate_limit()` - Decorator for API endpoints

---

### **`/backend/alembic/`** - Database Migrations
- **`alembic.ini`** - Alembic configuration
- **`env.py`** - Migration environment
- **`versions/`** - Migration scripts
  - `001_initial_schema.py` - Initial database schema
  - `042226f406cc_add_total_classes_offered_to_courses.py`
  - `6e36db3a7375_add_course_name_batch_code_to_enrollments.py`
  - `fc8b96f4698b_add_attendance_fields_to_enrollments.py`

### **`/backend/tests/`** - Test Suite
- **`run_all_tests.py`** - Test runner script
- **`test_authentication.py`** - Auth tests
- **`test_courses.py`** - Course management tests
- **`test_enrollments.py`** - Enrollment workflow tests
- **`test_file_upload_security.py`** - File upload security tests
- **`test_input_validation.py`** - Input validation tests
- **`test_completion_rate.py`** - Completion rate calculation tests
- **`test_manual_enrollment.py`** - Manual enrollment tests
- **`test_api_endpoints.py`** - Basic API endpoint tests
- **`test_eligibility_service.py`** - Eligibility service tests
- **`test_enrollment_api_endpoints.py`** - Enrollment API tests
- **`test_import_service.py`** - Import service tests
- **`test_attendance_upload.py`** - Attendance upload tests

### **`/backend/uploads/`** - File Upload Directory
- Stores uploaded Excel/CSV files temporarily
- Files are processed and can be deleted after processing

### **`/backend/venv/`** - Python Virtual Environment
- Isolated Python environment with all dependencies

---

## 🎨 Frontend Structure (`/frontend`)

### **`/frontend/src`** - Source Code

#### **`/src/App.js`**
- Main React application component
- Router configuration
- Route definitions

#### **`/src/index.js`**
- React application entry point
- Renders App component

#### **`/src/pages/`** - Page Components
- **`Login.js`** - Admin login page
- **`Courses.js`** - Course management page
  - Course list (active/archived)
  - Create/Edit/Delete courses
  - Import enrollments (Excel/CSV)
  - Upload attendance & scores
  - Manual student enrollment
  - Course details card
  - View course enrollments

- **`Enrollments.js`** - Enrollment management page
  - Eligible enrollments section
  - Not eligible enrollments section
  - Approve/Reject/Withdraw/Reapprove actions
  - Overall completion rate display
  - Filters (SBU, eligibility status)
  - User details dialog

- **`Users.js`** - User management page
  - All employees list
  - Course history (expandable)
  - Filter by "Never Taken Course"
  - User details on click

#### **`/src/components/`** - Reusable Components
- **`Layout.js`** - Main layout with navigation
  - Sidebar navigation
  - Header
  - Protected route wrapper

- **`PrivateRoute.js`** - Route protection component
  - Checks authentication
  - Redirects to login if not authenticated

- **`UserDetailsDialog.js`** - User profile dialog
  - Student information display
  - Complete course history
  - Approval actions (if applicable)

- **`CourseDetailsDialog.js`** - Course details dialog
  - Course information
  - Enrollment list
  - Attendance/score details

#### **`/src/services/api.js`** - API Service Layer
- Axios instance configuration (10s timeout)
- API endpoint definitions:
  - `authAPI` - Authentication
  - `studentsAPI` - Student management
  - `coursesAPI` - Course management
  - `enrollmentsAPI` - Enrollment management
  - `importsAPI` - Data import
  - `completionsAPI` - Completion tracking

### **`/frontend/public/`** - Static Files
- `index.html` - HTML template

### **`/frontend/build/`** - Production Build
- Compiled React application
- Generated by `npm run build`

---

## 🔌 API Endpoints Summary

### Authentication
- `POST /api/v1/auth/login` - Login
- `GET /api/v1/auth/me` - Get current user

### Students (Protected)
- `POST /api/v1/students` - Create student
- `GET /api/v1/students` - List students (filters: sbu)
- `GET /api/v1/students/{id}` - Get student
- `GET /api/v1/students/{id}/enrollments` - Get student enrollments
- `GET /api/v1/students/all/with-courses` - Get all with course history

### Courses (Protected)
- `POST /api/v1/courses` - Create course
- `GET /api/v1/courses` - List courses (filters: archived)
- `GET /api/v1/courses/{id}` - Get course
- `PUT /api/v1/courses/{id}` - Update course
- `DELETE /api/v1/courses/{id}` - Delete course
- `POST /api/v1/courses/{id}/archive` - Archive course

### Enrollments (Protected)
- `GET /api/v1/enrollments` - List enrollments (filters: course_id, student_id, eligibility_status, approval_status, sbu, pagination)
- `GET /api/v1/enrollments/eligible` - Get eligible enrollments
- `GET /api/v1/enrollments/{id}` - Get enrollment
- `POST /api/v1/enrollments` - Create enrollment (manual)
- `POST /api/v1/enrollments/approve` - Approve/reject enrollment
- `POST /api/v1/enrollments/approve/bulk` - Bulk approve
- `POST /api/v1/enrollments/{id}/withdraw` - Withdraw enrollment
- `POST /api/v1/enrollments/{id}/reapprove` - Reapprove enrollment

### Imports (Protected)
- `POST /api/v1/imports/excel` - Upload Excel enrollment file
- `POST /api/v1/imports/csv` - Upload CSV enrollment file
- `GET /api/v1/imports/sync-status` - Get sync status

### Completions (Protected)
- `POST /api/v1/completions/upload` - Upload completion results
- `POST /api/v1/completions/bulk` - Bulk update completions
- `PUT /api/v1/completions/{id}` - Update completion
- `POST /api/v1/completions/attendance/upload` - Upload attendance & scores

---

## 🛠️ Technology Stack

### Backend
- **Framework:** FastAPI (Python)
- **Database:** PostgreSQL
- **ORM:** SQLAlchemy 2.0
- **Migrations:** Alembic
- **Authentication:** JWT (python-jose)
- **File Processing:** Pandas, openpyxl
- **Validation:** Pydantic
- **Server:** Uvicorn

### Frontend
- **Framework:** React 18
- **UI Library:** Material-UI (MUI) v5
- **Routing:** React Router v6
- **HTTP Client:** Axios
- **Data Grid:** @mui/x-data-grid
- **Date Pickers:** @mui/x-date-pickers
- **Build Tool:** Create React App

---

## 🔐 Security Features

1. **Authentication:**
   - JWT tokens (30-minute expiration)
   - Constant-time password comparison (prevents timing attacks)
   - Protected API routes (except `/auth/login` and `/health`)

2. **File Upload Security:**
   - Filename sanitization (prevents path traversal)
   - File extension validation (.xlsx, .xls, .csv only)
   - File size limits (10MB)
   - Safe file path generation

3. **Input Validation:**
   - SBU validation (whitelist)
   - Email format validation
   - Employee ID format validation
   - SQL injection prevention (SQLAlchemy ORM + sanitization)

4. **CORS:**
   - Restricted origins
   - Limited HTTP methods
   - Limited headers

5. **Database:**
   - Connection pooling
   - Parameterized queries (SQLAlchemy)
   - No SQL query logging in production

---

## 📋 Key Features

1. **Course Management:**
   - Create/Update/Delete courses
   - Archive courses
   - Prerequisite support
   - Seat limit management
   - Total classes offered tracking

2. **Enrollment Management:**
   - Manual enrollment
   - Excel/CSV import
   - Eligibility checks (prerequisite, duplicate, annual limit)
   - Approval workflow
   - Withdrawal and reapproval

3. **Attendance & Completion:**
   - Excel/CSV upload for attendance and scores
   - Automatic completion status (80% attendance threshold)
   - Overall completion rate calculation
   - Color-coded status display

4. **User Management:**
   - Complete user profiles
   - Course history tracking
   - Filter by "Never Taken Course"
   - Overall completion rate per user

5. **Data Preservation:**
   - Course history preserved when course is deleted
   - Denormalized course_name and batch_code in enrollments

---

## 📦 Dependencies

### Backend (`requirements.txt`)
- FastAPI, Uvicorn
- SQLAlchemy, Alembic, psycopg2-binary
- Pydantic, pydantic-settings
- Pandas, openpyxl
- python-jose, passlib
- aiofiles
- httpx

### Frontend (`package.json`)
- React, React DOM
- Material-UI (@mui/material, @mui/icons-material)
- @mui/x-data-grid, @mui/x-date-pickers
- React Router DOM
- Axios
- date-fns

---

## 🗄️ Database Migrations

**Total Migrations: 4**

1. **`001_initial_schema.py`** - Initial database structure
2. **`042226f406cc_add_total_classes_offered_to_courses.py`** - Added total_classes_offered field
3. **`6e36db3a7375_add_course_name_batch_code_to_enrollments.py`** - Added course_name and batch_code to enrollments (history preservation)
4. **`fc8b96f4698b_add_attendance_fields_to_enrollments.py`** - Added attendance tracking fields

---

## 🧪 Test Coverage

**Total Test Files: 12**

1. Authentication tests
2. Course management tests
3. Enrollment workflow tests
4. File upload security tests
5. Input validation tests
6. Completion rate calculation tests
7. Manual enrollment tests
8. API endpoint tests
9. Eligibility service tests
10. Enrollment API endpoint tests
11. Import service tests
12. Attendance upload tests

**Coverage: ~75-80% of features**

---

## 📝 Configuration Files

### Backend
- **`.env`** (not in repo) - Environment variables
  - `DATABASE_URL` - PostgreSQL connection string
  - `SECRET_KEY` - JWT secret key
  - `ADMIN_EMAIL` - Admin email
  - `ADMIN_PASSWORD` - Admin password
  - `CORS_ORIGINS` - Allowed CORS origins

- **`alembic.ini`** - Alembic migration configuration
- **`requirements.txt`** - Python dependencies

### Frontend
- **`package.json`** - Node.js dependencies and scripts
- **`.env`** (optional) - Frontend environment variables
  - `REACT_APP_API_URL` - Backend API URL

---

## 🚀 Running the Application

### Backend
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm start
```

### Database Migrations
```bash
cd backend
source venv/bin/activate
alembic upgrade head
```

---

## 📊 Data Flow

1. **Enrollment Registration:**
   - Excel/CSV upload → `imports` API → `ImportService` → `incoming_enrollments` table → Eligibility checks → `enrollments` table

2. **Approval Workflow:**
   - Admin views enrollments → Approves/Rejects → Updates `approval_status` → Updates `current_enrolled` count

3. **Attendance Upload:**
   - Excel/CSV upload → `completions/attendance/upload` API → Parse file → Match students → Calculate attendance % → Update completion status (80% threshold)

4. **Course Deletion:**
   - Delete course → Set `course_id` to NULL → Preserve `course_name` and `batch_code` → Enrollment history remains visible

---

## 🔄 Key Business Rules

1. **Eligibility Checks:**
   - Prerequisite must be completed
   - No duplicate course enrollment (by course name)
   - Annual limit: typically 3 courses per year

2. **Completion Status:**
   - ≥80% attendance = COMPLETED
   - <80% attendance = FAILED
   - Based on `total_classes_offered` from course settings

3. **Auto-Approval:**
   - Manual enrollments auto-approve if eligible and seats available

4. **History Preservation:**
   - Course deletion preserves enrollment history
   - `course_name` and `batch_code` stored in enrollment record

---

## 📈 Statistics

- **Database Tables:** 3 main + 1 staging = 4 total
- **API Endpoints:** ~25 endpoints
- **Frontend Pages:** 4 pages (Login, Courses, Enrollments, Users)
- **Test Files:** 12 test files
- **Database Migrations:** 4 migrations

