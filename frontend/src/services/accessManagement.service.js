import client from './api/client';

const accessManagementService = {
  /**
   * Lists workforce users in the hospital with their role, position, modules, and permissions.
   */
  listWorkforceUsers: () => {
    return client.get('/v1/access-management/users');
  },

  /**
   * Retrieves access settings for a specific user.
   */
  getUserAccess: (userId) => {
    return client.get(`/v1/access-management/${userId}`);
  },

  /**
   * Updates modules and permissions for a workforce user.
   */
  updateUserAccess: (userId, { permissions, modules }) => {
    return client.patch(`/v1/access-management/${userId}`, { permissions, modules });
  },
};

export default accessManagementService;
