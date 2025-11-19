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
import { Add, Delete, Search, Download, PersonAdd, CheckCircle, Edit, AccessTime } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { coursesAPI, mentorsAPI } from '../services/api';
import AssignInternalMentorDialog from '../components/AssignInternalMentorDialog';
import AddExternalMentorDialog from '../components/AddExternalMentorDialog';
import { getCourseStatus } from '../utils/courseUtils';
import { formatDateForAPI, formatDateForDisplay } from '../utils/dateUtils';

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
  const [classSchedule, setClassSchedule] = useState([]); // Array of {day, start_time, end_time}
  const [prerequisiteCourses, setPrerequisiteCourses] = useState([]);
  const [selectedMentors, setSelectedMentors] = useState([]); // Array of { mentor_id, hours_taught, amount_paid, mentor_name, is_internal }
  const [assignInternalMentorDialogOpen, setAssignInternalMentorDialogOpen] = useState(false);
  const [addExternalMentorDialogOpen, setAddExternalMentorDialogOpen] = useState(false);
  const [createAsDraft, setCreateAsDraft] = useState(true); // Default to planning/draft
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);

  useEffect(() => {
    fetchCourses();
  }, [status]);

  useEffect(() => {
    if (open || editDialogOpen) {
      fetchPrerequisiteCourses();
    }
  }, [open, editDialogOpen]);


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
    setClassSchedule([]);
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
    setClassSchedule([]);
    setCreateAsDraft(true); // Reset to default
  };

  const handleSubmit = async () => {
    try {
      // Validate that end date is not before start date
      if (formData.end_date && formData.start_date && formData.end_date < formData.start_date) {
        setMessage({ type: 'error', text: 'End date cannot be before start date' });
        return;
      }
      
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
        class_schedule: classSchedule.length > 0 ? classSchedule : null,
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

  const handleEdit = (course) => {
    setEditingCourse(course);
    setFormData({
      name: course.name || '',
      batch_code: course.batch_code || '',
      description: course.description || '',
      start_date: course.start_date ? new Date(course.start_date) : null,
      end_date: course.end_date ? new Date(course.end_date) : null,
      seat_limit: course.seat_limit || 0,
      total_classes_offered: course.total_classes_offered || '',
      prerequisite_course_id: course.prerequisite_course_id || null,
    });
    setClassSchedule(course.class_schedule || []);
    setSelectedMentors([]); // Mentors are managed separately in course detail page
    setEditDialogOpen(true);
  };

  const handleEditClose = () => {
    setEditDialogOpen(false);
    setEditingCourse(null);
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
    setClassSchedule([]);
    setSelectedMentors([]);
  };

  const handleEditSubmit = async () => {
    if (!editingCourse) return;
    
    try {
      // Validate that end date is not before start date
      if (formData.end_date && formData.start_date && formData.end_date < formData.start_date) {
        setMessage({ type: 'error', text: 'End date cannot be before start date' });
        return;
      }
      
      await coursesAPI.update(editingCourse.id, {
        name: formData.name,
        batch_code: formData.batch_code,
        description: formData.description,
        start_date: formatDateForAPI(formData.start_date),
        end_date: formatDateForAPI(formData.end_date),
        seat_limit: formData.seat_limit,
        total_classes_offered: formData.total_classes_offered ? parseInt(formData.total_classes_offered) : null,
        prerequisite_course_id: formData.prerequisite_course_id || null,
        class_schedule: classSchedule.length > 0 ? classSchedule : null,
      });
      
      handleEditClose();
      fetchCourses();
      setMessage({ type: 'success', text: 'Course updated successfully' });
    } catch (error) {
      console.error('Error updating course:', error);
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Error updating course' });
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', background: `linear-gradient(135deg, ${alpha('#1e40af', 0.03)} 0%, ${alpha('#059669', 0.03)} 100%)` }}>
      {/* Enhanced header with modern gradient and improved spacing */}
      <Box sx={{ mb: 4, pt: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography 
              variant="h3" 
              sx={{ 
                fontWeight: 700,
                color: '#1e40af',
                mb: 1,
                letterSpacing: '-0.02em',
              }}
            >
              {status === 'ongoing' ? ' Ongoing Courses' : status === 'planning' ? ' Planning Courses' : ' Completed Courses'}
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.95rem' }}>
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
                  background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontWeight: 600,
                  px: 3,
                  boxShadow: '0 4px 12px rgba(30, 64, 175, 0.25)',
                  '&:hover': {
                    boxShadow: '0 6px 20px rgba(30, 64, 175, 0.35)',
                  },
                }}
              >
                Add New Course
              </Button>
            )}
          </Box>
        </Box>
      </Box>

      {message && (
        <Alert 
          severity={message.type}
          onClose={() => setMessage(null)}
          sx={{ 
            mb: 3,
            borderRadius: '8px',
            border: 'none',
            boxShadow: `0 4px 12px ${alpha(theme.palette[message.type === 'success' ? 'success' : 'error'].main, 0.15)}`,
          }} 
        >
          {message.text}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress sx={{ color: '#1e40af' }} />
        </Box>
      ) : (
        <>
          {/* Filter card with modern design */}
          <Card
            sx={{
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
              border: '1px solid rgba(30, 64, 175, 0.1)',
              mb: 3,
              background: '#ffffff',
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" gap={2} flexWrap="wrap" alignItems="flex-end">
                <Autocomplete
                  options={allCourses}
                  getOptionLabel={(option) => option ? `${option.name} (${option.batch_code})` : ''}
                  value={selectedSearchCourse}
                  onChange={(event, newValue) => {
                    setSelectedSearchCourse(newValue);
                    if (newValue) setSearchQuery(newValue.name || '');
                    else setSearchQuery('');
                  }}
                  onInputChange={(event, newInputValue) => {
                    setSearchQuery(newInputValue);
                    if (!newInputValue) setSelectedSearchCourse(null);
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
                      sx={{ minWidth: 280, flex: 1 }}
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <>
                            <InputAdornment position="start">
                              <Search sx={{ color: '#94a3b8', fontSize: '1.2rem' }} />
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
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
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
                    label="Start Date"
                    value={startDateFilter}
                    onChange={(newValue) => setStartDateFilter(newValue)}
                    slotProps={{
                      textField: {
                        size: 'small',
                        sx: { minWidth: 160 },
                      },
                    }}
                  />
                  <DatePicker
                    label="End Date"
                    value={endDateFilter}
                    onChange={(newValue) => setEndDateFilter(newValue)}
                    slotProps={{
                      textField: {
                        size: 'small',
                        sx: { minWidth: 160 },
                      },
                    }}
                  />
                </LocalizationProvider>
                {(startDateFilter || endDateFilter || searchQuery) && (
                  <Button
                    variant="text"
                    size="small"
                    onClick={() => {
                      setStartDateFilter(null);
                      setEndDateFilter(null);
                      setSearchQuery('');
                      setSelectedSearchCourse(null);
                    }}
                    sx={{ color: '#64748b', fontWeight: 500 }}
                  >
                    Clear
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>

          <Card
            sx={{
              borderRadius: '12px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
              border: '1px solid rgba(30, 64, 175, 0.1)',
              overflow: 'hidden',
              background: '#ffffff',
            }}
          >
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ background: 'linear-gradient(135deg, rgba(30, 64, 175, 0.05) 0%, rgba(5, 150, 105, 0.05) 100%)' }}>
                    <TableCell sx={{ fontWeight: 700, color: '#1e40af', fontSize: '0.9rem' }}>Course Name</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#1e40af', fontSize: '0.9rem' }}>Batch Code</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#1e40af', fontSize: '0.9rem' }}>Start Date</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#1e40af', fontSize: '0.9rem' }} align="right">Seats</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#1e40af', fontSize: '0.9rem' }} align="right">Enrolled</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#1e40af', fontSize: '0.9rem' }} align="right">Available</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#1e40af', fontSize: '0.9rem' }} align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredCourses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                        <Typography color="text.secondary" sx={{ fontSize: '0.95rem' }}>
                          No courses found
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCourses.map((course) => (
                      <TableRow
                        key={course.id}
                        sx={{
                          borderBottom: '1px solid rgba(30, 64, 175, 0.08)',
                          '&:hover': {
                            background: 'linear-gradient(90deg, rgba(30, 64, 175, 0.03) 0%, rgba(5, 150, 105, 0.03) 100%)',
                          },
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                        }}
                        onClick={() => handleViewDetails(course.id)}
                      >
                        <TableCell sx={{ fontWeight: 500, color: '#1e3a8a' }}>{course.name}</TableCell>
                        <TableCell sx={{ color: '#475569' }}>{course.batch_code}</TableCell>
                        <TableCell sx={{ color: '#64748b' }}>{formatDateForDisplay(course.start_date)}</TableCell>
                        <TableCell align="right" sx={{ color: '#475569' }}>{course.seat_limit}</TableCell>
                        <TableCell align="right" sx={{ color: '#475569' }}>{course.current_enrolled}</TableCell>
                        <TableCell align="right">
                          <Chip
                            label={course.seat_limit - course.current_enrolled}
                            size="small"
                            sx={{
                              background: course.seat_limit - course.current_enrolled > 0 
                                ? 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)'
                                : 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
                              color: course.seat_limit - course.current_enrolled > 0 ? '#047857' : '#991b1b',
                              fontWeight: 600,
                            }}
                          />
                        </TableCell>
                        <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                          <Box display="flex" gap={0.5} justifyContent="center">
                            <IconButton size="small" color="primary" title="Edit" onClick={() => handleEdit(course)}>
                              <Edit sx={{ fontSize: '1.1rem' }} />
                            </IconButton>
                            <IconButton size="small" sx={{ color: '#94a3b8' }} title="Download" onClick={() => handleGenerateReport(course.id)}>
                              <Download sx={{ fontSize: '1.1rem' }} />
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

      {/* Edit Course Dialog */}
      <Dialog open={editDialogOpen} onClose={handleEditClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 600 }}>Edit Course</DialogTitle>
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
                onChange={(newValue) => {
                  setFormData({ ...formData, start_date: newValue });
                  // If end date is before new start date, clear it
                  if (formData.end_date && newValue && formData.end_date < newValue) {
                    setFormData(prev => ({ ...prev, end_date: null }));
                  }
                }}
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
                onChange={(newValue) => {
                  // Validate that end date is not before start date
                  if (newValue && formData.start_date && newValue < formData.start_date) {
                    setMessage({ type: 'error', text: 'End date cannot be before start date' });
                    return;
                  }
                  setFormData({ ...formData, end_date: newValue });
                }}
                minDate={formData.start_date || undefined}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    error: formData.end_date && formData.start_date && formData.end_date < formData.start_date,
                    helperText: formData.end_date && formData.start_date && formData.end_date < formData.start_date 
                      ? 'End date cannot be before start date' 
                      : '',
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
              {prerequisiteCourses.filter(c => c.id !== editingCourse?.id).map((course) => (
                <MenuItem key={course.id} value={course.id}>
                  {course.name} ({course.batch_code})
                </MenuItem>
              ))}
            </TextField>
            
            <Divider sx={{ my: 2 }} />
            
            {/* Class Schedule Section */}
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Box display="flex" alignItems="center" gap={1}>
                  <AccessTime color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Class Schedule
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Add />}
                  onClick={() => setClassSchedule([...classSchedule, { day: '', start_time: '', end_time: '' }])}
                >
                  Add Schedule
                </Button>
              </Box>
              
              {classSchedule.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  No schedule added. Click "Add Schedule" to specify class days and times.
                </Typography>
              ) : (
                <Box display="flex" flexDirection="column" gap={2}>
                  {classSchedule.map((schedule, index) => (
                    <Card key={index} variant="outlined" sx={{ p: 2 }}>
                      <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
                        <TextField
                          select
                          label="Day"
                          value={schedule.day}
                          onChange={(e) => {
                            const updated = [...classSchedule];
                            updated[index].day = e.target.value;
                            setClassSchedule(updated);
                          }}
                          sx={{ minWidth: 150 }}
                          required
                        >
                          <MenuItem value="Monday">Monday</MenuItem>
                          <MenuItem value="Tuesday">Tuesday</MenuItem>
                          <MenuItem value="Wednesday">Wednesday</MenuItem>
                          <MenuItem value="Thursday">Thursday</MenuItem>
                          <MenuItem value="Friday">Friday</MenuItem>
                          <MenuItem value="Saturday">Saturday</MenuItem>
                          <MenuItem value="Sunday">Sunday</MenuItem>
                        </TextField>
                        <TextField
                          label="Start Time"
                          type="time"
                          value={schedule.start_time}
                          onChange={(e) => {
                            const updated = [...classSchedule];
                            updated[index].start_time = e.target.value;
                            setClassSchedule(updated);
                          }}
                          InputLabelProps={{ shrink: true }}
                          sx={{ minWidth: 150 }}
                          required
                        />
                        <TextField
                          label="End Time"
                          type="time"
                          value={schedule.end_time}
                          onChange={(e) => {
                            const updated = [...classSchedule];
                            updated[index].end_time = e.target.value;
                            setClassSchedule(updated);
                          }}
                          InputLabelProps={{ shrink: true }}
                          sx={{ minWidth: 150 }}
                          required
                        />
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setClassSchedule(classSchedule.filter((_, i) => i !== index))}
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
          <Button onClick={handleEditClose}>Cancel</Button>
          <Button
            onClick={handleEditSubmit}
            variant="contained"
            disabled={!formData.name || !formData.batch_code || !formData.start_date || formData.seat_limit <= 0}
          >
            Update
          </Button>
        </DialogActions>
      </Dialog>

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
                onChange={(newValue) => {
                  setFormData({ ...formData, start_date: newValue });
                  // If end date is before new start date, clear it
                  if (formData.end_date && newValue && formData.end_date < newValue) {
                    setFormData(prev => ({ ...prev, end_date: null }));
                  }
                }}
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
                onChange={(newValue) => {
                  // Validate that end date is not before start date
                  if (newValue && formData.start_date && newValue < formData.start_date) {
                    setMessage({ type: 'error', text: 'End date cannot be before start date' });
                    return;
                  }
                  setFormData({ ...formData, end_date: newValue });
                }}
                minDate={formData.start_date || undefined}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    error: formData.end_date && formData.start_date && formData.end_date < formData.start_date,
                    helperText: formData.end_date && formData.start_date && formData.end_date < formData.start_date 
                      ? 'End date cannot be before start date' 
                      : '',
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
            
            {/* Class Schedule Section */}
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Box display="flex" alignItems="center" gap={1}>
                  <AccessTime color="primary" />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Class Schedule
                  </Typography>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Add />}
                  onClick={() => setClassSchedule([...classSchedule, { day: '', start_time: '', end_time: '' }])}
                >
                  Add Schedule
                </Button>
              </Box>
              
              {classSchedule.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  No schedule added. Click "Add Schedule" to specify class days and times.
                </Typography>
              ) : (
                <Box display="flex" flexDirection="column" gap={2}>
                  {classSchedule.map((schedule, index) => (
                    <Card key={index} variant="outlined" sx={{ p: 2 }}>
                      <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
                        <TextField
                          select
                          label="Day"
                          value={schedule.day}
                          onChange={(e) => {
                            const updated = [...classSchedule];
                            updated[index].day = e.target.value;
                            setClassSchedule(updated);
                          }}
                          sx={{ minWidth: 150 }}
                          required
                        >
                          <MenuItem value="Monday">Monday</MenuItem>
                          <MenuItem value="Tuesday">Tuesday</MenuItem>
                          <MenuItem value="Wednesday">Wednesday</MenuItem>
                          <MenuItem value="Thursday">Thursday</MenuItem>
                          <MenuItem value="Friday">Friday</MenuItem>
                          <MenuItem value="Saturday">Saturday</MenuItem>
                          <MenuItem value="Sunday">Sunday</MenuItem>
                        </TextField>
                        <TextField
                          label="Start Time"
                          type="time"
                          value={schedule.start_time}
                          onChange={(e) => {
                            const updated = [...classSchedule];
                            updated[index].start_time = e.target.value;
                            setClassSchedule(updated);
                          }}
                          InputLabelProps={{ shrink: true }}
                          sx={{ minWidth: 150 }}
                          required
                        />
                        <TextField
                          label="End Time"
                          type="time"
                          value={schedule.end_time}
                          onChange={(e) => {
                            const updated = [...classSchedule];
                            updated[index].end_time = e.target.value;
                            setClassSchedule(updated);
                          }}
                          InputLabelProps={{ shrink: true }}
                          sx={{ minWidth: 150 }}
                          required
                        />
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => setClassSchedule(classSchedule.filter((_, i) => i !== index))}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Box>
                    </Card>
                  ))}
                </Box>
              )}
            </Box>
            
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
