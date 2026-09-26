import express from 'express';
import { createApp } from './backend/dist/app.js';
import { loadConfig } from './backend/dist/config.js';
import { prisma } from './backend/dist/prisma/client.js';

// Vercel detects this Express entrypoint and serves public/ from its CDN.
// The backend is compiled during vercel:build, so Vercel loads JavaScript.
void express;
export default createApp({ db: prisma, config: loadConfig() });
