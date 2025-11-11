# Test Suite

This directory contains comprehensive test files for the Onsite User Management system.

## Running Tests

### Run All Tests
```bash
cd backend
source venv/bin/activate
python tests/run_all_tests.py
```

### Run Individual Test Files
```bash
cd backend
source venv/bin/activate
python tests/test_authentication.py
python tests/test_courses.py
python tests/test_enrollments.py
# ... etc
```

## Test Files

### 1. `test_authentication.py`
Tests authentication and authorization features:
- Password timing attack protection (constant-time comparison)
- JWT token creation and validation
- JWT token expiration (30 minutes)

**Key Tests:**
- ✓ Password verification with correct/wrong credentials
- ✓ JWT token creation with proper payload
- ✓ Token expiration time validation

### 2. `test_courses.py`
Tests course management features:
- Course creation
- Course updates
- Course archiving
- Course deletion with enrollment history preservation

**Key Tests:**
- ✓ Create course with all required fields
- ✓ Update course details
- ✓ Archive course
- ✓ Delete course while preserving enrollment history (course_name, batch_code)

### 3. `test_enrollments.py`
Tests enrollment management features:
- Enrollment creation
- Enrollment approval
- Enrollment withdrawal
- Enrollment reapproval
- Attendance tracking and completion status

**Key Tests:**
- ✓ Create enrollment with proper status
- ✓ Approve enrollment
- ✓ Withdraw enrollment
- ✓ Reapprove withdrawn enrollment
- ✓ Update attendance and auto-set completion status (80% threshold)

### 4. `test_file_upload_security.py`
Tests file upload security features:
- Filename sanitization (path traversal prevention)
- File extension validation
- File size validation
- Safe file path generation

**Key Tests:**
- ✓ Filename sanitization (removes path components, dangerous characters)
- ✓ File extension validation (.xlsx, .xls, .csv only)
- ✓ File size validation (10MB limit)
- ✓ Safe file path generation (prevents directory traversal)

### 5. `test_input_validation.py`
Tests input validation features:
- SBU (Strategic Business Unit) validation
- Enum validation (EligibilityStatus, ApprovalStatus, CompletionStatus)
- Enum string comparison

**Key Tests:**
- ✓ SBU validation against allowed list (IT, HR, Finance, Operations, Sales, Marketing)
- ✓ Enum value validation
- ✓ Enum string comparison

### 6. `test_completion_rate.py`
Tests overall completion rate calculation:
- Overall completion rate calculation for students
- Color coding thresholds (green >=75%, orange 60-75%, red <60%)
- Edge cases (no courses)

**Key Tests:**
- ✓ Calculate overall completion rate (completed/total courses)
- ✓ Color coding based on completion rate
- ✓ Handle students with no courses

### 7. `test_manual_enrollment.py`
Tests manual enrollment and auto-approval features:
- Auto-approval for eligible students with available seats
- Pending status for ineligible students
- Pending status when course is full

**Key Tests:**
- ✓ Auto-approve eligible student with available seats
- ✓ Keep pending for ineligible students
- ✓ Keep pending when course seat limit is reached

## Test Structure

Each test file follows this structure:
1. **Setup**: Create test data (courses, students, enrollments)
2. **Test**: Execute the feature being tested
3. **Assert**: Verify expected behavior
4. **Cleanup**: Remove test data

## Bugs Found and Fixed

During test creation, the following bugs were identified and fixed:

1. **JWT Token Expiration**: Fixed timezone issue - changed from `datetime.utcnow()` to `datetime.now(timezone.utc)` for consistent timestamp calculation
2. **Filename Sanitization**: Fixed backslash handling and long filename truncation
3. **SBU Validation**: Updated to check against allowed list instead of just format validation

## Test Coverage

The test suite covers:
- ✅ Authentication & Authorization
- ✅ Course Management (CRUD operations)
- ✅ Enrollment Management (approval workflow)
- ✅ File Upload Security
- ✅ Input Validation
- ✅ Completion Rate Calculation
- ✅ Manual Enrollment & Auto-Approval

## Notes

- All tests are self-contained and include cleanup
- Tests use unique identifiers to avoid conflicts
- Database operations use transactions with rollback on errors
- Tests can be run individually or all together

