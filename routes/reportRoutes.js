const express = require('express');
const {
  getDailyReport,
  getWeeklyReport,
  getAvailableDates,
  getCustomerStats,
} = require('../controllers/reportController');
const { protect } = require('../middlewares/auth');

const router = express.Router();

router.use(protect);

router.get('/daily', getDailyReport);
router.get('/weekly', getWeeklyReport);
router.get('/available-dates', getAvailableDates);
router.get('/customer-stats/:customerId', getCustomerStats);

module.exports = router;