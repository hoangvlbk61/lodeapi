const lotteryService = require('../services/lotteryService');
const Result = require('../models/Result');
const { format, parse, isValid } = require('date-fns');

// ─── Smart date parser (đồng bộ với lotteryResultService) ────────────────────
const DATE_FORMATS = [
  'dd-M-yyyy', 'dd/M/yyyy', 'dd-MM-yyyy', 'dd/MM/yyyy',
  'd-M-yyyy', 'd/M/yyyy', 'yyyy-MM-dd', 'yyyy/MM/dd',
  'M/dd/yyyy', 'MM/dd/yyyy', 'M-dd-yyyy', 'MM-dd-yyyy',
];

function toStandardDate(dateStr) {
  if (!dateStr) throw new Error('Date string is empty');
  const trimmed = String(dateStr).trim();

  const native = new Date(trimmed);
  if (isValid(native) && !isNaN(native.getTime())) {
    return format(native, 'yyyy-MM-dd');
  }

  for (const fmt of DATE_FORMATS) {
    try {
      const parsed = parse(trimmed, fmt, new Date());
      if (isValid(parsed)) {
        const year = parsed.getFullYear();
        if (year >= 2000 && year <= 2099) return format(parsed, 'yyyy-MM-dd');
      }
    } catch {}
  }

  throw new Error(`Không thể parse ngày: "${dateStr}"`);
}

// @desc    Step 1: Tách tin nhắn thành các dòng
// @route   POST /api/calculate/split
// @access  Private
exports.splitMessage = async (req, res, next) => {
  try {
    const { message } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp message (string)',
      });
    }

    const lines = lotteryService.splitMessage(message);

    res.status(200).json({
      success: true,
      data: {
        original: message,
        lines,
        count: lines.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Step 2: Phân tích chi tiết — tách ra toàn bộ các con (đề, lô, xiên 2, xiên 3, xiên 4)
// @route   POST /api/calculate/parse
// @access  Private
exports.parseDetails = async (req, res, next) => {
  try {
    const { message, lines } = req.body;

    // Chấp nhận cả message (string gốc) hoặc lines (mảng đã tách từ step 1)
    let inputLines = lines;
    if (!inputLines) {
      if (!message || typeof message !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Vui lòng cung cấp message (string) hoặc lines (array từ bước 1)',
        });
      }
      inputLines = lotteryService.splitMessage(message);
    }

    const parsed = lotteryService.parseDetails(inputLines);

    // Tách theo category để FE dễ hiển thị
    const grouped = {};
    parsed.forEach(item => {
      let cat;
      if (item.type === 'de' || item.type === 'lo') {
        cat = item.type;
      } else if (item.type === 'xien' && item.numbers) {
        cat = `xien${item.numbers.length}`;
      } else if (item.type.startsWith('xien')) {
        cat = item.type;
      } else {
        cat = 'unknown';
      }

      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(item);
    });

    res.status(200).json({
      success: true,
      data: {
        lines: inputLines,
        parsed,
        grouped,
        totalBets: parsed.length,
        validBets: parsed.filter(p => p.isValid).length,
        invalidBets: parsed.filter(p => !p.isValid).length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Step 3: Tính tiền — so sánh với KQXS và tổng hợp (bao nhiêu/bao nhiêu)
// @route   POST /api/calculate/finalize
// @access  Private
exports.finalizeAndSummarize = async (req, res, next) => {
  try {
    const { message, lines, parsed, date } = req.body;

    // --- Lấy parsed bets ---
    let parsedBets = parsed;
    if (!parsedBets) {
      let inputLines = lines;
      if (!inputLines) {
        if (!message || typeof message !== 'string') {
          return res.status(400).json({
            success: false,
            message: 'Vui lòng cung cấp message, lines, hoặc parsed',
          });
        }
        inputLines = lotteryService.splitMessage(message);
      }
      parsedBets = lotteryService.parseDetails(inputLines);
    }

    // --- Lấy KQXS ---
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp date (DD-MM-YYYY hoặc YYYY-MM-DD)',
      });
    }

    // Tìm kết quả xổ số trong DB
    let standardDate;
    try {
      standardDate = toStandardDate(date);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    const kqxs = await Result.findOne({ date: standardDate });
    if (!kqxs) {
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy kết quả xổ số ngày ${standardDate}`,
      });
    }

    // --- Finalize ---
    const finalized = lotteryService.finalize(parsedBets, kqxs);

    // --- Summarize ---
    const summary = lotteryService.summarize(finalized);

    // --- Tính 2 số cuối để FE hiển thị ---
    const deLast2 = lotteryService.getDeLast2(kqxs.results);
    const allLast2 = lotteryService.getLast2Digits(kqxs.results);

    res.status(200).json({
      success: true,
      data: {
        kqxs: {
          date: kqxs.date || kqxs.time,
          deLast2,
          allLast2,
        },
        finalized,
        summary,
        totalBets: finalized.length,
        totalWin: finalized.filter(f => f.win).length,
        totalLose: finalized.filter(f => !f.win).length,
      },
    });
  } catch (error) {
    next(error);
  }
};