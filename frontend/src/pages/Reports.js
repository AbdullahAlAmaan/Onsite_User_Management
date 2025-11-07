import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Download } from '@mui/icons-material';
import { reportsAPI } from '../services/api';

function Reports() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    course_id: '',
    sbu: '',
  });

  useEffect(() => {
    fetchSummary();
  }, [filters]);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.course_id) params.course_id = filters.course_id;
      if (filters.sbu) params.sbu = filters.sbu;
      
      const response = await reportsAPI.getSummary(params);
      setSummary(response.data);
    } catch (error) {
      console.error('Error fetching summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async (format) => {
    try {
      const params = { format, ...filters };
      const response = await reportsAPI.exportCSV(params);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${format}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting CSV:', error);
    }
  };

  const handleExportPDF = async (format) => {
    try {
      const params = { format, ...filters };
      const response = await reportsAPI.exportPDF(params);
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${format}_report_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error exporting PDF:', error);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Reports & Analytics
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" gap={2} flexWrap="wrap" mb={2}>
            <TextField
              label="Filter by Course ID"
              type="number"
              value={filters.course_id}
              onChange={(e) => setFilters({ ...filters, course_id: e.target.value })}
            />
            <TextField
              select
              label="Filter by SBU"
              value={filters.sbu}
              onChange={(e) => setFilters({ ...filters, sbu: e.target.value })}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="">All SBUs</MenuItem>
              <MenuItem value="IT">IT</MenuItem>
              <MenuItem value="HR">HR</MenuItem>
              <MenuItem value="Finance">Finance</MenuItem>
              <MenuItem value="Operations">Operations</MenuItem>
              <MenuItem value="Sales">Sales</MenuItem>
              <MenuItem value="Marketing">Marketing</MenuItem>
            </TextField>
          </Box>
          <Box display="flex" gap={2} flexWrap="wrap">
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={() => handleExportCSV('enrollments')}
            >
              Export Enrollments CSV
            </Button>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={() => handleExportCSV('courses')}
            >
              Export Courses CSV
            </Button>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={() => handleExportPDF('summary')}
            >
              Export Summary PDF
            </Button>
          </Box>
        </CardContent>
      </Card>

      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : summary ? (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Enrollment Statistics
                </Typography>
                <Typography>Total Applicants: {summary.total_applicants}</Typography>
                <Typography>Eligible: {summary.eligible}</Typography>
                <Typography>Ineligible: {summary.ineligible}</Typography>
                <Typography>Approved: {summary.approved}</Typography>
                <Typography>Pending Approval: {summary.pending_approval}</Typography>
                <Typography>Completed: {summary.completed}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Performance Metrics
                </Typography>
                <Typography>Eligibility Rate: {summary.eligibility_rate}%</Typography>
                <Typography>Approval Rate: {summary.approval_rate}%</Typography>
                <Typography>Completion Rate: {summary.completion_rate}%</Typography>
                {summary.avg_approval_time_hours && (
                  <Typography>
                    Avg Approval Time: {summary.avg_approval_time_hours} hours
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      ) : (
        <Alert severity="info">No data available</Alert>
      )}
    </Box>
  );
}

export default Reports;

