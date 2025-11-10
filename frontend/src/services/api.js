import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
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
  approve: (data, approvedBy) => api.post('/enrollments/approve', data, { params: { approved_by: approvedBy } }),
  bulkApprove: (data, approvedBy) => api.post('/enrollments/approve/bulk', data, { params: { approved_by: approvedBy } }),
};

export const coursesAPI = {
  getAll: (params) => api.get('/courses', { params }),
  getById: (id) => api.get(`/courses/${id}`),
  create: (data) => api.post('/courses', data),
  update: (id, data) => api.put(`/courses/${id}`, data),
  archive: (id) => api.post(`/courses/${id}/archive`),
  delete: (id) => api.delete(`/courses/${id}`),
};

export const studentsAPI = {
  getAll: (params) => api.get('/students', { params }),
  getById: (id) => api.get(`/students/${id}`),
  create: (data) => api.post('/students', data),
  getEnrollments: (id) => api.get(`/students/${id}/enrollments`),
};

export const importsAPI = {
  uploadExcel: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/imports/excel', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  uploadCSV: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/imports/csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getSyncStatus: () => api.get('/imports/sync-status'),
};

export const completionsAPI = {
  upload: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/completions/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  bulkUpdate: (data) => api.post('/completions/bulk', data),
  update: (id, data) => api.put(`/completions/${id}`, data),
};


