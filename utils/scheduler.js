const cron = require('node-cron');
const { autoMarkAbsent } = require('../controllers/attendanceController');

// Initialize scheduled jobs
const initScheduler = () => {
  console.log('[Scheduler] Initializing cron jobs...');

  // Run auto-absent at 12:00 PM IST every day
  // Cron format: minute hour day month weekday
  // '0 12 * * *' = At 12:00 PM every day
  const autoAbsentJob = cron.schedule('0 12 * * *', async () => {
    console.log('[Scheduler] Running auto-absent job at 12:00 PM IST');
    try {
      await autoMarkAbsent(null, null); // No req/res since it's automated
    } catch (error) {
      console.error('[Scheduler] Auto-absent job failed:', error);
    }
  }, {
    scheduled: true,
    timezone: "Asia/Kolkata" // Indian Standard Time (IST)
  });

  console.log('[Scheduler] Auto-absent job scheduled for 12:00 PM IST daily');

  // Optional: Run a test at server startup (can be removed in production)
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Scheduler] Development mode: Auto-absent can be triggered manually via API');
  }

  return {
    autoAbsentJob,
  };
};

module.exports = { initScheduler };
