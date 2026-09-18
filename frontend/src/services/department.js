import http from './http';

const department = {
  create: (body) => http.post('/departments', body),
  getAll: () => http.get('/departments'),
  getById: (id) => http.get(`/departments/${id}`),
  getDetails: (id) => http.get(`/departments/details/${id}`),
  getHrs: (id) => http.get(`/departments/${id}/hr`),
  inviteHr: (id, body) => http.post(`/departments/${id}/hr/invite`, body),
  update: (id, body) => http.patch(`/departments/${id}`, body),
  updateStatus: (id, status) => http.patch(`/departments/${id}/status`, { status }),
};

export default department;