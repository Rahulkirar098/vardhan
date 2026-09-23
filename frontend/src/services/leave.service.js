import client from './api/client';

export const leaveService = {
  /**
   * Apply for a new leave request
   */
  applyLeave: async (data) => {
    const response = await client.post('/v1/hrms/leaves', data);
    return response.data;
  },

  /**
   * Get leave history for current authenticated employee
   */
  getMyLeaves: async (params) => {
    const response = await client.get('/v1/hrms/leaves/my', { params });
    return response.data;
  },

  /**
   * Get all hospital leaves (for management)
   */
  getHospitalLeaves: async (params) => {
    const response = await client.get('/v1/hrms/leaves', { params });
    return response.data;
  },

  /**
   * Get leave metrics and KPIs for the hospital
   */
  getLeaveStats: async () => {
    const response = await client.get('/v1/hrms/leaves/stats');
    return response.data;
  },

  /**
   * Get a single leave request by ID
   */
  getLeaveById: async (id) => {
    const response = await client.get(`/v1/hrms/leaves/${id}`);
    return response.data;
  },

  /**
   * Approve a pending leave request
   */
  approveLeave: async (id) => {
    const response = await client.patch(`/v1/hrms/leaves/${id}/approve`);
    return response.data;
  },

  /**
   * Reject a pending leave request with a required reason
   */
  rejectLeave: async (id, data) => {
    const response = await client.patch(`/v1/hrms/leaves/${id}/reject`, data);
    return response.data;
  },

  /**
   * Cancel a pending leave request
   */
  cancelLeave: async (id) => {
    const response = await client.patch(`/v1/hrms/leaves/${id}/cancel`);
    return response.data;
  },
};

export default leaveService;
