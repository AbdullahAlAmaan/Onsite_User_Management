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
import UserDetailsDialog from '../components/UserDetailsDialog';
import CourseDetailsDialog from '../components/CourseDetailsDialog';

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

  const handleViewDetails = (enrollment) => {
    setSelectedEnrollment(enrollment);
    setDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    setSelectedEnrollment(null);
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
      <UserDetailsDialog
        open={detailsOpen}
        onClose={() => {
          handleCloseDetails();
        }}
        enrollment={selectedEnrollment}
        onViewCourseDetails={handleViewCourseDetails}
        onApprove={handleApprove}
        onReject={handleReject}
      />

      {/* Course Details Dialog */}
      <CourseDetailsDialog
        open={courseDetailsOpen}
        onClose={handleCloseCourseDetails}
        enrollment={selectedCourseEnrollment}
      />
    </Box>
  );
}

export default InstructorDashboard;

