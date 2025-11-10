# Physical Course Enrollment Management System

A comprehensive system for managing physical course enrollments with automated eligibility checks, instructor approvals, and completion tracking.

## Features

- **Automated Enrollment Intake**: Microsoft Forms integration via Graph API + manual Excel upload
- **Eligibility Engine**: Three-tier validation (Prerequisites, Duplicates, Annual Limit)
- **Instructor Dashboard**: Approval workflow with seat management
- **Course Management**: Batch creation, scheduling, and lifecycle management
- **Completion Tracking**: Score uploads with audit trails
- **Reporting & Analytics**: Real-time dashboards with CSV/PDF exports

## Tech Stack

- **Backend**: FastAPI (Python)
- **Frontend**: React with TypeScript
- **Database**: PostgreSQL
- **Authentication**: Azure AD
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
2. Go to "Courses" and create a test course
3. Go to "Imports" and upload a sample Excel/CSV file
4. Check "Enrollments" to see processed data

## Environment Variables

### Backend (.env) - MVP Minimum

Create `backend/.env` with these **required** variables:

```env
# REQUIRED: Database connection
DATABASE_URL=postgresql://username:password@localhost:5432/enrollment_db

# REQUIRED: Secret key for JWT tokens (generate a random string)
SECRET_KEY=your-secret-key-change-this-to-random-string

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

**Note:** Without Azure configuration, the system will:
- ✅ Store uploaded files locally in `backend/uploads/`
- ✅ Work with manual Excel/CSV uploads
- ❌ Microsoft Forms import will be disabled (can be added later)

## Database Schema

- `students`: Personal and role details
- `courses`: Course metadata and batches
- `incoming_enrollments`: Staging table for form submissions
- `enrollments`: Main enrollment records with eligibility and approval status

## API Documentation

Once running, visit `http://localhost:8000/docs` for interactive API documentation.

## Key Features Implemented

✅ **Enrollment Intake & Validation**
- Manual Excel/CSV upload (Microsoft Forms integration available with Azure setup)
- Automated eligibility checks (Prerequisites, Duplicates, Annual Limit)
- Staging table for raw submissions

✅ **Instructor Approval Workflow**
- Dashboard with filters (SBU, course, designation)
- Bulk approval capabilities
- Seat limit enforcement
- Real-time seat counter

✅ **Course & Batch Management**
- Course creation with prerequisites
- Batch scheduling
- Seat management
- Auto-archiving (7 days post-completion)

✅ **Completion Tracking**
- Excel/CSV upload for scores
- Attendance tracking
- Audit trail for updates
- Statistics calculation

✅ **Reporting & Analytics**
- Real-time dashboard KPIs
- Summary reports with metrics
- CSV/PDF exports
- Filterable by course, SBU, status

## Documentation

- [Architecture Overview](ARCHITECTURE.md)
- [Deployment Guide](DEPLOYMENT.md)

## License

Proprietary - Internal Use Only

