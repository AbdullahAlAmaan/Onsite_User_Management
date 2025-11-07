# System Architecture

## Overview

The Physical Course Enrollment Management System is a full-stack application designed to automate enrollment workflows, eligibility checks, and completion tracking for corporate training programs.

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React + Material UI | User interface with clean dashboards |
| Backend | FastAPI (Python) | RESTful API with async support |
| Database | PostgreSQL | Relational data with integrity constraints |
| Authentication | Azure Active Directory | Corporate SSO and RBAC |
| File Storage | Azure Blob Storage | Scalable file upload handling |
| Data Import | Microsoft Graph API / Pandas | Flexible data ingestion |
| Reporting | Pandas + ReportLab | CSV/PDF report generation |
| Deployment | Docker on Azure App Service | Containerized deployment |

## System Architecture

```
┌─────────────────┐
│   React Frontend│
│   (Material UI) │
└────────┬────────┘
         │ HTTP/REST
         │
┌────────▼────────┐
│   FastAPI       │
│   Backend       │
└────────┬────────┘
         │
    ┌────┴────┬──────────┬──────────────┐
    │         │          │              │
┌───▼───┐ ┌──▼───┐ ┌────▼────┐ ┌──────▼──────┐
│PostgreSQL│ │Azure AD│ │Azure Blob│ │Microsoft  │
│Database  │ │Auth    │ │Storage   │ │Graph API  │
└─────────┘ └────────┘ └──────────┘ └───────────┘
```

## Data Flow

### Enrollment Intake Flow

1. **Form Submission** → Microsoft Forms
2. **Import** → Graph API or Manual Upload
3. **Staging** → `incoming_enrollments` table
4. **Validation** → Eligibility Engine (3 checks)
5. **Processing** → `enrollments` table
6. **Approval** → Instructor Dashboard
7. **Completion** → Score Upload & Tracking

### Eligibility Validation Flow

```
Submission
    │
    ├─→ Prerequisite Check
    │   └─→ Missing? → INELIGIBLE_PREREQUISITE
    │
    ├─→ Duplicate Check
    │   └─→ Already Enrolled? → INELIGIBLE_DUPLICATE
    │
    └─→ Annual Limit Check
        └─→ Another Course This Year? → INELIGIBLE_ANNUAL_LIMIT
            │
            └─→ All Passed → ELIGIBLE
```

## Database Schema

### Core Tables

1. **students**
   - Employee information
   - SBU, designation, experience
   - One-to-many with enrollments

2. **courses**
   - Course metadata
   - Batch codes, dates, seat limits
   - Prerequisite relationships
   - Self-referential for prerequisites

3. **incoming_enrollments**
   - Staging table for raw submissions
   - Stores original form data
   - Processed flag for tracking

4. **enrollments**
   - Main enrollment records
   - Eligibility, approval, completion status
   - Links students to courses
   - Audit trail with timestamps

## API Endpoints

### Enrollment Management
- `GET /api/v1/enrollments` - List enrollments with filters
- `GET /api/v1/enrollments/eligible` - Get eligible pending approvals
- `POST /api/v1/enrollments/approve` - Approve/reject enrollment
- `POST /api/v1/enrollments/approve/bulk` - Bulk approval

### Course Management
- `GET /api/v1/courses` - List courses
- `POST /api/v1/courses` - Create course
- `PUT /api/v1/courses/{id}` - Update course
- `POST /api/v1/courses/{id}/archive` - Archive course

### Data Import
- `POST /api/v1/imports/excel` - Upload Excel file
- `POST /api/v1/imports/csv` - Upload CSV file
- `POST /api/v1/imports/microsoft-forms` - Import from Forms
- `GET /api/v1/imports/sync-status` - Get sync status

### Completion Tracking
- `POST /api/v1/completions/upload` - Upload completion results
- `POST /api/v1/completions/bulk` - Bulk update completions
- `PUT /api/v1/completions/{id}` - Update single completion

### Reporting
- `GET /api/v1/reports/summary` - Get summary statistics
- `GET /api/v1/reports/dashboard/kpis` - Get dashboard KPIs
- `GET /api/v1/reports/export/csv` - Export CSV
- `GET /api/v1/reports/export/pdf` - Export PDF

## Security

### Authentication & Authorization
- Azure AD integration for SSO
- JWT tokens for API authentication
- Role-based access control (RBAC):
  - Admin: Full access
  - Instructor: Approval and completion management
  - Compliance: Read-only access

### Data Protection
- TLS 1.3 for data in transit
- AES-256 encryption at rest
- Secure file uploads to Azure Blob Storage
- SQL injection prevention via SQLAlchemy ORM
- XSS protection in React

## Performance Considerations

### Backend
- Async/await for I/O operations
- Database connection pooling
- Query optimization with indexes
- Caching for frequently accessed data

### Frontend
- React component optimization
- Lazy loading for routes
- Pagination for large datasets
- Debounced search/filter inputs

## Scalability

### Horizontal Scaling
- Stateless API design
- Database connection pooling
- Load balancer ready
- Container orchestration support

### Vertical Scaling
- Efficient database queries
- Indexed columns
- Batch processing for imports
- Background job processing (future)

## Monitoring & Logging

### Application Monitoring
- Health check endpoints
- Performance metrics
- Error tracking
- User activity logs

### Infrastructure Monitoring
- Azure Application Insights
- Database performance metrics
- Storage usage tracking
- API response times

## Backup & Recovery

### Database
- Automated daily backups
- Point-in-time restore
- 35-day retention

### Application Data
- Blob storage versioning
- Configuration backups
- Migration scripts versioned

## Future Enhancements

1. **Phase 2**
   - ML-based eligibility recommendations
   - Power BI dashboard integration
   - Automated notifications

2. **Phase 3**
   - QR-based attendance tracking
   - Mobile app
   - Automated seat optimization
   - Advanced analytics

