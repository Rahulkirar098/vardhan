const attachAuthToken = (config) => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
};

const handleApiError = (error) => {
  const status = error?.response?.status;
  const requestUrl = error?.config?.url || '';

  const isAuthEndpoint =
    requestUrl.includes('/auth/login') ||
    requestUrl.includes('/auth/register') ||
    requestUrl.includes('/auth/forgot-password') ||
    requestUrl.includes('/auth/reset-password') ||
    requestUrl.includes('/employee-invitations');

  if (status === 401 && !isAuthEndpoint) {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('role');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('positionName');
    localStorage.removeItem('permissions');
    localStorage.removeItem('modules');
    localStorage.removeItem('hospitalId');
    localStorage.removeItem('employeeId');

    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }

  return Promise.reject(error);
};

const setupInterceptors = (client) => {
  client.interceptors.request.use(attachAuthToken, (error) => Promise.reject(error));
  client.interceptors.response.use((response) => response, handleApiError);
};

export { attachAuthToken, handleApiError, setupInterceptors };

export default setupInterceptors;
