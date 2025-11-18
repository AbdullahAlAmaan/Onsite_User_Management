/**
 * Experience calculation utility functions
 */

/**
 * Calculate total experience in years from a start date
 * @param {Date|string|null} startDate - Career start date or BS joining date
 * @returns {string|null} - Experience in years (formatted to 1 decimal) or null if invalid
 */
export const calculateExperience = (startDate) => {
  if (!startDate) return null;
  
  try {
    const start = new Date(startDate);
    const today = new Date();
    
    // Check if date is valid
    if (isNaN(start.getTime())) return null;
    
    const diffTime = Math.abs(today - start);
    const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
    return diffYears.toFixed(1);
  } catch (error) {
    console.error('Error calculating experience:', error);
    return null;
  }
};

/**
 * Calculate total experience in years from career start date
 * @param {Date|string|null} careerStartDate - Career start date
 * @returns {string|null} - Experience in years (formatted to 1 decimal) or null if invalid
 */
export const calculateTotalExperience = (careerStartDate) => {
  return calculateExperience(careerStartDate);
};

/**
 * Calculate BS experience in years from BS joining date
 * @param {Date|string|null} bsJoiningDate - BS joining date
 * @returns {string|null} - Experience in years (formatted to 1 decimal) or null if invalid
 */
export const calculateBSExperience = (bsJoiningDate) => {
  return calculateExperience(bsJoiningDate);
};

/**
 * Format experience for display (adds "years" suffix)
 * @param {Date|string|null} startDate - Start date
 * @returns {string} - Formatted experience string (e.g., "5.2 years") or "N/A"
 */
export const formatExperience = (startDate) => {
  const experience = calculateExperience(startDate);
  return experience ? `${experience} years` : 'N/A';
};

