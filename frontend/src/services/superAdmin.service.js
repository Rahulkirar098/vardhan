import client from './api/client';

const superAdmin = {
  getHospitals: () => client.get('/super-admin/hospitals'),
  getHospitalById: (id) => client.get(`/super-admin/hospitals/${id}`),
};

export default superAdmin;