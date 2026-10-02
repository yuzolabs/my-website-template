import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const rootUrl = new URL('../', import.meta.url);
const readRepositoryFile = (file) => readFileSync(new URL(file, rootUrl), 'utf8');

test('new dependency versions require a seven-day release age', () => {
  const bunfig = Bun.TOML.parse(readRepositoryFile('bunfig.toml'));
  expect(bunfig.install.minimumReleaseAge).toBe(7 * 24 * 60 * 60);
});
