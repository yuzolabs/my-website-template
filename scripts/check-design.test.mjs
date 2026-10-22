import { expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lintDesign } from './check-design.mjs';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const scriptPath = path.join(repoRoot, 'scripts', 'check-design.mjs');

async function withSite(files, run) {
  const root = await mkdtemp(path.join(tmpdir(), 'design-lint-'));
  try {
    for (const [name, body] of Object.entries(files)) {
      const file = path.join(root, 'site', name);
      await mkdir(path.dirname(file), { recursive: true });
      await writeFile(file, body);
    }
    return await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function lint(files, config = { allow: [] }) {
  return withSite(files, (root) => lintDesign({ rootDir: root, config }));
}

function rules(findings) {
  return [...new Set(findings.map((finding) => finding.rule))].sort();
}

test('sloppy sample fails for gradient, emoji, badge, social proof, and vocabulary', async () => {
  const findings = await lint({
    'index.html': `<!DOCTYPE html>
<html>
<body>
  <style>
    .hero { background: linear-gradient(135deg, #667eea, #764ba2); }
  </style>
  <h1>&#x1F680; Launch</h1>
  <button>Start ✨</button>
  <span>LIVE</span>
  <p>Trusted by 10,000+ users. We delve into the product.</p>
</body>
</html>
`,
  });
  expect(rules(findings)).toEqual(['badge', 'emoji', 'gradient', 'social-proof', 'vocabulary']);
});

test('cli exits non-zero when the sample is sloppy', async () => {
  await withSite({
    'index.html': '<h1>🚀 Ship it</h1><p>We delve into the work.</p>\n',
  }, (root) => {
    const result = spawnSync(process.execPath, [scriptPath, '--root', root], { encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(result.stderr).toContain('emoji');
    expect(result.stderr).toContain('vocabulary');
    expect(result.stderr).toContain('design lint failed:');
  });
});

test('starter site and cli pass', async () => {
  expect(await lintDesign()).toEqual([]);
  const result = spawnSync(process.execPath, [scriptPath], { encoding: 'utf8', cwd: repoRoot });
  expect(result.status).toBe(0);
  expect(result.stdout).toContain('design lint passed');
});

test('base stylesheet keeps normal wrapping when auto-phrase is unsupported', async () => {
  const css = await readFile(path.join(repoRoot, 'site', 'base.css'), 'utf8');
  const html = await readFile(path.join(repoRoot, 'site', 'index.html'), 'utf8');
  const normal = css.indexOf('word-break: normal');
  const phrase = css.indexOf('word-break: auto-phrase');
  expect(normal).toBeGreaterThanOrEqual(0);
  expect(phrase).toBeGreaterThan(normal);
  expect(css).not.toContain('keep-all');
  expect(html).toContain('href="base.css"');
});

test('blue-purple gradients are detected and unrelated color is not', async () => {
  const findings = await lint({
    'theme.css': `
      .slop { background: linear-gradient(90deg, royalblue, rebeccapurple); }
      .named { background: linear-gradient(to right, blue, purple); }
      .rgb { background: linear-gradient(90deg, rgb(37, 99, 235), rgb(147, 51, 234)); }
      .hsl { background: linear-gradient(hsl(220 80% 50%), hsl(280 70% 45%)); }
      .oklch { background: linear-gradient(oklch(0.62 0.18 230), oklch(0.55 0.2 290)); }
      .blue { background: linear-gradient(#fff, #2563eb); }
      .warm { background: linear-gradient(red, orange); }
      .gray { background: linear-gradient(#111, #333); }
      /* linear-gradient(#667eea, #764ba2) */
      .note { background: url("delve.png"); font-family: "Myriad Pro", sans-serif; }
    `,
    'page.html': `
      <p class="text-blue-600 bg-purple-600">Plain colors.</p>
      <p class="bg-gradient-to-r from-blue-500 to-purple-600">Utility</p>
      <p class="from-[#2563eb] to-[#9333ea]">Arbitrary</p>
      <section style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)"></section>
      <p>Do not treat linear-gradient(#667eea, #764ba2) in prose as paint.</p>
      <p>In 2024 users read this sentence. Three users remained.</p>
    `,
  });
  const gradientFiles = findings.filter((finding) => finding.rule === 'gradient').map((finding) => finding.file);
  expect(gradientFiles).toContain('site/theme.css');
  expect(gradientFiles).toContain('site/page.html');
  expect(findings.some((finding) => finding.rule === 'vocabulary')).toBe(false);
  expect(findings.some((finding) => finding.rule === 'social-proof')).toBe(false);
  expect(findings.filter((finding) => finding.rule === 'gradient')).toHaveLength(8);
});

test('separate rules do not combine into a blue-purple gradient', async () => {
  const findings = await lint({
    'split.css': '.a { color: from-blue-500; } .b { color: to-purple-600; }\n',
  });
  expect(findings).toEqual([]);
});

test('emoji is limited to headings and buttons', async () => {
  const findings = await lint({
    'index.html': `
      <h2>Welcome ★</h2>
      <p>✨ in body copy stays.</p>
      <a role="button">✨ Start</a>
      <a class="btn-primary">🚀 Go</a>
      <input type="submit" value="🔥 Send">
      <h1><img alt="&#128640; rocket"></h1>
      <code><h1>🚀 not chrome</h1></code>
    `,
    'icons.css': `
      h1::before { content: "🚀"; }
      .icon::before { content: "✨"; }
      .button::after { content: "🔥"; }
    `,
  });
  expect(findings.every((finding) => finding.rule === 'emoji')).toBe(true);
  expect(findings.length).toBe(6);
});

test('badges are standalone ornaments and sentences are not', async () => {
  const findings = await lint({
    'index.html': `
      <span class="badge">Live</span>
      <small>NEW</small>
      <div class="pill">COMING SOON</div>
      <p>The live recording is archived.</p>
      <h1>AI</h1>
      <code><span>LIVE</span></code>
      <title>LIVE</title>
    `,
  });
  expect(findings.map((finding) => finding.message)).toEqual([
    expect.stringContaining('Live'),
    expect.stringContaining('NEW'),
    expect.stringContaining('COMING SOON'),
  ]);
  expect(findings.every((finding) => finding.rule === 'badge')).toBe(true);
});

test('social proof catches invented scale in English and Japanese', async () => {
  const findings = await lint({
    'index.html': `
      <p>10k+ users and 10000+ customers joined.</p>
      <p>1万人が利用しています。10,000人以上が導入しました。</p>
      <p>10,000 items in the catalog.</p>
      <p>3 users in the example.</p>
    `,
  });
  expect(findings.every((finding) => finding.rule === 'social-proof')).toBe(true);
  expect(findings.length).toBe(4);
});

test('vocabulary matches AI phrasing and not ordinary English', async () => {
  const findings = await lint({
    'index.html': `
      <p>We Delve into a digital landscape and it's worth noting the rest.</p>
      <p>Delivery of the catalog is robust enough.</p>
      <meta name="description" content="unlock your archive">
    `,
    'type.css': '.hero { content: "delve"; font-family: "Myriad Pro"; }\n',
  });
  const snippets = findings.map((finding) => finding.message);
  expect(findings.every((finding) => finding.rule === 'vocabulary')).toBe(true);
  expect(snippets.some((message) => message.includes('Delve'))).toBe(true);
  expect(snippets.some((message) => message.toLowerCase().includes('digital landscape'))).toBe(true);
  expect(snippets.some((message) => message.toLowerCase().includes("it's worth noting"))).toBe(true);
  expect(snippets.some((message) => message.toLowerCase().includes('unlock your'))).toBe(true);
  expect(snippets.some((message) => message.includes('delve'))).toBe(true);
  expect(snippets.some((message) => message.toLowerCase().includes('myriad'))).toBe(false);
  expect(snippets.some((message) => message.toLowerCase().includes('delivery'))).toBe(false);
  expect(snippets.some((message) => message.toLowerCase().includes('robust'))).toBe(false);
});

test('comments, config, and file allows suppress intentional use', async () => {
  const html = {
    'index.html': `
      <!-- design-lint-allow-next: emoji -->
      <h1>🚀 One</h1>
      <h2>✨ Two</h2>
      <!-- design-lint-allow-file: badge -->
      <span>LIVE</span>
      <!-- design-lint-allow-start: social-proof -->
      <p>Trusted by readers.</p>
      <!-- design-lint-allow-end: social-proof -->
      <p>We delve into archives.</p>
    `,
    'theme.css': `
      .hero { background: linear-gradient(#667eea, #764ba2); } /* design-lint-allow: gradient */
      /* design-lint-allow-next: gradient */

      .next { background: linear-gradient(blue, purple); }
    `,
  };
  const commented = await lint(html);
  expect(rules(commented)).toEqual(['emoji', 'vocabulary']);
  expect(commented.filter((finding) => finding.rule === 'emoji')).toHaveLength(1);

  const allowed = await lint(html, {
    allow: [
      { rule: 'vocabulary', text: 'delve' },
      { rule: 'emoji', path: 'site/index.html' },
    ],
  });
  expect(allowed).toEqual([]);

  const byFile = await lint({
    'index.html': '<h1>🚀 One</h1><p>delve</p>\n',
    'other.html': '<p>delve</p>\n',
  }, {
    allow: [{ rule: '*', path: 'site/other.html' }, { rule: 'emoji', path: 'site/*.html' }],
  });
  expect(byFile).toHaveLength(1);
  expect(byFile[0].file).toBe('site/index.html');
  expect(byFile[0].rule).toBe('vocabulary');
});

test('invalid allow directives and config fail closed', async () => {
  const findings = await lint({
    'index.html': '<!-- design-lint-allow-next: not-a-rule -->\n<h1>🚀 One</h1>\n',
  });
  expect(rules(findings)).toEqual(['allow', 'emoji']);

  await withSite({ 'index.html': '<h1>Home</h1>\n' }, async (root) => {
    await expect(lintDesign({
      rootDir: root,
      config: { allow: [{ rule: 'nope' }] },
    })).rejects.toThrow(/規則名が不正です/);
  });
});

test('default allowlist does not hide starter violations', async () => {
  const config = JSON.parse(await readFile(path.join(repoRoot, 'design-lint.config.json'), 'utf8'));
  expect(config.allow).toEqual([]);
});
