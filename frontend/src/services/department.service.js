import client from './api/client';

const department = {
  create: (body) => client.post('/departments', body),
  getAll: () => client.get('/departments'),
  getById: (id) => client.get(`/departments/${id}`),
  getDetails: (id) => client.get(`/departments/details/${id}`),
  getHrs: (id) => client.get(`/departments/${id}/hr`),
  inviteHr: (id, body) => client.post(`/departments/${id}/hr/invite`, body),
  update: (id, body) => client.patch(`/departments/${id}`, body),
  updateStatus: (id, status) => client.patch(`/departments/${id}/status`, { status }),
};

export default department;