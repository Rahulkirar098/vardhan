import client from './api/client';
import hospitalService from './hospital.service';

let cachedHospitalId = null;

const resolveHospitalId = async (providedId) => {
  if (providedId) {
    cachedHospitalId = providedId;
    return providedId;
  }
  if (cachedHospitalId) {
    return cachedHospitalId;
  }
  
  const response = await hospitalService.getMyHospital();
  const hospital = response?.data?.data;
  const id = hospital?._id || hospital?.id;
  if (!id) {
    throw new Error('Hospital not found. Please set up your hospital first.');
  }
  cachedHospitalId = id;
  return id;
};

const structure = {
  getHospitalId: (providedId) => resolveHospitalId(providedId),
  clearCache: () => {
    cachedHospitalId = null;
  },

  // Floor Methods
  getFloors: async (hospitalId) => {
    const hid = await resolveHospitalId(hospitalId);
    return client.get(`/v1/hospitals/${hid}/floors`);
  },

  getFloor: async (floorId, hospitalId) => {
    const hid = await resolveHospitalId(hospitalId);
    return client.get(`/v1/hospitals/${hid}/floors/${floorId}`);
  },

  createFloor: async (body, hospitalId) => {
    const hid = await resolveHospitalId(hospitalId);
    return client.post(`/v1/hospitals/${hid}/floors`, body);
  },

  updateFloor: async (floorId, body, hospitalId) => {
    const hid = await resolveHospitalId(hospitalId);
    return client.patch(`/v1/hospitals/${hid}/floors/${floorId}`, body);
  },

  deactivateFloor: async (floorId, hospitalId) => {
    const hid = await resolveHospitalId(hospitalId);
    return client.delete(`/v1/hospitals/${hid}/floors/${floorId}`);
  },

  // Room Methods
  getRooms: async (floorId, hospitalId) => {
    const hid = await resolveHospitalId(hospitalId);
    return client.get(`/v1/hospitals/${hid}/floors/${floorId}/rooms`);
  },

  getRoom: async (floorId, roomId, hospitalId) => {
    const hid = await resolveHospitalId(hospitalId);
    return client.get(`/v1/hospitals/${hid}/floors/${floorId}/rooms/${roomId}`);
  },

  createRoom: async (floorId, body, hospitalId) => {
    const hid = await resolveHospitalId(hospitalId);
    return client.post(`/v1/hospitals/${hid}/floors/${floorId}/rooms`, body);
  },

  updateRoom: async (floorId, roomId, body, hospitalId) => {
    const hid = await resolveHospitalId(hospitalId);
    return client.patch(`/v1/hospitals/${hid}/floors/${floorId}/rooms/${roomId}`, body);
  },

  deactivateRoom: async (floorId, roomId, hospitalId) => {
    const hid = await resolveHospitalId(hospitalId);
    return client.delete(`/v1/hospitals/${hid}/floors/${floorId}/rooms/${roomId}`);
  },
};

export default structure;
