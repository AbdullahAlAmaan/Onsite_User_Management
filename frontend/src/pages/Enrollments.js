import React, { useEffect, useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { 
  Box, 
  Typography, 
  TextField, 
  MenuItem, 
  CircularProgress, 
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  IconButton,
  Card,
  CardContent,
  useTheme,
  alpha,
} from '@mui/material';
import { PersonRemove, Visibility } from '@mui/icons-material';
import { enrollmentsAPI } from '../services/api';
import UserDetailsDialog from '../components/UserDetailsDialog';
import CourseDetailsDialog from '../components/CourseDetailsDialog';

function Enrollments() {
  const theme = useTheme();
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    eligibility_status: '',
    approval_status: '',
  });
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [withdrawalReason, setWithdrawalReason] = useState('');
  const [message, setMessage] = useState(null);
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);
  const [selectedUserEnrollment, setSelectedUserEnrollment] = useState(null);
  const [courseDetailsOpen, setCourseDetailsOpen] = useState(false);
  const [selectedCourseEnrollment, setSelectedCourseEnrollment] = useState(null);

  useEffect(() => {
    fetchEnrollments();
  }, [filters]);

  const fetchEnrollments = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.eligibility_status) params.eligibility_status = filters.eligibility_status;
      if (filters.approval_status) params.approval_status = filters.approval_status;
      
      const response = await enrollmentsAPI.getAll(params);
      setEnrollments(response.data);
    } catch (error) {
      console.error('Error fetching enrollments:', error);
    } finally {
      setLoading(false);
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

  const columns = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'student_name', headerName: 'Student Name', width: 200 },
    { field: 'student_email', headerName: 'Email', width: 250 },
    { field: 'student_sbu', headerName: 'SBU', width: 120 },
    { field: 'course_name', headerName: 'Course', width: 200 },
    { field: 'batch_code', headerName: 'Batch', width: 150 },
    { 
      field: 'eligibility_status', 
      headerName: 'Eligibility', 
      width: 180,
      renderCell: (params) => (
        <span style={{ 
          color: params.value === 'Eligible' ? 'green' : 'red',
          fontWeight: params.value === 'Eligible' ? 'bold' : 'normal'
        }}>
          {params.value}
        </span>
      )
    },
    { 
      field: 'eligibility_reason', 
      headerName: 'Reason', 
      width: 250,
      renderCell: (params) => params.value || '-'
    },
    { field: 'approval_status', headerName: 'Approval', width: 130 },
    { field: 'completion_status', headerName: 'Completion', width: 130 },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 180,
      sortable: false,
      renderCell: (params) => (
        <Box display="flex" gap={1}>
          <IconButton
            size="small"
            color="primary"
            onClick={() => handleViewUserDetails(params.row)}
            title="View User Details"
          >
            <Visibility />
          </IconButton>
          {params.row.approval_status === 'Approved' && (
            <IconButton
              size="small"
              color="error"
              onClick={() => handleWithdraw(params.row)}
              title="Withdraw Student"
            >
              <PersonRemove />
            </IconButton>
          )}
        </Box>
      ),
    },
  ];

  return (
    <Box>
      <Box mb={4}>
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
          Enrollments Management
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          View and manage all course enrollments
        </Typography>
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
      
      <Card
        sx={{
          mb: 3,
          borderRadius: 3,
          boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.1)}`,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
        }}
      >
        <CardContent>
          <Box display="flex" gap={2} flexWrap="wrap">
            <TextField
              select
              label="Eligibility Status"
              value={filters.eligibility_status}
              onChange={(e) => setFilters({ ...filters, eligibility_status: e.target.value })}
              sx={{ minWidth: 200 }}
              variant="outlined"
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="Eligible">Eligible</MenuItem>
              <MenuItem value="Ineligible (Missing Prerequisite)">Missing Prerequisite</MenuItem>
              <MenuItem value="Ineligible (Already Taken)">Already Taken</MenuItem>
              <MenuItem value="Ineligible (Annual Limit)">Annual Limit</MenuItem>
            </TextField>
            <TextField
              select
              label="Approval Status"
              value={filters.approval_status}
              onChange={(e) => setFilters({ ...filters, approval_status: e.target.value })}
              sx={{ minWidth: 200 }}
              variant="outlined"
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="Pending">Pending</MenuItem>
              <MenuItem value="Approved">Approved</MenuItem>
              <MenuItem value="Rejected">Rejected</MenuItem>
            </TextField>
          </Box>
        </CardContent>
      </Card>

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
          <Box sx={{ height: 600, width: '100%' }}>
            <DataGrid
              rows={enrollments}
              columns={columns}
              pageSize={10}
              rowsPerPageOptions={[10, 25, 50]}
              disableSelectionOnClick
              sx={{
                border: 'none',
                '& .MuiDataGrid-cell': {
                  borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                },
                '& .MuiDataGrid-columnHeaders': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.05),
                  borderBottom: `2px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                },
              }}
            />
          </Box>
        </Card>
      )}

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

export default Enrollments;

