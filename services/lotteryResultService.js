const axios = require('axios');
const Result = require('../models/Result');
const { format, parse, isValid } = require('date-fns');
const { HttpsProxyAgent } = require('https-proxy-agent');

const LOTTERY_API_URL = 'https://api-xsmb-today.onrender.com/api/v1';
const HTTP_PROXY = 'http://hoangvl:tsdv2025B@10.116.16.12:3128';

// ─── Smart Date Parser ───────────────────────────────────────────────────────
// Hỗ trợ các định dạng: 15-3-2026, 15/03/2026, 2026-03-15, 03/15/2026, ...

const DATE_FORMATS = [
  'dd-M-yyyy',    // 15-3-2026
  'dd/M/yyyy',    // 15/3/2026
  'dd-MM-yyyy',   // 15-03-2026
  'dd/MM/yyyy',   // 15/03/2026
  'd-M-yyyy',     // 5-3-2026
  'd/M/yyyy',     // 5/3/2026
  'yyyy-MM-dd',   // 2026-03-15
  'yyyy/MM/dd',   // 2026/03/15
  'M/dd/yyyy',    // 3/15/2026
  'MM/dd/yyyy',   // 03/15/2026
  'M-dd-yyyy',    // 3-15-2026
  'MM-dd-yyyy',   // 03-15-2026
];

/**
 * Parse chuỗi ngày với nhiều định dạng khác nhau
 * @param {string} dateStr - Chuỗi ngày (VD: '15-3-2026', '2026-03-15', ...)
 * @returns {Date} - Date object hợp lệ
 * @throws {Error} - Nếu không parse được
 */
function parseFlexibleDate(dateStr) {
  if (!dateStr) throw new Error('Date string is empty');

  const trimmed = String(dateStr).trim();

  // 1. Thử native Date trước (hoạt động tốt với ISO format)
  const native = new Date(trimmed);
  if (isValid(native) && !isNaN(native.getTime())) {
    return native;
  }

  // 2. Thử từng format với date-fns parse
  for (const fmt of DATE_FORMATS) {
    try {
      const parsed = parse(trimmed, fmt, new Date());
      if (isValid(parsed)) {
        // Kiểm tra thêm: năm phải hợp lý (2000-2099)
        const year = parsed.getFullYear();
        if (year >= 2000 && year <= 2099) {
          return parsed;
        }
      }
    } catch {
      // Thử format tiếp theo
    }
  }

  throw new Error(`Không thể parse ngày: "${dateStr}". Hỗ trợ: dd-MM-yyyy, dd/MM/yyyy, yyyy-MM-dd, ...`);
}

/**
 * Parse chuỗi ngày và trả về format chuẩn yyyy-MM-dd
 * @param {string} dateStr
 * @returns {string} - VD: '2026-03-15'
 */
function toStandardDate(dateStr) {
  const d = parseFlexibleDate(dateStr);
  return format(d, 'yyyy-MM-dd');
}

// ─── Service ─────────────────────────────────────────────────────────────────

class LotteryResultService {
  /**
   * Fetch kết quả từ API
   */
  async fetchResult() {
    try {
      console.log('📡 Fetching lottery result from API...');

      const axiosConfig = {
        timeout: 30000,
        headers: {
          'User-Agent': 'Lottery-Management-System/1.0',
        },
      };

      // Sử dụng proxy nếu có
      const proxyUrl = process.env.HTTP_PROXY || process.env.http_proxy || HTTP_PROXY;
      if (proxyUrl) {
        console.log(`🔀 Using proxy: ${proxyUrl}`);
        axiosConfig.httpsAgent = new HttpsProxyAgent(proxyUrl);
        axiosConfig.proxy = false;
      }

      const response = await axios.get(LOTTERY_API_URL, axiosConfig);

      if (!response.data) {
        throw new Error('No data received from API');
      }

      console.log('✅ Data fetched successfully:', response.data);
      if(response.data.results) {
        response.data.results.DB = response.data.results.DB || response.data.results["ĐB"]
      }
      return response.data;
    } catch (error) {
      console.error('❌ Error fetching lottery result:', error.message);
      throw error;
    }
  }

