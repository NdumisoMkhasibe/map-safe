import express from "express";

// Create the Express application instance
// This is the main "app" that handles all routes and middleware
const app = express();

/**
 * Middleware
 * This allows the server to read JSON data from incoming requests
 * (e.g. POST requests from frontend)
 */
app.use(express.json());

/**
 * Health Check Route
 * Used to verify that the backend is running correctly
 * This is useful for monitoring and deployment checks
 */
app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "MapSafe backend",
    timestamp: new Date().toISOString()
  });
});

export default app;