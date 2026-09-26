import { createApp } from '../backend/dist/app.js';
import { loadConfig } from '../backend/dist/config.js';
import { prisma } from '../backend/dist/prisma/client.js';

export default createApp({ db: prisma, config: loadConfig() });
