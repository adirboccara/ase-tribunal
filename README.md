# ASE Tribunal Project - Realm v. Jon Snow

## Overview
This project implements an Agentic Software Engineering Tribunal enforcing the strict Tri-Verdict (Anti-Merge) protocol. 
It features a 2-phase execution model: 
1. 4 Representatives present arguments.
2. 3 Judges (Barak, Elon, Shamgar) issue independent, non-merged verdicts.

## Architecture
- Dynamic OpenRouter free-model selection to handle rate limits.
- Strict Git history demonstrating model progression and architectural fixes.
- Verification gates ensuring prompt integrity and preventing merged verdicts.

## Setup
npm install
Add your OPENROUTER_API_KEY to a .env file

## Execution
Run Verification Gates:
npm test

Run Tribunal Simulation:
npm start