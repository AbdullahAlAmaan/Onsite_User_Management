import React, { useEffect, useState } from 'react';
import { DataGrid } from '@mui/x-data-grid';
import { Box, Typography, TextField, MenuItem, CircularProgress } from '@mui/material';
import { enrollmentsAPI } from '../services/api';

function Enrollments() {
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    eligibility_status: '',
    approval_status: '',
  });

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

  const columns = [
    { field: 'id', headerName: 'ID', width: 70 },
    { field: 'student_name', headerName: 'Student Name', width: 200 },
    { field: 'student_email', headerName: 'Email', width: 250 },
    { field: 'student_sbu', headerName: 'SBU', width: 120 },
    { field: 'course_name', headerName: 'Course', width: 200 },
    { field: 'batch_code', headerName: 'Batch', width: 150 },
    { field: 'eligibility_status', headerName: 'Eligibility', width: 180 },
    { field: 'approval_status', headerName: 'Approval', width: 130 },
    { field: 'completion_status', headerName: 'Completion', width: 130 },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Enrollments
      </Typography>
      
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
    </Box>
  );
}

export default Enrollments;

