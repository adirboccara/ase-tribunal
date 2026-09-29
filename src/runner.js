require('dotenv').config();
const fs = require('fs');
const path = require('path');

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

if (!OPENROUTER_API_KEY || OPENROUTER_API_KEY.includes('your_api_key_here')) {
  console.error('Error: Please provide a valid OPENROUTER_API_KEY in .env file.');
  process.exit(1);
}

const chargeSheet = JSON.parse(fs.readFileSync(path.join(__dirname, '../cases/charge-sheet.json'), 'utf8'));

const prompts = {
  barak: fs.readFileSync(path.join(__dirname, '../prompts/05_judge_aharon_barak.md'), 'utf8'),
  elon: fs.readFileSync(path.join(__dirname, '../prompts/06_judge_menachem_elon.md'), 'utf8'),
  shamgar: fs.readFileSync(path.join(__dirname, '../prompts/07_judge_meir_shamgar.md'), 'utf8'),
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function getDynamicFreeModel() {
  try {
    const res = await fetch('https://openrouter.ai/api/v1/models');
    const data = await res.json();
    const freeModels = data.data.filter(m => m.id.endsWith(':free'));
    if (freeModels.length > 0) {
      const preferred = freeModels.find(m => m.id.includes('zephyr') || m.id.includes('phi') || m.id.includes('openchat'));
      return preferred ? preferred.id : freeModels[0].id;
    }
  } catch (e) {
    console.warn('Failed to fetch models, defaulting...');
  }
  return 'huggingfaceh4/zephyr-7b-beta:free';
}

async function callOpenRouter(systemPrompt, userContent, modelId) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/agentic-software-engineering',
      'X-Title': 'ASE Tribunal Runner'
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent }
      ],
      temperature: 0.2
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API Error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

async function runTribunal() {
  console.log('====================================================');
  console.log(`CASE: ${chargeSheet.title} (ID: ${chargeSheet.case_id})`);
  console.log('====================================================\n');

  console.log('[System] Querying OpenRouter for live free models...');
  const activeModel = await getDynamicFreeModel();
  console.log(`[System] Auto-selected available model: ${activeModel}\n`);

  const caseContext = `
Canonical Facts:
${chargeSheet.agreed_facts.map((f, i) => `${i + 1}.${f}`).join('\n')}

Issue for Judgment:
${chargeSheet.question_for_judgment.issue}

Requirement: State whether the act is "justified" or "not justified" and provide your judicial legal reasoning in your distinct judicial methodology.
`;

  const tribunalResults = {};

  for (const [judgeKey, promptText] of Object.entries(prompts)) {
    console.log(`[Deliberating] Summoning Judge: ${judgeKey.toUpperCase()}...`);
    try {
      const reasoning = await callOpenRouter(promptText, caseContext, activeModel);
      tribunalResults[judgeKey] = {
        verdict: reasoning.toLowerCase().includes('not justified') ? 'not justified' : 'justified',
        reasoning: reasoning
      };
    } catch (err) {
      console.error(`Error querying ${judgeKey}:`, err.message);
      tribunalResults[judgeKey] = {
        verdict: 'error',
        reasoning: err.message
      };
    }
    await sleep(2500); // 2.5 second delay to avoid rate limits
  }

  console.log('\n====================================================');
  console.log('           TRI-VERDICT TRIBUNAL RECORD              ');
  console.log('  (Strict Non-Merging Protocol: Opinions Stand Alone) ');
  console.log('====================================================\n');

  ['barak', 'elon', 'shamgar'].forEach((judge) => {
    console.log(`--- [OPINION OF JUDGE ${judge.toUpperCase()}] ---`);
    console.log(`Verdict   : ${tribunalResults[judge].verdict.toUpperCase()}`);
    console.log(`Reasoning :\n${tribunalResults[judge].reasoning}\n`);
  });

  console.log('====================================================');
  console.log('End of Tribunal Proceeding. No consensus combined.');
  console.log('====================================================');
}

runTribunal();
