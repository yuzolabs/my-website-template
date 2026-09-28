import { expect, test } from 'bun:test';
import { lstat, mkdir, mkdtemp, readdir, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSite } from './build.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

async function withRoot(run) {
  const root = await mkdtemp(path.join(tmpdir(), 'site-build-'));
  try {
    return await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function writeSite(site) {
  await mkdir(path.join(site, 'nested', 'empty'), { recursive: true });
  await writeFile(path.join(site, 'index.html'), '<main>Home</main>\n');
  await writeFile(path.join(site, 'c.txt'), 'c');
  await writeFile(path.join(site, 'a.txt'), 'a');
  await writeFile(path.join(site, '.keep'), 'keep');
  await writeFile(path.join(site, 'nested', 'z.txt'), 'z');
}

test('replaces dist with a deterministic copy of site', async () => {
  await withRoot(async (root) => {
    const site = path.join(root, 'site');
    const dist = path.join(root, 'dist');
    await writeSite(site);
    await mkdir(dist, { recursive: true });
    await writeFile(path.join(dist, 'stale.txt'), 'old');

    await buildSite({ siteDir: site, distDir: dist });
    await buildSite({ siteDir: site, distDir: path.join(root, 'dist-again') });

    expect(await readFile(path.join(dist, 'index.html'), 'utf8')).toBe('<main>Home</main>\n');
    expect(await readFile(path.join(dist, 'a.txt'), 'utf8')).toBe('a');
    expect(await readFile(path.join(dist, 'c.txt'), 'utf8')).toBe('c');
    expect(await readFile(path.join(dist, '.keep'), 'utf8')).toBe('keep');
    expect(await readFile(path.join(dist, 'nested', 'z.txt'), 'utf8')).toBe('z');
    expect((await lstat(path.join(dist, 'nested', 'empty'))).isDirectory()).toBe(true);
    await expect(lstat(path.join(dist, 'stale.txt'))).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(lstat(path.join(dist, 'site'))).rejects.toMatchObject({ code: 'ENOENT' });

    const again = path.join(root, 'dist-again');
    expect(await readFile(path.join(again, 'index.html'), 'utf8')).toBe(await readFile(path.join(dist, 'index.html'), 'utf8'));
    expect((await readdir(root)).filter((name) => name.startsWith('.dist-'))).toEqual([]);
  });
});

test('symlinks outside the site cannot enter the public build', async () => {
  await withRoot(async (root) => {
    const site = path.join(root, 'site');
    const dist = path.join(root, 'dist');
    await writeSite(site);
    await writeFile(path.join(root, 'private.txt'), 'private');
    await symlink(path.join(root, 'private.txt'), path.join(site, 'link.txt'));
    await mkdir(dist);
    await writeFile(path.join(dist, 'keep.txt'), 'keep');

    await expect(buildSite({ siteDir: site, distDir: dist })).rejects.toThrow(/must not contain symlinks/);
    expect(await readFile(path.join(dist, 'keep.txt'), 'utf8')).toBe('keep');
    expect((await readdir(root)).filter((name) => name.startsWith('.dist-'))).toEqual([]);
  });
});

test('missing index fails without replacing dist', async () => {
  await withRoot(async (root) => {
    const site = path.join(root, 'site');
    const dist = path.join(root, 'dist');
    await mkdir(site, { recursive: true });
    await writeFile(path.join(site, 'other.html'), '<p>other</p>');
    await mkdir(dist, { recursive: true });
    await writeFile(path.join(dist, 'keep.txt'), 'keep');

    await expect(buildSite({ siteDir: site, distDir: dist })).rejects.toThrow(/Missing site entry/);
    expect(await readFile(path.join(dist, 'keep.txt'), 'utf8')).toBe('keep');
    expect((await readdir(root)).filter((name) => name.startsWith('.dist-'))).toEqual([]);
  });
});

test('empty or non-file index fails without creating dist', async () => {
  await withRoot(async (root) => {
    const emptySite = path.join(root, 'empty-site');
    const emptyDist = path.join(root, 'empty-dist');
    await mkdir(emptySite, { recursive: true });
    await writeFile(path.join(emptySite, 'index.html'), '');
    await expect(buildSite({ siteDir: emptySite, distDir: emptyDist })).rejects.toThrow(/Missing site entry/);
    await expect(lstat(emptyDist)).rejects.toMatchObject({ code: 'ENOENT' });

    const dirSite = path.join(root, 'dir-site');
    const dirDist = path.join(root, 'dir-dist');
    await mkdir(path.join(dirSite, 'index.html'), { recursive: true });
    await expect(buildSite({ siteDir: dirSite, distDir: dirDist })).rejects.toThrow(/Missing site entry/);
    await expect(lstat(dirDist)).rejects.toMatchObject({ code: 'ENOENT' });
  });
});

test('starter page copies to a non-empty index', async () => {
  await withRoot(async (root) => {
    const dist = path.join(root, 'dist');
    await buildSite({ siteDir: path.join(repoRoot, 'site'), distDir: dist });
    const html = await readFile(path.join(dist, 'index.html'), 'utf8');
    const source = await readFile(path.join(repoRoot, 'site', 'index.html'), 'utf8');
    expect(html).toBe(source);
    expect(html.includes('<main')).toBe(true);
    expect(html.length).toBeGreaterThan(0);
  });
});
