const express = require('express');
const {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} = require('../controllers/customerController');
const { protect } = require('../middlewares/auth');

const router = express.Router();

router.use(protect);

router.route('/').get(getCustomers).post(createCustomer);

router.route('/:id').get(getCustomer).put(updateCustomer).delete(deleteCustomer);

module.exports = router;