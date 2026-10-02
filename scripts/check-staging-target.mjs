import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { getStagingTarget } from './staging-target.mjs';

const target = getStagingTarget();
const output = '.cloudflare/output/v0';
const config = JSON.parse(readFileSync(`${output}/config.json`, 'utf8'));
const worker = JSON.parse(readFileSync(`${output}/workers/default/worker.config.json`, 'utf8'));
if (config.buildContext?.mode !== 'staging' || config.buildContext?.isPreview !== false || worker.name !== target.name) {
  throw new Error('Staging Build Output must match the configured Worker and staging mode; run check:staging with target variables first');
}
const assets = `${output}/workers/default/assets`;
const deployment = JSON.parse(readFileSync(`${assets}/deployment.json`, 'utf8'));
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (deployment.commit !== commit || (process.env.EXPECTED_COMMIT && deployment.commit !== process.env.EXPECTED_COMMIT)) {
  throw new Error('Staging Build Output commit does not match the requested commit');
}
if (!readFileSync(`${assets}/_headers`, 'utf8').includes('X-Robots-Tag: noindex, nofollow')) {
  throw new Error('Staging Build Output requires noindex headers');
}
console.log('PASS staging target, Build Output mode, noindex, and commit');
