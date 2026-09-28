import { copyFile, lstat, mkdir, mkdtemp, readdir, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export async function buildSite({ siteDir, distDir } = {}) {
  const site = path.resolve(siteDir ?? path.join(rootDir, 'site'));
  const dist = path.resolve(distDir ?? path.join(rootDir, 'dist'));
  await assertIndex(path.join(site, 'index.html'));

  await mkdir(path.dirname(dist), { recursive: true });
  const staging = await mkdtemp(path.join(path.dirname(dist), '.dist-'));
  try {
    await copySorted(site, staging);
    await rm(dist, { recursive: true, force: true });
    await rename(staging, dist);
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}

async function assertIndex(indexPath) {
  let info;
  try {
    info = await lstat(indexPath);
  } catch (error) {
    if (error && (error.code === 'ENOENT' || error.code === 'ENOTDIR')) {
      throw new Error(`Missing site entry: ${indexPath}`);
    }
    throw error;
  }
  if (!info.isFile() || info.size === 0) {
    throw new Error(`Missing site entry: ${indexPath}`);
  }
}

async function copySorted(src, dest) {
  const info = await lstat(src);
  if (info.isSymbolicLink()) {
    throw new Error(`Site assets must not contain symlinks: ${src}`);
  }
  if (info.isDirectory()) {
    await mkdir(dest, { recursive: true });
    const names = (await readdir(src)).sort();
    for (const name of names) {
      await copySorted(path.join(src, name), path.join(dest, name));
    }
    return;
  }
  if (info.isFile()) {
    await copyFile(src, dest);
    return;
  }
  throw new Error(`Unsupported site entry: ${src}`);
}

function isDirectRun() {
  if (import.meta.main === true) return true;
  const entry = process.argv[1];
  return Boolean(entry) && import.meta.url === pathToFileURL(entry).href;
}

if (isDirectRun()) {
  try {
    await buildSite();
    console.log('built dist');
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
