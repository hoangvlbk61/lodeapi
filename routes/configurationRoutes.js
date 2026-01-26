const express = require('express');
const {
  getConfiguration,
  updateConfiguration,
  testReplaceRules,
} = require('../controllers/configurationController');
const { protect } = require('../middlewares/auth');

const router = express.Router();

router.use(protect);

router.route('/').get(getConfiguration).put(updateConfiguration);

router.post('/test-replace', testReplaceRules);

module.exports = router;