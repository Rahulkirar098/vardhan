import client from './api/client';

const hr = {
  getMyProfile: () => client.get('/hr/me'),
  getHospital: () => client.get('/hr/hospital'),
  getAll: (params = {}) => client.get('/hr', { params }),
  getById: (id) => client.get(`/hr/${id}`),
  getInvitationByToken: (token) => client.get(`/hr/invite/${token}`),
  acceptInvitation: (token, body) => client.post(`/hr/invite/${token}/accept`, body),
  resendInvitation: (invitationId) => client.post(`/hr/invite/${invitationId}/resend`),
  cancelInvitation: (invitationId) => client.patch(`/hr/invite/${invitationId}/cancel`),
};

export default hr;