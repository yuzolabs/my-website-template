import { lstat, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const RULES = new Set(['gradient', 'emoji', 'badge', 'social-proof', 'vocabulary', '*']);
const BLUE_FAMILIES = new Set(['blue', 'sky', 'indigo', 'cyan']);
const PURPLE_FAMILIES = new Set(['purple', 'violet', 'fuchsia']);
const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const SKIP_PROSE_TAGS = new Set(['script', 'style', 'pre', 'code', 'kbd', 'samp', 'textarea']);
const BADGE_CLASS = /(?:^|[\s_-])(?:badge|pill|chip|ribbon|kicker|eyebrow)(?:$|[\s_-])/i;
const STANDALONE_BADGE = /^(?:[●•∙·]\s*)?(?:LIVE|NEW|HOT|BETA|SOON|COMING SOON)$/;
const CLASS_BADGE = /^(?:[●•∙·]\s*)?(?:LIVE|NEW|HOT|BETA|SOON|COMING SOON|AI|PRO|UPDATED)$/i;
const BUTTON_CLASS = /(?:^|[\s_-])(?:btn|button)(?:$|[\s_-])/i;
const DIRECTIVE = /^design-lint-allow(?:-(file|next|start|end))?\s*:\s*([a-z*,\s-]+)$/i;
const UTILITY_COLOR = /(?:^|\s)(?:from|via|to)-(blue|sky|indigo|cyan|purple|violet|fuchsia)-\d{2,3}(?:\/\d{1,3})?(?=\s|$)/gi;
const UTILITY_HEX = /(?:^|\s)(?:from|via|to)-\[(#[0-9a-fA-F]{3,8})\](?:\/\d{1,3})?(?=\s|$)/gi;
const GRADIENT_FN = /(?:repeating-)?(?:linear|radial|conic)-gradient\(/gi;
const CHROME_SELECTOR = /(^|[\s>+~,:])(h[1-6]|button)(?![a-z0-9_-])|\[role\s*=\s*["']?button["']?\]|(^|[\s>+~,:.#])(btn|button)(?=$|[\s>+~,:.#:[_-])/i;

const VOCABULARY = [
  'game-changer', 'game-changing', 'cutting-edge', 'ever-evolving', 'state-of-the-art',
  'groundbreaking', 'revolutionizing', 'revolutionized', 'revolutionizes', 'revolutionize',
  'supercharging', 'supercharged', 'supercharges', 'supercharge',
  'spearheading', 'spearheads', 'spearhead',
  'meticulously', 'multifaceted', 'tapestries', 'tapestry', 'synergies', 'synergy',
  'paradigms', 'paradigm', 'unleashing', 'unleashes', 'unleashed', 'unleash',
  'embarking', 'embarks', 'embark', 'delving', 'delves', 'delved', 'delve',
  'plethora', 'myriad', 'nestled', 'bustling', 'holistic', 'testament',
];
const PHRASES = [
  "it's worth noting",
  'it is worth noting',
  'digital landscape',
  'elevate your',
  'unlock your',
];
const SOCIAL_PATTERNS = [
  /\btrusted\s+by\b/gi,
  /\b\d{1,3}(?:,\d{3})+\+?\s*(?:happy\s+|active\s+)?(?:users|customers|teams|companies|businesses|clients|developers|downloads|creators|subscribers|members)\b/gi,
  /\b\d{4,}\+\s*(?:happy\s+|active\s+)?(?:users|customers|teams|companies|businesses|clients|developers|downloads|creators|subscribers|members)\b/gi,
  /\b\d+(?:\.\d+)?\s*[kKmM]\+\s*(?:happy\s+|active\s+)?(?:users|customers|teams|companies|businesses|clients|developers|downloads|creators|subscribers|members)\b/gi,
  /\bjoin\s+(?:\d{1,3}(?:,\d{3})+|\d{4,}|\d+(?:\.\d+)?\s*[kKmM]\+?)\+?\s*(?:happy\s+|active\s+)?(?:users|customers|teams|companies|businesses|clients|developers|downloads|creators|subscribers|members)\b/gi,
  /\d{1,3}(?:,\d{3})+\s*\+?\s*(?:人|名|社|チーム)(?:以上)?(?:が利用|に利用|が導入|に導入|に選ば|が愛用)/g,
  /\d+\s*万\s*(?:人|名|社|チーム)(?:以上)?(?:が利用|に利用|が導入|に導入|に選ば|が愛用)/g,
];
const NAMED_COLORS = {
  aqua: '#00ffff',
  black: '#000000',
  blue: '#0000ff',
  blueviolet: '#8a2be2',
  brown: '#a52a2a',
  cadetblue: '#5f9ea0',
  cornflowerblue: '#6495ed',
  cyan: '#00ffff',
  darkblue: '#00008b',
  darkcyan: '#008b8b',
  darkmagenta: '#8b008b',
  darkorchid: '#9932cc',
  darkslateblue: '#483d8b',
  darkviolet: '#9400d3',
  deepskyblue: '#00bfff',
  dodgerblue: '#1e90ff',
  fuchsia: '#ff00ff',
  gray: '#808080',
  green: '#008000',
  grey: '#808080',
  indigo: '#4b0082',
  lavender: '#e6e6fa',
  lightblue: '#add8e6',
  lightskyblue: '#87cefa',
  lightsteelblue: '#b0c4de',
  lime: '#00ff00',
  magenta: '#ff00ff',
  mediumblue: '#0000cd',
  mediumorchid: '#ba55d3',
  mediumpurple: '#9370db',
  mediumslateblue: '#7b68ee',
  mediumvioletred: '#c71585',
  midnightblue: '#191970',
  navy: '#000080',
  orange: '#ffa500',
  orchid: '#da70d6',
  pink: '#ffc0cb',
  powderblue: '#b0e0e6',
  purple: '#800080',
  rebeccapurple: '#663399',
  red: '#ff0000',
  royalblue: '#4169e1',
  silver: '#c0c0c0',
  skyblue: '#87ceeb',
  slateblue: '#6a5acd',
  steelblue: '#4682b4',
  teal: '#008080',
  transparent: null,
  violet: '#ee82ee',
  white: '#ffffff',
  yellow: '#ffff00',
};

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function locate(text, index) {
  let line = 1;
  let column = 1;
  const end = Math.min(Math.max(index, 0), text.length);
  for (let i = 0; i < end; i += 1) {
    if (text[i] === '\n') {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }
  return { line, column };
}

function inRanges(ranges, index) {
  return ranges.some((range) => index >= range.start && index < range.end);
}

function decodeEntities(text) {
  return text.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]+);/g, (all, body) => {
    if (body[0] !== '#') {
      const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
      return Object.hasOwn(named, body) ? named[body] : all;
    }
    const code = body[1].toLowerCase() === 'x'
      ? Number.parseInt(body.slice(2), 16)
      : Number.parseInt(body.slice(1), 10);
    if (!Number.isInteger(code) || code < 0 || code > 0x10ffff) return all;
    return String.fromCodePoint(code);
  });
}

function normalizeText(text) {
  return decodeEntities(text).replace(/\s+/g, ' ').trim();
}

function messageFor(rule, snippet) {
  const labels = {
    gradient: '青から紫へのグラデーションです',
    emoji: '見出しやボタンに絵文字があります',
    badge: '飾りバッジです',
    'social-proof': '根拠のない数値や Trusted by です',
    vocabulary: '定型的な英語の AI 語彙です',
    allow: '許可コメントを解釈できません',
  };
  const shown = snippet.replace(/\s+/g, ' ').trim().slice(0, 80);
  return `${labels[rule] ?? rule}: ${shown}`;
}

function matchPath(pattern, relPath) {
  const file = relPath.replaceAll('\\', '/');
  let source = '^';
  const normalized = pattern.replaceAll('\\', '/');
  for (let i = 0; i < normalized.length; i += 1) {
    if (normalized[i] === '*' && normalized[i + 1] === '*') {
      source += '.*';
      i += 1;
      continue;
    }
    source += normalized[i] === '*' ? '[^/]*' : escapeRegExp(normalized[i]);
  }
  return new RegExp(`${source}$`).test(file);
}

function loadAllowEntries(config) {
  if (config === undefined) return [];
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('design-lint.config.json はオブジェクトである必要があります');
  }
  const allow = config.allow ?? [];
  if (!Array.isArray(allow)) throw new Error('design-lint.config.json の allow は配列である必要があります');
  return allow.map((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new Error(`allow[${index}] はオブジェクトである必要があります`);
    }
    const rule = String(entry.rule ?? '').trim().toLowerCase();
    if (!RULES.has(rule)) throw new Error(`許可設定の規則名が不正です: ${rule || '(empty)'}`);
    const entryPath = entry.path === undefined ? undefined : String(entry.path);
    const text = entry.text === undefined ? undefined : String(entry.text);
    if (text !== undefined && text.trim() === '') throw new Error(`allow[${index}] の text が空です`);
    return { rule, path: entryPath, text };
  });
}

async function readConfig(configPath, config) {
  if (config) return { allow: loadAllowEntries(config) };
  let text;
  try {
    text = await readFile(configPath, 'utf8');
  } catch (error) {
    if (error && error.code === 'ENOENT') return { allow: [] };
    throw error;
  }
  try {
    return { allow: loadAllowEntries(JSON.parse(text)) };
  } catch (error) {
    if (error instanceof SyntaxError) throw new Error('design-lint.config.json の JSON を解釈できません');
    throw error;
  }
}

function suppressed(state, config, relPath, rule, line, snippet) {
  if (state.fileRules.has('*') || state.fileRules.has(rule)) return true;
  const lineRules = state.lines.get(line);
  if (lineRules && (lineRules.has('*') || lineRules.has(rule))) return true;
  return config.allow.some((entry) => {
    if (entry.rule !== '*' && entry.rule !== rule) return false;
    if (entry.path && !matchPath(entry.path, relPath)) return false;
    if (entry.text && !snippet.toLowerCase().includes(entry.text.toLowerCase())) return false;
    return true;
  });
}

function addFinding(findings, state, config, fullText, relPath, index, rule, snippet) {
  const position = locate(fullText, index);
  if (rule !== 'allow' && suppressed(state, config, relPath, rule, position.line, snippet)) return;
  findings.push({
    rule,
    file: relPath,
    line: position.line,
    column: position.column,
    message: messageFor(rule, snippet),
  });
}

function addLineRule(state, line, rules) {
  if (!state.lines.has(line)) state.lines.set(line, new Set());
  for (const rule of rules) state.lines.get(line).add(rule);
}

function parseRuleList(value) {
  return value.split(',').map((rule) => rule.trim().toLowerCase()).filter(Boolean);
}

function noteDirective(state, body, start, end, fullText, relPath, findings) {
  const trimmed = body.trim();
  if (!trimmed.startsWith('design-lint-allow')) return;
  const match = trimmed.match(DIRECTIVE);
  if (!match) {
    addFinding(findings, state, { allow: [] }, fullText, relPath, start, 'allow', trimmed.slice(0, 80));
    return;
  }
  const kind = (match[1] ?? '').toLowerCase();
  const rules = parseRuleList(match[2]);
  if (rules.length === 0 || rules.some((rule) => !RULES.has(rule))) {
    addFinding(findings, state, { allow: [] }, fullText, relPath, start, 'allow', trimmed.slice(0, 80));
    return;
  }
  if (kind === 'file') {
    for (const rule of rules) state.fileRules.add(rule);
    return;
  }
  if (kind === 'start') {
    const line = locate(fullText, start).line;
    for (const rule of rules) state.stack.push({ rule, line, index: start });
    return;
  }
  if (kind === 'end') {
    const endLine = locate(fullText, start).line;
    for (const rule of rules) {
      if (rule === '*') {
        while (state.stack.length > 0) {
          const opened = state.stack.pop();
          for (let line = opened.line + 1; line < endLine; line += 1) addLineRule(state, line, [opened.rule]);
        }
        continue;
      }
      const index = state.stack.findLastIndex((opened) => opened.rule === rule);
      if (index < 0) {
        addFinding(findings, state, { allow: [] }, fullText, relPath, start, 'allow', trimmed.slice(0, 80));
        continue;
      }
      const [opened] = state.stack.splice(index, 1);
      for (let line = opened.line + 1; line < endLine; line += 1) addLineRule(state, line, [rule]);
    }
    return;
  }
  if (kind === 'next') {
    const lines = fullText.split('\n');
    let line = locate(fullText, Math.max(end - 1, start)).line + 1;
    while (line <= lines.length && lines[line - 1].trim() === '') line += 1;
    if (line <= lines.length) addLineRule(state, line, rules);
    return;
  }
  addLineRule(state, locate(fullText, start).line, rules);
}

function finishAllows(state, fullText, relPath, findings) {
  for (const opened of state.stack) {
      addFinding(
        findings,
        state,
        { allow: [] },
        fullText,
        relPath,
        opened.index,
        'allow',
        `design-lint-allow-start が閉じていません: ${opened.rule}`,
      );
  }
  state.stack = [];
}

function createAllowState() {
  return { fileRules: new Set(), lines: new Map(), stack: [] };
}

function familyFromHsl(h, s, l) {
  if (s < 0.2 || l < 0.1 || l > 0.93) return null;
  const hue = ((h % 360) + 360) % 360;
  if (hue >= 190 && hue < 250) return 'blue';
  if (hue >= 250 && hue < 320) return 'purple';
  return null;
}

function familyFromRgb(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return null;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return familyFromHsl(h * 60, s, l);
}

function parseHexColor(token) {
  let hex = token.slice(1);
  if (hex.length === 3 || hex.length === 4) hex = [...hex].map((char) => char + char).join('');
  if (hex.length !== 6 && hex.length !== 8) return null;
  return familyFromRgb(
    Number.parseInt(hex.slice(0, 2), 16),
    Number.parseInt(hex.slice(2, 4), 16),
    Number.parseInt(hex.slice(4, 6), 16),
  );
}

function channel(token) {
  if (token.endsWith('%')) {
    const value = Number(token.slice(0, -1));
    return Number.isNaN(value) ? null : value / 100 * 255;
  }
  const value = Number(token);
  return Number.isNaN(value) ? null : value;
}

function parseRgbColor(token) {
  const body = token.replace(/^rgba?\(/i, '').replace(/\)$/, '');
  const parts = body.split(/[,\s/]+/).filter(Boolean);
  if (parts.length < 3) return null;
  const rgb = parts.slice(0, 3).map(channel);
  if (rgb.some((value) => value === null)) return null;
  return familyFromRgb(rgb[0], rgb[1], rgb[2]);
}

function parseHslColor(token) {
  const body = token.replace(/^hsla?\(/i, '').replace(/\)$/, '').trim();
  const match = body.match(/^(-?\d+(?:\.\d+)?)(deg|rad|turn|grad)?(?:\s*[, ]\s*|\s+)(-?\d+(?:\.\d+)?)%\s*[, ]?\s*(-?\d+(?:\.\d+)?)%/i);
  if (!match) return null;
  let hue = Number(match[1]);
  const unit = (match[2] || 'deg').toLowerCase();
  if (unit === 'rad') hue = hue * 180 / Math.PI;
  if (unit === 'turn') hue = hue * 360;
  if (unit === 'grad') hue = hue * 0.9;
  return familyFromHsl(hue, Number(match[3]) / 100, Number(match[4]) / 100);
}

function parseOklchColor(token) {
  const body = token.replace(/^oklch\(/i, '').replace(/\)$/, '').trim();
  const match = body.match(/^(\d+(?:\.\d+)?%?)\s+(\d+(?:\.\d+)?)\s+(-?\d+(?:\.\d+)?)(?:deg)?/i);
  if (!match) return null;
  let lightness = Number(match[1].replace('%', ''));
  if (match[1].endsWith('%')) lightness /= 100;
  const chroma = Number(match[2]);
  return familyFromHsl(Number(match[3]), chroma >= 0.08 ? 1 : 0, lightness);
}

function familyOfColor(token) {
  const value = token.trim();
  if (value.startsWith('#')) return parseHexColor(value);
  if (/^rgba?\(/i.test(value)) return parseRgbColor(value);
  if (/^hsla?\(/i.test(value)) return parseHslColor(value);
  if (/^oklch\(/i.test(value)) return parseOklchColor(value);
  const hex = NAMED_COLORS[value.toLowerCase()];
  if (hex === undefined) return null;
  return hex ? parseHexColor(hex) : null;
}

function splitTopLevel(value) {
  const parts = [];
  let start = 0;
  let depth = 0;
  for (let i = 0; i < value.length; i += 1) {
    if (value[i] === '(') depth += 1;
    else if (value[i] === ')') depth = Math.max(0, depth - 1);
    else if (value[i] === ',' && depth === 0) {
      parts.push(value.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(value.slice(start));
  return parts;
}

function familiesInGradient(body) {
  const families = new Set();
  for (const part of splitTopLevel(body)) {
    const candidates = part.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|oklch\([^)]*\)|\b[a-zA-Z]+\b/g) || [];
    for (const candidate of candidates) {
      const family = familyOfColor(candidate);
      if (family) {
        families.add(family);
        break;
      }
    }
  }
  return families;
}

function findBalanced(text, openIndex) {
  let depth = 0;
  for (let i = openIndex; i < text.length; i += 1) {
    if (text[i] === '(') depth += 1;
    else if (text[i] === ')') {
      depth -= 1;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function scanGradientText(text, offset, fullText, relPath, state, config, findings) {
  const pattern = new RegExp(GRADIENT_FN.source, 'gi');
  let match = pattern.exec(text);
  while (match) {
    const open = match.index + match[0].length - 1;
    const close = findBalanced(text, open);
    if (close >= 0) {
      const body = text.slice(open + 1, close);
      const families = familiesInGradient(body);
      if (families.has('blue') && families.has('purple')) {
        addFinding(findings, state, config, fullText, relPath, offset + match.index, 'gradient', text.slice(match.index, close + 1));
      }
      pattern.lastIndex = close + 1;
    }
    match = pattern.exec(text);
  }
}

function scanUtilities(text, offset, fullText, relPath, state, config, findings) {
  const families = new Set();
  let first = -1;
  for (const pattern of [UTILITY_COLOR, UTILITY_HEX]) {
    const regex = new RegExp(pattern.source, 'gi');
    let match = regex.exec(text);
    while (match) {
      if (first < 0) first = match.index;
      if (match[1].startsWith('#')) {
        const family = familyOfColor(match[1]);
        if (family) families.add(family);
      } else {
        const name = match[1].toLowerCase();
        if (BLUE_FAMILIES.has(name)) families.add('blue');
        if (PURPLE_FAMILIES.has(name)) families.add('purple');
      }
      match = regex.exec(text);
    }
  }
  if (families.has('blue') && families.has('purple')) {
    addFinding(findings, state, config, fullText, relPath, offset + Math.max(first, 0), 'gradient', text.trim());
  }
}

function blankNestedBlocks(body) {
  let depth = 0;
  let out = '';
  for (const char of body) {
    if (char === '{') {
      depth += 1;
      out += ' ';
    } else if (char === '}') {
      depth = Math.max(0, depth - 1);
      out += ' ';
    } else {
      out += depth === 0 ? char : ' ';
    }
  }
  return out;
}

function eachBlockBody(text, callback) {
  const starts = [];
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === '{') starts.push(i + 1);
    else if (text[i] === '}' && starts.length > 0) callback(text.slice(starts.at(-1), i), starts.pop());
  }
}

function maskRanges(text, ranges) {
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  let out = '';
  let cursor = 0;
  for (const range of sorted) {
    const start = Math.max(range.start, cursor);
    const end = Math.max(range.end, start);
    out += text.slice(cursor, start);
    out += ' '.repeat(end - start);
    cursor = end;
  }
  return out + text.slice(cursor);
}

function scanCssSyntax(css) {
  const comments = [];
  const strings = [];
  let i = 0;
  while (i < css.length) {
    if (css.startsWith('/*', i)) {
      const end = css.indexOf('*/', i + 2);
      const stop = end === -1 ? css.length : end + 2;
      comments.push({ start: i, end: stop, body: css.slice(i + 2, end === -1 ? css.length : end) });
      i = stop;
      continue;
    }
    if (css[i] === '"' || css[i] === "'") {
      const quote = css[i];
      const start = i;
      i += 1;
      let body = '';
      while (i < css.length && css[i] !== quote) {
        if (css[i] === '\\' && i + 1 < css.length) {
          body += css[i + 1];
          i += 2;
          continue;
        }
        body += css[i];
        i += 1;
      }
      if (css[i] === quote) i += 1;
      strings.push({ start, end: i, body });
      continue;
    }
    i += 1;
  }
  return { comments, strings };
}

function readCssValue(css, start) {
  let i = start;
  let quote = null;
  while (i < css.length) {
    const char = css[i];
    if (quote) {
      if (char === '\\' && i + 1 < css.length) {
        i += 2;
        continue;
      }
      if (char === quote) quote = null;
      i += 1;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      i += 1;
      continue;
    }
    if (char === ';' || char === '}') break;
    i += 1;
  }
  return css.slice(start, i);
}

function visibleCssText(value) {
  const parts = [];
  const pattern = /"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'/g;
  let match = pattern.exec(value);
  while (match) {
    parts.push((match[1] ?? match[2]).replace(/\\(.)/g, '$1'));
    match = pattern.exec(value);
  }
  return parts.length > 0 ? parts.join('') : value.trim();
}

function selectorTargetsChrome(selector) {
  return CHROME_SELECTOR.test(selector);
}

function selectorBefore(css, index) {
  const open = css.lastIndexOf('{', index);
  if (open < 0) return '';
  const previousOpen = css.lastIndexOf('{', open - 1);
  const previousClose = css.lastIndexOf('}', open - 1);
  return css.slice(Math.max(previousOpen, previousClose) + 1, open);
}

function scanContentProperties(css, syntax, offset, fullText, relPath, state, config, findings) {
  const pattern = /content\s*:/gi;
  let match = pattern.exec(css);
  while (match) {
    if (!inRanges(syntax.comments, match.index) && !inRanges(syntax.strings, match.index)) {
      const rawValue = readCssValue(css, match.index + match[0].length);
      const visible = visibleCssText(rawValue);
      const selector = selectorBefore(css, match.index);
      const at = offset + match.index;
      if (selectorTargetsChrome(selector)) scanEmojiText(visible, at, fullText, relPath, state, config, findings);
      scanBadgeSnippet(visible, BADGE_CLASS.test(selector), at, fullText, relPath, state, config, findings);
      scanProse(visible, at, fullText, relPath, state, config, findings);
    }
    match = pattern.exec(css);
  }
}

function lintCss(css, offset, fullText, relPath, state, config, findings) {
  const syntax = scanCssSyntax(css);
  const masked = maskRanges(css, [...syntax.comments, ...syntax.strings]);
  scanGradientText(masked, offset, fullText, relPath, state, config, findings);
  eachBlockBody(masked, (body, start) => {
    scanUtilities(blankNestedBlocks(body), offset + start, fullText, relPath, state, config, findings);
  });
  const bracket = /\[([^\]]*gradient\([^[\]]*)\]/gi;
  let embedded = bracket.exec(masked);
  while (embedded) {
    scanGradientText(embedded[1], offset + embedded.index + 1, fullText, relPath, state, config, findings);
    embedded = bracket.exec(masked);
  }
  scanContentProperties(css, syntax, offset, fullText, relPath, state, config, findings);
  return syntax;
}

function scanEmojiText(text, index, fullText, relPath, state, config, findings) {
  const match = decodeEntities(text).match(/\p{Extended_Pictographic}/u);
  if (match) addFinding(findings, state, config, fullText, relPath, index, 'emoji', match[0]);
}

function badgeKind(text, badgeClass) {
  if (STANDALONE_BADGE.test(text)) return true;
  return Boolean(badgeClass) && CLASS_BADGE.test(text);
}

function scanBadgeSnippet(text, badgeClass, index, fullText, relPath, state, config, findings) {
  const normalized = normalizeText(text);
  if (!normalized || !badgeKind(normalized, badgeClass)) return;
  addFinding(findings, state, config, fullText, relPath, index, 'badge', normalized);
}

function scanProse(text, index, fullText, relPath, state, config, findings) {
  const decoded = decodeEntities(text);
  if (!decoded.trim()) return;
  for (const pattern of SOCIAL_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match = regex.exec(decoded);
    while (match) {
      addFinding(findings, state, config, fullText, relPath, index, 'social-proof', match[0]);
      match = regex.exec(decoded);
    }
  }
  for (const term of [...VOCABULARY, ...PHRASES]) {
    const regex = new RegExp(`\\b${escapeRegExp(term)}\\b`, 'gi');
    let match = regex.exec(decoded);
    while (match) {
      addFinding(findings, state, config, fullText, relPath, index, 'vocabulary', match[0]);
      match = regex.exec(decoded);
    }
  }
}

function parseAttributes(source) {
  const attrs = {};
  const pattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match = pattern.exec(source);
  while (match) {
    attrs[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
    match = pattern.exec(source);
  }
  return attrs;
}

function readTag(html, start) {
  let i = start + 1;
  let quote = null;
  for (; i < html.length; i += 1) {
    const char = html[i];
    if (quote) {
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '>') {
      i += 1;
      break;
    }
  }
  const raw = html.slice(start, i);
  const nameMatch = raw.match(/^<\s*\/?\s*([^\s/>!]+)/);
  const name = nameMatch ? nameMatch[1].toLowerCase() : '';
  const attrSource = raw.replace(/^<\s*\/?\s*[^\s/>]+/, '').replace(/\/?\s*>$/, '');
  return {
    start,
    end: i,
    raw,
    name,
    closing: /^<\s*\//.test(raw),
    selfClosing: /\/\s*>$/.test(raw),
    declaration: /^<(!|\?)/.test(raw),
    attrs: parseAttributes(attrSource),
  };
}

function attributeValueOffset(raw, value) {
  if (!value) return 0;
  const quoted = raw.indexOf(`"${value}"`);
  if (quoted >= 0) return quoted + 1;
  const single = raw.indexOf(`'${value}'`);
  if (single >= 0) return single + 1;
  const bare = raw.indexOf(value);
  return bare >= 0 ? bare : 0;
}

function tokenize(html) {
  const tokens = [];
  let i = 0;
  while (i < html.length) {
    if (html.startsWith('<!--', i)) {
      const end = html.indexOf('-->', i + 4);
      const stop = end === -1 ? html.length : end + 3;
      tokens.push({ type: 'comment', start: i, end: stop, body: html.slice(i + 4, end === -1 ? html.length : end) });
      i = stop;
      continue;
    }
    if (html[i] === '<') {
      const tag = readTag(html, i);
      if (tag.declaration || !tag.name) {
        i = tag.end;
        continue;
      }
      if (tag.closing) {
        tokens.push({ type: 'close', start: tag.start, end: tag.end, name: tag.name });
        i = tag.end;
        continue;
      }
      const styleValue = tag.attrs.style;
      const styleOffset = styleValue ? tag.start + attributeValueOffset(tag.raw, styleValue) : tag.start;
      tokens.push({
        type: 'open',
        start: tag.start,
        end: tag.end,
        name: tag.name,
        attrs: tag.attrs,
        void: tag.selfClosing || VOID_TAGS.has(tag.name),
        styleValue,
        styleOffset,
      });
      i = tag.end;
      if ((tag.name === 'style' || tag.name === 'script') && !tag.selfClosing) {
        const closer = new RegExp(`</${tag.name}\\s*>`, 'i').exec(html.slice(i));
        const bodyEnd = closer ? i + closer.index : html.length;
        if (tag.name === 'style') {
          tokens.push({ type: 'style', start: i, end: bodyEnd, css: html.slice(i, bodyEnd) });
        }
        const closeEnd = closer ? bodyEnd + closer[0].length : bodyEnd;
        tokens.push({ type: 'close', start: closer ? bodyEnd : closeEnd, end: closeEnd, name: tag.name });
        i = closeEnd;
      }
      continue;
    }
    const next = html.indexOf('<', i);
    const end = next === -1 ? html.length : next;
    tokens.push({ type: 'text', start: i, end, text: html.slice(i, end) });
    i = end;
  }
  return tokens;
}

function isButtonName(name, attrs) {
  const type = (attrs.type || '').toLowerCase();
  const role = (attrs.role || '').replace(/["']/g, '').toLowerCase();
  return name === 'button'
    || (name === 'input' && ['button', 'submit', 'reset'].includes(type))
    || role === 'button'
    || BUTTON_CLASS.test(attrs.class || '');
}

function createElement(token, parent) {
  const ownSkip = SKIP_PROSE_TAGS.has(token.name);
  return {
    name: token.name,
    attrs: token.attrs,
    start: token.start,
    text: '',
    chrome: isButtonName(token.name, token.attrs) || /^h[1-6]$/.test(token.name) || Boolean(parent?.chrome),
    skipProse: ownSkip || Boolean(parent?.skipProse),
    skipBadge: ownSkip || token.name === 'title' || Boolean(parent?.skipBadge),
    descendantBadge: false,
    didBadge: false,
  };
}

function considerBadge(element, fullText, relPath, state, config, findings) {
  const normalized = normalizeText(element.text);
  if (!badgeKind(normalized, BADGE_CLASS.test(element.attrs.class || ''))) return;
  if (element.skipBadge || element.descendantBadge) {
    element.didBadge = true;
    return;
  }
  element.didBadge = true;
  addFinding(findings, state, config, fullText, relPath, element.start, 'badge', normalized);
}

function finishElement(element, parent, fullText, relPath, state, config, findings) {
  if (!element) return;
  considerBadge(element, fullText, relPath, state, config, findings);
  if (!parent) return;
  parent.text += element.text;
  parent.descendantBadge = parent.descendantBadge || element.didBadge || element.descendantBadge;
}

function scanOpenAttributes(element, token, fullText, relPath, state, config, findings) {
  const attrs = token.attrs;
  const fields = [attrs.alt, attrs['aria-label'], attrs.placeholder, attrs.title, attrs.value];
  if (element.name === 'meta') {
    const key = (attrs.name || attrs.property || '').toLowerCase();
    if (['description', 'og:description', 'twitter:description'].includes(key)) fields.push(attrs.content);
  }
  for (const field of fields) {
    if (!field || element.skipProse) continue;
    const index = token.start + attributeValueOffset(token.raw ?? '', field);
    if (element.chrome) scanEmojiText(field, index, fullText, relPath, state, config, findings);
    if (!element.skipBadge) scanBadgeSnippet(field, BADGE_CLASS.test(attrs.class || ''), index, fullText, relPath, state, config, findings);
    scanProse(field, index, fullText, relPath, state, config, findings);
  }
  if (attrs.class) {
    scanUtilities(attrs.class, token.start + attributeValueOffset(token.raw ?? '', attrs.class), fullText, relPath, state, config, findings);
    const embedded = /\[([^\]]*gradient\([^[\]]*)\]/gi;
    let match = embedded.exec(attrs.class);
    while (match) {
      scanGradientText(match[1], token.start, fullText, relPath, state, config, findings);
      match = embedded.exec(attrs.class);
    }
  }
  if (token.styleValue) lintCss(token.styleValue, token.styleOffset, fullText, relPath, state, config, findings);
}

function lintHtml(fullText, relPath, config, findings) {
  const state = createAllowState();
  const tokens = tokenize(fullText);
  for (const token of tokens) {
    if (token.type === 'comment') noteDirective(state, token.body, token.start, token.end, fullText, relPath, findings);
    if (token.type === 'style' || (token.type === 'open' && token.styleValue)) {
      const css = token.type === 'style' ? token.css : token.styleValue;
      const offset = token.type === 'style' ? token.start : token.styleOffset;
      const syntax = scanCssSyntax(css);
      for (const comment of syntax.comments) {
        noteDirective(state, comment.body, offset + comment.start, offset + comment.end, fullText, relPath, findings);
      }
    }
  }
  finishAllows(state, fullText, relPath, findings);
  const root = { name: '#root', attrs: {}, text: '', chrome: false, skipProse: false, skipBadge: false, descendantBadge: false, didBadge: false };
  const stack = [root];
  for (const token of tokens) {
    if (token.type === 'text') {
      const parent = stack.at(-1);
      parent.text += token.text;
      if (!parent.skipProse) {
        if (parent.chrome) scanEmojiText(token.text, token.start, fullText, relPath, state, config, findings);
        scanProse(token.text, token.start, fullText, relPath, state, config, findings);
      }
    } else if (token.type === 'style') {
      lintCss(token.css, token.start, fullText, relPath, state, config, findings);
    } else if (token.type === 'open') {
      const parent = stack.at(-1);
      const element = createElement(token, parent);
      token.raw = fullText.slice(token.start, token.end);
      scanOpenAttributes(element, token, fullText, relPath, state, config, findings);
      if (token.void) finishElement(element, parent, fullText, relPath, state, config, findings);
      else stack.push(element);
    } else if (token.type === 'close') {
      while (stack.length > 1 && stack.at(-1).name !== token.name) {
        finishElement(stack.pop(), stack.at(-1), fullText, relPath, state, config, findings);
      }
      if (stack.length > 1) finishElement(stack.pop(), stack.at(-1), fullText, relPath, state, config, findings);
    }
  }
  while (stack.length > 1) finishElement(stack.pop(), stack.at(-1), fullText, relPath, state, config, findings);
}

function lintDocument(relPath, text, config, findings) {
  if (relPath.endsWith('.css')) {
    const state = createAllowState();
    const syntax = scanCssSyntax(text);
    for (const comment of syntax.comments) noteDirective(state, comment.body, comment.start, comment.end, text, relPath, findings);
    finishAllows(state, text, relPath, findings);
    lintCss(text, 0, text, relPath, state, config, findings);
    return;
  }
  lintHtml(text, relPath, config, findings);
}

async function collectFiles(dir) {
  const files = [];
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await collectFiles(full));
    else if (entry.isFile() && /\.(?:html|htm|css)$/i.test(entry.name)) files.push(full);
  }
  return files.sort();
}

function dedupe(findings) {
  const seen = new Set();
  return findings.filter((finding) => {
    const key = `${finding.file}:${finding.line}:${finding.column}:${finding.rule}:${finding.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.column - b.column || a.rule.localeCompare(b.rule));
}

export async function lintDesign({
  rootDir: root = rootDir,
  siteDir,
  configPath,
  config,
} = {}) {
  const rootPath = path.resolve(root);
  const site = path.resolve(siteDir ?? path.join(rootPath, 'site'));
  let info;
  try {
    info = await lstat(site);
  } catch (error) {
    if (error && error.code === 'ENOENT') throw new Error('site ディレクトリがありません');
    throw error;
  }
  if (!info.isDirectory()) throw new Error('site ディレクトリがありません');
  const loaded = await readConfig(path.resolve(configPath ?? path.join(rootPath, 'design-lint.config.json')), config);
  const findings = [];
  for (const file of await collectFiles(site)) {
    const relPath = path.relative(rootPath, file).split(path.sep).join('/');
    lintDocument(relPath, await readFile(file, 'utf8'), loaded, findings);
  }
  return dedupe(findings);
}

function isDirectRun() {
  if (import.meta.main === true) return true;
  const entry = process.argv[1];
  return Boolean(entry) && import.meta.url === pathToFileURL(entry).href;
}

if (isDirectRun()) {
  const args = process.argv.slice(2);
  const rootFlag = args.indexOf('--root');
  const options = {};
  if (rootFlag >= 0) {
    const rootArg = args[rootFlag + 1];
    if (!rootArg) {
      console.error('design lint failed: --root にはディレクトリが必要です');
      process.exit(1);
    }
    options.rootDir = path.resolve(rootArg);
  }
  try {
    const findings = await lintDesign(options);
    if (findings.length > 0) {
      for (const finding of findings) {
        console.error(`${finding.file}:${finding.line}:${finding.column}: ${finding.rule}: ${finding.message}`);
      }
      console.error(`design lint failed: ${findings.length}`);
      process.exit(1);
    }
    console.log('design lint passed');
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
