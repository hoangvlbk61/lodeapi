const express = require('express');
const {
  calculateTransaction,
  saveTransaction,
  getTransactions,
  getTransaction,
  deleteTransaction,
} = require('../controllers/transactionController');
const { protect } = require('../middlewares/auth');

const router = express.Router();

router.use(protect);

router.post('/calculate', calculateTransaction);
router.post('/save', saveTransaction);

router.route('/').get(getTransactions);

router.route('/:id').get(getTransaction).delete(deleteTransaction);

module.exports = router;