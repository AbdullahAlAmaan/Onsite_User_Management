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
} from '@mui/material';
import { UploadFile } from '@mui/icons-material';
import { importsAPI, coursesAPI } from '../services/api';

function Imports() {
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
      const response = await importsAPI.uploadExcel(file, selectedCourse);
      setResults(response.data.results);
      setMessage({ type: 'success', text: response.data.message });
      setFile(null);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Error uploading file' });
    } finally {
      setLoading(false);
    }
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
      const response = await importsAPI.uploadCSV(file, selectedCourse);
      setResults(response.data.results);
      setMessage({ type: 'success', text: response.data.message });
      setFile(null);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Error uploading file' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Data Import
      </Typography>

      {message && (
        <Alert severity={message.type} sx={{ mb: 2 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Upload File
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          </Typography>
          <Box display="flex" flexDirection="column" gap={2}>
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
            <Button variant="outlined" component="label" startIcon={<UploadFile />}>
              Select File
              <input type="file" hidden accept=".xlsx,.xls,.csv" onChange={handleFileChange} />
            </Button>
            {file && <Typography variant="body2">Selected: {file.name}</Typography>}
            <Box display="flex" gap={2}>
              <Button
                variant="contained"
                onClick={handleExcelUpload}
                disabled={!file || !selectedCourse || loading}
              >
                Upload Excel
              </Button>
              <Button
                variant="contained"
                onClick={handleCSVUpload}
                disabled={!file || !selectedCourse || loading}
              >
                Upload CSV
              </Button>
            </Box>
            {loading && <CircularProgress size={24} />}
          </Box>
        </CardContent>
      </Card>

      {results && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Import Results
            </Typography>
            <List>
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

