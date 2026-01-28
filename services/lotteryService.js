/**
 * Service to parse and calculate lottery data
 */

class LotteryService {
  /**
   * Parse raw lottery data into structured format
   * @param {string} rawData - Raw input data
   * @returns {object} Parsed data with categories
   */
  static parseData(rawData) {
    const result = {
      de: [],
      lo: [],
      x2: [],
      x3: [],
      x4: [],
      xiuNhay: [],
      baCang: [],
    };

    if (!rawData || typeof rawData !== 'string') {
      return result;
    }

    // Split by lines
    const lines = rawData.split('\n').filter((line) => line.trim());

    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Skip empty lines
      if (!trimmedLine) continue;

      // Parse each line format: "number amount" or "number.subNumber amount"
      const parts = trimmedLine.split(/\s+/);
      
      if (parts.length < 2) continue;

      const identifier = parts[0];
      const amount = parseFloat(parts[1]);

      if (isNaN(amount)) continue;

      // Determine category based on identifier format
      if (identifier.includes('.')) {
        // Xiên nhảy format: 1.1, 1.2, etc.
        const [main, sub] = identifier.split('.');
        if (main && sub && !isNaN(main) && !isNaN(sub)) {
          result.xiuNhay.push({
            number: identifier,
            amount: amount,
          });
        }
      } else if (identifier.length === 2 && !isNaN(identifier)) {
        // 2-digit number
        // Check if it's Đề or Lô based on context (default to both)
        // For now, we'll categorize based on the amount or let frontend specify
        result.de.push({
          number: identifier,
          amount: amount,
        });
        result.lo.push({
          number: identifier,
          amount: amount,
        });
      } else if (identifier.length === 3 && !isNaN(identifier)) {
        // 3-digit number - Ba càng
        result.baCang.push({
          number: identifier,
          amount: amount,
        });
      }
      // Add logic for X2, X3, X4 if needed based on specific formats
    }

    return result;
  }

  /**
   * Calculate totals based on customer prices
   * @param {object} processedData - Parsed lottery data
   * @param {object} customerPrices - Customer price configuration
   * @param {number} discountPercent - Discount percentage
   * @returns {object} Calculation result
   */
  static calculateTotals(processedData, customerPrices, discountPercent = 0) {
    let totalAmount = 0;

    // Calculate for each category
    if (processedData.de && processedData.de.length > 0) {
      totalAmount += processedData.de.reduce(
        (sum, item) => sum + item.amount * (customerPrices.de || 0),
        0
      );
    }

    if (processedData.lo && processedData.lo.length > 0) {
      totalAmount += processedData.lo.reduce(
        (sum, item) => sum + item.amount * (customerPrices.lo || 0),
        0
      );
    }

    if (processedData.x2 && processedData.x2.length > 0) {
      totalAmount += processedData.x2.reduce(
        (sum, item) => sum + item.amount * (customerPrices.x2 || 0),
        0
      );
    }

    if (processedData.x3 && processedData.x3.length > 0) {
      totalAmount += processedData.x3.reduce(
        (sum, item) => sum + item.amount * (customerPrices.x3 || 0),
        0
      );
    }

    if (processedData.x4 && processedData.x4.length > 0) {
      totalAmount += processedData.x4.reduce(
        (sum, item) => sum + item.amount * (customerPrices.x4 || 0),
        0
      );
    }

    if (processedData.xiuNhay && processedData.xiuNhay.length > 0) {
      totalAmount += processedData.xiuNhay.reduce(
        (sum, item) => sum + item.amount * (customerPrices.xiuNhay || 0),
        0
      );
    }

    if (processedData.baCang && processedData.baCang.length > 0) {
      totalAmount += processedData.baCang.reduce(
        (sum, item) => sum + item.amount * (customerPrices.baCang || 0),
        0
      );
    }

    // Calculate discount
    const discount = (totalAmount * discountPercent) / 100;
    const netAmount = totalAmount - discount;

    return {
      totalAmount: Math.round(totalAmount * 100) / 100,
      discount: Math.round(discount * 100) / 100,
      netAmount: Math.round(netAmount * 100) / 100,
    };
  }

  /**
   * Format output text for display
   * @param {object} processedData - Parsed lottery data
   * @param {object} customerPrices - Customer price configuration
   * @param {object} totals - Calculation totals
   * @returns {string} Formatted output text
   */
  static formatOutput(processedData, customerPrices, totals) {
    let output = '';

    // Add each category
    const addCategory = (title, items, price) => {
      if (items && items.length > 0) {
        output += `\n${title}:\n`;
        items.forEach((item) => {
          const total = item.amount * price;
          output += `${item.number} - ${item.amount} x ${price} = ${total.toFixed(2)}\n`;
        });
      }
    };

    addCategory('Đề', processedData.de, customerPrices.de);
    addCategory('Lô', processedData.lo, customerPrices.lo);
    addCategory('Xiên 2', processedData.x2, customerPrices.x2);
    addCategory('Xiên 3', processedData.x3, customerPrices.x3);
    addCategory('Xiên 4', processedData.x4, customerPrices.x4);
    addCategory('Xiên nhảy', processedData.xiuNhay, customerPrices.xiuNhay);
    addCategory('Ba càng', processedData.baCang, customerPrices.baCang);

    // Add totals
    output += `\n${'='.repeat(40)}\n`;
    output += `Tổng tiền: ${totals.totalAmount.toFixed(2)}\n`;
    output += `Chiết khấu: ${totals.discount.toFixed(2)}\n`;
    output += `Thực nhận: ${totals.netAmount.toFixed(2)}\n`;

    return output;
  }
}

module.exports = LotteryService;