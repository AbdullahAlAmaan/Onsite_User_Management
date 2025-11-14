import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  TextField,
  MenuItem,
  IconButton,
  Collapse,
  useTheme,
  alpha,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  InputAdornment,
  Autocomplete,
} from '@mui/material';
import { ExpandMore, ExpandLess, PersonAdd, UploadFile, Visibility, PersonRemove, Search, Download } from '@mui/icons-material';
import { studentsAPI } from '../services/api';
import UserDetailsDialog from '../components/UserDetailsDialog';

function Users() {
  const theme = useTheme();
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState(null);
  const [selectedSBU, setSelectedSBU] = useState('');
  const [filterNeverTaken, setFilterNeverTaken] = useState('');
  const [employeeCount, setEmployeeCount] = useState(0);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [selectedUserToRemove, setSelectedUserToRemove] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSearchUser, setSelectedSearchUser] = useState(null);
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newStudent, setNewStudent] = useState({
    employee_id: '',
    name: '',
    email: '',
    sbu: 'IT',
    designation: '',
    experience_years: 0,
  });
  const [message, setMessage] = useState(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  
  // Sample preview data from employee_data_101_200.xlsx
  const previewData = [
    { employee_id: 'EMP101', name: 'Cameron Williams', email: 'cameron.williams101@company.com', sbu: 'IT', designation: 'Coordinator' },
    { employee_id: 'EMP102', name: 'Morgan Williams', email: 'morgan.williams102@company.com', sbu: 'Marketing', designation: 'Engineer' },
    { employee_id: 'EMP103', name: 'Morgan Moore', email: 'morgan.moore103@company.com', sbu: 'Finance', designation: 'Coordinator' },
    { employee_id: 'EMP104', name: 'Casey Miller', email: 'casey.miller104@company.com', sbu: 'Operations', designation: 'Coordinator' },
    { employee_id: 'EMP105', name: 'Alex Jones', email: 'alex.jones105@company.com', sbu: 'HR', designation: 'Manager' },
  ];

  useEffect(() => {
    fetchUsers();
  }, [selectedSBU, filterNeverTaken]);

  // Filter users based on search query and filters
  const users = useMemo(() => {
    let filtered = [...allUsers];
    
    // Filter by never taken course if selected
    if (filterNeverTaken === 'yes') {
      filtered = filtered.filter(user => user.never_taken_course === true);
    } else if (filterNeverTaken === 'no') {
      filtered = filtered.filter(user => user.never_taken_course === false);
    }
    
    // Filter by search query if provided (only if not using autocomplete selection)
    if (searchQuery.trim() && !selectedSearchUser) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(user => 
        user.name?.toLowerCase().includes(query) ||
        user.email?.toLowerCase().includes(query) ||
        user.employee_id?.toLowerCase().includes(query)
      );
    } else if (selectedSearchUser) {
      // If a user is selected from autocomplete, show only that user
      filtered = filtered.filter(user => user.id === selectedSearchUser.id);
    }
    
    return filtered;
  }, [allUsers, filterNeverTaken, searchQuery, selectedSearchUser]);

  // Update count when filtered users change
  useEffect(() => {
    setEmployeeCount(users.length);
  }, [users]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = { is_active: true };
      if (selectedSBU) params.sbu = selectedSBU;
      const response = await studentsAPI.getAllWithCourses(params);
      let fetchedUsers = response.data;
      
      // Sort by employee_id (ascending) - EMP001, EMP002, EMP003, etc.
      fetchedUsers.sort((a, b) => {
        // Extract numeric part for proper sorting
        const numA = parseInt(a.employee_id.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.employee_id.replace(/\D/g, '')) || 0;
        return numA - numB;
      });
      
      setAllUsers(fetchedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      setMessage({ type: 'error', text: 'Error fetching users' });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveEmployee = (user) => {
    setSelectedUserToRemove(user);
    setRemoveDialogOpen(true);
  };

  const confirmRemoveEmployee = async () => {
    if (!selectedUserToRemove) return;
    
    try {
      await studentsAPI.remove(selectedUserToRemove.id);
      setMessage({ type: 'success', text: `Employee ${selectedUserToRemove.name} removed successfully` });
      setRemoveDialogOpen(false);
      setSelectedUserToRemove(null);
      await fetchUsers();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Error removing employee' });
    }
  };

  const handleToggleExpand = (userId) => {
    setExpandedUser(expandedUser === userId ? null : userId);
  };

  const handleViewDetails = (user) => {
    // Create a mock enrollment object for the dialog
    const mockEnrollment = {
      student_id: user.id,
      student_name: user.name,
      student_email: user.email,
      student_sbu: user.sbu,
      student_employee_id: user.employee_id,
      student_designation: user.designation,
      student_experience_years: user.experience_years,
    };
    setSelectedUser(mockEnrollment);
    setUserDetailsOpen(true);
  };

  const handleCreateStudent = async () => {
    try {
      await studentsAPI.create(newStudent);
      setMessage({ type: 'success', text: 'Student created successfully' });
      setCreateDialogOpen(false);
      setNewStudent({
        employee_id: '',
        name: '',
        email: '',
        sbu: 'IT',
        designation: '',
        experience_years: 0,
      });
      await fetchUsers();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Error creating student' });
    }
  };

  const handleImportFileChange = (event) => {
    setImportFile(event.target.files[0]);
    setImportResults(null);
  };

  const handleImportExcel = async () => {
    if (!importFile) {
      setMessage({ type: 'error', text: 'Please select a file' });
      return;
    }

    setImportLoading(true);
    setMessage(null);
    try {
      const response = await studentsAPI.importExcel(importFile);
      setImportResults(response.data.results);
      setMessage({ type: 'success', text: response.data.message });
      setImportFile(null);
      await fetchUsers();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Error uploading file' });
    } finally {
      setImportLoading(false);
    }
  };

  const handleImportCSV = async () => {
    if (!importFile) {
      setMessage({ type: 'error', text: 'Please select a file' });
      return;
    }

    setImportLoading(true);
    setMessage(null);
    try {
      const response = await studentsAPI.importCSV(importFile);
      setImportResults(response.data.results);
      setMessage({ type: 'success', text: response.data.message });
      setImportFile(null);
      await fetchUsers();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Error uploading file' });
    } finally {
      setImportLoading(false);
    }
  };

  const handleCloseImport = () => {
    setImportDialogOpen(false);
    setImportFile(null);
    setImportResults(null);
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Box display="flex" alignItems="center" gap={2}>
            <Typography 
              variant="h4" 
              gutterBottom
              sx={{ 
                fontWeight: 600,
                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              All Employees
            </Typography>
            <Chip 
              label={`${employeeCount} employees`}
              color="primary"
              sx={{ fontWeight: 600 }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            View all employees with their course history and attendance
          </Typography>
        </Box>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<UploadFile />}
            onClick={() => setImportDialogOpen(true)}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 500,
            }}
          >
            Import Employees
          </Button>
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={() => setCreateDialogOpen(true)}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 500,
              boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
            }}
          >
            Add Employee
          </Button>
        </Box>
      </Box>

      {message && (
        <Alert 
          severity={message.type} 
          sx={{ 
            mb: 3,
            borderRadius: 2,
            boxShadow: `0 4px 12px ${alpha(theme.palette[message.type === 'success' ? 'success' : 'error'].main, 0.15)}`,
          }} 
          onClose={() => setMessage(null)}
        >
          {message.text}
        </Alert>
      )}

      <Card
        sx={{
          mb: 3,
          borderRadius: 3,
          boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.1)}`,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
        }}
      >
        <CardContent>
          <Box display="flex" gap={2} flexWrap="wrap">
            <Autocomplete
              options={allUsers}
              getOptionLabel={(option) => option ? `${option.name} (${option.employee_id}) - ${option.email}` : ''}
              value={selectedSearchUser}
              onChange={(event, newValue) => {
                setSelectedSearchUser(newValue);
                if (newValue) {
                  setSearchQuery(newValue.name || '');
                } else {
                  setSearchQuery('');
                }
              }}
              onInputChange={(event, newInputValue) => {
                setSearchQuery(newInputValue);
                if (!newInputValue) {
                  setSelectedSearchUser(null);
                }
              }}
              inputValue={searchQuery}
              filterOptions={(options, { inputValue }) => {
                if (!inputValue) return [];
                const searchLower = inputValue.toLowerCase();
                return options.filter((user) =>
                  user.name?.toLowerCase().includes(searchLower) ||
                  user.email?.toLowerCase().includes(searchLower) ||
                  user.employee_id?.toLowerCase().includes(searchLower)
                );
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search Employees"
                  placeholder="Search by name, email, or employee ID..."
                  size="small"
                  sx={{ minWidth: 300, flexGrow: 1 }}
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <InputAdornment position="start">
                          <Search sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                        {params.InputProps.startAdornment}
                      </>
                    ),
                  }}
                />
              )}
              renderOption={(props, user) => (
                <Box component="li" {...props} key={user.id}>
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {user.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {user.employee_id} • {user.email}
                    </Typography>
                  </Box>
                </Box>
              )}
              noOptionsText="No employees found"
              clearOnEscape
              clearOnBlur={false}
            />
            <TextField
              select
              label="SBU"
              value={selectedSBU}
              onChange={(e) => setSelectedSBU(e.target.value)}
              sx={{ minWidth: 200 }}
              size="small"
            >
              <MenuItem value="">All SBUs</MenuItem>
              <MenuItem value="IT">IT</MenuItem>
              <MenuItem value="HR">HR</MenuItem>
              <MenuItem value="Finance">Finance</MenuItem>
              <MenuItem value="Operations">Operations</MenuItem>
              <MenuItem value="Sales">Sales</MenuItem>
              <MenuItem value="Marketing">Marketing</MenuItem>
              <MenuItem value="Other">Other</MenuItem>
            </TextField>
            <TextField
              select
              label="Course History"
              value={filterNeverTaken}
              onChange={(e) => setFilterNeverTaken(e.target.value)}
              sx={{ minWidth: 200 }}
              size="small"
            >
              <MenuItem value="">All Employees</MenuItem>
              <MenuItem value="yes">Never Taken a Course</MenuItem>
              <MenuItem value="no">Has Taken Courses</MenuItem>
            </TextField>
          </Box>
        </CardContent>
      </Card>

      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : (
        <Card
          sx={{
            borderRadius: 3,
            boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.1)}`,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            overflow: 'hidden',
          }}
        >
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>
                  <TableCell sx={{ fontWeight: 600 }}>Employee ID</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>SBU</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Designation</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Course History</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Remove</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <React.Fragment key={user.id}>
                    <TableRow
                      sx={{
                        '&:hover': {
                          backgroundColor: alpha(theme.palette.primary.main, 0.03),
                        },
                        backgroundColor: user.never_taken_course ? alpha(theme.palette.warning.main, 0.05) : 'transparent',
                        borderLeft: user.never_taken_course ? `4px solid ${theme.palette.warning.main}` : 'none',
                      }}
                    >
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <Typography
                            sx={{
                              cursor: 'pointer',
                              color: 'primary.main',
                              textDecoration: 'underline',
                              '&:hover': {
                                color: 'primary.dark',
                              },
                            }}
                            onClick={() => handleViewDetails(user)}
                          >
                            {user.employee_id}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          {user.name}
                          {user.never_taken_course && (
                            <Chip 
                              label="Never taken a course" 
                              color="warning" 
                              size="small"
                              variant="outlined"
                              sx={{ 
                                fontSize: '0.65rem',
                                height: 18,
                              }}
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Chip label={user.sbu} size="small" />
                      </TableCell>
                      <TableCell>{user.designation || '-'}</TableCell>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1}>
                          <IconButton
                            size="small"
                            onClick={() => handleToggleExpand(user.id)}
                          >
                            {expandedUser === user.id ? <ExpandLess /> : <ExpandMore />}
                          </IconButton>
                          {user.never_taken_course && (
                            <Chip 
                              label="New" 
                              color="warning" 
                              size="small"
                              sx={{ 
                                fontWeight: 600,
                                fontSize: '0.7rem',
                                height: 20,
                              }}
                            />
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleRemoveEmployee(user)}
                          title="Remove Employee"
                        >
                          <PersonRemove />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={7}>
                        <Collapse in={expandedUser === user.id} timeout="auto" unmountOnExit>
                          <Box sx={{ margin: 2 }}>
                            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                              Course History
                            </Typography>
                            {user.enrollments && user.enrollments.length > 0 ? (
                              <Box display="flex" flexDirection="column" gap={2}>
                                {user.enrollments.map((enrollment, index) => {
                                  const isCompleted = enrollment.completion_status === 'Completed';
                                  const isFailed = enrollment.completion_status === 'Failed';
                                  const isInProgress = enrollment.completion_status === 'In Progress';
                                  const statusColor = isCompleted ? 'success' : isFailed ? 'error' : isInProgress ? 'warning' : 'default';
                                  
                                  return (
                                    <Card
                                      key={enrollment.id}
                                      sx={{
                                        borderLeft: `4px solid ${
                                          isCompleted ? theme.palette.success.main :
                                          isFailed ? theme.palette.error.main :
                                          isInProgress ? theme.palette.warning.main :
                                          theme.palette.grey[400]
                                        }`,
                                        backgroundColor: isCompleted 
                                          ? alpha(theme.palette.success.main, 0.05)
                                          : isFailed
                                          ? alpha(theme.palette.error.main, 0.05)
                                          : alpha(theme.palette.primary.main, 0.02),
                                        borderRadius: 2,
                                        boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.1)}`,
                                      }}
                                    >
                                      <CardContent>
                                        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                                          <Box>
                                            <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                                              {enrollment.course_name}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                              Batch: {enrollment.batch_code}
                                            </Typography>
                                          </Box>
                                          <Chip
                                            label={enrollment.completion_status}
                                            color={statusColor}
                                            size="small"
                                            sx={{ fontWeight: 600 }}
                                          />
                                        </Box>
                                        
                                        <Box display="flex" gap={3} mt={2} flexWrap="wrap">
                                          <Box>
                                            <Typography variant="caption" color="text.secondary" display="block">
                                              Approval Status
                                            </Typography>
                                            <Chip
                                              label={enrollment.approval_status}
                                              color={
                                                enrollment.approval_status === 'Approved' ? 'success' :
                                                enrollment.approval_status === 'Pending' ? 'warning' :
                                                enrollment.approval_status === 'Withdrawn' ? 'error' : 'default'
                                              }
                                              size="small"
                                              sx={{ mt: 0.5 }}
                                            />
                                          </Box>
                                          
                                          {enrollment.score !== null && enrollment.score !== undefined && (
                                            <Box>
                                              <Typography variant="caption" color="text.secondary" display="block">
                                                Score
                                              </Typography>
                                              <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.5 }}>
                                                {enrollment.score.toFixed(1)}
                                              </Typography>
                                            </Box>
                                          )}
                                          
                                          {enrollment.attendance_percentage !== null && enrollment.attendance_percentage !== undefined && (
                                            <Box>
                                              <Typography variant="caption" color="text.secondary" display="block">
                                                Attendance
                                              </Typography>
                                              <Typography 
                                                variant="body2" 
                                                sx={{ 
                                                  fontWeight: 600, 
                                                  mt: 0.5,
                                                  color: enrollment.attendance_percentage >= 80 
                                                    ? theme.palette.success.main 
                                                    : enrollment.attendance_percentage >= 50
                                                    ? theme.palette.warning.main
                                                    : theme.palette.error.main
                                                }}
                                              >
                                                {enrollment.attendance_percentage.toFixed(1)}%
                                              </Typography>
                                            </Box>
                                          )}
                                          
                                          {enrollment.attendance_status && (
                                            <Box>
                                              <Typography variant="caption" color="text.secondary" display="block">
                                                Attendance Details
                                              </Typography>
                                              <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.5 }}>
                                                {enrollment.attendance_status}
                                              </Typography>
                                            </Box>
                                          )}
                                          
                                          {enrollment.present !== null && enrollment.total_attendance !== null && (
                                            <Box>
                                              <Typography variant="caption" color="text.secondary" display="block">
                                                Sessions
                                              </Typography>
                                              <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.5 }}>
                                                {enrollment.present} / {enrollment.total_attendance}
                                              </Typography>
                                            </Box>
                                          )}
                                          
                                          {enrollment.course_start_date && (
                                            <Box>
                                              <Typography variant="caption" color="text.secondary" display="block">
                                                Start Date
                                              </Typography>
                                              <Typography variant="body2" sx={{ mt: 0.5 }}>
                                                {new Date(enrollment.course_start_date).toLocaleDateString()}
                                              </Typography>
                                            </Box>
                                          )}
                                          
                                          {enrollment.course_end_date && (
                                            <Box>
                                              <Typography variant="caption" color="text.secondary" display="block">
                                                Completion Date
                                              </Typography>
                                              <Typography variant="body2" sx={{ mt: 0.5 }}>
                                                {new Date(enrollment.course_end_date).toLocaleDateString()}
                                              </Typography>
                                            </Box>
                                          )}
                                        </Box>
                                      </CardContent>
                                    </Card>
                                  );
                                })}
                              </Box>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                No courses taken yet
                              </Typography>
                            )}
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Create Student Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.2)}`,
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>Add New Employee</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Employee ID"
              value={newStudent.employee_id}
              onChange={(e) => setNewStudent({ ...newStudent, employee_id: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Name"
              value={newStudent.name}
              onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Email"
              type="email"
              value={newStudent.email}
              onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
              fullWidth
              required
            />
            <TextField
              select
              label="SBU"
              value={newStudent.sbu}
              onChange={(e) => setNewStudent({ ...newStudent, sbu: e.target.value })}
              fullWidth
              required
            >
              <MenuItem value="IT">IT</MenuItem>
              <MenuItem value="HR">HR</MenuItem>
              <MenuItem value="Finance">Finance</MenuItem>
              <MenuItem value="Operations">Operations</MenuItem>
              <MenuItem value="Sales">Sales</MenuItem>
              <MenuItem value="Marketing">Marketing</MenuItem>
            </TextField>
            <TextField
              label="Designation"
              value={newStudent.designation}
              onChange={(e) => setNewStudent({ ...newStudent, designation: e.target.value })}
              fullWidth
            />
            <TextField
              label="Experience (Years)"
              type="number"
              value={newStudent.experience_years}
              onChange={(e) => setNewStudent({ ...newStudent, experience_years: parseInt(e.target.value) || 0 })}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateStudent} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Employees Dialog */}
      <Dialog
        open={importDialogOpen}
        onClose={handleCloseImport}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.2)}`,
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>Import Employees from File</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <Typography variant="body2" color="text.secondary">
        
            </Typography>
            
            {/* Preview Section */}
            <Box>
              <Box 
                display="flex" 
                alignItems="center" 
                justifyContent="space-between"
                sx={{ 
                  cursor: 'pointer',
                  p: 1,
                  borderRadius: 1,
                  '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.05) }
                }}
                onClick={() => setShowPreview(!showPreview)}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Visibility fontSize="small" />
                  Preview Expected Format
                </Typography>
                <IconButton size="small">
                  {showPreview ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              </Box>
              
              <Collapse in={showPreview}>
                <Box mt={1} sx={{ border: `1px solid ${alpha(theme.palette.divider, 0.1)}`, borderRadius: 2, overflow: 'hidden' }}>
                  <Box sx={{ p: 1, display: 'flex', justifyContent: 'flex-end', borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Download />}
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = '/employee_data_101_200.xlsx';
                        link.download = 'employee_data_101_200.xlsx';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      sx={{ textTransform: 'none' }}
                    >
                      Download Template
                    </Button>
                  </Box>
                  <TableContainer>
                    <Table size="small" sx={{ minWidth: 650 }}>
                      <TableHead>
                        <TableRow sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>
                          <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>employee_id</TableCell>
                          <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>name</TableCell>
                          <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>email</TableCell>
                          <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>sbu</TableCell>
                          <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>designation</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {previewData.map((row, index) => (
                          <TableRow 
                            key={index}
                            sx={{ 
                              '&:nth-of-type(odd)': { backgroundColor: alpha(theme.palette.primary.main, 0.02) }
                            }}
                          >
                            <TableCell sx={{ fontSize: '0.75rem' }}>{row.employee_id}</TableCell>
                            <TableCell sx={{ fontSize: '0.75rem' }}>{row.name}</TableCell>
                            <TableCell sx={{ fontSize: '0.75rem' }}>{row.email}</TableCell>
                            <TableCell sx={{ fontSize: '0.75rem' }}>
                              <Chip label={row.sbu} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                            </TableCell>
                            <TableCell sx={{ fontSize: '0.75rem' }}>{row.designation}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <Box sx={{ p: 1, backgroundColor: alpha(theme.palette.info.main, 0.05), borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                      <strong>Note:</strong> Column names are case-insensitive. SBU values: IT, HR, Finance, Operations, Sales, Marketing, Other. 
                      Designation is an optional field.
                    </Typography>
                  </Box>
                </Box>
              </Collapse>
            </Box>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleImportFileChange}
              style={{ display: 'none' }}
              id="import-file-input"
            />
            <label htmlFor="import-file-input">
              <Button
                variant="outlined"
                component="span"
                fullWidth
                startIcon={<UploadFile />}
                sx={{ mb: 2 }}
              >
                {importFile ? importFile.name : 'Select File'}
              </Button>
            </label>
            {importResults && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                  Import Results:
                </Typography>
                <Typography variant="body2">
                  Total: {importResults.total} | Created: {importResults.created} | Updated: {importResults.updated}
                </Typography>
                {importResults.errors && importResults.errors.length > 0 && (
                  <Box mt={1}>
                    <Typography variant="caption" color="error" sx={{ fontWeight: 600 }}>
                      Errors ({importResults.errors.length}):
                    </Typography>
                    {importResults.errors.slice(0, 5).map((error, index) => (
                      <Typography key={index} variant="caption" display="block" color="error">
                        {error.error}
                      </Typography>
                    ))}
                    {importResults.errors.length > 5 && (
                      <Typography variant="caption" color="error">
                        ... and {importResults.errors.length - 5} more errors
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseImport}>Close</Button>
          <Button
            onClick={handleImportExcel}
            variant="contained"
            disabled={!importFile || importLoading}
            startIcon={importLoading ? <CircularProgress size={20} /> : null}
          >
            Upload Excel
          </Button>
          <Button
            onClick={handleImportCSV}
            variant="contained"
            disabled={!importFile || importLoading}
            startIcon={importLoading ? <CircularProgress size={20} /> : null}
          >
            Upload CSV
          </Button>
        </DialogActions>
      </Dialog>

      {/* Remove Employee Confirmation Dialog */}
      <Dialog
        open={removeDialogOpen}
        onClose={() => {
          setRemoveDialogOpen(false);
          setSelectedUserToRemove(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600 }}>Remove Employee</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mt: 1 }}>
            Are you sure you want to remove <strong>{selectedUserToRemove?.name}</strong> ({selectedUserToRemove?.employee_id})?
          </Typography>
          <Alert severity="info" sx={{ mt: 2 }}>
            The employee will be moved to "Previous Employees" tab. All course history and enrollments will be preserved.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setRemoveDialogOpen(false);
            setSelectedUserToRemove(null);
          }}>
            Cancel
          </Button>
          <Button
            onClick={confirmRemoveEmployee}
            variant="contained"
            color="error"
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>

      {/* User Details Dialog */}
      <UserDetailsDialog
        open={userDetailsOpen}
        onClose={() => {
          setUserDetailsOpen(false);
          setSelectedUser(null);
        }}
        enrollment={selectedUser}
      />
    </Box>
  );
}

export default Users;

