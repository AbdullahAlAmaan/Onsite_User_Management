# Excel File Format for Enrollment Upload

## Important Note

**When uploading an Excel file, you select the course manually in the UI. The system will automatically use that course's name and batch code. You do NOT need to include `course_name` or `batch_code` columns in your Excel file - they will be ignored if present.**

## Required Columns

The Excel file must contain the following columns (column names are case-insensitive and spaces are automatically converted):

| Column Name | Required | Description | Example |
|------------|----------|-------------|---------|
| **employee_id** | ✅ Yes | Unique employee identifier | EMP001 |
| **name** | ✅ Yes | Full name of the employee | John Doe |
| **email** | ✅ Yes | Email address | john.doe@company.com |

## Optional Columns

| Column Name | Required | Description | Example |
|------------|----------|-------------|---------|
| **sbu** | ❌ No | Strategic Business Unit | IT, HR, Finance, Operations, Sales, Marketing, Other |
| **designation** | ❌ No | Job title/designation | Manager, Employee, Director |
| **course_name** | ❌ No | **IGNORED** - Course is selected in UI | (any value) |
| **batch_code** | ❌ No | **IGNORED** - Uses course's batch code | (any value) |

## Column Name Variations

The system automatically normalizes column names, so these variations all work:
- `Employee ID`, `employee_id`, `Employee_Id`, `EMPLOYEE_ID` → `employee_id`
- `Name`, `name`, `NAME` → `name`
- `Email`, `email`, `EMAIL` → `email`
- `SBU`, `sbu`, `SBU` → `sbu`
- `Designation`, `designation`, `DESIGNATION` → `designation`
- `Course Name`, `course_name`, `Batch Code`, `batch_code` → **IGNORED** (if present in file)

## Example Excel File

```
| employee_id | name      | email              | sbu  | designation |
|-------------|-----------|--------------------|------|-------------|
| EMP001      | John Doe  | john@company.com   | IT   | Manager     |
| EMP002      | Jane Smith| jane@company.com   | HR   | Employee    |
| EMP003      | Bob Wilson| bob@company.com    |      | Director    |
```

**Note:** If your Excel file has `course_name` or `batch_code` columns, they will be ignored. The system uses the course you select when uploading the file.

## Important Notes

1. **Course Selection**: You must select the course in the UI before uploading. The system will automatically use that course's name and batch code for all enrollments in the file.

2. **SBU Values**: If provided, SBU should be one of: `IT`, `HR`, `Finance`, `Operations`, `Sales`, `Marketing`, or `Other`. If not provided or invalid, it defaults to `Other`.

3. **Student Must Exist**: Students must already exist in the system (created via the Users page or manually). The system will NOT create new students from the Excel file - it will only enroll existing students.

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

