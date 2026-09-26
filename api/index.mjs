import { createApp } from '../backend/dist/app.js';
import { loadConfig } from '../backend/dist/config.js';
import { prisma } from '../backend/dist/prisma/client.js';

const app = createApp({ db: prisma, config: loadConfig() });

export default function handler(req, res) {
  // Vercel adds the :path* rewrite capture to the query string. The Express
  // routes already receive the original URL, so this capture is not an API filter.
  if (req.url?.startsWith('/api/v1/')) {
    const url = new URL(req.url, 'http://localhost');
    url.searchParams.delete('path');
    req.url = `${url.pathname}${url.search}`;
  }
  return app(req, res);
}
