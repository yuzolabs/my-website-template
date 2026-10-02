import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const rootUrl = new URL('../', import.meta.url);
const readRepositoryFile = (file) => readFileSync(new URL(file, rootUrl), 'utf8');
const prek = Bun.YAML.parse(readRepositoryFile('.pre-commit-config.yaml'));
const hooks = prek.repos.flatMap((repo) => repo.hooks);

test('main branch guard applies to commits but not CI history scans', () => {
  const guard = hooks.find((hook) => hook.id === 'no-commit-to-branch');
  expect(guard.args).toEqual(['--branch', 'main']);
  expect(guard.stages).toEqual(['pre-commit']);
});

test('new dependency versions require a seven-day release age', () => {
  const bunfig = Bun.TOML.parse(readRepositoryFile('bunfig.toml'));
  expect(bunfig.install.minimumReleaseAge).toBe(7 * 24 * 60 * 60);
});
