// =============================================================================
// lotteryService.js — Logic tách tin, phân tích, tính tiền đề lô xiên + DÀN SỐ
// DÀN SỐ BẮT BUỘC CÓ IDENTIFIER (de/đề hoặc lo/lô) Ở PHÍA TRƯỚC
// =============================================================================

const lStarts = ["lô", "lo", "Lô", "Lo", "L"];
const dStarts = ["đề", "đê", "Đề", "Đê", "de", "De", "D", "đ"];
const xqStarts = ["xiên quây", "Quay", "quay", "Xiên Quây", "xien quay", "xq", "XQ", "Xq", "xQ", ];
const xStarts = ["xiên", "xn", "Xiên", "x2", "x3", "x4", "xien"];

// Keywords cho các dàn số (CHỈ hoạt động sau de/lo)
const danTongKw = ["tổng", "tong"];
const danDauKw = ["đầu", "dau"];
const danDitKw = ["đít", "dit", "đuôi", "duoi"];
const danDauDitKw = ["đầu đít", "dau dit", "đầu đuôi", "dau duoi", "dd", "đđ"];
const danBoKw = ["bộ", "bo"];
const danChamKw = ["chạm", "cham"];

// Keywords cho dàn 25 số
const dan25ChanLeKw = ["chẵn lẻ", "chan le"];
const dan25ChanChanKw = ["chẵn chẵn", "chan chan"];
const dan25LeLeKw = ["lẻ lẻ", "le le"];
const dan25LeChanKw = ["lẻ chẵn", "le chan"];
const dan25ToNhoKw = ["to nhỏ", "to nho"];
const dan25ToToKw = ["to to"];
const dan25NhoToKw = ["nhỏ to", "nho to"];
const dan25NhoNhoKw = ["nhỏ nhỏ", "nho nho"];

// Keywords cho dàn 36
const dan36Kw = ["dàn", "dan"]; // + pattern 0-5, 1-6, 2-7, 3-8, 4-9

// Keywords cho tổng theo 10
const tongTren10Kw = ["tổng trên 10", "tong tren 10"];
const tongDuoi10Kw = ["tổng dưới 10", "tong duoi 10"];
const tong10Kw = ["tổng 10", "tong 10"];

// Keywords cho kép
const kepBangKw = ["kép bằng", "kep bang", "kép", "kep"];
const kepLechKw = ["kép lệch", "kep lech"];
const satKepKw = ["sát kép", "sat kep"];

// All DAN keywords (để detect)
const ALL_DAN_KEYWORDS = [
  ...danDauDitKw,
  ...danTongKw,
  ...danDauKw,
  ...danDitKw,
  ...danBoKw,
  ...danChamKw,
  ...dan25ChanLeKw,
  ...dan25ChanChanKw,
  ...dan25LeLeKw,
  ...dan25LeChanKw,
  ...dan25ToNhoKw,
  ...dan25ToToKw,
  ...dan25NhoToKw,
  ...dan25NhoNhoKw,
  ...tongTren10Kw,
  ...tongDuoi10Kw,
  ...tong10Kw,
  ...satKepKw,
  ...kepLechKw,
  ...kepBangKw,
  ...dan36Kw,
];

// Primary keywords only (de/lo/xien)
const PRIMARY_KEYWORDS = [...lStarts, ...dStarts, ...xqStarts, ...xStarts].sort((a, b) => b.length - a.length);

