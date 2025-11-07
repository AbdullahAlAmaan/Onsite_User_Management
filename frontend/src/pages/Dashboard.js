import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
} from '@mui/material';
import {
  People,
  School,
  CheckCircle,
  Pending,
} from '@mui/icons-material';
import { reportsAPI } from '../services/api';

function Dashboard() {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchKPIs();
  }, []);

  const fetchKPIs = async () => {
    try {
      const response = await reportsAPI.getKPIs();
      setKpis(response.data);
    } catch (error) {
      console.error('Error fetching KPIs:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  const kpiCards = [
    {
      title: 'Total Enrollments',
      value: kpis?.total_enrollments || 0,
      icon: <People fontSize="large" />,
      color: '#1976d2',
    },
    {
      title: 'Pending Approval',
      value: kpis?.eligible_pending_approval || 0,
      icon: <Pending fontSize="large" />,
      color: '#ed6c02',
    },
    {
      title: 'Active Courses',
      value: kpis?.active_courses || 0,
      icon: <School fontSize="large" />,
      color: '#2e7d32',
    },
    {
      title: 'Available Seats',
      value: kpis?.total_seats_available || 0,
      icon: <CheckCircle fontSize="large" />,
      color: '#9c27b0',
    },
  ];

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>
      <Grid container spacing={3} sx={{ mt: 2 }}>
        {kpiCards.map((kpi, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography color="textSecondary" gutterBottom variant="body2">
                      {kpi.title}
                    </Typography>
                    <Typography variant="h4">{kpi.value}</Typography>
                  </Box>
                  <Box sx={{ color: kpi.color }}>{kpi.icon}</Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

export default Dashboard;

