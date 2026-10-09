import { parse, type DefaultTreeAdapterTypes } from 'parse5';
import { countVisibleTextCharacters } from '../src/utils/visibleText.ts';
import { parseCertificateDate } from '../src/utils/certificateDates.ts';

const ignoredElements = new Set(['script', 'style', 'template']);
const blockElements = new Set(['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'pre']);

export function getServerPurposeCharacterCount(html: string): number {
  // Match inert DOMParser HTML document parsing, including HTML5 error recovery.
  const document = parse(html, { scriptingEnabled: false });
  const root = document.childNodes.find(node => 'tagName' in node && node.tagName === 'html');
  const body = root && 'childNodes' in root
    ? root.childNodes.find(node => 'tagName' in node && node.tagName === 'body') : undefined;
  const pending: (DefaultTreeAdapterTypes.Node | string)[] = body ? [body] : [];
  const text: string[] = [];
  // Iterative traversal also handles deeply nested user input without recursion.
  while (pending.length) {
    const node = pending.pop()!;
    if (typeof node === 'string') { text.push(node); continue; }
    if ('value' in node && node.nodeName === '#text') { text.push(node.value); continue; }
    if ('tagName' in node) {
      if (ignoredElements.has(node.tagName)) continue;
      if (node.tagName === 'br') { text.push('\n'); continue; }
      if (blockElements.has(node.tagName)) pending.push('\n');
    }
    if ('childNodes' in node) {
      for (let i = node.childNodes.length - 1; i >= 0; i--) pending.push(node.childNodes[i]);
    }
  }
  return countVisibleTextCharacters(text.join(''));
}

export function isFutureCertificateDate(value: string, timeZone: string, now = new Date()): boolean {
  // A timezone is metadata, not a client-provided clock or an authorization claim.
  if (timeZone.length > 100 || !/^[A-Za-z_]+(?:\/[A-Za-z0-9_+-]+)*$/.test(timeZone)) return false;
  const parsed = parseCertificateDate(value);
  if (!parsed) return false;
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone, year: 'numeric', month: 'numeric', day: 'numeric',
    }).formatToParts(now);
    const part = (name: Intl.DateTimeFormatPartTypes) => Number(parts.find(item => item.type === name)?.value);
    const today = part('year') * 10000 + part('month') * 100 + part('day');
    return parsed.sortValue > today;
  } catch { return false; }
}
