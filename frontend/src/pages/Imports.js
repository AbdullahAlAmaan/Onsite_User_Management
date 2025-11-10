import React, { useState } from 'react';
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
} from '@mui/material';
import { UploadFile } from '@mui/icons-material';
import { importsAPI } from '../services/api';

function Imports() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [results, setResults] = useState(null);

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

    setLoading(true);
    setMessage(null);
    try {
      const response = await importsAPI.uploadExcel(file);
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

    setLoading(true);
    setMessage(null);
    try {
      const response = await importsAPI.uploadCSV(file);
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
            Upload Excel/CSV File
          </Typography>
          <Box display="flex" flexDirection="column" gap={2}>
            <Button variant="outlined" component="label" startIcon={<UploadFile />}>
              Select File
              <input type="file" hidden accept=".xlsx,.xls,.csv" onChange={handleFileChange} />
            </Button>
            {file && <Typography variant="body2">Selected: {file.name}</Typography>}
            <Box display="flex" gap={2}>
              <Button
                variant="contained"
                onClick={handleExcelUpload}
                disabled={!file || loading}
              >
                Upload Excel
              </Button>
              <Button
                variant="contained"
                onClick={handleCSVUpload}
                disabled={!file || loading}
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

