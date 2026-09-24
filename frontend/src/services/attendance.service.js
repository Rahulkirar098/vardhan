import client from './api/client';

export const attendanceService = {
  /**
   * Check in for today
   */
  checkIn: async (data = {}) => {
    const response = await client.post('/v1/hrms/attendance/check-in', data);
    return response.data;
  },

  /**
   * Check out for today
   */
  checkOut: async (data = {}) => {
    const response = await client.post('/v1/hrms/attendance/check-out', data);
    return response.data;
  },

  /**
   * Get today's attendance status for current authenticated employee
   */
  getToday: async (params) => {
    const response = await client.get('/v1/hrms/attendance/today', { params });
    return response.data;
  },

  /**
   * Get attendance history for current authenticated employee
   */
  getMyAttendance: async (params) => {
    const response = await client.get('/v1/hrms/attendance/my', { params });
    return response.data;
  },

  /**
   * Get hospital workforce attendance (for Admin / authorized management)
   */
  getHospitalAttendance: async (params) => {
    const response = await client.get('/v1/hrms/attendance', { params });
    return response.data;
  },

  /**
   * Get attendance statistics
   */
  getAttendanceStats: async (params) => {
    const response = await client.get('/v1/hrms/attendance/stats', { params });
    return response.data;
  },
};

export default attendanceService;
