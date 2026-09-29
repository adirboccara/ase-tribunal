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
  // Representatives
  jon: fs.readFileSync(path.join(__dirname, '../prompts/01_rep_jon_snow.md'), 'utf8'),
  tyrion: fs.readFileSync(path.join(__dirname, '../prompts/02_rep_tyrion_lannister.md'), 'utf8'),
  daenerys: fs.readFileSync(path.join(__dirname, '../prompts/03_rep_daenerys_targaryen.md'), 'utf8'),
  grey_worm: fs.readFileSync(path.join(__dirname, '../prompts/04_rep_grey_worm.md'), 'utf8'),
  // Judges
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
      'Content-Type': 'application/json'
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
    throw new Error(`OpenRouter API Error (${response.status})`);
  }

  const data = await response.json();
  return data.choices[0].message.content.trim();
}

async function runTribunal() {
  console.log('====================================================');
  console.log(`CASE: ${chargeSheet.title} (ID: ${chargeSheet.case_id})`);
  console.log('====================================================\n');

  const activeModel = await getDynamicFreeModel();
  console.log(`[System] Auto-selected available model: ${activeModel}\n`);

  const baseContext = `
Canonical Facts:
${chargeSheet.agreed_facts.map((f, i) => `${i + 1}.${f}`).join('\n')}
Issue for Judgment: ${chargeSheet.question_for_judgment.issue}
`;

  // --- PHASE 1: REPRESENTATIVES ARGUE ---
  console.log('--- PHASE 1: REPRESENTATIVE ARGUMENTS ---');
  const repArguments = {};
  const reps = ['jon', 'tyrion', 'daenerys', 'grey_worm'];
  
  for (const rep of reps) {
    console.log(`[Summoning Representative] ${rep.toUpperCase()}...`);
    try {
      repArguments[rep] = await callOpenRouter(prompts[rep], baseContext + "\nState your position briefly.", activeModel);
    } catch (err) {
      repArguments[rep] = "Failed to provide argument due to error.";
    }
    await sleep(2000);
  }

  // --- PHASE 2: JUDGES DELIBERATE ---
  console.log('\n--- PHASE 2: JUDICIAL DELIBERATION ---');
  const judicialContext = `
${baseContext}

Arguments Presented by Representatives:
- Jon Snow: ${repArguments.jon}
- Tyrion Lannister: ${repArguments.tyrion}
- Daenerys Targaryen: ${repArguments.daenerys}
- Grey Worm: ${repArguments.grey_worm}

Requirement: Based on the facts and arguments above, state whether the act is "justified" or "not justified" and provide your judicial legal reasoning.
`;

  const tribunalResults = {};
  const judges = ['barak', 'elon', 'shamgar'];

  for (const judge of judges) {
    console.log(`[Summoning Judge] ${judge.toUpperCase()}...`);
    try {
      const reasoning = await callOpenRouter(prompts[judge], judicialContext, activeModel);
      tribunalResults[judge] = {
        verdict: reasoning.toLowerCase().includes('not justified') ? 'not justified' : 'justified',
        reasoning: reasoning
      };
    } catch (err) {
      tribunalResults[judge] = { verdict: 'error', reasoning: err.message };
    }
    await sleep(2000);
  }

  // --- STRICT TRI-VERDICT PRESENTATION ---
  console.log('\n====================================================');
  console.log('           TRI-VERDICT TRIBUNAL RECORD              ');
  console.log('  (Strict Non-Merging Protocol: Opinions Stand Alone) ');
  console.log('====================================================\n');

  judges.forEach((judge) => {
    console.log(`--- [OPINION OF JUDGE ${judge.toUpperCase()}] ---`);
    console.log(`Verdict   : ${tribunalResults[judge].verdict.toUpperCase()}`);
    console.log(`Reasoning :\n${tribunalResults[judge].reasoning}\n`);
  });

  console.log('====================================================');
  console.log('End of Tribunal Proceeding. No consensus combined.');
  console.log('====================================================');
}

runTribunal();
