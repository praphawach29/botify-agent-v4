const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const hpp = require("hpp");

const app = express();



// Security Middlewares
app.use(helmet({ crossOriginEmbedderPolicy: false }));

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.length === 0) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
    callback(new Error("CORS: Origin '" + origin + "' not allowed"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
  maxAge: 86400, // preflight cache 24h
}));

app.use((req, res, next) => {
  if (req.originalUrl === "/api/payment/webhook/stripe") return next();
  express.json({ limit: "50mb" })(req, res, next);
});
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(hpp());

// Register Routes
require("./routes/auth")(app);
require("./routes/api")(app);
require("./routes/webhook")(app);
require("./routes/payment")(app);
require("./routes/admin")(app);
require("./routes/misc")(app);
require("./routes/backup")(app);

// Serve static frontend
const path = require('path');
app.use(express.static(path.join(__dirname, '../client/dist')));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/webhook') || req.path.startsWith('/saas')) return next();
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  if (err.message && err.message.includes("CORS")) {
    return res.status(403).json({ error: "CORS not allowed" });
  }
  console.error("🔥 [Global Error]:", err);
  res.status(500).json({ error: "Internal Server Error" });
});

module.exports = app;
