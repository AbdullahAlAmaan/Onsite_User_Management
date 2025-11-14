# Physical Course Enrollment Management System

Admin-only system for managing physical course enrollments with automated eligibility checks, approvals, and completion tracking.

## Features

- **Unified Course Management**: All course and enrollment management in one place
- **Automated Enrollment Intake**: Manual Excel/CSV upload with automatic eligibility checks
- **Eligibility Engine**: Three-tier validation (Prerequisites, Duplicates, Annual Limit)
- **Integrated Approval Workflow**: View and approve enrollments directly within course view
- **Enrollment Sections**: Organized by status (Approved/Enrolled, Eligible Pending, Not Eligible, Withdrawn)
- **Attendance & Completion Tracking**: Excel/CSV upload for attendance and scores with automatic completion status (80% threshold)
- **User Management**: Complete employee profiles with course history and overall completion rates
- **Admin Authentication**: Secure login with email/password authentication

## Tech Stack

- **Backend**: FastAPI (Python)
- **Frontend**: React with Material UI
- **Database**: PostgreSQL
- **Authentication**: JWT-based admin authentication
- **File Processing**: pandas, openpyxl

## Project Structure

```
Onsite_User_Management/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # API routes
│   │   ├── core/           # Core config, security
│   │   ├── models/         # Database models
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── services/       # Business logic
│   │   └── db/             # Database setup
│   ├── alembic/            # Database migrations
│   └── requirements.txt
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API clients
│   │   └── utils/          # Utilities
│   └── package.json
└── README.md
```

## Docker Setup (Recommended)

**The easiest way to run the entire application is using Docker:**

1. Create `.env` file from `.env.example`
2. Run: `docker compose up --build`
3. Access frontend at http://localhost:3000 and backend at http://localhost:8000

See [DOCKER_SETUP.md](DOCKER_SETUP.md) for detailed Docker instructions.

## MVP Setup Instructions (Local Development)

### Prerequisites

- Python 3.11+
- Node.js 16+
- PostgreSQL 15+ (or use SQLite for quick testing - see below)

### Backend Setup

1. **Create virtual environment:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install dependencies:**
```bash
pip install -r requirements.txt
```

3. **Set up database:**

   **Option A: PostgreSQL (Recommended)**
   ```bash
   # Create database
   createdb enrollment_db
   # Or using psql:
   # psql -U postgres
   # CREATE DATABASE enrollment_db;
   ```

   **Option B: SQLite (Quick Testing)**
   - Change `DATABASE_URL` in `.env` to: `sqlite:///./enrollment.db`
   - Note: Some features may have limitations with SQLite

4. **Create `.env` file:**
```bash
cp .env.example .env
# Edit .env and set at minimum:
# DATABASE_URL=postgresql://username:password@localhost:5432/enrollment_db
# SECRET_KEY=your-secret-key-here
```

5. **Run database migrations:**
```bash
alembic upgrade head
```

6. **Start the backend:**
```bash
uvicorn app.main:app --reload
```

Backend will be available at: `http://localhost:8000`
API docs at: `http://localhost:8000/docs`

### Frontend Setup

1. **Install dependencies:**
```bash
cd frontend
npm install
```

2. **Create `.env` file (optional):**
```bash
echo "REACT_APP_API_URL=http://localhost:8000/api/v1" > .env
```

3. **Start the frontend:**
```bash
npm start
```

Frontend will be available at: `http://localhost:3000`

### Quick Test

1. Visit `http://localhost:3000`
2. Login with admin credentials
3. Go to "Courses" and create a test course
4. Upload enrollment Excel/CSV file from the course view
5. View enrollments in the course (organized by status)
6. Approve enrollments and manage attendance/scores
7. Check "Users" tab to see employee course history

## Environment Variables

### Backend (.env) - MVP Minimum

Create `backend/.env` with these **required** variables:

```env
# REQUIRED: Database connection
DATABASE_URL=postgresql://username:password@localhost:5432/enrollment_db

# REQUIRED: Secret key for JWT tokens (generate a random string)
SECRET_KEY=your-secret-key-change-this-to-random-string

# REQUIRED: Admin authentication credentials
ADMIN_EMAIL=your-admin-email@example.com
ADMIN_PASSWORD=your-secure-password

# Optional: CORS origins (defaults work for localhost)
CORS_ORIGINS=["http://localhost:3000","http://localhost:5173"]
```

