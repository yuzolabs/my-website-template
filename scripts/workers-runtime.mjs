import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

/** Runs local HTTP checks in an isolated process group; all timeout options are milliseconds. */
export async function withWorkersRuntime(command, args, verify, {
  startupTimeoutMs = 60_000,
  requestTimeoutMs = 5_000,
  shutdownTimeoutMs = 5_000,
  pollIntervalMs = 100,
} = {}) {
  const server = spawn(command, args, { detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = '';
  let processFailure;
  let closed = false;
  const collectOutput = (source, chunk) => {
    output = `${output}[${source}] ${chunk.toString()}`.slice(-16_384);
  };
  server.stdout.on('data', (chunk) => collectOutput('stdout', chunk));
  server.stderr.on('data', (chunk) => collectOutput('stderr', chunk));
  server.once('error', (error) => {
    processFailure = new Error(`Workers local runtime could not start: ${error.message}`, { cause: error });
  });
  server.once('exit', (code, signal) => {
    processFailure = new Error(`Workers local runtime exited: code=${code}, signal=${signal}`);
  });
  const stopped = new Promise((resolve) => server.once('close', () => {
    closed = true;
    resolve();
  }));

  function assertRunning() {
    if (processFailure) throw processFailure;
  }

  async function waitForHttp(origin) {
    const deadline = Date.now() + startupTimeoutMs;
    let lastError;
    while (Date.now() < deadline) {
      assertRunning();
      const remaining = deadline - Date.now();
      try {
        const response = await fetch(origin, {
          redirect: 'manual',
          signal: AbortSignal.timeout(Math.max(1, Math.min(requestTimeoutMs, remaining))),
        });
        await response.body?.cancel();
        assertRunning();
        return;
      } catch (error) {
        assertRunning();
        lastError = error;
      }
      await delay(Math.max(0, Math.min(pollIntervalMs, deadline - Date.now())));
    }
    assertRunning();
    throw new Error(`Workers local runtime did not respond over HTTP within ${startupTimeoutMs}ms: ${origin}`, {
      cause: lastError,
    });
  }

  async function fetchResponse(url) {
    assertRunning();
    try {
      const response = await fetch(url, {
        redirect: 'manual',
        signal: AbortSignal.timeout(requestTimeoutMs),
      });
      const body = await response.text();
      assertRunning();
      return { status: response.status, headers: response.headers, body };
    } catch (error) {
      assertRunning();
      throw new Error(`Workers local HTTP request failed: ${url}: ${error.message}`, { cause: error });
    }
  }

  function signalProcessGroup(signal) {
    if (!server.pid) return;
    try {
      process.kill(-server.pid, signal);
    } catch (error) {
      if (error.code !== 'ESRCH') throw error;
    }
  }

  async function waitForClose() {
    let timer;
    try {
      return await Promise.race([
        stopped.then(() => true),
        new Promise((resolve) => { timer = setTimeout(() => resolve(false), shutdownTimeoutMs); }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }

  async function stopRuntime() {
    if (closed) return;
    signalProcessGroup('SIGTERM');
    if (await waitForClose()) return;
    signalProcessGroup('SIGKILL');
    if (!await waitForClose()) {
      throw new Error('Workers local runtime did not stop after SIGKILL');
    }
  }

  try {
    try {
      return await verify({ waitForHttp, fetchResponse, pid: server.pid });
    } finally {
      await stopRuntime();
    }
  } catch (error) {
    throw new Error(`Workers smoke test failed: ${error.message}\nRuntime output (last 16384 characters):\n${output || '(no output)'}`, {
      cause: error,
    });
  }
}
