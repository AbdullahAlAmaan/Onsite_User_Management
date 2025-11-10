import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  TextField,
  MenuItem,
  Checkbox,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Divider,
} from '@mui/material';
import { CheckCircle, Cancel, Visibility } from '@mui/icons-material';
import { enrollmentsAPI, coursesAPI, studentsAPI } from '../services/api';

function InstructorDashboard() {
  const [enrollments, setEnrollments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedSBU, setSelectedSBU] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [studentEnrollments, setStudentEnrollments] = useState([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [selectedCourseEnrollment, setSelectedCourseEnrollment] = useState(null);
  const [courseDetailsOpen, setCourseDetailsOpen] = useState(false);

  useEffect(() => {
    fetchCourses();
    fetchEnrollments();
  }, []);

  useEffect(() => {
    fetchEnrollments();
  }, [selectedCourse, selectedSBU]);

  const fetchCourses = async () => {
    try {
      const response = await coursesAPI.getAll({ archived: false });
      setCourses(response.data);
    } catch (error) {
      console.error('Error fetching courses:', error);
    }
  };

  const fetchEnrollments = async () => {
    setLoading(true);
    try {
      // Get all pending enrollments (both eligible and ineligible)
      const params = {};
      if (selectedCourse) params.course_id = selectedCourse;
      if (selectedSBU) params.sbu = selectedSBU;
      params.approval_status = 'Pending';
      
      const response = await enrollmentsAPI.getAll(params);
      // Show all pending enrollments (both eligible and ineligible)
      setEnrollments(response.data);
    } catch (error) {
      console.error('Error fetching enrollments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedIds(new Set(enrollments.map(e => e.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectOne = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) {
      setMessage({ type: 'error', text: 'Please select at least one enrollment' });
      return;
    }

    // Filter to only eligible enrollments
    const eligibleIds = enrollments
      .filter(e => selectedIds.has(e.id) && e.eligibility_status === 'Eligible')
      .map(e => e.id);

    if (eligibleIds.length === 0) {
      setMessage({ type: 'error', text: 'No eligible enrollments selected. Only eligible enrollments can be approved.' });
      return;
    }

    if (eligibleIds.length < selectedIds.size) {
      setMessage({ type: 'warning', text: `Only ${eligibleIds.length} eligible enrollment(s) will be approved. Ineligible enrollments were skipped.` });
    }

    try {
      const approvedBy = 'Admin'; // Admin performs all approvals
      await enrollmentsAPI.bulkApprove(
        { enrollment_ids: eligibleIds, approved: true },
        approvedBy
      );
      setMessage({ type: 'success', text: 'Enrollments approved successfully' });
      setSelectedIds(new Set());
      fetchEnrollments();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Error approving enrollments' });
    }
  };

  const handleApprove = async (id) => {
    try {
      const approvedBy = 'Admin';
      await enrollmentsAPI.approve({ enrollment_id: id, approved: true }, approvedBy);
      setMessage({ type: 'success', text: 'Enrollment approved successfully' });
      fetchEnrollments();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Error approving enrollment' });
    }
  };

  const handleReject = async (id) => {
    try {
      const approvedBy = 'Admin';
      await enrollmentsAPI.approve(
        { enrollment_id: id, approved: false, rejection_reason: 'Rejected by admin' },
        approvedBy
      );
      setMessage({ type: 'success', text: 'Enrollment rejected' });
      fetchEnrollments();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Error rejecting enrollment' });
    }
  };

  const handleViewDetails = async (enrollment) => {
    setSelectedEnrollment(enrollment);
    setDetailsOpen(true);
    setLoadingEnrollments(true);
    
    try {
      // Fetch all enrollments for this student
      const response = await studentsAPI.getEnrollments(enrollment.student_id);
      setStudentEnrollments(response.data);
    } catch (error) {
      console.error('Error fetching student enrollments:', error);
      setStudentEnrollments([]);
    } finally {
      setLoadingEnrollments(false);
    }
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedEnrollment(null);
    setStudentEnrollments([]);
    setSelectedCourseEnrollment(null);
  };

  const handleViewCourseDetails = (enrollment) => {
    setSelectedCourseEnrollment(enrollment);
    setCourseDetailsOpen(true);
  };

  const handleCloseCourseDetails = () => {
    setCourseDetailsOpen(false);
    setSelectedCourseEnrollment(null);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Approval Dashboard
      </Typography>

      {message && (
        <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            View all pending enrollments 
          </Typography>
          <Box display="flex" gap={2} flexWrap="wrap">
            <TextField
              select
              label="Filter by Course"
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              sx={{ minWidth: 200 }}
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
              label="Filter by SBU"
              value={selectedSBU}
              onChange={(e) => setSelectedSBU(e.target.value)}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="">All SBUs</MenuItem>
              <MenuItem value="IT">IT</MenuItem>
              <MenuItem value="HR">HR</MenuItem>
              <MenuItem value="Finance">Finance</MenuItem>
              <MenuItem value="Operations">Operations</MenuItem>
              <MenuItem value="Sales">Sales</MenuItem>
              <MenuItem value="Marketing">Marketing</MenuItem>
            </TextField>
            {selectedIds.size > 0 && (
              <Button
                variant="contained"
                color="primary"
                onClick={handleBulkApprove}
              >
                Approve Selected ({selectedIds.size})
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selectedIds.size > 0 && selectedIds.size < enrollments.length}
                    checked={enrollments.length > 0 && selectedIds.size === enrollments.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>SBU</TableCell>
                <TableCell>Course</TableCell>
                <TableCell>Batch Code</TableCell>
                <TableCell>Eligibility</TableCell>
                <TableCell>Actions</TableCell>
                <TableCell>Details</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {enrollments.map((enrollment) => (
                <TableRow 
                  key={enrollment.id}
                  sx={{ 
                    cursor: 'pointer',
                    '&:hover': { backgroundColor: 'action.hover' }
                  }}
                  onClick={() => handleViewDetails(enrollment)}
                >
                  <TableCell padding="checkbox" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(enrollment.id)}
                      onChange={() => handleSelectOne(enrollment.id)}
                    />
                  </TableCell>
                  <TableCell>{enrollment.student_name}</TableCell>
                  <TableCell>{enrollment.student_email}</TableCell>
                  <TableCell>
                    <Chip label={enrollment.student_sbu} size="small" />
                  </TableCell>
                  <TableCell>{enrollment.course_name}</TableCell>
                  <TableCell>{enrollment.batch_code}</TableCell>
                  <TableCell>
                    <Chip
                      label={enrollment.eligibility_status}
                      color={enrollment.eligibility_status === 'Eligible' ? 'success' : 'error'}
                      size="small"
                    />
                    {enrollment.eligibility_reason && (
                      <Typography variant="caption" color="error" display="block">
                        {enrollment.eligibility_reason}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="small"
                      color="success"
                      startIcon={<CheckCircle />}
                      onClick={() => handleApprove(enrollment.id)}
                      disabled={enrollment.eligibility_status !== 'Eligible'}
                    >
                      Approve
                    </Button>
                    <Button
                      size="small"
                      color="error"
                      startIcon={<Cancel />}
                      onClick={() => handleReject(enrollment.id)}
                      sx={{ ml: 1 }}
                    >
                      Reject
                    </Button>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Visibility />}
                      onClick={() => handleViewDetails(enrollment)}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {enrollments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    No new submissions pending approval. 
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* User Details Dialog */}
      <Dialog 
        open={detailsOpen} 
        onClose={handleCloseDetails}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          User Details - {selectedEnrollment?.student_name}
        </DialogTitle>
        <DialogContent>
          {selectedEnrollment && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Student Information
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Employee ID
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedEnrollment.student_employee_id || 'N/A'}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Name
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedEnrollment.student_name}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Email
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedEnrollment.student_email}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  SBU
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <Chip label={selectedEnrollment.student_sbu} size="small" />
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Designation
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedEnrollment.student_designation || 'N/A'}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Experience (Years)
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedEnrollment.student_experience_years ?? 'N/A'}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Enrollment Information
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Course
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedEnrollment.course_name}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Batch Code
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedEnrollment.batch_code}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Eligibility Status
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <Chip
                    label={selectedEnrollment.eligibility_status}
                    color={selectedEnrollment.eligibility_status === 'Eligible' ? 'success' : 'error'}
                    size="small"
                  />
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Approval Status
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <Chip
                    label={selectedEnrollment.approval_status}
                    color={
                      selectedEnrollment.approval_status === 'Approved' ? 'success' :
                      selectedEnrollment.approval_status === 'Pending' ? 'warning' : 'error'
                    }
                    size="small"
                  />
                </Typography>
              </Grid>
              
              {selectedEnrollment.eligibility_reason && (
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Eligibility Reason
                  </Typography>
                  <Alert severity="error" sx={{ mt: 1 }}>
                    {selectedEnrollment.eligibility_reason}
                  </Alert>
                </Grid>
              )}
              
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Eligibility Checked At
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedEnrollment.eligibility_checked_at 
                    ? new Date(selectedEnrollment.eligibility_checked_at).toLocaleString()
                    : 'N/A'}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Created At
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {new Date(selectedEnrollment.created_at).toLocaleString()}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Course History
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {loadingEnrollments ? (
                  <Box display="flex" justifyContent="center" p={2}>
                    <CircularProgress size={24} />
                  </Box>
                ) : studentEnrollments.length > 0 ? (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Course</TableCell>
                          <TableCell>Batch</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Completion</TableCell>
                          <TableCell>Score</TableCell>
                          <TableCell>Date</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {studentEnrollments.map((enrollment) => (
                          <TableRow key={enrollment.id} hover>
                            <TableCell>{enrollment.course_name}</TableCell>
                            <TableCell>{enrollment.batch_code}</TableCell>
                            <TableCell>
                              <Chip
                                label={enrollment.approval_status}
                                color={
                                  enrollment.approval_status === 'Approved' ? 'success' :
                                  enrollment.approval_status === 'Pending' ? 'warning' :
                                  enrollment.approval_status === 'Rejected' ? 'error' : 'default'
                                }
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={enrollment.completion_status}
                                color={
                                  enrollment.completion_status === 'Completed' ? 'success' :
                                  enrollment.completion_status === 'In Progress' ? 'info' :
                                  enrollment.completion_status === 'Failed' ? 'error' : 'default'
                                }
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              {enrollment.score !== null ? `${enrollment.score}%` : '-'}
                            </TableCell>
                            <TableCell>
                              {enrollment.completion_date 
                                ? new Date(enrollment.completion_date).toLocaleDateString()
                                : enrollment.created_at 
                                ? new Date(enrollment.created_at).toLocaleDateString()
                                : '-'}
                            </TableCell>
                            <TableCell>
                              <Button
                                size="small"
                                variant="outlined"
                                startIcon={<Visibility />}
                                onClick={() => handleViewCourseDetails(enrollment)}
                              >
                                Details
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No course history available.
                  </Typography>
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDetails}>Close</Button>
          {selectedEnrollment && selectedEnrollment.eligibility_status === 'Eligible' && (
            <>
              <Button
                color="success"
                variant="contained"
                startIcon={<CheckCircle />}
                onClick={() => {
                  handleApprove(selectedEnrollment.id);
                  handleCloseDetails();
                }}
              >
                Approve
              </Button>
              <Button
                color="error"
                variant="outlined"
                startIcon={<Cancel />}
                onClick={() => {
                  handleReject(selectedEnrollment.id);
                  handleCloseDetails();
                }}
              >
                Reject
              </Button>
            </>
          )}
        </DialogActions>
      </Dialog>

      {/* Course Details Dialog */}
      <Dialog 
        open={courseDetailsOpen} 
        onClose={handleCloseCourseDetails}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Course Details - {selectedCourseEnrollment?.course_name}
        </DialogTitle>
        <DialogContent>
          {selectedCourseEnrollment && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Course Information
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Course Name
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedCourseEnrollment.course_name}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Batch Code
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedCourseEnrollment.batch_code}
                </Typography>
              </Grid>
              
              {selectedCourseEnrollment.course_start_date && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Start Date
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {new Date(selectedCourseEnrollment.course_start_date).toLocaleDateString()}
                  </Typography>
                </Grid>
              )}
              
              {selectedCourseEnrollment.course_end_date && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    End Date
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {new Date(selectedCourseEnrollment.course_end_date).toLocaleDateString()}
                  </Typography>
                </Grid>
              )}
              
              <Grid item xs={12} sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Enrollment Status
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Approval Status
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <Chip
                    label={selectedCourseEnrollment.approval_status}
                    color={
                      selectedCourseEnrollment.approval_status === 'Approved' ? 'success' :
                      selectedCourseEnrollment.approval_status === 'Pending' ? 'warning' :
                      selectedCourseEnrollment.approval_status === 'Rejected' ? 'error' : 'default'
                    }
                    size="small"
                  />
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Eligibility Status
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <Chip
                    label={selectedCourseEnrollment.eligibility_status}
                    color={selectedCourseEnrollment.eligibility_status === 'Eligible' ? 'success' : 'error'}
                    size="small"
                  />
                </Typography>
              </Grid>
              
              {selectedCourseEnrollment.approved_by && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Approved By
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {selectedCourseEnrollment.approved_by}
                  </Typography>
                </Grid>
              )}
              
              {selectedCourseEnrollment.approved_at && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Approved At
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {new Date(selectedCourseEnrollment.approved_at).toLocaleString()}
                  </Typography>
                </Grid>
              )}
              
              {selectedCourseEnrollment.rejection_reason && (
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Rejection Reason
                  </Typography>
                  <Alert severity="error" sx={{ mt: 1 }}>
                    {selectedCourseEnrollment.rejection_reason}
                  </Alert>
                </Grid>
              )}
              
              <Grid item xs={12} sx={{ mt: 2 }}>
                <Typography variant="h6" gutterBottom>
                  Completion & Assessment
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Completion Status
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <Chip
                    label={selectedCourseEnrollment.completion_status}
                    color={
                      selectedCourseEnrollment.completion_status === 'Completed' ? 'success' :
                      selectedCourseEnrollment.completion_status === 'In Progress' ? 'info' :
                      selectedCourseEnrollment.completion_status === 'Failed' ? 'error' : 'default'
                    }
                    size="small"
                  />
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Assessment Completed
                </Typography>
                <Typography variant="body1" gutterBottom>
                  <Chip
                    label={selectedCourseEnrollment.completion_status === 'Completed' || selectedCourseEnrollment.completion_status === 'Failed' ? 'Yes' : 'No'}
                    color={selectedCourseEnrollment.completion_status === 'Completed' || selectedCourseEnrollment.completion_status === 'Failed' ? 'success' : 'default'}
                    size="small"
                  />
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Score
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedCourseEnrollment.score !== null ? `${selectedCourseEnrollment.score}%` : 'Not Available'}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Attendance
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {selectedCourseEnrollment.attendance_percentage !== null ? `${selectedCourseEnrollment.attendance_percentage}%` : 'Not Available'}
                </Typography>
              </Grid>
              
              {selectedCourseEnrollment.completion_date && (
                <Grid item xs={12} sm={6}>
                  <Typography variant="body2" color="text.secondary">
                    Completion Date
                  </Typography>
                  <Typography variant="body1" gutterBottom>
                    {new Date(selectedCourseEnrollment.completion_date).toLocaleString()}
                  </Typography>
                </Grid>
              )}
              
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">
                  Enrollment Date
                </Typography>
                <Typography variant="body1" gutterBottom>
                  {new Date(selectedCourseEnrollment.created_at).toLocaleString()}
                </Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCourseDetails}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default InstructorDashboard;

