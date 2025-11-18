import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Grid,
  MenuItem,
  Autocomplete,
  Divider,
  List,
  ListItem,
  ListItemText,
  InputAdornment,
  Collapse,
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  Delete,
  PersonAdd,
  UploadFile,
  CheckCircle,
  Cancel,
  PersonRemove,
  Refresh,
  Add,
  Remove,
  AttachMoney,
  Restaurant,
  Receipt,
  Calculate,
  School,
  CalendarToday,
  People,
  Event,
  Person,
  AccountBalance,
  AccessTime,
  TrendingUp,
  Download,
  Visibility,
  ExpandMore,
  ExpandLess,
} from '@mui/icons-material';
import {
  coursesAPI,
  enrollmentsAPI,
  importsAPI,
  completionsAPI,
  studentsAPI,
  mentorsAPI,
} from '../services/api';
import UserDetailsDialog from '../components/UserDetailsDialog';
import AssignInternalMentorDialog from '../components/AssignInternalMentorDialog';
import AddExternalMentorDialog from '../components/AddExternalMentorDialog';
import { formatDateTimeForDisplay } from '../utils/dateUtils';

function CourseDetail() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { courseId } = useParams();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrollments, setEnrollments] = useState([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(true);
  const [message, setMessage] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [commentDialogOpen, setCommentDialogOpen] = useState(false);
  const [draftMentorsWithDetails, setDraftMentorsWithDetails] = useState([]);
  
  // Enrollment sections
  const approvedEnrollments = enrollments.filter(e => e.approval_status === 'Approved');
  const eligiblePending = enrollments.filter(e => 
    e.approval_status === 'Pending' && e.eligibility_status === 'Eligible'
  );
  const notEligible = enrollments.filter(e => 
    e.approval_status !== 'Approved' && 
    e.approval_status !== 'Rejected' &&
    (e.eligibility_status === 'Ineligible (Missing Prerequisite)' ||
     e.eligibility_status === 'Ineligible (Already Taken)' ||
     e.eligibility_status === 'Ineligible (Annual Limit)')
  );
  const rejected = enrollments.filter(e => e.approval_status === 'Rejected');
  const withdrawn = enrollments.filter(e => e.approval_status === 'Withdrawn');
  
  // Dialogs
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [withdrawalReason, setWithdrawalReason] = useState('');
  const [manualEnrollDialogOpen, setManualEnrollDialogOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [showImportPreview, setShowImportPreview] = useState(false);
  
  // Preview data for enrollment import format
  const enrollmentPreviewData = [
    { employee_id: 'EMP001', name: 'John Doe', email: 'john.doe@company.com', sbu: 'IT', designation: 'Manager', career_start_date: '15 Jan 2020', bs_join_date: '20 Mar 2021' },
    { employee_id: 'EMP002', name: 'Jane Smith', email: 'jane.smith@company.com', sbu: 'HR', designation: 'Employee', career_start_date: '10 Feb 2019', bs_join_date: '15 Apr 2020' },
    { employee_id: 'EMP003', name: 'Bob Wilson', email: 'bob.wilson@company.com', sbu: 'Finance', designation: 'Director', career_start_date: '05 Mar 2018', bs_join_date: '12 May 2019' },
    { employee_id: 'EMP004', name: 'Alice Brown', email: 'alice.brown@company.com', sbu: 'Operations', designation: 'Coordinator', career_start_date: '20 Apr 2021', bs_join_date: '25 Jun 2022' },
  ];
  const [attendanceDialogOpen, setAttendanceDialogOpen] = useState(false);
  const [attendanceFile, setAttendanceFile] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [showAttendancePreview, setShowAttendancePreview] = useState(false);
  
  // Preview data for attendance upload format
  const attendancePreviewData = [
    { name: 'John Doe', email: 'john.doe@company.com', total_classes_attended: 8, score: 85.5 },
    { name: 'Jane Smith', email: 'jane.smith@company.com', total_classes_attended: 9, score: 92.0 },
    { name: 'Bob Wilson', email: 'bob.wilson@company.com', total_classes_attended: 7, score: 78.5 },
    { name: 'Alice Brown', email: 'alice.brown@company.com', total_classes_attended: 10, score: 95.0 },
  ];
  const [editAttendanceDialogOpen, setEditAttendanceDialogOpen] = useState(false);
  const [selectedEnrollmentForEdit, setSelectedEnrollmentForEdit] = useState(null);
  const [editClassesAttended, setEditClassesAttended] = useState('');
  const [editScore, setEditScore] = useState('');
  
  // Mentor management
  const [assignMentorDialogOpen, setAssignMentorDialogOpen] = useState(false);
  const [assignMentorLoading, setAssignMentorLoading] = useState(false);
  const [addExternalMentorDialogOpen, setAddExternalMentorDialogOpen] = useState(false);
  
  // Edit mentor dialog
  const [editMentorDialogOpen, setEditMentorDialogOpen] = useState(false);
  const [editingMentor, setEditingMentor] = useState(null);
  const [editMentorHours, setEditMentorHours] = useState('');
  const [editMentorAmount, setEditMentorAmount] = useState('');
  const [editMentorLoading, setEditMentorLoading] = useState(false);
  
  // Cost management
  const [editCostsDialogOpen, setEditCostsDialogOpen] = useState(false);
  const [foodCost, setFoodCost] = useState('');
  const [otherCost, setOtherCost] = useState('');
  const [editCostsLoading, setEditCostsLoading] = useState(false);
  const [mentorCosts, setMentorCosts] = useState([]);
  
  // User details
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);
  const [selectedUserEnrollment, setSelectedUserEnrollment] = useState(null);

  useEffect(() => {
    if (courseId) {
      fetchCourse();
      fetchEnrollments();
    }
  }, [courseId]);

  const fetchCourse = async () => {
    setLoading(true);
    try {
      const response = await coursesAPI.getById(courseId);
      const courseData = response.data;
      setCourse(courseData);
      
      // Set comments if available
      if (courseData.comments) {
        setComments(courseData.comments);
      } else {
        // Fetch comments separately if not included
        try {
          const commentsResponse = await coursesAPI.getComments(courseId);
          setComments(commentsResponse.data);
        } catch (err) {
          console.error('Error fetching comments:', err);
        }
      }
      
      // If course is in draft status, fetch draft data and mentor details
      if (courseData.status === 'draft') {
        try {
          // Try to get draft data
          let draftMentorAssignments = [];
          if (courseData.draft && courseData.draft.mentor_assignments) {
            draftMentorAssignments = courseData.draft.mentor_assignments;
          } else {
            // Try fetching draft separately if not included
            try {
              const draftResponse = await coursesAPI.getDraft(courseId);
              if (draftResponse.data && draftResponse.data.mentor_assignments) {
                draftMentorAssignments = draftResponse.data.mentor_assignments;
              }
            } catch (draftErr) {
              // No draft exists yet
              console.log('No draft found for this course');
            }
          }
          
          if (draftMentorAssignments.length > 0) {
            const mentorIds = draftMentorAssignments.map(ma => ma.mentor_id);
            const mentorsResponse = await mentorsAPI.getAll('all');
            const mentorsMap = {};
            mentorsResponse.data.forEach(m => {
              mentorsMap[m.id] = m;
            });
            
            // Combine draft assignments with mentor details
            const draftMentors = draftMentorAssignments.map(ma => ({
              ...ma,
              mentor: mentorsMap[ma.mentor_id] || null,
              is_draft: true, // Flag to indicate this is a draft assignment
            }));
            
            setDraftMentorsWithDetails(draftMentors);
          } else {
            setDraftMentorsWithDetails([]);
          }
        } catch (err) {
          console.error('Error fetching draft mentor details:', err);
          setDraftMentorsWithDetails([]);
        }
      } else {
        setDraftMentorsWithDetails([]);
      }
    } catch (error) {
      console.error('Error fetching course:', error);
      setMessage({ type: 'error', text: 'Error fetching course details' });
    } finally {
      setLoading(false);
    }
  };

  const fetchEnrollments = async () => {
    setLoadingEnrollments(true);
    try {
      const response = await enrollmentsAPI.getAll({ course_id: courseId });
      setEnrollments(response.data);
    } catch (error) {
      console.error('Error fetching enrollments:', error);
      setMessage({ type: 'error', text: 'Error fetching enrollments' });
    } finally {
      setLoadingEnrollments(false);
    }
  };


  const handleApprove = async (enrollmentId) => {
    try {
      await enrollmentsAPI.approve({ enrollment_id: enrollmentId, approved: true }, 'Admin');
      setMessage({ type: 'success', text: 'Enrollment approved successfully' });
      fetchEnrollments();
      fetchCourse();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Error approving enrollment' });
    }
  };

  const handleReject = async (enrollmentId) => {
    try {
      await enrollmentsAPI.approve(
        { enrollment_id: enrollmentId, approved: false, rejection_reason: 'Rejected by admin' },
        'Admin'
      );
      setMessage({ type: 'success', text: 'Enrollment rejected' });
      fetchEnrollments();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Error rejecting enrollment' });
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
      fetchEnrollments();
      fetchCourse();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Error withdrawing student' });
    }
  };

  const handleReapprove = async (enrollmentId) => {
    try {
      await enrollmentsAPI.reapprove(enrollmentId, 'Admin');
      setMessage({ type: 'success', text: 'Student reapproved successfully' });
      fetchEnrollments();
      fetchCourse();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Error reapproving student' });
    }
  };

  const handleOpenManualEnroll = async () => {
    setSelectedStudentId('');
    try {
      const response = await studentsAPI.getAll({ limit: 1000 });
      setStudents(response.data);
    } catch (error) {
      console.error('Error fetching students:', error);
      setMessage({ type: 'error', text: 'Error fetching students' });
    }
    setManualEnrollDialogOpen(true);
  };

  const handleManualEnrollConfirm = async () => {
    if (!selectedStudentId) {
      setMessage({ type: 'error', text: 'Please select a student' });
      return;
    }
    try {
      await enrollmentsAPI.create({
        student_id: parseInt(selectedStudentId),
        course_id: parseInt(courseId),
      });
      setMessage({ type: 'success', text: 'Student enrolled successfully' });
      setManualEnrollDialogOpen(false);
      setSelectedStudentId('');
      fetchEnrollments();
      fetchCourse();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Error enrolling student' });
    }
  };

  const handleImportFileChange = (event) => {
    setImportFile(event.target.files[0]);
  };

  const handleImportExcel = async () => {
    if (!importFile) {
      setMessage({ type: 'error', text: 'Please select a file' });
      return;
    }
    setImportLoading(true);
    try {
      const response = await importsAPI.uploadExcel(importFile, courseId);
      setMessage({ type: 'success', text: 'Enrollments imported successfully' });
      setImportDialogOpen(false);
      setImportFile(null);
      fetchEnrollments();
      fetchCourse();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Error importing file' });
    } finally {
      setImportLoading(false);
    }
  };

  const handleImportCSV = async () => {
    if (!importFile) {
      setMessage({ type: 'error', text: 'Please select a file' });
      return;
    }
    setImportLoading(true);
    try {
      const response = await importsAPI.uploadCSV(importFile, courseId);
      setMessage({ type: 'success', text: 'Enrollments imported successfully' });
      setImportDialogOpen(false);
      setImportFile(null);
      fetchEnrollments();
      fetchCourse();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Error importing file' });
    } finally {
      setImportLoading(false);
    }
  };

  const handleAttendanceFileChange = (event) => {
    setAttendanceFile(event.target.files[0]);
  };

  const handleUploadAttendance = async () => {
    if (!attendanceFile) {
      setMessage({ type: 'error', text: 'Please select a file' });
      return;
    }
    setAttendanceLoading(true);
    try {
      await completionsAPI.uploadAttendance(attendanceFile, courseId);
      setMessage({ type: 'success', text: 'Attendance and scores uploaded successfully' });
      setAttendanceDialogOpen(false);
      setAttendanceFile(null);
      fetchEnrollments();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Error uploading file' });
    } finally {
      setAttendanceLoading(false);
    }
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
      fetchEnrollments();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Error updating attendance' });
    }
  };

  const handleOpenAssignMentor = () => {
    setAssignMentorDialogOpen(true);
  };

  const handleAssignMentor = async (assignment) => {
    setAssignMentorLoading(true);
    try {
      // If course is in draft status, save to draft instead of directly assigning
      if (course && course.status === 'draft') {
        // Get existing draft or create new one
        let draftData = { mentor_assignments: [] };
        try {
          const existingDraft = await coursesAPI.getDraft(courseId);
          draftData = existingDraft.data;
        } catch (err) {
          // Draft doesn't exist yet, will create new one
        }
        
        // Remove existing assignment for this mentor if any
        const updatedAssignments = (draftData.mentor_assignments || []).filter(
          ma => ma.mentor_id !== assignment.mentor_id
        );
        updatedAssignments.push(assignment);
        
        // Save draft
        await coursesAPI.saveDraft(courseId, {
          ...draftData,
          mentor_assignments: updatedAssignments,
        });
        
        setMessage({ type: 'success', text: 'Mentor assignment saved to draft (temporary)' });
      } else {
        // Course is approved/ongoing, assign directly
        await coursesAPI.assignMentor(courseId, assignment);
        setMessage({ type: 'success', text: 'Mentor assigned successfully' });
      }
      
      fetchCourse();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Error assigning mentor' });
      throw error; // Re-throw so dialog can handle it
    } finally {
      setAssignMentorLoading(false);
    }
  };

  const handleEditMentor = async () => {
    if (!editMentorHours || parseFloat(editMentorHours) < 0) {
      setMessage({ type: 'error', text: 'Hours taught is required and must be >= 0' });
      return;
    }
    if (!editMentorAmount || parseFloat(editMentorAmount) < 0) {
      setMessage({ type: 'error', text: 'Amount paid is required and must be >= 0' });
      return;
    }
    
    if (!editingMentor) {
      setMessage({ type: 'error', text: 'No mentor selected' });
      return;
    }
    
    setEditMentorLoading(true);
    try {
      const mentorId = editingMentor.mentor_id || editingMentor.mentor?.id;
      const hoursTaught = parseFloat(editMentorHours) || 0;
      const amountPaid = parseFloat(editMentorAmount) || 0;
      
      // If course is in draft status, update draft
      if (course && course.status === 'draft') {
        // Get existing draft
        let draftData = { mentor_assignments: [], food_cost: null, other_cost: null };
        try {
          const existingDraft = await coursesAPI.getDraft(courseId);
          draftData = existingDraft.data;
        } catch (err) {
          setMessage({ type: 'error', text: 'Draft not found' });
          return;
        }
        
        // Ensure mentor_assignments is an array
        if (!draftData.mentor_assignments || !Array.isArray(draftData.mentor_assignments)) {
          draftData.mentor_assignments = [];
        }
        
        // Update mentor assignment in draft
        const updatedAssignments = draftData.mentor_assignments.map(ma => {
          if (ma.mentor_id === mentorId) {
            return {
              ...ma,
              hours_taught: hoursTaught,
              amount_paid: amountPaid,
            };
          }
          return ma;
        });
        
        // If mentor not found in draft, add it
        const mentorExists = updatedAssignments.some(ma => ma.mentor_id === mentorId);
        if (!mentorExists) {
          updatedAssignments.push({
            mentor_id: mentorId,
            hours_taught: hoursTaught,
            amount_paid: amountPaid,
          });
        }
        
        // Save updated draft
        const draftPayload = {
          mentor_assignments: updatedAssignments,
        };
        if (draftData.food_cost !== null && draftData.food_cost !== undefined) {
          draftPayload.food_cost = draftData.food_cost;
        }
        if (draftData.other_cost !== null && draftData.other_cost !== undefined) {
          draftPayload.other_cost = draftData.other_cost;
        }
        
        await coursesAPI.saveDraft(courseId, draftPayload);
        setMessage({ type: 'success', text: 'Mentor hours and payment updated in draft' });
      } else {
        // Course is approved/ongoing, update official assignment
        if (editingMentor.id) {
          // Update existing assignment
          await coursesAPI.assignMentor(courseId, {
            mentor_id: mentorId,
            hours_taught: hoursTaught,
            amount_paid: amountPaid,
          });
          setMessage({ type: 'success', text: 'Mentor hours and payment updated successfully' });
        } else {
          setMessage({ type: 'error', text: 'Cannot update: mentor assignment not found' });
        }
      }
      
      setEditMentorDialogOpen(false);
      setEditingMentor(null);
      setEditMentorHours('');
      setEditMentorAmount('');
      fetchCourse();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Error updating mentor' });
    } finally {
      setEditMentorLoading(false);
    }
  };

  const handleRemoveMentor = async (courseMentorId, mentorId = null) => {
    if (window.confirm('Are you sure you want to remove this mentor from the course?')) {
      try {
        // If course is in draft status, remove from draft instead
        if (course && course.status === 'draft') {
          // Get existing draft
          let draftData = { mentor_assignments: [] };
          try {
            const existingDraft = await coursesAPI.getDraft(courseId);
            draftData = existingDraft.data;
          } catch (err) {
            setMessage({ type: 'error', text: 'Draft not found' });
            return;
          }
          
          // Find the mentor_id from the draft assignment
          let mentorIdToRemove = mentorId;
          if (!mentorIdToRemove && courseMentorId) {
            // Try to find mentor_id from draft mentors
            const draftMentor = draftMentorsWithDetails.find(dm => dm.id === courseMentorId || `draft-${dm.mentor_id}` === courseMentorId);
            if (draftMentor) {
              mentorIdToRemove = draftMentor.mentor_id;
            }
          }
          
          if (!mentorIdToRemove) {
            setMessage({ type: 'error', text: 'Could not find mentor to remove' });
            return;
          }
          
          // Remove mentor assignment from draft
          const updatedAssignments = (draftData.mentor_assignments || []).filter(
            ma => ma.mentor_id !== mentorIdToRemove
          );
          
          // Save updated draft
          await coursesAPI.saveDraft(courseId, {
            ...draftData,
            mentor_assignments: updatedAssignments,
          });
          
          setMessage({ type: 'success', text: 'Mentor removed from draft' });
        } else {
          // Course is approved/ongoing, remove from official assignments
          await coursesAPI.removeCourseMentor(courseId, courseMentorId);
          setMessage({ type: 'success', text: 'Mentor removed successfully' });
        }
        
        fetchCourse();
      } catch (error) {
        setMessage({ type: 'error', text: error.response?.data?.detail || 'Error removing mentor' });
      }
    }
  };

  const handleAddExternalMentor = async (assignment) => {
    try {
      // If course is in draft status, save to draft instead of directly assigning
      if (course && course.status === 'draft') {
        // Get existing draft or create new one
        let draftData = { mentor_assignments: [], food_cost: null, other_cost: null };
        try {
          const existingDraft = await coursesAPI.getDraft(courseId);
          draftData = existingDraft.data;
        } catch (err) {
          // Draft doesn't exist yet, will create new one
        }
        
        // Ensure mentor_assignments is an array
        if (!draftData.mentor_assignments || !Array.isArray(draftData.mentor_assignments)) {
          draftData.mentor_assignments = [];
        }
        
        // Remove existing assignment for this mentor if any
        const updatedAssignments = draftData.mentor_assignments.filter(
          ma => ma.mentor_id !== assignment.mentor_id
        );
        updatedAssignments.push(assignment);
        
        // Save draft - only include fields that exist
        const draftPayload = {
          mentor_assignments: updatedAssignments,
        };
        if (draftData.food_cost !== null && draftData.food_cost !== undefined) {
          draftPayload.food_cost = draftData.food_cost;
        }
        if (draftData.other_cost !== null && draftData.other_cost !== undefined) {
          draftPayload.other_cost = draftData.other_cost;
        }
        
        await coursesAPI.saveDraft(courseId, draftPayload);
        
        setMessage({ type: 'success', text: 'External mentor created and saved to draft (temporary)' });
      } else {
        // Course is approved/ongoing, assign directly
        await coursesAPI.assignMentor(courseId, assignment);
        setMessage({ type: 'success', text: 'External mentor created and assigned successfully' });
      }
      
      fetchCourse();
    } catch (error) {
      console.error('Error creating external mentor:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Error creating external mentor';
      setMessage({ type: 'error', text: errorMessage });
      throw error; // Re-throw so dialog can handle it
    }
  };

  const handleOpenEditCosts = () => {
    // For draft courses, use draft costs; otherwise use official costs
    const foodCostValue = (course?.status === 'draft' && course?.draft?.food_cost !== null && course?.draft?.food_cost !== undefined)
      ? course.draft.food_cost
      : course?.food_cost;
    const otherCostValue = (course?.status === 'draft' && course?.draft?.other_cost !== null && course?.draft?.other_cost !== undefined)
      ? course.draft.other_cost
      : course?.other_cost;
    
    setFoodCost(foodCostValue?.toString() || '0');
    setOtherCost(otherCostValue?.toString() || '0');
    
    // Initialize mentor costs from course mentors or draft mentors
    const displayMentors = getDisplayMentors();
    if (displayMentors.length > 0) {
      setMentorCosts(
        displayMentors.map((cm) => ({
          id: cm.id || `draft-${cm.mentor_id}`,
          mentor_id: cm.mentor?.id || cm.mentor_id,
          mentor_name: cm.mentor?.name || 'Unknown',
          hours_taught: cm.hours_taught?.toString() || '0',
          amount_paid: cm.amount_paid?.toString() || '0',
        }))
      );
    } else {
      setMentorCosts([]);
    }
    setEditCostsDialogOpen(true);
  };

  const handleSaveCosts = async () => {
    setEditCostsLoading(true);
    try {
      // If course is in draft status, save to draft instead
      if (course && course.status === 'draft') {
        // Get existing draft or create new one
        let draftData = { mentor_assignments: [], food_cost: null, other_cost: null };
        try {
          const existingDraft = await coursesAPI.getDraft(courseId);
          draftData = existingDraft.data;
        } catch (err) {
          // Draft doesn't exist yet, will create new one
        }
        
        // Update costs and mentor assignments in draft
        const updatedDraft = {
          ...draftData,
          food_cost: parseFloat(foodCost) || 0,
          other_cost: parseFloat(otherCost) || 0,
          mentor_assignments: mentorCosts.map((mc) => ({
            mentor_id: mc.mentor_id,
            hours_taught: parseFloat(mc.hours_taught) || 0,
            amount_paid: parseFloat(mc.amount_paid) || 0,
          })),
        };
        
        await coursesAPI.saveDraft(courseId, updatedDraft);
        setMessage({ type: 'success', text: 'Costs saved to draft (temporary)' });
      } else {
        // Course is approved/ongoing, update directly
        await coursesAPI.updateCosts(courseId, {
          food_cost: parseFloat(foodCost) || 0,
          other_cost: parseFloat(otherCost) || 0,
        });
        
        // Update mentor costs
        if (mentorCosts.length > 0) {
          const updatePromises = mentorCosts.map((mc) =>
            coursesAPI.assignMentor(courseId, {
              mentor_id: mc.mentor_id,
              hours_taught: parseFloat(mc.hours_taught) || 0,
              amount_paid: parseFloat(mc.amount_paid) || 0,
            })
          );
          await Promise.all(updatePromises);
        }
        
        setMessage({ type: 'success', text: 'Costs updated successfully' });
      }
      
      setEditCostsDialogOpen(false);
      fetchCourse();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Error updating costs' });
    } finally {
      setEditCostsLoading(false);
    }
  };

  const handleMentorCostChange = (index, field, value) => {
    const updated = [...mentorCosts];
    updated[index] = { ...updated[index], [field]: value };
    setMentorCosts(updated);
  };

  // Comment handlers
  const handleAddComment = async () => {
    if (!newComment.trim()) {
      setMessage({ type: 'error', text: 'Comment cannot be empty' });
      return;
    }
    try {
      await coursesAPI.addComment(courseId, {
        comment: newComment.trim(),
        created_by: 'Admin', // TODO: Get from auth context
      });
      setMessage({ type: 'success', text: 'Comment added successfully' });
      setNewComment('');
      setCommentDialogOpen(false);
      fetchCourse();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Error adding comment' });
    }
  };

  // Approval handler
  const handleApproveCourse = async () => {
    // Simple confirmation popup
    if (!window.confirm('Are you sure you want to approve this course? This will move it from Planning to Ongoing Courses and make all draft changes permanent.')) {
      return;
    }
    
    try {
      // Use "Admin" as default approved_by value
      await coursesAPI.approveCourse(courseId, 'Admin');
      setMessage({ type: 'success', text: 'Course approved and moved to ongoing courses!' });
      fetchCourse();
      // Navigate to ongoing courses after a short delay
      setTimeout(() => {
        navigate('/courses/ongoing');
      }, 1500);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Error approving course' });
    }
  };

  // Get mentors to display (combine official and draft for draft courses)
  const getDisplayMentors = () => {
    if (course?.status === 'draft') {
      // For draft courses, show draft mentors (if any exist)
      if (draftMentorsWithDetails.length > 0) {
        return draftMentorsWithDetails.map((dm, index) => ({
          id: `draft-${dm.mentor_id}-${index}`, // Unique ID for draft assignments
          mentor_id: dm.mentor_id,
          mentor: dm.mentor,
          hours_taught: dm.hours_taught,
          amount_paid: dm.amount_paid,
          is_draft: true,
        }));
      } else {
        // No draft mentors yet
        return [];
      }
    } else {
      // For approved/ongoing courses, show official mentors
      return course?.mentors || [];
    }
  };

  const calculateTotalMentorCost = () => {
    let total = 0;
    // Add official mentor costs
    if (course?.mentors) {
      total += course.mentors.reduce((sum, cm) => sum + parseFloat(cm.amount_paid || 0), 0);
    }
    // Add draft mentor costs if course is in draft status
    if (course?.status === 'draft' && draftMentorsWithDetails.length > 0) {
      total += draftMentorsWithDetails.reduce((sum, dm) => sum + parseFloat(dm.amount_paid || 0), 0);
    }
    return total;
  };

  const calculateTotalTrainingCost = () => {
    const mentorCost = calculateTotalMentorCost();
    // For draft courses, use draft costs if available
    const foodCost = (course?.status === 'draft' && course?.draft?.food_cost !== null && course?.draft?.food_cost !== undefined)
      ? parseFloat(course.draft.food_cost)
      : parseFloat(course?.food_cost || 0);
    const otherCost = (course?.status === 'draft' && course?.draft?.other_cost !== null && course?.draft?.other_cost !== undefined)
      ? parseFloat(course.draft.other_cost)
      : parseFloat(course?.other_cost || 0);
    return mentorCost + foodCost + otherCost;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (!course) {
    return (
      <Box>
        <Alert severity="error">Course not found</Alert>
        <Button onClick={() => navigate('/courses')} startIcon={<ArrowBack />}>
          Back to Courses
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <IconButton onClick={() => navigate('/courses')}>
          <ArrowBack />
        </IconButton>
        <Box flexGrow={1}>
          <Typography variant="h4" sx={{ fontWeight: 600 }}>
            {course.name} - {course.batch_code}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Course Details and Enrollment Management
          </Typography>
        </Box>
      </Box>

      {/* Enrollment Action Buttons */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
            {course?.status === 'draft' && (
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckCircle />}
                onClick={handleApproveCourse}
                sx={{ fontWeight: 600 }}
              >
                Approve Course
              </Button>
            )}
            <Button
              variant="contained"
              startIcon={<PersonAdd />}
              onClick={handleOpenManualEnroll}
            >
              Manual Enrollment
            </Button>
            <Button
              variant="contained"
              startIcon={<UploadFile />}
              onClick={() => setImportDialogOpen(true)}
            >
              Import Enrollments
            </Button>
            <Button
              variant="contained"
              startIcon={<UploadFile />}
              onClick={() => setAttendanceDialogOpen(true)}
            >
              Upload Attendance & Scores
            </Button>
          </Box>
        </CardContent>
      </Card>

      {message && (
        <Alert 
          severity={message.type} 
          sx={{ mb: 3 }} 
          onClose={() => setMessage(null)}
        >
          {message.text}
        </Alert>
      )}

      {/* Course Details Card */}
      <Card sx={{ 
        mb: 3,
        borderRadius: 3,
        boxShadow: 3,
        overflow: 'hidden',
      }}>
        {/* Header Section with Gradient */}
        <Box
          sx={{
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            p: 3,
            color: 'white',
          }}
        >
          <Box display="flex" alignItems="center" gap={2} mb={1}>
            <School sx={{ fontSize: 32 }} />
            <Box flexGrow={1}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                {course.name}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.9 }}>
                Batch Code: {course.batch_code}
              </Typography>
            </Box>
          </Box>
          {course.description && (
            <Typography variant="body2" sx={{ mt: 2, opacity: 0.9, fontStyle: 'italic' }}>
              {course.description}
            </Typography>
          )}
        </Box>

        <CardContent sx={{ p: 3 }}>
          {/* Key Metrics Row */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.primary.main, 0.08),
                  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                }}
              >
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <People color="primary" />
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Enrollment
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  {course.current_enrolled}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  of {course.seat_limit} seats
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.success.main, 0.08),
                  border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                }}
              >
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Event color="success" />
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Classes
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                  {course.total_classes_offered || 'N/A'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Total classes
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.info.main, 0.08),
                  border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                }}
              >
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <Person color="info" />
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Mentors
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'info.main' }}>
                  {course.mentors?.length || 0}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Assigned mentors
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box
                sx={{
                  p: 2,
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.warning.main, 0.08),
                  border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                }}
              >
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <AccountBalance color="warning" />
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                    Total Cost
                  </Typography>
                </Box>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>
                  Tk {calculateTotalTrainingCost().toFixed(0)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Training cost
                </Typography>
              </Box>
            </Grid>
          </Grid>

          {/* Course Information Section */}
          <Box sx={{ mb: 4 }}>
            <Box display="flex" alignItems="center" gap={1} mb={2}>
              <CalendarToday color="primary" />
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Course Schedule
              </Typography>
            </Box>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: alpha(theme.palette.primary.main, 0.05),
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                  }}
                >
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Event fontSize="small" color="primary" />
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Start Date
                    </Typography>
                  </Box>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {course.start_date}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    backgroundColor: alpha(theme.palette.secondary.main, 0.05),
                    border: `1px solid ${alpha(theme.palette.secondary.main, 0.1)}`,
                  }}
                >
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <Event fontSize="small" color="secondary" />
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                      End Date
                    </Typography>
                  </Box>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {course.end_date || 'Not set'}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>

          {/* Assigned Mentors Section */}
          <Divider sx={{ my: 3 }} />
          <Box sx={{ mb: 3 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <Person color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Assigned Mentors
                  {course?.status === 'draft' && (
                    <Chip 
                      label="Draft" 
                      size="small" 
                      color="warning"
                      sx={{ ml: 1, fontSize: '0.7rem' }}
                    />
                  )}
                </Typography>
                {(() => {
                  const displayMentors = getDisplayMentors();
                  return displayMentors.length > 0 && (
                    <Chip 
                      label={displayMentors.length} 
                      size="small" 
                      color="primary"
                      sx={{ ml: 1 }}
                    />
                  );
                })()}
              </Box>
              <Box display="flex" gap={1} flexWrap="wrap">
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Add />}
                  onClick={handleOpenAssignMentor}
                >
                  Assign Internal Mentor
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Add />}
                  onClick={() => setAddExternalMentorDialogOpen(true)}
                >
                  Add External Mentor
                </Button>
              </Box>
            </Box>
            {(() => {
              const displayMentors = getDisplayMentors();
              return displayMentors.length > 0 ? (
                <TableContainer
                  sx={{
                    borderRadius: 2,
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                  }}
                >
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>
                        <TableCell sx={{ fontWeight: 600 }}>Mentor Name</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Hours Taught</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Amount Paid</TableCell>
                        <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {displayMentors.map((cm) => (
                        <TableRow 
                          key={cm.id || `draft-${cm.mentor_id}`}
                          sx={{
                            '&:hover': {
                              backgroundColor: alpha(theme.palette.primary.main, 0.03),
                            },
                            ...(cm.is_draft && {
                              backgroundColor: alpha(theme.palette.warning.main, 0.05),
                              borderLeft: `3px solid ${theme.palette.warning.main}`,
                            }),
                          }}
                        >
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Person fontSize="small" color="action" />
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                {cm.mentor?.name || 'Unknown'}
                              </Typography>
                              {cm.is_draft && (
                                <Chip 
                                  label="Draft" 
                                  size="small" 
                                  color="warning"
                                  sx={{ height: 20, fontSize: '0.65rem' }}
                                />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={cm.mentor?.is_internal ? 'Internal' : 'External'}
                              size="small"
                              color={cm.mentor?.is_internal ? 'primary' : 'secondary'}
                              sx={{ fontWeight: 500 }}
                            />
                          </TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <AccessTime fontSize="small" color="action" />
                              <Typography variant="body2">{cm.hours_taught}</Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                Tk {parseFloat(cm.amount_paid || 0).toFixed(2)}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Box display="flex" gap={0.5} justifyContent="center">
                              <IconButton
                                size="small"
                                color="primary"
                                onClick={() => {
                                  setEditingMentor(cm);
                                  setEditMentorHours(cm.hours_taught?.toString() || '0');
                                  setEditMentorAmount(cm.amount_paid?.toString() || '0');
                                  setEditMentorDialogOpen(true);
                                }}
                                sx={{
                                  '&:hover': {
                                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                  },
                                }}
                                title="Edit hours and payment"
                              >
                                <Edit fontSize="small" />
                              </IconButton>
                              <IconButton
                                size="small"
                                color="error"
                                onClick={() => handleRemoveMentor(cm.id || `draft-${cm.mentor_id}`, cm.mentor_id)}
                                sx={{
                                  '&:hover': {
                                    backgroundColor: alpha(theme.palette.error.main, 0.1),
                                  },
                                }}
                                title={cm.is_draft ? "Remove from draft" : "Remove mentor"}
                              >
                                <Remove fontSize="small" />
                              </IconButton>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Box
                  sx={{
                    p: 3,
                    textAlign: 'center',
                    borderRadius: 2,
                    backgroundColor: alpha(theme.palette.grey[500], 0.05),
                    border: `1px dashed ${alpha(theme.palette.grey[500], 0.3)}`,
                  }}
                >
                  <Person sx={{ fontSize: 48, color: 'text.secondary', mb: 1, opacity: 0.5 }} />
                  <Typography variant="body2" color="text.secondary">
                    No mentors assigned yet
                  </Typography>
                </Box>
              );
            })()}
          </Box>

          {/* Course Costs Section */}
          <Divider sx={{ my: 3 }} />
          <Box>
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <AccountBalance color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Course Costs Breakdown
                </Typography>
              </Box>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Edit />}
                onClick={handleOpenEditCosts}
              >
                Edit Costs
              </Button>
            </Box>
            <Grid container spacing={3}>
              <Grid item xs={12} md={4}>
                <Box
                  sx={{
                    p: 2.5,
                    borderRadius: 2,
                    backgroundColor: alpha(theme.palette.primary.main, 0.08),
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                    height: '100%',
                  }}
                >
                  <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                  
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Total Mentor Costs
                    </Typography>
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
                    Tk {calculateTotalMentorCost().toFixed(2)}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box
                  sx={{
                    p: 2.5,
                    borderRadius: 2,
                    backgroundColor: alpha(theme.palette.success.main, 0.08),
                    border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                    height: '100%',
                  }}
                >
                  <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                    <Restaurant color="success" sx={{ fontSize: 28 }} />
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Food Cost
                    </Typography>
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: 'success.main' }}>
                    Tk {parseFloat((course?.status === 'draft' && course?.draft?.food_cost !== null && course?.draft?.food_cost !== undefined) 
                      ? course.draft.food_cost 
                      : (course?.food_cost || 0)).toFixed(2)}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box
                  sx={{
                    p: 2.5,
                    borderRadius: 2,
                    backgroundColor: alpha(theme.palette.info.main, 0.08),
                    border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                    height: '100%',
                  }}
                >
                  <Box display="flex" alignItems="center" gap={1.5} mb={2}>
                    <Receipt color="info" sx={{ fontSize: 28 }} />
                    <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
                      Other Cost
                    </Typography>
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: 'info.main' }}>
                    Tk {parseFloat((course?.status === 'draft' && course?.draft?.other_cost !== null && course?.draft?.other_cost !== undefined) 
                      ? course.draft.other_cost 
                      : (course?.other_cost || 0)).toFixed(2)}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Box
                  sx={{
                    p: 3,
                    borderRadius: 2,
                    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)} 0%, ${alpha(theme.palette.secondary.main, 0.1)} 100%)`,
                    border: `2px solid ${theme.palette.primary.main}`,
                    mt: 2,
                  }}
                >
                  <Box display="flex" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Calculate color="primary" sx={{ fontSize: 32 }} />
                      <Box>
                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600, mb: 0.5 }}>
                          Total Training Cost
                        </Typography>
                        <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                          Tk {calculateTotalTrainingCost().toFixed(2)}
                        </Typography>
                      </Box>
                    </Box>
                    <TrendingUp sx={{ fontSize: 40, color: 'primary.main', opacity: 0.7 }} />
                  </Box>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </CardContent>
      </Card>

      {/* Comment History Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Comment/Update History
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setCommentDialogOpen(true)}
            >
              Add Comment
            </Button>
          </Box>
          {comments.length > 0 ? (
            <List>
              {comments.map((comment) => (
                <ListItem
                  key={comment.id}
                  sx={{
                    borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    py: 2,
                  }}
                >
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {comment.created_by}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatDateTimeForDisplay(comment.created_at)}
                        </Typography>
                      </Box>
                    }
                    secondary={
                      <Typography variant="body2" sx={{ mt: 0.5 }}>
                        {comment.comment}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
              No comments yet. Add the first comment to track updates.
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* Enrollment Sections */}
      {loadingEnrollments ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {/* Approved/Enrolled Students */}
          {approvedEnrollments.length > 0 && (
            <Card sx={{ 
              mb: 3,
              borderLeft: `4px solid ${theme.palette.primary.main}`,
              backgroundColor: alpha(theme.palette.primary.main, 0.02),
            }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: theme.palette.primary.main }}>
                  Approved/Enrolled Students ({approvedEnrollments.length})
                </Typography>
                <EnrollmentTable
                  enrollments={approvedEnrollments}
                  onViewDetails={(e) => {
                    setSelectedUserEnrollment(e);
                    setUserDetailsOpen(true);
                  }}
                  onEditAttendance={(e) => {
                    setSelectedEnrollmentForEdit(e);
                    setEditClassesAttended(e.present?.toString() || '');
                    setEditScore(e.score?.toString() || '');
                    setEditAttendanceDialogOpen(true);
                  }}
                  onWithdraw={handleWithdraw}
                  showActions={true}
                />
              </CardContent>
            </Card>
          )}

          {/* Eligible Pending */}
          {eligiblePending.length > 0 && (
            <Card sx={{ 
              mb: 3,
              borderLeft: `4px solid ${theme.palette.success.main}`,
              backgroundColor: alpha(theme.palette.success.main, 0.02),
            }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: theme.palette.success.main }}>
                  Eligible Enrollments (Pending) ({eligiblePending.length})
                </Typography>
                <EnrollmentTable
                  enrollments={eligiblePending}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  showActions={true}
                />
              </CardContent>
            </Card>
          )}

          {/* Not Eligible */}
          {notEligible.length > 0 && (
            <Card sx={{ 
              mb: 3,
              borderLeft: `4px solid ${theme.palette.error.main}`,
              backgroundColor: alpha(theme.palette.error.main, 0.02),
            }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: theme.palette.error.main }}>
                  Not Eligible Enrollments ({notEligible.length})
                </Typography>
                <EnrollmentTable
                  enrollments={notEligible}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  showEligibilityReason={true}
                  showActions={true}
                />
              </CardContent>
            </Card>
          )}

          {/* Rejected */}
          {rejected.length > 0 && (
            <Card sx={{ 
              mb: 3,
              borderLeft: `4px solid ${theme.palette.error.main}`,
              backgroundColor: alpha(theme.palette.error.main, 0.02),
            }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: theme.palette.error.main }}>
                  Rejected Enrollments ({rejected.length})
                </Typography>
                <EnrollmentTable
                  enrollments={rejected}
                  onViewDetails={(e) => {
                    setSelectedUserEnrollment(e);
                    setUserDetailsOpen(true);
                  }}
                  onReapprove={handleReapprove}
                  showActions={true}
                  actionsHeaderText="Add"
                />
              </CardContent>
            </Card>
          )}

          {/* Withdrawn */}
          {withdrawn.length > 0 && (
            <Card sx={{ 
              mb: 3,
              borderLeft: `4px solid ${theme.palette.warning.main}`,
              backgroundColor: alpha(theme.palette.warning.main, 0.02),
            }}>
              <CardContent>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: theme.palette.warning.main }}>
                  Withdrawn Students ({withdrawn.length})
                </Typography>
                <EnrollmentTable
                  enrollments={withdrawn}
                  onReapprove={handleReapprove}
                  showActions={true}
                  actionsHeaderText="Add"
                />
              </CardContent>
            </Card>
          )}

          {enrollments.length === 0 && (
            <Card>
              <CardContent>
                <Typography variant="body2" color="text.secondary" align="center" py={3}>
                  No enrollments yet. Use "Import Enrollments" or "Manual Enrollment" to add students.
                </Typography>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Dialogs */}
      {/* Withdraw Dialog */}
      <Dialog open={withdrawDialogOpen} onClose={() => setWithdrawDialogOpen(false)}>
        <DialogTitle>Withdraw Student</DialogTitle>
        <DialogContent>
          <TextField
            label="Withdrawal Reason"
            fullWidth
            multiline
            rows={3}
            value={withdrawalReason}
            onChange={(e) => setWithdrawalReason(e.target.value)}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWithdrawDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleWithdrawConfirm} variant="contained" color="error">
            Withdraw
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manual Enrollment Dialog */}
      <Dialog open={manualEnrollDialogOpen} onClose={() => setManualEnrollDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Manual Enrollment</DialogTitle>
        <DialogContent>
          <Autocomplete
            options={students}
            getOptionLabel={(option) => `${option.name} (${option.employee_id})`}
            value={students.find(s => s.id.toString() === selectedStudentId) || null}
            onChange={(event, newValue) => setSelectedStudentId(newValue?.id.toString() || '')}
            renderInput={(params) => (
              <TextField {...params} label="Select Student" placeholder="Search by name or employee ID" />
            )}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setManualEnrollDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleManualEnrollConfirm} variant="contained" disabled={!selectedStudentId}>
            Enroll
          </Button>
        </DialogActions>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onClose={() => setImportDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Import Enrollments</DialogTitle>
        <DialogContent>
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
              onClick={() => setShowImportPreview(!showImportPreview)}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Visibility fontSize="small" />
                Preview Expected Format
              </Typography>
              <IconButton size="small">
                {showImportPreview ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            </Box>
            
            <Collapse in={showImportPreview}>
              <Box mt={1} sx={{ border: `1px solid ${alpha(theme.palette.divider, 0.1)}`, borderRadius: 2, overflow: 'hidden' }}>
                <Box sx={{ p: 1, display: 'flex', justifyContent: 'flex-end', borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Download />}
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = '/ADA2025A_registration.xlsx';
                      link.download = 'enrollment_template.xlsx';
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
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>career_start_date</TableCell>
                        <TableCell sx={{ fontWeight: 600, fontSize: '0.75rem' }}>bs_join_date</TableCell>
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
                          <TableCell sx={{ fontSize: '0.75rem' }}>{row.career_start_date || 'N/A'}</TableCell>
                          <TableCell sx={{ fontSize: '0.75rem' }}>{row.bs_join_date || 'N/A'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                <Box sx={{ p: 1, backgroundColor: alpha(theme.palette.info.main, 0.05), borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}` }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                   
                  </Typography>
                </Box>
              </Box>
            </Collapse>
          </Box>
          
          <Box sx={{ mt: 3 }}>
            <Button variant="outlined" component="label" startIcon={<UploadFile />} fullWidth>
              Select File
              <input type="file" hidden accept=".xlsx,.xls,.csv" onChange={handleImportFileChange} />
            </Button>
            {importFile && (
              <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
                Selected: <strong>{importFile.name}</strong>
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setImportDialogOpen(false);
            setImportFile(null);
            setShowImportPreview(false);
          }}>Cancel</Button>
          <Button onClick={handleImportCSV} variant="outlined" disabled={!importFile || importLoading}>
            Upload CSV
          </Button>
          <Button onClick={handleImportExcel} variant="contained" disabled={!importFile || importLoading}>
            Upload Excel
          </Button>
        </DialogActions>
      </Dialog>

      {/* Attendance Dialog */}
      <Dialog open={attendanceDialogOpen} onClose={() => setAttendanceDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Upload Attendance & Scores</DialogTitle>
        <DialogContent>
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
                      link.download = 'attendance_template.xlsx';
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
                   
                  </Typography>
                </Box>
              </Box>
            </Collapse>
          </Box>
          
          <Box sx={{ mt: 3 }}>
            <Button variant="outlined" component="label" startIcon={<UploadFile />} fullWidth>
              Select File
              <input type="file" hidden accept=".xlsx,.xls,.csv" onChange={handleAttendanceFileChange} />
            </Button>
            {attendanceFile && (
              <Typography variant="body2" sx={{ mt: 2, color: 'text.secondary' }}>
                Selected: <strong>{attendanceFile.name}</strong>
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setAttendanceDialogOpen(false);
            setAttendanceFile(null);
            setShowAttendancePreview(false);
          }}>Cancel</Button>
          <Button onClick={handleUploadAttendance} variant="contained" disabled={!attendanceFile || attendanceLoading}>
            Upload
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Attendance Dialog */}
      <Dialog open={editAttendanceDialogOpen} onClose={() => setEditAttendanceDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Attendance & Score</DialogTitle>
        <DialogContent>
          <TextField
            label="Classes Attended"
            type="number"
            fullWidth
            value={editClassesAttended}
            onChange={(e) => setEditClassesAttended(e.target.value)}
            sx={{ mt: 2 }}
            inputProps={{ min: 0, max: course.total_classes_offered }}
          />
          <TextField
            label="Score"
            type="number"
            fullWidth
            value={editScore}
            onChange={(e) => setEditScore(e.target.value)}
            sx={{ mt: 2 }}
            inputProps={{ min: 0, max: 100, step: 0.1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditAttendanceDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleEditAttendance} variant="contained">
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Assign Internal Mentor Dialog */}
      <AssignInternalMentorDialog
        open={assignMentorDialogOpen}
        onClose={() => setAssignMentorDialogOpen(false)}
        onAssign={handleAssignMentor}
        isDraft={course?.status === 'draft'}
      />

      {/* Add External Mentor Dialog */}
      <AddExternalMentorDialog
        open={addExternalMentorDialogOpen}
        onClose={() => setAddExternalMentorDialogOpen(false)}
        onAdd={handleAddExternalMentor}
        isDraft={course?.status === 'draft'}
      />

      {/* Edit Mentor Dialog */}
      <Dialog open={editMentorDialogOpen} onClose={() => {
        setEditMentorDialogOpen(false);
        setEditingMentor(null);
        setEditMentorHours('');
        setEditMentorAmount('');
      }} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Mentor Hours & Payment</DialogTitle>
        <DialogContent>
          {editingMentor && (
            <>
              <Typography variant="body1" sx={{ mt: 2, mb: 2, fontWeight: 500 }}>
                Mentor: {editingMentor.mentor?.name || 'Unknown'}
              </Typography>
              <TextField
                label="Hours Taught"
                type="number"
                fullWidth
                required
                value={editMentorHours}
                onChange={(e) => setEditMentorHours(e.target.value)}
                sx={{ mt: 2 }}
                InputProps={{
                  inputProps: { min: 0, step: 0.01 },
                }}
              />
              <TextField
                label="Amount Paid"
                type="number"
                fullWidth
                required
                value={editMentorAmount}
                onChange={(e) => setEditMentorAmount(e.target.value)}
                sx={{ mt: 2 }}
                InputProps={{
                  startAdornment: <InputAdornment position="start">Tk</InputAdornment>,
                  inputProps: { min: 0, step: 0.01 },
                }}
              />
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setEditMentorDialogOpen(false);
            setEditingMentor(null);
            setEditMentorHours('');
            setEditMentorAmount('');
          }}>Cancel</Button>
          <Button onClick={handleEditMentor} variant="contained" disabled={editMentorLoading}>
            Update
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Costs Dialog */}
      <Dialog open={editCostsDialogOpen} onClose={() => setEditCostsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Edit Course Costs</DialogTitle>
        <DialogContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mt: 1, mb: 2 }}>
            Course Costs
          </Typography>
          <TextField
            label="Food Cost"
            type="number"
            fullWidth
            value={foodCost}
            onChange={(e) => setFoodCost(e.target.value)}
            sx={{ mb: 2 }}
            InputProps={{
              startAdornment: <InputAdornment position="start">Tk</InputAdornment>,
            }}
            inputProps={{ min: 0, step: 0.01 }}
          />
          <TextField
            label="Other Cost"
            type="number"
            fullWidth
            value={otherCost}
            onChange={(e) => setOtherCost(e.target.value)}
            sx={{ mb: 3 }}
            InputProps={{
              startAdornment: <InputAdornment position="start">Tk</InputAdornment>,
            }}
            inputProps={{ min: 0, step: 0.01 }}
          />

          <Divider sx={{ my: 3 }} />

          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Mentor Costs
            </Typography>
          </Box>
          
          {mentorCosts.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              No mentors assigned. Use "Assign Internal Mentor" or "Add External Mentor" buttons to add mentors.
            </Typography>
          ) : (
            <Box display="flex" flexDirection="column" gap={2} sx={{ mb: 2 }}>
              {mentorCosts.map((mc, index) => (
                <Card key={mc.id} variant="outlined" sx={{ p: 2 }}>
                  <Box display="flex" flexDirection="column" gap={2}>
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                        {mc.mentor_name}
                      </Typography>
                    </Box>
                    <Box display="flex" gap={2}>
                      <TextField
                        label="Hours Taught"
                        type="number"
                        fullWidth
                        value={mc.hours_taught}
                        onChange={(e) => handleMentorCostChange(index, 'hours_taught', e.target.value)}
                        size="small"
                        inputProps={{ min: 0, step: 0.1 }}
                      />
                      <TextField
                        label="Amount Paid"
                        type="number"
                        fullWidth
                        value={mc.amount_paid}
                        onChange={(e) => handleMentorCostChange(index, 'amount_paid', e.target.value)}
                        size="small"
                        InputProps={{
                          startAdornment: <InputAdornment position="start">Tk</InputAdornment>,
                        }}
                        inputProps={{ min: 0, step: 0.01 }}
                      />
                    </Box>
                  </Box>
                </Card>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditCostsDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSaveCosts} variant="contained" disabled={editCostsLoading}>
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* User Details Dialog */}
      <UserDetailsDialog
        open={userDetailsOpen}
        onClose={() => setUserDetailsOpen(false)}
        enrollment={selectedUserEnrollment}
      />

      {/* Comment Dialog */}
      <Dialog open={commentDialogOpen} onClose={() => setCommentDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Comment/Update</DialogTitle>
        <DialogContent>
          <TextField
            label="Comment"
            multiline
            rows={4}
            fullWidth
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            sx={{ mt: 2 }}
            placeholder="Add a comment or update about this course..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setCommentDialogOpen(false);
            setNewComment('');
          }}>
            Cancel
          </Button>
          <Button onClick={handleAddComment} variant="contained">
            Add Comment
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}

