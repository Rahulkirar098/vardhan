const validateCreateFloor = (data) => {
    const { name, floorNumber, code, description } = data;
    if (!name || typeof name !== "string" || name.trim() === "") {
        return { error: "Floor name is required" };
    }
    if (floorNumber === undefined || floorNumber === null || isNaN(Number(floorNumber))) {
        return { error: "Floor number must be a valid number" };
    }
    return {
        value: {
            name: name.trim(),
            floorNumber: Number(floorNumber),
            code: code ? String(code).trim() : undefined,
            description: description ? String(description).trim() : undefined,
        },
    };
};

const validateUpdateFloor = (data) => {
    const { name, floorNumber, code, description } = data;
    
    if (Object.keys(data).length === 0) {
        return { error: "At least one field must be provided for update" };
    }

    const value = {};
    if (name !== undefined) {
        if (typeof name !== "string" || name.trim() === "") return { error: "Floor name must not be empty" };
        value.name = name.trim();
    }
    if (floorNumber !== undefined) {
        if (isNaN(Number(floorNumber))) return { error: "Floor number must be a valid number" };
        value.floorNumber = Number(floorNumber);
    }
    if (code !== undefined) value.code = String(code).trim();
    if (description !== undefined) value.description = String(description).trim();

    return { value };
};

const validateCreateRoom = (data) => {
    const { name, code, description } = data;
    if (!name || typeof name !== "string" || name.trim() === "") {
        return { error: "Room name is required" };
    }
    return {
        value: {
            name: name.trim(),
            code: code ? String(code).trim() : undefined,
            description: description ? String(description).trim() : undefined,
        },
    };
};

const validateUpdateRoom = (data) => {
    const { name, code, description } = data;
    
    if (Object.keys(data).length === 0) {
        return { error: "At least one field must be provided for update" };
    }

    const value = {};
    if (name !== undefined) {
        if (typeof name !== "string" || name.trim() === "") return { error: "Room name must not be empty" };
        value.name = name.trim();
    }
    if (code !== undefined) value.code = String(code).trim();
    if (description !== undefined) value.description = String(description).trim();

    return { value };
};

module.exports = {
    validateCreateFloor,
    validateUpdateFloor,
    validateCreateRoom,
    validateUpdateRoom,
};
