const express = require('express');
const {
  getResults,
  getResultByDate,
  getLatestResult,
  checkNumber,
  manualFetch,
  getSchedulerStatus,
  triggerScheduler,
  deleteResult,
} = require('../controllers/resultController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// Public routes (protected - require login)
router.get('/latest', getLatestResult);
router.get('/', getResults);
router.get('/:date', getResultByDate);
router.post('/check', checkNumber);

// Admin only routes
router.post('/fetch', protect, authorize('admin'), manualFetch);
router.get('/scheduler/status', protect, authorize('admin'), getSchedulerStatus);
router.post('/scheduler/trigger', protect, authorize('admin'), triggerScheduler);
router.delete('/:date', protect, authorize('admin'), deleteResult);

module.exports = router;