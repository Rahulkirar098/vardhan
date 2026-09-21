const Hospital = require("../models/hospital.model");

const getAdminHospital = async (adminId) => {
    return Hospital.findOne({ createdBy: adminId });
};

module.exports = {
    getAdminHospital,
};
