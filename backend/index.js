const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, ".env") });

const { authUserRoute } = require("./src/routes/auth.route");
const { hospitalRoute } = require("./src/routes/hospital.route");
const { hrRoute } = require("./src/routes/hr.route");
const { superAdminRoute } = require("./src/routes/superAdmin.route");
const { structureRoute } = require("./src/routes/structure.route");
const { moduleRoute } = require("./src/routes/module.route");
const { employeeRoute } = require("./src/routes/employee.route");
const positionRoute = require("./src/routes/position.route");

const app = express();

app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
    res.send("Welcome to the API!");
});

app.use("/api/auth", authUserRoute);
app.use("/api/v1/auth", authUserRoute);
app.use("/api/hospitals", hospitalRoute);
app.use("/api/hr", hrRoute);
app.use("/api/v1/hr", hrRoute);
app.use("/api/super-admin", superAdminRoute);
app.use("/api/v1/hospitals/:hospitalId", structureRoute);
app.use("/api/v1/modules", moduleRoute);
app.use("/api/modules", moduleRoute);
app.use("/api/v1/hrms", employeeRoute);
app.use("/api/positions", positionRoute);
app.use("/api/v1/positions", positionRoute);

const Floor = require("./src/models/floor.model");
const Room = require("./src/models/room.model");
const Invitation = require("./src/models/invitation.model");
const Position = require("./src/models/position.model");

mongoose
    .connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log("Connected to MongoDB");
        try {
            await Floor.syncIndexes();
            await Room.syncIndexes();
            await Invitation.syncIndexes();
            await Position.syncIndexes();
        } catch (indexErr) {
            console.error("Error syncing indexes:", indexErr);
        }

        app.listen(process.env.PORT || 3000, () => {
            console.log(
                `Server started on port ${process.env.PORT || 3000}`
            );
        });
    })
    .catch((error) => {
        console.log(`Connection error: ${error}`);
    });

module.exports = app;