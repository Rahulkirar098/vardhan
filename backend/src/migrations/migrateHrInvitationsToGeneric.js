require("dotenv").config({ path: __dirname + "/../../.env" });
const mongoose = require("mongoose");
const HrInvitation = require("../models/hrInvitation.model");
const Invitation = require("../models/invitation.model");

const runMigration = async () => {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected.\n");

        console.log("--- MIGRATING HR INVITATIONS ---");
        const hrInvitations = await HrInvitation.find({}).lean();
        console.log(`Found ${hrInvitations.length} total HR invitations in old collection.`);

        let hrMigrated = 0;
        let hrSkipped = 0;
        let hrConflicts = 0;

        for (const hrInv of hrInvitations) {
            // Check if already migrated
            const existing = await Invitation.findOne({
                tokenHash: hrInv.tokenHash,
                email: hrInv.email,
                type: "HR"
            });

            if (existing) {
                hrSkipped++;
                continue;
            }

            try {
                // Split name for generic invitation model
                const nameParts = (hrInv.name || "").trim().split(" ");
                const firstName = nameParts[0] || "Unknown";
                const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : null;

                await Invitation.create({
                    hospitalId: hrInv.hospitalId,
                    type: "HR",
                    email: hrInv.email,
                    phone: hrInv.phone,
                    firstName: firstName,
                    lastName: lastName,
                    tokenHash: hrInv.tokenHash,
                    expiresAt: hrInv.expiresAt,
                    status: hrInv.status,
                    invitedBy: hrInv.invitedBy,
                    acceptedAt: hrInv.acceptedAt,
                    role: "hr",
                    modules: hrInv.modules || [],
                    permissions: hrInv.permissions || [],
                    createdAt: hrInv.createdAt,
                    updatedAt: hrInv.updatedAt,
                });
                hrMigrated++;
            } catch (err) {
                console.error(`Conflict or error migrating HR invitation ${hrInv._id}:`, err.message);
                hrConflicts++;
            }
        }

        console.log(`HR Migration Result: Migrated: ${hrMigrated}, Skipped: ${hrSkipped}, Conflicts: ${hrConflicts}\n`);
        
        console.log("Migration complete.");
        process.exit(0);
    } catch (err) {
        console.error("Migration Failed:", err);
        process.exit(1);
    }
};

runMigration();
