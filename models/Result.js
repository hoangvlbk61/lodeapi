const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema(
  {
    // Key chính là ngày (format: YYYY-MM-DD)
    date: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    // Thời gian từ API (ISO string)
    time: {
      type: String,
      required: true,
    },
    // Lưu toàn bộ data từ API response
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    // Các số trúng thưởng (parsed từ data.results)
    results: {
      DB: [String],  // Giải Đặc Biệt
      G1: [String],  // Giải Nhất
      G2: [String],  // Giải Nhì
      G3: [String],  // Giải Ba
      G4: [String],  // Giải Tư
      G5: [String],  // Giải Năm
      G6: [String],  // Giải Sáu
      G7: [String],  // Giải Bảy
    },
    // Trạng thái
    status: {
      type: String,
      enum: ['pending', 'complete', 'error'],
      default: 'pending',
    },
    // Metadata
    fetchedAt: {
      type: Date,
      default: Date.now,
    },
    source: {
      type: String,
      default: 'api-xsmb-today.onrender.com',
    },
  },
  {
    timestamps: true,
  }
);

// Index cho tìm kiếm theo ngày
resultSchema.index({ date: -1 });
resultSchema.index({ fetchedAt: -1 });

// Static method: Tìm kết quả theo ngày
resultSchema.statics.findByDate = function (date) {
  return this.findOne({ date });
};

// Static method: Lấy kết quả mới nhất
resultSchema.statics.getLatest = function () {
  return this.findOne().sort({ date: -1 });
};

// Static method: Lấy kết quả trong khoảng thời gian
resultSchema.statics.getByDateRange = function (startDate, endDate) {
  return this.find({
    date: {
      $gte: startDate,
      $lte: endDate,
    },
  }).sort({ date: -1 });
};

// Instance method: Parse results từ data
resultSchema.methods.parseResults = function () {
  // Parse từ data.results
  if (this.data && this.data.results) {
    this.results = {
      DB: this.data.results.DB || [],
      G1: this.data.results.G1 || [],
      G2: this.data.results.G2 || [],
      G3: this.data.results.G3 || [],
      G4: this.data.results.G4 || [],
      G5: this.data.results.G5 || [],
      G6: this.data.results.G6 || [],
      G7: this.data.results.G7 || [],
    };
  }
  return this.results;
};

// Instance method: Kiểm tra số trúng thưởng
resultSchema.methods.checkNumber = function (number) {
  const numberStr = String(number).padStart(2, '0');
  const results = this.results || this.parseResults();

  const matches = [];

  // Helper function to check if number ends with numberStr
  const checkMatch = (nums, prizeName) => {
    if (nums && Array.isArray(nums)) {
      nums.forEach((num) => {
        if (num && num.endsWith(numberStr)) {
          matches.push({ 
            prize: prizeName, 
            number: num,
            last2: num.slice(-2),
            last3: num.slice(-3)
          });
        }
      });
    }
  };

  // Check từng giải
  checkMatch(results.DB, 'Giải Đặc Biệt');
  checkMatch(results.G1, 'Giải Nhất');
  checkMatch(results.G2, 'Giải Nhì');
  checkMatch(results.G3, 'Giải Ba');
  checkMatch(results.G4, 'Giải Tư');
  checkMatch(results.G5, 'Giải Năm');
  checkMatch(results.G6, 'Giải Sáu');
  checkMatch(results.G7, 'Giải Bảy');

  return matches;
};

const Result = mongoose.model('Result', resultSchema);

module.exports = Result;