import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  InputAdornment,
  CircularProgress,
} from '@mui/material';
import { mentorsAPI } from '../services/api';

/**
 * Reusable dialog component for adding external mentors to a course.
 * 
 * @param {boolean} open - Whether the dialog is open
 * @param {function} onClose - Callback when dialog is closed
 * @param {function} onAdd - Callback when external mentor is created and assigned. Receives { mentor_id, hours_taught, amount_paid }
 * @param {boolean} isDraft - Whether the course is in draft status (for display purposes)
 */
function AddExternalMentorDialog({ open, onClose, onAdd, isDraft = false }) {
  const [externalMentorData, setExternalMentorData] = useState({
    name: '',
    email: '',
    company: '',
    designation: '',
    specialty: '',
    hours_taught: '',
    amount_paid: '',
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      // Reset form when dialog opens
      setExternalMentorData({
        name: '',
        email: '',
        company: '',
        designation: '',
        specialty: '',
        hours_taught: '',
        amount_paid: '',
      });
    }
  }, [open]);

  const handleAdd = async () => {
    if (!externalMentorData.name || !externalMentorData.name.trim()) {
      return;
    }
    if (!externalMentorData.hours_taught || parseFloat(externalMentorData.hours_taught) < 0) {
      return;
    }
    if (!externalMentorData.amount_paid || parseFloat(externalMentorData.amount_paid) < 0) {
      return;
    }

    setLoading(true);
    try {
      // Build payload - only include fields that have values
      const payload = {
        is_internal: false,
        name: externalMentorData.name.trim(),
        student_id: null, // Explicitly set to null for external mentors
      };
      
      // Only include email if it's not empty
      if (externalMentorData.email && externalMentorData.email.trim()) {
        payload.email = externalMentorData.email.trim();
      }
      
      // Only include company if it's not empty
      if (externalMentorData.company && externalMentorData.company.trim()) {
        payload.company = externalMentorData.company.trim();
      }
      
      // Only include designation if it's not empty
      if (externalMentorData.designation && externalMentorData.designation.trim()) {
        payload.designation = externalMentorData.designation.trim();
      }
      
      // Only include specialty if it's not empty
      if (externalMentorData.specialty && externalMentorData.specialty.trim()) {
        payload.specialty = externalMentorData.specialty.trim();
      }
      
      const response = await mentorsAPI.createExternal(payload);
      const mentorId = response.data.id;
      const hoursTaught = parseFloat(externalMentorData.hours_taught) || 0;
      const amountPaid = parseFloat(externalMentorData.amount_paid) || 0;
      
      // Call the onAdd callback with the mentor assignment data
      await onAdd({
        mentor_id: mentorId,
        hours_taught: hoursTaught,
        amount_paid: amountPaid,
      });

      // Reset form and close
      setExternalMentorData({
        name: '',
        email: '',
        company: '',
        designation: '',
        specialty: '',
        hours_taught: '',
        amount_paid: '',
      });
      onClose();
    } catch (error) {
      console.error('Error adding external mentor:', error);
      throw error; // Re-throw so parent can handle
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setExternalMentorData({
      name: '',
      email: '',
      company: '',
      designation: '',
      specialty: '',
      hours_taught: '',
      amount_paid: '',
    });
    onClose();
  };

  const isValid = 
    externalMentorData.name?.trim() &&
    externalMentorData.hours_taught &&
    parseFloat(externalMentorData.hours_taught) >= 0 &&
    externalMentorData.amount_paid &&
    parseFloat(externalMentorData.amount_paid) >= 0;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
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
          label="Company"
          fullWidth
          value={externalMentorData.company}
          onChange={(e) => setExternalMentorData({ ...externalMentorData, company: e.target.value })}
          sx={{ mt: 2 }}
        />
        <TextField
          label="Designation"
          fullWidth
          value={externalMentorData.designation}
          onChange={(e) => setExternalMentorData({ ...externalMentorData, designation: e.target.value })}
          sx={{ mt: 2 }}
        />
        <TextField
          label="Specialty"
          fullWidth
          value={externalMentorData.specialty}
          onChange={(e) => setExternalMentorData({ ...externalMentorData, specialty: e.target.value })}
          sx={{ mt: 2 }}
        />
        <TextField
          label="Hours Taught"
          type="number"
          fullWidth
          required
          value={externalMentorData.hours_taught}
          onChange={(e) => setExternalMentorData({ ...externalMentorData, hours_taught: e.target.value })}
          sx={{ mt: 2 }}
          InputProps={{
            inputProps: { min: 0, step: 0.01 },
          }}
        />
        <TextField
          label="Amount Paid"
          type="number"
          fullWidth
          required
          value={externalMentorData.amount_paid}
          onChange={(e) => setExternalMentorData({ ...externalMentorData, amount_paid: e.target.value })}
          sx={{ mt: 2 }}
          InputProps={{
            startAdornment: <InputAdornment position="start">Tk</InputAdornment>,
            inputProps: { min: 0, step: 0.01 },
          }}
        />
        {isDraft}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} sx={{ textTransform: 'uppercase' }}>Cancel</Button>
        <Button 
          onClick={handleAdd} 
          variant="contained" 
          disabled={loading || !isValid}
          sx={{ textTransform: 'uppercase' }}
        >
          {loading ? <CircularProgress size={20} /> : 'Create & Assign'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default AddExternalMentorDialog;

