/**
 * Date formatting and manipulation utility functions
 */

/**
 * Convert a Date object to ISO date string (YYYY-MM-DD) for API submission
 * @param {Date|null|undefined} date - Date object to convert
 * @returns {string|null} - ISO date string or null if date is invalid
 */
export const formatDateForAPI = (date) => {
  if (!date) return null;
  try {
    return date.toISOString().split('T')[0];
  } catch (error) {
    console.error('Error formatting date for API:', error);
    return null;
  }
};

/**
 * Format a date for display using day month year format (e.g., "15 Jan 2024")
 * @param {Date|string} date - Date object or date string
 * @param {Object} options - Intl.DateTimeFormat options (will override defaults)
 * @returns {string} - Formatted date string
 */
export const formatDateForDisplay = (date, options = {}) => {
  if (!date) return 'N/A';
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return 'N/A';
    
    const defaultOptions = {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    };
    
    // Use 'en-GB' locale which naturally uses day/month/year format
    return dateObj.toLocaleDateString('en-GB', { ...defaultOptions, ...options });
  } catch (error) {
    console.error('Error formatting date for display:', error);
    return 'N/A';
  }
};

/**
 * Format a datetime for display using day month year format with time (e.g., "15 Jan 2024, 10:30 AM")
 * @param {Date|string} date - Date object or date string
 * @param {Object} options - Intl.DateTimeFormat options (will override defaults)
 * @returns {string} - Formatted datetime string
 */
export const formatDateTimeForDisplay = (date, options = {}) => {
  if (!date) return 'N/A';
  try {
    const dateObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dateObj.getTime())) return 'N/A';
    
    const defaultOptions = {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    };
    
    // Use 'en-GB' locale which naturally uses day/month/year format
    return dateObj.toLocaleString('en-GB', { ...defaultOptions, ...options });
  } catch (error) {
    console.error('Error formatting datetime for display:', error);
    return 'N/A';
  }
};

/**
 * Format a date range for display (e.g., "15 Jan 2024 - 20 Feb 2024" or "Jan 2024")
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {string} - Formatted date range string
 */
export const formatDateRange = (startDate, endDate) => {
  if (!startDate || !endDate) return 'N/A';
  
  // For date ranges, show month and year only for cleaner display
  const startStr = formatDateForDisplay(startDate, { month: 'short', year: 'numeric' });
  const endStr = formatDateForDisplay(endDate, { month: 'short', year: 'numeric' });
  
  if (startStr === endStr) {
    return startStr;
  }
  return `${startStr} - ${endStr}`;
};

/**
 * Generate a safe filename with timestamp
 * @param {string} prefix - Filename prefix
 * @param {string} extension - File extension (e.g., '.xlsx')
 * @returns {string} - Safe filename with timestamp
 */
export const generateTimestampFilename = (prefix, extension = '.xlsx') => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  return `${prefix}_${timestamp}${extension}`;
};

