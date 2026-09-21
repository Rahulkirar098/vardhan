const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const Employee = require('../models/employee.model');
const Invitation = require('../models/invitation.model');
const Position = require('../models/position.model');
const Hospital = require('../models/hospital.model');

async function migratePositions() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const hospitals = await Hospital.find({});
        console.log(`Found ${hospitals.length} hospitals.`);

        for (const hospital of hospitals) {
            console.log(`Processing hospital: ${hospital.name} (${hospital._id})`);

            const employees = await Employee.find({ hospitalId: hospital._id });
            const invitations = await Invitation.find({ hospitalId: hospital._id });

            const positionNames = new Set();
            
            // Extract distinct position names
            employees.forEach(emp => {
                if (emp.position && typeof emp.position === 'string' && emp.position.trim()) {
                    positionNames.add(emp.position.trim());
                }
            });
            invitations.forEach(inv => {
                if (inv.position && typeof inv.position === 'string' && inv.position.trim()) {
                    positionNames.add(inv.position.trim());
                }
            });

            const positionMap = new Map(); // name -> positionId

            // Create positions
            for (const name of positionNames) {
                let position = await Position.findOne({ hospitalId: hospital._id, name: { $regex: new RegExp(`^${name}$`, 'i') } });
                
                if (!position) {
                    position = await Position.create({
                        hospitalId: hospital._id,
                        name: name,
                        status: 'active'
                    });
                    console.log(`Created Position: ${name}`);
                }
                positionMap.set(name.toLowerCase(), position._id);
            }

            // Fallback for null/empty position
            let defaultPosition = await Position.findOne({ hospitalId: hospital._id, name: 'Default Position' });
            if (!defaultPosition) {
                defaultPosition = await Position.create({
                    hospitalId: hospital._id,
                    name: 'Default Position',
                    status: 'active'
                });
            }

            // Update employees
            for (const emp of employees) {
                let posId = defaultPosition._id;
                if (emp.position && typeof emp.position === 'string' && emp.position.trim()) {
                    const key = emp.position.trim().toLowerCase();
                    if (positionMap.has(key)) {
                        posId = positionMap.get(key);
                    }
                }
                
                // If it's already an ObjectId due to previous migration run, skip
                if (emp.positionId && mongoose.isValidObjectId(emp.positionId)) {
                    continue;
                }

                await Employee.updateOne({ _id: emp._id }, { $set: { positionId: posId }, $unset: { position: 1 } });
            }
            console.log(`Updated ${employees.length} employees.`);

            // Update invitations
            for (const inv of invitations) {
                let posId = defaultPosition._id;
                if (inv.position && typeof inv.position === 'string' && inv.position.trim()) {
                    const key = inv.position.trim().toLowerCase();
                    if (positionMap.has(key)) {
                        posId = positionMap.get(key);
                    }
                }
                
                if (inv.positionId && mongoose.isValidObjectId(inv.positionId)) {
                    continue;
                }

                await Invitation.updateOne({ _id: inv._id }, { $set: { positionId: posId }, $unset: { position: 1 } });
            }
            console.log(`Updated ${invitations.length} invitations.`);
        }

        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await mongoose.disconnect();
    }
}

migratePositions();
