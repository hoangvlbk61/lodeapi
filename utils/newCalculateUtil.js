// =============================================================================
// KEYWORDS
// =============================================================================
const lStarts = ["lo", "Lo", "Lô", "lô", "L"];
const dStarts = ["đề", "đê", "Đề", "Đê", "de", "De", "D", "đ"];
const xqStarts = ["xiên quây", "Quay", "quay", "Xiên Quây", "xq", "XQ", "Xq", "xQ", "x2", "x3", "x4"];
const xStarts = ["xiên", "xn", "Xiên"];

// Sort by length DESC so longer keywords match first
const ALL_KEYWORDS = [...lStarts, ...dStarts, ...xqStarts, ...xStarts].sort((a, b) => b.length - a.length);

// =============================================================================
// STEP 1: splitMessage — tách tin nhắn thành các dòng theo keyword đầu
// =============================================================================
const splitMessage = (input) => {
  if (!input) return [];

  // Tìm tất cả vị trí keyword xuất hiện (đầu chuỗi hoặc sau khoảng trắng)
  const positions = [];
  const lowerInput = input.toLowerCase();

  for (const kw of ALL_KEYWORDS) {
    const lowerKw = kw.toLowerCase();
    let searchFrom = 0;

    while (searchFrom < input.length) {
      const idx = lowerInput.indexOf(lowerKw, searchFrom);
      if (idx === -1) break;

      // keyword phải ở đầu chuỗi hoặc đứng sau khoảng trắng
      const isStart = idx === 0 || /\s/.test(input[idx - 1]);
      // Sau keyword phải là khoảng trắng hoặc số (để không match giữa từ)
      // Đặc biệt: x2, x3, x4 chỉ match khi sau nó là khoảng trắng (tránh nhầm x20k)
      const afterIdx = idx + kw.length;
      const isAmountKeyword = /^x\d$/i.test(kw);
      const isEnd = afterIdx >= input.length ||
        (isAmountKeyword ? /\s/.test(input[afterIdx]) : /[\s\d]/.test(input[afterIdx]));

      if (isStart && isEnd) {
        // Kiểm tra xem vị trí này đã bị keyword dài hơn chiếm chưa
        const alreadyCovered = positions.some(
          p => idx >= p.index && idx < p.index + p.kwLength
        );
        if (!alreadyCovered) {
          positions.push({ index: idx, kwLength: kw.length, keyword: kw });
        }
      }
      searchFrom = idx + 1;
    }
  }

  if (positions.length === 0) return [input.trim()];

  // Sort theo vị trí
  positions.sort((a, b) => a.index - b.index);

  // Tách chuỗi
  const results = [];
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].index;
    const end = positions[i + 1] ? positions[i + 1].index : input.length;
    const segment = input.substring(start, end).trim();
    if (segment) results.push(segment);
  }

  return results;
};

// =============================================================================
// HELPERS
// =============================================================================

// Lấy cặp đối xứng từ số 3 chữ số: 131 → [13, 31]
const getSymmetricPairs = (numStr) => {
  if (numStr.length !== 3) return null;
  if (numStr[0] !== numStr[2]) return null;
  return [numStr[0] + numStr[1], numStr[1] + numStr[0]];
};

// Xác định type từ dòng
const detectType = (line) => {
  const lower = line.toLowerCase();
  if (dStarts.some(k => lower.startsWith(k.toLowerCase()))) return 'de';
  if (lStarts.some(k => lower.startsWith(k.toLowerCase()))) return 'lo';
  if (xqStarts.some(k => lower.startsWith(k.toLowerCase()))) return 'xq';
  if (xStarts.some(k => lower.startsWith(k.toLowerCase()))) return 'xien';
  return 'unknown';
};

