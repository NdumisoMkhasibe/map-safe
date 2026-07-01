import express from "express";

import healthRoutes from "./routes/health.routes";
import ratingRoutes from "./routes/rating.routes";

/**
 * Create the main Express application.
 * This object is exported to server.ts, where the HTTP server is started.
 */
const app = express();

/**
 * Middleware
 * Allows the API to accept and process JSON request bodies.
 */
app.use(express.json());

/**
 * Register application routes.
 *
 * /health  -> Health monitoring endpoints
 * /ratings -> Safety rating endpoints
 */
app.use("/health", healthRoutes);
app.use("/ratings", ratingRoutes);

/**
 * Export the configured Express application.
 * The server is started separately in server.ts.
 */
export default app;