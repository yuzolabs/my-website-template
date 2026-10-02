import { expect, test } from 'bun:test';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { withWorkersRuntime } from './workers-runtime.mjs';

async function reserveTestPort() {
  const listener = createServer();
  listener.listen(0, '127.0.0.1');
  await once(listener, 'listening');
  const port = listener.address().port;
  const closed = once(listener, 'close');
  listener.close();
  await closed;
  return port;
}

const timeouts = { startupTimeoutMs: 2_000, requestTimeoutMs: 200, shutdownTimeoutMs: 200, pollIntervalMs: 20 };

for (const coloredLogs of [false, true]) {
  test(`Workers readiness uses HTTP with ${coloredLogs ? 'ANSI-colored' : 'no'} startup logs`, async () => {
    const port = await reserveTestPort();
    const origin = `http://127.0.0.1:${port}`;
    const script = `
      const http = require('node:http');
      if (${coloredLogs}) console.log('Local: http://127.0.0.1:\\x1b[1m${port}\\x1b[22m/');
      setTimeout(() => {
        http.createServer((request, response) => response.end('ready'))
          .listen(${port}, '127.0.0.1');
      }, 150);
    `;
    await withWorkersRuntime('node', ['-e', script], async (runtime) => {
      await runtime.waitForHttp(origin);
      const response = await runtime.fetchResponse(origin);
      expect(response.status).toBe(200);
      expect(response.body).toBe('ready');
    }, timeouts);
  });
}

test('Workers readiness timeout reports stdout and stderr rather than trusting a logged URL', async () => {
  const port = await reserveTestPort();
  const origin = `http://127.0.0.1:${port}`;
  const script = `console.log('${origin}'); console.error('fixture never listens'); setInterval(() => {}, 1000);`;
  const result = withWorkersRuntime('node', ['-e', script], (runtime) => runtime.waitForHttp(origin), {
    ...timeouts, startupTimeoutMs: 300,
  });
  await expect(result).rejects.toThrow('did not respond over HTTP within 300ms');
  await expect(result).rejects.toThrow(`[stdout] ${origin}`);
  await expect(result).rejects.toThrow('[stderr] fixture never listens');
});

test('Workers early exit reports its exit code and output without waiting for startup timeout', async () => {
  const port = await reserveTestPort();
  const started = Date.now();
  const result = withWorkersRuntime('node', ['-e', "console.error('fixture startup error'); process.exit(7);"],
    (runtime) => runtime.waitForHttp(`http://127.0.0.1:${port}`), timeouts);
  await expect(result).rejects.toThrow('code=7');
  await expect(result).rejects.toThrow('fixture startup error');
  expect(Date.now() - started).toBeLessThan(timeouts.startupTimeoutMs);
});

test('Workers spawn failure reports ENOENT and finishes cleanup', async () => {
  await expect(withWorkersRuntime('/nonexistent/workers-test-runtime', [],
    (runtime) => runtime.waitForHttp('http://127.0.0.1:1'), timeouts))
    .rejects.toThrow('could not start');
});

test('Workers HTTP body requests have a timeout even after receiving headers', async () => {
  const port = await reserveTestPort();
  const origin = `http://127.0.0.1:${port}`;
  const script = `
    require('node:http').createServer((request, response) => {
      response.writeHead(200);
      response.flushHeaders();
    }).listen(${port}, '127.0.0.1');
    console.error('fixture body hangs');
  `;
  const result = withWorkersRuntime('node', ['-e', script], async (runtime) => {
    await runtime.waitForHttp(origin);
    await runtime.fetchResponse(origin);
  }, timeouts);
  await expect(result).rejects.toThrow('Workers local HTTP request failed');
  await expect(result).rejects.toThrow('fixture body hangs');
});

test('Workers HTTP readiness stays bounded when the server never sends headers', async () => {
  const port = await reserveTestPort();
  const script = `require('node:http').createServer(() => {}).listen(${port}, '127.0.0.1');`;
  await expect(withWorkersRuntime('node', ['-e', script],
    (runtime) => runtime.waitForHttp(`http://127.0.0.1:${port}`), { ...timeouts, startupTimeoutMs: 400 }))
    .rejects.toThrow('did not respond over HTTP within 400ms');
});

test('Workers responses preserve HTTP failures and do not follow redirects', async () => {
  const port = await reserveTestPort();
  const origin = `http://127.0.0.1:${port}`;
  const script = `
    require('node:http').createServer((request, response) => {
      response.writeHead(request.url === '/redirect' ? 302 : 500, { location: '/redirect' });
      response.end('fixture failure');
    }).listen(${port}, '127.0.0.1');
  `;
  await withWorkersRuntime('node', ['-e', script], async (runtime) => {
    await runtime.waitForHttp(origin);
    expect((await runtime.fetchResponse(origin)).status).toBe(500);
    expect((await runtime.fetchResponse(`${origin}/redirect`)).status).toBe(302);
  }, timeouts);
});

test('Workers validation failures include diagnostics and still terminate the process', async () => {
  const port = await reserveTestPort();
  let pid;
  const script = `
    require('node:http').createServer((request, response) => response.end('ready')).listen(${port}, '127.0.0.1');
    console.error('fixture diagnostics');
  `;
  const result = withWorkersRuntime('node', ['-e', script], async (runtime) => {
    pid = runtime.pid;
    await runtime.waitForHttp(`http://127.0.0.1:${port}`);
    throw new Error('fixture noindex missing');
  }, timeouts);
  await expect(result).rejects.toThrow('fixture noindex missing');
  await expect(result).rejects.toThrow('fixture diagnostics');
  expect(() => process.kill(pid, 0)).toThrow();
});

test('Workers shutdown escalates to SIGKILL if SIGTERM is ignored', async () => {
  const port = await reserveTestPort();
  let pid;
  const script = `
    process.on('SIGTERM', () => {});
    require('node:http').createServer((request, response) => response.end('ready')).listen(${port}, '127.0.0.1');
  `;
  await withWorkersRuntime('node', ['-e', script], async (runtime) => {
    pid = runtime.pid;
    await runtime.waitForHttp(`http://127.0.0.1:${port}`);
  }, timeouts);
  expect(() => process.kill(pid, 0)).toThrow();
});
