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

test('dependency updates cover the three ecosystems with a seven-day cooldown', () => {
  const dependabot = Bun.YAML.parse(readRepositoryFile('.github/dependabot.yml'));
  expect(dependabot.version).toBe(2);
  expect(dependabot.updates.map((update) => update['package-ecosystem']).sort())
    .toEqual(['bun', 'github-actions', 'pre-commit']);
  for (const update of dependabot.updates) {
    expect(update.directory).toBe('/');
    expect(update.schedule.interval).toBe('weekly');
    expect(update.cooldown['default-days']).toBe(7);
  }
  const bunfig = Bun.TOML.parse(readRepositoryFile('bunfig.toml'));
  expect(bunfig.install.minimumReleaseAge).toBe(7 * 24 * 60 * 60);
});

test('hook revisions are pinned and annotated for release-based Dependabot updates', () => {
  for (const repo of prek.repos) {
    expect(repo.rev).toMatch(/^[a-f0-9]{40}$/);
  }
  const revisions = readRepositoryFile('.pre-commit-config.yaml')
    .split('\n').filter((line) => line.trim().startsWith('rev:'));
  for (const revision of revisions) {
    expect(revision).toMatch(/# frozen: v\d+\.\d+\.\d+$/);
  }
});

test('text defaults to LF with Windows command script exceptions', () => {
  const attributes = readRepositoryFile('.gitattributes').trim().split('\n');
  expect(attributes).toContain('* text=auto eol=lf');
  expect(attributes).toContain('*.cmd text eol=crlf');
  expect(attributes).toContain('*.bat text eol=crlf');
});
