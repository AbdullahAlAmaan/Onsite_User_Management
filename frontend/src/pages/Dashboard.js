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
  AccessTime,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { studentsAPI, coursesAPI, enrollmentsAPI } from '../services/api';
import { getCourseStatus } from '../utils/courseUtils';
import { formatDateRange as formatDateRangeUtil, formatDateForDisplay, convertTo12HourFormat } from '../utils/dateUtils';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

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
  const [todayClasses, setTodayClasses] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
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
    
    return formatDateRangeUtil(dateRange.start, dateRange.end);
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
        
        // Re-filter all courses based on period logic, but respect status field first
        filteredOngoing = allCourses.filter(c => {
          // First check the status field - if it's 'ongoing', include it if dates match
          const statusStr = c.status ? String(c.status).toLowerCase() : '';
          const isOngoingStatus = statusStr === 'ongoing';
          
          // If course has status 'ongoing', check if it's active during the period
          if (isOngoingStatus) {
            const courseStartDate = new Date(c.start_date);
            courseStartDate.setHours(0, 0, 0, 0);
            const courseEndDate = c.end_date ? new Date(c.end_date) : null;
            if (courseEndDate) {
              courseEndDate.setHours(0, 0, 0, 0);
            }
            
            // If course has an end date within the period, it might be completed, not ongoing
            if (courseEndDate && courseEndDate >= periodStart && courseEndDate <= periodEnd) {
              // But if status is explicitly 'ongoing', still include it
              return true;
            }
            
            // Course must have started by the end of the period
            const startedByPeriodEnd = courseStartDate <= periodEnd;
            if (!startedByPeriodEnd) {
              return false;
            }
            
            return true;
          }
          
          // For courses without explicit 'ongoing' status, use date-based logic
          const courseStartDate = new Date(c.start_date);
          courseStartDate.setHours(0, 0, 0, 0);
          const courseEndDate = c.end_date ? new Date(c.end_date) : null;
          if (courseEndDate) {
            courseEndDate.setHours(0, 0, 0, 0);
          }
          
          // Exclude draft/completed courses
          if (statusStr === 'draft' || statusStr === 'completed') {
            return false;
          }
          
          // If course has an end date within the period, it's completed, not ongoing
          if (courseEndDate && courseEndDate >= periodStart && courseEndDate <= periodEnd) {
            return false;
          }
          
          // Ongoing: Course is active during the period
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
          // First check the status field - if it's 'completed', include it if dates match
          const statusStr = c.status ? String(c.status).toLowerCase() : '';
          const isCompletedStatus = statusStr === 'completed';
          
          const courseEndDate = c.end_date ? new Date(c.end_date) : null;
          if (!courseEndDate && !isCompletedStatus) {
            return false;
          }
          
          if (courseEndDate) {
            courseEndDate.setHours(0, 0, 0, 0);
            // If status is 'completed', include if end date is in period
            if (isCompletedStatus) {
              return courseEndDate >= periodStart && courseEndDate <= periodEnd;
            }
            // Otherwise use date-based logic
            return courseEndDate >= periodStart && courseEndDate <= periodEnd;
          }
          
          // If status is 'completed' but no end date, include it
          return isCompletedStatus;
        });
        
        // Planning: Everything that is not completed and not ongoing
        // - Courses with draft status
        // - OR courses that haven't started yet (start date is after the period)
        filteredPlanning = allCourses.filter(c => {
          const statusStr = c.status ? String(c.status).toLowerCase() : '';
          
          // Exclude courses with explicit 'ongoing' or 'completed' status
          if (statusStr === 'ongoing' || statusStr === 'completed') {
            return false;
          }
          
          // Include draft courses
          if (statusStr === 'draft') {
            return true;
          }
          
          // For courses without explicit status, use date-based logic
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

      // Get today's classes from all courses
      const today = new Date();
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const todayDayName = dayNames[today.getDay()];
      
      const classesToday = [];
      const events = [];
      
      // Generate unique color for each course based on course ID
      const generateCourseColor = (courseId, courseStatus) => {
        // Use a hash function to generate consistent colors per course
        const hash = courseId.toString().split('').reduce((acc, char) => {
          return char.charCodeAt(0) + ((acc << 5) - acc);
        }, 0);
        
        // Generate hue based on course ID (0-360)
        const hue = Math.abs(hash) % 360;
        
        // Adjust saturation and lightness based on status for better visibility
        let saturation = 70;
        let lightness = 50;
        
        if (courseStatus === 'ongoing') {
          lightness = 45; // Darker for ongoing courses
        } else if (courseStatus === 'completed') {
          saturation = 60;
          lightness = 55; // Lighter for completed courses
        } else {
          lightness = 50; // Planning courses
        }
        
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
      };

      // Convert class schedules to FullCalendar events
      allCourses.forEach(course => {
        const courseStatus = getCourseStatus(course);
        
        // Generate unique color for this course
        const eventColor = generateCourseColor(course.id, courseStatus);
        
        if (course.class_schedule && Array.isArray(course.class_schedule)) {
          // Handle multiple schedules for the same course
          course.class_schedule.forEach((schedule, scheduleIndex) => {
            // Get today's classes for the simple list
            if (schedule.day === todayDayName) {
              classesToday.push({
                courseId: course.id,
                courseName: course.name,
                batchCode: course.batch_code,
                day: schedule.day,
                startTime: schedule.start_time,
                endTime: schedule.end_time,
                status: courseStatus,
              });
            }
            
            // Create recurring events for FullCalendar
            // Map day names to FullCalendar day numbers (0=Sunday, 1=Monday, etc.)
            const dayMap = {
              'Sunday': 0,
              'Monday': 1,
              'Tuesday': 2,
              'Wednesday': 3,
              'Thursday': 4,
              'Friday': 5,
              'Saturday': 6
            };
            
            const dayOfWeek = dayMap[schedule.day];
            if (dayOfWeek !== undefined && schedule.start_time && schedule.end_time) {
              // Create events for the next 12 weeks
              const startDate = new Date();
              startDate.setDate(startDate.getDate() - startDate.getDay()); // Start of current week
              
              for (let week = 0; week < 12; week++) {
                const eventDate = new Date(startDate);
                eventDate.setDate(eventDate.getDate() + (week * 7) + dayOfWeek);
                
                // Only create events if course is within date range
                const courseStart = new Date(course.start_date);
                const courseEnd = course.end_date ? new Date(course.end_date) : null;
                
                if (eventDate >= courseStart && (!courseEnd || eventDate <= courseEnd)) {
                  const [startHour, startMin] = schedule.start_time.split(':').map(Number);
                  const [endHour, endMin] = schedule.end_time.split(':').map(Number);
                  
                  const eventStart = new Date(eventDate);
                  eventStart.setHours(startHour, startMin, 0, 0);
                  
                  const eventEnd = new Date(eventDate);
                  eventEnd.setHours(endHour, endMin, 0, 0);
                  
                  // Create unique ID for each class instance (handles same course, same day, multiple classes)
                  // Format: course-{id}-{day}-{scheduleIndex}-{week}-{time}
                  const eventId = `course-${course.id}-${schedule.day}-${scheduleIndex}-${week}-${schedule.start_time.replace(':', '')}`;
                  
                  // Build title - include time if multiple classes on same day
                  const title = course.class_schedule.filter(s => s.day === schedule.day).length > 1
                    ? `${course.name} (${course.batch_code}) - ${convertTo12HourFormat(schedule.start_time)}`
                    : `${course.name} (${course.batch_code})`;
                  
                  events.push({
                    id: eventId,
                    title: title,
                    start: eventStart.toISOString(),
                    end: eventEnd.toISOString(),
                    backgroundColor: eventColor,
                    borderColor: eventColor,
                    textColor: '#ffffff',
                    extendedProps: {
                      courseId: course.id,
                      courseName: course.name,
                      batchCode: course.batch_code,
                      status: courseStatus,
                      time: `${convertTo12HourFormat(schedule.start_time)} - ${convertTo12HourFormat(schedule.end_time)}`,
                      day: schedule.day,
                      scheduleIndex: scheduleIndex,
                    },
                  });
                }
              }
            }
          });
        }
      });
      
      // Sort by start time
      classesToday.sort((a, b) => {
        const timeA = a.startTime || '00:00';
        const timeB = b.startTime || '00:00';
        return timeA.localeCompare(timeB);
      });
      
      setTodayClasses(classesToday);
      setCalendarEvents(events);

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
          border: `1px solid ${alpha(color, 0.15)}`,
          background: `linear-gradient(135deg, ${alpha(color, 0.08)} 0%, ${alpha(color, 0.02)} 100%)`,
          boxShadow: `0 4px 16px ${alpha(color, 0.1)}`,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            boxShadow: `0 8px 24px ${alpha(color, 0.15)}`,
            transform: 'translateY(-2px)',
            border: `1px solid ${alpha(color, 0.25)}`,
          },
        }}
      >
        <CardContent sx={{ flexGrow: 1 }}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, color: color, mb: 0.5 }}>
                {value}
              </Typography>
              <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 500, fontSize: '0.95rem' }}>
                {title}
              </Typography>
              {subtitle && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', fontSize: '0.8rem' }}>
                  {subtitle}
                </Typography>
              )}
            </Box>
            <Box
              sx={{
                p: 1.5,
                borderRadius: 2,
                backgroundColor: alpha(color, 0.12),
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
              sx={{ mt: 2, cursor: 'pointer', fontSize: '0.9rem' }}
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
          <Box sx={{ borderTop: `1px solid ${alpha(color, 0.15)}`, maxHeight: 300, overflow: 'auto' }}>
            <List dense sx={{ py: 0 }}>
              {courses.slice(0, 10).map((course) => (
                <ListItem key={course.id} disablePadding>
                  <ListItemButton
                    onClick={() => navigate(`/courses/${course.id}`)}
                    sx={{
                      '&:hover': {
                        backgroundColor: alpha(color, 0.08),
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
                          {course.batch_code} • {formatDateForDisplay(new Date(course.start_date))}
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
    <Box sx={{ p: 3 }}>
      <Box mb={4} display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
        <Box>
          <Typography
            variant="h4"
            gutterBottom
            sx={{
              fontWeight: 700,
              background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.info.main} 100%)`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ fontSize: '0.95rem' }}>
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

      {/* FullCalendar */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Card
            sx={{
              border: `1px solid ${alpha(theme.palette.primary.main, 0.15)}`,
              background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.04)} 0%, ${alpha(theme.palette.info.main, 0.04)} 100%)`,
              boxShadow: `0 4px 16px ${alpha(theme.palette.primary.main, 0.08)}`,
            }}
          >
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={3} flexWrap="wrap" gap={2}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      backgroundColor: alpha(theme.palette.primary.main, 0.12),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <CalendarToday sx={{ fontSize: 32, color: theme.palette.primary.main }} />
                  </Box>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.primary.main }}>
                      Class Schedule Calendar
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      View all scheduled classes
                    </Typography>
                  </Box>
                </Box>
                <Box display="flex" gap={1} flexWrap="wrap">
                  <Chip
                    label="Planning"
                    size="small"
                    sx={{
                      backgroundColor: alpha(theme.palette.info.main, 0.15),
                      color: theme.palette.info.main,
                      fontWeight: 600,
                      border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`,
                    }}
                  />
                  <Chip
                    label="Ongoing"
                    size="small"
                    sx={{
                      backgroundColor: alpha(theme.palette.success.main, 0.15),
                      color: theme.palette.success.main,
                      fontWeight: 600,
                      border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
                    }}
                  />
                  <Chip
                    label="Completed"
                    size="small"
                    sx={{
                      backgroundColor: alpha(theme.palette.warning.main, 0.15),
                      color: theme.palette.warning.main,
                      fontWeight: 600,
                      border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
                    }}
                  />
                </Box>
              </Box>

              <Box sx={{ 
                '& .fc': { 
                  fontFamily: theme.typography.fontFamily,
                },
                '& .fc-header-toolbar': {
                  marginBottom: theme.spacing(1),
                  padding: theme.spacing(1),
                },
                '& .fc-toolbar-title': {
                  fontSize: '1.25rem !important',
                  fontWeight: 600,
                },
                '& .fc-button': {
                  backgroundColor: theme.palette.primary.main,
                  borderColor: theme.palette.primary.main,
                  padding: theme.spacing(0.5, 1),
                  fontSize: '0.875rem',
                  '&:hover': {
                    backgroundColor: theme.palette.primary.dark,
                    borderColor: theme.palette.primary.dark,
                  },
                },
                '& .fc-button-active': {
                  backgroundColor: theme.palette.primary.dark,
                  borderColor: theme.palette.primary.dark,
                },
                '& .fc-today-button': {
                  backgroundColor: theme.palette.secondary.main,
                  borderColor: theme.palette.secondary.main,
                  '&:hover': {
                    backgroundColor: theme.palette.secondary.dark,
                    borderColor: theme.palette.secondary.dark,
                  },
                },
                '& .fc-day-today': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                },
                '& .fc-daygrid-day': {
                  minHeight: '60px !important',
                },
                '& .fc-daygrid-day-frame': {
                  minHeight: '60px !important',
                },
                '& .fc-col-header-cell': {
                  padding: theme.spacing(0.5),
                  fontSize: '0.875rem',
                },
                '& .fc-daygrid-day-number': {
                  padding: theme.spacing(0.5),
                  fontSize: '0.875rem',
                },
                '& .fc-event': {
                  fontSize: '0.75rem',
                  padding: '2px 4px',
                  marginBottom: '2px',
                  cursor: 'pointer',
                  '&:hover': {
                    opacity: 0.9,
                    transform: 'scale(1.02)',
                    transition: 'all 0.2s ease',
                  },
                },
                '& .fc-event-title': {
                  fontSize: '0.75rem',
                  fontWeight: 500,
                },
                '& .fc-event-overlap': {
                  borderLeftWidth: '4px',
                  borderLeftStyle: 'solid',
                  borderLeftColor: theme.palette.error.main,
                },
              }}>
                <FullCalendar
                  plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                  initialView="dayGridMonth"
                  headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: 'dayGridMonth,timeGridWeek,timeGridDay'
                  }}
                  events={calendarEvents}
                  eventClick={(info) => {
                    const courseId = info.event.extendedProps.courseId;
                    if (courseId) {
                      navigate(`/courses/${courseId}`);
                    }
                  }}
                  eventTimeFormat={{
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  }}
                  slotMinTime="09:00:00"
                  slotMaxTime="21:00:00"
                  height={450}
                  weekends={true}
                  editable={false}
                  selectable={false}
                  dayMaxEvents={2}
                  moreLinkClick="popover"
                  aspectRatio={1.8}
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Dashboard;
