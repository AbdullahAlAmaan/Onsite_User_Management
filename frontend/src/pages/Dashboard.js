import React, { useEffect, useState, useMemo } from 'react';
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
  TextField,
  MenuItem,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
  Paper,
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
  PlayCircle,
  Event,
  CalendarToday,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { studentsAPI, coursesAPI, enrollmentsAPI } from '../services/api';

function Dashboard() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState('all'); // 'all', 'month', 'quarter', 'year', 'custom'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [courses, setCourses] = useState([]);
  const [filteredOngoingCourses, setFilteredOngoingCourses] = useState([]);
  const [filteredPlanningCourses, setFilteredPlanningCourses] = useState([]);
  const [filteredCompletedCourses, setFilteredCompletedCourses] = useState([]);
  const [stats, setStats] = useState({
    activeEmployees: 0,
    previousEmployees: 0,
    ongoingCourses: 0,
    planningCourses: 0,
    completedCourses: 0,
    totalEnrollments: 0,
    approvedEnrollments: 0,
    pendingEnrollments: 0,
    withdrawnEnrollments: 0,
    completedEnrollments: 0,
    notEligibleEnrollments: 0,
  });

  useEffect(() => {
    fetchDashboardData();
  }, [timePeriod, startDate, endDate]);

  const getCourseStatus = (course) => {
    // Use status field if available, otherwise fall back to date-based logic
    if (course.status) {
      const statusStr = String(course.status).toLowerCase();
      // Map 'draft' status to 'planning' for display
      if (statusStr === 'draft') {
        return 'planning';
      }
      // Map enum values to lowercase strings
      return statusStr;
    }
    
    // Fallback to date-based logic if status field is not available
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(course.start_date);
    startDate.setHours(0, 0, 0, 0);
    const endDate = course.end_date ? new Date(course.end_date) : null;
    if (endDate) {
      endDate.setHours(0, 0, 0, 0);
    }

    if (startDate > today) {
      return 'planning';
    } else if (endDate && endDate < today) {
      return 'completed';
    } else {
      return 'ongoing';
    }
  };

  const getDateRange = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (timePeriod === 'custom' && startDate && endDate) {
      return {
        start: new Date(startDate),
        end: new Date(endDate),
      };
    }
    
    switch (timePeriod) {
      case 'month':
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return { start: monthStart, end: today };
      case 'quarter':
        const quarter = Math.floor(today.getMonth() / 3);
        const quarterStart = new Date(today.getFullYear(), quarter * 3, 1);
        return { start: quarterStart, end: today };
      case 'year':
        const yearStart = new Date(today.getFullYear(), 0, 1);
        return { start: yearStart, end: today };
      default:
        return null;
    }
  };

  const formatDateRange = () => {
    const dateRange = getDateRange();
    if (!dateRange) return 'All Time';
    
    const start = dateRange.start;
    const end = dateRange.end;
    
    const startStr = start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const endStr = end.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    
    if (startStr === endStr) {
      return startStr;
    }
    return `${startStr} - ${endStr}`;
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch all courses
      const coursesRes = await coursesAPI.getAll();
      const allCourses = coursesRes.data;
      setCourses(allCourses);

      // Categorize courses
      const ongoingCourses = allCourses.filter(c => getCourseStatus(c) === 'ongoing');
      const planningCourses = allCourses.filter(c => getCourseStatus(c) === 'planning');
      const completedCourses = allCourses.filter(c => getCourseStatus(c) === 'completed');

      // Filter courses by time period if needed
      const dateRange = getDateRange();
      let filteredOngoing = ongoingCourses;
      let filteredPlanning = planningCourses;
      let filteredCompleted = completedCourses;

      if (dateRange) {
        const periodStart = dateRange.start;
        const periodEnd = dateRange.end;
        
        // Re-filter all courses based on period logic
        filteredOngoing = allCourses.filter(c => {
          const courseStartDate = new Date(c.start_date);
          courseStartDate.setHours(0, 0, 0, 0);
          const courseEndDate = c.end_date ? new Date(c.end_date) : null;
          if (courseEndDate) {
            courseEndDate.setHours(0, 0, 0, 0);
          }
          
          // If course has an end date within the period, it's completed, not ongoing
          if (courseEndDate && courseEndDate >= periodStart && courseEndDate <= periodEnd) {
            return false;
          }
          
          // Ongoing: Course is active during the period
          // - Started before or during the period AND
          // - (Ends after the period OR has no end date)
          const startedByPeriodEnd = courseStartDate <= periodEnd;
          const endsAfterPeriod = courseEndDate ? courseEndDate > periodEnd : true;
          const noEndDate = !courseEndDate;
          
          // Course must have started by the end of the period
          if (!startedByPeriodEnd) {
            return false;
          }
          
          // If it has an end date, it must end after the period
          // If no end date, it's ongoing
          return endsAfterPeriod || noEndDate;
        });
        
        // Completed: Course ended within the period
        filteredCompleted = allCourses.filter(c => {
          const courseEndDate = c.end_date ? new Date(c.end_date) : null;
          if (!courseEndDate) {
            return false;
          }
          courseEndDate.setHours(0, 0, 0, 0);
          // End date must be within the period
          return courseEndDate >= periodStart && courseEndDate <= periodEnd;
        });
        
        // Planning: Everything that is not completed and not ongoing
        // - Courses that haven't started yet (start date is after the period)
        // - OR courses with draft status
        filteredPlanning = allCourses.filter(c => {
          const courseStartDate = new Date(c.start_date);
          courseStartDate.setHours(0, 0, 0, 0);
          const courseEndDate = c.end_date ? new Date(c.end_date) : null;
          if (courseEndDate) {
            courseEndDate.setHours(0, 0, 0, 0);
          }
          
          // If it's completed in this period, it's not planning
          if (courseEndDate && courseEndDate >= periodStart && courseEndDate <= periodEnd) {
            return false;
          }
          
          // If it's ongoing in this period, it's not planning
          const startedByPeriodEnd = courseStartDate <= periodEnd;
          const endsAfterPeriod = courseEndDate ? courseEndDate > periodEnd : true;
          const noEndDate = !courseEndDate;
          if (startedByPeriodEnd && (endsAfterPeriod || noEndDate)) {
            return false;
          }
          
          // Check if it's a draft course
          const statusStr = c.status ? String(c.status).toLowerCase() : '';
          if (statusStr === 'draft') {
            return true;
          }
          
          // If course starts after the period, it's planning
          if (courseStartDate > periodEnd) {
            return true;
          }
          
          // If course starts within the period but hasn't started yet (future date), it's planning
          if (courseStartDate >= periodStart && courseStartDate <= periodEnd) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return courseStartDate > today;
          }
          
          return false;
        });
      }

      // Store filtered courses for display
      setFilteredOngoingCourses(filteredOngoing);
      setFilteredPlanningCourses(filteredPlanning);
      setFilteredCompletedCourses(filteredCompleted);

      // Fetch dashboard statistics from backend
      const statsRes = await enrollmentsAPI.getDashboardStats();
      const statsData = statsRes.data;

      setStats({
        activeEmployees: statsData.active_employees || 0,
        previousEmployees: statsData.previous_employees || 0,
        ongoingCourses: filteredOngoing.length,
        planningCourses: filteredPlanning.length,
        completedCourses: filteredCompleted.length,
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

  const StatCard = ({ title, value, icon, color, onClick, subtitle, courses = [] }) => {
    const dateRange = getDateRange();
    const showCourses = dateRange !== null && courses.length > 0;
    
    return (
      <Card
        sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          border: `2px solid ${alpha(color, 0.2)}`,
          background: `linear-gradient(135deg, ${alpha(color, 0.1)} 0%, ${alpha(color, 0.05)} 100%)`,
        }}
      >
        <CardContent sx={{ flexGrow: 1 }}>
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
          {onClick && !showCourses && (
            <Box 
              display="flex" 
              alignItems="center" 
              color={color} 
              sx={{ mt: 2, cursor: 'pointer' }}
              onClick={onClick}
            >
              <Typography variant="body2" sx={{ fontWeight: 600, mr: 0.5 }}>
                View Details
              </Typography>
              <ArrowForward fontSize="small" />
            </Box>
          )}
        </CardContent>
        {showCourses && (
          <Box sx={{ borderTop: `1px solid ${alpha(color, 0.2)}`, maxHeight: 300, overflow: 'auto' }}>
            <List dense sx={{ py: 0 }}>
              {courses.slice(0, 10).map((course) => (
                <ListItem key={course.id} disablePadding>
                  <ListItemButton
                    onClick={() => navigate(`/courses/${course.id}`)}
                    sx={{
                      '&:hover': {
                        backgroundColor: alpha(color, 0.1),
                      },
                    }}
                  >
                    <ListItemText
                      primary={
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {course.name}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          {course.batch_code} • {new Date(course.start_date).toLocaleDateString()}
                        </Typography>
                      }
                    />
                    <ArrowForward fontSize="small" sx={{ color: color, ml: 1 }} />
                  </ListItemButton>
                </ListItem>
              ))}
              {courses.length > 10 && (
                <ListItem>
                  <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    +{courses.length - 10} more courses
                  </Typography>
                </ListItem>
              )}
            </List>
          </Box>
        )}
      </Card>
    );
  };

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
      <Box mb={4} display="flex" justifyContent="space-between" alignItems="center">
        <Box>
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
        <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
          <TextField
            select
            label="Time Period"
            value={timePeriod}
            onChange={(e) => {
              setTimePeriod(e.target.value);
              if (e.target.value !== 'custom') {
                setStartDate('');
                setEndDate('');
              }
            }}
            sx={{ minWidth: 180 }}
            size="small"
          >
            <MenuItem value="all">All Time</MenuItem>
            <MenuItem value="month">This Month</MenuItem>
            <MenuItem value="quarter">This Quarter</MenuItem>
            <MenuItem value="year">This Year</MenuItem>
            <MenuItem value="custom">Custom Range</MenuItem>
          </TextField>
          {timePeriod === 'custom' && (
            <>
              <TextField
                type="date"
                label="Start Date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
                sx={{ minWidth: 150 }}
              />
              <TextField
                type="date"
                label="End Date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                size="small"
                sx={{ minWidth: 150 }}
              />
            </>
          )}
          {timePeriod !== 'all' && (
            <Chip
              icon={<CalendarToday />}
              label={formatDateRange()}
              color="primary"
              variant="outlined"
            />
          )}
        </Box>
      </Box>

      {/* Main Statistics Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Active Employees"
            value={stats.activeEmployees}
            icon={<People sx={{ fontSize: 32, color: theme.palette.primary.main }} />}
            color={theme.palette.primary.main}
            onClick={() => navigate('/users')}
            subtitle="Currently active"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Ongoing Courses"
            value={stats.ongoingCourses}
            icon={<PlayCircle sx={{ fontSize: 32, color: theme.palette.success.main }} />}
            color={theme.palette.success.main}
            onClick={() => navigate('/courses/ongoing')}
            subtitle={timePeriod !== 'all' ? formatDateRange() : 'In progress'}
            courses={filteredOngoingCourses}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Planning Courses"
            value={stats.planningCourses}
            icon={<Event sx={{ fontSize: 32, color: theme.palette.info.main }} />}
            color={theme.palette.info.main}
            onClick={() => navigate('/courses/planning')}
            subtitle={timePeriod !== 'all' ? formatDateRange() : 'Scheduled'}
            courses={filteredPlanningCourses}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Completed Courses"
            value={stats.completedCourses}
            icon={<CheckCircle sx={{ fontSize: 32, color: theme.palette.warning.main }} />}
            color={theme.palette.warning.main}
            onClick={() => navigate('/courses/completed')}
            subtitle={timePeriod !== 'all' ? formatDateRange() : 'Finished'}
            courses={filteredCompletedCourses}
          />
        </Grid>
      </Grid>
    </Box>
  );
}

export default Dashboard;
