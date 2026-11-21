/**
 * Azure Function Timer Trigger: Recalculates 7-day recommendation stats & trending percentiles.
 * Schedule: Daily at 02:00 UTC (or configured via SCHEDULE in function.json / App Settings).
 */
export default async function (context, myTimer) {
  const timeStamp = new Date().toISOString();
  context.log('🕒 LokDarpan Recommendation Stats Cron Triggered at:', timeStamp);

  const apiUrl = process.env.API_URL || process.env.BACKEND_API_URL;
  const cronSecret = process.env.CRON_SECRET || '';

  if (!apiUrl) {
    context.log.error('❌ API_URL environment variable is missing.');
    return;
  }

  const endpoint = `${apiUrl.replace(/\/+$/, '')}/api/v1/recommendations/stats/run`;
  context.log(`📡 Triggering stats job at: ${endpoint}`);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-cron-secret': cronSecret,
      },
    });

    const body = await response.text();
    if (!response.ok) {
      context.log.error(`❌ Recommendation stats job failed (${response.status}): ${body}`);
      throw new Error(`Stats job failed with status ${response.status}`);
    }

    context.log(`✅ Recommendation stats job succeeded: ${body}`);
  } catch (error) {
    context.log.error('❌ Error executing recommendation stats cron:', error.message);
    throw error;
  }
}
