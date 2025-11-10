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
} from '@mui/material';
import { Add, Edit, Archive, ExpandMore, ExpandLess } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { coursesAPI, enrollmentsAPI } from '../services/api';

function Courses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [expandedCourse, setExpandedCourse] = useState(null);
  const [courseEnrollments, setCourseEnrollments] = useState({});
  const [loadingEnrollments, setLoadingEnrollments] = useState({});
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
  }, []);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const response = await coursesAPI.getAll({ archived: false });
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

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4">Courses</Typography>
        <Button variant="contained" startIcon={<Add />} onClick={handleOpen}>
          New Course
        </Button>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell width={50}></TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Batch Code</TableCell>
                <TableCell>Start Date</TableCell>
                <TableCell>Seats</TableCell>
                <TableCell>Enrolled</TableCell>
                <TableCell>Available</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {courses.map((course) => (
                <React.Fragment key={course.id}>
                  <TableRow>
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
                      <IconButton
                        color="secondary"
                        onClick={() => handleArchive(course.id)}
                      >
                        <Archive />
                      </IconButton>
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
                            <TableContainer component={Paper} variant="outlined">
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
                                  </TableRow>
                                </TableHead>
                                <TableBody>
                                  {courseEnrollments[course.id].map((enrollment) => (
                                    <TableRow key={enrollment.id}>
                                      <TableCell>{enrollment.student_name}</TableCell>
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
                                            enrollment.approval_status === 'Pending' ? 'warning' : 'error'
                                          }
                                          size="small"
                                        />
                                      </TableCell>
                                      <TableCell>{enrollment.completion_status}</TableCell>
                                      <TableCell>{enrollment.score || '-'}</TableCell>
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
      )}

      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>Create New Course</DialogTitle>
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
    </Box>
  );
}

export default Courses;

