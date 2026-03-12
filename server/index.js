const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
app.use(express.json());

app.get("/health", (req, res) => {
    res.status(200).json({
        status: "ok",
        service: "ad-campaign-backend",
        timestamp: new Date().toISOString(),
    });
});

app.get("/", (req, res) => {
    res.send("Ad Campaign Automation API is running 🚀");
});

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        console.log("✅ MongoDB connected");
        app.listen(4000, () => {
            console.log("🚀 Server running on http://localhost:4000");
        });
    })
    .catch((err) => {
        console.error("❌ MongoDB connection failed", err);
    });
