import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  TextField,
  MenuItem,
  Tabs,
  Tab,
  useTheme,
  alpha,
} from '@mui/material';
import { UploadFile, People, Assessment } from '@mui/icons-material';
import { importsAPI, coursesAPI, completionsAPI } from '../services/api';

function Imports() {
  const theme = useTheme();
  const [tabValue, setTabValue] = useState(0);
  const [file, setFile] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [message, setMessage] = useState(null);
  const [results, setResults] = useState(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await coursesAPI.getAll({ archived: false });
      setCourses(response.data);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoadingCourses(false);
    }
  };

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
    setMessage(null);
    setResults(null);
  };


  const handleCSVUpload = async () => {
    if (!file) {
      setMessage({ type: 'error', text: 'Please select a file' });
      return;
    }
    if (!selectedCourse) {
      setMessage({ type: 'error', text: 'Please select a course' });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      if (tabValue === 0) {
        // Enrollment registration
        const response = await importsAPI.uploadCSV(file, selectedCourse);
        setResults(response.data.results);
        setMessage({ type: 'success', text: response.data.message });
      } else {
        // Scores/Assessment
        const response = await completionsAPI.upload(file, selectedCourse);
        setResults(response.data.results);
        setMessage({ type: 'success', text: response.data.message });
      }
      setFile(null);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Error uploading file' });
    } finally {
      setLoading(false);
    }
  };

  const handleExcelUpload = async () => {
    if (!file) {
      setMessage({ type: 'error', text: 'Please select a file' });
      return;
    }
    if (!selectedCourse) {
      setMessage({ type: 'error', text: 'Please select a course' });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      if (tabValue === 0) {
        // Enrollment registration
        const response = await importsAPI.uploadExcel(file, selectedCourse);
        setResults(response.data.results);
        setMessage({ type: 'success', text: response.data.message });
      } else {
        // Scores/Assessment
        const response = await completionsAPI.upload(file, selectedCourse);
        setResults(response.data.results);
        setMessage({ type: 'success', text: response.data.message });
      }
      setFile(null);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Error uploading file' });
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setFile(null);
    setResults(null);
    setMessage(null);
    setSelectedCourse('');
  };

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
          Data Import
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Upload enrollment registrations or assessment scores
        </Typography>
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
          borderRadius: 3,
          boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.1)}`,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
        }}
      >
        <CardContent>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange} 
            sx={{ 
              mb: 3,
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 500,
                borderRadius: 2,
                minHeight: 48,
              },
              '& .Mui-selected': {
                color: theme.palette.primary.main,
              },
            }}
          >
            <Tab icon={<People />} iconPosition="start" label="Enrollment Registrations" />
            <Tab icon={<Assessment />} iconPosition="start" label="Scores & Assessment" />
          </Tabs>

          <Typography variant="h6" gutterBottom>
            {tabValue === 0 ? 'Upload Enrollment Registration File' : 'Upload Scores & Assessment File'}
          </Typography>
          <Box display="flex" flexDirection="column" gap={2} sx={{ mt: 2 }}>
            {loadingCourses ? (
              <CircularProgress size={24} />
            ) : (
              <TextField
                select
                label="Select Course"
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                fullWidth
                required
              >
                <MenuItem value="">Select a course...</MenuItem>
                {courses.map((course) => (
                  <MenuItem key={course.id} value={course.id}>
                    {course.name} - {course.batch_code}
                  </MenuItem>
                ))}
              </TextField>
            )}
            <Button 
              variant="outlined" 
              component="label" 
              startIcon={<UploadFile />}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 500,
                borderStyle: 'dashed',
                borderWidth: 2,
                '&:hover': {
                  borderStyle: 'dashed',
                  borderWidth: 2,
                },
              }}
            >
              Select File
              <input type="file" hidden accept=".xlsx,.xls,.csv" onChange={handleFileChange} />
            </Button>
            {file && (
              <Typography 
                variant="body2" 
                sx={{ 
                  p: 1.5, 
                  borderRadius: 2,
                  backgroundColor: alpha(theme.palette.primary.main, 0.05),
                  color: theme.palette.primary.main,
                  fontWeight: 500,
                }}
              >
                Selected: {file.name}
              </Typography>
            )}
            <Box display="flex" gap={2}>
              <Button
                variant="contained"
                onClick={handleExcelUpload}
                disabled={!file || !selectedCourse || loading}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 500,
                  boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                  '&:hover': {
                    boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.4)}`,
                  },
                  '&:disabled': {
                    boxShadow: 'none',
                  },
                }}
              >
                Upload Excel
              </Button>
              <Button
                variant="contained"
                onClick={handleCSVUpload}
                disabled={!file || !selectedCourse || loading}
                sx={{
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 500,
                  boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`,
                  '&:hover': {
                    boxShadow: `0 6px 16px ${alpha(theme.palette.primary.main, 0.4)}`,
                  },
                  '&:disabled': {
                    boxShadow: 'none',
                  },
                }}
              >
                Upload CSV
              </Button>
            </Box>
            {loading && <CircularProgress size={24} />}
          </Box>
        </CardContent>
      </Card>

      {results && (
        <Card 
          sx={{ 
            mt: 3,
            borderRadius: 3,
            boxShadow: `0 4px 20px ${alpha(theme.palette.primary.main, 0.1)}`,
            border: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
          }}
        >
          <CardContent>
            <Typography 
              variant="h6" 
              gutterBottom
              sx={{ 
                fontWeight: 600,
                mb: 2,
              }}
            >
              Import Results
            </Typography>
            <List>
              {tabValue === 0 ? (
                <>
                  <ListItem>
                    <ListItemText primary="Total Records" secondary={results.total} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Processed" secondary={results.processed} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Eligible" secondary={results.eligible} />
                  </ListItem>
                  <ListItem>
                    <ListItemText primary="Ineligible" secondary={results.ineligible} />
                  </ListItem>
                  {results.not_found !== undefined && results.not_found > 0 && (
                    <ListItem>
                      <ListItemText
                        primary="Not Found in Database"
                        secondary={`${results.not_found} employees not found in database`}
                      />
                    </ListItem>
                  )}
                </>
              ) : (
                <>
                  <ListItem>
                    <ListItemText primary="Processed" secondary={results.processed} />
                  </ListItem>
                  {results.not_found !== undefined && results.not_found > 0 && (
                    <ListItem>
                      <ListItemText
                        primary="Not Found"
                        secondary={`${results.not_found} students not found or not enrolled`}
                      />
                    </ListItem>
                  )}
                </>
              )}
              {results.errors && results.errors.length > 0 && (
                <ListItem>
                  <ListItemText
                    primary="Errors"
                    secondary={`${results.errors.length} errors occurred`}
                  />
                </ListItem>
              )}
            </List>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

export default Imports;

