import http from './http';

const superAdmin = {
  getHospitals: () => http.get('/super-admin/hospitals'),
  getHospitalById: (id) => http.get(`/super-admin/hospitals/${id}`),
};

export default superAdmin;