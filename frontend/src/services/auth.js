import http from './http';

const auth = {
  login: (body) => http.post('/auth/login', body),
  signup: (body) => http.post('/auth/register', body),
  logout: () => http.post('/auth/logout'),
  me: () => http.get('/auth/me'),
  forgotPassword: (body) => http.post('/auth/forgot-password', body),
  resetPassword: (body) => http.post('/auth/reset-password', body),
};

export default auth;