const lotteryResultService = require('../services/lotteryResultService');
const lotteryScheduler = require('../jobs/lotteryScheduler');
const Result = require('../models/Result');

// @desc    Get result by date
// @route   GET /api/results/:date
// @access  Private
exports.getResultByDate = async (req, res, next) => {
  try {
    const { date } = req.params;

    const result = await lotteryResultService.getResultByDate(date);

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy kết quả cho ngày này',
      });
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get latest result
// @route   GET /api/results/latest
// @access  Private
exports.getLatestResult = async (req, res, next) => {
  try {
    const result = await lotteryResultService.getLatestResult();

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Chưa có kết quả nào',
      });
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get results by date range
// @route   GET /api/results?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// @access  Private
exports.getResults = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp startDate và endDate',
      });
    }

    const results = await lotteryResultService.getResultsByDateRange(
      startDate,
      endDate
    );

    res.status(200).json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Check number for specific date
// @route   POST /api/results/check
// @access  Private
exports.checkNumber = async (req, res, next) => {
  try {
    const { date, number } = req.body;

    if (!date || !number) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp date và number',
      });
    }

    const result = await lotteryResultService.checkNumberForDate(date, number);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Manual fetch result from API
// @route   POST /api/results/fetch
// @access  Private (Admin only)
exports.manualFetch = async (req, res, next) => {
  try {
    const result = await lotteryResultService.fetchAndSave();

    res.status(200).json({
      success: true,
      message: 'Đã fetch kết quả thành công',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get scheduler status
// @route   GET /api/results/scheduler/status
// @access  Private (Admin only)
exports.getSchedulerStatus = async (req, res, next) => {
  try {
    const status = lotteryScheduler.getStatus();

    res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Trigger scheduler manually
// @route   POST /api/results/scheduler/trigger
// @access  Private (Admin only)
exports.triggerScheduler = async (req, res, next) => {
  try {
    const result = await lotteryScheduler.triggerManual();

    res.status(200).json({
      success: true,
      message: 'Đã trigger scheduler thành công',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete result by date
// @route   DELETE /api/results/:date
// @access  Private (Admin only)
exports.deleteResult = async (req, res, next) => {
  try {
    const { date } = req.params;

    const result = await Result.findOneAndDelete({ date });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy kết quả',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Đã xóa kết quả',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};