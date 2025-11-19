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
import { ExpandMore, ExpandLess, Visibility, PersonAdd, Search, PersonRemove } from '@mui/icons-material';
import { studentsAPI } from '../services/api';
import UserDetailsDialog from '../components/UserDetailsDialog';
import { formatDateForDisplay } from '../utils/dateUtils';

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
    <Box sx={{ minHeight: '100vh', background: `linear-gradient(135deg, ${alpha('#1e40af', 0.03)} 0%, ${alpha('#059669', 0.03)} 100%)` }}>
      {/* Modern header design */}
      <Box sx={{ mb: 4, pt: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Box display="flex" alignItems="center" gap={2} mb={1}>
              <Typography 
                variant="h3" 
                sx={{ 
                  fontWeight: 700,
                  color: '#1e40af',
                  letterSpacing: '-0.02em',
                }}
              >
                Previous Employees
              </Typography>
              <Chip 
                label={`${employeeCount} inactive`}
                sx={{
                  background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                  color: '#991b1b',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                }}
              />
            </Box>
            <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.95rem' }}>
              View and manage previously removed employees
            </Typography>
          </Box>
        </Box>
      </Box>

      {message && (
        <Alert 
          severity={message.type}
          onClose={() => setMessage(null)}
          sx={{ 
            mb: 3,
            borderRadius: '8px',
            border: 'none',
          }} 
        >
          {message.text}
        </Alert>
      )}

      {/* Filter card with modern styling */}
      <Card
        sx={{
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
          border: '1px solid rgba(30, 64, 175, 0.1)',
          mb: 3,
          background: '#ffffff',
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box display="flex" gap={2} flexWrap="wrap" alignItems="flex-end">
            <Autocomplete
              options={allUsers}
              getOptionLabel={(option) => option ? `${option.name} (${option.employee_id})` : ''}
              value={selectedSearchUser}
              onChange={(event, newValue) => {
                setSelectedSearchUser(newValue);
                if (newValue) setSearchQuery(newValue.name || '');
                else setSearchQuery('');
              }}
              onInputChange={(event, newInputValue) => {
                setSearchQuery(newInputValue);
                if (!newInputValue) setSelectedSearchUser(null);
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
                  label="Search"
                  placeholder="Name, email, or ID..."
                  size="small"
                  sx={{ minWidth: 280, flex: 1 }}
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <InputAdornment position="start">
                          <Search sx={{ color: '#94a3b8' }} />
                        </InputAdornment>
                        {params.InputProps.startAdornment}
                      </>
                    ),
                  }}
                />
              )}
              noOptionsText="No employees found"
            />
            <TextField
              select
              label="SBU"
              value={selectedSBU}
              onChange={(e) => setSelectedSBU(e.target.value)}
              sx={{ minWidth: 140 }}
              size="small"
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
              sx={{ minWidth: 160 }}
              size="small"
            >
              <MenuItem value="">All Employees</MenuItem>
              <MenuItem value="yes">No Course History</MenuItem>
            </TextField>
            {(selectedSBU || filterNeverTaken || searchQuery) && (
              <Button
                variant="text"
                size="small"
                onClick={() => {
                  setSelectedSBU('');
                  setFilterNeverTaken('');
                  setSearchQuery('');
                  setSelectedSearchUser(null);
                }}
                sx={{ color: '#64748b', fontWeight: 500 }}
              >
                Clear
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress sx={{ color: '#1e40af' }} />
        </Box>
      ) : (
        <Card
          sx={{
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
            border: '1px solid rgba(30, 64, 175, 0.1)',
            overflow: 'hidden',
            background: '#ffffff',
          }}
        >
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ background: 'linear-gradient(135deg, rgba(30, 64, 175, 0.05) 0%, rgba(5, 150, 105, 0.05) 100%)' }}>
                  <TableCell sx={{ fontWeight: 700, color: '#1e40af', fontSize: '0.9rem' }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#1e40af', fontSize: '0.9rem' }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#1e40af', fontSize: '0.9rem' }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#1e40af', fontSize: '0.9rem' }}>SBU</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#1e40af', fontSize: '0.9rem' }}>Designation</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#1e40af', fontSize: '0.9rem' }} align="center">Course History</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#1e40af', fontSize: '0.9rem' }} align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((user) => (
                  <React.Fragment key={user.id}>
                    <TableRow
                      sx={{
                        borderBottom: '1px solid rgba(30, 64, 175, 0.08)',
                        '&:hover': {
                          background: 'linear-gradient(90deg, rgba(30, 64, 175, 0.03) 0%, rgba(5, 150, 105, 0.03) 100%)',
                        },
                        backgroundColor: user.never_taken_course ? alpha('#f59e0b', 0.03) : 'transparent',
                      }}
                    >
                      <TableCell sx={{ color: '#1e40af', fontWeight: 600 }}>{user.employee_id}</TableCell>
                      <TableCell sx={{ fontWeight: 500, color: '#1e3a8a' }}>{user.name}</TableCell>
                      <TableCell sx={{ color: '#64748b' }}>{user.email}</TableCell>
                      <TableCell>
                        <Chip 
                          label={user.sbu} 
                          size="small"
                          sx={{
                            background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                            color: '#1e40af',
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: '#64748b' }}>{user.designation || '-'}</TableCell>
                      <TableCell align="center">
                        {user.enrollments && user.enrollments.length > 0 ? (
                          <IconButton
                            size="small"
                            onClick={() => handleToggleExpand(user.id)}
                            title="View Course History"
                            sx={{ color: '#1e40af' }}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        ) : (
                          <Chip
                            label="No Course History"
                            size="small"
                            sx={{
                              background: alpha('#fbbf24', 0.1),
                              color: '#92400e',
                              fontWeight: 500,
                              border: `1px solid ${alpha('#fbbf24', 0.3)}`,
                            }}
                          />
                        )}
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<PersonAdd />}
                          sx={{
                            background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                            borderRadius: '6px',
                            textTransform: 'none',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            px: 2,
                          }}
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
                                            Start Date: {formatDateForDisplay(enrollment.course_start_date)}
                                          </Typography>
                                        )}
                                        {enrollment.course_end_date && (
                                          <Typography variant="body2" color="text.secondary">
                                            Completion Date: {formatDateForDisplay(enrollment.course_end_date)}
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
        </Card>
      )}

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

