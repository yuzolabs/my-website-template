import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (!/^[a-f0-9]{40}$/.test(commit)) {
  throw new Error('Staging build requires a full commit SHA');
}
if (process.env.EXPECTED_COMMIT && process.env.EXPECTED_COMMIT !== commit) {
  throw new Error('Staging build commit does not match EXPECTED_COMMIT');
}

execFileSync('bun', ['run', 'build'], { stdio: 'inherit' });
readFileSync('dist/index.html');
writeFileSync('dist/deployment.json', `${JSON.stringify({ commit }, null, 2)}\n`);
writeFileSync(
  'dist/_headers',
  '/*\n  X-Robots-Tag: noindex, nofollow\n  Cache-Control: no-store\n',
);
