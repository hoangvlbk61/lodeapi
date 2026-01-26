const Transaction = require('../models/Transaction');
const Customer = require('../models/Customer');
const Configuration = require('../models/Configuration');
const LotteryService = require('../services/lotteryService');

// @desc    Calculate transaction (Step 1 & 2)
// @route   POST /api/transactions/calculate
// @access  Private
exports.calculateTransaction = async (req, res, next) => {
  try {
    const { customerId, date, rawData, type } = req.body;

    // Validate required fields
    if (!customerId || !date || !rawData) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ thông tin',
      });
    }

    // Get customer
    const customer = await Customer.findOne({
      _id: customerId,
      userId: req.user._id,
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khách hàng',
      });
    }

    // Get user configuration for replace rules
    let processedRawData = rawData;
    const config = await Configuration.findOne({ userId: req.user._id });
    
    if (config && config.replaceRules && config.replaceRules.length > 0) {
      processedRawData = config.applyReplaceRules(rawData);
    }

    // Parse data
    const processedData = LotteryService.parseData(processedRawData);

    // Calculate totals
    const totals = LotteryService.calculateTotals(
      processedData,
      customer.prices,
      customer.discountPercent
    );

    // Format output
    const formattedOutput = LotteryService.formatOutput(
      processedData,
      customer.prices,
      totals
    );

    res.status(200).json({
      success: true,
      data: {
        customer: {
          id: customer._id,
          name: customer.name,
          customerId: customer.customerId,
        },
        rawData,
        processedRawData,
        processedData,
        totals,
        formattedOutput,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Save transaction
// @route   POST /api/transactions/save
// @access  Private
exports.saveTransaction = async (req, res, next) => {
  try {
    const { customerId, date, rawData, processedData, totals, type } = req.body;

    // Validate required fields
    if (!customerId || !date || !rawData || !processedData || !totals) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ thông tin',
      });
    }

    // Verify customer belongs to user
    const customer = await Customer.findOne({
      _id: customerId,
      userId: req.user._id,
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy khách hàng',
      });
    }

    // Create transaction
    const transaction = await Transaction.create({
      userId: req.user._id,
      customerId,
      date: new Date(date),
      type: type || 'receive',
      rawData,
      processedData,
      totals,
    });

    res.status(201).json({
      success: true,
      message: 'Lưu giao dịch thành công',
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all transactions
// @route   GET /api/transactions
// @access  Private
exports.getTransactions = async (req, res, next) => {
  try {
    const { customerId, startDate, endDate, type } = req.query;

    // Build query
    const query = { userId: req.user._id };

    if (customerId) {
      query.customerId = customerId;
    }

    if (type) {
      query.type = type;
    }

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        query.date.$lte = new Date(endDate);
      }
    }

    const transactions = await Transaction.find(query)
      .populate('customerId', 'name customerId')
      .sort({ date: -1, createdAt: -1 });

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single transaction
// @route   GET /api/transactions/:id
// @access  Private
exports.getTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).populate('customerId', 'name customerId prices discountPercent');

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy giao dịch',
      });
    }

    res.status(200).json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete transaction
// @route   DELETE /api/transactions/:id
// @access  Private
exports.deleteTransaction = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({
      _id: req.params.id,
      userId: req.user._id,
    });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy giao dịch',
      });
    }

    await transaction.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Xóa giao dịch thành công',
    });
  } catch (error) {
    next(error);
  }
};