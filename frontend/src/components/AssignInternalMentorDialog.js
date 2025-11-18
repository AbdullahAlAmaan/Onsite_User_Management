import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import { studentsAPI, mentorsAPI } from '../services/api';

/**
 * Reusable dialog component for assigning internal mentors (employees) to a course.
 * 
 * @param {boolean} open - Whether the dialog is open
 * @param {function} onClose - Callback when dialog is closed
 * @param {function} onAssign - Callback when mentor is assigned. Receives { mentor_id, hours_taught, amount_paid }
 * @param {boolean} isDraft - Whether the course is in draft status (for display purposes)
 */
function AssignInternalMentorDialog({ open, onClose, onAssign, isDraft = false }) {
  const [employees, setEmployees] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(false);
  const [existingMentors, setExistingMentors] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [mentorHours, setMentorHours] = useState('');
  const [mentorAmount, setMentorAmount] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchEmployees();
      fetchExistingMentors();
      // Reset form
      setSelectedEmployeeId('');
      setMentorHours('');
      setMentorAmount('');
    }
  }, [open]);

  const fetchEmployees = async () => {
    setLoadingEmployees(true);
    try {
      const response = await studentsAPI.getAll();
      setEmployees(response.data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoadingEmployees(false);
    }
  };

  const fetchExistingMentors = async () => {
    try {
      const response = await mentorsAPI.getAll('internal');
      setExistingMentors(response.data || []);
    } catch (error) {
      console.error('Error fetching existing mentors:', error);
    }
  };

  const handleAssign = async () => {
    if (!selectedEmployeeId || !mentorHours || !mentorAmount) {
      return;
    }

    setLoading(true);
    try {
      const employeeId = parseInt(selectedEmployeeId);
      
      // Check if employee is already a mentor
      let mentorId;
      const existingMentor = existingMentors.find(m => m.student_id === employeeId);
      
      if (existingMentor) {
        // Employee is already a mentor, use existing mentor ID
        mentorId = existingMentor.id;
      } else {
        // Employee is not a mentor yet, create internal mentor (this also tags them)
        const mentorResponse = await mentorsAPI.createInternal(employeeId);
        mentorId = mentorResponse.data.id;
        // Update existing mentors list
        setExistingMentors([...existingMentors, mentorResponse.data]);
      }
      
      // Call the onAssign callback with the mentor assignment data
      await onAssign({
        mentor_id: mentorId,
        hours_taught: parseFloat(mentorHours),
        amount_paid: parseFloat(mentorAmount),
      });

      // Reset form and close
      setSelectedEmployeeId('');
      setMentorHours('');
      setMentorAmount('');
      onClose();
    } catch (error) {
      console.error('Error assigning mentor:', error);
      throw error; // Re-throw so parent can handle
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedEmployeeId('');
    setMentorHours('');
    setMentorAmount('');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Assign Internal Mentor</DialogTitle>
      <DialogContent>
        <Autocomplete
          options={employees}
          getOptionLabel={(option) => {
            const isAlreadyMentor = existingMentors.some(m => m.student_id === option.id);
            return `${option.name} (${option.employee_id})${isAlreadyMentor ? ' - Already a Mentor' : ''}`;
          }}
          value={employees.find(e => e.id.toString() === selectedEmployeeId) || null}
          onChange={(event, newValue) => setSelectedEmployeeId(newValue?.id.toString() || '')}
          loading={loadingEmployees}
          renderInput={(params) => (
            <TextField {...params} label="Select Employee" sx={{ mt: 2 }} />
          )}
        />
        <TextField
          label="Hours Taught"
          type="number"
          fullWidth
          value={mentorHours}
          onChange={(e) => setMentorHours(e.target.value)}
          sx={{ mt: 2 }}
          inputProps={{ min: 0, step: 0.1 }}
        />
        <TextField
          label="Amount Paid"
          type="number"
          fullWidth
          value={mentorAmount}
          onChange={(e) => setMentorAmount(e.target.value)}
          sx={{ mt: 2 }}
          InputProps={{
            startAdornment: <InputAdornment position="start">Tk</InputAdornment>,
          }}
          inputProps={{ min: 0, step: 0.01 }}
        />
        {isDraft && (
          <TextField
            fullWidth
            value="This assignment will be saved as a draft (temporary)"
            InputProps={{ readOnly: true }}
            sx={{ mt: 2 }}
            size="small"
            helperText="Draft assignments will become permanent when the course is approved"
          />
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button 
          onClick={handleAssign} 
          variant="contained" 
          disabled={loading || !selectedEmployeeId || !mentorHours || !mentorAmount}
        >
          {loading ? <CircularProgress size={20} /> : 'Assign'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AssignInternalMentorDialog;

