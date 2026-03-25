const lStarts = ["lo", "Lo", "Lô", "lô", "L"];
const dStarts = ["đề", "đê", "Đề", "Đê", "de", "De", "D", "đ"];
const xqStarts = ["xiên quây", "Quay", "quay", "Xiên Quây", "xq", "XQ", "Xq", "xQ", "x2", "x3", "x4"];
const xStarts = ["xiên", "xn", "Xiên"];

const START_KEYWORDS = [...lStarts, ...dStarts, ...xqStarts, ...xStarts].sort((a, b) => b.length - a.length);
const START_PATTERN = new RegExp(`(^|\\s)(${START_KEYWORDS.join('|')})(?=\\s|\\d)`, 'gi');

const splitMessage = (input) => {
  if (!input) return [];
  const matches = [];
  let match;
  while ((match = START_PATTERN.exec(input)) !== null) {
    const index = match.index + (match[1] === ' ' ? 1 : 0);
    matches.push({ index });
  }
  if (matches.length === 0) return [input.trim()];
  const results = [];
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = matches[i + 1] ? matches[i + 1].index : input.length;
    results.push(input.substring(start, end).trim());
  }
  return results;
};

const getSymmetricPairs = (numStr) => {
  if (numStr.length !== 3) return null;
  if (numStr[0] !== numStr[2]) return null;
  return [numStr[0] + numStr[1], numStr[1] + numStr[0]];
};

const parseDetails = (lines) => {
  const finalResults = [];

  lines.forEach(line => {
    let type = 'unknown';
    const lowerLine = line.toLowerCase();
    
    // Xác định Type
    if (dStarts.some(k => lowerLine.startsWith(k.toLowerCase()))) type = 'de';
    else if (lStarts.some(k => lowerLine.startsWith(k.toLowerCase()))) type = 'lo';
    else if (xqStarts.some(k => lowerLine.startsWith(k.toLowerCase()))) type = 'xq';
    else if (xStarts.some(k => lowerLine.startsWith(k.toLowerCase()))) type = 'xien';

    // Xóa bỏ từ khóa ở đầu dòng để tránh Regex quét nhầm vào type
    let content = line;
    START_KEYWORDS.forEach(k => {
        const reg = new RegExp(`^${k}\\s*`, 'i');
        content = content.replace(reg, '');
    });

    // Regex mới: Tìm [Dãy số/dấu ngăn cách] rồi đến [x + Tiền] hoặc [Tiền + Đơn vị]
    // Group 1: Toàn bộ dãy số (23 12.13)
    // Group 2: Số tiền (4)
    // Group 3: Đơn vị (đ)
    const pattern = /([0-9.,/\s]+?)\s*(?:x\s*|(?=\d))([0-9.]+)\s*([knđd])/gi;
    
    let match;
    let foundAny = false;

    while ((match = pattern.exec(content)) !== null) {
      foundAny = true;
      const rawNums = match[1]; 
      const amount = match[2];
      const unit = match[3];

      // Tách các cụm số bằng bất kỳ ký tự không phải số
      const segments = rawNums.split(/[^0-9]+/).filter(n => n.length > 0);

      segments.forEach(seg => {
        if (seg.length === 3) {
          const pairs = getSymmetricPairs(seg);
          if (pairs) {
            pairs.forEach(p => finalResults.push({ type, number: p, amount: amount + unit, isValid: true }));
          } else {
            finalResults.push({ type, number: seg, amount: amount + unit, isValid: false });
          }
        } else if (seg.length === 2) {
          finalResults.push({ type, number: seg, amount: amount + unit, isValid: true });
        } else {
          finalResults.push({ type, number: seg, amount: amount + unit, isValid: false });
        }
      });
    }

    // Nếu không khớp pattern nào, bôi đỏ cả dòng
    if (!foundAny) {
      finalResults.push({ type, number: '?', amount: '?', isValid: false, originalLine: line });
    }
  });

  return finalResults;
};

// =============================================================================

const inputRaw = "đ 131.434 x15n 454.656 x6k 23 12.13 x4đ lo 131.434 x15n xiên 12.21 x10k xiên quây 20.22.343 11.545.21 x20k";

// Bước 1: Tách tin
const step1 = splitMessage(inputRaw); 
console.log("🚀 ~ step1:", step1)
// Kết quả: ["đ 131.434 x15n 454.656 x6k 23 12.13 x4đ xiên 12.21 x10k xiên quây 20.22.343 11.545.21 x20k", "lo 131.434 x15n"]

// Bước 2: Phân tích
const step2 = parseDetails(step1);
console.log("🚀 ~ step2:", step2)
