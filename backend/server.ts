import 'dotenv/config';
import app from './src/app';
import { redis } from './src/services/redis';
import { startLoadsheddingRefreshJob } from './src/jobs/refreshLoadshedding';

const PORT = Number(process.env.PORT ?? 3000);

async function start() {
  // Verify Redis is reachable before accepting traffic
  await redis.ping();
  console.log('[Redis] Ping OK');

  startLoadsheddingRefreshJob();

  app.listen(PORT, () => {
    console.log(`[Server] Running on port ${PORT} (${process.env.NODE_ENV ?? 'development'})`);
  });
}

start().catch((err) => {
  console.error('[Server] Failed to start:', err);
  process.exit(1);
});
