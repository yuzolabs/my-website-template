import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const rootUrl = new URL('../', import.meta.url);
const readRepositoryFile = (file) => readFileSync(new URL(file, rootUrl), 'utf8');
const ci = Bun.YAML.parse(readRepositoryFile('.github/workflows/ci.yml'));
const prek = Bun.YAML.parse(readRepositoryFile('.pre-commit-config.yaml'));
const hooks = prek.repos.flatMap((repo) => repo.hooks);

function hookRunsAtStage(hook, stage) {
  return (hook.stages ?? prek.default_stages).includes(stage);
}

test('PR CI runs on main without deployment credentials or write permissions', () => {
  expect(ci.on.pull_request.branches).toEqual(['main']);
  expect(ci.on.push.branches).toEqual(['main']);
  expect(ci.on).not.toHaveProperty('pull_request_target');
  expect(ci.permissions).toEqual({});
  expect(JSON.stringify(ci)).not.toContain('secrets.');

  for (const job of Object.values(ci.jobs)) {
    expect(job.name).toBeTruthy();
    expect(job['timeout-minutes']).toBeGreaterThan(0);
    expect(job.permissions).toEqual({ contents: 'read' });
    expect(job).not.toHaveProperty('environment');
    for (const step of job.steps) {
      if (step.uses) expect(step.uses).toMatch(/@[a-f0-9]{40}$/);
      if (step.uses?.startsWith('actions/checkout@')) {
        expect(step.with['persist-credentials']).toBe(false);
      }
      if (step.run) expect(step.run).not.toMatch(/deploy:staging|cf deploy/);
    }
  }
});

test('quality CI checks locked dependencies, code, docs, build and local HTTP', () => {
  const commands = ci.jobs.quality.steps.flatMap((step) => step.run ? [step.run] : []);
  for (const command of [
    'bun install --frozen-lockfile',
    'bun run typecheck',
    'bun run lint:docs',
    'bun run test',
    'bun run build',
    'bun run check:staging',
  ]) {
    expect(commands).toContain(command);
  }
});

test('security CI fetches full history and runs the manual security hooks', () => {
  const steps = ci.jobs.security.steps;
  const checkout = steps.find((step) => step.uses?.startsWith('actions/checkout@'));
  expect(checkout.with['fetch-depth']).toBe(0);
  const action = steps.find((step) => step.uses?.startsWith('j178/prek-action@'));
  expect(action.with['extra-args']).toBe('--all-files --hook-stage manual');
  expect(action.with.cache).toBe(false);
  expect(String(action.with['prek-version'])).toMatch(/^\d+\.\d+\.\d+$/);

  const history = hooks.find((hook) => hook.alias === 'gitleaks-history');
  expect(history.entry).toBe('gitleaks git --redact --log-opts=--all');
  expect(history.stages).toEqual(['manual']);
  expect(history.always_run).toBe(true);
  const staged = hooks.find((hook) => hook.id === 'gitleaks' && !hook.alias);
  expect(staged.stages).toEqual(['pre-commit']);
  for (const id of ['semgrep', 'zizmor', 'check-toml']) {
    const hook = hooks.find((item) => item.id === id);
    expect(hookRunsAtStage(hook, 'manual')).toBe(true);
    expect(hookRunsAtStage(hook, 'pre-commit')).toBe(true);
  }
  expect(hooks.find((hook) => hook.id === 'semgrep').args).toContain('--error');
  expect(hooks.find((hook) => hook.id === 'zizmor').args).toEqual(['--persona', 'pedantic']);
});

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
