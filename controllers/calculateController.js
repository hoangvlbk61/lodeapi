const lotteryService = require("../services/lotteryService");
const Result = require("../models/Result");
const { format, parse, isValid, subDays, parseISO } = require("date-fns");

// ─── Smart date parser (đồng bộ với lotteryResultService) ────────────────────
const DATE_FORMATS = [
    "dd-M-yyyy",
    "dd/M/yyyy",
    "dd-MM-yyyy",
    "dd/MM/yyyy",
    "d-M-yyyy",
    "d/M/yyyy",
    "yyyy-MM-dd",
    "yyyy/MM/dd",
    "M/dd/yyyy",
    "MM/dd/yyyy",
    "M-dd-yyyy",
    "MM-dd-yyyy",
];

const toStandardDate = (dateStr) => {
    if (!dateStr) throw new Error("Date is required");

    // Nếu đã là YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
    }

    // Nếu là DD-MM-YYYY hoặc DD/MM/YYYY
    if (/^\d{2}[-/]\d{2}[-/]\d{4}$/.test(dateStr)) {
        const parts = dateStr.split(/[-/]/);
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }

    throw new Error("Invalid date format. Use YYYY-MM-DD or DD-MM-YYYY");
};

/**
 * Tìm kết quả xổ số, fallback về ngày trước nếu không có
 * @param {string} targetDate - YYYY-MM-DD
 * @param {number} maxDaysBack - Số ngày tối đa để tìm lùi (default: 7)
 * @returns {Promise<{result: Object, actualDate: string, daysBack: number}>}
 */
const findResultWithFallback = async (targetDate, maxDaysBack = 7) => {
  let currentDate = targetDate;
  let daysBack = 0;
 
  for (let i = 0; i <= maxDaysBack; i++) {
    console.log(`🔍 Searching result for: ${currentDate}`);
    
    const result = await Result.findOne({ date: currentDate });
    
    if (result) {
      console.log(`✅ Found result for: ${currentDate} (${i} days back)`);
      return {
        result,
        actualDate: currentDate,
        daysBack: i,
        isFallback: i > 0
      };
    }
    
    // Lùi về 1 ngày
    const dateObj = parseISO(currentDate);
    currentDate = format(subDays(dateObj, 1), 'yyyy-MM-dd');
    daysBack++;
  }
 
  return null;
};

