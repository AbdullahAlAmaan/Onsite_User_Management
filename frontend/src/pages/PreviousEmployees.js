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
import { ExpandMore, ExpandLess, Visibility, PersonAdd, Search } from '@mui/icons-material';
import { studentsAPI } from '../services/api';
import UserDetailsDialog from '../components/UserDetailsDialog';

function PreviousEmployees() {
  const theme = useTheme();
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedUser, setExpandedUser] = useState(null);
  const [selectedSBU, setSelectedSBU] = useState('');
  const [filterNeverTaken, setFilterNeverTaken] = useState('');
  const [employeeCount, setEmployeeCount] = useState(0);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [selectedUserToRestore, setSelectedUserToRestore] = useState(null);
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [message, setMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSearchUser, setSelectedSearchUser] = useState(null);

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
      const params = { is_active: false };
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

  const handleRestoreEmployee = (user) => {
    setSelectedUserToRestore(user);
    setRestoreDialogOpen(true);
  };

  const confirmRestoreEmployee = async () => {
    if (!selectedUserToRestore) return;
    
    try {
      await studentsAPI.restore(selectedUserToRestore.id);
      setMessage({ type: 'success', text: `Employee ${selectedUserToRestore.name} restored successfully` });
      setRestoreDialogOpen(false);
      setSelectedUserToRestore(null);
      await fetchUsers();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Error restoring employee' });
    }
  };

  const handleToggleExpand = (userId) => {
    setExpandedUser(expandedUser === userId ? null : userId);
  };

  const handleViewDetails = (user) => {
    setSelectedUser(user);
    setUserDetailsOpen(true);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {message && (
        <Alert
          severity={message.type}
          onClose={() => setMessage(null)}
          sx={{ mb: 2 }}
        >
          {message.text}
        </Alert>
      )}

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
              Previous Employees
            </Typography>
            <Chip 
              label={`${employeeCount} employees`}
              color="secondary"
              sx={{ fontWeight: 600 }}
            />
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            View previously removed employees with their complete course history
          </Typography>
        </Box>
      </Box>

      <Card
        sx={{
          borderRadius: 3,
          boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.1)}`,
          mb: 3,
        }}
      >
        <CardContent>
          <Box display="flex" gap={2} mb={3} flexWrap="wrap">
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

          <Box
            sx={{
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
                    <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
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
                          <Button
                            size="small"
                            variant="outlined"
                            color="primary"
                            startIcon={<PersonAdd />}
                            onClick={() => handleRestoreEmployee(user)}
                          >
                            Restore
                          </Button>
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
                                  {user.enrollments.map((enrollment) => (
                                    <Card
                                      key={enrollment.id}
                                      sx={{
                                        p: 2,
                                        backgroundColor: alpha(theme.palette.primary.main, 0.02),
                                        border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                                      }}
                                    >
                                      <Box display="flex" justifyContent="space-between" alignItems="start">
                                        <Box>
                                          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                            {enrollment.course?.name || 'Unknown Course'}
                                          </Typography>
                                          <Typography variant="body2" color="text.secondary">
                                            Batch: {enrollment.course?.batch_code || 'N/A'}
                                          </Typography>
                                          {enrollment.course_start_date && (
                                            <Typography variant="body2" color="text.secondary">
                                              Start Date: {enrollment.course_start_date}
                                            </Typography>
                                          )}
                                          {enrollment.course_end_date && (
                                            <Typography variant="body2" color="text.secondary">
                                              Completion Date: {enrollment.course_end_date}
                                            </Typography>
                                          )}
                                        </Box>
                                        <Box display="flex" flexDirection="column" alignItems="flex-end" gap={1}>
                                          <Chip
                                            label={enrollment.status || 'Enrolled'}
                                            color={
                                              enrollment.status === 'Completed' ? 'success' :
                                              enrollment.status === 'In Progress' ? 'info' :
                                              enrollment.status === 'Withdrawn' ? 'error' :
                                              'default'
                                            }
                                            size="small"
                                          />
                                          {enrollment.completion_rate !== null && enrollment.completion_rate !== undefined && (
                                            <Typography variant="body2" color="text.secondary">
                                              Completion: {enrollment.completion_rate}%
                                            </Typography>
                                          )}
                                          {enrollment.score !== null && enrollment.score !== undefined && (
                                            <Typography variant="body2" color="text.secondary">
                                              Score: {enrollment.score}
                                            </Typography>
                                          )}
                                        </Box>
                                      </Box>
                                    </Card>
                                  ))}
                                </Box>
                              ) : (
                                <Typography variant="body2" color="text.secondary">
                                  No course history available
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
          </Box>
        </CardContent>
      </Card>

      {/* Restore Employee Confirmation Dialog */}
      <Dialog
        open={restoreDialogOpen}
        onClose={() => {
          setRestoreDialogOpen(false);
          setSelectedUserToRestore(null);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 600 }}>Restore Employee</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mt: 1 }}>
            Are you sure you want to restore <strong>{selectedUserToRestore?.name}</strong> ({selectedUserToRestore?.employee_id})?
          </Typography>
          <Alert severity="info" sx={{ mt: 2 }}>
            The employee will be moved back to the "Employees" tab. All course history and enrollments will be preserved.
          </Alert>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setRestoreDialogOpen(false);
            setSelectedUserToRestore(null);
          }}>
            Cancel
          </Button>
          <Button
            onClick={confirmRestoreEmployee}
            variant="contained"
            color="primary"
          >
            Restore
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

export default PreviousEmployees;

