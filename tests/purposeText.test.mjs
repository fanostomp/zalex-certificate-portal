import assert from 'node:assert/strict';
import test from 'node:test';
import { countVisibleTextCharacters } from '../src/components/certificates/purposeText.ts';

const cases = [
  ['49 real characters', 'a'.repeat(49), 49],
  ['50 real characters', 'a'.repeat(50), 50],
  ['50 zero-width characters', '\u200b'.repeat(50), 0],
  ['whitespace-only input', ' \t\n\u00a0 ', 0],
  ['collapsed internal whitespace', '  a  b\nc  ', 5],
  ['invisible characters between whitespace', 'a \u200b b', 3],
  ['emoji tag sequence', '\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}', 1],
  ['decomposed combining characters', 'e\u0301'.repeat(50), 50],
  ['precomposed combining characters', 'é'.repeat(50), 50],
  ['emoji families, skin tones, flags and keycaps', '👨‍👩‍👧‍👦👍🏽🇬🇷1️⃣', 4],
  ['controls and directional formatting', 'a\u200b\u200e\u202e\u0001b', 2],
  ['standalone combining marks and joiners', '\u0301\u200c\u200d\ufe0f', 0],
  ['decoded HTML entity text', '&<é😀', 4],
];
for (const [name, value, expected] of cases) {
  test(`visible character count: ${name}`, () => {
    assert.equal(countVisibleTextCharacters(value), expected);
  });
}
