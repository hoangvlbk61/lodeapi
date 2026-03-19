// test-bo-and-total.js
// Test: Bộ số (cách 5) và tổng tiền đánh

const {
  generateDanBo,
  parseDetails,
  summarize,
  splitMessage,
  finalize,
} = require('./lotteryService');

console.log('🧪 TEST - Bộ Số và Tổng Tiền\n');
console.log('='.repeat(70));

// =============================================================================
// Test 1: Bộ số - cách 5 đơn vị
// =============================================================================
console.log('\n📝 TEST 1: Bộ Số - Cách 5 Đơn Vị');
console.log('-'.repeat(70));

console.log('\n1. Bộ 00:');
const bo00 = generateDanBo('00');
console.log(`   ${bo00.join(', ')}`);
console.log(`   Expected: 00, 05, 50, 55`);
console.log(`   Got ${bo00.length} numbers`);
console.log(bo00.length === 4 && bo00.includes('00') && bo00.includes('05') && bo00.includes('50') && bo00.includes('55') ? '   ✅ PASS' : '   ❌ FAIL');

console.log('\n2. Bộ 05 (same as bộ 00):');
const bo05 = generateDanBo('05');
console.log(`   ${bo05.join(', ')}`);
console.log(`   Expected: 00, 05, 50, 55 (same as bộ 00)`);
console.log(bo05.length === 4 ? '   ✅ PASS' : '   ❌ FAIL');

console.log('\n3. Bộ 20:');
const bo20 = generateDanBo('20');
console.log(`   ${bo20.join(', ')}`);
console.log(`   Expected: 02, 07, 20, 25, 52, 57, 70, 75`);
console.log(`   Got ${bo20.length} numbers`);
console.log(bo20.length === 8 ? '   ✅ PASS' : '   ❌ FAIL');

console.log('\n4. Bộ 02 (same as bộ 20):');
const bo02 = generateDanBo('02');
console.log(`   ${bo02.join(', ')}`);
console.log(`   Expected: same as bộ 20`);
console.log(bo02.length === bo20.length ? '   ✅ PASS' : '   ❌ FAIL');

console.log('\n5. Bộ 18:');
const bo18 = generateDanBo('18');
console.log(`   ${bo18.join(', ')}`);
console.log(`   Expected: 13, 18, 31, 36, 63, 68, 81, 86`);
console.log(`   Got ${bo18.length} numbers`);
console.log(bo18.length === 8 ? '   ✅ PASS' : '   ❌ FAIL');

console.log('\n6. Bộ 49:');
const bo49 = generateDanBo('49');
console.log(`   ${bo49.join(', ')}`);
console.log(`   Expected: 44, 49, 94, 99`);
console.log(`   Got ${bo49.length} numbers`);
console.log(bo49.length === 4 ? '   ✅ PASS' : '   ❌ FAIL');

// =============================================================================
// Test 2: Tổng tiền đánh cho dàn
// =============================================================================
console.log('\n\n📝 TEST 2: Tổng Tiền Đánh');
console.log('-'.repeat(70));

console.log('\nCase 1: xq 393.545x100n.454.232x100n');
// const input1 = 'xq 393.545x100n.454.232x100n';
const input1 = 'xq 232.434x100.10.545.44x100n 989.121 x 100 n';
const segments1 = splitMessage(input1);
console.log("🚀 ~ segments1:", segments1)
const parsed1 = parseDetails(segments1);
console.log("🚀 ~ parsed1:", parsed1.filter(e => e.type==="xien4"))

// Mock KQXS for finalize
const mockKQXS = {
  results: {
    "ĐB": ['56848'],
    G1: ['73483'],
    G2: ['92423', '03127'],
    G3: ['91144', '79928', '68003', '34736', '86885', '73286'],
    G4: ['8396', '4678', '6700', '0668'],
    G5: ['9231', '4787', '8494', '9238', '8841', '1247'],
    G6: ['214', '587', '621'],
    G7: ['52', '95', '92', '91']
  }
};

const finalized1 = finalize(parsed1, mockKQXS);
// console.log("🚀 ~ finalized1:", finalized1)
const summary1 = summarize(finalized1);
// console.log("🚀 ~ summary1:", summary1)
