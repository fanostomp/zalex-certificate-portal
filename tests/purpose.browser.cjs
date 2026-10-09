const assert = require('node:assert/strict');

// Uses the browser's real DOMParser and Intl.Segmenter, without a DOM dependency.
module.exports = async function verifyPurpose(page) {
  const cases = [
    ['49 real characters', `<p>${'a'.repeat(49)}</p>`, 49],
    ['50 real characters', `<p>${'a'.repeat(50)}</p>`, 50],
    ['zero-width characters', `<p>${'\u200b'.repeat(50)}</p>`, 0],
    ['whitespace only', '<p> \t\n&nbsp;<br> </p>', 0],
    ['HTML entities', '<p>&amp;&lt;&#233;&#x1F600;</p>', 4],
    ['combining characters', `<p>${'e\u0301'.repeat(50)}</p>`, 50],
    ['emoji sequences', '<p>👨‍👩‍👧‍👦👍🏽🇬🇷1️⃣</p>', 4],
    ['format and control characters', '<p>a\u200b\u200e\u202e\u0001b</p>', 2],
    ['standalone marks and joiners', '<p>\u0301\u200d\ufe0f</p>', 0],
    ['collapsed whitespace', '<p> a  b </p><p>c</p>', 5],
    ['invisible characters between spaces', '<p>a &#8203; b</p>', 3],
    ['non-content elements', '<script>hidden</script><style>hidden</style><template>hidden</template><p>OK</p>', 2],
    ['formatting does not inflate count', '<p><strong>a</strong><em>b</em></p>', 2],
  ];
  const actual = await page.evaluate(async (fixtures) => {
    const { getPurposeCharacterCount } = await import('/src/components/certificates/purposeText.ts');
    return fixtures.map(([, html]) => getPurposeCharacterCount(html));
  }, cases);
  cases.forEach(([name, , expected], index) => assert.equal(actual[index], expected, name));
  return { checks: cases.map(([name]) => name) };
};
