import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';

const listener = createServer();
listener.listen(0, '127.0.0.1');
await once(listener, 'listening');
const port = listener.address().port;
const listenerClosed = once(listener, 'close');
listener.close();
await listenerClosed;

const server = spawn(
  'bunx',
  ['--package', 'wrangler@4.135.0', 'wrangler', 'pages', 'dev', 'dist', '--ip', '127.0.0.1', '--port', String(port)],
  { detached: true, stdio: ['ignore', 'pipe', 'pipe'] },
);
const stopped = new Promise((resolve) => server.once('close', resolve));

try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Pages local runtime did not become ready')), 60_000);
    let output = '';
    const receive = (chunk) => {
      output += chunk.toString();
      if (/Ready on http:\/\/127\.0\.0\.1:/.test(output)) {
        clearTimeout(timeout);
        resolve();
      }
    };
    server.stdout.on('data', receive);
    server.stderr.on('data', receive);
    server.once('error', (error) => { clearTimeout(timeout); reject(error); });
    server.once('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`Pages local runtime exited ${code}: ${output}`));
    });
  });

  const origin = `http://127.0.0.1:${port}`;
  const page = await fetch(origin);
  const html = await page.text();
  if (page.status !== 200 || !html.includes('<main') || !page.headers.get('x-robots-tag')?.includes('noindex')) {
    throw new Error(`Staging page failed: HTTP ${page.status}, X-Robots-Tag=${page.headers.get('x-robots-tag')}`);
  }
  const metadata = await fetch(`${origin}/deployment.json`);
  const deployment = await metadata.json();
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  if (metadata.status !== 200 || deployment.commit !== commit) {
    throw new Error('Staging deployment metadata does not match this build');
  }
  console.log(`PASS Pages local HTTP 200; X-Robots-Tag: ${page.headers.get('x-robots-tag')}; commit: ${deployment.commit}`);
} finally {
  if (server.pid && server.exitCode === null) {
    process.kill(-server.pid, 'SIGTERM');
  }
  await stopped;
}
