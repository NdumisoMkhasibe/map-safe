import app from "./app";

/**
 * Define the port the server will run on
 * Default is 3000 for local development
 */
const PORT = process.env.PORT || 3000;

/**
 * Start the Express server
 * This function "boots up" the backend application
 */
app.listen(PORT, () => {
  console.log(` MapSafe backend running on http://localhost:${PORT}`);
  console.log(` Health check available at http://localhost:${PORT}/health`);
});