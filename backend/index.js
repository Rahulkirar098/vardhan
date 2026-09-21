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

const app = express();

app.use(express.json());
app.use(cors());

app.get("/", (req, res) => {
    res.send("Welcome to the API!");
});

app.use("/api/auth", authUserRoute);
app.use("/api/hospitals", hospitalRoute);
app.use("/api/hr", hrRoute);
app.use("/api/super-admin", superAdminRoute);
app.use("/api/v1/hospitals/:hospitalId", structureRoute);

const Floor = require("./src/models/floor.model");
const Room = require("./src/models/room.model");

mongoose
    .connect(process.env.MONGODB_URI)
    .then(async () => {
        console.log("Connected to MongoDB");
        try {
            await Floor.syncIndexes();
            await Room.syncIndexes();
        } catch (indexErr) {
            console.error("Error syncing structure indexes:", indexErr);
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