**Optional (for future Azure integration):**
```env
# Azure AD (for Microsoft Forms - not needed for MVP)
AZURE_CLIENT_ID=
AZURE_CLIENT_SECRET=
AZURE_TENANT_ID=

# Azure Blob Storage (files stored locally if not set)
AZURE_STORAGE_CONNECTION_STRING=
AZURE_STORAGE_CONTAINER=enrollment-uploads
```

### Frontend (.env) - Optional

Create `frontend/.env` (optional, defaults work for localhost):

```env
REACT_APP_API_URL=http://localhost:8000/api/v1
```

**Note:** 
- All API endpoints (except `/auth/login` and `/health`) require admin authentication
- Admin credentials are stored in `.env` file (already in `.gitignore`)
- Files are stored locally in `backend/uploads/` if Azure Blob Storage is not configured

## Database Schema

- `students`: Personal and role details
- `courses`: Course metadata and batches
- `incoming_enrollments`: Staging table for form submissions
- `enrollments`: Main enrollment records with eligibility and approval status

## API Documentation

Once running, visit `http://localhost:8000/docs` for interactive API documentation.

## Key Features Implemented

✅ **Unified Course Management**
- All course and enrollment management in one place
- Course creation with prerequisites, seat limits, and total classes offered
- Course archiving and permanent deletion
- Course details card with prerequisite information

✅ **Enrollment Management (Within Courses)**
- **Approved/Enrolled Students**: All approved students with score, attendance, and completion status
- **Eligible Enrollments (Pending)**: Pending eligible students ready for approval
- **Not Eligible Enrollments**: All non-approved ineligible students (pending and rejected) with eligibility reasons
- **Withdrawn Students**: All withdrawn students with reinstatement option
- Manual enrollment with search functionality
- Approve/Reject/Withdraw/Reapprove actions
- Admin can approve ineligible students (override flexibility)

✅ **Enrollment Intake & Validation**
- Excel/CSV upload directly from course view
- Automated eligibility checks (Prerequisites, Duplicates, Annual Limit)
- All enrollments start as PENDING (even if ineligible)
- Eligibility reasons displayed for admin review

✅ **Attendance & Completion Tracking**
- Excel/CSV upload for attendance and scores (single file)
- Automatic completion status calculation (80% attendance threshold)
- Manual attendance/score update for individual students
- Overall completion rate per student (across all courses)
- Color-coded completion rates (Green ≥75%, Orange 60-75%, Red <60%)

✅ **User Management**
- Complete employee profiles with course history
- Filter by "Never Taken Course" or "Has Taken Courses"
- Overall completion rate display
- Course history with attendance and completion status
- Clickable employee IDs to view full details

✅ **Data Preservation**
- Course history preserved when course is deleted
- Denormalized course_name and batch_code in enrollments
- Enrollment history remains visible even after course deletion

## Application Structure

### Navigation Tabs

1. **Courses** - Main page for all course and enrollment management
   - Course list (Active/Archived toggle)
   - Create/Edit/Delete courses
   - Expand course to view enrollments organized by status
   - Import enrollments (Excel/CSV)
   - Upload attendance & scores (Excel/CSV)
   - Manual student enrollment
   - Course details card

2. **Users** - Employee management and course history
   - All employees list (sorted by employee ID)
   - Course history per employee
   - Filter by "Never Taken Course"
   - Overall completion rate display
   - Click employee ID to view full details

### Enrollment Sections (Within Courses)

When a course is expanded, enrollments are organized into:

1. **Approved/Enrolled Students** - All approved students
   - Shows: Completion Status, Score, Attendance, Overall Completion
   - Actions: Edit Attendance & Score, Withdraw

2. **Eligible Enrollments (Pending)** - Pending eligible students
   - Actions: Approve, Reject

3. **Not Eligible Enrollments** - All non-approved ineligible students
   - Shows: Eligibility Reason, Approval Status (Pending/Rejected)
   - Actions: Approve (Admin Override), Reject

4. **Withdrawn Students** - All withdrawn students
   - Shows: Withdrawal Reason
   - Actions: Reinstate (Reapprove)

## Documentation

- [Project Overview](PROJECT_OVERVIEW.md) - Detailed project structure and database schema
- [Architecture Overview](ARCHITECTURE.md) - System architecture
- [Deployment Guide](DEPLOYMENT.md) - Deployment instructions
- [Excel Format Guide](EXCEL_FORMAT.md) - Excel file format requirements
- [Security Audit](SECURITY_AUDIT.md) - Security audit report

## License

Proprietary - Internal Use Only

