import http from './http';

const hospital = {
  getMyHospital: () => http.get('/hospitals/me'),
  getOverview: () => http.get('/hospitals/overview'),
  createHospital: (body) => http.post('/hospitals', body),
  updateHospital: (id, body) => http.patch(`/hospitals/${id}`, body),
};

export default hospital;