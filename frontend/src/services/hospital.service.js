import client from './api/client';

const hospital = {
  getMyHospital: () => client.get('/hospitals/me'),
  getOverview: () => client.get('/hospitals/overview'),
  createHospital: (body) => client.post('/hospitals', body),
  updateHospital: (id, body) => client.patch(`/hospitals/${id}`, body),
};

export default hospital;