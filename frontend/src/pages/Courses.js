import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  CircularProgress,
  Collapse,
  Card,
  CardContent,
  Alert,
  useTheme,
  alpha,
} from '@mui/material';
import { Add, Edit, Archive, ExpandMore, ExpandLess, PersonRemove, Visibility, History } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { coursesAPI, enrollmentsAPI } from '../services/api';
import UserDetailsDialog from '../components/UserDetailsDialog';
import CourseDetailsDialog from '../components/CourseDetailsDialog';

function Courses() {
  const theme = useTheme();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [open, setOpen] = useState(false);
  const [expandedCourse, setExpandedCourse] = useState(null);
  const [courseEnrollments, setCourseEnrollments] = useState({});
  const [loadingEnrollments, setLoadingEnrollments] = useState({});
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [withdrawalReason, setWithdrawalReason] = useState('');
  const [message, setMessage] = useState(null);
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);
  const [selectedUserEnrollment, setSelectedUserEnrollment] = useState(null);
  const [courseDetailsOpen, setCourseDetailsOpen] = useState(false);
  const [selectedCourseEnrollment, setSelectedCourseEnrollment] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    batch_code: '',
    description: '',
    start_date: null,
    end_date: null,
    seat_limit: 0,
    prerequisite_course_id: '',
  });

  useEffect(() => {
    fetchCourses();
  }, [showArchived]);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const response = await coursesAPI.getAll({ archived: showArchived });
      setCourses(response.data);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setFormData({
      name: '',
      batch_code: '',
      description: '',
      start_date: null,
      end_date: null,
      seat_limit: 0,
      prerequisite_course_id: '',
    });
  };

  const handleSubmit = async () => {
    try {
      await coursesAPI.create({
        ...formData,
        start_date: formData.start_date?.toISOString().split('T')[0],
        end_date: formData.end_date?.toISOString().split('T')[0],
        prerequisite_course_id: formData.prerequisite_course_id || null,
      });
      handleClose();
      fetchCourses();
    } catch (error) {
      console.error('Error creating course:', error);
      alert(error.response?.data?.detail || 'Error creating course');
    }
  };

  const handleArchive = async (id) => {
    if (window.confirm('Are you sure you want to archive this course?')) {
      try {
        await coursesAPI.archive(id);
        fetchCourses();
      } catch (error) {
        console.error('Error archiving course:', error);
      }
    }
  };

  const handleToggleExpand = async (courseId) => {
    if (expandedCourse === courseId) {
      setExpandedCourse(null);
    } else {
      setExpandedCourse(courseId);
      if (!courseEnrollments[courseId]) {
        setLoadingEnrollments({ ...loadingEnrollments, [courseId]: true });
        try {
          const response = await enrollmentsAPI.getAll({ course_id: courseId });
          setCourseEnrollments({ ...courseEnrollments, [courseId]: response.data });
        } catch (error) {
          console.error('Error fetching enrollments:', error);
        } finally {
          setLoadingEnrollments({ ...loadingEnrollments, [courseId]: false });
        }
      }
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
      
      // Refresh enrollments for the course
      if (expandedCourse) {
        const response = await enrollmentsAPI.getAll({ course_id: expandedCourse });
        setCourseEnrollments({ ...courseEnrollments, [expandedCourse]: response.data });
      }
      
      // Refresh courses to update seat counts
      fetchCourses();
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
            {showArchived ? 'Archived Courses' : 'Course Management'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {showArchived ? 'View historical course data and enrollments' : 'Manage active courses and enrollments'}
          </Typography>
        </Box>
        <Box display="flex" gap={2}>
          <Button
            variant={showArchived ? "contained" : "outlined"}
            startIcon={<History />}
            onClick={() => {
              setShowArchived(!showArchived);
              setExpandedCourse(null);
              setCourseEnrollments({});
            }}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 500,
            }}
          >
            {showArchived ? "Show Active" : "Show Archived"}
          </Button>
          {!showArchived && (
            <Button 
              variant="contained" 
              startIcon={<Add />} 
              onClick={handleOpen}
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
              New Course
            </Button>
          )}
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

      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : (
        <Card
          sx={{
            borderRadius: 3,
            boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.1)}`,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
            overflow: 'hidden',
          }}
        >
          <TableContainer>
            <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>
                <TableCell width={50}></TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Batch Code</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Start Date</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Seats</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Enrolled</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Available</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {courses.map((course) => (
                <React.Fragment key={course.id}>
                  <TableRow
                    sx={{
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.03),
                      },
                      transition: 'background-color 0.2s',
                    }}
                  >
                    <TableCell>
                      <IconButton
                        size="small"
                        onClick={() => handleToggleExpand(course.id)}
                      >
                        {expandedCourse === course.id ? <ExpandLess /> : <ExpandMore />}
                      </IconButton>
                    </TableCell>
                    <TableCell>{course.name}</TableCell>
                    <TableCell>{course.batch_code}</TableCell>
                    <TableCell>{course.start_date}</TableCell>
                    <TableCell>{course.seat_limit}</TableCell>
                    <TableCell>{course.current_enrolled}</TableCell>
                    <TableCell>
                      <Chip
                        label={course.seat_limit - course.current_enrolled}
                        color={course.seat_limit - course.current_enrolled > 0 ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {!showArchived && (
                        <IconButton
                          color="secondary"
                          onClick={() => handleArchive(course.id)}
                          title="Archive Course"
                        >
                          <Archive />
                        </IconButton>
                      )}
                      {showArchived && (
                        <Chip label="Archived" color="default" size="small" />
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
                      <Collapse in={expandedCourse === course.id} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 2 }}>
                          <Typography variant="h6" gutterBottom>
                            Enrolled Students
                          </Typography>
                          {loadingEnrollments[course.id] ? (
                            <CircularProgress size={24} />
                          ) : courseEnrollments[course.id] && courseEnrollments[course.id].length > 0 ? (
                            <TableContainer 
                              component={Paper} 
                              variant="outlined"
                              sx={{
                                borderRadius: 2,
                                border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                              }}
                            >
                              <Table size="small">
                                <TableHead>
                                  <TableRow>
                                    <TableCell>Student Name</TableCell>
                                    <TableCell>Email</TableCell>
                                    <TableCell>SBU</TableCell>
                                    <TableCell>Eligibility</TableCell>
                                    <TableCell>Approval Status</TableCell>
                                    <TableCell>Completion Status</TableCell>
                                    <TableCell>Score</TableCell>
                                    <TableCell>Actions</TableCell>
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {courseEnrollments[course.id].map((enrollment) => (
                                    <TableRow key={enrollment.id} hover>
                                      <TableCell 
                                        sx={{ cursor: 'pointer' }}
                                        onClick={() => handleViewUserDetails(enrollment)}
                                      >
                                        {enrollment.student_name}
                                      </TableCell>
                                      <TableCell>{enrollment.student_email}</TableCell>
                                      <TableCell>
                                        <Chip label={enrollment.student_sbu} size="small" />
                                      </TableCell>
                                      <TableCell>
                                        <Chip
                                          label={enrollment.eligibility_status}
                                          color={enrollment.eligibility_status === 'Eligible' ? 'success' : 'error'}
                                          size="small"
                                        />
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
                                      <TableCell>{enrollment.completion_status}</TableCell>
                                      <TableCell>{enrollment.score || '-'}</TableCell>
                                      <TableCell>
                                        <Box display="flex" gap={1}>
                                          <IconButton
                                            size="small"
                                            color="primary"
                                            onClick={() => handleViewUserDetails(enrollment)}
                                            title="View User Details"
                                          >
                                            <Visibility />
                                          </IconButton>
                                          {enrollment.approval_status === 'Approved' && !showArchived && (
                                            <IconButton
                                              size="small"
                                              color="error"
                                              onClick={() => handleWithdraw(enrollment)}
                                              title="Withdraw Student"
                                            >
                                              <PersonRemove />
                                            </IconButton>
                                          )}
                                        </Box>
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableContainer>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              No enrollments yet
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

      <Dialog 
        open={open} 
        onClose={handleClose} 
        maxWidth="md" 
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.2)}`,
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>Create New Course</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <TextField
              label="Course Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Batch Code"
              value={formData.batch_code}
              onChange={(e) => setFormData({ ...formData, batch_code: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Start Date"
                value={formData.start_date}
                onChange={(date) => setFormData({ ...formData, start_date: date })}
                renderInput={(params) => <TextField {...params} fullWidth required />}
              />
              <DatePicker
                label="End Date"
                value={formData.end_date}
                onChange={(date) => setFormData({ ...formData, end_date: date })}
                renderInput={(params) => <TextField {...params} fullWidth />}
              />
            </LocalizationProvider>
            <TextField
              label="Seat Limit"
              type="number"
              value={formData.seat_limit}
              onChange={(e) => setFormData({ ...formData, seat_limit: parseInt(e.target.value) })}
              fullWidth
              required
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>

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
    </Box>
  );
}

export default Courses;

