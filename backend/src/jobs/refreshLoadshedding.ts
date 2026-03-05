import cron from 'node-cron';
import { invalidateStageCache, getCurrentStage } from '../services/eskomsepush';

// Refresh the loadshedding stage cache every 4 hours
// Runs at: 00:00, 04:00, 08:00, 12:00, 16:00, 20:00
export function startLoadsheddingRefreshJob(): void {
  cron.schedule('0 */4 * * *', async () => {
    console.log('[Cron] Refreshing loadshedding stage cache...');
    try {
      await invalidateStageCache();
      const stage = await getCurrentStage();
      console.log(`[Cron] Loadshedding stage refreshed — Eskom: ${stage.eskom_stage}, Cape Town: ${stage.capetown_stage}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error('[Cron] Failed to refresh loadshedding cache:', message);
    }
  });

  console.log('[Cron] Loadshedding refresh job scheduled (every 4 hours)');
}
