import React, { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Paper,
  List,
  ListItem,
  ListItemText,
  Grid,
} from '@mui/material';
import { UploadFile } from '@mui/icons-material';
import { importsAPI } from '../services/api';

function Imports() {
  const [file, setFile] = useState(null);
  const [formId, setFormId] = useState('');
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

  const handleFormsImport = async () => {
    if (!formId) {
      setMessage({ type: 'error', text: 'Please enter a form ID' });
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const response = await importsAPI.importFromForms(formId);
      setResults(response.data.results);
      setMessage({ type: 'success', text: response.data.message });
      setFormId('');
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.detail || 'Error importing from Forms' });
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

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
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
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Import from Microsoft Forms
              </Typography>
              <Box display="flex" flexDirection="column" gap={2}>
                <TextField
                  label="Form ID"
                  value={formId}
                  onChange={(e) => setFormId(e.target.value)}
                  placeholder="Enter Microsoft Forms ID"
                />
                <Button
                  variant="contained"
                  onClick={handleFormsImport}
                  disabled={!formId || loading}
                >
                  Import from Forms
                </Button>
                {loading && <CircularProgress size={24} />}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

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

