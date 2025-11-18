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
import { mentorsAPI } from '../services/api';

function MentorDetailsDialog({ open, onClose, mentor }) {
  const theme = useTheme();
  const [mentorStats, setMentorStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const fetchMentorStats = async () => {
    if (!mentor?.id) return;
    
    setLoadingStats(true);
    try {
      const response = await mentorsAPI.getStats(mentor.id);
      setMentorStats(response.data);
    } catch (error) {
      console.error('Error fetching mentor stats:', error);
      setMentorStats(null);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (open && mentor?.id) {
      fetchMentorStats();
    } else {
      setMentorStats(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mentor?.id]);

  if (!mentor) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ fontWeight: 600, fontSize: '1.25rem' }}>
        Mentor Profile - {mentor.name}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <Typography variant="h6" gutterBottom>
              Mentor Information
            </Typography>
            <Divider sx={{ mb: 2 }} />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Employee ID
            </Typography>
            <Typography variant="body1" gutterBottom>
              {mentor.student?.employee_id || 'N/A (External Mentor)'}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Name
            </Typography>
            <Typography variant="body1" gutterBottom>
              {mentor.name}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Type
            </Typography>
            <Typography variant="body1" gutterBottom>
              <Chip 
                label={mentor.is_internal ? 'Internal' : 'External'} 
                size="small" 
                color={mentor.is_internal ? 'primary' : 'secondary'}
              />
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Email
            </Typography>
            <Typography variant="body1" gutterBottom>
              {mentor.email || 'N/A'}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              SBU
            </Typography>
            <Typography variant="body1" gutterBottom>
              {mentor.sbu ? <Chip label={mentor.sbu} size="small" /> : 'N/A'}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography variant="body2" color="text.secondary">
              Designation
            </Typography>
            <Typography variant="body1" gutterBottom>
              {mentor.designation || 'N/A'}
            </Typography>
          </Grid>
          
          {mentorStats && (
            <>
              <Grid item xs={12} sx={{ mt: 2 }}>
                <Card
                  sx={{
                    backgroundColor: alpha(theme.palette.primary.main, 0.05),
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                    borderRadius: 2,
                    p: 2,
                  }}
                >
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <Box textAlign="center">
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Total Courses Mentored
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 600, color: theme.palette.primary.main }}>
                          {mentorStats.total_courses_mentored || 0}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Box textAlign="center">
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Total Hours
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 600, color: theme.palette.info.main }}>
                          {mentorStats.total_hours_overall || 0}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} md={4}>
                      <Box textAlign="center">
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Total Amount Paid
                        </Typography>
                        <Typography variant="h5" sx={{ fontWeight: 600, color: theme.palette.success.main }}>
                          tk {(mentorStats.total_amount_overall || 0).toFixed(2)}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Card>
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
                  Course Assignments
                </Typography>
                <Divider sx={{ mb: 2 }} />
                {loadingStats ? (
                  <Box display="flex" justifyContent="center" p={2}>
                    <CircularProgress size={24} />
                  </Box>
                ) : mentorStats.per_course_stats && mentorStats.per_course_stats.length > 0 ? (
                  <Box display="flex" flexDirection="column" gap={2}>
                    {mentorStats.per_course_stats.map((course, index) => {
                      const completionRatio = course.completion_ratio || 0;
                      const completionColor = completionRatio >= 0.8 ? 'success' : completionRatio >= 0.6 ? 'warning' : 'error';
                      
                      return (
                        <Card
                          key={index}
                          sx={{
                            borderLeft: `4px solid ${theme.palette.primary.main}`,
                            backgroundColor: alpha(theme.palette.primary.main, 0.02),
                            borderRadius: 2,
                            boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.1)}`,
                          }}
                        >
                          <CardContent>
                            <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                              <Box>
                                <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                                  {course.course_name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  Batch: {course.batch_code}
                                </Typography>
                              </Box>
                              <Chip
                                label={`${(completionRatio * 100).toFixed(0)}% Completion`}
                                color={completionColor}
                                size="small"
                                sx={{ fontWeight: 600 }}
                              />
                            </Box>
                            
                            <Box display="flex" gap={3} mt={2} flexWrap="wrap">
                              <Box>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  Hours Taught
                                </Typography>
                                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                  {course.hours_taught || 0}
                                </Typography>
                              </Box>
                              <Box>
                                <Typography variant="caption" color="text.secondary" display="block">
                                Amount Paid
                              </Typography>
                              <Typography variant="body1" sx={{ fontWeight: 600, color: 'success.main' }}>
                                tk {parseFloat(course.amount_paid || 0).toFixed(2)}
                              </Typography>
                              </Box>
                              <Box>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  Participants
                                </Typography>
                                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                  {course.participants_count || 0}
                                </Typography>
                              </Box>
                              <Box>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  Start Date
                                </Typography>
                                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                  {course.start_date || '-'}
                                </Typography>
                              </Box>
                              <Box>
                                <Typography variant="caption" color="text.secondary" display="block">
                                  End Date
                                </Typography>
                                <Typography variant="body1" sx={{ fontWeight: 600 }}>
                                  {course.end_date || '-'}
                                </Typography>
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Box>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No course assignments yet.
                  </Typography>
                )}
              </Grid>
            </>
          )}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

export default MentorDetailsDialog;

