const attachAuthToken = (config) => {
  const token = localStorage.getItem('token');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
};

const handleApiError = (error) => {
  const status = error?.response?.status;

  if (status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userName');
    localStorage.removeItem('userEmail');
    window.location.href = '/login';
  }

  return Promise.reject(error);
};

const setupInterceptors = (client) => {
  client.interceptors.request.use(attachAuthToken, (error) => Promise.reject(error));
  client.interceptors.response.use((response) => response, handleApiError);
};

export { attachAuthToken, handleApiError, setupInterceptors };

export default setupInterceptors;
