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
import { Add, Edit, Archive, ExpandMore, ExpandLess, PersonRemove, History, UploadFile, People, Assessment, EventAvailable, Info, PersonAdd, Search, Delete } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { coursesAPI, enrollmentsAPI, importsAPI, completionsAPI, studentsAPI } from '../services/api';
import { List, ListItem, ListItemText, Grid, MenuItem, InputAdornment, Autocomplete } from '@mui/material';
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
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedCourseForImport, setSelectedCourseForImport] = useState(null);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResults, setImportResults] = useState(null);
  const [courseDetailsCardOpen, setCourseDetailsCardOpen] = useState(false);
  const [selectedCourseForDetails, setSelectedCourseForDetails] = useState(null);
  const [manualEnrollDialogOpen, setManualEnrollDialogOpen] = useState(false);
  const [selectedCourseForEnroll, setSelectedCourseForEnroll] = useState(null);
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [attendanceScoresDialogOpen, setAttendanceScoresDialogOpen] = useState(false);
  const [selectedCourseForAttendance, setSelectedCourseForAttendance] = useState(null);
  const [attendanceScoresFile, setAttendanceScoresFile] = useState(null);
  const [attendanceScoresLoading, setAttendanceScoresLoading] = useState(false);
  const [attendanceScoresResults, setAttendanceScoresResults] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    batch_code: '',
    description: '',
    start_date: null,
    end_date: null,
    seat_limit: 0,
    total_classes_offered: '',
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
      total_classes_offered: '',
      prerequisite_course_id: '',
    });
  };

  const handleSubmit = async () => {
    try {
      await coursesAPI.create({
        ...formData,
        start_date: formData.start_date?.toISOString().split('T')[0],
        end_date: formData.end_date?.toISOString().split('T')[0],
        total_classes_offered: formData.total_classes_offered ? parseInt(formData.total_classes_offered) : null,
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

  const handleDelete = async (id) => {
    const confirmMessage = showArchived 
      ? 'Are you sure you want to PERMANENTLY DELETE this archived course? This will completely remove it from the database and cannot be undone. All course data will be lost forever.'
      : 'Are you sure you want to PERMANENTLY DELETE this course? This will completely remove it from the database and cannot be undone. All course data will be lost forever.';
    
    if (window.confirm(confirmMessage)) {
      try {
        await coursesAPI.delete(id);
        setMessage({ type: 'success', text: 'Course permanently deleted successfully' });
        fetchCourses();
      } catch (error) {
        setMessage({ type: 'error', text: error.response?.data?.detail || 'Error deleting course' });
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

  const handleOpenImport = (course) => {
    setSelectedCourseForImport(course);
    setImportFile(null);
    setImportResults(null);
    setImportDialogOpen(true);
  };

  const handleCloseImport = () => {
    setImportDialogOpen(false);
    setSelectedCourseForImport(null);
    setImportFile(null);
    setImportResults(null);
  };

  const handleImportFileChange = (event) => {
    setImportFile(event.target.files[0]);
    setImportResults(null);
  };

  const handleImportExcel = async () => {
    if (!importFile || !selectedCourseForImport) {
      setMessage({ type: 'error', text: 'Please select a file' });
      return;
    }

    setImportLoading(true);
    setMessage(null);
    try {
      // Only handle enrollment registrations
      const response = await importsAPI.uploadExcel(importFile, selectedCourseForImport.id);
      setImportResults(response.data.results);
      setMessage({ type: 'success', text: response.data.message });
      setImportFile(null);
      fetchCourses();
      // Refresh enrollments if the course is expanded
      if (expandedCourse === selectedCourseForImport.id) {
        handleToggleExpand(selectedCourseForImport.id);
        setTimeout(() => handleToggleExpand(selectedCourseForImport.id), 100);
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Error uploading file' });
    } finally {
      setImportLoading(false);
    }
  };

  const handleImportCSV = async () => {
    if (!importFile || !selectedCourseForImport) {
      setMessage({ type: 'error', text: 'Please select a file' });
      return;
    }

    setImportLoading(true);
    setMessage(null);
    try {
      // Only handle enrollment registrations
      const response = await importsAPI.uploadCSV(importFile, selectedCourseForImport.id);
      setImportResults(response.data.results);
      setMessage({ type: 'success', text: response.data.message });
      setImportFile(null);
      fetchCourses();
      // Refresh enrollments if the course is expanded
      if (expandedCourse === selectedCourseForImport.id) {
        handleToggleExpand(selectedCourseForImport.id);
        setTimeout(() => handleToggleExpand(selectedCourseForImport.id), 100);
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Error uploading file' });
    } finally {
      setImportLoading(false);
    }
  };

  const handleViewCourseInfo = (course) => {
    setSelectedCourseForDetails(course);
    setCourseDetailsCardOpen(true);
  };

  const handleOpenManualEnroll = async (course) => {
    setSelectedCourseForEnroll(course);
    setSelectedStudentId('');
    setLoadingStudents(true);
    try {
      const response = await studentsAPI.getAll({ limit: 1000 });
      setStudents(response.data);
    } catch (error) {
      console.error('Error fetching students:', error);
      setMessage({ type: 'error', text: 'Error fetching students' });
    } finally {
      setLoadingStudents(false);
    }
    setManualEnrollDialogOpen(true);
  };

  const handleCloseManualEnroll = () => {
    setManualEnrollDialogOpen(false);
    setSelectedCourseForEnroll(null);
    setSelectedStudentId('');
  };

  const handleOpenAttendanceScores = (course) => {
    setSelectedCourseForAttendance(course);
    setAttendanceScoresFile(null);
    setAttendanceScoresResults(null);
    setAttendanceScoresDialogOpen(true);
  };

  const handleCloseAttendanceScores = () => {
    setAttendanceScoresDialogOpen(false);
    setSelectedCourseForAttendance(null);
    setAttendanceScoresFile(null);
    setAttendanceScoresResults(null);
  };

  const handleAttendanceScoresFileChange = (event) => {
    setAttendanceScoresFile(event.target.files[0]);
    setAttendanceScoresResults(null);
  };

  const handleUploadAttendanceExcel = async () => {
    if (!attendanceScoresFile || !selectedCourseForAttendance) {
      setMessage({ type: 'error', text: 'Please select a file' });
      return;
    }

    // Validate file type
    const fileName = attendanceScoresFile.name.toLowerCase();
    if (!fileName.endsWith('.xlsx') && !fileName.endsWith('.xls')) {
      setMessage({ type: 'error', text: 'Please select an Excel file (.xlsx or .xls)' });
      return;
    }

    setAttendanceScoresLoading(true);
    setMessage(null);
    try {
      // Upload attendance and scores (single file with both)
      const response = await completionsAPI.uploadAttendance(attendanceScoresFile, selectedCourseForAttendance.id);
      setAttendanceScoresResults(response.data);
      setMessage({ type: 'success', text: 'Attendance and scores uploaded successfully' });
      setAttendanceScoresFile(null);
      fetchCourses();
      // Refresh enrollments if the course is expanded
      if (expandedCourse === selectedCourseForAttendance.id) {
        handleToggleExpand(selectedCourseForAttendance.id);
        setTimeout(() => handleToggleExpand(selectedCourseForAttendance.id), 100);
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Error uploading file' });
    } finally {
      setAttendanceScoresLoading(false);
    }
  };

  const handleUploadAttendanceCSV = async () => {
    if (!attendanceScoresFile || !selectedCourseForAttendance) {
      setMessage({ type: 'error', text: 'Please select a file' });
      return;
    }

    // Validate file type
    const fileName = attendanceScoresFile.name.toLowerCase();
    if (!fileName.endsWith('.csv')) {
      setMessage({ type: 'error', text: 'Please select a CSV file (.csv)' });
      return;
    }

    setAttendanceScoresLoading(true);
    setMessage(null);
    try {
      // Upload attendance and scores (single file with both)
      const response = await completionsAPI.uploadAttendance(attendanceScoresFile, selectedCourseForAttendance.id);
      setAttendanceScoresResults(response.data);
      setMessage({ type: 'success', text: 'Attendance and scores uploaded successfully' });
      setAttendanceScoresFile(null);
      fetchCourses();
      // Refresh enrollments if the course is expanded
      if (expandedCourse === selectedCourseForAttendance.id) {
        handleToggleExpand(selectedCourseForAttendance.id);
        setTimeout(() => handleToggleExpand(selectedCourseForAttendance.id), 100);
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Error uploading file' });
    } finally {
      setAttendanceScoresLoading(false);
    }
  };

  const handleManualEnrollConfirm = async () => {
    if (!selectedStudentId || !selectedCourseForEnroll) {
      setMessage({ type: 'error', text: 'Please select a student' });
      return;
    }

    try {
      await enrollmentsAPI.create({
        student_id: parseInt(selectedStudentId),
        course_id: selectedCourseForEnroll.id,
      });
      setMessage({ type: 'success', text: 'Student enrolled and automatically approved successfully' });
      setManualEnrollDialogOpen(false);
      setSelectedStudentId('');
      const courseId = selectedCourseForEnroll.id;
      setSelectedCourseForEnroll(null);
      
      // Refresh courses to update seat counts
      await fetchCourses();
      
      // Refresh enrollments for this course if it's expanded or if enrollments were previously loaded
      if (expandedCourse === courseId || courseEnrollments[courseId]) {
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
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Error enrolling student' });
    }
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
            {showArchived ? 'Archived Courses' : 'Courses'}
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
                      <Box display="flex" gap={1}>
                        <IconButton
                          color="primary"
                          onClick={() => handleViewCourseInfo(course)}
                          title="View Course Details"
                        >
                          <Info />
                        </IconButton>
                        {!showArchived && (
                          <>
                            <IconButton
                              color="primary"
                              onClick={() => handleOpenManualEnroll(course)}
                              title="Add Student"
                            >
                              <PersonAdd />
                            </IconButton>
                            <IconButton
                              color="primary"
                              onClick={() => handleOpenAttendanceScores(course)}
                              title="Upload Attendance & Scores"
                            >
                              <EventAvailable />
                            </IconButton>
                            <IconButton
                              color="primary"
                              onClick={() => handleOpenImport(course)}
                              title="Import Enrollment Data"
                            >
                              <UploadFile />
                            </IconButton>
                            <IconButton
                              color="secondary"
                              onClick={() => handleArchive(course.id)}
                              title="Archive Course"
                            >
                              <Archive />
                            </IconButton>
                            <IconButton
                              color="error"
                              onClick={() => handleDelete(course.id)}
                              title="Delete Course"
                            >
                              <Delete />
                            </IconButton>
                          </>
                        )}
                        {showArchived && (
                          <>
                            <IconButton
                              color="error"
                              onClick={() => handleDelete(course.id)}
                              title="Permanently Delete Course"
                            >
                              <Delete />
                            </IconButton>
                            <Chip label="Archived" color="default" size="small" />
                          </>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={8}>
                      <Collapse in={expandedCourse === course.id} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 2 }}>
                          {loadingEnrollments[course.id] ? (
                            <Box display="flex" justifyContent="center" p={2}>
                              <CircularProgress size={24} />
                            </Box>
                          ) : courseEnrollments[course.id] && courseEnrollments[course.id].length > 0 ? (
                            <Box display="flex" flexDirection="column" gap={3}>
                              {/* Approved Enrollments Section */}
                              {courseEnrollments[course.id].filter(e => e.approval_status === 'Approved').length > 0 && (
                                <Box>
                                  <Typography 
                                    variant="h6" 
                                    gutterBottom
                                    sx={{ 
                                      mb: 2,
                                      color: theme.palette.success.main,
                                      fontWeight: 600,
                                    }}
                                  >
                                    Approved Students ({courseEnrollments[course.id].filter(e => e.approval_status === 'Approved').length})
                                  </Typography>
                                  <TableContainer 
                                    component={Paper} 
                                    variant="outlined"
                                    sx={{
                                      borderRadius: 2,
                                      border: `2px solid ${alpha(theme.palette.success.main, 0.3)}`,
                                      backgroundColor: alpha(theme.palette.success.main, 0.02),
                                    }}
                                  >
                                    <Table size="small">
                                      <TableHead>
                                        <TableRow sx={{ backgroundColor: alpha(theme.palette.success.main, 0.1) }}>
                                          <TableCell sx={{ fontWeight: 600 }}>Employee ID</TableCell>
                                          <TableCell sx={{ fontWeight: 600 }}>Student Name</TableCell>
                                          <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                                          <TableCell sx={{ fontWeight: 600 }}>SBU</TableCell>
                                          <TableCell sx={{ fontWeight: 600 }}>Completion Status</TableCell>
                                          <TableCell sx={{ fontWeight: 600 }}>Score</TableCell>
                                          <TableCell sx={{ fontWeight: 600 }}>Attendance</TableCell>
                                        </TableRow>
                                      </TableHead>
                                      <TableBody>
                                        {courseEnrollments[course.id]
                                          .filter(enrollment => enrollment.approval_status === 'Approved')
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
                                              <TableCell>{enrollment.student_name}</TableCell>
                                              <TableCell>{enrollment.student_email}</TableCell>
                                              <TableCell>
                                                <Chip label={enrollment.student_sbu} size="small" />
                                              </TableCell>
                                              <TableCell>
                                                <Chip
                                                  label={enrollment.completion_status}
                                                  color={
                                                    enrollment.completion_status === 'Completed' ? 'success' :
                                                    enrollment.completion_status === 'Failed' ? 'error' :
                                                    enrollment.completion_status === 'In Progress' ? 'warning' : 'default'
                                                  }
                                                  size="small"
                                                />
                                              </TableCell>
                                              <TableCell>{enrollment.score || '-'}</TableCell>
                                              <TableCell>
                                                {enrollment.attendance_percentage !== null && enrollment.attendance_percentage !== undefined
                                                  ? `${enrollment.attendance_percentage.toFixed(1)}%`
                                                  : enrollment.attendance_status || '-'}
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                      </TableBody>
                                    </Table>
                                  </TableContainer>
                                </Box>
                              )}

                              {/* Not Approved / Pending / Rejected Enrollments Section */}
                              {courseEnrollments[course.id].filter(e => e.approval_status !== 'Approved').length > 0 && (
                                <Box>
                                  <Typography 
                                    variant="h6" 
                                    gutterBottom
                                    sx={{ 
                                      mb: 2,
                                      color: theme.palette.error.main,
                                      fontWeight: 600,
                                    }}
                                  >
                                    Not Approved / Pending ({courseEnrollments[course.id].filter(e => e.approval_status !== 'Approved').length})
                                  </Typography>
                                  <TableContainer 
                                    component={Paper} 
                                    variant="outlined"
                                    sx={{
                                      borderRadius: 2,
                                      border: `2px solid ${alpha(theme.palette.error.main, 0.3)}`,
                                      backgroundColor: alpha(theme.palette.error.main, 0.02),
                                    }}
                                  >
                                    <Table size="small">
                                      <TableHead>
                                        <TableRow sx={{ backgroundColor: alpha(theme.palette.error.main, 0.1) }}>
                                          <TableCell sx={{ fontWeight: 600 }}>Employee ID</TableCell>
                                          <TableCell sx={{ fontWeight: 600 }}>Student Name</TableCell>
                                          <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                                          <TableCell sx={{ fontWeight: 600 }}>SBU</TableCell>
                                          <TableCell sx={{ fontWeight: 600 }}>Eligibility</TableCell>
                                          <TableCell sx={{ fontWeight: 600 }}>Approval Status</TableCell>
                                          <TableCell sx={{ fontWeight: 600 }}>Reason</TableCell>
                                        </TableRow>
                                      </TableHead>
                                      <TableBody>
                                        {courseEnrollments[course.id]
                                          .filter(enrollment => enrollment.approval_status !== 'Approved')
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
                                                    enrollment.approval_status === 'Pending' ? 'warning' :
                                                    enrollment.approval_status === 'Rejected' ? 'error' :
                                                    enrollment.approval_status === 'Withdrawn' ? 'error' : 'default'
                                                  }
                                                  size="small"
                                                />
                                              </TableCell>
                                              <TableCell>
                                                <Box>
                                                  {enrollment.rejection_reason && (
                                                    <Typography variant="body2" color="error" sx={{ mb: 0.5 }}>
                                                      <strong>Rejection:</strong> {enrollment.rejection_reason}
                                                    </Typography>
                                                  )}
                                                  {enrollment.eligibility_reason && enrollment.eligibility_status !== 'Eligible' && (
                                                    <Typography variant="body2" color="text.secondary">
                                                      <strong>Eligibility:</strong> {enrollment.eligibility_reason}
                                                    </Typography>
                                                  )}
                                                  {!enrollment.rejection_reason && !enrollment.eligibility_reason && enrollment.approval_status === 'Pending' && (
                                                    <Typography variant="body2" color="text.secondary">
                                                      Awaiting approval
                                                    </Typography>
                                                  )}
                                                </Box>
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                      </TableBody>
                                    </Table>
                                  </TableContainer>
                                </Box>
                              )}
                            </Box>
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
            <TextField
              label="Total Classes Offered"
              type="number"
              value={formData.total_classes_offered}
              onChange={(e) => setFormData({ ...formData, total_classes_offered: e.target.value })}
              fullWidth
              inputProps={{ min: 1 }}
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

      {/* Course Info Card Dialog */}
      <Dialog
        open={courseDetailsCardOpen}
        onClose={() => {
          setCourseDetailsCardOpen(false);
          setSelectedCourseForDetails(null);
        }}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.2)}`,
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>Course Details</DialogTitle>
        <DialogContent>
          {selectedCourseForDetails && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Course Name</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
                  {selectedCourseForDetails.name}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Batch Code</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
                  {selectedCourseForDetails.batch_code}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Start Date</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
                  {selectedCourseForDetails.start_date || '-'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">End Date</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
                  {selectedCourseForDetails.end_date || '-'}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Seat Limit</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
                  {selectedCourseForDetails.seat_limit}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Currently Enrolled</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
                  {selectedCourseForDetails.current_enrolled}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Available Seats</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
                  {selectedCourseForDetails.seat_limit - selectedCourseForDetails.current_enrolled}
                </Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Total Classes Offered</Typography>
                <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
                  {selectedCourseForDetails.total_classes_offered || 'Not set'}
                </Typography>
              </Grid>
              {selectedCourseForDetails.description && (
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">Description</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
                    {selectedCourseForDetails.description}
                  </Typography>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setCourseDetailsCardOpen(false);
            setSelectedCourseForDetails(null);
          }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Dialog */}
      <Dialog
        open={importDialogOpen}
        onClose={handleCloseImport}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.2)}`,
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          Import Enrollment Registrations - {selectedCourseForImport?.name} ({selectedCourseForImport?.batch_code})
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <Typography variant="body2" color="text.secondary">
             
            </Typography>
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadFile />}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                borderStyle: 'dashed',
                borderWidth: 2,
              }}
            >
              Select File
              <input type="file" hidden accept=".xlsx,.xls,.csv" onChange={handleImportFileChange} />
            </Button>
            {importFile && (
              <Typography
                variant="body2"
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.primary.main, 0.05),
                  color: theme.palette.primary.main,
                  fontWeight: 500,
                }}
              >
                Selected: {importFile.name}
              </Typography>
            )}
            <Box display="flex" gap={2}>
              <Button
                variant="contained"
                onClick={handleImportExcel}
                disabled={!importFile || importLoading}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 500,
                }}
              >
                Upload Excel
              </Button>
              <Button
                variant="contained"
                onClick={handleImportCSV}
                disabled={!importFile || importLoading}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 500,
                }}
              >
                Upload CSV
              </Button>
            </Box>
            {importLoading && <CircularProgress size={24} />}
            {importResults && (
              <Card
                sx={{
                  mt: 2,
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.primary.main, 0.05),
                }}
              >
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    Import Results
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemText primary="Total Records" secondary={importResults.total} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Processed" secondary={importResults.processed} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Eligible" secondary={importResults.eligible} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Ineligible" secondary={importResults.ineligible} />
                    </ListItem>
                    {importResults.not_found !== undefined && importResults.not_found > 0 && (
                      <ListItem>
                        <ListItemText
                          primary="Not Found"
                          secondary={`${importResults.not_found} employees not found`}
                        />
                      </ListItem>
                    )}
                    {importResults.errors && importResults.errors.length > 0 && (
                      <ListItem>
                        <ListItemText
                          primary="Errors"
                          secondary={`${importResults.errors.length} errors occurred`}
                        />
                      </ListItem>
                    )}
                  </List>
                </CardContent>
              </Card>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseImport}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Manual Enrollment Dialog */}
      <Dialog
        open={manualEnrollDialogOpen}
        onClose={handleCloseManualEnroll}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.2)}`,
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          Add Student to {selectedCourseForEnroll?.name} ({selectedCourseForEnroll?.batch_code})
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            {loadingStudents ? (
              <Box display="flex" justifyContent="center" p={2}>
                <CircularProgress />
              </Box>
            ) : (
              <Autocomplete
                options={students}
                getOptionLabel={(option) => option ? `${option.name} (${option.employee_id}) - ${option.email}` : ''}
                value={students.find(s => s.id === parseInt(selectedStudentId)) || null}
                onChange={(event, newValue) => {
                  setSelectedStudentId(newValue ? newValue.id.toString() : '');
                }}
                filterOptions={(options, { inputValue }) => {
                  const searchLower = inputValue.toLowerCase();
                  return options.filter((student) =>
                    student.name?.toLowerCase().includes(searchLower) ||
                    student.email?.toLowerCase().includes(searchLower) ||
                    student.employee_id?.toLowerCase().includes(searchLower)
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Search and Select Student"
                    placeholder="Type to search by name, email, or employee ID..."
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <>
                          <InputAdornment position="start">
                            <Search />
                          </InputAdornment>
                          {params.InputProps.startAdornment}
                        </>
                      ),
                    }}
                    required
                  />
                )}
                renderOption={(props, student) => (
                  <Box component="li" {...props} key={student.id}>
                    <Box>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {student.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {student.employee_id} • {student.email}
                      </Typography>
                    </Box>
                  </Box>
                )}
                noOptionsText="No students found"
                ListboxProps={{
                  style: {
                    maxHeight: 300,
                  },
                }}
              />
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseManualEnroll}>Cancel</Button>
          <Button 
            onClick={handleManualEnrollConfirm} 
            variant="contained"
            disabled={!selectedStudentId || loadingStudents}
          >
            Enroll Student
          </Button>
        </DialogActions>
      </Dialog>

      {/* Attendance & Scores Upload Dialog */}
      <Dialog
        open={attendanceScoresDialogOpen}
        onClose={handleCloseAttendanceScores}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.2)}`,
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>
          Upload Attendance & Scores - {selectedCourseForAttendance?.name} ({selectedCourseForAttendance?.batch_code})
        </DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <Typography variant="body2" color="text.secondary">
             
            </Typography>
            <Typography variant="body2" color="text.secondary">
              
            </Typography>
            {(!selectedCourseForAttendance?.total_classes_offered || selectedCourseForAttendance.total_classes_offered <= 0) && (
              <Alert severity="warning" sx={{ mt: 1 }}>
                This course does not have "Total Classes Offered" set. Please set it in the course settings before uploading attendance and scores.
              </Alert>
            )}
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadFile />}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                borderStyle: 'dashed',
                borderWidth: 2,
              }}
            >
              Select File
              <input type="file" hidden accept=".xlsx,.xls,.csv" onChange={handleAttendanceScoresFileChange} />
            </Button>
            {attendanceScoresFile && (
              <Typography
                variant="body2"
                sx={{
                  p: 1.5,
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.primary.main, 0.05),
                  color: theme.palette.primary.main,
                  fontWeight: 500,
                }}
              >
                Selected: {attendanceScoresFile.name}
              </Typography>
            )}
            <Box display="flex" gap={2}>
              <Button
                variant="contained"
                onClick={handleUploadAttendanceExcel}
                disabled={!attendanceScoresFile || attendanceScoresLoading}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 500,
                }}
              >
                Upload Excel
              </Button>
              <Button
                variant="contained"
                onClick={handleUploadAttendanceCSV}
                disabled={!attendanceScoresFile || attendanceScoresLoading}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 500,
                }}
              >
                Upload CSV
              </Button>
            </Box>
            {attendanceScoresLoading && <CircularProgress size={24} />}
            {attendanceScoresResults && (
              <Card
                sx={{
                  mt: 2,
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.primary.main, 0.05),
                }}
              >
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                    Upload Results
                  </Typography>
                  <List>
                    <ListItem>
                      <ListItemText primary="Processed" secondary={attendanceScoresResults.processed} />
                    </ListItem>
                    <ListItem>
                      <ListItemText primary="Updated" secondary={attendanceScoresResults.updated} />
                    </ListItem>
                    {attendanceScoresResults.not_found !== undefined && attendanceScoresResults.not_found > 0 && (
                      <ListItem>
                        <ListItemText
                          primary="Not Found"
                          secondary={`${attendanceScoresResults.not_found} students not found`}
                        />
                      </ListItem>
                    )}
                    {attendanceScoresResults.errors && attendanceScoresResults.errors.length > 0 && (
                      <ListItem>
                        <ListItemText
                          primary="Errors"
                          secondary={`${attendanceScoresResults.errors.length} errors occurred`}
                        />
                      </ListItem>
                    )}
                  </List>
                </CardContent>
              </Card>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAttendanceScores}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Courses;

