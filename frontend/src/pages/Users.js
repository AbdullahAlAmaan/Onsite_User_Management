import React, { useEffect, useState } from 'react';
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
} from '@mui/material';
import { ExpandMore, ExpandLess, PersonAdd } from '@mui/icons-material';
import { studentsAPI } from '../services/api';
import UserDetailsDialog from '../components/UserDetailsDialog';

function Users() {
  const theme = useTheme();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState(null);
  const [selectedSBU, setSelectedSBU] = useState('');
  const [filterNeverTaken, setFilterNeverTaken] = useState('');
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

  useEffect(() => {
    fetchUsers();
  }, [selectedSBU, filterNeverTaken]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedSBU) params.sbu = selectedSBU;
      const response = await studentsAPI.getAllWithCourses(params);
      let filteredUsers = response.data;
      
      // Filter by never taken course if selected
      if (filterNeverTaken === 'yes') {
        filteredUsers = filteredUsers.filter(user => user.never_taken_course === true);
      } else if (filterNeverTaken === 'no') {
        filteredUsers = filteredUsers.filter(user => user.never_taken_course === false);
      }
      
      setUsers(filteredUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      setMessage({ type: 'error', text: 'Error fetching users' });
    } finally {
      setLoading(false);
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
      fetchUsers();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Error creating student' });
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
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
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            View all employees with their course history and attendance
          </Typography>
        </Box>
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
            <TextField
              select
              label="Filter by SBU"
              value={selectedSBU}
              onChange={(e) => setSelectedSBU(e.target.value)}
              sx={{ minWidth: 200 }}
              variant="outlined"
            >
              <MenuItem value="">All SBUs</MenuItem>
              <MenuItem value="IT">IT</MenuItem>
              <MenuItem value="HR">HR</MenuItem>
              <MenuItem value="Finance">Finance</MenuItem>
              <MenuItem value="Operations">Operations</MenuItem>
              <MenuItem value="Sales">Sales</MenuItem>
              <MenuItem value="Marketing">Marketing</MenuItem>
            </TextField>
            <TextField
              select
              label="Course History"
              value={filterNeverTaken}
              onChange={(e) => setFilterNeverTaken(e.target.value)}
              sx={{ minWidth: 200 }}
              variant="outlined"
            >
              <MenuItem value="">All Users</MenuItem>
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
                    </TableRow>
                    <TableRow>
                      <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
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

