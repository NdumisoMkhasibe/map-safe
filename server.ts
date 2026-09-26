import express from 'express';
import { createApp } from './backend/src/app.js';
import { loadConfig } from './backend/src/config.js';
import { prisma } from './backend/src/prisma/client.js';

// Vercel detects this exported Express app and serves it as the same-origin API.
// The static Vite bundle is copied to public/ by the Vercel build command.
const app = createApp({ db: prisma, config: loadConfig() });
export default app;
