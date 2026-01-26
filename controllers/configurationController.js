const Configuration = require('../models/Configuration');

// @desc    Get user configuration
// @route   GET /api/configurations
// @access  Private
exports.getConfiguration = async (req, res, next) => {
  try {
    let config = await Configuration.findOne({ userId: req.user._id });

    // If no config exists, create default one
    if (!config) {
      config = await Configuration.create({
        userId: req.user._id,
        replaceRules: [],
      });
    }

    res.status(200).json({
      success: true,
      data: config,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user configuration
// @route   PUT /api/configurations
// @access  Private
exports.updateConfiguration = async (req, res, next) => {
  try {
    const { replaceRules } = req.body;

    // Validate replace rules format
    if (replaceRules && !Array.isArray(replaceRules)) {
      return res.status(400).json({
        success: false,
        message: 'Quy tắc thay thế phải là một mảng',
      });
    }

    // Validate each rule
    if (replaceRules) {
      for (const rule of replaceRules) {
        if (
          typeof rule.id !== 'number' ||
          typeof rule.oldChar !== 'string' ||
          typeof rule.newChar !== 'string'
        ) {
          return res.status(400).json({
            success: false,
            message: 'Định dạng quy tắc thay thế không hợp lệ',
          });
        }
      }
    }

    let config = await Configuration.findOne({ userId: req.user._id });

    if (!config) {
      // Create new config
      config = await Configuration.create({
        userId: req.user._id,
        replaceRules: replaceRules || [],
      });
    } else {
      // Update existing config
      config.replaceRules = replaceRules || [];
      await config.save();
    }

    res.status(200).json({
      success: true,
      message: 'Cập nhật cấu hình thành công',
      data: config,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Test replace rules
// @route   POST /api/configurations/test-replace
// @access  Private
exports.testReplaceRules = async (req, res, next) => {
  try {
    const { testText, replaceRules } = req.body;

    if (!testText) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp văn bản kiểm tra',
      });
    }

    let result = testText;

    if (replaceRules && Array.isArray(replaceRules)) {
      // Sort rules by id
      const sortedRules = [...replaceRules].sort((a, b) => a.id - b.id);

      // Apply each rule
      for (const rule of sortedRules) {
        if (rule.oldChar && rule.newChar) {
          const regex = new RegExp(rule.oldChar, 'g');
          result = result.replace(regex, rule.newChar);
        }
      }
    }

    res.status(200).json({
      success: true,
      data: {
        original: testText,
        result,
      },
    });
  } catch (error) {
    next(error);
  }
};