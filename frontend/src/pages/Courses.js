import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Card,
  CardContent,
  Alert,
  useTheme,
  alpha,
  MenuItem,
  InputAdornment,
  Autocomplete,
  Divider,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import { Add, Delete, Search, Download, PersonAdd, CheckCircle } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { coursesAPI, mentorsAPI } from '../services/api';
import AssignInternalMentorDialog from '../components/AssignInternalMentorDialog';
import AddExternalMentorDialog from '../components/AddExternalMentorDialog';
import { getCourseStatus } from '../utils/courseUtils';
import { formatDateForAPI } from '../utils/dateUtils';

function Courses({ status = 'ongoing' }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [allCourses, setAllCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSearchCourse, setSelectedSearchCourse] = useState(null);
  const [startDateFilter, setStartDateFilter] = useState(null);
  const [endDateFilter, setEndDateFilter] = useState(null);
  const [selectedSBU, setSelectedSBU] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    batch_code: '',
    description: '',
    start_date: null,
    end_date: null,
    seat_limit: 0,
    total_classes_offered: '',
    prerequisite_course_id: null,
  });
  const [prerequisiteCourses, setPrerequisiteCourses] = useState([]);
  const [selectedMentors, setSelectedMentors] = useState([]); // Array of { mentor_id, hours_taught, amount_paid, mentor_name, is_internal }
  const [assignInternalMentorDialogOpen, setAssignInternalMentorDialogOpen] = useState(false);
  const [addExternalMentorDialogOpen, setAddExternalMentorDialogOpen] = useState(false);
  const [createAsDraft, setCreateAsDraft] = useState(true); // Default to planning/draft

  useEffect(() => {
    fetchCourses();
  }, [status]);

  useEffect(() => {
    if (open) {
      fetchPrerequisiteCourses();
    }
  }, [open]);


  const fetchCourses = async () => {
    setLoading(true);
    try {
      const response = await coursesAPI.getAll();
      const allCoursesData = response.data;
      setAllCourses(allCoursesData);
      
      // Filter courses based on status
      const filtered = allCoursesData.filter(course => {
        const courseStatus = getCourseStatus(course);
        return courseStatus === status;
      });
      
      // Debug logging
      if (status === 'planning') {
        console.log('Planning courses filter:', {
          totalCourses: allCoursesData.length,
          filteredCount: filtered.length,
          coursesWithDraftStatus: allCoursesData.filter(c => c.status === 'draft' || String(c.status).toLowerCase() === 'draft').length,
          sampleStatuses: allCoursesData.slice(0, 5).map(c => ({ id: c.id, name: c.name, status: c.status, computedStatus: getCourseStatus(c) }))
        });
      }
      
      setCourses(filtered);
    } catch (error) {
      console.error('Error fetching courses:', error);
      setMessage({ type: 'error', text: 'Error fetching courses' });
    } finally {
      setLoading(false);
    }
  };

  const fetchPrerequisiteCourses = async () => {
    try {
      const response = await coursesAPI.getAll();
      // Only show ongoing and planning courses as prerequisites
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const available = response.data.filter(course => {
        const status = getCourseStatus(course);
        return status === 'ongoing' || status === 'planning';
      });
      setPrerequisiteCourses(available);
    } catch (error) {
      console.error('Error fetching prerequisite courses:', error);
    }
  };


  const filteredCourses = useMemo(() => {
    let filtered = [...courses];
    
    if (searchQuery.trim() && !selectedSearchCourse) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(course => 
        course.name?.toLowerCase().includes(query) ||
        course.batch_code?.toLowerCase().includes(query)
      );
    } else if (selectedSearchCourse) {
      filtered = filtered.filter(course => course.id === selectedSearchCourse.id);
    }
    
    if (startDateFilter) {
      const filterDate = new Date(startDateFilter);
      filterDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(course => {
        const courseDate = new Date(course.start_date);
        courseDate.setHours(0, 0, 0, 0);
        return courseDate >= filterDate;
      });
    }
    
    if (endDateFilter) {
      const filterDate = new Date(endDateFilter);
      filterDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(course => {
        const courseDate = new Date(course.start_date);
        courseDate.setHours(0, 0, 0, 0);
        return courseDate <= filterDate;
      });
    }
    
    return filtered;
  }, [courses, searchQuery, selectedSearchCourse, startDateFilter, endDateFilter]);

  const handleOpen = () => {
    setFormData({
      name: '',
      batch_code: '',
      description: '',
      start_date: null,
      end_date: null,
      seat_limit: 0,
      total_classes_offered: '',
      prerequisite_course_id: null,
    });
    setSelectedMentors([]);
    setCreateAsDraft(true); // Default to planning/draft
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
      prerequisite_course_id: null,
    });
    setSelectedMentors([]);
    setCreateAsDraft(true); // Reset to default
  };

  const handleSubmit = async () => {
    try {
      // Determine course status based on checkbox
      const courseStatus = createAsDraft ? 'draft' : 'ongoing';
      
      // Create the course first
      const response = await coursesAPI.create({
        ...formData,
        start_date: formatDateForAPI(formData.start_date),
        end_date: formatDateForAPI(formData.end_date),
        total_classes_offered: formData.total_classes_offered ? parseInt(formData.total_classes_offered) : null,
        prerequisite_course_id: formData.prerequisite_course_id || null,
        status: courseStatus,
      });
      
      const courseId = response.data.id;
      
      // Handle mentor assignments based on course status
      if (selectedMentors.length > 0) {
        const mentorAssignments = selectedMentors
          .filter(mentor => mentor.mentor_id && mentor.hours_taught !== undefined && mentor.amount_paid !== undefined)
          .map(mentor => ({
            mentor_id: mentor.mentor_id,
            hours_taught: parseFloat(mentor.hours_taught) || 0,
            amount_paid: parseFloat(mentor.amount_paid) || 0,
          }));
        
        if (mentorAssignments.length > 0) {
          if (createAsDraft) {
            // Save mentors to draft for planning courses
            try {
              await coursesAPI.saveDraft(courseId, {
                mentor_assignments: mentorAssignments,
              });
            } catch (error) {
              console.error('Error saving mentor assignments to draft:', error);
              // Continue even if draft save fails
            }
          } else {
            // Assign mentors directly for ongoing courses
            for (const assignment of mentorAssignments) {
              try {
                await coursesAPI.assignMentor(courseId, assignment);
              } catch (error) {
                console.error('Error assigning mentor:', error);
                // Continue with other mentors even if one fails
              }
            }
          }
        }
      }
      
      handleClose();
      fetchCourses();
      setMessage({ 
        type: 'success', 
        text: `Course created successfully as ${createAsDraft ? 'Planning (Draft)' : 'Ongoing'}` 
      });
    } catch (error) {
      console.error('Error creating course:', error);
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Error creating course' });
    }
  };

  const handleAssignInternalMentor = async (assignment) => {
    // Fetch mentor details to get name for display
    try {
      const mentorResponse = await mentorsAPI.getById(assignment.mentor_id);
      const mentor = mentorResponse.data;
      const mentorName = mentor.student 
        ? `${mentor.student.name} (${mentor.student.employee_id})` 
        : mentor.name;
      
      setSelectedMentors([...selectedMentors, {
        ...assignment,
        mentor_name: mentorName,
        is_internal: true,
      }]);
      setMessage({ type: 'success', text: 'Internal mentor added successfully' });
      } catch (error) {
      console.error('Error fetching mentor details:', error);
      // Still add the mentor even if we can't fetch details
      setSelectedMentors([...selectedMentors, {
        ...assignment,
        mentor_name: 'Internal Mentor',
        is_internal: true,
      }]);
      setMessage({ type: 'success', text: 'Internal mentor added successfully' });
    }
  };

  const handleAddExternalMentor = async (assignment) => {
    // Fetch mentor details to get name for display
    try {
      const mentorResponse = await mentorsAPI.getById(assignment.mentor_id);
      const mentor = mentorResponse.data;
      const mentorName = mentor.name || 'External Mentor';
      
      setSelectedMentors([...selectedMentors, {
        ...assignment,
        mentor_name: mentorName,
        is_internal: false,
      }]);
      setMessage({ type: 'success', text: 'External mentor added successfully' });
    } catch (error) {
      console.error('Error fetching mentor details:', error);
      // Still add the mentor even if we can't fetch details
      setSelectedMentors([...selectedMentors, {
        ...assignment,
        mentor_name: 'External Mentor',
        is_internal: false,
      }]);
      setMessage({ type: 'success', text: 'External mentor added successfully' });
    }
  };

  const handleRemoveMentor = (index) => {
    setSelectedMentors(selectedMentors.filter((_, i) => i !== index));
  };

  const handleDelete = async (id) => {
    const confirmMessage = 'Are you sure you want to PERMANENTLY DELETE this course? This will completely remove it from the database and cannot be undone. All course data will be lost forever.';
    
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

  const handleGenerateReport = async (courseId) => {
    try {
      const response = await coursesAPI.generateReport(courseId);
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const contentDisposition = response.headers['content-disposition'];
      let filename = `course_report_${courseId}.xlsx`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/i);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: 'Report generated and downloaded successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Error generating report' });
    }
  };

  const handleViewDetails = (courseId) => {
    navigate(`/courses/${courseId}`);
  };

  const handleApproveCourse = async (courseId) => {
    // Simple confirmation popup
    if (!window.confirm('Are you sure you want to approve this course? This will move it from Planning to Ongoing Courses and make all draft changes permanent.')) {
      return;
    }

    try {
      // Use "Admin" as default approved_by value
      await coursesAPI.approveCourse(courseId, 'Admin');
      setMessage({ type: 'success', text: 'Course approved and moved to ongoing courses!' });
      fetchCourses();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Error approving course' });
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
            {status === 'ongoing' ? 'Ongoing Courses' : status === 'planning' ? 'Planning Courses' : 'Completed Courses'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {status === 'ongoing' ? 'Courses currently in progress' : status === 'planning' ? 'Courses scheduled for the future' : 'Courses that have been completed'}
          </Typography>
        </Box>
        <Box display="flex" gap={2}>
          {status === 'planning' && (
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
        <>
          {/* Search and Filter Section */}
          <Card
            sx={{
              borderRadius: 3,
              boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.1)}`,
              border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
              mb: 3,
            }}
          >
            <CardContent>
              <Box display="flex" gap={2} flexWrap="wrap">
                <Autocomplete
                  options={allCourses}
                  getOptionLabel={(option) => option ? `${option.name} (${option.batch_code})` : ''}
                  value={selectedSearchCourse}
                  onChange={(event, newValue) => {
                    setSelectedSearchCourse(newValue);
                    if (newValue) {
                      setSearchQuery(newValue.name || '');
                    } else {
                      setSearchQuery('');
                    }
                  }}
                  onInputChange={(event, newInputValue) => {
                    setSearchQuery(newInputValue);
                    if (!newInputValue) {
                      setSelectedSearchCourse(null);
                    }
                  }}
                  inputValue={searchQuery}
                  filterOptions={(options, { inputValue }) => {
                    if (!inputValue) return [];
                    const searchLower = inputValue.toLowerCase();
                    return options.filter((course) =>
                      course.name?.toLowerCase().includes(searchLower) ||
                      course.batch_code?.toLowerCase().includes(searchLower)
                    );
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Search Courses"
                      placeholder="Search by name or batch code..."
                      size="small"
                      sx={{ minWidth: 300, flexGrow: 1 }}
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <>
                            <InputAdornment position="start">
                              <Search sx={{ color: 'text.secondary' }} />
                            </InputAdornment>
                            {params.InputProps.startAdornment}
                          </>
                        ),
                      }}
                    />
                  )}
                  renderOption={(props, course) => (
                    <Box component="li" {...props} key={course.id}>
                      <Box>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {course.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {course.batch_code} {course.start_date && `• ${course.start_date}`}
                        </Typography>
                      </Box>
                    </Box>
                  )}
                  noOptionsText="No courses found"
                  clearOnEscape
                  clearOnBlur={false}
                />
                <LocalizationProvider dateAdapter={AdapterDateFns}>
                  <DatePicker
                    label="Start Date (From)"
                    value={startDateFilter}
                    onChange={(newValue) => setStartDateFilter(newValue)}
                    slotProps={{
                      textField: {
                        size: 'small',
                        sx: { minWidth: 200 },
                      },
                    }}
                    views={['year', 'month', 'day']}
                  />
                  <DatePicker
                    label="End Date (To)"
                    value={endDateFilter}
                    onChange={(newValue) => setEndDateFilter(newValue)}
                    slotProps={{
                      textField: {
                        size: 'small',
                        sx: { minWidth: 200 },
                      },
                    }}
                    views={['year', 'month', 'day']}
                  />
                </LocalizationProvider>
                {(startDateFilter || endDateFilter || searchQuery || selectedSBU) && (
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      setStartDateFilter(null);
                      setEndDateFilter(null);
                      setSearchQuery('');
                      setSelectedSearchCourse(null);
                      setSelectedSBU('');
                    }}
                    sx={{ alignSelf: 'flex-start', mt: 0.5 }}
                  >
                    Clear Filters
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>

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
                  {filteredCourses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                        <Typography variant="body2" color="text.secondary">
                          No courses found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCourses.map((course) => (
                  <TableRow
                        key={course.id}
                    sx={{
                      '&:hover': {
                        backgroundColor: alpha(theme.palette.primary.main, 0.03),
                            cursor: 'pointer',
                      },
                      transition: 'background-color 0.2s',
                    }}
                        onClick={() => handleViewDetails(course.id)}
                      >
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
                        <TableCell onClick={(e) => e.stopPropagation()}>
                      <Box display="flex" gap={1}>
                        <IconButton
                          color="primary"
                          onClick={() => handleGenerateReport(course.id)}
                          title="Generate Report"
                                                  size="small"
                        >
                              <Download />
                                                  </IconButton>
                        {status === 'planning' && (course.status === 'draft' || String(course.status).toLowerCase() === 'draft') && (
                                                  <IconButton
                                                    color="success"
                              onClick={() => handleApproveCourse(course.id)}
                              title="Approve Course"
                                                    size="small"
                                                  >
                              <CheckCircle />
                                                  </IconButton>
                        )}
                        {status !== 'completed' && (
                                                <IconButton
                                                    color="error"
                              onClick={() => handleDelete(course.id)}
                              title="Delete Course"
                                                    size="small"
                            >
                              <Delete />
                                                  </IconButton>
                                                )}
                                </Box>
                    </TableCell>
                  </TableRow>
                    ))
                  )}
            </TableBody>
          </Table>
        </TableContainer>
        </Card>
        </>
      )}

      {/* Create Course Dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
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
                onChange={(newValue) => setFormData({ ...formData, start_date: newValue })}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    required: true,
                  },
                }}
              />
              <DatePicker
                label="End Date"
                value={formData.end_date}
                onChange={(newValue) => setFormData({ ...formData, end_date: newValue })}
                slotProps={{
                  textField: {
                    fullWidth: true,
                  },
                }}
              />
            </LocalizationProvider>
            <TextField
              label="Seat Limit"
              type="number"
              value={formData.seat_limit}
              onChange={(e) => setFormData({ ...formData, seat_limit: parseInt(e.target.value) || 0 })}
              fullWidth
              required
              inputProps={{ min: 0 }}
            />
            <TextField
              label="Total Classes Offered"
              type="number"
              value={formData.total_classes_offered}
              onChange={(e) => setFormData({ ...formData, total_classes_offered: e.target.value })}
              fullWidth
              helperText="Used for calculating attendance percentage"
              inputProps={{ min: 0 }}
            />
            <TextField
              select
              label="Prerequisite Course"
              value={formData.prerequisite_course_id || ''}
              onChange={(e) => setFormData({ ...formData, prerequisite_course_id: e.target.value || null })}
              fullWidth
                  >
                    <MenuItem value="">None</MenuItem>
              {prerequisiteCourses.map((course) => (
                        <MenuItem key={course.id} value={course.id}>
                  {course.name} ({course.batch_code})
                        </MenuItem>
                      ))}
                  </TextField>
            
            <Divider sx={{ my: 2 }} />
            
            {/* Course Creation Type Selection */}
            <Box sx={{ 
              p: 2, 
              borderRadius: 2, 
              bgcolor: alpha(theme.palette.primary.main, 0.05),
              border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
            }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={createAsDraft}
                    onChange={(e) => setCreateAsDraft(e.target.checked)}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      Create as Draft
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {createAsDraft 
                        ? 'Course will be created in planning stage.'
                        : 'Course will be created directly as ongoing.'}
                    </Typography>
                  </Box>
                }
              />
              {!createAsDraft}
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Assign Mentors 
                </Typography>
                <Box display="flex" gap={1}>
                    <Button
                      variant="outlined"
                      size="small"
                    startIcon={<PersonAdd />}
                    onClick={() => setAssignInternalMentorDialogOpen(true)}
                  >
                    Assign Internal
                    </Button>
            <Button
              variant="outlined"
                    size="small"
                    startIcon={<Add />}
                    onClick={() => setAddExternalMentorDialogOpen(true)}
                  >
                    Add External
              </Button>
            </Box>
          </Box>
              
              {selectedMentors.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  No mentors assigned. Click "Assign Internal" or "Add External" to assign mentors to this course.
                </Typography>
              ) : (
                <Box display="flex" flexDirection="column" gap={1}>
                  {selectedMentors.map((mentor, index) => (
                    <Card key={index} variant="outlined" sx={{ p: 1.5 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {mentor.mentor_name || `Mentor ${index + 1}`}
                            {mentor.is_internal ? (
                              <Chip label="Internal" size="small" sx={{ ml: 1 }} color="primary" />
                            ) : (
                              <Chip label="External" size="small" sx={{ ml: 1 }} color="secondary" />
                            )}
                          </Typography>
            <Typography variant="body2" color="text.secondary">
                            Hours: {mentor.hours_taught || 0} | Amount: Tk {mentor.amount_paid || 0}
            </Typography>
              </Box>
                        <IconButton
                      size="small"
                          color="error"
                          onClick={() => handleRemoveMentor(index)}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                  </Box>
                    </Card>
                  ))}
                  </Box>
              )}
                </Box>
            </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
            <Button
            onClick={handleSubmit} 
                variant="contained"
            disabled={!formData.name || !formData.batch_code || !formData.start_date || formData.seat_limit <= 0}
          >
            Create
              </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Internal Mentor Dialog */}
      <AssignInternalMentorDialog
        open={assignInternalMentorDialogOpen}
        onClose={() => setAssignInternalMentorDialogOpen(false)}
        onAssign={handleAssignInternalMentor}
        isDraft={createAsDraft} // Use the checkbox state
      />

      {/* Add External Mentor Dialog */}
      <AddExternalMentorDialog
        open={addExternalMentorDialogOpen}
        onClose={() => setAddExternalMentorDialogOpen(false)}
        onAdd={handleAddExternalMentor}
        isDraft={createAsDraft} // Use the checkbox state
      />
    </Box>
  );
}

export default Courses;
