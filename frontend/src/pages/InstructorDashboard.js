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
} from '@mui/material';
import { CheckCircle, Cancel } from '@mui/icons-material';
import { enrollmentsAPI, coursesAPI } from '../services/api';

function InstructorDashboard() {
  const [enrollments, setEnrollments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedSBU, setSelectedSBU] = useState('');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

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
      const params = {};
      if (selectedCourse) params.course_id = selectedCourse;
      if (selectedSBU) params.sbu = selectedSBU;
      
      const response = await enrollmentsAPI.getEligible(params);
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

    try {
      const approvedBy = 'Instructor'; // In real app, get from auth context
      await enrollmentsAPI.bulkApprove(
        { enrollment_ids: Array.from(selectedIds), approved: true },
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
      const approvedBy = 'Instructor';
      await enrollmentsAPI.approve({ enrollment_id: id, approved: true }, approvedBy);
      setMessage({ type: 'success', text: 'Enrollment approved successfully' });
      fetchEnrollments();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Error approving enrollment' });
    }
  };

  const handleReject = async (id) => {
    try {
      const approvedBy = 'Instructor';
      await enrollmentsAPI.approve(
        { enrollment_id: id, approved: false, rejection_reason: 'Rejected by instructor' },
        approvedBy
      );
      setMessage({ type: 'success', text: 'Enrollment rejected' });
      fetchEnrollments();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Error rejecting enrollment' });
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Instructor Dashboard
      </Typography>

      {message && (
        <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      <Card sx={{ mb: 3 }}>
        <CardContent>
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
                <TableCell>Employee ID</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>SBU</TableCell>
                <TableCell>Course</TableCell>
                <TableCell>Batch Code</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {enrollments.map((enrollment) => (
                <TableRow key={enrollment.id}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedIds.has(enrollment.id)}
                      onChange={() => handleSelectOne(enrollment.id)}
                    />
                  </TableCell>
                  <TableCell>{enrollment.student_name}</TableCell>
                  <TableCell>{enrollment.student_name}</TableCell>
                  <TableCell>{enrollment.student_email}</TableCell>
                  <TableCell>
                    <Chip label={enrollment.student_sbu} size="small" />
                  </TableCell>
                  <TableCell>{enrollment.course_name}</TableCell>
                  <TableCell>{enrollment.batch_code}</TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      color="success"
                      startIcon={<CheckCircle />}
                      onClick={() => handleApprove(enrollment.id)}
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
                </TableRow>
              ))}
              {enrollments.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    No eligible enrollments pending approval
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

export default InstructorDashboard;

