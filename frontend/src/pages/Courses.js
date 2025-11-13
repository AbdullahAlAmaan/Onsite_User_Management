import React, { useEffect, useState, useMemo } from 'react';
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
import { Add, Edit, Archive, ExpandMore, ExpandLess, PersonRemove, History, UploadFile, People, Assessment, EventAvailable, Info, PersonAdd, Search, Delete, CheckCircle, Cancel, Visibility, Download } from '@mui/icons-material';
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
  const [isEditingCourse, setIsEditingCourse] = useState(false);
  const [editCourseData, setEditCourseData] = useState({});
  const [editCourseLoading, setEditCourseLoading] = useState(false);
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
  const [showAttendancePreview, setShowAttendancePreview] = useState(false);
  const [showEnrollmentPreview, setShowEnrollmentPreview] = useState(false);
  
  // Preview data for attendance & scores upload (from ADA2025A_completion.xlsx)
  const attendancePreviewData = [
    { bsid: 'EMP143', name: 'Casey Smith', email: 'casey.smith143@company.com', total_classes_attended: 30, score: 87 },
    { bsid: 'EMP102', name: 'Morgan Williams', email: 'morgan.williams102@company.com', total_classes_attended: 29, score: 87 },
    { bsid: 'EMP144', name: 'Reese Williams', email: 'reese.williams144@company.com', total_classes_attended: 24, score: 92 },
    { bsid: 'EMP120', name: 'Skyler Moore', email: 'skyler.moore120@company.com', total_classes_attended: 30, score: 88 },
    { bsid: 'EMP117', name: 'Taylor Davis', email: 'taylor.davis117@company.com', total_classes_attended: 30, score: 93 },
  ];
  
  // Preview data for enrollment registration upload (from ADA2025A_registration.xlsx)
  const enrollmentPreviewData = [
    { employee_id: 'EMP143', name: 'Casey Smith', email: 'casey.smith143@company.com', sbu: 'Operations', designation: 'Engineer' },
    { employee_id: 'EMP102', name: 'Morgan Williams', email: 'morgan.williams102@company.com', sbu: 'Marketing', designation: 'Engineer' },
    { employee_id: 'EMP144', name: 'Reese Williams', email: 'reese.williams144@company.com', sbu: 'Operations', designation: 'Manager' },
    { employee_id: 'EMP120', name: 'Skyler Moore', email: 'skyler.moore120@company.com', sbu: 'HR', designation: 'Engineer' },
    { employee_id: 'EMP117', name: 'Taylor Davis', email: 'taylor.davis117@company.com', sbu: 'IT', designation: 'Engineer' },
  ];
  const [editAttendanceDialogOpen, setEditAttendanceDialogOpen] = useState(false);
  const [selectedEnrollmentForEdit, setSelectedEnrollmentForEdit] = useState(null);
  const [editClassesAttended, setEditClassesAttended] = useState('');
  const [editScore, setEditScore] = useState('');
  const [editAttendanceLoading, setEditAttendanceLoading] = useState(false);
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

  // Filter courses based on search query and date filters
  const filteredCourses = useMemo(() => {
    let filtered = [...courses];
    
    // Filter by search query if provided (only if not using autocomplete selection)
    if (searchQuery.trim() && !selectedSearchCourse) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(course => 
        course.name?.toLowerCase().includes(query) ||
        course.batch_code?.toLowerCase().includes(query)
      );
    } else if (selectedSearchCourse) {
      // If a course is selected from autocomplete, show only that course
      filtered = filtered.filter(course => course.id === selectedSearchCourse.id);
    }
    
    // Filter by start date
    if (startDateFilter) {
      const filterDate = new Date(startDateFilter);
      filterDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(course => {
        if (!course.start_date) return false;
        const courseDate = new Date(course.start_date);
        courseDate.setHours(0, 0, 0, 0);
        return courseDate >= filterDate;
      });
    }
    
    // Filter by end date
    if (endDateFilter) {
      const filterDate = new Date(endDateFilter);
      filterDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(course => {
        if (!course.end_date) return false;
        const courseDate = new Date(course.end_date);
        courseDate.setHours(23, 59, 59, 999);
        return courseDate <= filterDate;
      });
    }
    
    return filtered;
  }, [courses, searchQuery, selectedSearchCourse, startDateFilter, endDateFilter]);

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
      prerequisite_course_id: null,
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

  const handleEditAttendance = async () => {
    if (!selectedEnrollmentForEdit) return;
    
    const classesAttended = parseInt(editClassesAttended);
    const score = parseFloat(editScore);
    
    if (isNaN(classesAttended) || classesAttended < 0) {
      setMessage({ type: 'error', text: 'Please enter a valid number of classes attended' });
      return;
    }
    
    if (isNaN(score) || score < 0 || score > 100) {
      setMessage({ type: 'error', text: 'Please enter a valid score between 0 and 100' });
      return;
    }
    
    setEditAttendanceLoading(true);
    try {
      await completionsAPI.updateEnrollmentAttendance(
        selectedEnrollmentForEdit.id,
        classesAttended,
        score
      );
      
      setMessage({ type: 'success', text: 'Attendance and score updated successfully' });
      setEditAttendanceDialogOpen(false);
      setSelectedEnrollmentForEdit(null);
      setEditClassesAttended('');
      setEditScore('');
      
      // Refresh enrollments for the course
      if (expandedCourse) {
        const response = await enrollmentsAPI.getAll({ course_id: expandedCourse });
        setCourseEnrollments({ ...courseEnrollments, [expandedCourse]: response.data });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Error updating attendance and score' });
    } finally {
      setEditAttendanceLoading(false);
    }
  };

  const handleCloseEditAttendance = () => {
    setEditAttendanceDialogOpen(false);
    setSelectedEnrollmentForEdit(null);
    setEditClassesAttended('');
    setEditScore('');
  };

  const handleApprove = async (id) => {
    // Save scroll position before approval
    const scrollPosition = window.scrollY || window.pageYOffset;
    
    try {
      await enrollmentsAPI.approve({ enrollment_id: id, approved: true }, 'Admin');
      setMessage({ type: 'success', text: 'Enrollment approved successfully' });
      
      // Refresh enrollments for the course
      if (expandedCourse) {
        const response = await enrollmentsAPI.getAll({ course_id: expandedCourse });
        setCourseEnrollments({ ...courseEnrollments, [expandedCourse]: response.data });
      }
      
      // Refresh courses to update seat counts
      await fetchCourses();
      
      // Restore scroll position after DOM updates
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo(0, scrollPosition);
        });
      });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Error approving enrollment' });
      // Restore scroll position even on error
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo(0, scrollPosition);
        });
      });
    }
  };

  const handleReject = async (id) => {
    // Save scroll position before rejection
    const scrollPosition = window.scrollY || window.pageYOffset;
    
    try {
      await enrollmentsAPI.approve(
        { enrollment_id: id, approved: false, rejection_reason: 'Rejected by admin' },
        'Admin'
      );
      setMessage({ type: 'success', text: 'Enrollment rejected' });
      
      // Refresh enrollments for the course
      if (expandedCourse) {
        const response = await enrollmentsAPI.getAll({ course_id: expandedCourse });
        setCourseEnrollments({ ...courseEnrollments, [expandedCourse]: response.data });
      }
      
      await fetchCourses();
      
      // Restore scroll position after DOM updates
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo(0, scrollPosition);
        });
      });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Error rejecting enrollment' });
      // Restore scroll position even on error
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo(0, scrollPosition);
        });
      });
    }
  };

  const handleReapprove = async (enrollment) => {
    // Save scroll position before reapproval
    const scrollPosition = window.scrollY || window.pageYOffset;
    
    try {
      await enrollmentsAPI.reapprove(enrollment.id, 'Admin');
      setMessage({ type: 'success', text: 'Student reapproved successfully' });
      
      // Refresh enrollments for the course
      if (expandedCourse) {
        const response = await enrollmentsAPI.getAll({ course_id: expandedCourse });
        setCourseEnrollments({ ...courseEnrollments, [expandedCourse]: response.data });
      }
      
      // Refresh courses to update seat counts
      await fetchCourses();
      
      // Restore scroll position after DOM updates
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo(0, scrollPosition);
        });
      });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Error reapproving student' });
      // Restore scroll position even on error
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          window.scrollTo(0, scrollPosition);
        });
      });
    }
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
    setEditCourseData({
      name: course.name || '',
      batch_code: course.batch_code || '',
      description: course.description || '',
      start_date: course.start_date ? new Date(course.start_date) : null,
      end_date: course.end_date ? new Date(course.end_date) : null,
      seat_limit: course.seat_limit || 0,
      total_classes_offered: course.total_classes_offered || '',
      prerequisite_course_id: course.prerequisite_course_id || null,
    });
    setIsEditingCourse(false);
    setCourseDetailsCardOpen(true);
  };

  const handleSaveCourseEdit = async () => {
    if (!selectedCourseForDetails) return;
    
    setEditCourseLoading(true);
    try {
      const updateData = {
        name: editCourseData.name || '',
        batch_code: editCourseData.batch_code || '',
        description: editCourseData.description || null,
        start_date: editCourseData.start_date ? editCourseData.start_date.toISOString().split('T')[0] : null,
        end_date: editCourseData.end_date ? editCourseData.end_date.toISOString().split('T')[0] : null,
        seat_limit: parseInt(editCourseData.seat_limit) || 0,
        total_classes_offered: editCourseData.total_classes_offered ? parseInt(editCourseData.total_classes_offered) : null,
        prerequisite_course_id: editCourseData.prerequisite_course_id || null,
      };
      
      await coursesAPI.update(selectedCourseForDetails.id, updateData);
      setMessage({ type: 'success', text: 'Course updated successfully' });
      setIsEditingCourse(false);
      fetchCourses();
      // Update the selected course details
      const updatedCourse = { ...selectedCourseForDetails, ...updateData };
      setSelectedCourseForDetails(updatedCourse);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Error updating course' });
    } finally {
      setEditCourseLoading(false);
    }
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
                  options={courses}
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
                <TextField
                  select
                  label="SBU"
                  value={selectedSBU}
                  onChange={(e) => setSelectedSBU(e.target.value)}
                  size="small"
                  sx={{ minWidth: 150 }}
                >
                  <MenuItem value="">All SBUs</MenuItem>
                  <MenuItem value="IT">IT</MenuItem>
                  <MenuItem value="HR">HR</MenuItem>
                  <MenuItem value="Finance">Finance</MenuItem>
                  <MenuItem value="Operations">Operations</MenuItem>
                  <MenuItem value="Sales">Sales</MenuItem>
                  <MenuItem value="Marketing">Marketing</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </TextField>
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
              {filteredCourses.map((course) => (
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
                              {/* Approved/Enrolled Students Section */}
                              {courseEnrollments[course.id].filter(e => {
                                if (e.approval_status !== 'Approved') return false;
                                if (selectedSBU && e.student_sbu !== selectedSBU) return false;
                                return true;
                              }).length > 0 && (
                                <Box>
                                  <Typography 
                                    variant="h6" 
                                    gutterBottom
                                    sx={{ 
                                      mb: 2,
                                      color: theme.palette.primary.main,
                                      fontWeight: 600,
                                    }}
                                  >
                                    Approved/Enrolled Students ({courseEnrollments[course.id].filter(e => {
                                      if (e.approval_status !== 'Approved') return false;
                                      if (selectedSBU && e.student_sbu !== selectedSBU) return false;
                                      return true;
                                    }).length})
                                  </Typography>
                                  <TableContainer 
                                    component={Paper} 
                                    variant="outlined"
                                    sx={{
                                      borderRadius: 2,
                                      border: `2px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                                      backgroundColor: alpha(theme.palette.primary.main, 0.02),
                                    }}
                                  >
                                    <Table size="small">
                                      <TableHead>
                                        <TableRow sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.1) }}>
                                          <TableCell sx={{ fontWeight: 600 }}>Employee ID</TableCell>
                                          <TableCell sx={{ fontWeight: 600 }}>Student Name</TableCell>
                                          <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                                          <TableCell sx={{ fontWeight: 600 }}>SBU</TableCell>
                                          <TableCell sx={{ fontWeight: 600 }}>Completion Status</TableCell>
                                          <TableCell sx={{ fontWeight: 600 }}>Score</TableCell>
                                          <TableCell sx={{ fontWeight: 600 }}>Attendance</TableCell>
                                          <TableCell sx={{ fontWeight: 600 }}>Overall Completion</TableCell>
                                          <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                                        </TableRow>
                                      </TableHead>
                                      <TableBody>
                                        {courseEnrollments[course.id]
                                          .filter(enrollment => {
                                            if (enrollment.approval_status !== 'Approved') return false;
                                            if (selectedSBU && enrollment.student_sbu !== selectedSBU) return false;
                                            return true;
                                          })
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
                                                  {enrollment.student_name}
                                                </Typography>
                                              </TableCell>
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
                                              <TableCell>
                                                {(() => {
                                                  const rate = enrollment.overall_completion_rate || 0;
                                                  let color = 'error.main';
                                                  if (rate >= 75) {
                                                    color = 'success.main';
                                                  } else if (rate >= 60) {
                                                    color = 'warning.main';
                                                  }
                                                  return (
                                                    <Typography
                                                      sx={{
                                                        color: color,
                                                        fontWeight: 600,
                                                      }}
                                                    >
                                                      {rate}% ({enrollment.completed_courses || 0}/{enrollment.total_courses_assigned || 0})
                                                    </Typography>
                                                  );
                                                })()}
                                              </TableCell>
                                              <TableCell>
                                                <Box display="flex" gap={1}>
                                                  <IconButton
                                                    size="small"
                                                    color="primary"
                                                    onClick={() => {
                                                      setSelectedEnrollmentForEdit(enrollment);
                                                      setEditClassesAttended(enrollment.present != null ? String(enrollment.present) : '');
                                                      setEditScore(enrollment.score != null ? String(enrollment.score) : '');
                                                      setEditAttendanceDialogOpen(true);
                                                    }}
                                                    title="Edit Attendance & Score"
                                                  >
                                                    <Edit fontSize="small" />
                                                  </IconButton>
                                                  <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => handleWithdraw(enrollment)}
                                                    title="Withdraw Student"
                                                  >
                                                    <PersonRemove fontSize="small" />
                                                  </IconButton>
                                                </Box>
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                      </TableBody>
                                    </Table>
                                  </TableContainer>
                                </Box>
                              )}

                              {/* Withdrawn Students Section */}
                              {courseEnrollments[course.id].filter(e => {
                                if (e.approval_status !== 'Withdrawn') return false;
                                if (selectedSBU && e.student_sbu !== selectedSBU) return false;
                                return true;
                              }).length > 0 && (
                                <Box>
                                  <Typography 
                                    variant="h6" 
                                    gutterBottom
                                    sx={{ 
                                      mb: 2,
                                      color: theme.palette.warning.main,
                                      fontWeight: 600,
                                    }}
                                  >
                                    Withdrawn Students ({courseEnrollments[course.id].filter(e => {
                                      if (e.approval_status !== 'Withdrawn') return false;
                                      if (selectedSBU && e.student_sbu !== selectedSBU) return false;
                                      return true;
                                    }).length})
                                  </Typography>
                                  <TableContainer 
                                    component={Paper} 
                                    variant="outlined"
                                    sx={{
                                      borderRadius: 2,
                                      border: `2px solid ${alpha(theme.palette.warning.main, 0.3)}`,
                                      backgroundColor: alpha(theme.palette.warning.main, 0.02),
                                    }}
                                  >
                                    <Table size="small">
                                      <TableHead>
                                        <TableRow sx={{ backgroundColor: alpha(theme.palette.warning.main, 0.1) }}>
                                          <TableCell sx={{ fontWeight: 600 }}>Employee ID</TableCell>
                                          <TableCell sx={{ fontWeight: 600 }}>Student Name</TableCell>
                                          <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                                          <TableCell sx={{ fontWeight: 600 }}>SBU</TableCell>
                                          <TableCell sx={{ fontWeight: 600 }}>Withdrawal Reason</TableCell>
                                          <TableCell sx={{ fontWeight: 600 }}>Overall Completion</TableCell>
                                          <TableCell sx={{ fontWeight: 600 }}>
                                            <Box display="flex" alignItems="center" gap={0.5}>
                                              <Add fontSize="small" />
                                              Add
                                            </Box>
                                          </TableCell>
                                        </TableRow>
                                      </TableHead>
                                      <TableBody>
                                        {courseEnrollments[course.id]
                                          .filter(enrollment => {
                                            if (enrollment.approval_status !== 'Withdrawn') return false;
                                            if (selectedSBU && enrollment.student_sbu !== selectedSBU) return false;
                                            return true;
                                          })
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
                                                  {enrollment.student_name}
                                                </Typography>
                                              </TableCell>
                                              <TableCell>{enrollment.student_email}</TableCell>
                                              <TableCell>
                                                <Chip label={enrollment.student_sbu} size="small" />
                                              </TableCell>
                                              <TableCell>
                                                {enrollment.rejection_reason ? (
                                                  <Typography variant="body2" color="error">
                                                    {enrollment.rejection_reason}
                                                  </Typography>
                                                ) : (
                                                  <Typography variant="body2" color="text.secondary">
                                                    No reason provided
                                                  </Typography>
                                                )}
                                              </TableCell>
                                              <TableCell>
                                                {(() => {
                                                  const rate = enrollment.overall_completion_rate || 0;
                                                  let color = 'error.main';
                                                  if (rate >= 75) {
                                                    color = 'success.main';
                                                  } else if (rate >= 60) {
                                                    color = 'warning.main';
                                                  }
                                                  return (
                                                    <Typography
                                                      sx={{
                                                        color: color,
                                                        fontWeight: 600,
                                                      }}
                                                    >
                                                      {rate}% ({enrollment.completed_courses || 0}/{enrollment.total_courses_assigned || 0})
                                                    </Typography>
                                                  );
                                                })()}
                                              </TableCell>
                                              <TableCell>
                                                <IconButton
                                                  size="small"
                                                  color="success"
                                                  onClick={() => handleReapprove(enrollment)}
                                                  title="Reapprove Student"
                                                >
                                                  <PersonAdd fontSize="small" />
                                                </IconButton>
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                      </TableBody>
                                    </Table>
                                  </TableContainer>
                                </Box>
                              )}

                              {/* Not Eligible Enrollments Section */}
                              {courseEnrollments[course.id].filter(e => {
                                if (e.eligibility_status === 'Eligible' || e.approval_status === 'Approved' || e.approval_status === 'Withdrawn') return false;
                                if (selectedSBU && e.student_sbu !== selectedSBU) return false;
                                return true;
                              }).length > 0 && (
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
                                    Not Eligible Enrollments ({courseEnrollments[course.id].filter(e => {
                                      if (e.eligibility_status === 'Eligible' || e.approval_status === 'Approved' || e.approval_status === 'Withdrawn') return false;
                                      if (selectedSBU && e.student_sbu !== selectedSBU) return false;
                                      return true;
                                    }).length})
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
                                          <TableCell sx={{ fontWeight: 600 }}>Eligibility Reason</TableCell>
                                          <TableCell sx={{ fontWeight: 600 }}>Approval Status</TableCell>
                                          <TableCell sx={{ fontWeight: 600 }}>Overall Completion</TableCell>
                                          <TableCell sx={{ fontWeight: 600 }}>
                                            <Box display="flex" alignItems="center" gap={0.5}>
                                              <Add fontSize="small" />
                                              Add
                                            </Box>
                                          </TableCell>
                                        </TableRow>
                                      </TableHead>
                                      <TableBody>
                                        {courseEnrollments[course.id]
                                          .filter(enrollment => {
                                            if (enrollment.eligibility_status === 'Eligible' || enrollment.approval_status === 'Approved' || enrollment.approval_status === 'Withdrawn') return false;
                                            if (selectedSBU && enrollment.student_sbu !== selectedSBU) return false;
                                            return true;
                                          })
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
                                                  {enrollment.student_name}
                                                </Typography>
                                              </TableCell>
                                              <TableCell>{enrollment.student_email}</TableCell>
                                              <TableCell>
                                                <Chip label={enrollment.student_sbu} size="small" />
                                              </TableCell>
                                              <TableCell>
                                                <Box>
                                                  <Chip
                                                    label={enrollment.eligibility_status}
                                                    color="error"
                                                    size="small"
                                                    sx={{ mb: enrollment.eligibility_reason ? 0.5 : 0 }}
                                                  />
                                                  {enrollment.eligibility_reason && (
                                                    <Typography
                                                      variant="caption"
                                                      sx={{
                                                        display: 'block',
                                                        color: 'text.secondary',
                                                        mt: 0.5,
                                                        fontStyle: 'italic',
                                                      }}
                                                    >
                                                      {enrollment.eligibility_reason}
                                                    </Typography>
                                                  )}
                                                </Box>
                                              </TableCell>
                                              <TableCell>
                                                <Chip
                                                  label={enrollment.approval_status}
                                                  color={
                                                    enrollment.approval_status === 'Pending' ? 'warning' :
                                                    enrollment.approval_status === 'Rejected' ? 'error' : 'default'
                                                  }
                                                  size="small"
                                                />
                                                {enrollment.rejection_reason && enrollment.approval_status === 'Rejected' && (
                                                  <Typography
                                                    variant="caption"
                                                    sx={{
                                                      display: 'block',
                                                      color: 'error.main',
                                                      mt: 0.5,
                                                      fontStyle: 'italic',
                                                    }}
                                                  >
                                                    {enrollment.rejection_reason}
                                                  </Typography>
                                                )}
                                              </TableCell>
                                              <TableCell>
                                                {(() => {
                                                  const rate = enrollment.overall_completion_rate || 0;
                                                  let color = 'error.main';
                                                  if (rate >= 75) {
                                                    color = 'success.main';
                                                  } else if (rate >= 60) {
                                                    color = 'warning.main';
                                                  }
                                                  return (
                                                    <Typography
                                                      sx={{
                                                        color: color,
                                                        fontWeight: 600,
                                                      }}
                                                    >
                                                      {rate}% ({enrollment.completed_courses || 0}/{enrollment.total_courses_assigned || 0})
                                                    </Typography>
                                                  );
                                                })()}
                                              </TableCell>
                                              <TableCell>
                                                <Box display="flex" gap={1}>
                                                  {enrollment.approval_status === 'Pending' && (
                                                    <>
                                                      <IconButton
                                                        size="small"
                                                        color="success"
                                                        onClick={() => handleApprove(enrollment.id)}
                                                        title="Approve (Admin Override)"
                                                      >
                                                        <CheckCircle fontSize="small" />
                                                      </IconButton>
                                                      <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() => handleReject(enrollment.id)}
                                                        title="Reject"
                                                      >
                                                        <Cancel fontSize="small" />
                                                      </IconButton>
                                                    </>
                                                  )}
                                                  {enrollment.approval_status === 'Rejected' && (
                                                    <IconButton
                                                      size="small"
                                                      color="success"
                                                      onClick={() => handleApprove(enrollment.id)}
                                                      title="Approve (Admin Override)"
                                                    >
                                                      <CheckCircle fontSize="small" />
                                                    </IconButton>
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

                              {/* Eligible Enrollments (Pending) Section */}
                              {courseEnrollments[course.id].filter(e => {
                                if (e.eligibility_status !== 'Eligible' || e.approval_status !== 'Pending') return false;
                                if (selectedSBU && e.student_sbu !== selectedSBU) return false;
                                return true;
                              }).length > 0 && (
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
                                    Eligible Enrollments (Pending) ({courseEnrollments[course.id].filter(e => {
                                      if (e.eligibility_status !== 'Eligible' || e.approval_status !== 'Pending') return false;
                                      if (selectedSBU && e.student_sbu !== selectedSBU) return false;
                                      return true;
                                    }).length})
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
                                          <TableCell sx={{ fontWeight: 600 }}>Overall Completion</TableCell>
                                          <TableCell sx={{ fontWeight: 600 }}>Actions</TableCell>
                                        </TableRow>
                                      </TableHead>
                                      <TableBody>
                                        {courseEnrollments[course.id]
                                          .filter(enrollment => {
                                            if (enrollment.eligibility_status !== 'Eligible' || enrollment.approval_status !== 'Pending') return false;
                                            if (selectedSBU && enrollment.student_sbu !== selectedSBU) return false;
                                            return true;
                                          })
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
                                                  {enrollment.student_name}
                                                </Typography>
                                              </TableCell>
                                              <TableCell>{enrollment.student_email}</TableCell>
                                              <TableCell>
                                                <Chip label={enrollment.student_sbu} size="small" />
                                              </TableCell>
                                              <TableCell>
                                                {(() => {
                                                  const rate = enrollment.overall_completion_rate || 0;
                                                  let color = 'error.main';
                                                  if (rate >= 75) {
                                                    color = 'success.main';
                                                  } else if (rate >= 60) {
                                                    color = 'warning.main';
                                                  }
                                                  return (
                                                    <Typography
                                                      sx={{
                                                        color: color,
                                                        fontWeight: 600,
                                                      }}
                                                    >
                                                      {rate}% ({enrollment.completed_courses || 0}/{enrollment.total_courses_assigned || 0})
                                                    </Typography>
                                                  );
                                                })()}
                                              </TableCell>
                                              <TableCell>
                                                <Box display="flex" gap={1}>
                                                  <IconButton
                                                    size="small"
                                                    color="success"
                                                    onClick={() => handleApprove(enrollment.id)}
                                                    title="Approve"
                                                  >
                                                    <CheckCircle fontSize="small" />
                                                  </IconButton>
                                                  <IconButton
                                                    size="small"
                                                    color="error"
                                                    onClick={() => handleReject(enrollment.id)}
                                                    title="Reject"
                                                  >
                                                    <Cancel fontSize="small" />
                                                  </IconButton>
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
        </>
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
            <TextField
              select
              label="Prerequisite Course (Optional)"
              value={formData.prerequisite_course_id || ''}
              onChange={(e) => setFormData({ ...formData, prerequisite_course_id: e.target.value ? parseInt(e.target.value) : null })}
              fullWidth
              helperText="Select a course that students must have passed (completed) before enrolling in this course"
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {courses
                .filter(c => !c.is_archived && c.id !== (formData.id || -1)) // Exclude archived and current course
                .map((course) => (
                  <MenuItem key={course.id} value={course.id}>
                    {course.name} - {course.batch_code}
                  </MenuItem>
                ))}
            </TextField>
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
          if (!isEditingCourse) {
            setCourseDetailsCardOpen(false);
            setSelectedCourseForDetails(null);
            setIsEditingCourse(false);
          }
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
        <DialogTitle sx={{ fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          Course Details
          {!isEditingCourse && (
            <Button
              startIcon={<Edit />}
              variant="outlined"
              size="small"
              onClick={() => setIsEditingCourse(true)}
              sx={{ textTransform: 'none' }}
            >
              Edit
            </Button>
          )}
        </DialogTitle>
        <DialogContent>
          {selectedCourseForDetails && (
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Course Name</Typography>
                {isEditingCourse ? (
                  <TextField
                    value={editCourseData.name}
                    onChange={(e) => setEditCourseData({ ...editCourseData, name: e.target.value })}
                    fullWidth
                    size="small"
                    sx={{ mt: 1 }}
                    required
                  />
                ) : (
                  <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
                    {selectedCourseForDetails.name}
                  </Typography>
                )}
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Batch Code</Typography>
                {isEditingCourse ? (
                  <TextField
                    value={editCourseData.batch_code}
                    onChange={(e) => setEditCourseData({ ...editCourseData, batch_code: e.target.value })}
                    fullWidth
                    size="small"
                    sx={{ mt: 1 }}
                    required
                  />
                ) : (
                  <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
                    {selectedCourseForDetails.batch_code}
                  </Typography>
                )}
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Start Date</Typography>
                {isEditingCourse ? (
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      value={editCourseData.start_date}
                      onChange={(newValue) => setEditCourseData({ ...editCourseData, start_date: newValue })}
                      slotProps={{ textField: { size: 'small', fullWidth: true, sx: { mt: 1 } } }}
                    />
                  </LocalizationProvider>
                ) : (
                  <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
                    {selectedCourseForDetails.start_date || '-'}
                  </Typography>
                )}
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">End Date</Typography>
                {isEditingCourse ? (
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      value={editCourseData.end_date}
                      onChange={(newValue) => setEditCourseData({ ...editCourseData, end_date: newValue })}
                      slotProps={{ textField: { size: 'small', fullWidth: true, sx: { mt: 1 } } }}
                    />
                  </LocalizationProvider>
                ) : (
                  <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
                    {selectedCourseForDetails.end_date || '-'}
                  </Typography>
                )}
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Seat Limit</Typography>
                {isEditingCourse ? (
                  <TextField
                    type="number"
                    value={editCourseData.seat_limit}
                    onChange={(e) => setEditCourseData({ ...editCourseData, seat_limit: e.target.value })}
                    fullWidth
                    size="small"
                    sx={{ mt: 1 }}
                    inputProps={{ min: selectedCourseForDetails.current_enrolled }}
                    helperText={`Currently enrolled: ${selectedCourseForDetails.current_enrolled}`}
                  />
                ) : (
                  <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
                    {selectedCourseForDetails.seat_limit}
                  </Typography>
                )}
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
                {isEditingCourse ? (
                  <TextField
                    type="number"
                    value={editCourseData.total_classes_offered}
                    onChange={(e) => setEditCourseData({ ...editCourseData, total_classes_offered: e.target.value })}
                    fullWidth
                    size="small"
                    sx={{ mt: 1 }}
                    inputProps={{ min: 1 }}
                    placeholder="Enter total classes"
                  />
                ) : (
                  <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
                    {selectedCourseForDetails.total_classes_offered || 'Not set'}
                  </Typography>
                )}
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2" color="text.secondary">Prerequisite Course</Typography>
                {isEditingCourse ? (
                  <TextField
                    select
                    value={editCourseData.prerequisite_course_id || ''}
                    onChange={(e) => setEditCourseData({ ...editCourseData, prerequisite_course_id: e.target.value ? parseInt(e.target.value) : null })}
                    fullWidth
                    size="small"
                    sx={{ mt: 1 }}
                  >
                    <MenuItem value="">None</MenuItem>
                    {courses
                      .filter(c => c.id !== selectedCourseForDetails.id && !c.is_archived)
                      .map((course) => (
                        <MenuItem key={course.id} value={course.id}>
                          {course.name} - {course.batch_code}
                        </MenuItem>
                      ))}
                  </TextField>
                ) : (
                  <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
                    {selectedCourseForDetails.prerequisite_course_id 
                      ? (() => {
                          const prereqCourse = courses.find(c => c.id === selectedCourseForDetails.prerequisite_course_id);
                          return prereqCourse ? `${prereqCourse.name} - ${prereqCourse.batch_code}` : 'Unknown';
                        })()
                      : 'None'}
                  </Typography>
                )}
              </Grid>
              <Grid item xs={12}>
                <Typography variant="body2" color="text.secondary">Description</Typography>
                {isEditingCourse ? (
                  <TextField
                    multiline
                    rows={4}
                    value={editCourseData.description}
                    onChange={(e) => setEditCourseData({ ...editCourseData, description: e.target.value })}
                    fullWidth
                    sx={{ mt: 1 }}
                    placeholder="Enter course description"
                  />
                ) : (
                  <Typography variant="body1" sx={{ fontWeight: 500, mb: 2 }}>
                    {selectedCourseForDetails.description || 'No description'}
                  </Typography>
                )}
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          {isEditingCourse ? (
            <>
              <Button 
                onClick={() => {
                  setIsEditingCourse(false);
                  // Reset to original values
                  setEditCourseData({
                    name: selectedCourseForDetails.name || '',
                    batch_code: selectedCourseForDetails.batch_code || '',
                    description: selectedCourseForDetails.description || '',
                    start_date: selectedCourseForDetails.start_date ? new Date(selectedCourseForDetails.start_date) : null,
                    end_date: selectedCourseForDetails.end_date ? new Date(selectedCourseForDetails.end_date) : null,
                    seat_limit: selectedCourseForDetails.seat_limit || 0,
                    total_classes_offered: selectedCourseForDetails.total_classes_offered || '',
                    prerequisite_course_id: selectedCourseForDetails.prerequisite_course_id || null,
                  });
                }}
                disabled={editCourseLoading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSaveCourseEdit}
                variant="contained"
                disabled={editCourseLoading}
                startIcon={editCourseLoading ? <CircularProgress size={20} /> : null}
              >
                Save Changes
              </Button>
            </>
          ) : (
            <Button onClick={() => {
              setCourseDetailsCardOpen(false);
              setSelectedCourseForDetails(null);
              setIsEditingCourse(false);
            }}>
              Close
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Import Dialog */}
      <Dialog
        open={importDialogOpen}
        onClose={handleCloseImport}
        maxWidth="lg"
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
              Upload an Excel (.xlsx, .xls) or CSV file with enrollment registration data. Required columns: employee_id, name, email, sbu. Optional: designation
            </Typography>
            
            {/* Preview Section */}
            <Box>
              <Box 
                display="flex" 
                alignItems="center" 
                justifyContent="space-between"
                sx={{ 
                  cursor: 'pointer',
                  p: 1,
                  borderRadius: 1,
                  '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.05) }
                }}
                onClick={() => setShowEnrollmentPreview(!showEnrollmentPreview)}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Visibility fontSize="small" />
                  Preview Expected Format
                </Typography>
                <IconButton size="small">
                  {showEnrollmentPreview ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              </Box>
              
              <Collapse in={showEnrollmentPreview}>
                <Box mt={1} sx={{ border: `1px solid ${alpha(theme.palette.divider, 0.1)}`, borderRadius: 2, overflow: 'hidden' }}>
                  <Box sx={{ p: 1, display: 'flex', justifyContent: 'flex-end', borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Download />}
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = '/ADA2025A_registration.xlsx';
                        link.download = 'ADA2025A_registration.xlsx';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      sx={{ textTransform: 'none' }}
                    >
                      Download Template
                    </Button>
                  </Box>
                  <TableContainer>
                    <Table size="small" sx={{ minWidth: 650 }}>
                      <TableHead>
                        <TableRow sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>
                          <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>employee_id</TableCell>
                          <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>name</TableCell>
                          <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>email</TableCell>
                          <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>sbu</TableCell>
                          <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>designation</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {enrollmentPreviewData.map((row, index) => (
                          <TableRow 
                            key={index}
                            sx={{ 
                              '&:nth-of-type(odd)': { backgroundColor: alpha(theme.palette.primary.main, 0.02) }
                            }}
                          >
                            <TableCell sx={{ fontSize: '0.75rem' }}>{row.employee_id}</TableCell>
                            <TableCell sx={{ fontSize: '0.75rem' }}>{row.name}</TableCell>
                            <TableCell sx={{ fontSize: '0.75rem' }}>{row.email}</TableCell>
                            <TableCell sx={{ fontSize: '0.75rem' }}>
                              <Chip label={row.sbu} size="small" sx={{ height: 20, fontSize: '0.7rem' }} />
                            </TableCell>
                            <TableCell sx={{ fontSize: '0.75rem' }}>{row.designation}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <Box sx={{ p: 1, backgroundColor: alpha(theme.palette.info.main, 0.05), borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                      <strong>Note:</strong> Column names are case-insensitive. SBU values: IT, HR, Finance, Operations, Sales, Marketing, Other. 
                      Designation is optional. The file will be imported for the selected course automatically.
                    </Typography>
                  </Box>
                </Box>
              </Collapse>
            </Box>
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
        maxWidth="lg"
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
              Upload an Excel (.xlsx, .xls) or CSV file with attendance and score data. Required columns: bsid (or employee_id), name, email, total_classes_attended, score
            </Typography>
            
            {/* Preview Section */}
            <Box>
              <Box 
                display="flex" 
                alignItems="center" 
                justifyContent="space-between"
                sx={{ 
                  cursor: 'pointer',
                  p: 1,
                  borderRadius: 1,
                  '&:hover': { backgroundColor: alpha(theme.palette.primary.main, 0.05) }
                }}
                onClick={() => setShowAttendancePreview(!showAttendancePreview)}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Visibility fontSize="small" />
                  Preview Expected Format
                </Typography>
                <IconButton size="small">
                  {showAttendancePreview ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              </Box>
              
              <Collapse in={showAttendancePreview}>
                <Box mt={1} sx={{ border: `1px solid ${alpha(theme.palette.divider, 0.1)}`, borderRadius: 2, overflow: 'hidden' }}>
                  <Box sx={{ p: 1, display: 'flex', justifyContent: 'flex-end', borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Download />}
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = '/ADA2025A_completion.xlsx';
                        link.download = 'ADA2025A_completion.xlsx';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      sx={{ textTransform: 'none' }}
                    >
                      Download Template
                    </Button>
                  </Box>
                  <TableContainer>
                    <Table size="small" sx={{ minWidth: 650 }}>
                      <TableHead>
                        <TableRow sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>
                          <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>bsid</TableCell>
                          <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>name</TableCell>
                          <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>email</TableCell>
                          <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>total_classes_attended</TableCell>
                          <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>score</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {attendancePreviewData.map((row, index) => (
                          <TableRow 
                            key={index}
                            sx={{ 
                              '&:nth-of-type(odd)': { backgroundColor: alpha(theme.palette.primary.main, 0.02) }
                            }}
                          >
                            <TableCell sx={{ fontSize: '0.75rem' }}>{row.bsid}</TableCell>
                            <TableCell sx={{ fontSize: '0.75rem' }}>{row.name}</TableCell>
                            <TableCell sx={{ fontSize: '0.75rem' }}>{row.email}</TableCell>
                            <TableCell sx={{ fontSize: '0.75rem' }}>{row.total_classes_attended}</TableCell>
                            <TableCell sx={{ fontSize: '0.75rem' }}>{row.score}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <Box sx={{ p: 1, backgroundColor: alpha(theme.palette.info.main, 0.05), borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                      <strong>Note:</strong> Column names are case-insensitive. bsid can also be employee_id. total_classes_attended should not exceed the course's "Total Classes Offered". 
                      Score is typically a percentage (0-100). Completion status will be automatically calculated based on attendance percentage (≥80% = Completed).
                    </Typography>
                  </Box>
                </Box>
              </Collapse>
            </Box>
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

      {/* Edit Attendance & Score Dialog */}
      <Dialog
        open={editAttendanceDialogOpen}
        onClose={handleCloseEditAttendance}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: `0 8px 32px ${alpha(theme.palette.primary.main, 0.2)}`,
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>Update Attendance & Score</DialogTitle>
        <DialogContent>
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            {selectedEnrollmentForEdit && (
              <>
                <Typography variant="body2" color="text.secondary">
                  <strong>Student:</strong> {selectedEnrollmentForEdit.student_name} ({selectedEnrollmentForEdit.student_employee_id})
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  <strong>Course:</strong> {selectedEnrollmentForEdit.course_name} - {selectedEnrollmentForEdit.batch_code}
                </Typography>
                {expandedCourse && courses.find(c => c.id === expandedCourse)?.total_classes_offered && (
                  <Typography variant="body2" color="text.secondary">
                    <strong>Total Classes Offered:</strong> {courses.find(c => c.id === expandedCourse).total_classes_offered}
                  </Typography>
                )}
              </>
            )}
            <TextField
              label="Classes Attended"
              type="number"
              value={editClassesAttended}
              onChange={(e) => setEditClassesAttended(e.target.value)}
              fullWidth
              required
              inputProps={{ min: 0, max: expandedCourse ? courses.find(c => c.id === expandedCourse)?.total_classes_offered : undefined }}
              helperText={expandedCourse && courses.find(c => c.id === expandedCourse)?.total_classes_offered 
                ? `Maximum: ${courses.find(c => c.id === expandedCourse).total_classes_offered} classes`
                : 'Enter the number of classes attended'}
            />
            <TextField
              label="Score"
              type="number"
              value={editScore}
              onChange={(e) => setEditScore(e.target.value)}
              fullWidth
              required
              inputProps={{ min: 0, max: 100, step: 0.1 }}
              helperText="Enter score (0-100). Completion status will be automatically updated based on 80% attendance threshold."
            />
            {editClassesAttended && expandedCourse && courses.find(c => c.id === expandedCourse)?.total_classes_offered && (
              <Typography variant="body2" color="primary.main" sx={{ fontWeight: 500 }}>
                Attendance: {((parseInt(editClassesAttended) || 0) / courses.find(c => c.id === expandedCourse).total_classes_offered * 100).toFixed(1)}%
                {((parseInt(editClassesAttended) || 0) / courses.find(c => c.id === expandedCourse).total_classes_offered * 100) >= 80 
                  ? ' (Will be marked as Completed)' 
                  : ' (Will be marked as Failed)'}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditAttendance} disabled={editAttendanceLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleEditAttendance} 
            variant="contained"
            disabled={editAttendanceLoading || !editClassesAttended || !editScore}
          >
            {editAttendanceLoading ? <CircularProgress size={24} /> : 'Update'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Courses;

