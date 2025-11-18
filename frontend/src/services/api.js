import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60 second timeout for large reports
});

// Initialize token from localStorage if available
const token = localStorage.getItem('token');
if (token) {
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// Request interceptor for adding auth tokens
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth API
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  getMe: () => api.get('/auth/me'),
};

// API endpoints
export const enrollmentsAPI = {
  getAll: (params) => api.get('/enrollments', { params }),
  getEligible: (params) => api.get('/enrollments/eligible', { params }),
  getById: (id) => api.get(`/enrollments/${id}`),
  create: (data) => api.post('/enrollments', data),
  approve: (data, approvedBy) => api.post('/enrollments/approve', data, { params: { approved_by: approvedBy } }),
  bulkApprove: (data, approvedBy) => api.post('/enrollments/approve/bulk', data, { params: { approved_by: approvedBy } }),
  withdraw: (id, reason, withdrawnBy) => api.post(`/enrollments/${id}/withdraw`, null, { params: { withdrawal_reason: reason, withdrawn_by: withdrawnBy } }),
  reapprove: (id, approvedBy) => api.post(`/enrollments/${id}/reapprove`, null, { params: { approved_by: approvedBy } }),
  getDashboardStats: () => api.get('/enrollments/dashboard/stats'),
};

export const coursesAPI = {
  getAll: (params) => api.get('/courses/', { params }), // Use trailing slash to avoid redirect
  getById: (id) => api.get(`/courses/${id}`),
  create: (data) => api.post('/courses', data),
  update: (id, data) => api.put(`/courses/${id}`, data),
  delete: (id) => api.delete(`/courses/${id}`),
  generateReport: (id) => api.get(`/courses/${id}/report`, { responseType: 'blob' }),
  updateCosts: (id, data) => api.put(`/courses/${id}/costs`, data),
  assignMentor: (id, data) => api.post(`/courses/${id}/mentors`, data),
  removeCourseMentor: (courseId, courseMentorId) => api.delete(`/courses/${courseId}/mentors/${courseMentorId}`),
  // Comment endpoints
  addComment: (courseId, data) => api.post(`/courses/${courseId}/comments`, data),
  getComments: (courseId) => api.get(`/courses/${courseId}/comments`),
  // Draft endpoints
  saveDraft: (courseId, data) => api.post(`/courses/${courseId}/draft`, data),
  updateDraft: (courseId, data) => api.put(`/courses/${courseId}/draft`, data),
  getDraft: (courseId) => api.get(`/courses/${courseId}/draft`),
  // Approval endpoint
  approveCourse: (courseId, approvedBy) => api.post(`/courses/${courseId}/approve`, null, { params: { approved_by: approvedBy } }),
};

export const studentsAPI = {
  getAll: (params) => api.get('/students', { params }),
  getById: (id) => api.get(`/students/${id}`),
  create: (data) => api.post('/students', data),
  getEnrollments: (id) => api.get(`/students/${id}/enrollments`),
  getAllWithCourses: (params) => api.get('/students/all/with-courses', { params }),
  getCount: (params) => api.get('/students/count', { params }),
  remove: (id) => api.post(`/students/${id}/remove`),
  restore: (id) => api.post(`/students/${id}/restore`),
  generateOverallReport: () => api.get('/students/report/overall', { responseType: 'blob' }),
  tagAsMentor: (id) => api.post(`/students/${id}/mentor-tag`),
  removeMentorTag: (id) => api.delete(`/students/${id}/mentor-tag`),
  importExcel: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/students/import/excel', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  importCSV: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/students/import/csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const mentorsAPI = {
  getAll: (type = 'all') => api.get('/mentors', { params: { type } }),
  createExternal: (data) => api.post('/mentors', data),
  createInternal: (studentId) => api.post(`/mentors/internal/${studentId}`),
  getById: (id) => api.get(`/mentors/${id}`),
  update: (id, data) => api.put(`/mentors/${id}`, data),
  getStats: (id) => api.get(`/mentors/${id}/stats`),
  delete: (id) => api.delete(`/mentors/${id}`),
};

export const importsAPI = {
  uploadExcel: (file, courseId) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/imports/excel?course_id=${courseId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadCSV: (file, courseId) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/imports/csv?course_id=${courseId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getSyncStatus: () => api.get('/imports/sync-status'),
};

export const completionsAPI = {
  upload: (file, courseId) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/completions/upload?course_id=${courseId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadAttendance: (file, courseId) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/completions/attendance/upload?course_id=${courseId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  bulkUpdate: (data) => api.post('/completions/bulk', data),
  update: (id, data) => api.put(`/completions/${id}`, data),
  updateEnrollmentAttendance: (enrollmentId, classesAttended, score) => {
    return api.put(`/completions/enrollment/${enrollmentId}`, null, {
      params: {
        classes_attended: classesAttended,
        score: score,
      },
    });
  },
};


