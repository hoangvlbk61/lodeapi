const cron = require('node-cron');
const lotteryResultService = require('../services/lotteryResultService');

class LotteryScheduler {
  constructor() {
    this.jobs = [];
    this.isRunning = false;
  }

  /**
   * Start cronjob: Chạy từ 6:30 PM đến 7:00 PM, mỗi 5 phút
   */
  async start() {
    console.log('🕒 Starting Lottery Result Scheduler...');
    await this.fetchResult();
    // Job chính: Mỗi 5 phút từ 18:30-19:00 (6:30 PM - 7:00 PM)
    const mainJob = cron.schedule(
      '*/5 18-19 * * *', // Every 5 minutes between 6 PM and 7 PM
      async () => {
        const now = new Date();
        const hour = now.getHours();
        const minute = now.getMinutes();

        // Chỉ chạy từ 18:30 đến 19:00
        if (hour === 18 && minute >= 30) {
          await this.fetchResult();
        } else if (hour === 19 && minute === 0) {
          await this.fetchResult();
          console.log('⏰ Reached 7:00 PM, stopping until tomorrow');
        }
      },
      {
        scheduled: true,
        timezone: 'Asia/Ho_Chi_Minh',
      }
    );

    // Backup job: Chạy lúc 7:30 PM nếu chưa có kết quả
    const backupJob = cron.schedule(
      '30 19 * * *', // 7:30 PM
      async () => {
        console.log('🔄 Running backup fetch at 7:30 PM...');
        await this.fetchResult();
      },
      {
        scheduled: true,
        timezone: 'Asia/Ho_Chi_Minh',
      }
    );

    // Manual trigger job: Chạy lúc 8:00 PM (cuối cùng)
    const finalJob = cron.schedule(
      '0 20 * * *', // 8:00 PM
      async () => {
        console.log('⏰ Final fetch at 8:00 PM...');
        await this.fetchResult();
      },
      {
        scheduled: true,
        timezone: 'Asia/Ho_Chi_Minh',
      }
    );

    this.jobs.push(mainJob, backupJob, finalJob);
    this.isRunning = true;

    console.log('✅ Lottery Result Scheduler started successfully!');
    console.log('📅 Schedule:');
    console.log('   - Main: Every 5 minutes from 6:30 PM to 7:00 PM');
    console.log('   - Backup: 7:30 PM');
    console.log('   - Final: 8:00 PM');
    console.log('   - Timezone: Asia/Ho_Chi_Minh (UTC+7)');
  }

  /**
   * Stop all cronjobs
   */
  stop() {
    console.log('🛑 Stopping Lottery Result Scheduler...');
    this.jobs.forEach((job) => job.stop());
    this.jobs = [];
    this.isRunning = false;
    console.log('✅ Scheduler stopped');
  }

  /**
   * Fetch result (called by cronjobs)
   */
  async fetchResult() {
    if (this.isProcessing) {
      console.log('⏳ Already processing, skipping...');
      return;
    }

    try {
      this.isProcessing = true;
      const now = new Date().toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
      });
      
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🎲 LOTTERY RESULT FETCH - ${now}`);
      console.log('='.repeat(60));

      const result = await lotteryResultService.fetchAndSave();

      console.log('✅ Result fetched and saved:');
      console.log(`   - Date: ${result.date}`);
      console.log(`   - Status: ${result.status}`);
      console.log(`   - Time: ${result.time}`);
      console.log('='.repeat(60) + '\n');

      return result;
    } catch (error) {
      console.error('❌ Scheduled fetch failed:', error.message);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Manual trigger (for testing)
   */
  async triggerManual() {
    console.log('🔧 Manual trigger requested...');
    return await this.fetchResult();
  }

  /**
   * Get scheduler status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      jobCount: this.jobs.length,
      isProcessing: this.isProcessing || false,
    };
  }
}

// Export singleton instance
const scheduler = new LotteryScheduler();
module.exports = scheduler;