// =============================================================================
// STEP 1: splitMessage - CHỈ TÁCH THEO de/lo/xien
// =============================================================================
const splitMessage = (input) => {
  if (!input) return [];

  const positions = [];
  const lowerInput = input.toLowerCase();

  // CHỈ tìm de/lo/xien - KHÔNG tìm dàn keywords
  for (const kw of PRIMARY_KEYWORDS) {
    const lowerKw = kw.toLowerCase();
    let searchFrom = 0;

    while (searchFrom < input.length) {
      const idx = lowerInput.indexOf(lowerKw, searchFrom);
      if (idx === -1) break;

      const isStart = idx === 0 || /\s/.test(input[idx - 1]);
      const afterIdx = idx + kw.length;
      const isAmountKeyword = /^x\d$/i.test(kw);
      const isEnd = afterIdx >= input.length ||
        (isAmountKeyword ? /\s/.test(input[afterIdx]) : /[\s\d]/.test(input[afterIdx]));

      if (isStart && isEnd) {
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

  positions.sort((a, b) => a.index - b.index);

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
// STEP 1.5: splitDanSegments - Tách "de dan 4-9, bo 18 x5k" thành nhiều segments
// =============================================================================
/**
 * Tách 1 segment thành nhiều sub-segments nếu có nhiều dàn
 * MỖI DÀN CÓ THỂ CÓ AMOUNT RIÊNG HOẶC DÙNG CHUNG (BACKWARD PROPAGATION)
 * 
 * Examples:
 * "de dan 4-9 x10k, bo 18 x5k" → ["de dan 4-9 x10k", "de bo 18 x5k"]
 * "de dan 4-9, bo 18 x5k" → ["de dan 4-9 x5k", "de bo 18 x5k"] (backward)
 * "de dan 4-9, bo 18 x5k, bo 29 x10k" → ["de dan 4-9 x5k", "de bo 18 x5k", "de bo 29 x10k"]
 */
const splitDanSegments = (line) => {
  const lower = line.toLowerCase();
  
  // Check nếu có identifier de/lo
  let identifier = null;
  for (const kw of [...dStarts, ...lStarts]) {
    if (lower.startsWith(kw.toLowerCase())) {
      identifier = kw;
      break;
    }
  }

  if (!identifier) {
    return [line];
  }

  // Strip identifier
  const contentAfterIdentifier = line.substring(identifier.length).trim();
  const lowerContent = contentAfterIdentifier.toLowerCase();

  // Find all dàn keywords trong content
  const danPositions = [];
  
  for (const danKw of ALL_DAN_KEYWORDS.sort((a, b) => b.length - a.length)) {
    const lowerDanKw = danKw.toLowerCase();
    let searchFrom = 0;

    while (searchFrom < lowerContent.length) {
      const idx = lowerContent.indexOf(lowerDanKw, searchFrom);
      if (idx === -1) break;

      const isStart = idx === 0 || /[\s,]/.test(lowerContent[idx - 1]);
      const afterIdx = idx + danKw.length;
      const isEnd = afterIdx >= lowerContent.length || /[\s,\d]/.test(lowerContent[afterIdx]);

      if (isStart && isEnd) {
        const alreadyCovered = danPositions.some(
          p => idx >= p.index && idx < p.index + p.kwLength
        );
        if (!alreadyCovered) {
          danPositions.push({ index: idx, kwLength: danKw.length, keyword: danKw });
        }
      }
      searchFrom = idx + 1;
    }
  }

  if (danPositions.length === 0) {
    return [line];
  }

  // Sort by index
  danPositions.sort((a, b) => a.index - b.index);

  // Split into segments and check if each has amount
  const segments = [];
  
  for (let i = 0; i < danPositions.length; i++) {
    const start = danPositions[i].index;
    const end = danPositions[i + 1] ? danPositions[i + 1].index : contentAfterIdentifier.length;
    
    let danContent = contentAfterIdentifier.substring(start, end).trim();
    
    // Remove trailing comma only (keep amount!)
    danContent = danContent.replace(/,\s*$/, '').trim();
    
    // Check if this segment has amount
    const hasAmount = /x\s*[0-9.]+[knđd]?/i.test(danContent);
    
    segments.push({
      text: danContent,
      hasAmount: hasAmount
    });
  }

  // BACKWARD PROPAGATION: Scan từ phải sang trái
  // Nếu segment không có amount, lấy amount từ segment tiếp theo
  let nextAmount = null;
  
  for (let i = segments.length - 1; i >= 0; i--) {
    if (segments[i].hasAmount) {
      // Extract amount from this segment
      const match = segments[i].text.match(/(x\s*[0-9.]+[knđd]?)/i);
      if (match) {
        nextAmount = match[1];
      }
    } else if (nextAmount) {
      // No amount in this segment, append the next one's amount
      segments[i].text += ` ${nextAmount}`;
      segments[i].hasAmount = true; // Mark as now having amount
    }
  }

  // Build final segments with identifier
  return segments.map(s => `${identifier} ${s.text}`);
};

// =============================================================================
// DÀN SỐ GENERATORS (giữ nguyên)
// =============================================================================

const generateDanTong = (digit) => {
  const result = [];
  for (let i = 0; i <= 9; i++) {
    for (let j = 0; j <= 9; j++) {
      if ((i + j) % 10 === digit) {
        result.push(`${i}${j}`);
      }
    }
  }
  return result;
};

const generateDanDau = (digit) => {
  const result = [];
  for (let i = 0; i <= 9; i++) {
    result.push(`${digit}${i}`);
  }
  return result;
};

const generateDanDuoi = (digit) => {
  const result = [];
  for (let i = 0; i <= 9; i++) {
    result.push(`${i}${digit}`);
  }
  return result;
};

const generateDanDauDit = (digit) => {
  const dau = generateDanDau(digit);
  const duoi = generateDanDuoi(digit);
  return [...dau, ...duoi];
};

/**
 * Generate bộ số - các số cách 5 đơn vị
 * Logic: Bộ X gồm tất cả số có chữ số cách X đúng 5 đơn vị
 * Ví dụ: Bộ 00 → 00, 05, 50, 55
 *        Bộ 01 → 01, 06, 10, 15, 51, 56, 60, 65
 *        Bộ 02 → 02, 07, 20, 25, 52, 57, 70, 75
 */
const generateDanBo = (boNumber) => {
  const num = parseInt(boNumber);
  const digit1 = Math.floor(num / 10); // chữ số hàng chục
  const digit2 = num % 10;              // chữ số hàng đơn vị
  
  const result = new Set();
  
  // Tìm tất cả các số có 2 chữ số cách nhau đúng 5 hoặc -5
  for (let i = 0; i <= 9; i++) {
    for (let j = 0; j <= 9; j++) {
      const diff1 = Math.abs(i - j);
      const diff2 = Math.abs(j - i);
      
      // Check nếu cặp (i,j) có chữ số cách nhau 5
      if (diff1 === 5 || diff2 === 5) {
        const numStr = `${i}${j}`;
        const reverseStr = `${j}${i}`;
        
        // Check nếu số này match với boNumber hoặc các biến thể
        if (
          numStr === boNumber.padStart(2, '0') ||
          reverseStr === boNumber.padStart(2, '0') ||
          numStr === `${digit2}${digit1}` ||
          reverseStr === `${digit2}${digit1}`
        ) {
          result.add(numStr);
          result.add(reverseStr);
        }
      }
    }
  }
  
  // Nếu cách trên không ra kết quả, dùng logic đơn giản hơn
  if (result.size === 0) {
    // Lấy 2 chữ số của bộ
    const d1 = digit1;
    const d2 = digit2;
    
    // Tìm các chữ số cách d1 và d2 đúng 5 đơn vị
    const variations = [];
    
    // Với d1
    if (d1 + 5 <= 9) variations.push(d1 + 5);
    if (d1 - 5 >= 0) variations.push(d1 - 5);
    
    // Với d2  
    if (d2 + 5 <= 9) variations.push(d2 + 5);
    if (d2 - 5 >= 0) variations.push(d2 - 5);
    
    // Tạo tất cả combinations
    const allDigits = [d1, d2, ...variations];
    const uniqueDigits = [...new Set(allDigits)];
    
    for (let i of uniqueDigits) {
      for (let j of uniqueDigits) {
        if (Math.abs(i - j) === 5 || i === j) {
          result.add(`${i}${j}`);
        }
      }
    }
  }
  
  return Array.from(result).sort();
};

// Hoặc dùng lookup table cho chính xác (RECOMMENDED)
const DAN_BO_LOOKUP = {
  '00': ['00', '05', '50', '55'],
  '05': ['00', '05', '50', '55'],
  '50': ['00', '05', '50', '55'],
  '55': ['00', '05', '50', '55'],
  
  '01': ['01', '06', '10', '15', '51', '56', '60', '65'],
  '06': ['01', '06', '10', '15', '51', '56', '60', '65'],
  '10': ['01', '06', '10', '15', '51', '56', '60', '65'],
  '15': ['01', '06', '10', '15', '51', '56', '60', '65'],
  '51': ['01', '06', '10', '15', '51', '56', '60', '65'],
  '56': ['01', '06', '10', '15', '51', '56', '60', '65'],
  '60': ['01', '06', '10', '15', '51', '56', '60', '65'],
  '65': ['01', '06', '10', '15', '51', '56', '60', '65'],
  
  '02': ['02', '07', '20', '25', '52', '57', '70', '75'],
  '07': ['02', '07', '20', '25', '52', '57', '70', '75'],
  '20': ['02', '07', '20', '25', '52', '57', '70', '75'],
  '25': ['02', '07', '20', '25', '52', '57', '70', '75'],
  '52': ['02', '07', '20', '25', '52', '57', '70', '75'],
  '57': ['02', '07', '20', '25', '52', '57', '70', '75'],
  '70': ['02', '07', '20', '25', '52', '57', '70', '75'],
  '75': ['02', '07', '20', '25', '52', '57', '70', '75'],
  
  '03': ['03', '08', '30', '35', '53', '58', '80', '85'],
  '08': ['03', '08', '30', '35', '53', '58', '80', '85'],
  '30': ['03', '08', '30', '35', '53', '58', '80', '85'],
  '35': ['03', '08', '30', '35', '53', '58', '80', '85'],
  '53': ['03', '08', '30', '35', '53', '58', '80', '85'],
  '58': ['03', '08', '30', '35', '53', '58', '80', '85'],
  '80': ['03', '08', '30', '35', '53', '58', '80', '85'],
  '85': ['03', '08', '30', '35', '53', '58', '80', '85'],
  
  '04': ['04', '09', '40', '45', '54', '59', '90', '95'],
  '09': ['04', '09', '40', '45', '54', '59', '90', '95'],
  '40': ['04', '09', '40', '45', '54', '59', '90', '95'],
  '45': ['04', '09', '40', '45', '54', '59', '90', '95'],
  '54': ['04', '09', '40', '45', '54', '59', '90', '95'],
  '59': ['04', '09', '40', '45', '54', '59', '90', '95'],
  '90': ['04', '09', '40', '45', '54', '59', '90', '95'],
  '95': ['04', '09', '40', '45', '54', '59', '90', '95'],
  
  '11': ['11', '16', '61', '66'],
  '16': ['11', '16', '61', '66'],
  '61': ['11', '16', '61', '66'],
  '66': ['11', '16', '61', '66'],
  
  '12': ['12', '17', '21', '26', '62', '67', '71', '76'],
  '17': ['12', '17', '21', '26', '62', '67', '71', '76'],
  '21': ['12', '17', '21', '26', '62', '67', '71', '76'],
  '26': ['12', '17', '21', '26', '62', '67', '71', '76'],
  '62': ['12', '17', '21', '26', '62', '67', '71', '76'],
  '67': ['12', '17', '21', '26', '62', '67', '71', '76'],
  '71': ['12', '17', '21', '26', '62', '67', '71', '76'],
  '76': ['12', '17', '21', '26', '62', '67', '71', '76'],
  
  '13': ['13', '18', '31', '36', '63', '68', '81', '86'],
  '18': ['13', '18', '31', '36', '63', '68', '81', '86'],
  '31': ['13', '18', '31', '36', '63', '68', '81', '86'],
  '36': ['13', '18', '31', '36', '63', '68', '81', '86'],
  '63': ['13', '18', '31', '36', '63', '68', '81', '86'],
  '68': ['13', '18', '31', '36', '63', '68', '81', '86'],
  '81': ['13', '18', '31', '36', '63', '68', '81', '86'],
  '86': ['13', '18', '31', '36', '63', '68', '81', '86'],
  
  '14': ['14', '19', '41', '46', '64', '69', '91', '96'],
  '19': ['14', '19', '41', '46', '64', '69', '91', '96'],
  '41': ['14', '19', '41', '46', '64', '69', '91', '96'],
  '46': ['14', '19', '41', '46', '64', '69', '91', '96'],
  '64': ['14', '19', '41', '46', '64', '69', '91', '96'],
  '69': ['14', '19', '41', '46', '64', '69', '91', '96'],
  '91': ['14', '19', '41', '46', '64', '69', '91', '96'],
  '96': ['14', '19', '41', '46', '64', '69', '91', '96'],
  
  '22': ['22', '27', '72', '77'],
  '27': ['22', '27', '72', '77'],
  '72': ['22', '27', '72', '77'],
  '77': ['22', '27', '72', '77'],
  
  '23': ['23', '28', '32', '37', '73', '78', '82', '87'],
  '28': ['23', '28', '32', '37', '73', '78', '82', '87'],
  '32': ['23', '28', '32', '37', '73', '78', '82', '87'],
  '37': ['23', '28', '32', '37', '73', '78', '82', '87'],
  '73': ['23', '28', '32', '37', '73', '78', '82', '87'],
  '78': ['23', '28', '32', '37', '73', '78', '82', '87'],
  '82': ['23', '28', '32', '37', '73', '78', '82', '87'],
  '87': ['23', '28', '32', '37', '73', '78', '82', '87'],
  
  '24': ['24', '29', '42', '47', '74', '79', '92', '97'],
  '29': ['24', '29', '42', '47', '74', '79', '92', '97'],
  '42': ['24', '29', '42', '47', '74', '79', '92', '97'],
  '47': ['24', '29', '42', '47', '74', '79', '92', '97'],
  '74': ['24', '29', '42', '47', '74', '79', '92', '97'],
  '79': ['24', '29', '42', '47', '74', '79', '92', '97'],
  '92': ['24', '29', '42', '47', '74', '79', '92', '97'],
  '97': ['24', '29', '42', '47', '74', '79', '92', '97'],
  
  '33': ['33', '38', '83', '88'],
  '38': ['33', '38', '83', '88'],
  '83': ['33', '38', '83', '88'],
  '88': ['33', '38', '83', '88'],
  
  '34': ['34', '39', '43', '48', '84', '89', '93', '98'],
  '39': ['34', '39', '43', '48', '84', '89', '93', '98'],
  '43': ['34', '39', '43', '48', '84', '89', '93', '98'],
  '48': ['34', '39', '43', '48', '84', '89', '93', '98'],
  '84': ['34', '39', '43', '48', '84', '89', '93', '98'],
  '89': ['34', '39', '43', '48', '84', '89', '93', '98'],
  '93': ['34', '39', '43', '48', '84', '89', '93', '98'],
  '98': ['34', '39', '43', '48', '84', '89', '93', '98'],
  
  '44': ['44', '49', '94', '99'],
  '49': ['44', '49', '94', '99'],
  '94': ['44', '49', '94', '99'],
  '99': ['44', '49', '94', '99'],
};

const generateDanBoLookup = (boNumber) => {
  const key = boNumber.padStart(2, '0');
  return DAN_BO_LOOKUP[key] || [];
};

const generateDanCham = (digit) => {
  const result = new Set();
  for (let i = 0; i <= 9; i++) {
    result.add(`${digit}${i}`);
  }
  for (let i = 0; i <= 9; i++) {
    result.add(`${i}${digit}`);
  }
  return Array.from(result).sort();
};

const generateDan25ChanLe = () => {
  const result = [];
  for (let i = 0; i <= 9; i++) {
    for (let j = 0; j <= 9; j++) {
      if (i % 2 === 0 && j % 2 === 1) {
        result.push(`${i}${j}`);
      }
    }
  }
  return result;
};

const generateDan25ChanChan = () => {
  const result = [];
  for (let i = 0; i <= 9; i++) {
    for (let j = 0; j <= 9; j++) {
      if (i % 2 === 0 && j % 2 === 0) {
        result.push(`${i}${j}`);
      }
    }
  }
  return result;
};

const generateDan25LeLe = () => {
  const result = [];
  for (let i = 0; i <= 9; i++) {
    for (let j = 0; j <= 9; j++) {
      if (i % 2 === 1 && j % 2 === 1) {
        result.push(`${i}${j}`);
      }
    }
  }
  return result;
};

const generateDan25LeChan = () => {
  const result = [];
  for (let i = 0; i <= 9; i++) {
    for (let j = 0; j <= 9; j++) {
      if (i % 2 === 1 && j % 2 === 0) {
        result.push(`${i}${j}`);
      }
    }
  }
  return result;
};

const generateDan25ToNho = () => {
  const result = [];
  for (let i = 5; i <= 9; i++) {
    for (let j = 0; j <= 4; j++) {
      result.push(`${i}${j}`);
    }
  }
  return result;
};

const generateDan25ToTo = () => {
  const result = [];
  for (let i = 5; i <= 9; i++) {
    for (let j = 5; j <= 9; j++) {
      result.push(`${i}${j}`);
    }
  }
  return result;
};

const generateDan25NhoTo = () => {
  const result = [];
  for (let i = 0; i <= 4; i++) {
    for (let j = 5; j <= 9; j++) {
      result.push(`${i}${j}`);
    }
  }
  return result;
};

const generateDan25NhoNho = () => {
  const result = [];
  for (let i = 0; i <= 4; i++) {
    for (let j = 0; j <= 4; j++) {
      result.push(`${i}${j}`);
    }
  }
  return result;
};

const generateDan36 = (start, end) => {
  const result = [];
  for (let i = start; i <= end; i++) {
    for (let j = start; j <= end; j++) {
      result.push(`${i}${j}`);
    }
  }
  return result;
};

const generateTongTren10 = () => {
  const result = [];
  for (let i = 0; i <= 9; i++) {
    for (let j = 0; j <= 9; j++) {
      const sum = i + j;
      if (sum > 10) {
        result.push(`${i}${j}`);
      }
    }
  }
  return result;
};

const generateTong10 = () => {
  return ['19', '28', '37', '46', '55', '64', '73', '82', '91'];
};

const generateTongDuoi10 = () => {
  const result = [];
  for (let i = 0; i <= 9; i++) {
    for (let j = 0; j <= 9; j++) {
      const sum = i + j;
      if (sum < 10) {
        result.push(`${i}${j}`);
      }
    }
  }
  return result;
};

const generateKepBang = () => {
  return ['00', '11', '22', '33', '44', '55', '66', '77', '88', '99'];
};

const generateKepLech = () => {
  return ['050', '161', '272', '383', '494'];
};

const generateSatKep = () => {
  return ['010', '090', '121', '232', '343', '454', '565', '676', '787', '898'];
};

// =============================================================================
// HELPERS
// =============================================================================
const getSymmetricPairs = (numStr) => {
  if (numStr.length !== 3) return null;
  if (numStr[0] !== numStr[2]) return null;
  return [numStr[0] + numStr[1], numStr[1] + numStr[0]];
};

const detectType = (line) => {
  const lower = line.toLowerCase();
  
  // PHẢI có identifier de/lo trước
  const hasDeIdentifier = dStarts.some(k => lower.startsWith(k.toLowerCase()));
  const hasLoIdentifier = lStarts.some(k => lower.startsWith(k.toLowerCase()));
  
  // Check dàn số (CHỈ khi có de/lo identifier)
  if (hasDeIdentifier || hasLoIdentifier) {
    if (danDauDitKw.some(k => lower.includes(k.toLowerCase()))) return 'dan-dau-dit';
    if (danTongKw.some(k => lower.includes(k.toLowerCase()))) return 'dan-tong';
    if (danDauKw.some(k => lower.includes(k.toLowerCase()))) return 'dan-dau';
    if (danDitKw.some(k => lower.includes(k.toLowerCase()))) return 'dan-dit';
    if (danBoKw.some(k => lower.includes(k.toLowerCase()))) return 'dan-bo';
    if (danChamKw.some(k => lower.includes(k.toLowerCase()))) return 'dan-cham';
    
    // Dàn 25
    if (dan25ChanLeKw.some(k => lower.includes(k.toLowerCase()))) return 'dan-chan-le';
    if (dan25ChanChanKw.some(k => lower.includes(k.toLowerCase()))) return 'dan-chan-chan';
    if (dan25LeLeKw.some(k => lower.includes(k.toLowerCase()))) return 'dan-le-le';
    if (dan25LeChanKw.some(k => lower.includes(k.toLowerCase()))) return 'dan-le-chan';
    if (dan25ToNhoKw.some(k => lower.includes(k.toLowerCase()))) return 'dan-to-nho';
    if (dan25ToToKw.some(k => lower.includes(k.toLowerCase()))) return 'dan-to-to';
    if (dan25NhoToKw.some(k => lower.includes(k.toLowerCase()))) return 'dan-nho-to';
    if (dan25NhoNhoKw.some(k => lower.includes(k.toLowerCase()))) return 'dan-nho-nho';
    
    // Tổng 10
    if (tongTren10Kw.some(k => lower.includes(k.toLowerCase()))) return 'tong-tren-10';
    if (tongDuoi10Kw.some(k => lower.includes(k.toLowerCase()))) return 'tong-duoi-10';
    if (tong10Kw.some(k => lower.includes(k.toLowerCase()))) return 'tong-10';
    
    // Kép
    if (satKepKw.some(k => lower.includes(k.toLowerCase()))) return 'sat-kep';
    if (kepLechKw.some(k => lower.includes(k.toLowerCase()))) return 'kep-lech';
    if (kepBangKw.some(k => lower.includes(k.toLowerCase()))) return 'kep-bang';
    
    // Dàn 36
    if (dan36Kw.some(k => lower.includes(k.toLowerCase())) && /\d\s*-\s*\d/.test(lower)) {
      return 'dan-36';
    }
  }
  
  // Standard types
  if (dStarts.some(k => lower.startsWith(k.toLowerCase()))) return 'de';
  if (lStarts.some(k => lower.startsWith(k.toLowerCase()))) return 'lo';
  if (xqStarts.some(k => lower.startsWith(k.toLowerCase()))) return 'xq';
  if (xStarts.some(k => lower.startsWith(k.toLowerCase()))) return 'xien';
  
  return 'unknown';
};

const stripKeyword = (line) => {
  let content = line;
  
  // Strip de/lo identifier first
  for (const kw of [...dStarts, ...lStarts]) {
    const reg = new RegExp(`^${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'i');
    const newContent = content.replace(reg, '');
    if (newContent !== content) {
      content = newContent;
      break;
    }
  }
  
  // Then strip dàn keyword if present
  for (const kw of ALL_DAN_KEYWORDS.sort((a, b) => b.length - a.length)) {
    const reg = new RegExp(`^${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'i');
    const newContent = content.replace(reg, '');
    if (newContent !== content) {
      content = newContent;
      break;
    }
  }
  
  // Also strip xien keywords
  for (const kw of [...xqStarts, ...xStarts]) {
    const reg = new RegExp(`^${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'i');
    const newContent = content.replace(reg, '');
    if (newContent !== content) {
      content = newContent;
      break;
    }
  }
  
  return content;
};

const parseXienNumbers = (numsStr) => {
  return numsStr.split(/[.\-;]/).map(s => s.trim()).filter(s => s.length > 0);
};

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
// STEP 2: parseDetails (ENHANCED)
// =============================================================================
const parseDetails = (lines) => {
  const finalResults = [];

  lines.forEach(originalLine => {
    // STEP 1: Split dàn segments if multiple dans
    const danSegments = splitDanSegments(originalLine);
    
    danSegments.forEach(line => {
      const type = detectType(line);
      const content = stripKeyword(line);
      
      // Determine base type (de or lo) từ identifier
      let baseType = 'lo'; // default
      const lower = line.toLowerCase();
      if (dStarts.some(k => lower.startsWith(k.toLowerCase()))) {
        baseType = 'de';
      } else if (lStarts.some(k => lower.startsWith(k.toLowerCase()))) {
        baseType = 'lo';
      }

      // =========================================================================
      // DÀN SỐ HANDLING
      // =========================================================================
      
      if (type === 'dan-tong') {
        const match = content.match(/(\d)\s*x\s*([0-9.]+[knđd]?)/i);
        if (match) {
          const digit = parseInt(match[1]);
          const amount = match[2];
          const numbers = generateDanTong(digit);
          numbers.forEach(num => {
            finalResults.push({
              type: baseType,
              number: num,
              amount: amount,
              isValid: true,
              isDan: true,
              danType: 'tổng',
              danValue: digit
            });
          });
        }
      }
      
      else if (type === 'dan-dau') {
        const match = content.match(/(\d)\s*x\s*([0-9.]+[knđd]?)/i);
        if (match) {
          const digit = parseInt(match[1]);
          const amount = match[2];
          const numbers = generateDanDau(digit);
          numbers.forEach(num => {
            finalResults.push({
              type: baseType,
              number: num,
              amount: amount,
              isValid: true,
              isDan: true,
              danType: 'đầu',
              danValue: digit
            });
          });
        }
      }
      
      else if (type === 'dan-dit') {
        const match = content.match(/(\d)\s*x\s*([0-9.]+[knđd]?)/i);
        if (match) {
          const digit = parseInt(match[1]);
          const amount = match[2];
          const numbers = generateDanDuoi(digit);
          numbers.forEach(num => {
            finalResults.push({
              type: baseType,
              number: num,
              amount: amount,
              isValid: true,
              isDan: true,
              danType: 'đuôi',
              danValue: digit
            });
          });
        }
      }
      
      else if (type === 'dan-dau-dit') {
        const match = content.match(/(\d)\s*x\s*([0-9.]+[knđd]?)/i);
        if (match) {
          const digit = parseInt(match[1]);
          const amount = match[2];
          const numbers = generateDanDauDit(digit);
          numbers.forEach(num => {
            finalResults.push({
              type: baseType,
              number: num,
              amount: amount,
              isValid: true,
              isDan: true,
              danType: 'đầu đít',
              danValue: digit
            });
          });
        }
      }
      
      else if (type === 'dan-bo') {
        const match = content.match(/(\d{1,2})\s*x\s*([0-9.]+[knđd]?)/i);
        if (match) {
          const boNum = match[1].padStart(2, '0');
          const amount = match[2];
          const numbers = generateDanBoLookup(boNum);
          if (numbers.length > 0) {
            numbers.forEach(num => {
              finalResults.push({
                type: baseType,
                number: num,
                amount: amount,
                isValid: true,
                isDan: true,
                danType: 'bộ',
                danValue: boNum
              });
            });
          } else {
            finalResults.push({
              type: baseType,
              number: '?',
              amount: amount,
              isValid: false,
              error: `Bộ ${boNum} không có trong danh sách`,
              originalLine: line
            });
          }
        }
      }
      
      else if (type === 'dan-cham') {
        const match = content.match(/(\d)\s*x\s*([0-9.]+[knđd]?)/i);
        if (match) {
          const digit = parseInt(match[1]);
          const amount = match[2];
          const numbers = generateDanCham(digit);
          numbers.forEach(num => {
            finalResults.push({
              type: baseType,
              number: num,
              amount: amount,
              isValid: true,
              isDan: true,
              danType: 'chạm',
              danValue: digit
            });
          });
        }
      }
      
      // Dàn 25 số
      else if (type === 'dan-chan-le') {
        const match = content.match(/x\s*([0-9.]+[knđd]?)/i);
        if (match) {
          const amount = match[1];
          const numbers = generateDan25ChanLe();
          numbers.forEach(num => {
            finalResults.push({ type: baseType, number: num, amount, isValid: true, isDan: true, danType: 'chẵn lẻ' });
          });
        }
      }
      
      else if (type === 'dan-chan-chan') {
        const match = content.match(/x\s*([0-9.]+[knđd]?)/i);
        if (match) {
          const amount = match[1];
          const numbers = generateDan25ChanChan();
          numbers.forEach(num => {
            finalResults.push({ type: baseType, number: num, amount, isValid: true, isDan: true, danType: 'chẵn chẵn' });
          });
        }
      }
      
      else if (type === 'dan-le-le') {
        const match = content.match(/x\s*([0-9.]+[knđd]?)/i);
        if (match) {
          const amount = match[1];
          const numbers = generateDan25LeLe();
          numbers.forEach(num => {
            finalResults.push({ type: baseType, number: num, amount, isValid: true, isDan: true, danType: 'lẻ lẻ' });
          });
        }
      }
      
      else if (type === 'dan-le-chan') {
        const match = content.match(/x\s*([0-9.]+[knđd]?)/i);
        if (match) {
          const amount = match[1];
          const numbers = generateDan25LeChan();
          numbers.forEach(num => {
            finalResults.push({ type: baseType, number: num, amount, isValid: true, isDan: true, danType: 'lẻ chẵn' });
          });
        }
      }
      
      else if (type === 'dan-to-nho') {
        const match = content.match(/x\s*([0-9.]+[knđd]?)/i);
        if (match) {
          const amount = match[1];
          const numbers = generateDan25ToNho();
          numbers.forEach(num => {
            finalResults.push({ type: baseType, number: num, amount, isValid: true, isDan: true, danType: 'to nhỏ' });
          });
        }
      }
      
      else if (type === 'dan-to-to') {
        const match = content.match(/x\s*([0-9.]+[knđd]?)/i);
        if (match) {
          const amount = match[1];
          const numbers = generateDan25ToTo();
          numbers.forEach(num => {
            finalResults.push({ type: baseType, number: num, amount, isValid: true, isDan: true, danType: 'to to' });
          });
        }
      }
      
      else if (type === 'dan-nho-to') {
        const match = content.match(/x\s*([0-9.]+[knđd]?)/i);
        if (match) {
          const amount = match[1];
          const numbers = generateDan25NhoTo();
          numbers.forEach(num => {
            finalResults.push({ type: baseType, number: num, amount, isValid: true, isDan: true, danType: 'nhỏ to' });
          });
        }
      }
      
      else if (type === 'dan-nho-nho') {
        const match = content.match(/x\s*([0-9.]+[knđd]?)/i);
        if (match) {
          const amount = match[1];
          const numbers = generateDan25NhoNho();
          numbers.forEach(num => {
            finalResults.push({ type: baseType, number: num, amount, isValid: true, isDan: true, danType: 'nhỏ nhỏ' });
          });
        }
      }
      
      // Dàn 36
      else if (type === 'dan-36') {
        const rangeMatch = content.match(/(\d)\s*-\s*(\d)/);
        const amountMatch = content.match(/x\s*([0-9.]+[knđd]?)/i);
        if (rangeMatch && amountMatch) {
          const start = parseInt(rangeMatch[1]);
          const end = parseInt(rangeMatch[2]);
          const amount = amountMatch[1];
          const numbers = generateDan36(start, end);
          numbers.forEach(num => {
            finalResults.push({
              type: baseType,
              number: num,
              amount,
              isValid: true,
              isDan: true,
              danType: `dàn ${start}-${end}`
            });
          });
        }
      }
      
      // Tổng theo 10
      else if (type === 'tong-tren-10') {
        const match = content.match(/x\s*([0-9.]+[knđd]?)/i);
        if (match) {
          const amount = match[1];
          const numbers = generateTongTren10();
          numbers.forEach(num => {
            finalResults.push({ type: baseType, number: num, amount, isValid: true, isDan: true, danType: 'tổng trên 10' });
          });
        }
      }
      
      else if (type === 'tong-10') {
        const match = content.match(/x\s*([0-9.]+[knđd]?)/i);
        if (match) {
          const amount = match[1];
          const numbers = generateTong10();
          numbers.forEach(num => {
            finalResults.push({ type: baseType, number: num, amount, isValid: true, isDan: true, danType: 'tổng 10' });
          });
        }
      }
      
      else if (type === 'tong-duoi-10') {
        const match = content.match(/x\s*([0-9.]+[knđd]?)/i);
        if (match) {
          const amount = match[1];
          const numbers = generateTongDuoi10();
          numbers.forEach(num => {
            finalResults.push({ type: baseType, number: num, amount, isValid: true, isDan: true, danType: 'tổng dưới 10' });
          });
        }
      }
      
      // Kép
      else if (type === 'kep-bang') {
        const match = content.match(/x\s*([0-9.]+[knđd]?)/i);
        if (match) {
          const amount = match[1];
          const numbers = generateKepBang();
          numbers.forEach(num => {
            finalResults.push({ type: baseType, number: num, amount, isValid: true, isDan: true, danType: 'kép bằng' });
          });
        }
      }
      
      else if (type === 'kep-lech') {
        const match = content.match(/x\s*([0-9.]+[knđd]?)/i);
        if (match) {
          const amount = match[1];
          const numbers = generateKepLech();
          numbers.forEach(num => {
            finalResults.push({ type: baseType, number: num.slice(-2), amount, isValid: true, isDan: true, danType: 'kép lệch', fullNumber: num });
          });
        }
      }
      
      else if (type === 'sat-kep') {
        const match = content.match(/x\s*([0-9.]+[knđd]?)/i);
        if (match) {
          const amount = match[1];
          const numbers = generateSatKep();
          numbers.forEach(num => {
            finalResults.push({ type: baseType, number: num.slice(-2), amount, isValid: true, isDan: true, danType: 'sát kép', fullNumber: num });
          });
        }
      }

      // =========================================================================
      // STANDARD TYPES (de, lo, xien, xq)
      // =========================================================================
      else if (type === 'de' || type === 'lo') {
        const pattern = /([\d][\d.\s]*?)\s*x\s*([0-9.]+[knđd]?)/gi;
        let match;
        let foundAny = false;

        while ((match = pattern.exec(content)) !== null) {
          foundAny = true;
          const rawNums = match[1];
          const amountUnit = match[2];
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
      }

      else if (type === 'xien') {
        const pattern = /([\d][\d.\-;]*?)\s*x\s*([0-9.]+[knđd]?)/gi;
        let match;
        let foundAny = false;

        while ((match = pattern.exec(content)) !== null) {
          foundAny = true;
          const rawNums = match[1];
          const amountUnit = match[2];
          const numbers = parseXienNumbers(rawNums);
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
            finalResults.push({ type: 'xien', number: '?', amount: amountUnit, isValid: false, originalLine: line, error: 'Xiên cần ít nhất 2 số 2 chữ số' });
          }
        }

        if (!foundAny) {
          finalResults.push({ type: 'xien', number: '?', amount: '?', isValid: false, originalLine: line, error: 'Không parse được xiên' });
        }
      }

      else if (type === 'xq') {
        const amountMatch = content.match(/x\s*([0-9.]+[knđd]?)\s*$/i);
        if (!amountMatch) {
          finalResults.push({ type: 'xq', number: '?', amount: '?', isValid: false, originalLine: line, error: 'Không tìm thấy tiền cho xiên quây' });
          return;
        }

        const amountUnit = amountMatch[1];
        const numsPart = content.substring(0, amountMatch.index).trim();
        const xqGroups = numsPart.split(/\s+/).filter(s => s.length > 0);

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
              if (pairs) {
                expandedNumbers.push(...pairs);
              } else {
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
      
      else {
        finalResults.push({ type: 'unknown', number: '?', amount: '?', isValid: false, originalLine: line, error: 'Không nhận dạng được loại' });
      }
    });
  });

  return finalResults;
};

// =============================================================================
// STEP 3: finalize & STEP 4: summarize (GIỮ NGUYÊN)
// =============================================================================
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

const getDeLast2 = (results) => {
  if (!results.DB || results.DB.length === 0) return '';
  return results.DB[0].slice(-2);
};

const finalize = (parsedBets, kqxs) => {
  const results = kqxs.results;
  const deLast2 = getDeLast2(results);
  const allLast2 = getLast2Digits(results);

  return parsedBets.map(bet => {
    const result = { ...bet };
    
    // Calculate totalBetAmount (số tiền đánh cho bet này)
    const amountValue = parseAmountValue(bet.amount);
    
    // Nếu là dàn, cần tính tổng tiền của toàn bộ dàn
    if (bet.isDan) {
      // Đếm tổng số bets cùng dàn
      const sameDanBets = parsedBets.filter(b => 
        b.isDan && 
        b.danType === bet.danType && 
        b.danValue === bet.danValue &&
        b.type === bet.type
      );
      result.totalBetAmount = sameDanBets.length * amountValue;
      result.totalNumbersInDan = sameDanBets.length;
    } else {
      result.totalBetAmount = amountValue;
    }

    if (!bet.isValid) {
      result.win = false;
      result.winCount = 0;
      return result;
    }

    if (bet.type === 'de') {
      result.win = bet.number === deLast2;
      result.winCount = result.win ? 1 : 0;
    } else if (bet.type === 'lo') {
      const count = allLast2.filter(n => n === bet.number).length;
      result.win = count > 0;
      result.winCount = count;
    } else if (bet.type === 'xien' || bet.type.startsWith('xien')) {
      if (bet.numbers && bet.numbers.length >= 2) {
        const allPresent = bet.numbers.every(num => allLast2.includes(num));
        result.win = allPresent;
        result.winCount = allPresent ? 1 : 0;
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

const getCategory = (bet) => {
  // Nếu là dàn, category = type + danType + danValue để tách riêng
  if (bet.isDan) {
    const danKey = `${bet.danType}${bet.danValue !== undefined ? ' ' + bet.danValue : ''}`;
    return `${bet.type}_${danKey}`;
  }
  
  // Standard
  if (bet.type === 'de' || bet.type === 'lo') return bet.type;
  if (bet.type === 'xien' && bet.numbers) return `xien${bet.numbers.length}`;
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
 * Parse amount string thành số điểm
 * "15n" → 15, "6k" → 6, "4đ" → 4, "0.5k" → 0.5
 * "10" → 10 (không có đơn vị cũng OK)
 */
const parseAmountValue = (amountStr) => {
  if (!amountStr || amountStr === '?') return 0;
  
  // Remove 'x' nếu có
  const cleaned = String(amountStr).replace(/^x\s*/i, '').trim();
  
  // Match số (có thể có dấu chấm)
  const match = cleaned.match(/^([0-9.]+)/);
  if (!match) return 0;
  return parseFloat(match[1]) || 0;
};

const summarize = (finalizedBets) => {
  const groups = {};

  finalizedBets.forEach(bet => {
    const cat = getCategory(bet);

    if (!groups[cat]) {
      const baseLabel = bet.type === 'de' ? 'Đề' : 
                        bet.type === 'lo' ? 'Lô' : 
                        CATEGORY_LABELS[bet.type] || bet.type;
      
      groups[cat] = {
        label: baseLabel,
        totalCount: 0,
        winCount: 0,
        loseCount: 0,
        totalPoints: 0,
        winPoints: 0,
        losePoints: 0,
        winItems: [],
        loseItems: [],
        // Track dàn info
        isDan: bet.isDan || false,
        danType: bet.danType,
        danValue: bet.danValue,
        amountPerNumber: 0,
      };
    }

    const g = groups[cat];
    const points = parseAmountValue(bet.amount);
    
    // Track amount per number
    if (g.amountPerNumber === 0) {
      g.amountPerNumber = points;
    }
    
    const winPoints = bet.win ? points * (bet.winCount || 1) : 0;

    g.totalCount++;
    g.totalPoints += points;

    if (bet.win) {
      g.winCount++;
      g.winPoints += winPoints;
      g.winItems.push(bet);
    } else {
      g.loseCount++;
      g.losePoints += points;
      g.loseItems.push(bet);
    }
  });

  // Post-process: Format summary cho từng category
  for (const cat of Object.keys(groups)) {
    const g = groups[cat];
    
    if (g.isDan) {
      // Tổng tiền = số lượng con × tiền mỗi con
      const totalDanAmount = g.totalCount * g.amountPerNumber;
      const danLabel = `${g.danType}${g.danValue !== undefined ? ' ' + g.danValue : ''}`;
      
      g.summary = `${g.label} (${danLabel}): ${g.winPoints}/${totalDanAmount} (${g.totalCount} con)`;
      g.totalDanAmount = totalDanAmount;
    } else {
      g.summary = `${g.label}: ${g.winPoints}/${g.totalPoints}`;
    }
  }

  return groups;
};

module.exports = {
  splitMessage,
  splitDanSegments,
  parseDetails,
  finalize,
  summarize,
  getLast2Digits,
  getDeLast2,
  // Export generators
  generateDanTong,
  generateDanDau,
  generateDanDuoi,
  generateDanDauDit,
  generateDanBo: generateDanBoLookup, // Use lookup table
  generateDanCham,
  generateDan25ChanLe,
  generateDan25ChanChan,
  generateDan25LeLe,
  generateDan25LeChan,
  generateDan25ToNho,
  generateDan25ToTo,
  generateDan25NhoTo,
  generateDan25NhoNho,
  generateDan36,
  generateTongTren10,
  generateTong10,
  generateTongDuoi10,
  generateKepBang,
  generateKepLech,
  generateSatKep,
};