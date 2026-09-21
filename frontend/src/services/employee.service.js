import client from './api/client';

const employeeService = {
  // ─── Employees ─────────────────────────────────────────────────────────────
  listEmployees: (params) =>
    client.get('/v1/hrms/employees', { params }),

  getEmployee: (id) =>
    client.get(`/v1/hrms/employees/${id}`),

  inviteEmployee: (body) =>
    client.post('/v1/hrms/employees/invite', body),

  updateEmployee: (id, body) =>
    client.patch(`/v1/hrms/employees/${id}`, body),

  updateEmployeeStatus: (id, status) =>
    client.patch(`/v1/hrms/employees/${id}/status`, { status }),

  getEmployeeStats: () =>
    client.get('/v1/hrms/employees/stats'),

  // ─── Invitations ───────────────────────────────────────────────────────────
  listInvitations: () =>
    client.get('/v1/hrms/employees/invitations'),

  resendInvitation: (invitationId) =>
    client.post(`/v1/hrms/employees/invitations/${invitationId}/resend`),

  cancelInvitation: (invitationId) =>
    client.patch(`/v1/hrms/employees/invitations/${invitationId}/cancel`),

  // Public routes (no auth)
  getInvitationByToken: (token) =>
    client.get(`/v1/hrms/employee-invitations/${token}`),

  acceptInvitation: (token) =>
    client.post(`/v1/hrms/employee-invitations/${token}/accept`),
};

export default employeeService;
