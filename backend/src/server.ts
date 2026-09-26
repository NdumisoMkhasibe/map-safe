import 'dotenv/config';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { prisma } from './prisma/client.js';

const config = loadConfig();
await prisma.$connect();
const server = createApp({ db: prisma, config }).listen(config.PORT, () => {
  console.log(
    JSON.stringify({ event: 'server_started', port: config.PORT, environment: config.NODE_ENV }),
  );
});
// Stop accepting requests before releasing database connections during a rolling deploy.
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close(() => {
      void prisma.$disconnect().then(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  });
}