// Xóa keyword đầu dòng
const stripKeyword = (line) => {
  let content = line;
  for (const kw of ALL_KEYWORDS) {
    const reg = new RegExp(`^${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'i');
    const newContent = content.replace(reg, '');
    if (newContent !== content) {
      content = newContent;
      break; // Chỉ xóa keyword đầu tiên khớp
    }
  }
  return content;
};

// Parse tiền: "15n" → { amount: "15", unit: "n" } ; "6k" → ...
const parseAmount = (amountStr) => {
  const m = amountStr.match(/^([0-9.]+)\s*([knđd])$/i);
  if (!m) return null;
  return { raw: amountStr, amount: m[1], unit: m[2] };
};

// Tách "con xiên" từ chuỗi dạng "12.34.56" hoặc "12-34-56" hoặc "12;34;56"
// Mỗi con xiên gồm các số 2 chữ số
const parseXienNumbers = (numsStr) => {
  // Tách bằng . hoặc - hoặc ;
  return numsStr.split(/[.\-;]/).map(s => s.trim()).filter(s => s.length > 0);
};

// Tạo tổ hợp C(n,k)
const combinations = (arr, k) => {
  if (k === 1) return arr.map(x => [x]);
  if (k === arr.length) return [arr.slice()];
  const result = [];
  const recurse = (start, combo) => {
    if (combo.length === k) {
      result.push([...combo]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      recurse(i + 1, combo);
      combo.pop();
    }
  };
  recurse(0, []);
  return result;
};

// =============================================================================
// STEP 2: parseDetails — phân tích chi tiết từng dòng
// =============================================================================
const parseDetails = (lines) => {
  const finalResults = [];

  lines.forEach(line => {
    const type = detectType(line);
    const content = stripKeyword(line);

    if (type === 'de' || type === 'lo') {
      // ĐỀ / LÔ: tách thành các cụm [số...] x [tiền][đơn vị]
      // Pattern: một hoặc nhiều số (cách bằng . hoặc khoảng trắng) rồi x+tiền hoặc tiền+đơn vị
      // VD: "131.434 x15n 454.656 x6k 23 12.13 x4đ"
      const pattern = /([\d][\d.\s]*?)\s*x\s*([0-9.]+[knđd])/gi;
      let match;
      let foundAny = false;

      while ((match = pattern.exec(content)) !== null) {
        foundAny = true;
        const rawNums = match[1];
        const amountUnit = match[2];

        // Tách các cụm số bằng dấu . hoặc khoảng trắng
        const segments = rawNums.split(/[.\s]+/).filter(n => n.length > 0);

        segments.forEach(seg => {
          if (seg.length === 3) {
            const pairs = getSymmetricPairs(seg);
            if (pairs) {
              pairs.forEach(p => finalResults.push({ type, number: p, amount: amountUnit, isValid: true }));
            } else {
              finalResults.push({ type, number: seg, amount: amountUnit, isValid: false, error: `Số 3 chữ số không đối xứng: ${seg}` });
            }
          } else if (seg.length === 2) {
            finalResults.push({ type, number: seg, amount: amountUnit, isValid: true });
          } else {
            finalResults.push({ type, number: seg, amount: amountUnit, isValid: false, error: `Số không hợp lệ: ${seg}` });
          }
        });
      }

      if (!foundAny) {
        finalResults.push({ type, number: '?', amount: '?', isValid: false, originalLine: line, error: 'Không parse được' });
      }

    } else if (type === 'xien') {
      // XIÊN: "12.21 x10k" → 1 con xiên gồm [12, 21]
      // Có thể nhiều con xiên cách nhau bằng khoảng trắng (giữa cụm số+tiền)
      // Pattern: cụm số (nối bằng . - ;) rồi x+tiền
      const pattern = /([\d][\d.\-;]*?)\s*x\s*([0-9.]+[knđd])/gi;
      let match;
      let foundAny = false;

      while ((match = pattern.exec(content)) !== null) {
        foundAny = true;
        const rawNums = match[1];
        const amountUnit = match[2];

        const numbers = parseXienNumbers(rawNums);

        // Validate: xiên cần ít nhất 2 số, mỗi số 2 chữ số
        const validNumbers = numbers.filter(n => n.length === 2);
        const invalidNumbers = numbers.filter(n => n.length !== 2);

        if (validNumbers.length >= 2) {
          finalResults.push({
            type: 'xien',
            numbers: validNumbers,
            amount: amountUnit,
            isValid: invalidNumbers.length === 0,
            ...(invalidNumbers.length > 0 && { error: `Số không hợp lệ trong xiên: ${invalidNumbers.join(', ')}` })
          });
        } else {
          finalResults.push({ type: 'xien', number: '?', amount: amountUnit, isValid: false, originalLine: line, error: `Xiên cần ít nhất 2 số 2 chữ số` });
        }
      }

      if (!foundAny) {
        finalResults.push({ type: 'xien', number: '?', amount: '?', isValid: false, originalLine: line, error: 'Không parse được xiên' });
      }

    else if (type === 'xq') {
  const fullContent = content.trim();
  
  // Pattern cải tiến: amount dừng ngay trước . hoặc space hoặc ký tự tiếp theo không phải số/đơn vị
  const amountPattern = /x\s*([0-9.]+[knđd]?)(?=\s*[\s.,x]|$)/gi;
  
  let amountMatch;
  let prevEnd = 0;
  let foundAny = false;

  while ((amountMatch = amountPattern.exec(fullContent)) !== null) {
    foundAny = true;
    const amountUnit = amountMatch[1];           // chỉ lấy "100", "100n", ...
    const matchFull = amountMatch[0];            // ví dụ: "x100"
    const xStart = amountMatch.index;

    // Lấy phần numbers trước "x" này
    let rawNums = fullContent.substring(prevEnd, xStart).trim();
    prevEnd = xStart + matchFull.length;

    if (!rawNums) continue;

    // SMART SPLIT
    let xqGroups = rawNums.includes(',')
      ? rawNums.split(/\s*,\s*/).filter(s => s.length > 0)
      : rawNums.split(/\s+/).filter(s => s.length > 0);

    xqGroups.forEach(group => {
      const numbers = parseXienNumbers(group);
      const expandedNumbers = [];
      let hasError = false;
      let errorMsg = '';

      numbers.forEach(num => {
        if (num.length === 2) {
          expandedNumbers.push(num);
        } else if (num.length === 3) {
          const pairs = getSymmetricPairs(num);
          if (pairs) expandedNumbers.push(...pairs);
          else {
            hasError = true;
            errorMsg = `Số 3 chữ số không đối xứng trong XQ: ${num}`;
          }
        } else {
          hasError = true;
          errorMsg = `Số không hợp lệ trong XQ: ${num}`;
        }
      });

      if (hasError) {
        finalResults.push({ type: 'xq', number: '?', amount: amountUnit, isValid: false, originalLine: line, error: errorMsg });
        return;
      }
      if (expandedNumbers.length < 2) {
        finalResults.push({ type: 'xq', number: '?', amount: amountUnit, isValid: false, originalLine: line, error: 'XQ cần ít nhất 2 số' });
        return;
      }

      const uniqueNums = [...new Set(expandedNumbers)];

      for (let k = 2; k <= uniqueNums.length; k++) {
        const combos = combinations(uniqueNums, k);
        combos.forEach(combo => {
          finalResults.push({
            type: `xien${k}`,
            subType: 'xq',
            numbers: combo,
            amount: amountUnit,
            isValid: true,
          });
        });
      }
    });
  }

  if (!foundAny) {
    finalResults.push({ type: 'xq', number: '?', amount: '?', isValid: false, originalLine: line, error: 'Không tìm thấy tiền cho xiên quây' });
  }
}
    } else {
      finalResults.push({ type: 'unknown', number: '?', amount: '?', isValid: false, originalLine: line, error: 'Không nhận dạng được loại' });
    }
  });

  return finalResults;
};

// =============================================================================
// STEP 3: finalize — so sánh kết quả với KQXS
// =============================================================================

/**
 * Lấy 2 số cuối của tất cả các giải → mảng các số 2 chữ số (có thể trùng)
 * @param {Object} results - { DB: ["56848"], G1: ["73483"], G2: [...], ... G7: [...] }
 * @returns {string[]} - ["48", "83", "23", "27", ...]
 */
const getLast2Digits = (results) => {
  const all = [];
  for (const key of Object.keys(results)) {
    results[key].forEach(num => {
      if (num.length >= 2) {
        all.push(num.slice(-2));
      }
    });
  }
  return all;
};

/**
 * Lấy 2 số cuối giải ĐB
 * @param {Object} results
 * @returns {string}
 */
const getDeLast2 = (results) => {
  if (!results.DB || results.DB.length === 0) return '';
  return results.DB[0].slice(-2);
};

/**
 * finalize: so sánh step2 với kết quả xổ số
 * @param {Array} parsedBets - kết quả từ parseDetails (step2)
 * @param {Object} kqxs - { countNumbers, time, results: { DB: [...], G1: [...], ... } }
 * @returns {Array} - mảng kết quả có thêm trường win/winCount
 */
const finalize = (parsedBets, kqxs) => {
  const results = kqxs.results;
  const deLast2 = getDeLast2(results);       // 2 số cuối giải ĐB
  const allLast2 = getLast2Digits(results);   // 2 số cuối tất cả giải (có trùng)

  return parsedBets.map(bet => {
    const result = { ...bet };

    if (!bet.isValid) {
      result.win = false;
      result.winCount = 0;
      return result;
    }

    if (bet.type === 'de') {
      // Đề: so với 2 số cuối giải ĐB
      result.win = bet.number === deLast2;
      result.winCount = result.win ? 1 : 0;

    } else if (bet.type === 'lo') {
      // Lô: đếm số lần xuất hiện trong 2 số cuối tất cả giải
      const count = allLast2.filter(n => n === bet.number).length;
      result.win = count > 0;
      result.winCount = count;

    } else if (bet.type === 'xien' || bet.type.startsWith('xien')) {
      // Xiên / Xiên quây: tất cả các số trong con xiên đều phải có mặt
      // trong 2 số cuối của tất cả giải (lô)
      if (bet.numbers && bet.numbers.length >= 2) {
        const allPresent = bet.numbers.every(num =>
          allLast2.includes(num)
        );
        result.win = allPresent;
        result.winCount = allPresent ? 1 : 0;
        // Chi tiết: số nào trúng, số nào trượt
        result.detail = bet.numbers.map(num => ({
          number: num,
          found: allLast2.includes(num),
        }));
      } else {
        result.win = false;
        result.winCount = 0;
      }
    } else {
      result.win = false;
      result.winCount = 0;
    }

    return result;
  });
};

// =============================================================================
// STEP 4: summarize — tổng hợp theo loại
// =============================================================================

/**
 * Phân loại thực tế của 1 bet (gộp xien từ xiên thường và xiên quây)
 * Trả về: 'de', 'lo', 'xien2', 'xien3', 'xien4', ...
 */
const getCategory = (bet) => {
  if (bet.type === 'de' || bet.type === 'lo') return bet.type;
  // xiên thường: type='xien', numbers có length
  if (bet.type === 'xien' && bet.numbers) return `xien${bet.numbers.length}`;
  // xiên quây đã tách: type='xien2', 'xien3', ...
  if (bet.type.startsWith('xien')) return bet.type;
  return 'unknown';
};

const CATEGORY_LABELS = {
  de: 'Đề',
  lo: 'Lô',
  xien2: 'Xiên 2',
  xien3: 'Xiên 3',
  xien4: 'Xiên 4',
  unknown: 'Không rõ',
};

/**
 * summarize: tổng hợp kết quả finalize theo từng loại
 * @param {Array} finalizedBets - kết quả từ finalize (step3)
 * @returns {Object} - { de: { label, total, win, lose, items }, lo: {...}, xien2: {...}, ... }
 */
const summarize = (finalizedBets) => {
  const groups = {};

  finalizedBets.forEach(bet => {
    const cat = getCategory(bet);

    if (!groups[cat]) {
      groups[cat] = {
        label: CATEGORY_LABELS[cat] || cat,
        total: 0,
        win: 0,
        lose: 0,
        winItems: [],
        loseItems: [],
      };
    }

    const g = groups[cat];
    g.total++;

    if (bet.win) {
      g.win++;
      g.winItems.push(bet);
    } else {
      g.lose++;
      g.loseItems.push(bet);
    }
  });

  // Thêm summary string cho mỗi group
  for (const cat of Object.keys(groups)) {
    const g = groups[cat];
    g.summary = `${g.label}: ${g.win}/${g.total}`;
  }

  return groups;
};

// =============================================================================
// TEST
// =============================================================================

const inputRaw = `đ 131.434 x15n 454.656 x6k 23 12.13 x4đ lo 131.434 x15n xiên 12.21 x10k xiên quây 20.22.343 11.545.21 x20k
xq 232.434x100.10.545.44x100n 989.121 x 100 n
`;

console.log("=== INPUT ===");
console.log(inputRaw);
console.log("");

// Bước 1: Tách tin
const step1 = splitMessage(inputRaw);
console.log("=== STEP 1: splitMessage ===");
step1.forEach((s, i) => console.log(`  [${i}] "${s}"`));
console.log("");

// Bước 2: Phân tích
const step2 = parseDetails(step1);
console.log("=== STEP 2: parseDetails ===");
step2.forEach((item, i) => {
  if (item.numbers) {
    console.log(`  [${i}] type=${item.type}${item.subType ? `(${item.subType})` : ''} numbers=[${item.numbers.join(',')}] amount=${item.amount} valid=${item.isValid}`);
  } else {
    console.log(`  [${i}] type=${item.type} number=${item.number} amount=${item.amount} valid=${item.isValid}${item.error ? ` ERROR: ${item.error}` : ''}`);
  }
});
console.log("");

// Bước 3: Finalize với KQXS mẫu
const kqxs = {
  countNumbers: 27,
  time: "14-3-2026",
  results: {
    DB: ["56848"],
    G1: ["73483"],
    G2: ["92423", "03127"],
    G3: ["91144", "79528", "68003", "34736", "86805", "73286"],
    G4: ["8396", "4678", "6700", "0668"],
    G5: ["9231", "4787", "8494", "9238", "8841", "1247"],
    G6: ["214", "587", "621"],
    G7: ["52", "55", "92", "91"],
  }
};

const step3 = finalize(step2, kqxs);
console.log("=== STEP 3: finalize ===");
console.log(`  Giải ĐB: ${kqxs.results.DB[0]} → 2 số cuối: ${getDeLast2(kqxs.results)}`);
console.log(`  Tất cả 2 số cuối: [${getLast2Digits(kqxs.results).join(', ')}]`);
console.log("");
step3.forEach((item, i) => {
  const winStr = item.win ? `✅ TRÚNG (x${item.winCount})` : '❌ trượt';
  if (item.numbers) {
    console.log(`  [${i}] ${item.type}${item.subType ? `(${item.subType})` : ''} [${item.numbers.join(',')}] ${item.amount} → ${winStr}`);
    if (item.detail) {
      item.detail.forEach(d => console.log(`       ${d.number}: ${d.found ? '✓' : '✗'}`));
    }
  } else {
    console.log(`  [${i}] ${item.type} ${item.number} ${item.amount} → ${winStr}${item.error ? ` (${item.error})` : ''}`);
  }
});
console.log("");

// Bước 4: Tổng hợp
const step4 = summarize(step3);
console.log("=== STEP 4: summarize ===");
const order = ['de', 'lo', 'xien2', 'xien3', 'xien4'];
order.forEach(cat => {
  if (!step4[cat]) return;
  const g = step4[cat];
  console.log(`  ${g.summary}`);
  if (g.winItems.length > 0) {
    g.winItems.forEach(item => {
      if (item.numbers) {
        console.log(`    ✅ [${item.numbers.join(',')}] ${item.amount}${item.winCount > 1 ? ` (x${item.winCount} nháy)` : ''}`);
      } else {
        console.log(`    ✅ ${item.number} ${item.amount}${item.winCount > 1 ? ` (x${item.winCount} nháy)` : ''}`);
      }
    });
  }
});
// In các loại không trong order (nếu có)
Object.keys(step4).forEach(cat => {
  if (order.includes(cat)) return;
  const g = step4[cat];
  console.log(`  ${g.summary}`);
});

// Export cho sử dụng ngoài
if (typeof module !== 'undefined') {
  module.exports = { splitMessage, parseDetails, finalize, summarize, getLast2Digits, getDeLast2 };
}