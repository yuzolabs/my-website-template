import { execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { getStagingTarget } from './staging-target.mjs';
import { withWorkersRuntime } from './workers-runtime.mjs';

const hasRemoteTarget = ['CLOUDFLARE_WORKER_STAGING', 'CLOUDFLARE_WORKER_PRODUCTION', 'CLOUDFLARE_WORKERS_SUBDOMAIN', 'STAGING_URL']
  .some((key) => process.env[key] !== undefined);
if (hasRemoteTarget) getStagingTarget();
const mode = hasRemoteTarget ? 'staging' : 'development';
execFileSync('node', ['node_modules/.bin/cf', 'build', '--mode', mode], { stdio: 'inherit' });

const listener = createServer();
listener.listen(0, '127.0.0.1');
await once(listener, 'listening');
const port = listener.address().port;
const listenerClosed = once(listener, 'close');
listener.close();
await listenerClosed;

await withWorkersRuntime('node', [
  'node_modules/.bin/vite', 'preview', '--mode', mode, '--host', '127.0.0.1', '--port', String(port), '--strictPort',
], async (runtime) => {
  const origin = `http://127.0.0.1:${port}`;
  await runtime.waitForHttp(origin);
  const page = await runtime.fetchResponse(origin);
  const html = page.body;
  if (page.status !== 200 || !html.includes('<main') || !page.headers.get('x-robots-tag')?.includes('noindex')) {
    throw new Error(`Staging page failed: HTTP ${page.status}, X-Robots-Tag=${page.headers.get('x-robots-tag')}`);
  }
  const metadata = await runtime.fetchResponse(`${origin}/deployment.json`);
  const deployment = JSON.parse(metadata.body);
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  if (metadata.status !== 200 || deployment.commit !== commit || !metadata.headers.get('x-robots-tag')?.includes('noindex')) {
    throw new Error('Staging deployment metadata does not match this build');
  }
  const missing = await runtime.fetchResponse(`${origin}/__staging_missing_page__`);
  if (missing.status !== 404) {
    throw new Error(`Workers static assets must return 404 for missing pages, received ${missing.status}`);
  }
  console.log(`PASS Workers local HTTP 200 and missing-page 404; X-Robots-Tag: ${page.headers.get('x-robots-tag')}; commit: ${deployment.commit}`);
});
