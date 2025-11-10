import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  useTheme,
  alpha,
} from '@mui/material';
import {
  People,
  School,
  CheckCircle,
  Pending,
  TrendingUp,
} from '@mui/icons-material';
import { enrollmentsAPI, coursesAPI } from '../services/api';

function Dashboard() {
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);
  const theme = useTheme();

  useEffect(() => {
    fetchKPIs();
  }, []);

  const fetchKPIs = async () => {
    try {
      // Fetch data from enrollments and courses APIs
      const [enrollmentsRes, coursesRes] = await Promise.all([
        enrollmentsAPI.getAll({ limit: 1000 }),
        coursesAPI.getAll({ archived: false })
      ]);

      const enrollments = enrollmentsRes.data;
      const courses = coursesRes.data;

      // Calculate KPIs
      const totalEnrollments = enrollments.length;
      const eligiblePendingApproval = enrollments.filter(
        e => e.eligibility_status === 'Eligible' && e.approval_status === 'Pending'
      ).length;
      const activeCourses = courses.length;
      const totalSeatsAvailable = courses.reduce((sum, course) => {
        return sum + Math.max(0, course.seat_limit - course.current_enrolled);
      }, 0);

      setKpis({
        total_enrollments: totalEnrollments,
        eligible_pending_approval: eligiblePendingApproval,
        active_courses: activeCourses,
        total_seats_available: totalSeatsAvailable,
      });
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
      icon: <People />,
      color: '#1976d2',
      bgGradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      iconBg: alpha('#1976d2', 0.1),
    },
    {
      title: 'Pending Approval',
      value: kpis?.eligible_pending_approval || 0,
      icon: <Pending />,
      color: '#ed6c02',
      bgGradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      iconBg: alpha('#ed6c02', 0.1),
    },
    {
      title: 'Active Courses',
      value: kpis?.active_courses || 0,
      icon: <School />,
      color: '#2e7d32',
      bgGradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
      iconBg: alpha('#2e7d32', 0.1),
    },
    {
      title: 'Available Seats',
      value: kpis?.total_seats_available || 0,
      icon: <CheckCircle />,
      color: '#9c27b0',
      bgGradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
      iconBg: alpha('#9c27b0', 0.1),
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
          Dashboard 
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
        </Typography>
      </Box>
      
      <Grid container spacing={3}>
        {kpiCards.map((kpi, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card
              sx={{
                height: '100%',
                position: 'relative',
                overflow: 'visible',
                transition: 'all 0.3s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: `0 12px 24px ${alpha(kpi.color, 0.3)}`,
                },
                boxShadow: `0 4px 20px ${alpha(kpi.color, 0.15)}`,
                borderRadius: 3,
                border: `1px solid ${alpha(kpi.color, 0.1)}`,
              }}
            >
              <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      backgroundColor: kpi.iconBg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Box sx={{ color: kpi.color, fontSize: 28 }}>
                      {kpi.icon}
                    </Box>
                  </Box>
                </Box>
                
                <Typography 
                  variant="h3" 
                  sx={{ 
                    fontWeight: 700,
                    mb: 0.5,
                    color: theme.palette.text.primary,
                    fontSize: { xs: '2rem', sm: '2.5rem' },
                  }}
                >
                  {kpi.value}
                </Typography>
                
                <Typography 
                  variant="body2" 
                  color="text.secondary"
                  sx={{ 
                    fontWeight: 500,
                    fontSize: '0.875rem',
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                  }}
                >
                  {kpi.title}
                </Typography>
              </CardContent>
              
              {/* Decorative gradient background */}
              <Box
                sx={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  width: '100%',
                  height: '100%',
                  background: kpi.bgGradient,
                  opacity: 0.05,
                  borderRadius: 3,
                  zIndex: 0,
                }}
              />
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

export default Dashboard;

