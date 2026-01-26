const Transaction = require('../models/Transaction');
const Customer = require('../models/Customer');

// @desc    Get daily report
// @route   GET /api/reports/daily?date=YYYY-MM-DD
// @access  Private
exports.getDailyReport = async (req, res, next) => {
  try {
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp ngày',
      });
    }

    const reportDate = new Date(date);
    const nextDay = new Date(reportDate);
    nextDay.setDate(nextDay.getDate() + 1);

    // Get all transactions for this date
    const transactions = await Transaction.find({
      userId: req.user._id,
      date: {
        $gte: reportDate,
        $lt: nextDay,
      },
    }).populate('customerId', 'name customerId');

    // Group by customer
    const customerMap = new Map();

    transactions.forEach((transaction) => {
      const customerId = transaction.customerId._id.toString();
      
      if (!customerMap.has(customerId)) {
        customerMap.set(customerId, {
          customerId: transaction.customerId._id,
          customerCode: transaction.customerId.customerId,
          customerName: transaction.customerId.name,
          total: 0,
        });
      }

      const customer = customerMap.get(customerId);
      customer.total += transaction.totals.netAmount;
    });

    const customerReports = Array.from(customerMap.values());
    const grandTotal = customerReports.reduce((sum, c) => sum + c.total, 0);

    res.status(200).json({
      success: true,
      data: {
        date: reportDate,
        customers: customerReports,
        grandTotal: Math.round(grandTotal * 100) / 100,
        transactionCount: transactions.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get weekly report
// @route   GET /api/reports/weekly?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// @access  Private
exports.getWeeklyReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp ngày bắt đầu và kết thúc',
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setDate(end.getDate() + 1); // Include end date

    // Get all transactions in date range
    const transactions = await Transaction.find({
      userId: req.user._id,
      date: {
        $gte: start,
        $lt: end,
      },
    }).populate('customerId', 'name customerId');

    // Group by customer and day
    const customerMap = new Map();
    const daysOfWeek = ['chu-nhat', 'thu-2', 'thu-3', 'thu-4', 'thu-5', 'thu-6', 'thu-7'];

    transactions.forEach((transaction) => {
      const customerId = transaction.customerId._id.toString();
      const dayOfWeek = daysOfWeek[transaction.date.getDay()];

      if (!customerMap.has(customerId)) {
        customerMap.set(customerId, {
          customerId: transaction.customerId._id,
          customerCode: transaction.customerId.customerId,
          customerName: transaction.customerId.name,
          dailyTotals: {
            'thu-2': 0,
            'thu-3': 0,
            'thu-4': 0,
            'thu-5': 0,
            'thu-6': 0,
            'thu-7': 0,
            'chu-nhat': 0,
          },
          total: 0,
        });
      }

      const customer = customerMap.get(customerId);
      customer.dailyTotals[dayOfWeek] += transaction.totals.netAmount;
      customer.total += transaction.totals.netAmount;
    });

    const customerReports = Array.from(customerMap.values());
    const grandTotal = customerReports.reduce((sum, c) => sum + c.total, 0);

    // Calculate daily totals across all customers
    const dailyTotals = {
      'thu-2': 0,
      'thu-3': 0,
      'thu-4': 0,
      'thu-5': 0,
      'thu-6': 0,
      'thu-7': 0,
      'chu-nhat': 0,
    };

    customerReports.forEach((customer) => {
      Object.keys(dailyTotals).forEach((day) => {
        dailyTotals[day] += customer.dailyTotals[day];
      });
    });

    res.status(200).json({
      success: true,
      data: {
        startDate: start,
        endDate: new Date(endDate),
        customers: customerReports,
        dailyTotals,
        grandTotal: Math.round(grandTotal * 100) / 100,
        transactionCount: transactions.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get available report dates
// @route   GET /api/reports/available-dates
// @access  Private
exports.getAvailableDates = async (req, res, next) => {
  try {
    // Get distinct dates from transactions
    const dates = await Transaction.distinct('date', {
      userId: req.user._id,
    });

    // Sort dates in descending order
    const sortedDates = dates
      .map((date) => date.toISOString().split('T')[0])
      .sort()
      .reverse();

    res.status(200).json({
      success: true,
      data: sortedDates,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get customer statistics
// @route   GET /api/reports/customer-stats/:customerId
// @access  Private
exports.getCustomerStats = async (req, res, next) => {
  try {
    const { customerId } = req.params;
    const { startDate, endDate } = req.query;

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

    // Build query
    const query = {
      userId: req.user._id,
      customerId,
    };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) {
        query.date.$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setDate(end.getDate() + 1);
        query.date.$lt = end;
      }
    }

    // Get transactions
    const transactions = await Transaction.find(query).sort({ date: -1 });

    // Calculate statistics
    const stats = {
      totalTransactions: transactions.length,
      totalAmount: 0,
      totalDiscount: 0,
      totalNetAmount: 0,
      averagePerTransaction: 0,
    };

    transactions.forEach((transaction) => {
      stats.totalAmount += transaction.totals.totalAmount;
      stats.totalDiscount += transaction.totals.discount;
      stats.totalNetAmount += transaction.totals.netAmount;
    });

    if (stats.totalTransactions > 0) {
      stats.averagePerTransaction = stats.totalNetAmount / stats.totalTransactions;
    }

    // Round values
    stats.totalAmount = Math.round(stats.totalAmount * 100) / 100;
    stats.totalDiscount = Math.round(stats.totalDiscount * 100) / 100;
    stats.totalNetAmount = Math.round(stats.totalNetAmount * 100) / 100;
    stats.averagePerTransaction = Math.round(stats.averagePerTransaction * 100) / 100;

    res.status(200).json({
      success: true,
      data: {
        customer: {
          id: customer._id,
          name: customer.name,
          customerId: customer.customerId,
        },
        stats,
        recentTransactions: transactions.slice(0, 10),
      },
    });
  } catch (error) {
    next(error);
  }
};