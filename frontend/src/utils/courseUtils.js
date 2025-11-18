/**
 * Course-related utility functions
 */

/**
 * Get the status of a course based on its status field or date-based logic
 * @param {Object} course - Course object with status, start_date, and end_date
 * @returns {string} - 'planning', 'ongoing', or 'completed'
 */
export const getCourseStatus = (course) => {
  // Use status field if available, otherwise fall back to date-based logic
  if (course.status) {
    const statusStr = String(course.status).toLowerCase();
    // Map 'draft' status to 'planning' for display
    if (statusStr === 'draft') {
      return 'planning';
    }
    // Map enum values to lowercase strings
    return statusStr;
  }
  
  // Fallback to date-based logic if status field is not available
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(course.start_date);
  startDate.setHours(0, 0, 0, 0);
  const endDate = course.end_date ? new Date(course.end_date) : null;
  if (endDate) {
    endDate.setHours(0, 0, 0, 0);
  }

  if (startDate > today) {
    return 'planning';
  } else if (endDate && endDate < today) {
    return 'completed';
  } else {
    return 'ongoing';
  }
};

