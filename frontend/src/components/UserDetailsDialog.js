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
  Card,
  CardContent,
  useTheme,
  alpha,
} from '@mui/material';
import { studentsAPI } from '../services/api';

function UserDetailsDialog({ open, onClose, enrollment, onViewCourseDetails, onApprove, onReject, onReapprove }) {
  const theme = useTheme();
  const [studentEnrollments, setStudentEnrollments] = useState([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);

  const fetchStudentEnrollments = async () => {
    if (!enrollment?.student_id) {
      console.log('UserDetailsDialog: No student_id in enrollment:', enrollment);
      return;
    }
    
    setLoadingEnrollments(true);
    try {
      console.log('UserDetailsDialog: Fetching enrollments for student_id:', enrollment.student_id);
      const response = await studentsAPI.getEnrollments(enrollment.student_id);
      console.log('UserDetailsDialog: Received enrollments:', response.data);
      setStudentEnrollments(response.data || []);
    } catch (error) {
      console.error('UserDetailsDialog: Error fetching student enrollments:', error);
      setStudentEnrollments([]);
    } finally {
      setLoadingEnrollments(false);
    }
  };

  useEffect(() => {
    console.log('UserDetailsDialog: useEffect triggered, open:', open, 'enrollment:', enrollment);
    if (open && enrollment?.student_id) {
      fetchStudentEnrollments();
    } else {
      setStudentEnrollments([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, enrollment?.student_id]);

  if (!enrollment) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ fontWeight: 600, fontSize: '1.25rem' }}>
        Complete User Profile - {enrollment.student_name}
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
            <Typography 
              variant="h6" 
              gutterBottom
              sx={{ 
                mb: 2,
                fontWeight: 600,
              }}
            >
              Complete Course History
            </Typography>
            <Divider sx={{ mb: 2 }} />
            {loadingEnrollments ? (
              <Box display="flex" justifyContent="center" p={2}>
                <CircularProgress size={24} />
              </Box>
            ) : studentEnrollments.length > 0 ? (
              <Box display="flex" flexDirection="column" gap={2}>
                {studentEnrollments.map((enroll) => {
                  const isCompleted = enroll.completion_status === 'Completed';
                  const isFailed = enroll.completion_status === 'Failed';
                  const isInProgress = enroll.completion_status === 'In Progress';
                  const statusColor = isCompleted ? 'success' : isFailed ? 'error' : isInProgress ? 'warning' : 'default';
                  
                  return (
                    <Card
                      key={enroll.id}
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
                              {enroll.course_name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Batch: {enroll.batch_code}
                            </Typography>
                          </Box>
                          <Chip
                            label={enroll.completion_status}
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
                              label={enroll.approval_status}
                              color={
                                enroll.approval_status === 'Approved' ? 'success' :
                                enroll.approval_status === 'Pending' ? 'warning' :
                                enroll.approval_status === 'Withdrawn' ? 'error' :
                                enroll.approval_status === 'Rejected' ? 'error' : 'default'
                              }
                              size="small"
                              sx={{ mt: 0.5 }}
                            />
                          </Box>
                          
                          {enroll.score !== null && enroll.score !== undefined && (
                            <Box>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Score
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.5 }}>
                                {enroll.score.toFixed(1)}
                              </Typography>
                            </Box>
                          )}
                          
                          {enroll.attendance_percentage !== null && enroll.attendance_percentage !== undefined && (
                            <Box>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Attendance
                              </Typography>
                              <Typography 
                                variant="body2" 
                                sx={{ 
                                  fontWeight: 600, 
                                  mt: 0.5,
                                  color: enroll.attendance_percentage >= 80 
                                    ? theme.palette.success.main 
                                    : enroll.attendance_percentage >= 50
                                    ? theme.palette.warning.main
                                    : theme.palette.error.main
                                }}
                              >
                                {enroll.attendance_percentage.toFixed(1)}%
                              </Typography>
                            </Box>
                          )}
                          
                          {enroll.attendance_status && (
                            <Box>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Attendance Details
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.5 }}>
                                {enroll.attendance_status}
                              </Typography>
                            </Box>
                          )}
                          
                          {enroll.present !== null && enroll.total_attendance !== null && (
                            <Box>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Sessions
                              </Typography>
                              <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.5 }}>
                                {enroll.present} / {enroll.total_attendance}
                              </Typography>
                            </Box>
                          )}
                          
                          {enroll.course_start_date && (
                            <Box>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Start Date
                              </Typography>
                              <Typography variant="body2" sx={{ mt: 0.5 }}>
                                {new Date(enroll.course_start_date).toLocaleDateString()}
                              </Typography>
                            </Box>
                          )}
                          
                          {enroll.completion_date && (
                            <Box>
                              <Typography variant="caption" color="text.secondary" display="block">
                                Completion Date
                              </Typography>
                              <Typography variant="body2" sx={{ mt: 0.5 }}>
                                {new Date(enroll.completion_date).toLocaleDateString()}
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
                No course history available.
              </Typography>
            )}
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {enrollment && enrollment.approval_status === 'Pending' && enrollment.eligibility_status === 'Eligible' && onApprove && onReject && (
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
        {enrollment && enrollment.approval_status === 'Withdrawn' && onReapprove && (
          <Button
            color="primary"
            variant="contained"
            onClick={() => {
              onReapprove(enrollment.id);
              onClose();
            }}
          >
            Reapprove
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

export default UserDetailsDialog;

