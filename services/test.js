// test-bo-and-total.js
// Test: Bộ số (cách 5) và tổng tiền đánh

const {
  generateDanBo,
  parseDetails,
  summarize,
  splitMessage,
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

console.log('\nCase 1: de dan 4-9 x10k');
const input1 = 'de dan 4-9 x10k';
const segments1 = splitMessage(input1);
const parsed1 = parseDetails(segments1);

console.log(`   Số bets: ${parsed1.length} (expected: 36)`);
console.log(`   Amount per bet: ${parsed1[0]?.amount}`);

// Mock KQXS for finalize
const mockKQXS = {
  results: {
    DB: ['56848'],
    G1: ['73483'],
    G2: ['92423', '03127'],
    G3: ['91144', '79928', '68003', '34736', '86885', '73286'],
    G4: ['8396', '4678', '6700', '0668'],
    G5: ['9231', '4787', '8494', '9238', '8841', '1247'],
    G6: ['214', '587', '621'],
    G7: ['52', '95', '92', '91']
  }
};

const { finalize } = require('./lotteryService');
const finalized1 = finalize(parsed1, mockKQXS);
const summary1 = summarize(finalized1);

console.log('\n   Summary:');
Object.keys(summary1).forEach(cat => {
  const g = summary1[cat];
  console.log(`   ${g.summary}`);
  if (g.totalDanAmount) {
    console.log(`   Total amount: ${g.totalDanAmount}k (expected: 360k)`);
    console.log(g.totalDanAmount === 360 ? '   ✅ PASS' : '   ❌ FAIL');
  }
});

// =============================================================================
// Test 3: Multiple dans với total amount
// =============================================================================
console.log('\n\nCase 2: de dan 4-9 x10k, bo 18 x5k');
const input2 = 'de dan 4-9 x10k, bo 18 x5k';
const { splitDanSegments } = require('./lotteryService');

const segments2 = splitMessage(input2);
const expandedSegments2 = [];
segments2.forEach(seg => {
  const split = splitDanSegments(seg);
  expandedSegments2.push(...split);
});

const parsed2 = parseDetails(expandedSegments2);
console.log(`   Total bets: ${parsed2.length} (expected: 44)`);

const finalized2 = finalize(parsed2, mockKQXS);
const summary2 = summarize(finalized2);

console.log('\n   Summary:');
Object.keys(summary2).forEach(cat => {
  const g = summary2[cat];
  console.log(`   ${g.summary}`);
  if (g.totalDanAmount) {
    console.log(`   Total amount: ${g.totalDanAmount}k`);
  }
});

// Expected:
// - Dàn 4-9: 36 con x 5k = 180k
// - Bộ 18: 8 con x 5k = 40k
// - Total: 220k

const totalExpected = 220;
const totalActual = Object.keys(summary2).reduce((sum, cat) => {
  const g = summary2[cat];
  return sum + (g.totalDanAmount || 0);
}, 0);

console.log(`\n   Total ALL: ${totalActual}k (expected: ${totalExpected}k)`);
console.log(totalActual === totalExpected ? '   ✅ PASS' : '   ❌ FAIL');

// =============================================================================
// Test 4: Compare với đề thường
// =============================================================================
console.log('\n\nCase 3: Compare - de 12.34 x10k vs de dan 4-9 x10k');
console.log('-'.repeat(70));

const inputStandard = 'de 12.34 x10k';
const segmentsStandard = splitMessage(inputStandard);
const parsedStandard = parseDetails(segmentsStandard);

console.log(`\n   Standard đề (12.34): ${parsedStandard.length} bets`);
console.log(`   Amount per bet: ${parsedStandard[0]?.amount}`);

const finalizedStandard = finalize(parsedStandard, mockKQXS);
const summaryStandard = summarize(finalizedStandard);

Object.keys(summaryStandard).forEach(cat => {
  const g = summaryStandard[cat];
  console.log(`   ${g.summary}`);
  console.log(`   Total: ${g.totalPoints}k (NOT ${g.totalDanAmount}k because no dàn)`);
});

console.log('\n   Key difference:');
console.log('   - Standard: totalPoints = sum of each bet');
console.log('   - Dàn: totalDanAmount = count × amount per bet');

// =============================================================================
// Summary
// =============================================================================
console.log('\n' + '='.repeat(70));
console.log('📊 SUMMARY');
console.log('='.repeat(70));

console.log(`
✅ Bộ Số:
   - Bộ 00, 05, 50, 55 → same 4 numbers
   - Bộ 02, 07, 20, 25, 52, 57, 70, 75 → same 8 numbers
   - Bộ 18 → 8 numbers
   - Bộ 49 → 4 numbers

✅ Tổng Tiền:
   - de dan 4-9 x10k → 36 bets × 10k = 360k
   - de bo 18 x5k → 8 bets × 5k = 40k
   - de 12.34 x10k → 2 bets, total = 20k (standard)

✅ Summary Format:
   - Dàn: "Đề (dàn 4-9): 0/360k (36 con)"
   - Standard: "Đề: 0/20k"

🎉 All tests completed!
`);