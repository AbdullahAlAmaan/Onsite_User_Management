import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Typography,
  Chip,
  Divider,
  Box,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { Visibility } from '@mui/icons-material';
import { studentsAPI } from '../services/api';

function UserDetailsDialog({ open, onClose, enrollment, onViewCourseDetails, onApprove, onReject }) {
  const [studentEnrollments, setStudentEnrollments] = useState([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);

  useEffect(() => {
    if (open && enrollment?.student_id) {
      fetchStudentEnrollments();
    } else {
      setStudentEnrollments([]);
    }
  }, [open, enrollment]);

  const fetchStudentEnrollments = async () => {
    if (!enrollment?.student_id) return;
    
    setLoadingEnrollments(true);
    try {
      const response = await studentsAPI.getEnrollments(enrollment.student_id);
      setStudentEnrollments(response.data);
    } catch (error) {
      console.error('Error fetching student enrollments:', error);
      setStudentEnrollments([]);
    } finally {
      setLoadingEnrollments(false);
    }
  };

  if (!enrollment) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        User Details - {enrollment.student_name}
      </DialogTitle>
      <DialogContent>
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
              {enrollment.student_employee_id || 'N/A'}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Name
            </Typography>
            <Typography variant="body1" gutterBottom>
              {enrollment.student_name}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Email
            </Typography>
            <Typography variant="body1" gutterBottom>
              {enrollment.student_email}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              SBU
            </Typography>
            <Typography variant="body1" gutterBottom>
              <Chip label={enrollment.student_sbu} size="small" />
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Designation
            </Typography>
            <Typography variant="body1" gutterBottom>
              {enrollment.student_designation || 'N/A'}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Experience (Years)
            </Typography>
            <Typography variant="body1" gutterBottom>
              {enrollment.student_experience_years ?? 'N/A'}
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
                              enrollment.approval_status === 'Rejected' ? 'error' :
                              enrollment.approval_status === 'Withdrawn' ? 'error' : 'default'
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
                          {onViewCourseDetails && (
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<Visibility />}
                              onClick={() => onViewCourseDetails(enrollment)}
                            >
                              Details
                            </Button>
                          )}
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
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {enrollment && enrollment.eligibility_status === 'Eligible' && onApprove && onReject && (
          <>
            <Button
              color="success"
              variant="contained"
              onClick={() => {
                onApprove(enrollment.id);
                onClose();
              }}
            >
              Approve
            </Button>
            <Button
              color="error"
              variant="outlined"
              onClick={() => {
                onReject(enrollment.id);
                onClose();
              }}
            >
              Reject
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default UserDetailsDialog;

