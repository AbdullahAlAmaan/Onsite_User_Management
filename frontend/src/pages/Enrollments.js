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
  IconButton
} from '@mui/material';
import { PersonRemove } from '@mui/icons-material';
import { enrollmentsAPI } from '../services/api';

function Enrollments() {
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
      width: 120,
      sortable: false,
      renderCell: (params) => {
        if (params.row.approval_status === 'Approved') {
          return (
            <IconButton
              size="small"
              color="error"
              onClick={() => handleWithdraw(params.row)}
              title="Withdraw Student"
            >
              <PersonRemove />
            </IconButton>
          );
        }
        return null;
      },
    },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Enrollments
      </Typography>

      {message && (
        <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}
      
      <Box display="flex" gap={2} mb={2}>
        <TextField
          select
          label="Eligibility Status"
          value={filters.eligibility_status}
          onChange={(e) => setFilters({ ...filters, eligibility_status: e.target.value })}
          sx={{ minWidth: 200 }}
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
        >
          <MenuItem value="">All</MenuItem>
          <MenuItem value="Pending">Pending</MenuItem>
          <MenuItem value="Approved">Approved</MenuItem>
          <MenuItem value="Rejected">Rejected</MenuItem>
        </TextField>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : (
        <Box sx={{ height: 600, width: '100%' }}>
          <DataGrid
            rows={enrollments}
            columns={columns}
            pageSize={10}
            rowsPerPageOptions={[10, 25, 50]}
            disableSelectionOnClick
          />
        </Box>
      )}

      {/* Withdraw Dialog */}
      <Dialog open={withdrawDialogOpen} onClose={handleWithdrawCancel} maxWidth="sm" fullWidth>
        <DialogTitle>Withdraw Student from Course</DialogTitle>
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
    </Box>
  );
}

export default Enrollments;

