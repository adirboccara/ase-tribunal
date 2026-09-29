# Agent Directives - ASE Tribunal Project

## Core Protocol Constraints
1. **Tri-Verdict Rule (Strict):** Under NO circumstances should the three judicial opinions be merged, averaged, or synthesized into a single verdict or consensus score. All 3 verdicts must be output strictly side-by-side.
2. **Canonical Case Structure:** The case must be loaded from `cases/charge-sheet.json` as a structured specification, never as unformatted free text.
3. **OpenRouter Routing:** All LLM calls must route through OpenRouter.
4. **Agent Roles:** Maintain strict separation between the 4 representatives (Jon Snow, Tyrion Lannister, Daenerys Targaryen, Grey Worm) and the 3 judicial profiles (Barak, Elon, Shamgar).
5. **Verification First:** Output contracts and non-merging rules must be verified via automated test gates under `tests/`.