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
} from '@mui/icons-material';
import { mentorsAPI, studentsAPI } from '../services/api';
import MentorDetailsDialog from '../components/MentorDetailsDialog';

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
  
  // Add mentor dialogs
  const [addInternalMentorDialogOpen, setAddInternalMentorDialogOpen] = useState(false);
  const [addExternalMentorDialogOpen, setAddExternalMentorDialogOpen] = useState(false);
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [externalMentorData, setExternalMentorData] = useState({
    name: '',
    email: '',
    sbu: '',
    designation: '',
  });
  const [creatingMentor, setCreatingMentor] = useState(false);
  

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

  const handleOpenAddInternalMentor = async () => {
    setLoadingStudents(true);
    try {
      const response = await studentsAPI.getAll({ limit: 1000 });
      const existingMentorStudentIds = new Set(mentors.filter(m => m.is_internal && m.student_id).map(m => m.student_id));
      const availableStudents = response.data.filter(s => !existingMentorStudentIds.has(s.id));
      setStudents(availableStudents);
    } catch (error) {
      console.error('Error fetching students:', error);
      setMessage({ type: 'error', text: 'Error fetching students' });
    } finally {
      setLoadingStudents(false);
    }
    setSelectedStudentId('');
    setAddInternalMentorDialogOpen(true);
  };

  const handleCreateInternalMentor = async () => {
    if (!selectedStudentId) {
      setMessage({ type: 'error', text: 'Please select a student' });
      return;
    }
    setCreatingMentor(true);
    try {
      await mentorsAPI.createInternal(parseInt(selectedStudentId));
      setMessage({ type: 'success', text: 'Internal mentor created successfully' });
      setAddInternalMentorDialogOpen(false);
      setSelectedStudentId('');
      fetchMentors();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Error creating internal mentor' });
    } finally {
      setCreatingMentor(false);
    }
  };

  const handleCreateExternalMentor = async () => {
    if (!externalMentorData.name.trim()) {
      setMessage({ type: 'error', text: 'Name is required' });
      return;
    }
    setCreatingMentor(true);
    try {
      const payload = {
        is_internal: false,
        name: externalMentorData.name.trim(),
        student_id: null,
      };
      
      if (externalMentorData.email && externalMentorData.email.trim()) {
        payload.email = externalMentorData.email.trim();
      }
      
      if (externalMentorData.sbu) {
        payload.sbu = externalMentorData.sbu;
      }
      
      if (externalMentorData.designation && externalMentorData.designation.trim()) {
        payload.designation = externalMentorData.designation.trim();
      }
      
      await mentorsAPI.createExternal(payload);
      setMessage({ type: 'success', text: 'External mentor created successfully' });
      setAddExternalMentorDialogOpen(false);
      setExternalMentorData({ name: '', email: '', company: '', designation: '' });
      fetchMentors();
    } catch (error) {
      console.error('Error creating external mentor:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Error creating external mentor';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setCreatingMentor(false);
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
  }, [mentors, selectedType, selectedSBU, searchQuery, selectedSearchMentor]);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
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
            Mentors
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Manage internal and external mentors
          </Typography>
        </Box>
        <Box display="flex" gap={2}>
          <Button
            variant="outlined"
            startIcon={<Add />}
            onClick={handleOpenAddInternalMentor}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 500,
            }}
          >
            Add Internal Mentor
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setAddExternalMentorDialogOpen(true)}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 500,
            }}
          >
            Add External Mentor
          </Button>
        </Box>
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
            <Autocomplete
              options={mentors}
              getOptionLabel={(option) => option ? `${option.name}${option.email ? ` - ${option.email}` : ''}${option.student?.employee_id ? ` (${option.student.employee_id})` : ''}` : ''}
              value={selectedSearchMentor}
              onChange={(event, newValue) => {
                setSelectedSearchMentor(newValue);
                if (newValue) {
                  setSearchQuery(newValue.name || '');
                } else {
                  setSearchQuery('');
                }
              }}
              onInputChange={(event, newInputValue) => {
                setSearchQuery(newInputValue);
                if (!newInputValue) {
                  setSelectedSearchMentor(null);
                }
              }}
              inputValue={searchQuery}
              filterOptions={(options, { inputValue }) => {
                if (!inputValue) return [];
                const searchLower = inputValue.toLowerCase();
                return options.filter((mentor) =>
                  mentor.name?.toLowerCase().includes(searchLower) ||
                  mentor.email?.toLowerCase().includes(searchLower) ||
                  mentor.designation?.toLowerCase().includes(searchLower) ||
                  mentor.sbu?.toLowerCase().includes(searchLower) ||
                  mentor.student?.employee_id?.toLowerCase().includes(searchLower) ||
                  mentor.student?.name?.toLowerCase().includes(searchLower)
                );
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Search Mentors"
                  placeholder="Search by name, email, designation, SBU, or employee ID..."
                  size="small"
                  sx={{ minWidth: 300, flexGrow: 1 }}
                  InputProps={{
                    ...params.InputProps,
                    startAdornment: (
                      <>
                        <InputAdornment position="start">
                          <Search sx={{ color: 'text.secondary' }} />
                        </InputAdornment>
                        {params.InputProps.startAdornment}
                      </>
                    ),
                  }}
                />
              )}
              renderOption={(props, mentor) => (
                <Box component="li" {...props} key={mentor.id}>
                  <Box>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {mentor.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {mentor.is_internal ? 'Internal' : 'External'}
                      {mentor.email ? ` • ${mentor.email}` : ''}
                      {mentor.student?.employee_id ? ` • ${mentor.student.employee_id}` : ''}
                    </Typography>
                  </Box>
                </Box>
              )}
              noOptionsText="No mentors found"
              clearOnEscape
              clearOnBlur={false}
            />
            <TextField
              select
              label="Type"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              sx={{ minWidth: 200 }}
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
              sx={{ minWidth: 200 }}
              size="small"
            >
              <MenuItem value="">All SBUs</MenuItem>
              <MenuItem value="IT">IT</MenuItem>
              <MenuItem value="HR">HR</MenuItem>
              <MenuItem value="Finance">Finance</MenuItem>
              <MenuItem value="Operations">Operations</MenuItem>
              <MenuItem value="Sales">Sales</MenuItem>
              <MenuItem value="Marketing">Marketing</MenuItem>
              <MenuItem value="Other">Other</MenuItem>
            </TextField>
            {(selectedType || selectedSBU || searchQuery) && (
              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  setSelectedType('');
                  setSelectedSBU('');
                  setSearchQuery('');
                  setSelectedSearchMentor(null);
                }}
                sx={{ alignSelf: 'flex-start', mt: 0.5 }}
              >
                Clear Filters
              </Button>
            )}
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
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: alpha(theme.palette.primary.main, 0.05) }}>
                  <TableCell sx={{ fontWeight: 600 }}>Employee ID</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>SBU</TableCell>
                  <TableCell sx={{ fontWeight: 600 }}>Designation</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredMentors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        No mentors found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMentors.map((mentor) => (
                    <React.Fragment key={mentor.id}>
                      <TableRow
                        sx={{
                          '&:hover': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.03),
                          },
                        }}
                      >
                        <TableCell>
                          {mentor.student?.employee_id ? (
                            <Typography
                              sx={{
                                cursor: 'pointer',
                                color: 'primary.main',
                                textDecoration: 'underline',
                                '&:hover': {
                                  color: 'primary.dark',
                                },
                              }}
                              onClick={() => handleViewDetails(mentor)}
                            >
                              {mentor.student.employee_id}
                            </Typography>
                          ) : (
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => handleViewStats(mentor.id)}
                              title="View Stats"
                            >
                              <Visibility />
                            </IconButton>
                          )}
                        </TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography
                              sx={{
                                cursor: mentor.is_internal ? 'pointer' : 'default',
                                color: mentor.is_internal ? 'primary.main' : 'inherit',
                                textDecoration: mentor.is_internal ? 'underline' : 'none',
                                '&:hover': mentor.is_internal ? {
                                  color: 'primary.dark',
                                } : {},
                              }}
                              onClick={() => mentor.is_internal && handleViewDetails(mentor)}
                            >
                              {mentor.name}
                            </Typography>
                            {mentor.is_internal && (
                              <Chip 
                                label="Internal" 
                                color="primary" 
                                size="small"
                                variant="outlined"
                                sx={{ 
                                  fontSize: '0.65rem',
                                  height: 18,
                                }}
                              />
                            )}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={mentor.is_internal ? 'Internal' : 'External'}
                            size="small"
                            color={mentor.is_internal ? 'primary' : 'secondary'}
                          />
                        </TableCell>
                        <TableCell>{mentor.email || '-'}</TableCell>
                        <TableCell>
                          {mentor.sbu ? <Chip label={mentor.sbu} size="small" /> : '-'}
                        </TableCell>
                        <TableCell>{mentor.designation || '-'}</TableCell>
                      </TableRow>
                    </React.Fragment>
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
                          <TableCell>{course.start_date || '-'}</TableCell>
                          <TableCell>{course.end_date || '-'}</TableCell>
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

      {/* Add Internal Mentor Dialog */}
      <Dialog 
        open={addInternalMentorDialogOpen} 
        onClose={() => setAddInternalMentorDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>Add Internal Mentor</DialogTitle>
        <DialogContent>
          {loadingStudents ? (
            <Box display="flex" justifyContent="center" p={3}>
              <CircularProgress />
            </Box>
          ) : (
            <Autocomplete
              options={students}
              getOptionLabel={(option) => `${option.name} (${option.employee_id})`}
              value={students.find(s => s.id.toString() === selectedStudentId) || null}
              onChange={(event, newValue) => setSelectedStudentId(newValue?.id.toString() || '')}
              renderInput={(params) => (
                <TextField 
                  {...params} 
                  label="Select Employee" 
                  placeholder="Search by name or employee ID"
                  sx={{ mt: 2 }}
                />
              )}
              noOptionsText="No available employees (all are already mentors)"
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddInternalMentorDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateInternalMentor} 
            variant="contained" 
            disabled={!selectedStudentId || creatingMentor}
          >
            {creatingMentor ? <CircularProgress size={24} /> : 'Create Mentor'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add External Mentor Dialog */}
      <Dialog 
        open={addExternalMentorDialogOpen} 
        onClose={() => setAddExternalMentorDialogOpen(false)} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>Add External Mentor</DialogTitle>
        <DialogContent>
          <TextField
            label="Name"
            fullWidth
            required
            value={externalMentorData.name}
            onChange={(e) => setExternalMentorData({ ...externalMentorData, name: e.target.value })}
            sx={{ mt: 2 }}
          />
          <TextField
            label="Email"
            type="email"
            fullWidth
            value={externalMentorData.email}
            onChange={(e) => setExternalMentorData({ ...externalMentorData, email: e.target.value })}
            sx={{ mt: 2 }}
          />
          <TextField
            label="SBU"
            select
            fullWidth
            value={externalMentorData.sbu}
            onChange={(e) => setExternalMentorData({ ...externalMentorData, sbu: e.target.value })}
            sx={{ mt: 2 }}
          >
            <MenuItem value="">None</MenuItem>
            <MenuItem value="IT">IT</MenuItem>
            <MenuItem value="HR">HR</MenuItem>
            <MenuItem value="Finance">Finance</MenuItem>
            <MenuItem value="Operations">Operations</MenuItem>
            <MenuItem value="Sales">Sales</MenuItem>
            <MenuItem value="Marketing">Marketing</MenuItem>
            <MenuItem value="Other">Other</MenuItem>
          </TextField>
          <TextField
            label="Designation"
            fullWidth
            value={externalMentorData.designation}
            onChange={(e) => setExternalMentorData({ ...externalMentorData, designation: e.target.value })}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddExternalMentorDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateExternalMentor} 
            variant="contained" 
            disabled={!externalMentorData.name.trim() || creatingMentor}
          >
            {creatingMentor ? <CircularProgress size={24} /> : 'Create Mentor'}
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}

export default Mentors;
