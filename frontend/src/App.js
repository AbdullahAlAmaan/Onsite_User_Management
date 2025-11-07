import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Enrollments from './pages/Enrollments';
import Courses from './pages/Courses';
import InstructorDashboard from './pages/InstructorDashboard';
import Reports from './pages/Reports';
import Imports from './pages/Imports';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1a237e',
    },
    secondary: {
      main: '#3949ab',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/enrollments" element={<Enrollments />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/instructor" element={<InstructorDashboard />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/imports" element={<Imports />} />
          </Routes>
        </Layout>
      </Router>
    </ThemeProvider>
  );
}

export default App;

