import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  MenuItem, 
  CircularProgress, 
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  IconButton,
  Card,
  CardContent,
  useTheme,
  alpha,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { PersonRemove, CheckCircle, Cancel, Refresh, PersonAdd } from '@mui/icons-material';
import { enrollmentsAPI, coursesAPI, studentsAPI } from '../services/api';
import UserDetailsDialog from '../components/UserDetailsDialog';
import CourseDetailsDialog from '../components/CourseDetailsDialog';

function Enrollments() {
  const theme = useTheme();
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);
  const [filters, setFilters] = useState({
    eligibility_status: '',
    approval_status: 'Pending', // Default to show only pending approvals
    course_id: '',
  });
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [withdrawalReason, setWithdrawalReason] = useState('');
  const [message, setMessage] = useState(null);
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);
  const [selectedUserEnrollment, setSelectedUserEnrollment] = useState(null);
  const [courseDetailsOpen, setCourseDetailsOpen] = useState(false);
  const [selectedCourseEnrollment, setSelectedCourseEnrollment] = useState(null);
  const [manualEnrollDialogOpen, setManualEnrollDialogOpen] = useState(false);
  const [manualEnrollData, setManualEnrollData] = useState({
    student_id: '',
    course_id: '',
  });

  useEffect(() => {
    fetchCourses();
    fetchStudents();
    fetchEnrollments();
  }, []);

  useEffect(() => {
    fetchEnrollments();
  }, [filters]);

  const fetchCourses = async () => {
    try {
      const response = await coursesAPI.getAll({ archived: false });
      setCourses(response.data);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await studentsAPI.getAll({ limit: 1000 });
      setStudents(response.data);
    } catch (error) {
      console.error('Error fetching students:', error);
    }
  };

  const fetchEnrollments = async () => {
    setLoading(true);
    try {
      const params = {};
      // Handle "Not Eligible" filter on frontend since backend expects specific status values
      if (filters.eligibility_status && filters.eligibility_status !== 'Not Eligible') {
        params.eligibility_status = filters.eligibility_status;
      }
      if (filters.approval_status) params.approval_status = filters.approval_status;
      if (filters.course_id) params.course_id = filters.course_id;
      
      const response = await enrollmentsAPI.getAll(params);
      let filteredEnrollments = response.data;
      
      // Filter for "Not Eligible" on frontend if selected
      if (filters.eligibility_status === 'Not Eligible') {
        filteredEnrollments = filteredEnrollments.filter(e => e.eligibility_status !== 'Eligible');
      }
      
      setEnrollments(filteredEnrollments);
    } catch (error) {
      console.error('Error fetching enrollments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await enrollmentsAPI.approve({ enrollment_id: id, approved: true }, 'Admin');
      setMessage({ type: 'success', text: 'Enrollment approved successfully' });
      fetchEnrollments();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Error approving enrollment' });
    }
  };

  const handleReject = async (id) => {
    try {
      await enrollmentsAPI.approve(
        { enrollment_id: id, approved: false, rejection_reason: 'Rejected by admin' },
        'Admin'
      );
      setMessage({ type: 'success', text: 'Enrollment rejected' });
      fetchEnrollments();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Error rejecting enrollment' });
    }
  };

  const handleReapprove = async (id) => {
    try {
      await enrollmentsAPI.reapprove(id, 'Admin');
      setMessage({ type: 'success', text: 'Enrollment reapproved successfully' });
      fetchEnrollments();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Error reapproving enrollment' });
    }
  };

  const handleWithdraw = (enrollment) => {
    setSelectedEnrollment(enrollment);
    setWithdrawalReason('');
    setWithdrawDialogOpen(true);
  };

  const handleWithdrawConfirm = async () => {
    if (!withdrawalReason.trim()) {
      setMessage({ type: 'error', text: 'Please provide a reason for withdrawal' });
      return;
    }

    try {
      await enrollmentsAPI.withdraw(selectedEnrollment.id, withdrawalReason, 'Admin');
      setMessage({ type: 'success', text: 'Student withdrawn successfully' });
      setWithdrawDialogOpen(false);
      setSelectedEnrollment(null);
      setWithdrawalReason('');
      fetchEnrollments();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Error withdrawing student' });
    }
  };

  const handleWithdrawCancel = () => {
    setWithdrawDialogOpen(false);
    setSelectedEnrollment(null);
    setWithdrawalReason('');
  };

  const handleViewUserDetails = (enrollment) => {
    setSelectedUserEnrollment(enrollment);
    setUserDetailsOpen(true);
  };

  const handleViewCourseDetails = (enrollment) => {
    setSelectedCourseEnrollment(enrollment);
    setCourseDetailsOpen(true);
  };

  const handleManualEnroll = () => {
    setManualEnrollData({ student_id: '', course_id: '' });
    setManualEnrollDialogOpen(true);
  };

  const handleManualEnrollConfirm = async () => {
    if (!manualEnrollData.student_id || !manualEnrollData.course_id) {
      setMessage({ type: 'error', text: 'Please select both student and course' });
      return;
    }

    try {
      await enrollmentsAPI.create({
        student_id: parseInt(manualEnrollData.student_id),
        course_id: parseInt(manualEnrollData.course_id),
      });
      setMessage({ type: 'success', text: 'Student enrolled and automatically approved successfully' });
      setManualEnrollDialogOpen(false);
      setManualEnrollData({ student_id: '', course_id: '' });
      fetchEnrollments();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Error creating enrollment' });
    }
  };

  const handleManualEnrollCancel = () => {
    setManualEnrollDialogOpen(false);
    setManualEnrollData({ student_id: '', course_id: '' });
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
            Enrollments & Approvals
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            View, manage, and approve all course enrollments
          </Typography>
        </Box>
        <Box display="flex" gap={2}>
          <Button
            variant="contained"
            startIcon={<PersonAdd />}
            onClick={handleManualEnroll}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 500,
              boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
              '&:hover': {
                boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.4)}`,
              },
            }}
          >
            Manual Enrollment
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
          <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
            <TextField
              select
              label="Course"
              value={filters.course_id}
              onChange={(e) => setFilters({ ...filters, course_id: e.target.value })}
              sx={{ minWidth: 200 }}
              variant="outlined"
            >
              <MenuItem value="">All Courses</MenuItem>
              {courses.map((course) => (
                <MenuItem key={course.id} value={course.id}>
                  {course.name} - {course.batch_code}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Eligibility Status"
              value={filters.eligibility_status}
              onChange={(e) => setFilters({ ...filters, eligibility_status: e.target.value })}
              sx={{ minWidth: 200 }}
              variant="outlined"
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="Eligible">Eligible</MenuItem>
              <MenuItem value="Not Eligible">Not Eligible</MenuItem>
            </TextField>
            <TextField
              select
              label="Approval Status"
              value={filters.approval_status}
              onChange={(e) => setFilters({ ...filters, approval_status: e.target.value })}
              sx={{ minWidth: 200 }}
              variant="outlined"
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="Pending">Pending</MenuItem>
              <MenuItem value="Approved">Approved</MenuItem>
              <MenuItem value="Rejected">Rejected</MenuItem>
              <MenuItem value="Withdrawn">Withdrawn</MenuItem>
            </TextField>
          </Box>
        </CardContent>
      </Card>

      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : (
        <Box display="flex" flexDirection="column" gap={3}>
          {/* Eligible Enrollments Section */}
          {enrollments.filter(e => e.eligibility_status === 'Eligible').length > 0 && (
            <Card
              sx={{
                borderRadius: 3,
                boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.1)}`,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                overflow: 'hidden',
              }}
            >
              <CardContent>
                <Typography 
                  variant="h6" 
                  gutterBottom
                  sx={{ 
                    mb: 2,
                    color: theme.palette.success.main,
                    fontWeight: 600,
                  }}
                >
                  Eligible Enrollments ({enrollments.filter(e => e.eligibility_status === 'Eligible').length})
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: alpha(theme.palette.success.main, 0.1) }}>
                        <TableCell sx={{ fontWeight: 600 }}>Employee ID</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Student Name</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>SBU</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Course</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Batch</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Approval</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Overall Completion</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {enrollments
                        .filter(enrollment => enrollment.eligibility_status === 'Eligible')
                        .map((enrollment) => (
                          <TableRow key={enrollment.id} hover>
                            <TableCell>
                              <Typography
                                sx={{
                                  cursor: 'pointer',
                                  color: 'primary.main',
                                  textDecoration: 'underline',
                                  '&:hover': {
                                    color: 'primary.dark',
                                  },
                                }}
                                onClick={() => handleViewUserDetails(enrollment)}
                              >
                                {enrollment.student_employee_id || '-'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography
                                sx={{
                                  cursor: 'pointer',
                                  color: 'primary.main',
                                  textDecoration: 'underline',
                                  '&:hover': {
                                    color: 'primary.dark',
                                  },
                                }}
                                onClick={() => handleViewUserDetails(enrollment)}
                              >
                                {enrollment.student_name}
                              </Typography>
                            </TableCell>
                            <TableCell>{enrollment.student_email}</TableCell>
                            <TableCell>{enrollment.student_sbu}</TableCell>
                            <TableCell>{enrollment.course_name}</TableCell>
                            <TableCell>{enrollment.batch_code}</TableCell>
                            <TableCell>
                              <Chip
                                label={enrollment.approval_status}
                                color={
                                  enrollment.approval_status === 'Approved' ? 'success' :
                                  enrollment.approval_status === 'Pending' ? 'warning' :
                                  enrollment.approval_status === 'Withdrawn' ? 'error' : 'default'
                                }
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              {(() => {
                                const rate = enrollment.overall_completion_rate || 0;
                                let color = 'error.main';
                                if (rate >= 75) {
                                  color = 'success.main';
                                } else if (rate >= 60) {
                                  color = 'warning.main';
                                }
                                return (
                                  <Typography
                                    sx={{
                                      color: color,
                                      fontWeight: 600,
                                    }}
                                  >
                                    {rate}% ({enrollment.completed_courses || 0}/{enrollment.total_courses_assigned || 0})
                                  </Typography>
                                );
                              })()}
                            </TableCell>
                            <TableCell>
                              <Box display="flex" gap={1}>
                                {enrollment.approval_status === 'Pending' && (
                                  <>
                                    <IconButton
                                      size="small"
                                      color="success"
                                      onClick={() => handleApprove(enrollment.id)}
                                      title="Approve"
                                    >
                                      <CheckCircle />
                                    </IconButton>
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => handleReject(enrollment.id)}
                                      title="Reject"
                                    >
                                      <Cancel />
                                    </IconButton>
                                  </>
                                )}
                                {enrollment.approval_status === 'Approved' && (
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => handleWithdraw(enrollment)}
                                    title="Withdraw Student"
                                  >
                                    <PersonRemove />
                                  </IconButton>
                                )}
                                {enrollment.approval_status === 'Withdrawn' && (
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={() => handleReapprove(enrollment.id)}
                                    title="Reapprove"
                                  >
                                    <Refresh />
                                  </IconButton>
                                )}
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          )}

          {/* Not Eligible Enrollments Section */}
          {enrollments.filter(e => e.eligibility_status !== 'Eligible').length > 0 && (
            <Card
              sx={{
                borderRadius: 3,
                boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.1)}`,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                overflow: 'hidden',
              }}
            >
              <CardContent>
                <Typography 
                  variant="h6" 
                  gutterBottom
                  sx={{ 
                    mb: 2,
                    color: theme.palette.error.main,
                    fontWeight: 600,
                  }}
                >
                  Not Eligible Enrollments ({enrollments.filter(e => e.eligibility_status !== 'Eligible').length})
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow sx={{ backgroundColor: alpha(theme.palette.error.main, 0.1) }}>
                        <TableCell sx={{ fontWeight: 600 }}>Employee ID</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Student Name</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>SBU</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Course</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Batch</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Eligibility</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Approval</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Overall Completion</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {enrollments
                        .filter(enrollment => enrollment.eligibility_status !== 'Eligible')
                        .map((enrollment) => (
                          <TableRow key={enrollment.id} hover>
                            <TableCell>
                              <Typography
                                sx={{
                                  cursor: 'pointer',
                                  color: 'primary.main',
                                  textDecoration: 'underline',
                                  '&:hover': {
                                    color: 'primary.dark',
                                  },
                                }}
                                onClick={() => handleViewUserDetails(enrollment)}
                              >
                                {enrollment.student_employee_id || '-'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography
                                sx={{
                                  cursor: 'pointer',
                                  color: 'primary.main',
                                  textDecoration: 'underline',
                                  '&:hover': {
                                    color: 'primary.dark',
                                  },
                                }}
                                onClick={() => handleViewUserDetails(enrollment)}
                              >
                                {enrollment.student_name}
                              </Typography>
                            </TableCell>
                            <TableCell>{enrollment.student_email}</TableCell>
                            <TableCell>{enrollment.student_sbu}</TableCell>
                            <TableCell>{enrollment.course_name}</TableCell>
                            <TableCell>{enrollment.batch_code}</TableCell>
                            <TableCell>
                              <Box>
                                <Chip
                                  label={enrollment.eligibility_status}
                                  color="error"
                                  size="small"
                                  sx={{ mb: enrollment.eligibility_reason ? 0.5 : 0 }}
                                />
                                {enrollment.eligibility_reason && (
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      display: 'block',
                                      color: 'text.secondary',
                                      mt: 0.5,
                                      fontStyle: 'italic',
                                    }}
                                  >
                                    {enrollment.eligibility_reason}
                                  </Typography>
                                )}
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={enrollment.approval_status}
                                color={
                                  enrollment.approval_status === 'Approved' ? 'success' :
                                  enrollment.approval_status === 'Pending' ? 'warning' :
                                  enrollment.approval_status === 'Withdrawn' ? 'error' : 'default'
                                }
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              {(() => {
                                const rate = enrollment.overall_completion_rate || 0;
                                let color = 'error.main';
                                if (rate >= 75) {
                                  color = 'success.main';
                                } else if (rate >= 60) {
                                  color = 'warning.main';
                                }
                                return (
                                  <Typography
                                    sx={{
                                      color: color,
                                      fontWeight: 600,
                                    }}
                                  >
                                    {rate}% ({enrollment.completed_courses || 0}/{enrollment.total_courses_assigned || 0})
                                  </Typography>
                                );
                              })()}
                            </TableCell>
                            <TableCell>
                              <Box display="flex" gap={1}>
                                {enrollment.approval_status === 'Pending' && (
                                  <>
                                    <IconButton
                                      size="small"
                                      color="success"
                                      onClick={() => handleApprove(enrollment.id)}
                                      disabled
                                      title="Cannot approve ineligible enrollment"
                                    >
                                      <CheckCircle />
                                    </IconButton>
                                    <IconButton
                                      size="small"
                                      color="error"
                                      onClick={() => handleReject(enrollment.id)}
                                      title="Reject"
                                    >
                                      <Cancel />
                                    </IconButton>
                                  </>
                                )}
                                {enrollment.approval_status === 'Approved' && (
                                  <IconButton
                                    size="small"
                                    color="error"
                                    onClick={() => handleWithdraw(enrollment)}
                                    title="Withdraw Student"
                                  >
                                    <PersonRemove />
                                  </IconButton>
                                )}
                                {enrollment.approval_status === 'Withdrawn' && (
                                  <IconButton
                                    size="small"
                                    color="primary"
                                    onClick={() => handleReapprove(enrollment.id)}
                                    title="Reapprove"
                                  >
                                    <Refresh />
                                  </IconButton>
                                )}
                              </Box>
                            </TableCell>
                          </TableRow>
                        ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          )}

          {enrollments.length === 0 && !loading && (
            <Card
              sx={{
                borderRadius: 3,
                boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.1)}`,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
              }}
            >
              <CardContent>
                <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 4 }}>
                  No enrollments found matching the selected filters.
                </Typography>
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      {/* Withdraw Dialog */}
      <Dialog 
        open={withdrawDialogOpen} 
        onClose={handleWithdrawCancel} 
        maxWidth="sm" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: `0 8px 32px ${alpha(theme.palette.error.main, 0.2)}`,
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>Withdraw Student from Course</DialogTitle>
        <DialogContent>
          {selectedEnrollment && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body1" gutterBottom>
                <strong>Student:</strong> {selectedEnrollment.student_name}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <strong>Course:</strong> {selectedEnrollment.course_name} - {selectedEnrollment.batch_code}
              </Typography>
              <TextField
                label="Reason for Withdrawal"
                multiline
                rows={4}
                fullWidth
                value={withdrawalReason}
                onChange={(e) => setWithdrawalReason(e.target.value)}
                placeholder="e.g., Misbehavior, Violation of code of conduct, etc."
                sx={{ mt: 2 }}
                required
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleWithdrawCancel}>Cancel</Button>
          <Button onClick={handleWithdrawConfirm} color="error" variant="contained">
            Withdraw
          </Button>
        </DialogActions>
      </Dialog>

      {/* User Details Dialog */}
      <UserDetailsDialog
        open={userDetailsOpen}
        onClose={() => {
          setUserDetailsOpen(false);
          setSelectedUserEnrollment(null);
        }}
        enrollment={selectedUserEnrollment}
        onViewCourseDetails={handleViewCourseDetails}
        onApprove={handleApprove}
        onReject={handleReject}
        onReapprove={handleReapprove}
      />

      {/* Course Details Dialog */}
      <CourseDetailsDialog
        open={courseDetailsOpen}
        onClose={() => {
          setCourseDetailsOpen(false);
          setSelectedCourseEnrollment(null);
        }}
        enrollment={selectedCourseEnrollment}
      />

      {/* Manual Enrollment Dialog */}
      <Dialog
        open={manualEnrollDialogOpen}
        onClose={handleManualEnrollCancel}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.2)}`,
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>Manual Enrollment</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              select
              label="Select Student"
              value={manualEnrollData.student_id}
              onChange={(e) => setManualEnrollData({ ...manualEnrollData, student_id: e.target.value })}
              fullWidth
              required
            >
              <MenuItem value="">Select a student...</MenuItem>
              {students.map((student) => (
                <MenuItem key={student.id} value={student.id}>
                  {student.name} ({student.employee_id}) - {student.email}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              label="Select Course"
              value={manualEnrollData.course_id}
              onChange={(e) => setManualEnrollData({ ...manualEnrollData, course_id: e.target.value })}
              fullWidth
              required
            >
              <MenuItem value="">Select a course...</MenuItem>
              {courses.map((course) => (
                <MenuItem key={course.id} value={course.id}>
                  {course.name} - {course.batch_code}
                </MenuItem>
              ))}
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleManualEnrollCancel}>Cancel</Button>
          <Button onClick={handleManualEnrollConfirm} variant="contained">
            Create Enrollment
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Enrollments;
