import client from './api/client';

const moduleService = {
  getModules: () => client.get('/v1/modules'),
  getModule: (moduleKey) => client.get(`/v1/modules/${moduleKey}`),
};

export default moduleService;
