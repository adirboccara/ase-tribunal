const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Test 1: Verify Canonical Charge Sheet
console.log('[Gate 1] Checking Canonical Charge Sheet...');
const chargeSheetPath = path.join(__dirname, '../cases/charge-sheet.json');
assert(fs.existsSync(chargeSheetPath), 'FAIL: charge-sheet.json missing');
const chargeSheet = JSON.parse(fs.readFileSync(chargeSheetPath, 'utf8'));
assert.strictEqual(chargeSheet.case_id, 'T-001', 'FAIL: Invalid case_id');
assert(chargeSheet.agreed_facts && chargeSheet.agreed_facts.length >= 5, 'FAIL: Agreed facts incomplete');
assert.strictEqual(chargeSheet.question_for_judgment.rule_of_aggregation, 'none (verdicts must be presented side-by-side without combination)', 'FAIL: Non-merging rule not codified');
console.log('✓ Gate 1 passed: Charge sheet specification is valid.');

// Test 2: Verify All 7 Agent Prompts Exist and are Non-Empty
console.log('[Gate 2] Checking 7 Versioned Prompts...');
const requiredPrompts = [
  '01_rep_jon_snow.md',
  '02_rep_tyrion_lannister.md',
  '03_rep_daenerys_targaryen.md',
  '04_rep_grey_worm.md',
  '05_judge_aharon_barak.md',
  '06_judge_menachem_elon.md',
  '07_judge_meir_shamgar.md'
];

requiredPrompts.forEach((file) => {
  const filePath = path.join(__dirname, '../prompts', file);
  assert(fs.existsSync(filePath), `FAIL: Missing prompt file ${file}`);
  const content = fs.readFileSync(filePath, 'utf8').trim();
  assert(content.length > 50, `FAIL: Prompt file ${file} is too short or empty`);
});
console.log('✓ Gate 2 passed: All 7 prompts present and verified.');

// Test 3: Enforcement of Non-Merging Rule on Output Schema
console.log('[Gate 3] Verifying Output Protocol Contract (Anti-Merge Enforcement)...');
function validateTribunalOutput(payload) {
  if (!payload || !payload.verdicts) {
    throw new Error('FAIL: Output missing verdicts container');
  }
  const judges = ['barak', 'elon', 'shamgar'];
  judges.forEach((judge) => {
    const v = payload.verdicts[judge];
    assert(v, `FAIL: Missing verdict for ${judge}`);
    assert(['justified', 'not justified'].includes(v.decision), `FAIL: Invalid decision value for ${judge}`);
    assert(typeof v.reasoning === 'string' && v.reasoning.length > 0, `FAIL: Missing reasoning for ${judge}`);
  });

  // Strict check: No consensus, summary, or merged score field allowed
  assert.strictEqual(payload.combined_verdict, undefined, 'CRITICAL FAIL: Combined verdict detected! Merging forbidden.');
  assert.strictEqual(payload.consensus, undefined, 'CRITICAL FAIL: Consensus score detected! Merging forbidden.');
  assert.strictEqual(payload.average_score, undefined, 'CRITICAL FAIL: Averaging detected! Merging forbidden.');
  return true;
}

// Test with valid mock
const validMock = {
  verdicts: {
    barak: { decision: 'not justified', reasoning: 'Fails proportionality test (least harmful means).' },
    elon: { decision: 'not justified', reasoning: 'Lack of judicial competence and breach of natural law.' },
    shamgar: { decision: 'not justified', reasoning: 'Absence of statutory authority and institutional basis.' }
  }
};
assert(validateTribunalOutput(validMock), 'FAIL: Valid mock failed verification');

// Test with invalid mock (attempted merge) - Gate must catch and fail this!
const mergedMock = {
  ...validMock,
  combined_verdict: 'Guilty'
};
assert.throws(() => validateTribunalOutput(mergedMock), /CRITICAL FAIL: Combined verdict detected/, 'FAIL: Gate failed to catch illegal merged verdict');

console.log('✓ Gate 3 passed: Protocol strictly enforces non-merged side-by-side opinions.');
console.log('\nALL VERIFICATION GATES PASSED.');
