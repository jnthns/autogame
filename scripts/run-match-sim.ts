import { runMatchSim } from '../src/game/matchSim.ts';

const result = runMatchSim();
for (const line of result.lines) {
  console.log(line);
}
process.exit(result.ok ? 0 : 1);
