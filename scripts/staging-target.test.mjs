import { expect, test } from 'bun:test';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getStagingTarget } from './staging-target.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const targetEnv = {
  CLOUDFLARE_WORKER_STAGING: 'example-staging',
  CLOUDFLARE_WORKER_PRODUCTION: 'example-production',
  CLOUDFLARE_WORKERS_SUBDOMAIN: 'example-account',
  STAGING_URL: 'https://example-staging.example-account.workers.dev',
};

test('staging target accepts only a distinct Worker at the exact account URL', () => {
  expect(getStagingTarget(targetEnv)).toEqual({ name: 'example-staging', url: targetEnv.STAGING_URL });
  for (const key of Object.keys(targetEnv)) {
    expect(() => getStagingTarget({ ...targetEnv, [key]: undefined })).toThrow();
  }
  expect(() => getStagingTarget({ ...targetEnv, CLOUDFLARE_WORKER_PRODUCTION: 'example-staging' })).toThrow(/must differ/);
  for (const url of ['https://example-staging.pages.dev', `${targetEnv.STAGING_URL}/`, 'https://example-staging.wrong-account.workers.dev', 'http://example-staging.example-account.workers.dev']) {
    expect(() => getStagingTarget({ ...targetEnv, STAGING_URL: url })).toThrow(/STAGING_URL/);
  }
  for (const name of ['bad/name', 'UPPERCASE', '-leading', 'trailing-', 'a'.repeat(64)]) {
    expect(() => getStagingTarget({ ...targetEnv, CLOUDFLARE_WORKER_STAGING: name })).toThrow(/valid/);
  }
});

test('Cloudflare configuration rejects implicit or production mode', () => {
  for (const mode of [undefined, 'production', 'typo']) {
    const result = spawnSync('node', ['--input-type=module', '-e', `import config from './cloudflare.config.ts'; config({ mode: ${JSON.stringify(mode)}, isPreview: false });`], {
      cwd: root, encoding: 'utf8', env: { ...process.env, ...targetEnv },
    });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('production is not configured');
  }
});

test('prebuilt staging guard rejects wrong target, mode, preview, commit, or missing noindex', () => {
  const directory = mkdtempSync(path.join(root, '.staging-test-'));
  try {
    const output = path.join(directory, '.cloudflare/output/v0');
    const workerDir = path.join(output, 'workers/default');
    const assets = path.join(workerDir, 'assets');
    mkdirSync(assets, { recursive: true });
    const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
    const fixtures = [
      { mode: 'staging', name: targetEnv.CLOUDFLARE_WORKER_STAGING, commit, noindex: true, preview: false, ok: true },
      { mode: 'development' },
      { name: targetEnv.CLOUDFLARE_WORKER_PRODUCTION },
      { commit: '0'.repeat(40) },
      { noindex: false },
      { preview: true },
    ];
    for (const fixture of fixtures) {
      const settings = { ...fixtures[0], ...fixture };
      writeFileSync(path.join(output, 'config.json'), JSON.stringify({ buildContext: { mode: settings.mode, isPreview: settings.preview } }));
      writeFileSync(path.join(workerDir, 'worker.config.json'), JSON.stringify({ name: settings.name }));
      writeFileSync(path.join(assets, 'deployment.json'), JSON.stringify({ commit: settings.commit }));
      writeFileSync(path.join(assets, '_headers'), settings.noindex ? '/*\n  X-Robots-Tag: noindex, nofollow\n' : '');
      const result = spawnSync('node', [path.join(root, 'scripts/check-staging-target.mjs')], {
        cwd: directory, encoding: 'utf8', env: { ...process.env, ...targetEnv, EXPECTED_COMMIT: commit },
      });
      expect(result.status === 0).toBe(fixture.ok === true);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