// Enrollment Table Component
function EnrollmentTable({ 
  enrollments, 
  onViewDetails, 
  onApprove, 
  onReject, 
  onWithdraw, 
  onReapprove,
  onEditAttendance,
  showEligibilityReason = false,
  showActions = false,
  actionsHeaderText = 'Actions'
}) {
  const theme = useTheme();

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Employee ID</TableCell>
            <TableCell>Name</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>SBU</TableCell>
            {showEligibilityReason && <TableCell>Eligibility Reason</TableCell>}
            <TableCell>Status</TableCell>
            <TableCell>Score</TableCell>
            <TableCell>Attendance</TableCell>
            {showActions && <TableCell>{actionsHeaderText}</TableCell>}
          </TableRow>
        </TableHead>
        <TableBody>
          {enrollments.map((enrollment) => (
            <TableRow key={enrollment.id}>
              <TableCell>{enrollment.student_employee_id}</TableCell>
              <TableCell>{enrollment.student_name}</TableCell>
              <TableCell>{enrollment.student_email}</TableCell>
              <TableCell>
                <Chip label={enrollment.student_sbu} size="small" />
              </TableCell>
              {showEligibilityReason && (
                <TableCell>
                  <Typography variant="body2" color="error">
                    {enrollment.eligibility_reason || enrollment.eligibility_status}
                  </Typography>
                </TableCell>
              )}
              <TableCell>
                <Chip
                  label={enrollment.completion_status || enrollment.approval_status}
                  size="small"
                  color={
                    enrollment.completion_status === 'Completed' ? 'success' :
                    enrollment.completion_status === 'Failed' ? 'error' :
                    enrollment.approval_status === 'Approved' ? 'success' :
                    enrollment.approval_status === 'Pending' ? 'warning' :
                    'default'
                  }
                />
              </TableCell>
              <TableCell>{enrollment.score || '-'}</TableCell>
              <TableCell>
                {enrollment.attendance_percentage !== null && enrollment.attendance_percentage !== undefined
                  ? `${enrollment.attendance_percentage.toFixed(1)}%`
                  : enrollment.attendance_status || '-'}
              </TableCell>
              {showActions && (
                <TableCell>
                  <Box display="flex" gap={0.5}>
                    {onApprove && (
                      <IconButton size="small" color="success" onClick={() => onApprove(enrollment.id)}>
                        <CheckCircle fontSize="small" />
                      </IconButton>
                    )}
                    {onReject && (
                      <IconButton size="small" color="error" onClick={() => onReject(enrollment.id)}>
                        <Cancel fontSize="small" />
                      </IconButton>
                    )}
                    {onWithdraw && (
                      <IconButton size="small" color="warning" onClick={() => onWithdraw(enrollment)}>
                        <PersonRemove fontSize="small" />
                      </IconButton>
                    )}
                    {onReapprove && (
                      <IconButton size="small" color="success" onClick={() => onReapprove(enrollment.id)}>
                        <Refresh fontSize="small" />
                      </IconButton>
                    )}
                    {onEditAttendance && (
                      <IconButton size="small" color="primary" onClick={() => onEditAttendance(enrollment)}>
                        <Edit fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default CourseDetail;