// @desc    Step 1: Tách tin nhắn thành các dòng
// @route   POST /api/calculate/split
// @access  Private
exports.splitMessage = async (req, res, next) => {
    try {
        const { message } = req.body;

        if (!message || typeof message !== "string") {
            return res.status(400).json({
                success: false,
                message: "Vui lòng cung cấp message (string)",
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
            if (!message || typeof message !== "string") {
                return res.status(400).json({
                    success: false,
                    message:
                        "Vui lòng cung cấp message (string) hoặc lines (array từ bước 1)",
                });
            }
            inputLines = lotteryService.splitMessage(message);
        }

        // CRITICAL: Expand dàn segments 
        // "de dan 4-9, bo 18 x5k" → ["de dan 4-9 x5k", "de bo 18 x5k"]
        const expandedLines = [];
        inputLines.forEach(line => {
            const danSegments = lotteryService.splitDanSegments(line);
            expandedLines.push(...danSegments);
        });

        console.log('📝 Input lines:', inputLines);
        console.log('📝 Expanded lines:', expandedLines);

        const parsed = lotteryService.parseDetails(expandedLines);

        // Tách theo category để FE dễ hiển thị
        const grouped = {};
        parsed.forEach((item) => {
            let cat;
            
            // Nếu là dàn, tách riêng category cho từng dàn
            if (item.isDan) {
                const danKey = `${item.danType}${item.danValue !== undefined ? ' ' + item.danValue : ''}`;
                cat = `${item.type}_${danKey}`;
            } else if (item.type === "de" || item.type === "lo") {
                cat = item.type;
            } else if (item.type === "xien" && item.numbers) {
                cat = `xien${item.numbers.length}`;
            } else if (item.type.startsWith("xien")) {
                cat = item.type;
            } else {
                cat = "unknown";
            }

            if (!grouped[cat]) grouped[cat] = [];
            grouped[cat].push(item);
        });

        res.status(200).json({
            success: true,
            data: {
                lines: inputLines,
                expandedLines,  // Show expanded lines for debugging
                parsed,
                grouped,
                totalBets: parsed.length,
                validBets: parsed.filter((p) => p.isValid).length,
                invalidBets: parsed.filter((p) => !p.isValid).length,
            },
        });
    } catch (error) {
        next(error);
    }
};


/**
 * @desc    Finalize and summarize bets with KQXS
 * @route   POST /api/transactions/finalize
 * @access  Private
 */
exports.finalizeAndSummarize = async (req, res, next) => {
  try {
    const { message, lines, parsed, date } = req.body;
 
    // =========================================================================
    // STEP 1: Lấy parsed bets
    // =========================================================================
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
      
      // CRITICAL: Expand dàn segments trước khi parse
      const expandedLines = [];
      inputLines.forEach(line => {
        const danSegments = lotteryService.splitDanSegments(line);
        expandedLines.push(...danSegments);
      });
      
      console.log('📝 Expanded lines for finalize:', expandedLines);
      
      parsedBets = lotteryService.parseDetails(expandedLines);
    }
 
    // =========================================================================
    // STEP 2: Validate date
    // =========================================================================
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp date (DD-MM-YYYY hoặc YYYY-MM-DD)',
      });
    }
 
    let standardDate;
    try {
      standardDate = toStandardDate(date);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }
 
    // =========================================================================
    // STEP 3: Tìm kết quả xổ số (với fallback)
    // =========================================================================
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🎯 Finding KQXS for date: ${standardDate}`);
    console.log('='.repeat(60));
 
    const foundData = await findResultWithFallback(standardDate, 7);
 
    if (!foundData) {
      console.log(`❌ No result found for ${standardDate} (checked 7 days back)`);
      return res.status(404).json({
        success: false,
        message: `Không tìm thấy kết quả xổ số cho ngày ${standardDate} (đã tìm lùi 7 ngày)`,
      });
    }
 
    const { result: kqxs, actualDate, daysBack, isFallback } = foundData;
 
    // Log fallback info
    if (isFallback) {
      console.log(`⚠️  Using fallback: ${actualDate} (${daysBack} days before ${standardDate})`);
    }
 
    // =========================================================================
    // STEP 4: Finalize bets
    // =========================================================================
    console.log(`\n✅ Using KQXS from: ${actualDate}`);
    console.log(`   - ĐB: ${kqxs.results?.DB?.[0] || 'N/A'}`);
    console.log(`   - G1: ${kqxs.results?.G1?.[0] || 'N/A'}`);
 
    const finalized = lotteryService.finalize(parsedBets, kqxs);
 
    // =========================================================================
    // STEP 5: Summarize
    // =========================================================================
    const summary = lotteryService.summarize(finalized);
 
    // =========================================================================
    // STEP 6: Extract 2 số cuối để FE hiển thị
    // =========================================================================
    const deLast2 = lotteryService.getDeLast2(kqxs.results);
    const allLast2 = lotteryService.getLast2Digits(kqxs.results);
 
    console.log(`\n📊 Summary:`);
    console.log(`   - Total bets: ${finalized.length}`);
    console.log(`   - Win: ${finalized.filter(f => f.win).length}`);
    console.log(`   - Lose: ${finalized.filter(f => !f.win).length}`);
    
    // Log summary details
    console.log(`\n📋 Summary by category:`);
    Object.keys(summary).forEach(cat => {
      const g = summary[cat];
      console.log(`   ${cat}: ${g.summary}`);
    });
    
    console.log('='.repeat(60) + '\n');
 
    // =========================================================================
    // STEP 7: Response với format tổng kết
    // =========================================================================
    
    // Tính tổng kết theo category
    const categorySummary = {};
    Object.keys(summary).forEach(cat => {
      const g = summary[cat];
      
      // Tính tổng tiền đánh (totalBet)
      const totalBet = g.totalDanAmount || g.totalPoints || 0;
      
      // Tính tổng tiền trúng (totalWin)
      const totalWin = g.winPoints || 0;
      
      categorySummary[cat] = {
        label: g.label,
        danType: g.danType || null,
        danValue: g.danValue || null,
        totalBet: totalBet,           // Tổng tiền đánh
        totalWin: totalWin,            // Tổng tiền trúng
        summary: `${totalWin}/${totalBet}`,  // Format: trúng/đánh
        totalCount: g.totalCount,
        winCount: g.winCount,
        loseCount: g.loseCount,
        isDan: g.isDan || false,
      };
    });
    
    // Tính grand total (all categories)
    const grandTotal = {
      totalBet: Object.values(categorySummary).reduce((sum, cat) => sum + cat.totalBet, 0),
      totalWin: Object.values(categorySummary).reduce((sum, cat) => sum + cat.totalWin, 0),
    };
    grandTotal.summary = `${grandTotal.totalWin}/${grandTotal.totalBet}`;
    
    console.log(`\n📊 Grand Total: ${grandTotal.summary}`);
    
    res.status(200).json({
      success: true,
      data: {
        kqxs: {
          requestedDate: standardDate,
          actualDate: actualDate,
          isFallback: isFallback,
          daysBack: daysBack,
          ...(isFallback && { 
            fallbackMessage: `Sử dụng kết quả ngày ${actualDate} (${daysBack} ngày trước)` 
          }),
          deLast2,
          allLast2,
          fullResults: kqxs.results,
        },
        finalized,
        summary: categorySummary,        // NEW: Formatted summary
        rawSummary: summary,              // Original summary for reference
        grandTotal,                       // NEW: Total across all categories
        totalBets: finalized.length,
        totalWin: finalized.filter(f => f.win).length,
        totalLose: finalized.filter(f => !f.win).length,
      },
    });
  } catch (error) {
    console.error('❌ Error in finalizeAndSummarize:', error);
    next(error);
  }
};