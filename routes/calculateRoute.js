const express = require('express');
const {
  splitMessage,
  parseDetails,
  finalizeAndSummarize,
} = require('../controllers/calculateController');
const { protect } = require('../middlewares/auth');

const router = express.Router();
console.log("IMPORTED Calculated route");
// Step 1: Tách tin
router.post('/split', protect, splitMessage);

// Step 2: Phân tích (tách ra các con đề, lô, xiên 2, xiên 3, xiên 4)
router.post('/parse', protect, parseDetails);
console.log("BEFORE POST FINALIZE")
// Step 3: Tính tiền (so sánh KQXS + tổng hợp bao nhiêu/bao nhiêu)
router.post('/finalize', protect, finalizeAndSummarize);
console.log("AFTER POST FINALIZE")

module.exports = router;