  /**
   * Parse và lưu kết quả vào database
   */
  async saveResult(data) {
    try {
      // Lấy time từ data — hỗ trợ mọi format ngày
      const resultTime = data.time || new Date().toISOString();
      const resultDate = toStandardDate(resultTime);

      console.log(`💾 Saving result for date: ${resultDate} (raw: "${resultTime}")`);

      // Check xem đã có kết quả cho ngày này chưa
      let result = await Result.findOne({ date: resultDate });

      if (result) {
        console.log(`📝 Updating existing result for ${resultDate}`);

        result.time = resultTime;
        result.data = data;
        result.status = 'complete';
        result.fetchedAt = new Date();

        // Parse results
        result.parseResults();

        await result.save();
      } else {
        console.log(`➕ Creating new result for ${resultDate}`);

        result = new Result({
          date: resultDate,
          time: resultTime,
          data: data,
          status: 'complete',
          fetchedAt: new Date(),
        });

        // Parse results từ data.results
        console.log("🚀 ~ LotteryResultService ~ saveResult ~ data.results:", data.results)
        if (data.results) {
          result.results = {
            DB: data.results.DB || [],
            G1: data.results.G1 || [],
            G2: data.results.G2 || [],
            G3: data.results.G3 || [],
            G4: data.results.G4 || [],
            G5: data.results.G5 || [],
            G6: data.results.G6 || [],
            G7: data.results.G7 || [],
          };
        }

        await result.save();
      }

      console.log(`✅ Result saved successfully for ${resultDate}`);
      console.log(`   - ĐB: ${result.results?.DB?.[0] || 'N/A'}`);
      console.log(`   - G1: ${result.results?.G1?.[0] || 'N/A'}`);

      return result;
    } catch (error) {
      console.error('❌ Error saving result:', error.message);
      throw error;
    }
  }

  /**
   * Fetch và lưu kết quả (main function)
   */
  async fetchAndSave() {
    try {
      console.log('🎯 Starting fetch and save process...');

      const data = await this.fetchResult();
      const result = await this.saveResult(data);

      console.log('🎉 Fetch and save completed successfully!');
      return result;
    } catch (error) {
      console.error('❌ Fetch and save failed:', error.message);

      // Lưu error result
      const today = format(new Date(), 'yyyy-MM-dd');
      try {
        await Result.findOneAndUpdate(
          { date: today },
          {
            date: today,
            time: new Date().toISOString(),
            data: { error: error.message },
            status: 'error',
            fetchedAt: new Date(),
          },
          { upsert: true }
        );
      } catch (saveError) {
        console.error('Failed to save error result:', saveError.message);
      }

      throw error;
    }
  }

  /**
   * Get result by date — hỗ trợ mọi format ngày
   */
  async getResultByDate(date) {
    try {
      const formattedDate = toStandardDate(date);
      const result = await Result.findByDate(formattedDate);
      return result;
    } catch (error) {
      console.error('Error getting result by date:', error.message);
      throw error;
    }
  }

  /**
   * Get latest result
   */
  async getLatestResult() {
    try {
      const result = await Result.getLatest();
      return result;
    } catch (error) {
      console.error('Error getting latest result:', error.message);
      throw error;
    }
  }

  /**
   * Get results in date range — hỗ trợ mọi format ngày
   */
  async getResultsByDateRange(startDate, endDate) {
    try {
      const formattedStart = toStandardDate(startDate);
      const formattedEnd = toStandardDate(endDate);
      const results = await Result.getByDateRange(formattedStart, formattedEnd);
      return results;
    } catch (error) {
      console.error('Error getting results by date range:', error.message);
      throw error;
    }
  }

  /**
   * Check number against result — hỗ trợ mọi format ngày
   */
  async checkNumberForDate(date, number) {
    try {
      const result = await this.getResultByDate(date);
      if (!result) {
        return { found: false, message: 'No result found for this date' };
      }

      const matches = result.checkNumber(number);
      return {
        found: matches.length > 0,
        date: result.date,
        number: number,
        matches: matches,
      };
    } catch (error) {
      console.error('Error checking number:', error.message);
      throw error;
    }
  }
}

module.exports = new LotteryResultService();