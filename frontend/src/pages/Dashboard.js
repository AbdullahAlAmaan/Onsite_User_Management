import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  useTheme,
  alpha,
  Chip,
  Button,
} from '@mui/material';
import {
  People,
  School,
  Assignment,
  CheckCircle,
  Pending,
  PersonRemove,
  History,
  TrendingUp,
  ArrowForward,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { studentsAPI, coursesAPI, enrollmentsAPI } from '../services/api';

function Dashboard() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    activeEmployees: 0,
    previousEmployees: 0,
    activeCourses: 0,
    archivedCourses: 0,
    totalEnrollments: 0,
    approvedEnrollments: 0,
    pendingEnrollments: 0,
    withdrawnEnrollments: 0,
    completedEnrollments: 0,
    notEligibleEnrollments: 0,
  });

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch dashboard statistics from backend
      const statsRes = await enrollmentsAPI.getDashboardStats();
      const statsData = statsRes.data;

      setStats({
        activeEmployees: statsData.active_employees || 0,
        previousEmployees: statsData.previous_employees || 0,
        activeCourses: statsData.active_courses || 0,
        archivedCourses: statsData.archived_courses || 0,
        totalEnrollments: statsData.total_enrollments || 0,
        approvedEnrollments: statsData.approved_enrollments || 0,
        pendingEnrollments: statsData.pending_enrollments || 0,
        withdrawnEnrollments: statsData.withdrawn_enrollments || 0,
        completedEnrollments: statsData.completed_enrollments || 0,
        notEligibleEnrollments: statsData.not_eligible_enrollments || 0,
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon, color, onClick, subtitle }) => (
    <Card
      sx={{
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.3s ease',
        '&:hover': onClick ? {
          transform: 'translateY(-4px)',
          boxShadow: `0 8px 24px ${alpha(color, 0.3)}`,
        } : {},
        border: `2px solid ${alpha(color, 0.2)}`,
        background: `linear-gradient(135deg, ${alpha(color, 0.1)} 0%, ${alpha(color, 0.05)} 100%)`,
      }}
      onClick={onClick}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: color, mb: 0.5 }}>
              {value}
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 500 }}>
              {title}
            </Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                {subtitle}
              </Typography>
            )}
          </Box>
          <Box
            sx={{
              p: 1.5,
              borderRadius: 2,
              backgroundColor: alpha(color, 0.15),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </Box>
        </Box>
        {onClick && (
          <Box display="flex" alignItems="center" color={color} sx={{ mt: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 600, mr: 0.5 }}>
              View Details
            </Typography>
            <ArrowForward fontSize="small" />
          </Box>
        )}
      </CardContent>
    </Card>
  );

  const EnrollmentStatCard = ({ title, value, color, onClick }) => (
    <Card
      sx={{
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.3s ease',
        '&:hover': onClick ? {
          transform: 'translateY(-2px)',
          boxShadow: `0 4px 12px ${alpha(color, 0.3)}`,
        } : {},
        border: `1px solid ${alpha(color, 0.3)}`,
        backgroundColor: alpha(color, 0.05),
      }}
      onClick={onClick}
    >
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: color }}>
              {value}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {title}
            </Typography>
          </Box>
          {onClick && <ArrowForward sx={{ color: color }} />}
        </Box>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box mb={4}>
        <Typography
          variant="h4"
          gutterBottom
          sx={{
            fontWeight: 700,
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Overview of your enrollment management system
        </Typography>
      </Box>

      {/* Main Statistics Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Active Employees"
            value={stats.activeEmployees}
            icon={<People sx={{ fontSize: 32, color: theme.palette.primary.main }} />}
            color={theme.palette.primary.main}
            onClick={() => navigate('/users')}
            subtitle="Currently active"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Previous Employees"
            value={stats.previousEmployees}
            icon={<History sx={{ fontSize: 32, color: theme.palette.warning.main }} />}
            color={theme.palette.warning.main}
            onClick={() => navigate('/previous-employees')}
            subtitle="Inactive employees"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <StatCard
            title="Active Courses"
            value={stats.activeCourses}
            icon={<School sx={{ fontSize: 32, color: theme.palette.success.main }} />}
            color={theme.palette.success.main}
            onClick={() => navigate('/courses')}
            subtitle="Currently available"
          />
        </Grid>
      </Grid>

      {/* Enrollment Status Breakdown */}
      <Card
        sx={{
          mb: 4,
          borderRadius: 3,
          boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.1)}`,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
        }}
      >
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Enrollment Status 
            </Typography>
          </Box>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={4}>
              <EnrollmentStatCard
                title="Approved Enrollments"
                value={stats.approvedEnrollments}
                color={theme.palette.success.main}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <EnrollmentStatCard
                title="Pending Approvals"
                value={stats.pendingEnrollments}
                color={theme.palette.warning.main}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <EnrollmentStatCard
                title="Withdrawn"
                value={stats.withdrawnEnrollments}
                color={theme.palette.error.main}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <EnrollmentStatCard
                title="Not Eligible"
                value={stats.notEligibleEnrollments}
                color={theme.palette.error.main}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}

export default Dashboard;

