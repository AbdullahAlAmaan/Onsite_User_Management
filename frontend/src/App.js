import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Enrollments from './pages/Enrollments';
import Courses from './pages/Courses';
import InstructorDashboard from './pages/InstructorDashboard';
import Imports from './pages/Imports';
import PrivateRoute from './components/PrivateRoute';

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
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<PrivateRoute><Layout><Navigate to="/dashboard" replace /></Layout></PrivateRoute>} />
          <Route path="/dashboard" element={<PrivateRoute><Layout><Dashboard /></Layout></PrivateRoute>} />
          <Route path="/enrollments" element={<PrivateRoute><Layout><Enrollments /></Layout></PrivateRoute>} />
          <Route path="/courses" element={<PrivateRoute><Layout><Courses /></Layout></PrivateRoute>} />
          <Route path="/instructor" element={<PrivateRoute><Layout><InstructorDashboard /></Layout></PrivateRoute>} />
          <Route path="/imports" element={<PrivateRoute><Layout><Imports /></Layout></PrivateRoute>} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;

