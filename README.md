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

## Setup Instructions

### Quick Start with Docker

```bash
# Start all services
docker-compose up -d

# Run database migrations
docker-compose exec backend alembic upgrade head

# Access backend API at http://localhost:8000
# Access frontend at http://localhost:3000
```

### Manual Setup

#### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Set up database (PostgreSQL required)
# Update DATABASE_URL in .env file
alembic upgrade head
uvicorn app.main:app --reload
```

#### Frontend Setup

```bash
cd frontend
npm install
npm start
```

## Environment Variables

Create `.env` files in both backend and frontend directories with:

**Backend (.env)**
```
DATABASE_URL=postgresql://user:password@localhost/dbname
AZURE_CLIENT_ID=your_client_id
AZURE_CLIENT_SECRET=your_client_secret
AZURE_TENANT_ID=your_tenant_id
MICROSOFT_GRAPH_API_KEY=your_graph_api_key
SECRET_KEY=your_secret_key
AZURE_STORAGE_CONNECTION_STRING=your_azure_storage_connection_string
AZURE_STORAGE_CONTAINER=enrollment-uploads
```

**Frontend (.env)**
```
REACT_APP_API_URL=http://localhost:8000/api/v1
```

## Database Schema

- `students`: Personal and role details
- `courses`: Course metadata and batches
- `incoming_enrollments`: Staging table for form submissions
- `enrollments`: Main enrollment records with eligibility and approval status

## API Documentation

Once running, visit `http://localhost:8000/docs` for interactive API documentation.

## Key Features Implemented

✅ **Enrollment Intake & Validation**
- Microsoft Forms integration via Graph API
- Manual Excel/CSV upload
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

