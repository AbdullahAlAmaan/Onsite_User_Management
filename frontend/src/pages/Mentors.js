import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  CircularProgress,
  useTheme,
  alpha,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Grid,
  Divider,
  Alert,
  Autocomplete,
  MenuItem,
  InputAdornment,
  IconButton,
} from '@mui/material';
import { 
  Visibility, 
  Person, 
  Add, 
  School, 
  Search,
  PersonRemove,
  Delete,
} from '@mui/icons-material';
import { mentorsAPI } from '../services/api';
import MentorDetailsDialog from '../components/MentorDetailsDialog';
import AssignInternalMentorDialog from '../components/AssignInternalMentorDialog';
import AddExternalMentorDialog from '../components/AddExternalMentorDialog';
import { formatDateForDisplay } from '../utils/dateUtils';

function Mentors() {
  const theme = useTheme();
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('');
  const [selectedSBU, setSelectedSBU] = useState('');
  const [selectedMentor, setSelectedMentor] = useState(null);
  const [mentorStats, setMentorStats] = useState(null);
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);
  const [message, setMessage] = useState(null);
  const [mentorDetailsOpen, setMentorDetailsOpen] = useState(false);
  const [selectedMentorForDetails, setSelectedMentorForDetails] = useState(null);
  
  // Search functionality
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSearchMentor, setSelectedSearchMentor] = useState(null);
  const [filterNoCourseHistory, setFilterNoCourseHistory] = useState(false);
  
  // Add mentor dialogs
  const [addInternalMentorDialogOpen, setAddInternalMentorDialogOpen] = useState(false);
  const [addExternalMentorDialogOpen, setAddExternalMentorDialogOpen] = useState(false);
  

  useEffect(() => {
    fetchMentors();
  }, []);

  const fetchMentors = async () => {
    setLoading(true);
    try {
      const response = await mentorsAPI.getAll('all');
      setMentors(response.data);
    } catch (error) {
      console.error('Error fetching mentors:', error);
      setMessage({ type: 'error', text: 'Error fetching mentors' });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (mentor) => {
    setSelectedMentorForDetails(mentor);
    setMentorDetailsOpen(true);
  };

  const handleViewStats = async (mentorId) => {
    setLoadingStats(true);
    setStatsDialogOpen(true);
    try {
      const response = await mentorsAPI.getStats(mentorId);
      setMentorStats(response.data);
      setSelectedMentor(mentors.find(m => m.id === mentorId));
    } catch (error) {
      console.error('Error fetching mentor stats:', error);
      setMessage({ type: 'error', text: 'Error fetching mentor statistics' });
    } finally {
      setLoadingStats(false);
    }
  };

  const handleAssignInternalMentor = async (assignment) => {
    try {
      // In the Mentors tab, we just create the mentor (the dialog already handles creation)
      // The assignment object contains mentor_id, hours_taught, and amount_paid
      // But since we're not assigning to a course here, we just need to refresh the list
      setMessage({ type: 'success', text: 'Internal mentor created successfully' });
      setAddInternalMentorDialogOpen(false);
      fetchMentors();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Error creating internal mentor' });
      throw error; // Re-throw so dialog can handle it
    }
  };

  const handleAddExternalMentor = async (assignment) => {
    try {
      // In the Mentors tab, we just create the mentor (the dialog already handles creation)
      // The assignment object contains mentor_id, hours_taught, and amount_paid
      // But since we're not assigning to a course here, we just need to refresh the list
      setMessage({ type: 'success', text: 'External mentor created successfully' });
      setAddExternalMentorDialogOpen(false);
      fetchMentors();
    } catch (error) {
      console.error('Error creating external mentor:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Error creating external mentor';
      setMessage({ type: 'error', text: errorMessage });
      throw error; // Re-throw so dialog can handle it
    }
  };



  // Filter mentors based on search query and filters
  const filteredMentors = useMemo(() => {
    let filtered = [...mentors];
    
    // Filter by type
    if (selectedType === 'internal') {
      filtered = filtered.filter(m => m.is_internal === true);
    } else if (selectedType === 'external') {
      filtered = filtered.filter(m => m.is_internal === false);
    }
    
    // Filter by SBU
    if (selectedSBU) {
      filtered = filtered.filter(m => m.sbu === selectedSBU);
    }
    
    // Filter by course history
    if (filterNoCourseHistory) {
      filtered = filtered.filter(m => !m.course_count || m.course_count === 0);
    }
    
    // Filter by search query
    if (searchQuery.trim() && !selectedSearchMentor) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(mentor => 
        mentor.name?.toLowerCase().includes(query) ||
        mentor.email?.toLowerCase().includes(query) ||
        mentor.designation?.toLowerCase().includes(query) ||
        mentor.sbu?.toLowerCase().includes(query) ||
        mentor.student?.employee_id?.toLowerCase().includes(query) ||
        mentor.student?.name?.toLowerCase().includes(query)
      );
    } else if (selectedSearchMentor) {
      filtered = filtered.filter(m => m.id === selectedSearchMentor.id);
    }
    
    return filtered;
  }, [mentors, selectedType, selectedSBU, searchQuery, selectedSearchMentor, filterNoCourseHistory]);

  return (
    <Box sx={{ minHeight: '100vh', background: `linear-gradient(135deg, ${alpha('#1e40af', 0.03)} 0%, ${alpha('#059669', 0.03)} 100%)` }}>
      {/* Modern header with gradient */}
      <Box sx={{ mb: 4, pt: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography 
              variant="h3" 
              sx={{ 
                fontWeight: 700,
                color: '#1e40af',
                mb: 1,
                letterSpacing: '-0.02em',
              }}
            >
               Mentors
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', fontSize: '0.95rem' }}>
              Manage internal and external mentors
            </Typography>
          </Box>
          <Box display="flex" gap={2}>
            <Button
              variant="outlined"
              startIcon={<Add />}
              onClick={() => setAddInternalMentorDialogOpen(true)}
              sx={{
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 600,
                color: '#1e40af',
                borderColor: '#1e40af',
                '&:hover': { background: alpha('#1e40af', 0.05) },
              }}
            >
              Add Internal
            </Button>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setAddExternalMentorDialogOpen(true)}
              sx={{
                background: 'linear-gradient(135deg, #1e40af 0%, #1e3a8a 100%)',
                borderRadius: '8px',
                textTransform: 'none',
                fontWeight: 600,
                px: 3,
                boxShadow: '0 4px 12px rgba(30, 64, 175, 0.25)',
              }}
            >
              Add External
            </Button>
          </Box>
        </Box>
      </Box>

      {message && (
        <Alert 
          severity={message.type}
          onClose={() => setMessage(null)}
          sx={{ 
            mb: 3,
            borderRadius: '8px',
            border: 'none',
          }} 
        >
          {message.text}
        </Alert>
      )}

      {/* Filter section with modern design */}
      <Card
        sx={{
          borderRadius: '12px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
          border: '1px solid rgba(30, 64, 175, 0.1)',
          mb: 3,
          background: '#ffffff',
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box display="flex" gap={2} flexWrap="wrap" alignItems="flex-end">
            <Autocomplete
              options={mentors}
              getOptionLabel={(option) => option ? `${option.name}${option.email ? ` - ${option.email}` : ''}` : ''}
              value={selectedSearchMentor}
              onChange={(event, newValue) => {
                setSelectedSearchMentor(newValue);
                if (newValue) setSearchQuery(newValue.name || '');
                else setSearchQuery('');
              }}
              onInputChange={(event, newInputValue) => {
                setSearchQuery(newInputValue);
                if (!newInputValue) setSelectedSearchMentor(null);
              }}
              inputValue={searchQuery}
              filterOptions={(options, { inputValue }) => {
                if (!inputValue) return [];
                const searchLower = inputValue.toLowerCase();
                return options.filter((mentor) =>
                  mentor.name?.toLowerCase().includes(searchLower) ||
                  mentor.email?.toLowerCase().includes(searchLower)
                );
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search"
                  placeholder="Name or email..."
                  size="small"
                  sx={{ minWidth: 280, flex: 1 }}
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <InputAdornment position="start">
                          <Search sx={{ color: '#94a3b8' }} />
                        </InputAdornment>
                        {params.InputProps.startAdornment}
                      </>
                    ),
                  }}
                />
              )}
              noOptionsText="No mentors found"
            />
            <TextField
              select
              label="Type"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              sx={{ minWidth: 140 }}
              size="small"
            >
              <MenuItem value="">All Mentors</MenuItem>
              <MenuItem value="internal">Internal</MenuItem>
              <MenuItem value="external">External</MenuItem>
            </TextField>
            <TextField
              select
              label="SBU"
              value={selectedSBU}
              onChange={(e) => setSelectedSBU(e.target.value)}
              sx={{ minWidth: 140 }}
              size="small"
            >
              <MenuItem value="">All SBUs</MenuItem>
              <MenuItem value="IT">IT</MenuItem>
              <MenuItem value="HR">HR</MenuItem>
              <MenuItem value="Finance">Finance</MenuItem>
              <MenuItem value="Operations">Operations</MenuItem>
              <MenuItem value="Sales">Sales</MenuItem>
              <MenuItem value="Marketing">Marketing</MenuItem>
            </TextField>
            <TextField
              select
              label="Course History"
              value={filterNoCourseHistory ? 'no_history' : ''}
              onChange={(e) => setFilterNoCourseHistory(e.target.value === 'no_history')}
              sx={{ minWidth: 160 }}
              size="small"
            >
              <MenuItem value="">All Mentors</MenuItem>
              <MenuItem value="no_history">No Course History</MenuItem>
            </TextField>
            {(selectedType || selectedSBU || searchQuery || filterNoCourseHistory) && (
              <Button
                variant="text"
                size="small"
                onClick={() => {
                  setSelectedType('');
                  setSelectedSBU('');
                  setSearchQuery('');
                  setSelectedSearchMentor(null);
                  setFilterNoCourseHistory(false);
                }}
                sx={{ color: '#64748b', fontWeight: 500 }}
              >
                Clear
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress sx={{ color: '#1e40af' }} />
        </Box>
      ) : (
        <Card
          sx={{
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
            border: '1px solid rgba(30, 64, 175, 0.1)',
            overflow: 'hidden',
            background: '#ffffff',
          }}
        >
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ background: 'linear-gradient(135deg, rgba(30, 64, 175, 0.05) 0%, rgba(5, 150, 105, 0.05) 100%)' }}>
                  <TableCell sx={{ fontWeight: 700, color: '#1e40af', fontSize: '0.9rem' }}>ID</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#1e40af', fontSize: '0.9rem' }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#1e40af', fontSize: '0.9rem' }}>Mentor</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#1e40af', fontSize: '0.9rem' }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#1e40af', fontSize: '0.9rem' }}>SBU</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#1e40af', fontSize: '0.9rem' }}>Course History</TableCell>
                  <TableCell sx={{ fontWeight: 700, color: '#1e40af', fontSize: '0.9rem' }}>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredMentors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      <Typography color="text.secondary">
                        No mentors found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMentors.map((mentor) => (
                    <TableRow
                      key={mentor.id}
                      sx={{
                        borderBottom: '1px solid rgba(30, 64, 175, 0.08)',
                        '&:hover': {
                          background: 'linear-gradient(90deg, rgba(30, 64, 175, 0.03) 0%, rgba(5, 150, 105, 0.03) 100%)',
                        },
                      }}
                    >
                      <TableCell>
                        {mentor.student?.employee_id ? (
                          <Typography
                            sx={{
                              cursor: 'pointer',
                              color: '#1e40af',
                              fontWeight: 600,
                              textDecoration: 'underline',
                              '&:hover': {
                                color: '#1e3a8a',
                              },
                            }}
                            onClick={() => handleViewDetails(mentor)}
                          >
                            {mentor.student.employee_id}
                          </Typography>
                        ) : (
                          <Typography sx={{ color: '#64748b' }}>
                            {mentor.id}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography
                          sx={{
                            cursor: mentor.is_internal ? 'pointer' : 'default',
                            fontWeight: 500,
                            color: '#1e3a8a',
                            textDecoration: mentor.is_internal ? 'underline' : 'none',
                            '&:hover': mentor.is_internal ? {
                              color: '#1e40af',
                            } : {},
                          }}
                          onClick={() => mentor.is_internal && handleViewDetails(mentor)}
                        >
                          {mentor.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={mentor.is_internal ? 'Yes' : 'No'}
                          size="small"
                          sx={{
                            background: mentor.is_internal 
                              ? 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)'
                              : 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)',
                            color: mentor.is_internal ? '#1e40af' : '#be185d',
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: '#64748b' }}>{mentor.email || '-'}</TableCell>
                      <TableCell>
                        {mentor.sbu ? (
                          <Chip 
                            label={mentor.sbu} 
                            size="small"
                            sx={{
                              background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
                              color: '#047857',
                              fontWeight: 600,
                            }}
                          />
                        ) : '-'}
                      </TableCell>
                      <TableCell>
                        {mentor.course_count > 0 ? (
                          <IconButton
                            size="small"
                            onClick={() => handleViewStats(mentor.id)}
                            title="View Course History"
                            sx={{ color: '#1e40af' }}
                          >
                            <Visibility fontSize="small" />
                          </IconButton>
                        ) : (
                          <Chip
                            label="No Course History"
                            size="small"
                            sx={{
                              background: alpha('#fbbf24', 0.1),
                              color: '#92400e',
                              fontWeight: 500,
                              border: `1px solid ${alpha('#fbbf24', 0.3)}`,
                            }}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={0.5} justifyContent="center">
                          {mentor.course_count > 0 && (
                            <IconButton
                              size="small"
                              onClick={() => {
                                // TODO: Handle remove from course
                                console.log('Remove from course:', mentor.id);
                              }}
                              title="Remove from Course"
                              sx={{ color: '#dc2626' }}
                            >
                              <PersonRemove fontSize="small" />
                            </IconButton>
                          )}
                          {!mentor.is_internal && (
                            <IconButton
                              size="small"
                              onClick={async () => {
                                if (window.confirm(`Are you sure you want to delete ${mentor.name}?`)) {
                                  try {
                                    await mentorsAPI.delete(mentor.id);
                                    setMessage({ type: 'success', text: 'Mentor deleted successfully' });
                                    fetchMentors();
                                  } catch (error) {
                                    setMessage({ type: 'error', text: error.response?.data?.detail || 'Error deleting mentor' });
                                  }
                                }
                              }}
                              title="Delete Mentor"
                              sx={{ color: '#dc2626' }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}

      {/* Mentor Details Dialog */}
      <MentorDetailsDialog
        open={mentorDetailsOpen}
        onClose={() => {
          setMentorDetailsOpen(false);
          setSelectedMentorForDetails(null);
        }}
        mentor={selectedMentorForDetails}
      />

      {/* Mentor Stats Dialog */}
      <Dialog 
        open={statsDialogOpen} 
        onClose={() => setStatsDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          Mentor Statistics: {selectedMentor?.name}
        </DialogTitle>
        <DialogContent>
          {loadingStats ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : mentorStats ? (
            <Box>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        Total Courses Mentored
                      </Typography>
                      <Typography variant="h4">
                        {mentorStats.total_courses_mentored || 0}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        Total Hours
                      </Typography>
                      <Typography variant="h4">
                        {mentorStats.total_hours_overall || 0}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        Total Amount Paid
                      </Typography>
                      <Typography variant="h4" sx={{ color: 'success.main' }}>
                        tk {(mentorStats.total_amount_overall || 0).toFixed(2)}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Course Details
              </Typography>

              {mentorStats.per_course_stats && mentorStats.per_course_stats.length > 0 ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Course Name</TableCell>
                        <TableCell>Batch Code</TableCell>
                        <TableCell>Start Date</TableCell>
                        <TableCell>End Date</TableCell>
                        <TableCell>Hours</TableCell>
                        <TableCell>Amount Paid</TableCell>
                        <TableCell>Participants</TableCell>
                        <TableCell>Completion Ratio</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {mentorStats.per_course_stats.map((course, index) => (
                        <TableRow key={index}>
                          <TableCell>{course.course_name}</TableCell>
                          <TableCell>{course.batch_code}</TableCell>
                          <TableCell>{course.start_date ? formatDateForDisplay(course.start_date) : '-'}</TableCell>
                          <TableCell>{course.end_date ? formatDateForDisplay(course.end_date) : '-'}</TableCell>
                          <TableCell>{course.hours_taught}</TableCell>
                          <TableCell>tk {parseFloat(course.amount_paid).toFixed(2)}</TableCell>
                          <TableCell>{course.participants_count}</TableCell>
                          <TableCell>
                            <Chip
                              label={`${(course.completion_ratio * 100).toFixed(0)}%`}
                              size="small"
                              color={course.completion_ratio >= 0.8 ? 'success' : course.completion_ratio >= 0.6 ? 'warning' : 'error'}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body2" color="text.secondary" align="center" py={2}>
                  No course assignments yet
                </Typography>
              )}
            </Box>
          ) : (
            <Typography variant="body2" color="text.secondary">
              No statistics available
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Add Internal Mentor Dialog - Reusable Component */}
      <AssignInternalMentorDialog
        open={addInternalMentorDialogOpen}
        onClose={() => setAddInternalMentorDialogOpen(false)}
        onAssign={handleAssignInternalMentor}
        isDraft={false}
      />

      {/* Add External Mentor Dialog - Reusable Component */}
      <AddExternalMentorDialog
        open={addExternalMentorDialogOpen}
        onClose={() => setAddExternalMentorDialogOpen(false)}
        onAdd={handleAddExternalMentor}
        isDraft={false}
      />

    </Box>
  );
}

export default Mentors;
