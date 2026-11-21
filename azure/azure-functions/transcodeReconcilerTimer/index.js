/**
 * Azure Function Timer Trigger: Heartbeat / Health check & Transcode Reconciler ping.
 * Schedule: Every 15 minutes.
 */
export default async function (context, myTimer) {
  const timeStamp = new Date().toISOString();
  context.log('🕒 LokDarpan Transcode Reconciler Cron Triggered at:', timeStamp);

  const apiUrl = process.env.API_URL || process.env.BACKEND_API_URL;

  if (!apiUrl) {
    context.log.warn('⚠️ API_URL environment variable is missing, skipping ping.');
    return;
  }

  const healthEndpoint = `${apiUrl.replace(/\/+$/, '')}/health`;

  try {
    const response = await fetch(healthEndpoint);
    if (!response.ok) {
      context.log.error(`⚠️ Backend health check returned ${response.status}`);
    } else {
      context.log(`✅ Backend container active and healthy (${response.status}) at ${timeStamp}`);
    }
  } catch (error) {
    context.log.error('❌ Error pinging backend:', error.message);
  }
}
