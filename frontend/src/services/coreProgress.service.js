import client from './api/client';

const coreProgress = {
  getCoreProgress: () => client.get('/v1/core-progress'),
  getCoreProgressFeature: (id) => client.get(`/v1/core-progress/${id}`),
  updateCoreProgressFeature: (id, payload) =>
    client.patch(`/v1/core-progress/${id}`, payload),
};

export default coreProgress;
