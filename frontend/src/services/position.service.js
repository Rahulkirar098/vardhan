import client from './api/client';

export const positionService = {
    getPositions: async (params) => {
        const response = await client.get('/v1/positions', { params });
        return response.data;
    },

    createPosition: async (data) => {
        const response = await client.post('/v1/positions', data);
        return response.data;
    },

    updatePosition: async (id, data) => {
        const response = await client.patch(`/v1/positions/${id}`, data);
        return response.data;
    },

    updatePositionStatus: async (id, status) => {
        const response = await client.patch(`/v1/positions/${id}/status`, { status });
        return response.data;
    }
};

export default positionService;
