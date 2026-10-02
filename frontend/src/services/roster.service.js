import client from './api/client';

export const rosterService = {
  // --- Templates ---
  getRosterTemplates: async (params) => {
    const response = await client.get('/v1/roster-templates', { params });
    return response.data;
  },

  getRosterTemplate: async (id) => {
    const response = await client.get(`/v1/roster-templates/${id}`);
    return response.data;
  },

  createRosterTemplate: async (data) => {
    const response = await client.post('/v1/roster-templates', data);
    return response.data;
  },

  updateRosterTemplate: async (id, data) => {
    const response = await client.put(`/v1/roster-templates/${id}`, data);
    return response.data;
  },

  duplicateRosterTemplate: async (id) => {
    const response = await client.post(`/v1/roster-templates/${id}/duplicate`);
    return response.data;
  },

  deactivateRosterTemplate: async (id) => {
    const response = await client.patch(`/v1/roster-templates/${id}/deactivate`);
    return response.data;
  },

  // --- Rosters ---
  getRosters: async (params) => {
    const response = await client.get('/v1/rosters', { params });
    return response.data;
  },

  getRoster: async (id) => {
    const response = await client.get(`/v1/rosters/${id}`);
    return response.data;
  },

  getRosterHistory: async (params) => {
    const response = await client.get('/v1/rosters/history', { params });
    return response.data;
  },

  createRoster: async (data) => {
    const response = await client.post('/v1/rosters', data);
    return response.data;
  },

  updateRoster: async (id, data) => {
    const response = await client.put(`/v1/rosters/${id}`, data);
    return response.data;
  },

  deleteRoster: async (id) => {
    const response = await client.delete(`/v1/rosters/${id}`);
    return response.data;
  },

  publishRoster: async (id) => {
    const response = await client.post(`/v1/rosters/${id}/publish`);
    return response.data;
  },

  // --- Review Sharing & Feedback ---
  shareRosterForReview: async (id, userIds) => {
    const response = await client.post(`/v1/rosters/${id}/share`, { userIds });
    return response.data;
  },

  addReviewComment: async (id, comment) => {
    const response = await client.post(`/v1/rosters/${id}/comments`, { comment });
    return response.data;
  },

  resolveReviewComment: async (id, commentId) => {
    const response = await client.patch(`/v1/rosters/${id}/comments/${commentId}/resolve`);
    return response.data;
  },

  // --- Assignments ---
  addAssignment: async (rosterId, data) => {
    const response = await client.post(`/v1/rosters/${rosterId}/assignments`, data);
    return response.data;
  },

  addBulkRangeAssignment: async (rosterId, data) => {
    const response = await client.post(`/v1/rosters/${rosterId}/assignments/bulk-range`, data);
    return response.data;
  },

  updateAssignment: async (rosterId, assignmentId, data) => {
    const response = await client.put(`/v1/rosters/${rosterId}/assignments/${assignmentId}`, data);
    return response.data;
  },

  deleteAssignment: async (rosterId, assignmentId) => {
    const response = await client.delete(`/v1/rosters/${rosterId}/assignments/${assignmentId}`);
    return response.data;
  },

  // --- My Roster ---
  getMyRoster: async (params) => {
    const response = await client.get('/v1/rosters/my-roster', { params });
    return response.data;
  }
};

export default rosterService;
