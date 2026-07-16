// frontend/src/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: '/api/' // import.meta.env.VITE_BACKEND_URL,
});

// Add a request interceptor to attach the JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token'); 
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;