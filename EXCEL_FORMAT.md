# Excel File Format for Enrollment Upload

## Required Columns

The Excel file must contain the following columns (column names are case-insensitive and spaces are automatically converted):

| Column Name | Required | Description | Example |
|------------|----------|-------------|---------|
| **employee_id** | ✅ Yes | Unique employee identifier | EMP001 |
| **name** | ✅ Yes | Full name of the employee | John Doe |
| **email** | ✅ Yes | Email address | john.doe@company.com |
| **course_name** | ✅ Yes | Name of the course | lms |
| **batch_code** | ✅ Yes | Batch code for the course | ss |

## Optional Columns

| Column Name | Required | Description | Example |
|------------|----------|-------------|---------|
| **sbu** | ❌ No | Strategic Business Unit | IT, HR, Finance, Operations, Sales, Marketing, Other |
| **designation** | ❌ No | Job title/designation | Manager, Employee, Director |

## Column Name Variations

The system automatically normalizes column names, so these variations all work:
- `Employee ID`, `employee_id`, `Employee_Id`, `EMPLOYEE_ID` → `employee_id`
- `Name`, `name`, `NAME` → `name`
- `Email`, `email`, `EMAIL` → `email`
- `Course Name`, `course_name`, `Course_Name` → `course_name`
- `Batch Code`, `batch_code`, `Batch_Code` → `batch_code`
- `SBU`, `sbu`, `SBU` → `sbu`
- `Designation`, `designation`, `DESIGNATION` → `designation`

## Example Excel File

```
| employee_id | name      | email              | sbu  | designation | course_name | batch_code |
|-------------|-----------|--------------------|------|-------------|-------------|------------|
| EMP001      | John Doe  | john@company.com   | IT   | Manager     | lms         | ss         |
| EMP002      | Jane Smith| jane@company.com   | HR   | Employee    | lms         | ss         |
| EMP003      | Bob Wilson| bob@company.com    |      | Director    | New Course  | BATCH002   |
```

## Important Notes

1. **Batch Code Must Exist**: The `batch_code` must match an existing course's batch code in the system. If it doesn't exist, the enrollment will be marked with an error.

2. **SBU Values**: If provided, SBU should be one of: `IT`, `HR`, `Finance`, `Operations`, `Sales`, `Marketing`, or `Other`. If not provided or invalid, it defaults to `Other`.

3. **Student Creation**: If a student with the same `employee_id` already exists, their information will be updated. If not, a new student record will be created.

4. **Eligibility Checks**: After upload, the system automatically:
   - Checks prerequisites
   - Checks for duplicate enrollments
   - Checks annual participation limits
   - Sets eligibility status accordingly

5. **Approval Status**: 
   - Eligible enrollments → `Pending` approval
   - Ineligible enrollments → `Rejected` (but can be manually reviewed)

## File Format

- Supported formats: `.xlsx` or `.xls`
- First row should contain column headers
- Each subsequent row represents one enrollment submission

