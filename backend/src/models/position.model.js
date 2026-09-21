const mongoose = require('mongoose');

const positionSchema = new mongoose.Schema(
    {
        hospitalId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Hospital',
            required: true,
            index: true,
        },
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
        },
        defaultModules: {
            type: [String],
            default: [],
        },
        status: {
            type: String,
            enum: ['active', 'inactive'],
            default: 'active',
        },
    },
    {
        timestamps: true,
    }
);

// A hospital cannot have duplicate position names
// Collation allows case-insensitive uniqueness (e.g., 'HR Manager' vs 'hr manager')
positionSchema.index(
    { hospitalId: 1, name: 1 }, 
    { unique: true, collation: { locale: 'en', strength: 2 } }
);

const Position = mongoose.model('Position', positionSchema);

module.exports = Position;
