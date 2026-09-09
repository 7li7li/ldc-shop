import cron from 'node-cron';

// Use loopback by default so cleanup does not depend on public DNS, TLS, or
// a reverse proxy being reachable from inside the container.
const APP_URL = process.env.CRON_INTERNAL_URL || `http://127.0.0.1:${process.env.PORT || 3000}`;
const CRON_TOKEN = process.env.CRON_CLEANUP_TOKEN || process.env.OAUTH_CLIENT_SECRET || '';

cron.schedule('* * * * *', async () => {
    try {
        const res = await fetch(`${APP_URL}/api/internal/cron/cleanup`, {
            method: 'POST',
            headers: { 'x-cron-cleanup-token': CRON_TOKEN },
        });
        if (!res.ok) {
            console.error(`[cron] cleanup failed: ${res.status}`);
        }
    } catch (err) {
        console.error('[cron] cleanup error:', err.message);
    }
});

console.log('[cron] Cleanup scheduler started (every minute)');
