import client from './api/client';

const hr = {
  getMyProfile: () => client.get('/hr/me'),
  getHospital: () => client.get('/hr/hospital'),
  getAll: (params = {}) => client.get('/hr', { params }),
  getById: (id) => client.get(`/hr/${id}`),
  getInvitationByToken: (token) => client.get(`/hr/invite/${token}`),
  acceptInvitation: (token, body) => client.post(`/hr/invite/${token}/accept`, body),
  resendInvitation: (invitationId) => client.post(`/hr/invite/${invitationId}/resend`),
  invite: (body) => client.post('/hr/invite', body),
  getInvitations: () => client.get('/hr/invitations'),
  getPermissions: (hrId) => client.get(`/v1/hr/${hrId}/permissions`),
  updatePermissions: (hrId, permissions) => client.patch(`/v1/hr/${hrId}/permissions`, { permissions }),
};

export default hr;