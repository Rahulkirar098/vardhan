import http from './http';

const hr = {
  getMyProfile: () => http.get('/hr/me'),
  getHospital: () => http.get('/hr/hospital'),
  getAll: (params = {}) => http.get('/hr', { params }),
  getById: (id) => http.get(`/hr/${id}`),
  getInvitationByToken: (token) => http.get(`/hr/invite/${token}`),
  acceptInvitation: (token, body) => http.post(`/hr/invite/${token}/accept`, body),
  resendInvitation: (invitationId) => http.post(`/hr/invite/${invitationId}/resend`),
  cancelInvitation: (invitationId) => http.patch(`/hr/invite/${invitationId}/cancel`),
};

export default hr;