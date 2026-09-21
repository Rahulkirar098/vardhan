import client from './api/client';

const auth = {
  login: (body) => client.post('/auth/login', body),
  signup: (body) => client.post('/auth/register', body),
  logout: () => client.post('/auth/logout'),
  me: () => client.get('/auth/me'),
  forgotPassword: (body) => client.post('/auth/forgot-password', body),
  resetPassword: (body) => client.post('/auth/reset-password', body),
  changePassword: (body) => client.post('/auth/change-password', body),
  updateProfile: (body) => client.patch('/auth/profile', body),
};

export default auth;