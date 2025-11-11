import React from 'react';
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
  Alert,
} from '@mui/material';

function CourseDetailsDialog({ open, onClose, enrollment }) {
  if (!enrollment) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Course Details - {enrollment.course_name}
      </DialogTitle>
      <DialogContent>
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
              {enrollment.course_name}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Batch Code
            </Typography>
            <Typography variant="body1" gutterBottom>
              {enrollment.batch_code}
            </Typography>
          </Grid>
          
          {enrollment.course_description && (
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                Description
              </Typography>
              <Typography variant="body1" gutterBottom>
                {enrollment.course_description}
              </Typography>
            </Grid>
          )}
          
          {enrollment.course_start_date && (
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Start Date
              </Typography>
              <Typography variant="body1" gutterBottom>
                {new Date(enrollment.course_start_date).toLocaleDateString()}
              </Typography>
            </Grid>
          )}
          
          {enrollment.course_end_date && (
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                End Date
              </Typography>
              <Typography variant="body1" gutterBottom>
                {new Date(enrollment.course_end_date).toLocaleDateString()}
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
                label={enrollment.approval_status}
                color={
                  enrollment.approval_status === 'Approved' ? 'success' :
                  enrollment.approval_status === 'Pending' ? 'warning' :
                  enrollment.approval_status === 'Rejected' ? 'error' :
                  enrollment.approval_status === 'Withdrawn' ? 'error' : 'default'
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
                label={enrollment.eligibility_status}
                color={enrollment.eligibility_status === 'Eligible' ? 'success' : 'error'}
                size="small"
              />
            </Typography>
          </Grid>
          
          {enrollment.approved_by && (
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Approved By
              </Typography>
              <Typography variant="body1" gutterBottom>
                {enrollment.approved_by}
              </Typography>
            </Grid>
          )}
          
          {enrollment.approved_at && (
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Approved At
              </Typography>
              <Typography variant="body1" gutterBottom>
                {new Date(enrollment.approved_at).toLocaleString()}
              </Typography>
            </Grid>
          )}
          
          {enrollment.rejection_reason && (
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                Rejection/Withdrawal Reason
              </Typography>
              <Alert severity="error" sx={{ mt: 1 }}>
                {enrollment.rejection_reason}
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
                label={enrollment.completion_status}
                color={
                  enrollment.completion_status === 'Completed' ? 'success' :
                  enrollment.completion_status === 'In Progress' ? 'info' :
                  enrollment.completion_status === 'Failed' ? 'error' : 'default'
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
                label={enrollment.completion_status === 'Completed' || enrollment.completion_status === 'Failed' ? 'Yes' : 'No'}
                color={enrollment.completion_status === 'Completed' || enrollment.completion_status === 'Failed' ? 'success' : 'default'}
                size="small"
              />
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Score
            </Typography>
            <Typography variant="body1" gutterBottom>
              {enrollment.score !== null ? `${enrollment.score}%` : 'Not Available'}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Attendance
            </Typography>
            <Typography variant="body1" gutterBottom>
              {enrollment.attendance_percentage !== null ? `${enrollment.attendance_percentage}%` : 'Not Available'}
            </Typography>
          </Grid>
          
          {enrollment.completion_date && (
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Completion Date
              </Typography>
              <Typography variant="body1" gutterBottom>
                {new Date(enrollment.completion_date).toLocaleString()}
              </Typography>
            </Grid>
          )}
          
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Enrollment Date
            </Typography>
            <Typography variant="body1" gutterBottom>
              {new Date(enrollment.created_at).toLocaleString()}
            </Typography>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

export default CourseDetailsDialog;

